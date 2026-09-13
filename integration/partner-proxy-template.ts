// AutoRateFinder secure partner proxy template (not deployed).
// Adapt this only after the licensed partner supplies its API documentation.
// Never hard-code partner credentials in this repository.

const ALLOWED_ORIGIN = Deno.env.get('AUTORATEFINDER_ALLOWED_ORIGIN') || 'https://martinus998.github.io';
const PARTNER_API_URL = Deno.env.get('PARTNER_API_URL') || '';
const PARTNER_API_KEY = Deno.env.get('PARTNER_API_KEY') || '';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'content-type, authorization, x-client-info, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Vary': 'Origin'
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
  });
}

function validZip(value: unknown) {
  return typeof value === 'string' && /^\d{5}$/.test(value);
}

function validProfile(profile: any) {
  if (!profile || typeof profile !== 'object') return false;
  if (!validZip(profile.zip)) return false;
  if (!profile.ageBand || typeof profile.ageBand !== 'string') return false;
  if (!profile.vehicle || typeof profile.vehicle !== 'object') return false;
  if (!/^\d{4}$/.test(String(profile.vehicle.year || ''))) return false;
  if (!profile.vehicle.make || !profile.vehicle.model) return false;
  if (!profile.drivingRecord || !profile.coverageGoal) return false;
  if (!Array.isArray(profile.discounts)) return false;
  return true;
}

function validConsent(consent: any) {
  return Boolean(
    consent &&
    consent.quoteSharing === true &&
    typeof consent.consentedAt === 'string' &&
    typeof consent.consentVersion === 'string'
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const origin = req.headers.get('origin') || '';
  if (origin && origin !== ALLOWED_ORIGIN) return json({ error: 'origin_not_allowed' }, 403);

  if (!PARTNER_API_URL || !PARTNER_API_KEY) {
    return json({ error: 'partner_not_configured' }, 503);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  if (!validProfile(body?.profile) || !validConsent(body?.consent)) {
    return json({ error: 'invalid_request' }, 400);
  }

  // IMPORTANT: add production rate limiting before enabling a public endpoint.
  // IMPORTANT: do not log the request body or quote profile.
  // Map AutoRateFinder's normalized profile to the partner's exact schema here.
  const partnerPayload = {
    // placeholder: replace only after receiving partner API documentation
    profile: body.profile,
    consent: body.consent,
    source: 'autoratefinder-web'
  };

  try {
    const partnerResponse = await fetch(PARTNER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PARTNER_API_KEY}`
      },
      body: JSON.stringify(partnerPayload)
    });

    if (!partnerResponse.ok) {
      return json({ error: 'partner_unavailable' }, 502);
    }

    const partnerData = await partnerResponse.json();

    // Normalize the partner response. Prefer a licensed-partner hosted quote URL.
    const redirectUrl = partnerData.redirectUrl || partnerData.redirect_url || '';
    if (!redirectUrl || typeof redirectUrl !== 'string' || !redirectUrl.startsWith('https://')) {
      return json({ error: 'invalid_partner_response' }, 502);
    }

    return json({ redirectUrl });
  } catch {
    return json({ error: 'partner_request_failed' }, 502);
  }
});
