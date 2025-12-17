
require('dotenv').config({ path: '.env.local' });
console.log("DEBUG: Loading .env.local");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "EXISTS" : "MISSING");
console.log("VITE_SUPABASE_ANON_KEY:", process.env.VITE_SUPABASE_ANON_KEY ? (process.env.VITE_SUPABASE_ANON_KEY.substring(0, 10) + "...") : "MISSING");
