// VERSÃO MINIMALISTA PARA TESTAR CORS
// Esta versão NÃO importa nada que possa causar erros
// Apenas responde a requisições com headers CORS corretos

console.log("✅ Edge Function iniciando - versão mínima");

Deno.serve(async (req) => {
  console.log(`📥 Request: ${req.method} ${new URL(req.url).pathname}`);

  // CORS Headers - aplicar em TODAS as respostas
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, apikey, X-Auth-Token',
  };

  // Handle preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    console.log("✅ Respondendo preflight OPTIONS");
    return new Response(null, {
      status: 204,
      headers: corsHeaders
    });
  }

  // Parse URL
  const url = new URL(req.url);
  const path = url.pathname;
  
  console.log(`🔍 Path: ${path}`);

  // ✅ Rota de LOGIN (temporária - mock response)
  if (path.includes('/auth/login') && req.method === 'POST') {
    console.log("🔐 Rota de login chamada");
    try {
      const body = await req.json();
      console.log("📧 Email:", body?.email);
      
      // TODO: Implementar login real com Supabase
      // Por enquanto, retorna sucesso mock
      return new Response(
        JSON.stringify({
          success: true,
          user: {
            id: "mock-user-123",
            email: body?.email || "user@example.com",
            name: "Usuário Mock",
            type: "superadmin"
          },
          token: "mock-token-" + Date.now(),
          message: "Login simulado com sucesso! (Backend em modo mínimo)"
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    } catch (error) {
      console.error("❌ Erro ao processar login:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Erro ao processar login"
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        }
      );
    }
  }

  // Resposta simples para qualquer outra rota
  return new Response(
    JSON.stringify({
      success: true,
      message: "Edge Function funcionando! (modo mínimo)",
      path: path,
      method: req.method,
      timestamp: new Date().toISOString(),
      info: "Backend em modo mínimo - apenas CORS e rotas básicas ativas"
    }),
    {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    }
  );
});

console.log("✅ Edge Function pronta");
