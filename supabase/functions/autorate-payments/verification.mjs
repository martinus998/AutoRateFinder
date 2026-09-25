// Check the canonical Stripe Checkout Session, never data supplied by a browser.
export function validSession(session, orderId) {
  return session?.livemode === true && session.mode === 'payment' && session.status === 'complete' &&
    session.payment_status === 'paid' && session.currency === 'usd' && session.amount_total === 299 &&
    session.client_reference_id === orderId && session.metadata?.app === 'autoratefinder' &&
    session.metadata?.order_id === orderId && /^cs_live_[A-Za-z0-9_]+$/.test(session.id || '');
}
