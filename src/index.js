import { extractText } from "unpdf";
import { readFileSync } from "fs";
import { parse } from "csv-parse/sync";
import { saveResults } from "./storage.js";
import { SYNC_SYNERISE, SOURCE_FILE } from "../config.js";
import { syncToSynerise } from "./syne-client.js";

const URL_COLUMN = "url"
const OUTPUT_COLUMN = "content"

async function extractTextFromUrl(url) {
    const res = await fetch(url);

    if (!res.ok) throw new Error(`Failed to fetch PDF: ${res.status}`);

    const buffer = await res.arrayBuffer();
    const { text } = await extractText(new Uint8Array(buffer));
    return (Array.isArray(text) ? text.join(" ") : String(text))
        .replace(/\s+/g, " ")
        .trim();
}

async function main() {
    const records = parse(readFileSync(`${SOURCE_FILE}`, "utf-8"), {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
    });

    for (const record of records) {
        const url = record[URL_COLUMN];
        const splitUrl = url.split('/');
        const id = splitUrl[splitUrl.length - 1].replace('.pdf', '');
        console.log(`Processing: ${url}`);
        try {
            record[OUTPUT_COLUMN] = await extractTextFromUrl(url);
            record.id = id;
            record.title = id;
        }
        catch {
            console.error(`Failed: ${url} - ${err.message}`);
            record[OUTPUT_COLUMN] = `ERROR: ${err.message}`;
        }
    }

    await saveResults(records);

    if (SYNC_SYNERISE) {
        await syncToSynerise(records);
    }
    console.log("Done.")
}

main();