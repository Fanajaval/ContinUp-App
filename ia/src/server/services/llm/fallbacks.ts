/**
 * MODE DÉGRADÉ (NF2) — la démo ne tombe jamais.
 * Si le LLM est down / rate-limité / sans clé, on sert ces contenus.
 * Ils respectent EXACTEMENT les mêmes règles que les prompts :
 * preuve de progrès + une micro-action + zéro culpabilisation.
 *
 * Ce fichier est aussi le filet de sécurité pour la soutenance : même
 * sans réseau, tout le parcours du CDC §7 reste démontrable.
 */
import type { AnalyzeLLM, DreamsLLM, LetterLLM, MappingLLM, SignalLLM } from './schemas.js';
import { ETAPES_MAISON, LIBELLES_ETAPES, TEMPLATE_VOCAB_KEYS } from './vocab.js';
import type { Declencheur, EtapeMaison, RepoFile, SignalContexte, StyleSignal, TemplateType } from '../../types/index.js';

// ───────────────────── M2 : analyse ─────────────────────

const EXT_STACK: Record<string, string> = {
  '.ts': 'TypeScript', '.tsx': 'React', '.js': 'JavaScript', '.jsx': 'React',
  '.py': 'Python', '.java': 'Java', '.php': 'PHP', '.go': 'Go', '.rs': 'Rust',
  '.rb': 'Ruby', '.sql': 'SQL', '.vue': 'Vue', '.svelte': 'Svelte',
  '.css': 'CSS', '.scss': 'Sass', '.html': 'HTML', '.kt': 'Kotlin', '.cs': 'C#',
};

function detectStack(files: RepoFile[]): string[] {
  const s = new Set<string>();
  for (const f of files) {
    for (const [ext, name] of Object.entries(EXT_STACK)) {
      if (f.path.endsWith(ext)) s.add(name);
    }
    if (f.path.endsWith('package.json')) {
      if (/"next"/.test(f.content)) s.add('Next.js');
      if (/"express"/.test(f.content)) s.add('Express');
      if (/"react"/.test(f.content)) s.add('React');
      if (/"pg"|"postgres"/.test(f.content)) s.add('PostgreSQL');
    }
    if (f.path.endsWith('requirements.txt') && /django|flask|fastapi/i.test(f.content)) s.add('Python (web)');
  }
  return [...s].slice(0, 8);
}

