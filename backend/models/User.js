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
      defaultValue: "USER",
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
