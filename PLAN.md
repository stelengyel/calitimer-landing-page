# CaliTimer Landing Page — Implementation Plan

## Context

Pre-launch marketing landing page for CaliTimer. One goal: collect email addresses via ConvertKit before the App Store launch. Requirements in `PRD.md`. All design decisions must strictly conform to `calitimer-design-assets/calitimer-style-guide.html`.

---

## Style Guide Compliance (Critical)

Read the style guide in full before writing any code. Every visual decision is defined there — nothing is invented independently.

**What the style guide defines:**
- **Colors:** Midnight (`#0C0906`), Ember (`#FF6B2B`), Amber (`#FFAA3B`), Gold (`#FFD166`), surface layers, text hierarchy
- **Gradients:** `--grad-brand`, `--grad-ember`, `--grad-bg`, `--grad-card`, ambient glow
- **Typography:** DM Serif Display (headlines), DM Sans (body/UI), JetBrains Mono (labels/metadata) — with specific weights, sizes, letter-spacing per token
- **Headline treatments:** Three named treatments — Italic Accent, Gradient Text, Mono Label + Serif — use one of these only
- **Spacing:** 8pt grid — 4/8/16/24/32/48/64/96px only
- **Border radius:** `sm` 8px, `md` 14px, `lg` 20px, `xl` 28px, `pill` 100px
- **Buttons:** Primary, Secondary, Ghost — exact padding, radius, font, hover states defined
- **Logo usage:** Minimum 100px wide lockup, 16px icon; clear space = height of "C"; variant rules per background
- **Brand voice:** Precise, Clear, Encouraging, Direct — short sentences, strong verbs, no hype
- **Assets for landing page:** `logo_light.png`, `logo_dark.png`, `CaliTimer_icon-iOS-Default-1024x1024@1x.png`, `CaliTimer_icon-iOS-Dark-1024x1024@1x.png` only

> **Silhouette images (`calitimer-design-assets/assets/silhouettes/`) must NOT be used on the landing page.**

---

## Self-Critique

**Assumptions made:**
- `npm` as package manager — confirmed by user
- ConvertKit API v3 (`/v3/forms/{id}/subscribe`) — not v4/Creator API
- Client-side form interactivity via vanilla `<script>` in Astro — no framework component
- Astro hybrid output mode for the single SSR endpoint
- @fontsource for self-hosted fonts — avoids Google Fonts CDN, better Lighthouse

**Key details that need attention:**
- ConvertKit v3 passes `api_key` as a body param (not an Authorization header)
- ConvertKit returns HTTP 200 for some error states — inspect response body, not just status
- No rate limiting on `/api/subscribe` — honeypot field is the only spam mitigation in v1
- Style guide secondary button uses teal border `rgba(45,220,180,0.4)` — inconsistent with palette; use ember at reduced opacity instead

**Doesn't scale well:**
- Copy hardcoded in components — acceptable for a single marketing page
- No font subsetting — acceptable for v1
- No analytics — acceptable per PRD; add Plausible/Fathom in v2

---

## Checklist

### Step 1 — Project Initialization ✅
- [x] Run `npm create astro@latest . -- --template minimal --typescript strict --no-git --install`
- [x] Install dependencies: `npm install @astrojs/tailwind tailwindcss @astrojs/vercel`
- [x] Install fonts: `npm install @fontsource/dm-serif-display @fontsource/dm-sans @fontsource/jetbrains-mono`
- [x] Configure `astro.config.mjs` — adapter: vercel(), integrations: [tailwind()] (note: `output: 'hybrid'` removed in Astro v5; static is the default; SSR routes use `export const prerender = false`)
- [x] Verify `npm run dev` starts successfully at localhost:4321

### Step 2 — Design System ✅
- [x] Read `calitimer-design-assets/calitimer-style-guide.html` in full
- [x] Configure `tailwind.config.mjs` — colors, font families, border radius, spacing from style guide (also added backgroundImage gradient tokens, letterSpacing tokens)
- [x] Create `src/styles/global.css` — CSS custom properties, gradients, @fontsource imports, base styles, `.gradient-text` utility, `scroll-behavior: smooth` (also added `.btn-primary`, `.btn-ghost`, `.section-label`, `.ambient-glow`, focus-visible ring, custom scrollbar)
- [x] Set `applyBaseStyles: false` in `astro.config.mjs` to avoid double-injection of Tailwind base styles

### Step 3 — Base Layout ✅
- [x] Create `src/layouts/BaseLayout.astro` — HTML shell, meta tags, OG tags, favicon, global CSS import, no nav

