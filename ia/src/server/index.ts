/**
 * Serveur Express — Partie A (IA/Backend) du Quatrième Jour.
 * Démarre TOUJOURS, même sans BDD et sans clé LLM (mode dégradé, NF2).
 */
import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import { analyzeRouter } from './api/analyze.js';
import { mappingRouter } from './api/mapping.js';
import { signalRouter } from './api/signal.js';
import { letterRouter } from './api/letter.js';
import { dreamsRouter } from './api/dreams.js';
import { llmInfo } from './services/llm/client.js';
import { cacheStatus, cacheInvalidateScope } from './services/utils/cache.js';
import { pingDb, DB_ENABLED } from './db/client.js';
import { ETAPES_MAISON, LIBELLES_ETAPES } from './types/index.js';

const app = express();
const PORT = Number(process.env.PORT ?? 4000);

app.use(cors());
app.use(express.json({ limit: '8mb' })); // les repos peuvent être volumineux

// Log léger : indispensable pour débugger à 3h du matin
app.use((req, _res, next) => {
  if (req.path !== '/health') console.log(`→ ${req.method} ${req.path}`);
  next();
});

// ── Santé & diagnostic ───────────────────────────────────────
app.get('/health', async (_req, res) => {
  res.json({
    ok: true,
    service: 'quatrieme-jour-ia',
    llm: llmInfo(),
    db: { configured: DB_ENABLED, reachable: await pingDb() },
    cache: cacheStatus(),
    uptime_s: Math.round(process.uptime()),
  });
});

/** Référentiel des étapes — B et D s'y réfèrent pour les calques. */
app.get('/api/etapes', (_req, res) => {
  res.json({
    etapes: ETAPES_MAISON.map((e, i) => ({ ordre: i + 1, etape: e, libelle: LIBELLES_ETAPES[e] })),
  });
});

// ── Routes métier ────────────────────────────────────────────
app.use('/api', analyzeRouter);
app.use('/api', mappingRouter);
app.use('/api', signalRouter);
app.use('/api', letterRouter);
app.use('/api', dreamsRouter);

/** Admin : purge le cache d'un projet pour rejouer une démo proprement. */
app.post('/api/admin/cache/invalidate', async (req, res) => {
  const scope = req.body?.scope;
  if (!scope) return res.status(400).json({ ok: false, error: 'scope requis (projectId ou userId)' });
  await cacheInvalidateScope(scope);
  res.json({ ok: true, scope });
});

app.use((req, res) => {
  res.status(404).json({ ok: false, code: 'NOT_FOUND', error: `Route inconnue : ${req.method} ${req.path}` });
});

app.listen(PORT, () => {
  const info = llmInfo();
  console.log('');
  console.log('  🔔 Le Quatrième Jour — service IA/Backend (partie A)');
  console.log(`  ➜ http://localhost:${PORT}`);
  console.log(`  ➜ LLM    : ${info.offline ? '⚠️  HORS LIGNE (mode dégradé, fallbacks servis)' : `${info.model} @ ${info.baseUrl}`}`);
  console.log(`  ➜ BDD    : ${DB_ENABLED ? 'configurée' : '⚠️  absente (cache mémoire uniquement)'}`);
  console.log('');
  console.log('  Routes : POST /api/analyze · /api/map · /api/signal · /api/letter · /api/dreams/analyze');
  console.log('           GET  /api/signal/preview · /api/template/:type · /health');
  console.log('');
});