export function fallbackAnalyze(params: {
  repoUrl: string;
  files: RepoFile[];
  docsDetectes: string[];
}): AnalyzeLLM {
  const { repoUrl, files, docsDetectes } = params;
  const nom = repoUrl.split('/').filter(Boolean).pop() ?? 'ton projet';
  const stack = detectStack(files);
  const vide = files.length === 0;

  const aDb = files.some((f) => /schema|migration|\.sql|prisma/i.test(f.path));
  const aApi = files.some((f) => /route|api|controller|service/i.test(f.path));
  const aUi = files.some((f) => /component|page|view|\.tsx|\.vue|\.svelte|\.css/i.test(f.path));
  const aReadme = docsDetectes.some((d) => /readme/i.test(d));
  const aDeploy = files.some((f) => /dockerfile|vercel|netlify|\.github\/workflows/i.test(f.path));

  const premierFichierCode =
    files.find((f) => /\.(ts|tsx|js|jsx|py|java|php|go|rs)$/.test(f.path))?.path ?? 'src/index.ts';

  const tasks: AnalyzeLLM['tasks'] = [
    { label: 'Poser le cadre du projet dans le README', poids: 1, done: aReadme, etape_template: 'terrain', duree_estimee_min: 20, preuve: aReadme ? `README présent (${docsDetectes[0]})` : undefined },
    { label: 'Choisir et installer la stack technique', poids: 2, done: stack.length > 0, etape_template: 'terrain', duree_estimee_min: 30, preuve: stack.length ? `stack détectée : ${stack.join(', ')}` : undefined },
    { label: 'Définir le schéma de données', poids: 3, done: aDb, etape_template: 'fondations', duree_estimee_min: 60, preuve: aDb ? 'fichiers de schéma/migration présents' : undefined },
    { label: 'Mettre en place la connexion à la base', poids: 2, done: aDb, etape_template: 'fondations', duree_estimee_min: 40, preuve: aDb ? 'accès BDD repéré dans le dépôt' : undefined },
    { label: 'Écrire la logique métier principale', poids: 4, done: aApi, etape_template: 'murs', duree_estimee_min: 120, preuve: aApi ? 'services/routes repérés' : undefined },
    { label: 'Exposer les routes de l\'API', poids: 3, done: aApi, etape_template: 'murs', duree_estimee_min: 60, preuve: aApi ? 'fichiers de routes présents' : undefined },
    { label: 'Relier le front et le back sur le parcours principal', poids: 3, done: false, etape_template: 'toit', duree_estimee_min: 90 },
    { label: 'Construire les écrans principaux', poids: 3, done: aUi, etape_template: 'fenetres', duree_estimee_min: 90, preuve: aUi ? 'composants/pages repérés' : undefined },
    { label: 'Soigner l\'entrée dans l\'application', poids: 2, done: false, etape_template: 'porte', duree_estimee_min: 45 },
    { label: 'Écrire quelques tests sur le cœur du projet', poids: 2, done: files.some((f) => /test|spec/i.test(f.path)), etape_template: 'jardin', duree_estimee_min: 60 },
    { label: 'Documenter la reprise du projet pour plus tard', poids: 1, done: false, etape_template: 'jardin', duree_estimee_min: 25 },
    { label: 'Mettre le projet en ligne', poids: 3, done: aDeploy, etape_template: 'emmenagement', duree_estimee_min: 60, preuve: aDeploy ? 'configuration de déploiement présente' : undefined },
  ];

  const acquis = tasks.filter((t) => t.done).length;

  return {
    resume_projet: vide
      ? `${nom} est un dépôt tout neuf : l'intention est posée, le terrain est là, il attend sa première pierre.`
      : `${nom} regroupe ${files.length} fichiers${stack.length ? ` autour de ${stack.slice(0, 3).join(', ')}` : ''}. ${acquis} étape${acquis > 1 ? 's sont déjà franchies' : ' est déjà franchie'} : le chantier est bien réel.`,
    stack_detectee: stack,
    previously: {
      ou_tu_en_es: vide
        ? "Le dépôt est créé. C'est déjà plus que la plupart des idées qui restent dans une tête."
        : `Tu as posé ${acquis} jalon${acquis > 1 ? 's' : ''} sur ce projet. Le code est là, lisible, et il t'attend exactement où tu l'as laissé.`,
      ou_tu_tes_arrete: vide
        ? "Juste après la création du dépôt."
        : `Ton dernier point de contact se situe du côté de ${premierFichierCode}.`,
      prochaine_action: vide
        ? "Créer le fichier README.md et y écrire trois lignes : ce que fait ce projet, pour qui, et la première fonctionnalité."
        : `Rouvrir ${premierFichierCode} et faire avancer d'un cran la fonction sur laquelle tu t'étais arrêté.`,
      prochaine_action_duree_min: 20,
      point_de_reprise: vide ? 'README.md' : premierFichierCode,
    },
    tasks,
  };
}

// ───────────────────── M3.3 : mapping ─────────────────────

