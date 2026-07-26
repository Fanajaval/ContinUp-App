# 🔔 Le Quatrième Jour — Partie A · IA / Backend

> Emplacement dans le monorepo ReStart : **`ia/`** (service autonome, port **4000**).
> Le backend Auth reste dans `backend/` (port **5000**).

> **Le joyau :** commit réel → analyse IA → étape sémantique → le rêve se construit → et quand le commit ne vient plus, le Signal du jour 4 vient te chercher avec une preuve de progrès et UNE micro-action.

Ce dossier contient **uniquement la partie A** : M2 (analyse), M3.3 (mapping), M4 (contenu des signaux), M7 (lettre du futur), + M1.3 (portefeuille de rêves).
Express + TypeScript + PostgreSQL. Il **démarre et fonctionne sans clé LLM et sans BDD** (mode dégradé complet).

---

## ⚡ Démarrage en 60 secondes

```bash
cd ia
npm install
cp .env.example .env      # renseigne LLM_API_KEY et DATABASE_URL si besoin
npm run db:migrate        # applique le schéma (optionnel, C peut l'avoir fait)
npm run db:seed           # jeu de démo : 3 projets actif/silencieux/achevé
npm run dev               # http://localhost:4000
```

Vérification instantanée, dans un second terminal :

```bash
npm test        # 21 tests unitaires, aucune dépendance réseau
npm run smoke   # parcours complet sur toutes les routes, sorties affichées
```

> **Sans clé LLM ?** Tout marche quand même : les fallbacks servent des contenus rédigés à la main qui respectent les mêmes règles. `"degraded": true` dans les réponses.

---

## 📡 Contrat d'API — ce que consomment C, B et D

Source de vérité : [`src/server/types/index.ts`](src/server/types/index.ts). **Figé.**

| Méthode | Route | Module | Pour qui |
|---|---|---|---|
| `POST` | `/api/analyze` | M2 — repo → Previously + todolist + progression | C (pipeline), D (pages docs) |
| `POST` | `/api/analyze/diff` | webhook push → tâches terminées | C (webhook/Sync) |
| `POST` | `/api/map` | M3.3 — tâches → étapes du template | C, B (calques) |
| `POST` | `/api/signal` | **M4 — LE SIGNAL** (S1/S3/S5/S6) | C (cron + email), B (toasts) |
| `POST` | `/api/letter` | M7 — lettre venue du futur | D (page achèvement) |
| `POST` | `/api/dreams/analyze` | M1.3 — rêves → catégorie + PoidsDeRêve | B (onboarding), C (calculs M6) |
| `GET` | `/api/signal/preview` | M1.4 — 4 styles, **0 ms, 0 token** | B (préviews live) |
| `GET` | `/api/template/:type` | les 8 étapes + noms de calques | B, D (assets) |
| `GET` | `/api/docs/:projectId` | docs générés pour validation ✅/✏️/🗑️ | D |
| `POST` | `/api/signal/audit` | teste un texte contre la règle d'or | D (QA) |
| `POST` | `/api/signal/simulate` | les 4 styles côte à côte | démo / soutenance |
| `GET` | `/health` | état LLM + BDD + cache | tous |

### Exemples prêts à copier

**M2 — analyse d'un repo** *(C peut passer `files` s'il a déjà cloné, sinon on lit GitHub)*

```bash
curl -X POST localhost:4000/api/analyze -H 'Content-Type: application/json' -d '{
  "projectId": "uuid-du-projet",
  "repoUrl": "https://github.com/user/mon-repo",
  "templateType": "maison",
  "reveLabel": "une maison à moi"
}'
```

Réponse (extrait) :

```json
{
  "source": "repo",
  "docs_detectes": ["README.md"],
  "previously": {
    "ou_tu_en_es": "Les fondations sont coulées : le schéma tient debout.",
    "ou_tu_tes_arrete": "Dans src/routes/project.ts.",
    "prochaine_action": "Rouvrir src/routes/project.ts et écrire la route POST.",
    "prochaine_action_duree_min": 20,
    "point_de_reprise": "src/routes/project.ts"
  },
  "tasks": [{ "label": "…", "poids": 3, "done": true, "etape_template": "fondations", "duree_estimee_min": 60 }],
  "progression": 45,
  "etape_courante": "fondations",
  "etape_libelle": "Fondations coulées",
  "degraded": false
}
```

**M4 — le Signal du jour 4** *(pour le cron de C)*

```bash
curl -X POST localhost:4000/api/signal -H 'Content-Type: application/json' -d '{
  "projectId": "uuid-du-projet",
  "declencheur": "S3",
  "style": "motivant",
  "canal": "email",
  "contexte": { "jours_de_silence": 4 }
}'
```

