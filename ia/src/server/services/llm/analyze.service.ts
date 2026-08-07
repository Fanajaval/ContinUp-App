/**
 * M2 — Analyse de repo.  🔒 LIVRABLE INTOUCHABLE (fiche A, H+2 → H+4:30)
 *
 * Chaîne : repo → fichiers → (fast-path docs OU génération) → LLM → Zod
 *          → progression déterministe → cache BDD → réponse au contrat d'API.
 *
 * Ne throw JAMAIS pour cause d'IA : mode dégradé garanti (NF2).
 */
import { callLLM, LlmUnavailableError } from './client.js';
import { zAnalyzeLLM } from './schemas.js';
import { ANALYZE_SYSTEM, analyzeUserPrompt } from './prompts.js';
import { fetchRepoFiles, RepoUnreachableError, detectDocs, detectStack } from '../utils/file.parser.js';
import { cacheGet, cacheKey, cacheSet } from '../utils/cache.js';
import { computeProgression } from '../utils/progression.js';
import { saveDoc } from '../repos/doc.repo.js';
import { replaceTasks, updateProjectProgress } from '../repos/project.repo.js';
import { LIBELLES_ETAPES } from '../../types/index.js';
import type { AnalyzeRequest, AnalyzeResponse, RepoFile, TaskOut, TemplateType } from '../../types/index.js';
import { fallbackAnalyze } from './fallbacks.js';

export async function analyzeRepo(req: AnalyzeRequest): Promise<AnalyzeResponse> {
  const templateType: TemplateType = req.templateType ?? 'maison';

  // ── 1. Récupération des fichiers (fournis par C, ou lus sur GitHub) ──
  let files: RepoFile[] = req.files ?? [];
  let docsDetectes: string[] = [];
  let allPaths: string[] = [];
  let stackDetectee: string[] = [];
  let repoUnreachable = false;

  if (files.length > 0) {
    allPaths = files.map((f) => f.path);
    docsDetectes = detectDocs(allPaths);
    stackDetectee = detectStack(files, allPaths);
  } else {
    try {
      const fetched = await fetchRepoFiles(req.repoUrl);
      files = fetched.files;
      docsDetectes = fetched.docsDetectes;
      allPaths = fetched.allPaths;
      stackDetectee = fetched.stackDetectee;
    } catch (err) {
      if (err instanceof RepoUnreachableError) {
        repoUnreachable = true;
        console.warn(`[analyze] ${err.message} → analyse en mode "dépôt vide"`);
      } else {
        throw err;
      }
    }
  }

  // ── 2. Cache (NF1 : aucun appel IA au chargement de page) ──
  const signature = {
    repoUrl: req.repoUrl,
    templateType,
    reveLabel: req.reveLabel ?? '',
    // empreinte du contenu : si le repo n'a pas bougé, on ne rappelle pas le LLM
    fingerprint: files.map((f) => `${f.path}:${f.content.length}`).join('|').slice(0, 2000),
  };
  const key = cacheKey('analyze', req.projectId, signature);

  if (!req.force) {
    const hit = await cacheGet<AnalyzeResponse>(key);
    if (hit && !hit.degraded) return { ...hit, cached: true };
  }

  const source: AnalyzeResponse['source'] =
    docsDetectes.length > 0 ? (files.length > docsDetectes.length ? 'mixte' : 'repo') : 'genere';

  // ── 3. Appel LLM avec repli garanti ──
  let llm: Awaited<ReturnType<typeof runAnalyzeLLM>>;
  let degraded = false;

  try {
    llm = await runAnalyzeLLM({ req, files, docsDetectes, templateType, allPaths, stackDetectee });
  } catch (err) {
    if (!(err instanceof LlmUnavailableError)) console.error('[analyze] erreur inattendue', err);
    console.warn('[analyze] mode dégradé activé');
    llm = fallbackAnalyze({ repoUrl: req.repoUrl, files, docsDetectes });
    degraded = true;
  }

  // ── 4. Progression déterministe (jamais confiée au LLM) ──
  const tasks: TaskOut[] = llm.tasks.map((t) => ({
    label: t.label,
    poids: t.poids,
    done: t.done,
    etape_template: t.etape_template,
    duree_estimee_min: t.duree_estimee_min,
    preuve: t.preuve,
  }));

  const prog = computeProgression(tasks);

  const response: AnalyzeResponse = {
    projectId: req.projectId,
    source: repoUnreachable ? 'genere' : source,
    docs_detectes: docsDetectes,
    resume_projet: llm.resume_projet,
    stack_detectee: llm.stack_detectee,
    previously: llm.previously,
    tasks,
    progression: prog.progression,
    etape_courante: prog.etape_courante,
    etape_libelle: LIBELLES_ETAPES[prog.etape_courante],
    cached: false,
    degraded,
    generated_at: new Date().toISOString(),
  };

  // ── 5. Persistance (best-effort : jamais bloquante) ──
  await Promise.allSettled([
    degraded ? Promise.resolve() : cacheSet(key, 'analyze', req.projectId, response),
    saveDoc({ projectId: req.projectId, type: 'previously', contenu: response.previously, source: response.source }),
    saveDoc({ projectId: req.projectId, type: 'todolist', contenu: response.tasks, source: response.source }),
    saveDoc({
      projectId: req.projectId,
      type: 'resume',
      contenu: { resume: response.resume_projet, stack: response.stack_detectee },
      source: response.source,
    }),
    replaceTasks(
      req.projectId,
      tasks.map((t) => ({
        label: t.label,
        done: t.done,
        poids: t.poids,
        etape_template: t.etape_template,
        duree_estimee_min: t.duree_estimee_min,
      })),
    ),
    updateProjectProgress({
      projectId: req.projectId,
      progression: prog.progression,
      etape: prog.etape_courante,
      etapeLibelle: prog.etape_libelle,
    }),
  ]);

  return response;
}

