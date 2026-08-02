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
- Google Fonts on `index.html`: Hedvig Letters Serif (section headers), Inter 400/500 (bubble text), Outfit (wordmark only)

## index.html Design System

**Tokens** — `--blue: #007AFF` (Apple iMessage system blue; the brand blue globally), `--blue-deep` `#0062CC` (hover), `--blue-soft` `#E5F1FF` (tints/focus), `--gray` `#E9E9EB` (user bubbles), flat white `--bg`, `--poll-fill`/`--poll-ink` (iOS 26 Messages poll orange). The bubbles are the only color on the page — no gradients, no drop shadows, no hover states on bubbles, no second accent beyond the poll orange.

**Desktop scrollytelling (≥768px, motion OK)** — each section is a tall scroll container (`height: 100vh + (reveals − 1) × 45vh`) with a sticky 100vh stage. Bubble reveals are a pure function of scroll progress (idempotent — scrubbing backward un-reveals; no one-way flags). The thread is bottom-anchored and translated down by the height of unrevealed bubbles; each reveal shrinks that shift so the thread pushes up like real Messages. Section headers pin at `top: 10vh`, centered on the shell, and crossfade in place on beat changes.

**Mobile (<768px) and `prefers-reduced-motion`** — a genuinely separate layout path, not a degraded pin: no sticky, plain vertical thread, 17px bubble text (real Messages size), inline section headers, IntersectionObserver fade-ins. Mode is switched live on media-query change in JS.

**Waitlist modal** — every CTA opens a modal that POSTs `{ name, phone, email|null, source, ts, timezone, active: false, status: 'waitlist' }` to the Railway `/waitlist` endpoint. Do not change this contract.

**Bubble anatomy** — tails only on the last bubble of a run, built from two pseudo-elements (color extension + page-white carve); both must be at least as tall as the corner radius or the tail detaches. The poll's width is matched to the widest sibling bubble by JS.

## Images / Assets

- `images/` — favicon SVG (blue, current brand), OG images, `app-icons/` (used in the "so you can delete these" section).
- `images/og-image-cued.png` and `og-image-cued-square.png` still carry the previous design's blue (`#1086FF`) and need regenerating.
- Assets from previous design generations (hero backgrounds, `the-one.png` Berkeley drawing, wearable photo) remain in `images/` but are unreferenced by `index.html`.
- Git LFS is configured for `videos/*.mp4` (see `.gitattributes`).
