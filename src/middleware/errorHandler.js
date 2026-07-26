const env = require('../config/env');

/**
 * Error handler global — attrape toutes les erreurs non gérées
 */
function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);
  if (env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  // Zod validation errors
  if (err.name === 'ZodError') {
    return res.status(400).json({
      error: 'Données invalides',
      details: err.errors,
    });
  }

  // PostgreSQL unique constraint violation
  if (err.code === '23505') {
    const field = err.constraint || 'unknown';
    return res.status(409).json({
      error: `Conflit de données (doublon sur ${field})`,
    });
  }

  // PostgreSQL foreign key violation
  if (err.code === '23503') {
    return res.status(400).json({
      error: 'Référence inexistante',
    });
  }

  // Default 500
  const statusCode = err.statusCode || err.status || 500;
  res.status(statusCode).json({
    error: env.NODE_ENV === 'production' ? 'Erreur interne' : err.message,
  });
}

/**
 * 404 handler — route non trouvée
 */
function notFoundHandler(req, res) {
  res.status(404).json({
    error: `Route non trouvée : ${req.method} ${req.path}`,
  });
}

module.exports = { errorHandler, notFoundHandler };
