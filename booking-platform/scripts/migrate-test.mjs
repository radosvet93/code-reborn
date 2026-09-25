// Creates the test database if it is missing, then runs the migrations on it.
// The test database is the dev one with "_test" on the end of its name.
import { spawnSync } from 'node:child_process';
import pg from 'pg';

process.loadEnvFile('.env');

const dev = new URL(process.env.DATABASE_URL);
const testName = `${dev.pathname.slice(1)}_test`;

const testUrl = new URL(dev);
testUrl.pathname = `/${testName}`;

// CREATE DATABASE cannot run inside the database it creates, so connect to the
// maintenance database first.
const admin = new URL(dev);
admin.pathname = '/postgres';

const adminClient = new pg.Client({ connectionString: admin.toString() });
await adminClient.connect();
const existing = await adminClient.query('select 1 from pg_database where datname = $1', [testName]);
if (existing.rowCount === 0) {
  await adminClient.query(`create database "${testName}"`);
  console.log(`created database ${testName}`);
}
await adminClient.end();

// This server's template database has no public schema, so new databases don't either.
const testClient = new pg.Client({ connectionString: testUrl.toString() });
await testClient.connect();
await testClient.query('create schema if not exists public');
await testClient.end();

const result = spawnSync(
  process.execPath,
  ['./node_modules/node-pg-migrate/bin/node-pg-migrate.js', 'up'],
  { stdio: 'inherit', env: { ...process.env, DATABASE_URL: testUrl.toString() } },
);

process.exit(result.status ?? 1);
