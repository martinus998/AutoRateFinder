(() => {
  'use strict';
  const API = 'https://bkyuyqicybqqifenhhux.supabase.co/functions/v1/autorate-payments';
  const STORE = 'autorate_order_v1';
  const DRAFT = 'autorate_quote_draft_v1';
  const form = document.getElementById('reviewForm');
  const status = document.getElementById('reviewStatus');
  const pay = document.getElementById('reviewPay');
  const reportArea = document.getElementById('reviewReport');
  const retry = document.getElementById('reviewRetry');
  const message = text => { status.textContent = text; };
  const track = event => { try { window.AutoRateFunnel?.track(event); } catch {} };
  const saved = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };
  // Keep the quote in this tab when a customer returns from cancelled checkout.
  try {
    const draft = JSON.parse(sessionStorage.getItem(DRAFT) || 'null');
    if (draft?.expires > Date.now() && draft.profile && typeof draft.profile === 'object') {
      for (const field of form.elements) {
        if (!field.name) continue;
        if (field.name === 'extras') field.checked = Array.isArray(draft.profile.extras) && draft.profile.extras.includes(field.value);
        else if (typeof draft.profile[field.name] === 'string') field.value = draft.profile[field.name];
      }
    }
  } catch {}
  const call = async body => {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store', signal: AbortSignal.timeout(30000), referrerPolicy: 'no-referrer' });
    const data = await response.json();
    if (!response.ok || !data.ok && !data.url) throw new Error(data.error || 'unavailable');
    return data;
  };
  const addList = (target, rows) => {
    const list = document.getElementById(target);
    list.replaceChildren();
    rows.forEach(row => { const li = document.createElement('li'); li.textContent = row; list.append(li); });
  };
  function showReport(data) {
    document.getElementById('reportTitle').textContent = data.title;
    document.getElementById('reportMonthly').textContent = data.monthly;
    document.getElementById('reportAnnual').textContent = data.annual;
    document.getElementById('reportDeductible').textContent = data.deductible;
    addList('reportObservations', data.observations);
    addList('reportQuestions', data.questions);
    addList('reportChecklist', data.checklist);
    document.getElementById('reportDisclosure').textContent = data.disclosure;
    reportArea.hidden = false;
    retry.hidden = true;
    track('result_view');
    reportArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const profile = Object.fromEntries(values.entries());
    profile.extras = values.getAll('extras');
    try { sessionStorage.setItem(DRAFT, JSON.stringify({ profile, expires: Date.now() + 86400000 })); } catch {}
    track('plan_select');
    pay.disabled = true;
    message('Preparing secure Stripe checkout…');
    try {
      const data = await call({ action: 'checkout', profile });
      const target = new URL(data.url);
      if (target.origin !== 'https://checkout.stripe.com' || target.username || target.password || !/^\/c\/pay\/cs_live_[A-Za-z0-9_]+/.test(target.pathname) || !/^[a-f0-9-]{36}$/i.test(data.order || '') || !/^[a-f0-9]{64}$/.test(data.token || '')) throw new Error('invalid_checkout');
      localStorage.setItem(STORE, JSON.stringify({ order: data.order, token: data.token }));
      track('checkout_start');
      window.location.assign(target.href);
    } catch (err) {
      message(err.message === 'invalid_profile' ? 'Please check the ZIP, vehicle and prices you entered.' : 'Checkout is temporarily unavailable. You have not been charged. Please try again.');
      pay.disabled = false;
    }
  });
  const params = new URLSearchParams(location.search);
  let order = saved();
  const returnedSession = params.get('session_id');
  // Save verification information before cleaning the URL so refresh can retry.
  if (returnedSession && order?.order && order?.token && /^cs_live_[A-Za-z0-9_]+$/.test(returnedSession)) {
    order = { ...order, session: returnedSession };
    try { localStorage.setItem(STORE, JSON.stringify(order)); } catch {}
  }
  const session = returnedSession || order?.session;
  if (returnedSession || params.has('payment')) history.replaceState(null, '', location.pathname + location.hash);
  if (params.get('payment') === 'cancelled') message('Checkout cancelled. Your quote is saved in this tab. You can review it and try again.');
  if (order?.order && order?.token) {
    if (session) { pay.disabled = true; message('Checking your payment and preparing your report…'); }
    let verifying = false;
    const loadReport = async () => {
      if (verifying) return;
      verifying = true;
      retry.hidden = true;
      for (let attempt = 0; attempt < (session ? 8 : 1); attempt++) {
        try {
          const data = await call({ action: session ? 'verify' : 'report', order: order.order, token: order.token, ...(session ? { session_id: session } : {}) });
          showReport(data.report);
          if (session) {
            track('checkout_return');
            try { localStorage.setItem(STORE, JSON.stringify({ order: order.order, token: order.token })); } catch {}
          }
          message(''); pay.disabled = false; verifying = false; return;
        } catch (err) {
          if (err.message !== 'payment_not_complete') { if (session) { message('We could not verify the payment yet. Retry below or contact support if you were charged.'); retry.hidden = false; } verifying = false; return; }
          if (!session) { verifying = false; return; }
          if (attempt < 7) await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      if (session) { message('Payment is still processing. Retry verification below. If you were charged and the report does not appear, contact support.'); retry.hidden = false; }
      verifying = false;
    };
    retry.addEventListener('click', () => { message('Checking your payment…'); void loadReport(); });
    void loadReport();
  } else if (session) {
    message('Open this page in the same browser where you started checkout to view your paid report. If you paid, contact support for help.');
  }
  document.getElementById('printReport').addEventListener('click', () => window.print());
})();
