// Vercel Serverless Function
// Generic client-site preview under this Vercel domain:
//   /site/<subdomain>
//   /site/<subdomain>/<assetPath>
//
// Why: Supabase Edge/Storage currently forces text/plain + sandbox CSP for HTML.
// We proxy the HTML through Vercel so the browser receives text/html and a usable CSP.
//
// Architecture notes:
// - docs/02-architecture/ARQUITETURA_CLIENT_SITES_PROXY_SUPABASE_MEDHOME_2026-01-04.md
//
// This proxy also contains a couple of surgical compatibility fallbacks used by the MedHome SPA:
// 1) Storage redirect mismatch: some environments redirect to /extracted/dist/index.html (missing);
//    we retry /public-sites/<subdomain>/index.html when Storage returns "Object not found".
// 2) Bundle compatibility: MedHome UI reads pricing.dailyRate but some datasets/bundles only provide pricing.basePrice.
//    We patch the compiled JS in-flight to populate dailyRate derived from basePrice.

import { Buffer } from "node:buffer";

const SUPABASE_PROJECT_REF = "odcgnzfremrqnvtitpcc";

function safeDecode(v) {
  try {
    return decodeURIComponent(String(v || ""));
  } catch {
    return String(v || "");
  }
}

function contentTypeForPath(pathname) {
  const ext = String(pathname || "").split("?")[0].split(".").pop()?.toLowerCase() || "";
  const map = {
    js: "application/javascript; charset=utf-8",
    mjs: "application/javascript; charset=utf-8",
    css: "text/css; charset=utf-8",
    html: "text/html; charset=utf-8",
    htm: "text/html; charset=utf-8",
    json: "application/json; charset=utf-8",
    svg: "image/svg+xml",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    ico: "image/x-icon",
    woff: "font/woff",
    woff2: "font/woff2",
    ttf: "font/ttf",
    eot: "application/vnd.ms-fontobject",
    map: "application/json; charset=utf-8",
    txt: "text/plain; charset=utf-8",
  };
  return map[ext] || "application/octet-stream";
}

