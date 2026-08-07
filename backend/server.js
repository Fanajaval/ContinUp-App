const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const app = require("./app");
const sequelize = require("./config/database");
require("./models/User");
require("./models/Reve");
require("./models/Project");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET manquant dans le fichier .env");
    }

    await sequelize.authenticate();
    console.log("✅ Connexion à la base de données réussie");

    // Ne force pas alter:true pour ne pas casser le schéma init.sql
    await sequelize.sync();
    await sequelize.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_id VARCHAR(64) UNIQUE"
    );
    await sequelize.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS github_username VARCHAR(39) UNIQUE"
    );
    await sequelize.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP"
    );
    await sequelize.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS objectif TEXT");
    await sequelize.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_tasks JSONB NOT NULL DEFAULT '[]'::jsonb");
    await sequelize.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_analyzed_at TIMESTAMP");
    await sequelize.query("ALTER TABLE projects ADD COLUMN IF NOT EXISTS ai_degraded BOOLEAN NOT NULL DEFAULT FALSE");
    await sequelize.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS xp_total INTEGER NOT NULL DEFAULT 0");
    await sequelize.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS style_signal VARCHAR(20) NOT NULL DEFAULT 'motivant'");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        xp_earned INTEGER NOT NULL DEFAULT 0,
        label VARCHAR(300) NOT NULL DEFAULT '',
        meta JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`);
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS signals (
        id BIGSERIAL PRIMARY KEY,
        project_id BIGINT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        declencheur VARCHAR(5) NOT NULL,
        style VARCHAR(20) NOT NULL DEFAULT 'motivant',
        contenu JSONB NOT NULL,
        canal VARCHAR(20) NOT NULL DEFAULT 'in_app',
        envoye_le TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        lu BOOLEAN NOT NULL DEFAULT FALSE,
        relance_count INTEGER NOT NULL DEFAULT 0
      )`);
    await sequelize.query("CREATE INDEX IF NOT EXISTS idx_signals_user_id ON signals(user_id)");
    await sequelize.query("CREATE INDEX IF NOT EXISTS idx_events_project_id ON events(project_id)");
    console.log("✅ Modèles synchronisés");

    app.listen(PORT, () => {
      console.log(`🚀 Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Impossible de démarrer le serveur:", error.message || error);
    console.error("Vérifiez que PostgreSQL est démarré et que .env est correct.");
    process.exit(1);
  }
}

startServer();
