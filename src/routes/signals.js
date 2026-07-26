const express = require('express');
const router = express.Router();
const signalController = require('../controllers/signalController');
const { authenticate } = require('../middleware/auth');


router.use(authenticate);

// GET /api/signals/unread — signaux non lus (rappel dashboard)
router.get('/unread', signalController.getUnreadSignals);

// GET /api/signals/project/:projectId — historique des signaux d'un projet
router.get('/project/:projectId', signalController.getProjectSignals);

// PATCH /api/signals/:signalId/read — marquer un signal comme lu
router.patch('/:signalId/read', signalController.markRead);

// PATCH /api/signals/project/:projectId/read-all — marquer tous comme lus
router.patch('/project/:projectId/read-all', signalController.markAllRead);

// === SIMULATION (pour tests/démo) ===

// POST /api/signals/simulate/s3 — forcer un signal S3
router.post('/simulate/s3', signalController.simulateS3);

// POST /api/signals/simulate/brique — forcer une brique S1
router.post('/simulate/brique', signalController.simulateBrique);

module.exports = router;
