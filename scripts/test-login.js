
const fetch = require('node-fetch'); // Assuming node-fetch is available or using native fetch in newer node
// If node-fetch isn't available, I'll use native fetch (Node 18+) or https module. 
// Given the environment, I'll try native fetch first.

const API_URL = 'https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-server/auth/login';
const ANON_KEY = 'sb_publishable_wbtQXJe6HXTFVNVPCSd1NA_FftkCiz3';

async function testLogin(username, password) {
    console.log(`Testing login for ${username}...`);
    try {
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': ANON_KEY,
                'Authorization': `Bearer ${ANON_KEY}`
            },
            body: JSON.stringify({ username, password })
        });

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            console.log('Response Status:', response.status);
            console.log('Response Body:', JSON.stringify(data, null, 2));
        } else {
            const text = await response.text();
            console.log('Response Status:', response.status);
            console.log('Response Text:', text);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

// Check if fetch is available (Node 18+)
if (!globalThis.fetch) {
    console.error('Native fetch not available. This script requires Node.js 18+.');
} else {
    testLogin('medhome', 'root');
}
