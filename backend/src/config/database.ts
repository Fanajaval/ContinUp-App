import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is not defined. Please set it in your .env file."
  );
}

/**
 * PostgreSQL connection pool.
 * Shared across the application for efficient query handling.
 */
const pool = new Pool({
  connectionString: databaseUrl,
});

pool.on("connect", () => {
  console.log("✅ Connected to PostgreSQL database");
});

pool.on("error", (error: Error) => {
  console.error("❌ Unexpected PostgreSQL pool error:", error.message);
  process.exit(1);
});

/**
 * Helper to run a parameterized SQL query.
 * Always use placeholders ($1, $2, ...) to prevent SQL injection.
 */
export const query = async (text: string, params?: unknown[]) => {
  try {
    return await pool.query(text, params);
  } catch (error) {
    console.error("❌ Database query error:", error);
    throw error;
  }
};

export default pool;
