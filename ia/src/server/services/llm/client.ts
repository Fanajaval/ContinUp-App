/**
 * Client LLM unique (NF2 : retries, timeouts, mode dégradé).
 * Compatible OpenAI API : OpenAI, Groq, Mistral, OpenRouter, Together, Ollama…
 * Il suffit de changer LLM_BASE_URL + LLM_MODEL dans .env.
 *
 * Règle d'or technique : ce module ne connaît RIEN du métier.
 * Il prend un prompt système + un prompt user + un schéma Zod, il rend un objet validé.
 */
import OpenAI from 'openai';
import type { ZodTypeAny, TypeOf } from 'zod';

const API_KEY = process.env.LLM_API_KEY ?? '';
const BASE_URL = process.env.LLM_BASE_URL ?? 'https://api.openai.com/v1';
const MODEL = process.env.LLM_MODEL ?? 'gpt-4o-mini';
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 25_000);
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES ?? 3);
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE ?? 0.7);

/** Mode dégradé : pas de clé OU LLM_OFFLINE=1 → on ne tente même pas le réseau. */
export const LLM_OFFLINE = process.env.LLM_OFFLINE === '1' || !API_KEY;

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    _client = new OpenAI({
      apiKey: API_KEY || 'offline',
      baseURL: BASE_URL,
      timeout: TIMEOUT_MS,
      maxRetries: 0, // on gère nos propres retries pour logger et backoffer
    });
  }
  return _client;
}

export class LlmUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Extrait le premier objet JSON valide d'une réponse LLM.
 * Gère : ```json ... ```, texte parasite avant/après, accolades imbriquées.
 */
export function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json|JSON)?/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    /* on tente l'extraction par balayage */
  }

  const start = cleaned.indexOf('{');
  if (start === -1) throw new Error('Aucun JSON trouvé dans la réponse LLM');

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < cleaned.length; i++) {
    const c = cleaned[i];
    if (escaped) { escaped = false; continue; }
    if (c === '\\') { escaped = true; continue; }
    if (c === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) {
        const candidate = cleaned.slice(start, i + 1);
        return JSON.parse(candidate);
      }
    }
  }
  throw new Error('JSON incomplet dans la réponse LLM');
}

export interface LlmCallOptions {
  system: string;
  user: string;
  /** Nom pour les logs (ex. 'analyze', 'signal:S3'). */
  tag: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Appel LLM + parsing + validation Zod, avec retries à backoff exponentiel.
 * En cas d'échec de validation, on renvoie l'erreur au modèle au tour suivant
 * (auto-réparation) — technique la plus rentable en hackathon.
 */
export async function callLLM<S extends ZodTypeAny>(
  opts: LlmCallOptions,
  schema: S,
): Promise<TypeOf<S>> {
  if (LLM_OFFLINE) {
    throw new LlmUnavailableError(`[${opts.tag}] LLM hors ligne (LLM_OFFLINE=1 ou clé absente)`);
  }

  let lastError: unknown;
  let repairHint = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const started = Date.now();
    try {
      const completion = await client().chat.completions.create({
        model: MODEL,
        temperature: opts.temperature ?? TEMPERATURE,
        max_tokens: opts.maxTokens ?? 2000,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: repairHint ? `${opts.user}\n\n${repairHint}` : opts.user },
        ],
      });

      const raw = completion.choices[0]?.message?.content ?? '';
      const json = extractJson(raw);
      const parsed = schema.safeParse(json);

      if (!parsed.success) {
        const issues = parsed.error.issues
          .slice(0, 6)
          .map((i) => `- champ "${i.path.join('.')}" : ${i.message}`)
          .join('\n');
        repairHint = `⚠️ Ta réponse précédente était invalide :\n${issues}\nRenvoie UNIQUEMENT le JSON corrigé, rien d'autre.`;
        throw new Error(`Validation Zod échouée:\n${issues}`);
      }

      console.log(`[llm:${opts.tag}] ok en ${Date.now() - started}ms (essai ${attempt}/${MAX_RETRIES})`);
      return parsed.data;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[llm:${opts.tag}] échec essai ${attempt}/${MAX_RETRIES} (${Date.now() - started}ms) : ${msg}`);
      if (attempt < MAX_RETRIES) {
        // Groq 429 : respecter le "try again in Xs" si présent, sinon backoff plus long
        const retryMatch = msg.match(/try again in ([\d.]+)s/i);
        const waitMs = retryMatch
          ? Math.ceil(Number(retryMatch[1]) * 1000) + 400
          : 800 * 2 ** (attempt - 1) + Math.floor(Math.random() * 300);
        await sleep(waitMs);
      }
    }
  }

  throw new LlmUnavailableError(
    `[${opts.tag}] LLM indisponible après ${MAX_RETRIES} essais`,
    lastError,
  );
}

export const llmInfo = () => ({
  model: MODEL,
  baseUrl: BASE_URL,
  offline: LLM_OFFLINE,
  timeoutMs: TIMEOUT_MS,
  maxRetries: MAX_RETRIES,
});
