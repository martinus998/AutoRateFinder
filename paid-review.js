(() => {
  'use strict';
  const API = 'https://bkyuyqicybqqifenhhux.supabase.co/functions/v1/autorate-payments';
  const STORE = 'autorate_order_v1';
  const form = document.getElementById('reviewForm');
  const status = document.getElementById('reviewStatus');
  const pay = document.getElementById('reviewPay');
  const reportArea = document.getElementById('reviewReport');
  const stateSelect = document.getElementById('reviewState');
  const preview = document.getElementById('freePreview');
  const money = value => Number.isFinite(value) ? '
  const saved = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };
  const call = async body => {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
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
    reportArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const profile = Object.fromEntries(values.entries());
    profile.extras = values.getAll('extras');
    pay.disabled = true;
    if (window.AutoRateAnalytics) window.AutoRateAnalytics.track('paid_review_checkout_start');
    message('Preparing secure Stripe checkout…');
    try {
      const data = await call({ action: 'checkout', profile });
      localStorage.setItem(STORE, JSON.stringify({ order: data.order, token: data.token }));
      window.location.assign(data.url);
    } catch (err) {
      message(err.message === 'invalid_profile' ? 'Please check the ZIP, vehicle and prices you entered.' : 'Checkout is temporarily unavailable. You have not been charged. Please try again.');
      pay.disabled = false;
    }
  });
  const params = new URLSearchParams(location.search);
  const session = params.get('session_id');
  if (session || params.has('payment')) history.replaceState(null, '', location.pathname + location.hash);
  if (params.get('payment') === 'cancelled') message('Payment cancelled. Your card was not charged.');
  const order = saved();
  if (order?.order && order?.token) {
    if (session) message('Checking your payment and preparing your report…');
    const loadReport = async () => {
      for (let attempt = 0; attempt < (session ? 8 : 1); attempt++) {
        try {
          const data = await call({ action: session ? 'verify' : 'report', order: order.order, token: order.token, ...(session ? { session_id: session } : {}) });
          showReport(data.report); message(''); return;
        } catch (err) {
          if (err.message !== 'payment_not_complete') { if (session) message('We could not verify the payment yet. Please contact support if you were charged.'); return; }
          if (!session) return;
          if (attempt < 7) await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      if (session) message('Payment is still processing. Refresh this page shortly. If you were charged and the report does not appear, contact support.');
    };
    void loadReport();
  } else if (session) {
    message('Open this page in the same browser where you started checkout to view your paid report. If you paid, contact support for help.');
  }
  document.getElementById('printReport').addEventListener('click', () => window.print());
})();
 + value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—';
  const message = text => { status.textContent = text; };
  let previewTracked = false;
  const updatePreview = () => {
    const values = new FormData(form);
    const monthly = Number(values.get('monthlyPremium'));
    const deductible = Number(values.get('deductible'));
    if (!(monthly > 0)) { preview.hidden = true; return; }
    const make = String(values.get('vehicleMake') || '').trim();
    const model = String(values.get('vehicleModel') || '').trim();
    const year = String(values.get('vehicleYear') || '').trim();
    document.getElementById('previewVehicle').textContent = [year, make, model].filter(Boolean).join(' ') || 'Your quote';
    document.getElementById('previewMonthly').textContent = money(monthly);
    document.getElementById('previewAnnual').textContent = money(monthly * 12);
    document.getElementById('previewDeductible').textContent = Number.isFinite(deductible) ? money(deductible) : '—';
    const second = Number(values.get('secondPremium'));
    const compare = document.getElementById('previewCompare');
    if (second > 0) {
      const delta = second - monthly;
      const direction = delta < 0 ? 'lower' : delta > 0 ? 'higher' : 'the same';
      compare.textContent = delta === 0 ? 'Your two entered monthly premiums are the same.' : 'Your second entered quote is ' + money(Math.abs(delta)) + ' ' + direction + ' per month. The paid report helps you compare the coverage and deductible context, not price alone.';
    } else compare.textContent = '';
    preview.hidden = false;
    if (!previewTracked && window.AutoRateAnalytics) {
      window.AutoRateAnalytics.track('free_quote_preview_shown');
      previewTracked = true;
    }
  };
  form.addEventListener('input', updatePreview);
  form.addEventListener('change', updatePreview);
  const saved = () => { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch { return null; } };
  const call = async body => {
    const response = await fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), cache: 'no-store' });
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
    reportArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    const values = new FormData(form);
    const profile = Object.fromEntries(values.entries());
    profile.extras = values.getAll('extras');
    pay.disabled = true;
    message('Preparing secure Stripe checkout…');
    try {
      const data = await call({ action: 'checkout', profile });
      localStorage.setItem(STORE, JSON.stringify({ order: data.order, token: data.token }));
      window.location.assign(data.url);
    } catch (err) {
      message(err.message === 'invalid_profile' ? 'Please check the ZIP, vehicle and prices you entered.' : 'Checkout is temporarily unavailable. You have not been charged. Please try again.');
      pay.disabled = false;
    }
  });
  const params = new URLSearchParams(location.search);
  const session = params.get('session_id');
  if (session || params.has('payment')) history.replaceState(null, '', location.pathname + location.hash);
  if (params.get('payment') === 'cancelled') message('Payment cancelled. Your card was not charged.');
  const order = saved();
  if (order?.order && order?.token) {
    if (session) message('Checking your payment and preparing your report…');
    const loadReport = async () => {
      for (let attempt = 0; attempt < (session ? 8 : 1); attempt++) {
        try {
          const data = await call({ action: session ? 'verify' : 'report', order: order.order, token: order.token, ...(session ? { session_id: session } : {}) });
          showReport(data.report); message(''); return;
        } catch (err) {
          if (err.message !== 'payment_not_complete') { if (session) message('We could not verify the payment yet. Please contact support if you were charged.'); return; }
          if (!session) return;
          if (attempt < 7) await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      if (session) message('Payment is still processing. Refresh this page shortly. If you were charged and the report does not appear, contact support.');
    };
    void loadReport();
  } else if (session) {
    message('Open this page in the same browser where you started checkout to view your paid report. If you paid, contact support for help.');
  }
  document.getElementById('printReport').addEventListener('click', () => window.print());
})();
