(function () {
  var D = document, rm = matchMedia('(prefers-reduced-motion:reduce)').matches, $ = function (s, r) { return Array.prototype.slice.call((r || D).querySelectorAll(s)) };
  D.documentElement.classList.add('js');
  var sleep = function (t) { return new Promise(function (r) { setTimeout(r, t) }) };

  /* barra de progresso de rolagem */
  var sp = D.createElement('div'); sp.className = 'sp'; D.body.appendChild(sp);
  function prog() { var h = D.documentElement.scrollHeight - innerHeight; sp.style.width = (h > 0 ? scrollY / h * 100 : 0) + '%' }
  addEventListener('scroll', prog, { passive: true }); prog();

  /* revelar ao rolar (escalonado) */
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target) } }) }, { threshold: .12 });
  $('.card,.panel,.notice,.section-head,.table-wrap,.page-title,.page-intro,main>.eyebrow,.map-preview .block,.data-table tbody tr').forEach(function (e) {
    var i = [].indexOf.call(e.parentNode.children, e); e.classList.add('rv'); e.style.setProperty('--i', Math.min(i, 8));
    if (e.tagName === 'TR') e.style.setProperty('--t', 'translateX(-24px)'); io.observe(e)
  });

  /* inclinação 3D dos cards ao passar o mouse */
  if (!rm && matchMedia('(hover:hover)').matches) $('.card').forEach(function (c) {
    c.addEventListener('pointermove', function (e) {
      var r = c.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
      c.style.transform = 'perspective(700px) rotateX(' + (-y * 10) + 'deg) rotateY(' + (x * 12) + 'deg) translateZ(8px)'
    });
    c.addEventListener('pointerleave', function () { c.style.transform = '' })
  });

  /* 2D — corredores de labirinto desenhados ao fundo */
  if (!rm) {
    var cv = D.createElement('canvas'), g = cv.getContext('2d'), W, H, S = 56, V = 2, R = []; cv.className = 'bg-run'; D.body.prepend(cv);
    var rs = function () { W = cv.width = innerWidth; H = cv.height = innerHeight }; rs(); addEventListener('resize', rs);
    var dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (var k = 0; k < 14; k++)R.push({ x: Math.floor(Math.random() * W / S) * S, y: Math.floor(Math.random() * H / S) * S, d: dirs[k % 4], c: k % 5 === 0 ? '217,38,29' : (k % 2 ? '0,153,0' : '104,185,44') });
    (function f() {
      if (!D.hidden) {
        g.globalCompositeOperation = 'destination-out'; g.fillStyle = 'rgba(0,0,0,.05)'; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
        R.forEach(function (r) {
          var ox = r.x, oy = r.y; r.x += r.d[0] * V; r.y += r.d[1] * V;
          if (r.x % S === 0 && r.y % S === 0 && Math.random() < .4) r.d = dirs[Math.floor(Math.random() * 4)];
          if (r.x < 0 || r.y < 0 || r.x > W || r.y > H) { r.d = [-r.d[0], -r.d[1]] }
          g.strokeStyle = 'rgba(' + r.c + ',.4)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(ox, oy); g.lineTo(r.x, r.y); g.stroke();
          g.fillStyle = 'rgb(' + r.c + ')'; g.beginPath(); g.arc(r.x, r.y, 3.5, 0, 7); g.fill()
        })
      }
      requestAnimationFrame(f)
    })()
  }

  /* 3D — labirinto isométrico que se constrói, é percorrido pelo pino e se refaz */
  function gen(n) {
    var g = [], i, j; for (i = 0; i < n; i++)g.push(Array(n).fill(1)); var st = [[1, 1]]; g[1][1] = 0;
    while (st.length) {
      var c = st[st.length - 1], x = c[0], y = c[1];
      var d = [[2, 0], [-2, 0], [0, 2], [0, -2]].filter(function (v) { var X = x + v[0], Y = y + v[1]; return X > 0 && Y > 0 && X < n - 1 && Y < n - 1 && g[Y][X] === 1 }).sort(function () { return Math.random() - .5 });
      if (!d.length) { st.pop(); continue } g[y + d[0][1] / 2][x + d[0][0] / 2] = 0; g[y + d[0][1]][x + d[0][0]] = 0; st.push([x + d[0][0], y + d[0][1]])
    }
    return g
  }
  function solve(g, n) {
    var key = function (x, y) { return x + ',' + y }, prev = {}, q = [[1, 1]]; prev[key(1, 1)] = null;
    while (q.length) {
      var c = q.shift(); if (c[0] === n - 2 && c[1] === n - 2) break;
      [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(function (v) { var X = c[0] + v[0], Y = c[1] + v[1]; if (!g[Y][X] && !(key(X, Y) in prev)) { prev[key(X, Y)] = c; q.push([X, Y]) } })
    }
    var p = [], c = [n - 2, n - 2]; while (c) { p.unshift(c); c = prev[key(c[0], c[1])] } return p
  }
  function mk(host, n, cs, cls) {
    var st = D.createElement('div'); st.className = cls; st.setAttribute('aria-hidden', 'true'); host.appendChild(st);
    var b = D.createElement('div'); b.className = 'm3-board'; b.style.width = b.style.height = n * cs + 'px'; st.appendChild(b);
    async function round() {
      b.className = 'm3-board'; b.innerHTML = ''; var g = gen(n), p = solve(g, n), h = cs * .9, x, y;
      for (y = 0; y < n; y++)for (x = 0; x < n; x++)if (g[y][x]) {
        var w = D.createElement('div'); w.className = 'w';
        w.style.cssText = 'left:' + x * cs + 'px;top:' + y * cs + 'px;width:' + cs + 'px;height:' + cs + 'px;--h:' + h + 'px;--d:' + ((x + y) * 45) + 'ms';
        w.innerHTML = '<i class="t"></i><i class="s"></i><i class="n"></i><i class="e"></i><i class="o"></i>'; b.appendChild(w)
      }
      var go = D.createElement('div'); go.className = 'go'; go.style.cssText = 'left:' + ((n - 2) * cs + cs * .15) + 'px;top:' + ((n - 2) * cs + cs * .15) + 'px;width:' + cs * .7 + 'px;height:' + cs * .7 + 'px'; b.appendChild(go);
      var pin = D.createElement('div'); pin.className = 'pin'; pin.style.cssText = 'width:' + cs + 'px;height:' + cs + 'px;transform:translate3d(' + cs + 'px,' + cs + 'px,0)';
      pin.innerHTML = '<u style="left:' + cs * .2 + 'px;top:' + cs * .2 + 'px;width:' + cs * .6 + 'px;height:' + cs * .6 + 'px"></u><b style="left:' + cs * .2 + 'px;top:' + cs * .15 + 'px;width:' + cs * .6 + 'px;height:' + cs * .6 + 'px"></b>'; b.appendChild(pin);
      if (rm) return; await sleep(1500 + n * 90);
      await pin.animate(p.map(function (c) { return { transform: 'translate3d(' + c[0] * cs + 'px,' + c[1] * cs + 'px,0)' } }), { duration: p.length * 150, easing: 'linear', fill: 'forwards' }).finished;
      await sleep(500); b.classList.add('out'); await sleep(1100); round()
    }
    round()
  }
  var hero = $('.hero')[0], main = $('main.container')[0];
  if (hero) mk(hero, 11, 22, 'm3 hero-m3'); else if (main) { main.style.position = 'relative'; mk(main, 7, 15, 'm3 page-m3') }

  /* 3D — rota animada no mapa esquemático */
  var mp = $('.map-preview')[0];
  if (mp) {
    var bl = $('.block', mp), ns = 'http://www.w3.org/2000/svg', sv = D.createElementNS(ns, 'svg'); sv.setAttribute('class', 'route'); mp.appendChild(sv);
    var draw = function () {
      var pt = [0, 1, 2, 5, 4].map(function (i) { var e = bl[i]; return [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2] });
      sv.setAttribute('viewBox', '0 0 ' + mp.offsetWidth + ' ' + mp.offsetHeight);
      sv.innerHTML = '<polyline class="rt" points="' + pt.join(' ') + '"/>' + (rm ? '' : '<circle class="rp" r="9"><animateMotion dur="6s" repeatCount="indefinite" path="M' + pt.join('L') + '"/></circle>')
    };
    draw(); addEventListener('resize', draw)
  }
})();
