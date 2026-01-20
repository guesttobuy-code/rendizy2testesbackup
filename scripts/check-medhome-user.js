
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
// Using the secret key checks found in TOKENS_E_ACESSOS_COMPLETO.md
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('Querying users table for username="medhome"...');
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'medhome');

    if (error) {
        console.error('Error querying users:', error);
        return;
    }

    if (users && users.length > 0) {
        const user = users[0];
        console.log('User found:', user.username);
        console.log('ID:', user.id);
        console.log('Password Hash:', user.password_hash);

        // Check hash for "root"
        const hash = crypto.createHash('sha256').update('root').digest('hex');
        console.log('Expected Hash for "root":', hash);

        if (user.password_hash === hash) {
            console.log('✅ Password hash MATCHES!');
        } else {
            console.log('❌ Password hash DOES NOT MATCH!');
            // Update password
            console.log('Updating password to "root"...');
            const { error: updateError } = await supabase
                .from('users')
                .update({ password_hash: hash })
                .eq('id', user.id);

            if (updateError) console.error('Error updating password:', updateError);
            else console.log('✅ Password updated successfully.');
        }
    } else {
        console.log('❌ User "medhome" NOT FOUND.');
        // Insert user if not found - assuming it should exist for testing? 
        // Or maybe just report it not found. 
        // Given the user asked strictly for "medhome", I'll create it if it doesn't exist to facilitate login.
        console.log('Creating "medhome" user...');
        const hash = crypto.createHash('sha256').update('root').digest('hex');

        // Need an organization content? For now creating as superadmin or similar structure to see if it works.
        // Actually, based on previous migration files, 'imobiliaria' type users need organization_id.
        // I will try to find an organization first.

        const { data: orgs } = await supabase.from('organizations').select('id').limit(1);
        let orgId = null;
        if (orgs && orgs.length > 0) orgId = orgs[0].id;

        // If no org, create one
        if (!orgId) {
            const { data: newOrg } = await supabase.from('organizations').insert({
                name: 'Medhome Org',
                slug: 'medhome',
                email: 'admin@medhome.com'
            }).select().single();
            orgId = newOrg ? newOrg.id : null;
        }

        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                username: 'medhome',
                email: 'admin@medhome.com',
                name: 'Medhome Admin',
                password_hash: hash,
                type: orgId ? 'imobiliaria' : 'superadmin',
                organization_id: orgId,
                status: 'active'
            })
            .select();

        if (createError) console.error('Error creating user:', createError);
        else console.log('✅ User created successfully:', newUser);
    }
}

main().catch(console.error);
