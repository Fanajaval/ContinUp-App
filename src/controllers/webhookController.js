const { query } = require('../config/database');
const aiService = require('../services/aiService');
const repoService = require('../services/repoService');
const xpService = require('../services/xpService');
const signalService = require('../services/signalService');
const crypto = require('crypto');
const env = require('../config/env');

/**
 * Webhook Controller — GitHub push events
 * M4.1 — Déclenche S1 (brique posée) à chaque push
 */

/**
 * POST /api/webhook/github
 * GitHub push webhook
 */
async function handleGitHubPush(req, res, next) {
  try {
    const event = req.body;

    // Vérifier que c'est un push event
    if (!event.ref || !event.repository) {
      return res.status(200).json({ message: 'Event ignoré (pas un push)' });
    }

    const repoFullName = event.repository.full_name; // "owner/repo"
    const pusher = event.pusher?.name || 'unknown';
    const commits = event.commits || [];

    if (commits.length === 0) {
      return res.status(200).json({ message: 'Aucun commit dans le push' });
    }

    // 1. Trouver les projets liés à ce repo
    const projectsResult = await query(
      `SELECT p.*, u.style_signal, u.id as user_id
       FROM projects p
       JOIN users u ON p.user_id = u.id
       WHERE p.repo_url LIKE $1
       AND p.statut != 'acheve'`,
      [`%${repoFullName}%`]
    );

    if (projectsResult.rows.length === 0) {
      console.log(`[WEBHOOK] No projects found for repo: ${repoFullName}`);
      return res.status(200).json({ message: 'Aucun projet lié' });
    }

    // Traiter chaque projet lié
    for (const project of projectsResult.rows) {
      try {
        await processPushForProject(project, commits);
      } catch (projectError) {
        console.error(`[WEBHOOK] Error processing project ${project.id}:`, projectError.message);
      }
    }

    res.status(200).json({ message: 'Push traité', projects_processed: projectsResult.rows.length });
  } catch (error) {
    next(error);
  }
}

/**
 * Traiter un push pour un projet spécifique
 */
async function processPushForProject(project, commits) {
  const projectId = project.id;

  // 1. Détecter retour après silence (S5)
  const wasSilent = await signalService.detectReturn(projectId);

  // 2. Mettre à jour les commits
  await query(
    `UPDATE projects SET total_commits = total_commits + $1, derniere_activite = NOW() WHERE id = $2`,
    [commits.length, projectId]
  );

  // 3. Analyser le dernier commit pour la progression
  const lastCommit = commits[0];
  const filesChanged = lastCommit.modified || [];
  const filesAdded = lastCommit.added || [];
  const allFiles = [...filesAdded, ...filesChanged];

  // 4. Récupérer les tâches actives
  const tasksResult = await query(
    `SELECT id, label, etape_template FROM tasks WHERE project_id = $1 AND done = false`,
    [projectId]
  );

  // 5. Analyse IA du diff
  let diffAnalysis = { completed_tasks: [], progression_delta: 0, new_etape_semantique: null, summary: '' };
  try {
    diffAnalysis = await aiService.analyzeDiff({
      filesChanged: allFiles,
      repoContext: project.repo_name,
      tasks: tasksResult.rows,
    });
  } catch (aiError) {
    console.error('[WEBHOOK] AI diff analysis failed, using fallback');
    // Fallback : chaque commit = brique forfaitaire
    diffAnalysis = {
      completed_tasks: [],
      progression_delta: Math.min(5, commits.length * 2),
      new_etape_semantique: null,
      summary: `${commits.length} commit(s) reçu(s)`,
    };
  }

  // 6. Marquer les tâches complétées
  if (diffAnalysis.completed_tasks && diffAnalysis.completed_tasks.length > 0) {
    for (const taskId of diffAnalysis.completed_tasks) {
      await query(`UPDATE tasks SET done = true WHERE id = $1 AND project_id = $2`, [taskId, projectId]);
    }
  }

  // 7. Calculer la nouvelle progression
  const currentProgression = parseFloat(project.progression) || 0;
  let newProgression = currentProgression;

  // Soit via les tâches, soit via le delta
  if (diffAnalysis.completed_tasks.length > 0) {
    const tasksTotal = await query(
      `SELECT COALESCE(SUM(poids), 0) as total FROM tasks WHERE project_id = $1`,
      [projectId]
    );
    const tasksDone = await query(
      `SELECT COALESCE(SUM(poids), 0) as done FROM tasks WHERE project_id = $1 AND done = true`,
      [projectId]
    );
    const totalWeight = parseFloat(tasksTotal.rows[0].total) || 1;
    const doneWeight = parseFloat(tasksDone.rows[0].done) || 0;
    newProgression = Math.min(100, (doneWeight / totalWeight) * 100);
  } else {
    newProgression = Math.min(100, currentProgression + (diffAnalysis.progression_delta || 0));
  }

  // 8. Mettre à jour le projet
  const newEtape = diffAnalysis.new_etape_semantique;
  if (newEtape) {
    await query(
      `UPDATE projects SET progression = $1, etape_semantique = $2, derniere_activite = NOW() WHERE id = $3`,
      [newProgression, newEtape, projectId]
    );
  } else {
    await query(
      `UPDATE projects SET progression = $1, derniere_activite = NOW() WHERE id = $2`,
      [newProgression, projectId]
    );
  }

  // 9. Enregistrer l'event brique
  await xpService.recordEvent(projectId, 'brique', {
    commits: commits.length,
    pusher: commits[0]?.author?.name || 'unknown',
    files: allFiles.length,
    summary: diffAnalysis.summary,
  });

  // 10. S1 — brique posée
  await signalService.triggerS1(projectId, {
    summary: diffAnalysis.summary || `${commits.length} commit(s)`,
    microAction: diffAnalysis.summary || 'Continuer le développement',
  });

  // 11. Si achèvement → event finition
  if (newProgression >= 100) {
    await xpService.recordEvent(projectId, 'finition', { completedAt: new Date() });
    await query(`UPDATE projects SET statut = 'acheve' WHERE id = $1`, [projectId]);
  }

  // 12. Si retour après silence → event retour (XP ×5)
  if (wasSilent) {
    await xpService.recordEvent(projectId, 'retour', { silentDuration: 'was silent' });
  }

  console.log(`[WEBHOOK] Project ${projectId}: ${newProgression}% — ${diffAnalysis.summary}`);
}

/**
 * Vérifier la signature GitHub (si webhook secret configuré)
 */
function verifyGitHubSignature(req, res, next) {
  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    // Pas de secret configuré, on laisse passer
    return next();
  }

  const hmac = crypto.createHmac('sha256', env.GITHUB_TOKEN || '');
  const digest = `sha256=${hmac.update(JSON.stringify(req.body)).digest('hex')}`;

  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))) {
    return res.status(401).json({ error: 'Signature invalide' });
  }

  next();
}

module.exports = { handleGitHubPush, verifyGitHubSignature };
