const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const User = require("../models/User");

const SALT_ROUNDS = 10;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";

function signToken(user) {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET manquant");
  }
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    photo: user.photo,
    bio: user.bio,
    role: user.role,
    created_at: user.created_at,
  };
}

function authResponse(user) {
  return {
    token: signToken(user),
    user: { id: user.id, name: user.name },
  };
}

function normalizeGithubUsername(value) {
  const username = String(value || "")
    .trim()
    .replace(/^@/, "");

  return /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)
    ? username.toLowerCase()
    : null;
}

async function fetchGithubProfile(username) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "ContinUp",
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  try {
    const response = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers }
    );
    if (response.status === 404) {
      return { error: "Ce compte GitHub n'existe pas", status: 400 };
    }
    if (!response.ok) {
      return { error: "Impossible de vérifier le compte GitHub pour le moment", status: 502 };
    }
    return { profile: await response.json() };
  } catch {
    return { error: "Impossible de joindre GitHub pour le moment", status: 502 };
  }
}

exports.register = async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const githubUsername = normalizeGithubUsername(req.body.github_username);

    if (!name || !email || !password || !githubUsername) {
      return res.status(400).json({
        message: "Nom, email, compte GitHub et mot de passe requis",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: "Mot de passe trop court (min. 6 caractères)" });
    }

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "Email déjà utilisé" });
    }

    const existingGithubAccount = await User.findOne({
      where: { github_username: githubUsername },
    });
    if (existingGithubAccount) {
      return res.status(409).json({ message: "Ce compte GitHub est déjà associé" });
    }

    const githubResult = await fetchGithubProfile(githubUsername);
    if (githubResult.error) {
      return res.status(githubResult.status).json({ message: githubResult.error });
    }

    const githubId = String(githubResult.profile.id);
    const existingGithubId = await User.findOne({ where: { github_id: githubId } });
    if (existingGithubId) {
      return res.status(409).json({ message: "Ce compte GitHub est déjà associé" });
    }

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      github_username: githubUsername,
      github_id: githubId,
      photo: githubResult.profile.avatar_url || null,
    });

    return res.status(201).json(authResponse(user));
  } catch (error) {
    console.error("Erreur inscription:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

exports.login = async (req, res) => {
  try {
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");

    if (!email || !password) {
      return res.status(400).json({ message: "Email et mot de passe requis" });
    }

    const user = await User.findOne({ where: { email } });
    if (!user || !user.password) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Email ou mot de passe incorrect" });
    }

    return res.status(200).json(authResponse(user));
  } catch (error) {
    console.error("Erreur connexion:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Connexion / inscription par email simple (sans mot de passe).
 * POST /api/auth/email  { name?, email }
 */
exports.loginWithEmail = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();
    const name = String(req.body.name || "").trim();

    if (!email || !email.includes("@")) {
      return res.status(400).json({ message: "Adresse email invalide" });
    }

    let user = await User.findOne({ where: { email } });

    if (!user) {
      if (name.length < 2) {
        return res.status(400).json({
          message: "Indique ton nom pour créer le compte",
          needName: true,
        });
      }
      const placeholder = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), SALT_ROUNDS);
      user = await User.create({
        name,
        email,
        password: placeholder,
      });
    } else if (name.length >= 2 && user.name !== name) {
      await user.update({ name });
    }

    return res.status(200).json(authResponse(user));
  } catch (error) {
    console.error("Erreur email auth:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * Connexion via nom d'utilisateur GitHub public.
 * POST /api/auth/github  { username: "octocat" }
 * Récupère le profil public GitHub et connecte CE compte — jamais un compte fictif.
 */
exports.loginWithGithubUsername = async (req, res) => {
  try {
    const username = String(req.body.username || "")
      .trim()
      .replace(/^@/, "");

    if (!username || !/^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/.test(username)) {
      return res.status(400).json({ message: "Nom d'utilisateur GitHub invalide" });
    }

    const headers = {
      Accept: "application/vnd.github+json",
      "User-Agent": "ContinUp",
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const profileRes = await fetch(
      `https://api.github.com/users/${encodeURIComponent(username)}`,
      { headers }
    );

    if (profileRes.status === 404) {
      return res.status(404).json({
        message: `Aucun compte GitHub trouvé pour « ${username} »`,
      });
    }
    if (!profileRes.ok) {
      return res.status(502).json({
        message: "Impossible de joindre GitHub pour le moment. Réessaie.",
      });
    }

    const profile = await profileRes.json();
    const githubId = String(profile.id);
    const login = profile.login;
    const email =
      profile.email || `${login.toLowerCase()}@users.noreply.github.com`;

    let user = await User.findOne({ where: { github_id: githubId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      const placeholder = await bcrypt.hash(
        crypto.randomBytes(24).toString("hex"),
        SALT_ROUNDS
      );
      user = await User.create({
        name: profile.name || login,
        email,
        password: placeholder,
        github_id: githubId,
        photo: profile.avatar_url || null,
      });
    } else {
      await user.update({
        github_id: githubId,
        name: profile.name || login || user.name,
        photo: profile.avatar_url || user.photo,
      });
    }

    return res.status(200).json({
      ...authResponse(user),
      github: {
        login,
        avatar_url: profile.avatar_url || null,
        html_url: profile.html_url || `https://github.com/${login}`,
      },
    });
  } catch (error) {
    console.error("Erreur GitHub username:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};

/**
 * OAuth GitHub classique (uniquement si GITHUB_CLIENT_ID est configuré).
 * GET /api/auth/github/oauth
 */
exports.githubStart = async (req, res) => {
  try {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(501).json({
        message: "OAuth GitHub non configuré. Utilise POST /api/auth/github avec ton nom d'utilisateur.",
      });
    }

    const redirectUri =
      process.env.GITHUB_CALLBACK_URL ||
      `http://localhost:5000/api/auth/github/callback`;
    const url = new URL("https://github.com/login/oauth/authorize");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "read:user user:email");
    url.searchParams.set("state", crypto.randomBytes(16).toString("hex"));
    return res.redirect(url.toString());
  } catch (error) {
    console.error("Erreur githubStart:", error);
    return res.redirect(`${FRONTEND_URL}/login?oauth=error`);
  }
};

/**
 * Callback OAuth GitHub.
 * GET /api/auth/github/callback?code=...
 */
exports.githubCallback = async (req, res) => {
  try {
    const { code } = req.query;
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!code || !clientId || !clientSecret) {
      return res.redirect(`${FRONTEND_URL}/login?oauth=error`);
    }

    const redirectUri =
      process.env.GITHUB_CALLBACK_URL ||
      `http://localhost:5000/api/auth/github/callback`;

    const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      return res.redirect(`${FRONTEND_URL}/login?oauth=error`);
    }

    const ghHeaders = {
      Authorization: `Bearer ${tokenData.access_token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "ContinUp",
    };

    const profileRes = await fetch("https://api.github.com/user", { headers: ghHeaders });
    const profile = await profileRes.json();

    let email = profile.email;
    if (!email) {
      const emailsRes = await fetch("https://api.github.com/user/emails", {
        headers: ghHeaders,
      });
      const emails = await emailsRes.json();
      const primary = Array.isArray(emails)
        ? emails.find((entry) => entry.primary && entry.verified) || emails[0]
        : null;
      email = primary?.email || `${profile.id}@users.noreply.github.com`;
    }

    const githubId = String(profile.id);
    let user = await User.findOne({ where: { github_id: githubId } });
    if (!user) {
      user = await User.findOne({ where: { email } });
    }

    if (!user) {
      const placeholder = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), SALT_ROUNDS);
      user = await User.create({
        name: profile.name || profile.login || "GitHub User",
        email,
        password: placeholder,
        github_id: githubId,
        photo: profile.avatar_url || null,
      });
    } else {
      await user.update({
        github_id: githubId,
        photo: profile.avatar_url || user.photo,
        name: user.name || profile.name || profile.login,
      });
    }

    const token = signToken(user);
    return res.redirect(
      `${FRONTEND_URL}/login?oauth=github&token=${encodeURIComponent(token)}&name=${encodeURIComponent(user.name)}&id=${user.id}`
    );
  } catch (error) {
    console.error("Erreur githubCallback:", error);
    return res.redirect(`${FRONTEND_URL}/login?oauth=error`);
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "photo", "bio", "role", "created_at"],
    });

    if (!user) {
      return res.status(404).json({ message: "Utilisateur introuvable" });
    }

    return res.status(200).json({ user: publicUser(user) });
  } catch (error) {
    console.error("Erreur profil:", error);
    return res.status(500).json({ message: "Erreur serveur" });
  }
};