async function runAnalyzeLLM(params: {
  req: AnalyzeRequest;
  files: RepoFile[];
  docsDetectes: string[];
  templateType: TemplateType;
  allPaths: string[];
  stackDetectee: string[];
}) {
  const { req, files, docsDetectes, templateType, allPaths, stackDetectee } = params;
  return callLLM(
    {
      tag: docsDetectes.length ? 'analyze:fastpath' : 'analyze:genere',
      system: ANALYZE_SYSTEM,
      user: analyzeUserPrompt({
        repoUrl: req.repoUrl,
        files,
        docsDetectes,
        templateType,
        reveLabel: req.reveLabel,
        allPaths,
        stackDetectee,
      }),
      temperature: 0.3,
      maxTokens: 2048,
    },
    zAnalyzeLLM,
  );
}

/**
 * Analyse de diff (webhook push, fiche A H+11-H+13).
 * Version rapide : on ne rappelle pas le prompt maître complet, on demande
 * seulement quelles tâches passent à "done" au vu des chemins modifiés.
 * Coupe prévue : si ça déborde, C traite tout commit comme une brique forfaitaire.
 */
export async function analyzeDiff(params: {
  projectId: string;
  changedPaths: string[];
  tasks: { id?: string; label: string; done: boolean; poids: number; etape_template: string }[];
  commitMessages?: string[];
}): Promise<{ doneLabels: string[]; degraded: boolean }> {
  const pending = params.tasks.filter((t) => !t.done);
  if (!pending.length || !params.changedPaths.length) return { doneLabels: [], degraded: false };

  const system = `Tu détermines quelles tâches d'une todolist viennent d'être terminées, au vu des fichiers modifiés dans un commit.
Sois EXIGEANT : ne marque une tâche terminée que si les chemins modifiés la concernent clairement.
Il vaut mieux ne rien valider que valider à tort — une progression fausse casse la confiance.
Réponds en JSON strict : { "tasks": [ { "label": "copie exacte", "etape_template": "murs", "poids": 2, "raison": "fichiers concernés" } ] }
Ne mets dans "tasks" QUE les tâches réellement terminées. Liste vide autorisée.`;

  const user = `FICHIERS MODIFIÉS :
${params.changedPaths.slice(0, 60).map((p) => `- ${p}`).join('\n')}

MESSAGES DE COMMIT :
${(params.commitMessages ?? []).slice(0, 10).map((m) => `- ${m}`).join('\n') || '(aucun)'}

TÂCHES ENCORE OUVERTES :
${pending.map((t, i) => `${i + 1}. ${t.label}`).join('\n')}

Quelles tâches sont maintenant terminées ? JSON uniquement.`;

  try {
    const { zMappingLLM } = await import('./schemas.js');
    const out = await callLLM({ tag: 'analyze:diff', system, user, temperature: 0.2, maxTokens: 1200 }, zMappingLLM);
    const valides = new Set(pending.map((t) => t.label));
    return { doneLabels: out.tasks.map((t) => t.label).filter((l) => valides.has(l)), degraded: false };
  } catch {
    // Mode dégradé : heuristique par mots-clés partagés entre chemin et label
    const doneLabels: string[] = [];
    for (const t of pending) {
      const mots = t.label
        .toLowerCase()
        .split(/[^a-zà-ÿ0-9]+/)
        .filter((m) => m.length > 4);
      const touche = params.changedPaths.some((p) => mots.some((m) => p.toLowerCase().includes(m)));
      if (touche) doneLabels.push(t.label);
    }
    return { doneLabels: doneLabels.slice(0, 2), degraded: true };
  }
}
