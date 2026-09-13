// AutoRateFinder analytics bootstrap.
// Set GA_MEASUREMENT_ID to the public GA4 Measurement ID (format G-XXXXXXXXXX) after the GA4 web stream is created.
// Do not send ZIP codes, names, email addresses, vehicle VINs, or other personal data in analytics events.
(function () {
  'use strict';

  const GA_MEASUREMENT_ID = '';

  function validMeasurementId(id) {
    return /^G-[A-Z0-9]+$/i.test(String(id || '').trim());
  }

  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };

  function track(name, params) {
    if (!validMeasurementId(GA_MEASUREMENT_ID)) return;
    window.gtag('event', name, Object.assign({
      page_path: location.pathname
    }, params || {}));
  }

  window.AutoRateAnalytics = { track };

  if (!validMeasurementId(GA_MEASUREMENT_ID)) return;

  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(GA_MEASUREMENT_ID);
  document.head.appendChild(script);

  window.gtag('js', new Date());
  window.gtag('config', GA_MEASUREMENT_ID, {
    anonymize_ip: true,
    send_page_view: true
  });

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
