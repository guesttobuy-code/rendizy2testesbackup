
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
// Using the secret key checks found in TOKENS_E_ACESSOS_COMPLETO.md
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('Querying properties table for title="Teste Draft 1"...');
    const { data: properties, error } = await supabase
        .from('properties')
        .select('id, title, status, created_at, updated_at')
        .eq('title', 'Teste Draft 1');

    if (error) {
        console.error('Error querying properties:', error);
        return;
    }

    if (properties && properties.length > 0) {
        console.log('✅ Draft FOUND!');
        properties.forEach(p => {
            console.log(`- ID: ${p.id}`);
            console.log(`  Title: ${p.title}`);
            console.log(`  Status: ${p.status}`);
            console.log(`  Created: ${p.created_at}`);
            console.log(`  Updated: ${p.updated_at}`);
        });
    } else {
        console.log('❌ Draft NOT FOUND.');
        console.log('Please check if autosave triggered or if there are any RLS policies preventing view (SERVICE_ROLE_KEY should bypass RLS).');
    }
}

main().catch(console.error);
