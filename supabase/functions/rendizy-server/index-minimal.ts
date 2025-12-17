// Teste mínimo do backend
import { Hono } from "npm:hono";

const app = new Hono();

// CORS simples
app.use("/*", async (c, next) => {
  if (c.req.method === 'OPTIONS') {
    c.header('Access-Control-Allow-Origin', '*');
    c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD');
    c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return c.body(null, 204);
  }
  await next();
  c.header('Access-Control-Allow-Origin', '*');
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Auth simples - para testar
app.post("/auth/login", async (c) => {
  try {
    const body = await c.req.json();
    return c.json({
      success: true,
      message: "Backend funcionando - teste mínimo",
      data: { username: body.username }
    });
  } catch (error) {
    return c.json({ success: false, error: String(error) }, 500);
  }
});

Deno.serve((req) => app.fetch(req));
