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

  // Contact form — posts to central /customer-form.php; emails customer via Resend.
  var form = document.querySelector('form[data-contact]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var success = form.querySelector('[data-success]');
      var submitBtn = form.querySelector('button[type="submit"]');
      var fd = new FormData(form);
      fd.append('_form_type', 'Contact Form');
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      fetch(form.action, { method: 'POST', body: fd })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (d) {
          if (d && d.success) {
            var fields = form.querySelectorAll('input, select, textarea, button');
            fields.forEach(function (f) { f.disabled = true; });
            if (success) success.hidden = false;
            form.querySelectorAll('.field').forEach(function (f) {
              if (!f.hasAttribute('data-success')) f.style.opacity = '0.45';
            });
          } else {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send to solutions engineering'; }
            alert((d && d.error) || 'Sorry — we couldn\'t send that. Please try again or email info@medicalans.com.');
          }
        })
        .catch(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send to solutions engineering'; }
          alert('Sorry — we couldn\'t reach the server. Please try again or email info@medicalans.com.');
        });
    });
  }

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero background — live network topology canvas.
  // Drifting nodes, proximity edges, packets traveling between linked nodes.
  // Light-theme palette; pauses off-screen; static single frame on reduced-motion.
  (function () {
    var canvas = document.getElementById('hero-net');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, nodes = [], packets = [], running = false, rafId = null;
    var LINK_DIST = 180;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(14, Math.min(36, Math.floor((W * H) / 38000)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.14,
          vy: (Math.random() - 0.5) * 0.14,
          r: 1.2 + Math.random() * 1.8,
          hub: Math.random() < 0.18
        });
      }
      packets = [];
    }

    function spawnPacket() {
      if (!nodes.length) return;
      var a = nodes[Math.floor(Math.random() * nodes.length)];
      var best = null, bestD = Infinity;
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n === a) continue;
        var dx = n.x - a.x, dy = n.y - a.y, d = dx * dx + dy * dy;
        if (d < bestD && d < LINK_DIST * LINK_DIST) { bestD = d; best = n; }
      }
      if (best) packets.push({ a: a, b: best, t: 0, speed: 0.005 + Math.random() * 0.008 });
    }

    var frame = 0;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      frame++;

      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }

      ctx.lineWidth = 0.7;
      for (i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            var alpha = (1 - dist / LINK_DIST) * 0.3;
            ctx.strokeStyle = 'rgba(14, 79, 110,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.hub) {
          ctx.fillStyle = 'rgba(35, 181, 163, 0.85)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 0.6, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgba(35, 181, 163, 0.14)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 5, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(14, 79, 110, 0.5)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
        }
      }

      if (frame % 55 === 0 && packets.length < 8) spawnPacket();
      for (i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        var px = p.a.x + (p.b.x - p.a.x) * p.t;
        var py = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = 'rgba(35, 181, 163, 0.95)';
        ctx.beginPath(); ctx.arc(px, py, 1.7, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(35, 181, 163, 0.2)';
        ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 6.283); ctx.fill();
      }
    }

    function loop() {
      if (!running) return;
      draw();
      rafId = requestAnimationFrame(loop);
    }
    function start() { if (!running) { running = true; rafId = requestAnimationFrame(loop); } }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    resize();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 180); });

    if (prefersReduced) { draw(); return; }

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.05 }).observe(canvas);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { stop(); } else if (!prefersReduced) { start(); }
    });
  })();

  // Hero NOC console — latency readout jitter (10–14 ms)
  var nocLatency = document.querySelector('[data-noc-latency]');
  if (nocLatency && !prefersReduced) {
    setInterval(function () {
      nocLatency.textContent = 10 + Math.floor(Math.random() * 5);
    }, 1800);
  }

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
      // More sites = more carrier-consolidation opportunity. Single site is
      // mostly circuit right-sizing (10-15%). At ~25+ sites, the full
      // industry-typical consolidation range applies (20-35%). The curve
      // ramps smoothly in between.
      var consolidationFactor = Math.min(1, sites / 25);
      var lowPercent = 0.10 + (0.10 * consolidationFactor);   // 10% → 20%
      var highPercent = 0.15 + (0.20 * consolidationFactor);  // 15% → 35%
      var lowAnnual = spend * 12 * lowPercent;
      var highAnnual = spend * 12 * highPercent;
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

  // Practice-card tilt (mouse-follow micro-parallax). Skip on touch and reduced-motion.
  var isTouch = 'ontouchstart' in window || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  if (!prefersReduced && !isTouch) {
    document.querySelectorAll('.practice-card').forEach(function (card) {
      card.addEventListener('mouseenter', function () { card.classList.add('is-tilting'); });
      card.addEventListener('mousemove', function (e) {
        var rect = card.getBoundingClientRect();
        var px = (e.clientX - rect.left) / rect.width - 0.5;
        var py = (e.clientY - rect.top) / rect.height - 0.5;
        var rotX = (-py * 4).toFixed(2);
        var rotY = (px * 4).toFixed(2);
        card.style.transform = 'translateY(-4px) perspective(900px) rotateX(' + rotX + 'deg) rotateY(' + rotY + 'deg)';
      });
      card.addEventListener('mouseleave', function () {
        card.classList.remove('is-tilting');
        card.style.transform = '';
      });
    });
  }

  // Reading progress bar (driven by .read-progress markup in insights posts)
  var progFill = document.querySelector('.read-progress-fill');
  if (progFill) {
    var ticking = false;
    function updateProgress() {
      var h = document.documentElement;
      var max = h.scrollHeight - h.clientHeight;
      var pct = max > 0 ? (h.scrollTop / max) * 100 : 0;
      progFill.style.width = Math.min(100, Math.max(0, pct)) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) {
        requestAnimationFrame(updateProgress);
        ticking = true;
      }
    }, { passive: true });
    updateProgress();
  }

  // Section rail scroll-spy
  var railLinks = document.querySelectorAll('.section-rail a');
  if (railLinks.length && 'IntersectionObserver' in window) {
    var railTargets = [];
    railLinks.forEach(function (a) {
      var t = document.querySelector(a.getAttribute('href'));
      if (t) railTargets.push({ link: a, el: t });
    });
    var railObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var id = entry.target.id;
          railLinks.forEach(function (a) {
            a.classList.toggle('is-active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-30% 0px -55% 0px' });
    railTargets.forEach(function (t) { railObs.observe(t.el); });
  }
})();
