require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "API Le Quatrième Jour" });
});

app.use("/api/auth", authRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route introuvable" });
});

module.exports = app;
