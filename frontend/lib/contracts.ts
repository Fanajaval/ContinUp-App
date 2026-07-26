import { z } from "zod";

/**
 * ══════════════════════════════════════════════════════════════════
 *  CONTRAT D'API — source de vérité partagée A / B / C / D
 *  Figé à H+0:45. Miroir exact du modèle de données du CDC §5.
 *  Toute réponse serveur DOIT passer ces schémas (NF2 : validation zod).
 * ══════════════════════════════════════════════════════════════════
 */

/* ---------------------------------------------------------------- */
/* Énumérations                                                      */
/* ---------------------------------------------------------------- */

export const StyleSignal = z.enum([
  "sarcastique",
  "motivant",
  "epique",
  "gamer",
]);
export type StyleSignal = z.infer<typeof StyleSignal>;

export const Declencheur = z.enum([
  "S1", // brique posée
  "S3", // jour-4, silence > 72h  ⭐ le joyau
  "S5", // retour après silence
  "S6", // déblocage proche
]);
export type Declencheur = z.infer<typeof Declencheur>;

export const StatutProjet = z.enum([
  "vide", // repo associé, pas encore d'activité
  "actif", // 🔥
  "silencieux", // 🌫 + 🕯️
  "acheve", // 🏆
]);
export type StatutProjet = z.infer<typeof StatutProjet>;

export const TemplateType = z.enum([
  "maison",
  "villa",
  "voiture",
  "centre_aide",
  "generique",
]);
export type TemplateType = z.infer<typeof TemplateType>;

export const TypeEvent = z.enum([
  "brique", // ×1
  "retour", // ×5
  "blocage_franchi", // ×3
  "finition", // ×5
]);
export type TypeEvent = z.infer<typeof TypeEvent>;

export const Canal = z.enum(["in_app", "email"]);
export const SourceDoc = z.enum(["repo", "genere"]);
export const TypeDoc = z.enum(["previously", "cahier_charges", "todolist"]);

/* ---------------------------------------------------------------- */
/* Entités                                                           */
/* ---------------------------------------------------------------- */

export const UserSchema = z.object({
  id: z.string(),
  pseudo: z.string(),
  email: z.string().email(),
  style_signal: StyleSignal,
  xp_total: z.number().int().nonnegative(),
  rang: z.number().int().positive().nullable(),
});
export type User = z.infer<typeof UserSchema>;

export const ReveSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  label: z.string(),
  categorie: z.string(),
  /** M1.3 — attribué par l'IA (A). 1 = modeste, 10 = ambition de vie. */
  poids_de_reve: z.number().min(1).max(10),
  statut: z.enum(["en_cours", "atteint", "en_attente"]),
});
export type Reve = z.infer<typeof ReveSchema>;

export const TaskSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  label: z.string(),
  done: z.boolean(),
  poids: z.number().min(0),
  /**
   * M3.3 — mapping sémantique produit par A.
   * DOIT valoir l'`id` d'une étape du template du projet
   * (cf. lib/templates.ts → TEMPLATES[type].etapes[].id).
   */
  etape_template: z.string(),
  duree_estimee: z.number().int().nullable(),
});
export type Task = z.infer<typeof TaskSchema>;

export const ProjectSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  reve_id: z.string(),
  repo_url: z.string(),
  repo_nom: z.string(),
  template_type: TemplateType,
  statut: StatutProjet,
  /** 0 → 100. Ne redescend jamais (M3.4). */
  progression: z.number().min(0).max(100),
  /** NF4 — le libellé humain qui accompagne TOUJOURS le %. */
  etape_semantique: z.string(),
  /**
   * ⚠️ EXIGENCE DE B → A/C : liste des `id` d'étapes du template
   * déjà acquises. C'est CE tableau qui pilote l'affichage des calques.
   * Sans lui, le front ne peut pas dessiner le rêve.
   */
  etapes_done: z.array(z.string()),
  derniere_activite: z.string(), // ISO
  xp_projet: z.number().int().nonnegative(),
  /** Prochaine micro-action ~20 min (M2.3). Jamais vide, jamais froide. */
  prochaine_action: z.string().nullable(),
});
export type Project = z.infer<typeof ProjectSchema>;

export const DocSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  type: TypeDoc,
  contenu_json: z.unknown(),
  source: SourceDoc,
  valide: z.boolean(),
});
export type Doc = z.infer<typeof DocSchema>;

export const EventSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  type: TypeEvent,
  date: z.string(),
  xp: z.number().int(),
  label: z.string(),
});
export type Event = z.infer<typeof EventSchema>;

export const SignalSchema = z.object({
  id: z.string(),
  project_id: z.string(),
  project_nom: z.string(),
  declencheur: Declencheur,
  style: StyleSignal,
  contenu: z.object({
    /** Règle d'or M4.3 — les 3 champs sont OBLIGATOIRES pour tout signal. */
    titre: z.string(),
    preuve_de_progres: z.string(),
    micro_action: z.string(),
    lien: z.string(),
  }),
  canal: Canal,
  envoye_le: z.string(),
  lu: z.boolean(),
});
export type Signal = z.infer<typeof SignalSchema>;

/* ---------------------------------------------------------------- */
/* Réponses d'API                                                    */
/* ---------------------------------------------------------------- */

/** Sortie du prompt maître de A (M2.3) — `POST /api/analyze` */
export const AnalyzeResponseSchema = z.object({
  previously: z.string(),
  progression: z.number().min(0).max(100),
  etape_semantique: z.string(),
  etapes_done: z.array(z.string()),
  prochaine_action: z.string(),
  tasks: z.array(TaskSchema.omit({ id: true, project_id: true })),
  docs_source: SourceDoc, // fast-path M2.2 : "repo" ou "genere"
});
export type AnalyzeResponse = z.infer<typeof AnalyzeResponseSchema>;

export const DashboardResponseSchema = z.object({
  user: UserSchema,
  projects: z.array(ProjectSchema),
  reves: z.array(ReveSchema),
  signaux_actifs: z.array(SignalSchema),
  events_recents: z.array(EventSchema),
});
export type DashboardResponse = z.infer<typeof DashboardResponseSchema>;

export const ClassementLigneSchema = z.object({
  rang: z.number().int().positive(),
  pseudo: z.string(),
  xp_total: z.number().int(),
  retours: z.number().int(),
  finitions: z.number().int(),
  is_me: z.boolean(),
});
export type ClassementLigne = z.infer<typeof ClassementLigneSchema>;

/* ---------------------------------------------------------------- */
/* Barème XP — M6.2 (dupliqué front pour l'affichage optimiste)      */
/* ---------------------------------------------------------------- */

export const XP_BAREME: Record<TypeEvent, number> = {
  retour: 5,
  finition: 5,
  blocage_franchi: 3,
  brique: 1,
};

export const XP_LABEL: Record<TypeEvent, string> = {
  retour: "Retour après silence",
  finition: "Projet achevé",
  blocage_franchi: "Blocage franchi",
  brique: "Brique posée",
};
