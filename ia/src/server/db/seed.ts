/**
 * Seed de démo côté A : 1 utilisateur, 3 rêves, 3 projets dans les 3 états
 * (actif 🔥 / silencieux 🕯️ / achevé 🏆) + tâches réalistes.
 * Complète les seeds de C ; suffit pour tester /api/signal sans dépendre de personne.
 */
import 'dotenv/config';
import { pool, DB_ENABLED, closeDb } from './client.js';

const TASKS_DEMO = [
  ['Poser le cadre du projet dans le README', true, 1, 'terrain', 20],
  ['Choisir et installer la stack technique', true, 2, 'terrain', 30],
  ['Définir le schéma de données', true, 3, 'fondations', 60],
  ['Mettre en place la connexion à la base', true, 2, 'fondations', 40],
  ['Écrire la logique métier principale', false, 4, 'murs', 120],
  ["Exposer les routes de l'API", false, 3, 'murs', 60],
  ['Relier le front et le back', false, 3, 'toit', 90],
  ['Construire les écrans principaux', false, 3, 'fenetres', 90],
  ["Soigner l'entrée dans l'application", false, 2, 'porte', 45],
  ['Écrire quelques tests', false, 2, 'jardin', 60],
  ['Mettre le projet en ligne', false, 3, 'emmenagement', 60],
] as const;

async function main() {
  if (!DB_ENABLED || !pool) {
    console.error('❌ DATABASE_URL absent.');
    process.exit(1);
  }

  const u = await pool.query(
    `INSERT INTO "user" (pseudo, email, style_signal, xp_total)
     VALUES ('Soa', 'soa@quatriemejour.dev', 'motivant', 42)
     ON CONFLICT (email) DO UPDATE SET pseudo = EXCLUDED.pseudo
     RETURNING id`,
  );
  const userId = u.rows[0].id;

  const reves = [
    ['Une maison à moi', 'habitat', 70, 'maison'],
    ['Un centre d\'aide pour le quartier', 'impact_social', 92, 'centre_aide'],
    ['Ma première voiture', 'mobilite', 40, 'voiture'],
  ];
  const reveIds: string[] = [];
  for (const [label, cat, poids, tpl] of reves) {
    const r = await pool.query(
      `INSERT INTO reve (user_id, label, categorie, poids_de_reve, template_type)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (user_id, label) DO UPDATE SET poids_de_reve = EXCLUDED.poids_de_reve
       RETURNING id`,
      [userId, label, cat, poids, tpl],
    );
    reveIds.push(r.rows[0].id);
  }

  const projets = [
    ['https://github.com/soa/aube-api', 'maison', 'actif', 45, 'Fondations coulées', "NOW() - INTERVAL '2 hours'", reveIds[0]],
    ['https://github.com/soa/centre-quartier', 'centre_aide', 'silencieux', 27, 'Fondations coulées', "NOW() - INTERVAL '5 days'", reveIds[1]],
    ['https://github.com/soa/memoire-2024', 'voiture', 'acheve', 100, 'Emménagement', "NOW() - INTERVAL '1 day'", reveIds[2]],
  ] as const;

  for (const [repo, tpl, statut, prog, etape, activite, reveId] of projets) {
    const p = await pool.query(
      `INSERT INTO project (user_id, reve_id, repo_url, template_type, statut, progression, etape_semantique, derniere_activite)
       VALUES ($1,$2,$3,$4,$5,$6,$7, ${activite})
       RETURNING id`,
      [userId, reveId, repo, tpl, statut, prog, etape],
    );
    const pid = p.rows[0].id;

    const acheve = statut === 'acheve';
    for (const [label, done, poids, etapeT, duree] of TASKS_DEMO) {
      await pool.query(
        `INSERT INTO task (project_id, label, done, poids, etape_template, duree_estimee)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [pid, label, acheve ? true : done, poids, etapeT, duree],
      );
    }

    await pool.query(
      `INSERT INTO doc (project_id, type, contenu_json, source, valide)
       VALUES ($1,'previously',$2::jsonb,'genere',true)`,
      [
        pid,
        JSON.stringify({
          ou_tu_en_es: 'Les fondations sont coulées : le schéma de données tient debout et la connexion fonctionne.',
          ou_tu_tes_arrete: 'Dans src/services/signal.service.ts, sur la logique métier.',
          prochaine_action: "Rouvrir src/services/signal.service.ts et écrire la première fonction de génération.",
          prochaine_action_duree_min: 20,
          point_de_reprise: 'src/services/signal.service.ts',
        }),
      ],
    );

    console.log(`  • projet ${statut.padEnd(11)} ${pid}  (${repo})`);
  }

  console.log(`\n✅ Seed terminé. userId = ${userId}`);
  await closeDb();
}

main().catch((e) => {
  console.error('❌ Seed échoué :', e.message);
  process.exit(1);
});
