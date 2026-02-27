Security Review: CaliTimer Landing Page

Overall Assessment

The foundation is solid — API keys are server-side, error messages
are generic, honeypot is well-implemented, and XSS risk is minimal
(textContent not innerHTML). However, three significant gaps need
addressing before this handles real traffic.

---
Findings

CRITICAL

1. No rate limiting on /api/subscribe
src/pages/api/subscribe.ts has no throttling whatsoever. Any attacker
can:
- Exhaust your ConvertKit API quota (free tier = 10k/month calls)
- Flood your subscriber list with garbage addresses
- Use your endpoint as a bounce-test oracle (different 200/422
responses reveal email validity)
- Abuse it as a spam relay at zero cost to them

This is the highest-priority fix. At Vercel free tier, the pragmatic
options are: Astro middleware with IP-based token bucket, or
Cloudflare Turnstile (a free, privacy-respecting CAPTCHA).

---
HIGH

2. No HTTP security headers
src/layouts/BaseLayout.astro:17–54 and all API responses have zero
security headers. Missing:

Header: Content-Security-Policy
Risk Without It: XSS escalation if a future script is introduced
────────────────────────────────────────
Header: X-Frame-Options: DENY
Risk Without It: Clickjacking
────────────────────────────────────────
Header: X-Content-Type-Options: nosniff
Risk Without It: MIME sniffing attacks
────────────────────────────────────────
Header: Referrer-Policy: strict-origin-when-cross-origin
Risk Without It: Referrer leakage
────────────────────────────────────────
Header: Permissions-Policy
Risk Without It: Unwanted browser feature access
────────────────────────────────────────
Header: Strict-Transport-Security
Risk Without It: SSL strip / MITM

These are one vercel.json file away from being fixed.

---
MEDIUM

3. Weak email validation — no maximum length
subscribe.ts:8 — the regex /^[^\s@]+@[^\s@]+\.[^\s@]+$/ accepts
emails of unbounded length. RFC 5321 defines a 254-character maximum.
A missing length guard means:
- Oversized payloads hit ConvertKit unnecessarily
- No defense against degenerate input that could stress the regex
engine

4. API response missing Cache-Control
subscribe.ts:101–104 — the success response has no Cache-Control:
no-store header. A misconfigured proxy or CDN could cache a 200
ok:true and return it to future requests without ever hitting the
server.

5. Endpoint accepts dual content-types unnecessarily
subscribe.ts:15–23 — the client always sends application/json
(EmailForm.astro:229), but the server also accepts
multipart/form-data. This wider attack surface is unused and should
be removed.

6. CONVERTKIT_FORM_ID not sanitized before URL interpolation
subscribe.ts:64 —
`https://api.convertkit.com/v3/forms/${formId}/subscribe` — if the
env var ever contains a / or ?, this silently calls a different
ConvertKit endpoint. Env vars from Vercel's dashboard are trusted,
but a one-line digit check closes the gap.

---
LOW

7. No CORS origin restriction
The endpoint returns no Access-Control-Allow-Origin header. Browsers
enforce SOP and block cross-origin calls, but there is no explicit
restriction. A server-to-server caller can hit the endpoint freely
regardless — rate limiting addresses this more effectively.

8. No .env.example file
Developer hygiene gap. Anyone cloning the repo won't know what
variables are required without reading the README/CLAUDE.md.

9. Dependencies unaudited
No evidence of npm audit having been run against the current
lockfile.

---
Checklist

SECURITY CHECKLIST — CaliTimer Landing Page
=============================================

CRITICAL
[ ] Implement rate limiting on POST /api/subscribe
    Recommended: Cloudflare Turnstile (free, no JS tracking) OR
    Astro middleware with IP-based sliding window + Upstash Redis
    Acceptance: >5 requests/IP/minute returns 429 with Retry-After
header

HIGH
[ ] Add HTTP security headers via vercel.json (or Astro middleware):
    [ ] Content-Security-Policy (strict: default-src 'self';
script-src 'self';
        style-src 'self' 'unsafe-inline'; img-src 'self' data:;
font-src 'self')
    [ ] X-Frame-Options: DENY
    [ ] X-Content-Type-Options: nosniff
    [ ] Referrer-Policy: strict-origin-when-cross-origin
    [ ] Permissions-Policy: camera=(), microphone=(), geolocation=()
    [ ] Strict-Transport-Security: max-age=31536000;
includeSubDomains

MEDIUM
[ ] Add email length guard in subscribe.ts (max 254 chars per RFC
5321)
[ ] Add Cache-Control: no-store to all /api/* responses
[ ] Remove FormData branch from subscribe.ts — client always sends
JSON;
    accept application/json only and return 415 otherwise
[ ] Validate CONVERTKIT_FORM_ID is numeric-only before URL
interpolation
    (e.g. /^\d+$/.test(formId))

LOW
[ ] Add .env.example with placeholder values (no real keys)
[ ] Run npm audit and resolve any high/critical findings
[ ] Consider adding explicit CORS: return 403 for non-same-origin
POST
    requests (check Origin header against allowed list)

---
What's Already Correct

- API keys are never client-side — import.meta.env.* is server-only
in the SSR route, .gitignore excludes .env
- No XSS via error messages — errorEl.textContent (not innerHTML)
throughout EmailForm.astro:262
- Honeypot implementation is correct — CSS-hidden, aria-hidden,
tabindex="-1", silent 200 response
- No analytics or third-party scripts — zero external JS, no tracking
surface
- Generic client error messages — internal ConvertKit errors never
reach the browser
- Method restriction — export const ALL returns 405 for non-POST
methods
