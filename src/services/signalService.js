const { query } = require('../config/database');
const aiService = require('./aiService');
const emailService = require('./emailService');
const env = require('../config/env');

/**
 * Signal Service — le système nerveux
 * Moteur de signaux S1, S3, S5, S6
 */

// XP par type d'exploit
const XP_REWARDS = {
  brique: 1,
  retour: 5,       // retour après silence ×5
  blocage_franchi: 3, // déblocage ×3
  finition: 5,      // projet fini ×5
};

// Seuils de silence
const SILENCE_HOURS = 72; // >72h = S3
const MAX_S3_RELANCES = 2;

/**
 * S1 — Brique posée (célébration + étape révélée)
 * Déclenché après un commit qui fait progresser
 */
async function triggerS1(projectId, context = {}) {
  const projectResult = await query(
    `SELECT p.*, u.style_signal, u.pseudo, r.label as dream_label
     FROM projects p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  const message = await aiService.generateSignalMessage({
    style: project.style_signal,
    declencheur: 'S1',
    projectName: project.repo_name || project.template_type,
    etapeSemantique: project.etape_semantique || 'Nouvelle brique',
    progression: project.progression,
    microAction: context.microAction || 'Prochaine étape en vue',
    preuveProgres: context.summary || 'Brique posée',
  });

  const signal = await createSignal({
    project_id: projectId,
    declencheur: 'S1',
    style: project.style_signal,
    contenu: message,
    canal: 'in-app',
  });

  return signal;
}

/**
 * S3 — Jour 4 (silence > 72h)
 * Previously + preuve de progrès + UNE micro-action + lien
 */
async function triggerS3(projectId) {
  const projectResult = await query(
    `SELECT p.*, u.style_signal, u.pseudo, u.email, r.label as dream_label
     FROM projects p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  // Anti-harcèlement : max 2 relances S3
  const relanceResult = await query(
    `SELECT COUNT(*) as count FROM signals
     WHERE project_id = $1 AND declencheur = 'S3'`,
    [projectId]
  );
  const relanceCount = parseInt(relanceResult.rows[0].count);
  if (relanceCount >= MAX_S3_RELANCES) return null;

  // Récupérer la dernière doc pour la preuve de progrès
  const docResult = await query(
    `SELECT contenu_json FROM docs WHERE project_id = $1 AND type = 'resume' ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  );
  const preuve = docResult.rows[0]?.contenu_json?.previously || {};

  // Récupérer la prochaine micro-action
  const taskResult = await query(
    `SELECT label, duree_estimee FROM tasks
     WHERE project_id = $1 AND done = false
     ORDER BY position ASC LIMIT 1`,
    [projectId]
  );
  const microAction = taskResult.rows[0]?.label || 'Reprendre le projet';

  const message = await aiService.generateSignalMessage({
    style: project.style_signal,
    declencheur: 'S3',
    projectName: project.repo_name || project.template_type,
    etapeSemantique: project.etape_semantique || 'En cours',
    progression: project.progression,
    microAction,
    preuveProgres: preuve.ou_tu_en_es || `${project.progression}% complété`,
  });

  // Signal in-app
  const signal = await createSignal({
    project_id: projectId,
    declencheur: 'S3',
    style: project.style_signal,
    contenu: message,
    canal: 'in-app',
    relance_count: relanceCount,
  });

  // Email S3 (l'absent n'ouvre pas l'app)
  if (env.EMAIL_ENABLED) {
    const frontendUrl = env.FRONTEND_URL;
    await emailService.sendSignalEmail({
      to: project.email,
      pseudo: project.pseudo,
      projectName: project.repo_name,
      signal: message,
      progression: project.progression,
      etapeSemantique: project.etape_semantique,
      microAction,
      proofText: preuve.ou_tu_en_es || `${project.progression}% du rêve déjà construit`,
      dreamLink: `${frontendUrl}/projects/${projectId}`,
    });

    // Mettre à jour le canal
    await query(
      `UPDATE signals SET canal = 'email' WHERE id = $1`,
      [signal.id]
    );
  }

  return signal;
}

/**
 * S5 — Retour (célébration, jamais de reproche)
 */
async function triggerS5(projectId) {
  const projectResult = await query(
    `SELECT p.*, u.style_signal, u.pseudo, r.label as dream_label
     FROM projects p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  const message = await aiService.generateSignalMessage({
    style: project.style_signal,
    declencheur: 'S5',
    projectName: project.repo_name || project.template_type,
    etapeSemantique: project.etape_semantique || 'En cours',
    progression: project.progression,
    microAction: 'Continuer sur cette lancée',
    preuveProgres: `${project.progression}% du rêve`,
  });

  const signal = await createSignal({
    project_id: projectId,
    declencheur: 'S5',
    style: project.style_signal,
    contenu: message,
    canal: 'in-app',
  });

  return signal;
}

/**
 * S6 — Déblocage proche (1 tâche avant étape majeure)
 */
async function triggerS6(projectId) {
  const projectResult = await query(
    `SELECT p.*, u.style_signal, r.label as dream_label
     FROM projects p
     JOIN users u ON p.user_id = u.id
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE p.id = $1`,
    [projectId]
  );

  if (projectResult.rows.length === 0) return null;
  const project = projectResult.rows[0];

  const message = await aiService.generateSignalMessage({
    style: project.style_signal,
    declencheur: 'S6',
    projectName: project.repo_name || project.template_type,
    etapeSemantique: project.etape_semantique || 'Presque',
    progression: project.progression,
    microAction: 'Plus qu\'une tâche avant la prochaine étape !',
    preuveProgres: `${project.progression}% — dernière marche avant ${project.etape_semantique}`,
  });

  const signal = await createSignal({
    project_id: projectId,
    declencheur: 'S6',
    style: project.style_signal,
    contenu: message,
    canal: 'in-app',
  });

  return signal;
}

/**
 * CRON — Détection des projets silencieux (> 72h sans activité)
 */
async function checkSilentProjects() {
  const silenceThreshold = new Date(Date.now() - SILENCE_HOURS * 60 * 60 * 1000);

  // Projets actifs devenus silencieux
  const silentProjects = await query(
    `SELECT p.id FROM projects p
     WHERE p.statut = 'actif'
     AND p.derniere_activite < $1
     AND p.progression < 100`,
    [silenceThreshold]
  );

  let triggered = 0;
  for (const project of silentProjects.rows) {
    const result = await triggerS3(project.id);
    if (result) {
      // Mettre à jour le statut
      await query(
        `UPDATE projects SET statut = 'silencieux' WHERE id = $1`,
        [project.id]
      );
      triggered++;
    }
  }

  console.log(`[CRON] Silence check: ${triggered} signaux S3 déclenchés`);
  return triggered;
}

/**
 * Détecter les retours (S5) — projet silencieux qui redevient actif
 */
async function detectReturn(projectId) {
  // Vérifier si le projet était silencieux
  const result = await query(
    `SELECT statut FROM projects WHERE id = $1`,
    [projectId]
  );

  if (result.rows[0]?.statut === 'silencieux') {
    await triggerS5(projectId);
    // Remettre en actif
    await query(
      `UPDATE projects SET statut = 'actif' WHERE id = $1`,
      [projectId]
    );
    return true;
  }
  return false;
}

/**
 * Helper — crée un signal en BDD
 */
async function createSignal({ project_id, declencheur, style, contenu, canal, relance_count = 0 }) {
  const result = await query(
    `INSERT INTO signals (project_id, declencheur, style, contenu, canal, relance_count)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [project_id, declencheur, style, contenu, canal, relance_count]
  );
  return result.rows[0];
}

/**
 * Récupérer les signaux d'un projet
 */
async function getProjectSignals(projectId) {
  const result = await query(
    `SELECT * FROM signals WHERE project_id = $1 ORDER BY envoye_le DESC`,
    [projectId]
  );
  return result.rows;
}

/**
 * Récupérer les signaux non lus d'un utilisateur
 */
async function getUnreadSignals(userId) {
  const result = await query(
    `SELECT s.*, p.repo_name, p.template_type
     FROM signals s
     JOIN projects p ON s.project_id = p.id
     WHERE p.user_id = $1 AND s.lu = false
     ORDER BY s.envoye_le DESC`,
    [userId]
  );
  return result.rows;
}

/**
 * Marquer un signal comme lu
 */
async function markSignalRead(signalId) {
  await query(`UPDATE signals SET lu = true WHERE id = $1`, [signalId]);
}

module.exports = {
  triggerS1,
  triggerS3,
  triggerS5,
  triggerS6,
  checkSilentProjects,
  detectReturn,
  createSignal,
  getProjectSignals,
  getUnreadSignals,
  markSignalRead,
  XP_REWARDS,
  SILENCE_HOURS,
};
