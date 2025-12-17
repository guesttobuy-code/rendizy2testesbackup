
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

console.log("🔍 TESTING ANON KEY...");
console.log(`URL: ${supabaseUrl}`);
console.log(`Key: ${anonKey ? anonKey.substring(0, 15) + '...' : 'MISSING'}`);

if (!supabaseUrl || !anonKey) {
    console.error("❌ Missing variables!");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, anonKey);

(async () => {
    // Try to access a public endpoint or table
    // 'auth/login' is an edge function, let's try invoking it without payload to see if we get 401 or 400 (400 means Auth passed but payload bad)

    console.log("\n--- TEST 1: Edge Function Health Check ---");
    const { data: funcData, error: funcError } = await supabase.functions.invoke('rendizy-server', {
        method: 'GET',
        headers: { 'x-action': 'health' } // Mocking a health check path if it exists
    });

    if (funcError) {
        console.log(`❌ Function Error:`, funcError);
    } else {
        console.log(`✅ Function Success:`, funcData);
    }

    // TEST 2: Simple DB Select (should fail with 401 only if Key is invalid, or 401 if RLS denies, but "Invalid JWT" comes from the Gatekeeper)
    console.log("\n--- TEST 2: DB Connection (Anon) ---");
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error) {
        console.log(`⚠️ DB Error:`, error.message);
        if (error.message.includes("Invalid JWT") || error.message.includes("jwt")) {
            console.error("\n🚫 CONCLUSION: The ANON KEY is INVALID/EXPIRED.");
        } else {
            console.log("\n✅ CONCLUSION: The ANON KEY is VALID (RLS is blocking, which is normal).");
        }
    } else {
        console.log(`✅ DB Success. Key is definitely valid.`);
    }
})();
