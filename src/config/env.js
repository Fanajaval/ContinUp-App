require('dotenv').config();
const { z } = require('zod');

const envSchema = z.object({
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('reve_db'),
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('postgres'),

  // JWT
  JWT_SECRET: z.string().default('dev-secret-change-me'),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // GitHub
  GITHUB_CLIENT_ID: z.string().default(''),
  GITHUB_CLIENT_SECRET: z.string().default(''),
  GITHUB_CALLBACK_URL: z.string().default('http://localhost:3000/api/auth/github/callback'),
  GITHUB_TOKEN: z.string().default(''),

  // AI
  AI_API_KEY: z.string().default(''),
  AI_BASE_URL: z.string().default('https://api.openai.com/v1'),
  AI_MODEL: z.string().default('gpt-4o-mini'),
  AI_MAX_RETRIES: z.coerce.number().default(3),
  AI_TIMEOUT: z.coerce.number().default(30000),

  // Email
  RESEND_API_KEY: z.string().default(''),
  EMAIL_FROM: z.string().default('noreply@tonprojet.com'),
  EMAIL_ENABLED: z.coerce.boolean().default(false),

  // Frontend
  FRONTEND_URL: z.string().default('http://localhost:5173'),

  // Cron
  CRON_SILENCE_CHECK: z.string().default('0 */6 * * *'),
});

const { data: env, error } = envSchema.safeParse(process.env);

if (error) {
  console.error('❌ Invalid environment variables:', error.flatten().fieldErrors);
  process.exit(1);
}

module.exports = env;
