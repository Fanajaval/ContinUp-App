/**
 * Applique schema.sql. Idempotent : `npm run db:migrate` autant de fois qu'on veut.
 */
import 'dotenv/config';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { pool, DB_ENABLED, closeDb } from './client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  if (!DB_ENABLED || !pool) {
    console.error('❌ DATABASE_URL absent — renseigne .env (valeur fournie par C).');
    process.exit(1);
  }
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('✅ Schéma appliqué.');
  await closeDb();
}

main().catch((e) => {
  console.error('❌ Migration échouée :', e.message);
  process.exit(1);
});
