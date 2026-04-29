/* ============================================================
   funnel.js — Full narrative sequence

   0–15%  : "Fitness is broken." fades in centered
   15–22% : "Fitness is broken." slides up + fades out
   22–32% : chaos fades in (items in bottom half)
             "This is your phone right now." fades in above chaos
   32–48% : chaos holds, "This is your phone..." holds
   48–55% : chaos + "This is your phone..." slide up + fade out
             "You're getting coached by everyone except a coach." fades in
   55–65% : that headline holds
   65–72% : it slides up + fades out
             "And none of it knows you." fades in
   72–80% : that holds
   80–85% : it slides up + fades out
             "— cued —" + "changes that." fade in
   85–100%: hold
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  var isMobile = window.innerWidth < 768;

  // Hide all animated elements on init
  gsap.set('#fh-broken, #fh-phone, #fh-coached, #fh-none', { opacity: 0, y: 0 });
  gsap.set('#fh-cued', { opacity: 0 });
  gsap.set('.chaos-item', { opacity: 0 });

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function prog(p, a, b) { return clamp01((p - a) / (b - a)); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  function initFunnel() {
    var sticky = document.querySelector('.funnel-sticky');
    if (!sticky) return;

    var sW = sticky.offsetWidth;
    var sH = sticky.offsetHeight;

    // Convergence target: center of viewport
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

        // ── Beat 1: "Fitness is broken." ─────────────────────────
        var b1in  = ease(prog(p, 0.00, 0.15));
        var b1out = ease(prog(p, 0.15, 0.22));
        gsap.set('#fh-broken', {
          opacity: b1in * (1 - b1out),
          y: lerp(0, -80, b1out),
        });

        // ── Chaos: fades in 22–32%, sits in bottom half ───────────
        var chaosIn  = ease(prog(p, 0.22, 0.32));
        var chaosOut = ease(prog(p, 0.48, 0.56));
        items.forEach(function (item) {
          gsap.set(item, {
            opacity: chaosIn * (1 - chaosOut),
            y: lerp(0, -60, chaosOut),
          });
        });

        // ── Beat 2: "This is your phone right now." ───────────────
        var b2in  = ease(prog(p, 0.25, 0.35));
        var b2out = ease(prog(p, 0.48, 0.56));
        gsap.set('#fh-phone', {
          opacity: b2in * (1 - b2out),
          y: lerp(0, -80, b2out),
        });

        // ── Beat 3: "You're getting coached by everyone..." ───────
        var b3in  = ease(prog(p, 0.56, 0.64));
        var b3out = ease(prog(p, 0.65, 0.72));
        gsap.set('#fh-coached', {
          opacity: b3in * (1 - b3out),
          y: lerp(0, -80, b3out),
        });

        // ── Beat 4: "And none of it knows you." ───────────────────
        var b4in  = ease(prog(p, 0.72, 0.79));
        var b4out = ease(prog(p, 0.80, 0.86));
        gsap.set('#fh-none', {
          opacity: b4in * (1 - b4out),
          y: lerp(0, -80, b4out),
        });

        // ── Beat 5: "— cued —" + "changes that." ─────────────────
        var b5in = ease(prog(p, 0.86, 0.94));
        gsap.set('#fh-cued', { opacity: b5in });
      }
    });
  }

  if (document.readyState === 'complete') {
    initFunnel();
  } else {
    window.addEventListener('load', initFunnel);
  }

}());
