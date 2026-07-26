const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });
const app = require("./app");
const sequelize = require("./config/database");
require("./models/User");

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
