import { createClient } from 'npm:@supabase/supabase-js@2.57.4';
import { fulfill, stripeClient } from '../_shared/payment.ts';
import { validSession } from '../autorate-payments/verification.mjs';

// Keep the existing shared Stripe endpoint and signature verification in place.
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });
  const signature = req.headers.get('stripe-signature') || '';
  const timestamp = signature.split(',').find(x => x.startsWith('t='))?.slice(2) || '';
  const signatures = signature.split(',').filter(x => x.startsWith('v1=')).map(x => x.slice(3)).filter(x => /^[a-f0-9]{64}$/.test(x));
  if (!/^\d{10}$/.test(timestamp) || !signatures.length || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return new Response('Invalid signature', { status: 400 });
  const body = await req.text();
  if (body.length > 262144) return new Response('Too large', { status: 413 });
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
  try {
    const { data: valid, error } = await admin.rpc('safeorscam_verify_webhook', { p_body: body, p_timestamp: timestamp, p_signatures: signatures });
    if (error) throw new Error('signature_configuration');
    if (valid !== true) return new Response('Invalid signature', { status: 400 });
    const event = JSON.parse(body);
    if (['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      const sessionId = event.data?.object?.id;
      const app = event.data?.object?.metadata?.app;
      if (/^cs_live_[A-Za-z0-9_]+$/.test(sessionId || '') && ['safeorscamcheck', 'autoratefinder'].includes(app)) {
        const session = await stripeClient().checkout.sessions.retrieve(sessionId);
        if (app === 'safeorscamcheck' && session.metadata?.app === app && session.payment_status === 'paid') {
          await fulfill(admin, session);
        }
        if (app === 'autoratefinder') {
          const orderId = session.client_reference_id || '';
          if (!validSession(session, orderId) || !/^[0-9a-f-]{36}$/.test(orderId)) throw new Error('autorate_session_invalid');
          const { data: order, error: readError } = await admin.from('autorate_orders').select('id,status,checkout_session_id').eq('id', orderId).maybeSingle();
          if (readError || !order || order.checkout_session_id !== session.id) throw new Error('autorate_order_invalid');
          if (order.status === 'pending') {
            const { error: paidError } = await admin.from('autorate_orders').update({ status: 'paid', paid_at: new Date().toISOString() }).eq('id', orderId).eq('status', 'pending').eq('checkout_session_id', session.id);
            if (paidError) throw new Error('autorate_fulfillment_failed');
          }
        }
      }
    }
    return Response.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook', error instanceof Error ? error.message : 'failure');
    return new Response('Retry delivery', { status: 500 });
  }
});
