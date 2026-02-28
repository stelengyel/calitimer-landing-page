Security Reference: CaliTimer Landing Page
==========================================

Last reviewed: 2026-02-28 (updated)
Status: All findings resolved.

---

## Overview

The landing page handles one sensitive operation: email collection via ConvertKit. The attack surface is intentionally minimal — no auth, no database, no third-party scripts. The primary risks are API quota exhaustion, subscriber list pollution, and clickjacking/MIME attacks. All have been mitigated.

---

## Architecture Decisions

**API key stays server-side.** The ConvertKit API key is only ever accessed inside the Astro SSR endpoint (`src/pages/api/subscribe.ts`) via `import.meta.env`. It is never bundled into client-side JavaScript.

**No third-party scripts.** Zero external JS is loaded. No analytics, no tracking pixels, no embedded widgets. This eliminates the entire class of third-party supply-chain XSS.

**Custom form, not ConvertKit embed.** ConvertKit's JS embed would require loosening the CSP and add an external script dependency. The custom API proxy keeps full styling control and a strict CSP.

---

## Services

### Upstash Redis — Rate Limiting
- **Purpose:** Persistent IP-based rate limit counter shared across all serverless function instances
- **Plan:** Free tier (10,000 requests/day)
- **Console:** console.upstash.com
- **Required env vars:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Configuration:** One database, region closest to users, REST API access only

### Vercel — Hosting & Serverless Functions
- **Purpose:** Hosts the static site and runs the `/api/subscribe` SSR endpoint as a serverless function
- **Plan:** Free tier (Hobby)
- **Console:** vercel.com
- **Required env vars:** `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
- **Security headers:** Delivered via `vercel.json` header rules (see below)
- **IP forwarding:** Vercel sets `X-Forwarded-For` on all requests — used by the rate limiter

### ConvertKit — Email List
- **Purpose:** Subscriber storage and email delivery
- **Plan:** Free tier
- **Console:** app.convertkit.com
- **Required env vars:** `CONVERTKIT_API_KEY`, `CONVERTKIT_FORM_ID`
- **API used:** `POST /v3/forms/{form_id}/subscribe` — `api_key` passed as a body param (ConvertKit v3 convention, not an Authorization header)

---

## Implemented Controls

### 1. Rate Limiting
**File:** `src/middleware.ts`
**Severity addressed:** CRITICAL

Astro middleware intercepts every `POST /api/subscribe` request before it reaches the endpoint. It uses a sliding window algorithm (5 requests per 60 seconds per IP) backed by Upstash Redis.

- Client IP is read from `X-Forwarded-For` (set by Vercel), falling back to `"unknown"`
- On limit exceeded: returns `429 Too Many Requests` with a `Retry-After` header (seconds until the window resets) and `Cache-Control: no-store`
- If Upstash env vars are absent (local dev without credentials), rate limiting is silently skipped so development is unaffected
- `analytics: false` — no usage data sent back to Upstash

### 2. HTTP Security Headers
**File:** `vercel.json`
**Severity addressed:** HIGH

Applied to all routes via a catch-all `"source": "/(.*)"` rule.

| Header | Value | Protects Against |
|--------|-------|-----------------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'` | XSS escalation, data injection |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `X-Content-Type-Options` | `nosniff` | MIME-type sniffing |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Unwanted browser feature access |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | SSL stripping / MITM |

**Note on `style-src 'unsafe-inline'`:** Astro emits scoped component styles as inline `<style>` blocks in the HTML. Removing `'unsafe-inline'` would require a nonce-based CSP and significant build tooling changes. All other directives are strict `'self'`-only.

### 3. Email Length Guard
**File:** `src/pages/api/subscribe.ts`
**Severity addressed:** MEDIUM

Emails longer than 254 characters (RFC 5321 maximum) are rejected with `422` before the format regex runs. This prevents degenerate input from stressing the regex engine and avoids unnecessary ConvertKit API calls.

### 4. JSON-Only Content Type
**File:** `src/pages/api/subscribe.ts`
**Severity addressed:** MEDIUM

The endpoint previously accepted both `application/json` and `multipart/form-data`. The FormData branch was unused (the client always sends JSON) and represented unnecessary attack surface. The endpoint now rejects any request that isn't `application/json` with `415 Unsupported Media Type`.

### 5. Cache-Control: no-store on All API Responses
**File:** `src/pages/api/subscribe.ts`
**Severity addressed:** MEDIUM

All responses from `/api/subscribe` (success, error, rate-limited) include `Cache-Control: no-store`. Implemented via a shared `JSON_HEADERS` constant applied at every return site. Prevents a misconfigured CDN from caching a `200 {"ok":true}` and returning it without ever hitting the server.

### 6. CONVERTKIT_FORM_ID Validation
**File:** `src/pages/api/subscribe.ts`
**Severity addressed:** MEDIUM

