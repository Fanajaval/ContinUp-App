const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Modèle User — aligné sur database/init.sql
 * (VARCHAR role DEFAULT 'USER', photo TEXT, timestamps created_at/updated_at)
 */
const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    github_id: {
      type: DataTypes.STRING(64),
      allowNull: true,
      unique: true,
    },
    github_username: {
      type: DataTypes.STRING(39),
      allowNull: true,
      unique: true,
    },
    photo: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    bio: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "user",
    },
    xp_total: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    style_signal: {
      type: DataTypes.STRING(20),
      allowNull: false,
      defaultValue: "motivant",
    },
  },
  {
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  }
);

module.exports = User;
