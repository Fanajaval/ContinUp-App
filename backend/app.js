require("dotenv").config();
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const dashboardRoutes = require("./routes/dashboard.routes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (_req, res) => {
  res.json({ message: "Backend restart fonctionne correctement" });
});

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", message: "Backend restart fonctionne correctement" });
});

app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Route introuvable" });
});

module.exports = app;
