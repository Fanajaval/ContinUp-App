const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = sequelize.define(
  "Reve",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    label: { type: DataTypes.STRING(160), allowNull: false },
    categorie: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "Projet personnel" },
    poids_de_reve: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 1 },
    statut: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "en_cours" },
  },
  { tableName: "reves", timestamps: false }
);
