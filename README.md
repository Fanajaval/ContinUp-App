# 🔗 Backend — Ton repo construit ta vie rêvée

> Backend Express.js + PostgreSQL pour le projet de hackathon.

## 🚀 Démarrage rapide

```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la BDD (créer la base)
# Assurez-vous que PostgreSQL est démarré
createdb reve_db   # ou via pgAdmin

# 3. Initialiser les tables
npm run db:init

# 4. (Optionnel) Ajouter des données de démo
npm run db:seed

# 5. Lancer le serveur
npm run dev   # développement (nodemon)
npm start     # production
```

## 📁 Architecture

```
backend/
├── src/
│   ├── config/
│   │   ├── database.js      # Pool PostgreSQL + helpers
│   │   └── env.js           # Validation env (zod)
│   ├── routes/
│   │   ├── auth.js          # POST /register, /login, GET /me
│   │   ├── reves.js         # CRUD rêves (M1)
│   │   ├── projects.js      # CRUD projets + sync (M2, M3, M5)
│   │   ├── signals.js       # Signaux + simulation (M4.5)
│   │   └── webhook.js       # GitHub push webhook (M4)
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── reveController.js
│   │   ├── projectController.js
│   │   ├── signalController.js
│   │   └── webhookController.js
│   ├── services/
│   │   ├── aiService.js     # Appels LLM (analyse, signaux, mapping)
│   │   ├── repoService.js   # Analyse repos GitHub
│   │   ├── signalService.js # Moteur S1/S3/S5/S6
│   │   ├── xpService.js     # XP exploits + rang
│   │   └── emailService.js  # Resend (email S3)
│   ├── workers/
│   │   └── cronWorker.js    # Détection silence + calcul rangs
│   ├── middleware/
│   │   ├── auth.js          # JWT authentication
│   │   └── errorHandler.js  # Global error handler
│   └── app.js               # Entry point
├── sql/
│   └── init.sql             # Schema BDD complet
├── .env                     # Variables d'environnement
└── package.json
```

## 🔑 Endpoints principaux

| Méthode | Route | Description | Module |
|---------|-------|-------------|--------|
| POST | `/api/auth/register` | Inscription | M1.1 |
| POST | `/api/auth/login` | Login | M1.1 |
| GET | `/api/auth/me` | Profil | M1.1 |
| POST | `/api/reves` | Créer portefeuille rêves + analyse IA | M1.2-1.3 |
| GET | `/api/reves` | Lister mes rêves | M1 |
| POST | `/api/projects` | Créer projet (repo → analyse IA) | M2 |
| GET | `/api/projects` | Dashboard (cards) | M5 |
| POST | `/api/projects/:id/sync` | Sync manuelle (✨ Sync) | M4 |
| GET | `/api/signals/unread` | Signaux non lus | M4.5 |
| GET | `/api/ranks` | Classement global | M6.4 |
| POST | `/api/admin/simulate-day4` | Forcer S3 (démo) | M4 |
| POST | `/api/admin/force-brique` | Forcer S1 (démo) | M4 |
| POST | `/api/webhook/github` | GitHub push webhook | M4 |

## 🧪 Comptes de test (après seed)

| User | Email | Password | Style | XP | Rôle |
|------|-------|----------|-------|-----|------|
| Soa | soa@example.com | password123 | motivant | 42 | Débutante |
| Marc | marc@example.com | password123 | sarcastique | 87 | Expérimenté |

## 💎 Le joyau

```
commit réel → analyse IA → étape sémantique → rêve se construit visuellement
→ silence > 72h → Signal S3 avec preuve de progrès + UNE micro-action
```

## ⚙️ Variables d'environnement

Voir `.env.example` pour la liste complète.

**Minimum requis :**
- `DATABASE_URL` — connexion PostgreSQL
- `JWT_SECRET` — secret JWT
- `AI_API_KEY` — clé API LLM (OpenAI ou compatible)
