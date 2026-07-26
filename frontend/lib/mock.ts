import type {
  ClassementLigne,
  DashboardResponse,
  Event,
  Project,
  Reve,
  Signal,
  StyleSignal,
  User,
} from "./contracts";

/**
 * MOCKS — Fiche B, H0-H0:45 : « contrat d'API récupéré → tu mockes tout ».
 * Aucun composant n'importe ce fichier directement : tout passe par lib/api.ts.
 * Quand C livre les vraies routes, on bascule un flag et ce fichier ne sert
 * plus que de mode dégradé (NF2).
 */

const H = 3_600_000;
const iso = (hAgo: number) => new Date(Date.now() - hAgo * H).toISOString();

export const MOCK_USER: User = {
  id: "u1",
  pseudo: "Soa",
  email: "soa@exemple.mg",
  style_signal: "motivant",
  xp_total: 47,
  rang: 3,
};

export const MOCK_REVES: Reve[] = [
  { id: "r1", user_id: "u1", label: "Ma maison", categorie: "Habitat", poids_de_reve: 9, statut: "en_cours" },
  { id: "r2", user_id: "u1", label: "Une villa au bord de mer", categorie: "Habitat", poids_de_reve: 7, statut: "en_cours" },
  { id: "r3", user_id: "u1", label: "Ma première voiture", categorie: "Mobilité", poids_de_reve: 5, statut: "en_cours" },
  { id: "r4", user_id: "u1", label: "Un centre d'aide pour mon quartier", categorie: "Impact", poids_de_reve: 10, statut: "en_attente" },
];

export const MOCK_PROJECTS: Project[] = [
  {
    id: "p1",
    user_id: "u1",
    reve_id: "r1",
    repo_url: "https://github.com/soa/gestion-stock",
    repo_nom: "gestion-stock",
    template_type: "maison",
    statut: "actif",
    progression: 62,
    etape_semantique: "Fenêtres installées",
    etapes_done: ["terrain", "fondations", "murs", "toit", "fenetres"],
    derniere_activite: iso(5),
    xp_projet: 14,
    prochaine_action: "Créer le composant <LoginForm> et le brancher sur /api/auth (20 min)",
  },
  {
    id: "p2",
    user_id: "u1",
    reve_id: "r2",
    repo_url: "https://github.com/soa/api-reservation",
    repo_nom: "api-reservation",
    template_type: "villa",
    statut: "silencieux",
    progression: 38,
    etape_semantique: "Murs blancs montés",
    etapes_done: ["terrain", "fondations", "murs"],
    derniere_activite: iso(96), // 4 jours → S3 armé
    xp_projet: 9,
    prochaine_action: "Ajouter la route GET /reservations/:id — le modèle existe déjà (15 min)",
  },
  {
    id: "p3",
    user_id: "u1",
    reve_id: "r3",
    repo_url: "https://github.com/soa/portfolio",
    repo_nom: "portfolio",
    template_type: "voiture",
    statut: "acheve",
    progression: 100,
    etape_semantique: "Premier trajet",
    etapes_done: ["terrain", "fondations", "murs", "toit", "fenetres", "porte", "jardin", "emmenagement"],
    derniere_activite: iso(30),
    xp_projet: 18,
    prochaine_action: null,
  },
  {
    id: "p4",
    user_id: "u1",
    reve_id: "r4",
    repo_url: "https://github.com/soa/centre-quartier",
    repo_nom: "centre-quartier",
    template_type: "centre_aide",
    statut: "vide",
    progression: 0,
    etape_semantique: "Terrain en vue",
    etapes_done: [],
    derniere_activite: iso(2),
    xp_projet: 0,
    prochaine_action: "Écrire le README et poser l'arborescence du projet (20 min)",
  },
];

