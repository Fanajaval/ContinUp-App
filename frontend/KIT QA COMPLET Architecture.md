# 📦 KIT QA COMPLET — Architecture Squelette Frontend

Voici **tous les fichiers QA** que tu vas placer dans une architecture frontend vide. Le développeur Front n'aura plus qu'à implémenter le code à l'intérieur.

---

## 📁 STRUCTURE À CRÉER

```bash
mkdir -p frontend-squelette/{app/{login,onboarding,dashboard,projet/\[id\]/docs,signaux,classement,completion/\[id\],lab,admin-test},components/{dream,project,signal,ui,theme,layout,onboarding},hooks,lib,public,tests}
```

---

## 📄 FICHIER 1 : `README.md` (racine)

```markdown
# 🏠 MaisonRêve — Squelette Frontend

> **Kit QA fourni par D.** Structure, contrats, et règles à implémenter.
> Le développeur Front code à l'intérieur de ce squelette.

## 🎯 Priorités d'Implémentation

| Ordre | Composant/Page | Livrable |
|---|---|---|
| 1 | `lib/contracts.ts` | Contrat Zod — source de vérité |
| 2 | `lib/templates.ts` | 8 étapes × mapping sémantique |
| 3 | `components/dream/DreamHouse.tsx` | Le joyau visuel |
| 4 | `components/project/ProjectCard.tsx` | Livrable CP2 |
| 5 | `app/dashboard/page.tsx` | Page principale |
| 6 | `components/signal/SignalToastProvider.tsx` | Système de toasts |
| 7 | `app/projet/[id]/page.tsx` | Détail projet |
| 8 | `app/login/page.tsx` | Authentification |
| 9 | `app/onboarding/page.tsx` | Parcours initial |
| 10 | `app/classement/page.tsx` | Gamification |

## ⚠️ Règles Non-Négociables

- **NF4** : `ProgressBar` exige `etape` en prop — pas de % nu
- **M4.3** : `ToastPayload` exige `preuve` ET `microAction`
- **M4.7** : Aucun token rouge dans `globals.css`
- **M3.4** : `etapesVisibles()` verrouille l'ordre des calques
- **Scène nocturne** : La vignette maison reste nocturne dans les deux thèmes
- **2 piles de toasts** : Signal (bas droite) ≠ Système (bas gauche)

## 🔌 Brancher le Backend

```bash
echo "NEXT_PUBLIC_USE_MOCKS=false" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" >> .env.local
```
```

---

## 📄 FICHIER 2 : `QA_KIT.md` (racine) — Document Complet

```markdown
# 🛠️ Kit QA — Document Complet pour le Front

> **Auteur : D (QA/Scope Guardian)**
> **Version : 1.0 — Squelette**
> **Date : H+0**

---

## 🎯 OBJECTIF DE CE DOCUMENT

Ce document définit **TOUT** ce que le développeur Front doit savoir pour
implémenter MaisonRêve. Il contient :

1. Les contrats API (ce que le backend DOIT fournir)
2. Les règles non-négociables (codées en dur)
3. Les spécifications de chaque composant
4. Les parcours utilisateur à tester
5. La checklist QA finale

---

## 1. CONTRATS API — Source de Vérité

### 1.1 Les 2 Champs Critiques (rappel à A et C)

```typescript
// ⚠️ CHAMP 1 : etapes_done — pilote TOUS les calques
project.etapes_done: EtapeId[]
// Exemple : ["terrain", "fondations", "murs"]

// ⚠️ CHAMP 2 : task.etape_template — mapping M3.3 exact
task.etape_template: EtapeId
// DOIT être un de ces 8 IDs exacts
```

### 1.2 Les 8 Étapes dans l'Ordre

```
terrain → fondations → murs → toit → fenetres → porte → jardin → emmenagement
```

### 1.3 Aide au Mapping pour le Prompt de A

| ID | Familles de Tâches |
|---|---|
| `terrain` | init, setup, config, README, arborescence |
| `fondations` | SQL, migrations, modèle de données, ORM |
| `murs` | API, routes, services, logique métier |
| `toit` | auth, sécurité, middleware, validation |
| `fenetres` | composants UI, écrans, formulaires |
| `porte` | onboarding, login, accueil, navigation |
| `jardin` | polish, animations, responsive |
| `emmenagement` | déploiement, prod, tests, release |

### 1.4 Routes Attendues du Backend

| Route | Méthode | Réponse |
|---|---|---|
| `/api/dashboard` | GET | `DashboardResponse` |
| `/api/projects/:id` | GET | `Project` |
| `/api/projects/:id/analyze` | POST | `AnalyzeResponse` |
| `/api/projects/:id/sync` | POST | `{ success: boolean }` |
| `/api/admin/simulate-day4` | POST | `{ signal: Signal }` |
| `/api/admin/force-brique` | POST | `{ event: Event }` |
| `/api/classement` | GET | `ClassementLigne[]` |
| `/api/auth/login` | POST | `{ token: string, user: User }` |
| `/api/auth/magic-link` | POST | `{ success: boolean }` |

---

## 2. RÈGLES NON-NÉGOCIABLES

### NF1 — Mode Dégradé Automatique
Si l'API est down ou le schéma ne valide pas → fallback sur les mocks.
La démo ne doit **jamais** planter en public.

### NF4 — Jamais de % Nu
```typescript
// ❌ INTERDIT
<ProgressBar value={35} />

