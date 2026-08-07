const express = require("express");
const auth = require("../middlewares/auth");
const controller = require("../controllers/dashboard.controller");

const router = express.Router();
router.get("/dashboard", auth, controller.getDashboard);
router.get("/classement", auth, controller.getClassement);
router.post("/projects", auth, controller.createProject);
router.get("/projects/:id/analysis", auth, controller.getProjectAnalysis);
router.post("/projects/:id/analyze", auth, controller.analyzeProject);
router.post("/projects/:id/sync", auth, controller.syncProject);
router.post("/projects/:id/return", auth, controller.celebrateReturn);
router.post("/admin/simulate-day4", auth, controller.simulateDay4);

module.exports = router;
