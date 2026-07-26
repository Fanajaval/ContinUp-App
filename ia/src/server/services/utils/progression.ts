/**
 * Calcul de progression pondérée + étape courante.
 * Déterministe, testable, ZÉRO appel IA : c'est la partie qui doit
 * toujours fonctionner même quand le LLM est down (NF2).
 *
 * Règle M3.4 : la progression ne régresse jamais côté BDD (GREATEST à l'écriture).
 */
import { ETAPES_MAISON, LIBELLES_ETAPES } from '../../types/index.js';
import type { EtapeMaison } from '../../types/index.js';

export interface TaskLike {
  done: boolean;
  poids: number;
  etape_template: EtapeMaison;
}

export interface ProgressionResult {
  progression: number;
  etape_courante: EtapeMaison;
  etape_libelle: string;
  etapes_debloquees: EtapeMaison[];
  taches_avant_prochaine_etape: number;
  prochaine_etape: EtapeMaison | null;
  /** Détail par étape, pour les calques de B. */
  par_etape: { etape: EtapeMaison; libelle: string; total: number; done: number; complete: boolean }[];
}

export function computeProgression(tasks: TaskLike[]): ProgressionResult {
  const par_etape = ETAPES_MAISON.map((etape) => {
    const list = tasks.filter((t) => t.etape_template === etape);
    const total = list.reduce((s, t) => s + (t.poids || 1), 0);
    const done = list.filter((t) => t.done).reduce((s, t) => s + (t.poids || 1), 0);
    return {
      etape,
      libelle: LIBELLES_ETAPES[etape],
      total,
      done,
      // Une étape sans aucune tâche n'est pas "complète" : elle est neutre
      complete: total > 0 && done === total,
    };
  });

  const poidsTotal = tasks.reduce((s, t) => s + (t.poids || 1), 0);
  const poidsDone = tasks.filter((t) => t.done).reduce((s, t) => s + (t.poids || 1), 0);
  const progression = poidsTotal === 0 ? 0 : Math.round((poidsDone / poidsTotal) * 100);

  const etapes_debloquees = par_etape.filter((e) => e.complete).map((e) => e.etape);

  // Étape courante = la première étape non complète qui a des tâches ;
  // si tout est complet, la dernière étape ayant des tâches.
  const etapesAvecTaches = par_etape.filter((e) => e.total > 0);
  const premiereIncomplete = etapesAvecTaches.find((e) => !e.complete);
  const etape_courante: EtapeMaison =
    premiereIncomplete?.etape ??
    etapesAvecTaches[etapesAvecTaches.length - 1]?.etape ??
    'terrain';

  // Combien de tâches restent avant que l'étape courante ne se débloque (S6)
  const restantes = tasks.filter((t) => t.etape_template === etape_courante && !t.done).length;

  const idx = ETAPES_MAISON.indexOf(etape_courante);
  const prochaine_etape =
    premiereIncomplete && idx >= 0 ? etape_courante : idx + 1 < ETAPES_MAISON.length ? ETAPES_MAISON[idx + 1] : null;

  return {
    progression,
    etape_courante,
    etape_libelle: LIBELLES_ETAPES[etape_courante],
    etapes_debloquees,
    taches_avant_prochaine_etape: restantes,
    prochaine_etape,
    par_etape,
  };
}

/** Résumé lisible des acquis → alimente la "preuve de progrès" des Signaux (M4.3). */
export function preuveDeProgres(tasks: TaskLike[] & { label?: string }[], p: ProgressionResult): string {
  const faites = (tasks as { done: boolean; label?: string }[]).filter((t) => t.done);
  const etapesTxt = p.etapes_debloquees.length
    ? p.etapes_debloquees.map((e) => LIBELLES_ETAPES[e].toLowerCase()).join(', ')
    : null;

  if (etapesTxt) {
    return `${p.progression} % du rêve est construit : ${etapesTxt}. ${faites.length} tâche${faites.length > 1 ? 's' : ''} déjà bouclée${faites.length > 1 ? 's' : ''}.`;
  }
  if (faites.length) {
    const derniere = faites[faites.length - 1]?.label;
    return `${faites.length} tâche${faites.length > 1 ? 's' : ''} déjà faite${faites.length > 1 ? 's' : ''}${derniere ? `, dont « ${derniere} »` : ''} — le chantier est ouvert.`;
  }
  return "Le dépôt existe et le plan est écrit : la première pierre est prête à être posée.";
}
