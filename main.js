(function () {
  'use strict';

  // Mobile nav toggle
  var toggle = document.querySelector('.nav-toggle');
  var bar = document.querySelector('.nav-bar');
  if (toggle && bar) {
    toggle.addEventListener('click', function () {
      var open = bar.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!bar.contains(e.target)) bar.classList.remove('is-open');
    });
  }

  // Mark active nav link
  var path = window.location.pathname.replace(/\/index\.html$/, '/').replace(/\/+$/, '/');
  if (path === '') path = '/';
  document.querySelectorAll('.nav-links a').forEach(function (a) {
    var href = a.getAttribute('href');
    if (!href) return;
    var normalized = href.replace(/^\.\//, '/').replace(/\/index\.html$/, '/').replace(/\/+$/, '/');
    if (normalized === '') normalized = '/';
    if (normalized === path || (normalized !== '/' && path.indexOf(normalized) === 0)) {
      a.classList.add('is-active');
    }
  });

  // Contact form — friendly stub (no backend yet; will be wired to /customer-form.php)
  var form = document.querySelector('form[data-contact]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var success = form.querySelector('[data-success]');
      var fields = form.querySelectorAll('input, select, textarea, button');
      fields.forEach(function (f) { f.disabled = true; });
      if (success) success.hidden = false;
      form.querySelectorAll('.field').forEach(function (f) { f.style.opacity = '0.45'; });
    });
  }

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Stat count-up on viewport enter.
  // Markup: <span data-count-up data-target="20" data-suffix="+" data-decimals="0">
  function animateCount(el) {
    if (prefersReduced) {
      var t = parseFloat(el.getAttribute('data-target'));
      var d = parseInt(el.getAttribute('data-decimals') || '0', 10);
      el.textContent = t.toFixed(d) + (el.getAttribute('data-suffix') || '');
      return;
    }
    var target = parseFloat(el.getAttribute('data-target'));
    var suffix = el.getAttribute('data-suffix') || '';
    var decimals = parseInt(el.getAttribute('data-decimals') || '0', 10);
    var duration = parseInt(el.getAttribute('data-duration') || '1400', 10);
    var start = performance.now();
    function tick(now) {
      var elapsed = now - start;
      var t = Math.min(1, elapsed / duration);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = (target * eased).toFixed(decimals) + suffix;
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = target.toFixed(decimals) + suffix;
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          statObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    document.querySelectorAll('[data-count-up]').forEach(function (el) {
      el.textContent = '0' + (el.getAttribute('data-suffix') || '');
      statObs.observe(el);
    });
  }

  // Diagram reveal on viewport enter
  if ('IntersectionObserver' in window) {
    var diagramObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          diagramObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.2 });
    document.querySelectorAll('.diagram-reveal').forEach(function (el) {
      diagramObs.observe(el);
    });
  }

  // WAN ROI calculator
  var roi = document.querySelector('[data-roi]');
  if (roi) {
    var sitesEl = roi.querySelector('[data-roi-sites]');
    var spendEl = roi.querySelector('[data-roi-spend]');
    var lowOut = roi.querySelector('[data-roi-low]');
    var highOut = roi.querySelector('[data-roi-high]');
    var annualOut = roi.querySelector('[data-roi-annual]');
    var sitesLabel = roi.querySelector('[data-roi-sites-label]');
    var spendLabel = roi.querySelector('[data-roi-spend-label]');
    function fmt(n) { return '$' + Math.round(n).toLocaleString('en-US'); }
    function recompute() {
      var sites = parseInt(sitesEl.value, 10) || 0;
      var spend = parseInt(spendEl.value, 10) || 0;
      if (sitesLabel) sitesLabel.textContent = sites + (sites === 1 ? ' site' : ' sites');
      if (spendLabel) spendLabel.textContent = fmt(spend) + ' / month';
      var lowAnnual = spend * 12 * 0.20;
      var highAnnual = spend * 12 * 0.35;
      var twoYearLow = lowAnnual * 2 * 0.85;
      var twoYearHigh = highAnnual * 2 * 0.95;
      if (lowOut) lowOut.textContent = fmt(twoYearLow);
      if (highOut) highOut.textContent = fmt(twoYearHigh);
      if (annualOut) annualOut.textContent = fmt(lowAnnual) + '–' + fmt(highAnnual);
    }
    if (sitesEl) sitesEl.addEventListener('input', recompute);
    if (spendEl) spendEl.addEventListener('input', recompute);
    recompute();
  }
})();