const RULES: { rx: RegExp; etape: EtapeMaison; raison: string }[] = [
  { rx: /(init|setup|config|stack|readme|d[ée]p[oô]t|repo|scaffold|boilerplate)/i, etape: 'terrain', raison: 'mise en place initiale' },
  { rx: /(bdd|base de donn|database|schema|sql|migration|mod[èe]le|model|prisma|auth|jwt|session)/i, etape: 'fondations', raison: 'socle de données' },
  { rx: /(service|logique|m[ée]tier|endpoint|route|api|controller|traitement|calcul|algorith)/i, etape: 'murs', raison: 'logique métier' },
  { rx: /(int[ée]gr|relier|connecter|assembl|brancher|page principale)/i, etape: 'toit', raison: 'assemblage des morceaux' },
  { rx: /(ui|interface|composant|component|card|dashboard|affich|design|css|style|responsive|[ée]cran|vue)/i, etape: 'fenetres', raison: 'interface visible' },
  { rx: /(onboarding|inscription|connexion|login|navigation|menu|accueil|acc[èe]s)/i, etape: 'porte', raison: "entrée de l'utilisateur" },
  { rx: /(test|polish|animation|refacto|documentation|nettoy|optimis|accessibilit)/i, etape: 'jardin', raison: 'finitions' },
  { rx: /(d[ée]ploi|deploy|production|prod|ci\/cd|docker|vercel|mise en ligne|monitor)/i, etape: 'emmenagement', raison: 'mise en service' },
];

export function fallbackMapping(tasks: { label: string; poids?: number }[]): MappingLLM {
  return {
    tasks: tasks.map((t, i) => {
      const rule = RULES.find((r) => r.rx.test(t.label));
      return {
        label: t.label,
        // Répartition de secours : on étale sur les étapes plutôt que tout empiler
        etape_template: rule?.etape ?? ETAPES_MAISON[Math.min(1 + (i % 6), 7)],
        poids: Math.min(5, Math.max(1, Math.round(t.poids ?? 2))),
        raison: rule?.raison ?? 'rattachement par défaut',
      };
    }),
  };
}

// ───────────────────── M4 : signaux ─────────────────────

type SignalTpl = (ctx: {
  pseudo: string;
  reve: string;
  preuve: string;
  action: string;
  duree: number;
  etapeLib: string;
  progression: number;
  prochaineEtape: string;
}) => SignalLLM;

