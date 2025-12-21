import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'node:fs';

dotenv.config({ path: '.env.local' });

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!url || !key) {
  console.error('Missing SUPABASE_URL or service key in env');
  process.exit(1);
}

console.log('Connecting to Supabase:', url);
const supabase = createClient(url, key);
const { data, error } = await supabase
  .from('anuncios_ultimate')
  .select('id, data')
  .limit(5000);

if (error) {
  console.error('Query error:', error.message);
  process.exit(1);
}

console.log('Rows fetched from anuncios_ultimate:', data?.length || 0);

const set = new Set();
for (const row of data || []) {
  const d = row?.data || {};
  const exIds = d?.externalIds || d?.external_ids || {};
  const orig = d?._stays_net_original || {};

  const candidates = [
    exIds.stays_net_id,
    exIds.staysnet_id,
    exIds.staysNetId,
    orig.id,
    orig._id,
    orig.listingId,
  ];

  for (const c of candidates) {
    if (c !== undefined && c !== null && String(c).trim() !== '') {
      set.add(String(c));
    }
  }
}

const list = Array.from(set).sort();
console.log('Unique stays IDs found:', list.length);

const output = `# Stays IDs em anuncios_ultimate (uniq)\n\nTotal: ${list.length}\n\n${list.map((id) => `- ${id}`).join('\n')}\n`;
fs.writeFileSync('stays-ids.md', output, 'utf8');

console.log('Arquivo gerado: stays-ids.md');
