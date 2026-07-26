/**
 * Smoke test bout en bout — `npm run smoke` (serveur démarré à côté).
 * Frappe toutes les routes du contrat d'API et affiche les sorties.
 * Fonctionne SANS clé LLM et SANS BDD : c'est le filet de sécurité de la démo.
 */
import 'dotenv/config';

const BASE = process.env.SMOKE_BASE ?? `http://localhost:${process.env.PORT ?? 4000}`;

const c = {
  ok: (s: string) => `\x1b[32m${s}\x1b[0m`,
  ko: (s: string) => `\x1b[31m${s}\x1b[0m`,
  dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
  b: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

let pass = 0;
let fail = 0;

/* eslint-disable @typescript-eslint/no-explicit-any */
type Any = any;

async function call(method: string, path: string, body?: unknown): Promise<{ status: number; json: Any }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: await res.json().catch(() => null) };
}

function check(nom: string, cond: boolean, detail = '') {
  if (cond) {
    pass++;
    console.log(`  ${c.ok('✓')} ${nom} ${c.dim(detail)}`);
  } else {
    fail++;
    console.log(`  ${c.ko('✗')} ${nom} ${c.dim(detail)}`);
  }
}

async function main() {
  console.log(c.b('\n🔔 SMOKE TEST — Le Quatrième Jour · partie A\n'));

  // ── /health ──
  const health = await call('GET', '/health');
  check('GET /health', health.status === 200, `LLM ${health.json?.llm?.offline ? 'hors ligne' : health.json?.llm?.model} · BDD ${health.json?.db?.reachable ? 'ok' : 'absente'}`);

  // ── M1.3 rêves ──
  console.log(c.b('\n── M1.3 · Portefeuille de rêves ──'));
  const dreams = await call('POST', '/api/dreams/analyze', {
    userId: 'smoke-user',
    reves: ['une maison à moi', "un centre d'aide pour le quartier", 'ma première voiture'],
    force: true,
  });
  check('POST /api/dreams/analyze', dreams.status === 200 && dreams.json?.reves?.length === 3);
  for (const r of dreams.json?.reves ?? []) {
    console.log(`     ${r.label_normalise} → ${r.template_type}, poids ${r.poids_de_reve}, ${r.categorie}`);
  }

  // ── M2 analyse ──
  console.log(c.b('\n── M2 · Analyse de repo (fichiers fournis, pas de réseau) ──'));
  const analyze = await call('POST', '/api/analyze', {
    projectId: 'smoke-proj',
    repoUrl: 'https://github.com/soa/aube-api',
    templateType: 'maison',
    reveLabel: 'une maison à moi',
    force: true,
    files: [
      { path: 'README.md', content: '# Aube API\nUne API pour suivre mes projets.' },
      { path: 'package.json', content: '{"dependencies":{"express":"^4.21.0","pg":"^8.13.0"}}' },
      { path: 'src/db/schema.sql', content: 'CREATE TABLE project (id uuid primary key);' },
      { path: 'src/routes/project.ts', content: "import { Router } from 'express';\nexport const r = Router();" },
    ],
  });
  check('POST /api/analyze', analyze.status === 200 && Array.isArray(analyze.json?.tasks));
  check('  fast-path détecté (README)', (analyze.json?.docs_detectes ?? []).includes('README.md'));
  check('  Previously complet', Boolean(analyze.json?.previously?.prochaine_action && analyze.json?.previously?.point_de_reprise));
  check('  étape sémantique présente (NF4)', Boolean(analyze.json?.etape_libelle));
  console.log(`     progression : ${analyze.json?.progression} % — ${analyze.json?.etape_libelle}`);
  console.log(`     prochaine action : ${analyze.json?.previously?.prochaine_action}`);
  console.log(`     ${analyze.json?.tasks?.length} tâches · mode ${analyze.json?.degraded ? 'dégradé' : 'IA'}`);

  // ── M3.3 mapping ──
  console.log(c.b('\n── M3.3 · Mapping tâches → étapes ──'));
  const map = await call('POST', '/api/map', {
    projectId: 'smoke-proj',
    templateType: 'maison',
    reveLabel: 'une maison à moi',
    force: true,
    tasks: [
      { label: 'Créer le schéma SQL', done: true, poids: 3 },
      { label: "Écrire l'endpoint de création de projet", done: false, poids: 3 },
      { label: 'Styliser la card du dashboard', done: false, poids: 2 },
      { label: 'Déployer sur Vercel', done: false, poids: 3 },
    ],
  });
  check('POST /api/map', map.status === 200 && map.json?.tasks?.length === 4);
  check('  calques renvoyés pour B', Array.isArray(map.json?.calques) && map.json.calques.length === 8);
  for (const t of map.json?.tasks ?? []) {
    console.log(`     ${t.label} → ${t.etape_template} ${c.dim(`(${t.raison})`)}`);
  }

  // ── référentiel template ──
  const tpl = await call('GET', '/api/template/maison');
  check('GET /api/template/maison', tpl.status === 200 && tpl.json?.etapes?.length === 8);

  // ── M1.4 préviews ──
  console.log(c.b('\n── M1.4 · Préviews de style (instantané, 0 token) ──'));
  const prev = await call('GET', '/api/signal/preview?reve=ta%20maison');
  check('GET /api/signal/preview', prev.status === 200 && prev.json?.previews?.length === 4);
  for (const p of prev.json?.previews ?? []) {
    console.log(`     ${c.b(p.style.padEnd(12))} « ${p.titre} »`);
  }

  // ── M4 signaux ──
  console.log(c.b('\n── M4 · LE SIGNAL (le joyau) ──'));
  for (const d of ['S1', 'S3', 'S5', 'S6'] as const) {
    const sig = await call('POST', '/api/signal', {
      projectId: 'smoke-proj',
      declencheur: d,
      style: d === 'S3' ? 'motivant' : 'gamer',
      canal: d === 'S3' ? 'email' : 'in_app',
      force: true,
      contexte: {
        pseudo: 'Soa',
        reveLabel: 'ta maison',
        templateType: 'maison',
        progression: 45,
        etape_courante: 'fondations',
        prochaine_etape: 'murs',
        taches_avant_deblocage: 1,
        preuve_de_progres: '45 % du rêve est construit : les fondations sont coulées.',
        micro_action: 'Rouvrir src/routes/project.ts et écrire la route POST.',
        micro_action_duree_min: 20,
        jours_de_silence: 4,
      },
    });
    const ok = sig.status === 200 && sig.json?.regle_dor_ok === true;
    check(`POST /api/signal (${d})`, ok, sig.json?.audit?.violations?.length ? `⚠ ${sig.json.audit.violations.map((v: { regle: string }) => v.regle).join(', ')}` : '');
    console.log(`     ${c.b(sig.json?.titre)}`);
    console.log(`     ${sig.json?.corps}`);
    console.log(`     ${c.dim(`→ ${sig.json?.cta_label} · ${sig.json?.micro_action_duree_min} min`)}`);
    if (d === 'S3') {
      check('  email composé (S3)', Boolean(sig.json?.email_body?.includes('👉')));
      console.log(c.dim(`\n${(sig.json?.email_body ?? '').split('\n').map((l: string) => `       ${l}`).join('\n')}\n`));
    }
  }

  // ── audit QA ──
  console.log(c.b('\n── QA · Validateur règle d\'or ──'));
  const audit = await call('POST', '/api/signal/audit', {
    declencheur: 'S3',
    titre: 'Tu as abandonné ton projet',
    corps: "Ça fait 12 jours que tu n'as rien fait. Dommage. Ta streak est cassée.",
    preuve_de_progres: '',
    micro_action: '',
  });
  check('POST /api/signal/audit rejette un message toxique', audit.json?.ok === false, `${audit.json?.violations?.length} violations détectées`);
  for (const v of audit.json?.violations ?? []) console.log(`     ${c.ko('✗')} ${v.regle} — « ${v.extrait} »`);

  // ── M7 lettre ──
  console.log(c.b('\n── M7 · Lettre venue du futur ──'));
  const letter = await call('POST', '/api/letter', {
    projectId: 'smoke-proj',
    pseudo: 'Soa',
    projectName: 'aube-api',
    reveLabel: 'une maison à moi',
    templateType: 'maison',
    force: true,
    parcours: { jours_total: 47, nb_retours_apres_silence: 3, plus_long_silence_jours: 9, nb_briques: 24, xp_total: 86 },
    moments_cles: ['Les fondations coulées un dimanche soir', 'Le retour après neuf jours de silence'],
  });
  check('POST /api/letter', letter.status === 200 && (letter.json?.corps?.length ?? 0) > 200);
  console.log(`\n     ${c.b(letter.json?.titre ?? '')}`);
  console.log(c.dim((letter.json?.corps ?? '').split('\n').map((l: string) => `     ${l}`).join('\n')));
  console.log(`     ${c.b(`« ${letter.json?.citation} »`)}`);
  console.log(`     ${letter.json?.signature}\n`);

  // ── diff ──
  const diff = await call('POST', '/api/analyze/diff', {
    projectId: 'smoke-proj',
    changedPaths: ['src/routes/project.ts', 'src/services/project.service.ts'],
    commitMessages: ['feat: route de création de projet'],
    tasks: [
      { label: "Écrire l'endpoint de création de projet", done: false, poids: 3, etape_template: 'murs' },
      { label: 'Déployer sur Vercel', done: false, poids: 3, etape_template: 'emmenagement' },
    ],
  });
  check('POST /api/analyze/diff', diff.status === 200 && Array.isArray(diff.json?.doneLabels), `→ ${JSON.stringify(diff.json?.doneLabels)}`);

  console.log(c.b(`\n${fail === 0 ? c.ok('✅ TOUT EST VERT') : c.ko(`❌ ${fail} ÉCHEC(S)`)} — ${pass} ok, ${fail} ko\n`));
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(c.ko(`\n💥 Le serveur répond-il sur ${BASE} ? (npm run dev)\n`), e.message);
  process.exit(1);
});
