/**
 * Client LLM unique (NF2 : retries, timeouts, mode dégradé).
 * Provider : Google Gemini (API native generateContent).
 */
import type { ZodTypeAny, TypeOf } from 'zod';

const API_KEY = process.env.LLM_API_KEY ?? process.env.GEMINI_API_KEY ?? '';
/** Modèle par défaut : gemini-3.5-flash-lite (léger, dispo nouveaux comptes Google AI Studio). */
const MODEL = process.env.LLM_MODEL ?? 'gemini-3.5-flash-lite';
const BASE_URL = (process.env.LLM_BASE_URL ?? 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const TIMEOUT_MS = Number(process.env.LLM_TIMEOUT_MS ?? 45_000);
const MAX_RETRIES = Number(process.env.LLM_MAX_RETRIES ?? 3);
const TEMPERATURE = Number(process.env.LLM_TEMPERATURE ?? 0.4);

const MODEL_CHAIN = [...new Set([
  MODEL,
  'gemini-3.5-flash-lite',
  'gemini-flash-latest',
  'gemini-3-flash-preview',
])];

let activeModel = MODEL;

export const LLM_OFFLINE = process.env.LLM_OFFLINE === '1' || !API_KEY;

export class LlmUnavailableError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = 'LlmUnavailableError';
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function extractJson(raw: string): unknown {
  const cleaned = raw
    .replace(/^\uFEFF/, '')
    .replace(/```(?:json|JSON)?/g, '')
    .replace(/```/g, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    /* balayage */
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
      if (depth === 0) return JSON.parse(cleaned.slice(start, i + 1));
    }
  }
  throw new Error('JSON incomplet dans la réponse LLM');
}

export interface LlmCallOptions {
  system: string;
  user: string;
  tag: string;
  temperature?: number;
  maxTokens?: number;
}

interface GeminiResponse {
  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
  error?: { message?: string };
}

function isModelUnavailableError(msg: string): boolean {
  return /no longer available|not found|404|is not supported|invalid model/i.test(msg);
}

async function geminiGenerate(opts: LlmCallOptions, repairHint: string, model: string): Promise<string> {
  const url = `${BASE_URL}/models/${model}:generateContent`;
  const userText = repairHint ? `${opts.user}\n\n${repairHint}` : opts.user;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: 'user', parts: [{ text: userText }] }],
        generationConfig: {
          temperature: opts.temperature ?? TEMPERATURE,
          maxOutputTokens: opts.maxTokens ?? 2048,
          responseMimeType: 'application/json',
        },
      }),
      signal: controller.signal,
    });
    const data = (await res.json()) as GeminiResponse;
    if (!res.ok) throw new Error(data.error?.message ?? `HTTP ${res.status}`);
    const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!text.trim()) throw new Error(`Réponse Gemini vide (${data.candidates?.[0]?.finishReason ?? 'UNKNOWN'})`);
    return text;
  } finally {
    clearTimeout(timer);
  }
}

async function geminiGenerateWithFallback(opts: LlmCallOptions, repairHint: string): Promise<string> {
  let lastError: unknown;
  for (const model of MODEL_CHAIN) {
    try {
      const text = await geminiGenerate(opts, repairHint, model);
      if (model !== activeModel) console.log(`[llm] bascule modèle → ${model}`);
      activeModel = model;
      return text;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      if (isModelUnavailableError(msg)) {
        console.warn(`[llm] modèle ${model} indisponible : ${msg}`);
        continue;
      }
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

export async function callLLM<S extends ZodTypeAny>(opts: LlmCallOptions, schema: S): Promise<TypeOf<S>> {
  if (LLM_OFFLINE) throw new LlmUnavailableError(`[${opts.tag}] LLM hors ligne`);

  let lastError: unknown;
  let repairHint = '';

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const started = Date.now();
    try {
      const raw = await geminiGenerateWithFallback(opts, repairHint);
      const parsed = schema.safeParse(extractJson(raw));
      if (!parsed.success) {
        const issues = parsed.error.issues.slice(0, 6).map((i) => `- "${i.path.join('.')}" : ${i.message}`).join('\n');
        repairHint = `⚠️ JSON invalide :\n${issues}\nRenvoie UNIQUEMENT le JSON corrigé.`;
        throw new Error(`Validation Zod échouée:\n${issues}`);
      }
      console.log(`[llm:${opts.tag}] ok en ${Date.now() - started}ms (${attempt}/${MAX_RETRIES})`);
      return parsed.data;
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[llm:${opts.tag}] échec ${attempt}/${MAX_RETRIES} : ${msg}`);
      if (attempt < MAX_RETRIES) {
        const retryMatch = msg.match(/retry in ([\d.]+)s/i);
        await sleep(retryMatch ? Math.ceil(Number(retryMatch[1]) * 1000) + 400 : 800 * 2 ** (attempt - 1));
      }
    }
  }
  throw new LlmUnavailableError(`[${opts.tag}] indisponible après ${MAX_RETRIES} essais`, lastError);
}

export const llmInfo = () => ({
  model: activeModel,
  configuredModel: MODEL,
  baseUrl: BASE_URL,
  provider: 'gemini',
  offline: LLM_OFFLINE,
  timeoutMs: TIMEOUT_MS,
  maxRetries: MAX_RETRIES,
});