function buildCsp() {
  const supabaseOrigin = `https://${SUPABASE_PROJECT_REF}.supabase.co`;
  const vercelLiveOrigin = "https://vercel.live";
  const googleOrigin = "https://accounts.google.com";

  return [
    "default-src 'self'",
    `connect-src 'self' https: ${supabaseOrigin} ${vercelLiveOrigin} ${googleOrigin}`,
    `img-src 'self' data: https: ${supabaseOrigin} ${googleOrigin}`,
    `script-src 'self' 'unsafe-inline' ${supabaseOrigin} ${vercelLiveOrigin} ${googleOrigin}`,
    `style-src 'self' 'unsafe-inline' https: ${supabaseOrigin} ${googleOrigin}`,
    `font-src 'self' data: https: ${supabaseOrigin}`,
    `frame-src 'self' ${vercelLiveOrigin} ${googleOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
  ].join("; ");
}

function patchHtmlForSubpath(html, baseHref, assetVersion) {
  let out = html;

  // Ensure we have a <base href="..."> so that relative assets resolve under our subpath.
  // baseHref MUST end with a trailing slash.
  const normalizedBaseHref = baseHref.endsWith("/") ? baseHref : `${baseHref}/`;

  if (/<base\s+href=/i.test(out)) {
    out = out.replace(/<base\s+href=["'][^"']*["']\s*\/?\s*>/gi, `<base href="${normalizedBaseHref}" />`);
  } else if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}\n  <base href="${normalizedBaseHref}" />`);
  }

  // Provide a small runtime config block for SPAs built without VITE_* envs.
  // This is public (anon key) and prevents the common blank-page crash:
  //   Uncaught Error: supabaseUrl is required.
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_REF}.supabase.co`).replace(/\/+$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const publicApiBase = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public/client-sites/api/{{SUBDOMAIN}}`;
  const runtimeConfigScript = `\n  <script>\n  (function(){\n    try {\n      var cfg = globalThis.RENDIZY_CONFIG || {};\n      cfg.supabaseUrl = cfg.supabaseUrl || ${JSON.stringify(supabaseUrl)};\n      cfg.supabaseAnonKey = cfg.supabaseAnonKey || ${JSON.stringify(anonKey)};\n      cfg.publicApiBase = cfg.publicApiBase || ${JSON.stringify(publicApiBase)};\n      globalThis.RENDIZY_CONFIG = cfg;\n      globalThis.__RENDIZY_SUPABASE_URL__ = globalThis.__RENDIZY_SUPABASE_URL__ || cfg.supabaseUrl;\n      globalThis.__RENDIZY_SUPABASE_ANON_KEY__ = globalThis.__RENDIZY_SUPABASE_ANON_KEY__ || cfg.supabaseAnonKey;\n    } catch (e) {}\n  })();\n  </script>`;

  // Auto-fill script: populates reservation form with guest data from localStorage
  // Guest-area stores: rendizy_guest_token (JWT) and rendizy_guest (JSON with user data)
  // We also check rendizy-guest-token for backward compat with old bolt sites
  const autoFillScript = `\n  <script>\n  (function(){\n    function getGuestData(){\n      try{\n        // Try rendizy_guest first (guest-area capsule stores full guest object)\n        var g=localStorage.getItem("rendizy_guest");\n        if(g)return JSON.parse(g);\n        // Try rendizy_guest_token JWT payload\n        var t=localStorage.getItem("rendizy_guest_token")||localStorage.getItem("rendizy-guest-token");\n        if(t){\n          var parts=t.split(".");\n          if(parts.length>=2)return JSON.parse(atob(parts[1]));\n        }\n        return null;\n      }catch(e){console.log("getGuestData error:",e);return null;}\n    }\n    function fillForm(){\n      var g=getGuestData();\n      console.log("fillForm guest data:",g);\n      if(!g)return;\n      var name=g.name||g.full_name||g.displayName||"";\n      var email=g.email||"";\n      var phone=g.phone||g.telefone||"";\n      console.log("fillForm fields:",{name:name,email:email,phone:phone});\n      // Try multiple selectors for each field\n      var nameInp=document.querySelector('input[placeholder*="nome" i],input[placeholder*="name" i],input[name="name"],input[name="nome"],input[name="fullName"],input[name="guestName"]');\n      if(nameInp&&!nameInp.value&&name){console.log("Filling name:",name);nameInp.value=name;nameInp.dispatchEvent(new Event("input",{bubbles:true}));nameInp.dispatchEvent(new Event("change",{bubbles:true}));}\n      var emailInp=document.querySelector('input[type="email"],input[placeholder*="email" i],input[name="email"],input[name="guestEmail"]');\n      if(emailInp&&!emailInp.value&&email){console.log("Filling email:",email);emailInp.value=email;emailInp.dispatchEvent(new Event("input",{bubbles:true}));emailInp.dispatchEvent(new Event("change",{bubbles:true}));}\n      var phoneInp=document.querySelector('input[type="tel"],input[placeholder*="telefone" i],input[placeholder*="phone" i],input[name="phone"],input[name="telefone"],input[name="guestPhone"]');\n      if(phoneInp&&!phoneInp.value&&phone){console.log("Filling phone:",phone);phoneInp.value=phone;phoneInp.dispatchEvent(new Event("input",{bubbles:true}));phoneInp.dispatchEvent(new Event("change",{bubbles:true}));}\n    }\n    // Run on load and observe DOM changes\n    function init(){\n      fillForm();\n      var obs=new MutationObserver(function(){setTimeout(fillForm,100);});\n      obs.observe(document.body||document.documentElement,{childList:true,subtree:true});\n    }\n    if(document.readyState==="complete"||document.readyState==="interactive")setTimeout(init,500);\n    else window.addEventListener("DOMContentLoaded",function(){setTimeout(init,500);});\n  })();\n  </script>`;

  if (/<head[^>]*>/i.test(out) && !/RENDIZY_CONFIG\s*=/.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}${runtimeConfigScript}${autoFillScript}`);
  }

  // Convert absolute-root assets to relative so baseHref applies.
  out = out.replace(/\s(src|href)="\/assets\//gi, ' $1="assets/');
  out = out.replace(/\s(src|href)="\.\/assets\//gi, ' $1="assets/');

  // Propagate cache-buster from the page URL to assets so Chrome doesn't keep
  // an old immutable JS bundle after a new upload/deploy.
  if (assetVersion) {
    const v = encodeURIComponent(String(assetVersion));
    out = out.replace(/\s(src|href)="(assets\/[^"']+)"/gi, (_m, attr, url) => {
      const u = String(url || "");
      if (!u || u.includes("#")) return ` ${attr}="${u}"`;
      if (/[?&]v=/.test(u)) return ` ${attr}="${u}"`;
      const sep = u.includes("?") ? "&" : "?";
      return ` ${attr}="${u}${sep}v=${v}"`;
    });
  }

  // Common root-level static files.
  out = out.replace(/\s(href)="\/(favicon\.(ico|png|svg)|manifest\.webmanifest|robots\.txt)(\?[^"#]*)?"/gi, ' $1="$2$4"');

  // Vite default icon (common in Bolt/Vite outputs).
  out = out.replace(/\s(src|href)="\/vite\.svg(\?[^"#]*)?"/gi, ' $1="vite.svg$2"');
  // If the site doesn't ship vite.svg, remove the icon tag to avoid 502 noise.
  out = out.replace(/\s*<link[^>]*rel=["']icon["'][^>]*href=["']vite\.svg[^"']*["'][^>]*>\s*/gi, "\n");

  return out;
}

function looksLikeFilePath(cleanPath) {
  const p = String(cleanPath || "");
  if (!p) return false;

  // Explicitly treat Vite build output folder as files.
  if (p.startsWith("assets/")) return true;

  // Last path segment has an extension (e.g. .js, .css, .png, .svg, .map, ...)
  return /(^|\/)[^\/]+\.[a-z0-9]+$/i.test(p);
}

function cleanRequestedPath(p) {
  const clean = String(p || "").replace(/^\/+/, "");
  if (!clean) return "";
  if (clean.includes("..")) return null;
  if (/^https?:\/\//i.test(clean)) return null;
  return clean;
}

function buildUpstreamAssetUrl(baseUrl, cleanPath, req) {
  const u = new URL(req.url, "http://localhost");
  const passthrough = new URLSearchParams(u.search);
  passthrough.delete("subdomain");
  passthrough.delete("path");
  const qs = passthrough.toString();
  return qs ? `${baseUrl}/${cleanPath}?${qs}` : `${baseUrl}/${cleanPath}`;
}

function patchClientSiteJs(jsText, { subdomain }) {
  let out = jsText;
  if (!out) return out;

  // Generic Bolt/Vite placeholder substitution.
  // Many ZIPs ship template values like {{API_BASE_URL}} and {{PUBLIC_ANON_KEY}}.
  // If we don't replace them, some bundles initialize SDKs with undefined and crash.
  const publicApiBase = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public/client-sites/api/${encodeURIComponent(
    subdomain
  )}`;
  const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || `https://${SUPABASE_PROJECT_REF}.supabase.co`).replace(/\/+$/, "");

  out = out
    .replaceAll("{{PROJECT_ID}}", SUPABASE_PROJECT_REF)
    .replaceAll("{{API_BASE_URL}}", publicApiBase)
    .replaceAll("{{PUBLIC_ANON_KEY}}", anonKey)
    .replaceAll("{{SUPABASE_URL}}", supabaseUrl);

  // Supabase-js hard crash guard + fallback to runtime-injected config.
  // We patch minified patterns via regex to handle varying function names (Fb, Ub, Xb, etc.)
  // - URL normalization: function XX(e){const t=...;if(!t)throw new Error("supabaseUrl is required.")
  // - createClient wrapper: const XX=(e,t,n)=>new YY(e,t,n);
  // - key required: if(!n)throw new Error("supabaseKey is required.")

  // URL normalization pattern (generic): matches any 2-char function name.
  // Before: function Ub(e){const t=e==null?void 0:e.trim();if(!t)throw new Error("supabaseUrl is required.");
  // After: function Ub(e){const t=(e==null?void 0:e.trim())||((globalThis.RENDIZY_CONFIG&&...))||...; if(!t)throw...
  out = out.replace(
    /function\s+([A-Za-z_$][A-Za-z0-9_$]*)\(([a-z])\)\{const\s+([a-z])=\2==null\?void 0:\2\.trim\(\);if\(!\3\)throw new Error\("supabaseUrl is required\."\);/g,
    (_match, fnName, argName, varName) =>
      `function ${fnName}(${argName}){const ${varName}=(${argName}==null?void 0:${argName}.trim())||((globalThis.RENDIZY_CONFIG&&globalThis.RENDIZY_CONFIG.supabaseUrl)||globalThis.__RENDIZY_SUPABASE_URL__||globalThis.__SUPABASE_URL__||"").trim();if(!${varName})throw new Error("supabaseUrl is required.");`
  );

  // createClient wrapper pattern (generic): const XX=(e,t,n)=>new YY(e,t,n);
  out = out.replace(
    /const\s+([A-Za-z_$][A-Za-z0-9_$]*)=\(([a-z]),([a-z]),([a-z])\)=>new\s+([A-Za-z_$][A-Za-z0-9_$]*)\(\2,\3,\4\);/g,
    (_match, wrapperName, e, t, n, className) =>
      `const ${wrapperName}=(${e},${t},${n})=>{try{${e}=${e}||((globalThis.RENDIZY_CONFIG&&globalThis.RENDIZY_CONFIG.supabaseUrl)||globalThis.__RENDIZY_SUPABASE_URL__||globalThis.__SUPABASE_URL__||"");${t}=${t}||((globalThis.RENDIZY_CONFIG&&globalThis.RENDIZY_CONFIG.supabaseAnonKey)||globalThis.__RENDIZY_SUPABASE_ANON_KEY__||globalThis.__SUPABASE_ANON_KEY__||"");return ${e}&&String(${e}).trim()&&${t}?new ${className}(${e},${t},${n}):null}catch{return null}};`
  );

  // supabaseKey required pattern
  const keyNeedle = 'if(!n)throw new Error("supabaseKey is required.");';
  if (out.includes(keyNeedle)) {
    const keyReplacement =
      'n=n||((globalThis.RENDIZY_CONFIG&&globalThis.RENDIZY_CONFIG.supabaseAnonKey)||globalThis.__RENDIZY_SUPABASE_ANON_KEY__||globalThis.__SUPABASE_ANON_KEY__||"");if(!n)throw new Error("supabaseKey is required.");';
    out = out.replace(keyNeedle, keyReplacement);
  }

  // MedHome: The bundle normalizer (`fp`) currently emits pricing.basePrice but the UI reads pricing.dailyRate.
  // Keep this surgical: exact substring replacement.
  const pricingNeedle = 'pricing:{basePrice:Nn(r.basePrice,0),currency:r.currency??"BRL"}';
  if (out.includes(pricingNeedle)) {
    const pricingReplacement =
      'pricing:{basePrice:Nn(r.basePrice,0),currency:r.currency??"BRL",dailyRate:Nn(r.dailyRate??r.basePrice,0),weeklyRate:Nn(r.weeklyRate??0),monthlyRate:Nn(r.monthlyRate??0)}';
    out = out.replace(pricingNeedle, pricingReplacement);
  }

  // MedHome availability check fix:
  // The bundle has a function eS(e,t,n) that checks if dates are available.
  // Problem: It checks for a.available (boolean) but the API returns a.status (string).
  // Pattern: if(!a||!a.available)return!1
  // Fix: Replace with: if(!a||(a.status!=="available"&&a.available!==true))return!1
  // This makes it work with both old format (available: boolean) and new format (status: string)
  const availCheckNeedle = 'if(!a||!a.available)return!1';
  if (out.includes(availCheckNeedle)) {
    out = out.replace(
      availCheckNeedle,
      'if(!a||(a.status?a.status!=="available":!a.available))return!1'
    );
  }

  // MedHome calendar mock data fix:
  // The bundle ships with a mock function that generates fake blocked dates:
  //   async function Qk(e,t,n){return cd()?{success:!0,data:Yk(e,t,n)}:...}
  // Where Yk(e,t,n) generates: [Date.now()+2days, +3days, +10days, +15days, +16days]
  // We replace it with a real API call to /calendar endpoint.
  // Pattern: async function Qk(e,t,n){return cd()?{success:!0,data:Yk(e,t,n)}:{success:!1,error:"Subdomain não detectado"}}
  // e = propertyId, t = startDate, n = endDate
  const calendarMockNeedle = /async function\s+([A-Za-z_$][A-Za-z0-9_$]*)\(([a-z]),([a-z]),([a-z])\)\{return\s+cd\(\)\?\{success:!0,data:([A-Za-z_$][A-Za-z0-9_$]*)\(\2,\3,\4\)\}:\{success:!1,error:"Subdomain não detectado"\}\}/g;
  out = out.replace(calendarMockNeedle, (_match, fnName, e, t, n, _mockFn) => {
    // Real implementation that calls the /calendar API endpoint
    return `async function ${fnName}(${e},${t},${n}){const sd=cd();if(!sd)return{success:!1,error:"Subdomain não detectado"};try{const cfg=globalThis.RENDIZY_CONFIG||{};const base=cfg.publicApiBase||"https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public/client-sites/api/"+sd;const url=base+"/calendar?propertyId="+encodeURIComponent(${e})+"&startDate="+encodeURIComponent(${t})+"&endDate="+encodeURIComponent(${n});const r=await fetch(url);if(!r.ok){const txt=await r.text().catch(()=>"");return{success:!1,error:txt||"HTTP "+r.status}}const data=await r.json();return{success:!0,data:data.days||[]}}catch(err){return{success:!1,error:String(err&&err.message||err)}}}`;
  });

  // Bundle safety (generic): some bundles initialize Supabase client with undefined
  // (e.g. `ww(void 0, void 0)`), which throws and blanks the whole page.
  // Guard the factory so missing config doesn't crash the SPA.
  const supabaseFactoryGuard = (params, args) => {
    const parts = String(params || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const a = parts[0] || "e";
    const b = parts[1] || "t";
    const callArgs = String(args || "").trim() || `${a},${b}`;
    return `ww=(${params})=>{try{return ${a}&&String(${a}).trim()&&${b}?new yw(${callArgs}):null}catch{return null}}`;
  };

  // Common minified arrow form:
  //   const ww=(e,t,n)=>new yw(e,t,n);
  out = out.replace(
    /(const|let|var)\s+ww=\(([^)]*)\)=>new\s+yw\(([^)]*)\);?/g,
    (_m, decl, params, args) => `${decl} ${supabaseFactoryGuard(params, args)};`
  );

  // Function form (less common, but seen in some bundles):
  //   function ww(e,t,n){return new yw(e,t,n)}
  out = out.replace(
    /function\s+ww\(([^)]*)\)\{return\s+new\s+yw\(([^)]*)\)\}/g,
    (_m, params, args) => {
      const parts = String(params || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const a = parts[0] || "e";
      const b = parts[1] || "t";
      const callArgs = String(args || "").trim() || `${a},${b}`;
      return `function ww(${params}){try{return ${a}&&String(${a}).trim()&&${b}?new yw(${callArgs}):null}catch{return null}}`;
    }
  );

  // MedHome: Fix "Voltar para a Home" button on pagamento-sucesso and pagamento-cancelado pages.
  // Problem: The minified bundle uses onClick:()=>e("/") where e should be navigate() from React Router.
  // But some bundles have scope issues where e is undefined or not a function.
  // Fix: Replace onClick:()=>e("/") with a direct window.location.hash assignment.
  // This is a safe fallback that works regardless of React Router state.
  out = out.replace(
    /onClick:\(\)=>e\("\/"\)/g,
    'onClick:()=>(window.location.hash="#/")'
  );

  // MedHome/Bolt: Fix InternalAreaPage (área interna) placeholder.
  // Problem: Old bundles show "Em breve você poderá ver suas reservas aqui" instead of redirecting to guest-area capsule.
  // The function s1() (or similar) manages login + placeholder. We inject a useEffect redirect at the start.
  // Pattern: function s1(){const[e,t]=k.useState(!1),[i,o]=k.useState(null)
  // Fix: Inject useEffect that redirects to guest-area capsule before the existing state hooks.
  const internalAreaPattern = /function\s+s1\(\)\{const\[e,t\]=k\.useState\(!1\),\[i,o\]=k\.useState\(null\)/g;
  out = out.replace(internalAreaPattern, () => {
    // Inject useEffect that redirects to guest-area with theme colors
    // Use subdomain directly since it's already known from the URL path
    const guestAreaUrl = 'https://rendizy2testesbackup.vercel.app/guest-area/';
    return `function s1(){k.useEffect(()=>{window.location.href='${guestAreaUrl}?slug=${subdomain}&primary=%235DBEBD&secondary=%23FF8B94&accent=%234a9d9c';},[]);const[e,t]=k.useState(!1),[i,o]=k.useState(null)`;
  });

  // Also replace the placeholder text just in case the pattern doesn't match exactly
  out = out.replace(
    /Em breve você poderá ver suas reservas aqui\./g,
    'Redirecionando para área do cliente...'
  );

  // ============================================================================
  // PATCH #2: Header shows logged-in state from guest-area token
  // ============================================================================
  // Problem: User logged in guest-area, but site header still shows "Faça Login"
  // Solution: Inject code that checks localStorage for rendizy_guest (underscore, not hyphen)
  // and updates the header to show user info if logged in.
  // 
  // We look for the "Faça Login" button pattern and wrap it with a conditional
  // that checks for guest data first.
  // Pattern: children:"Faça Login" or similar
  out = out.replace(
    /children:"Faça Login"/g,
    'children:(()=>{try{var g=localStorage.getItem("rendizy_guest");if(g){var d=JSON.parse(g);if(d&&d.name)return d.name.split(" ")[0]}var t=localStorage.getItem("rendizy_guest_token")||localStorage.getItem("rendizy-guest-token");if(t){var p=JSON.parse(atob(t.split(".")[1]));if(p&&p.name)return p.name.split(" ")[0]}return"Faça Login"}catch(e){return"Faça Login"}})()'
  );

  // ============================================================================
  // PATCH #3: Redirect "Faça Login" button to guest-area
  // ============================================================================
  // Problem: Login button in site doesn't work or goes to wrong place
  // Solution: Make it redirect to guest-area with return URL
  // Pattern: onClick for login button
  const loginButtonPattern = /to:"\/area-interna"/g;
  const guestAreaLoginUrl = `https://rendizy2testesbackup.vercel.app/guest-area/?slug=${subdomain}&returnUrl=`;
  out = out.replace(
    loginButtonPattern,
    `to:"#",onClick:(e)=>{e.preventDefault();const ret=encodeURIComponent(window.location.href);window.location.href='${guestAreaLoginUrl}'+ret;}`
  );

  // ============================================================================
  // PATCH #4: Auto-fill reservation form with guest data
  // ============================================================================
  // Problem: Even logged in, user has to re-enter name, email, phone
  // Solution: Inject code to auto-populate form from guest token
  // We inject this at document ready to populate any form fields
  // This is injected into the HTML, not JS (see patchHtmlForSubpath)

  // ============================================================================
  // PATCH #5: Change reservation status messages
  // ============================================================================
  // Problem: Shows "Reserva Confirmada" before payment is complete
  // Solution: Change text to indicate pre-reservation pending payment
  out = out.replace(
    /Reserva Confirmada/g,
    'Pré-Reserva Registrada'
  );
  out = out.replace(
    /Sua reserva foi confirmada com sucesso/g,
    'Sua pré-reserva foi registrada! Aguardando confirmação do pagamento'
  );
  out = out.replace(
    /reserva foi realizada/gi,
    'pré-reserva foi registrada'
  );

  return out;
}

