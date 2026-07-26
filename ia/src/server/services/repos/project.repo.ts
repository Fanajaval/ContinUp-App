/**
 * Accès BDD côté A : lecture de contexte projet + écriture des résultats d'analyse.
 * Tolérant : si la BDD de C n'est pas prête, tout renvoie null / no-op.
 */
import { query } from '../../db/client.js';
import type { EtapeMaison, TemplateType } from '../../types/index.js';

export interface ProjectRow {
  id: string;
  user_id: string | null;
  reve_id: string | null;
  repo_url: string | null;
  template_type: TemplateType | null;
  statut: string | null;
  progression: number | null;
  etape_semantique: string | null;
  derniere_activite: string | null;
  reve_label?: string | null;
  pseudo?: string | null;
  style_signal?: string | null;
}

export async function getProjectContext(projectId: string): Promise<ProjectRow | null> {
  const res = await query<ProjectRow>(
    `SELECT p.*, r.label AS reve_label, u.pseudo, u.style_signal
       FROM project p
       LEFT JOIN reve r ON r.id = p.reve_id
       LEFT JOIN "user" u ON u.id = p.user_id
      WHERE p.id = $1
      LIMIT 1`,
    [projectId],
  );
  return res?.rows?.[0] ?? null;
}

export async function updateProjectProgress(params: {
  projectId: string;
  progression: number;
  etape: EtapeMaison;
  etapeLibelle: string;
}): Promise<void> {
  // M3.4 : jamais de régression visuelle → GREATEST sur la progression
  await query(
    `UPDATE project
        SET progression = GREATEST(COALESCE(progression, 0), $2),
            etape_semantique = $3,
            derniere_activite = NOW()
      WHERE id = $1`,
    [params.projectId, Math.round(params.progression), params.etapeLibelle],
  );
}

export async function replaceTasks(
  projectId: string,
  tasks: { label: string; done: boolean; poids: number; etape_template: string; duree_estimee_min: number }[],
): Promise<void> {
  const del = await query('DELETE FROM task WHERE project_id = $1', [projectId]);
  if (!del) return; // BDD absente : on ne tente pas les insertions

  for (const t of tasks) {
    await query(
      `INSERT INTO task (project_id, label, done, poids, etape_template, duree_estimee)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [projectId, t.label, t.done, t.poids, t.etape_template, t.duree_estimee_min],
    );
  }
}

export async function getTasks(projectId: string) {
  const res = await query<{
    id: string;
    label: string;
    done: boolean;
    poids: number;
    etape_template: string;
    duree_estimee: number;
  }>(
    'SELECT id, label, done, poids, etape_template, duree_estimee FROM task WHERE project_id = $1 ORDER BY id',
    [projectId],
  );
  return res?.rows ?? [];
}

/** Dernier Previously connu — sert de secours quand C ne passe pas de micro-action. */
export async function getLastPreviously(projectId: string): Promise<{
  prochaine_action?: string;
  point_de_reprise?: string;
  ou_tu_en_es?: string;
} | null> {
  const res = await query<{ contenu_json: unknown }>(
    `SELECT contenu_json FROM doc
      WHERE project_id = $1 AND type = 'previously'
      ORDER BY id DESC LIMIT 1`,
    [projectId],
  );
  const row = res?.rows?.[0];
  if (!row) return null;
  const c = typeof row.contenu_json === 'string' ? JSON.parse(row.contenu_json) : row.contenu_json;
  return c as { prochaine_action?: string; point_de_reprise?: string; ou_tu_en_es?: string };
}
