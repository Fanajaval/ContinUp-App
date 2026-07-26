require("dotenv").config();
const { Sequelize } = require("sequelize");

/**
 * Connexion PostgreSQL via Sequelize.
 * Priorité : DATABASE_URL, sinon variables DB_* séparées.
 */
const databaseUrl = process.env.DATABASE_URL;

const sequelize = databaseUrl
  ? new Sequelize(databaseUrl, {
      dialect: "postgres",
      logging: false,
    })
  : new Sequelize(
      process.env.DB_NAME || "restart",
      process.env.DB_USER || "postgres",
      String(process.env.DB_PASSWORD ?? ""),
      {
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.DB_PORT) || 5432,
        dialect: "postgres",
        logging: false,
      }
    );

module.exports = sequelize;
