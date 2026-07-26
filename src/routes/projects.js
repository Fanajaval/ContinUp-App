const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { authenticate } = require('../middleware/auth');

// Toutes les routes nécessitent l'authentification
router.use(authenticate);

// POST /api/projects — créer un projet (associer repo + analyse IA)
router.post('/', projectController.createProject);

// GET /api/projects — tous les projets de l'utilisateur (dashboard)
router.get('/', projectController.getProjects);

// GET /api/projects/:id — un projet avec docs, tasks, events
router.get('/:id', projectController.getProject);

// POST /api/projects/:id/sync — sync manuelle (bouton ✨ Sync)
router.post('/:id/sync', projectController.syncProject);

// PATCH /api/projects/:id/dream — lier projet ↔ rêve
router.patch('/:id/dream', projectController.linkToDream);

// PATCH /api/projects/:id/docs/:docId/validate — valider/invalider un doc (M2.4)
router.patch('/:id/docs/:docId/validate', projectController.validateDoc);

// DELETE /api/projects/:id — supprimer un projet
router.delete('/:id', projectController.deleteProject);

module.exports = router;
