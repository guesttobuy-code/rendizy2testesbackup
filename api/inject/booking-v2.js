export const config = { runtime: "nodejs" };

export default function handler(req, res) {
  // Versioned, cacheable browser script injected into client sites.
  // Purpose:
  // - Autofill + validate booking form (phone country/prefix required)
  // - Lock name/email/phone when authenticated; edits only in Guest Area profile
  // - Checkout flow: ensure Stripe success/cancel URLs point to our domain pages
  // - Cross-tab confirmation: show "Reserva confirmada" on the original site tab

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/javascript; charset=utf-8");

  // Cache aggressively; use ?v=... in the injected src for busting.
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

  res.end(`(function(){
    "use strict";

    // Debug marker: proves the inject script loaded/executed.
    // You can check in DevTools Console:
    //   window.__RENDIZY_BOOKING_V2__
    try {
      var cs = document.currentScript && document.currentScript.src ? String(document.currentScript.src) : "";
      window.__RENDIZY_BOOKING_V2__ = {
        loadedAt: Date.now(),
        scriptSrc: cs,
        location: String(location.href || ""),
      };
    } catch (e) {}

    var _fillAttempts = 0;
    var _maxFillAttempts = 80;
    var _lastFillTime = 0;
    var _submitBound = false;

    var CHECKOUT_CHANNEL = "rendizy_checkout_v1";
    var CHECKOUT_PENDING_KEY = "rendizy_checkout_pending";
    var CHECKOUT_CONFIRMED_KEY = "rendizy_checkout_confirmed";
    var CHECKOUT_EVENT_KEY = "rendizy_checkout_event";
    var _bc = null;

    var COUNTRIES = [
      { code: "BR", name: "Brasil", dial: "55", flag: "🇧🇷" },
      { code: "PT", name: "Portugal", dial: "351", flag: "🇵🇹" },
      { code: "US", name: "Estados Unidos", dial: "1", flag: "🇺🇸" },
      { code: "CA", name: "Canadá", dial: "1", flag: "🇨🇦" },
      { code: "GB", name: "Reino Unido", dial: "44", flag: "🇬🇧" },
      { code: "ES", name: "Espanha", dial: "34", flag: "🇪🇸" },
      { code: "FR", name: "França", dial: "33", flag: "🇫🇷" },
      { code: "DE", name: "Alemanha", dial: "49", flag: "🇩🇪" },
      { code: "IT", name: "Itália", dial: "39", flag: "🇮🇹" },
      { code: "AR", name: "Argentina", dial: "54", flag: "🇦🇷" },
      { code: "CL", name: "Chile", dial: "56", flag: "🇨🇱" },
      { code: "CO", name: "Colômbia", dial: "57", flag: "🇨🇴" },
      { code: "MX", name: "México", dial: "52", flag: "🇲🇽" },
      { code: "UY", name: "Uruguai", dial: "598", flag: "🇺🇾" },
      { code: "PY", name: "Paraguai", dial: "595", flag: "🇵🇾" },
    ];

    function safeJsonParse(raw) {
      try {
        if (!raw || raw === "undefined" || raw === "null") return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function normalizeDigits(s) {
      return String(s || "").replace(/\D+/g, "");
    }

    function parseE164(v) {
      var s = String(v || "").trim();
      if (!s.startsWith("+")) return null;
      var digits = normalizeDigits(s);
      if (!digits) return null;
      var best = null;
      for (var i = 0; i < COUNTRIES.length; i++) {
        var d = COUNTRIES[i].dial;
        if (digits.startsWith(d)) {
          if (!best || d.length > best.dial.length) best = COUNTRIES[i];
        }
      }
      if (!best) return { dial: "", national: digits };
      return { dial: best.dial, national: digits.slice(best.dial.length) };
    }

    function getSiteSlug() {
      try {
        var parts = (location.pathname || "/").split("/").filter(Boolean);
        var i = parts.indexOf("site");
        if (i >= 0 && parts.length > i + 1) return decodeURIComponent(parts[i + 1] || "");
      } catch (e) {}
      return "";
    }

    function getLocalProfile() {
      try {
        var raw = localStorage.getItem("rendizy_guest_profile");
        if (!raw || raw === "undefined" || raw === "null") return null;
        var obj = JSON.parse(raw);
        return obj && typeof obj === "object" ? obj : null;
      } catch (e) {
        return null;
      }
    }

    function mergeProfileIntoGuest(guest) {
      var g = guest && typeof guest === "object" ? guest : null;
      var prof = getLocalProfile();
      if (!g && prof) return { phone: prof.phone || "", dial: prof.dial || "" };
      if (!g) return null;
      if (prof) {
        if (!g.phone && prof.phone) g.phone = prof.phone;
        if (!g.dial && prof.dial) g.dial = prof.dial;
      }
      return g;
    }

    function isAuthenticatedGuest(g) {
      return !!(g && (g.email || g.id));
    }

    function lockInput(inp) {
      try {
        if (!inp) return;
        inp.readOnly = true;
        inp.setAttribute("aria-readonly", "true");
        inp.style.background = "#f3f4f6";
        inp.style.cursor = "not-allowed";
      } catch (e) {}
    }

    function addHintAfter(el, html) {
      try {
        if (!el || !el.parentNode) return;
        
        // Procurar hint existente em qualquer ancestral próximo
        var existingInParent = el.parentNode.querySelector(".rendizy-guest-hint");
        var existingInGrandparent = el.parentNode.parentNode && el.parentNode.parentNode.querySelector(".rendizy-guest-hint");
        if (existingInParent || existingInGrandparent) return;
        
        var d = document.createElement("div");
        d.className = "rendizy-guest-hint";
        d.style.fontSize = "12px";
        d.style.color = "#6b7280";
        d.style.marginTop = "6px";
        d.style.width = "100%"; // Garantir que ocupa largura total
        d.style.flexBasis = "100%"; // Forçar quebra de linha em flex
        d.innerHTML = html;
        
        // Inserir no container mais apropriado (evitar quebrar layouts flex)
        var target = el.parentNode;
        // Se o pai é um flex container com outros elementos, inserir no avô
        var parentStyle = window.getComputedStyle(target);
        if (parentStyle.display === "flex" && target.childElementCount > 1) {
          // Inserir após o container flex, não dentro dele
          if (target.parentNode) {
            target.parentNode.insertBefore(d, target.nextSibling);
            return;
          }
        }
        
        target.appendChild(d);
      } catch (e) {}
    }

    function syncFromCookie(cb) {
      try {
        var sd = getSiteSlug();
        if (!sd) {
          cb && cb(null);
          return;
        }
        fetch("/api/auth/me?siteSlug=" + encodeURIComponent(sd), { credentials: "include" })
          .then(function (r) {
            return r.json().catch(function () {
              return null;
            });
          })
          .then(function (d) {
            if (d && d.authenticated && d.user) {
              var u = mergeProfileIntoGuest(d.user) || d.user;
              try {
                localStorage.setItem("rendizy_guest", JSON.stringify(u));
              } catch (e) {}
              try {
                globalThis.__RENDIZY_GUEST__ = u;
              } catch (e) {}
              cb && cb(u);
              return;
            }
            try {
              localStorage.removeItem("rendizy_guest");
            } catch (e) {}
            try {
              globalThis.__RENDIZY_GUEST__ = null;
            } catch (e) {}
            cb && cb(null);
          })
          .catch(function () {
            cb && cb(null);
          });
      } catch (e) {
        cb && cb(null);
      }
    }

    function getGuestData() {
      try {
        var g = localStorage.getItem("rendizy_guest");
        if (g && g !== "undefined" && g !== "null" && g.trim().startsWith("{")) {
          return mergeProfileIntoGuest(JSON.parse(g));
        }
        return mergeProfileIntoGuest(null);
      } catch (e) {
        return null;
      }
    }

    function findInputs() {
      // Tolerant selectors across multiple client sites.
      var nameInp = document.querySelector('input[placeholder*="nome" i],input[placeholder*="name" i],input[name="name"],input[name="nome"],input[name="fullName"],input[name="guestName"]');
      var emailInp = document.querySelector('input[type="email"],input[placeholder*="email" i],input[name="email"],input[name="guestEmail"]');
      var phoneInp = document.querySelector('input[type="tel"],input[placeholder*="telefone" i],input[placeholder*="phone" i],input[name="phone"],input[name="telefone"],input[name="guestPhone"]');

      function normText(s) {
        return String(s || "")
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/\s+/g, " ")
          .trim();
      }

      function findByLabel(re) {
        try {
          var labels = document.querySelectorAll("label");
          for (var i = 0; i < labels.length; i++) {
            var lab = labels[i];
            var txt = normText(lab.textContent || "");
            if (!txt || !re.test(txt)) continue;

            // Prefer htmlFor -> id
            var f = lab.getAttribute("for");
            if (f) {
              var el = document.getElementById(f);
              if (el && el.tagName && String(el.tagName).toLowerCase() === "input") return el;
            }

            // Fallback: input nested in label
            var nested = lab.querySelector("input");
            if (nested) return nested;

            // Fallback: input in the same container
            var parent = lab.parentElement;
            if (parent) {
              var sib = parent.querySelector("input");
              if (sib) return sib;
            }
          }
        } catch (e) {}
        return null;
      }

      if (!nameInp) nameInp = findByLabel(/\bnome\b|nome completo|full name|name/);
      if (!emailInp) emailInp = findByLabel(/e-?mail|email/);
      if (!phoneInp) phoneInp = findByLabel(/telefone|celular|whats|phone/);

      return { nameInp: nameInp, emailInp: emailInp, phoneInp: phoneInp };
    }

    function ensureCountrySelect(phoneInput, guest, authenticated) {
      try {
        if (!phoneInput || !phoneInput.parentNode) return;

        var wrap = phoneInput.parentNode;
        
        // Verificar se JÁ injetamos o select de país
        var existingCountrySelect = wrap.querySelector("select.rendizy-country-select");

        var sel = existingCountrySelect || document.createElement("select");
        sel.className = "rendizy-country-select";
        sel.style.marginRight = "8px";
        sel.style.padding = "10px 10px";
        sel.style.border = "1px solid rgba(0,0,0,0.15)";
        sel.style.borderRadius = "10px";
        sel.style.fontSize = "14px";
        sel.style.background = "#fff";

        if (!existingCountrySelect) {
          // Opção default BR
          for (var i = 0; i < COUNTRIES.length; i++) {
            var c = COUNTRIES[i];
            var opt = document.createElement("option");
            opt.value = c.code;
            opt.textContent = c.flag + " +" + c.dial;
            sel.appendChild(opt);
          }
          // Default BR selecionado
          sel.value = "BR";

          // Layout: criar uma row flex para select + input, SEM mover o label
          // O wrap é o container do input. Criar uma div interna para flex.
          try {
            var flexRow = document.createElement("div");
            flexRow.className = "rendizy-phone-row";
            flexRow.style.display = "flex";
            flexRow.style.gap = "8px";
            flexRow.style.alignItems = "center";
            flexRow.style.width = "100%";
            
            // Mover o input para dentro da flexRow
            wrap.insertBefore(flexRow, phoneInput);
            flexRow.appendChild(sel);
            flexRow.appendChild(phoneInput);
            
            // Input ocupa espaço restante
            phoneInput.style.flex = "1";
          } catch (e) {
            // Fallback simples
            wrap.insertBefore(sel, phoneInput);
          }
        }

        // Infer selection from saved dial/phone if available.
        var dial = (guest && (guest.dial || guest.ddi)) || "";
        var phone = (guest && (guest.phone || guest.telefone)) || "";
        if (!dial && phone && String(phone).trim().startsWith("+")) {
          var p = parseE164(phone);
          if (p && p.dial) dial = p.dial;
        }

        if (!sel.value && dial) {
          for (var j = 0; j < COUNTRIES.length; j++) {
            if (COUNTRIES[j].dial === String(dial)) {
              sel.value = COUNTRIES[j].code;
              break;
            }
          }
        }

        if (authenticated) {
          sel.disabled = true;
          sel.style.background = "#f3f4f6";
          sel.style.cursor = "not-allowed";
        }

        sel.onchange = function () {
          try {
            var code = sel.value;
            var picked = null;
            for (var k = 0; k < COUNTRIES.length; k++) {
              if (COUNTRIES[k].code === code) picked = COUNTRIES[k];
            }
            if (!picked) return;

            var raw = String(phoneInput.value || "");
            var digits = normalizeDigits(raw);
            // Never force-add prefix to visible input (keep it national), but store dial.
            var prof = getLocalProfile() || {};
            prof.dial = picked.dial;
            if (!prof.phone && digits) prof.phone = digits;
            try { localStorage.setItem("rendizy_guest_profile", JSON.stringify(prof)); } catch (e) {}
          } catch (e) {}
        };

        return sel;
      } catch (e) {
        return null;
      }
    }

    function showInlineError(msg) {
      try {
        var el = document.getElementById("rendizy-form-error");
        if (!el) {
          el = document.createElement("div");
          el.id = "rendizy-form-error";
          el.style.marginTop = "10px";
          el.style.padding = "10px 12px";
          el.style.borderRadius = "10px";
          el.style.background = "#fef2f2";
          el.style.border = "1px solid rgba(239,68,68,0.25)";
          el.style.color = "#b91c1c";
          el.style.fontSize = "13px";

          var form = document.querySelector("form") || document.body;
          form.appendChild(el);
        }
        el.textContent = msg;
      } catch (e) {}
    }

    function bindSubmitValidation() {
      if (_submitBound) return;
      var form = document.querySelector("form");
      if (!form) return;

      form.addEventListener(
        "submit",
        function (ev) {
          try {
            var g = getGuestData();
            var authenticated = isAuthenticatedGuest(g);
            var ins = findInputs();
            if (!ins.phoneInp) return;

            // Enforce required phone + country selection (always).
            var sel = ins.phoneInp.parentNode ? ins.phoneInp.parentNode.querySelector("select.rendizy-country-select") : null;
            var country = sel ? String(sel.value || "").trim() : "";
            var phoneDigits = normalizeDigits(ins.phoneInp.value || "");

            if (!country) {
              ev.preventDefault();
              showInlineError("Selecione o país (DDI) antes de continuar.");
              try { sel && sel.focus(); } catch (e) {}
              return;
            }

            if (!phoneDigits) {
              ev.preventDefault();
              showInlineError("Informe o telefone para continuar.");
              try { ins.phoneInp.focus(); } catch (e) {}
              return;
            }

            // Persist local profile so the booking and guest-area stay consistent.
            try {
              var picked = null;
              for (var i = 0; i < COUNTRIES.length; i++) if (COUNTRIES[i].code === country) picked = COUNTRIES[i];
              var prof = getLocalProfile() || {};
              if (picked) prof.dial = picked.dial;
              prof.phone = phoneDigits;
              localStorage.setItem("rendizy_guest_profile", JSON.stringify(prof));
            } catch (e) {}

            // If authenticated, inputs should already be locked.
            if (authenticated) return;
          } catch (e) {}
        },
        true
      );

      _submitBound = true;
    }

    function ensureCheckoutToastStyles(el) {
      try {
        el.style.position = "fixed";
        el.style.right = "16px";
        el.style.bottom = "16px";
        el.style.zIndex = "99999";
        el.style.maxWidth = "360px";
        el.style.background = "#ffffff";
        el.style.border = "1px solid rgba(0,0,0,0.08)";
        el.style.borderRadius = "12px";
        el.style.boxShadow = "0 8px 30px rgba(0,0,0,0.12)";
        el.style.padding = "12px 14px";
        el.style.fontFamily = "system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif";
        el.style.color = "#111827";
      } catch (e) {}
    }

    function showCheckoutConfirmedToast(info) {
      try {
        var existing = document.getElementById("rendizy-checkout-toast");
        if (existing) existing.remove();

        var reservationId = info && info.reservationId ? String(info.reservationId) : "";
        var guestAreaUrl = "/guest-area/#/reservas" + (reservationId ? ("?focus=" + encodeURIComponent(reservationId)) : "");

        var d = document.createElement("div");
        d.id = "rendizy-checkout-toast";
        ensureCheckoutToastStyles(d);

        var title = document.createElement("div");
        title.style.fontWeight = "700";
        title.style.marginBottom = "6px";
        title.textContent = "Reserva confirmada";

        var desc = document.createElement("div");
        desc.style.fontSize = "13px";
        desc.style.color = "#374151";
        desc.style.marginBottom = "10px";
        desc.textContent = "Pagamento confirmado. Clique abaixo para ver sua reserva.";

        var row = document.createElement("div");
        row.style.display = "flex";
        row.style.gap = "8px";
        row.style.alignItems = "center";

        var a = document.createElement("a");
        a.href = guestAreaUrl;
        a.target = "_blank";
        a.rel = "noopener noreferrer";
        a.textContent = "Ver na Área do Cliente";
        a.style.display = "inline-block";
        a.style.padding = "10px 12px";
        a.style.borderRadius = "10px";
        a.style.background = "#10b981";
        a.style.color = "white";
        a.style.fontWeight = "700";
        a.style.textDecoration = "none";
        a.style.fontSize = "13px";

        var close = document.createElement("button");
        close.type = "button";
        close.textContent = "Fechar";
        close.style.padding = "10px 12px";
        close.style.borderRadius = "10px";
        close.style.background = "#f3f4f6";
        close.style.color = "#111827";
        close.style.fontWeight = "600";
        close.style.border = "1px solid rgba(0,0,0,0.08)";
        close.onclick = function () {
          try {
            d.remove();
          } catch (e) {}
        };

        row.appendChild(a);
        row.appendChild(close);
        d.appendChild(title);
        d.appendChild(desc);
        d.appendChild(row);
        document.body.appendChild(d);
      } catch (e) {}
    }

    function emitCheckoutEvent(type, payload) {
      try {
        if (_bc) _bc.postMessage({ type: type, payload: payload || null });
      } catch (e) {}
      try {
        localStorage.setItem(CHECKOUT_EVENT_KEY, JSON.stringify({ type: type, payload: payload || null, ts: Date.now() }));
      } catch (e) {}
    }

    function onCheckoutEvent(handler) {
      try {
        if ("BroadcastChannel" in window) {
          _bc = _bc || new BroadcastChannel(CHECKOUT_CHANNEL);
          _bc.onmessage = function (ev) {
            try {
              handler && handler(ev && ev.data);
            } catch (e) {}
          };
        }
      } catch (e) {}

      try {
        window.addEventListener("storage", function (e) {
          if (!e) return;
          if (e.key !== CHECKOUT_EVENT_KEY || !e.newValue) return;
          var msg = safeJsonParse(e.newValue);
          if (msg && msg.type) handler && handler(msg);
        });
      } catch (e) {}
    }

    function setPendingCheckout(p) {
      try {
        localStorage.setItem(CHECKOUT_PENDING_KEY, JSON.stringify(p || {}));
      } catch (e) {}
    }

    function getConfirmedCheckout() {
      try {
        var raw = localStorage.getItem(CHECKOUT_CONFIRMED_KEY);
        var obj = safeJsonParse(raw);
        return obj && typeof obj === "object" ? obj : null;
      } catch (e) {
        return null;
      }
    }

    function setConfirmedCheckout(p) {
      try {
        localStorage.setItem(CHECKOUT_CONFIRMED_KEY, JSON.stringify(p || {}));
      } catch (e) {}
    }

    function installCheckoutFetchHook() {
      try {
        if (!globalThis.fetch || globalThis.__rendizyCheckoutFetchHook) return;
        var origFetch = globalThis.fetch;

        function pickNonEmpty() {
          for (var i = 0; i < arguments.length; i++) {
            var v = arguments[i];
            if (v == null) continue;
            var s = String(v).trim();
            if (s) return s;
          }
          return "";
        }

        function tryBuildE164(dial, rawPhone) {
          try {
            var d = normalizeDigits(dial);
            var n = normalizeDigits(rawPhone);
            if (!d || !n) return "";
            return "+" + d + n;
          } catch (e) {
            return "";
          }
        }

        globalThis.fetch = function (input, init) {
          try {
            var url = "";
            if (typeof input === "string") url = input;
            else if (input && input.url) url = input.url;

            var lowerUrl = url ? String(url).toLowerCase() : "";

            // Normalize reservation creation payload.
            // Fixes the most common 400 from the public API:
            //   { success:false, error:"Campos obrigatórios: propertyId, checkIn, checkOut, guestName" }
            if (lowerUrl && lowerUrl.includes("/reservations")) {
              var methodR = init && init.method ? String(init.method).toUpperCase() : "GET";
              if (methodR === "POST" && init && typeof init.body === "string") {
                var bodyObjR = safeJsonParse(init.body);
                if (bodyObjR && typeof bodyObjR === "object") {
                  var insR = findInputs();
                  var gR = getGuestData();

                  // Ensure guestName isn't empty.
                  if (!bodyObjR.guestName || !String(bodyObjR.guestName).trim()) {
                    bodyObjR.guestName = pickNonEmpty(
                      insR && insR.nameInp ? insR.nameInp.value : "",
                      gR && (gR.name || gR.full_name || gR.displayName),
                      bodyObjR.guestName
                    );
                  }

                  // Best-effort email fill (optional on API, but helps).
                  if (!bodyObjR.guestEmail || !String(bodyObjR.guestEmail).trim()) {
                    var em = pickNonEmpty(
                      insR && insR.emailInp ? insR.emailInp.value : "",
                      gR && gR.email,
                      bodyObjR.guestEmail
                    );
                    if (em) bodyObjR.guestEmail = em;
                  }

                  // Best-effort phone normalization to E.164 when possible.
                  // Only rewrite if:
                  // - a phone exists, and
                  // - it's not already E.164, and
                  // - we can infer a dial code.
                  var rawPhone = pickNonEmpty(
                    bodyObjR.guestPhone,
                    bodyObjR.phone,
                    insR && insR.phoneInp ? insR.phoneInp.value : "",
                    gR && (gR.phone || gR.telefone)
                  );
                  if (rawPhone && !String(rawPhone).trim().startsWith("+")) {
                    var dialR = "";
                    try {
                      var profR = getLocalProfile();
                      dialR = pickNonEmpty(
                        profR && (profR.dial || profR.ddi),
                        gR && (gR.dial || gR.ddi)
                      );
                    } catch (e) {}

                    // Infer from country select if present.
                    try {
                      var selR = insR && insR.phoneInp && insR.phoneInp.parentNode
                        ? insR.phoneInp.parentNode.querySelector("select.rendizy-country-select")
                        : null;
                      if (!dialR && selR && selR.value) {
                        var codeR = String(selR.value || "");
                        for (var ci = 0; ci < COUNTRIES.length; ci++) {
                          if (COUNTRIES[ci].code === codeR) { dialR = COUNTRIES[ci].dial; break; }
                        }
                      }
                    } catch (e) {}

                    var e164 = dialR ? tryBuildE164(dialR, rawPhone) : "";
                    if (e164) bodyObjR.guestPhone = e164;
                  }

                  init = Object.assign({}, init, { body: JSON.stringify(bodyObjR) });
                }
              }
            }

            // NOTE: Avoid regex literals with escaped slashes here.
            // This script is emitted from a server-side template string,
            // so patterns like /\/checkout\/session/ can degrade into
            // //checkout/session (a line comment) and break parsing.
            if (lowerUrl && lowerUrl.includes("/checkout/session")) {
              var method = (init && init.method) ? String(init.method).toUpperCase() : "GET";
              if (method === "POST" && init && typeof init.body === "string") {
                var bodyObj = safeJsonParse(init.body);
                var sd = getSiteSlug();
                if (sd && bodyObj && typeof bodyObj === "object") {
                  var reservationId = bodyObj.reservationId ? String(bodyObj.reservationId) : "";
                  var returnUrl = String(location.href || "");

                  // Force Stripe redirect pages to our domain-controlled endpoints.
                  bodyObj.successUrl = location.origin + "/api/checkout/success?siteSlug=" + encodeURIComponent(sd) + "&reservationId=" + encodeURIComponent(reservationId) + "&returnUrl=" + encodeURIComponent(returnUrl);
                  bodyObj.cancelUrl = location.origin + "/api/checkout/cancel?siteSlug=" + encodeURIComponent(sd) + "&reservationId=" + encodeURIComponent(reservationId) + "&returnUrl=" + encodeURIComponent(returnUrl);

                  if (reservationId) {
                    setPendingCheckout({ siteSlug: sd, reservationId: reservationId, at: Date.now() });
                  }

                  init = Object.assign({}, init, { body: JSON.stringify(bodyObj) });
                }
              }
            }
          } catch (e) {}

          return origFetch(input, init);
        };

        globalThis.__rendizyCheckoutFetchHook = true;
      } catch (e) {}
    }

    function fillForm() {
      var now = Date.now();
      if (now - _lastFillTime < 200) return;
      _lastFillTime = now;
      if (_fillAttempts >= _maxFillAttempts) return;
      _fillAttempts++;

      var g = getGuestData();
      var authenticated = isAuthenticatedGuest(g);
      var name = (g && (g.name || g.full_name || g.displayName)) || "";
      var email = (g && g.email) || "";
      var phone = (g && (g.phone || g.telefone)) || "";

      var ins = findInputs();
      var nameInp = ins.nameInp;
      var emailInp = ins.emailInp;
      var phoneInp = ins.phoneInp;

      if (nameInp && name) {
        if (!nameInp.value) {
          nameInp.value = name;
          nameInp.dispatchEvent(new Event("input", { bubbles: true }));
          nameInp.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (authenticated) {
          lockInput(nameInp);
          addHintAfter(nameInp, 'Edite apenas no <a href="/guest-area/#/perfil" target="_blank" rel="noopener noreferrer">Meu Perfil</a>.');
        }
      }

      if (emailInp && email) {
        if (!emailInp.value) {
          emailInp.value = email;
          emailInp.dispatchEvent(new Event("input", { bubbles: true }));
          emailInp.dispatchEvent(new Event("change", { bubbles: true }));
        }
        if (authenticated) {
          lockInput(emailInp);
          addHintAfter(emailInp, 'Edite apenas no <a href="/guest-area/#/perfil" target="_blank" rel="noopener noreferrer">Meu Perfil</a>.');
        }
      }

      if (phoneInp) {
        try {
          phoneInp.required = true;
        } catch (e) {}

        // Passar se tem phone salvo para decidir se trava
        var hasPhoneSaved = !!(phone && phone.trim());
        ensureCountrySelect(phoneInp, g, authenticated && hasPhoneSaved);

        if (phone && !phoneInp.value) {
          phoneInp.value = phone;
          phoneInp.dispatchEvent(new Event("input", { bubbles: true }));
          phoneInp.dispatchEvent(new Event("change", { bubbles: true }));
        }

        // SÓ travar se autenticado E tiver telefone salvo
        if (authenticated && hasPhoneSaved) {
          lockInput(phoneInp);
          addHintAfter(phoneInp, 'Para alterar seu telefone, use o <a href="/guest-area/#/perfil" target="_blank" rel="noopener noreferrer">Meu Perfil</a>.');
        }
      }

      bindSubmitValidation();
    }

    function init() {
      installCheckoutFetchHook();

      onCheckoutEvent(function (msg) {
        try {
          var t = msg && msg.type ? String(msg.type) : "";
          if (t === "confirmed") {
            var info = (msg && msg.payload) || msg;
            setConfirmedCheckout(info);
            showCheckoutConfirmedToast(info);
          }
        } catch (e) {}
      });

      try {
        var confirmed = getConfirmedCheckout();
        if (confirmed && confirmed.type === "confirmed") {
          showCheckoutConfirmedToast(confirmed);
        }
      } catch (e) {}

      syncFromCookie(function () {
        fillForm();
        var obs = new MutationObserver(function () {
          fillForm();
        });
        obs.observe(document.body || document.documentElement, { childList: true, subtree: true });
        setTimeout(function () {
          try { obs.disconnect(); } catch (e) {}
        }, 30000);
      });
    }

    if (document.readyState === "complete" || document.readyState === "interactive") setTimeout(init, 500);
    else window.addEventListener("DOMContentLoaded", function () { setTimeout(init, 500); });
  })();`);
}
