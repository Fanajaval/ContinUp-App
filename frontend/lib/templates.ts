import type { TemplateType } from "./contracts";

/**
 * M3.2 — TEMPLATES 2D EN CALQUES
 *
 * Chaque template = une liste ORDONNÉE d'étapes. L'`id` de chaque étape est
 * le contrat avec A (mapping M3.3) et C (champ `etapes_done`).
 * ⚠️ NE JAMAIS renommer un `id` sans prévenir A et C.
 *
 * `indice` = ce qu'on murmure à l'utilisateur pour l'étape suivante (M4.1 / S6).
 */

export type EtapeTemplate = {
  id: string;
  /** Libellé sémantique affiché À CÔTÉ du % (NF4). Toujours au participe passé. */
  label: string;
  /** Aide au mapping pour A : familles de tâches typiques. */
  hint: string;
  /** Micro-teaser affiché quand l'étape est la prochaine à tomber. */
  indice: string;
};

export type Template = {
  type: TemplateType;
  nom: string;
  emoji: string;
  /** Mot du rêve réinjecté dans les signaux (M4.4 « vocabulaire du rêve »). */
  vocabulaire: { unite: string; lieu: string; verbe: string };
  etapes: EtapeTemplate[];
};

/* ════════════════════════════════════════════════════════════════ */
/* 🏠 MAISON — le template phare, celui qui doit être MAGNIFIQUE     */
/* ════════════════════════════════════════════════════════════════ */

export const MAISON: Template = {
  type: "maison",
  nom: "Ma maison",
  emoji: "🏠",
  vocabulaire: { unite: "brique", lieu: "la maison", verbe: "bâtir" },
  etapes: [
    {
      id: "terrain",
      label: "Terrain acquis",
      hint: "init, setup, config, README, dépendances, arborescence",
      indice: "Le terrain t'attend.",
    },
    {
      id: "fondations",
      label: "Fondations coulées",
      hint: "schéma SQL, migrations, modèle de données, ORM, base",
      indice: "Encore un peu de béton et les fondations prennent.",
    },
    {
      id: "murs",
      label: "Murs montés",
      hint: "API, routes, services, logique métier, backend",
      indice: "Les murs n'attendent qu'un mur de plus.",
    },
    {
      id: "toit",
      label: "Toit posé",
      hint: "auth, sécurité, middleware, validation, protection",
      indice: "Plus qu'une tâche avant le toit.",
    },
    {
      id: "fenetres",
      label: "Fenêtres installées",
      hint: "composants UI, écrans, formulaires, affichage",
      indice: "La lumière va enfin entrer.",
    },
    {
      id: "porte",
      label: "Porte montée",
      hint: "onboarding, login, page d'accueil, navigation, entrée",
      indice: "Il manque une porte pour que ça devienne un chez-toi.",
    },
    {
      id: "jardin",
      label: "Jardin planté",
      hint: "polish, animations, design, responsive, détails",
      indice: "Le jardin ne demande qu'à pousser.",
    },
    {
      id: "emmenagement",
      label: "Emménagement",
      hint: "déploiement, prod, tests, documentation finale, release",
      indice: "Les cartons sont prêts. Tu peux emménager.",
    },
  ],
};

/* ════════════════════════════════════════════════════════════════ */
/* Templates secondaires (D, H8-H10:30) — mêmes calques, autre peau  */
/* ════════════════════════════════════════════════════════════════ */

export const VILLA: Template = {
  type: "villa",
  nom: "Ma villa de vacances",
  emoji: "🌴",
  vocabulaire: { unite: "pierre", lieu: "la villa", verbe: "élever" },
  etapes: [
    { id: "terrain", label: "Bord de mer acquis", hint: "init, setup, config", indice: "La vue t'attend." },
    { id: "fondations", label: "Fondations coulées", hint: "SQL, modèle, migrations", indice: "Le sable devient béton." },
    { id: "murs", label: "Murs blancs montés", hint: "API, backend, services", indice: "Un mur de plus." },
    { id: "toit", label: "Terrasse posée", hint: "auth, sécurité, validation", indice: "Plus qu'une tâche avant la terrasse." },
    { id: "fenetres", label: "Baies vitrées installées", hint: "UI, composants, écrans", indice: "La lumière arrive." },
    { id: "porte", label: "Piscine creusée", hint: "onboarding, accueil, navigation", indice: "L'eau n'attend que toi." },
    { id: "jardin", label: "Palmiers plantés", hint: "polish, animations, design", indice: "Il manque l'ombre." },
    { id: "emmenagement", label: "Premières vacances", hint: "déploiement, prod, tests", indice: "Ta valise est prête." },
  ],
};

