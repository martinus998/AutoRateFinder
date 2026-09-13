// AutoRateFinder partner integration adapter.
// IMPORTANT: this public file must never contain partner API secrets or private credentials.
// Private credentials belong only in a secure server-side proxy.
(function () {
  'use strict';

  const CONFIG = Object.freeze({
    status: 'pending', // pending | live
    providerName: '',
    mode: 'disabled', // disabled | redirect | api
    endpoint: '',
    redirectUrl: '',
    allowedRedirectHosts: [],
    requiresProfileSharingConsent: true,
    timeoutMs: 12000
  });

  function track(name, params) {
    if (window.AutoRateAnalytics && typeof window.AutoRateAnalytics.track === 'function') {
      window.AutoRateAnalytics.track(name, params || {});
    }
  }

  function selectedValue(field) {
    const selected = document.querySelector(`.choice-grid[data-field="${field}"] .selected`);
    if (!selected) return '';
    return selected.dataset.value || selected.textContent.trim();
  }

  function collectDiscounts() {
    return [...document.querySelectorAll('#modalDiscounts button.selected, #discountChecks button.selected')]
      .map(button => button.dataset.discount || button.textContent.trim().toLowerCase())
      .filter(Boolean)
      .filter((value, index, array) => array.indexOf(value) === index);
  }

  function collectProfile() {
    return {
      version: 1,
      zip: (document.getElementById('modalZip')?.value || document.getElementById('zipInput')?.value || '').trim(),
      ageBand: selectedValue('age'),
      vehicle: {
        year: (document.getElementById('vehicleYear')?.value || '').trim(),
        make: (document.getElementById('vehicleMake')?.value || '').trim(),
        model: (document.getElementById('vehicleModel')?.value || '').trim()
      },
      drivingRecord: selectedValue('record'),
      coverageGoal: selectedValue('coverage'),
      discounts: collectDiscounts()
    };
  }

  function isHttpsUrl(value) {
    try { return new URL(value).protocol === 'https:'; } catch (_) { return false; }
  }

  function isAllowedRedirect(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:') return false;
      if (!CONFIG.allowedRedirectHosts.length) return false;
      return CONFIG.allowedRedirectHosts.includes(url.hostname);
    } catch (_) {
      return false;
    }
  }

  function consentBox() {
    let box = document.getElementById('partnerConsentBox');
    if (box) return box;

    const button = document.getElementById('partnerBtn');
    if (!button || !button.parentElement) return null;

    box = document.createElement('div');
    box.id = 'partnerConsentBox';
    box.hidden = true;
    box.innerHTML = [
      '<label style="display:flex;gap:9px;align-items:flex-start;font-size:11px;line-height:1.45;color:#c7d9e6;margin:10px 0;">',
      '<input id="partnerShareConsent" type="checkbox" style="margin-top:3px;">',
      '<span>I agree that the quote information I entered may be sent to the licensed quote partner shown here so it can return real insurance options. This does not include consent to marketing calls or texts unless I separately agree.</span>',
      '</label>',
      '<p id="partnerStatusText" style="margin:6px 0 0;font-size:10px;line-height:1.45;color:#8faabe;"></p>'
    ].join('');
    button.parentElement.insertBefore(box, button);
    return box;
  }

  function setStatus(message, isError) {
    const target = document.getElementById('partnerStatusText');
    if (!target) return;
    target.textContent = message || '';
    target.style.color = isError ? '#ffb7b7' : '#8faabe';
  }

  function syncPartnerUi() {
    const button = document.getElementById('partnerBtn');
    if (!button) return;

    const live = CONFIG.status === 'live' && (CONFIG.mode === 'redirect' || CONFIG.mode === 'api');
    if (!live) {
      button.textContent = 'Live partner quotes opening soon';
      button.disabled = true;
      const box = document.getElementById('partnerConsentBox');
      if (box) box.hidden = true;
      return;
    }

    const box = consentBox();
    if (box) box.hidden = CONFIG.mode === 'redirect' && !CONFIG.requiresProfileSharingConsent;
    button.disabled = false;
    button.textContent = CONFIG.mode === 'api' ? 'Get live partner quotes →' : 'Continue to licensed partner →';
    if (box) {
      const name = CONFIG.providerName || 'our licensed quote partner';
      setStatus(`Quote handoff will be handled by ${name}.`);
    }
  }

  async function postProfile(profile) {
    if (!isHttpsUrl(CONFIG.endpoint)) throw new Error('Partner endpoint is not configured securely.');

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CONFIG.timeoutMs);
    try {
      const response = await fetch(CONFIG.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'omit',
        signal: controller.signal,
        body: JSON.stringify({
          profile,
          consent: {
            quoteSharing: true,
            consentedAt: new Date().toISOString(),
            consentVersion: '2026-09-13-v1'
          },
          source: 'autoratefinder-web'
        })
      });

      if (!response.ok) throw new Error(`Quote partner request failed (${response.status}).`);
      const data = await response.json();
      const redirect = data.redirectUrl || data.redirect_url || '';
      if (!redirect || !isAllowedRedirect(redirect)) {
        throw new Error('Partner response did not include an approved secure quote URL.');
      }
      return redirect;
    } finally {
      clearTimeout(timeout);
    }
  }

  async function handlePartnerClick(event) {
    if (CONFIG.status !== 'live') return;

    event.preventDefault();
    event.stopImmediatePropagation();

    const button = document.getElementById('partnerBtn');
    if (!button) return;

    if (CONFIG.requiresProfileSharingConsent) {
      const consent = document.getElementById('partnerShareConsent');
      if (!consent || !consent.checked) {
        setStatus('Please confirm quote-sharing consent before continuing.', true);
        consent?.focus();
        return;
      }
    }

    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = 'Connecting securely…';
    setStatus('Preparing your handoff to the licensed quote partner.');

    try {
      track('partner_handoff_start', { partner_mode: CONFIG.mode, provider: CONFIG.providerName || 'configured_partner' });

      if (CONFIG.mode === 'redirect') {
        if (!isAllowedRedirect(CONFIG.redirectUrl)) throw new Error('Partner redirect is not on the approved host list.');
        track('partner_handoff_success', { partner_mode: 'redirect' });
        window.location.assign(CONFIG.redirectUrl);
        return;
      }

      const redirect = await postProfile(collectProfile());
      track('partner_handoff_success', { partner_mode: 'api' });
      window.location.assign(redirect);
    } catch (error) {
      console.error('AutoRateFinder partner handoff failed without logging quote profile data.', error);
      setStatus('We could not connect to the quote partner right now. Please try again later.', true);
      track('partner_handoff_error', { partner_mode: CONFIG.mode });
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  function init() {
    syncPartnerUi();

    const finish = document.getElementById('finishQuote');
    if (finish) finish.addEventListener('click', () => setTimeout(syncPartnerUi, 0));

    const partner = document.getElementById('partnerBtn');
    if (partner) partner.addEventListener('click', handlePartnerClick, true);

    window.AutoRatePartner = Object.freeze({
      status: () => CONFIG.status,
      providerName: () => CONFIG.providerName,
      mode: () => CONFIG.mode,
      collectProfile
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
