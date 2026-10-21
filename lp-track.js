/* lp-track.js: one measurement layer for every Shavim Yoter landing page.
   Answers one question: where do people leave the page?
   Sends to GA4 (G-NR923MZ0BW, "דפי נחיתה" stream):
     section_view  {section, section_order, sections_total}  once per section, when its top passes mid-screen
     scroll_depth  {percent: 25 | 50 | 75 | 100}            once each
     cta_click     {location}           only with data-cta="1" (for pages that do not track CTAs yet)
     form_start    {form}               only with data-form="1"
     generate_lead {form, confirmed}    only with data-success=".selector" (fires when that element is shown)
   Every event carries page_id = data-page, or the first folder of the URL (/nadlan/ -> nadlan).
   Never sends anything typed into a form. Does not change how the page looks or works.
   Usage (before </body>):
     <script src="lp-track.js" data-ga="G-NR923MZ0BW" data-cta="1" data-form="1" data-success=".success" defer></script>
   data-ga loads GA4 only if the page has no gtag of its own. */
(function () {
  var me = document.currentScript || document.querySelector('script[src*="lp-track.js"]');
  var opt = (me && me.dataset) || {};
  var PAGE = opt.page || location.pathname.split("/").filter(Boolean)[0] || "home";

  if (!window.gtag && opt.ga) {
    var g = document.createElement("script");
    g.async = true;
    g.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(opt.ga);
    document.head.appendChild(g);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", opt.ga, { page_id: PAGE });
  }

  function send(name, params) {
    try {
      if (!window.gtag) return;
      var p = { page_id: PAGE };
      for (var k in params) p[k] = params[k];
      window.gtag("event", name, p);
    } catch (e) {}
  }

  function ready(fn) {
    if (document.readyState !== "loading") fn();
    else document.addEventListener("DOMContentLoaded", fn);
  }

  ready(function () {
    /* sections: <section> inside the page plus the footer, in page order */
    var secs = [].slice.call(document.querySelectorAll("section, footer")).filter(function (s) {
      return !s.closest("dialog") && s.offsetParent !== null;
    });
    function nameOf(s, i) {
      if (s.dataset.track) return s.dataset.track;
      if (s.id) return s.id;
      if (s.tagName === "FOOTER") return "footer";
      var h = s.querySelector("h1, h2, h3");
      if (h) return (h.innerText || h.textContent).replace(/\s+/g, " ").trim().slice(0, 40);
      return "section-" + (i + 1);
    }
    var names = secs.map(nameOf);
    var seen = {};
    if ("IntersectionObserver" in window && secs.length) {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
          if (!e.isIntersecting) return;
          var i = secs.indexOf(e.target);
          if (seen[i]) return;
          seen[i] = 1;
          send("section_view", { section: names[i], section_order: i + 1, sections_total: secs.length });
          io.unobserve(e.target);
        });
      }, { threshold: 0, rootMargin: "0px 0px -50% 0px" });
      secs.forEach(function (s) { io.observe(s); });
    }

    /* scroll depth */
    var marks = [25, 50, 75, 100], hit = {}, ticking = false;
    function check() {
      ticking = false;
      var h = document.documentElement, max = h.scrollHeight - h.clientHeight;
      if (max <= 0) return;
      var pct = (window.scrollY || h.scrollTop) / max * 100;
      marks.forEach(function (m) {
        if (pct >= m - 1 && !hit[m]) { hit[m] = 1; send("scroll_depth", { percent: m }); }
      });
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(check); }
    }, { passive: true });

    function sectionOf(el) {
      for (var i = 0; i < secs.length; i++) if (secs[i].contains(el)) return names[i];
      return el.closest("header") ? "header" : "page";
    }

    /* CTA clicks (pages without their own cta_click) */
    if (opt.cta === "1") {
      document.addEventListener("click", function (e) {
        var a = e.target.closest('a[href^="#"], a.btn, button.btn, .cta, [data-cta]');
        if (!a || a.closest("form")) return;
        send("cta_click", { location: a.getAttribute("data-cta") || sectionOf(a) });
      });
    }

    /* first interaction with a form */
    if (opt.form === "1") {
      [].slice.call(document.querySelectorAll("form")).forEach(function (f, i) {
        var started = false;
        f.addEventListener("input", function () {
          if (started) return;
          started = true;
          send("form_start", { form: sectionOf(f) || "form-" + (i + 1) });
        });
      });
    }

    /* lead sent: the page's own success box becomes visible */
    if (opt.success) {
      var boxes = [].slice.call(document.querySelectorAll(opt.success));
      var sent = false;
      var mo = new MutationObserver(function () {
        if (sent) return;
        for (var i = 0; i < boxes.length; i++) {
          if (!boxes[i].hidden) {
            sent = true;
            send("generate_lead", { form: sectionOf(boxes[i]), confirmed: true });
            mo.disconnect();
            return;
          }
        }
      });
      boxes.forEach(function (b) { mo.observe(b, { attributes: true, attributeFilter: ["hidden"] }); });
    }
  });
})();
