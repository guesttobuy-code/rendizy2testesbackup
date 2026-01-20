// Short-term shim declarations to silence unresolved-module errors
// These are intentional temporary stubs to allow the incremental TypeScript
// cleanup to proceed. Replace with proper types or real modules later.

declare module 'npm:*';
declare module 'jsr:*';

// Project-specific shims for modules that exist only at runtime or are generated
declare module '../lib/supabase/groups';
declare module '../lib/supabase/posts';
declare module '../components/CreatePostModal';

// Shims for project-local generated type modules
declare module '../types/*';

// Vite / plugin shims when types are not installed
declare module '@vitejs/plugin-react';
declare module '@supabase/supabase-js';

// Generic wildcard fallback for uncommon import map specifiers
declare module '*@supabase/*';

export {};
