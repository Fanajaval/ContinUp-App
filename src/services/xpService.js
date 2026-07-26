const { query } = require('../config/database');
const { transaction } = require('../config/database');

/**
 * XP Service — calculs XP d'exploits + PoidsDeRêve + Rang
 * M6 : XP sur exploits (retours, finitions, déblocages), JAMAIS sur le volume brut
 */

const XP_MULTIPLIERS = {
  brique: 1,           // brique posée
  retour: 5,           // retour après silence ×5
  blocage_franchi: 3,  // blocage franchi ×3
  finition: 5,         // projet fini ×5
};

/**
 * Enregistre un event et attribue les XP
 */
async function recordEvent(projectId, type, meta = {}) {
  const xpEarned = XP_MULTIPLIERS[type] || 0;

  const result = await transaction(async (client) => {
    // 1. Créer l'event
    const eventResult = await client.query(
      `INSERT INTO events (project_id, type, xp_earned, meta)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [projectId, type, xpEarned, JSON.stringify(meta)]
    );

    // 2. Récupérer le user_id du projet
    const projectResult = await client.query(
      `SELECT user_id FROM projects WHERE id = $1`,
      [projectId]
    );

    if (projectResult.rows.length > 0) {
      const userId = projectResult.rows[0].user_id;

      // 3. Ajouter les XP au total de l'utilisateur
      await client.query(
        `UPDATE users SET xp_total = xp_total + $1 WHERE id = $2`,
        [xpEarned, userId]
      );
    }

    return eventResult.rows[0];
  });

  return result;
}

/**
 * Calcule le PoidsDeRêve agrégé d'un utilisateur
 * = somme pondérée de l'avancement de tous ses projets (finis ou non)
 */
async function calculatePoidsDeReve(userId) {
  const result = await query(
    `SELECT
       COALESCE(SUM(r.poids_de_reve * p.progression / 100), 0) as poids_agrege
     FROM projects p
     JOIN reves r ON p.reve_id = r.id
     WHERE p.user_id = $1
     AND p.statut != 'abandonne'`,
    [userId]
  );

  return parseFloat(result.rows[0].poids_agrege) || 0;
}

/**
 * Met à jour le rang de tous les utilisateurs
 * Calculé sur : XP d'exploits + taux de finition
 * JAMAIS sur le volume brut
 */
async function updateRanks() {
  // Calculer le score de chaque utilisateur (XP + taux de finition)
  const usersScore = await query(
    `SELECT
       u.id,
       u.xp_total,
       COALESCE(
         (SELECT COUNT(*) * 100.0 / NULLIF(COUNT(*), 0)
          FROM projects
          WHERE user_id = u.id AND statut = 'acheve')
       , 0) as taux_finition,
       (SELECT COUNT(*) FROM projects WHERE user_id = u.id AND statut = 'acheve') as projets_finis,
       (SELECT COUNT(*) FROM projects WHERE user_id = u.id) as total_projets
     FROM users u
     WHERE u.xp_total > 0
     ORDER BY u.xp_total DESC, taux_finition DESC`
  );

  // Attribution des rangs
  for (let i = 0; i < usersScore.rows.length; i++) {
    const rank = i + 1;
    await query(
      `UPDATE users SET rang = $1 WHERE id = $2`,
      [rank, usersScore.rows[i].id]
    );
  }

  return usersScore.rows.length;
}

/**
 * Récupère le classement global
 */
async function getLeaderboard(limit = 50) {
  const result = await query(
    `SELECT
       u.pseudo,
       u.xp_total,
       u.rang,
       COALESCE(poids.poids_agrege, 0) as poids_de_reve,
       COALESCE(stats.projets_finis, 0) as projets_finis,
       COALESCE(stats.total_projets, 0) as total_projets,
       COALESCE(stats.evenements_retour, 0) as retours,
       COALESCE(stats.evenements_blocage, 0) as blocages_franchis
     FROM users u
     LEFT JOIN (
       SELECT
         p.user_id,
         SUM(r.poids_de_reve * p.progression / 100) as poids_agrege
       FROM projects p
       JOIN reves r ON p.reve_id = r.id
       WHERE p.statut != 'abandonne'
       GROUP BY p.user_id
     ) poids ON poids.user_id = u.id
     LEFT JOIN (
       SELECT
         user_id,
         COUNT(*) FILTER (WHERE statut = 'acheve') as projets_finis,
         COUNT(*) as total_projets,
         COUNT(*) FILTER (WHERE id IN (SELECT project_id FROM events WHERE type = 'retour')) as evenements_retour,
         COUNT(*) FILTER (WHERE id IN (SELECT project_id FROM events WHERE type = 'blocage_franchi')) as evenements_blocage
       FROM projects
       GROUP BY user_id
     ) stats ON stats.user_id = u.id
     WHERE u.xp_total > 0
     ORDER BY u.rang ASC NULLS LAST
     LIMIT $1`,
    [limit]
  );

  return result.rows;
}

/**
 * Récupère les stats XP d'un utilisateur
 */
async function getUserXPStats(userId) {
  const result = await query(
    `SELECT
       u.xp_total,
       u.rang,
       COALESCE(SUM(r.poids_de_reve * p.progression / 100), 0) as poids_de_reve,
       COUNT(DISTINCT p.id) FILTER (WHERE p.statut = 'acheve') as projets_finis,
       COUNT(DISTINCT e.id) FILTER (WHERE e.type = 'retour') as retours,
       COUNT(DISTINCT e.id) FILTER (WHERE e.type = 'blocage_franchi') as blocages_franchis
     FROM users u
     LEFT JOIN projects p ON p.user_id = u.id
     LEFT JOIN events e ON e.project_id = p.id
     LEFT JOIN reves r ON p.reve_id = r.id
     WHERE u.id = $1
     GROUP BY u.id, u.xp_total, u.rang`,
    [userId]
  );

  return result.rows[0] || null;
}

module.exports = {
  recordEvent,
  calculatePoidsDeReve,
  updateRanks,
  getLeaderboard,
  getUserXPStats,
  XP_MULTIPLIERS,
};
