/**
 * Lecture d'un repo GitHub public + sélection intelligente des fichiers.
 * Budget tokens serré : tri, troncature 20 Ko/fichier, plafond global.
 */
import type { RepoFile } from '../../types/index.js';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN ?? '';
const MAX_FILES_WITH_CONTENT = 35;
const MAX_CHARS_PER_FILE = 20_480;
const MAX_TOTAL_CHARS = 55_000;
const MAX_TREE_PATHS = 80;

const DOC_PATTERNS = [
  /^readme(\.md|\.txt)?$/i,
  /^(docs?\/)?(cahier[-_ ]?des[-_ ]?charges|cdc|specs?|specifications?)\.(md|txt)$/i,
  /^(docs?\/)?(todo|todolist|tasks?|roadmap|backlog)\.(md|txt)$/i,
  /^(docs?\/)?(architecture|design|notes?|resume|previously)\.(md|txt)$/i,
  /^contributing\.md$/i,
  /^changelog\.md$/i,
];

const MANIFEST_FILES = [
  'package.json', 'requirements.txt', 'pyproject.toml', 'composer.json', 'pom.xml',
  'build.gradle', 'go.mod', 'Cargo.toml', 'Dockerfile', 'docker-compose.yml',
  'docker-compose.yaml', '.env.example', 'tsconfig.json', 'next.config.js',
  'next.config.mjs', 'next.config.ts', 'vite.config.js', 'vite.config.ts',
];

const HIGH_VALUE = [
  /package\.json$/, /requirements\.txt$/, /pyproject\.toml$/, /composer\.json$/,
  /pom\.xml$/, /build\.gradle$/, /go\.mod$/, /Cargo\.toml$/,
  /schema\.(sql|prisma)$/i, /migrations?\/.*\.sql$/i, /docker-compose\.ya?ml$/i,
  /^Dockerfile$/i, /\.env\.example$/,
  /(^|\/)(main|index|app|server)\.(ts|tsx|js|jsx|py|go|java)$/i,
  /(^|\/)(routes?|controllers?|services?|handlers?|use-cases?|pages?|components?|models?)\//i,
  /(^|\/)(auth|middleware|middlewares|database|db|config)\//i,
];

const IGNORED_DIRS = [
  'node_modules', '.git', 'dist', 'build', 'out', 'target', 'vendor',
  '.next', '.nuxt', 'coverage', '__pycache__', '.venv', 'venv',
  '.idea', '.vscode', 'assets', 'public/images', '.turbo',
];

