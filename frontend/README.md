# 🕯️ Le Quatrième Jour — Front/UI (poste B)

> Le joyau : **commit réel → la maison se construit → le Signal parle quand tu te tais.**

Front **autonome** : il tourne entièrement sur mocks, sans A ni C. Aucune
dépendance bloquante, jamais d'écran d'attente.

```bash
npm install
npm run dev     # http://localhost:3000
```

---

## 🔌 Brancher le vrai backend (30 secondes, zéro refonte)

Un seul fichier parle au serveur : **`lib/api.ts`**.

```bash
echo "NEXT_PUBLIC_USE_MOCKS=false" > .env.local
```

Les composants ne changent pas d'une ligne. Chaque réponse est validée par
zod ; si le schéma ne colle pas ou si l'API tombe, on **retombe
automatiquement sur les mocks** (NF2, mode dégradé) — la démo ne peut pas
planter en public.

### Routes attendues de C

| Route | Schéma de sortie (`lib/contracts.ts`) |
|---|---|
| `GET /api/dashboard` | `DashboardResponseSchema` |
| `GET /api/classement` | `ClassementLigneSchema[]` |
| `POST /api/projects/:id/sync` | — |
| `POST /api/admin/simulate-day4` | — |

---

## ⚠️ Les 2 champs que j'exige de A et C

Sans eux le rêve ne peut pas se dessiner. À rappeler au stand-up H+2.

1. **`project.etapes_done: string[]`** — les `id` d'étapes acquises.
   C'est ce tableau, et lui seul, qui pilote les calques.
2. **`task.etape_template: string`** — le mapping M3.3 de A doit sortir
   **exactement** un de ces 8 `id`, dans cet ordre :

```
terrain · fondations · murs · toit · fenetres · porte · jardin · emmenagement
```

Aide au mapping pour le prompt de A (`lib/templates.ts` → `hint`) :

| id | familles de tâches |
|---|---|
| `terrain` | init, setup, config, README, arborescence |
| `fondations` | SQL, migrations, modèle de données, ORM |
| `murs` | API, routes, services, logique métier |
| `toit` | auth, sécurité, middleware, validation |
| `fenetres` | composants UI, écrans, formulaires |
| `porte` | onboarding, login, accueil, navigation |
| `jardin` | polish, animations, responsive |
| `emmenagement` | déploiement, prod, tests, release |

> Le front **verrouille l'ordre** (`etapesVisibles`) : si l'IA renvoie
> `toit` sans `murs`, on n'affiche pas de toit volant. Robuste par défaut.

---

## 🗂 Structure

```
app/
  login/            M1.1 — OAuth GitHub (voie royale) + email (repli)
  dashboard/        M5 — grille + tri motivationnel + bloc activité
  onboarding/       M1 — rêves (chips) · style (préviews live) · repo
  projet/[id]/      Le rêve en grand + étapes + S5 au retour
  signaux/          M4.5 — historique des Signaux
  classement/       M6.4 — classé sur la résilience
  lab/              🔧 contrôle visuel de tous les calques (interne)
components/
  dream/            DreamProgress → DreamHouse · DreamCar · DreamGeneric
  project/          ProjectCard (le livrable CP2)
  signal/           ToastProvider  ← Signaux S1/S3/S5/S6 (bas DROITE)
  ui/               ToastProvider  ← toasts système (bas GAUCHE)
                    ProgressBar
  theme/            ThemeProvider + ThemeToggle
  dashboard/        ActivityBlock
lib/
  contracts.ts      ⭐ contrat d'API zod — source de vérité partagée
  templates.ts      ⭐ les 8 étapes × 5 templates
  api.ts            couche d'accès + mode dégradé
  mock.ts           données de démo
```

---

## 🌗 Thème clair / sombre

`.light` sur `<html>` bascule les variables CSS de `app/globals.css`.
Les classes ne changent jamais : `bg-card`, `text-ink`, `text-candle`
valent pour les deux thèmes.

```tsx
const { theme, toggle, setTheme } = useTheme();
```

- Suit le système tant que l'utilisateur n'a pas choisi ; persiste ensuite dans `localStorage`.
- **Aucun flash** au chargement : `THEME_SCRIPT` s'exécute avant la peinture.

### ⚠️ La scène du rêve reste nocturne dans les deux thèmes

Une fenêtre allumée n'existe pas en plein jour : le mode clair
éclaircit seulement le ciel (`--sky-*`), il ne le transforme pas en
journée. Conséquence pratique :

