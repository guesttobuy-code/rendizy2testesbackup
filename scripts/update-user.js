
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const SUPABASE_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

async function updateUser() {
    const email = 'limposeuapoficial@gmail.com';
    const newUsername = 'medhome';
    const newPassword = 'root';
    const passwordHash = hashPassword(newPassword);

    console.log(`Updating user ${email}...`);
    console.log(`New Username: ${newUsername}`);
    console.log(`New Password Hash: ${passwordHash}`);

    const { data, error } = await supabase
        .from('users')
        .update({
            username: newUsername,
            password_hash: passwordHash,
            updated_at: new Date().toISOString()
        })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating user:', error);
    } else {
        console.log('Update Successful:', data);
    }
}

updateUser();