const IGNORED_EXT = [
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico', '.pdf',
  '.zip', '.tar', '.gz', '.mp4', '.mp3', '.woff', '.woff2', '.ttf',
  '.lock', '.min.js', '.map', '.bin', '.jar', '.class', '.exe',
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

export interface ParsedRepo { owner: string; repo: string; branch: string }

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
  const h: Record<string, string> = { Accept: 'application/vnd.github+json', 'User-Agent': 'continup-scanner' };
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

function isManifest(path: string): boolean {
  const base = path.split('/').pop() ?? path;
  return MANIFEST_FILES.some((m) => base.toLowerCase() === m.toLowerCase());
}

function score(path: string, size: number): number {
  const base = path.split('/').pop() ?? path;
  let s = 0;
  if (DOC_PATTERNS.some((p) => p.test(path) || p.test(base))) s += 120;
  if (isManifest(path)) s += 90;
  if (HIGH_VALUE.some((p) => p.test(path))) s += 60;
  if (/(^|\/)(main|index|app|server)\.(ts|tsx|js|jsx|py|go|java)$/i.test(path)) s += 45;
  if (/(route|controller|service|handler|page|component|model|schema|middleware)/i.test(path)) s += 30;
  if (CODE_EXT.some((e) => path.endsWith(e))) s += 20;
  s -= path.split('/').length * 2;
  if (size > 50_000) s -= 40;
  if (/test|spec|\.d\.ts$|mock|fixture/i.test(path)) s -= 20;
  return s;
}

export function detectDocs(paths: string[]): string[] {
  return paths.filter((p) => {
    const base = p.split('/').pop() ?? p;
    return DOC_PATTERNS.some((rx) => rx.test(p) || rx.test(base));
  });
}

export function detectStack(files: RepoFile[], allPaths: string[] = []): string[] {
  const stack = new Set<string>();
  const paths = allPaths.length ? allPaths : files.map((f) => f.path);
  const pathStr = paths.join('\n').toLowerCase();

  const readManifest = (name: string): Record<string, unknown> | null => {
    const f = files.find((file) => file.path.split('/').pop()?.toLowerCase() === name.toLowerCase() && file.content);
    if (!f?.content) return null;
    try { return JSON.parse(f.content) as Record<string, unknown>; } catch { return null; }
  };

  const pkg = readManifest('package.json');
  if (pkg) {
    stack.add('Node.js');
    const deps = { ...(pkg.dependencies as Record<string, string> ?? {}), ...(pkg.devDependencies as Record<string, string> ?? {}) };
    if (deps.next) stack.add('Next.js');
    if (deps.react || deps['react-dom']) stack.add('React');
    if (deps.express) stack.add('Express');
    if (deps.typescript || pathStr.includes('.ts')) stack.add('TypeScript');
    if (deps.prisma || deps['@prisma/client']) stack.add('Prisma');
    if (deps.pg || deps.postgres) stack.add('PostgreSQL');
    if (deps['react-native']) stack.add('React Native');
  }

  if (files.some((f) => f.path.endsWith('requirements.txt') || f.path.endsWith('pyproject.toml'))) {
    stack.add('Python');
    const req = files.find((f) => f.path.endsWith('requirements.txt'))?.content?.toLowerCase() ?? '';
    if (req.includes('django')) stack.add('Django');
    if (req.includes('fastapi')) stack.add('FastAPI');
    if (req.includes('flask')) stack.add('Flask');
  }

  if (files.some((f) => f.path.endsWith('pom.xml') || f.path.endsWith('build.gradle'))) {
    stack.add('Java');
    stack.add('Spring Boot');
  }
  if (files.some((f) => f.path.endsWith('composer.json'))) { stack.add('PHP'); stack.add('Laravel'); }
  if (files.some((f) => f.path.endsWith('go.mod'))) stack.add('Go');
  if (files.some((f) => f.path.endsWith('Cargo.toml'))) stack.add('Rust');
  if (pathStr.includes('dockerfile') || pathStr.includes('docker-compose')) stack.add('Docker');

  return [...stack];
}

export function buildCompactTree(paths: string[]): string {
  const sorted = [...paths].sort();
  const shown = sorted.slice(0, MAX_TREE_PATHS);
  const lines = shown.map((p) => `- ${p}`);
  if (sorted.length > MAX_TREE_PATHS) lines.push(`… (+${sorted.length - MAX_TREE_PATHS} autres fichiers)`);
  return lines.join('\n');
}

interface TreeItem { path: string; type: string; size?: number }

export async function fetchRepoFiles(repoUrl: string): Promise<{
  files: RepoFile[]; docsDetectes: string[]; branch: string; allPaths: string[]; stackDetectee: string[];
}> {
  const { owner, repo, branch: wanted } = parseRepoUrl(repoUrl);
  let branch = wanted;
  if (!branch) {
    const metaRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}`);
    if (metaRes.status === 404) throw new RepoUnreachableError(`Dépôt introuvable ou privé : ${owner}/${repo}`);
    if (metaRes.status === 403) throw new RepoUnreachableError('Limite GitHub — ajoute GITHUB_TOKEN dans .env');
    if (!metaRes.ok) throw new RepoUnreachableError(`GitHub a répondu ${metaRes.status}`);
    const meta = (await metaRes.json()) as { default_branch?: string };
    branch = meta.default_branch ?? 'main';
  }

  const treeRes = await ghFetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${encodeURIComponent(branch)}?recursive=1`);
  if (!treeRes.ok) {
    if (treeRes.status === 409 || treeRes.status === 404) return { files: [], docsDetectes: [], branch, allPaths: [], stackDetectee: [] };
    throw new RepoUnreachableError(`Arborescence illisible (${treeRes.status})`);
  }

  const tree = (await treeRes.json()) as { tree?: TreeItem[] };
  const blobs = (tree.tree ?? []).filter((i) => i.type === 'blob' && !isIgnored(i.path));
  const allPaths = blobs.map((b) => b.path);
  const docsDetectes = detectDocs(allPaths);

  const selected = blobs.map((b) => ({ ...b, _score: score(b.path, b.size ?? 0) }))
    .sort((a, b) => b._score - a._score).slice(0, MAX_FILES_WITH_CONTENT);

  const files: RepoFile[] = [];
  let total = 0;

  for (let i = 0; i < selected.length; i += 6) {
    if (total >= MAX_TOTAL_CHARS) break;
    const batch = selected.slice(i, i + 6);
    const results = await Promise.all(batch.map(async (item) => {
      try {
        const r = await ghFetch(`https://raw.githubusercontent.com/${owner}/${repo}/${encodeURIComponent(branch)}/${item.path}`, 8_000);
        if (!r.ok) return { path: item.path, content: '', size: item.size };
        let text = await r.text();
        if (text.length > MAX_CHARS_PER_FILE) {
          text = `${text.slice(0, MAX_CHARS_PER_FILE)}\n… [tronqué à 20 Ko — ${text.length} caractères au total]`;
        }
        return { path: item.path, content: text, size: item.size };
      } catch {
        return { path: item.path, content: '', size: item.size };
      }
    }));
    for (const f of results) {
      if (!f.content) continue;
      if (total + f.content.length > MAX_TOTAL_CHARS) break;
      total += f.content.length;
      files.push(f);
    }
  }

  return { files, docsDetectes, branch, allPaths, stackDetectee: detectStack(files, allPaths) };
}

export function summarizeDiff(changedPaths: string[]): string {
  if (!changedPaths.length) return 'aucun fichier modifié';
  const byDir = new Map<string, number>();
  for (const p of changedPaths) {
    const dir = p.includes('/') ? p.split('/').slice(0, -1).join('/') : '(racine)';
    byDir.set(dir, (byDir.get(dir) ?? 0) + 1);
  }
  return [...byDir.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([d, n]) => `${d} (${n} fichier${n > 1 ? 's' : ''})`).join(', ');
}