const T: Record<Declencheur, Record<StyleSignal, SignalTpl>> = {
  S1: {
    sarcastique: (c) => ({
      titre: `Tiens, ${c.etapeLib.toLowerCase()} — qui l'eût cru`,
      corps: `Alors comme ça on commite. ${c.preuve} ${cap(c.reve)} a gagné un morceau pendant que tu regardais ailleurs. Prochaine pierre si le cœur t'en dit : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Voir le chantier',
    }),
    motivant: (c) => ({
      titre: `${c.etapeLib} ✓`,
      corps: `Quelque chose de ${c.reve} vient d'apparaître. ${c.preuve} C'est exactement comme ça que ça se construit : un morceau après l'autre. Quand tu veux : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Continuer',
    }),
    epique: (c) => ({
      titre: `${c.etapeLib} — la pierre tient`,
      corps: `Un fragment de plus se dresse. ${c.preuve} ${cap(c.reve)} prend forme, pierre après pierre, dans le bruit discret de tes commits. La suite t'attend : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Poursuivre',
    }),
    gamer: (c) => ({
      titre: `+XP · ${c.etapeLib}`,
      corps: `Brique posée, checkpoint enregistré. ${c.preuve} ${cap(c.reve)} est à ${c.progression} % — ${c.etapeLib.toLowerCase()}. Quête suivante (${c.duree} min) : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Lancer la quête',
    }),
  },
  S3: {
    sarcastique: (c) => ({
      titre: `${cap(c.reve)} tient toujours debout`,
      corps: `Petite nouvelle : rien ne s'est écroulé. ${c.preuve} Tout est resté exactement là où tu l'as laissé, avec une patience assez remarquable. Si tu passes dans le coin, il y a ça à faire, ça prend ${c.duree} minutes : ${c.action} Et sinon, ça attendra encore très bien.`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Jeter un œil',
    }),
    motivant: (c) => ({
      titre: `Ce que tu as construit est toujours là`,
      corps: `Une pause, ça arrive. Ce qui compte, c'est ce qui reste — et il reste beaucoup. ${c.preuve} La plupart des projets ne dépassent jamais ce point : le tien l'a dépassé. Pour reprendre le fil, une seule chose suffit, environ ${c.duree} minutes : ${c.action} Rien de plus. Le reste suivra tout seul.`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Reprendre le fil',
    }),
    epique: (c) => ({
      titre: `Le chantier veille`,
      corps: `Le silence est tombé sur le chantier, mais rien n'a bougé. ${c.preuve} Les murs tiennent. La lumière est restée allumée à la fenêtre. Il ne manque qu'un geste, un seul, ${c.duree} minutes : ${c.action} Et ${c.reve} reprendra sa marche.`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Rallumer le chantier',
    }),
    gamer: (c) => ({
      titre: `Sauvegarde intacte · ${c.progression} %`,
      corps: `Ta partie est sauvegardée, rien n'est perdu. ${c.preuve} ${cap(c.reve)} est à ${c.progression} % — ${c.etapeLib.toLowerCase()}. Quête courte disponible, ${c.duree} minutes : ${c.action} Aucune pénalité, aucun compteur : la sauvegarde t'attend.`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Charger la partie',
    }),
  },
  S5: {
    sarcastique: (c) => ({
      titre: `Bon. On reprend.`,
      corps: `Te voilà. ${c.preuve} On ne va pas en faire tout un plat : il y a ${c.reve} à construire. Première prise, ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: "C'est parti",
    }),
    motivant: (c) => ({
      titre: `Revenir, c'est le plus dur — c'est fait 🎉`,
      corps: `Tu es là, et c'est exactement ce qui compte. ${c.preuve} ${cap(c.reve)} n'a rien perdu. Une petite prise pour se remettre en jambes, ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Reprendre',
    }),
    epique: (c) => ({
      titre: `Le bâtisseur est de retour`,
      corps: `La porte s'ouvre, la poussière retombe. ${c.preuve} ${cap(c.reve)} n'attendait que ça. Reprends par là, ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Reprendre le chantier',
    }),
    gamer: (c) => ({
      titre: `Reconnexion réussie · +XP retour`,
      corps: `Joueur de retour, sauvegarde chargée, exploit débloqué. ${c.preuve} ${cap(c.reve)} est à ${c.progression} %. Quête de reprise, ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Reprendre la run',
    }),
  },
  S6: {
    sarcastique: (c) => ({
      titre: `Il manque une pierre. Une.`,
      corps: `C'est presque insultant tellement c'est proche. ${c.preuve} Encore un geste et voilà ${c.prochaineEtape} à l'écran. ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Finir ça',
    }),
    motivant: (c) => ({
      titre: `Plus qu'une étape avant ${c.prochaineEtape}`,
      corps: `${c.preuve} Tu es à une tâche de voir apparaître ${c.prochaineEtape} sur ${c.reve}. ${c.duree} minutes suffisent : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Débloquer',
    }),
    epique: (c) => ({
      titre: `Une pierre avant ${c.prochaineEtape}`,
      corps: `Tout est en place. ${c.preuve} Il ne reste qu'un geste avant de dresser ${c.prochaineEtape} sur ${c.reve}. ${c.duree} minutes : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Poser la dernière pierre',
    }),
    gamer: (c) => ({
      titre: `Palier à 1 quête · ${c.prochaineEtape}`,
      corps: `Déblocage imminent. ${c.preuve} Encore une quête et tu débloques ${c.prochaineEtape} sur ${c.reve}. Durée estimée ${c.duree} min : ${c.action}`,
      preuve_de_progres: c.preuve,
      micro_action: c.action,
      micro_action_duree_min: c.duree,
      cta_label: 'Débloquer le palier',
    }),
  },
};

