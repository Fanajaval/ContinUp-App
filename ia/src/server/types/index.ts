/**
 * ═══════════════════════════════════════════════════════════════════
 *  CONTRAT D'API — figé à H+0:45 par A (IA/Backend)
 *  Consommé par : C (infra/cron/webhook), B (front), D (pages docs/QA)
 *  Ne change plus après H+2 sans annonce à voix haute.
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────── Enums partagés ─────────────────────────

/** Les 8 étapes fixes du template maison (M3.2). L'ordre EST la progression. */
export const ETAPES_MAISON = [
  'terrain',
  'fondations',
  'murs',
  'toit',
  'fenetres',
  'porte',
  'jardin',
  'emmenagement',
] as const;
export type EtapeMaison = (typeof ETAPES_MAISON)[number];

/** Libellés sémantiques : NF4 — un % nu recrée le silence du `if`. */
export const LIBELLES_ETAPES: Record<EtapeMaison, string> = {
  terrain: 'Terrain repéré',
  fondations: 'Fondations coulées',
  murs: 'Murs montés',
  toit: 'Toit posé',
  fenetres: 'Fenêtres installées',
  porte: 'Porte posée',
  jardin: 'Jardin planté',
  emmenagement: 'Emménagement',
};

export const TEMPLATE_TYPES = ['maison', 'villa', 'voiture', 'centre_aide', 'generique'] as const;
export type TemplateType = (typeof TEMPLATE_TYPES)[number];

export const STYLES_SIGNAL = ['sarcastique', 'motivant', 'epique', 'gamer'] as const;
export type StyleSignal = (typeof STYLES_SIGNAL)[number];

/** Déclencheurs V1 (M4.1). S3 est le joyau. */
export const DECLENCHEURS = ['S1', 'S3', 'S5', 'S6'] as const;
export type Declencheur = (typeof DECLENCHEURS)[number];

export const CATEGORIES_REVE = [
  'habitat',
  'mobilite',
  'impact_social',
  'carriere',
  'creation',
  'voyage',
  'sante',
  'autre',
] as const;
export type CategorieReve = (typeof CATEGORIES_REVE)[number];

// ───────────────────────── M2 : /api/analyze ─────────────────────────

export interface AnalyzeRequest {
  projectId: string;
  repoUrl: string;
  /** Optionnel : si C a déjà cloné/fetché, il passe les fichiers ici (évite un aller-retour GitHub). */
  files?: RepoFile[];
  /** Type de template lié au rêve (sert au mapping direct dans la même passe). */
  templateType?: TemplateType;
  /** Libellé du rêve, pour le vocabulaire des étapes. */
  reveLabel?: string;
  /** Force le recalcul même si un cache existe (NF1). */
  force?: boolean;
}

export interface RepoFile {
  path: string;
  content: string;
  size?: number;
}

export interface TaskOut {
  label: string;
  /** Poids relatif 1..5 : sert au calcul de progression pondérée. */
  poids: number;
  /** true si l'IA estime la tâche déjà réalisée au vu du code présent. */
  done: boolean;
  etape_template: EtapeMaison;
  duree_estimee_min: number;
  /** Pourquoi l'IA la considère faite/pas faite — sert aux preuves de progrès du Signal. */
  preuve?: string;
}

export interface PreviouslyOut {
  /** 2-3 phrases : où tu en es. Jamais culpabilisant (M4.7). */
  ou_tu_en_es: string;
  /** Le dernier point de contact réel avec le code. */
  ou_tu_tes_arrete: string;
  /** LA micro-action ~20 min, concrète, immédiatement exécutable. */
  prochaine_action: string;
  prochaine_action_duree_min: number;
  /** Le fichier/dossier exact à rouvrir : le lien direct de la règle d'or (M4.3). */
  point_de_reprise: string;
}

export interface AnalyzeResponse {
  projectId: string;
  /** 'repo' = fast-path (docs trouvés) · 'genere' = l'IA a tout produit (M2.2). */
  source: 'repo' | 'genere' | 'mixte';
  /** Chemins des docs détectés dans le repo (README, CDC, TODO…). */
  docs_detectes: string[];
  resume_projet: string;
  stack_detectee: string[];
  previously: PreviouslyOut;
  tasks: TaskOut[];
  /** 0..100, pondéré par les poids de tâches. Ne régresse jamais (M3.4). */
  progression: number;
  etape_courante: EtapeMaison;
  etape_libelle: string;
  /** Vrai si l'analyse vient du cache BDD (NF1). */
  cached: boolean;
  /** Vrai si l'IA était indisponible et qu'on a servi le mode dégradé (NF2). */
  degraded: boolean;
  generated_at: string;
}

// ───────────────────────── M3.3 : /api/map ─────────────────────────

export interface MappingRequest {
  projectId: string;
  templateType: TemplateType;
  reveLabel?: string;
  tasks: { id?: string; label: string; done?: boolean; poids?: number }[];
  force?: boolean;
}

