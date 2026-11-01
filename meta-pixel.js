/* meta-pixel.js: הפיקסל של מטא + Conversions API לכל דפי הנחיתה של שווים יותר (29/10/2026).
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
