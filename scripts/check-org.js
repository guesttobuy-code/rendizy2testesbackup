
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkOrg(orgId) {
    console.log(`Checking org: ${orgId}...`);
    const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

    if (error) console.error(error);
    else console.log('Org Found:', data.name, data.slug);
}

checkOrg('e78c7bb9-7823-44b8-9aee-95c9b073e7b7');
