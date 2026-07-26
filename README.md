# ReStart — Ton repo construit ta vie rêvée

## Structure

```
ReStart/
├── frontend/    # Next.js UI (port 3000)
├── backend/     # Auth Express historique (port 5000)
├── ia/          # Service IA Partie A (port 4000)
└── src/         # Backend unifié (si utilisé à la racine)
```

## Démarrage local

```bash
# Terminal 1 — Auth API (choisir l'un des deux stacks)
cd backend && npm run dev
# ou à la racine : npm run dev

# Terminal 2 — IA
cd ia && npm run dev

# Terminal 3 — Front
cd frontend && npm run dev
```

Ouvre **http://localhost:3000/login**

| Couche | Comportement |
|--------|----------------|
| Auth | Réelle → `/api/auth/*` proxy vers `:5000` |
| Dashboard / classement | Mocks (tant que C n’a pas livré) |
| Onboarding rêves | Best-effort → IA `:4000` via `/api/ia/*` |

## Typographie

**Plus Jakarta Sans** (UI) + **Fraunces** (titres), via `next/font` pour un chargement rapide (`display: swap`).
