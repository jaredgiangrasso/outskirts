import { runIngestion } from './ingest/index.js';
import { runCataloguing } from './catalogue/index.js';

async function main() {
  console.log('=== ADK Shelter Explorer Pipeline ===\n');
  console.log('[stage] Ingestion');
  await runIngestion();
  console.log('\n[stage] Cataloguing');
  await runCataloguing();
  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
