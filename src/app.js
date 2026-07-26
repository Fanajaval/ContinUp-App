const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { healthCheck } = require('./config/database');
const { startCronJobs } = require('./workers/cronWorker');

const app = express();

// ===========================================
// MIDDLEWARE
// ===========================================
app.use(helmet());
app.use(cors({
  origin: env.FRONTEND_URL || '*',
  credentials: true,
}));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================================
// ROUTES
// ===========================================

// Health check
app.get('/api/health', async (req, res) => {
  const dbHealth = await healthCheck();
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    database: dbHealth,
  });
});

// Auth routes (M1.1)
app.use('/api/auth', require('./routes/auth'));

// Rêves routes (M1)
app.use('/api/reves', require('./routes/reves'));

// Projects routes (M2, M3, M5)
app.use('/api/projects', require('./routes/projects'));

// Signals routes (M4.5)
app.use('/api/signals', require('./routes/signals'));

// Webhook routes (M4 — GitHub push)
app.use('/api/webhook', require('./routes/webhook'));

// === ADMIN / SIMULATION (endpoints de démo et test) ===
app.post('/api/admin/simulate-day4', async (req, res, next) => {
  try {
    const { query } = require('./config/database');
    const signalService = require('./services/signalService');

    // Trouver les projets silencieux
    const silenceThreshold = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const result = await query(
      `SELECT p.id, p.repo_name, p.derniere_activite
       FROM projects p
       WHERE p.derniere_activite < $1 AND p.statut = 'actif' AND p.progression < 100`,
      [silenceThreshold]
    );

    let triggered = 0;
    for (const project of result.rows) {
      const signal = await signalService.triggerS3(project.id);
      if (signal) triggered++;
    }

    res.json({ message: `${triggered} signaux S3 déclenchés`, projects_checked: result.rows.length });
  } catch (error) {
    next(error);
  }
});

app.post('/api/admin/force-brique', async (req, res, next) => {
  try {
    const { projectId } = req.body;
    const signalService = require('./services/signalService');

    const signal = await signalService.triggerS1(projectId, {
      summary: 'Brique simulée (admin)',
      microAction: 'Continuer',
    });

    res.json(signal || { error: 'Signal non créé' });
  } catch (error) {
    next(error);
  }
});

// Ranks / Leaderboard (M6)
app.get('/api/ranks', async (req, res, next) => {
  try {
    const xpService = require('./services/xpService');
    const leaderboard = await xpService.getLeaderboard(50);
    res.json(leaderboard);
  } catch (error) {
    next(error);
  }
});

// User XP stats
app.get('/api/xp/stats', require('./middleware/auth').authenticate, async (req, res, next) => {
  try {
    const xpService = require('./services/xpService');
    const stats = await xpService.getUserXPStats(req.user.id);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// ===========================================
// ERROR HANDLING
// ===========================================
app.use(notFoundHandler);
app.use(errorHandler);

// ===========================================
// START SERVER
// ===========================================
const PORT = env.PORT;

app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════╗
║  🏠 Ton repo construit ta vie rêvée                 ║
║  Backend v1.0 — Port ${PORT}                          ║
║  Environment: ${env.NODE_ENV.padEnd(38)}║
╚══════════════════════════════════════════════════════╝
  `);

  // Démarrer les cron jobs
  startCronJobs();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[SERVER] SIGTERM received, shutting down...');
  const { shutdown } = require('./config/database');
  await shutdown();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('[SERVER] SIGINT received, shutting down...');
  const { shutdown } = require('./config/database');
  await shutdown();
  process.exit(0);
});

module.exports = app;