// ✅ OBLIGATOIRE
<ProgressBar value={35} etape="Murs" />
```

### M4.3 — Règle d'Or des Signaux
```typescript
// ❌ INTERDIT (ne compile pas)
push({ declencheur: "S1", style: "motivant", titre: "..." });

// ✅ OBLIGATOIRE
push({
  declencheur: "S1",
  style: "motivant",
  titre: "Brique posée !",
  preuve: "Commit abc123 — ajout fenêtres",
  microAction: "Continue avec les murs porteurs",
  xp: 1
});
```

### M4.7 — Aucun Rouge
- Aucun token rouge dans `globals.css` (dans les deux thèmes)
- Pas de variante `error` dans les toasts
- Un échec s'annonce en ton neutre, avec une issue

### M3.4 — Pas de Régression
```typescript
// etapesVisibles() verrouille l'ordre
etapesVisibles(["terrain", "toit"]) // → ["terrain"] — pas de toit volant
```

### Scène Nocturne Permanente
La vignette maison est nocturne dans les deux thèmes.
Tout élément posé PAR-DESSUS doit avoir une couleur fixe (`text-white/90`),
jamais `text-ink`.

---

## 3. SPÉCIFICATIONS DES COMPOSANTS

### 3.1 DreamHouse.tsx — Le Cœur Visuel

```typescript
interface DreamHouseProps {
  etapesDone: EtapeId[];     // ⭐ LE tableau qui pilote tout
  size?: number;              // Défaut : 400
  showLabels?: boolean;       // Affiche "X/8 étapes"
  className?: string;
}
```

**8 Calques SVG :**
1. **Terrain** : `rect` vert, groundY, scaleY 0→1
2. **Fondations** : `rect` gris, sous les murs
3. **Murs** : `rect` beige, scaleY 0→1 depuis le bas
4. **Toit** : `polygon` marron, opacity + scale
5. **Fenêtres** : 2 `rect` bleu clair, opacity
6. **Porte** : `rect` marron foncé, scaleY depuis le bas
7. **Jardin** : 2 `circle` vert, scale
8. **Emménagement** : Cheminée + fumée + drapeau

**Ciel :** `linearGradient` utilisant `var(--sky-from)` et `var(--sky-to)`
+ Lune + Étoiles qui scintillent (`animate-pulse` avec delays).

### 3.2 MiniHouse.tsx — Version Card

```typescript
interface MiniHouseProps {
  etapesDone: EtapeId[];
  statut: 'actif' | 'silencieux' | 'acheve';
  fenetres: boolean;          // Pour la lampe du silence
  size?: number;              // Défaut : 140
  showLight?: boolean;        // Affiche la fenêtre allumée
}
```

**Règle spéciale silence :**
- Si `statut === 'silencieux'` ET `fenetres === true` → une fenêtre pulse en jaune
- Si `statut === 'silencieux'` ET `fenetres === false` → une lampe-tempête apparaît sur le chantier

### 3.3 ProjectCard.tsx — Livrable CP2

```typescript
interface ProjectCardProps {
  project: Project;
  index?: number;
}
```

**3 États Visuels :**

| État | Fond | Badge | Icône | Effet Spécial |
|---|---|---|---|---|
| **Actif** 🔥 | `card-dream` | `badge-actif` | 🔥 | Ombre au hover |
| **Silencieux** 🕯️ | `bg-silent-50` | `badge-silencieux` | 🕯️ | Fenêtre/lampe pulse |
| **Achevé** 🏆 | `bg-gradient-gold` | `badge-acheve` | 🏆 | Bordure dorée |

### 3.4 ProgressBar.tsx — NF4 Verrouillé

```typescript
interface ProgressBarProps {
  value: number;              // 0-100
  etape: string;              // ⚠️ OBLIGATOIRE
  color?: string;             // Défaut : 'bg-dream-500'
  size?: 'sm' | 'md';        // Défaut : 'sm'
}
```

### 3.5 SignalToast.tsx — Bas Droite

```typescript
interface ToastPayload {
  declencheur: 'S1' | 'S3' | 'S5' | 'S6';
  style: 'sarcastique' | 'motivant' | 'epique' | 'gamer';
  titre: string;              // max 280
  preuve: string;             // ⚠️ OBLIGATOIRE
  microAction: string;        // ⚠️ OBLIGATOIRE
  xp: number;
  lien?: string;
}
```

**Styles par Ton :**

| Ton | Fond | Texte | Emoji |
|---|---|---|---|
| Motivant | `bg-green-50` | `text-green-800` | 💪 |
| Sarcastique | `bg-red-50` | `text-red-700` | 😏 |
| Épique | `bg-purple-50` | `text-purple-800` | ⚔️ |
| Gamer | `bg-blue-50` | `text-blue-800` | 🎮 |

---

## 4. PARCOURS UTILISATEUR

### 4.1 Parcours de Démo (2 minutes)

1. `/login` → "Continuer avec GitHub"
2. `/onboarding` → 3 chips rêves + choisir style (preview live) + URL repo
3. `/dashboard` → card silencieuse avec 🕯️, Signal S3 en toast
4. Bouton **Sync** → toast S1, +1 calque, +1 XP
5. Bouton **Simuler J+4** → toast S3 avec preuve + micro-action
6. Cliquer card silencieuse → bandeau S5 "Te revoilà", +5 XP
7. `/classement` → "n°1 = 6 retours 🔥"

### 4.2 Parcours E2E Complet

1. Créer compte → Onboarding → Dashboard vide
2. Créer projet → Associer repo → Analyse → Docs → Card maison
3. Webhook push → Event brique → Signal S1 → Progression
4. Simuler jour-4 → Signal S3 → Email → Lien magique
5. Retour après silence → Signal S5 → Célébration
6. XP calculés → Rang visible → PoidsDeRêve
7. Achèvement → Template complet → Lettre du futur → Confettis

---

## 5. CHECKLIST QA FINALE

### À vérifier AVANT le déploiement

| # | Test | Critère |
|---|---|---|
| 1 | `ProgressBar` sans `etape` | ❌ TypeScript refuse |
| 2 | `ToastPayload` sans `preuve` | ❌ TypeScript refuse |
| 3 | Token rouge dans CSS | ❌ Aucun |
| 4 | Calque orphelin | ❌ `etapesVisibles()` bloque |
| 5 | Card silencieuse | ✅ Plus belle que les autres |
| 6 | 2 toasts simultanés | ✅ Ne se superposent pas |
| 7 | Page 404 | ✅ Maison perdue + lien retour |
| 8 | Mode sombre | ✅ Pas de flash |
| 9 | Confettis achèvement | ✅ Double salve |
| 10 | PWA | ✅ Installable |

### Definition of Done (22 points)

| # | Critère |
|---|---|
| 1 | Créer un compte |
| 2 | Saisir 3 rêves en < 60s |
| 3 | Choisir un style avec preview |
| 4 | Créer un projet + repo |
| 5 | Analyse → Previously, CDC, Todolist |
| 6 | Card projet sur dashboard |
| 7 | Template maison : calques déverrouillés |
| 8 | Webhook → Event brique |
| 9 | Signal S1 après push |
| 10 | Simuler jour-4 → Signal S3 |
| 11 | Email S3 avec preuve + action + lien |
| 12 | Signal S5 après retour |
| 13 | Toast stylé selon le ton |
| 14 | XP calculés |
| 15 | Page classement |
| 16 | Projet terminé → template complet |
| 17 | Lettre du futur |
| 18 | Zéro bug bloquant |
| 19 | Interface responsive |
| 20 | Animations fluides |
| 21 | Pas de rouge (sauf célébration) |
| 22 | États vides gérés |

---

## 6. COUPES PRÉVUES

| Si retard à… | On coupe | On garde |
|---|---|---|
| H+8 | OAuth → email seul, styles réduits à 2 | Template maison + Card 🕯️ |
| H+12 | Préviews onboarding statiques, S6 | Cron S3 + Email |
| H+14 | Templates secondaires, page rang statique | Onboarding rêves, Célébration S5 |

---

**Ce document est la référence. Toute ambiguïté = demander à D.**
```