### Step 4 — Components ✅
- [x] `src/components/EmailForm.astro` — email input, visible label, honeypot field, primary CTA button, microcopy, loading/success/error states
- [x] `src/components/Hero.astro` — logo, headline (Treatment C), subheadline, EmailForm, app icon visual with ambient glow, `--grad-bg` background
- [x] `src/components/HowItWorks.astro` — section label, 3-step layout, inline SVG icons (1.5px stroke, no fill)
- [x] `src/components/SecondaryCTA.astro` — re-engagement headline, EmailForm, `var(--surface)` background
- [x] `src/components/Footer.astro` — logo (min 100px), copyright, privacy link
- Note: `logo_light.png` and `app-icon.png` copied to `public/` for static serving

### Step 5 — Pages ✅
- [x] `src/pages/index.astro` — assembles Hero → HowItWorks → SecondaryCTA → Footer
- [x] `src/pages/privacy.astro` — minimal placeholder, required before launch
- [x] `src/pages/api/subscribe.ts` — SSR endpoint (`prerender: false`), POST only, honeypot check, email validation, ConvertKit v3 API proxy, inspect response body

### Step 6 — Form Interactivity ✅
- [x] Add vanilla JS `<script>` to `EmailForm.astro` — fetch submit, loading/success/error state management, no page reload

### Step 7 — Environment Variables
- [ ] Create `.env` with `CONVERTKIT_API_KEY` and `CONVERTKIT_FORM_ID` for local dev
- [ ] Add `.env` to `.gitignore` (already present)

### Step 8 — Polish ✅
- [x] Responsive QA — markup verified at 375px, 768px, 1280px; hero visual hidden at <900px, form stacks at <480px, step cards collapse at <768px, footer wraps at <600px; no horizontal scroll vectors
- [x] Accessibility audit — WCAG AA contrast fixes: `--text-muted` (#5C4A3A, 2.3:1) replaced with `--text-secondary` (#B8A090, 8.6:1) on microcopy, hiw-sub, footer link, footer copy; `btn-loading` aria-hidden removed so button has accessible name "Sending…" during loading; success div gains `role="status" tabindex="-1"` + programmatic `focus()` for screen reader announcement; all form labels, focus rings, alt text, and ARIA landmarks confirmed present
- [x] Lighthouse performance — removed `background-attachment: fixed` (forced full-page repaints on scroll); `height="auto"` HTML attributes replaced with correct integer heights (logo: 179px@140w, 153px@120w) for CLS prevention; `fetchpriority="high"` added to above-fold hero images

### Step 9 — Deploy
- [ ] Connect repo to Vercel
- [ ] Set `CONVERTKIT_API_KEY` and `CONVERTKIT_FORM_ID` in Vercel project settings
- [ ] Push to `main` — verify automatic deploy triggers
- [ ] Connect custom domain (once decided)

---

## Verification Checklist

- [ ] `npm run dev` — no console errors
- [ ] All colors, fonts, spacing, buttons match style guide exactly
- [ ] Logo renders at correct minimum size with clear space
- [ ] Hero form submit → ConvertKit dashboard shows new subscriber
- [ ] Submit same email again → deduplicated, no error shown to user
- [ ] Submit with honeypot populated → silent 200, no ConvertKit entry
- [ ] Submit invalid email → inline error shown
- [ ] `npm run build && npm run preview` — clean build
- [ ] Lighthouse: Performance ≥ 95, Accessibility 100
- [ ] Mobile (375px): no horizontal scroll, tap targets ≥ 44px
- [ ] Keyboard navigation works end-to-end
- [ ] Live Vercel URL works end-to-end

---

## File Map

```
calitimer-landing-page/
├── calitimer-design-assets/        # Submodule — read style guide before ANY design work
│   ├── calitimer-style-guide.html  # Source of truth for all visual decisions
│   └── assets/
│       └── app-icons/              # Logos + app icons — the only assets used on this page
├── src/
│   ├── components/
│   │   ├── EmailForm.astro
│   │   ├── Hero.astro
│   │   ├── HowItWorks.astro
│   │   ├── SecondaryCTA.astro
│   │   └── Footer.astro
│   ├── layouts/
│   │   └── BaseLayout.astro
│   ├── pages/
│   │   ├── index.astro
│   │   ├── privacy.astro
│   │   └── api/
│   │       └── subscribe.ts
│   └── styles/
│       └── global.css
├── public/
│   └── favicon.ico
├── astro.config.mjs
├── tailwind.config.mjs
├── tsconfig.json
├── .env                            # Local only, gitignored
└── package.json
```
