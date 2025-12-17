
require('dotenv').config({ path: 'RendizyPrincipal/.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, serviceKey);

const PROPERTY_ID = '1e4b95b4-cfff-474f-9402-234659ac5179';

(async () => {
    console.log(`Checking property: ${PROPERTY_ID} with key ${serviceKey ? serviceKey.substring(0, 5) + '...' : 'MISSING'}`);

    // Attempt query
    const { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', PROPERTY_ID);

    if (error) {
        console.error("Error fetching property:", error);
    } else if (!data || data.length === 0) {
        console.log("Property NOT FOUND (data array empty).");
    } else {
        const p = data[0];
        console.log("Property Data FOUND:");
        console.log("- Status:", p.status);
        console.log("- Title:", p.internal_name || p.title);
        // Assuming photos column exists. If it's related table 'property_photos', this might be null/empty
        console.log("- Photos Column:", JSON.stringify(p.photos, null, 2));

        // Check for 'property_photos' table just in case
        const { data: photosData, error: photosError } = await supabase
            .from('property_photos')
            .select('*')
            .eq('property_id', PROPERTY_ID);

        if (!photosError && photosData) {
            console.log("- Photos Table:", JSON.stringify(photosData, null, 2));
        }
    }
})();
