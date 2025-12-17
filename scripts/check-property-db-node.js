
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkProperty() {
    const propertyId = '1e4b95b4-cfff-474f-9402-234659ac5179';
    console.log(`Checking property ${propertyId}...`);

    let { data, error } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

    if (error) {
        console.log(`Error with lowercase 'properties': ${error.message}. Trying 'Properties'...`);
        const res = await supabase
            .from('Properties')
            .select('*')
            .eq('id', propertyId)
            .single();
        data = res.data;
        error = res.error;
    }

    if (error) {
        console.error('Error fetching property:', JSON.stringify(error, null, 2));
        return;
    }

    if (!data) {
        console.log('Property not found.');
        return;
    }

    console.log('--- Property Data ---');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Updated At:', data.updated_at);

    console.log('\n--- Photos Field (Root Column) ---');
    const photos = data.photos || [];
    console.log(`Count: ${photos.length}`);

    console.log('\n--- Wizard Data Analysis ---');
    if (data.wizard_data) {
        console.log('✅ wizard_data column exists.');
        const wd = data.wizard_data;

        // Check contentRooms inside wizard_data
        if (wd.contentRooms) {
            console.log('  contentRooms found inside wizard_data.');
            const cr = wd.contentRooms;
            if (cr.rooms && Array.isArray(cr.rooms)) {
                console.log(`  Rooms array found: ${cr.rooms.length} rooms`);
                let roomPhotosTotal = 0;
                cr.rooms.forEach((r, i) => {
                    const pCount = r.photos ? r.photos.length : 0;
                    if (pCount > 0) console.log(`    Room ${i + 1} (${r.type}): ${pCount} photos`);
                    roomPhotosTotal += pCount;
                });
                console.log(`  Total Room Photos in wizard_data: ${roomPhotosTotal}`);
            } else {
                console.log('  rooms array is empty or invalid.');
            }
        } else {
            console.log('  ❌ contentRooms NOT found in wizard_data.');
        }

        // Check contentPhotos inside wizard_data
        if (wd.contentPhotos && wd.contentPhotos.photos) {
            console.log(`  contentPhotos.photos count: ${wd.contentPhotos.photos.length}`);
        }

        // Check photos inside wizard_data root
        if (wd.photos) {
            console.log(`  photos (root in wizard_data) count: ${wd.photos.length}`);
        }

    } else {
        console.log('❌ wizard_data column is null/undefined');
    }
}

checkProperty();
