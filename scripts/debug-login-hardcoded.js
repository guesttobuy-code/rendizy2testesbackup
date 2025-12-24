
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const RENDIZY_USERNAME = process.env.RENDIZY_USERNAME || process.env.RENDIZY_DEBUG_USERNAME;
const RENDIZY_PASSWORD = process.env.RENDIZY_PASSWORD || process.env.RENDIZY_DEBUG_PASSWORD;
const PROPERTY_ID = process.env.PROPERTY_ID || process.env.RENDIZY_PROPERTY_ID;

if (!SUPABASE_URL) {
    console.error('Missing SUPABASE_URL (or VITE_SUPABASE_URL).');
    process.exit(1);
}

if (!SUPABASE_ANON_KEY) {
    console.error('Missing SUPABASE_ANON_KEY (or VITE_SUPABASE_ANON_KEY).');
    process.exit(1);
}

if (!RENDIZY_USERNAME || !RENDIZY_PASSWORD) {
    console.error('Missing RENDIZY_USERNAME/RENDIZY_PASSWORD (or RENDIZY_DEBUG_USERNAME/RENDIZY_DEBUG_PASSWORD).');
    process.exit(1);
}

if (!PROPERTY_ID) {
    console.error('Missing PROPERTY_ID (or RENDIZY_PROPERTY_ID).');
    process.exit(1);
}

const API_BASE = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/rendizy-server`;

async function run() {
    try {
        console.log(`1. Logging in to ${API_BASE}/auth/login...`);

        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: RENDIZY_USERNAME, password: RENDIZY_PASSWORD })
        });

        console.log(`Status: ${loginRes.status}`);
        const loginText = await loginRes.text();

        if (!loginRes.ok) {
            console.error("Login Error Body:", loginText);
            return;
        }

        const loginData = JSON.parse(loginText);
        const sessionToken = loginData.accessToken || loginData.token;
        console.log("Login Success!");

        // Now fetch property
        console.log(`2. Fetching Property ${PROPERTY_ID}...`);
        const propRes = await fetch(`${API_BASE}/properties/${PROPERTY_ID}`, {
            headers: {
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                'X-Auth-Token': sessionToken
            }
        });

        const propText = await propRes.text();
        console.log(`Prop Status: ${propRes.status}`);
        if (propRes.ok) {
            console.log("Prop Body: (saved to file)");
            fs.writeFileSync('property_dump_hardcoded.json', propText);
        } else {
            console.error("Prop Fetch Error:", propText);
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
}

run();
