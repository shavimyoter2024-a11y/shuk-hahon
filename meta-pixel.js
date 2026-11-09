/* meta-pixel.js (כולל באנר עוגיות מ-09/11): הפיקסל של מטא + Conversions API לכל דפי הנחיתה של שווים יותר (29/10/2026).
   שורה אחת לפני </body>, אחרי ה-gtag של הדף:
     <script src="meta-pixel.js" data-pixel="884771924261911" data-page="nadlan" defer></script>
   מה הוא עושה:
     PageView בטעינה.
     מאזין לאירועי GA4 שהדף כבר שולח, ומתרגם אותם למטא באותו רגע:
       generate_lead  -> Lead
       begin_checkout -> InitiateCheckout (עם value)
       purchase       -> Purchase (רק בפיקסל; eventID = transaction_id, כדי שאירוע השרת העתידי יתאחד איתו)
     כל אירוע חוץ מ-Purchase נשלח פעמיים עם אותו eventID: לפיקסל בדפדפן ול-go.shavimyoter.co/api/capi.
     מטא סופרת פעם אחת, ואירוע שהדפדפן חסם (iOS, חוסם פרסומות) עדיין מגיע מהשרת.
   טלפון/מייל/שם מהטופס האחרון שנשלח עוברים רק לשרת שלנו, שמגבב אותם לפני שהם יוצאים למטא.
   לא משנה איך הדף נראה או עובד; כל תקלה כאן שקטה. */
