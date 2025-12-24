
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('VITE_SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
    throw new Error('Missing SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY in environment.');
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

async function checkProperty() {
    const propertyId = '1e4b95b4-cfff-474f-9402-234659ac5179';
    console.log(`Checking property ${propertyId}...`);

    const { data, error } = await supabase
        .from('Properties')
        .select('*')
        .eq('id', propertyId)
        .single();

    if (error) {
        console.error('Error fetching property:', error);
        return;
    }

    if (!data) {
        console.log('Property not found.');
        return;
    }

    console.log('--- Property Data ---');
    console.log('ID:', data.id);
    console.log('Name:', data.name);
    console.log('Internal Name:', data.internalName || data.internal_name || 'N/A');

    console.log('\n--- Photos Field ---');
    console.log(JSON.stringify(data.photos, null, 2));

    console.log('\n--- Cover Photo Field ---');
    console.log(JSON.stringify(data.coverPhoto || data.cover_photo, null, 2));

    console.log('\n--- Content Description (checking for photos inside content) ---');
    // Check if content description has photos
    if (data.contentDescription && data.contentDescription.photos) {
        console.log('Found photos in contentDescription:', JSON.stringify(data.contentDescription.photos, null, 2));
    } else {
        console.log('No photos in contentDescription root.');
    }

    // Check contentPhotos field if it exists (some implementations use this)
    if (data.contentPhotos) {
        console.log('\n--- Content Photos Field ---');
        console.log(JSON.stringify(data.contentPhotos, null, 2));
    }
}

checkProperty();
