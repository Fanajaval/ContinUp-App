const { query } = require('../config/database');
const signalService = require('../services/signalService');

/**
 * Signal Controller — surface des signaux (M4.5)
 * Onglet Signaux (historique) + rappels dashboard
 */

/**
 * Récupérer les signaux non lus de l'utilisateur
 */
async function getUnreadSignals(req, res, next) {
  try {
    const signals = await signalService.getUnreadSignals(req.user.id);
    res.json(signals);
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer l'historique des signaux d'un projet
 */
async function getProjectSignals(req, res, next) {
  try {
    // Vérifier que le projet appartient à l'utilisateur
    const projectResult = await query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [req.params.projectId, req.user.id]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const signals = await signalService.getProjectSignals(req.params.projectId);
    res.json(signals);
  } catch (error) {
    next(error);
  }
}

/**
 * Marquer un signal comme lu
 */
async function markRead(req, res, next) {
  try {
    const { signalId } = req.params;

    // Vérifier que le signal appartient à l'utilisateur
    const check = await query(
      `SELECT s.id FROM signals s
       JOIN projects p ON s.project_id = p.id
       WHERE s.id = $1 AND p.user_id = $2`,
      [signalId, req.user.id]
    );

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Signal non trouvé' });
    }

    await signalService.markSignalRead(signalId);
    res.json({ message: 'Signal marqué comme lu' });
  } catch (error) {
    next(error);
  }
}

/**
 * Marquer tous les signaux d'un projet comme lus
 */
async function markAllRead(req, res, next) {
  try {
    const { projectId } = req.params;

    // Vérifier que le projet appartient à l'utilisateur
    const projectCheck = await query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    await query(
      `UPDATE signals SET lu = true WHERE project_id = $1 AND lu = false`,
      [projectId]
    );

    res.json({ message: 'Tous les signaux marqués comme lus' });
  } catch (error) {
    next(error);
  }
}

/**
 * Simulation — déclencher un signal S3 (pour tests/démo)
 * POST /api/signals/simulate/s3
 */
async function simulateS3(req, res, next) {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId requis' });
    }

    // Vérifier accès
    const projectCheck = await query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const signal = await signalService.triggerS3(projectId);
    if (!signal) {
      return res.status(400).json({ error: 'Signal S3 non déclenché (max relances atteint ou projet non silencieux)' });
    }

    res.json(signal);
  } catch (error) {
    next(error);
  }
}

/**
 * Simulation — forcer une brique (pour tests)
 * POST /api/signals/simulate/brique
 */
async function simulateBrique(req, res, next) {
  try {
    const { projectId } = req.body;

    if (!projectId) {
      return res.status(400).json({ error: 'projectId requis' });
    }

    const projectCheck = await query(
      `SELECT id FROM projects WHERE id = $1 AND user_id = $2`,
      [projectId, req.user.id]
    );

    if (projectCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Projet non trouvé' });
    }

    const signal = await signalService.triggerS1(projectId, {
      summary: 'Simulation : brique posée',
      microAction: 'Continuer le développement',
    });

    res.json(signal);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getUnreadSignals,
  getProjectSignals,
  markRead,
  markAllRead,
  simulateS3,
  simulateBrique,
};
