const { query } = require('../config/database');
const aiService = require('../services/aiService');
const { z } = require('zod');

/**
 * Reve Controller — portefeuille de rêves (M1)
 */

const createRevesSchema = z.object({
  reves: z.array(z.object({
    label: z.string().min(1).max(100),
    categorie: z.enum(['maison', 'villa', 'voiture', 'centre_aide', 'generique', 'autre']).optional(),
  })).min(1),
});

const updateReveSchema = z.object({
  label: z.string().min(1).max(100).optional(),
  statut: z.enum(['actif', 'acheve', 'abandonne']).optional(),
});

/**
 * Créer le portefeuille de rêves (M1.2)
 * + analyse IA des catégories et PoidsDeRêve (M1.3)
 */
async function createReves(req, res, next) {
  try {
    const data = createRevesSchema.parse(req.body);
    const userId = req.user.id;

    // 1. Créer les rêves en BDD
    const createdReves = [];
    for (const reve of data.reves) {
      const result = await query(
        `INSERT INTO reves (user_id, label, categorie, poids_de_reve)
         VALUES ($1, $2, $3, 1.0)
         RETURNING *`,
        [userId, reve.label, reve.categorie || 'autre']
      );
      createdReves.push(result.rows[0]);
    }

    // 2. Analyse IA du portefeuille (catégories + PoidsDeRêve)
    try {
      const analysis = await aiService.analyzeDreamPortfolio(data.reves.map((r) => r.label));

      if (Array.isArray(analysis)) {
        for (const analyzed of analysis) {
          // Trouver le rêve correspondant
          const matchingReve = createdReves.find(
            (r) => r.label.toLowerCase() === analyzed.label?.toLowerCase()
          );
          if (matchingReve) {
            await query(
              `UPDATE reves SET categorie = COALESCE($1, categorie), poids_de_reve = $2 WHERE id = $3`,
              [analyzed.categorie || null, analyzed.poids_de_reve || 1.0, matchingReve.id]
            );
            matchingReve.categorie = analyzed.categorie || matchingReve.categorie;
            matchingReve.poids_de_reve = analyzed.poids_de_reve || 1.0;
          }
        }
      }
    } catch (aiError) {
      console.error('[REVES] AI analysis failed (non-blocking):', aiError.message);
    }

    // 3. Retourner les rêves mis à jour
    const finalReves = await query(
      `SELECT * FROM reves WHERE user_id = $1 ORDER BY created_at ASC`,
      [userId]
    );

    res.status(201).json(finalReves.rows);
  } catch (error) {
    next(error);
  }
}

/**
 * Récupérer les rêves de l'utilisateur
 */
async function getReves(req, res, next) {
  try {
    const result = await query(
      `SELECT r.*, 
              (SELECT COUNT(*) FROM projects WHERE reve_id = r.id) as projects_count
       FROM reves r
       WHERE r.user_id = $1
       ORDER BY r.created_at ASC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
}

/**
 * Mettre à jour un rêve
 */
async function updateReve(req, res, next) {
  try {
    const data = updateReveSchema.parse(req.body);
    const { id } = req.params;

    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (data.label) {
      setClauses.push(`label = $${paramIndex++}`);
      values.push(data.label);
    }
    if (data.statut) {
      setClauses.push(`statut = $${paramIndex++}`);
      values.push(data.statut);
    }

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    values.push(id, req.user.id);
    const result = await query(
      `UPDATE reves SET ${setClauses.join(', ')} WHERE id = $${paramIndex++} AND user_id = $${paramIndex++} RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rêve non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

/**
 * Supprimer un rêve
 */
async function deleteReve(req, res, next) {
  try {
    const result = await query(
      `DELETE FROM reves WHERE id = $1 AND user_id = $2 RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Rêve non trouvé' });
    }

    res.json({ message: 'Rêve supprimé' });
  } catch (error) {
    next(error);
  }
}

module.exports = { createReves, getReves, updateReve, deleteReve };
