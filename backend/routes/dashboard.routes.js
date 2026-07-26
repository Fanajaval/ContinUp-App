const express = require("express");
const auth = require("../middlewares/auth");
const controller = require("../controllers/dashboard.controller");

const router = express.Router();
router.get("/dashboard", auth, controller.getDashboard);
router.post("/projects", auth, controller.createProject);
router.get("/projects/:id/analysis", auth, controller.getProjectAnalysis);
router.post("/projects/:id/analyze", auth, controller.analyzeProject);

module.exports = router;
