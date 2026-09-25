import Stripe from 'npm:stripe@22.4.0';

// This is the existing SafeOrScam fulfillment contract; keep it intact when
// adding AutoRateFinder to the already registered Stripe webhook endpoint.
export const PACKS: Record<string, { checks: number; amount: number; paymentLink: string }> = {
  '10': { checks: 10, amount: 199, paymentLink: 'https://buy.stripe.com/6oU28qbtM3XtcpKfMG1sQ03' },
  '30': { checks: 30, amount: 499, paymentLink: 'https://buy.stripe.com/fZu14m69salRcpKgQK1sQ04' },
  '100': { checks: 100, amount: 1299, paymentLink: 'https://buy.stripe.com/8x26oG41k8dJblGasm1sQ05' }
};
export function stripeClient() {
  const key = Deno.env.get('BILLSAVINGS_STRIPE_LIVE_SECRET_KEY') || Deno.env.get('STRIPE_LIVE_SECRET_KEY') ||
    Deno.env.get('STRIPE_SECRET_KEY') || Deno.env.get('AUTORATE_STRIPE_RESTRICTED_KEY') || '';
  if (!/^(sk|rk)_live_/.test(key)) throw new Error('payments_unavailable');
  return new Stripe(key, { apiVersion: '2026-07-29.dahlia', timeout: 15000, maxNetworkRetries: 1 });
}
export async function fulfill(admin: any, session: any, deviceHash?: string) {
  const cfg = PACKS[String(session.metadata?.pack || '')];
  if (!session.livemode || session.metadata?.app !== 'safeorscamcheck' || !cfg || !/^cs_live_/.test(session.id) || !/^[a-f0-9]{64}$/.test(session.client_reference_id || '')) throw new Error('session_mismatch');
  if (deviceHash && session.client_reference_id !== deviceHash) throw new Error('session_mismatch');
  if (session.payment_status !== 'paid') throw new Error('payment_not_complete');
  if (session.amount_total !== cfg.amount || session.currency !== 'usd') throw new Error('amount_mismatch');
  const intent = typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id;
  const { data, error } = await admin.rpc('safeorscam_credit_purchase', {
    p_session_id: session.id, p_device_hash: session.client_reference_id,
    p_pack: cfg.checks, p_amount_cents: cfg.amount, p_payment_intent: intent || null
  });
  if (error) throw new Error('credit_failed');
  return { ok: true, checks: Number(data) || 0, pack: cfg.checks };
}