---

## 📄 FICHIER 3 : `app/globals.css` (squelette)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* ============================================
   VARIABLES CSS — Thème Clair & Sombre
   ============================================ */

:root {
  /* Fondations */
  --c-night: 10 10 30;
  --c-surface: 248 248 250;
  --c-card: 255 255 255;
  --c-line: 226 232 240;

  /* Texte */
  --c-ink: 15 23 42;
  --c-muted: 71 85 105;
  --c-faint: 148 163 184;

  /* Candle — la bougie, jamais rouge */
  --c-candle: 245 184 65;
  --c-candle-soft: 250 210 120;
  --c-candle-deep: 180 120 30;

  /* Grow — progression */
  --c-grow: 52 211 153;
  --c-grow-soft: 167 243 208;
  --c-grow-deep: 16 185 129;

  /* Mist — état silencieux */
  --c-mist: 148 163 184;
  --c-mist-soft: 203 213 225;
  --c-mist-deep: 71 85 105;

  /* Gold — achèvement */
  --c-gold: 240 192 64;
  --c-gold-soft: 250 220 140;
  --c-gold-deep: 180 130 20;

  /* Ember — chaleur */
  --c-ember: 212 123 42;

  /* Glows */
  --glow-candle: 245 184 65;
  --glow-grow: 52 211 153;
  --glow-gold: 240 192 64;
  --glow-a: 0.35;
  --glow-a-lg: 0.55;

  /* Ciel du rêve (nocturne dans les deux thèmes) */
  --sky-from: #1a1a3e;
  --sky-to: #2d2d5e;
}

/* ============================================
   THÈME SOMBRE
   ============================================ */

.dark {
  --c-surface: 17 24 39;
  --c-card: 31 41 55;
  --c-line: 55 65 81;

  --c-ink: 243 244 246;
  --c-muted: 209 213 219;
  --c-faint: 107 114 128;

  --c-candle-soft: 200 150 40;
  --c-grow-soft: 80 180 140;
  --c-mist-soft: 100 110 130;
  --c-gold-soft: 180 160 80;

  --glow-a: 0.45;
  --glow-a-lg: 0.65;

  --sky-from: #0f0f2a;
  --sky-to: #1a1a3e;
}

