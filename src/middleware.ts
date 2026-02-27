import { defineMiddleware } from 'astro:middleware';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Only initialise the rate limiter when the env vars are present.
// During local dev without Upstash configured, rate limiting is skipped.
function getRatelimiter(): Ratelimit | null {
  const url = import.meta.env.UPSTASH_REDIS_REST_URL;
  const token = import.meta.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  return new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, '60 s'),
    analytics: false,
  });
}

const ratelimiter = getRatelimiter();

export const onRequest = defineMiddleware(async (context, next) => {
  // Only rate-limit POST /api/subscribe
  if (context.request.method !== 'POST' || !context.url.pathname.startsWith('/api/subscribe')) {
    return next();
  }

  if (!ratelimiter) {
    // Env vars not configured — skip rate limiting (local dev without Upstash)
    return next();
  }

  const ip =
    context.request.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown';

  const { success, reset } = await ratelimiter.limit(ip);

  if (!success) {
    const retryAfter = Math.ceil((reset - Date.now()) / 1000);
    return new Response(
      JSON.stringify({ error: 'Too many requests. Please try again later.' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfter),
          'Cache-Control': 'no-store',
        },
      }
    );
  }

  return next();
});
