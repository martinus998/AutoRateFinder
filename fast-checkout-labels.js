// Payment acceptance labels only. Real wallet buttons stay on Stripe Checkout.
// No payment requests, account changes, tracking or storage access in this file.
(() => {
  'use strict';
  if (window.__fastCheckoutLabelsV1) return;
  window.__fastCheckoutLabelsV1 = true;
  function mount() {
    const q = selector => document.querySelector(selector);
    const bill = !!q('body.dashboard-home, #premiumBtn');
    const auto = !!q('#reviewPay');
    const safe = !!q('#checkBtn') && !!q('#modalBody');
    const repair = !!q('#pro-package');
    if (!bill && !auto && !safe && !repair) return;
    // RepairCostMatch uses a separate account: Google Pay is not enabled there.
    const methods = repair ? ['Apple Pay', 'Link'] : ['Apple Pay', 'Google Pay'];
    const style = document.createElement('style');
    style.id = 'fast-checkout-labels-style';
    style.textContent = `
      .fx-wallets{box-sizing:border-box;display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:7px 18px;width:100%;max-width:1280px;margin:12px auto;padding:16px 20px;border:2px solid #43caff;border-radius:14px;background:linear-gradient(120deg,#082b51,#06172e);box-shadow:0 8px 26px rgba(0,130,255,.16);color:#f5fbff;font-family:inherit;line-height:1.35;text-align:left;position:relative;z-index:1;isolation:isolate}
      .fx-wallets *{box-sizing:border-box}
      .fx-wallets .fx-copy{min-width:0}
      .fx-wallets .fx-title{display:block;margin:0;color:#fff;font-size:18px;font-weight:800;letter-spacing:-.2px}
      .fx-wallets .fx-subtitle{display:block;margin-top:3px;color:#bce9ff;font-size:13px}
      .fx-wallets .fx-methods{display:flex;align-items:center;justify-content:flex-end;gap:10px;min-width:0}
      .fx-wallets .fx-method{display:inline-flex;align-items:center;justify-content:center;min-height:46px;padding:9px 18px;border:1px solid #dce7f3;border-radius:9px;background:#fff;color:#101828;font-size:20px;font-weight:700;letter-spacing:-.3px;line-height:1.2;white-space:nowrap;cursor:default}
      .fx-wallets .fx-note{grid-column:1 / -1;display:block;margin:1px 0 0;color:#b5c9dd;font-size:11px;line-height:1.45}
      .fx-wallets.fx-compact{grid-template-columns:1fr;padding:12px 14px;margin:10px 0;border-width:1px;gap:7px}
      .fx-wallets.fx-compact .fx-title{font-size:15px}
      .fx-wallets.fx-compact .fx-subtitle{display:none}
      .fx-wallets.fx-compact .fx-methods{justify-content:flex-start;flex-wrap:wrap}
      .fx-wallets.fx-compact .fx-method{min-height:39px;font-size:18px;padding:7px 15px}
      body.dashboard-home .hero>.fx-wallets{width:calc(100% - 24px);margin:12px}
      .fx-wallets.fx-page-top{width:calc(100% - 28px)}
      @media(max-width:640px){
        .fx-wallets{grid-template-columns:1fr;padding:12px 14px;gap:8px;margin:10px auto}
        .fx-wallets .fx-title{font-size:16px}
        .fx-wallets .fx-subtitle{font-size:12px}
        .fx-wallets .fx-methods{justify-content:flex-start;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
        .fx-wallets .fx-method{font-size:20px;min-height:43px;padding:8px 10px}
        .fx-wallets .fx-note{font-size:11px}
        .fx-wallets.fx-compact .fx-methods{display:flex}
      }
      @media print{.fx-wallets{display:none!important}}
    `;
    document.head.append(style);
    function add(target, position, id, compact = false, pageTop = false) {
      if (!target || document.getElementById(id)) return;
      const box = document.createElement('aside');
      box.id = id;
      box.className = 'fx-wallets' + (compact ? ' fx-compact' : '') + (pageTop ? ' fx-page-top' : '');
      box.setAttribute('aria-label', 'Fast payment options at Stripe checkout');
      const copy = document.createElement('div'); copy.className = 'fx-copy';
      const title = document.createElement('strong'); title.className = 'fx-title'; title.textContent = 'Pay faster with your wallet';
      const subtitle = document.createElement('span'); subtitle.className = 'fx-subtitle'; subtitle.textContent = 'Use your saved payment details at checkout.';
      copy.append(title, subtitle);
      const row = document.createElement('div'); row.className = 'fx-methods';
      methods.forEach(name => { const badge = document.createElement('span'); badge.className = 'fx-method'; badge.textContent = name; row.append(badge); });
      const note = document.createElement('small'); note.className = 'fx-note';
      note.textContent = 'Choose a supported wallet on Stripe. Availability depends on your device and setup. Cards also accepted.';
      box.append(copy, row, note);
      target.insertAdjacentElement(position, box);
    }
    if (bill) {

      const pricing = q('#pricing');
      if (pricing) add(pricing.querySelector('.pricingGrid') || pricing.firstElementChild, 'beforebegin', 'fx-wallets-plans');
    }
    if (auto) {

      add(q('#reviewPay'), 'afterend', 'fx-wallets-checkout', true);
    }
    if (safe) {
      add(q('.topnav') || q('.hero'), 'afterend', 'fx-wallets-home', false, true);
      const modal = q('#modalBody');
      const pricingNotice = () => add(modal.querySelector('.pricing-grid'), 'beforebegin', 'fx-wallets-plans', true);
      pricingNotice();
      new MutationObserver(pricingNotice).observe(modal, {childList:true});
    }
    if (repair) {

      const pro = q('#pro-package');
      add(pro.querySelector('.pro-secure-access') || pro.lastElementChild, 'beforebegin', 'fx-wallets-plans', true);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();

// Homepage hierarchy, 2026-10-04. Presentation only; does not call payment APIs,
// inspect form values, alter prices, storage, analytics or paid-access rules.
// Existing nodes are moved (not cloned), preserving IDs and event handlers.
(() => {
  'use strict';
  function mountHomeLayout() {
    if (!['/', '/index.html'].includes(location.pathname)) return;
    const auto = document.querySelector('main.review-page');
    const repair = document.querySelector('main.pro-shell');
    const main = auto || repair;
    if (!main || main.dataset.homeLayout === 'compact-v1') return;
    const hero = main.querySelector(auto ? '.review-layout' : '.pro-hero');
    if (!hero) return;
    main.dataset.homeLayout = 'compact-v1';
    document.body.classList.add('compact-home');

    // Put the service ahead of the offer in both visual and keyboard order.
    main.prepend(hero);
    const offer = main.querySelector('#homepage-offer');
    const sample = main.querySelector(auto ? '#quote-example' : '#pro-example');
    function foldSample(section, title) {
      if (!section) return;
      const details = section.querySelector(':scope > details');
      const summary = details && details.querySelector(':scope > summary');
      if (!details || !summary) return;
      const children = Array.from(section.children);
      const pivot = children.indexOf(details);
      const body = el => !el.matches('h2,.purchase-label,details');
      const intro = children.slice(0, pivot).filter(body);
      const tail = children.slice(pivot + 1).filter(body);
      let previous = summary;
      for (const el of intro) { previous.after(el); previous = el; }
      tail.forEach(el => details.append(el));
      summary.textContent = title;
      section.classList.add('home-sample');
    }
    foldSample(sample, auto ? 'View a sample report' : 'View a sample quote checklist');
    if (offer) {
      const note = offer.querySelector('.offer-note');
      if (note) {
        const more = document.createElement('details');
        more.className = 'home-offer-details';
        const summary = document.createElement('summary');
        summary.textContent = 'Offer details';
        note.before(more); more.append(summary, note);
      }
    }

    if (auto) {
      const copy = hero.querySelector('.review-copy');
      const intro = copy && copy.querySelector(':scope > p:not(.review-fine)');
      if (intro) intro.textContent = 'See your yearly cost, deductible trade-offs and questions to ask — using the insurance quote you already have.';
      const proof = copy && copy.querySelector('.value-proof');
      const points = copy && copy.querySelector('.review-points');
      if (proof && points) points.hidden = true; // Duplicate benefit list, not functionality.
      if (copy) {
        const actions = document.createElement('div');
        actions.className = 'home-actions';
        const start = document.createElement('a');
        start.className = 'home-primary'; start.href = '#reviewForm';
        const price = main.querySelector('.review-price strong');
        start.textContent = price ? 'Review my quote · ' + price.textContent.trim() + ' →' : 'Enter my quote details →';
        const preview = document.createElement('a');
        preview.className = 'home-secondary'; preview.href = '#quote-example'; preview.textContent = 'View sample';
        actions.append(start, preview);
        if (intro) intro.after(actions); else copy.append(actions);
      }
      const subtitle = hero.querySelector('.review-card > .subtitle');
      if (subtitle) subtitle.textContent = 'Enter the quote you received. Your personal report unlocks after payment.';
      const more = document.createElement('div'); more.className = 'home-more-grid';
      if (offer) more.append(offer);
      if (sample) more.append(sample);
      if (more.children.length) hero.after(more);
      const extras = main.querySelector('#reviewForm .review-extras');
      if (extras && !extras.closest('details')) {
        const details = document.createElement('details'); details.className = 'review-optional home-extras';
        const summary = document.createElement('summary'); summary.textContent = 'Coverage extras (optional)';
        const label = extras.previousElementSibling;
        extras.before(details); details.append(summary, extras);
        if (label && label.classList.contains('review-section-label')) details.append(label);
      }
    } else {
      const copy = hero.querySelector('.hero-copy');
      const intro = copy && copy.querySelector(':scope > p');
      if (intro) intro.textContent = 'Describe cracks, water or uneven floors. Get a planning cost range and the next steps before you hire.';
      const start = copy && copy.querySelector('.hero-actions .js-start');
      if (start) start.textContent = 'Start free check →';
      const calculator = copy && copy.querySelector('.hero-actions a.secondary');
      if (calculator) calculator.textContent = 'Cost calculator';
      if (offer) {
        hero.after(offer);
        const qr = copy && copy.querySelector(':scope > .qr-entry');
        if (qr) { qr.classList.add('home-qr-link'); offer.append(qr); }
        const proLink = copy && copy.querySelector(':scope > .hero-pro-link');
        const more = offer.querySelector('.home-offer-details');
        if (proLink && more) more.append(proLink);
      }
      const snapshot = hero.querySelector('.snapshot-card');
      const issues = snapshot && snapshot.querySelector('.mini-issues');
      if (snapshot && issues) {
        const rest = Array.from(snapshot.children).filter(el => el !== issues);
        const title = document.createElement('h2'); title.className = 'home-quick-title'; title.textContent = 'What do you see?';
        const details = document.createElement('details'); details.className = 'home-cost-details';
        const summary = document.createElement('summary'); summary.textContent = 'About the planning range';
        details.append(summary, ...rest); snapshot.append(title, issues, details);
      }
      const problems = main.querySelector('#problems');
      if (problems) (offer || hero).after(problems);
      const pro = main.querySelector('#pro-package');
      const more = document.createElement('div'); more.className = 'home-more-grid';
      if (sample) more.append(sample);
      if (pro) {
        more.append(pro);
        pro.querySelectorAll('.plan-card').forEach(card => {
          const list = card.querySelector(':scope > .plan-list');
          if (!list) return;
          const details = document.createElement('details'); details.className = 'home-plan-details';
          const summary = document.createElement('summary'); summary.textContent = 'See included tools';
          list.before(details); details.append(summary, list);
          const features = card.querySelector(':scope > .pro-feature-grid');
          if (features) details.append(features);
        });
      }
      if (more.children.length) (problems || offer || hero).after(more);
      const guides = main.querySelector('#guides .guide-links');
      if (guides) {
        const details = document.createElement('details'); details.className = 'home-guides-details';
        const summary = document.createElement('summary'); summary.textContent = 'Browse repair guides and calculators';
        guides.before(details); details.append(summary, guides);
      }
    }
    // Expands the actual sample; never opens checkout or exposes a paid report.
    main.addEventListener('click', event => {
      const link = event.target instanceof Element ? event.target.closest('a') : null;
      if (link && sample && link.getAttribute('href') === '#' + sample.id) {
        const details = sample.querySelector(':scope > details');
        if (details) details.open = true;
      }
    });
    if (sample && location.hash === '#' + sample.id) {
      const details = sample.querySelector(':scope > details');
      if (details) details.open = true;
    }
  }
  if (document.readyState === 'complete') mountHomeLayout();
  else {
    // Run after the existing deferred homepage modules and their DOM-ready handlers.
    document.addEventListener('DOMContentLoaded', () => setTimeout(mountHomeLayout, 0), {once:true});
    window.addEventListener('load', mountHomeLayout, {once:true});
  }
})();
