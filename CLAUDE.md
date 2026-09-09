# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cued is a static marketing site for an AI fitness coaching product delivered via text message. It is deployed via GitHub Pages (CNAME: the site domain) from `main`. There is no build system, bundler, or package manager — all code is vanilla HTML/CSS/JS served directly.

## Serving Locally

Open any HTML file directly in a browser, or use a simple static server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

## Architecture

The site is entirely self-contained vanilla HTML/CSS/JS with no framework or build step. All CSS is inlined in `<style>` tags; all JS is inlined in `<script>` tags at the bottom of each page.

- **`index.html`** — Main landing page. The entire page is one iMessage thread seen from Cued's side of the screen: Cued is blue (`#007AFF`) and right-aligned; the user is gray and left-aligned. No phone mockup, no device chrome. Full design/motion spec lives at `.context/redesign-spec.md` (gitignored — Conductor workspace collateral).
- **`how-it-works.html`** — Feature explainer page (dark theme, previous design generation).
- **`discover.html`** — Supplementary feature/discovery page (previous generation).
- **`profile.html`** — User profile page (light theme, previous generation).
- **`welcome.html`** — Post-signup confirmation page (dark theme, previous generation).
- **`privacy.html`** / **`terms.html`** — Legal pages (dark theme, previous generation; accent updated to the current brand blue).
- **`index2.html`**, **`testing/index.html`**, **`css/funnel.css`**, **`js/funnel.js`** — Legacy artifacts from earlier design generations. Nothing references them; safe to ignore.

**External dependencies loaded via CDN (no local install):**
- Google Fonts on `index.html`: Hedvig Letters Serif (section headers), Inter 400/500 (bubble text), Outfit (wordmark only). The nav brand is `images/cued-logo.svg` (circle-and-dot mark) plus a blue "cued" wordmark.

## index.html Design System

**Tokens** — `--blue: #007AFF` (Apple iMessage system blue; the brand blue globally), `--blue-deep` `#0062CC` (hover), `--blue-soft` `#E5F1FF` (tints/focus), `--gray` `#E9E9EB` (user bubbles), flat white `--bg`, `--poll-fill`/`--poll-ink` (iOS 26 Messages poll orange). The bubbles are the only color on the page — no gradients, no drop shadows, no hover states on bubbles, no second accent beyond the poll orange.

**Dark mode** — an iOS-style flip switch in the nav toggles `html.dark`, which overrides the tokens to real Messages dark (true-black `--bg`, `#3B3B3D` user bubbles, `#0A84FF` iOS dark system blue, dark poll orange). All theme-dependent colors live in tokens on `:root`/`html.dark` — never hardcode a color in a rule; add a token. The choice persists in `localStorage('cued-theme')` and is applied pre-paint by the head script to avoid a white flash.

**Desktop scrollytelling (≥768px, motion OK)** — the hero opens with the Campanile fully drawn and the first bubble already on screen; the timed (not scrubbed) pops of the remaining bubbles start on the first scroll gesture, or on their own after ~2s idle, while its sticky stage pins through a 90vh budget. The floating waitlist pill doubles as the hero CTA — it surfaces bottom-center ~1s after the last hero bubble settles. Every other section is `height: 100vh + 2 × 45vh` (uniform hold budget) with a sticky 100vh stage. Scroll only brings a section on stage: when its pin engages, the choreography auto-plays one-shot on a timeline — blank stage with the header centered → header glides up to its pinned `top: 10vh` spot → bubbles pop in sequence. Scrolling back leaves played threads in place; deep loads settle passed sections instantly. The thread is bottom-anchored and translated down by the height of unrevealed bubbles; each beat shrinks that shift so the thread pushes up like real Messages. Headers crossfade in place on beat changes (the nav cue-ball compact beat rides the first header switch).

**Mobile (<768px, motion OK)** — the tour sections pin and auto-play with the same machinery as desktop; only sizing differs (dvh-measured stages for iOS's dynamic toolbar, tight shell, 17px bubble text — real Messages size, 24px pinned headers, compact close section). The hero alone stays a static flow block: the drawing (art band blown up to 250vw, cropped to 64vw tall with a bottom mask fade, and shifted so the Campanile centers — the previous live site's mobile treatment), the intro bubbles beneath it, then `.hero-mobile` — a full-width waitlist CTA (`source: 'hero'`) plus quiet FAQs link — which pops in only after the bubble sequence settles. The nav's dark-mode toggle and "get started" are hidden on mobile for now; the floating pill only surfaces once the hero is scrolled past. A notification banner (`.notif`, motion only — iOS-style top banner on mobile, macOS-style top-right card on desktop) nudges the reader to scroll once they've dwelt on the hero ~2.6s past the hero CTA beat; the dwell is a watcher, not a one-shot — leaving the hero resets it, returning re-arms it — and it fires at most once, never after a waitlist CTA touch. It auto-dismisses after ~6.4s, and on tap scrolls to the first section.

**`prefers-reduced-motion` (any width)** — a genuinely separate flow layout, not a degraded pin: no sticky, plain vertical thread, inline section headers (`.hdr-flow`), IntersectionObserver fade-ins. Mode is switched live on media-query change in JS.

**Waitlist modal** — every CTA opens a modal that POSTs `{ name, phone, email|null, source, ts, timezone, active: false, status: 'waitlist' }` to the Railway `/waitlist` endpoint. Do not change this contract.

**Bubble anatomy** — tails only on the last bubble of a run, built from two pseudo-elements (color extension + page-white carve); both must be at least as tall as the corner radius or the tail detaches. The poll's width is matched to the widest sibling bubble by JS.

## Images / Assets

- `images/` — favicon SVG (blue, current brand), OG images, `app-icons/` (used in the "so you can delete these" section).
- `images/hero-drawing.png` — the `the-one.png` Campanile drawing, cropped to the art band (1920×650), paper-gray background keyed to transparency, ink recolored to the brand blue. Referenced by the `index.html` hero, shown fully drawn at load (the SVG stroke-mask trace machinery remains but is set complete — see the `.hero-art` comment in `index.html`).
- `images/dinner-plate.jpg` — real plate photo (tri-tip, sweet potatoes, broccoli/cauliflower) sent as the user's photo attachment in the "i know what's for dinner" section (1000×855 JPEG).
- `images/tj-receipt.jpg` — real Trader Joe's receipt photo (Berkeley, 1885 University Ave), the user's photo attachment in the "i read receipts" section (972×1200 JPEG).
- `images/og-image-cued.png` and `og-image-cued-square.png` still carry the previous design's blue (`#1086FF`) and need regenerating.
- Assets from previous design generations (hero backgrounds, `the-one.png` source drawing, wearable photo) remain in `images/` but are unreferenced by `index.html`.
- Git LFS is configured for `videos/*.mp4` (see `.gitattributes`).
