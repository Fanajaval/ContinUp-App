/**
 * Couche d'accès front → backends.
 *
 * - Auth / health : toujours le backend Express (:5000) via rewrite Next
 * - Dashboard / classement / sync : mocks par défaut tant que C n'a pas livré
 * - IA (:4000) : optionnelle, via rewrite `/api/ia/*`
 */

import {
  ClassementLigneSchema,
  DashboardResponseSchema,
  type ClassementLigne,
  type DashboardResponse,
  type Project,
} from "./contracts";
import { MOCK_CLASSEMENT } from "./mock";
import { authHeaders, getStoredUser } from "./auth";
import { z } from "zod";

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

async function safeGet<T>(
  url: string,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  if (USE_MOCKS) return fallback;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: authHeaders(),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const parsed = schema.safeParse(await res.json());
    if (!parsed.success) {
      console.warn(`[api] schéma invalide sur ${url}`, parsed.error.issues);
      return fallback;
    }
    return parsed.data;
  } catch (e) {
    console.warn(`[api] mode dégradé sur ${url}`, e);
    return fallback;
  }
}

export function getDashboard(): Promise<DashboardResponse> {
  return fetch("/api/dashboard", {
    cache: "no-store",
    headers: authHeaders(),
  })
    .then(async (res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const parsed = DashboardResponseSchema.safeParse(data);
      if (!parsed.success) throw new Error("Réponse dashboard invalide");
      return parsed.data;
    });
}

export async function createProject(input: {
  repo_url: string;
  dreams: string[];
  selected_dream: string;
  template_type: string;
}): Promise<Project> {
  const res = await fetch("/api/projects", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(input),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || "Impossible de créer le chantier");
  }
  const body = await res.json();
  return body.project as Project;
}

export type ProjectAnalysis = {
  objectif: string | null;
  tasks: Array<{
    label: string;
    poids: number;
    done: boolean;
    etape_template: string;
    duree_estimee_min?: number;
    preuve?: string;
  }>;
  analyzed_at: string | null;
  degraded: boolean;
};

export async function getProjectAnalysis(projectId: string): Promise<ProjectAnalysis | null> {
  const res = await fetch(`/api/projects/${projectId}/analysis`, { cache: "no-store", headers: authHeaders() });
  if (!res.ok) throw new Error("Impossible de lire l'analyse du chantier");
  const body = await res.json();
  return body.analysis as ProjectAnalysis | null;
}

export async function analyzeProject(projectId: string, force = false): Promise<ProjectAnalysis> {
  const res = await fetch(`/api/projects/${projectId}/analyze`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ force }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || "Impossible d'analyser ce dépôt");
  return body.analysis as ProjectAnalysis;
}

export function getClassement(): Promise<ClassementLigne[]> {
  return safeGet(
    "/api/classement",
    z.array(ClassementLigneSchema),
    MOCK_CLASSEMENT
  );
}

/** Bouton « ✨ Sync » (C). En mock : simule une brique posée. */
export async function syncProjet(projectId: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
  const res = await fetch(`/api/projects/${projectId}/sync`, {
    method: "POST",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error(`Sync échoué (${res.status})`);
}

/** Endpoint admin de démo (C). */
export async function simulateDay4(projectId: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  const res = await fetch(`/api/admin/simulate-day4`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ project_id: projectId }),
  });
  if (!res.ok) throw new Error(`Simulation échouée (${res.status})`);
}

/** Ping backend Auth — utile pour l'écran login. */
export async function pingBackend(): Promise<boolean> {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * M1.3 — analyse portefeuille de rêves via service IA (:4000).
 * Best-effort : si IA down, on ne bloque pas l'onboarding.
 */
export async function analyzeDreams(reves: string[]): Promise<{
  ok: boolean;
  degraded?: boolean;
}> {
  const user = getStoredUser();
  try {
    const res = await fetch("/api/ia/dreams/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: user?.id ?? "00000000-0000-4000-8000-000000000001",
        reves,
        force: true,
      }),
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json()) as { degraded?: boolean };
    return { ok: true, degraded: data.degraded };
  } catch {
    return { ok: false };
  }
}

export const apiMode = {
  mocks: USE_MOCKS,
};
