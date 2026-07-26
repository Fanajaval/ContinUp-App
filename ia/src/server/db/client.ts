/**
 * Pool PostgreSQL partagé (le DATABASE_URL est celui de C).
 * Si la BDD est absente, le serveur DÉMARRE quand même : les services
 * basculent en "no-cache" au lieu de planter (NF2, mode dégradé).
 */
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL ?? '';
const useSsl = process.env.PGSSL === '1';

export const DB_ENABLED = Boolean(connectionString);

export const pool = DB_ENABLED
  ? new Pool({
      connectionString,
      ssl: useSsl ? { rejectUnauthorized: false } : undefined,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    })
  : null;

let dbHealthy = DB_ENABLED;

export function isDbHealthy(): boolean {
  return dbHealthy;
}

/**
 * Requête tolérante : en cas d'indisponibilité BDD on log et on renvoie null.
 * Aucun appel IA ne doit jamais échouer à cause du cache.
 */
export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: unknown[] = [],
): Promise<pg.QueryResult<T> | null> {
  if (!pool) return null;
  try {
    const res = await pool.query<T>(text, params);
    dbHealthy = true;
    return res;
  } catch (err) {
    dbHealthy = false;
    console.warn('[db] requête échouée :', err instanceof Error ? err.message : err);
    return null;
  }
}

export async function pingDb(): Promise<boolean> {
  if (!pool) return false;
  const r = await query('SELECT 1 as ok');
  return Boolean(r);
}

export async function closeDb(): Promise<void> {
  await pool?.end();
}
