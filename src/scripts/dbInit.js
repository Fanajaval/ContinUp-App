/**
 * Script d'initialisation de la BDD
 * Usage: npm run db:init
 */
const fs = require('fs');
const path = require('path');
const { query, getPool, shutdown } = require('../config/database');

async function initDatabase() {
  console.log('🗄️  Initializing database...');

  try {
    // Lire le fichier SQL
    const sqlPath = path.join(__dirname, '../../sql/init.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    // Exécuter le SQL
    await query(sql);

    console.log('✅ Database initialized successfully!');
    console.log('   Tables created: users, reves, projects, tasks, docs, events, signals');
    console.log('   Indexes created');
    console.log('   Triggers created (updated_at)');
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    process.exit(1);
  } finally {
    await shutdown();
  }
}

initDatabase();
