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
    var successBox = form.querySelector('[data-success]');
    var errorBox = form.querySelector('[data-error]');
    var errorText = form.querySelector('[data-error-text]');
    var showFormError = function (msg) {
      if (errorBox) {
        if (errorText && msg) errorText.textContent = msg;
        errorBox.hidden = false;
        if (errorBox.scrollIntoView) errorBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        alert(msg || 'Sorry — we couldn\'t send that. Please try again or email info@medicalans.com.');
      }
    };
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var submitBtn = form.querySelector('button[type="submit"]');
      var fd = new FormData(form);
      if (errorBox) errorBox.hidden = true;
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending…'; }
      fetch(form.action, { method: 'POST', body: fd })
        .then(function (r) { return r.json().catch(function () { return { success: r.ok }; }); })
        .then(function (d) {
          if (d && d.success) {
            var fields = form.querySelectorAll('input, select, textarea, button');
            fields.forEach(function (f) { f.disabled = true; });
            form.querySelectorAll('.field').forEach(function (f) {
              if (!f.hasAttribute('data-success')) f.style.opacity = '0.45';
            });
            if (successBox) {
              successBox.hidden = false;
              if (successBox.scrollIntoView) successBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
          } else {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send to solutions engineering'; }
            showFormError((d && d.error) || 'Something went wrong on our end');
          }
        })
        .catch(function () {
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send to solutions engineering'; }
          showFormError('We couldn\'t reach the server');
        });
    });
  }

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Hero background — self-healing mesh network.
  // A redundant mesh carries continuous multi-hop traffic. Every few seconds
  // one node fails (coral): its links drop and in-flight packets visibly
  // reroute around the break. Moments later the node is repaired (teal ring)
  // and links re-establish. Efficiency + resilience, on loop.
  // Pauses off-screen; renders one static frame under prefers-reduced-motion.
  (function () {
    var canvas = document.getElementById('hero-net');
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);

    var INK = '14, 79, 110';     // healthy links and nodes
    var TEAL = '35, 181, 163';   // traffic, reroutes, repairs
    var CORAL = '231, 111, 81';  // failures (--coral)

    var W = 0, H = 0, frame = 0;
    var nodes = [], edges = [], adj = [], packets = [], rings = [];
    var downIdx = -1, repairFrame = 0, nextFailFrame = 0;
    var running = false, rafId = null;

    function buildMesh() {
      nodes = []; edges = []; adj = []; packets = []; rings = [];
      downIdx = -1; nextFailFrame = frame + 300;
      // jittered grid keeps coverage even; jitter keeps it organic
      var spacing = 175;
      var cols = Math.max(3, Math.round(W / spacing));
      var rows = Math.max(3, Math.round(H / spacing));
      var cw = W / cols, ch = H / rows;
      var i, j;
      for (i = 0; i < rows; i++) {
        for (j = 0; j < cols; j++) {
          nodes.push({
            x0: (j + 0.5) * cw + (Math.random() - 0.5) * cw * 0.55,
            y0: (i + 0.5) * ch + (Math.random() - 0.5) * ch * 0.55,
            x: 0, y: 0,
            phase: Math.random() * 6.283,
            r: 1.6 + Math.random() * 1.3,
            down: false, failFrame: -1e9, repairFrame: -1e9
          });
        }
      }
      // each node links to its 3 nearest neighbours → multiple paths everywhere
      var seen = {};
      adj = nodes.map(function () { return []; });
      for (i = 0; i < nodes.length; i++) {
        var d = [];
        for (j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          var dx = nodes[i].x0 - nodes[j].x0, dy = nodes[i].y0 - nodes[j].y0;
          d.push([dx * dx + dy * dy, j]);
        }
        d.sort(function (a, b) { return a[0] - b[0]; });
        for (var k = 0; k < 3 && k < d.length; k++) {
          var lo = Math.min(i, d[k][1]), hi = Math.max(i, d[k][1]);
          if (!seen[lo + '-' + hi]) {
            seen[lo + '-' + hi] = true;
            edges.push([lo, hi]);
            adj[lo].push(hi); adj[hi].push(lo);
          }
        }
      }
      wobble();
    }

    function wobble() {
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x = n.x0 + Math.sin(frame * 0.006 + n.phase) * 4;
        n.y = n.y0 + Math.cos(frame * 0.005 + n.phase * 1.7) * 4;
      }
    }

    // BFS shortest path that avoids down nodes — the "routing protocol"
    function findPath(src, dst) {
      if (nodes[src].down || nodes[dst].down) return null;
      var prev = [], i;
      for (i = 0; i < nodes.length; i++) prev.push(-1);
      var q = [src]; prev[src] = src;
      while (q.length) {
        var cur = q.shift();
        if (cur === dst) break;
        for (i = 0; i < adj[cur].length; i++) {
          var nx = adj[cur][i];
          if (prev[nx] === -1 && !nodes[nx].down) { prev[nx] = cur; q.push(nx); }
        }
      }
      if (prev[dst] === -1) return null;
      var path = [dst];
      while (path[0] !== src) path.unshift(prev[path[0]]);
      return path;
    }

    function spawnPacket() {
      var src = Math.floor(Math.random() * nodes.length);
      var dst = Math.floor(Math.random() * nodes.length);
      if (src === dst || nodes[src].down || nodes[dst].down) return;
      var path = findPath(src, dst);
      if (path && path.length >= 3) {
        packets.push({
          x: nodes[src].x, y: nodes[src].y,
          last: src, queue: path.slice(1), flash: 0
        });
      }
    }

    function ring(x, y, color, max) {
      rings.push({ x: x, y: y, start: frame, color: color, max: max });
    }

    // Link opacity factor contributed by one endpoint: fades out fast on
    // failure, fades back in after repair.
    function linkMult(n) {
      if (n.down) return Math.max(0.12, 1 - (frame - n.failFrame) / 25);
      return Math.min(1, (frame - n.repairFrame) / 50);
    }

    function draw() {
      ctx.clearRect(0, 0, W, H);
      frame++;
      wobble();

      // ── failure / repair scheduler — one break at a time
      if (downIdx === -1 && frame >= nextFailFrame) {
        var pick = -1, tries = 0;
        do { pick = Math.floor(Math.random() * nodes.length); tries++; }
        while (tries < 25 && adj[pick].length < 3);
        downIdx = pick;
        nodes[pick].down = true;
        nodes[pick].failFrame = frame;
        ring(nodes[pick].x, nodes[pick].y, CORAL, 26);
        repairFrame = frame + 210 + Math.floor(Math.random() * 90);
      }
      if (downIdx !== -1 && frame >= repairFrame) {
        var nd = nodes[downIdx];
        nd.down = false;
        nd.repairFrame = frame;
        ring(nd.x, nd.y, TEAL, 32);
        downIdx = -1;
        nextFailFrame = frame + 300 + Math.floor(Math.random() * 240);
      }

      // ── links
      ctx.lineWidth = 0.8;
      for (var e = 0; e < edges.length; e++) {
        var a = nodes[edges[e][0]], b = nodes[edges[e][1]];
        var broken = a.down || b.down;
        var alpha = 0.22 * linkMult(a) * linkMult(b);
        ctx.strokeStyle = 'rgba(' + (broken ? CORAL : INK) + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }

      // ── event rings (break / repair / reroute pulses)
      for (var ri = rings.length - 1; ri >= 0; ri--) {
        var rg = rings[ri];
        var t = (frame - rg.start) / 55;
        if (t >= 1) { rings.splice(ri, 1); continue; }
        ctx.strokeStyle = 'rgba(' + rg.color + ',' + ((1 - t) * 0.7).toFixed(3) + ')';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(rg.x, rg.y, 3 + t * rg.max, 0, 6.283); ctx.stroke();
      }
      ctx.lineWidth = 0.8;

      // ── nodes
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        if (n.down) {
          var pulse = 0.6 + 0.35 * Math.sin((frame - n.failFrame) * 0.18);
          ctx.fillStyle = 'rgba(' + CORAL + ',' + pulse.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 1.4, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgba(' + CORAL + ',0.18)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 7, 0, 6.283); ctx.fill();
        } else if (frame - n.repairFrame < 60) {
          // freshly repaired — teal glow easing back to normal
          var heal = 1 - (frame - n.repairFrame) / 60;
          ctx.fillStyle = 'rgba(' + TEAL + ',0.85)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 0.5, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgba(' + TEAL + ',' + (0.2 * heal).toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 6, 0, 6.283); ctx.fill();
        } else if (adj[i].length >= 5) {
          // highly-connected hub — quiet teal accent
          ctx.fillStyle = 'rgba(' + TEAL + ',0.7)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 0.4, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(' + INK + ',0.5)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
        }
      }

      // ── packets
      if (frame % 30 === 0 && packets.length < 10) spawnPacket();
      for (var pi = packets.length - 1; pi >= 0; pi--) {
        var p = packets[pi];
        if (!p.queue.length) { packets.splice(pi, 1); continue; }

        // next hop went down → reroute from the last safe node (U-turn)
        if (nodes[p.queue[0]].down) {
          var dest = p.queue[p.queue.length - 1];
          var np = nodes[dest].down ? null : findPath(p.last, dest);
          if (np) {
            p.queue = np.slice(1);
            p.flash = 30;
            ring(p.x, p.y, TEAL, 14);
          } else {
            ring(p.x, p.y, CORAL, 10);
            packets.splice(pi, 1);
            continue;
          }
        }

        var tg = nodes[p.queue[0]];
        var dx = tg.x - p.x, dy = tg.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 2.2) {
          p.last = p.queue.shift();
          if (!p.queue.length) { packets.splice(pi, 1); continue; }
        } else {
          p.x += (dx / dist) * 1.4;
          p.y += (dy / dist) * 1.4;
        }

        var glow = p.flash > 0 ? 0.35 : 0.2;
        if (p.flash > 0) p.flash--;
        ctx.fillStyle = 'rgba(' + TEAL + ',0.95)';
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.7, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(' + TEAL + ',' + glow + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, 6.283); ctx.fill();
      }
    }

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildMesh();
      if (prefersReduced || !running) draw();
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

    if (prefersReduced) return;

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
