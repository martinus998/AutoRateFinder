// AutoRateFinder quote flow.
// SECURITY: Never place insurer credentials, API keys or customer PII in this public file.
// Live quote integrations must be handled server-side through an appropriately licensed partner.
(function () {
  'use strict';

  // LIVE ACTIVATION: change these values only after a licensed quote partner is approved
  // and the secure server-side proxy is deployed. Never put private partner credentials here.
  const CONFIG = Object.freeze({
    status: 'pending', // pending | live
    providerName: '',
    endpoint: '', // AutoRateFinder secure server-side quote proxy, not a private carrier endpoint
    allowedRedirectHosts: [], // exact approved carrier / partner hostnames
    timeoutMs: 15000,
    consentVersion: '2026-09-17-v1'
  });

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
    if (Number(target) === 8) {
      syncModalDiscounts();
      syncConsentUi();
    }
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
      const miles = Number(state.annualMileage.replace(/[^0-9]/g, ''));
      if (!ownership || !usage || !Number.isFinite(miles) || miles < 0 || miles > 100000) return false;
      state.annualMileage = String(miles);
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
      if (state.currentlyInsured === 'yes' && (!state.currentCarrier || !state.continuousCoverage)) return false;
      if (state.currentlyInsured === 'no') state.currentCarrier = '';
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

  function ensureConsentUi() {
    let box = document.getElementById('quoteShareConsentBox');
    if (box) return box;
    const finish = document.getElementById('finishQuote');
    if (!finish || !finish.parentElement) return null;

    box = document.createElement('div');
    box.id = 'quoteShareConsentBox';
    box.hidden = true;
    box.style.cssText = 'margin:12px 0;padding:11px 12px;border:1px solid rgba(76,164,220,.35);border-radius:12px;background:#061b33;color:#bad3e4;font-size:10px;line-height:1.45;';
    box.innerHTML = '<label style="display:flex;gap:8px;align-items:flex-start;cursor:pointer"><input id="quoteShareConsent" type="checkbox" style="margin-top:3px"><span>I agree that the quote information I entered may be securely shared with the licensed insurance quote partner shown here so it can return matched insurance options. This is separate from any consent to marketing calls or texts. <a href="privacy.html" target="_blank" rel="noopener" style="color:#59e7bc">Privacy</a></span></label><p id="quoteShareConsentError" style="display:none;margin:7px 0 0;color:#ffb7b7"></p>';
    finish.parentElement.insertBefore(box, finish);
    return box;
  }

  function syncConsentUi() {
    const box = ensureConsentUi();
    if (!box) return;
    const live = CONFIG.status === 'live' && Boolean(CONFIG.endpoint);
    box.hidden = !live;
    const error = document.getElementById('quoteShareConsentError');
    if (error) { error.style.display = 'none'; error.textContent = ''; }
  }

  function consentGranted() {
    if (CONFIG.status !== 'live') return true;
    const checkbox = document.getElementById('quoteShareConsent');
    if (checkbox && checkbox.checked) return true;
    const error = document.getElementById('quoteShareConsentError');
    if (error) {
      error.textContent = 'Please confirm quote-sharing consent before requesting live quotes.';
      error.style.display = 'block';
    }
    checkbox?.focus();
    return false;
  }

  function setResultsStatus(text, mode) {
    const status = document.getElementById('quoteStatus');
    if (!status) return;
    status.textContent = text;
    status.dataset.mode = mode || '';
  }

  function approvedHttpsUrl(url) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'https:') return '';
      if (!CONFIG.allowedRedirectHosts.length) return '';
      if (!CONFIG.allowedRedirectHosts.includes(parsed.hostname)) return '';
      return parsed.href;
    } catch (_) { return ''; }
  }

  function escapeHtml(text) {
    return String(text ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
  }

  function renderQuotes(quotes) {
    const list = document.getElementById('liveQuoteList');
    list.innerHTML = '';

    const valid = (Array.isArray(quotes) ? quotes : [])
      .map(q => ({ ...q, approvedUrl: q && q.purchaseUrl ? approvedHttpsUrl(q.purchaseUrl) : '' }))
      .filter(q => q && q.insurer && q.approvedUrl)
      .sort((a, b) => Number(a.monthly || Infinity) - Number(b.monthly || Infinity));

    if (!valid.length) {
      setResultsStatus('No verified live quote links were returned for this profile. Please try again later or adjust your coverage selections.', 'empty');
      return;
    }

    valid.forEach((quote, index) => {
      const card = document.createElement('article');
      card.className = `live-quote-card${index === 0 ? ' best-match' : ''}`;
      const monthly = Number(quote.monthly);
      const priceText = Number.isFinite(monthly) ? `$${monthly.toFixed(monthly % 1 ? 2 : 0)}/mo` : 'See final price';
      const savings = quote.savings ? `<span class="quote-save">${escapeHtml(quote.savings)}</span>` : '';
      card.innerHTML = `
        <div class="quote-main">
          <div><span class="quote-kicker">${index === 0 ? 'LOWEST MATCHED LIVE OPTION' : 'MATCHED LIVE OPTION'}</span><h3>${escapeHtml(quote.insurer)}</h3></div>
          <strong class="quote-price">${escapeHtml(priceText)}</strong>
        </div>
        <div class="quote-meta"><span>${escapeHtml(quote.coverage || labels[state.coverage] || 'Coverage shown by carrier')}</span><span>Deductible: ${escapeHtml(quote.deductible || state.deductible || 'See carrier')}</span>${savings}</div>
        <button class="btn primary quote-continue" type="button">Continue to ${escapeHtml(quote.insurer)} →</button>
        <small>Final price, eligibility and policy purchase are completed on the insurer or licensed partner website.</small>`;
      card.querySelector('.quote-continue').addEventListener('click', () => window.location.assign(quote.approvedUrl));
      list.appendChild(card);
    });

    setResultsStatus(`${valid.length} verified live matched ${valid.length === 1 ? 'option' : 'options'} returned. Select an insurer to continue and complete the quote or policy on its secure site.`, 'live');
  }

  function renderHostedHandoff(url, label) {
    const approved = approvedHttpsUrl(url);
    const list = document.getElementById('liveQuoteList');
    list.innerHTML = '';
    if (!approved) {
      setResultsStatus('The quote partner returned a link that is not on AutoRateFinder\'s approved secure destination list.', 'error');
      return;
    }

    const card = document.createElement('article');
    card.className = 'live-quote-card best-match';
    const provider = label || CONFIG.providerName || 'licensed quote partner';
    card.innerHTML = `<div class="quote-main"><div><span class="quote-kicker">SECURE LIVE QUOTE HANDOFF</span><h3>${escapeHtml(provider)}</h3></div></div><div class="quote-meta"><span>Complete remaining details</span><span>See carrier-approved offers</span></div><button class="btn primary quote-continue" type="button">Continue securely →</button><small>You will continue to the licensed partner or insurer site to see and complete available quotes.</small>`;
    card.querySelector('.quote-continue').addEventListener('click', () => window.location.assign(approved));
    list.appendChild(card);
    setResultsStatus('Your profile is ready. Continue securely to the licensed quote experience to see available carrier offers.', 'live');
  }

  function buildPartnerPayload() {
    return {
      profile: {
        version: 2,
        zip: state.zip,
        ageBand: state.age,
        vehicle: {
          year: state.vehicleYear,
          make: state.vehicleMake,
          model: state.vehicleModel,
          ownership: state.vehicleOwnership,
          use: state.vehicleUse,
          annualMileage: state.annualMileage
        },
        drivingRecord: state.recordValue,
        currentInsurance: {
          insured: state.currentlyInsured === 'yes',
          carrier: state.currentCarrier,
          continuousCoverage: state.continuousCoverage
        },
        coverageGoal: state.coverage,
        deductible: state.deductible,
        discounts: state.discounts
      },
      consent: {
        quoteSharing: true,
        consentedAt: new Date().toISOString(),
        consentVersion: CONFIG.consentVersion
      },
      source: 'autoratefinder-web'
    };
  }

  async function requestLiveQuotes() {
    document.getElementById('rZip').textContent = state.zip || '—';
    document.getElementById('rVehicle').textContent = [state.vehicleYear, state.vehicleMake, state.vehicleModel].filter(Boolean).join(' ') || '—';
    document.getElementById('rCoverage').textContent = labels[state.coverage] || state.coverage || '—';
    document.getElementById('rRecord').textContent = state.record || '—';
    showStep('result');

    const list = document.getElementById('liveQuoteList');
    list.innerHTML = '';

    if (CONFIG.status !== 'live' || !CONFIG.endpoint) {
      setResultsStatus('AutoRateFinder is ready for live carrier data. The remaining step is approval and credentials from a licensed U.S. quote partner before real prices and purchase links can be displayed.', 'setup');
      return;
    }

    if (!CONFIG.allowedRedirectHosts.length) {
      setResultsStatus('Live quote integration is not fully configured yet because no approved insurer/partner destination domains are set.', 'error');
      return;
    }

    setResultsStatus('Checking matched live insurer options…', 'loading');
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPartnerPayload()),
        credentials: 'omit',
        signal: controller.signal
      });
      if (!response.ok) throw new Error(`Quote service returned ${response.status}`);
      const data = await response.json();

      if (Array.isArray(data.quotes) && data.quotes.length) {
        renderQuotes(data.quotes);
        return;
      }

      const handoff = data.redirectUrl || data.redirect_url || '';
      if (handoff) {
        renderHostedHandoff(handoff, data.providerName || data.provider_name || '');
        return;
      }

      setResultsStatus('The live quote partner did not return any available offers for this profile.', 'empty');
    } catch (err) {
      console.error('Live quote request failed without logging the quote profile:', err);
      setResultsStatus('Live quotes are temporarily unavailable. Please try again later.', 'error');
    } finally {
      clearTimeout(timer);
    }
  }

  document.getElementById('finishQuote').addEventListener('click', () => {
    collectModalDiscounts();
    if (!consentGranted()) return;
    requestLiveQuotes();
  });

  ensureConsentUi();
  window.AutoRateFinderPartnerStatus = Object.freeze({
    status: CONFIG.status,
    providerName: CONFIG.providerName || null,
    endpointConfigured: Boolean(CONFIG.endpoint)
  });
})();