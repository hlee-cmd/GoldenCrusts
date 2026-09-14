/* =========================================================================
   Golden Crust Pie Co. — real-photo scroll sequence engine.

   Companion to anatomy.js: that engine drives the illustrated SVG pies,
   this one drives a pinned <canvas> through an actual photographed frame
   sequence (e.g. 240 stills of a pie being pulled apart), scrubbed by
   scroll position via GSAP ScrollTrigger. Falls back to a plain
   scroll-linked reveal if the CDN script is blocked.

   Loading strategy: the page becomes interactive as soon as the poster
   frame (index 0) decodes — it does not wait for all 240 images. The
   rest load in the background in a spread-out (bit-reversal) order
   rather than strictly 0,1,2,3…, so that at any point during the
   background load, whatever frame the visitor has scrolled to has a
   nearby loaded neighbour instead of only the ones loaded so far at
   one end of the sequence.

   Usage: call window.initFrameSequence(CONFIG) — see pies/chicken.html.
   ========================================================================= */

(function () {
  "use strict";

  function initFrameSequence(CONFIG) {
    var canvas   = document.getElementById("frames");
    var ctx      = canvas.getContext("2d", { alpha: false });
    var loaderEl = document.getElementById("loader");
    var loadFill = document.getElementById("load-fill");
    var loadCount= document.getElementById("load-count");
    var errorEl  = document.getElementById("error");
    var errorBody= document.getElementById("error-body");
    var overlayHost = document.getElementById("overlays");
    var sectionEl= document.getElementById("sequence");
    var pinEl    = document.getElementById("pin");
    var progFill = document.getElementById("progress-fill");

    var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var images      = new Array(CONFIG.frameCount);
    var settled      = 0;
    var failedCount  = 0;
    var lastDrawn    = -1;
    var state        = { frame: 0 };

    /* ---------- Build overlay DOM ---------- */

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

    /* ---------- Canvas sizing ---------- */

    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, CONFIG.maxDPR || 2.5);
      var w = canvas.clientWidth  || window.innerWidth;
      var h = canvas.clientHeight || window.innerHeight;

      var bw = Math.max(1, Math.round(w * dpr));
      var bh = Math.max(1, Math.round(h * dpr));

      if (canvas.width === bw && canvas.height === bh) return;

      canvas.width  = bw;
      canvas.height = bh;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.fillStyle = CONFIG.background;

      lastDrawn = -1;
      draw();
    }

    /* ---------- Frame selection with broken-image guard ---------- */

    function isDrawable(img) {
      return !!img && img.complete && img.naturalWidth > 0;
    }

    function nearestDrawable(index) {
      if (isDrawable(images[index])) return images[index];
      for (var d = 1; d < CONFIG.frameCount; d++) {
        var lo = index - d, hi = index + d;
        if (lo >= 0 && isDrawable(images[lo])) return images[lo];
        if (hi < CONFIG.frameCount && isDrawable(images[hi])) return images[hi];
      }
      return null;
    }

    /* ---------- Draw ---------- */

    function draw() {
      var index = Math.round(state.frame);
      if (index < 0) index = 0;
      if (index >= CONFIG.frameCount) index = CONFIG.frameCount - 1;

      var img = nearestDrawable(index);
      if (!img) return;

      var cw = canvas.width, ch = canvas.height;
      var c  = CONFIG.sourceCrop || { top: 0, right: 0, bottom: 0, left: 0 };

      var sx = c.left;
      var sy = c.top;
      var sw = img.naturalWidth  - c.left - c.right;
      var sh = img.naturalHeight - c.top  - c.bottom;
      if (sw <= 0 || sh <= 0) { sx = 0; sy = 0; sw = img.naturalWidth; sh = img.naturalHeight; }

      var scale = CONFIG.fitMode === "contain"
        ? Math.min(cw / sw, ch / sh)
        : Math.max(cw / sw, ch / sh);

      var dw = sw * scale;
      var dh = sh * scale;
      var dx = (cw - dw) / 2;
      var dy = (ch - dh) / 2;

      ctx.fillStyle = CONFIG.background;
      ctx.fillRect(0, 0, cw, ch);
      ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);

      lastDrawn = index;
    }

    /* ---------- Preload ---------- */

    // Bit-reversal permutation of 0..n-1: front-loads a sparse, evenly
    // spread set of indices (0, half, quarter, three-quarter, …) instead
    // of the sequence in order. A handful of these loading is enough for
    // nearestDrawable() to have a close neighbour anywhere in the range,
    // long before the full set has downloaded.
    function spreadOrder(n) {
      var bits = Math.max(1, Math.ceil(Math.log2(n)));
      var span = 1 << bits;
      var order = [];
      for (var i = 0; i < span; i++) {
        var r = 0, x = i;
        for (var b = 0; b < bits; b++) { r = (r << 1) | (x & 1); x >>= 1; }
        if (r < n) order.push(r);
      }
      return order;
    }

    // How many frames (spread across the sequence) to wait for before
    // treating the sequence as "ready" and dismissing the loader — a
    // handful is enough for nearestDrawable() to always be close, without
    // making the visitor wait anywhere near the full 240-image download.
    var REVEAL_AFTER = Math.min(CONFIG.frameCount, 12);

    function updateLoaderUI() {
      var pct = settled / CONFIG.frameCount;
      loadFill.style.width = (pct * 100).toFixed(1) + "%";
      loadCount.textContent = settled + " of " + CONFIG.frameCount + " frames";

      if (failedCount > 0 && settled >= CONFIG.frameCount) {
        loadCount.textContent =
          (CONFIG.frameCount - failedCount) + " of " + CONFIG.frameCount +
          " frames loaded — " + failedCount + " missing, holding on the nearest frame";
      }
    }

    function preload(onReady) {
      var order = spreadOrder(CONFIG.frameCount);
      var next = 0;
      var revealed = false;

      function maybeReveal() {
        if (revealed) return;
        if (isDrawable(images[0]) || settled >= REVEAL_AFTER) {
          revealed = true;
          loaderEl.classList.add("done");
          window.setTimeout(function () { loaderEl.style.display = "none"; }, 500);
          onReady();
        }
      }

      function settle(i, ok) {
        settled++;
        if (!ok) failedCount++;

        if (ok && (lastDrawn === -1 || i === lastDrawn)) { lastDrawn = -1; draw(); }

        updateLoaderUI();
        maybeReveal();
        pump();
      }

      function pump() {
        if (next >= order.length) return;
        var i = order[next++];
        var img = new Image();
        img.decoding = "async";
        // Modern browsers only — deprioritises the bulk of the sequence
        // behind the poster frame and the page's own critical resources.
        // Unsupported browsers just ignore the property.
        img.fetchPriority = i === 0 ? "high" : "low";
        images[i] = img;
        img.onload  = function () { settle(i, true); };
        img.onerror = function () { settle(i, false); };
        img.src = CONFIG.framePath(i);
      }

      var concurrency = CONFIG.loaderConcurrency || 14;
      for (var k = 0; k < concurrency && k < order.length; k++) pump();
    }

    /* ---------- Scroll wiring ---------- */

    function scrollDistance() {
      return Math.max(1, sectionEl.offsetHeight - window.innerHeight);
    }

    function setProgressBar(p) {
      progFill.style.width = (Math.min(1, Math.max(0, p)) * 100).toFixed(2) + "%";
    }

    function initGSAP() {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });

      if (CONFIG.useGsapPin !== false) document.body.classList.add("gsap-pinned");

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: sectionEl,
          start: "top top",
          end: function () { return "+=" + scrollDistance(); },
          pin: CONFIG.useGsapPin !== false ? pinEl : false,
          pinSpacing: false,
          scrub: CONFIG.scrub != null ? CONFIG.scrub : 0.65,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: function (self) { setProgressBar(self.progress); }
        }
      });

      tl.to(state, {
        frame: CONFIG.frameCount - 1,
        duration: 1,
        onUpdate: function () {
          if (Math.round(state.frame) !== lastDrawn) draw();
        }
      }, 0);

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

      var ticking = false;

      function onScroll() {
        if (ticking) return;
        ticking = true;
        window.requestAnimationFrame(function () {
          ticking = false;
          var top = sectionEl.getBoundingClientRect().top;
          var p = Math.min(1, Math.max(0, -top / scrollDistance()));

          state.frame = p * (CONFIG.frameCount - 1);
          if (Math.round(state.frame) !== lastDrawn) draw();
          setProgressBar(p);

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

    function boot() {
      document.documentElement.style.setProperty("--stage-bg", CONFIG.background);
      resize();

      var resizeTimer;
      window.addEventListener("resize", function () {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 120);
      }, { passive: true });

      preload(function () {
        resize();
        draw();
      });

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

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", boot);
    } else {
      boot();
    }
  }

  window.initFrameSequence = initFrameSequence;
})();
