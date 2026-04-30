/* ============================================================
   funnel.js — Chaos escalation sequence (350vh spacer)

   0–5%   : Zone 1 headline fades in. DoorDash slides in from top.
   5–15%  : Boba invite, MFP nag arrive from edges. Comfortable pace.
   15–30% : Pace picks up — pairs arrive. TikTok+thought, stat+iMessage.
             By 30% ~8–9 items visible, space feeling crowded.
   30–45% : Rapid. Items every 2–3%. Edges full, landing center.
             Zone 1 headline fades out, Zone 2 "And none of it knows you."
             transitions in. Can't read individual items — just feel weight.
   45–55% : Final burst. Remaining items flood in almost simultaneously.
             Peak overwhelm. 27 items on screen.
   55–70% : Funnel. Everything drifts toward center (converge).
             Items compress, shrink, fade.
   70–80% : Pause. Just "cued" logo + halo. Silence.
   80–100%: Clean side reveals (handled by IntersectionObserver in main JS)
   ============================================================ */

(function () {
  'use strict';

  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') return;

  gsap.registerPlugin(ScrollTrigger);

  gsap.set('#fh-coached, #fh-none', { opacity: 0, y: 0 });
  gsap.set('#fh-cued', { opacity: 0 });
  gsap.set('#funnel-invert-bg', { opacity: 0 });
  gsap.set('.chaos-item', { opacity: 0, x: 0, y: 0 });

  function clamp01(v) { return Math.max(0, Math.min(1, v)); }
  function prog(p, a, b) { return clamp01((p - a) / (b - a)); }
  function ease(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t+2,2)/2; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ── Arrival schedule ────────────────────────────────────────
     Each entry: [id, arrivalStart%, arrivalEnd%, entryEdge]
     entryEdge: 'top' | 'left' | 'right' | 'bottom' — where the
     item slides in from (20px nudge on that axis)
  ────────────────────────────────────────────────────────────── */
  var schedule = [
    // 0–5%: DoorDash alone — iOS banner drop from top
    { id: '#chaos-doordash',    a: 0.00, b: 0.04, edge: 'top'   },

    // 5–15%: Comfortable pace — 2 more
    { id: '#chaos-boba',        a: 0.05, b: 0.09, edge: 'right' },
    { id: '#chaos-mfp',         a: 0.10, b: 0.14, edge: 'left'  },

    // 15–30%: Pairs arrive — pace picking up
    { id: '#chaos-bench',       a: 0.15, b: 0.18, edge: 'right' },
    { id: '#chaos-confused',    a: 0.16, b: 0.19, edge: 'bottom'},
    { id: '#chaos-darty',       a: 0.20, b: 0.23, edge: 'left'  },
    { id: '#chaos-stat-apps',   a: 0.21, b: 0.24, edge: 'right' },
    { id: '#chaos-shredded',    a: 0.24, b: 0.27, edge: 'bottom'},
    { id: '#chaos-onedrink',    a: 0.26, b: 0.29, edge: 'top'   },

    // 30–45%: Rapid — every 2–3%, landing center, overlapping
    { id: '#chaos-midterms',    a: 0.30, b: 0.32, edge: 'left'  },
    { id: '#chaos-stat-streak', a: 0.31, b: 0.33, edge: 'bottom'},
    { id: '#chaos-groupchat',   a: 0.32, b: 0.34, edge: 'right' },
    { id: '#chaos-ubereats',    a: 0.34, b: 0.36, edge: 'top'   },
    { id: '#chaos-bulkcut',     a: 0.35, b: 0.37, edge: 'left'  },
    { id: '#chaos-snap',        a: 0.36, b: 0.38, edge: 'right' },
    { id: '#chaos-reddit',      a: 0.37, b: 0.39, edge: 'bottom'},
    { id: '#chaos-trainer',     a: 0.38, b: 0.40, edge: 'left'  },
    { id: '#chaos-sleep',       a: 0.40, b: 0.42, edge: 'top'   },

    // 45–55%: Final burst — flood
    { id: '#chaos-youtube',     a: 0.45, b: 0.47, edge: 'right' },
    { id: '#chaos-tiktok2',     a: 0.45, b: 0.47, edge: 'top'   },
    { id: '#chaos-stat-watch',  a: 0.46, b: 0.48, edge: 'bottom'},
    { id: '#chaos-igdm',        a: 0.47, b: 0.49, edge: 'right' },
    { id: '#chaos-watch',       a: 0.47, b: 0.49, edge: 'left'  },
    { id: '#chaos-venmo',       a: 0.48, b: 0.50, edge: 'top'   },
    { id: '#chaos-midterm-cal', a: 0.49, b: 0.51, edge: 'bottom'},
    { id: '#chaos-rsf',         a: 0.50, b: 0.52, edge: 'right' },
    { id: '#chaos-break',       a: 0.51, b: 0.53, edge: 'left'  },
  ];

  /* Entry offsets in px per edge */
  var ENTRY_PX = 28;

  function edgeX(edge) {
    if (edge === 'left')  return -ENTRY_PX;
    if (edge === 'right') return  ENTRY_PX;
    return 0;
  }
  function edgeY(edge) {
    if (edge === 'top')    return -ENTRY_PX;
    if (edge === 'bottom') return  ENTRY_PX;
    return 0;
  }

  function initFunnel() {
    var sticky = document.querySelector('.funnel-sticky');
    if (!sticky) return;

    var sW = sticky.offsetWidth;
    var sH = sticky.offsetHeight;
    var cx = sW * 0.5;
    var cy = sH * 0.5;

    /* Pre-compute convergence deltas for each item */
    var items = gsap.utils.toArray('.chaos-item');
    items.forEach(function (el) {
      el._cx = cx - (el.offsetLeft + el.offsetWidth  / 2);
      el._cy = cy - (el.offsetTop  + el.offsetHeight / 2);
    });

    ScrollTrigger.create({
      trigger: '.funnel-scroll-spacer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 1.0,
      onUpdate: function (self) {
        var p = self.progress;

        /* ── Zone 1 headline: "You're getting coached..." ──────── */
        var h1in  = ease(prog(p, 0.00, 0.06));
        var h1out = ease(prog(p, 0.30, 0.38));
        gsap.set('#fh-coached', {
          opacity: h1in * (1 - h1out),
          y: lerp(0, -60, h1out),
        });

        /* ── Zone 2 headline: "And none of it knows you." ──────── */
        var h2in  = ease(prog(p, 0.34, 0.42));
        var h2out = ease(prog(p, 0.55, 0.62));
        gsap.set('#fh-none', {
          opacity: h2in * (1 - h2out),
          y: lerp(0, -60, h2out),
        });

        /* ── Chaos items — arrival + convergence + exit ─────────── */
        var convergeProg = ease(prog(p, 0.55, 0.70));
        var exitProg     = ease(prog(p, 0.65, 0.72));

        for (var i = 0; i < schedule.length; i++) {
          var s = schedule[i];
          var arriveT = ease(prog(p, s.a, s.b));
          var opacity = arriveT * (1 - exitProg);

          /* Entry slide: item starts offset in its edge direction */
          var entX = lerp(edgeX(s.edge), 0, arriveT);
          var entY = lerp(edgeY(s.edge), 0, arriveT);

          /* Convergence: drift toward viewport center */
          var el = document.querySelector(s.id);
          if (!el) continue;
          var convX = lerp(0, el._cx, convergeProg);
          var convY = lerp(0, el._cy, convergeProg);
          var convScale = lerp(1, 0.5, convergeProg);

          gsap.set(s.id, {
            opacity: opacity,
            x: entX + convX,
            y: entY + convY,
            scale: convScale,
          });
        }

        /* ── Filler opacity cap: 75% max so they read as texture ── */
        var fillers = ['#chaos-groupchat','#chaos-snap','#chaos-reddit',
                       '#chaos-youtube','#chaos-tiktok2','#chaos-igdm',
                       '#chaos-watch','#chaos-venmo','#chaos-trainer',
                       '#chaos-midterm-cal','#chaos-sleep','#chaos-rsf'];
        for (var f = 0; f < fillers.length; f++) {
          var el2 = document.querySelector(fillers[f]);
          if (el2 && parseFloat(el2.style.opacity) > 0.78) {
            el2.style.opacity = 0.78;
          }
        }

        /* ── Beat 5: white inversion + "cued" logo ──────────────── */
        var cuedIn = ease(prog(p, 0.72, 0.80));
        gsap.set('#funnel-invert-bg', { opacity: cuedIn });
        gsap.set('#fh-cued', { opacity: cuedIn });
      }
    });
  }

  if (document.readyState === 'complete') {
    initFunnel();
  } else {
    window.addEventListener('load', initFunnel);
  }

}());
