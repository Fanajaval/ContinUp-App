const cron = require('node-cron');
const signalService = require('../services/signalService');
const xpService = require('../services/xpService');
const env = require('../config/env');

/**
 * Cron Worker — jobs programmés
 * - Détection de silence (S3 jour-4) toutes les 6h
 * - Calcul des rangs toutes les heures
 */

function startCronJobs() {
  console.log('[CRON] Starting scheduled jobs...');

  // S3 — Détection des projets silencieux (> 72h sans activité)
  // Par défaut toutes les 6h
  const silenceCron = env.CRON_SILENCE_CHECK || '0 */6 * * *';
  cron.schedule(silenceCron, async () => {
    console.log('[CRON] Running silence check...');
    try {
      const count = await signalService.checkSilentProjects();
      console.log(`[CRON] Silence check done: ${count} signals triggered`);
    } catch (error) {
      console.error('[CRON] Silence check error:', error.message);
    }
  }, {
    timezone: 'Indian/Antananarivo',
  });

  // Calcul des rangs — toutes les heures
  cron.schedule('0 * * * *', async () => {
    console.log('[CRON] Updating ranks...');
    try {
      const count = await xpService.updateRanks();
      console.log(`[CRON] Ranks updated for ${count} users`);
    } catch (error) {
      console.error('[CRON] Rank update error:', error.message);
    }
  }, {
    timezone: 'Indian/Antananarivo',
  });

  console.log(`[CRON] Jobs scheduled — silence check: ${silenceCron}, ranks: hourly`);
}

module.exports = { startCronJobs };