👉 **`contexte` peut être vide** : le service va chercher lui-même en BDD le pseudo, le rêve, la progression, les tâches ouvertes et le dernier Previously. Passe seulement ce que tu as.

Réponse : `titre`, `corps`, `preuve_de_progres`, `micro_action`, `cta_label`, `cta_url`, plus `email_subject` / `email_body` prêts pour Resend quand `canal: "email"`.

---

## 💎 Ce qui fait la différence : la règle d'or est du **code**, pas une intention

Le sujet interdit explicitement les mécaniques punitives (*« Pas de streak à casser. Pas de score. »*). Un LLM dérive systématiquement vers le ton coach-productivité. D'où [`guardrails.ts`](src/server/services/llm/guardrails.ts) : **un validateur qui inspecte chaque message avant l'envoi.**

Le pipeline complet d'un Signal :

```
prompt (style × déclencheur × vocabulaire du rêve)
   ↓
LLM → validation Zod
   ↓
VALIDATEUR RÈGLE D'OR ──── conforme ? ──→ envoi
   ↓ non
2ᵉ passe : on renvoie ses violations au LLM (auto-réparation)
   ↓ toujours non
assainissement automatique (retrait des formules fautives)
   ↓ LLM indisponible
fallback rédigé à la main — lui aussi passé au validateur
```

Ce qui est bloqué en dur : « abandonné », « retard », « dommage », « discipline », « tu aurais dû », toute streak, toute perte de points, tout classement humiliant, tout pourcentage nu sans son étape en toutes lettres (NF4). Plus des règles **spécifiques par déclencheur** :

- **S5 (retour)** — interdiction absolue de nommer la durée de l'absence : pas d'« enfin », pas d'« il était temps », pas d'« après 3 semaines ».
- **S3 (jour 4)** — interdiction de compter les jours comme une dette : pas de « ça fait 12 jours que… ».

Et les 3 piliers sont obligatoires dans **chaque** message : une preuve de progrès + **une seule** micro-action + un lien direct.

> **Argument de soutenance :** `npm test` vérifie les **32 combinaisons** style × déclencheur × canal. Nos interdits sont des tests qui passent, pas une promesse dans un prompt.

---

## 🏗️ Architecture

```
src/
├── server/
│   ├── api/                    Routes Express (une par module)
│   │   ├── analyze.ts          POST /api/analyze         → M2
│   │   ├── mapping.ts          POST /api/map             → M3.3
│   │   ├── signal.ts           POST /api/signal          → M4  💎
│   │   ├── letter.ts           POST /api/letter          → M7
│   │   └── dreams.ts           POST /api/dreams/analyze  → M1.3
│   ├── services/
│   │   ├── llm/                ◀── LE CŒUR DU RÔLE A
│   │   │   ├── prompts.ts          TOUS les prompts (le livrable clé)
│   │   │   ├── guardrails.ts       la règle d'or, exécutable  💎
│   │   │   ├── fallbacks.ts        mode dégradé : la démo ne tombe jamais
│   │   │   ├── schemas.ts          validation Zod de chaque sortie IA
│   │   │   ├── client.ts           appel LLM : retries, timeout, auto-réparation
│   │   │   ├── analyze.service.ts  M2 + analyse de diff
│   │   │   ├── mapping.service.ts  M3.3
│   │   │   ├── signal.service.ts   M4
│   │   │   ├── letter.service.ts   M7
│   │   │   └── dreams.service.ts   M1.3
│   │   ├── repos/              accès BDD (project, doc, task, signal)
│   │   └── utils/
│   │       ├── file.parser.ts      lecture repo GitHub + fast-path docs
│   │       ├── progression.ts      calcul déterministe, sans IA
│   │       └── cache.ts            cache mémoire + PostgreSQL (NF1)
│   ├── db/                     client, schema.sql, migrate, seed
│   └── types/index.ts          ◀── LE CONTRAT D'API (figé)
├── tests/                      21 tests + smoke test bout en bout
└── mocks/                      réponses figées pour B et D
```

---

## 🛡️ Exigences non fonctionnelles — état

| Réf | Exigence | État |
|---|---|---|
| **NF1** | Aucun appel IA au chargement de page | ✅ cache mémoire + table `ai_cache`, clé = empreinte du contenu |
| **NF2** | Retries, timeouts, validation Zod, mode dégradé | ✅ 3 essais à backoff exponentiel + auto-réparation + fallbacks complets |
| **NF3** | Zéro génération d'image | ✅ texte uniquement |
| **NF4** | Le % toujours accompagné de l'étape sémantique | ✅ vérifié par le guardrail |
| **NF5** | Onboarding < 3 min | ✅ `/api/signal/preview` répond en 0 ms sans token |