export interface MappedTask {
  id?: string;
  label: string;
  etape_template: EtapeMaison;
  poids: number;
  done: boolean;
  /** Justification courte du rattachement (« SQL = fondations »). */
  raison: string;
}

export interface MappingResponse {
  projectId: string;
  templateType: TemplateType;
  tasks: MappedTask[];
  progression: number;
  etape_courante: EtapeMaison;
  etape_libelle: string;
  /** Les étapes 100% terminées → calques à afficher par B. */
  etapes_debloquees: EtapeMaison[];
  /** Nb de tâches restantes avant la prochaine étape → nourrit S6. */
  taches_avant_prochaine_etape: number;
  cached: boolean;
  degraded: boolean;
}

// ───────────────────────── M4 : /api/signal ─────────────────────────

export interface SignalRequest {
  projectId: string;
  declencheur: Declencheur;
  style: StyleSignal;
  /** Contexte fourni par C (cron/webhook). Tout est optionnel : on dégrade proprement. */
  contexte: SignalContexte;
  /** Canal visé : influence la longueur (email = plus long). */
  canal?: 'in_app' | 'email';
  force?: boolean;
}

export interface SignalContexte {
  pseudo?: string;
  reveLabel?: string;
  templateType?: TemplateType;
  projectName?: string;
  progression?: number;
  etape_courante?: EtapeMaison;
  /** Ce qui vient d'être accompli (S1) ou ce qui existe déjà (S3). */
  preuve_de_progres?: string;
  /** LA micro-action à proposer. Si absente, on reprend celle du Previously en cache. */
  micro_action?: string;
  micro_action_duree_min?: number;
  jours_de_silence?: number;
  /** S6 : nombre de tâches avant l'étape suivante. */
  taches_avant_deblocage?: number;
  prochaine_etape?: EtapeMaison;
  /** Nombre de relances S3 déjà envoyées (M4.6) — informatif pour le ton. */
  relance_index?: number;
}

export interface SignalResponse {
  projectId: string;
  declencheur: Declencheur;
  style: StyleSignal;
  /** Titre court, in-app / objet d'email. ≤ 60 caractères. */
  titre: string;
  /** Corps du message. 2-4 phrases in-app, un peu plus en email. */
  corps: string;
  /** La preuve de progrès, isolée pour l'UI de B (M4.3). */
  preuve_de_progres: string;
  /** LA micro-action, isolée. Une seule, toujours. */
  micro_action: string;
  micro_action_duree_min: number;
  /** Label du bouton (lien direct). */
  cta_label: string;
  cta_url: string;
  /** Version email HTML-ready (texte simple, retours ligne) si canal=email. */
  email_subject?: string;
  email_body?: string;
  /** Passé par le validateur de la règle d'or (M4.3 + M4.7). */
  regle_dor_ok: boolean;
  cached: boolean;
  degraded: boolean;
  generated_at: string;
}

// ───────────────────────── M7 : /api/letter ─────────────────────────

export interface LetterRequest {
  projectId: string;
  pseudo?: string;
  reveLabel?: string;
  projectName?: string;
  templateType?: TemplateType;
  /** Statistiques du parcours, fournies par C. */
  parcours?: {
    jours_total?: number;
    nb_retours_apres_silence?: number;
    plus_long_silence_jours?: number;
    nb_briques?: number;
    xp_total?: number;
  };
  /** Quelques étapes marquantes pour ancrer la lettre dans le réel. */
  moments_cles?: string[];
  force?: boolean;
}

export interface LetterResponse {
  projectId: string;
  titre: string;
  /** Corps de la lettre, en markdown léger, écrite par le projet achevé à son auteur. */
  corps: string;
  /** Une phrase à afficher en gros sur la card dorée. */
  citation: string;
  signature: string;
  cached: boolean;
  degraded: boolean;
  generated_at: string;
}

// ───────────────────────── M1.3 : /api/dreams/analyze ─────────────────────────

export interface DreamsAnalyzeRequest {
  userId: string;
  /** Chips + champ libre, tels que saisis par B en 60 secondes. */
  reves: string[];
  force?: boolean;
}

export interface DreamOut {
  label: string;
  /** Label normalisé, propre à l'affichage. */
  label_normalise: string;
  categorie: CategorieReve;
  /** 1..100 — ambition/complexité relative. Sert au calcul de progression globale (M6.1). */
  poids_de_reve: number;
  template_type: TemplateType;
  /** Vocabulaire du rêve réinjecté dans les signaux (M4.4). */
  vocabulaire: string[];
}

export interface DreamsAnalyzeResponse {
  userId: string;
  reves: DreamOut[];
  cached: boolean;
  degraded: boolean;
}

// ───────────────────────── Enveloppe d'erreur ─────────────────────────

export interface ApiError {
  ok: false;
  error: string;
  code:
    | 'BAD_REQUEST'
    | 'NOT_FOUND'
    | 'LLM_UNAVAILABLE'
    | 'REPO_UNREACHABLE'
    | 'INTERNAL';
  details?: unknown;
}
