
const { createClient } = require('@supabase/supabase-js');

// Config HARDCODED
const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

async function verify() {
    console.log('🔍 Searching deep for "Barramares"...');

    // 1. Search in `name`
    const { data: byName, error: errName } = await supabase
        .from('properties')
        .select('*')
        .ilike('name', '%Barramares%');

    if (byName && byName.length > 0) {
        console.log(`✅ Found ${byName.length} in NAME column:`);
        console.log(JSON.stringify(byName, null, 2));
        return;
    }

    console.log('❌ Not found in NAME column.');

    // 2. Fetch last 10 properties to inspect manually
    console.log('🔍 Inspecting last 10 properties (checking wizard_data)...');
    const { data: latest, error: errLatest } = await supabase
        .from('properties')
        .select('id, name, status, created_at, wizard_data')
        .order('created_at', { ascending: false })
        .limit(10);

    if (errLatest) {
        console.error('Error fetching latest:', errLatest);
        return;
    }

    // Check if "Barramares" is inside wizard_data
    const deepMatch = latest.find(p => {
        const jsonStr = JSON.stringify(p.wizard_data || {});
        return jsonStr.toLowerCase().includes('barramares');
    });

    if (deepMatch) {
        console.log('✅ Found match inside WIZARD_DATA!');
        console.log('Property:', deepMatch.name, 'ID:', deepMatch.id);
        console.log('Wizard Data Snippet:', JSON.stringify(deepMatch.wizard_data).substring(0, 200));
    } else {
        console.log('❌ "Barramares" NOT found in last 10 properties (Name or Wizard Data).');
        console.log('Latest 3 properties found:');
        latest.slice(0, 3).forEach(p => {
            console.log(`- [${p.created_at}] ID: ${p.id} | Name: "${p.name}" | Status: ${p.status}`);
        });
    }
}

verify();
