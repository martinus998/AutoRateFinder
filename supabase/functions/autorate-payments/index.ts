import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.4.0';
import { buildReport, normalizeProfile } from './report.mjs';
import { validSession } from './verification.mjs';

const ORIGINS = new Set(['https://www.getautoratefinder.com', 'https://getautoratefinder.com']);
const PRICE = 'price_1UJY8bBVUFmkZjNk8j5djwTJ';
const RETURN = 'https://www.getautoratefinder.com/';
function stripeClient() {
  const key = Deno.env.get('AUTORATE_STRIPE_RESTRICTED_KEY') || '';
  if (!/^(sk|rk)_live_/.test(key)) throw new Error('payments_unavailable');
  return new Stripe(key, { apiVersion: '2026-07-29.dahlia', timeout: 15000, maxNetworkRetries: 1 });
}

function headers(origin: string) {
  return {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': ORIGINS.has(origin) ? origin : 'https://www.getautoratefinder.com',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'content-type',
    'Vary': 'Origin',
    'X-Content-Type-Options': 'nosniff'
  };
}
function json(origin: string, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: headers(origin) });
}
async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const result = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(result)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function randomToken() {
  return Array.from(crypto.getRandomValues(new Uint8Array(32))).map(x => x.toString(16).padStart(2, '0')).join('');
}
function adminClient() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('origin') || '';
  if (!ORIGINS.has(origin)) return json(origin, { error: 'origin_not_allowed' }, 403);
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== 'POST') return json(origin, { error: 'method_not_allowed' }, 405);
  try {
    const raw = await req.text();
    if (raw.length > 5000) return json(origin, { error: 'request_too_large' }, 413);
    const body = JSON.parse(raw);
    const action = body?.action;
    const admin = adminClient();

    if (action === 'checkout') {
      const stripe = stripeClient();
      const profile = normalizeProfile(body.profile);
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const bucket = await sha256(`autorate:${ip}:${Math.floor(Date.now() / 60000)}`);
      const { data: allowed, error: limitError } = await admin.rpc('safeorscam_rate_limit', { p_bucket: bucket, p_limit: 8 });
      if (limitError) throw new Error('rate_limit_unavailable');
      if (!allowed) return json(origin, { error: 'rate_limited' }, 429);

      const id = crypto.randomUUID();
      const token = randomToken();
      const { error: insertError } = await admin.from('autorate_orders').insert({ id, access_hash: await sha256(token), profile });
      if (insertError) throw new Error('order_create_failed');
      const session = await stripe.checkout.sessions.create({
        mode: 'payment', line_items: [{ price: PRICE, quantity: 1 }],
        client_reference_id: id, metadata: { app: 'autoratefinder', order_id: id },
        success_url: RETURN + '?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: RETURN + '?payment=cancelled',
        customer_creation: 'always'
      }, { idempotencyKey: `autorate-${id}` });
      if (!session.url || !/^cs_live_/.test(session.id)) throw new Error('payments_unavailable');
      const { error: saveError } = await admin.from('autorate_orders').update({ checkout_session_id: session.id }).eq('id', id).eq('status', 'pending');
      if (saveError) throw new Error('order_create_failed');
      return json(origin, { ok: true, url: session.url, order: id, token });
    }

    const id = String(body?.order || '');
    const token = String(body?.token || '');
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) return json(origin, { error: 'invalid_access' }, 400);
    const { data: order, error: selectError } = await admin.from('autorate_orders').select('id,access_hash,profile,status,checkout_session_id').eq('id', id).maybeSingle();
    if (selectError || !order || order.access_hash !== await sha256(token)) return json(origin, { error: 'invalid_access' }, 403);

    if (action === 'verify') {
      const sessionId = String(body?.session_id || '');
      if (!/^cs_live_[A-Za-z0-9_]{10,240}$/.test(sessionId)) return json(origin, { error: 'invalid_session' }, 400);
      if (order.checkout_session_id !== sessionId) return json(origin, { error: 'invalid_session' }, 400);
      if (order.status !== 'paid') {
        const session = await stripeClient().checkout.sessions.retrieve(sessionId);
        if (!validSession(session, id)) return json(origin, { error: 'payment_not_complete' }, 409);
        const { error: paidError } = await admin.from('autorate_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', id).eq('status', 'pending').eq('checkout_session_id', sessionId);
        if (paidError) throw new Error('order_update_failed');
        order.status = 'paid';
      }
    }
    if (action !== 'verify' && action !== 'report') return json(origin, { error: 'invalid_action' }, 400);
    if (order.status !== 'paid') return json(origin, { error: 'payment_not_complete' }, 409);
    return json(origin, { ok: true, report: buildReport(order.profile) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    if (message === 'invalid_profile') return json(origin, { error: message }, 400);
    if (message === 'payments_unavailable') return json(origin, { error: message }, 503);
    console.error('autorate-payments', message);
    return json(origin, { error: 'service_unavailable' }, 503);
  }
});
