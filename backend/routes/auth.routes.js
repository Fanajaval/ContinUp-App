const express = require("express");
const authController = require("../controllers/auth.controller");
const authMiddleware = require("../middlewares/auth");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/email", authController.loginWithEmail);
router.post("/github", authController.loginWithGithubUsername);
router.get("/github/oauth", authController.githubStart);
router.get("/github/callback", authController.githubCallback);
router.get("/me", authMiddleware, authController.getMe);

module.exports = router;
