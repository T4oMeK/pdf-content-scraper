import {
    SYNERISE_API_KEY,
    SYNERISE_API_BASE_URL,
    SYNERISE_CATALOG_ID,
    SYNERISE_BATCH_SIZE,
    REQUEST_DELAY_MS
} from '../config.js'

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function login() {
    const url = `${SYNERISE_API_BASE_URL}/v4/auth/login/profile`;

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Api-Version': '4.4',
            'Content-Type': 'application/json',
            Accept: 'application/json',
        },
        body: JSON.stringify({ apiKey: SYNERISE_API_KEY }),
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Synerise login failed: ${response.status} - ${body}`);
    }

    const data = await response.json();
    return data.token;
}

function mapToCatalogItems(files) {
    return files.map((file) => ({
        itemKey: file.id,
        value: {
            title: file.title,
            url: file.url,
            content: file.content,
        }
    }));
}

async function sendBatch(token, items) {
    const url = `${SYNERISE_API_BASE_URL}/catalogs/bags/${SYNERISE_CATALOG_ID}/items/batch`;

    const response = await fetch(url, {
       method: 'POST',
       headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
       },
       body: JSON.stringify(items),
    });
}

function validateConfig() {
  if (!SYNERISE_API_KEY) {
    throw new Error('SYNERISE_API_KEY is not set. Add it to .env or environment variables.');
  }
  if (!SYNERISE_CATALOG_ID) {
    throw new Error('SYNERISE_CATALOG_ID is not set. Add it to .env or environment variables.');
  }
}

export async function syncToSynerise(pages) {
  validateConfig();

  console.log('\nSyncing to Synerise...');
  console.log(`  Catalog ID: ${SYNERISE_CATALOG_ID}`);

  const token = await login();
  console.log('  Authenticated successfully');

  const items = mapToCatalogItems(pages);

  const batches = [];
  for (let i = 0; i < items.length; i += SYNERISE_BATCH_SIZE) {
    batches.push(items.slice(i, i + SYNERISE_BATCH_SIZE));
  }

  console.log(`  Sending ${items.length} items in ${batches.length} batch(es)...`);

  for (let i = 0; i < batches.length; i++) {
    await sendBatch(token, batches[i]);
    console.log(`  Batch ${i + 1}/${batches.length}: ${batches[i].length} items sent`);

    if (i < batches.length - 1) {
      await sleep(REQUEST_DELAY_MS);
    }
  }

  console.log(`Synerise sync complete: ${items.length} items`);
}