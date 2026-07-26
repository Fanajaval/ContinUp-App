const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');


// POST /api/webhook/github — GitHub push webhook
router.post('/github', webhookController.handleGitHubPush);

module.exports = router;
