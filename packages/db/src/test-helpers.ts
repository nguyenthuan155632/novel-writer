import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema/index.js';
import { randomUUID } from 'node:crypto';

export type TestDbHandle = {
  db: ReturnType<typeof drizzle>;
  sql: postgres.Sql;
  dbName: string;
  adminSql: postgres.Sql;
};

export async function createTestDb(baseUrl?: string): Promise<TestDbHandle> {
  const url = baseUrl ?? process.env.ADMIN_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL or ADMIN_DATABASE_URL must be set');

  const dbName = `novel_test_${randomUUID().replace(/-/g, '').slice(0, 16)}`;

  const adminConnectionString = new URL(url);
  adminConnectionString.pathname = '/postgres';
  const adminSql = postgres(adminConnectionString.toString(), { max: 1 });
  await adminSql.unsafe(`CREATE DATABASE "${dbName}"`);

  const testConnectionString = new URL(url);
  testConnectionString.pathname = `/${dbName}`;
  const sql = postgres(testConnectionString.toString(), { max: 5 });
  const db = drizzle(sql, { schema });

  return { db, sql, dbName, adminSql };
}

export async function dropTestDb(handle: TestDbHandle): Promise<void> {
  await handle.sql.end();
  await handle.adminSql.unsafe(`DROP DATABASE IF EXISTS "${handle.dbName}"`);
  await handle.adminSql.end();
}