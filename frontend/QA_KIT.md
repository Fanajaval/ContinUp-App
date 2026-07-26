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
