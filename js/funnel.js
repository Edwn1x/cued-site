/* ============================================================
   funnel.js — Scroll-driven chaos→clean funnel animation
   Uses GSAP + ScrollTrigger
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

    // Logo sits at 65% from top of sticky container, horizontally centered
    var logoX = sW * 0.5;
    var logoY = sH * 0.65;

    var chaosItems = gsap.utils.toArray('.chaos-item');

    // For each chaos item, calculate where its center currently sits
    // relative to the sticky container, then compute the delta to reach logo
    chaosItems.forEach(function (item) {
      var itemCenterX = item.offsetLeft + item.offsetWidth / 2;
      var itemCenterY = item.offsetTop + item.offsetHeight / 2;
      var dx = logoX - itemCenterX;
      var dy = logoY - itemCenterY;
      // Store on the element so the timeline can reference them
      item._dx = dx;
      item._dy = dy;
    });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: '#funnel-section',
        start: 'top top',
        end: 'bottom bottom',
        scrub: 1.2,
        pin: '.funnel-sticky',
        anticipatePin: 1,
      }
    });

    // 0–10%: hold scattered
    tl.to({}, { duration: 0.1 });

    // 10–60%: all chaos items converge inward toward logo
    chaosItems.forEach(function (item, i) {
      // Slight final offset so they don't all land on the exact same pixel
      var spread = 14;
      var angle = (i / chaosItems.length) * Math.PI * 2;
      var fx = Math.cos(angle) * spread * (isMobile ? 0.5 : 1);
      var fy = Math.sin(angle) * spread * (isMobile ? 0.5 : 1);

      tl.to(item, {
        x: item._dx + fx,
        y: item._dy + fy,
        rotation: 0,
        scale: isMobile ? 0.55 : 0.75,
        duration: 0.5,
        ease: 'power2.inOut',
      }, 0.1); // all start at same progress point — they converge together
    });

    // 60–70%: fade out chaos, grow halo
    tl.to('.chaos-item', {
      opacity: 0,
      scale: 0,
      duration: 0.1,
      ease: 'power2.in',
    }, 0.6);

    tl.to('.funnel-logo-halo', {
      width: isMobile ? 200 : 300,
      height: isMobile ? 200 : 300,
      opacity: 1,
      duration: 0.1,
      ease: 'power1.out',
    }, 0.6);

    // 70–80%: pause — logo + halo only
    tl.to({}, { duration: 0.1 });

    // 80–85%: summary card fades in
    tl.to('.clean-card', {
      opacity: 1,
      scale: 1,
      duration: 0.05,
      ease: 'power2.out',
    }, 0.8);

    // 85–100%: bubbles stagger in
    var bubbleIds = [
      '#bubble-manny',
      '#bubble-jess',
      '#bubble-james',
      '#bubble-molly',
      '#bubble-alex',
    ];

    bubbleIds.forEach(function (id, i) {
      var xFrom = (i % 2 === 0) ? -16 : 16;
      tl.fromTo(id,
        { x: xFrom, opacity: 0, scale: 0.95 },
        { x: 0, opacity: 1, scale: 1, duration: 0.03, ease: 'power2.out' },
        0.85 + i * 0.03
      );
    });
  }

  if (document.readyState === 'complete') {
    initFunnelTimeline();
  } else {
    window.addEventListener('load', initFunnelTimeline);
  }

}());
