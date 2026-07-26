const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

/**
 * Routes Auth — M1.1 (inscription, login, profil)
 */

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/login
router.post('/login', authController.login);

// GET /api/auth/me (profil)
router.get('/me', authenticate, authController.getProfile);

// PATCH /api/auth/style (changer le style de signal)
router.patch('/style', authenticate, authController.updateStyle);

module.exports = router;
