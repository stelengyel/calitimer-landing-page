import type { APIRoute } from 'astro';

export const prerender = false;

// Basic email format check — ConvertKit also validates server-side,
// but we reject clearly bad input early to avoid unnecessary API calls.
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  let body: Record<string, string>;

  try {
    const contentType = request.headers.get('content-type') ?? '';
    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(
        [...formData.entries()].map(([k, v]) => [k, String(v)])
      );
    }
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // Honeypot check — bots fill the hidden `website` field; real users don't.
  // Return a silent 200 so bots don't know they were caught.
  if (body.website) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const email = (body.email ?? '').trim().toLowerCase();

  if (!email || !isValidEmail(email)) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address.' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const apiKey = import.meta.env.CONVERTKIT_API_KEY;
  const formId = import.meta.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    // Misconfigured server — log server-side, return generic error to client.
    console.error('[subscribe] Missing CONVERTKIT_API_KEY or CONVERTKIT_FORM_ID');
    return new Response(
      JSON.stringify({ error: 'Server configuration error. Please try again later.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let ckResponse: Response;
  try {
    ckResponse = await fetch(
      `https://api.convertkit.com/v3/forms/${formId}/subscribe`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // ConvertKit v3 expects api_key as a body param, not an Authorization header.
        body: JSON.stringify({ api_key: apiKey, email }),
      }
    );
  } catch (err) {
    console.error('[subscribe] ConvertKit fetch failed:', err);
    return new Response(
      JSON.stringify({ error: 'Network error. Please try again.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ConvertKit can return HTTP 200 with error payloads in some cases,
  // so always inspect the response body rather than relying on status alone.
  let ckBody: Record<string, unknown>;
  try {
    ckBody = await ckResponse.json();
  } catch {
    console.error('[subscribe] Failed to parse ConvertKit response');
    return new Response(
      JSON.stringify({ error: 'Unexpected response from email service. Please try again.' }),
      { status: 502, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!ckResponse.ok || ckBody.error) {
    console.error('[subscribe] ConvertKit error:', ckResponse.status, ckBody);
    return new Response(
      JSON.stringify({ error: 'Could not subscribe. Please try again.' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
};

// Return 405 for all other HTTP methods.
export const ALL: APIRoute = () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed.' }),
    { status: 405, headers: { 'Content-Type': 'application/json', Allow: 'POST' } }
  );
};
