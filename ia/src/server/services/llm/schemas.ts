/**
 * Validation Zod de TOUTES les sorties LLM (NF2).
 * Règle : le LLM ne parle jamais directement au front. Il passe par ici.
 * Chaque schéma est tolérant à l'entrée (coercition, defaults) mais strict à la sortie.
 */
import { z } from 'zod';
import { ETAPES_MAISON, STYLES_SIGNAL, DECLENCHEURS, CATEGORIES_REVE, TEMPLATE_TYPES } from '../../types/index.js';

export const zEtape = z.enum(ETAPES_MAISON);
export const zTemplateType = z.enum(TEMPLATE_TYPES);
export const zStyle = z.enum(STYLES_SIGNAL);
export const zDeclencheur = z.enum(DECLENCHEURS);
export const zCategorie = z.enum(CATEGORIES_REVE);

/** Le LLM renvoie parfois "3" ou 3.7 → on normalise en entier borné. */
const poids = z.coerce.number().min(1).max(5).transform((n) => Math.round(n));
const duree = z.coerce.number().min(5).max(240).transform((n) => Math.round(n));

// ─────────────── M2 : analyse de repo ───────────────

export const zTaskLLM = z.object({
  label: z.string().min(3).max(160),
  poids: poids.default(2),
  done: z.coerce.boolean().default(false),
  etape_template: zEtape.default('fondations'),
  duree_estimee_min: duree.default(20),
  preuve: z.string().max(300).optional(),
});

export const zPreviouslyLLM = z.object({
  ou_tu_en_es: z.string().min(10).max(600),
  ou_tu_tes_arrete: z.string().min(5).max(400),
  prochaine_action: z.string().min(5).max(300),
  prochaine_action_duree_min: duree.default(20),
  point_de_reprise: z.string().min(1).max(200).default('README.md'),
});

export const zAnalyzeLLM = z.object({
  resume_projet: z.string().min(10).max(1200),
  stack_detectee: z.array(z.string().max(40)).max(15).default([]),
  previously: zPreviouslyLLM,
  tasks: z.array(zTaskLLM).min(1).max(30),
});
export type AnalyzeLLM = z.infer<typeof zAnalyzeLLM>;

// ─────────────── M3.3 : mapping ───────────────

export const zMappedTaskLLM = z.object({
  label: z.string().min(1).max(200),
  etape_template: zEtape,
  poids: poids.default(2),
  raison: z.string().max(200).default(''),
});

export const zMappingLLM = z.object({
  tasks: z.array(zMappedTaskLLM).min(1).max(60),
});
export type MappingLLM = z.infer<typeof zMappingLLM>;

// ─────────────── M4 : signaux ───────────────

export const zSignalLLM = z.object({
  titre: z.string().min(3).max(90),
  corps: z.string().min(20).max(1200),
  preuve_de_progres: z.string().min(5).max(400),
  micro_action: z.string().min(5).max(300),
  micro_action_duree_min: duree.default(20),
  cta_label: z.string().min(2).max(40).default('Reprendre'),
});
export type SignalLLM = z.infer<typeof zSignalLLM>;

// ─────────────── M7 : lettre du futur ───────────────

export const zLetterLLM = z.object({
  titre: z.string().min(3).max(120),
  corps: z.string().min(150).max(4000),
  citation: z.string().min(10).max(220),
  signature: z.string().min(2).max(80).default('— ton projet, depuis le futur'),
});
export type LetterLLM = z.infer<typeof zLetterLLM>;

// ─────────────── M1.3 : portefeuille de rêves ───────────────

export const zDreamLLM = z.object({
  label: z.string().min(1).max(120),
  label_normalise: z.string().min(1).max(120),
  categorie: zCategorie.default('autre'),
  poids_de_reve: z.coerce.number().min(1).max(100).transform((n) => Math.round(n)),
  template_type: zTemplateType.default('generique'),
  vocabulaire: z.array(z.string().max(40)).max(12).default([]),
});

export const zDreamsLLM = z.object({
  reves: z.array(zDreamLLM).min(1).max(20),
});
export type DreamsLLM = z.infer<typeof zDreamsLLM>;

// ─────────────── Validation des requêtes entrantes ───────────────

export const zAnalyzeRequest = z.object({
  projectId: z.string().min(1),
  repoUrl: z.string().min(1),
  files: z
    .array(z.object({ path: z.string(), content: z.string(), size: z.number().optional() }))
    .optional(),
  templateType: zTemplateType.optional(),
  reveLabel: z.string().max(200).optional(),
  force: z.boolean().optional(),
});

export const zMappingRequest = z.object({
  projectId: z.string().min(1),
  templateType: zTemplateType.default('maison'),
  reveLabel: z.string().max(200).optional(),
  tasks: z
    .array(
      z.object({
        id: z.string().optional(),
        label: z.string().min(1),
        done: z.boolean().optional(),
        poids: z.number().optional(),
      }),
    )
    .min(1),
  force: z.boolean().optional(),
});

export const zSignalRequest = z.object({
  projectId: z.string().min(1),
  declencheur: zDeclencheur,
  style: zStyle.default('motivant'),
  canal: z.enum(['in_app', 'email']).default('in_app'),
  contexte: z
    .object({
      pseudo: z.string().max(60).optional(),
      reveLabel: z.string().max(200).optional(),
      templateType: zTemplateType.optional(),
      projectName: z.string().max(160).optional(),
      progression: z.number().min(0).max(100).optional(),
      etape_courante: zEtape.optional(),
      preuve_de_progres: z.string().max(400).optional(),
      micro_action: z.string().max(300).optional(),
      micro_action_duree_min: z.number().optional(),
      jours_de_silence: z.number().min(0).max(3650).optional(),
      taches_avant_deblocage: z.number().min(0).optional(),
      prochaine_etape: zEtape.optional(),
      relance_index: z.number().min(0).max(5).optional(),
    })
    .default({}),
  force: z.boolean().optional(),
});

export const zLetterRequest = z.object({
  projectId: z.string().min(1),
  pseudo: z.string().max(60).optional(),
  reveLabel: z.string().max(200).optional(),
  projectName: z.string().max(160).optional(),
  templateType: zTemplateType.optional(),
  parcours: z
    .object({
      jours_total: z.number().optional(),
      nb_retours_apres_silence: z.number().optional(),
      plus_long_silence_jours: z.number().optional(),
      nb_briques: z.number().optional(),
      xp_total: z.number().optional(),
    })
    .optional(),
  moments_cles: z.array(z.string().max(200)).max(12).optional(),
  force: z.boolean().optional(),
});

export const zDreamsRequest = z.object({
  userId: z.string().min(1),
  reves: z.array(z.string().min(1).max(200)).min(1).max(20),
  force: z.boolean().optional(),
});
