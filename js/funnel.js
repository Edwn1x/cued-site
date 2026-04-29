/* ============================================================
   funnel.js — Scroll-driven chaos→clean funnel animation
   Uses GSAP + ScrollTrigger
   ============================================================ */

(function () {
  'use strict';

  // Guard: if GSAP isn't loaded, bail out gracefully.
  // The no-JS CSS fallback keeps the clean side visible.
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  // ── Init: show chaos items, hide clean side ──────────────────
  gsap.set('.chaos-item', { opacity: 1 });
  gsap.set(['.clean-card', '.clean-bubble'], { opacity: 0 });
  gsap.set('.funnel-logo-halo', { width: 0, height: 0 });

  // ── Responsive flag ──────────────────────────────────────────
  var isMobile = window.innerWidth < 768;

  // ── Collect all chaos items ──────────────────────────────────
  var chaosItems = gsap.utils.toArray('.chaos-item');

  // ── Wait for layout to settle so getBoundingClientRect is accurate
  function initFunnelTimeline() {
    var centerX = window.innerWidth / 2;
    var centerY = window.innerHeight * 0.65;

    // ── Main scroll-driven timeline ──────────────────────────────
    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#funnel-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1,
        pin: '.funnel-sticky',
        anticipatePin: 1,
      }
    });

    // 0–10%: hold in full scattered state
    tl.to({}, { duration: 0.1 });

    // 10–60%: chaos items converge toward logo center
    chaosItems.forEach(function (item, i) {
      var rect = item.getBoundingClientRect();
      // Slight offsets so items don't all stack exactly at the same point
      var offsetX = (i % 3 - 1) * 20;
      var offsetY = (i % 2) * 10;

      tl.to(item, {
        x: centerX - rect.left - rect.width / 2 + offsetX,
        y: centerY - rect.top - rect.height / 2 + offsetY,
        rotation: 0,
        scale: isMobile ? 0.6 : 0.8,
        duration: 0.5,
        ease: 'power2.inOut',
      }, 0.1 + i * 0.01); // slight stagger so they don't all move at identical times
    });

    // 60–70%: compress further + fade out chaos; halo grows
    tl.to('.chaos-item', {
      opacity: 0,
      scale: isMobile ? 0.4 : 0.6,
      duration: 0.1,
      ease: 'power2.in',
    }, 0.6);

    tl.to('.funnel-logo-halo', {
      width: 300,
      height: 300,
      opacity: 1,
      duration: 0.1,
      ease: 'power1.out',
    }, 0.6);

    // 70–80%: pause — only logo + halo visible
    tl.to({}, { duration: 0.1 });

    // 80–85%: summary card fades in, scales 0.9→1.0
    tl.fromTo('.clean-card', {
      opacity: 0,
      scale: 0.9,
    }, {
      opacity: 1,
      scale: 1,
      duration: 0.05,
      ease: 'power2.out',
    }, 0.8);

    // 85–100%: coaching bubbles pop in staggered
    var bubbleIds = [
      '#bubble-manny',
      '#bubble-jess',
      '#bubble-james',
      '#bubble-molly',
      '#bubble-alex',
    ];

    bubbleIds.forEach(function (id, i) {
      // Left-column bubbles (even indices: manny, james, alex) come from left;
      // right-column bubbles (jess, molly) come from right
      var xFrom = (i % 2 === 0) ? -20 : 20;

      tl.fromTo(id, {
        x: xFrom,
        opacity: 0,
      }, {
        x: 0,
        opacity: 1,
        duration: 0.03,
        ease: 'power2.out',
      }, 0.85 + i * 0.03);
    });
  }

  // Run after DOM is fully painted
  if (document.readyState === 'complete') {
    initFunnelTimeline();
  } else {
    window.addEventListener('load', initFunnelTimeline);
  }

}());
