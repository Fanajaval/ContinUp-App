/**
 * ═══════════════════════════════════════════════════════════════════
 *  LA RÈGLE D'OR, CODÉE EN DUR (M4.3 + M4.7)
 *
 *  Le sujet est explicite : « pas de streak à casser, pas de score,
 *  pas de niveau suivant ». Un LLM finit toujours par déraper vers le
 *  ton coach-productivité. Ce module est le dernier rempart AVANT
 *  l'envoi : il inspecte, corrige ou rejette.
 *
 *  C'est aussi un argument de soutenance : nos interdits ne sont pas
 *  une intention dans un prompt, ce sont des tests exécutables.
 * ═══════════════════════════════════════════════════════════════════
 */
import type { Declencheur, SignalResponse } from '../../types/index.js';
import type { SignalLLM } from './schemas.js';

export interface Violation {
  regle: string;
  extrait: string;
  gravite: 'bloquant' | 'avertissement';
}

/** Mots et tournures bannis dans TOUS les signaux. */
const INTERDITS_GLOBAUX: { rx: RegExp; regle: string }[] = [
  { rx: /\babandonn[ée]?e?s?\b/i, regle: 'Le mot « abandonné » est interdit' },
  { rx: /\b[ée]chec\b|\brat[ée]\b/i, regle: 'Vocabulaire d\'échec interdit' },
  { rx: /\bretard\b|\ben retard\b/i, regle: 'Aucune notion de retard (M4.7)' },
  { rx: /\bdommage\b|\bmalheureusement\b|\bh[ée]las\b/i, regle: 'Ton déceptif interdit' },
  { rx: /\bdiscipline\b|\brigueur\b|\bmotive[- ]toi\b/i, regle: 'Aucune morale sur la discipline' },
  { rx: /tu aurais d[ûu]|il aurait fallu|tu devrais vraiment/i, regle: 'Aucun reproche' },
  { rx: /\bs[ée]rie? (?:bris[ée]e?|cass[ée]e?|perdue)\b|\bstreak\b/i, regle: 'Aucune streak (interdit explicite du sujet)' },
  // La négation est autorisée : « aucune pénalité » rassure, « pénalité » punit.
  { rx: /\bperdu?s? (?:tes |des |vos )?(?:points|xp|niveaux?)\b/i, regle: 'Aucune perte de points (M6.3)' },
  { rx: /(?<!aucune |sans |pas de |zéro |zero )\bp[ée]nalit[ée]s?\b/i, regle: 'Aucune pénalité (M6.3)' },
  { rx: /\bne (?:l[âa]che|abandonne) pas\b|\bcourage\b\s*!/i, regle: 'Injonction motivationnelle creuse interdite' },
  { rx: /\bderni[èe]re? chance\b|\bavant qu'il ne soit trop tard\b/i, regle: 'Aucune urgence artificielle' },
  { rx: /\b(?:tu es|vous êtes) (?:\d+|dernier|derni[èe]re)\s*(?:e?)\s*(?:sur|\/)\s*\d+/i, regle: 'Aucun classement humiliant' },
];

/** Interdits spécifiques au retour (S5) : ne JAMAIS parler de la durée d'absence. */
const INTERDITS_S5: { rx: RegExp; regle: string }[] = [
  { rx: /\benfin\b/i, regle: 'S5 : « enfin » sous-entend un reproche' },
  { rx: /il [ée]tait temps/i, regle: 'S5 : « il était temps » est un reproche' },
  { rx: /apr[èe]s (?:tout ce temps|\d+\s*(?:jours?|semaines?|mois))/i, regle: "S5 : ne jamais nommer la durée de l'absence" },
  { rx: /\d+\s*(?:jours?|semaines?|mois)\s*(?:de\s*)?(?:silence|absence|sans)/i, regle: "S5 : aucune mesure de l'absence" },
  { rx: /\bde retour apr[èe]s\b/i, regle: "S5 : ne pas qualifier la durée du retour" },
];

/** Interdits spécifiques au jour 4 (S3) : la pause n'est pas une dette. */
const INTERDITS_S3: { rx: RegExp; regle: string }[] = [
  { rx: /[çc]a fait (?:d[ée]j[àa] )?\d+\s*(?:jours?|semaines?)/i, regle: 'S3 : ne pas compter les jours comme une dette' },
  { rx: /\d+\s*jours?\s*(?:que|sans|d'inactivit[ée]|de silence)/i, regle: 'S3 : le décompte accusateur est interdit' },
  { rx: /tu n'as (?:rien|pas) (?:fait|touch[ée]|avanc[ée])/i, regle: 'S3 : nier le progrès est interdit' },
  { rx: /\btoujours (?:rien|pas)\b/i, regle: 'S3 : « toujours rien » est un reproche' },
];

/** Détecte un pourcentage NU, sans étape sémantique à proximité (NF4). */
const MOTS_ETAPE = /(terrain|fondation|mur|toit|fen[êe]tre|porte|jardin|emm[ée]nag|construit|chemin|structure|socle|carrosserie|moteur|accueil|baies|terrasse|piscine)/i;

function pourcentageNu(texte: string): string | null {
  const rx = /(\d{1,3})\s*%/g;
  let m: RegExpExecArray | null;
  while ((m = rx.exec(texte))) {
    const fenetre = texte.slice(Math.max(0, m.index - 90), Math.min(texte.length, m.index + 90));
    if (!MOTS_ETAPE.test(fenetre)) return m[0];
  }
  return null;
}

/** Compte les actions proposées : la règle d'or en exige UNE seule. */
function tropDActions(microAction: string): boolean {
  const separateurs = (microAction.match(/\bet (?:aussi|ensuite|puis)\b|\bpuis\b|;/gi) ?? []).length;
  return separateurs >= 2;
}

export function verifierRegleDor(
  signal: SignalLLM,
  declencheur: Declencheur,
): { ok: boolean; violations: Violation[] } {
  const violations: Violation[] = [];
  const texte = `${signal.titre}\n${signal.corps}`;

  const jeux = [
    ...INTERDITS_GLOBAUX,
    ...(declencheur === 'S5' ? INTERDITS_S5 : []),
    ...(declencheur === 'S3' ? INTERDITS_S3 : []),
  ];

  for (const { rx, regle } of jeux) {
    const m = texte.match(rx);
    if (m) violations.push({ regle, extrait: m[0], gravite: 'bloquant' });
  }

  // Les trois piliers de la règle d'or
  if (!signal.preuve_de_progres?.trim()) {
    violations.push({ regle: 'Preuve de progrès obligatoire (M4.3)', extrait: '(vide)', gravite: 'bloquant' });
  }
  if (!signal.micro_action?.trim()) {
    violations.push({ regle: 'Micro-action obligatoire (M4.3)', extrait: '(vide)', gravite: 'bloquant' });
  }
  if (!signal.cta_label?.trim()) {
    violations.push({ regle: 'Lien direct obligatoire (M4.3)', extrait: '(vide)', gravite: 'bloquant' });
  }
  if (signal.micro_action && tropDActions(signal.micro_action)) {
    violations.push({ regle: 'Une SEULE micro-action', extrait: signal.micro_action, gravite: 'avertissement' });
  }

  const nu = pourcentageNu(texte);
  if (nu) {
    violations.push({ regle: 'Pourcentage nu sans étape sémantique (NF4)', extrait: nu, gravite: 'avertissement' });
  }

  if (signal.titre.length > 70) {
    violations.push({ regle: 'Titre trop long (> 70 car.)', extrait: `${signal.titre.length} caractères`, gravite: 'avertissement' });
  }

  return { ok: !violations.some((v) => v.gravite === 'bloquant'), violations };
}

/**
 * Consigne de réparation renvoyée au LLM pour un second essai ciblé.
 */
export function consigneReparation(violations: Violation[]): string {
  return `⚠️ Ton message viole la règle d'or de l'application. Corrige EXACTEMENT ces points et renvoie le JSON :
${violations.map((v) => `- ${v.regle} → passage fautif : « ${v.extrait} »`).join('\n')}
Réécris le message sans ces éléments, en gardant le même ton et la même micro-action.`;
}

/** Nettoyage de dernier recours : on retire les formules fautives les plus courantes. */
export function assainir(signal: SignalLLM): SignalLLM {
  let corps = signal.corps;
  let titre = signal.titre;

  const remplacements: [RegExp, string][] = [
    [/\bmalheureusement,?\s*/gi, ''],
    [/\bdommage,?\s*/gi, ''],
    [/\benfin,?\s+/gi, ''],
    [/il [ée]tait temps[ !.,]*/gi, ''],
    [/[çc]a fait (?:d[ée]j[àa] )?\d+\s*(?:jours?|semaines?)[^.!?]*[.!?]\s*/gi, ''],
    [/\bne l[âa]che pas[ !.,]*/gi, ''],
    [/\bcourage\s*!/gi, ''],
    [/\bapr[èe]s (?:tout ce temps|\d+\s*(?:jours?|semaines?|mois))[,\s]*/gi, ''],
  ];

  for (const [rx, rep] of remplacements) {
    corps = corps.replace(rx, rep);
    titre = titre.replace(rx, rep);
  }

  corps = corps.replace(/\s{2,}/g, ' ').replace(/^\s*[,;.]\s*/, '').trim();
  titre = titre.replace(/\s{2,}/g, ' ').trim();
  if (titre) titre = titre.charAt(0).toUpperCase() + titre.slice(1);
  if (corps) corps = corps.charAt(0).toUpperCase() + corps.slice(1);

  return { ...signal, titre: titre || signal.titre, corps: corps || signal.corps };
}

/** Vérification a posteriori d'une réponse complète (utilisée par les tests de D). */
export function auditSignalResponse(r: SignalResponse): { ok: boolean; violations: Violation[] } {
  return verifierRegleDor(
    {
      titre: r.titre,
      corps: r.corps,
      preuve_de_progres: r.preuve_de_progres,
      micro_action: r.micro_action,
      micro_action_duree_min: r.micro_action_duree_min,
      cta_label: r.cta_label,
    },
    r.declencheur,
  );
}
