/**
 * Auth client — parle au backend Express (:5000) via rewrite Next
 * `/api/auth/*` → `http://localhost:5000/api/auth/*`
 *
 * Stockage local uniquement (hackathon). Pas de secrets LLM ici.
 */

const TOKEN_KEY = "qj_token";
const USER_KEY = "qj_user";

export type AuthUser = {
  id: string;
  name: string;
  email?: string;
  photo?: string | null;
  bio?: string | null;
  role?: string;
  created_at?: string;
};

export type LoginResult = {
  token: string;
  user: { id: string | number; name: string };
};

function canUseStorage(): boolean {
  return typeof window !== "undefined";
}

export function getToken(): string | null {
  if (!canUseStorage()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (!canUseStorage()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function setSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function authHeaders(): HeadersInit {
  const token = getToken();
  return token
    ? { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }
    : { "Content-Type": "application/json" };
}

async function readError(res: Response): Promise<string> {
  try {
    const data = (await res.json()) as { message?: string };
    return data.message || `Erreur HTTP ${res.status}`;
  } catch {
    return `Erreur HTTP ${res.status}`;
  }
}

/** POST /api/auth/register */
export async function registerAccount(input: {
  name: string;
  email: string;
  password: string;
}): Promise<void> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
}

/** POST /api/auth/login */
export async function loginAccount(input: {
  email: string;
  password: string;
}): Promise<LoginResult> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as LoginResult;
  setSession(data.token, {
    id: String(data.user.id),
    name: data.user.name,
    email: input.email,
  });
  return data;
}

/** GET /api/auth/me — rafraîchit le profil si token présent */
export async function fetchMe(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  const res = await fetch("/api/auth/me", {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 401) {
    clearSession();
    return null;
  }
  if (!res.ok) throw new Error(await readError(res));
  const data = (await res.json()) as { user: AuthUser };
  const user = {
    ...data.user,
    id: String(data.user.id),
  };
  setSession(token, user);
  return user;
}

export function logout(): void {
  clearSession();
}
