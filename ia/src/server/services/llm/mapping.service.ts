/**
 * M3.3 — Mapping sémantique : tâches → étapes du template du rêve.
 * C'est le maillon qui transforme « j'ai écrit du SQL » en « les fondations sont coulées ».
 */
import { callLLM, LlmUnavailableError } from './client.js';
import { zMappingLLM } from './schemas.js';
import { MAPPING_SYSTEM, mappingUserPrompt } from './prompts.js';
import { cacheGet, cacheKey, cacheSet } from '../utils/cache.js';
import { computeProgression } from '../utils/progression.js';
import { fallbackMapping } from './fallbacks.js';
import { updateProjectProgress } from '../repos/project.repo.js';
import { ETAPES_MAISON, LIBELLES_ETAPES } from '../../types/index.js';
import type { MappedTask, MappingRequest, MappingResponse, EtapeMaison } from '../../types/index.js';

export async function mapTasks(req: MappingRequest): Promise<MappingResponse> {
  const key = cacheKey('mapping', req.projectId, {
    templateType: req.templateType,
    labels: req.tasks.map((t) => t.label),
  });

  if (!req.force) {
    const hit = await cacheGet<MappingResponse>(key);
    if (hit && !hit.degraded) {
      // Les états "done" changent souvent : on recalcule la progression sur le cache
      return recompute({ ...hit, cached: true }, req);
    }
  }

  let mapped: { label: string; etape_template: EtapeMaison; poids: number; raison: string }[];
  let degraded = false;

  try {
    const out = await callLLM(
      {
        tag: 'mapping',
        system: MAPPING_SYSTEM,
        user: mappingUserPrompt({
          templateType: req.templateType,
          reveLabel: req.reveLabel,
          tasks: req.tasks,
        }),
        temperature: 0.2,
        maxTokens: 2000,
      },
      zMappingLLM,
    );
    mapped = out.tasks;
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error('[mapping] erreur inattendue', err);
    mapped = fallbackMapping(req.tasks).tasks;
    degraded = true;
  }

  // Sécurité : toute tâche non retournée par le LLM est rattachée par heuristique
  const parLabel = new Map(mapped.map((m) => [m.label, m]));
  const secours = fallbackMapping(req.tasks).tasks;
  const secoursParLabel = new Map(secours.map((m) => [m.label, m]));

  const tasks: MappedTask[] = req.tasks.map((t) => {
    const m = parLabel.get(t.label) ?? secoursParLabel.get(t.label)!;
    return {
      id: t.id,
      label: t.label,
      etape_template: m.etape_template,
      poids: t.poids ?? m.poids,
      done: t.done ?? false,
      raison: m.raison,
    };
  });

  const prog = computeProgression(tasks);

  const response: MappingResponse = {
    projectId: req.projectId,
    templateType: req.templateType,
    tasks,
    progression: prog.progression,
    etape_courante: prog.etape_courante,
    etape_libelle: prog.etape_libelle,
    etapes_debloquees: prog.etapes_debloquees,
    taches_avant_prochaine_etape: prog.taches_avant_prochaine_etape,
    cached: false,
    degraded,
  };

  await Promise.allSettled([
    degraded ? Promise.resolve() : cacheSet(key, 'mapping', req.projectId, response),
    updateProjectProgress({
      projectId: req.projectId,
      progression: prog.progression,
      etape: prog.etape_courante,
      etapeLibelle: prog.etape_libelle,
    }),
  ]);

  return response;
}

/** Recalcule la progression à partir d'un mapping en cache + des "done" à jour. */
function recompute(cached: MappingResponse, req: MappingRequest): MappingResponse {
  const doneByLabel = new Map(req.tasks.map((t) => [t.label, t.done ?? false]));
  const tasks = cached.tasks.map((t) => ({ ...t, done: doneByLabel.get(t.label) ?? t.done }));
  const prog = computeProgression(tasks);
  return {
    ...cached,
    tasks,
    progression: prog.progression,
    etape_courante: prog.etape_courante,
    etape_libelle: prog.etape_libelle,
    etapes_debloquees: prog.etapes_debloquees,
    taches_avant_prochaine_etape: prog.taches_avant_prochaine_etape,
  };
}

/** Utilitaire exposé à B : quelles couches SVG afficher. */
export function calquesVisibles(etapesDebloquees: EtapeMaison[]): { etape: EtapeMaison; libelle: string; visible: boolean }[] {
  return ETAPES_MAISON.map((e) => ({
    etape: e,
    libelle: LIBELLES_ETAPES[e],
    visible: etapesDebloquees.includes(e),
  }));
}
