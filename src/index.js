import { extractText } from "unpdf";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { saveResults } from "./storage.js";
import { exportCsv } from "./exportCsv.js";
import { SYNC_SYNERISE, SOURCE_FILE } from "../config.js";
import { syncToSynerise } from "./syne-client.js";

const URL_COLUMN = "url"
const OUTPUT_COLUMN = "content"

function splitIntoChunks(text, limit = 1000) {
  const chunks = [];
  let remaining = text.trim();

  while (remaining.length > 0) {
    if (remaining.length <= limit) {
      chunks.push(remaining);
      break;
    }

    const slice = remaining.slice(0, limit);
    const lastSpace = slice.lastIndexOf(" ");
    const cut = lastSpace > 0 ? lastSpace : limit;
    chunks.push(slice.slice(0, cut).trim());
    remaining = remaining.slice(cut).trim();
  }

  return chunks;
}

async function extractTextFromUrl(url) {
  let res;
  // while (true) {
  res = await fetch(url);
    // if (res.status !== 404) break;
    // console.log(`  404 for ${url}, retrying in 5s...`);
    // await new Promise(r => setTimeout(r, 5000));
  // }
  // if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const buffer = await res.arrayBuffer();
  const { text } = await extractText(new Uint8Array(buffer));
  const clean = (Array.isArray(text) ? text.join(" ") : String(text))
    .replace(/\s+/g, " ")
    .trim();

  return clean;
}

async function main() {
    const records = parse(readFileSync(`${SOURCE_FILE}`, "utf-8"), {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
    });

    const seenUrls = new Set();
    const uniqueRecords = records.filter(r => {
        const url = r[URL_COLUMN];
        if (!url || seenUrls.has(url)) return false;
        seenUrls.add(url);
        return true;
    });
    const duplicatesRemoved = records.length - uniqueRecords.length;
    if (duplicatesRemoved > 0) {
        console.log(`Removed ${duplicatesRemoved} duplicate URL(s). Processing ${uniqueRecords.length} unique records.`);
    }

    const expanded = [];
    for (const record of uniqueRecords.reverse()) {
        const url = record[URL_COLUMN];
        const splitUrl = url.split('/');
        const id = splitUrl[splitUrl.length - 1].replace('.pdf', '');
        const { productCategory, ...rest } = record;
        console.log(`Processing: ${url}`);
        try {
            const text = await extractTextFromUrl(url);
            const chunks = splitIntoChunks(text, 1000);
            chunks.forEach((chunk, i) => {
                const chunkId = chunks.length > 1 ? `${id}_${i + 1}` : id;
                expanded.push({
                    ...rest,
                    [OUTPUT_COLUMN]: chunk,
                    itemId: chunkId,
                    id: rest.fileName ?? chunkId,
                    title: id,
                    category: productCategory,
                    productCategory: productCategory,
                });
            });
        }
        catch (err) {
            console.error(`Failed: ${url} - ${err.message}`);
            expanded.push({
                ...rest,
                [OUTPUT_COLUMN]: `ERROR: ${err.message}`,
                itemId: id,
                id: rest.fileName ?? id,
                title: id,
                category: productCategory,
                productCategory: productCategory,
            });
        }
    }

    const jsonPath = await saveResults(expanded);
    await exportCsv(expanded, jsonPath);

    if (SYNC_SYNERISE) {
        await syncToSynerise(expanded);
    }
    console.log("Done.")
}

main();