import { existsSync, readFileSync } from "fs";

function loadEnvFile(path = '.env') {
    if (!existsSync(path)) return;
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex === -1) continue;
        const key = trimmed.slice(0, eqIndex).trim();
        const value = trimmed.slice(eqIndex + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) process.env[key] = value;
    }
}

loadEnvFile();

export const SYNERISE_API_KEY = process.env.SYNERISE_API_KEY || '';
export const SYNERISE_CATALOG_ID = process.env.SYNERISE_CATALOG_ID || '';
export const SYNERISE_API_BASE_URL = process.env.SYNERISE_API_BASE_URL || 'https://api.azu.synerise.com';
export const SYNERISE_BATCH_SIZE = 100;
export const REQUEST_DELAY_MS = 50;

export const SOURCE_FILE = process.env.SOURCE_FILE || '';

export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

export const SYNC_SYNERISE = process.env.SYNC_SYNERISE === 'true' || process.argv.includes('--sync-synerise');