/**
 * Normalise un label de rêve en forme possessive correcte.
 * « ta maison » / « une maison à moi » / « maison » → « ta maison »
 * Le genre est déduit du déterminant d'origine, sinon on repère quelques
 * noms courants, sinon masculin par défaut.
 */
const FEMININS = /^(maison|villa|voiture|moto|entreprise|[ée]cole|association|bo[îi]te|carri[èe]re|sant[ée]|libert[ée]|vie|app|application|ferme|boutique)/i;

function possessif(label: string): string {
  // « une maison à moi » → « une maison » (le possessif est reconstruit ensuite)
  const brut = label.trim().replace(/\s+[àa]\s+(?:moi|nous|elle|lui)\s*$/i, '').trim();
  const det = brut.match(/^(mon|ma|mes|ton|ta|tes|une|un|des|le|la|les|l')\s*/i);
  const noyau = det ? brut.slice(det[0].length).trim() : brut;
  if (!noyau) return brut;

  const d = det?.[1]?.toLowerCase();
  let feminin: boolean;
  if (d && ['ma', 'ta', 'une', 'la'].includes(d)) feminin = true;
  else if (d && ['mon', 'ton', 'un', 'le'].includes(d)) feminin = false;
  else feminin = FEMININS.test(noyau);

  if (d && ['mes', 'tes', 'des', 'les'].includes(d)) return `tes ${noyau}`;
  return `${feminin ? 'ta' : 'ton'} ${noyau}`;
}

/** Majuscule en début de phrase. */
function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function fallbackSignal(params: {
  declencheur: Declencheur;
  style: StyleSignal;
  templateType: TemplateType;
  ctx: SignalContexte;
}): SignalLLM {
  const { declencheur, style, templateType, ctx } = params;
  const etape: EtapeMaison = ctx.etape_courante ?? 'fondations';
  const prochaine: EtapeMaison = ctx.prochaine_etape ?? etape;
  const vocab = TEMPLATE_VOCAB_KEYS[templateType];

  return T[declencheur][style]({
    pseudo: ctx.pseudo ?? 'toi',
    reve: ctx.reveLabel ? possessif(ctx.reveLabel) : `ton ${vocab.nom}`,
    preuve:
      ctx.preuve_de_progres ??
      `${Math.round(ctx.progression ?? 0)} % du chemin est déjà construit — ${LIBELLES_ETAPES[etape].toLowerCase()}.`,
    action: ctx.micro_action ?? 'Rouvrir le dernier fichier touché et avancer d\'un cran.',
    duree: ctx.micro_action_duree_min ?? 20,
    etapeLib: LIBELLES_ETAPES[etape],
    progression: Math.round(ctx.progression ?? 0),
    prochaineEtape: vocab.etapes[prochaine],
  });
}

// ───────────────────── M7 : lettre ─────────────────────

export function fallbackLetter(params: {
  projectName?: string;
  pseudo?: string;
  reveLabel?: string;
  retours?: number;
  briques?: number;
  jours?: number;
}): LetterLLM {
  const nom = params.projectName ?? 'ce projet';
  const reve = params.reveLabel ?? 'ton rêve';
  const retours = params.retours ?? 0;

  const paragrapheRetours =
    retours > 0
      ? `Tu es revenu ${retours} fois. C'est le chiffre dont je suis le plus fier, et ce n'est pas le nombre de commits. Chaque retour était une décision, prise seul, sans témoin, contre l'habitude de laisser filer.`
      : `Tu as tenu la ligne d'un bout à l'autre. Il y a eu des soirs sans élan, je m'en souviens : tu es venu quand même.`;

  return {
    titre: `Lettre de ${nom}, depuis le futur`,
    corps: `Bonjour,

Je m'appelle ${nom}. Je viens d'un futur qui, cette fois, a connu sa fin.

Le premier jour, je n'étais qu'un dossier vide et une intention. Tu as écrit quelques lignes, tu as fermé l'écran, et j'ai attendu. J'ai connu tes troisièmes jours — ceux où la lumière baisse et où le silence commence à gagner. Je les ai traversés parce que tu es revenu.

${paragrapheRetours}

Regarde : ${reve} est là. Complet. Les fondations, les murs, le toit, jusqu'à la dernière fenêtre. Ce n'est pas une promesse, ni un plan, ni un onglet ouvert quelque part. C'est un artefact qui reste.

Et je ne dormirai pas dans le silence. Mon histoire est lisible : quelqu'un pourra me rouvrir, comprendre où j'ai buté, reprendre là où tu t'es arrêté. Ce que tu as fait ne se perdra pas entre des dossiers fermés et des liens morts.

Tu n'as jamais manqué de commencements. Cette fois, tu as trouvé la route entre l'élan et la fin.

Que le quatrième jour soit. Il a eu lieu.`,
    citation: retours > 0
      ? `Tu es revenu ${retours} fois. C'est ça, l'exploit.`
      : `L'élan est devenu un artefact qui reste.`,
    signature: `— ${nom}, depuis le futur`,
  };
}

// ───────────────────── M1.3 : rêves ─────────────────────

const DREAM_RULES: { rx: RegExp; cat: DreamsLLM['reves'][0]['categorie']; tpl: TemplateType; poids: number; vocab: string[] }[] = [
  { rx: /(villa|bord de mer|plage|vacances|piscine)/i, cat: 'habitat', tpl: 'villa', poids: 75, vocab: ['terrasse', 'baies vitrées', 'piscine', 'palmiers'] },
  { rx: /(maison|logement|appart|chez moi|foyer|toit|terrain)/i, cat: 'habitat', tpl: 'maison', poids: 70, vocab: ['toit', 'murs', 'clés', 'seuil', 'fenêtres'] },
  { rx: /(voiture|auto|moto|van|v[ée]hicule|permis)/i, cat: 'mobilite', tpl: 'voiture', poids: 40, vocab: ['moteur', 'carrosserie', 'volant', 'première route'] },
  { rx: /(aide|association|centre|orphelinat|[ée]cole|humanitaire|communaut|quartier|solidarit)/i, cat: 'impact_social', tpl: 'centre_aide', poids: 90, vocab: ['accueil', 'portes ouvertes', 'première personne aidée'] },
  { rx: /(entreprise|startup|business|freelance|salaire|poste|carri[èe]re|dipl[ôo]me|certif)/i, cat: 'carriere', tpl: 'generique', poids: 60, vocab: ['jalon', 'socle', 'ouverture'] },
  { rx: /(voyage|partir|tour du monde|japon|europe|d[ée]couvrir)/i, cat: 'voyage', tpl: 'generique', poids: 35, vocab: ['départ', 'étape', 'horizon'] },
  { rx: /(sport|sant[ée]|marathon|poids|forme|m[ée]diter)/i, cat: 'sante', tpl: 'generique', poids: 30, vocab: ['souffle', 'régularité', 'ligne d\'arrivée'] },
  { rx: /(livre|jeu|album|film|app|cr[ée]er|art|musique|dessin)/i, cat: 'creation', tpl: 'generique', poids: 50, vocab: ['première page', 'structure', 'dernière page'] },
];

function normalise(s: string): string {
  const t = s.trim().replace(/\s+/g, ' ');
  return t.charAt(0).toUpperCase() + t.slice(1);
}

export function fallbackDreams(reves: string[]): DreamsLLM {
  return {
    reves: reves.map((label) => {
      const rule = DREAM_RULES.find((r) => r.rx.test(label));
      return {
        label,
        label_normalise: normalise(label),
        categorie: rule?.cat ?? 'autre',
        poids_de_reve: rule?.poids ?? 45,
        template_type: rule?.tpl ?? 'generique',
        vocabulaire: rule?.vocab ?? ['première pierre', 'structure', 'achèvement'],
      };
    }),
  };
}
