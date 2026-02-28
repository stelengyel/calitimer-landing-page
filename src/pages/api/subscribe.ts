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

// 303 See Other redirect used after native (non-JS) form submissions so the
// browser GETs the redirect target rather than re-POSTing to it.
function redirect(path: string): Response {
  return new Response(null, {
    status: 303,
    headers: { Location: path, 'Cache-Control': 'no-store' },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const contentType = request.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const isForm = contentType.includes('application/x-www-form-urlencoded');

  // Reject anything that isn't JSON or a native form POST.
  if (!isJson && !isForm) {
    return new Response(
      JSON.stringify({ error: 'Unsupported Media Type.' }),
      { status: 415, headers: JSON_HEADERS }
    );
  }

  let honeypot = '';
  let email = '';

  if (isJson) {
    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid request body.' }),
        { status: 400, headers: JSON_HEADERS }
      );
    }
    honeypot = body.website ?? '';
    email = (body.email ?? '').trim().toLowerCase();
  } else {
    // Native form submission (e.g. Instagram in-app browser where the JS
    // fetch handler doesn't intercept the submit event).
    let fd: FormData;
    try {
      fd = await request.formData();
    } catch {
      return redirect('/?err=1');
    }
    honeypot = (fd.get('website') as string | null) ?? '';
    email = ((fd.get('email') as string | null) ?? '').trim().toLowerCase();
  }

  // Honeypot check — bots fill the hidden `website` field; real users don't.
  // Return a silent success so bots don't know they were caught.
  if (honeypot) {
    return isJson
      ? new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS })
      : redirect('/?thanks=1');
  }

  // RFC 5321 maximum email length is 254 characters.
  if (email.length > 254) {
    return isJson
      ? new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), { status: 422, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  if (!email || !isValidEmail(email)) {
    return isJson
      ? new Response(JSON.stringify({ error: 'Please enter a valid email address.' }), { status: 422, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  const apiKey = import.meta.env.CONVERTKIT_API_KEY;
  const formId = import.meta.env.CONVERTKIT_FORM_ID;

  if (!apiKey || !formId) {
    console.error('[subscribe] Missing CONVERTKIT_API_KEY or CONVERTKIT_FORM_ID');
    return isJson
      ? new Response(JSON.stringify({ error: 'Server configuration error. Please try again later.' }), { status: 500, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  // Guard against a malformed CONVERTKIT_FORM_ID hitting the wrong endpoint.
  if (!/^\d+$/.test(formId)) {
    console.error('[subscribe] CONVERTKIT_FORM_ID is not a numeric ID:', formId);
    return isJson
      ? new Response(JSON.stringify({ error: 'Server configuration error. Please try again later.' }), { status: 500, headers: JSON_HEADERS })
      : redirect('/?err=1');
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
    return isJson
      ? new Response(JSON.stringify({ error: 'Network error. Please try again.' }), { status: 502, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  // ConvertKit can return HTTP 200 with error payloads in some cases,
  // so always inspect the response body rather than relying on status alone.
  let ckBody: Record<string, unknown>;
  try {
    ckBody = await ckResponse.json();
  } catch {
    console.error('[subscribe] Failed to parse ConvertKit response');
    return isJson
      ? new Response(JSON.stringify({ error: 'Unexpected response from email service. Please try again.' }), { status: 502, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  if (!ckResponse.ok || ckBody.error) {
    console.error('[subscribe] ConvertKit error:', ckResponse.status, ckBody);
    return isJson
      ? new Response(JSON.stringify({ error: 'Could not subscribe. Please try again.' }), { status: 422, headers: JSON_HEADERS })
      : redirect('/?err=1');
  }

  return isJson
    ? new Response(JSON.stringify({ ok: true }), { status: 200, headers: JSON_HEADERS })
    : redirect('/?thanks=1');
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