> **Tout élément posé PAR-DESSUS la vignette doit avoir une couleur
> fixe** (`text-white/90`, `text-[#F5B841]`…), jamais `text-ink`.
> Sinon il devient invisible en thème clair. Voir `ETATS[].onScene`
> dans `ProjectCard.tsx`.

---

## 🔔 Les deux piles de toasts

Elles ne se marchent jamais dessus : un « Copié ✓ » ne doit pas masquer
un Signal du 4ᵉ jour.

| | Import | Position | Usage |
|---|---|---|---|
| **Signal** | `useToast()` de `components/signal/` | bas **droite** | S1/S3/S5/S6 — impose preuve + micro-action |
| **Système** | `useUiToast()` de `components/ui/` | bas **gauche** | « Repo associé », « Lien envoyé »… |

```tsx
// Signal produit — la règle d'or M4.3 est imposée par le type
push({ declencheur: "S1", style: "motivant", titre: "…",
       preuve: "…", microAction: "…", xp: 1 });

// Toast système
const { toast, dismiss } = useUiToast();
const id = toast({ kind: "loading", message: "Analyse du repo…" });
dismiss(id);
toast({ kind: "success", message: "Repo associé" });
```

`kind` : `success` · `info` · `loading` · `magic`. **Pas de variante
« error » rouge** — un échec s'annonce en ton neutre, avec une issue.

---

## 🔐 Authentification (`/login`)

- **GitHub OAuth** en voie royale : compte + accès repos d'un coup.
  Mention explicite « lecture seule » (on ne demande jamais l'écriture).
- **Email + lien magique** en repli — c'est le filet de la décision
  H+5:30 de C : si l'OAuth ne passe pas, l'email tient et
  l'association de repo se fait par URL publique.

Routes attendues de C : `POST /api/auth/github`, `POST /api/auth/email`.
En mock, les deux redirigent vers `/onboarding` après ~1 s.

---

## 🔒 Les interdits, codés en dur (pas juste écrits)

| Règle | Où c'est verrouillé |
|---|---|
| **NF4 — jamais de % nu** | `ProgressBar` : la prop `etape` est **obligatoire** en TypeScript. Un `%` seul ne compile pas. |
| **M4.7 — aucun rouge** | Aucun token rouge dans `globals.css`, **dans les deux thèmes**. Aucune variante `error` dans les toasts. |
| **M4.3 — règle d'or** | Le type `ToastPayload` impose `preuve` **et** `microAction`. Un toast culpabilisant est impossible à écrire. |
| **M3.4 — pas de régression** | `etapesVisibles()` verrouille l'ordre des calques. |
| **Aucun retard affiché** | `depuis()` ne produit que des repères neutres (« hier », « il y a 4 jours »). |

---

## 🕯️ Le détail qui fait la démo

Un projet silencieux est la **plus belle card de la grille**, pas la plus terne.

- Fenêtres déjà construites → **elles s'allument**.
- Pas encore de fenêtres → **une lampe-tempête s'allume sur le chantier**.

Ça compte : un projet abandonné au 3ᵉ jour n'a pas de fenêtres, et c'est
justement celui qui a le plus besoin qu'on veille dessus. Sans ce cas, le
geste signature ne marcherait que pour les projets déjà avancés.

---

## 🎬 Parcours de démo (2 min, testé)

0. `/login` — « Continuer avec GitHub » (la maison allumée vend la promesse à gauche).
1. `/onboarding` — 3 chips, un style (**changer le style recharge la préview en direct**), une URL de repo.
2. `/dashboard` — la villa silencieuse porte sa lampe allumée ; le Signal S3 occupe la colonne de droite.
3. Bouton **Sync** → toast S1, la maison gagne un calque, +1 XP.
4. Bouton **Simuler J+4** → toast S3 avec preuve + micro-action.
5. Cliquer la card silencieuse → **bandeau S5 « Te revoilà » + toast, +5 XP**.
6. `/classement` — « n°1 = 6 retours 🔥 », l'argumentaire anti-score en clair.

---

## ✂️ Coupes prévues (fiche B)

- **H+8 en retard** → garder l'état silencieux, sacrifier l'état achevé.
- **H+12 en retard** → préviews d'onboarding en statique (déjà local, aucun appel IA : rien à couper en réalité).
- **Intouchable** : template maison · card avec 🕯️ · toasts stylés.
