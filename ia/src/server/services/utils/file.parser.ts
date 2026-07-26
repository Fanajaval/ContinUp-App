/**
 * Lecture d'un repo GitHub public + sélection intelligente des fichiers.
 *
 * Contraintes hackathon :
 * - pas de `git clone` (pas de binaire garanti sur Vercel/conteneur) → API GitHub
 * - budget de tokens serré → on trie, on tronque, on plafonne
 * - M2.2 : détection des docs existants pour le fast-path
 */
import type { RepoFile } from '../../types/index.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const MAX_FILES = 40;
const MAX_CHARS_PER_FILE = 4_000;
const MAX_TOTAL_CHARS = 60_000;

/** Fichiers de doc reconnus pour le fast-path (M2.2). */
const DOC_PATTERNS = [
  /^readme(\.md|\.txt)?$/i,
  /^(docs?\/)?(cahier[-_ ]?des[-_ ]?charges|cdc|specs?|specifications?)\.(md|txt)$/i,
  /^(docs?\/)?(todo|todolist|tasks?|roadmap|backlog)\.(md|txt)$/i,
  /^(docs?\/)?(architecture|design|notes?|resume|previously)\.(md|txt)$/i,
  /^contributing\.md$/i,
  /^changelog\.md$/i,
];

/** Fichiers dont le CONTENU est précieux pour comprendre le projet. */
const HIGH_VALUE = [
  /package\.json$/,
  /requirements\.txt$/,
  /pyproject\.toml$/,
  /composer\.json$/,
  /pom\.xml$/,
  /build\.gradle$/,
  /go\.mod$/,
  /Cargo\.toml$/,
  /schema\.(sql|prisma)$/i,
  /migrations?\/.*\.sql$/i,
  /docker-compose\.ya?ml$/i,
  /\.env\.example$/,
];

const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor',
  '.next', '.nuxt', 'coverage', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', 'assets', 'public/images', '.turbo',
];

const IGNORED_EXT = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf',
  '.zip', '.tar', '.gz', '.mp4', '.mp3', '.woff', '.woff2', '.ttf',
  '.lock', '.min.js', '.map', '.bin', '.jar', '.class',
];

const CODE_EXT = [
  '.ts', '.tsx', '.js', '.jsx', '.py', '.java', '.php', '.go', '.rs',
  '.rb', '.c', '.cpp', '.cs', '.kt', '.swift', '.sql', '.vue', '.svelte',
  '.html', '.css', '.scss', '.md', '.json', '.yml', '.yaml', '.sh',
];

export class RepoUnreachableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RepoUnreachableError';
  }
}

export interface ParsedRepo {
  owner: string;
  repo: string;
  branch: string;
}

/** Accepte : URL https, git@, "owner/repo", avec ou sans .git / /tree/branch. */
export function parseRepoUrl(input: string): ParsedRepo {
  const raw = input.trim().replace(/\.git$/, '').replace(/\/$/, '');

  const short = raw.match(/^([\w.-]+)\/([\w.-]+)$/);
  if (short) return { owner: short[1], repo: short[2], branch: '' };

  const ssh = raw.match(/^git@github\.com:([\w.-]+)\/([\w.-]+)$/);
  if (ssh) return { owner: ssh[1], repo: ssh[2], branch: '' };

  const https = raw.match(/github\.com\/([\w.-]+)\/([\w.-]+)(?:\/tree\/([\w.\-/]+))?/);
  if (https) return { owner: https[1], repo: https[2], branch: https[3] ?? '' };

  throw new RepoUnreachableError(`URL de dépôt non reconnue : ${input}`);
}

function ghHeaders(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'quatrieme-jour-app',
  };
  if (GITHUB_TOKEN) h.Authorization = `Bearer ${GITHUB_TOKEN}`;
  return h;
}