**Résilience du parsing LLM** — `extractJson()` gère les fences ```` ```json ````, le texte parasite avant/après, et les accolades imbriquées dans les chaînes. En cas d'échec de validation Zod, les erreurs sont renvoyées au modèle pour qu'il se corrige lui-même.

**Budget tokens** — le lecteur de repo trie les fichiers par pertinence (docs > manifestes > code, racine avant profondeur), tronque à 4 000 caractères par fichier et plafonne à 60 000 caractères au total. Les chemins non téléchargés restent visibles dans l'arborescence.

---

## 🔗 Notes d'intégration pour l'équipe

### Pour **C** (infra, cron, webhook, email)

- Le cron jour-4 appelle `POST /api/signal` avec `declencheur: "S3"`, `canal: "email"` et un `contexte` même vide → utilise `email_subject` et `email_body` tels quels pour Resend.
- Anti-harcèlement (M4.6) : la vue SQL `v_signal_du_jour` compte les signaux des dernières 24 h par projet/déclencheur. Passe `relance_index` pour que le ton s'adoucisse à la 2ᵉ relance.
- Webhook push : `POST /api/analyze/diff` avec `changedPaths` + les tâches ouvertes → renvoie les `doneLabels`. **Coupe prévue :** si ça déborde, ignore cette route et compte chaque commit comme une brique forfaitaire, la chaîne tient quand même.
- Le schéma [`schema.sql`](src/server/db/schema.sql) est idempotent et aligné sur le CDC §5 — prends-le ou garde le tien, A s'adapte : toutes les écritures BDD sont best-effort et ne bloquent jamais une réponse.

### Pour **B** (front)

- `GET /api/signal/preview?reve=ta%20maison` → les 4 styles instantanément, **sans appel LLM** : les préviews de l'onboarding sont gratuites et immédiates.
- `GET /api/template/maison` → les 8 étapes avec leur `libelle` et un nom de fichier de calque suggéré (`maison/03-murs.svg`).
- `POST /api/map` renvoie `calques[]` : la liste des 8 étapes avec `visible: true/false`. C'est directement ton état d'affichage.
- Sur les cards, affiche **toujours** `etape_libelle` à côté du `%` (NF4). Le back te le donne systématiquement.
- `mocks/` contient des réponses figées pour bosser sans back.

### Pour **D** (produit / QA)

- `POST /api/signal/audit` : colle n'importe quel texte, reçois la liste des violations. C'est ton outil de contrôle des interdits M4.7.
- `POST /api/signal/simulate` : les 4 styles d'un déclencheur côte à côte — parfait pour la démo et pour choisir le style à montrer au jury.
- `GET /api/docs/:projectId` : les documents générés (Previously, todolist, résumé) pour tes pages de validation ✅/✏️/🗑️.
- `npm run smoke` couvre le parcours du CDC §7 de bout en bout et sort en code 1 si quelque chose casse.

---

## 🎬 Script de démo (3 minutes)

1. `GET /health` — le service tourne, LLM et BDD annoncés.
2. `POST /api/dreams/analyze` — trois rêves → PoidsDeRêve 70 / 92 / 40, templates déduits.
3. `POST /api/analyze` sur un vrai repo à moitié fini → Previously + 12 tâches + « 45 % — Fondations coulées ».
4. `POST /api/map` → « Créer le schéma SQL » devient **fondations**, « Styliser la card » devient **fenêtres**.
5. **`POST /api/signal/simulate` avec `S3`** → les 4 tons du Signal du jour 4, chacun avec sa preuve et sa micro-action.
6. **`POST /api/signal/audit`** avec un message toxique → **8 violations détectées.** *« Nos interdits sont exécutables. »*
7. `POST /api/letter` → la lettre du projet achevé. *« Que le quatrième jour soit. Il a eu lieu. »*

---

## 🚨 Coupes prévues (matrice de la fiche A)

| Si retard à… | On coupe |
|---|---|
| H+8 | 2 styles seulement (sarcastique + motivant) — les autres restent en fallback |
| H+11 | `analyze/diff` → tout commit = brique forfaitaire côté C |
| H+14 | lettre du futur → le fallback est déjà écrit et bon, on le sert tel quel |
| **Jamais** | prompt maître M2 · **S3 + son email** · le validateur de la règle d'or |

---

**Chrono lancé. Que le quatrième jour soit.** 🧠💎
