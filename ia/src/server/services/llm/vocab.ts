/**
 * Vocabulaire partagé prompts ↔ fallbacks (évite un import circulaire).
 */
import { ETAPES_MAISON, LIBELLES_ETAPES } from '../../types/index.js';
import { TEMPLATE_VOCAB } from './prompts.js';
import type { EtapeMaison, TemplateType } from '../../types/index.js';

export { ETAPES_MAISON, LIBELLES_ETAPES };

const NOMS: Record<TemplateType, string> = {
  maison: 'maison',
  villa: 'villa',
  voiture: 'voiture',
  centre_aide: "centre d'accueil",
  generique: 'projet',
};

export const TEMPLATE_VOCAB_KEYS: Record<
  TemplateType,
  { nom: string; etapes: Record<EtapeMaison, string> }
> = Object.fromEntries(
  (Object.keys(NOMS) as TemplateType[]).map((t) => [t, { nom: NOMS[t], etapes: TEMPLATE_VOCAB[t] }]),
) as Record<TemplateType, { nom: string; etapes: Record<EtapeMaison, string> }>;