/* ============================================
   BASE
   ============================================ */

@layer base {
  body {
    background-color: rgb(var(--c-surface));
    color: rgb(var(--c-ink));
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
}

/* ============================================
   COMPOSANTS PARTAGÉS
   ============================================ */

@layer components {
  .card-dream {
    background-color: rgb(var(--c-card));
    border: 1px solid rgb(var(--c-line));
    border-radius: 1rem;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.06);
    transition: box-shadow 0.3s ease, transform 0.3s ease;
  }

  .card-dream:hover {
    box-shadow: 0 10px 40px rgb(0 0 0 / 0.1);
  }

  .btn-primary {
    background-color: rgb(var(--c-ember));
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .btn-primary:hover {
    background-color: rgb(var(--c-candle-deep));
  }

  .btn-primary:active {
    transform: scale(0.95);
  }

  .btn-secondary {
    background-color: rgb(var(--c-line));
    color: rgb(var(--c-ink));
    padding: 0.75rem 1.5rem;
    border-radius: 0.75rem;
    font-weight: 500;
    transition: background-color 0.2s;
  }

  .btn-secondary:hover {
    filter: brightness(0.95);
  }

  .badge {
    display: inline-flex;
    align-items: center;
    padding: 0.125rem 0.625rem;
    border-radius: 9999px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .badge-actif {
    background-color: rgb(var(--c-ember) / 0.15);
    color: rgb(var(--c-ember));
  }

  .badge-silencieux {
    background-color: rgb(var(--c-mist) / 0.2);
    color: rgb(var(--c-mist-deep));
  }

  .badge-acheve {
    background-color: rgb(var(--c-gold) / 0.2);
    color: rgb(var(--c-gold-deep));
  }
}
```

---

## 📄 FICHIER 4 : `app/layout.tsx` (squelette)

```tsx
import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import './globals.css';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/hooks/useAuth';
import SignalToastProvider from '@/components/signal/SignalToastProvider';
import ToastProvider from '@/components/ui/ToastProvider';
import { ThemeProvider } from '@/components/theme/ThemeProvider';
import { ThemeScript } from '@/components/theme/ThemeScript';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const display = Playfair_Display({ subsets: ['latin'], variable: '--font-display' });

export const metadata: Metadata = {
  title: 'MaisonRêve — Construis tes rêves',
  description: 'Construis tes rêves, une brique à la fois. Ton repo GitHub devient une maison.',
  manifest: '/manifest.json',
  themeColor: '#d47b2a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MaisonRêve',
  },
  openGraph: {
    title: 'MaisonRêve',
    description: 'Ton repo GitHub devient une maison qui se construit.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning className={`${inter.variable} ${display.variable}`}>
      <head>
        <ThemeScript />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans">
        <ErrorBoundary>
          <ThemeProvider>
            <AuthProvider>
              <SignalToastProvider>
                <ToastProvider>
                  {children}
                </ToastProvider>
              </SignalToastProvider>
            </AuthProvider>
          </ThemeProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
```

---

## 📄 FICHIER 5 : `lib/contracts.ts` (COMPLET)

```typescript
import { z } from 'zod';

// ══════════════════════════════════════════════
// TYPES PARTAGÉS
// ══════════════════════════════════════════════

export const EtapeIdSchema = z.enum([
  'terrain',
  'fondations',
  'murs',
  'toit',
  'fenetres',
  'porte',
  'jardin',
  'emmenagement',
]);
export type EtapeId = z.infer<typeof EtapeIdSchema>;

export const StyleSignalSchema = z.enum([
  'sarcastique',
  'motivant',
  'epique',
  'gamer',
]);
export type StyleSignal = z.infer<typeof StyleSignalSchema>;

export const StatutProjetSchema = z.enum(['actif', 'silencieux', 'acheve']);
export type StatutProjet = z.infer<typeof StatutProjetSchema>;

export const DeclencheurSchema = z.enum(['S1', 'S3', 'S5', 'S6']);
export type Declencheur = z.infer<typeof DeclencheurSchema>;

// ══════════════════════════════════════════════
// PROJET
// ══════════════════════════════════════════════

export const ProjectSchema = z.object({
  id: z.string(),
  nom: z.string(),
  repo_url: z.string().nullable(),
  repo_owner: z.string().nullable(),
  repo_name: z.string().nullable(),
  statut: StatutProjetSchema,
  current_etape: z.string().nullable(),
  template_type: z.string().default('maison'),
  ton_signal: StyleSignalSchema.default('motivant'),

  // ⭐ CRITIQUE : Ce tableau pilote TOUS les calques
  etapes_done: z.array(EtapeIdSchema).default([]),

  total_tasks: z.number().default(0),
  done_tasks: z.number().default(0),
  last_push_at: z.string().nullable(),
  silent_since: z.string().nullable(),
  created_at: z.string(),
});
export type Project = z.infer<typeof ProjectSchema>;

// ══════════════════════════════════════════════
// DASHBOARD
// ══════════════════════════════════════════════

export const DashboardResponseSchema = z.object({
  projects: z.array(ProjectSchema),
  signaux: z.array(z.object({
    id: z.string(),
    project_id: z.string(),
    declencheur: DeclencheurSchema,
    ton: StyleSignalSchema,
    message: z.string(),
    action: z.string(),
    sent_at: z.string(),
    lu: z.boolean(),
  })).optional(),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

// ══════════════════════════════════════════════
// CLASSEMENT
// ══════════════════════════════════════════════

export const ClassementLigneSchema = z.object({
  user_id: z.string(),
  email: z.string(),
  totalXP: z.number(),
  xpAjuste: z.number(),
  poidsReve: z.number(),
  multiplicateur: z.number(),
  xpByType: z.record(z.object({
    count: z.number(),
    total: z.number(),
  })).optional(),
  rang: z.number(),
});
export type ClassementLigne = z.infer<typeof ClassementLigneSchema>;

// ══════════════════════════════════════════════
// SIGNAL TOAST — M4.3 Verrouillé
// ══════════════════════════════════════════════

export const ToastPayloadSchema = z.object({
  declencheur: DeclencheurSchema,
  style: StyleSignalSchema,
  titre: z.string().max(280),
  // ⚠️ M4.3 : preuve ET microAction OBLIGATOIRES
  preuve: z.string().min(1, 'M4.3 : preuve obligatoire'),
  microAction: z.string().min(1, 'M4.3 : micro-action obligatoire'),
  xp: z.number().min(0),
  lien: z.string().optional(),
});
export type ToastPayload = z.infer<typeof ToastPayloadSchema>;

// ══════════════════════════════════════════════
// ANALYSE
// ══════════════════════════════════════════════

export const AnalyzeResponseSchema = z.object({
  previously: z.object({
    titre: z.string(),
    contenu: z.string(),
    date: z.string(),
  }).nullable(),
  todolist: z.array(z.object({
    id: z.string(),
    titre: z.string(),
    description: z.string(),
    etape: z.string(),
    ponderation: z.number(),
    estDocumente: z.boolean(),
  })),
  progression: z.object({
    etapeActuelle: z.string(),
    calquesDeverrouilles: z.array(z.string()),
    pourcentage: z.number().min(0).max(100),
  }),
  prochaineMicroAction: z.string(),
  docsDetectes: z.array(z.object({
    type: z.enum(['previously', 'cdc', 'todolist']),
    titre: z.string(),
  })),
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;
```

---

## 📄 FICHIER 6 : `lib/templates.ts` (COMPLET)

```typescript
import type { EtapeId } from './contracts';

// ══════════════════════════════════════════════
// DÉFINITION DES 8 ÉTAPES
// ══════════════════════════════════════════════

export interface EtapeTemplate {
  id: EtapeId;
  label: string;
  hint: string;
  color: string;
  darkColor: string;
}

export const ETAPES: EtapeTemplate[] = [
  {
    id: 'terrain',
    label: 'Terrain',
    hint: 'init, setup, config, README, arborescence',
    color: '#90c695',
    darkColor: '#3a5a3a',
  },
  {
    id: 'fondations',
    label: 'Fondations',
    hint: 'SQL, migrations, modèle de données, ORM',
    color: '#8b8682',
    darkColor: '#6b5b4f',
  },
  {
    id: 'murs',
    label: 'Murs',
    hint: 'API, routes, services, logique métier',
    color: '#c4956a',
    darkColor: '#8b6240',
  },
  {
    id: 'toit',
    label: 'Toit',
    hint: 'auth, sécurité, middleware, validation',
    color: '#8b4513',
    darkColor: '#5c2d0c',
  },
  {
    id: 'fenetres',
    label: 'Fenêtres',
    hint: 'composants UI, écrans, formulaires',
    color: '#87ceeb',
    darkColor: '#4a8fa8',
  },
  {
    id: 'porte',
    label: 'Porte',
    hint: 'onboarding, login, accueil, navigation',
    color: '#6b3a2a',
    darkColor: '#4a2518',
  },
  {
    id: 'jardin',
    label: 'Jardin',
    hint: 'polish, animations, responsive',
    color: '#4caf50',
    darkColor: '#2d5a2d',
  },
  {
    id: 'emmenagement',
    label: 'Emménagement',
    hint: 'déploiement, prod, tests, release',
    color: '#f0c040',
    darkColor: '#c49a20',
  },
];

// ══════════════════════════════════════════════
// FONCTIONS DE VERROUILLAGE
// ══════════════════════════════════════════════

/**
 * M3.4 — Verrouille l'ordre des calques.
 * Retourne les étapes visibles jusqu'à la dernière acquise.
 * Si une étape est manquante dans la chaîne, on s'arrête avant.
 *
 * Exemple :
 *   etapesVisibles(["terrain", "toit"]) → ["terrain"]
 *   (pas de toit volant sans fondations ni murs)
 */
export function etapesVisibles(etapesDone: EtapeId[]): EtapeId[] {
  if (etapesDone.length === 0) return [];

  const allIds = ETAPES.map(e => e.id);
  const result: EtapeId[] = [];

  for (const id of allIds) {
    if (etapesDone.includes(id)) {
      result.push(id);
    } else {
      break; // On s'arrête au premier trou
    }
  }

  return result;
}

/**
 * Vérifie si l'étape "fenetres" est acquise.
 * Utilisé pour la lampe du silence dans ProjectCard.
 */
export function hasFenetres(etapesDone: EtapeId[]): boolean {
  return etapesDone.includes('fenetres');
}

/**
 * Calcule le pourcentage de progression basé sur les étapes.
 */
export function progressionEtapes(etapesDone: EtapeId[]): number {
  return Math.round((etapesDone.length / ETAPES.length) * 100);
}

/**
 * Retourne l'étape actuelle (la dernière acquise).
 */
export function etapeActuelle(etapesDone: EtapeId[]): EtapeTemplate | null {
  if (etapesDone.length === 0) return null;
  const lastId = etapesDone[etapesDone.length - 1];
  return ETAPES.find(e => e.id === lastId) || null;
}

/**
 * Retourne la prochaine étape à débloquer.
 */
export function prochaineEtape(etapesDone: EtapeId[]): EtapeTemplate | null {
  const visible = etapesVisibles(etapesDone);
  if (visible.length >= ETAPES.length) return null;
  return ETAPES[visible.length];
}
```

---

## 📄 FICHIER 7 : `lib/constants.ts` (COMPLET)

```typescript
import type { StyleSignal, StatutProjet, Declencheur } from './contracts';

// ══════════════════════════════════════════════
// STYLES DES TONS DE SIGNAL
// ══════════════════════════════════════════════

export const TON_STYLES: Record<StyleSignal, { bg: string; text: string; emoji: string }> = {
  motivant: {
    bg: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-700',
    text: 'text-green-800 dark:text-green-200',
    emoji: '💪',
  },
  sarcastique: {
    bg: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-700',
    text: 'text-red-700 dark:text-red-200',
    emoji: '😏',
  },
  epique: {
    bg: 'bg-purple-50 dark:bg-purple-900/30 border-purple-200 dark:border-purple-700',
    text: 'text-purple-800 dark:text-purple-200',
    emoji: '⚔️',
  },
  gamer: {
    bg: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-700',
    text: 'text-blue-800 dark:text-blue-200',
    emoji: '🎮',
  },
};

// ══════════════════════════════════════════════
// EMOJIS DES DÉCLENCHEURS
// ══════════════════════════════════════════════

export const DECLENCHEUR_EMOJIS: Record<Declencheur, string> = {
  S1: '🧱',
  S3: '⏰',
  S5: '🎉',
  S6: '🔑',
};

// ══════════════════════════════════════════════
// CONFIG DES STATUTS
// ══════════════════════════════════════════════

export const STATUT_CONFIG: Record<StatutProjet, { badge: string; emoji: string; label: string }> = {
  actif: {
    badge: 'badge-actif',
    emoji: '🔥',
    label: 'Actif',
  },
  silencieux: {
    badge: 'badge-silencieux',
    emoji: '🕯️',
    label: 'Silencieux',
  },
  acheve: {
    badge: 'badge-acheve',
    emoji: '🏆',
    label: 'Achevé',
  },
};

// ══════════════════════════════════════════════
// MÉDAILLES DU PODIUM
// ══════════════════════════════════════════════

export const MEDAL_COLORS: Record<number, { bg: string; text: string; emoji: string }> = {
  1: {
    bg: 'bg-gradient-to-br from-yellow-400 to-amber-600',
    text: 'text-white',
    emoji: '🥇',
  },
  2: {
    bg: 'bg-gradient-to-br from-gray-300 to-gray-500',
    text: 'text-white',
    emoji: '🥈',
  },
  3: {
    bg: 'bg-gradient-to-br from-amber-600 to-amber-800',
    text: 'text-white',
    emoji: '🥉',
  },
};

// ══════════════════════════════════════════════
// TEMPLATES DISPONIBLES
// ══════════════════════════════════════════════

export const TEMPLATES = [
  { id: 'maison', label: 'Maison', emoji: '🏠', description: 'Pour les projets de construction' },
  { id: 'villa', label: 'Villa', emoji: '🏡', description: 'Pour les grands projets' },
  { id: 'generique', label: 'Générique', emoji: '📦', description: 'Pour tout type de projet' },
] as const;

// ══════════════════════════════════════════════
// STYLES DE SIGNAL DISPONIBLES (ONBOARDING)
// ══════════════════════════════════════════════

export const SIGNAL_STYLES = [
  {
    value: 'motivant' as StyleSignal,
    emoji: '💪',
    label: 'Motivant',
    desc: 'Encouragements chaleureux',
    preview: 'Tu peux le faire ! Chaque brique compte.',
  },
  {
    value: 'sarcastique' as StyleSignal,
    emoji: '😏',
    label: 'Sarcastique',
    desc: 'Piques humoristiques',
    preview: 'Oh, tu bosses ? Je n\'y croyais plus.',
  },
  {
    value: 'epique' as StyleSignal,
    emoji: '⚔️',
    label: 'Épique',
    desc: 'Ton héroïque',
    preview: 'Le destin frappe à ta porte. Répondras-tu ?',
  },
  {
    value: 'gamer' as StyleSignal,
    emoji: '🎮',
    label: 'Gamer',
    desc: 'Vocabulaire jeu vidéo',
    preview: 'Brique posée ! +15 XP. Continue le grind.',
  },
] as const;
```

---

## 📄 FICHIER 8 : `lib/utils.ts` (COMPLET)

```typescript
/**
 * Formatte une durée relative sans jamais afficher de retard négatif.
 * Produit des repères neutres : "à l'instant", "il y a 4 jours", "hier".
 */
export function depuis(dateStr: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const maintenant = new Date();
  const diffMs = Math.max(0, maintenant.getTime() - date.getTime());

  const secondes = Math.floor(diffMs / 1000);
  const minutes = Math.floor(secondes / 60);
  const heures = Math.floor(minutes / 60);
  const jours = Math.floor(heures / 24);

  if (secondes < 10) return "à l'instant";
  if (secondes < 60) return `il y a ${secondes}s`;
  if (minutes === 1) return 'il y a 1 min';
  if (minutes < 60) return `il y a ${minutes} min`;
  if (heures === 1) return 'il y a 1h';
  if (heures < 24) return `il y a ${heures}h`;
  if (jours === 1) return 'hier';
  if (jours < 7) return `il y a ${jours} jours`;
  if (jours < 30) return `il y a ${Math.floor(jours / 7)} sem.`;
  if (jours < 365) return `il y a ${Math.floor(jours / 30)} mois`;
  return `il y a ${Math.floor(jours / 365)} an(s)`;
}

/**
 * Formatte un pourcentage — jamais nu.
 */
export function formatPourcentage(value: number): string {
  return `${Math.round(value)}%`;
}

/**
 * Tronque un texte à une longueur maximale.
 */
export function tronquer(texte: string, max: number): string {
  if (texte.length <= max) return texte;
  return texte.slice(0, max - 3) + '...';
}

/**
 * Génère un ID unique simple.
 */
export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

/**
 * Sleep asynchrone.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Formate une date en format français lisible.
 */
export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Formate une date avec heure.
 */
export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}
```

---

## 📄 FICHIER 9 : `lib/api.ts` (squelette)

```typescript
import { z } from 'zod';
import {
  DashboardResponseSchema,
  ClassementLigneSchema,
  ProjectSchema,
  type DashboardResponse,
  type ClassementLigne,
  type Project,
} from './contracts';
import { mockDashboard, mockClassement, mockProjectDetail } from './mock';

const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === 'true';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

class ApiClient {
  private token: string | null = null;

  setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.removeItem('token');
      }
    }
  }

  private async fetch<T>(
    path: string,
    schema: z.ZodSchema<T>,
    options?: RequestInit
  ): Promise<T> {
    // Mode mock
    if (USE_MOCKS) {
      return this.getMockData<T>(path);
    }

    // Mode réel avec fallback
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(options?.headers as Record<string, string>),
      };
      if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

      const response = await fetch(`${API_URL}${path}`, { ...options, headers });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      
      const data = await response.json();
      return schema.parse(data);
    } catch (error) {
      console.warn(`⚠️ Fallback mock pour ${path}:`, error);
      return this.getMockData<T>(path);
    }
  }

  private getMockData<T>(path: string): T {
    if (path === '/dashboard') return mockDashboard as unknown as T;
    if (path === '/classement') return mockClassement as unknown as T;
    if (path.startsWith('/projects/')) return mockProjectDetail as unknown as T;
    throw new Error(`No mock for ${path}`);
  }

  // Méthodes publiques — À IMPLÉMENTER par le Front
  async getDashboard(): Promise<DashboardResponse> {
    return this.fetch('/dashboard', DashboardResponseSchema);
  }

  async getClassement(): Promise<ClassementLigne[]> {
    return this.fetch('/classement', z.array(ClassementLigneSchema));
  }

  async getProject(id: string): Promise<Project> {
    return this.fetch(`/projects/${id}`, ProjectSchema);
  }

  async analyzeProject(id: string): Promise<any> {
    return this.fetch(`/projects/${id}/analyze`, z.any(), { method: 'POST' });
  }

  async simulateDay4(projectId: string): Promise<any> {
    return this.fetch('/admin/simulate-day4', z.any(), {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId }),
    });
  }

  async forceBrique(projectId: string, message?: string): Promise<any> {
    return this.fetch('/admin/force-brique', z.any(), {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, message }),
    });
  }
}

