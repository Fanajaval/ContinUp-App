/**
 * M4 — LE MOTEUR DE SIGNAUX.  💎 LE JOYAU
 *
 * « on est le seul outil dont le moment d'activité maximale est le silence
 *   de l'utilisateur. »
 *
 * Chaîne : contexte (C) → prompt style×déclencheur×rêve → LLM → Zod
 *          → VALIDATEUR RÈGLE D'OR → (réparation | assainissement | fallback)
 *          → cache + persistance → réponse prête à envoyer (in-app + email).
 *
 * Garantie : cette fonction renvoie TOUJOURS un signal conforme.
 */
import { callLLM, LlmUnavailableError } from './client.js';
import { zSignalLLM } from './schemas.js';
import { SIGNAL_SYSTEM, signalUserPrompt } from './prompts.js';
import { verifierRegleDor, consigneReparation, assainir } from './guardrails.js';
import { fallbackSignal } from './fallbacks.js';
import { cacheGet, cacheKey, cacheSet } from '../utils/cache.js';
import { getLastPreviously, getProjectContext, getTasks } from '../repos/project.repo.js';
import { saveSignal } from '../repos/doc.repo.js';
import { computeProgression, preuveDeProgres } from '../utils/progression.js';
import { LIBELLES_ETAPES } from '../../types/index.js';
import type {
  EtapeMaison,
  SignalContexte,
  SignalRequest,
  SignalResponse,
  TemplateType,
} from '../../types/index.js';
import type { SignalLLM } from './schemas.js';

const APP_BASE_URL = process.env.APP_BASE_URL ?? 'http://localhost:3000';

export async function genererSignal(req: SignalRequest): Promise<SignalResponse> {
  // ── 1. Enrichissement du contexte depuis la BDD (C n'a pas à tout passer) ──
  const ctx = await enrichirContexte(req.projectId, req.contexte);
  const templateType: TemplateType = ctx.templateType ?? 'maison';
  const canal = req.canal ?? 'in_app';

  // ── 2. Cache — un même contexte ne re-génère pas (NF1) ──
  const key = cacheKey('signal', req.projectId, {
    declencheur: req.declencheur,
    style: req.style,
    canal,
    progression: ctx.progression,
    etape: ctx.etape_courante,
    action: ctx.micro_action,
    relance: ctx.relance_index ?? 0,
  });

  if (!req.force) {
    const hit = await cacheGet<SignalResponse>(key);
    if (hit && !hit.degraded) return { ...hit, cached: true };
  }

  // ── 3. Génération + validation, avec réparation ciblée ──
  let signal: SignalLLM | null = null;
  let degraded = false;

  try {
    signal = await genererAvecValidation({
      declencheur: req.declencheur,
      style: req.style,
      canal,
      templateType,
      ctx,
    });
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error('[signal] erreur inattendue', err);
    degraded = true;
  }

  if (!signal) {
    signal = fallbackSignal({ declencheur: req.declencheur, style: req.style, templateType, ctx });
    degraded = true;
  }

  // ── 4. Audit final : même le fallback passe au contrôle ──
  const audit = verifierRegleDor(signal, req.declencheur);
  if (!audit.ok) {
    console.warn('[signal] fallback assaini après violations :', audit.violations.map((v) => v.regle));
    signal = assainir(signal);
  }

  const etape: EtapeMaison = ctx.etape_courante ?? 'fondations';
  const cta_url = `${APP_BASE_URL}/projet/${req.projectId}?from=signal&d=${req.declencheur}`;

  const response: SignalResponse = {
    projectId: req.projectId,
    declencheur: req.declencheur,
    style: req.style,
    titre: signal.titre,
    corps: signal.corps,
    preuve_de_progres: signal.preuve_de_progres,
    micro_action: signal.micro_action,
    micro_action_duree_min: signal.micro_action_duree_min,
    cta_label: signal.cta_label,
    cta_url,
    regle_dor_ok: verifierRegleDor(signal, req.declencheur).ok,
    cached: false,
    degraded,
    generated_at: new Date().toISOString(),
  };

  if (canal === 'email') {
    response.email_subject = signal.titre;
    response.email_body = composerEmail({
      signal,
      ctx,
      etapeLibelle: LIBELLES_ETAPES[etape],
      ctaUrl: cta_url,
    });
  }

  await Promise.allSettled([
    degraded ? Promise.resolve() : cacheSet(key, 'signal', req.projectId, response),
    saveSignal({
      projectId: req.projectId,
      declencheur: req.declencheur,
      style: req.style,
      contenu: response,
      canal,
    }),
  ]);

  return response;
}

/**
 * Génération + boucle de réparation : si le LLM viole la règle d'or,
 * on lui renvoie ses violations et on retente UNE fois. Sinon fallback.
 */
