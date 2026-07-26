const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../config/database');
const env = require('../config/env');
const { z } = require('zod');

/**
 * Auth Controller — inscription, login, profil
 */

const registerSchema = z.object({
  pseudo: z.string().min(2).max(50),
  email: z.string().email(),
  password: z.string().min(6),
  style_signal: z.enum(['sarcastique', 'motivant', 'epique', 'gamer']).default('motivant'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

async function register(req, res, next) {
  try {
    const data = registerSchema.parse(req.body);
    const passwordHash = await bcrypt.hash(data.password, 12);

    const result = await query(
      `INSERT INTO users (pseudo, email, password_hash, style_signal)
       VALUES ($1, $2, $3, $4)
       RETURNING id, pseudo, email, style_signal, xp_total, created_at`,
      [data.pseudo, data.email, passwordHash, data.style_signal]
    );

    const user = result.rows[0];
    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    res.status(201).json({ user, token });
  } catch (error) {
    next(error);
  }
}

async function login(req, res, next) {
  try {
    const data = loginSchema.parse(req.body);

    const result = await query(
      `SELECT id, pseudo, email, password_hash, style_signal, xp_total, rang FROM users WHERE email = $1`,
      [data.email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = result.rows[0];
    const validPassword = await bcrypt.compare(data.password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const token = jwt.sign({ userId: user.id }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });

    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (error) {
    next(error);
  }
}

async function getProfile(req, res, next) {
  try {
    const result = await query(
      `SELECT id, pseudo, email, style_signal, xp_total, rang, created_at FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

async function updateStyle(req, res, next) {
  try {
    const { style_signal } = z.object({
      style_signal: z.enum(['sarcastique', 'motivant', 'epique', 'gamer']),
    }).parse(req.body);

    const result = await query(
      `UPDATE users SET style_signal = $1 WHERE id = $2
       RETURNING id, pseudo, email, style_signal`,
      [style_signal, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
}

module.exports = { register, login, getProfile, updateStyle };
