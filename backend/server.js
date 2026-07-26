require("dotenv").config();
const app = require("./app");
const sequelize = require("./config/database");
require("./models/User");

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    await sequelize.authenticate();
    console.log("Connexion à la base de données réussie");

    await sequelize.sync();
    console.log("Modèles synchronisés");

    app.listen(PORT, () => {
      console.log(`Serveur démarré sur http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Impossible de démarrer le serveur:", error.message || error);
    console.error("Vérifiez que PostgreSQL est démarré et que la base 'restart' existe (.env).");
    process.exit(1);
  }
}

startServer();
