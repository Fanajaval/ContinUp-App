/**
 * M7 — La lettre venue du futur, écrite par le projet achevé.
 * C'est la boucle du sujet qui se referme : la lettre de Soa reçoit sa réponse.
 */
import { callLLM, LlmUnavailableError } from './client.js';
import { zLetterLLM } from './schemas.js';
import { LETTER_SYSTEM, letterUserPrompt } from './prompts.js';
import { cacheGet, cacheKey, cacheSet } from '../utils/cache.js';
import { fallbackLetter } from './fallbacks.js';
import { getProjectContext } from '../repos/project.repo.js';
import { saveDoc } from '../repos/doc.repo.js';
import type { LetterRequest, LetterResponse, TemplateType } from '../../types/index.js';

export async function genererLettre(req: LetterRequest): Promise<LetterResponse> {
  const projet = await getProjectContext(req.projectId);

  const pseudo = req.pseudo ?? projet?.pseudo ?? undefined;
  const reveLabel = req.reveLabel ?? projet?.reve_label ?? undefined;
  const projectName = req.projectName ?? projet?.repo_url?.split('/').pop() ?? 'ce projet';
  const templateType: TemplateType = req.templateType ?? (projet?.template_type as TemplateType) ?? 'maison';

  const key = cacheKey('letter', req.projectId, { pseudo, reveLabel, projectName, parcours: req.parcours });

  if (!req.force) {
    const hit = await cacheGet<LetterResponse>(key);
    if (hit && !hit.degraded) return { ...hit, cached: true };
  }

  let letter;
  let degraded = false;

  try {
    letter = await callLLM(
      {
        tag: 'letter',
        system: LETTER_SYSTEM,
        user: letterUserPrompt({
          pseudo,
          projectName,
          reveLabel,
          templateType,
          parcours: req.parcours,
          moments_cles: req.moments_cles,
        }),
        temperature: 0.9, // la lettre a le droit d'être belle
        maxTokens: 1600,
      },
      zLetterLLM,
    );
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error('[letter] erreur inattendue', err);
    letter = fallbackLetter({
      projectName,
      pseudo,
      reveLabel,
      retours: req.parcours?.nb_retours_apres_silence,
      briques: req.parcours?.nb_briques,
      jours: req.parcours?.jours_total,
    });
    degraded = true;
  }

  const response: LetterResponse = {
    projectId: req.projectId,
    titre: letter.titre,
    corps: letter.corps,
    citation: letter.citation,
    signature: letter.signature,
    cached: false,
    degraded,
    generated_at: new Date().toISOString(),
  };

  await Promise.allSettled([
    degraded ? Promise.resolve() : cacheSet(key, 'letter', req.projectId, response),
    saveDoc({ projectId: req.projectId, type: 'lettre', contenu: response, source: 'genere', valide: true }),
  ]);

  return response;
}
