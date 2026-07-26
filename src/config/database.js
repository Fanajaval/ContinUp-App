const { Pool } = require('pg');
const env = require('./env');

let pool;

function getPool() {
  if (!pool) {
    const connectionString = env.DATABASE_URL || 
      `postgresql://${env.DB_USER}:${env.DB_PASSWORD}@${env.DB_HOST}:${env.DB_PORT}/${env.DB_NAME}`;
      
    console.log({
      DATABASE_URL: env.DATABASE_URL,
      DB_HOST: env.DB_HOST,
      DB_PORT: env.DB_PORT,
      DB_NAME: env.DB_NAME,
      DB_USER: env.DB_USER,
      DB_PASSWORD: env.DB_PASSWORD,
    });  

    pool = new Pool({
      connectionString,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    pool.on('error', (err) => {
      console.error('❌ Unexpected error on idle PostgreSQL client:', err);
    });
  }
  return pool;
}

// Query helper — utilise le pool directement
async function query(text, params) {
  const start = Date.now();
  try {
    const result = await getPool().query(text, params);
    const duration = Date.now() - start;
    if (env.NODE_ENV === 'development') {
      console.log(`[DB] ${text.substring(0, 60)}... (${duration}ms, ${result.rowCount} rows)`);
    }
    return result;
  } catch (error) {
    console.error(`[DB ERROR] ${text.substring(0, 80)}`, error.message);
    throw error;
  }
}

// Transaction helper
async function transaction(callback) {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Health check
async function healthCheck() {
  try {
    const result = await query('SELECT NOW() as now');
    return { status: 'ok', database: 'connected', time: result.rows[0].now };
  } catch (error) {
    return { status: 'error', database: 'disconnected', error: error.message };
  }
}

// Graceful shutdown
async function shutdown() {
  if (pool) {
    console.log('[DB] Closing pool...');
    await pool.end();
  }
}

module.exports = {
  getPool,
  query,
  transaction,
  healthCheck,
  shutdown,
};
