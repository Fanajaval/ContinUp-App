const axios = require('axios');
const env = require('../config/env');

/**
 * Repo Service — analyse des repos GitHub
 * URL publique → récupère l'arborescence et les contenus
 * (OAuth en V2 si le temps le permet)
 */

const githubClient = axios.create({
  baseURL: 'https://api.github.com',
  timeout: 15000,
  headers: {
    Accept: 'application/vnd.github.v3+json',
    ...(env.GITHUB_TOKEN && { Authorization: `token ${env.GITHUB_TOKEN}` }),
  },
});

/**
 * Extrait owner/repo depuis une URL GitHub
 */
function parseRepoUrl(url) {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('URL GitHub invalide');
  return { owner: match[1], repo: match[2].replace('.git', '') };
}

/**
 * Récupère l'arborescence du repo
 */
async function getRepoTree(owner, repo) {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/git/trees/HEAD?recursive=1`);
    return response.data.tree
      .filter((node) => node.type === 'blob')
      .map((node) => ({
        path: node.path,
        size: node.size,
        sha: node.sha,
      }));
  } catch (error) {
    if (error.response?.status === 404) {
      throw new Error('Repo non trouvé ou privé');
    }
    throw error;
  }
}

/**
 * Récupère le contenu d'un fichier (base64 → texte)
 */
async function getFileContent(owner, repo, path) {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/contents/${path}`);
    if (response.data.encoding === 'base64') {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }
    return response.data.content;
  } catch {
    return null;
  }
}

/**
 * Détecte les documents existants dans le repo (M2.2 fast-path)
 */
async function detectExistingDocs(owner, repo, tree) {
  const docPatterns = [
    { type: 'readme', patterns: [/^readme\.md$/i, /^readme\.txt$/i] },
    { type: 'cdc', patterns: [/cahier.*charges/i, /spec/i, /requirements/i, /cdc/i] },
    { type: 'todolist', patterns: [/todo/i, /tasks/i, /backlog/i] },
  ];

  const foundDocs = [];

  for (const file of tree) {
    for (const docType of docPatterns) {
      for (const pattern of docType.patterns) {
        if (pattern.test(file.path)) {
          const content = await getFileContent(owner, repo, file.path);
          if (content) {
            foundDocs.push({
              type: docType.type,
              path: file.path,
              contenu_json: { content, path: file.path },
              source: 'trouve',
            });
          }
          break;
        }
      }
    }
  }

  return foundDocs;
}

/**
 * Récupère les fichiers clés pour l'analyse (package.json, fichiers source, etc.)
 */
async function getKeyFiles(owner, repo, tree) {
  const importantPatterns = [
    /package\.json$/i,
    /requirements\.txt$/i,
    /Cargo\.toml$/i,
    /go\.mod$/i,
    /\.env\.example$/i,
    /index\.(js|ts|py)$/i,
    /main\.(js|ts|py|go)$/i,
    /app\.(js|ts|py)$/i,
    /server\.(js|ts)$/i,
  ];

  const keyFiles = [];
  const maxFiles = 15; // limiter pour ne pas exploser le contexte

  for (const file of tree) {
    if (keyFiles.length >= maxFiles) break;
    if (file.size > 50000) continue; // skip gros fichiers

    for (const pattern of importantPatterns) {
      if (pattern.test(file.path)) {
        const content = await getFileContent(owner, repo, file.path);
        if (content) {
          keyFiles.push({ path: file.path, content: content.substring(0, 5000) });
        }
        break;
      }
    }
  }

  return keyFiles;
}

/**
 * Récupère les derniers commits
 */
async function getRecentCommits(owner, repo, limit = 5) {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/commits`, {
      params: { per_page: limit },
    });
    return response.data.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author.name,
      date: c.commit.author.date,
      files_count: c.stats?.total || 0,
    }));
  } catch {
    return [];
  }
}

/**
 * Récupère les fichiers modifiés dans un commit
 */
async function getCommitFiles(owner, repo, sha) {
  try {
    const response = await githubClient.get(`/repos/${owner}/${repo}/commits/${sha}`);
    return response.data.files.map((f) => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }));
  } catch {
    return [];
  }
}

/**
 * Analyse complète d'un repo
 */
async function analyzeFullRepo(repoUrl) {
  const { owner, repo } = parseRepoUrl(repoUrl);

  // 1. Arborescence
  const tree = await getRepoTree(owner, repo);

  // 2. Détection docs existants
  const existingDocs = await detectExistingDocs(owner, repo, tree);

  // 3. Fichiers clés
  const keyFiles = await getKeyFiles(owner, repo, tree);

  // 4. Commits récents
  const commits = await getRecentCommits(owner, repo);

  return {
    repoName: `${owner}/${repo}`,
    owner,
    repo,
    tree,
    existingDocs,
    keyFiles,
    commits,
    files: keyFiles.map((f) => ({ path: f.path, content: f.content })),
  };
}

module.exports = {
  parseRepoUrl,
  getRepoTree,
  getFileContent,
  detectExistingDocs,
  getKeyFiles,
  getRecentCommits,
  getCommitFiles,
  analyzeFullRepo,
};
