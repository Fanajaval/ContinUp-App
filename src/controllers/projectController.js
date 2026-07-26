const { query, transaction } = require('../config/database');
const aiService = require('../services/aiService');
const repoService = require('../services/repoService');
const xpService = require('../services/xpService');
const signalService = require('../services/signalService');
const { z } = require('zod');

/**
 * Project Controller — gestion des projets (repos ↔ rêves)
 * M2 (association + analyse), M3 (liaison + progression), M5 (dashboard)
 */

const createProjectSchema = z.object({
  repo_url: z.string().url(),
  reve_id: z.string().uuid().optional(),
  template_type: z.enum(['maison', 'villa', 'voiture', 'centre_aide', 'generique']).default('maison'),
});

const validateDocSchema = z.object({
  valide: z.boolean(),
});

/**
 * Créer un projet : associer un repo + analyse IA
 */
async function createProject(req, res, next) {
  try {
    const data = createProjectSchema.parse(req.body);
    const userId = req.user.id;

    // 1. Extraire owner/repo de l'URL
    let repoName;
    try {
      const { owner, repo } = repoService.parseRepoUrl(data.repo_url);
      repoName = `${owner}/${repo}`;
    } catch {
      return res.status(400).json({ error: 'URL GitHub invalide' });
    }

    // 2. Créer le projet en BDD
    const projectResult = await query(
      `INSERT INTO projects (user_id, reve_id, repo_url, repo_name, template_type)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, data.reve_id || null, data.repo_url, repoName, data.template_type]
    );
    const project = projectResult.rows[0];

    // 3. Analyse du repo (async, non-bloquant pour la réponse)
    try {
      const repoData = await repoService.analyzeFullRepo(data.repo_url);

      // 3a. Stocker les docs existants ou générer
      if (repoData.existingDocs.length > 0) {
        // Fast-path : docs trouvés
        for (const doc of repoData.existingDocs) {
          await query(
            `INSERT INTO docs (project_id, type, contenu_json, source, valide)
             VALUES ($1, $2, $3, 'trouve', true)`,
            [project.id, doc.type, JSON.stringify(doc.contenu_json)]
          );
        }
      }

      // 3b. Analyse IA (que les docs existent ou non)
      const analysis = await aiService.analyzeRepo({
        repoName: repoData.repoName,
        files: repoData.files,
        existingDocs: repoData.existingDocs,
      });

      // 3c. Stocker le résumé IA
      await query(
        `INSERT INTO docs (project_id, type, contenu_json, source, valide)
         VALUES ($1, 'resume', $2, ${repoData.existingDocs.length > 0 ? "'trouve'" : "'genere'"}, true)`,
        [project.id, JSON.stringify({
          resume: analysis.resume,
          previously: analysis.previously,
          progression: analysis.progression,
          etape_semantique: analysis.etape_semantique,
        })]
      );

      // 3d. Créer la todolist
      if (analysis.todolist && analysis.todolist.length > 0) {
        for (let i = 0; i < analysis.todolist.length; i++) {
          const task = analysis.todolist[i];
          await query(
            `INSERT INTO tasks (project_id, label, done, poids, etape_template, duree_estimee, position)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [project.id, task.label, task.done || false, task.poids || 1.0, task.etape_template, task.duree_estimee || 20, i]
          );
        }
      }

      // 3e. Mettre à jour le projet avec la progression et l'étape
      await query(
        `UPDATE projects SET progression = $1, etape_semantique = $2 WHERE id = $3`,
        [analysis.progression || 0, analysis.etape_semantique || 'Terrain acquis', project.id]
      );
    } catch (aiError) {
      console.error('[PROJECT] AI analysis failed (non-blocking):', aiError.message);
      // Mode dégradé : projet créé quand même, analyse à relancer
    }

    // 4. Récupérer le projet complet
    const fullProject = await getProjectById(project.id);
    res.status(201).json(fullProject);
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer tous les projets d'un utilisateur (dashboard M5)
 */
async function getProjects(req, res, next) {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT p.*, r.label as dream_label, r.categorie as dream_categorie,
              (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND done = false) as tasks_remaining,
              (SELECT label FROM tasks WHERE project_id = p.id AND done = false ORDER BY position ASC LIMIT 1) as prochaine_action
       FROM projects p
       LEFT JOIN reves r ON p.reve_id = r.id
       WHERE p.user_id = $1
       ORDER BY
         CASE p.statut WHEN 'acheve' THEN 3 WHEN 'silencieux' THEN 2 ELSE 1 END,
         p.derniere_activite DESC`,
      [userId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer un projet par ID
 */
async function getProject(req, res, next) {
  try {
    const project = await getProjectById(req.params.id);
    if (!project) return res.status(404).json({ error: 'Projet non trouvé' });

    // Vérifier que c'est bien le projet de l'utilisateur
    if (project.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    res.json(project);
  } catch (error) {
    next(error);
  }
}

/**
 * Valider/invalider un doc (M2.4)
 */
async function validateDoc(req, res, next) {
  try {
    const { valide } = validateDocSchema.parse(req.body);
    const { docId } = req.params;

    const result = await query(
      `UPDATE docs SET valide = $1 WHERE id = $2 RETURNING *`,
      [valide, docId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Document non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Lier un projet à un rêve (M3.1)
 */
async function linkToDream(req, res, next) {
  try {
    const { reve_id } = z.object({ reve_id: z.string().uuid() }).parse(req.body);

    const result = await query(
      `UPDATE projects SET reve_id = $1 WHERE id = $2 AND user_id = $3 RETURNING *`,
      [reve_id, req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer un projet
 */
async function deleteProject(req, res, next) {
  try {
    const result = await query(
      `DELETE FROM projects WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    res.json({ message: 'Projet supprimé' });
  } catch (error) {
    next(error);
  }
}

