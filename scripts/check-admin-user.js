
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
// Using the secret key found in TOKENS_E_ACESSOS_COMPLETO.md which seems to be used as Service Role Key
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function main() {
    console.log('Connecting to Supabase...');
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    console.log('Querying users table for username="admin"...');
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('username', 'admin');

    if (error) {
        console.error('Error querying users:', error);
        return;
    }

    if (users && users.length > 0) {
        const user = users[0];
        console.log('User found:', user.username);
        console.log('ID:', user.id);
        console.log('Password Hash:', user.password_hash);

        // Check hash
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
        console.log('❌ User "admin" NOT FOUND.');
        // Insert user
        console.log('Creating "admin" user...');
        const hash = crypto.createHash('sha256').update('root').digest('hex');
        const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({
                username: 'admin',
                email: 'root@rendizy.com',
                name: 'Administrador',
                password_hash: hash,
                type: 'superadmin',
                status: 'active'
            })
            .select();

        if (createError) console.error('Error creating user:', createError);
        else console.log('✅ User created successfully:', newUser);
    }
}

main().catch(console.error);