export const MOCK_SIGNAUX: Signal[] = [
  {
    id: "s1",
    project_id: "p2",
    project_nom: "api-reservation",
    declencheur: "S3",
    style: "motivant",
    contenu: {
      titre: "Ta villa t'attend, Soa",
      preuve_de_progres:
        "Tu as déjà monté les murs : 3 étapes sur 8, 14 commits, un modèle de données complet. Ce n'est pas rien — c'est la partie la plus dure.",
      micro_action: "Ajouter la route GET /reservations/:id — le modèle existe déjà (15 min)",
      lien: "/projet/p2",
    },
    canal: "email",
    envoye_le: iso(3),
    lu: false,
  },
  {
    id: "s2",
    project_id: "p1",
    project_nom: "gestion-stock",
    declencheur: "S1",
    style: "motivant",
    contenu: {
      titre: "Les fenêtres sont posées 🪟",
      preuve_de_progres: "5 étapes sur 8. La lumière entre enfin dans ta maison.",
      micro_action: "Monter la porte : crée la page d'accueil (20 min)",
      lien: "/projet/p1",
    },
    canal: "in_app",
    envoye_le: iso(5),
    lu: true,
  },
  {
    id: "s3",
    project_id: "p1",
    project_nom: "gestion-stock",
    declencheur: "S6",
    style: "motivant",
    contenu: {
      titre: "Il manque une porte pour que ça devienne un chez-toi",
      preuve_de_progres: "Une seule tâche te sépare de l'étape « Porte montée ».",
      micro_action: "Brancher le formulaire de connexion (20 min)",
      lien: "/projet/p1",
    },
    canal: "in_app",
    envoye_le: iso(28),
    lu: true,
  },
  {
    id: "s4",
    project_id: "p3",
    project_nom: "portfolio",
    declencheur: "S5",
    style: "motivant",
    contenu: {
      titre: "Te revoilà. On reprend exactement où tu t'es arrêtée.",
      preuve_de_progres: "6 jours de silence, et tu es revenue. C'est ça, la vraie compétence.",
      micro_action: "Relire la todolist et cocher ce qui est déjà fait (10 min)",
      lien: "/projet/p3",
    },
    canal: "in_app",
    envoye_le: iso(52),
    lu: true,
  },
];

export const MOCK_EVENTS: Event[] = [
  { id: "e1", project_id: "p1", type: "brique", date: iso(5), xp: 1, label: "Fenêtres installées" },
  { id: "e2", project_id: "p3", type: "finition", date: iso(30), xp: 5, label: "portfolio achevé 🏆" },
  { id: "e3", project_id: "p3", type: "retour", date: iso(52), xp: 5, label: "Retour après 6 jours" },
  { id: "e4", project_id: "p1", type: "blocage_franchi", date: iso(74), xp: 3, label: "Auth enfin franchie" },
  { id: "e5", project_id: "p1", type: "brique", date: iso(80), xp: 1, label: "Toit posé" },
];

export const MOCK_CLASSEMENT: ClassementLigne[] = [
  { rang: 1, pseudo: "Rina", xp_total: 96, retours: 6, finitions: 4, is_me: false },
  { rang: 2, pseudo: "Tiana", xp_total: 71, retours: 5, finitions: 3, is_me: false },
  { rang: 3, pseudo: "Soa", xp_total: 47, retours: 3, finitions: 2, is_me: true },
  { rang: 4, pseudo: "Hery", xp_total: 39, retours: 2, finitions: 2, is_me: false },
  { rang: 5, pseudo: "Nomena", xp_total: 22, retours: 2, finitions: 1, is_me: false },
];

export const MOCK_DASHBOARD: DashboardResponse = {
  user: MOCK_USER,
  projects: MOCK_PROJECTS,
  reves: MOCK_REVES,
  signaux_actifs: MOCK_SIGNAUX,
  events_recents: MOCK_EVENTS,
};

/* ---------------------------------------------------------------- */
/* Préviews de style — M1.4, alimentées localement (aucun appel IA)  */
/* ---------------------------------------------------------------- */

export const PREVIEW_S3: Record<StyleSignal, string> = {
  sarcastique:
    "Quatre jours. Ta maison a les murs, pas le toit. Elle prend l'eau, mais bon, elle t'attend. Une route à écrire, 15 minutes. Ou pas.",
  motivant:
    "Tu as déjà monté les murs — la partie la plus dure est derrière toi. Il reste une route à écrire, quinze minutes. Ta villa t'attend.",
  epique:
    "Le chantier dort depuis quatre jours. Mais les murs tiennent, et ils tiendront. Une seule route te sépare du toit. Reviens, bâtisseuse.",
  gamer:
    "⚠️ Quête en pause : J+4. Progression sauvegardée à 38 %. Objectif suivant : GET /reservations/:id — 15 min, +1 brique. GO ?",
};

export const STYLE_META: Record<
  StyleSignal,
  { emoji: string; nom: string; desc: string }
> = {
  sarcastique: { emoji: "😏", nom: "Sarcastique", desc: "Te pique, sans jamais te blesser" },
  motivant: { emoji: "🤗", nom: "Motivant de fond", desc: "Te rappelle ce que tu as déjà bâti" },
  epique: { emoji: "🎬", nom: "Épique", desc: "Fait de ton repo une légende" },
  gamer: { emoji: "🎮", nom: "Gamer", desc: "Quêtes, XP et objectifs" },
};
