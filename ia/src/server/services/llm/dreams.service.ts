/**
 * M1.3 — Analyse du portefeuille de rêves (fiche A, H+6 → H+8).
 * Sortie consommée par C pour les calculs M6 (PoidsDeRêve agrégé)
 * et par B pour proposer le bon template visuel à l'association repo↔rêve.
 */
import { callLLM, LlmUnavailableError } from './client.js';
import { zDreamsLLM } from './schemas.js';
import { DREAMS_SYSTEM, dreamsUserPrompt } from './prompts.js';
import { cacheGet, cacheKey, cacheSet } from '../utils/cache.js';
import { fallbackDreams } from './fallbacks.js';
import { query } from '../../db/client.js';
import type { DreamsAnalyzeRequest, DreamsAnalyzeResponse, DreamOut } from '../../types/index.js';

export async function analyserReves(req: DreamsAnalyzeRequest): Promise<DreamsAnalyzeResponse> {
  const key = cacheKey('dreams', req.userId, { reves: req.reves });

  if (!req.force) {
    const hit = await cacheGet<DreamsAnalyzeResponse>(key);
    // Ne jamais resservir un échec LLM caché — on retente Groq
    if (hit && !hit.degraded) return { ...hit, cached: true };
  }

  let reves: DreamOut[];
  let degraded = false;

  try {
    const out = await callLLM(
      {
        tag: 'dreams',
        system: DREAMS_SYSTEM,
        user: dreamsUserPrompt(req.reves),
        temperature: 0.3,
        maxTokens: 1500,
      },
      zDreamsLLM,
    );
    // Sécurité : chaque rêve saisi doit ressortir, même si le LLM en oublie
    const parLabel = new Map(out.reves.map((r) => [r.label.toLowerCase().trim(), r]));
    const secours = fallbackDreams(req.reves).reves;
    reves = req.reves.map((label, i) => parLabel.get(label.toLowerCase().trim()) ?? secours[i]);
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error('[dreams] erreur inattendue', err);
    else console.warn('[dreams]', err.message);
    reves = fallbackDreams(req.reves).reves;
    degraded = true;
  }

  const response: DreamsAnalyzeResponse = { userId: req.userId, reves, cached: false, degraded };

  await Promise.allSettled([
    // On ne cache que les succès réels (sinon le mode dégradé se fige)
    degraded ? Promise.resolve() : cacheSet(key, 'dreams', req.userId, response),
    persisterReves(req.userId, reves),
  ]);

  return response;
}

/** Écriture dans la table reve de C — best-effort. */
async function persisterReves(userId: string, reves: DreamOut[]): Promise<void> {
  for (const r of reves) {
    await query(
      `INSERT INTO reve (user_id, label, categorie, poids_de_reve, template_type, statut)
       VALUES ($1, $2, $3, $4, $5, 'actif')
       ON CONFLICT (user_id, label) DO UPDATE
         SET categorie = EXCLUDED.categorie,
             poids_de_reve = EXCLUDED.poids_de_reve,
             template_type = EXCLUDED.template_type`,
      [userId, r.label_normalise, r.categorie, r.poids_de_reve, r.template_type],
    );
  }
}
