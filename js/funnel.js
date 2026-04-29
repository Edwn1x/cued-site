/* ============================================================
   funnel.js
   Sequence:
     0–20%  : "Fitness is broken." fades in, big, centered
     20–30% : headline fades out, chaos fades in
     30–75% : chaos converges toward center
     75–85% : chaos fades out, "cued" fades in big
     85–90% : summary card fades in
     90–100%: coaching bubbles stagger in
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var isMobile = window.innerWidth < 768;

  gsap.set('.funnel-headline', { opacity: 0 });
  gsap.set('.chaos-item', { opacity: 0 });
  gsap.set('.funnel-cued', { opacity: 0 });
  gsap.set(['.clean-card', '.clean-bubble'], { opacity: 0, scale: 0.95 });

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function prog(p, a, b) { return clamp01((p - a) / (b - a)); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initFunnel() {
    var sticky = document.querySelector('.funnel-sticky');
    if (!sticky) return;

    var sW = sticky.offsetWidth;
    var sH = sticky.offsetHeight;
    var cx = sW * 0.5;
    var cy = sH * 0.5;

    var items = gsap.utils.toArray('.chaos-item');
    items.forEach(function (item) {
      item._dx = cx - (item.offsetLeft + item.offsetWidth / 2);
      item._dy = cy - (item.offsetTop + item.offsetHeight / 2);
    });

    ScrollTrigger.create({
      trigger: '.funnel-scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate: function (self) {
        var p = self.progress;

        // ── Headline: fades in 0–20%, holds, fades out 20–30% ───
        var hlIn  = ease(prog(p, 0.00, 0.20));
        var hlOut = ease(prog(p, 0.20, 0.30));
        gsap.set('.funnel-headline', { opacity: hlIn * (1 - hlOut) });

        // ── Chaos: fades in 20–30%, converges 30–75% ─────────────
        var chaosIn = ease(prog(p, 0.20, 0.30));
        var converge = ease(prog(p, 0.30, 0.75));
        var chaosOut = ease(prog(p, 0.75, 0.85));

        items.forEach(function (item, i) {
          var spread = isMobile ? 7 : 14;
          var angle = (i / items.length) * Math.PI * 2;
          gsap.set(item, {
            opacity: chaosIn * (1 - chaosOut),
            x: (item._dx + Math.cos(angle) * spread) * converge,
            y: (item._dy + Math.sin(angle) * spread) * converge,
            rotation: lerp(0, 0, converge),
            scale: lerp(1, isMobile ? 0.6 : 0.75, converge),
          });
        });

        // ── "cued": fades in 75–85% ───────────────────────────────
        gsap.set('.funnel-cued', { opacity: ease(prog(p, 0.75, 0.85)) });

        // ── Clean card: fades in 85–90% ───────────────────────────
        var cardP = ease(prog(p, 0.85, 0.90));
        gsap.set('.clean-card', { opacity: cardP, scale: lerp(0.9, 1, cardP) });

        // ── Bubbles: stagger 90–100% ──────────────────────────────
        var ids = ['#bubble-manny','#bubble-jess','#bubble-james','#bubble-molly','#bubble-alex'];
        ids.forEach(function (id, i) {
          var bP = ease(prog(p, 0.90 + i * 0.02, 0.92 + i * 0.02));
          gsap.set(id, {
            opacity: bP,
            x: ((i % 2 === 0) ? -16 : 16) * (1 - bP),
            scale: lerp(0.95, 1, bP),
          });
        });
      }
    });
  }

  if (document.readyState === 'complete') {
    initFunnel();
  } else {
    window.addEventListener('load', initFunnel);
  }

}());
