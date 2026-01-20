import dotenv from 'dotenv';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const dbPassword = process.env.SUPABASE_DB_PASSWORD;

if (!supabaseUrl) {
  console.error('SUPABASE_URL não configurada');
  process.exit(1);
}

if (!dbPassword) {
  console.error('SUPABASE_DB_PASSWORD não configurada');
  process.exit(1);
}

const projectRef = new URL(supabaseUrl).hostname.split('.')[0];
const connectionString = `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${projectRef}.supabase.co:5432/postgres`;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const migrationPath = path.resolve(__dirname, '../supabase/migrations/2026011802_create_owners_table.sql');

const run = async () => {
  const client = new Client({ connectionString, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    const sql = await fs.readFile(migrationPath, 'utf8');
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('✅ owners table garantida com sucesso');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Falha ao garantir tabela owners:', error?.message || error);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
};

run();
