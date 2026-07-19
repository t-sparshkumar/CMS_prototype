import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(8055),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DB_CLIENT: z.enum(['sqlite3', 'pg', 'postgresql']).default('sqlite3'),
  DB_FILE: z.string().default('./data/cms.db'),
  DB_HOST: z.string().optional(),
  DB_PORT: z.coerce.number().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DATABASE_URL: z.string().optional(),
  DB_SSL: z.enum(['true', 'false']).optional(),
  SECRET_KEY: z.string().min(1, 'SECRET_KEY is required'),
  UPLOAD_DIR: z.string().default('./uploads'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  ADMIN_UI_URL: z.preprocess(
    (value) => {
      if (typeof value !== 'string' || value.trim() === '') {
        return value;
      }
      const trimmed = value.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    },
    z.string().url().default('http://localhost:5173'),
  ),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;

/**
 * Parse and validate environment variables. Fails fast on invalid config.
 */
export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }
  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    const messages = result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new Error(`Invalid environment configuration:\n${messages.join('\n')}`);
  }
  const env = result.data;
  const usesPostgres = env.DB_CLIENT === 'pg' || env.DB_CLIENT === 'postgresql';
  if (usesPostgres && !env.DATABASE_URL && env.NODE_ENV === 'production') {
    throw new Error(
      'DATABASE_URL is required in production when DB_CLIENT=pg. ' +
        'Create a free database at https://neon.tech, copy the connection string ' +
        '(append ?sslmode=require if needed), and set DATABASE_URL on Railway.',
    );
  }
  cachedEnv = env;
  return cachedEnv;
}
