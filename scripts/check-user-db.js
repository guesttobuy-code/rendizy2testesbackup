
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

// URL and Key hardcoded for this check to ensure connection (using the project ID from context)
const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
// I will try to read the key from a known file or env var in the next step if this fails, 
// but for now I will rely on the user having .env or I will check where keys are.
// Actually, I'll try to load from .env.local or similar if available.
// For now, I'll print a message if key is missing.

const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SERVICE_ROLE_KEY) {
    console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY not found in environment.');
    console.log('Please set SUPABASE_SERVICE_ROLE_KEY to run this script.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkUser(email) {
    console.log(`Checking user: ${email}...`);

    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error) {
        console.error('Error querying users:', error);
        return;
    }

    if (users.length === 0) {
        console.log('User NOT found.');
    } else {
        console.log('User FOUND:', users[0]);
        console.log('Username:', users[0].username);
        console.log('Status:', users[0].status);
        console.log('Organization ID:', users[0].imobiliaria_id || users[0].organization_id); // Check both fields just in case
    }
}

checkUser('limposeuapoficial@gmail.com');
