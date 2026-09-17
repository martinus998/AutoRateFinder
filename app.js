// AutoRateFinder quote flow.
// SECURITY: Never place insurer credentials, API keys or customer PII in this public file.
// Live quote integrations must be handled server-side through an appropriately licensed partner.
(function () {
  'use strict';

  // Point this to a secure server endpoint once the licensed quote partner is connected.
  // Expected POST response: { quotes: [{ id, insurer, monthly, coverage, deductible, savings, purchaseUrl }] }
  const QUOTE_API_URL = '';

  const modal = document.getElementById('quoteModal');
  const panels = [...document.querySelectorAll('.step-panel')];
  const progress = document.getElementById('progressBar');
  const TOTAL_STEPS = 8;
  const labels = {
    minimum: 'Minimum coverage',
    value: 'Best value',
    full: 'Full coverage',
    unsure: 'Help me choose'
  };

  const state = {
    zip: '', age: '',
    vehicleYear: '', vehicleMake: '', vehicleModel: '', vehicleOwnership: '', vehicleUse: '', annualMileage: '',
    record: '', recordValue: '', currentlyInsured: '', currentCarrier: '', continuousCoverage: '',
    coverage: '', deductible: '', discounts: []
  };

  let step = 1;

  function validZip(zip) { return /^\d{5}$/.test(zip); }
  function selected(field) { return document.querySelector(`.choice-grid[data-field="${field}"] .selected`); }
  function normalize(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }
  function value(id) { const el = document.getElementById(id); return el ? el.value.trim() : ''; }

  function showStep(target) {
    step = target;
    panels.forEach(p => p.classList.toggle('active', String(p.dataset.step) === String(target)));
    if (progress) progress.style.width = target === 'result' ? '100%' : `${Math.min(100, (Number(target) / TOTAL_STEPS) * 100)}%`;

    if (Number(target) === 7 && state.coverage) {
      const match = [...document.querySelectorAll('.choice-grid[data-field="coverage"] button')]
        .find(b => b.dataset.value === state.coverage);
      if (match) selectSingle(match);
    }
    if (Number(target) === 8) syncModalDiscounts();
  }

  function selectSingle(btn) {
    const group = btn.closest('.choice-grid');
    if (!group) return;
    group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  function openModal(opts = {}) {
    if (opts.zip) state.zip = opts.zip;
    if (opts.goal) state.coverage = opts.goal;
    const z = document.getElementById('modalZip');
    if (z) z.value = state.zip || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showStep(1);
    setTimeout(() => z && z.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.js-start').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    openModal({ goal: btn.dataset.goal || '' });
  }));
  document.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('open')) closeModal(); });

  const zipInput = document.getElementById('zipInput');
  document.getElementById('zipStart').addEventListener('click', () => {
    const zip = zipInput.value.trim();
    if (!validZip(zip)) {
      zipInput.focus();
      zipInput.setCustomValidity('Enter a valid 5-digit ZIP code.');
      zipInput.reportValidity();
      return;
    }
    zipInput.setCustomValidity('');
    openModal({ zip });
  });
  zipInput.addEventListener('input', () => zipInput.setCustomValidity(''));
  zipInput.addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('zipStart').click(); });

  document.querySelectorAll('.choice-grid button').forEach(btn => btn.addEventListener('click', () => selectSingle(btn)));

  function validateAndSaveStep() {
    if (step === 1) {
      const zip = value('modalZip');
      if (!validZip(zip)) { document.getElementById('modalZip').focus(); return false; }
      state.zip = zip;
    }
    if (step === 2) {
      const s = selected('age'); if (!s) return false;
      state.age = s.dataset.value || s.textContent.trim();
    }
    if (step === 3) {
      state.vehicleYear = value('vehicleYear');
      state.vehicleMake = value('vehicleMake');
      state.vehicleModel = value('vehicleModel');
      const year = Number(state.vehicleYear);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(state.vehicleYear) || year < 1980 || year > currentYear + 1 || !state.vehicleMake || !state.vehicleModel) return false;
    }
    if (step === 4) {
      const ownership = selected('vehicleOwnership');
      const usage = selected('vehicleUse');
      state.annualMileage = value('annualMileage');
      if (!ownership || !usage || !state.annualMileage) return false;
      state.vehicleOwnership = ownership.dataset.value || normalize(ownership.textContent);
      state.vehicleUse = usage.dataset.value || normalize(usage.textContent);
    }
    if (step === 5) {
      const s = selected('record'); if (!s) return false;
      state.record = s.textContent.trim();
      state.recordValue = s.dataset.value || normalize(state.record);
    }
    if (step === 6) {
      const insured = selected('currentlyInsured'); if (!insured) return false;
      state.currentlyInsured = insured.dataset.value || normalize(insured.textContent);
      state.currentCarrier = value('currentCarrier');
      const continuous = selected('continuousCoverage');
      state.continuousCoverage = continuous ? (continuous.dataset.value || normalize(continuous.textContent)) : '';
      if (state.currentlyInsured === 'yes' && !state.currentCarrier) return false;
    }
    if (step === 7) {
      const coverage = selected('coverage');
      const deductible = selected('deductible');
      if (!coverage || !deductible) return false;
      state.coverage = coverage.dataset.value || normalize(coverage.textContent);
      state.deductible = deductible.dataset.value || normalize(deductible.textContent);
    }
    return true;
  }

  document.querySelectorAll('.next-step').forEach(btn => btn.addEventListener('click', () => {
    if (!validateAndSaveStep()) return;
    showStep(Math.min(TOTAL_STEPS, Number(step) + 1));
  }));

  // Main page deductible explainer — educational only.
  const deductibleSlider = document.getElementById('deductibleSlider');
  const deductibleValue = document.getElementById('deductibleValue');
  const deductibleNote = document.getElementById('deductibleNote');
  const deductibles = ['$250', '$500', '$1,000', '$2,000'];
  const deductibleNotes = [
    'Lower out-of-pocket cost after a covered claim, but premiums can be higher. Compare the same deductible across carriers.',
    'A common middle ground between premium and out-of-pocket exposure. Compare the same deductible across carriers.',
    'More out-of-pocket exposure after a covered claim. Some carriers may price a higher deductible lower.',
    'High out-of-pocket exposure. Only consider it if that amount would be affordable after a claim.'
  ];
  if (deductibleSlider) deductibleSlider.addEventListener('input', () => {
    const i = Number(deductibleSlider.value);
    deductibleValue.textContent = deductibles[i];
    deductibleNote.textContent = deductibleNotes[i];
  });

  const discountButtons = [...document.querySelectorAll('#discountChecks button')];
  const discountMessage = document.getElementById('discountMessage');
  discountButtons.forEach(btn => btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    const active = discountButtons.filter(b => b.classList.contains('selected'));
    state.discounts = active.map(b => b.dataset.discount || normalize(b.textContent));
    if (discountMessage) discountMessage.textContent = active.length
      ? `You selected ${active.length} potential discount ${active.length === 1 ? 'category' : 'categories'}. A carrier must confirm eligibility.`
      : 'Choose anything that may apply to you. A carrier must confirm eligibility.';
  }));

  const modalDiscountButtons = [...document.querySelectorAll('#modalDiscounts button')];
  modalDiscountButtons.forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('selected')));

  function syncModalDiscounts() {
    modalDiscountButtons.forEach(btn => {
      const key = btn.dataset.value || normalize(btn.textContent);
      btn.classList.toggle('selected', state.discounts.includes(key));
    });
  }

  function collectModalDiscounts() {
    const selectedKeys = modalDiscountButtons.filter(b => b.classList.contains('selected')).map(b => b.dataset.value || normalize(b.textContent));
    state.discounts = [...new Set([...state.discounts, ...selectedKeys])];
  }

  function setResultsStatus(text, mode) {
    const status = document.getElementById('quoteStatus');
    if (!status) return;
    status.textContent = text;
    status.dataset.mode = mode || '';
  }

  function renderQuotes(quotes) {
    const list = document.getElementById('liveQuoteList');
    list.innerHTML = '';

    if (!Array.isArray(quotes) || !quotes.length) {
      setResultsStatus('No matched live quotes were returned for this profile. Try adjusting coverage or use the insurer links supplied by the connected partner.', 'empty');
      return;
    }

    const valid = quotes
      .filter(q => q && q.insurer && q.purchaseUrl)
      .sort((a, b) => Number(a.monthly || Infinity) - Number(b.monthly || Infinity));

    valid.forEach((quote, index) => {
      const card = document.createElement('article');
      card.className = `live-quote-card${index === 0 ? ' best-match' : ''}`;
      const monthly = Number(quote.monthly);
      const priceText = Number.isFinite(monthly) ? `$${monthly.toFixed(monthly % 1 ? 2 : 0)}/mo` : 'See price';
      const savings = quote.savings ? `<span class="quote-save">${quote.savings}</span>` : '';
      card.innerHTML = `
        <div class="quote-main">
          <div><span class="quote-kicker">${index === 0 ? 'LOWEST MATCHED LIVE OPTION' : 'MATCHED LIVE OPTION'}</span><h3>${escapeHtml(quote.insurer)}</h3></div>
          <strong class="quote-price">${escapeHtml(priceText)}</strong>
        </div>
        <div class="quote-meta"><span>${escapeHtml(quote.coverage || labels[state.coverage] || 'Coverage shown by carrier')}</span><span>Deductible: ${escapeHtml(quote.deductible || state.deductible || 'See carrier')}</span>${savings}</div>
        <button class="btn primary quote-continue" type="button">Continue to ${escapeHtml(quote.insurer)} →</button>
        <small>Final price, eligibility and policy purchase are completed on the insurer or licensed partner website.</small>`;
      card.querySelector('.quote-continue').addEventListener('click', () => {
        const url = safeHttpsUrl(quote.purchaseUrl);
        if (url) window.location.assign(url);
      });
      list.appendChild(card);
    });

    setResultsStatus(`${valid.length} live matched ${valid.length === 1 ? 'option' : 'options'} returned. Select an insurer to continue and complete the quote/purchase on its secure site.`, 'live');
  }

  function safeHttpsUrl(url) {
    try {
      const parsed = new URL(url, window.location.href);
      return parsed.protocol === 'https:' ? parsed.href : '';
    } catch (_) { return ''; }
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  async function requestLiveQuotes() {
    document.getElementById('rZip').textContent = state.zip || '—';
    document.getElementById('rVehicle').textContent = [state.vehicleYear, state.vehicleMake, state.vehicleModel].filter(Boolean).join(' ') || '—';
    document.getElementById('rCoverage').textContent = labels[state.coverage] || state.coverage || '—';
    document.getElementById('rRecord').textContent = state.record || '—';
    showStep('result');

    const list = document.getElementById('liveQuoteList');
    list.innerHTML = '';

    if (!QUOTE_API_URL) {
      setResultsStatus('The comparison flow is ready for live insurer data. A licensed quote partner/API still needs to be connected before real prices and insurer purchase links can be displayed.', 'setup');
      return;
    }

    setResultsStatus('Checking matched live insurer options…', 'loading');
    try {
      const response = await fetch(QUOTE_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(state),
        credentials: 'omit'
      });
      if (!response.ok) throw new Error(`Quote service returned ${response.status}`);
      const data = await response.json();
      renderQuotes(data.quotes || []);
    } catch (err) {
      console.error('Live quote request failed:', err);
      setResultsStatus('Live quotes are temporarily unavailable. Please try again later.', 'error');
    }
  }

  document.getElementById('finishQuote').addEventListener('click', () => {
    collectModalDiscounts();
    requestLiveQuotes();
  });
})();