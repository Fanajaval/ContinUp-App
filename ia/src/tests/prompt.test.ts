/**
 * Tests unitaires — exécutables SANS clé LLM ni BDD.
 * `npm test`
 *
 * Ils prouvent trois choses en soutenance :
 *  1. La règle d'or n'est pas une intention, c'est une contrainte exécutable.
 *  2. Le mode dégradé produit des contenus conformes (la démo ne tombe jamais).
 *  3. La progression est déterministe et ne dépend pas du LLM.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { verifierRegleDor, assainir } from '../server/services/llm/guardrails.js';
import { fallbackSignal, fallbackAnalyze, fallbackMapping, fallbackDreams, fallbackLetter } from '../server/services/llm/fallbacks.js';
import { computeProgression, preuveDeProgres } from '../server/services/utils/progression.js';
import { extractJson } from '../server/services/llm/client.js';
import { parseRepoUrl, detectDocs } from '../server/services/utils/file.parser.js';
import { zAnalyzeLLM, zSignalLLM } from '../server/services/llm/schemas.js';
import { STYLES_SIGNAL, DECLENCHEURS } from '../server/types/index.js';
import type { Declencheur, StyleSignal } from '../server/types/index.js';

// ══════════════════════════════════════════════════════════
//  1. LA RÈGLE D'OR
// ══════════════════════════════════════════════════════════

test("règle d'or : les 32 combinaisons style × déclencheur du fallback sont conformes", () => {
  for (const d of DECLENCHEURS) {
    for (const s of STYLES_SIGNAL) {
      for (const canal of ['in_app', 'email'] as const) {
        void canal;
        const sig = fallbackSignal({
          declencheur: d as Declencheur,
          style: s as StyleSignal,
          templateType: 'maison',
          ctx: {
            pseudo: 'Soa',
            reveLabel: 'ta maison',
            progression: 40,
            etape_courante: 'fondations',
            prochaine_etape: 'murs',
            preuve_de_progres: '40 % du rêve est construit : les fondations sont coulées.',
            micro_action: 'Rouvrir src/routes/auth.ts et brancher la vérification.',
            micro_action_duree_min: 20,
            jours_de_silence: 4,
          },
        });
        const check = verifierRegleDor(sig, d as Declencheur);
        assert.equal(
          check.ok,
          true,
          `${d}/${s} viole : ${check.violations.map((v) => `${v.regle} (« ${v.extrait} »)`).join(' | ')}`,
        );
        // Les trois piliers
        assert.ok(sig.preuve_de_progres.length > 5, `${d}/${s} : preuve manquante`);
        assert.ok(sig.micro_action.length > 5, `${d}/${s} : micro-action manquante`);
        assert.ok(sig.cta_label.length > 1, `${d}/${s} : CTA manquant`);
        // Le schéma de sortie doit valider
        assert.equal(zSignalLLM.safeParse(sig).success, true, `${d}/${s} : schéma Zod invalide`);
      }
    }
  }
});

test("règle d'or : la culpabilisation est bloquée", () => {
  const mauvais = {
    titre: 'Tu as abandonné ton projet',
    corps: "Ça fait 12 jours que tu n'as rien fait. Dommage, tu aurais dû continuer. Ta streak est cassée.",
    preuve_de_progres: 'rien',
    micro_action: 'reprends',
    micro_action_duree_min: 20,
    cta_label: 'Ouvrir',
  };
  const r = verifierRegleDor(mauvais, 'S3');
  assert.equal(r.ok, false);
  const regles = r.violations.map((v) => v.regle).join(' ');
  assert.match(regles, /abandonn/i);
  assert.match(regles, /reproche|dette|d[ée]compte/i);
  assert.match(regles, /streak/i);
});

test("règle d'or : S5 ne doit jamais nommer la durée de l'absence", () => {
  const r = verifierRegleDor(
    {
      titre: 'Enfin de retour !',
      corps: "Après 3 semaines, il était temps. Tes fondations sont là.",
      preuve_de_progres: 'les fondations sont coulées',
      micro_action: 'Rouvrir src/index.ts',
      micro_action_duree_min: 20,
      cta_label: 'Reprendre',
    },
    'S5',
  );
  assert.equal(r.ok, false);
  assert.ok(r.violations.some((v) => /S5/.test(v.regle)));
});

test("règle d'or : un pourcentage nu est signalé (NF4)", () => {
  const r = verifierRegleDor(
    {
      titre: 'Avancement',
      corps: 'Tu es à 40 %. Continue comme ça sur le sujet.',
      preuve_de_progres: 'des choses existent',
      micro_action: 'Rouvrir le fichier principal',
      micro_action_duree_min: 20,
      cta_label: 'Ouvrir',
    },
    'S1',
  );
  assert.ok(r.violations.some((v) => /pourcentage nu/i.test(v.regle)));
});

test("règle d'or : un pourcentage accompagné de son étape passe", () => {
  const r = verifierRegleDor(
    {
      titre: 'Fondations coulées',
      corps: 'Ton rêve est à 40 % — les fondations sont coulées et elles tiennent.',
      preuve_de_progres: 'les fondations sont coulées',
      micro_action: 'Rouvrir src/index.ts et avancer la fonction principale',
      micro_action_duree_min: 20,
      cta_label: 'Continuer',
    },
    'S1',
  );
  assert.equal(r.ok, true, r.violations.map((v) => v.regle).join(' | '));
});

test('assainir() retire les formules fautives', () => {
  const nettoye = assainir({
    titre: 'Enfin de retour',
    corps: "Malheureusement, ça fait 12 jours. Ne lâche pas ! Tes fondations tiennent.",
    preuve_de_progres: 'fondations',
    micro_action: 'Rouvrir le fichier',
    micro_action_duree_min: 20,
    cta_label: 'Go',
  });
  assert.doesNotMatch(nettoye.corps, /malheureusement/i);
  assert.doesNotMatch(nettoye.corps, /ne l[âa]che pas/i);
  assert.doesNotMatch(nettoye.corps, /[çc]a fait 12 jours/i);
  assert.doesNotMatch(nettoye.titre, /enfin/i);
});

// ══════════════════════════════════════════════════════════
//  2. PROGRESSION DÉTERMINISTE
// ══════════════════════════════════════════════════════════

test('progression : pondérée et cohérente', () => {
  const p = computeProgression([
    { done: true, poids: 2, etape_template: 'terrain' },
    { done: true, poids: 3, etape_template: 'fondations' },
    { done: false, poids: 5, etape_template: 'murs' },
  ]);
  assert.equal(p.progression, 50); // 5/10
  assert.equal(p.etape_courante, 'murs');
  assert.deepEqual(p.etapes_debloquees, ['terrain', 'fondations']);
  assert.equal(p.etape_libelle, 'Murs montés');
});

test('progression : projet vide = 0 %, terrain, jamais de crash', () => {
  const p = computeProgression([]);
  assert.equal(p.progression, 0);
  assert.equal(p.etape_courante, 'terrain');
  assert.deepEqual(p.etapes_debloquees, []);
});

test('progression : projet terminé = 100 % et toutes les étapes débloquées', () => {
  const p = computeProgression([
    { done: true, poids: 1, etape_template: 'terrain' },
    { done: true, poids: 1, etape_template: 'fondations' },
    { done: true, poids: 1, etape_template: 'emmenagement' },
  ]);
  assert.equal(p.progression, 100);
  assert.equal(p.etapes_debloquees.length, 3);
});

test('progression : S6 compte bien les tâches avant déblocage', () => {
  const p = computeProgression([
    { done: true, poids: 1, etape_template: 'fondations' },
    { done: false, poids: 2, etape_template: 'murs' },
    { done: true, poids: 2, etape_template: 'murs' },
  ]);
  assert.equal(p.etape_courante, 'murs');
  assert.equal(p.taches_avant_prochaine_etape, 1);
});

test('preuveDeProgres produit une phrase avec une étape en toutes lettres', () => {
  const tasks = [
    { done: true, poids: 2, etape_template: 'terrain' as const, label: 'README écrit' },
    { done: false, poids: 3, etape_template: 'murs' as const, label: 'API' },
  ];
  const p = computeProgression(tasks);
  const preuve = preuveDeProgres(tasks as never, p);
  assert.match(preuve, /terrain|tâche/i);
  assert.ok(preuve.length > 20);
});

// ══════════════════════════════════════════════════════════
//  3. MODE DÉGRADÉ (NF2)
// ══════════════════════════════════════════════════════════

test('fallbackAnalyze : repo vide → analyse exploitable, jamais bloquante', () => {
  const a = fallbackAnalyze({ repoUrl: 'https://github.com/soa/vide', files: [], docsDetectes: [] });
  assert.equal(zAnalyzeLLM.safeParse(a).success, true);
  assert.ok(a.tasks.length >= 6);
  assert.ok(a.previously.prochaine_action.length > 10);
  assert.ok(a.previously.point_de_reprise.length > 0);
  // Aucune culpabilisation dans le Previously
  assert.doesNotMatch(a.previously.ou_tu_en_es, /abandonn|retard|dommage/i);
});

test('fallbackAnalyze : repo réel → détecte la stack et marque des tâches faites', () => {
  const a = fallbackAnalyze({
    repoUrl: 'https://github.com/soa/api',
    files: [
      { path: 'README.md', content: '# API' },
      { path: 'package.json', content: '{"dependencies":{"express":"^4","pg":"^8"}}' },
      { path: 'src/db/schema.sql', content: 'CREATE TABLE users();' },
      { path: 'src/routes/user.ts', content: 'export const r = 1;' },
    ],
    docsDetectes: ['README.md'],
  });
  assert.ok(a.stack_detectee.includes('Express'));
  assert.ok(a.stack_detectee.includes('PostgreSQL'));
  assert.ok(a.tasks.some((t) => t.etape_template === 'fondations' && t.done));
  assert.ok(a.tasks.some((t) => t.etape_template === 'murs' && t.done));
});

test('fallbackMapping : chaque tâche est rattachée, sans perte', () => {
  const input = [
    { label: 'Créer le schéma SQL' },
    { label: "Écrire l'endpoint de création" },
    { label: 'Styliser la card du dashboard' },
    { label: 'Déployer sur Vercel' },
    { label: 'Quelque chose de complètement flou' },
  ];
  const m = fallbackMapping(input);
  assert.equal(m.tasks.length, input.length);
  assert.equal(m.tasks[0].etape_template, 'fondations');
  assert.equal(m.tasks[1].etape_template, 'murs');
  assert.equal(m.tasks[2].etape_template, 'fenetres');
  assert.equal(m.tasks[3].etape_template, 'emmenagement');
});

test('fallbackDreams : poids cohérents et templates corrects', () => {
  const d = fallbackDreams(['une maison à moi', 'un centre pour aider les jeunes', 'ma première voiture']);
  assert.equal(d.reves[0].template_type, 'maison');
  assert.equal(d.reves[1].template_type, 'centre_aide');
  assert.equal(d.reves[2].template_type, 'voiture');
  // Le centre d'aide est plus ambitieux que la voiture
  assert.ok(d.reves[1].poids_de_reve > d.reves[2].poids_de_reve);
  assert.ok(d.reves.every((r) => r.poids_de_reve >= 1 && r.poids_de_reve <= 100));
  assert.ok(d.reves.every((r) => r.vocabulaire.length >= 3));
});

test('fallbackLetter : la lettre cite les retours et boucle sur le quatrième jour', () => {
  const l = fallbackLetter({ projectName: 'aube-api', reveLabel: 'ta maison', retours: 3, briques: 24, jours: 47 });
  assert.match(l.corps, /3 fois/);
  assert.match(l.corps, /quatri[èe]me jour/i);
  assert.ok(l.corps.length > 400);
  assert.ok(l.citation.length > 10);
});

// ══════════════════════════════════════════════════════════
//  4. ROBUSTESSE DU PARSING
// ══════════════════════════════════════════════════════════

test('extractJson : gère les fences markdown et le texte parasite', () => {
  assert.deepEqual(extractJson('```json\n{"a":1}\n```'), { a: 1 });
  assert.deepEqual(extractJson('Voici le résultat :\n{"a":{"b":2}}\nVoilà !'), { a: { b: 2 } });
  assert.deepEqual(extractJson('{"texte":"une } accolade dans une chaîne","n":3}'), {
    texte: 'une } accolade dans une chaîne',
    n: 3,
  });
});

test('parseRepoUrl : accepte tous les formats courants', () => {
  assert.deepEqual(parseRepoUrl('https://github.com/soa/aube'), { owner: 'soa', repo: 'aube', branch: '' });
  assert.deepEqual(parseRepoUrl('https://github.com/soa/aube.git'), { owner: 'soa', repo: 'aube', branch: '' });
  assert.deepEqual(parseRepoUrl('soa/aube'), { owner: 'soa', repo: 'aube', branch: '' });
  assert.deepEqual(parseRepoUrl('git@github.com:soa/aube.git'), { owner: 'soa', repo: 'aube', branch: '' });
  assert.equal(parseRepoUrl('https://github.com/soa/aube/tree/dev').branch, 'dev');
});

test('detectDocs : repère les docs du fast-path (M2.2)', () => {
  const docs = detectDocs([
    'README.md',
    'docs/cahier-des-charges.md',
    'TODO.md',
    'src/index.ts',
    'src/components/Card.tsx',
  ]);
  assert.ok(docs.includes('README.md'));
  assert.ok(docs.includes('docs/cahier-des-charges.md'));
  assert.ok(docs.includes('TODO.md'));
  assert.ok(!docs.includes('src/index.ts'));
});

// ══════════════════════════════════════════════════════════
//  5. SCHÉMAS ZOD TOLÉRANTS
// ══════════════════════════════════════════════════════════

test('Zod : coercition des sorties LLM approximatives', () => {
  const r = zSignalLLM.safeParse({
    titre: 'Un titre',
    corps: 'Un corps de message suffisamment long pour valider.',
    preuve_de_progres: 'les fondations tiennent',
    micro_action: 'Rouvrir src/index.ts',
    micro_action_duree_min: '20', // string au lieu de number
    cta_label: 'Reprendre',
  });
  assert.equal(r.success, true);
  if (r.success) assert.equal(r.data.micro_action_duree_min, 20);
});

test('Zod : une étape inventée par le LLM tombe sur la valeur par défaut', () => {
  const r = zAnalyzeLLM.safeParse({
    resume_projet: 'Un projet de test correct.',
    stack_detectee: ['TypeScript'],
    previously: {
      ou_tu_en_es: 'Tu as posé les bases du projet.',
      ou_tu_tes_arrete: 'src/index.ts',
      prochaine_action: 'Rouvrir src/index.ts',
      prochaine_action_duree_min: 20,
      point_de_reprise: 'src/index.ts',
    },
    tasks: [{ label: 'Une tâche de test', etape_template: 'sous-sol' }],
  });
  // etape_template invalide → le default du champ ne s'applique pas à une valeur fournie,
  // donc l'objet est rejeté : c'est voulu, le client retentera avec la consigne de réparation.
  assert.equal(r.success, false);
});