async function ghFetch(url: string, timeoutMs = 12_000): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { headers: ghHeaders(), signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

function isIgnored(path: string): boolean {
  const lower = path.toLowerCase();
  if (IGNORED_DIRS.some((d) => lower.startsWith(`${d}/`) || lower.includes(`/${d}/`))) return true;
  if (IGNORED_EXT.some((e) => lower.endsWith(e))) return true;
  return false;
}

/** Score de pertinence : plus c'est haut, plus on veut le contenu. */
function score(path: string, size: number): number {
  const base = path.split('/').pop() ?? path;
  let s = 0;
  if (DOC_PATTERNS.some((p) => p.test(path) || p.test(base))) s += 100;
  if (HIGH_VALUE.some((p) => p.test(path))) s += 60;
  if (CODE_EXT.some((e) => path.endsWith(e))) s += 20;
  s -= path.split('/').length * 2;      // on privilégie la racine
  if (size > 40_000) s -= 30;           // les gros fichiers coûtent cher
  if (/test|spec|\.d\.ts$/.test(path)) s -= 15;
  return s;
}

export function detectDocs(paths: string[]): string[] {
  return paths.filter((p) => {
    const base = p.split('/').pop() ?? p;
    return DOC_PATTERNS.some((rx) => rx.test(p) || rx.test(base));
  });
}

interface TreeItem { path: string; type: string; size?: number }

/**
 * Récupère l'arborescence + le contenu des fichiers les plus pertinents.
 * Ne throw QUE si le dépôt est introuvable — un dépôt vide renvoie [].
 */
export async function fetchRepoFiles(repoUrl: string): Promise<{ files: RepoFile[]; docsDetectes: string[]; branch: string }> {
  const { owner, repo, branch: wanted } = parseRepoUrl(repoUrl);

  let branch = wanted;
  if (!branch) {
    const metaRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (metaRes.status === 404) throw new RepoUnreachableError(`Dépôt introuvable ou privé : ${owner}/${repo}`);
    if (metaRes.status === 403) throw new RepoUnreachableError('Limite de requêtes GitHub atteinte — ajoute un GITHUB_TOKEN dans .env');
    if (!metaRes.ok) throw new RepoUnreachableError(`GitHub a répondu ${metaRes.status}`);
    const meta = (await metaRes.json()) as { default_branch?: string };
    branch = meta.default_branch ?? 'main';
  }

  const treeRes = await ghFetch(
    `https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
  );
  if (!treeRes.ok) {
    // Dépôt initialisé mais sans commit : ce n'est PAS une erreur bloquante (M2.1)
    if (treeRes.status === 409 || treeRes.status === 404) {
      return { files: [], docsDetectes: [], branch };
    }
    throw new RepoUnreachableError(`Arborescence illisible (${treeRes.status})`);
  }

  const tree = (await treeRes.json()) as { tree?: TreeItem[]; truncated?: boolean };
  const blobs = (tree.tree ?? []).filter((i) => i.type === 'blob' && !isIgnored(i.path));

  const docsDetectes = detectDocs(blobs.map((b) => b.path));

  const selected = blobs
    .map((b) => ({ ...b, _score: score(b.path, b.size ?? 0) }))
    .sort((a, b) => b._score - a._score)
    .slice(0, MAX_FILES);

  const files: RepoFile[] = [];
  let total = 0;

  // Téléchargement en parallèle par lots de 8 (rapide sans se faire throttler)
  for (let i = 0; i < selected.length; i += 8) {
    if (total >= MAX_TOTAL_CHARS) break;
    const batch = selected.slice(i, i + 8);
    const results = await Promise.all(
      batch.map(async (item) => {
        try {
          const r = await ghFetch(
            `https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${item.path}`,
            8_000,
          );
          if (!r.ok) return { path: item.path, content: '', size: item.size };
          let text = await r.text();
          if (text.length > MAX_CHARS_PER_FILE) {
            text = `${text.slice(0, MAX_CHARS_PER_FILE)}\n… [tronqué : ${text.length} caractères au total]`;
          }
          return { path: item.path, content: text, size: item.size };
        } catch {
          return { path: item.path, content: '', size: item.size };
        }
      }),
    );
    for (const f of results) {
      if (total + f.content.length > MAX_TOTAL_CHARS) {
        files.push({ path: f.path, content: '', size: f.size }); // on garde le nom dans l'arborescence
        continue;
      }
      total += f.content.length;
      files.push(f);
    }
  }

  // On ajoute les chemins non téléchargés : l'arborescence seule est déjà informative
  const kept = new Set(files.map((f) => f.path));
  for (const b of blobs) {
    if (files.length >= 120) break;
    if (!kept.has(b.path)) files.push({ path: b.path, content: '', size: b.size });
  }

  return { files, docsDetectes, branch };
}

/** Analyse de diff (webhook) : on ne garde que les chemins, largement suffisant. */
export function summarizeDiff(changedPaths: string[]): string {
  if (!changedPaths.length) return 'aucun fichier modifié';
  const byDir = new Map<string, number>();
  for (const p of changedPaths) {
    const dir = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(racine)';
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
  }
  return [...byDir.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([d, n]) => `${d} (${n} fichier${n > 1 ? 's' : ''})`)
    .join(', ');
}
