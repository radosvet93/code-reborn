import pgPromise from 'pg-promise';

// Vitest does not load .env for us.
if (!process.env.DATABASE_URL) process.loadEnvFile('.env');

/**
 * One source of truth for the connection. Tests get their own database so they
 * can truncate between cases without touching your working data.
 */
export const connectionString = (): string => {
  const raw = process.env.DATABASE_URL;
  if (!raw) throw new Error('DATABASE_URL is not set');

  const url = new URL(raw);
  if (process.env.NODE_ENV === 'test') url.pathname = `${url.pathname}_test`;
  return url.toString();
};

export const pgp = pgPromise();

export const db = pgp({ connectionString: connectionString() });
