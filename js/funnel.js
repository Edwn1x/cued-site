/* ============================================================
   funnel.js — Scroll-driven chaos→clean funnel animation
   Uses GSAP + ScrollTrigger (no pin — sticky handled by CSS)
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var isMobile = window.innerWidth < 768;

  // ── Init: show chaos items, hide clean side ──────────────────
  gsap.set('.chaos-item', { opacity: 1 });
  gsap.set(['.clean-card', '.clean-bubble'], { opacity: 0, scale: 0.95 });
  gsap.set('.funnel-logo-halo', { width: 0, height: 0, opacity: 0 });

  function initFunnelTimeline() {
    var sticky = document.querySelector('.funnel-sticky');
    var sW = sticky.offsetWidth;
    var sH = sticky.offsetHeight;

    var logoX = sW * 0.5;
    var logoY = sH * 0.65;

    var chaosItems = gsap.utils.toArray('.chaos-item');

    chaosItems.forEach(function (item) {
      var itemCenterX = item.offsetLeft + item.offsetWidth / 2;
      var itemCenterY = item.offsetTop + item.offsetHeight / 2;
      item._dx = logoX - itemCenterX;
      item._dy = logoY - itemCenterY;
    });

    // ScrollTrigger watches scroll through the spacer.
    // NO pin — CSS position:sticky handles keeping it on screen.
    var st = ScrollTrigger.create({
      trigger: '.funnel-scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate: function (self) {
        var p = self.progress; // 0 to 1

        // ── 0–10%: hold ──────────────────────────────────────────
        // Nothing animates yet

        // ── 10–60%: chaos items converge toward logo ─────────────
        var convergeP = Math.max(0, Math.min(1, (p - 0.10) / 0.50));
        chaosItems.forEach(function (item, i) {
          var spread = 14;
          var angle = (i / chaosItems.length) * Math.PI * 2;
          var fx = Math.cos(angle) * spread * (isMobile ? 0.5 : 1);
          var fy = Math.sin(angle) * spread * (isMobile ? 0.5 : 1);
          var ease = convergeP < 0.5
            ? 2 * convergeP * convergeP
            : 1 - Math.pow(-2 * convergeP + 2, 2) / 2; // easeInOutQuad

          gsap.set(item, {
            x: (item._dx + fx) * ease,
            y: (item._dy + fy) * ease,
            rotation: item._startRotation !== undefined
              ? item._startRotation * (1 - ease)
              : 0,
            scale: 1 - (isMobile ? 0.45 : 0.25) * ease,
          });
        });

        // ── 60–70%: chaos fades out, halo grows ──────────────────
        var fadeP = Math.max(0, Math.min(1, (p - 0.60) / 0.10));
        gsap.set('.chaos-item', { opacity: 1 - fadeP, scale: 1 - fadeP * 0.4 });
        gsap.set('.funnel-headline', { opacity: Math.max(0, 1 - fadeP * 3) });

        var haloSize = (isMobile ? 200 : 300) * fadeP;
        gsap.set('.funnel-logo-halo', {
          width: haloSize,
          height: haloSize,
          opacity: fadeP * 0.8,
        });

        // ── 68–78%: bg transitions purple → white ────────────────
        var bgP = Math.max(0, Math.min(1, (p - 0.68) / 0.10));
        // Interpolate #7C6EFF → #ffffff
        var r = Math.round(124 + (255 - 124) * bgP);
        var g = Math.round(110 + (255 - 110) * bgP);
        var b = Math.round(255 + (255 - 255) * bgP);
        sticky.style.backgroundColor = 'rgb(' + r + ',' + g + ',' + b + ')';

        // Logo color: white → #7C6EFF as bg goes white
        var logoR = Math.round(255 + (124 - 255) * bgP);
        var logoG = Math.round(255 + (110 - 255) * bgP);
        var logoB = Math.round(255 + (255 - 255) * bgP);
        var logoEl = document.querySelector('.funnel-logo');
        if (logoEl) logoEl.style.color = 'rgb(' + logoR + ',' + logoG + ',' + logoB + ')';

        // ── 80–85%: summary card fades in ────────────────────────
        var cardP = Math.max(0, Math.min(1, (p - 0.80) / 0.05));
        gsap.set('.clean-card', {
          opacity: cardP,
          scale: 0.9 + 0.1 * cardP,
        });

        // ── 85–100%: bubbles stagger in ──────────────────────────
        var bubbleIds = [
          '#bubble-manny',
          '#bubble-jess',
          '#bubble-james',
          '#bubble-molly',
          '#bubble-alex',
        ];
        bubbleIds.forEach(function (id, i) {
          var start = 0.85 + i * 0.03;
          var bP = Math.max(0, Math.min(1, (p - start) / 0.03));
          var xFrom = (i % 2 === 0) ? -16 : 16;
          gsap.set(id, {
            opacity: bP,
            x: xFrom * (1 - bP),
            scale: 0.95 + 0.05 * bP,
          });
        });
      }
    });
  }

  if (document.readyState === 'complete') {
    initFunnelTimeline();
  } else {
    window.addEventListener('load', initFunnelTimeline);
  }

}());
