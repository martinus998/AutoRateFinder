import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import Stripe from 'npm:stripe@22.6.0';
import { buildReport, normalizeProfile } from './report.mjs';
import {validAutoSession, autoState} from './verification.mjs';

const ORIGINS = new Set(['https://www.getautoratefinder.com', 'https://getautoratefinder.com']);
const PRICE_CENTS = 199;
const APP = 'autoratefinder';

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
function stripeClient() {
  const key = Deno.env.get('BILLSAVINGS_STRIPE_LIVE_SECRET_KEY') || Deno.env.get('STRIPE_LIVE_SECRET_KEY') || Deno.env.get('STRIPE_SECRET_KEY') || '';
  if (!/^(sk|rk)_live_/.test(key)) throw new Error('payments_unavailable');
  return new Stripe(key, { apiVersion: '2026-08-26.dahlia', timeout: 15000, maxNetworkRetries: 1 });
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

    if(action!=='checkout') {
      const ip=req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()||'unknown';
      const {data:allowed,error:limitError}=await admin.rpc('safeorscam_rate_limit',{p_bucket:await sha256('autorate-status:'+ip+':'+String(body.session_id||body.order||'')+':'+Math.floor(Date.now()/60000)),p_limit:30});
      if(limitError)throw new Error('rate_limit_unavailable');if(!allowed)return json(origin,{error:'rate_limited'},429);
    }
    if (action === 'receipt') {
      const sessionId=String(body.session_id||'');
      if(!/^cs_live_[A-Za-z0-9_]{10,240}$/.test(sessionId))return json(origin,{error:'invalid_session'},400);
      const stripe=stripeClient();
      const session=await stripe.checkout.sessions.retrieve(sessionId);
      if(!validAutoSession(session)||session.metadata?.checkout_channel!=='qr')return json(origin,{error:'invalid_session'},403);
      return json(origin,{ok:true,status:autoState(session)});
    }
    if (action === 'checkout') {
      const profile = normalizeProfile(body.profile);
      const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      const bucket = await sha256(`autorate:${ip}:${Math.floor(Date.now() / 60000)}`);
      const { data: allowed, error: limitError } = await admin.rpc('safeorscam_rate_limit', { p_bucket: bucket, p_limit: 8 });
      if (limitError) throw new Error('rate_limit_unavailable');
      if (!allowed) return json(origin, { error: 'rate_limited' }, 429);

      const qr=body.checkout_channel==='qr';
      if(body.attempt!=null&&!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.attempt))return json(origin,{error:'invalid_attempt'},400);
      if(body.token!=null&&!/^[a-f0-9]{64}$/.test(body.token))return json(origin,{error:'invalid_access'},400);
      const id = body.attempt || crypto.randomUUID();
      const token = body.token || randomToken();
      const accessHash=await sha256(token);
      const {data:prior,error:priorError}=await admin.from('autorate_orders').select('access_hash,profile,checkout_session_id,status').eq('id',id).maybeSingle();
      if(priorError)throw new Error('order_lookup_failed');
      if(prior&&(prior.access_hash!==accessHash||JSON.stringify(normalizeProfile(prior.profile))!==JSON.stringify(profile)))return json(origin,{error:'invalid_access'},403);
      if(prior?.checkout_session_id){const old=await stripeClient().checkout.sessions.retrieve(prior.checkout_session_id);if(!old.url||old.status!=='open')return json(origin,{error:old.status==='expired'?'order_expired':'existing_order_closed'},409);return json(origin,{ok:true,url:old.url,order:id,token,session_id:old.id,expires_at:old.expires_at,amount:old.amount_total});}
      if(!prior){const {error:insertError}=await admin.from('autorate_orders').insert({id,access_hash:accessHash,profile});if(insertError)throw new Error('order_create_failed');}
      const stripe = stripeClient();
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        branding_settings: { display_name: 'AutoRateFinder' },
        client_reference_id: id,
        line_items: [{ price_data: { currency: 'usd', unit_amount: PRICE_CENTS, product_data: { name: 'AutoRateFinder · Your quote review', description: 'One-time educational review of your entered auto insurance quote. No insurer prices are supplied.' } }, quantity: 1 }],
        metadata: { app: APP, order_id: id, price_version:'us-low-20261003', checkout_channel:qr?'qr':'web' },
        locale:'en',
        customer_creation: 'always',
        success_url: qr ? 'https://www.getautoratefinder.com/payment-return.html?checkout=success&session_id={CHECKOUT_SESSION_ID}' : 'https://www.getautoratefinder.com/?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: qr ? 'https://www.getautoratefinder.com/payment-return.html?checkout=cancel' : 'https://www.getautoratefinder.com/?payment=cancelled',
        integration_identifier: 'autoratefinder_qrlower_bhxksevt',
        managed_payments: { enabled: false }
      }, {idempotencyKey:'autorate-low-v1:'+id+':'+accessHash});
      const { error: updateError } = await admin.from('autorate_orders').update({ checkout_session_id: session.id }).eq('id', id).eq('status', 'pending');
      if (updateError || !session.url) {
        await stripe.checkout.sessions.expire(session.id).catch(() => {});
        throw new Error('checkout_unavailable');
      }
      return json(origin, { ok:true, url: session.url, order: id, token, session_id:session.id, expires_at:session.expires_at, amount:PRICE_CENTS });
    }

    const id = String(body?.order || '');
    const token = String(body?.token || '');
    if (!/^[a-f0-9-]{36}$/.test(id) || !/^[a-f0-9]{64}$/.test(token)) return json(origin, { error: 'invalid_access' }, 400);
    const { data: order, error: selectError } = await admin.from('autorate_orders').select('id,access_hash,profile,status,checkout_session_id').eq('id', id).maybeSingle();
    if (selectError || !order || order.access_hash !== await sha256(token)) return json(origin, { error: 'invalid_access' }, 403);

    if(['verify','checkout_status','cancel_checkout'].includes(action)) {
      const sessionId=String(body.session_id||order.checkout_session_id||'');
      if(!/^cs_live_[A-Za-z0-9_]{10,240}$/.test(sessionId)||sessionId!==order.checkout_session_id)return json(origin,{error:'invalid_session'},400);
      const stripe=stripeClient();let session=await stripe.checkout.sessions.retrieve(sessionId);
      if(!validAutoSession(session)||session.client_reference_id!==id||session.metadata?.order_id!==id)return json(origin,{error:'invalid_session'},403);
      let state=autoState(session);
      if(action==='cancel_checkout'&&state==='open'){try{session=await stripe.checkout.sessions.expire(sessionId);}catch{session=await stripe.checkout.sessions.retrieve(sessionId);}if(!validAutoSession(session)||session.client_reference_id!==id)return json(origin,{error:'invalid_session'},403);state=autoState(session);}
      if(state==='paid'&&order.status!=='paid') {
        const {error:fulfillError}=await admin.from('autorate_orders').update({status:'paid',paid_at:new Date().toISOString()}).eq('id',id).eq('checkout_session_id',sessionId).eq('status','pending');
        if(fulfillError)throw new Error('fulfillment_unavailable');order.status='paid';
      }
      if(action!=='verify')return json(origin,{ok:true,status:state,...(state==='paid'?{report:buildReport(order.profile)}:{})});
      if(state!=='paid')return json(origin,{error:'payment_not_complete'},409);
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

