const express = require('express');
const router = express.Router();
const reveController = require('../controllers/reveController');
const { authenticate } = require('../middleware/auth');


router.use(authenticate);

// POST /api/reves — créer le portefeuille de rêves (analyse IA)
router.post('/', reveController.createReves);

// GET /api/reves — récupérer les rêves de l'utilisateur
router.get('/', reveController.getReves);

// PATCH /api/reves/:id — mettre à jour un rêve
router.patch('/:id', reveController.updateReve);

// DELETE /api/reves/:id — supprimer un rêve
router.delete('/:id', reveController.deleteReve);

module.exports = router;
