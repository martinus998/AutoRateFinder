// AutoRateFinder public comparison preview.
// SECURITY: Never place private insurer credentials, API keys or customer PII in this file.
// Live quote and lead integrations must be handled server-side through licensed partners.
(function () {
  'use strict';

  const PARTNER_URL = '';
  const modal = document.getElementById('quoteModal');
  const panels = [...document.querySelectorAll('.step-panel')];
  const progress = document.getElementById('progressBar');
  const labels = {
    minimum: 'Lowest legal coverage',
    value: 'Best value',
    full: 'Full coverage',
    unsure: 'Help me understand'
  };

  const state = {
    zip: '', age: '', vehicleYear: '', vehicleMake: '', vehicleModel: '',
    record: '', recordValue: '', coverage: '', profile: '', discounts: []
  };
  let step = 1;

  function validZip(zip) { return /^\d{5}$/.test(zip); }
  function selected(field) { return document.querySelector(`.choice-grid[data-field="${field}"] .selected`); }
  function normalize(text) { return String(text || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

  function showStep(target) {
    step = target;
    panels.forEach(p => p.classList.toggle('active', String(p.dataset.step) === String(target)));
    progress.style.width = target === 'result' ? '100%' : `${Math.min(100, (Number(target) / 6) * 100)}%`;

    if (Number(target) === 5 && state.coverage) {
      const match = [...document.querySelectorAll('.choice-grid[data-field="coverage"] button')]
        .find(b => b.dataset.value === state.coverage);
      if (match) selectSingle(match);
    }
    if (Number(target) === 6) syncModalDiscounts();
  }

  function selectSingle(btn) {
    const group = btn.closest('.choice-grid');
    if (!group) return;
    group.querySelectorAll('button').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  }

  function profilePreset(profile) {
    if (!profile) return;
    const recordMap = { accident: 'accident', ticket: 'ticket' };
    if (recordMap[profile]) {
      const match = document.querySelector(`.choice-grid[data-field="record"] button[data-value="${recordMap[profile]}"]`);
      if (match) selectSingle(match);
    }
    if (profile === 'financed') state.coverage = 'full';
    if (profile === 'low-mileage' && !state.discounts.includes('low-mileage')) state.discounts.push('low-mileage');
    if (profile === 'bundle' && !state.discounts.includes('home-auto')) state.discounts.push('home-auto');
  }

  function openModal(opts = {}) {
    if (opts.zip) state.zip = opts.zip;
    if (opts.goal) state.coverage = opts.goal;
    if (opts.profile) {
      state.profile = opts.profile;
      profilePreset(opts.profile);
    }
    const z = document.getElementById('modalZip');
    z.value = state.zip || '';
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    showStep(1);
    setTimeout(() => z.focus(), 80);
  }

  function closeModal() {
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.querySelectorAll('.js-start').forEach(btn => btn.addEventListener('click', e => {
    e.preventDefault();
    openModal({ goal: btn.dataset.goal || '', profile: btn.dataset.profile || '' });
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

  document.querySelectorAll('.quick-goals button').forEach(btn => btn.addEventListener('click', () => openModal({ goal: btn.dataset.goal || '' })));
  document.querySelectorAll('.choice-grid button').forEach(btn => btn.addEventListener('click', () => selectSingle(btn)));

  document.querySelectorAll('.next-step').forEach(btn => btn.addEventListener('click', () => {
    if (step === 1) {
      const zip = document.getElementById('modalZip').value.trim();
      if (!validZip(zip)) { document.getElementById('modalZip').focus(); return; }
      state.zip = zip;
    }
    if (step === 2) {
      const s = selected('age'); if (!s) return;
      state.age = s.textContent.trim();
    }
    if (step === 3) {
      state.vehicleYear = document.getElementById('vehicleYear').value.trim();
      state.vehicleMake = document.getElementById('vehicleMake').value.trim();
      state.vehicleModel = document.getElementById('vehicleModel').value.trim();
      const year = Number(state.vehicleYear);
      const currentYear = new Date().getFullYear();
      if (!/^\d{4}$/.test(state.vehicleYear) || year < 1980 || year > currentYear + 1 || !state.vehicleMake || !state.vehicleModel) return;
    }
    if (step === 4) {
      const s = selected('record'); if (!s) return;
      state.record = s.textContent.trim();
      state.recordValue = s.dataset.value || normalize(state.record);
    }
    if (step === 5) {
      const s = selected('coverage'); if (!s) return;
      state.coverage = s.dataset.value || normalize(s.textContent);
    }
    showStep(Math.min(6, Number(step) + 1));
  }));

  // Deductible explainer — educational only, never predicts a carrier premium.
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

  // Public discount scanner. Selections remain in memory only and are not uploaded anywhere.
  const discountButtons = [...document.querySelectorAll('#discountChecks button')];
  const discountScore = document.getElementById('discountScore');
  const discountMessage = document.getElementById('discountMessage');
  const mainDiscountMap = {
    'low-mileage': 'low-mileage', bundle: 'home-auto', 'multi-car': 'multiple-cars', student: 'good-student',
    telematics: 'telematics', 'paid-full': 'pay-in-full', defensive: 'defensive-driving', 'anti-theft': 'anti-theft'
  };

  function updateDiscountScore() {
    const active = discountButtons.filter(b => b.classList.contains('selected'));
    state.discounts = active.map(b => mainDiscountMap[b.dataset.discount] || normalize(b.textContent));
    if (discountScore) discountScore.textContent = String(active.length);
    if (discountMessage) {
      discountMessage.textContent = active.length
        ? `You selected ${active.length} potential discount ${active.length === 1 ? 'category' : 'categories'}. A carrier must confirm eligibility.`
        : 'Choose anything that may apply to you.';
    }
  }
  discountButtons.forEach(btn => btn.addEventListener('click', () => {
    btn.classList.toggle('selected');
    updateDiscountScore();
  }));

  const modalDiscountButtons = [...document.querySelectorAll('#modalDiscounts button')];
  const modalDiscountMap = {
    'low-mileage': 'low-mileage', 'home-auto': 'home-auto', 'multiple-cars': 'multiple-cars',
    'good-student': 'good-student', telematics: 'telematics', 'pay-in-full': 'pay-in-full'
  };
  modalDiscountButtons.forEach(btn => btn.addEventListener('click', () => btn.classList.toggle('selected')));

  function syncModalDiscounts() {
    modalDiscountButtons.forEach(btn => {
      const key = modalDiscountMap[normalize(btn.textContent)] || normalize(btn.textContent);
      btn.classList.toggle('selected', state.discounts.includes(key));
    });
  }

  function collectModalDiscounts() {
    const selectedKeys = modalDiscountButtons.filter(b => b.classList.contains('selected')).map(b => modalDiscountMap[normalize(b.textContent)] || normalize(b.textContent));
    state.discounts = [...new Set([...state.discounts, ...selectedKeys])];
  }

  function buildInsight() {
    let score = 0;
    const reasons = [];

    if (state.age === '18–24') { score += 3; reasons.push('Younger-driver age bands can be priced higher by many insurers.'); }
    else if (state.age === '25–34') { score += 1; reasons.push('Age is one of several rating factors that can affect premiums.'); }
    else if (state.age === '65+') { score += 1; reasons.push('Age can affect pricing depending on the carrier and state.'); }

    const recordScore = { clean: 0, ticket: 2, accident: 3, multiple: 5, unknown: 1 };
    score += recordScore[state.recordValue] ?? 0;
    if (state.recordValue === 'clean') reasons.push('A clean recent driving record can help with pricing eligibility.');
    if (state.recordValue === 'ticket') reasons.push('A recent ticket can raise rates, but carriers may treat violations differently.');
    if (state.recordValue === 'accident') reasons.push('A recent accident can materially change pricing and carrier fit.');
    if (state.recordValue === 'multiple') reasons.push('Multiple recent incidents can narrow carrier options and increase pricing pressure.');

    if (state.coverage === 'full') { score += 1; reasons.push('Full coverage generally includes more protection than minimum liability, so compare identical deductibles and limits.'); }
    else if (state.coverage === 'minimum') reasons.push('Minimum coverage targets legal requirements, but lower limits can leave more financial exposure.');
    else reasons.push('Best-value shopping should compare price, limits, deductible and optional protections together.');

    const year = Number(state.vehicleYear);
    if (Number.isFinite(year) && year >= new Date().getFullYear() - 3 && state.coverage === 'full') {
      score += 1;
      reasons.push('Newer vehicles can cost more to repair or replace, which can affect physical-damage coverage pricing.');
    }
    if (state.discounts.length) reasons.push(`${state.discounts.length} potential discount ${state.discounts.length === 1 ? 'category was' : 'categories were'} flagged for carrier confirmation.`);

    let label = 'Lower';
    let explanation = 'Your profile shows fewer of the common factors that tend to increase pricing. This is not a quote.';
    if (score >= 2 && score <= 3) { label = 'Moderate'; explanation = 'Your profile includes some factors that can move pricing. Carrier differences may matter.'; }
    if (score >= 4 && score <= 6) { label = 'Elevated'; explanation = 'Your profile includes several factors that can raise pricing. Comparing carriers may be especially useful.'; }
    if (score >= 7) { label = 'Higher'; explanation = 'Your profile includes multiple factors commonly associated with higher pricing or narrower eligibility.'; }

    document.getElementById('ratePressure').textContent = `${label} pricing pressure`;
    document.getElementById('pressureText').textContent = `${explanation} Educational profile signal only.`;
    const box = document.getElementById('resultReasons');
    box.innerHTML = '';
    reasons.slice(0, 5).forEach(reason => {
      const div = document.createElement('div');
      div.textContent = reason;
      box.appendChild(div);
    });
  }

  document.getElementById('finishQuote').addEventListener('click', () => {
    collectModalDiscounts();
    document.getElementById('rZip').textContent = state.zip || '—';
    document.getElementById('rCoverage').textContent = labels[state.coverage] || state.coverage || '—';
    document.getElementById('rRecord').textContent = state.record || '—';
    buildInsight();

    const p = document.getElementById('partnerBtn');
    if (PARTNER_URL) {
      p.textContent = 'View licensed partner quotes →';
      p.disabled = false;
    } else {
      p.textContent = 'Live partner quotes opening soon';
      p.disabled = true;
    }
    showStep('result');
  });

  document.getElementById('partnerBtn').addEventListener('click', () => {
    if (PARTNER_URL) window.location.assign(PARTNER_URL);
  });
})();