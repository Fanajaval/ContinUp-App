# ReStart — Ton repo construit ta vie rêvée

## Structure

```
ReStart/
├── backend/     # Auth + API (Express/Sequelize) — port 5000
├── ia/          # Partie A — IA/Backend (analyse, mapping, signaux, lettre) — port 4000
└── frontend/    # Front (Vite/React) — à brancher plus tard
```

## Démarrer le service IA (Partie A)

```bash
cd ia
npm install
npm run db:migrate   # crée les tables du CDC (user, reve, project, task, …)
npm run db:seed      # données de démo
npm run dev          # http://localhost:4000
```

### Tester sans clé LLM

Le mode dégradé est actif si `LLM_API_KEY` est vide ou `LLM_OFFLINE=1`.
Les fallbacks sont servis avec `"degraded": true`.

```bash
cd ia
npm test             # tests unitaires (guardrails, etc.)
npm run smoke        # parcours complet des routes
```

### Endpoints clés

| Route | Rôle |
|---|---|
| `GET /health` | état LLM + BDD |
| `POST /api/analyze` | M2 — analyse repo |
| `POST /api/map` | M3.3 — mapping tâches → calques |
| `POST /api/signal` | M4 — Signaux S1/S3/S5/S6 |
| `POST /api/letter` | M7 — lettre du futur |
| `POST /api/dreams/analyze` | M1.3 — PoidsDeRêve |
| `GET /api/signal/preview` | préviews styles (0 token) |

Doc complète : [`ia/README.md`](ia/README.md)

## Démarrer le backend Auth

```bash
cd backend
npm install
npm run dev          # http://localhost:5000
```
