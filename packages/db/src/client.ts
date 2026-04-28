import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

let _client: postgres.Sql | null = null;

export function getSqlClient(databaseUrl?: string): postgres.Sql {
  if (_client) return _client;
  const url = databaseUrl ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL not set');
  _client = postgres(url, { max: 10, idle_timeout: 30 });
  return _client;
}

export function getDb(databaseUrl?: string) {
  return drizzle(getSqlClient(databaseUrl));
}

export type Db = ReturnType<typeof getDb>;
