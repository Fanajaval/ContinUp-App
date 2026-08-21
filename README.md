# ContinUp

ContinUp est une application qui aide un utilisateur à transformer un rêve ou un objectif de projet en progression concrète, en l'accompagnant avec des tâches, des signaux de motivation, un suivi visuel et une logique d'IA.

L'idée centrale : un projet ne doit pas rester abstrait. Il doit être décomposé, accompagné, et relancé avec des signaux utiles lorsque l'élan baisse.

---

## ✨ Aperçu

ContinUp combine :

- une interface web moderne en Next.js,
- une API backend Node.js / Express,
- une couche IA pour analyser les projets, générer des tâches et produire des signaux de relance,
- un système de suivi de progression, d'XP et d'engagement.

Le produit est pensé comme un assistant de développement personnel et de projet :

- on associe un rêve / objectif,
- on analyse le repo ou le projet,
- on suit l'avancement étape par étape,
- on reçoit des signaux motivants et des actions simples à exécuter.

---

## 🎯 Problème résolu

Beaucoup de projets restent bloqués parce qu'ils manquent de structure, de visibilité et de relance. ContinUp vise à remettre de la clarté dans la progression en proposant :

- une vision claire des étapes du projet,
- des tâches priorisées,
- un suivi de la progression,
- des signaux d'encouragement personnalisés,
- un accompagnement orienté action plutôt que culpabilité.

---

## 🧩 Fonctionnalités principales

- Authentification utilisateur
- Création et suivi de projets
- Analyse de rêves et d'objectifs
- Suivi de progression par étape
- Génération de tâches / priorisation
- Système de signaux de motivation et de relance
- Dashboard de suivi
- Classement / engagement / XP
- Interface de démonstration et onboarding

---

## 🏗️ Stack technique

### Frontend
- Next.js
- React
- TypeScript
- Tailwind CSS
- Framer Motion

### Backend
- Node.js
- Express
- PostgreSQL
- JWT
- Sequelize / SQL native selon les modules

### IA / services
- API dédiée pour l'analyse de repo / tâches / signaux
- génération de contenus assistée par IA
- fallback / validation de réponses

---

## 📁 Structure du projet

```text
ContinUp/
├── backend/              # API principale
│   ├── app.js
│   ├── server.js
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   └── ...
├── frontend/             # Application Next.js
│   ├── app/
│   ├── components/
│   ├── lib/
│   └── ...
├── ia/                   # Service IA / analyse / signal
│   ├── src/
│   ├── tests/
│   └── ...
├── src/                  # Ancien backend / code legacy
├── sql/                  # Scripts SQL
├── .env.example
├── package.json
├── README.md
└── ...
```

---

## 🚀 Prérequis

Avant de lancer le projet, vérifie que tu as :

- Node.js 18+
- npm
- PostgreSQL installé et démarré
- un fichier `.env` avec les variables nécessaires

---

## ⚙️ Configuration de l'environnement

Copie le fichier d'exemple :

```bash
cp .env.example .env
```

Puis complète les variables selon ton environnement local, notamment :

- `DATABASE_URL` ou variables PostgreSQL
- `JWT_SECRET`
- `GITHUB_*` si tu veux l'auth GitHub
- `AI_API_KEY` si tu utilises le service IA
- `RESEND_API_KEY` si tu actives les emails

---

## ▶️ Démarrage rapide

### 1) Installer les dépendances

```bash
cd frontend && npm install
cd ../backend && npm install
cd ../ia && npm install
```

### 2) Lancer le frontend

```bash
cd frontend
npm run dev
```

Le frontend est généralement accessible sur :

```text
http://localhost:3000
```

### 3) Lancer le backend

```bash
cd backend
npm run dev
```

Le backend est généralement accessible sur :

```text
http://localhost:5000
```

### 4) Lancer le service IA

```bash
cd ia
npm run dev
```

Selon la configuration, l'IA pourra être exposée sur :

```text
http://localhost:4000
```

---

## 🧪 Scripts utiles

### Frontend

```bash
npm run dev
npm run build
npm run start
npm run lint
```

### Backend

```bash
npm run dev
npm run start
npm run db:init
npm run db:seed
```

### IA

```bash
npm run dev
npm test
npm run smoke
```

---

## 💡 Modèle de produit

ContinUp s'inspire d'un principe simple :

> un projet avance mieux quand il est accompagné de repères, de preuve de progression et de micro-actions.

Plutôt que de pousser la pression ou le sentiment de faute, l'application favorise :

- la clarté,
- l'encouragement,
- la progression visible,
- les actions courtes à exécuter,
- la persistance dans la réalisation d'un rêve.

---

## 🔐 Sécurité et bonnes pratiques

- variables d'environnement centralisées,
- JWT pour l'authentification,
- validation côté serveur,
- accès aux routes API contrôlés,
- configuration séparée selon l'environnement de développement / production.

---

## 📌 État du projet

Ce projet est une base de monorepo fonctionnelle orientée produit et démonstration. Il contient plusieurs modules qui interagissent entre eux : interface, API, IA et données.

Il est prêt pour :

- le développement local,
- la validation fonctionnelle,
- la préparation d'un déploiement,
- la mise en ligne sur GitHub et la suite du développement.

---

## 🤝 Contribution

Les contributions sont les bienvenues. Pour proposer une amélioration :

1. créer une branche,
2. faire les changements,
3. tester localement,
4. ouvrir une pull request avec une description claire.

---

## 📄 Licence

Le projet est livré sans licence explicite dans ce dépôt pour le moment. Si tu veux le publier publiquement sur GitHub, il est recommandé de choisir une licence adaptée (MIT, Apache 2.0, etc.).

---

## 📝 Note

Ce README est pensé pour être un vrai README GitHub lisible, clair et professionnalisé. Il donne un aperçu du projet, de son architecture et de son lancement sans entrer dans des détails trop techniques de chaque module.

Si tu veux, je peux aussi te préparer :

- une version plus premium / marketing,
- une version plus technique / devops,
- ou une version finale prête à coller tel quel sur GitHub avec badges et screenshot section.