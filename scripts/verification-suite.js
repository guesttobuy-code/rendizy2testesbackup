
const fs = require('fs');
require('dotenv').config({ path: 'RendizyPrincipal/.env.local' });

// Config
const API_BASE = "https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server";
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const USERNAME = 'medhome';
const PASSWORD = 'root';

// Payload Dummy
const DUMMY_PROPERTY = {
    status: 'draft', // Start as draft
    wizardData: {
        internalName: "Casa de Teste Automatizado",
        contentType: {
            propertyTypeId: "house",
            internalName: "Casa de Teste Automatizado"
        },
        contentRooms: {
            rooms: [
                { id: '1', type: 'bedroom', beds: { double: 1 } }, // 1 Bedroom, 1 Bed
                { id: '2', type: 'bedroom', beds: { single: 2 } }, // 1 Bedroom, 2 Beds
                { id: '3', type: 'bathroom' } // 1 Bathroom
            ]
        },
        contentPhotos: {
            photos: [
                { url: "https://example.com/photo1.jpg", isCover: true },
                { url: "https://example.com/photo2.jpg" }
            ]
        },
        maxGuests: 4
    }
};

async function run() {
    console.log("🚀 Starting Verification Suite...");

    try {
        // 1. LOGIN
        console.log(`\n🔑 Logging in as ${USERNAME}...`);
        const loginRes = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'apikey': ANON_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: USERNAME, password: PASSWORD })
        });

        if (!loginRes.ok) throw new Error(`Login Failed: ${await loginRes.text()}`);
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token;
        console.log("✅ Login Success!");

        // 2. CREATE PROPERTY
        console.log("\n🏗️ Creating Property (POST)...");
        const createRes = await fetch(`${API_BASE}/properties`, {
            method: 'POST',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(DUMMY_PROPERTY)
        });

        if (!createRes.ok) throw new Error(`Create Failed: ${await createRes.text()}`);
        const createData = await createRes.json();
        const prop = createData.data;
        const propId = prop.id;

        console.log(`✅ Created Property ID: ${propId}`);
        console.log(`   Internal Name: ${prop.name} (Expected: "Casa de Teste Automatizado")`);
        console.log(`   Bedrooms: ${prop.bedrooms} (Expected: 2)`);
        console.log(`   Bathrooms: ${prop.bathrooms} (Expected: 1)`);
        console.log(`   Photos: ${prop.photos?.length} (Expected: 2)`);

        // Check Consistency
        if (prop.bedrooms !== 2) console.error("❌ BEDROOMS MISMATCH! Backend didn't calculate stats.");
        else console.log("✅ Bedrooms Sync OK");

        // 3. ACTIVATE PROPERTY
        console.log("\n🟢 Activating Property (PUT)...");
        const updatePayload = {
            id: propId,
            status: 'active',
            wizardData: { ...DUMMY_PROPERTY.wizardData, status: 'active' }
        };
        const updateRes = await fetch(`${API_BASE}/properties/${propId}`, {
            method: 'PUT',
            headers: {
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(updatePayload)
        });

        if (!updateRes.ok) throw new Error(`Activate Failed: ${await updateRes.text()}`);
        console.log("✅ Activated!");

        // 4. LIST PROPERTIES
        console.log("\n📋 Listing Properties (GET)...");
        const listRes = await fetch(`${API_BASE}/properties`, {
            headers: { 'apikey': ANON_KEY, 'Authorization': `Bearer ${token}` }
        });

        if (!listRes.ok) throw new Error(`List Failed: ${await listRes.text()}`);
        const listData = await listRes.json();
        const list = listData.data || [];

        console.log(`   Total Properties Found: ${list.length}`);
        const found = list.find(p => p.id === propId);

        if (found) {
            console.log("✅ New Property IS in the list.");
            console.log(`   List Status: ${found.status}`);
        } else {
            console.error("❌ New Property NOT found in list! Visibility Issue.");
            console.log("   Dumping first 2 properties in list:");
            console.log(JSON.stringify(list.slice(0, 2), null, 2));
        }

    } catch (e) {
        console.error("❌ SUITE FAILED:", e);
    }
}

run();
