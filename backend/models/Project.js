const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

module.exports = sequelize.define(
  "Project",
  {
    id: { type: DataTypes.BIGINT, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT, allowNull: false },
    reve_id: { type: DataTypes.BIGINT, allowNull: false },
    repo_url: { type: DataTypes.STRING(500), allowNull: false },
    repo_nom: { type: DataTypes.STRING(160), allowNull: false },
    template_type: { type: DataTypes.STRING(30), allowNull: false, defaultValue: "generique" },
    statut: { type: DataTypes.STRING(20), allowNull: false, defaultValue: "vide" },
    progression: { type: DataTypes.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
    etape_semantique: { type: DataTypes.STRING(160), allowNull: false, defaultValue: "Le terrain est prêt" },
    etapes_done: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    derniere_activite: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    xp_projet: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    prochaine_action: { type: DataTypes.STRING(300), allowNull: true },
    // Résultat persistant de l'analyse du dépôt par le service IA.
    objectif: { type: DataTypes.TEXT, allowNull: true },
    ai_tasks: { type: DataTypes.JSONB, allowNull: false, defaultValue: [] },
    ai_analyzed_at: { type: DataTypes.DATE, allowNull: true },
    ai_degraded: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  },
  { tableName: "projects", timestamps: false }
);
