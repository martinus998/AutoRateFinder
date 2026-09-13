// AutoRateFinder analytics bootstrap.
// Set GA_MEASUREMENT_ID to the public GA4 Measurement ID (format G-XXXXXXXXXX) after the GA4 web stream is created.
// Privacy rule: never send ZIP codes, names, email addresses, VINs, vehicle make/model, or other personal data in analytics events.
(function () {
  'use strict';

  const GA_MEASUREMENT_ID = '';
  const CONSENT_KEY = 'autoratefinder_analytics_consent_v1';

  function validMeasurementId(id) {
    return /^G-[A-Z0-9]+$/i.test(String(id || '').trim());
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function consentChoice() {
    try { return localStorage.getItem(CONSENT_KEY) || ''; } catch (_) { return ''; }
  }

  function setConsent(choice) {
    try { localStorage.setItem(CONSENT_KEY, choice); } catch (_) {}
    window.gtag('consent', 'update', {
      analytics_storage: choice === 'granted' ? 'granted' : 'denied',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
  }

  function track(name, params) {
    if (!validMeasurementId(GA_MEASUREMENT_ID)) return;
    window.gtag('event', name, Object.assign({ page_path: location.pathname }, params || {}));
  }

  window.AutoRateAnalytics = { track };

  if (!validMeasurementId(GA_MEASUREMENT_ID)) return;

  window.gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500
  });

  const existingChoice = consentChoice();
  if (existingChoice === 'granted' || existingChoice === 'denied') setConsent(existingChoice);

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true,
    allow_google_signals: false,
    allow_ad_personalization_signals: false
  });

  if (!existingChoice) {
    const banner = document.createElement('div');
    banner.id = 'analyticsConsent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Analytics preference');
    banner.innerHTML = '<div><strong>Help us improve AutoRateFinder</strong><span>We use privacy-conscious Google Analytics only if you allow it. Quote-profile answers are not sent to analytics.</span></div><div><button type="button" data-consent="denied">Decline</button><button type="button" data-consent="granted">Allow analytics</button></div>';
    Object.assign(banner.style, {
      position: 'fixed', left: '12px', right: '12px', bottom: '12px', zIndex: '99999',
      maxWidth: '760px', margin: '0 auto', padding: '14px', borderRadius: '14px',
      background: '#061b33', color: '#f7fbff', border: '1px solid rgba(84,239,186,.45)',
      boxShadow: '0 18px 50px rgba(0,0,0,.38)', display: 'flex', gap: '12px',
      alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', fontFamily: 'inherit'
    });
    const text = banner.querySelector('div');
    if (text) Object.assign(text.style, { display: 'grid', gap: '4px', maxWidth: '500px' });
    const span = banner.querySelector('span');
    if (span) Object.assign(span.style, { fontSize: '12px', color: '#b7c9d8', lineHeight: '1.4' });
    banner.querySelectorAll('button').forEach(function (button) {
      Object.assign(button.style, {
        border: '1px solid rgba(84,239,186,.42)', borderRadius: '10px', padding: '9px 12px',
        background: button.dataset.consent === 'granted' ? '#31d9a4' : '#0b3156',
        color: button.dataset.consent === 'granted' ? '#021426' : '#f7fbff', fontWeight: '800', cursor: 'pointer', marginLeft: '6px'
      });
      button.addEventListener('click', function () {
        const choice = button.dataset.consent === 'granted' ? 'granted' : 'denied';
        setConsent(choice);
        if (choice === 'granted') track('analytics_consent_granted');
        banner.remove();
      });
    });
    document.body.appendChild(banner);
  }

  document.addEventListener('click', function (event) {
    const start = event.target.closest('.js-start, #zipStart, .quick-goals button');
    if (start) {
      track('comparison_start', {
        entry_point: start.id === 'zipStart' ? 'zip_cta' : (start.dataset.goal ? 'coverage_cta' : 'general_cta'),
        coverage_goal: start.dataset.goal || 'unspecified'
      });
    }

    const next = event.target.closest('.next-step');
    if (next) {
      const active = document.querySelector('.step-panel.active');
      const currentStep = active ? String(active.dataset.step || '') : '';
      track('quote_flow_continue', { step: currentStep || 'unknown' });
    }

    const finish = event.target.closest('#finishQuote');
    if (finish) track('comparison_profile_complete');

    const partner = event.target.closest('#partnerBtn');
    if (partner && !partner.disabled) track('partner_quote_click');

    const discount = event.target.closest('#discountChecks button, #modalDiscounts button');
    if (discount) track('discount_interaction');

    const coverage = event.target.closest('.coverage-card .js-start');
    if (coverage) track('coverage_interest', { coverage_goal: coverage.dataset.goal || 'unspecified' });
  }, true);

  const deductible = document.getElementById('deductibleSlider');
  if (deductible) {
    deductible.addEventListener('change', function () {
      track('deductible_interaction', { deductible_index: Number(deductible.value || 0) });
    });
  }
})();