async function genererAvecValidation(params: {
  declencheur: SignalRequest['declencheur'];
  style: SignalRequest['style'];
  canal: 'in_app' | 'email';
  templateType: TemplateType;
  ctx: SignalContexte;
}): Promise<SignalLLM | null> {
  const basePrompt = signalUserPrompt({
    declencheur: params.declencheur,
    style: params.style,
    canal: params.canal,
    templateType: params.templateType,
    ctx: params.ctx,
  });

  const first = await callLLM(
    {
      tag: `signal:${params.declencheur}:${params.style}`,
      system: SIGNAL_SYSTEM,
      user: basePrompt,
      temperature: params.declencheur === 'S3' ? 0.75 : 0.85,
      maxTokens: 900,
    },
    zSignalLLM,
  );

  const check = verifierRegleDor(first, params.declencheur);
  if (check.ok) return first;

  console.warn(
    `[signal:${params.declencheur}] règle d'or violée, réparation demandée :`,
    check.violations.map((v) => v.regle),
  );

  try {
    const repaired = await callLLM(
      {
        tag: `signal:${params.declencheur}:repair`,
        system: SIGNAL_SYSTEM,
        user: `${basePrompt}\n\n${consigneReparation(check.violations)}`,
        temperature: 0.5,
        maxTokens: 900,
      },
      zSignalLLM,
    );
    const recheck = verifierRegleDor(repaired, params.declencheur);
    return recheck.ok ? repaired : assainir(repaired);
  } catch {
    return assainir(first);
  }
}

/**
 * Complète le contexte avec la BDD : preuve de progrès réelle et
 * micro-action fraîche issue du dernier Previously (fiche A, H+11-H+13).
 */
async function enrichirContexte(projectId: string, partiel: SignalContexte): Promise<SignalContexte> {
  const ctx: SignalContexte = { ...partiel };

  const projet = await getProjectContext(projectId);
  if (projet) {
    ctx.pseudo ??= projet.pseudo ?? undefined;
    ctx.reveLabel ??= projet.reve_label ?? undefined;
    ctx.templateType ??= (projet.template_type as TemplateType) ?? undefined;
    ctx.progression ??= projet.progression ?? undefined;
  }

  const tasks = await getTasks(projectId);
  if (tasks.length) {
    const typed = tasks.map((t) => ({
      done: t.done,
      poids: t.poids ?? 1,
      etape_template: t.etape_template as EtapeMaison,
      label: t.label,
    }));
    const prog = computeProgression(typed);
    ctx.progression ??= prog.progression;
    ctx.etape_courante ??= prog.etape_courante;
    ctx.prochaine_etape ??= prog.prochaine_etape ?? undefined;
    ctx.taches_avant_deblocage ??= prog.taches_avant_prochaine_etape;
    ctx.preuve_de_progres ??= preuveDeProgres(typed as never, prog);

    if (!ctx.micro_action) {
      const ouverte = typed.find((t) => !t.done);
      if (ouverte) ctx.micro_action = ouverte.label;
    }
  }

  if (!ctx.micro_action) {
    const prev = await getLastPreviously(projectId);
    if (prev?.prochaine_action) {
      ctx.micro_action = prev.prochaine_action;
      ctx.micro_action_duree_min ??= 20;
    }
  }

  ctx.micro_action_duree_min ??= 20;
  return ctx;
}

/** Email S3 : c'est souvent le SEUL contact avec un utilisateur silencieux (M4.5). */
function composerEmail(params: {
  signal: SignalLLM;
  ctx: SignalContexte;
  etapeLibelle: string;
  ctaUrl: string;
}): string {
  const { signal, ctx, etapeLibelle, ctaUrl } = params;
  const prog = ctx.progression != null ? `${Math.round(ctx.progression)} % — ${etapeLibelle}` : etapeLibelle;

  return `${signal.corps}

──────────────────────────────
📍 Où en est ton rêve : ${prog}
🧱 Ce qui existe déjà : ${signal.preuve_de_progres}
🎯 Une seule chose, ${signal.micro_action_duree_min} minutes : ${signal.micro_action}

👉 ${signal.cta_label} : ${ctaUrl}
──────────────────────────────

Tu peux aussi ne rien faire aujourd'hui. Ton chantier ne bougera pas d'un centimètre, il t'attend.

Le Quatrième Jour`;
}

/**
 * Prévisualisation pour l'onboarding (M1.4 : choix du style avec préview live).
 * Zéro appel LLM, zéro BDD : réponse instantanée pour B.
 */
export function previewStyles(reveLabel = 'ta maison', templateType: TemplateType = 'maison') {
  const ctx: SignalContexte = {
    pseudo: 'toi',
    reveLabel,
    templateType,
    progression: 40,
    etape_courante: 'fondations',
    preuve_de_progres: '40 % du rêve est construit : les fondations sont coulées.',
    micro_action: 'Rouvrir src/routes/auth.ts et brancher la vérification du mot de passe.',
    micro_action_duree_min: 20,
    jours_de_silence: 4,
  };

  return (['sarcastique', 'motivant', 'epique', 'gamer'] as const).map((style) => {
    const s = fallbackSignal({ declencheur: 'S3', style, templateType, ctx });
    return { style, titre: s.titre, corps: s.corps };
  });
}
