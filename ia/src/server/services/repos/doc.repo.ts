/**
 * Persistance des documents produits par l'IA (M2.4 : validation par D/B).
 * type ∈ 'previously' | 'todolist' | 'resume' | 'lettre' | 'signal'
 */
import { query } from '../../db/client.js';

export type DocType = 'previously' | 'todolist' | 'resume' | 'lettre' | 'signal';

export async function saveDoc(params: {
  projectId: string;
  type: DocType;
  contenu: unknown;
  source: 'repo' | 'genere' | 'mixte';
  valide?: boolean;
}): Promise<void> {
  await query(
    `INSERT INTO doc (project_id, type, contenu_json, source, valide, cree_le)
     VALUES ($1, $2, $3::jsonb, $4, $5, NOW())`,
    [
      params.projectId,
      params.type,
      JSON.stringify(params.contenu),
      params.source,
      params.valide ?? false,
    ],
  );
}

export async function getDocs(projectId: string) {
  const res = await query<{
    id: string;
    type: DocType;
    contenu_json: unknown;
    source: string;
    valide: boolean;
    cree_le: string;
  }>(
    'SELECT id, type, contenu_json, source, valide, cree_le FROM doc WHERE project_id = $1 ORDER BY id DESC',
    [projectId],
  );
  return (res?.rows ?? []).map((r) => ({
    ...r,
    contenu_json: typeof r.contenu_json === 'string' ? JSON.parse(r.contenu_json) : r.contenu_json,
  }));
}

export async function saveSignal(params: {
  projectId: string;
  declencheur: string;
  style: string;
  contenu: unknown;
  canal: string;
}): Promise<string | null> {
  const res = await query<{ id: string }>(
    `INSERT INTO signal (project_id, declencheur, style, contenu, canal, envoye_le, lu)
     VALUES ($1, $2, $3, $4::jsonb, $5, NOW(), false)
     RETURNING id`,
    [params.projectId, params.declencheur, params.style, JSON.stringify(params.contenu), params.canal],
  );
  return res?.rows?.[0]?.id ?? null;
}
