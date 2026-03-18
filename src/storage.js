import { writeFile, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'output');

export async function saveResults(data) {
    await mkdir(OUTPUT_DIR, { recursive: true });

    const date = new Date().toISOString().split('T')[0];
    const filename = `${date}_documentPages.json`;
    const filepath = join(OUTPUT_DIR, filename);

    await writeFile(filepath, JSON.stringify(data, null, 2), 'utf-8');

    console.log(`\nResults saved to: ${filepath}`);
    console.log(`Total pages: ${data.length}`);
    
    const totalTexts = data.reduce((sum, page) => sum + page.content.length, 0);
    console.log(`Total text: ${totalTexts}`);

    return filepath;
}