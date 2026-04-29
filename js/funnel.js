/* ============================================================
   funnel.js — Scroll-driven chaos→clean funnel animation
   Sequence:
     0–15%  : "Fitness apps are broken." fades in
     15–25% : chaos items fade in
     25–70% : chaos converges toward "— cued —"
     70–80% : chaos fades out, "— cued —" fades in
     80–85% : summary card fades in
     85–100%: coaching bubbles stagger in
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var isMobile = window.innerWidth < 768;

  // Init: everything hidden, GSAP will reveal in sequence
  gsap.set('.funnel-headline', { opacity: 0 });
  gsap.set('.chaos-item', { opacity: 0 });
  gsap.set('.funnel-cued', { opacity: 0 });
  gsap.set(['.clean-card', '.clean-bubble'], { opacity: 0, scale: 0.95 });

  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function progress(p, start, end) { return clamp01((p - start) / (end - start)); }
  // ease in-out quad
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }

  function initFunnelTimeline() {
    var sticky = document.querySelector('.funnel-sticky');
    if (!sticky) return;
    var sW = sticky.offsetWidth;
    var sH = sticky.offsetHeight;

    // Convergence target: center of sticky, 65% down
    var logoX = sW * 0.5;
    var logoY = sH * 0.65;

    var chaosItems = gsap.utils.toArray('.chaos-item');
    chaosItems.forEach(function (item) {
      item._dx = logoX - (item.offsetLeft + item.offsetWidth / 2);
      item._dy = logoY - (item.offsetTop + item.offsetHeight / 2);
    });

    ScrollTrigger.create({
      trigger: '.funnel-scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.2,
      onUpdate: function (self) {
        var p = self.progress;

        // ── 0–15%: headline fades in ─────────────────────────────
        gsap.set('.funnel-headline', { opacity: ease(progress(p, 0, 0.15)) });

        // ── 15–25%: chaos items fade in ──────────────────────────
        var chaosIn = ease(progress(p, 0.15, 0.25));
        chaosItems.forEach(function (item) {
          // Only set opacity here — position is handled below
          gsap.set(item, { opacity: chaosIn });
        });

        // ── 25–70%: chaos converges toward cued ──────────────────
        var converge = ease(progress(p, 0.25, 0.70));
        chaosItems.forEach(function (item, i) {
          var spread = isMobile ? 7 : 14;
          var angle = (i / chaosItems.length) * Math.PI * 2;
          gsap.set(item, {
            x: (item._dx + Math.cos(angle) * spread) * converge,
            y: (item._dy + Math.sin(angle) * spread) * converge,
            rotation: 0,
            scale: lerp(1, isMobile ? 0.55 : 0.75, converge),
          });
        });

        // ── 70–80%: chaos fades out, "— cued —" fades in ─────────
        var fadeOut = ease(progress(p, 0.70, 0.80));
        gsap.set('.chaos-item', { opacity: lerp(chaosIn, 0, fadeOut) });
        gsap.set('.funnel-headline', { opacity: lerp(1, 0, ease(progress(p, 0.65, 0.75))) });
        gsap.set('.funnel-cued', { opacity: ease(progress(p, 0.72, 0.82)) });

        // ── 80–85%: summary card ─────────────────────────────────
        var cardP = ease(progress(p, 0.80, 0.85));
        gsap.set('.clean-card', { opacity: cardP, scale: lerp(0.9, 1, cardP) });

        // ── 85–100%: bubbles stagger ─────────────────────────────
        var bubbleIds = ['#bubble-manny','#bubble-jess','#bubble-james','#bubble-molly','#bubble-alex'];
        bubbleIds.forEach(function (id, i) {
          var bP = ease(progress(p, 0.85 + i * 0.03, 0.88 + i * 0.03));
          var xFrom = (i % 2 === 0) ? -16 : 16;
          gsap.set(id, { opacity: bP, x: xFrom * (1 - bP), scale: lerp(0.95, 1, bP) });
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