(function () {
  var me = document.currentScript || document.querySelector('script[src*="meta-pixel.js"]');
  var opt = (me && me.dataset) || {};
  var PIXEL = opt.pixel || "884771924261911";
  var CAPI = opt.capi || "https://go.shavimyoter.co/api/capi";
  var PAGE = opt.page || location.pathname.split("/").filter(Boolean)[0] || "home";

  /* ===== באנר יידוע על עוגיות (09/11/2026, טום) =====
     מודל יידוע עם אפשרות סירוב: עד שבוחרים הפיקסל עובד כרגיל.
     "סירוב" = הפיקסל נעצר מיד ולא נטען בביקורים הבאים, ו-Google Analytics עובר למצב בלי עוגיות.
     הבחירה נשמרת בדפדפן (localStorage "sy_consent") ומשותפת לכל הדפים באותו דומיין.
     הבחירה נשלחת ל-GA כאירוע consent_choice, כדי לדעת כמה מסרבים. */
  var CONSENT_KEY = "sy_consent";
  var refused = false;
  function getChoice() { try { return localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } }
  function setChoice(v) { try { localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  function denyGa() {
    try {
      /* gtag.js קורא רק אובייקט arguments מה-dataLayer, לא מערך רגיל */
      window.dataLayer = window.dataLayer || [];
      (function () { window.dataLayer.push(arguments); })("consent", "update",
        { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    } catch (e) {}
  }
  function gaEvent(choice) {
    try { if (typeof window.gtag === "function") window.gtag("event", "consent_choice", { choice: choice, page_id: PAGE }); } catch (e) {}
  }

  function privacyHref() {
    if (opt.privacy) return opt.privacy;
    var a = document.querySelector('a[href*="privacy"]');
    return a ? a.getAttribute("href") : "";
  }

  /* גובה של פס קבוע בתחתית המסך (כפתור דביק במובייל), כדי שהבאנר יישב מעליו ולא יסתיר אותו */
  function bottomBar(banner) {
    var h = 0, vh = window.innerHeight, xs = [window.innerWidth / 2, 24, window.innerWidth - 24];
    for (var i = 0; i < xs.length; i++) {
      var els = document.elementsFromPoint ? document.elementsFromPoint(xs[i], vh - 2) : [];
      for (var j = 0; j < els.length; j++) {
        for (var el = els[j]; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
          if (el === banner || banner.contains(el)) break;
          var pos = getComputedStyle(el).position;
          if (pos === "fixed" || pos === "sticky") {
            var r = el.getBoundingClientRect();
            if (r.bottom >= vh - 4 && r.height < vh * 0.4) h = Math.max(h, vh - r.top);
            break;
          }
        }
      }
    }
    return h;
  }

  function showBanner() {
    if (document.getElementById("sy-consent")) return;
    var css = document.createElement("style");
    css.textContent =
      "#sy-consent{position:fixed;left:12px;right:auto;bottom:12px;z-index:2147483000;width:max-content;max-width:min(460px,calc(100% - 24px));" +
      "display:flex;align-items:center;gap:8px 14px;padding:8px 8px 8px 14px;" +
      "background:rgba(255,255,255,.72);-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);" +
      "color:#14171f;border:1px solid rgba(20,23,31,.16);border-radius:16px;" +
      "font:inherit;font-size:13.5px;line-height:1.4;direction:rtl;text-align:right}" +
      "@supports not ((backdrop-filter:blur(1px)) or (-webkit-backdrop-filter:blur(1px))){#sy-consent{background:rgba(255,255,255,.94)}}" +
      "#sy-consent p{margin:0;flex:1 1 auto}" +
      "#sy-consent a{color:inherit;text-decoration:underline;text-underline-offset:2px}" +
      "#sy-consent .sy-btns{display:flex;gap:6px;flex:none}" +
      "#sy-consent button{font:inherit;font-size:13.5px;font-weight:700;min-height:34px;min-width:64px;padding:0 14px;border-radius:999px;cursor:pointer;" +
      "transition:transform .08s}" +
      "#sy-consent button:active{transform:scale(.97)}" +
      "#sy-consent .sy-yes{background:#0b0b0d;color:#fff;border:1px solid #0b0b0d}" +
      "#sy-consent .sy-no{background:transparent;color:#14171f;border:1px solid rgba(20,23,31,.35)}" +
      "#sy-consent button:focus-visible{outline:3px solid #2f6fed;outline-offset:2px}" +
      "@media (max-width:480px){#sy-consent{right:12px;width:auto;max-width:none;flex-wrap:wrap;justify-content:center;text-align:center;padding:10px;gap:8px}" +
      "#sy-consent p{flex-basis:100%}#sy-consent .sy-btns{width:100%}#sy-consent button{flex:1 1 0;min-height:38px}}" +
      "@media (prefers-reduced-motion:reduce){#sy-consent button{transition:none}}" +
      "@media print{#sy-consent{display:none}}";
    document.head.appendChild(css);

    var box = document.createElement("div");
    box.id = "sy-consent";
    box.setAttribute("role", "region");
    box.setAttribute("aria-label", "הודעה על עוגיות");
    box.setAttribute("dir", "rtl");
    box.setAttribute("lang", "he");
    var p = document.createElement("p");
    p.appendChild(document.createTextNode("האתר משתמש בעוגיות למדידה ולפרסום. "));
    var href = privacyHref();
    if (href) {
      var a = document.createElement("a");
      a.href = href;
      a.textContent = "פרטים";
      a.setAttribute("aria-label", "מדיניות הפרטיות");
      p.appendChild(a);
    }
    var btns = document.createElement("div");
    btns.className = "sy-btns";
    var yes = document.createElement("button");
    yes.type = "button"; yes.className = "sy-yes"; yes.textContent = "אישור";
    var no = document.createElement("button");
    no.type = "button"; no.className = "sy-no"; no.textContent = "סירוב";
    btns.appendChild(yes); btns.appendChild(no);
    box.appendChild(p); box.appendChild(btns);
    document.body.appendChild(box);

    var place = function () { try { box.style.bottom = 12 + bottomBar(box) + "px"; } catch (e) {} };
    var t = 0, onMove = function () { clearTimeout(t); t = setTimeout(place, 120); };
    place();
    /* פס דביק יכול להופיע רק אחרי גלילה או באנימציה, ולכן בודקים שוב כל שנייה כל עוד הבאנר מוצג */
    var tick = setInterval(place, 1000);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    var close = function () {
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
      clearInterval(tick);
      box.remove();
    };
    yes.addEventListener("click", function () { setChoice("yes"); gaEvent("yes"); close(); });
    no.addEventListener("click", function () {
      setChoice("no"); gaEvent("no"); denyGa();
      refused = true;
      try { window.fbq && window.fbq("consent", "revoke"); } catch (e) {}
      close();
    });
  }

  var choice = getChoice();
  if (choice === "no") { denyGa(); return; }
  if (choice !== "yes") {
    if (document.body) showBanner(); else document.addEventListener("DOMContentLoaded", showBanner);
  }

  /* הקוד הרשמי של מטא לטעינת fbq */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  window.fbq("init", PIXEL);

  function eid() {
    try { return crypto.randomUUID(); } catch (e) { return Date.now().toString(36) + Math.random().toString(36).slice(2); }
  }
  function cookie(name) {
    var m = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : "";
  }
  /* _fbc נוצר ע"י fbq מ-fbclid, אבל רק אחרי שהספרייה נטענה; עד אז בונים אותו בעצמנו */
  var ownFbc = "";
  function fbc() {
    var c = cookie("_fbc");
    if (c) return c;
    var id = new URLSearchParams(location.search).get("fbclid");
    if (id && !ownFbc) ownFbc = "fb.1." + Date.now() + "." + id;
    return ownFbc;
  }

  var user = {};
  document.addEventListener("submit", function (e) {
    try {
      var f = e.target, el;
      el = f.querySelector('input[type="tel"], input[name*="phone" i], input[name*="tel" i]');
      if (el && el.value) user.ph = el.value;
      el = f.querySelector('input[type="email"], input[name*="mail" i]');
      if (el && el.value) user.em = el.value;
      el = f.querySelector('input[name*="name" i], input[autocomplete="name"]');
      if (el && el.value) user.fn = el.value;
    } catch (err) {}
    /* דף שלא שולח generate_lead משלו: data-lead-form="#id" מסמן איזה טופס הוא ליד */
    try { if (opt.leadForm && e.target.matches(opt.leadForm)) setTimeout(function () { track("Lead"); }, 0); } catch (err) {}
  }, true);

  function toServer(name, id, data) {
    try {
      var body = { event_name: name, event_id: id, event_source_url: location.href, fbp: cookie("_fbp"), fbc: fbc(),
        ph: user.ph, em: user.em, fn: user.fn, content_name: PAGE };
      if (data && data.value) { body.value = data.value; body.currency = data.currency || "ILS"; }
      var blob = new Blob([JSON.stringify(body)], { type: "text/plain" });
      if (!(navigator.sendBeacon && navigator.sendBeacon(CAPI, blob))) {
        fetch(CAPI, { method: "POST", body: blob, keepalive: true, mode: "cors" }).catch(function () {});
      }
    } catch (e) {}
  }

  function track(name, data, opts) {
    if (refused) return;
    try {
      var id = (opts && opts.id) || eid();
      window.fbq("track", name, data || {}, { eventID: id });
      if (!(opts && opts.browserOnly)) toServer(name, id, data);
    } catch (e) {}
  }
  window.shavimMeta = { track: track };

  track("PageView");

  /* תרגום אירועי GA4 של הדף. עוטפים את gtag ברגע שהוא קיים (חלק מהדפים מגדירים אותו מאוחר) */
  function onGa(args) {
    var ev = args[0] === "event" ? args[1] : null, p = args[2] || {};
    if (!ev) return;
    var value = Number(p.value) || 0;
    if (ev === "generate_lead") track("Lead", value ? { value: value, currency: p.currency || "ILS" } : {});
    else if (ev === "begin_checkout") track("InitiateCheckout", { value: value || undefined, currency: p.currency || "ILS", content_name: PAGE });
    else if (ev === "purchase") track("Purchase", { value: value, currency: p.currency || "ILS", content_name: PAGE },
      { id: p.transaction_id ? "tx-" + p.transaction_id : undefined, browserOnly: true });
  }
  /* דף התודה שולח purchase כבר בטעינה, לפני שהסקריפט הזה רץ; תופסים אותו מה-dataLayer */
  try {
    (window.dataLayer || []).forEach(function (a) { if (a && a[0] === "event" && a[1] === "purchase") onGa(a); });
  } catch (e) {}
  /* אתרים עם GTM דוחפים {event: "generate_lead"} ל-dataLayer במקום לקרוא ל-gtag */
  try {
    var dl = window.dataLayer = window.dataLayer || [], push = dl.push;
    dl.push = function () {
      try { for (var i = 0; i < arguments.length; i++) { var o = arguments[i]; if (o && typeof o.event === "string" && !o.length) onGa(["event", o.event, o]); } } catch (e) {}
      return push.apply(this, arguments);
    };
  } catch (e) {}

  /* דף בלי אירוע ליד משלו: data-lead-success="#id" = הודעת התודה; כשהיא נחשפת יוצא Lead (פעם אחת) */
  if (opt.leadSuccess) {
    var fired = false;
    var check = function () {
      var el = document.querySelector(opt.leadSuccess);
      if (!fired && el && !el.hidden && el.offsetParent !== null) { fired = true; track("Lead"); }
    };
    var start = function () { try { new MutationObserver(check).observe(document.body, { attributes: true, subtree: true, attributeFilter: ["hidden", "class", "style"] }); } catch (e) {} };
    if (document.body) start(); else document.addEventListener("DOMContentLoaded", start);
  }

  var tries = 0;
  (function wrap() {
    var g = window.gtag;
    if (typeof g === "function" && !g.__meta) {
      var wrapped = function () { try { onGa(arguments); } catch (e) {} return g.apply(this, arguments); };
      wrapped.__meta = true;
      window.gtag = wrapped;
      return;
    }
    if (g && g.__meta) return;
    if (++tries < 40) setTimeout(wrap, 250);
  })();
})();