async function resolveStorageIndexUrl(serveUrl) {
  const r = await fetch(serveUrl, { redirect: "manual" });

  const loc = r.headers.get("location");
  if (loc && (r.status === 301 || r.status === 302 || r.status === 303 || r.status === 307 || r.status === 308)) {
    return new URL(loc, serveUrl).toString();
  }

  // Fallback: if upstream serves HTML directly, keep its url.
  return r.url;
}

function buildFallbackIndexUrlFromRedirect(indexUrl, subdomain) {
  try {
    const u = new URL(indexUrl);

    // Expected failing redirect observed in some environments:
    // /storage/v1/object/public/client-sites/<orgId>/extracted/dist/index.html
    const marker = "/storage/v1/object/public/client-sites/";
    const i = u.pathname.indexOf(marker);
    if (i < 0) return null;

    const after = u.pathname.slice(i + marker.length);
    const parts = after.split("/").filter(Boolean);
    if (parts.length < 4) return null;

    const orgId = parts[0];
    const hasExtractedDist = parts[1] === "extracted" && parts[2] === "dist";
    const isIndex = parts[3] === "index.html";
    if (!hasExtractedDist || !isIndex) return null;

    // Alternative path that exists in this project:
    // /storage/v1/object/public/client-sites/<orgId>/public-sites/<subdomain>/index.html
    u.pathname = `${marker}${orgId}/public-sites/${encodeURIComponent(subdomain)}/index.html`;
    return u.toString();
  } catch {
    return null;
  }
}

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  try {
    const reqUrl = new URL(req.url, "http://localhost");
    // Auto-generate cache-buster if not provided.
    // This ensures new uploads invalidate browser cache for JS/CSS assets.
    // We use hourly granularity to balance freshness vs CDN efficiency.
    const explicitV = reqUrl.searchParams.get("v") || "";
    const autoV = String(Math.floor(Date.now() / 3600000)); // changes every hour
    const cacheBuster = explicitV || autoV;
    const subdomain = req.query && req.query.subdomain ? safeDecode(req.query.subdomain) : "";
    const requestedPath = req.query && req.query.path ? safeDecode(req.query.path) : "";
    const debug = req.query && String(req.query.debug || "") === "1";

    if (!subdomain) {
      res.statusCode = 400;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.end("Faltou subdomain");
      return;
    }

    // This endpoint is public (verify_jwt = false) and will redirect to Storage index.html
    const serveUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public/client-sites/serve/${encodeURIComponent(
      subdomain
    )}`;

    const indexUrl = await resolveStorageIndexUrl(serveUrl);
    let finalIndexUrl = indexUrl;
    let resp = await fetch(indexUrl, { redirect: "follow" });

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");

      // Supabase Storage may return a JSON body like:
      // {"statusCode":"404","error":"not_found","message":"Object not found"}
      // In some deployments the serve endpoint redirects to an old path (extracted/dist).
      // Try an alternate public-sites path before failing.
      if (body && body.includes("Object not found")) {
        const fallback = buildFallbackIndexUrlFromRedirect(indexUrl, subdomain);
        if (fallback && fallback !== indexUrl) {
          const r2 = await fetch(fallback, { redirect: "follow" });
          if (r2.ok) {
            resp = r2;
            finalIndexUrl = fallback;
          }
        }
      }

      if (!resp.ok) {
        res.statusCode = 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        const dbg = debug ? `\n\n[debug]\nindexUrl=${indexUrl}\nfinalIndexUrl=${finalIndexUrl}` : "";
        res.end(`Falha ao buscar site (upstream ${resp.status}).\n${body}${dbg}`);
        return;
      }
    }

    const baseUrl = finalIndexUrl.replace(/\/index\.html(\?.*)?$/i, "");

    // Asset requests: proxy from Storage through Vercel (avoids CORS/module-script issues).
    if (requestedPath && requestedPath !== "/") {
      const clean = cleanRequestedPath(requestedPath);
      if (!clean) {
        res.statusCode = 400;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.end("Path inválido");
        return;
      }

      // SPA deep-link fallback:
      // If the request doesn't look like a real file (no extension), serve index.html.
      // This makes BrowserRouter-style apps work on refresh/deep-links under /site/<subdomain>/.
      if (!looksLikeFilePath(clean)) {
        const html = await resp.text();
        const patched = patchHtmlForSubpath(html, `/site/${encodeURIComponent(subdomain)}/`, cacheBuster);

        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        // s-maxage=0 prevents Vercel CDN from caching, ensuring uploads reflect immediately
        res.setHeader("Cache-Control", "public, s-maxage=0, max-age=60, stale-while-revalidate=30");
        // Force Vercel edge to never cache this response
        res.setHeader("CDN-Cache-Control", "no-store");
        res.setHeader("Vercel-CDN-Cache-Control", "no-store");
        res.setHeader("Content-Security-Policy", buildCsp());
        res.setHeader("X-Content-Type-Options", "nosniff");

        res.end(patched);
        return;
      }

      const assetUrl = buildUpstreamAssetUrl(baseUrl, clean, req);
      const assetResp = await fetch(assetUrl, { redirect: "follow" });

      if (!assetResp.ok) {
        const body = await assetResp.text().catch(() => "");
        res.statusCode = 502;
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        const dbg = debug
          ? `\n\n[debug]\nindexUrl=${indexUrl}\nbaseUrl=${baseUrl}\nassetUrl=${assetUrl}`
          : "";
        res.end(`Falha ao buscar asset (upstream ${assetResp.status}).\n${body}${dbg}`);
        return;
      }

      const upstreamCt = assetResp.headers.get("content-type");
      const guessed = contentTypeForPath(clean);
      const ct =
        !upstreamCt ||
        /^text\/plain\b/i.test(upstreamCt) ||
        /^application\/octet-stream\b/i.test(upstreamCt)
          ? guessed
          : upstreamCt;

      // Patch MedHome bundle in-flight to fix pricing.dailyRate.
      // We only do this for JS assets (safe no-op if substring is not found).
      if (/\bjavascript\b/i.test(ct) || /\.m?js($|\?)/i.test(clean)) {
        const jsText = await assetResp.text();
        const patchedText = patchClientSiteJs(jsText, { subdomain });

        res.statusCode = 200;
        res.setHeader("Content-Type", ct);
        res.setHeader(
          "Cache-Control",
          clean.startsWith("assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600"
        );
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(patchedText);
        return;
      }

      const buf = Buffer.from(await assetResp.arrayBuffer());

      res.statusCode = 200;
      res.setHeader("Content-Type", ct);
      res.setHeader(
        "Cache-Control",
        clean.startsWith("assets/") ? "public, max-age=31536000, immutable" : "public, max-age=3600"
      );
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.end(buf);
      return;
    }

    const html = await resp.text();
    const patched = patchHtmlForSubpath(html, `/site/${encodeURIComponent(subdomain)}/`, cacheBuster);

    res.statusCode = 200;
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    // IMPORTANT: Use s-maxage=0 to prevent Vercel CDN from caching the HTML response.
    // This ensures new uploads are visible immediately without cache invalidation.
    // Browser can still cache for 60s, but Vercel edge will always fetch fresh from function.
    res.setHeader("Cache-Control", "public, s-maxage=0, max-age=60, stale-while-revalidate=30");
    // Force Vercel edge to NEVER cache HTML - ensures new uploads are visible immediately
    res.setHeader("CDN-Cache-Control", "no-store");
    res.setHeader("Vercel-CDN-Cache-Control", "no-store");
    res.setHeader("Content-Security-Policy", buildCsp());
    res.setHeader("X-Content-Type-Options", "nosniff");

    res.end(patched);
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end(`Erro ao servir site: ${err?.message || String(err)}`);
  }
}
