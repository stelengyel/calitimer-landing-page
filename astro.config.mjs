// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  adapter: vercel(),
  integrations: [tailwind({ applyBaseStyles: false })],
  // Disable Astro's built-in Origin header check. Instagram's in-app browser
  // sends a mismatched Origin on fetch() calls, which Astro's CSRF guard
  // rejects with "Cross-site POST form submissions are forbidden".
  // The /api/subscribe endpoint is safe without this check because it
  // requires Content-Type: application/json — browsers can't send that
  // cross-site without a CORS preflight, which would be blocked.
  security: {
    checkOrigin: false,
  },
});
