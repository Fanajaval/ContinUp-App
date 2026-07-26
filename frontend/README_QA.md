# 🏠 MaisonRêve — QA Frontend

> **Kit QA fourni par D.** Structure, contrats, et règles à implémenter.
> Ce document rassemble les priorités et les règles QA pour le front.

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
- **Scène nocturne** : la vignette maison reste nocturne dans les deux thèmes
- **2 piles de toasts** : Signal (bas droite) ≠ Système (bas gauche)

## 🔌 Brancher le Backend

```bash
echo "NEXT_PUBLIC_USE_MOCKS=false" > .env.local
echo "NEXT_PUBLIC_API_URL=http://localhost:3001/api" >> .env.local
```