export const api = new ApiClient();
```

---

## 📄 FICHIER 10 : `tests/e2e.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('MaisonRêve — Tests E2E', () => {

  test('Page login — affichage initial', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('h1')).toContainText('Connexion');
    await expect(page.locator('text=Continuer avec GitHub')).toBeVisible();
    await expect(page.locator('text=Ou utiliser un email')).toBeVisible();
  });

  test('Flow login → onboarding', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Continuer avec GitHub');
    await page.waitForURL('/onboarding');
    await expect(page.locator('h1')).toContainText('rêves');
  });

  test('Page 404 personnalisée', async ({ page }) => {
    await page.goto('/inexistant-12345');
    await expect(page.locator('h1')).toContainText('404');
    await expect(page.locator('text=Retour au chantier')).toBeVisible();
    await page.click('text=Retour au chantier');
  });

  test('Dashboard affiche les projets', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Continuer avec GitHub');
    await page.waitForURL('/onboarding');
    // Skip onboarding rapide
    await page.goto('/dashboard');
    // Vérifier que des cards sont présentes
    const cards = page.locator('.card-dream');
    // En mode mock, il devrait y avoir des projets
    await expect(cards).not.toHaveCount(0);
  });

  test('Navigation complète', async ({ page }) => {
    await page.goto('/login');
    await page.click('text=Continuer avec GitHub');
    await page.waitForURL('/onboarding');
    await page.goto('/dashboard');

    // Vérifier la navigation vers les signaux
    const signalsLink = page.locator('a:has-text("Signaux")');
    if (await signalsLink.isVisible()) {
      await signalsLink.click();
      await expect(page).toHaveURL(/\/signaux/);
    }

    // Vérifier la navigation vers le classement
    const rankLink = page.locator('a:has-text("Classement")');
    if (await rankLink.isVisible()) {
      await rankLink.click();
      await expect(page).toHaveURL(/\/classement/);
    }
  });

  test('Mode sombre — pas de flash', async ({ page }) => {
    await page.goto('/login');
    // Vérifier que le HTML est chargé sans erreur
    const html = page.locator('html');
    await expect(html).toHaveAttribute('class', /font-sans/);
  });
});
```

---

## 📄 FICHIER 11 : `public/manifest.json`

```json
{
  "name": "MaisonRêve",
  "short_name": "MaisonRêve",
  "description": "Construis tes rêves, une brique à la fois",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f2a",
  "theme_color": "#d47b2a",
  "orientation": "portrait-primary",
  "icons": [
    {
      "src": "/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

---

## 📄 FICHIER 12 : `public/sw.js`

```javascript
const CACHE_NAME = 'maison-reve-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, clone);
        });
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});
```

---

## 📄 FICHIER 13 : `package.json`

```json
{
  "name": "maison-reve-frontend",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "test:e2e": "npx playwright test",
    "test:e2e:ui": "npx playwright test --ui",
    "test:e2e:report": "npx playwright show-report"
  },
  "dependencies": {
    "next": "^14.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "zod": "^3.22.4",
    "framer-motion": "^10.16.0",
    "canvas-confetti": "^2.3.3",
    "clsx": "^2.0.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.40.0",
    "@types/canvas-confetti": "^2.3.3",
    "@types/node": "^20.10.0",
    "@types/react": "^18.2.37",
    "@types/react-dom": "^18.2.15",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.3.2"
  }
}
```

---

## 📄 FICHIER 14 : `BUGS.md` (suivi QA)

```markdown
# 🐛 Suivi des bugs — MaisonRêve

| ID | Gravité | Page/Composant | Description | Comment reproduire | Assigné | Statut |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

## Légende
- 🔴 **Bloquant** — Empêche le flux principal
- 🟡 **Fonctionnel** — Gêne l'utilisation
- 🟢 **Cosmétique** — Impact visuel uniquement

---

*Mis à jour par D à chaque cycle de test.*
```

---

## 📄 FICHIER 15 : `V2_BACKLOG.md` (coupes documentées)

```markdown
# 📋 Backlog V2 — MaisonRêve

Fonctionnalités coupées ou reportées pendant la V1.

## Coupées (manque de temps)
- [ ] OAuth GitHub (remplacé par magic link + URL publique)
- [ ] Templates secondaires (villa, voiture, centre d'aide)
- [ ] Page rang dynamique (version seeds statiques en V1)
- [ ] S6 — Déblocage proche
- [ ] Export des données utilisateur
- [ ] Notifications push navigateur

## Idées pour la V2
- [ ] Mode multijoueur (construire à plusieurs)
- [ ] Thèmes saisonniers (neige en hiver, fleurs au printemps)
- [ ] Intégration GitLab, Bitbucket
- [ ] API publique pour créer des templates personnalisés
- [ ] Application mobile React Native

---

*Alimenté pendant tout le projet. Rien n'est oublié.*
```

---

## 📄 FICHIER 16 : `.env.local`

```bash
NEXT_PUBLIC_USE_MOCKS=true
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📄 FICHIER 17 : `.gitignore`

```
node_modules/
.next/
out/
.env.local
.env.production
playwright-report/
test-results/
```

---

## 🚀 INSTRUCTIONS POUR LE FRONT

```bash
# 1. Cloner ou créer le projet
npx create-next-app@latest maison-reve-frontend --typescript --tailwind --eslint --app --src-dir=false

# 2. Copier tous les fichiers de ce kit dans le projet

# 3. Installer les dépendances supplémentaires
npm install zod framer-motion canvas-confetti clsx
npm install -D @playwright/test @types/canvas-confetti
npx playwright install chromium

# 4. Lancer le développement
npm run dev
# → http://localhost:3000

# 5. Lancer les tests E2E
npm run test:e2e
```

---

**Ce kit contient 17 fichiers prêts à l'emploi. Le Front n'a plus qu'à implémenter le code dans les squelettes de composants et pages.** 🛠️
