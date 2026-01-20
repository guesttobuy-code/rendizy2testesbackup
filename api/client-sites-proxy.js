// Vercel Serverless Function
// Proxy for client-sites API requests to Supabase Edge Functions
//
// This proxies requests from:
//   /client-sites/api/:subdomain/:endpoint
// To:
//   https://odcgnzfremrqnvtitpcc.supabase.co/functions/v1/rendizy-public/client-sites/api/:subdomain/:endpoint

const SUPABASE_PROJECT_REF = "odcgnzfremrqnvtitpcc";

export default async function handler(request) {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
        "Access-Control-Max-Age": "86400",
      },
    });
  }

  // Get the path from the URL
  const url = new URL(request.url);
  const path = url.pathname;
  const queryString = url.search || "";

  // Construct Supabase URL
  const supabaseUrl = `https://${SUPABASE_PROJECT_REF}.supabase.co/functions/v1/rendizy-public${path}${queryString}`;

  console.log(`[client-sites-proxy] Proxying ${path} → ${supabaseUrl}`);

  try {
    // Copy headers from incoming request
    const headers = new Headers();
    
    // Forward relevant headers
    const forwardHeaders = ["content-type", "authorization", "accept", "accept-language"];
    for (const header of forwardHeaders) {
      const value = request.headers.get(header);
      if (value) {
        headers.set(header, value);
      }
    }

    // Make request to Supabase
    const response = await fetch(supabaseUrl, {
      method: request.method,
      headers: headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? await request.text() : undefined,
    });

    // Build response headers with CORS
    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    // Return proxied response
    return new Response(await response.text(), {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error("[client-sites-proxy] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: "Proxy error", details: error.message }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

export const config = {
  runtime: "edge",
};
