import type { APIRoute } from 'astro';

export const prerender = false;

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
} as const;

// Basic email format check — ConvertKit also validates server-side,
// but we reject clearly bad input early to avoid unnecessary API calls.
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export const POST: APIRoute = async ({ request }) => {
  // Accept only JSON; reject other content types with 415.
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'Unsupported Media Type. Send application/json.' }),
      { status: 415, headers: JSON_HEADERS }
    );
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid request body.' }),
      { status: 400, headers: JSON_HEADERS }
    );
  }

  // Honeypot check — bots fill the hidden `website` field; real users don't.
  // Return a silent 200 so bots don't know they were caught.
  if (body.website) {
    return new Response(
      JSON.stringify({ ok: true }),
      { status: 200, headers: JSON_HEADERS }
    );
  }

  const email = (body.email ?? '').trim().toLowerCase();

  // RFC 5321 maximum email length is 254 characters.
  if (email.length > 254) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address.' }),
      { status: 422, headers: JSON_HEADERS }
    );
  }

  if (!email || !isValidEmail(email)) {
    return new Response(
      JSON.stringify({ error: 'Please enter a valid email address.' }),
      { status: 422, headers: JSON_HEADERS }
    );
  }

  const apiKey = import.meta.env.CONVERTKIT_API_KEY;
  const formId = import.meta.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    // Misconfigured server — log server-side, return generic error to client.
    console.error('[subscribe] Missing CONVERTKIT_API_KEY or CONVERTKIT_FORM_ID');
    return new Response(
      JSON.stringify({ error: 'Server configuration error. Please try again later.' }),
      { status: 500, headers: JSON_HEADERS }
    );
  }

  // Guard against a malformed CONVERTKIT_FORM_ID hitting the wrong endpoint.
  if (!/^\d+$/.test(formId)) {
    console.error('[subscribe] CONVERTKIT_FORM_ID is not a numeric ID:', formId);
    return new Response(
      JSON.stringify({ error: 'Server configuration error. Please try again later.' }),
      { status: 500, headers: JSON_HEADERS }
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
      { status: 502, headers: JSON_HEADERS }
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
      { status: 502, headers: JSON_HEADERS }
    );
  }

  if (!ckResponse.ok || ckBody.error) {
    console.error('[subscribe] ConvertKit error:', ckResponse.status, ckBody);
    return new Response(
      JSON.stringify({ error: 'Could not subscribe. Please try again.' }),
      { status: 422, headers: JSON_HEADERS }
    );
  }

  return new Response(
    JSON.stringify({ ok: true }),
    { status: 200, headers: JSON_HEADERS }
  );
};

// Return 405 for all other HTTP methods.
export const ALL: APIRoute = () => {
  return new Response(
    JSON.stringify({ error: 'Method not allowed.' }),
    {
      status: 405,
      headers: { ...JSON_HEADERS, Allow: 'POST' },
    }
  );
};
