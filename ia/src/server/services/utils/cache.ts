/**
 * Cache BDD des sorties IA (NF1 : aucun appel IA au chargement de page).
 * Table ai_cache : clé = hash(kind + scope + payload signifiant).
 *
 * Double niveau : mémoire (process) + PostgreSQL. La mémoire sert aux démos
 * quand la BDD n'est pas encore prête chez C.
 */
import { createHash } from 'node:crypto';
import { query, isDbHealthy } from '../../db/client.js';

const memory = new Map<string, { value: unknown; at: number }>();
const MEM_TTL_MS = 1000 * 60 * 60 * 6; // 6h, largement au-delà du hackathon

export type CacheKind = 'analyze' | 'mapping' | 'signal' | 'letter' | 'dreams';

export function cacheKey(kind: CacheKind, scope: string, payload: unknown): string {
  const h = createHash('sha256')
    .update(JSON.stringify({ kind, scope, payload }))
    .digest('hex')
    .slice(0, 32);
  return `${kind}:${scope}:${h}`;
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const mem = memory.get(key);
  if (mem && Date.now() - mem.at < MEM_TTL_MS) return mem.value as T;

  const res = await query<{ contenu: unknown }>(
    'SELECT contenu FROM ai_cache WHERE cle = $1 LIMIT 1',
    [key],
  );
  const row = res?.rows?.[0];
  if (!row) return null;

  const value = typeof row.contenu === 'string' ? JSON.parse(row.contenu) : row.contenu;
  memory.set(key, { value, at: Date.now() });
  return value as T;
}

export async function cacheSet(key: string, kind: CacheKind, scope: string, value: unknown): Promise<void> {
  memory.set(key, { value, at: Date.now() });
  await query(
    `INSERT INTO ai_cache (cle, kind, scope, contenu, cree_le)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (cle) DO UPDATE SET contenu = EXCLUDED.contenu, cree_le = NOW()`,
    [key, kind, scope, JSON.stringify(value)],
  );
}

/** Utilisé par les endpoints admin de D pour rejouer une démo proprement. */
export async function cacheInvalidateScope(scope: string): Promise<void> {
  for (const k of memory.keys()) if (k.includes(`:${scope}:`)) memory.delete(k);
  await query('DELETE FROM ai_cache WHERE scope = $1', [scope]);
}

export const cacheStatus = () => ({
  memoryEntries: memory.size,
  dbHealthy: isDbHealthy(),
});
