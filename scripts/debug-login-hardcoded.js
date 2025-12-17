
// Native fetch
const fs = require('fs');
require('dotenv').config({ path: 'RendizyPrincipal/.env.local' });

// Hardcoded Correct URL
const API_BASE = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PROPERTY_ID = '1e4b95b4-cfff-474f-9402-234659ac5179';

async function run() {
    try {
        console.log(`1. Logging in to ${API_BASE}/auth/login...`);

        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: 'medhome', password: 'root' })
        });

        console.log(`Status: ${loginRes.status}`);
        const loginText = await loginRes.text();

        if (!loginRes.ok) {
            console.error("Login Error Body:", loginText);
            return;
        }

        const loginData = JSON.parse(loginText);
        const token = loginData.accessToken || loginData.token;
        console.log("Login Success!");

        // Now fetch property
        console.log(`2. Fetching Property ${PROPERTY_ID}...`);
        const propRes = await fetch(`${API_BASE}/properties/${PROPERTY_ID}`, {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        const propText = await propRes.text();
        console.log(`Prop Status: ${propRes.status}`);
        if (propRes.ok) {
            console.log("Prop Body:", propText);
            fs.writeFileSync('property_dump_hardcoded.json', propText);
        } else {
            console.error("Prop Fetch Error:", propText);
        }

    } catch (e) {
        console.error("Script Error:", e);
    }
}

run();
