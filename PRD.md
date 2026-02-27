# PRD: CaliTimer Landing Page

## 1. Overview

A high-converting, pre-launch marketing landing page for **CaliTimer** — an iOS app that uses on-device computer vision to automatically detect and time calisthenics static skills in real time. The single objective of this page is to **collect email addresses** from interested users ahead of the app's imminent App Store launch.

---

## 2. Goals

### Primary Goal
Maximize email signups via ConvertKit before the app launches.

### Secondary Goals
- Establish brand credibility and communicate the core value proposition clearly.
- Create an owned audience for the launch announcement and ongoing newsletter.
- Build a page that can remain live post-launch with minimal updates.

### Success Metrics
| Metric | Target |
|---|---|
| Email conversion rate | ≥ 10% of unique visitors |
| Page load speed (Lighthouse Performance) | ≥ 95 |
| Core Web Vitals (LCP) | < 2.5s |
| Mobile usability | 100% responsive, no horizontal scroll |

---

## 3. Target Audience

CaliTimer targets the full spectrum of calisthenics practitioners:

- **Beginners** — people new to bodyweight training who want objective feedback on their holds
- **Intermediate enthusiasts** — fitness-minded athletes tracking progress on skills like handstands
- **Advanced athletes** — competitive practitioners training front lever, planche, and human flag progressions

The messaging must be inclusive and accessible while still resonating with serious athletes. The page should not feel like a beginner product, but should never alienate beginners either.

---

## 4. Value Proposition

### Core Message
> "Just hold the skill. CaliTimer handles the rest."

The primary differentiator is **hands-free automation via computer vision**. CaliTimer eliminates the need to touch your phone, ask a training partner to count, or manually log hold times. The app detects when you enter a skill position and automatically starts, stops, and logs the hold.

### Supporting Points
- Purpose-built for calisthenics static skills — not a generic timer
- Supports: Handstand, Front Lever, Planche, and more at launch
- No direct competitors in the App Store — this is a new product category
- iOS-native, on-device CV (no cloud upload, no privacy concerns implied)

---

## 5. Tech Stack

### Recommended Stack: Astro + Vercel