/**
 * Sync manuelle (bouton ✨ Sync) — fallback si webhook instable
 */
async function syncProject(req, res, next) {
  try {
    const projectId = req.params.id;

    const projectResult = await query(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const project = projectResult.rows[0];

    // Détecter retour après silence (S5)
    const wasSilent = await signalService.detectReturn(projectId);

    // Récupérer les derniers commits
    try {
      const { owner, repo } = repoService.parseRepoUrl(project.repo_url);
      const commits = await repoService.getRecentCommits(owner, repo, 10);

      // Si commits après derniere_activite → progression
      const newCommits = commits.filter(
        (c) => new Date(c.date) > project.derniere_activite
      );

      if (newCommits.length > 0) {
        // Incrémenter total_commits
        await query(
          `UPDATE projects SET total_commits = total_commits + $1, derniere_activite = NOW() WHERE id = $2`,
          [newCommits.length, projectId]
        );

        // Analyser le diff du dernier commit
        const lastCommit = newCommits[0];
        const filesChanged = await repoService.getCommitFiles(owner, repo, lastCommit.sha);

        // Récupérer les tâches actives
        const tasksResult = await query(
          `SELECT id, label, etape_template FROM tasks WHERE project_id = $1 AND done = false`,
          [projectId]
        );

        const diffAnalysis = await aiService.analyzeDiff({
          filesChanged,
          repoContext: project.repo_name,
          tasks: tasksResult.rows,
        });

        // Marquer les tâches complétées
        if (diffAnalysis.completed_tasks.length > 0) {
          for (const taskId of diffAnalysis.completed_tasks) {
            await query(`UPDATE tasks SET done = true WHERE id = $1`, [taskId]);
          }
        }

        // Calculer nouvelle progression
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
        const newProgression = Math.min(100, (doneWeight / totalWeight) * 100);

        const newEtape = diffAnalysis.new_etape_semantique;

        await query(
          `UPDATE projects SET progression = $1${newEtape ? ', etape_semantique = $2' : ''} WHERE id = $3`,
          newEtape ? [newProgression, newEtape, projectId] : [newProgression, projectId]
        );

        // Enregistrer event brique
        await xpService.recordEvent(projectId, 'brique', {
          commits: newCommits.length,
          summary: diffAnalysis.summary,
        });

        // S1 — brique posée
        await signalService.triggerS1(projectId, {
          summary: diffAnalysis.summary,
          microAction: diffAnalysis.summary,
        });

        // Vérifier si projet achevé
        if (newProgression >= 100) {
          await xpService.recordEvent(projectId, 'finition', {});
          await query(`UPDATE projects SET statut = 'acheve' WHERE id = $1`, [projectId]);
        }
      }

      // Mettre à jour derniere_activite
      await query(`UPDATE projects SET derniere_activite = NOW() WHERE id = $1`, [projectId]);
    } catch (syncError) {
      console.error('[SYNC] Error:', syncError.message);
    }

    // Retourner le projet mis à jour
    const updated = await getProjectById(projectId);
    res.json({ ...updated, wasSilentReturn: wasSilent });
  } catch (error) {
    next(error);
  }
}

// Helper — projet complet avec docs, tasks, signals
async function getProjectById(projectId) {
  const projectResult = await query(
    `SELECT p.*, r.label as dream_label, r.categorie as dream_categorie, r.poids_de_reve
     FROM projects p
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return null;

  const project = projectResult.rows[0];

  // Docs
  const docsResult = await query(
    `SELECT * FROM docs WHERE project_id = $1 ORDER BY created_at DESC`,
    [projectId]
  );

  // Tasks
  const tasksResult = await query(
    `SELECT * FROM tasks WHERE project_id = $1 ORDER BY position ASC`,
    [projectId]
  );

  // Events
  const eventsResult = await query(
    `SELECT * FROM events WHERE project_id = $1 ORDER BY created_at DESC LIMIT 20`,
    [projectId]
  );

  return {
    ...project,
    docs: docsResult.rows,
    tasks: tasksResult.rows,
    events: eventsResult.rows,
  };
}

module.exports = {
  createProject,
  getProjects,
  getProject,
  validateDoc,
  linkToDream,
  deleteProject,
  syncProject,
};
