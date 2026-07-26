import {
  ClassementLigneSchema,
  DashboardResponseSchema,
  type ClassementLigne,
  type DashboardResponse,
} from "./contracts";
import { MOCK_CLASSEMENT, MOCK_DASHBOARD } from "./mock";
import { z } from "zod";

/**
 * COUCHE D'ACCÈS — le seul endroit du front qui parle au backend.
 *
 * Tant que USE_MOCKS est vrai, tout tourne sans A ni C (plan B permanent).
 * Le jour où C livre : NEXT_PUBLIC_USE_MOCKS=false, et les composants
 * ne changent pas d'une ligne.
 *
 * NF2 : toute réponse serveur est validée par zod ; en cas d'échec on
 * retombe sur le mock (mode dégradé) au lieu de casser la page.
 */

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS !== "false";

async function safeGet<T>(
  url: string,
  schema: z.ZodType<T>,
  fallback: T
): Promise<T> {
  if (USE_MOCKS) return fallback;
  try {
    const res = await fetch(url, { cache: "no-store" });
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
  return safeGet("/api/dashboard", DashboardResponseSchema, MOCK_DASHBOARD);
}

export function getClassement(): Promise<ClassementLigne[]> {
  return safeGet(
    "/api/classement",
    z.array(ClassementLigneSchema),
    MOCK_CLASSEMENT
  );
}

/** Bouton « ✨ Sync » (C, H6-H8). En mock : simule une brique posée. */
export async function syncProjet(projectId: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 900));
    return;
  }
  await fetch(`/api/projects/${projectId}/sync`, { method: "POST" });
}

/** Endpoint admin de démo (C, H8-H10:30). */
export async function simulateDay4(projectId: string): Promise<void> {
  if (USE_MOCKS) {
    await new Promise((r) => setTimeout(r, 600));
    return;
  }
  await fetch(`/api/admin/simulate-day4`, {
    method: "POST",
    body: JSON.stringify({ project_id: projectId }),
  });
}
