/**
 * POST /api/map — M3.3 : tâches → étapes du template
 * GET  /api/template/:type — les 8 étapes + libellés (pour B)
 */
import { Router } from 'express';
import { zMappingRequest } from '../services/llm/schemas.js';
import { mapTasks, calquesVisibles } from '../services/llm/mapping.service.js';
import { TEMPLATE_VOCAB } from '../services/llm/prompts.js';
import { ETAPES_MAISON, LIBELLES_ETAPES, TEMPLATE_TYPES } from '../types/index.js';
import { badRequest, fail } from './_helpers.js';
import type { TemplateType } from '../types/index.js';

export const mappingRouter = Router();

mappingRouter.post('/map', async (req, res) => {
  const parsed = zMappingRequest.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    const result = await mapTasks(parsed.data);
    return res.json({ ...result, calques: calquesVisibles(result.etapes_debloquees) });
  } catch (err) {
    return fail(res, err, 'map');
  }
});

/** Référentiel des étapes : B et D consomment ça pour nommer les calques. */
mappingRouter.get('/template/:type', (req, res) => {
  const type = req.params.type as TemplateType;
  if (!TEMPLATE_TYPES.includes(type)) {
    return res.status(404).json({ ok: false, code: 'NOT_FOUND', error: `Template inconnu : ${type}` });
  }
  return res.json({
    type,
    etapes: ETAPES_MAISON.map((e, i) => ({
      ordre: i + 1,
      etape: e,
      libelle: LIBELLES_ETAPES[e],
      vocabulaire: TEMPLATE_VOCAB[type][e],
      calque: `${type}/${String(i + 1).padStart(2, '0')}-${e}.svg`,
    })),
  });
});

mappingRouter.get('/templates', (_req, res) => {
  res.json({ templates: TEMPLATE_TYPES });
});
