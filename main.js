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
})();