| Layer | Technology | Rationale |
|---|---|---|
| Framework | [Astro](https://astro.build) | Purpose-built for content/marketing sites; ships zero JS by default; exceptional Lighthouse scores |
| Styling | Tailwind CSS | Rapid utility-first styling; works natively with Astro |
| Email API | ConvertKit REST API | Free tier; called via a serverless API endpoint to keep the API key server-side |
| API layer | Astro SSR endpoint (Vercel) | Single `/api/subscribe` endpoint — thin proxy to ConvertKit, no separate backend |
| Hosting | Vercel (free tier) | Zero-cost deploy; custom domain support; native Astro adapter; automatic HTTPS |
| Design assets | Git submodule (`calitimer-design-assets`) | Brand logos, icons, color tokens, and style guide |

### Why Not Plain HTML or Next.js
- **Plain HTML**: No build pipeline makes it harder to consume design tokens, optimize images, or integrate components cleanly. Viable but adds friction as the page evolves.
- **Next.js**: Excellent choice, but heavier than needed for a single static marketing page. Astro outputs the same static HTML with less boilerplate.

### Directory Structure (Proposed)
```
calitimer-landing-page/
├── calitimer-design-assets/   # Git submodule (brand assets + style guide)
├── src/
│   ├── components/            # Astro/HTML components (Hero, Features, EmailForm, etc.)
│   ├── layouts/               # Base HTML layout
│   ├── pages/
│   │   ├── index.astro        # Landing page
│   │   └── api/
│   │       └── subscribe.ts   # Serverless endpoint → ConvertKit API
│   └── styles/
│       └── global.css         # Global styles + design token imports
├── public/                    # Static assets (favicon, OG image)
├── astro.config.mjs
├── tailwind.config.mjs
└── package.json
```

---

## 6. Email Collection: ConvertKit Integration

### Platform
ConvertKit (free tier) — account already created.

### Architecture
Rather than using ConvertKit's JavaScript embed (which limits styling control), we use a **custom HTML form** that submits to a thin serverless proxy endpoint.

**Flow:**
```
User submits email
    → POST /api/subscribe (Astro SSR endpoint on Vercel)
    → ConvertKit REST API: POST /v3/forms/{form_id}/subscribe
    → Success/error response returned to client
    → UI updates in place (no page reload)
```

**Why this approach:**
- Full control over form styling — must match the brand system exactly
- ConvertKit API key is never exposed to the browser
- No third-party scripts slowing down the page
- Minimal backend — one ~20-line serverless function

### ConvertKit Setup Requirements
Before implementation, the following must be configured in the ConvertKit dashboard:
1. Create a **Form** (type: inline) — this generates the `form_id` used in the API call
2. Create a **Tag** (e.g., `waitlist`) to segment early access signups from future newsletter subscribers
3. Note the **API Key** (stored as a Vercel environment variable: `CONVERTKIT_API_KEY`)
4. Note the **Form ID** (stored as: `CONVERTKIT_FORM_ID`)

### Future Workflow Compatibility
- **Launch announcement**: Broadcast to the `waitlist` tag in ConvertKit
- **Ongoing newsletter**: Subscribers are already on the list; create a new sequence or broadcast
- **Migration**: ConvertKit exports full subscriber CSV; compatible with Mailchimp, Brevo, and most ESPs if a future switch is needed

---

## 7. Page Structure

The page is a single-page layout. No navigation links, no multi-page routing. Every element should funnel toward the email signup.

### Section 1: Hero (Above the Fold)
**Goal:** Communicate the value proposition and capture email within the first screenful.

**Content:**
- App logo / wordmark (from design assets submodule)
- **Headline:** Punchy, benefit-driven (e.g., "Train Smarter. Just Hold.")
- **Subheadline:** 1–2 sentences clarifying what the app does and who it's for
- **Email input + CTA button** — primary conversion element
- Supporting microcopy below the form (e.g., "Free to join. No spam. Ever.")
- Visual treatment: abstract or typographic — **no app screenshots required** (none available yet); placeholder-ready for future screenshot insertion

### Section 2: How It Works
**Goal:** Eliminate confusion; make the product tangible in 30 seconds.

**Content:** 3-step visual flow (icon + short label + 1-line description)
1. **Point** — Open CaliTimer, point your phone at yourself
2. **Hold** — Get into position. The app detects your skill automatically.
3. **Done** — Your hold time is recorded. No touching required.

### Section 3: Supported Skills
**Goal:** Show scope; signal quality and specificity to serious athletes.

**Content:** Grid of supported skills with icons or minimal illustrations
- Handstand
- Front Lever
- Planche
- *(+ more at launch)*

### Section 4: Secondary Email Capture
**Goal:** Catch users who scrolled past the hero without converting.

**Content:**
- Short re-engagement headline (e.g., "Be the first to know when CaliTimer launches.")
- Repeated email form (same ConvertKit form ID, deduplicated server-side)
- Same microcopy as hero

### Section 5: Footer
**Content:**
- App logo (small)
- Copyright line
- Link to Privacy Policy (placeholder page — required for App Store submission and GDPR compliance)
- Social links (if applicable — optional)

---

## 8. Design Requirements

### Brand Compliance (Critical)
All visual decisions — colors, typography, spacing, iconography, and logo usage — **must strictly follow** the style guide in the `calitimer-design-assets` git submodule. No design decisions should be made independently of this guide.

Before implementation begins:
1. Add `calitimer-design-assets` as a git submodule
2. Read the style guide in full
3. Extract color tokens, font definitions, and logo files
4. Map tokens to Tailwind config and global CSS custom properties

### General Principles
- **Clean & modern** — Apple-inspired aesthetic; let whitespace and typography do the heavy lifting
- **Mobile-first** — The primary user is a mobile athlete; design for iPhone first, then scale up
- **No app screenshots** in v1 — the design must be compelling without them; use typography, brand color, and abstract visuals
- **Single CTA** — do not introduce competing calls to action (no "Download on App Store" links until the app is live)
- **Fast** — no heavy images, no blocking scripts, no unnecessary animations

### Accessibility
- Color contrast ratio ≥ 4.5:1 for all body text (WCAG AA)
- Form inputs have visible labels (screen-reader accessible)
- Keyboard navigable
- `alt` text on all images

---

## 9. Hosting & Deployment

| Concern | Decision |
|---|---|
| Host | Vercel (free tier) |
| Custom domain | Connect via Vercel dashboard (user-provided domain) |
| HTTPS | Automatic via Vercel |
| Environment variables | `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID` set in Vercel project settings |
| Deploy triggers | Git push to `main` triggers automatic redeploy |
| Branch previews | Vercel automatically creates preview URLs for PRs/branches |

---

## 10. Privacy & Legal

- A **/privacy** page (minimal, placeholder) must exist before launch — required for App Store review and GDPR email collection compliance
- The email form must include a clear statement of intent (e.g., "We'll notify you when CaliTimer launches. No spam.")
- No tracking cookies or analytics scripts in v1 — keep it clean and respect user privacy

---

## 11. Out of Scope (v1)

The following are explicitly deferred to post-launch:

- App download / App Store links
- In-app screenshots or demo video
- Pricing information (business model undecided)
- Blog or content marketing
- Social media feed embeds
- Referral / sharing mechanics
- Analytics (Plausible, Fathom, or similar) — can be added in v2
- Localization / i18n
- A/B testing

---

## 12. Open Questions

| # | Question | Owner | Priority |
|---|---|---|---|
| 1 | What is the custom domain for the landing page? | Founder | High |
| 2 | What additional skills beyond Handstand/Front Lever/Planche are supported at launch? | Founder | Medium |
| 3 | What is the app's pricing model? (affects post-launch messaging) | Founder | Medium |
| 4 | Are there any social accounts (Instagram, X, YouTube) to link in the footer? | Founder | Low |
| 5 | Is a Privacy Policy page needed before launch, or can it be a placeholder? | Founder | High |

---

## 13. Implementation Order

1. **Setup** — Initialize Astro project, add Tailwind, add `calitimer-design-assets` submodule
2. **Design system** — Read style guide, configure Tailwind tokens, set up global CSS
3. **Layout & Hero** — Base layout, hero section with email form (static, no API yet)
4. **Remaining sections** — How It Works, Supported Skills, secondary CTA, Footer
5. **ConvertKit API integration** — Serverless endpoint, form submission with loading/error states
6. **Privacy page** — Minimal placeholder
7. **Polish** — Responsive QA, accessibility audit, Lighthouse performance pass
8. **Deploy** — Connect Vercel, set env vars, connect custom domain
