# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Cued is a static marketing site for an AI fitness coaching product delivered via text message. It is deployed via GitHub Pages (CNAME: the site domain). There is no build system, bundler, or package manager — all code is vanilla HTML/CSS/JS served directly.

## Serving Locally

Open any HTML file directly in a browser, or use a simple static server:

```bash
python3 -m http.server 8080
# or
npx serve .
```

## Architecture

The site is entirely self-contained vanilla HTML/CSS/JS with no framework or build step:

- **`index.html`** — Main landing page (~1600 lines). All CSS is inlined in `<style>` tags; all JS is inlined in `<script>` tags at the bottom. Contains multiple complex animated sections.
- **`how-it-works.html`** — Feature explainer page (dark theme). Same inline CSS/JS pattern.
- **`discover.html`** — Supplementary feature/discovery page.
- **`profile.html`** — User profile page (light theme).
- **`welcome.html`** — Post-signup confirmation page (dark theme).
- **`testing/index.html`** — Staging/testing variant of the landing page (`noindex`). Used to trial UI changes before promoting to `index.html`.
- **`privacy.html`** / **`terms.html`** — Legal pages.

**External dependencies loaded via CDN (no local install):**
- GSAP + ScrollTrigger (loaded in `index.html` for scroll animations)
- Google Fonts: DM Sans, Playfair Display, JetBrains Mono

## Shared Extracted Files

- **`css/funnel.css`** — Styles for the chaos→clean scroll-driven funnel section in `index.html`. Extracted from inline styles to keep the funnel section maintainable.
- **`js/funnel.js`** — Logic for the 350vh sticky scroll funnel animation on `index.html`. Uses GSAP + ScrollTrigger. Controls a 28-item chaos sequence (arrival schedule by scroll %) that converges to the "cued" brand moment.

## Key Design Patterns

**CSS variables** — All pages define a `:root` block with a consistent token set: `--accent` (#7C3AFF purple), `--text`, `--text2`, `--text3`, `--border`, `--f` (DM Sans), `--m` (JetBrains Mono). Dark pages use dark `--bg`; light pages use white `--bg`.

**Scroll animations** — `index.html` uses two patterns:
1. GSAP ScrollTrigger (funnel section, via `js/funnel.js`) — scroll-scrubbed, frame-by-frame control.
2. IntersectionObserver with `.rv` / `.rv-l` / `.rv-r` / `.rv-s` / `.rv-pop` CSS classes — elements gain `.vis` on intersection to trigger CSS transitions.

**Chat overlay (`.co-*`)** — `index.html` has a full-screen signup modal that renders a simulated coach conversation with typing indicators and chip-based onboarding questions.

**Sticky walkthrough** — `index.html` has a scroll-driven sticky section (`#swOuter`) that moves a phone mockup between positions and cycles through three conversation states as the user scrolls.

**`testing/index.html`** — A separate, `noindex` staging copy of the landing page. Changes are typically developed here first, then ported to `index.html` when ready.

## Images / Assets

- `images/` — Shared static assets (hero backgrounds, favicon SVG, wearable photo, iMessage icon, OG image).
- Git LFS is configured for `videos/*.mp4` (see `.gitattributes`).
