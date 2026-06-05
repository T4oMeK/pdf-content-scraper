import { writeFile } from 'fs/promises';

const SKIP_COLUMNS = new Set(['imageUrl', 'url', 'content']);
const MAX_BYTES = 190 * 1024 * 1024;

function csvEscape(value) {
    if (value === null || value === undefined) return '';
    const s = typeof value === 'object' ? JSON.stringify(value) : String(value);
    return /[,"\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function decodePercent(value) {
    if (typeof value !== 'string' || !value.includes('%')) return value;
    try {
        const decoded = decodeURIComponent(value);
        return decoded !== value ? decoded : value;
    } catch {
        return value;
    }
}

export async function exportCsv(data, jsonPath) {
    if (!Array.isArray(data) || data.length === 0) {
        console.log('exportCsv: no rows to write.');
        return [];
    }

    const columnSet = new Set();
    for (const row of data) {
        for (const k of Object.keys(row)) columnSet.add(k);
    }
    const columns = [...columnSet];

    const headerLine = columns.map(csvEscape).join(',') + '\n';
    const headerBytes = Buffer.byteLength(headerLine, 'utf-8');

    const base = jsonPath.replace(/\.json$/i, '') + '_decoded';
    const outputs = [];

    let part = 1;
    let buffer = [headerLine];
    let currentBytes = headerBytes;
    let decodedCells = 0;

    const flush = async () => {
        const path = `${base}_part${part}.csv`;
        await writeFile(path, buffer.join(''), 'utf-8');
        outputs.push(path);
        console.log(`Wrote ${path}`);
    };

    for (const row of data) {
        const cells = columns.map(c => {
            const v = row[c];
            if (SKIP_COLUMNS.has(c)) return v;
            const d = decodePercent(v);
            if (d !== v) decodedCells++;
            return d;
        });
        const line = cells.map(csvEscape).join(',') + '\n';
        const lineBytes = Buffer.byteLength(line, 'utf-8');

        if (currentBytes + lineBytes > MAX_BYTES && currentBytes > headerBytes) {
            await flush();
            part++;
            buffer = [headerLine];
            currentBytes = headerBytes;
        }

        buffer.push(line);
        currentBytes += lineBytes;
    }

    await flush();

    console.log(`Rows: ${data.length}, decoded cells: ${decodedCells}, parts: ${outputs.length}`);
    return outputs;
}
