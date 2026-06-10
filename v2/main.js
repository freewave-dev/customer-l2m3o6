(function () {
  'use strict';

  var prefersReduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Mobile nav
  var nav = document.getElementById('nav');
  var toggle = document.querySelector('.nav-toggle');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
    document.addEventListener('click', function (e) {
      if (!nav.contains(e.target)) nav.classList.remove('is-open');
    });
  }

  // Scroll reveals
  var revealEls = document.querySelectorAll('.rv');
  if ('IntersectionObserver' in window && !prefersReduced) {
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(function (el) { obs.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  }

  // Count-up stats
  function countUp(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    if (prefersReduced) { el.textContent = target; return; }
    var start = null;
    function tick(now) {
      if (!start) start = now;
      var t = Math.min(1, (now - start) / 1400);
      var eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(target * eased);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if ('IntersectionObserver' in window) {
    var statObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          countUp(entry.target);
          statObs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    document.querySelectorAll('[data-count]').forEach(function (el) { statObs.observe(el); });
  }

  // Latency ticker — small plausible jitter
  var lat = document.getElementById('lat');
  if (lat && !prefersReduced) {
    setInterval(function () {
      lat.textContent = 10 + Math.floor(Math.random() * 5); // 10–14 ms
    }, 1800);
  }

  // ===== Network topology canvas =====
  // Drifting nodes, proximity edges, packets traveling between linked nodes.
  function networkCanvas(canvas, density, packetRate) {
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var W = 0, H = 0, nodes = [], packets = [], running = false, rafId = null;
    var LINK_DIST = 170;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = rect.width; H = rect.height;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(18, Math.min(60, Math.floor((W * H) / density)));
      nodes = [];
      for (var i = 0; i < count; i++) {
        nodes.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (Math.random() - 0.5) * 0.18,
          vy: (Math.random() - 0.5) * 0.18,
          r: 1 + Math.random() * 1.8,
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
      if (best) packets.push({ a: a, b: best, t: 0, speed: 0.006 + Math.random() * 0.01 });
    }

    var frame = 0;
    function draw() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      frame++;

      // drift
      for (var i = 0; i < nodes.length; i++) {
        var n = nodes[i];
        n.x += n.vx; n.y += n.vy;
        if (n.x < -20) n.x = W + 20; if (n.x > W + 20) n.x = -20;
        if (n.y < -20) n.y = H + 20; if (n.y > H + 20) n.y = -20;
      }

      // edges
      ctx.lineWidth = 0.6;
      for (i = 0; i < nodes.length; i++) {
        for (var j = i + 1; j < nodes.length; j++) {
          var a = nodes[i], b = nodes[j];
          var dx = a.x - b.x, dy = a.y - b.y;
          var dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < LINK_DIST) {
            var alpha = (1 - dist / LINK_DIST) * 0.16;
            ctx.strokeStyle = 'rgba(96, 178, 198,' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      // nodes
      for (i = 0; i < nodes.length; i++) {
        n = nodes[i];
        if (n.hub) {
          ctx.fillStyle = 'rgba(63, 232, 205, 0.75)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 0.6, 0, 6.283); ctx.fill();
          ctx.fillStyle = 'rgba(63, 232, 205, 0.12)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 5, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(120, 190, 208, 0.4)';
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, 6.283); ctx.fill();
        }
      }

      // packets
      if (frame % packetRate === 0 && packets.length < 14) spawnPacket();
      for (i = packets.length - 1; i >= 0; i--) {
        var p = packets[i];
        p.t += p.speed;
        if (p.t >= 1) { packets.splice(i, 1); continue; }
        var px = p.a.x + (p.b.x - p.a.x) * p.t;
        var py = p.a.y + (p.b.y - p.a.y) * p.t;
        ctx.fillStyle = 'rgba(63, 232, 205, 0.9)';
        ctx.beginPath(); ctx.arc(px, py, 1.6, 0, 6.283); ctx.fill();
        ctx.fillStyle = 'rgba(63, 232, 205, 0.18)';
        ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.283); ctx.fill();
      }

      rafId = requestAnimationFrame(draw);
    }

    function start() { if (!running) { running = true; rafId = requestAnimationFrame(draw); } }
    function stop() { running = false; if (rafId) cancelAnimationFrame(rafId); }

    resize();
    var rT;
    window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(resize, 180); });

    if (prefersReduced) {
      // static render: one frame of nodes + edges, no loop
      running = true; draw(); running = false;
      return;
    }

    // only animate while on screen
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (e) { e.isIntersecting ? start() : stop(); });
      }, { threshold: 0.05 }).observe(canvas);
    } else {
      start();
    }
    document.addEventListener('visibilitychange', function () {
      document.hidden ? stop() : start();
    });
  }

  networkCanvas(document.getElementById('net'), 26000, 40);
  networkCanvas(document.getElementById('net2'), 38000, 70);
})();
