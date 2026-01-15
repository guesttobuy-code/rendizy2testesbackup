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
  <title>Confirmando pagamento…</title>
  <style>
    body{font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;margin:0;padding:24px;background:#f8fafc;color:#0f172a}
    .card{max-width:520px;margin:40px auto;background:#fff;border:1px solid rgba(0,0,0,.08);border-radius:16px;box-shadow:0 12px 40px rgba(0,0,0,.10);padding:18px 18px}
    .title{font-size:18px;font-weight:800;margin:0 0 6px}
    .desc{font-size:14px;color:#334155;margin:0 0 14px;line-height:1.4}
    .row{display:flex;gap:10px;flex-wrap:wrap}
    .btn{appearance:none;border:1px solid rgba(0,0,0,.10);border-radius:12px;padding:10px 12px;font-weight:700;cursor:pointer;background:#10b981;color:#fff;text-decoration:none;display:inline-block}
    .btn.secondary{background:#f1f5f9;color:#0f172a}
    .muted{margin-top:10px;color:#64748b;font-size:12px}
    .spinner{width:18px;height:18px;border-radius:50%;border:3px solid rgba(15,23,42,.15);border-top-color:#10b981;display:inline-block;vertical-align:middle;animation:spin 1s linear infinite;margin-right:8px}
    @keyframes spin{to{transform:rotate(360deg)}}
    code{background:#f1f5f9;padding:2px 6px;border-radius:8px}
  </style>
</head>
<body>
  <div class="card">
    <div class="title"><span class="spinner"></span>Confirmando pagamento…</div>
    <p class="desc">Aguarde alguns segundos enquanto confirmamos via webhook.</p>
    <div class="row" id="actions" style="display:none">
      <a class="btn" id="backBtn" href="#" rel="noopener noreferrer">Voltar ao site</a>
      <button class="btn secondary" id="closeBtn" type="button">Fechar</button>
    </div>
    <div class="muted" id="status">siteSlug=<code>${escapeHtml(siteSlug)}</code> reserva=<code>${escapeHtml(reservationId)}</code></div>
  </div>

  <script>
    (function(){
      var CHECKOUT_CHANNEL = "rendizy_checkout_v1";
      var CHECKOUT_CONFIRMED_KEY = "rendizy_checkout_confirmed";
      var CHECKOUT_EVENT_KEY = "rendizy_checkout_event";
      var _bc = null;

      function safeJsonParse(raw){
        try{ if(!raw||raw==="undefined"||raw==="null") return null; return JSON.parse(raw);}catch(e){return null;}
      }

      function emit(type,payload){
        try{ if(_bc) _bc.postMessage({type:type,payload:payload||null}); }catch(e){}
        try{ localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify({type:type,payload:payload||null,ts:Date.now()})); }catch(e){}
        try{ if(window.opener && window.opener.postMessage){ window.opener.postMessage({type:"rendizy_checkout",event:type,payload:payload||null}, location.origin); } }catch(e){}
      }

      function setConfirmed(info){
        try{ localStorage.setItem(CHECKOUT_CONFIRMED_KEY, JSON.stringify(info||{})); }catch(e){}
      }

      function isConfirmedReservation(r){
        if(!r) return false;
        var st = String(r.status || r.reservation_status || "").toLowerCase();
        var ps = String(r.paymentStatus || r.payment_status || "").toLowerCase();
        if(st === "confirmed") return true;
        if(ps === "paid" || ps === "confirmed") return true;
        return false;
      }

      function showActions(){
        try{
          var actions = document.getElementById("actions");
          if(actions) actions.style.display = "flex";
        }catch(e){}
      }

      var siteSlug = ${JSON.stringify(siteSlug)};
      var reservationId = ${JSON.stringify(reservationId)};
      var returnUrl = ${JSON.stringify(returnUrl)};

      try{
        if("BroadcastChannel" in window) _bc = new BroadcastChannel(CHECKOUT_CHANNEL);
      }catch(e){}

      var backBtn = document.getElementById("backBtn");
      if(backBtn){
        backBtn.href = returnUrl || (location.origin + "/site/" + encodeURIComponent(siteSlug) + "/");
      }

      var closeBtn = document.getElementById("closeBtn");
      if(closeBtn){
        closeBtn.onclick = function(){ try{ window.close(); }catch(e){} };
      }

      if(!siteSlug || !reservationId){
        document.title = "Pagamento confirmado";
        var st = document.getElementById("status");
        if(st) st.textContent = "Dados insuficientes para confirmar automaticamente.";
        showActions();
        return;
      }

      var tries = 0;
      var maxTries = 45;
      var delayMs = 1000;

      function tick(){
        tries++;
        // Usa endpoint público de status (não requer autenticação)
        fetch("/api/guest/reservations/status?siteSlug=" + encodeURIComponent(siteSlug) + "&reservationId=" + encodeURIComponent(reservationId))
          .then(function(r){ return r.json().catch(function(){ return null; }); })
          .then(function(j){
            // Resposta esperada: { success: true, data: { id, status, paymentStatus } }
            var hit = (j && j.success && j.data) ? j.data : null;

            if(hit && isConfirmedReservation(hit)){
              var info = { type: "confirmed", siteSlug: siteSlug, reservationId: String(reservationId), at: Date.now() };
              setConfirmed(info);
              emit("confirmed", info);

              document.title = "Reserva confirmada";
              var st = document.getElementById("status");
              if(st) st.textContent = "Confirmado! Você pode voltar ao site.";

              // Try close (works if this tab was opened by window.open).
              setTimeout(function(){ try{ window.close(); }catch(e){} }, 800);
              showActions();
              return;
            }

            if(tries < maxTries){
              setTimeout(tick, delayMs);
              return;
            }

            document.title = "Confirmando pagamento…";
            var st2 = document.getElementById("status");
            if(st2) st2.textContent = "Ainda confirmando… Se demorar, volte ao site e atualize (o webhook pode levar alguns segundos).";
            showActions();
          })
          .catch(function(){
            if(tries < maxTries) setTimeout(tick, delayMs);
            else showActions();
          });
      }

      tick();
    })();
  </script>
</body>
</html>`;

  res.end(html);
}