After reading `CONVERTKIT_FORM_ID` from env, a `/^\d+$/` guard verifies it contains only digits before it is interpolated into the ConvertKit URL. A malformed value (e.g. `abc/evil`) would silently call a different endpoint without this check. On failure: logs server-side, returns `500` with a generic message.

### 7. Honeypot Field
**File:** `src/components/EmailForm.astro`
**Severity addressed:** Baseline (pre-existing)

A hidden `website` field is included in the form. It is CSS-hidden, `aria-hidden="true"`, and `tabindex="-1"` so real users never fill it. Bots that auto-populate form fields trigger a silent `200` response — they receive no signal that they were caught.

---

### 8. Native Form Submission Fallback
**Files:** `src/pages/api/subscribe.ts`, `src/components/EmailForm.astro`
**Severity addressed:** Compatibility (not a vulnerability)

Instagram's in-app browser (and similar IABs: Facebook, TikTok, Twitter/X, LinkedIn) does not reliably fire the JavaScript `submit` event handler. The form falls back to a native HTML POST, sending `application/x-www-form-urlencoded` instead of JSON and navigating away to the raw API response.

The endpoint now accepts both `application/json` (the normal JS fetch path) and `application/x-www-form-urlencoded` (the native form fallback). For native submissions, all responses are `303 See Other` redirects back to the page (`/?thanks=1` on success, `/?err=1` on any error) — 303 specifically instructs the browser to GET the redirect target rather than re-POST to it. On page load, `EmailForm.astro` checks for these params, shows the appropriate success or error state, then cleans the param from the URL with `history.replaceState`.

The JS fetch path for all standard browsers is unchanged.

### 9. Astro `security.checkOrigin` Disabled
**File:** `astro.config.mjs`
**Severity addressed:** Compatibility (not a vulnerability)

Astro's `security.checkOrigin` feature compares the `Origin` request header to the deployment host and rejects mismatches on POST requests with `403 Cross-site POST form submissions are forbidden`. The `@astrojs/vercel` adapter enables this check by default.

Instagram's in-app browser (and similar IABs) sends a mismatched or `null` `Origin` on `fetch()` calls even when the page itself was loaded from the correct origin. This caused every form submission from an Instagram bio link to fail with a hard 403.

`checkOrigin` is disabled in `astro.config.mjs` (`security: { checkOrigin: false }`). The endpoint is not left unprotected — the JSON-only content type requirement (control #4 above) provides equivalent CSRF protection: browsers cannot send `Content-Type: application/json` cross-site without a CORS preflight, and the endpoint emits no `Access-Control-Allow-Origin` header, so any preflight from a foreign origin is blocked by the browser before the request reaches the server. The `checkOrigin` header check was therefore redundant and too aggressive for in-app browser environments.

---

## Intentionally Skipped

**CORS origin restriction (#7 in original audit):** The endpoint returns no `Access-Control-Allow-Origin` header. Browsers enforce the Same-Origin Policy and block cross-origin calls from other websites. Server-to-server callers can hit the endpoint freely, but the rate limiter addresses abuse from that vector more effectively than an origin allowlist (which is trivially bypassed server-side anyway).

---

## What Was Correct from the Start

- API keys never reach the client — `import.meta.env.*` is server-only in SSR routes; `.env` is in `.gitignore`
- No XSS via error messages — `errorEl.textContent` (not `innerHTML`) throughout `EmailForm.astro`
- Generic client error messages — internal ConvertKit errors are logged server-side only, never forwarded to the browser
- Method restriction — `export const ALL` returns `405 Method Not Allowed` for all non-POST methods
- No analytics or third-party scripts — zero external JS, no tracking surface

---

## Environment Variables

All four variables must be set in the Vercel project dashboard (Settings → Environment Variables). Never commit real values.

| Variable | Where to find it |
|----------|-----------------|
| `CONVERTKIT_API_KEY` | app.convertkit.com → Settings → API |
| `CONVERTKIT_FORM_ID` | app.convertkit.com → Forms → your form → URL contains the ID |
| `UPSTASH_REDIS_REST_URL` | console.upstash.com → your database → REST API tab |
| `UPSTASH_REDIS_REST_TOKEN` | console.upstash.com → your database → REST API tab |

See `.env.example` for the local development template.

---

## npm Audit Status

Last run: 2026-02-27 — **0 vulnerabilities**

- `@astrojs/vercel` is pinned to `8.0.4` (the last version before a path-to-regexp ReDoS regression was introduced in `>=8.0.5` via `@vercel/routing-utils`)
- `"overrides": { "esbuild": ">=0.25.0" }` in `package.json` resolves a moderate esbuild dev-server advisory present in `8.0.4`
- Run `npm audit` after any dependency update
