/* =========================================================================
   Golden Crust Pie Co. — scroll-driven pie anatomy engine.

   Adapted from a canvas/frame-sequence approach to an illustrated SVG
   cross-section: instead of scrubbing through photographed frames, the
   lid lifts away and each filling layer is highlighted in turn as the
   reader scrolls, paired with the same progress-mapped text overlays.

   Usage: call window.initPieAnatomy(CONFIG) after the DOM for the page's
   #sequence section exists. See pies/*.html for CONFIG shape.
   ========================================================================= */

(function () {
  "use strict";

  function initPieAnatomy(CONFIG) {
    var sectionEl   = document.getElementById("sequence");
    var pinEl       = document.getElementById("pin");
    var overlayHost = document.getElementById("overlays");
    var progFill    = document.getElementById("progress-fill");
    var errorEl     = document.getElementById("error");
    var errorBody   = document.getElementById("error-body");

    if (!sectionEl || !pinEl) return;

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* ---------- Build overlay DOM from config ---------- */

    var overlayEls = CONFIG.overlays.map(function (o) {
      var el = document.createElement("article");
      el.className = "layer";
      if (o.tag) {
        var tag = document.createElement("span");
        tag.className = "tag";
        tag.textContent = o.tag;
        el.appendChild(tag);
      }
      var h = document.createElement("h2");
      h.textContent = o.title;
      var p = document.createElement("p");
      p.textContent = o.body;
      el.appendChild(h);
      el.appendChild(p);
      overlayHost.appendChild(el);
      return el;
    });

    /* ---------- Scroll distance / progress bar ---------- */

    function scrollDistance() {
      return Math.max(1, sectionEl.offsetHeight - window.innerHeight);
    }

    function setProgressBar(p) {
      progFill.style.width = (Math.min(1, Math.max(0, p)) * 100).toFixed(2) + "%";
    }

    /* ---------- GSAP path ---------- */

    function initGSAP() {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      document.body.classList.add("gsap-pinned");

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top",
          end: function () { return "+=" + scrollDistance(); },
          pin: pinEl,
          pinSpacing: false,
          scrub: 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) { setProgressBar(self.progress); }
        }
      });

      (CONFIG.layers || []).forEach(function (layer) {
        var el = document.querySelector(layer.selector);
        if (!el) return;

        if (layer.kind === "lift") {
          gsap.set(el, { transformOrigin: "50% 50%" });
          tl.to(el, {
            y: reduceMotion ? 0 : -70,
            opacity: 0,
            duration: layer.to - layer.from,
            ease: "power2.inOut"
          }, layer.from);
        }

        if (layer.kind === "pulse") {
          var mid = (layer.from + layer.to) / 2;
          gsap.set(el, { transformOrigin: "50% 50%" });
          tl.to(el, {
            scale: reduceMotion ? 1 : 1.07,
            duration: mid - layer.from,
            ease: "power2.out"
          }, layer.from)
          .to(el, {
            scale: 1,
            duration: layer.to - mid,
            ease: "power2.in"
          }, mid);
        }
      });

      var FADE = 0.045;

      overlayEls.forEach(function (el, i) {
        var o = CONFIG.overlays[i];
        tl.fromTo(el,
          { autoAlpha: 0, y: reduceMotion ? 0 : 22 },
          { autoAlpha: 1, y: 0, duration: FADE, ease: "power2.out" },
          o.from);

        if (!o.holdToEnd) {
          tl.to(el,
            { autoAlpha: 0, y: reduceMotion ? 0 : -22, duration: FADE, ease: "power2.in" },
            Math.max(o.from + FADE, o.to - FADE));
        }
      });

      ScrollTrigger.refresh();
    }

    /* ---------- Fallback when the CDN is blocked ---------- */

    function overlayOpacity(o, p) {
      var FADE = 0.045;
      if (p < o.from) return 0;
      if (p < o.from + FADE) return (p - o.from) / FADE;
      var end = o.holdToEnd ? Infinity : o.to;
      if (p <= end - FADE) return 1;
      if (p >= end) return 0;
      return (end - p) / FADE;
    }

    function initFallback() {
      if (errorEl) errorEl.hidden = false;

      var lidEl = null;
      (CONFIG.layers || []).forEach(function (layer) {
        if (layer.kind === "lift") lidEl = document.querySelector(layer.selector);
      });

      var ticking = false;

      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          var top = sectionEl.getBoundingClientRect().top;
          var p = Math.min(1, Math.max(0, -top / scrollDistance()));

          setProgressBar(p);

          if (lidEl) {
            var lidFrom = 0.12, lidTo = 0.28;
            var lp = p < lidFrom ? 0 : p > lidTo ? 1 : (p - lidFrom) / (lidTo - lidFrom);
            lidEl.style.opacity = 1 - lp;
            lidEl.style.transform = "translateY(" + (lp * -70) + "px)";
          }

          overlayEls.forEach(function (el, i) {
            var a = overlayOpacity(CONFIG.overlays[i], p);
            el.style.opacity = a;
            el.style.visibility = a > 0.01 ? "visible" : "hidden";
          });
        });
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
    }

    /* ---------- Boot ---------- */

    var gsapReady =
      typeof window.gsap !== "undefined" &&
      typeof window.ScrollTrigger !== "undefined";

    if (gsapReady) {
      try {
        initGSAP();
      } catch (err) {
        if (errorBody) {
          errorBody.textContent =
            "GSAP loaded but failed to start (" + err.message +
            "). The sequence is running on a reduced fallback.";
        }
        initFallback();
      }
    } else {
      initFallback();
    }
  }

  window.initPieAnatomy = initPieAnatomy;
})();
