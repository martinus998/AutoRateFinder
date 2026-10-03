export function validAutoSession(s) {
  return s?.livemode === true && /^cs_live_[A-Za-z0-9_]{10,240}$/.test(s.id || '') && s.mode === 'payment' && s.metadata?.app === 'autoratefinder' && s.currency === 'usd' &&
    (s.amount_total === 199 && s.metadata?.price_version === 'us-low-20261003' || s.amount_total === 299 && !s.metadata?.price_version);
}
export function autoState(s) {
  if(s.payment_status==='paid'&&s.status==='complete')return 'paid';
  if(s.status==='expired')return 'expired';
  return s.status==='complete'?'processing':'open';
}

export function validSession(s,orderId){return validAutoSession(s)&&autoState(s)==='paid'&&s.client_reference_id===orderId&&s.metadata?.order_id===orderId;}