export const VOITURE: Template = {
  type: "voiture",
  nom: "Ma voiture",
  emoji: "🚗",
  vocabulaire: { unite: "pièce", lieu: "la voiture", verbe: "assembler" },
  etapes: [
    { id: "terrain", label: "Châssis reçu", hint: "init, setup, config", indice: "Le châssis t'attend." },
    { id: "fondations", label: "Moteur installé", hint: "SQL, modèle, cœur logique", indice: "Le moteur va tourner." },
    { id: "murs", label: "Carrosserie montée", hint: "API, backend, services", indice: "Encore une tôle." },
    { id: "toit", label: "Toit soudé", hint: "auth, sécurité", indice: "Plus qu'une tâche avant le toit." },
    { id: "fenetres", label: "Vitres posées", hint: "UI, composants", indice: "La visibilité arrive." },
    { id: "porte", label: "Portières fixées", hint: "onboarding, navigation", indice: "Il manque de quoi monter." },
    { id: "jardin", label: "Roues et peinture", hint: "polish, design", indice: "Les roues sont livrées." },
    { id: "emmenagement", label: "Premier trajet", hint: "déploiement, prod", indice: "La clé est sur le contact." },
  ],
};

export const CENTRE_AIDE: Template = {
  type: "centre_aide",
  nom: "Mon centre d'aide",
  emoji: "🤝",
  vocabulaire: { unite: "pierre", lieu: "le centre", verbe: "ouvrir" },
  etapes: [
    { id: "terrain", label: "Terrain obtenu", hint: "init, setup", indice: "Le terrain est là." },
    { id: "fondations", label: "Fondations coulées", hint: "SQL, modèle", indice: "Les fondations prennent." },
    { id: "murs", label: "Murs montés", hint: "API, backend", indice: "Un mur de plus." },
    { id: "toit", label: "Toit posé", hint: "auth, sécurité", indice: "Plus qu'une tâche avant le toit." },
    { id: "fenetres", label: "Salles aménagées", hint: "UI, écrans", indice: "Les salles s'ouvrent." },
    { id: "porte", label: "Accueil ouvert", hint: "onboarding, accueil", indice: "Il manque la porte d'entrée." },
    { id: "jardin", label: "Cour plantée", hint: "polish, design", indice: "La cour attend ses arbres." },
    { id: "emmenagement", label: "Premiers accueillis", hint: "déploiement, prod", indice: "Ils frappent déjà à la porte." },
  ],
};

export const GENERIQUE: Template = {
  type: "generique",
  nom: "Mon rêve",
  emoji: "✨",
  vocabulaire: { unite: "pierre", lieu: "le monument", verbe: "construire" },
  etapes: [
    { id: "terrain", label: "Socle posé", hint: "init, setup", indice: "Le socle t'attend." },
    { id: "fondations", label: "Fondations coulées", hint: "SQL, modèle", indice: "Les fondations prennent." },
    { id: "murs", label: "Structure montée", hint: "API, backend", indice: "Une poutre de plus." },
    { id: "toit", label: "Couverture posée", hint: "auth, sécurité", indice: "Plus qu'une tâche avant la couverture." },
    { id: "fenetres", label: "Ouvertures percées", hint: "UI, composants", indice: "La lumière approche." },
    { id: "porte", label: "Entrée ouverte", hint: "onboarding, navigation", indice: "Il manque l'entrée." },
    { id: "jardin", label: "Abords aménagés", hint: "polish, design", indice: "Les abords attendent." },
    { id: "emmenagement", label: "Inauguration", hint: "déploiement, prod", indice: "Le ruban est prêt à être coupé." },
  ],
};

export const TEMPLATES: Record<TemplateType, Template> = {
  maison: MAISON,
  villa: VILLA,
  voiture: VOITURE,
  centre_aide: CENTRE_AIDE,
  generique: GENERIQUE,
};

export function getTemplate(type: TemplateType): Template {
  return TEMPLATES[type] ?? GENERIQUE;
}

/**
 * M3.4 — jamais de régression visuelle.
 * On dérive l'affichage des étapes acquises, en verrouillant l'ordre :
 * une étape n'est peinte que si toutes les précédentes le sont aussi
 * (protège le rendu d'un mapping IA fantaisiste : pas de toit volant).
 */
export function etapesVisibles(
  type: TemplateType,
  etapesDone: string[]
): string[] {
  const t = getTemplate(type);
  const set = new Set(etapesDone);
  const out: string[] = [];
  for (const e of t.etapes) {
    if (!set.has(e.id)) break;
    out.push(e.id);
  }
  return out;
}

/** Prochaine étape à tomber — alimente S6 et le teaser des cards. */
export function prochaineEtape(
  type: TemplateType,
  etapesDone: string[]
): EtapeTemplate | null {
  const t = getTemplate(type);
  const acquises = new Set(etapesVisibles(type, etapesDone));
  return t.etapes.find((e) => !acquises.has(e.id)) ?? null;
}

/** Libellé de l'étape courante — le texte qui ne quitte JAMAIS le % (NF4). */
export function etapeCouranteLabel(
  type: TemplateType,
  etapesDone: string[]
): string {
  const visibles = etapesVisibles(type, etapesDone);
  if (visibles.length === 0) return "Terrain en vue";
  const t = getTemplate(type);
  return t.etapes.find((e) => e.id === visibles[visibles.length - 1])!.label;
}
