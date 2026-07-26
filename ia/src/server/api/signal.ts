/**
 * POST /api/signal           — M4 : génère un signal (S1/S3/S5/S6)
 * GET  /api/signal/preview   — M1.4 : préviews de style (instantané, sans LLM)
 * POST /api/signal/audit     — outil QA de D : teste un texte contre la règle d'or
 * POST /api/signal/simulate  — démo : génère les 4 styles d'un déclencheur
 */
import { Router } from 'express';
import { zSignalRequest } from '../services/llm/schemas.js';
import { genererSignal, previewStyles } from '../services/llm/signal.service.js';
import { verifierRegleDor, auditSignalResponse } from '../services/llm/guardrails.js';
import { STYLES_SIGNAL, DECLENCHEURS } from '../types/index.js';
import { badRequest, fail } from './_helpers.js';
import type { Declencheur, StyleSignal, TemplateType } from '../types/index.js';

export const signalRouter = Router();

signalRouter.post('/signal', async (req, res) => {
  const parsed = zSignalRequest.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error);

  try {
    const signal = await genererSignal(parsed.data);
    const audit = auditSignalResponse(signal);
    // On sert quand même : le signal a déjà été assaini. L'audit est informatif.
    return res.json({ ...signal, audit });
  } catch (err) {
    return fail(res, err, 'signal');
  }
});

/** Préviews live de l'onboarding — 0 ms, 0 token. */
signalRouter.get('/signal/preview', (req, res) => {
  const reve = (req.query.reve as string) || 'ta maison';
  const template = ((req.query.template as string) || 'maison') as TemplateType;
  res.json({ reve, template, previews: previewStyles(reve, template) });
});

/** QA : D colle un texte, on répond conforme / non conforme. */
signalRouter.post('/signal/audit', (req, res) => {
  const { titre = '', corps = '', preuve_de_progres = '', micro_action = '', cta_label = 'Reprendre', declencheur = 'S3' } =
    req.body ?? {};
  const result = verifierRegleDor(
    { titre, corps, preuve_de_progres, micro_action, micro_action_duree_min: 20, cta_label },
    declencheur as Declencheur,
  );
  res.json(result);
});

/** Démo : les 4 styles d'un même déclencheur, côte à côte. */
signalRouter.post('/signal/simulate', async (req, res) => {
  const declencheur = ((req.body?.declencheur as Declencheur) ?? 'S3') as Declencheur;
  const projectId = (req.body?.projectId as string) ?? 'demo';
  if (!DECLENCHEURS.includes(declencheur)) {
    return res.status(400).json({ ok: false, code: 'BAD_REQUEST', error: 'déclencheur inconnu' });
  }

  try {
    const results = await Promise.all(
      STYLES_SIGNAL.map(async (style: StyleSignal) => {
        const s = await genererSignal({
          projectId,
          declencheur,
          style,
          canal: declencheur === 'S3' ? 'email' : 'in_app',
          contexte: req.body?.contexte ?? {},
          force: Boolean(req.body?.force),
        });
        return { style, titre: s.titre, corps: s.corps, micro_action: s.micro_action, regle_dor_ok: s.regle_dor_ok, degraded: s.degraded };
      }),
    );
    return res.json({ declencheur, results });
  } catch (err) {
    return fail(res, err, 'signal/simulate');
  }
});
