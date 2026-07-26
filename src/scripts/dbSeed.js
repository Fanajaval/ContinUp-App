/**
 * Script de seed — données de démo
 * Usage: npm run db:seed
 *
 * Crée : 2 comptes, 4 projets (actif 🔥 / silencieux 🕯️ / achevé 🏆 / vide)
 */
const { query, transaction, shutdown } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // 1. Créer les utilisateurs
    const passwordHash = await bcrypt.hash('password123', 12);

    // Soa — développeuse débutante (le persona de la lettre)
    const soa = await query(
      `INSERT INTO users (pseudo, email, password_hash, style_signal, xp_total, rang)
       VALUES ('soa_dev', 'soa@example.com', $1, 'motivant', 42, 3)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [passwordHash]
    );
    const soaId = soa.rows[0]?.id || (await query(`SELECT id FROM users WHERE email = 'soa@example.com'`, [])).rows[0].id;

    // Marc — développeur expérimenté
    const marc = await query(
      `INSERT INTO users (pseudo, email, password_hash, style_signal, xp_total, rang)
       VALUES ('marc_builder', 'marc@example.com', $1, 'sarcastique', 87, 1)
       ON CONFLICT (email) DO NOTHING
       RETURNING id`,
      [passwordHash]
    );
    const marcId = marc.rows[0]?.id || (await query(`SELECT id FROM users WHERE email = 'marc@example.com'`, [])).rows[0].id;

    console.log(`  👤 Users: Soa (${soaId}), Marc (${marcId})`);

    // 2. Créer les rêves
    const reves = [
      { userId: soaId, label: 'Ma maison familiale', categorie: 'maison', poids: 2.5 },
      { userId: soaId, label: 'Centre d\'aide pour enfants', categorie: 'centre_aide', poids: 3.0 },
      { userId: marcId, label: 'Villa de vacances à Nosy Be', categorie: 'villa', poids: 2.0 },
      { userId: marcId, label: 'Voiture de sport', categorie: 'voiture', poids: 1.5 },
    ];

    const reveIds = {};
    for (const reve of reves) {
      const result = await query(
        `INSERT INTO reves (user_id, label, categorie, poids_de_reve)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [reve.userId, reve.label, reve.categorie, reve.poids]
      );
      reveIds[reve.label] = result.rows[0].id;
    }
    console.log(`  💭 Rêves: ${Object.keys(reveIds).length} créés`);

    // 3. Créer les projets

    // Projet 1 — Soa : ACTIF 🔥 (maison, 35%)
    const p1 = await query(
      `INSERT INTO projects (user_id, reve_id, repo_url, repo_name, template_type, statut, progression, etape_semantique, derniere_activite, total_commits)
       VALUES ($1, $2, 'https://github.com/soa-dev/maison-app', 'soa-dev/maison-app', 'maison', 'actif', 35, 'Murs montés', NOW() - INTERVAL '2 hours', 12)
       RETURNING id`,
      [soaId, reveIds['Ma maison familiale']]
    );
    const p1Id = p1.rows[0].id;

    // Projet 2 — Soa : SILENCIEUX 🕯️ (centre d'aide, 15%)
    const p2 = await query(
      `INSERT INTO projects (user_id, reve_id, repo_url, repo_name, template_type, statut, progression, etape_semantique, derniere_activite, total_commits)
       VALUES ($1, $2, 'https://github.com/soa-dev/centre-aide', 'soa-dev/centre-aide', 'centre_aide', 'silencieux', 15, 'Fondations coulées', NOW() - INTERVAL '5 days', 4)
       RETURNING id`,
      [soaId, reveIds['Centre d\'aide pour enfants']]
    );
    const p2Id = p2.rows[0].id;

    // Projet 3 — Marc : ACHEVÉ 🏆 (villa, 100%)
    const p3 = await query(
      `INSERT INTO projects (user_id, reve_id, repo_url, repo_name, template_type, statut, progression, etape_semantique, derniere_activite, total_commits)
       VALUES ($1, $2, 'https://github.com/marc-builder/villa-nosybe', 'marc-builder/villa-nosybe', 'villa', 'acheve', 100, 'Emménagement', NOW() - INTERVAL '1 day', 45)
       RETURNING id`,
      [marcId, reveIds['Villa de vacances à Nosy Be']]
    );
    const p3Id = p3.rows[0].id;

    // Projet 4 — Marc : ACTIF 🔥 (voiture, 60%)
    const p4 = await query(
      `INSERT INTO projects (user_id, reve_id, repo_url, repo_name, template_type, statut, progression, etape_semantique, derniere_activite, total_commits)
       VALUES ($1, $2, 'https://github.com/marc-builder/sportscar', 'marc-builder/sportscar', 'voiture', 'actif', 60, 'Intérieur installé', NOW() - INTERVAL '30 minutes', 28)
       RETURNING id`,
      [marcId, reveIds['Voiture de sport']]
    );
    const p4Id = p4.rows[0].id;

    console.log(`  🏗️  Projects: 4 créés (actif 🔥, silencieux 🕯️, achevé 🏆, actif 🔥)`);

    // 4. Créer des tâches pour chaque projet

    // Tâches projet 1 (maison — 35% = murs)
    const p1Tasks = [
      { label: 'Configurer le projet React', etape: 'terrain', done: true, poids: 1 },
      { label: 'Créer le schéma BDD', etape: 'fondations', done: true, poids: 1.5 },
      { label: 'Authentification JWT', etape: 'fondations', done: true, poids: 2 },
      { label: 'API des projets', etape: 'murs', done: true, poids: 2 },
      { label: 'API des rêves', etape: 'murs', done: false, poids: 1.5 },
      { label: 'Frontend dashboard', etape: 'toit', done: false, poids: 3 },
      { label: 'Système de signaux', etape: 'fenetres', done: false, poids: 2.5 },
      { label: 'Tests E2E', etape: 'porte', done: false, poids: 2 },
      { label: 'Déploiement', etape: 'jardin', done: false, poids: 1.5 },
    ];

    for (let i = 0; i < p1Tasks.length; i++) {
      await query(
        `INSERT INTO tasks (project_id, label, done, poids, etape_template, duree_estimee, position)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [p1Id, p1Tasks[i].label, p1Tasks[i].done, p1Tasks[i].poids, p1Tasks[i].etape, 20, i]
      );
    }

    // 5. Créer des events
    await query(
      `INSERT INTO events (project_id, type, xp_earned, meta, created_at) VALUES
       ($1, 'brique', 1, '{"summary": "API projets créée"}', NOW() - INTERVAL '3 hours'),
       ($1, 'brique', 1, '{"summary": "Auth JWT implémentée"}', NOW() - INTERVAL '2 hours'),
       ($2, 'brique', 1, '{"summary": "Schema BDD créé"}', NOW() - INTERVAL '5 days')`,
      [p1Id, p2Id]
    );

    // Event retour pour Marc (il est revenu après silence sur p4)
    await query(
      `INSERT INTO events (project_id, type, xp_earned, meta) VALUES ($1, 'retour', 5, '{"reason": "return after silence"})`,
      [p4Id]
    );

    // Event finition pour Marc (p3 achevé)
    await query(
      `INSERT INTO events (project_id, type, xp_earned, meta) VALUES ($1, 'finition', 5, '{"completedAt": "2025-01-15"})`,
      [p3Id]
    );

    console.log(`  📊 Events + Tasks: créés`);

    // 6. Créer des docs
    await query(
      `INSERT INTO docs (project_id, type, contenu_json, source, valide) VALUES
       ($1, 'resume', $2, 'genere', true),
       ($3, 'resume', $4, 'genere', true)`,
      [
        p1Id, JSON.stringify({
          resume: 'Application web de gestion de projets avec suivi de progression',
          previously: { ou_tu_en_es: 'API backend en cours', derniere_action: 'API projets terminée', prochaine_action: 'Créer l\'API des rêves' },
          progression: 35,
          etape_semantique: 'Murs montés',
        }),
        p2Id, JSON.stringify({
          resume: 'Plateforme pour le centre d\'aide aux enfants',
          previously: { ou_tu_en_es: 'Début du backend', derniere_action: 'Schéma BDD créé', prochaine_action: 'Configurer le serveur' },
          progression: 15,
          etape_semantique: 'Fondations coulées',
        }),
      ]
    );

    // 7. Créer des signaux
    await query(
      `INSERT INTO signals (project_id, declencheur, style, contenu, canal, envoye_le) VALUES
       ($1, 'S1', 'motivant', '🧱 Super ! Les murs sont montés ! Tu avances vraiment bien, Soa. Prochaine étape : l''API des rêves — une petite fonction et c''est fait ! 💪', 'in-app', NOW() - INTERVAL '2 hours'),
       ($2, 'S3', 'motivant', 'Hey Soa 👋 Ton centre d''aide n''attend que toi ! Tu as déjà coulé les fondations (15%) — c''est du concret. Une petite config de serveur et les fondations seront validées. Tu veux essayer ? 🏗️', 'email', NOW() - INTERVAL '3 days')`,
      [p1Id, p2Id]
    );

    console.log(`  🔔 Signals: créés`);
    console.log('\n✅ Seed completed!');
    console.log('\n📋 Comptes de test:');
    console.log('   Soa  → soa@example.com / password123');
    console.log('   Marc → marc@example.com / password123');
    console.log('\n🏗️  Projets:');
    console.log(`   1. ${p1Id} — maison-app (actif 🔥, 35%)`);
    console.log(`   2. ${p2Id} — centre-aide (silencieux 🕯️, 15%)`);
    console.log(`   3. ${p3Id} — villa-nosybe (achevé 🏆, 100%)`);
    console.log(`   4. ${p4Id} — sportscar (actif 🔥, 60%)`);

  } catch (error) {
    console.error('❌ Seed failed:', error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await shutdown();
  }
}

seed();
