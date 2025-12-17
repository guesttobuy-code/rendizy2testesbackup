
const fs = require('fs');
require('dotenv').config({ path: 'RendizyPrincipal/.env.local' });

const API_BASE = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const PROPERTY_ID = '1e4b95b4-cfff-474f-9402-234659ac5179';
const USERNAME = 'medhome';
const PASSWORD = 'root';

async function run() {
    try {
        console.log(`1. Logging in...`);
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Login Failed: ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token;
        console.log("✅ Login Success!");

        console.log(`2. Inspecting Property: ${PROPERTY_ID}`);
        const res = await fetch(`${API_BASE}/properties/${PROPERTY_ID}`, {
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token}`
            }
        });

        if (!res.ok) {
            console.error("Error:", await res.text());
            return;
        }

        const json = await res.json();
        console.log("Success!");
        fs.writeFileSync('property_debug_dump.json', JSON.stringify(json, null, 2));

        // Quick Check
        const data = json.data;
        console.log("Root Name:", data.name);
        console.log("WizardData Present:", !!data.wizardData);
        if (data.wizardData) {
            console.log("WizardData InternalName:", data.wizardData.internalName);
            const contentKeys = Object.keys(data.wizardData.contentType || {});
            console.log("WizardData ContentType Keys:", contentKeys);
        }

    } catch (e) {
        console.error(e);
    }
}
run();
