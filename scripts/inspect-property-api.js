
// Native fetch used

require('dotenv').config({ path: 'RendizyPrincipal/.env.local' });
const fs = require('fs');


const API_BASE = process.env.VITE_API_BASE_URL; // e.g. https://.../functions/v1
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PROPERTY_ID = '1e4b95b4-cfff-474f-9402-234659ac5179';

if (!API_BASE) {
    console.error("Missing VITE_API_BASE_URL in env");
    process.exit(1);
}

if (!ANON_KEY) {
    console.error("Using fallback key because env is missing VITE_...");
}

async function run() {
    try {
        console.log("1. Logging in...");
        const loginRes = await fetch(`${API_BASE}/rendizy-server/auth/login`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username: 'medhome', password: 'root' })
        });


        console.log(`Login Status: ${loginRes.status}`);
        const loginText = await loginRes.text();
        let loginData;
        try {
            loginData = JSON.parse(loginText);
        } catch (e) {
            console.error("Login Response is not JSON:", loginText.substring(0, 200));
            return;
        }
        if (!loginData.success) {
            console.error("Login Failed:", loginData);
            return;
        }

        const token = loginData.accessToken || loginData.token;
        console.log("Login Success. Token:", token.substring(0, 20) + "...");

        console.log(`2. Fetching Property ${PROPERTY_ID}...`);
        const propRes = await fetch(`${API_BASE}/rendizy-server/properties/${PROPERTY_ID}`, {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!propRes.ok) {
            console.error("Fetch Property Failed:", propRes.status, propRes.statusText);
            const text = await propRes.text();
            console.error("Body:", text);
            return;
        }

        const propData = await propRes.json();
        const finalData = propData.data || propData;

        fs.writeFileSync('property_dump.json', JSON.stringify(finalData, null, 2));
        console.log("Dump written to property_dump.json");

    } catch (e) {
        console.error("Script Error:", e);
        fs.writeFileSync('property_dump_error.txt', String(e));
    }
}

run();
