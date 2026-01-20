export const config = { runtime: "nodejs" };

function escapeHtml(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export default function handler(req, res) {
  const u = new URL(req.url, "http://localhost");
  const siteSlug = u.searchParams.get("siteSlug") || "";
  const reservationId = u.searchParams.get("reservationId") || "";
  const returnUrl = u.searchParams.get("returnUrl") || "";

  res.statusCode = 200;
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store, max-age=0");

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Pagamento cancelado</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}
    .card{max-width:520px;margin:40px auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.10);padding:18px 18px}
    .title{font-size:18px;font-weight:800;margin:0 0 6px}
    .desc{font-size:14px;color:#334155;margin:0 0 14px;line-height:1.4}
    .row{display:flex;gap:10px;flex-wrap:wrap}
    .btn{appearance:none;border:1px solid rgba(0,0,0,.10);border-radius:12px;padding:10px 12px;font-weight:700;cursor:pointer;background:#f1f5f9;color:#0f172a;text-decoration:none;display:inline-block}
    .btn.primary{background:#10b981;color:#fff}
    .muted{margin-top:10px;color:#64748b;font-size:12px}
    code{background:#f1f5f9;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="card">
    <div class="title">Pagamento cancelado</div>
    <p class="desc">Você pode voltar ao site e tentar novamente.</p>
    <div class="row">
      <a class="btn primary" id="backBtn" href="#" rel="noopener noreferrer">Voltar ao site</a>
      <button class="btn" id="closeBtn" type="button">Fechar</button>
    </div>
    <div class="muted">siteSlug=<code>${escapeHtml(siteSlug)}</code> reserva=<code>${escapeHtml(reservationId)}</code></div>
  </div>

  <script>
    (function(){
      var CHECKOUT_CHANNEL = "rendizy_checkout_v1";
      var CHECKOUT_EVENT_KEY = "rendizy_checkout_event";
      var _bc = null;

      function emit(type,payload){
        try{ if(_bc) _bc.postMessage({type:type,payload:payload||null}); }catch(e){}
        try{ localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify({type:type,payload:payload||null,ts:Date.now()})); }catch(e){}
        try{ if(window.opener && window.opener.postMessage){ window.opener.postMessage({type:"rendizy_checkout",event:type,payload:payload||null}, location.origin); } }catch(e){}
      }

      var siteSlug = ${JSON.stringify(siteSlug)};
      var reservationId = ${JSON.stringify(reservationId)};
      var returnUrl = ${JSON.stringify(returnUrl)};

      try{ if("BroadcastChannel" in window) _bc = new BroadcastChannel(CHECKOUT_CHANNEL); }catch(e){}

      var backBtn = document.getElementById("backBtn");
      if(backBtn){
        backBtn.href = returnUrl || (location.origin + "/site/" + encodeURIComponent(siteSlug) + "/");
      }

      var closeBtn = document.getElementById("closeBtn");
      if(closeBtn){
        closeBtn.onclick = function(){ try{ window.close(); }catch(e){} };
      }

      emit("canceled", { type: "canceled", siteSlug: siteSlug, reservationId: reservationId, at: Date.now() });
    })();
  </script>
</body>
</html>`;

  res.end(html);
}
