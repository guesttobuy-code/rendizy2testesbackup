
require('dotenv').config({ path: '.env.local' });
console.log("DEBUG: Loading .env.local");
console.log("VITE_SUPABASE_URL:", process.env.VITE_SUPABASE_URL ? "EXISTS" : "MISSING");
console.log(
	"VITE_SUPABASE_ANON_KEY:",
	process.env.VITE_SUPABASE_ANON_KEY ? `EXISTS (len=${process.env.VITE_SUPABASE_ANON_KEY.length})` : "MISSING"
);

console.log("SUPABASE_URL:", process.env.SUPABASE_URL ? "EXISTS" : "MISSING");
console.log(
	"SUPABASE_ANON_KEY:",
	process.env.SUPABASE_ANON_KEY ? `EXISTS (len=${process.env.SUPABASE_ANON_KEY.length})` : "MISSING"
);
