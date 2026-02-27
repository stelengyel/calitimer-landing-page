# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Pre-launch marketing landing page for **CaliTimer** — an iOS computer vision app that auto-detects and times calisthenics static skills (handstand, front lever, planche, etc.). The sole purpose of this page is email collection via ConvertKit ahead of the App Store launch.

> **Source of truth: [`PRD.md`](./PRD.md)** — all product requirements, page structure, design constraints, ConvertKit setup, open questions, and implementation order live there. Read it before starting any work.

## Commands

Once the Astro project is initialized:

```bash
npm run dev        # Local dev server (http://localhost:4321)
npm run build      # Production build → dist/
npm run preview    # Preview the production build locally
```

Environment variables required for the ConvertKit API endpoint to function locally — create a `.env` file at the project root:
```
CONVERTKIT_API_KEY=...
CONVERTKIT_FORM_ID=...
```

## Architecture

**Stack:** Astro + Tailwind CSS + Vercel (all free tier)

**Key architectural decision:** The email form uses a custom-styled HTML form, NOT ConvertKit's JavaScript embed. Form submissions go to `/api/subscribe` — an Astro SSR serverless endpoint that proxies to the ConvertKit REST API (`POST /v3/forms/{form_id}/subscribe`). This keeps the API key server-side and gives full styling control.

**Design assets** live in `calitimer-design-assets/` as a git submodule. All color tokens, typography, spacing, logo files, and iconography come from there. **Never invent styles that contradict the submodule's style guide.** Before making any visual decisions, read the style guide in that submodule.

**Page structure** (`src/pages/index.astro`) is a single page with five sections in order:
1. Hero — headline + primary email CTA (above the fold)
2. How It Works — 3-step flow
3. Supported Skills — skill grid
4. Secondary email CTA — for users who scrolled past the hero
5. Footer — logo, copyright, privacy link

**`/privacy`** page must exist (required for App Store review and GDPR compliance).

## Constraints

- **Single CTA only** — no App Store download links until the app is live
- **No app screenshots in v1** — none are available; design must work without them
- **No analytics, tracking cookies, or third-party scripts** in v1
- **Mobile-first** — design for iPhone viewport first, then scale up
- **Lighthouse Performance target ≥ 95** — avoid blocking scripts, heavy images, and unnecessary JS
- Accessibility: WCAG AA contrast (≥ 4.5:1), visible form labels, keyboard navigable

## Deployment

Hosted on Vercel (free tier). `CONVERTKIT_API_KEY` and `CONVERTKIT_FORM_ID` are set as environment variables in the Vercel project dashboard — never hardcoded. Git push to `main` triggers automatic redeploy.
