/* ============ NECRO v2 · GRAPHICS LAYER ============
   Подменяет функции отрисовки игры на «рукотворные» версии:
   двухтональные спрайты, контуры, свечения, тайлы по биомам. */
(function () {
  'use strict';
  var N = window.__necro;
  if (!N || !N.gfx || !N.w2s) return;
  var cv = document.getElementById('cv');
  var ctx = cv ? cv.getContext('2d') : null;
  if (!ctx) return;
  var TAU = Math.PI * 2;
  var VW = 800, VH = 600;

  function W2S(x, y) { return N.w2s(x, y); }
  function hash(x, y) {
    var n = (x * 374761393 + y * 668265263) | 0;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    n ^= n >>> 16;
    return (n >>> 0) / 4294967296;
  }
  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }

  /* ---------- мягкие спрайты ---------- */
  function mkGlow(r, g, b) {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var q = c.getContext('2d');
    var gr = q.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    gr.addColorStop(0.35, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    q.fillStyle = gr; q.fillRect(0, 0, 64, 64);
    return c;
  }
  var GLOW = {
    green: mkGlow(159, 232, 176), gold: mkGlow(232, 179, 74),
    purple: mkGlow(154, 111, 207), red: mkGlow(220, 80, 90),
    blue: mkGlow(120, 170, 235), white: mkGlow(240, 232, 214),
    orange: mkGlow(255, 150, 70)
  };
  var glowCache = {};
  function glowHex(hex, x, y, r, a) {
    var g = glowCache[hex];
    if (!g) {
      var rr = parseInt(hex.slice(1, 3), 16), gg = parseInt(hex.slice(3, 5), 16), bb = parseInt(hex.slice(5, 7), 16);
      g = glowCache[hex] = mkGlow(rr, gg, bb);
    }
    glow(g, x, y, r, a);
  }
  function glow(img, x, y, r, a) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a == null ? 1 : a;
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  var SHADOW = (function () {
    var c = document.createElement('canvas'); c.width = c.height = 64;
    var q = c.getContext('2d');
    var g = q.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(0,0,0,0.5)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.26)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    q.fillStyle = g; q.fillRect(0, 0, 64, 64);
    return c;
  })();
  function shadowAt(x, y, r) { ctx.drawImage(SHADOW, x - r * 1.2, y - r * 0.5, r * 2.4, r * 1.05); }

  var INK = 'rgba(11,7,17,0.92)';
  function OL(w) { ctx.strokeStyle = INK; ctx.lineWidth = w || 1.6; ctx.stroke(); }
  function ell(x, y, rx, ry) { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); }
  function circ(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }
  function line(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }
  function bar(x, y, w, h, p, col) {
    p = clamp01(p);
    ctx.fillStyle = 'rgba(5,3,10,0.85)';
    ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = col;
    ctx.fillRect(x - w / 2, y, w * p, h);
    ctx.fillStyle = 'rgba(255,255,255,0.16)';
    ctx.fillRect(x - w / 2, y, w * p, 1);
  }

  /* ================= ПОЛ ПО БИОМАМ ================= */
  var BIOME_TILES = [
    ['#120d1d', '#161024', '#1a142b', '#0e0a17'],
    ['#0f1710', '#121c12', '#172317', '#0b140c'],
    ['#120e1e', '#171228', '#0f0c18', '#1a142e'],
    ['#1b0e12', '#201116', '#160a0c', '#241419']
  ];
  var TILE_SETS = [];
  function buildTiles(bi) {
    var cols = BIOME_TILES[bi], set = [];
    for (var v = 0; v < 8; v++) {
      var c = document.createElement('canvas'); c.width = c.height = 64;
      var q = c.getContext('2d');
      q.fillStyle = cols[v % cols.length]; q.fillRect(0, 0, 64, 64);
      for (var i = 0; i < 7; i++) {
        q.fillStyle = Math.random() < .5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,255,255,0.03)';
        q.beginPath(); q.arc(Math.random() * 64, Math.random() * 64, 3 + Math.random() * 9, 0, TAU); q.fill();
      }
      q.strokeStyle = 'rgba(0,0,0,0.30)'; q.lineWidth = 1; q.strokeRect(0.5, 0.5, 63, 63);
      if (Math.random() < .6) {
        q.strokeStyle = 'rgba(0,0,0,0.34)'; q.beginPath();
        var cx = Math.random() * 64, cy = Math.random() * 64; q.moveTo(cx, cy);
        for (var s = 0; s < 3; s++) { cx += (Math.random() - .5) * 24; cy += (Math.random() - .5) * 24; q.lineTo(cx, cy); }
        q.stroke();
      }
      set.push(c);
    }
    return set;
  }
  for (var b0 = 0; b0 < 4; b0++) TILE_SETS.push(buildTiles(b0));

  var gPrevBi = -1, gPrevOld = 0, gTrStart = -99;
  function drawFloor() {
    var cam = N.cam(); VW = cam.w; VH = cam.h;
    var G = N.G;
    var bi = (G && G.biomeIdx) || 0;
    if (gPrevBi !== bi) {
      if (gPrevBi >= 0) { gPrevOld = gPrevBi; gTrStart = performance.now() / 1000; }
      gPrevBi = bi;
    }
    var set = TILE_SETS[bi];
    var o = W2S(0, 0), ox = o[0], oy = o[1];
    var tx0 = Math.floor(-ox / 64) - 1, ty0 = Math.floor(-oy / 64) - 1;
    var cols = Math.ceil(VW / 64) + 3, rows = Math.ceil(VH / 64) + 3;
    var now = performance.now() / 1000;
    for (var j = 0; j < rows; j++) for (var i = 0; i < cols; i++) {
      var wx = tx0 + i, wy = ty0 + j;
      var sx = wx * 64 + ox, sy = wy * 64 + oy;
      var h = hash(wx, wy);
      ctx.drawImage(set[(h * 8) | 0], sx, sy);
      var h2 = hash(wx * 31 + 7, wy * 17 + 3);
      if (h2 > 0.988) {
        // свеча
        var cxx = sx + 14 + h * 36, cyy = sy + 18 + h2 * 20, fl = .8 + .25 * Math.sin(now * 7 + wx * 3.1);
        glow(GLOW.gold, cxx, cyy - 7, 13 * fl, .35);
        ctx.fillStyle = '#d9cfb4'; ctx.fillRect(cxx - 1.5, cyy - 5, 3, 6);
        ctx.fillStyle = '#ffcf6e'; circ(cxx, cyy - 6.5, 1.6 * fl); ctx.fill();
      } else if (h2 < 0.013) {
        // кучка костей
        ctx.strokeStyle = 'rgba(216,207,182,0.5)'; ctx.lineWidth = 2;
        line(sx + 22, sy + 34, sx + 34, sy + 38); line(sx + 36, sy + 30, sx + 26, sy + 40);
        ctx.fillStyle = 'rgba(216,207,182,0.55)'; circ(sx + 30, sy + 32, 3.2); ctx.fill();
      } else if (bi === 1 && h2 > 0.02 && h2 < 0.034) {
        // болотные грибы
        ctx.fillStyle = 'rgba(150,200,120,0.4)';
        circ(sx + 20 + h * 20, sy + 40, 2.4); ctx.fill();
        circ(sx + 30 + h * 14, sy + 44, 1.7); ctx.fill();
      } else if (bi === 2 && h2 > 0.96 && h2 < 0.975) {
        // каменная плита
        ctx.fillStyle = 'rgba(0,0,0,0.34)'; ctx.fillRect(sx + 12, sy + 14, 40, 30);
        ctx.strokeStyle = 'rgba(190,170,220,0.14)'; ctx.lineWidth = 1; ctx.strokeRect(sx + 12.5, sy + 14.5, 39, 29);
      } else if (bi === 3 && h2 > 0.018 && h2 < 0.032) {
        // рёбра
        ctx.strokeStyle = 'rgba(200,170,160,0.28)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx + 32, sy + 36, 10, Math.PI * .15, Math.PI * .85); ctx.stroke();
        ctx.beginPath(); ctx.arc(sx + 32, sy + 36, 6, Math.PI * .2, Math.PI * .8); ctx.stroke();
      } else if (h2 > 0.945 && h2 < 0.955) {
        // одинокий череп
        ctx.fillStyle = 'rgba(216,207,182,0.4)'; circ(sx + 16 + h * 30, sy + 46, 3.6); ctx.fill();
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        circ(sx + 15 + h * 30, sy + 45.4, 0.9); ctx.fill();
        circ(sx + 18 + h * 30, sy + 45.4, 0.9); ctx.fill();
      }
    }
    // кроссфейд прошлого биома
    var bu = Math.min(1, (now - gTrStart) / 2);
    if (bu < 1 && TILE_SETS[gPrevOld]) {
      ctx.globalAlpha = 1 - bu;
      var oset = TILE_SETS[gPrevOld];
      for (var bj = 0; bj < rows; bj++) for (var bi2 = 0; bi2 < cols; bi2++) {
        var wx2 = tx0 + bi2, wy2 = ty0 + bj;
        ctx.drawImage(oset[(hash(wx2, wy2) * 8) | 0], wx2 * 64 + ox, wy2 * 64 + oy);
      }
      ctx.globalAlpha = 1;
    }
    // декали (кровь, ожоги, кости)
    if (G && G.decals) {
      for (var d0 = 0; d0 < G.decals.length; d0++) {
        var d = G.decals[d0], p = W2S(d.x, d.y);
        if (p[0] < -40 || p[0] > VW + 40 || p[1] < -40 || p[1] > VH + 40) continue;
        ctx.save(); ctx.translate(p[0], p[1]); ctx.rotate(d.rot); ctx.scale(d.s, d.s); ctx.globalAlpha = d.a;
        if (d.type === 'blood') {
          ctx.fillStyle = '#4a0e17';
          ell(0, 0, 12, 7); ctx.fill();
          circ(6, -4, 4); ctx.fill(); circ(-7, 3, 3.5); ctx.fill();
        } else if (d.type === 'scorch') {
          ctx.fillStyle = '#140808'; circ(0, 0, 16); ctx.fill();
          ctx.strokeStyle = 'rgba(255,159,67,0.5)'; ctx.lineWidth = 1; circ(0, 0, 16); ctx.stroke();
        } else {
          ctx.fillStyle = '#c7bc9f'; ctx.fillRect(-6, -2, 12, 3); ctx.fillRect(2, -5, 3, 8);
        }
        ctx.restore();
      }
    }
    /* читабельность: тёплый амбиент фонаря вокруг героя */
    if (G && G.P) {
      var lp = W2S(G.P.x, G.P.y);
      glow(GLOW.gold, lp[0], lp[1], 240, .10);
      glow(GLOW.white, lp[0], lp[1], 120, .07);
    }
  }

  /* ================= ГЕРОЙ =================
   Некромант — центральный образ игры. Дизайн по принципу 70/30:
   70% глубокий фиолет плаща, 30% тень, 10% акценты (кость, зелёный огонь душ, золото).
   Анимация:
   - цикл шага привязан к пройденной дистанции (нет «проскальзывания»);
   - плащ и пояс — запаздывающее колыхание (follow through / overlapping action);
   - рывок — растяжка и наклон по направлению;
   - урон — мигание; покой — дыхание;
   - вокруг героя вьются две души-спутницы. */

  var hLastX = null, hLastY = null, hPhase = 0, hBlend = 0;

  function raggedHem(x0, x1, y0, t, phase, wk, seed) {
    // рваный подол: зубья с волной, запаздывающей от шага к краю
    var n = 6;
    for (var i = 0; i <= n; i++) {
      var u = i / n;
      var hx = x0 + (x1 - x0) * u;
      var wave = wk > 0.05
        ? Math.sin(phase - i * 0.55 + seed) * 2.1 * wk + Math.sin(t * 2.2 - i) * 0.8 * (1 - wk)
        : Math.sin(t * 2.2 - i * 0.8 + seed) * 1.1;
      var hy = y0 + ((i % 2 === 0) ? 2.6 : -0.8) + wave;
      ctx.lineTo(hx, hy);
    }
  }

  function soulWisp(sx, sy, sc) {
    glow(GLOW.green, sx, sy, 9 * sc, .85);
    ctx.fillStyle = '#d8ffe6';
    circ(sx, sy, 2.4 * sc); ctx.fill();
    ctx.fillStyle = '#1c3a2a';
    circ(sx - 0.9 * sc, sy - 0.4 * sc, 0.55 * sc); ctx.fill();
    circ(sx + 0.9 * sc, sy - 0.4 * sc, 0.55 * sc); ctx.fill();
  }

  function drawHero(x, y, t, face, moving) {
    var P = (N.G && N.G.P) || {};
    face = face || 1;

    /* --- цикл шага: фаза растёт от дистанции, смешение поз плавное --- */
    var isWalk = false;
    if (moving && hLastX !== null) {
      var dx = x - hLastX, dy = y - hLastY;
      var dist = Math.hypot(dx, dy);
      if (dist > 0.4 && dist < 40) { hPhase += dist * 0.135; isWalk = true; }
    }
    if (moving) { hLastX = x; hLastY = y; }
    hBlend += ((isWalk ? 1 : 0) - hBlend) * 0.16;
    var wk = hBlend;                          // 0 — стоит, 1 — идёт
    var st = Math.sin(hPhase), ct = Math.cos(hPhase);
    var dash = P.dashDuration > 0;
    var idleBreath = Math.sin(t * 2.4);

    // вертикальный ритм: два приседания на цикл шага + дыхание в покое
    var bob = wk * (-Math.abs(ct) * 2.2) + (1 - wk) * idleBreath * 1.1;
    // наклон вперёд при ходьбе, от рывка и поворота (учёт зеркала по лицу)
    var dashTilt = Math.max(-0.3, Math.min(0.3, (P.dashVx || 0) * 0.0012));
    var lean = face * (0.07 * wk + (P.tilt || 0) * 0.9 + (dash ? dashTilt : 0));

    // живая тень и аура
    shadowAt(x, y + 18, 14 + bob * 0.7);
    glow(GLOW.green, x, y - 2, 34, 0.10 + Math.sin(t * 1.5) * 0.04 + wk * 0.03);

    // души-спутницы на орбите (одна за спиной, одна перед)
    var souls = [];
    for (var k = 0; k < 2; k++) {
      var sa = t * 1.6 + k * Math.PI;
      souls.push({
        x: x + Math.cos(sa) * 24 * (face || 1),
        y: y - 6 + Math.sin(sa) * 9,
        front: Math.sin(sa) > -0.25,
        s: 0.85 + 0.2 * Math.sin(t * 3 + k * 2)
      });
    }
    for (var s0 = 0; s0 < souls.length; s0++) {
      if (!souls[s0].front) soulWisp(souls[s0].x, souls[s0].y, souls[s0].s);
    }

    ctx.save();
    ctx.translate(x, y - 4 + bob);
    ctx.rotate(lean);
    ctx.scale(face * (P.squashX || 1), P.squashY || 1);
    if (dash) ctx.scale(1.14, 0.9);           // растяжка в рывке
    if (P.inv > 0 && Math.floor(t * 26) % 2 === 0) ctx.globalAlpha *= 0.45; // мигание при уроне

    var hemSway = wk > 0.05 ? st * 3.2 * wk + Math.sin(t * 2.2) * 0.8 : Math.sin(t * 2.2) * 1.4;
    ctx.lineCap = 'round';

    /* ===== задний слой: летящий задний подол ===== */
    ctx.fillStyle = '#150c27';
    ctx.beginPath();
    ctx.moveTo(-8, 4);
    ctx.quadraticCurveTo(-14 - hemSway * 0.5, 11, -11.5 - hemSway, 18);
    raggedHem(-11.5 - hemSway, 11 + hemSway * 0.7, 18.6, t, hPhase, wk, 2.1);
    ctx.quadraticCurveTo(14 + hemSway * 0.5, 11, 8, 4);
    ctx.closePath(); ctx.fill();

    /* ===== задняя рука (машет в противофазе шага) ===== */
    var backSwing = wk * st * 3;
    ctx.strokeStyle = '#1b1030'; ctx.lineWidth = 4.2;
    line(-7, -3, -10.5 - backSwing, 4.5 + wk * ct * 1.4);
    ctx.fillStyle = '#cfc4a6'; circ(-10.8 - backSwing, 5 + wk * ct * 1.6, 1.7); ctx.fill();

    /* ===== основная роба ===== */
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-14.5 - hemSway * 0.3, 6, -12.5 - hemSway * 0.7, 17.5);
    raggedHem(-12.5 - hemSway * 0.7, 12.5 + hemSway * 0.5, 17.5, t, hPhase, wk, 0);
    ctx.quadraticCurveTo(14.5 + hemSway * 0.3, 6, 10, -6);
    ctx.quadraticCurveTo(5, -8.5 + bob * 0.2, 0, -8.5 + bob * 0.2);
    ctx.quadraticCurveTo(-5, -8.5 + bob * 0.2, -10, -6);
    ctx.closePath();
    ctx.fillStyle = '#231540'; ctx.fill(); OL(1.8);
    // тень на спине (свет — от фонаря впереди)
    ctx.beginPath();
    ctx.moveTo(-10, -6);
    ctx.quadraticCurveTo(-14.5 - hemSway * 0.3, 6, -12.5 - hemSway * 0.7, 17.5);
    raggedHem(-12.5 - hemSway * 0.7, -1 - hemSway * 0.2, 17.2, t, hPhase, wk, 0.6);
    ctx.lineTo(-1, -8.2 + bob * 0.2);
    ctx.quadraticCurveTo(-5, -8.5 + bob * 0.2, -10, -6);
    ctx.closePath();
    ctx.fillStyle = '#160d2b'; ctx.fill();
    // световая кромка со стороны фонаря
    ctx.strokeStyle = 'rgba(150,120,220,0.4)'; ctx.lineWidth = 1.3;
    ctx.beginPath();
    ctx.moveTo(10, -6);
    ctx.quadraticCurveTo(14.5 + hemSway * 0.3, 6, 12.5 + hemSway * 0.5, 16.8);
    ctx.stroke();
    // руны на подоле
    ctx.strokeStyle = 'rgba(140,220,160,0.22)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(-6, 13.5); ctx.lineTo(-4.2, 12.2); ctx.lineTo(-2.6, 13.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(3.2, 13.2); ctx.lineTo(5, 12); ctx.stroke();

    /* ===== пояс, сумка с душой и trailing-лента ===== */
    ctx.strokeStyle = '#5c4a33'; ctx.lineWidth = 2;
    line(-8, 0.5, 8.5, 1.5);
    var sashWave = wk > 0.05 ? Math.sin(hPhase - 1.2) * 3 * wk : Math.sin(t * 2.0) * 1.6;
    ctx.fillStyle = '#3a2a5c';
    ctx.beginPath();
    ctx.moveTo(-6.5, 1);
    ctx.quadraticCurveTo(-12 - sashWave * 0.6, 8, -9.5 - sashWave, 15.5);
    ctx.lineTo(-7 - sashWave, 14.5);
    ctx.quadraticCurveTo(-9.5 - sashWave * 0.5, 8, -4.5, 1.6);
    ctx.closePath(); ctx.fill();
    // сумка-кошель с душой внутри
    ctx.fillStyle = '#3b2f52';
    ctx.beginPath(); ctx.moveTo(-3.4, 1.8); ctx.lineTo(-1, 1.8); ctx.lineTo(-0.6, 5.6); ctx.lineTo(-3.8, 5.6); ctx.closePath(); ctx.fill(); OL(1);
    glow(GLOW.green, -2.2, 3.8, 4, .5 + 0.2 * Math.sin(t * 3));

    /* ===== костяной наплечник (передняя сторона) ===== */
    ctx.fillStyle = '#d9cfb4';
    ctx.beginPath();
    ctx.moveTo(4.5, -7.5);
    ctx.quadraticCurveTo(11.5, -8.5, 12.8, -2.5);
    ctx.quadraticCurveTo(12, 0.5, 8.5, 0.2);
    ctx.quadraticCurveTo(5.5, -1.5, 4.5, -7.5);
    ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.fillStyle = '#a3946f';
    ctx.beginPath(); ctx.moveTo(8.5, 0.2); ctx.quadraticCurveTo(12, 0.5, 12.8, -2.5); ctx.quadraticCurveTo(11.5, -5.5, 9, -6.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#5c5340'; ctx.lineWidth = 1;
    line(7.5, -6.8, 8.8, -1.2); line(10.2, -6.2, 11.2, -2.2);

    /* ===== капюшон и череп ===== */
    var headBob = wk > 0.05 ? Math.sin(hPhase - 0.9) * 0.9 * wk : idleBreath * 0.7;
    ctx.save();
    ctx.translate(0, headBob);
    // капюшон с наклоном вперёд
    ctx.fillStyle = '#2a1a4a';
    ctx.beginPath();
    ctx.moveTo(-8.8, -5.5);
    ctx.quadraticCurveTo(-10, -15.5, -3, -21);
    ctx.quadraticCurveTo(2.5, -24.5, 5.8, -19);
    ctx.quadraticCurveTo(9.8, -14.5, 8.8, -7);
    ctx.quadraticCurveTo(4.5, -4, 0, -4.2);
    ctx.quadraticCurveTo(-5, -4, -8.8, -5.5);
    ctx.closePath(); ctx.fill(); OL(1.8);
    // тень капюшона сзади
    ctx.fillStyle = '#1a0f33';
    ctx.beginPath();
    ctx.moveTo(-8.8, -5.5);
    ctx.quadraticCurveTo(-10, -15.5, -3, -21);
    ctx.quadraticCurveTo(-6, -14, -5.5, -6.5);
    ctx.closePath(); ctx.fill();
    // окантовка капюшона золотом
    ctx.strokeStyle = 'rgba(232,179,74,0.5)'; ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(8.8, -7);
    ctx.quadraticCurveTo(4.5, -4, 0, -4.2);
    ctx.quadraticCurveTo(-5, -4, -8.8, -5.5);
    ctx.stroke();
    // провал лица
    ctx.fillStyle = '#0b0614';
    ell(1.6, -11.2, 5.7, 5.3); ctx.fill();
    // череп
    ctx.fillStyle = '#ddd3b8';
    circ(1.8, -10.8, 4.7); ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 1; circ(1.8, -10.8, 4.7); ctx.stroke();
    ctx.fillStyle = '#cfc4a6';
    ctx.fillRect(-1.2, -7.4, 5.9, 2.6);           // челюсть
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
    line(0.1, -7.4, 0.1, -4.9); line(1.8, -7.4, 1.8, -4.9); line(3.5, -7.4, 3.5, -4.9);
    // тень надбровий
    ctx.fillStyle = 'rgba(10,6,18,0.55)';
    ell(1.6, -13, 4.4, 1.7); ctx.fill();
    // глазницы с пульсирующим огнём душ
    var eyePulse = 0.8 + 0.2 * Math.sin(t * 3.1);
    ctx.fillStyle = '#0a0512';
    circ(0, -11.6, 1.6); ctx.fill(); circ(4, -11.6, 1.6); ctx.fill();
    glow(GLOW.green, 0, -11.6, 5.4, eyePulse);
    glow(GLOW.green, 4, -11.6, 5.4, eyePulse);
    ctx.fillStyle = '#c9ffdd';
    circ(0.2, -11.5, 0.8); ctx.fill(); circ(4.2, -11.5, 0.8); ctx.fill();
    // носовая впадина
    ctx.fillStyle = '#0a0512';
    ctx.beginPath(); ctx.moveTo(2, -10); ctx.lineTo(1.3, -8.6); ctx.lineTo(2.7, -8.6); ctx.closePath(); ctx.fill();
    ctx.restore();

    /* ===== корона (10+ уровень или специализация) ===== */
    if (((N.G && N.G.level) || 1) >= 10 || (N.G && N.G.spec)) {
      ctx.save(); ctx.translate(0, headBob);
      ctx.fillStyle = '#e8b34a'; ctx.strokeStyle = '#8a6520'; ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(-6.5, -17.5); ctx.lineTo(-4.5, -24); ctx.lineTo(-1.5, -19.5);
      ctx.lineTo(1, -26); ctx.lineTo(3.5, -19.5); ctx.lineTo(6.5, -23.5); ctx.lineTo(8, -17.5);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#8dff57'; circ(1, -21.5, 1.2); ctx.fill();
      glow(GLOW.gold, 1, -21.5, 9, .45);
      ctx.restore();
    }

    /* ===== посох с фонарём душ (качается от шага) ===== */
    var staffAng = wk > 0.05 ? Math.sin(hPhase - 0.6) * 0.1 * wk : Math.sin(t * 2.1) * 0.05;
    ctx.save();
    ctx.translate(12.5, 3);
    ctx.rotate(staffAng);
    ctx.strokeStyle = '#4a3624'; ctx.lineWidth = 3;
    line(0, 13, -1.5, -25);
    ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = 1.1;
    line(-0.4, 4, 0.4, 6); line(-0.9, -8, -0.1, -6);
    // череп-фонарь на вершине
    ctx.fillStyle = '#d9cfb4'; circ(-1.5, -28.5, 4.2); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#a3946f';
    ctx.fillRect(-3.6, -25.6, 4.2, 2.2);
    // огонь внутри черепа
    var flick = Math.sin(t * 13) * 0.8 + Math.sin(t * 7.3) * 0.5;
    glow(GLOW.green, -1.5, -28.5, 10 + flick, .95);
    ctx.fillStyle = '#c7ffb0';
    circ(-2.7, -29.2, 1.1); ctx.fill(); circ(0, -29.2, 1.1); ctx.fill();
    // выброс пламени вверх
    ctx.fillStyle = 'rgba(199,255,176,0.85)';
    ctx.beginPath();
    ctx.moveTo(-1.5, -33.5);
    ctx.quadraticCurveTo(-3.5 - flick * 0.4, -35.5 - flick, -1.5, -38 - flick * 1.4);
    ctx.quadraticCurveTo(0.5 + flick * 0.4, -35.5 - flick, -1.5, -33.5);
    ctx.fill();
    // защитная дуга-клетка вокруг фонаря
    ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.arc(-1.5, -28.5, 5.8, -0.7, 3.9); ctx.stroke();
    ctx.restore();

    /* ===== передняя рука поверх посоха ===== */
    ctx.strokeStyle = '#2a1a4a'; ctx.lineWidth = 4.6;
    line(6.5, -4.5, 12.5, 3);
    ctx.fillStyle = '#ddd3b8'; circ(12.5, 3, 2); ctx.fill(); OL(1);

    /* ===== передняя душа-спутница ===== */
    for (var s1 = 0; s1 < souls.length; s1++) {
      if (souls[s1].front) soulWisp(souls[s1].x, souls[s1].y, souls[s1].s);
    }

    /* ===== след рывка ===== */
    if (dash) {
      ctx.strokeStyle = 'rgba(159,232,176,0.4)'; ctx.lineWidth = 1.6;
      line(-14, -6, -24, -6); line(-15, 0, -27, 0); line(-14, 6, -23, 6);
    }

    ctx.restore();
  }

/* ================= МИНЬОНЫ v2: индивидуальные силуэты =================
     Принципы: силуэт читается без деталей (70/30), форма = роль
     (квадрат = танк, треугольник = агрессия, капля = дух),
     у каждого семейства свой цветовой сценарий. */

  var MFAM_COL = {
    bone: { bar: '#9fe8b0', glow: GLOW.green },
    blood: { bar: '#ff6b7f', glow: GLOW.red },
    corpse: { bar: '#8dff57', glow: GLOW.green },
    spirit: { bar: '#8ef7c9', glow: GLOW.blue }
  };
  var MFAM = {
    warriors: 'bone', archers: 'bone', bone_priest: 'bone', bone_knight: 'bone',
    grave_hound: 'blood', grave_witch: 'corpse', brood_mother: 'corpse',
    ghost_wisp: 'spirit', soul_ferryman: 'spirit', grave_mourner: 'spirit', ritual: 'spirit'
  };
  var MINION = {};

  MINION.warriors = function (m, t, fl) {
    // фронтлайн: низкий, квадратный, щит вперёд
    var bone = fl ? '#ffffff' : '#e3d8bd', boneD = fl ? '#ffffff' : '#a3946f';
    var evolved = N.G && N.G.weapons.warriors && N.G.weapons.warriors.evolved;
    var st = Math.sin(t * 8 + m.ph) * 1.8;
    ctx.strokeStyle = boneD; ctx.lineWidth = 1.7;
    line(-2.5, 4, -3.5 + st, 9.5); line(2, 4, 3 - st, 9.5);
    line(-0.5, -1, -0.5, 4.5);
    ctx.strokeStyle = bone; ctx.lineWidth = 1.2;
    line(-3.5, 0.2, 2.5, 0.2); line(-3, 2.2, 2, 2.2);
    // череп за щитом
    ctx.fillStyle = bone; circ(-2, -6, 4.6); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#0a0512'; circ(-3.6, -6.6, 1.1); ctx.fill(); circ(-0.4, -6.6, 1.1); ctx.fill();
    glow(GLOW.green, -2, -6.4, evolved ? 6 : 4, evolved ? .8 : .45);
    // ростовой щит — главный силуэт
    ctx.fillStyle = fl ? '#fff' : (evolved ? '#9c8f6d' : '#8d8168');
    circ(5.5, 0.5, 5.4); ctx.fill(); OL(1.5);
    ctx.fillStyle = fl ? '#fff' : '#b3a686'; circ(5.5, 0.5, 3.6); ctx.fill();
    ctx.strokeStyle = fl ? '#fff' : '#5c5340'; ctx.lineWidth = 1;
    line(5.5, -2.8, 5.5, 3.8); line(2.4, 0.5, 8.6, 0.5);
    ctx.fillStyle = '#e8b34a'; circ(5.5, 0.5, 1.2); ctx.fill();
    if (evolved) {
      ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.2;
      circ(5.5, 0.5, 5.4); ctx.stroke();
      // плюмаж
      ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.4;
      line(-2, -10.4, -3.5, -14); line(-2, -10.4, -0.5, -14.5);
    }
    // остриё меча над щитом
    ctx.strokeStyle = fl ? '#fff' : '#d9d2bd'; ctx.lineWidth = 2;
    line(5.5, -4.9, 5.5, -9.5);
  };

  MINION.archers = function (m, t, fl) {
    // треугольные мотивы: капюшон, стрелы, лук
    var bone = fl ? '#ffffff' : '#e3d8bd', boneD = fl ? '#ffffff' : '#a3946f';
    var st = Math.sin(t * 7 + m.ph) * 1.6;
    ctx.strokeStyle = boneD; ctx.lineWidth = 1.6;
    line(-2.5, 4, -3 + st, 9.5); line(2.5, 4, 3 - st, 9.5);
    line(0, -1, 0, 4.5);
    ctx.strokeStyle = bone; ctx.lineWidth = 1.1;
    line(-3, 0.4, 3, 0.4); line(-2.6, 2.4, 2.6, 2.4);
    // колчан за спиной по диагонали
    ctx.save(); ctx.rotate(-0.5);
    ctx.fillStyle = fl ? '#fff' : '#6d5a3f'; ctx.fillRect(-10.5, -7, 3.2, 9);
    ctx.strokeStyle = '#3d3226'; ctx.lineWidth = 1; ctx.strokeRect(-10.5, -7, 3.2, 9);
    ctx.strokeStyle = fl ? '#fff' : '#c9c2ab'; ctx.lineWidth = 1.2;
    line(-9.8, -7, -9.2, -10); line(-8.4, -7, -7.8, -10);
    ctx.fillStyle = '#8a4a4a';
    circ(-9.2, -10.2, 1); ctx.fill(); circ(-7.8, -10.2, 1); ctx.fill();
    ctx.restore();
    // капюшон + череп
    ctx.fillStyle = fl ? '#fff' : '#55604a';
    ctx.beginPath(); ctx.arc(0, -6.4, 5.6, Math.PI * 0.9, Math.PI * 2.1); ctx.closePath(); ctx.fill(); OL(1.3);
    ctx.fillStyle = bone; circ(0.4, -5.8, 3.9); ctx.fill();
    ctx.fillStyle = '#0a0512'; circ(-0.9, -6.2, 1); ctx.fill(); circ(1.9, -6.2, 1); ctx.fill();
    glow(GLOW.green, 0.4, -6, 3.6, .4);
    // лук вертикально в передней руке
    ctx.strokeStyle = fl ? '#fff' : '#8a7a55'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(4.6, -1, 6.6, -1.35, 1.35); ctx.stroke();
    ctx.strokeStyle = 'rgba(226,220,196,0.85)'; ctx.lineWidth = 1;
    line(6.9, -7.2, 6.9, 5.2);
  };

  MINION.ritual = function (m, t, fl) {
    // временная оболочка из праха: полупрозрачная, рваная, «недоделанная»
    ctx.globalAlpha *= 0.6;
    var col = fl ? '#ffffff' : '#9aa8b8';
    var sway = Math.sin(t * 6 + m.ph) * 1.6;
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.quadraticCurveTo(-5.5, -3, -4.5, 3);
    ctx.lineTo(-2.5 + sway, 6.5); ctx.lineTo(-0.5, 4.5); ctx.lineTo(1.5 + sway, 7);
    ctx.lineTo(3.5, 4.8); ctx.lineTo(5, 6.5);
    ctx.quadraticCurveTo(5.5, -3, 0, -8);
    ctx.closePath(); ctx.fill(); OL(1.1);
    ctx.fillStyle = fl ? '#fff' : '#c4cdd8'; circ(0, -5, 2.8); ctx.fill();
    ctx.fillStyle = '#0a0512'; circ(-1, -5.4, 0.9); ctx.fill(); circ(1, -5.4, 0.9); ctx.fill();
    glow(GLOW.green, 0, -4, 4.5, .5);
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.6);
  };

  MINION.bone_priest = function (m, t, fl) {
    // вертикаль: митра, кадило на цепи, нимб
    var robe = fl ? '#ffffff' : '#d8cdb2', robeD = fl ? '#ffffff' : '#a89a76';
    var sway = Math.sin(t * 3 + m.ph) * 0.5;
    // роба
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-3, -6); ctx.lineTo(-5.5, 8); ctx.lineTo(5.5, 8); ctx.lineTo(3, -6);
    ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.fillStyle = robeD;
    ctx.beginPath(); ctx.moveTo(1, -6); ctx.lineTo(2.5, 8); ctx.lineTo(5.5, 8); ctx.lineTo(3, -6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1; line(-4.8, 6.2, 4.8, 6.2);
    // митра
    ctx.fillStyle = robe;
    ctx.beginPath(); ctx.moveTo(-3.4, -8); ctx.lineTo(0, -15.5); ctx.lineTo(3.4, -8); ctx.closePath(); ctx.fill(); OL(1.2);
    ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1; line(0, -14.5, 0, -8.5);
    // череп под митрой
    ctx.fillStyle = fl ? '#fff' : '#e3d8bd'; circ(0, -7, 3.4); ctx.fill(); OL(1.1);
    ctx.fillStyle = '#0a0512'; circ(-1.2, -7.4, 0.9); ctx.fill(); circ(1.2, -7.4, 0.9); ctx.fill();
    glow(GLOW.gold, -1.2, -7.4, 2.8, .8); glow(GLOW.gold, 1.2, -7.4, 2.8, .8);
    // нимб
    ctx.strokeStyle = 'rgba(232,179,74,0.5)'; ctx.lineWidth = 1.4;
    ell(0, -9.5, 5.2, 1.6); ctx.stroke();
    // кадило на цепи
    var a = Math.sin(t * 3.4 + m.ph) * 0.7;
    var hx = 4.5 + Math.sin(a) * 5, hy = 3 + Math.cos(a) * 3.5;
    ctx.strokeStyle = fl ? '#fff' : '#8a7a55'; ctx.lineWidth = 1;
    line(3.5, -1, hx, hy);
    glow(GLOW.orange, hx, hy + 1, 6, .8);
    ctx.fillStyle = fl ? '#fff' : '#6d5a3f'; circ(hx, hy + 1, 2); ctx.fill(); OL(1);
  };

  MINION.grave_hound = function (m, t, fl) {
    // горизонтальный силуэт: костяной пёс
    var bone = fl ? '#ffffff' : '#e3d8bd', boneD = fl ? '#ffffff' : '#a3946f';
    var run = Math.sin(t * 11 + m.ph) * 2.4;
    // ноги
    ctx.strokeStyle = boneD; ctx.lineWidth = 1.7;
    line(-5, 2, -6.5 + run, 8); line(-2, 2.5, -1 - run, 8);
    line(3, 2.5, 2 + run, 8); line(6, 2, 7.5 - run, 8);
    // тело
    ctx.fillStyle = bone; ell(-0.5, 0, 9, 4.4); ctx.fill(); OL(1.4);
    // рёбра
    ctx.strokeStyle = boneD; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(-2, -0.5, 3, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.beginPath(); ctx.arc(1, -0.5, 3, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    // шипы вдоль хребта
    ctx.fillStyle = boneD;
    ctx.beginPath(); ctx.moveTo(-6, -3.6); ctx.lineTo(-4.8, -6.4); ctx.lineTo(-3.6, -3.8); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-3, -4.2); ctx.lineTo(-1.8, -7); ctx.lineTo(-0.6, -4.3); ctx.fill();
    ctx.beginPath(); ctx.moveTo(0, -4.3); ctx.lineTo(1.2, -6.8); ctx.lineTo(2.4, -4.2); ctx.fill();
    // хвост-хлыст
    ctx.strokeStyle = boneD; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(-9, -1); ctx.quadraticCurveTo(-13, -3 - run * 0.6, -14, -6); ctx.stroke();
    // череп с длинной пастью
    ctx.fillStyle = bone; circ(8, -2.5, 3.6); ctx.fill(); OL(1.3);
    ctx.fillStyle = bone;
    ctx.beginPath(); ctx.moveTo(10.5, -3.5); ctx.lineTo(15, -2.4); ctx.lineTo(10.5, -1); ctx.closePath(); ctx.fill(); OL(1);
    ctx.fillStyle = '#0a0512'; circ(8.2, -3.6, 1.1); ctx.fill();
    glow(GLOW.red, 8.2, -3.6, 4, .9);
  };

  MINION.grave_witch = function (m, t, fl) {
    // сгорбленный треугольник: капюшон-крюк, зелёный огонь в руке
    var robe = fl ? '#ffffff' : '#3f5238', robeD = fl ? '#ffffff' : '#2a3a26';
    var hov = Math.sin(t * 3.5 + m.ph);
    // горбатая роба
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(2.5, -9);
    ctx.quadraticCurveTo(-7.5, -5, -6, 6);
    ctx.lineTo(-4, 4.8); ctx.lineTo(-2, 6.6); ctx.lineTo(0, 4.9); ctx.lineTo(2, 6.8); ctx.lineTo(4.5, 5.2); ctx.lineTo(6.5, 6.4);
    ctx.quadraticCurveTo(8.5, -2, 2.5, -9);
    ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.fillStyle = robeD;
    ctx.beginPath();
    ctx.moveTo(2.5, -9); ctx.quadraticCurveTo(8.5, -2, 6.5, 6.4); ctx.lineTo(3, 5.5); ctx.quadraticCurveTo(5.5, -2, 2.5, -9);
    ctx.closePath(); ctx.fill();
    // капюшон с крюконосым профилем
    ctx.fillStyle = robe;
    circ(2.5, -7.5, 4.2); ctx.fill(); OL(1.3);
    ctx.beginPath(); ctx.moveTo(6, -7.5); ctx.lineTo(9, -6.2); ctx.lineTo(6, -5.6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#0a120a'; circ(3.2, -7.5, 2.6); ctx.fill();
    eyes(2.2, -7.8, 4.2, -7.8, 0.9, '#9fe8b0', GLOW.green);
    // рука с душой-огнём
    ctx.strokeStyle = fl ? '#fff' : '#c9bfa4'; ctx.lineWidth = 1.6;
    line(3.5, -2, 8.5, -6 - hov);
    glow(GLOW.green, 9.5, -8 - hov, 7, .9);
    ctx.fillStyle = fl ? '#fff' : '#c7ffb0';
    ctx.beginPath();
    ctx.moveTo(9.5, -11 - hov);
    ctx.quadraticCurveTo(7.5, -8 - hov, 9.5, -5.5 - hov);
    ctx.quadraticCurveTo(11.5, -8 - hov, 9.5, -11 - hov);
    ctx.fill();
  };

  MINION.ghost_wisp = function (m, t, fl) {
    // капля-дух: парит, нет ног, мерцает
    var flick = Math.sin(t * 7 + m.ph) * 1.4;
    ctx.globalAlpha *= 0.85;
    glow(GLOW.blue, 0, -2, 12, .35);
    ctx.fillStyle = fl ? '#ffffff' : '#a9d8e2';
    ctx.beginPath();
    ctx.moveTo(0, -10);
    ctx.quadraticCurveTo(-5.5, -3, -3.5, 3);
    ctx.quadraticCurveTo(0 + flick * 0.4, 6.5, 3.5, 3);
    ctx.quadraticCurveTo(5.5, -3, 0, -10);
    ctx.closePath(); ctx.fill(); OL(1.1);
    ctx.fillStyle = fl ? '#ffffff' : '#e8fbff';
    ctx.beginPath();
    ctx.moveTo(0, -6.5);
    ctx.quadraticCurveTo(-2.8, -1.5, -1.6, 2.2);
    ctx.quadraticCurveTo(0, 4, 1.6, 2.2);
    ctx.quadraticCurveTo(2.8, -1.5, 0, -6.5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#12333d';
    circ(-1.4, -3.4, 1); ctx.fill(); circ(1.4, -3.4, 1); ctx.fill();
    // хвост-затухание
    ctx.fillStyle = 'rgba(169,216,226,0.4)';
    circ(-flick, 6, 2); ctx.fill(); circ(flick * 0.6, 8.5, 1.2); ctx.fill();
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.85);
  };

  MINION.bone_knight = function (m, t, fl) {
    // тяжёлая латная фигура: квадратные плечи, двуручник на плече
    var steel = fl ? '#ffffff' : '#cfc6ae', steelD = fl ? '#ffffff' : '#8f866c';
    var st = Math.sin(t * 5 + m.ph) * 1.2;
    ctx.save(); ctx.scale(1.25, 1.25);
    // ноги-латники
    ctx.fillStyle = steelD;
    ctx.fillRect(-4.5, 4, 3.4, 6); ctx.fillRect(1.2, 4, 3.4, 6);
    // корпус-кираса
    ctx.fillStyle = steel;
    ctx.beginPath(); ctx.moveTo(-5.5, -6); ctx.lineTo(5.5, -6); ctx.lineTo(4.5, 5); ctx.lineTo(-4.5, 5); ctx.closePath(); ctx.fill(); OL(1.6);
    ctx.fillStyle = steelD;
    ctx.beginPath(); ctx.moveTo(1.5, -6); ctx.lineTo(5.5, -6); ctx.lineTo(4.5, 5); ctx.lineTo(1.5, 5); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = fl ? '#fff' : '#5c5340'; ctx.lineWidth = 1;
    line(-4, -1.5, 4, -1.5); line(-3.6, 2, 3.6, 2);
    ctx.fillStyle = '#e8b34a'; circ(0, -3, 1.3); ctx.fill();
    // наплечники
    ctx.fillStyle = steel;
    ell(-6.5, -5.5, 2.8, 2.2); ctx.fill(); OL(1.3);
    ell(6.5, -5.5, 2.8, 2.2); ctx.fill(); OL(1.3);
    // великий шлем с светящейся щелью
    ctx.fillStyle = steel;
    ctx.beginPath(); ctx.moveTo(-3.4, -6); ctx.lineTo(-3.4, -11); ctx.quadraticCurveTo(0, -13.5, 3.4, -11); ctx.lineTo(3.4, -6); ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.fillStyle = '#0c0a12'; ctx.fillRect(-2.4, -9.8, 4.8, 1.6);
    glow(GLOW.gold, 0, -9, 4.5, .7);
    // гребень
    ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -13.2); ctx.quadraticCurveTo(-2 - st, -16, -4, -15); ctx.stroke();
    // двуручник на плече
    ctx.strokeStyle = fl ? '#fff' : '#d9d2bd'; ctx.lineWidth = 2.2;
    line(6, -6, 11, -14);
    ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 1.8; line(5, -7.4, 8, -5.4);
    ctx.restore();
  };

  MINION.brood_mother = function (m, t, fl) {
    // раздутое брюхо-инкубатор, крошечная голова, жужжащие крылья
    var abd = fl ? '#ffffff' : '#7a8a55', abdD = fl ? '#ffffff' : '#55643c';
    var bz = Math.sin(t * 42 + m.ph);
    // крылья-размытие
    ctx.globalAlpha *= 0.3;
    ctx.fillStyle = '#c9d8b0';
    ell(-4, -8 + bz * 0.8, 6, 2.6); ctx.fill();
    ell(3, -8 - bz * 0.8, 6, 2.6); ctx.fill();
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.3);
    // ножки-культяпки
    ctx.strokeStyle = abdD; ctx.lineWidth = 1.8;
    line(-6, 5, -7.5, 8.5); line(-2, 6.5, -2.5, 9.5); line(3, 6.5, 3.5, 9.5); line(6.5, 5, 8, 8.5);
    // брюхо
    ctx.fillStyle = abd; ell(-1, 1, 10, 7.6); ctx.fill(); OL(1.6);
    ctx.fillStyle = abdD; ell(2.5, 2.5, 5.5, 4.6); ctx.fill();
    // кладки яиц просвечивают
    ctx.fillStyle = fl ? '#fff' : '#d6ffb0';
    circ(-4.5, 0.5, 1.7); ctx.fill(); circ(-1, 3.5, 1.4); ctx.fill(); circ(-5.5, 4, 1.2); ctx.fill();
    glow(GLOW.green, -3, 2, 7, .3);
    // голова-обрубок
    ctx.fillStyle = abd; circ(8.5, -1.5, 3.2); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#0a0f05'; circ(8, -2.6, 1); ctx.fill(); circ(9.8, -2.6, 1); ctx.fill();
    glow(GLOW.green, 8.9, -2.6, 3.5, .6);
    // хоботок
    ctx.strokeStyle = abdD; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(11, -0.8); ctx.quadraticCurveTo(13.5, 0.5, 13, 2.5); ctx.stroke();
  };

  MINION.soul_ferryman = function (m, t, fl) {
    // высокий лодочник: широкие поля, шест с фонарём душ
    var robe = fl ? '#ffffff' : '#3d4a5c', robeD = fl ? '#ffffff' : '#28313f';
    var sway = Math.sin(t * 2.6 + m.ph);
    // роба столбом
    ctx.fillStyle = robe;
    ctx.beginPath();
    ctx.moveTo(-2.5, -9); ctx.lineTo(-5, 8); ctx.lineTo(-2.5, 6.8); ctx.lineTo(0, 8.5);
    ctx.lineTo(2.5, 6.9); ctx.lineTo(5, 8); ctx.lineTo(2.5, -9);
    ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.fillStyle = robeD;
    ctx.beginPath(); ctx.moveTo(1, -9); ctx.lineTo(2.5, 6.9); ctx.lineTo(5, 8); ctx.lineTo(2.5, -9); ctx.closePath(); ctx.fill();
    // голова-пустота под полями
    ctx.fillStyle = '#0a0e14'; circ(0, -8, 3); ctx.fill();
    eyes(-1.1, -8.2, 1.1, -8.2, 0.8, '#a9d8e2', GLOW.blue);
    // широкополая шляпа
    ctx.fillStyle = robe;
    ell(0, -10.5, 6.5, 1.8); ctx.fill(); OL(1.2);
    ctx.beginPath(); ctx.moveTo(-3, -10.5); ctx.quadraticCurveTo(0, -15, 3, -10.5); ctx.closePath(); ctx.fill(); OL(1.1);
    // шест с фонарём
    ctx.strokeStyle = fl ? '#fff' : '#5c5340'; ctx.lineWidth = 1.8;
    line(6.5, -13, 8.5, 7);
    var lx = 6.2 + sway * 0.8, ly = -9.5;
    ctx.strokeStyle = fl ? '#fff' : '#5c5340'; ctx.lineWidth = 1; line(lx + 0.6, ly - 2, lx, ly);
    glow(GLOW.blue, lx, ly + 1.5, 8, .9);
    ctx.fillStyle = fl ? '#fff' : '#28313f'; ctx.fillRect(lx - 1.8, ly, 3.6, 4);
    ctx.strokeStyle = '#a9d8e2'; ctx.lineWidth = 0.9; ctx.strokeRect(lx - 1.8, ly, 3.6, 4);
    ctx.fillStyle = '#c7f4ff'; circ(lx, ly + 2, 1); ctx.fill();
  };

  MINION.grave_mourner = function (m, t, fl) {
    // плакальщица: склонённая вуаль, сложенные руки, длинное платье
    var dress = fl ? '#ffffff' : '#b7a9ce', dressD = fl ? '#ffffff' : '#84779c';
    var bow = Math.sin(t * 2.2 + m.ph) * 0.8;
    // платье-поток
    ctx.fillStyle = dress;
    ctx.beginPath();
    ctx.moveTo(-2, -6);
    ctx.quadraticCurveTo(-7, 2, -6, 9);
    ctx.quadraticCurveTo(-2, 7.5, 0, 9);
    ctx.quadraticCurveTo(2.5, 7.6, 6, 9);
    ctx.quadraticCurveTo(6.5, 1.5, 2.5, -6);
    ctx.closePath(); ctx.fill(); OL(1.3);
    ctx.fillStyle = dressD;
    ctx.beginPath();
    ctx.moveTo(1.2, -6); ctx.quadraticCurveTo(5.5, 2, 6, 9); ctx.lineTo(2.5, 8); ctx.quadraticCurveTo(3, 1, 1.2, -6);
    ctx.closePath(); ctx.fill();
    // склонённая голова с вуалью
    ctx.save(); ctx.rotate(0.28 + bow * 0.05);
    ctx.fillStyle = dress; circ(-0.5, -8.5, 3.8); ctx.fill(); OL(1.2);
    ctx.fillStyle = dressD;
    ctx.beginPath(); ctx.arc(-0.5, -8.5, 3.8, -0.4, Math.PI + 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#14101c'; ell(-1.6, -8, 2, 2.4); ctx.fill();
    ctx.restore();
    // сложенные руки
    ctx.fillStyle = fl ? '#fff' : '#ddd3c0';
    ell(0.5, -1.5 + bow * 0.4, 2.2, 1.5); ctx.fill(); OL(1);
    // светлая слеза
    glow(GLOW.blue, -2.6, -5.5, 3.5, .5 + 0.3 * Math.sin(t * 2 + m.ph));
    ctx.fillStyle = '#c7f4ff'; circ(-2.6, -5.5, 0.8); ctx.fill();
  };

  /* ===== ПЕПЕЛ: золом и углём ===== */
  MINION.ash_zealot = function (m, t, fl) {
    // фанатик в рваной робе: корона углей, жар у ног, руки воздеты
    var robe = fl ? '#ffffff' : '#4a2313', robeL = fl ? '#ffffff' : '#6b3418';
    var st = Math.sin(t * 7 + m.ph) * 1.6;
    glow(GLOW.orange, 0, 8, 9, .35 + .15 * Math.sin(t * 5 + m.ph));
    ctx.strokeStyle = fl ? '#fff' : '#2b1608'; ctx.lineWidth = 1.7;
    line(-2.5, 4, -3.5 + st, 9.5); line(2.5, 4, 3.5 - st, 9.5);
    // роба клином
    ctx.fillStyle = robe;
    ctx.beginPath(); ctx.moveTo(-5, -4); ctx.quadraticCurveTo(-6.5, 3, -4.5, 8);
    ctx.lineTo(4.5, 8); ctx.quadraticCurveTo(6.5, 3, 5, -4);
    ctx.quadraticCurveTo(0, -6.5, -5, -4); ctx.closePath(); ctx.fill(); OL(1.5);
    ctx.strokeStyle = robeL; ctx.lineWidth = 1.1;
    line(-3, 0, -2, 6); line(3, 0, 2, 6);
    // воздетые руки
    ctx.strokeStyle = fl ? '#fff' : '#8a4a24'; ctx.lineWidth = 1.8;
    line(-4, -3, -7, -8 - st * .5); line(4, -3, 7, -8 + st * .5);
    ctx.fillStyle = '#ffb066'; circ(-7, -8 - st * .5, 1.3); ctx.fill(); circ(7, -8 + st * .5, 1.3); ctx.fill();
    // череп-голова с короной углей
    ctx.fillStyle = fl ? '#fff' : '#d8c9b0'; circ(0, -7.5, 4.2); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#160a04'; circ(-1.5, -8, 1.1); ctx.fill(); circ(1.5, -8, 1.1); ctx.fill();
    for (var i = -1; i <= 1; i++) {
      var f = .6 + .5 * Math.sin(t * 9 + m.ph + i * 2);
      glow(GLOW.orange, i * 2.6, -12.5, 2.6 * f, .8);
      ctx.fillStyle = '#ffcf6e'; circ(i * 2.6, -12.5, .9 * f); ctx.fill();
    }
  };

  MINION.cinder_bell = function (m, t, fl) {
    // звонарь с угольной жаровней: колокол в руках, дымный след
    var st = Math.sin(t * 6 + m.ph) * 1.4;
    glow(GLOW.orange, -4, -2, 6, .3 + .12 * Math.sin(t * 4 + m.ph));
    ctx.strokeStyle = fl ? '#fff' : '#2b1608'; ctx.lineWidth = 1.6;
    line(-2, 4, -3 + st, 9); line(2, 4, 3 - st, 9);
    // тело-полушубок
    ctx.fillStyle = fl ? '#fff' : '#3c2a1a';
    ctx.beginPath(); ctx.moveTo(-4.5, -3); ctx.quadraticCurveTo(-5.5, 3, -3.5, 7.5);
    ctx.lineTo(3.5, 7.5); ctx.quadraticCurveTo(5.5, 3, 4.5, -3);
    ctx.quadraticCurveTo(0, -5.5, -4.5, -3); ctx.closePath(); ctx.fill(); OL(1.4);
    // жаровня за спиной
    ctx.fillStyle = fl ? '#fff' : '#5a3a1c'; ctx.fillRect(-6.5, -6, 4, 3); OL(1);
    ctx.fillStyle = '#ff9f43'; circ(-4.5, -6.5, 1.4 + .4 * Math.sin(t * 8 + m.ph)); ctx.fill();
    // колокол в руках (качается)
    ctx.save(); ctx.translate(4.5, -4); ctx.rotate(.25 * Math.sin(t * 5 + m.ph));
    ctx.fillStyle = fl ? '#fff' : '#b98a3c';
    ctx.beginPath(); ctx.moveTo(-2.6, 0); ctx.quadraticCurveTo(-2.2, -4.4, 0, -4.8);
    ctx.quadraticCurveTo(2.2, -4.4, 2.6, 0); ctx.closePath(); ctx.fill(); OL(1.2);
    ctx.fillStyle = '#5c4014'; circ(0, .8, 1); ctx.fill();
    ctx.restore();
    // капюшон
    ctx.fillStyle = fl ? '#fff' : '#241609';
    ctx.beginPath(); ctx.arc(0, -7.5, 3.6, -0.4, Math.PI + 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffcf6e'; circ(-1.2, -7.2, .8); ctx.fill(); circ(1.2, -7.2, .8); ctx.fill();
  };

  // акценты форм-вариантов (мастерство/связи) — маленькие детали, не ломая силуэт
  function variantAccents(m, t) {
    if (!m.variant) return;
    switch (m.variant) {
      case 'chaplain':
        ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.4;
        line(0, -16, 0, -19.5); line(-1.5, -18, 1.5, -18);
        break;
      case 'banner':
        ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 1.4; line(-7, -2, -7, -15);
        ctx.fillStyle = '#a83342';
        ctx.beginPath(); ctx.moveTo(-7, -15); ctx.lineTo(-2.5, -13.5); ctx.lineTo(-7, -11.5); ctx.closePath(); ctx.fill();
        break;
      case 'void_hound':
        glow(GLOW.purple, -2, -5, 7, .5);
        glow(GLOW.purple, 3, -4, 5, .4);
        break;
      case 'blood_hound':
        ctx.fillStyle = '#c22e3f';
        circ(11, 0, 1); ctx.fill(); circ(10, 3, 0.8); ctx.fill();
        glow(GLOW.red, 8, -1, 6, .4);
        break;
      case 'plague_matron':
        ctx.fillStyle = '#9fe85f';
        circ(-5, -1, 1.3); ctx.fill(); circ(2, -3, 1.1); ctx.fill(); circ(-1, 4, 1.2); ctx.fill();
        break;
      case 'soul_herbalist':
        ctx.strokeStyle = '#9fe8b0'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(-5, -8); ctx.quadraticCurveTo(-7, -11, -5.5, -13); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(-5, -8); ctx.quadraticCurveTo(-3, -11, -4.5, -13); ctx.stroke();
        break;
      case 'soul_lantern':
      case 'grave_lantern':
        glow(GLOW.blue, 6, -10, 6, .8);
        ctx.fillStyle = '#c7f4ff'; circ(6, -10, 1.2); ctx.fill();
        break;
    }
  }

  function drawMinion(m, t, isArcher) {
    var p = W2S(m.x, m.y), x = p[0], y = p[1];
    if (x < -60 || x > VW + 60 || y < -60 || y > VH + 60) return;
    var kind = m.kind;
    var floaty = kind === 'ghost_wisp' || kind === 'soul_ferryman' || kind === 'grave_mourner' || kind === 'ritual';
    var shR = kind === 'bone_knight' ? 13 : kind === 'brood_mother' ? 14 : kind === 'grave_hound' ? 12 : kind === 'soul_ferryman' ? 8 : 9;
    shadowAt(x, y + (floaty ? 13 : 10), shR);
    var flash = m.hitT > 0;
    var bob = Math.sin(t * (floaty ? 3 : 8) + m.ph) * (floaty ? 2.6 : 1.6);
    ctx.save();
    ctx.translate(x, y - 4 + bob);
    ctx.scale(m.face || 1, 1);
    var fn = MINION[kind] || MINION.warriors;
    fn(m, t, flash);
    variantAccents(m, t);
    if (flash) {
      ctx.globalAlpha = 0.75; ctx.fillStyle = '#fff';
      ell(0, -2, 10, 11); ctx.fill(); ctx.globalAlpha = 1;
    }
    ctx.restore();
    // аура жреца
    if (kind === 'bone_priest' && m.auraPower > 0.1) {
      ctx.strokeStyle = 'rgba(232,179,74,' + (0.12 + m.auraPower * 0.5).toFixed(2) + ')';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([5, 6]); ctx.lineDashOffset = -t * 12;
      circ2(x, y, 26); ctx.stroke();
      ctx.setLineDash([]);
    }
    if (m.hp < m.maxhp) {
      var fam = MFAM_COL[MFAM[kind] || 'bone'];
      bar(x, y + 13, 18, 3, m.hp / m.maxhp, fam.bar);
    }
  }
  function circ2(x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

  function drawGolem(m, t) {
    var p = W2S(m.x, m.y), x = p[0], y = p[1];
    if (x < -70 || x > VW + 70 || y < -70 || y > VH + 70) return;
    shadowAt(x, y + 22, 24);
    glow(GLOW.orange, x, y - 10, 30, .4);
    var bob = Math.sin(t * 4 + m.ph) * 2;
    ctx.save();
    ctx.translate(x, y - 6 + bob);
    ctx.scale((m.face || 1) * 1.6, 1.6);
    var flash = m.hitT > 0;
    var body = flash ? '#ffffff' : '#e2d8c2';
    var bodyD = flash ? '#ffffff' : '#b3a686';
    // ноги-тумбы
    ctx.fillStyle = bodyD;
    ctx.fillRect(-8, 10, 6, 7); ctx.fillRect(2, 10, 6, 7);
    // корпус
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(-10, -12); ctx.lineTo(10, -12); ctx.lineTo(8.5, 12); ctx.lineTo(-8.5, 12);
    ctx.closePath(); ctx.fill(); OL(2);
    // тень корпуса справа
    ctx.fillStyle = bodyD;
    ctx.beginPath(); ctx.moveTo(2, -12); ctx.lineTo(10, -12); ctx.lineTo(8.5, 12); ctx.lineTo(2, 12); ctx.closePath(); ctx.fill();
    // трещины с раскалённым свечением
    ctx.strokeStyle = flash ? '#fff' : '#ff9f43'; ctx.lineWidth = 1.1;
    ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(-2, -2); ctx.lineTo(-5, 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(4, -6); ctx.lineTo(2.4, 0); ctx.lineTo(5, 6); ctx.stroke();
    // ядро
    glow(GLOW.orange, 0, 0, 7, .9);
    ctx.fillStyle = '#ffd23f'; circ(0, 0, 2.2); ctx.fill();
    // голова-череп
    ctx.fillStyle = body; circ(0, -15, 6.5); ctx.fill(); OL(1.8);
    ctx.fillStyle = '#0a0512'; circ(-2.4, -15.6, 1.5); ctx.fill(); circ(2.4, -15.6, 1.5); ctx.fill();
    glow(GLOW.gold, -2.4, -15.6, 3.6, .9); glow(GLOW.gold, 2.4, -15.6, 3.6, .9);
    // руки
    ctx.strokeStyle = bodyD; ctx.lineWidth = 4.5;
    var swing = m.slashT > 0 ? -0.9 : 0;
    ctx.save(); ctx.rotate(swing);
    line(9, -4, 17, -14); ctx.restore();
    line(-9, -4, -16, 2);
    ctx.fillStyle = body; circ(17, -14, 3.4); ctx.fill(); OL(1.4); circ(-16, 2, 3.2); ctx.fill(); OL(1.4);
    ctx.restore();
    bar(x, y + 24, 48, 5, m.hp / m.maxhp, '#eec95f');
  }

  /* ================= ВРАГИ ================= */
  var AFF = {
    fire: { n: 'ОГНЕПАЛ', c: '#ff9f43' }, shield: { n: 'ЭГИДА', c: '#70a1ff' },
    vortex: { n: 'ГРАВИТОН', c: '#b657ff' }, storm: { n: 'ГРОМ', c: '#ffd23f' },
    venom: { n: 'ЗЕЛЕНЬ', c: '#8dff57' }, shade: { n: 'ТЕНЬ', c: '#4da3ff' },
    bloodlust: { n: 'АЛЧНОСТЬ', c: '#ff4757' }
  };
  var BONE = '#d9cfb4', BONED = '#a3946f';

  function tri(x1, y1, x2, y2, x3, y3) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.closePath(); ctx.fill();
  }
  function eyes(x1, y1, x2, y2, r, col, glowImg) {
    ctx.fillStyle = col;
    circ(x1, y1, r); ctx.fill(); circ(x2, y2, r); ctx.fill();
    if (glowImg) { glow(glowImg, x1, y1, r * 3, .7); glow(glowImg, x2, y2, r * 3, .7); }
  }

  var BODY = {};

  BODY.zom = function (e, t, R) {
    if (window.__drawZombieSprite) { window.__drawZombieSprite(ctx, t + (e.ph || 0), R); return; }
    // Силуэт: сгорбленный шатун, руки тянутся вперёд, голова свешена.
    // Асимметрия: одна нога волочится, рука сломана, глазница пустая.
    var jaw = Math.max(0, Math.sin(t * 6 + e.ph));        // челюсть клацает
    var shuf = Math.sin(t * 5 + e.ph);                     // шарканье
    var loll = Math.sin(t * 2.1 + e.ph) * 0.09;            // мотание головы
    var skin = '#66824e', skinD = '#47603a', skinL = '#7d9a60';
    ctx.lineCap = 'round';

    // ноги: одна шагает, другая волочится
    ctx.strokeStyle = skinD; ctx.lineWidth = 3.4;
    line(-R * .22, R * .4, -R * .34 + shuf * 2, R * .98);
    line(R * .18, R * .4, R * .5 - shuf * 2.4, R * .95);
    // обглоданная кость на волочащейся ноге
    ctx.strokeStyle = '#d8cdb2'; ctx.lineWidth = 1.4;
    line(R * .36, R * .72, R * .47 - shuf * 2.4, R * .9);

    // торс — сгорбленный, наклон вперёд
    ctx.save();
    ctx.rotate(.14);
    ctx.fillStyle = skin;
    ell(-R * .08, 0, R * .8, R * .6); ctx.fill(); OL(1.8);
    // тень на спине (свет от героя спереди)
    ctx.fillStyle = skinD;
    ell(-R * .42, R * .02, R * .4, R * .48); ctx.fill();
    // лоскут кожи посветлее
    ctx.fillStyle = skinL;
    ell(-R * .05, -R * .28, R * .3, R * .15); ctx.fill();
    // рваная тряпка на бёдрах
    ctx.fillStyle = '#3d4453';
    ctx.beginPath();
    ctx.moveTo(-R * .52, R * .32); ctx.lineTo(-R * .66, R * .66); ctx.lineTo(-R * .42, R * .55);
    ctx.closePath(); ctx.fill();
    // рана с рёбрами
    ctx.fillStyle = '#33121b';
    ell(R * .22, R * .06, R * .3, R * .24); ctx.fill();
    ctx.strokeStyle = '#d8cdb2'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(R * .08, R * .06, R * .15, -1.1, 1.1); ctx.stroke();
    ctx.beginPath(); ctx.arc(R * .12, R * .06, R * .26, -1.0, 1.0); ctx.stroke();
    // петля кишок
    ctx.strokeStyle = '#b06a6f'; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(R * .3, R * .26);
    ctx.quadraticCurveTo(R * .46, R * .55 + shuf * .8, R * .22, R * .52);
    ctx.stroke();
    ctx.restore();

    // обе руки тянутся вперёд — узнаваемый жест
    var reach = shuf * 1.6;
    ctx.strokeStyle = skin; ctx.lineWidth = 3.2;
    line(R * .15, -R * .2, R * .8, -R * .12 + reach * .4);
    line(R * .8, -R * .12 + reach * .4, R * 1.02, R * .02 + reach * .4);
    // пальцы
    ctx.lineWidth = 1.4;
    line(R * 1.02, R * .02 + reach * .4, R * 1.18, -R * .04 + reach * .4);
    line(R * 1.02, R * .02 + reach * .4, R * 1.16, R * .12 + reach * .4);
    // вторая рука — сломанная, висит
    ctx.lineWidth = 3;
    line(R * .05, R * .12, R * .55, R * .3);
    line(R * .55, R * .3, R * .5, R * .55 - reach * .3);
    // кость торчит из перелома
    ctx.strokeStyle = '#d8cdb2'; ctx.lineWidth = 1.5;
    line(R * .55, R * .3, R * .72, R * .36);

    // голова — свешена вперёд-вниз, смотрит на героя
    ctx.save();
    ctx.translate(R * .4, -R * .58);
    ctx.rotate(.3 + loll);
    ctx.strokeStyle = skinD; ctx.lineWidth = 3;
    line(-R * .2, R * .22, 0, R * .05);
    ctx.fillStyle = skinL; circ(0, 0, R * .5); ctx.fill(); OL(1.6);
    // содранный скальп
    ctx.fillStyle = skinD;
    ctx.beginPath(); ctx.arc(-R * .08, -R * .16, R * .24, Math.PI * .85, Math.PI * 1.95); ctx.closePath(); ctx.fill();
    // мутный глаз с тусклым зрачком
    ctx.fillStyle = '#e8e4cf'; circ(R * .2, -R * .08, R * .13); ctx.fill();
    ctx.fillStyle = '#1a1a20'; circ(R * .24, -R * .06, R * .05); ctx.fill();
    glow(GLOW.red, R * .2, -R * .08, R * .32, .3);
    // пустая глазница
    ctx.fillStyle = '#141810'; circ(-R * .08, -R * .06, R * .1); ctx.fill();
    // отвисшая челюсть (анимирована)
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.moveTo(-R * .02, R * .2);
    ctx.quadraticCurveTo(R * .1, R * (.44 + jaw * .26), R * .4, R * (.28 + jaw * .2));
    ctx.lineTo(R * .42, R * .14);
    ctx.closePath(); ctx.fill(); OL(1.2);
    // пасть
    ctx.fillStyle = '#1a0d10';
    ell(R * .2, R * .2 + jaw * .1, R * .13, R * .06 + jaw * .06); ctx.fill();
    // один уцелевший зуб
    ctx.fillStyle = '#d8cdb2';
    ctx.fillRect(R * .3, R * .16, R * .06, R * .09);
    ctx.restore();
  };
  BODY.ghoul = function (e, t, R) {
    // четвероногая падаль: сутулая дуга спины, костяшки рук о землю, клыкастая пасть
    var sc = Math.sin(t * 8 + e.ph);
    ctx.strokeStyle = '#5d6b50'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    // задние лапы (циркульные)
    line(-R * .5, R * .1, -R * .88, R * .48); line(-R * .88, R * .48, -R * .62 + sc, R * .92);
    line(-R * .18, R * .22, -R * .36, R * .6); line(-R * .36, R * .6, -R * .1 - sc, R * .92);
    // горб тела
    ctx.fillStyle = '#7a8a6a';
    ctx.beginPath();
    ctx.moveTo(-R * .72, R * .12);
    ctx.quadraticCurveTo(-R * .2, -R * .68, R * .46, -R * .3);
    ctx.quadraticCurveTo(R * .72, -R * .08, R * .6, R * .16);
    ctx.quadraticCurveTo(0, R * .42, -R * .72, R * .12);
    ctx.closePath(); ctx.fill(); OL(1.7);
    // оголённый позвоночник с остями
    ctx.strokeStyle = '#cfc4a6'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(-R * .6, 0); ctx.quadraticCurveTo(-R * .15, -R * .56, R * .45, -R * .28); ctx.stroke();
    for (var i = 0; i < 4; i++) {
      var u = i / 3, sx = -R * .5 + u * R * .9, sy = R * .04 - Math.sin(u * Math.PI) * R * .5;
      line(sx, sy - 2.4, sx + 1, sy + 1);
    }
    // длинные руки-костяшки
    ctx.strokeStyle = '#6a7a5c'; ctx.lineWidth = 2.6;
    line(R * .3, -R * .1, R * .6, R * .4 + sc); line(R * .6, R * .4 + sc, R * .78, R * .88);
    line(R * .08, 0, R * .3, R * .5 - sc); line(R * .3, R * .5 - sc, R * .42, R * .88);
    // голова низко, пасть
    ctx.fillStyle = '#93a37f'; circ(R * .62, -R * .28, R * .4); ctx.fill(); OL(1.5);
    ctx.fillStyle = '#42503a';
    ctx.beginPath(); ctx.moveTo(R * .45, -R * .14); ctx.lineTo(R * .98, -R * .06); ctx.lineTo(R * .5, R * .04); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#d8cdb2';
    tri(R * .55, -R * .1, R * .6, R * .02, R * .65, -R * .1);
    tri(R * .72, -R * .08, R * .77, R * .04, R * .82, -R * .08);
    eyes(R * .5, -R * .38, R * .76, -R * .38, 1.3, '#ffd23f', GLOW.gold);
  };
  BODY.gho = function (e, t, R) {
    // стенатель: парит, хвост-ленты, открытая пасть
    var hov = Math.sin(t * 3 + e.ph) * 2;
    var wl = Math.sin(t * 5 + e.ph);
    ctx.save(); ctx.translate(0, hov);
    ctx.globalAlpha *= 0.9;
    ctx.strokeStyle = 'rgba(150,170,215,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-R * .4, R * .6); ctx.quadraticCurveTo(-R * .7, R * 1.1 + wl * 2, -R * .3, R * 1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R * .3, R * .6); ctx.quadraticCurveTo(R * .6, R * 1.15 - wl * 2, R * .2, R * 1.5); ctx.stroke();
    ctx.fillStyle = '#b8c4dd';
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.25);
    ctx.quadraticCurveTo(-R * 1.05, -R * .1, -R * .8, R * .8);
    ctx.quadraticCurveTo(-R * .3, R * .45 + wl * 2, 0, R * .9);
    ctx.quadraticCurveTo(R * .3, R * .45 - wl * 2, R * .8, R * .8);
    ctx.quadraticCurveTo(R * 1.05, -R * .1, 0, -R * 1.25);
    ctx.closePath(); ctx.fill(); OL(1.5);
    ctx.fillStyle = '#8a97b8'; ell(R * .25, 0, R * .4, R * .55); ctx.fill();
    // пустые глаза и воющая пасть
    ctx.fillStyle = '#0a0a14';
    circ(-R * .25, -R * .4, R * .17); ctx.fill(); circ(R * .28, -R * .4, R * .17); ctx.fill();
    ell(R * .02, -R * .02, R * .13, R * .2 + wl * .05); ctx.fill();
    glow(GLOW.blue, 0, -R * .35, R * .9, .4);
    ctx.fillStyle = '#cfe0ff'; circ(-R * .22, -R * .43, R * .06); ctx.fill(); circ(R * .31, -R * .43, R * .06); ctx.fill();
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / 0.9);
    ctx.restore();
  };
  BODY.bat = function (e, t, R) {
    // вампир-мышь: перепонка с «пальцами», клыки, трепет
    var f = Math.sin(t * 16 + e.ph);
    var up = f * R * .8;
    ctx.save(); ctx.translate(0, Math.abs(f) * 1.2);
    for (var s = -1; s <= 1; s += 2) {
      ctx.fillStyle = '#3b3153';
      ctx.beginPath();
      ctx.moveTo(0, -R * .1);
      ctx.quadraticCurveTo(s * R * 1.1, -R * .7 - up, s * R * 1.8, -up * .9);
      ctx.quadraticCurveTo(s * R * 1.5, R * .15 - up * .4, s * R * .95, R * .3);
      ctx.quadraticCurveTo(s * R * .5, R * .15, 0, R * .1);
      ctx.closePath(); ctx.fill(); OL(1.2);
      ctx.strokeStyle = '#57496f'; ctx.lineWidth = 1;
      line(0, -R * .1, s * R * 1.4, -up * .8);
      line(0, -R * .05, s * R * 1.1, R * .05 - up * .5);
    }
    ctx.fillStyle = '#4a3f63'; ell(0, 0, R * .5, R * .6); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#5d5178'; ell(-R * .12, -R * .1, R * .26, R * .34); ctx.fill();
    ctx.fillStyle = '#4a3f63';
    tri(-R * .3, -R * .45, -R * .5, -R * 1.05, -R * .05, -R * .5);
    tri(R * .3, -R * .45, R * .5, -R * 1.05, R * .05, -R * .5);
    ctx.fillStyle = '#e8e2cf';
    tri(-R * .14, R * .28, -R * .08, R * .52, -R * .02, R * .28);
    tri(R * .14, R * .28, R * .08, R * .52, R * .02, R * .28);
    eyes(-R * .16, -R * .1, R * .16, -R * .1, 1.1, '#ff5b6b', GLOW.red);
    ctx.restore();
  };
  BODY.skel = function (e, t, R) {
    skeletonBody(e, t, R, false);
  };
  BODY.bone_archer = function (e, t, R) {
    skeletonBody(e, t, R, true);
  };
  function skeletonBody(e, t, R, bow) {
    // ходячий скелет: рёбра, таз, челюсть, оружие в костяной руке
    var st = Math.sin(t * 7 + e.ph) * 2.4;
    ctx.lineCap = 'round';
    // ноги
    ctx.strokeStyle = BONED; ctx.lineWidth = 1.8;
    line(-2, 3, -3 + st, R); line(2, 3, 3 - st, R);
    // позвоночник + таз
    line(0, -2, 0, 3.5);
    ctx.fillStyle = BONED; ell(0, 3.5, 2.4, 1.4); ctx.fill();
    // грудная клетка
    ctx.strokeStyle = BONE; ctx.lineWidth = 1.2;
    for (var i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.arc(0, -0.6 + i * 1.6, 3 - i * 0.6, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke();
    }
    // плечи
    line(-3.4, -2, 3.4, -2);
    // череп с челюстью
    ctx.fillStyle = BONE; circ(0, -R * .45, R * .44); ctx.fill(); OL(1.3);
    ctx.fillStyle = BONE; ctx.fillRect(-R * .2, -R * .3, R * .42, R * .15);
    ctx.strokeStyle = INK; ctx.lineWidth = 0.7;
    line(-R * .1, -R * .3, -R * .1, -R * .16); line(R * .02, -R * .3, R * .02, -R * .16);
    ctx.fillStyle = '#0c0816'; circ(-R * .15, -R * .5, R * .11); ctx.fill(); circ(R * .19, -R * .5, R * .11); ctx.fill();
    glow(GLOW.green, 0, -R * .48, R * .35, .4);
    if (bow) {
      // руки к луку, тетива, колчан
      ctx.strokeStyle = BONED; ctx.lineWidth = 1.5;
      line(2, -1.5, R * .5, -R * .3);
      line(-3, -1.5, -4.5, 1);
      ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(R * .65, -R * .3, R * .55, -1.25, 1.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(230,224,196,0.8)'; ctx.lineWidth = 1;
      line(R * .65 + Math.cos(-1.25) * R * .55, -R * .3 + Math.sin(-1.25) * R * .55,
           R * .65 + Math.cos(1.25) * R * .55, -R * .3 + Math.sin(1.25) * R * .55);
      ctx.save(); ctx.rotate(-0.5);
      ctx.fillStyle = '#6d5a3f'; ctx.fillRect(-R * .8, -R * .5, 2.4, 6);
      ctx.fillStyle = '#c9c2ab'; ctx.fillRect(-R * .8, -R * .56, 2.4, 1);
      ctx.restore();
    } else {
      // меч в костяной руке, вторая рука балансирует
      ctx.save(); ctx.translate(3, -1.5); ctx.rotate(-0.5 + Math.sin(t * 7 + e.ph) * 0.12);
      ctx.strokeStyle = BONED; ctx.lineWidth = 1.5; line(0, 0, 3, 1);
      ctx.strokeStyle = '#c9c2ab'; ctx.lineWidth = 2.2; line(3, 1, 3 + R * .7, 1 - R * .3);
      ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 1.6; line(2.6, -0.4, 3.6, 2.2);
      ctx.restore();
      ctx.strokeStyle = BONED; ctx.lineWidth = 1.5; line(-3, -1.5, -5, 1.5);
    }
  };
  BODY.cultist = function (e, t, R) {
    ctx.fillStyle = '#463061';
    ctx.beginPath();
    ctx.moveTo(0, -R - 3);
    ctx.quadraticCurveTo(-R * 1.05, R * .1, -R * .7, R);
    ctx.lineTo(R * .7, R);
    ctx.quadraticCurveTo(R * 1.05, R * .1, 0, -R - 3);
    ctx.closePath(); ctx.fill(); OL(1.7);
    ctx.fillStyle = '#2c1d40';
    ctx.beginPath();
    ctx.moveTo(R * .15, -R * .9);
    ctx.quadraticCurveTo(R * .75, 0, R * .55, R);
    ctx.lineTo(R * .7, R);
    ctx.quadraticCurveTo(R * 1.05, R * .1, 0, -R - 3);
    ctx.closePath(); ctx.fill();
    // капюшон-пустота
    ctx.fillStyle = '#0a0612'; ell(0, -R * .35, R * .34, R * .4); ctx.fill();
    eyes(-R * .12, -R * .38, R * .12, -R * .38, 1.3, '#c77dff', GLOW.purple);
    // парящие ладони
    var hh = Math.sin(t * 3 + e.ph) * 2;
    ctx.fillStyle = '#c9bfa4'; circ(-R * .62, R * .1 + hh, 2.2); ctx.fill(); circ(R * .62, R * .1 - hh, 2.2); ctx.fill();
    glow(GLOW.purple, 0, R * .1, R * .5, .25 + .1 * Math.sin(t * 4));
  };
  BODY.grave_guard = function (e, t, R) {
    // аура защиты
    ctx.strokeStyle = 'rgba(157,176,90,0.25)'; ctx.lineWidth = 2;
    ctx.setLineDash([8, 7]); ctx.lineDashOffset = -t * 14;
    circ(0, 0, R + 9); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#66744c'; ell(0, 2, R, R * .95); ctx.fill(); OL(2);
    ctx.fillStyle = '#7d8c5c'; ell(-R * .25, 0, R * .5, R * .6); ctx.fill();
    // шлем
    ctx.fillStyle = '#57643f'; circ(0, -R * .6, R * .5); ctx.fill(); OL(1.7);
    ctx.fillStyle = '#0c1207'; ctx.fillRect(-R * .34, -R * .68, R * .68, R * .2);
    glow(GLOW.green, 0, -R * .58, R * .45, .5);
    ctx.fillStyle = '#b6ff8d'; ctx.fillRect(-R * .24, -R * .64, R * .14, R * .1); ctx.fillRect(R * .1, -R * .64, R * .14, R * .1);
    // башенный щит
    ctx.fillStyle = '#4c583a';
    ctx.beginPath();
    ctx.moveTo(-R * .95, -R * .5); ctx.lineTo(-R * .5, -R * .5); ctx.lineTo(-R * .5, R * .7);
    ctx.quadraticCurveTo(-R * .72, R * .95, -R * .95, R * .7); ctx.closePath();
    ctx.fill(); OL(1.6);
    ctx.strokeStyle = '#9db05a'; ctx.lineWidth = 1.2; line(-R * .72, -R * .3, -R * .72, R * .6);
  };
  BODY.slime = function (e, t, R) { BODY._slime(e, t, R, false); };
  BODY.slime_mini = function (e, t, R) { BODY._slime(e, t, R, true); };
  BODY._slime = function (e, t, R, mini) {
    var sq = Math.sin(t * 5 + e.ph) * .12;
    ctx.globalAlpha *= .85;
    ctx.fillStyle = mini ? '#6aa854' : '#549a44';
    ell(0, 3, R * (1 + sq), R * (1 - sq) * .8); ctx.fill(); OL(1.6);
    ctx.fillStyle = 'rgba(214,255,176,0.5)';
    ell(-R * .3, -R * .3 + 3, R * .22, R * .12); ctx.fill();
    ctx.fillStyle = '#2f6b25';
    circ(-R * .3, 2, R * .2); ctx.fill(); circ(R * .28, 3, R * .24); ctx.fill();
    eyes(-R * .25, -R * .5 + 3, R * .25, -R * .5 + 3, 1.6, '#d6ffb0', GLOW.green);
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / .85);
  };
  BODY.spitter = function (e, t, R) {
    ctx.fillStyle = '#5da344'; ell(0, 0, R * 1.05, R * .82); ctx.fill(); OL(1.7);
    ctx.fillStyle = '#79bd5c'; ell(-R * .25, -R * .3, R * .45, R * .3); ctx.fill();
    // пасть
    ctx.fillStyle = '#1c3a10'; ell(R * .35, R * .05, R * .42, R * .3); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#c7ffb0';
    for (var i = 0; i < 3; i++) { circ(R * (.2 + i * .18), R * .02, 1.2); ctx.fill(); }
    // бородавки
    ctx.fillStyle = '#3c7028';
    circ(-R * .5, R * .3, R * .16); ctx.fill(); circ(-R * .1, R * .5, R * .13); ctx.fill();
    eyes(-R * .15, -R * .55, R * .25, -R * .55, 1.5, '#c7ffb0', GLOW.green);
  };
  BODY.wraith = function (e, t, R) {
    ctx.globalAlpha *= .55;
    var fl = Math.sin(t * 6 + e.ph) * R * .12;
    ctx.fillStyle = '#8a6bbf';
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.2);
    ctx.quadraticCurveTo(-R, -R * .1, -R * .8 + fl, R);
    ctx.quadraticCurveTo(-R * .3, R * .6, 0, R);
    ctx.quadraticCurveTo(R * .3, R * .6, R * .8 - fl, R);
    ctx.quadraticCurveTo(R, -R * .1, 0, -R * 1.2);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5e4788';
    ell(R * .2, 0, R * .4, R * .6); ctx.fill();
    eyes(-R * .2, -R * .4, R * .2, -R * .4, 1.5, '#ffd23f', GLOW.gold);
    glow(GLOW.purple, 0, -R * .2, R, .5);
    ctx.globalAlpha = Math.min(1, ctx.globalAlpha / .55);
  };
  BODY.bone_officer = function (e, t, R) {
    // аура командования
    ctx.fillStyle = 'rgba(182,87,255,0.10)'; circ(0, 4, R + 8); ctx.fill();
    ctx.strokeStyle = BONED; ctx.lineWidth = 1.8;
    line(-2, 4, -3, R); line(2, 4, 3, R); line(0, 0, 0, 5);
    // погоны
    ctx.fillStyle = '#6d5590';
    ell(-R * .5, -R * .15, R * .28, R * .18); ctx.fill(); OL(1.2);
    ell(R * .5, -R * .15, R * .28, R * .18); ctx.fill(); OL(1.2);
    // череп с короной
    ctx.fillStyle = BONE; circ(0, -R * .5, R * .5); ctx.fill(); OL(1.5);
    ctx.fillStyle = '#0c0816';
    circ(-R * .17, -R * .55, R * .12); ctx.fill(); circ(R * .17, -R * .55, R * .12); ctx.fill();
    glow(GLOW.purple, -R * .17, -R * .55, R * .3, .8); glow(GLOW.purple, R * .17, -R * .55, R * .3, .8);
    ctx.fillStyle = '#b657ff';
    ctx.beginPath();
    ctx.moveTo(-R * .4, -R * .85); ctx.lineTo(-R * .22, -R * 1.15); ctx.lineTo(0, -R * .9);
    ctx.lineTo(R * .22, -R * 1.15); ctx.lineTo(R * .4, -R * .85); ctx.closePath();
    ctx.fill(); OL(1.1);
    // штандарт
    ctx.strokeStyle = '#b3a97c'; ctx.lineWidth = 2.2; line(-R * .55, 2, -R * .95, -R * .95);
    ctx.fillStyle = '#7d5ba6';
    ctx.beginPath(); ctx.moveTo(-R * .95, -R * .95); ctx.lineTo(-R * .45, -R * .8); ctx.lineTo(-R * .9, -R * .5); ctx.closePath(); ctx.fill();
  };
  BODY.blood_fiend = function (e, t, R) {
    var rage = 1 + Math.max(0, 1 - e.hp / e.maxhp) * .5;
    ctx.fillStyle = '#a83342'; circ(0, 0, R); ctx.fill(); OL(1.7);
    ctx.fillStyle = '#c24a58'; ell(-R * .25, -R * .2, R * .5, R * .45); ctx.fill();
    // рога
    ctx.fillStyle = '#e8dcc2';
    ctx.beginPath(); ctx.moveTo(-R * .65, -R * .5); ctx.lineTo(-R * .5, -R * 1.1); ctx.lineTo(-R * .2, -R * .55); ctx.closePath(); ctx.fill(); OL(1.2);
    ctx.beginPath(); ctx.moveTo(R * .65, -R * .5); ctx.lineTo(R * .5, -R * 1.1); ctx.lineTo(R * .2, -R * .55); ctx.closePath(); ctx.fill(); OL(1.2);
    // клыки
    ctx.fillStyle = '#e8dcc2';
    ctx.beginPath(); ctx.moveTo(-R * .3, R * .35); ctx.lineTo(-R * .2, R * .62); ctx.lineTo(-R * .1, R * .35); ctx.fill();
    ctx.beginPath(); ctx.moveTo(R * .1, R * .35); ctx.lineTo(R * .2, R * .62); ctx.lineTo(R * .3, R * .35); ctx.fill();
    eyes(-R * .28, -R * .15, R * .28, -R * .15, 1.6, '#ffd23f', GLOW.gold);
    if (rage > 1.2) glow(GLOW.red, 0, 0, R * 1.4, (rage - 1.2) * .6);
  };
  BODY.martyr = function (e, t, R) {
    var fuse = e.fuseT || 0;
    var blink = fuse > 0 && Math.sin(t * 40) > 0;
    ctx.fillStyle = blink ? '#ff9d9d' : '#a83a48'; circ(0, 0, R); ctx.fill(); OL(1.6);
    ctx.fillStyle = '#c25a66'; ell(-R * .22, -R * .2, R * .45, R * .4); ctx.fill();
    // фитиль
    ctx.strokeStyle = '#e8dcc2'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(0, -R); ctx.quadraticCurveTo(R * .3, -R * 1.3, R * .15, -R * 1.45); ctx.stroke();
    if (fuse > 0) {
      glow(GLOW.orange, R * .15, -R * 1.45, 7, .9);
      ctx.strokeStyle = 'rgba(255,80,90,' + (0.5 + Math.sin(t * 30) * .4).toFixed(2) + ')';
      ctx.lineWidth = 2; circ(0, 0, R + 6); ctx.stroke();
    } else {
      glow(GLOW.orange, R * .15, -R * 1.45, 4, .5);
    }
    ctx.fillStyle = '#2b0f14';
    circ(-R * .22, -R * .05, 1.4); ctx.fill(); circ(R * .22, -R * .05, 1.4); ctx.fill();
  };
  BODY.worm = function (e, t, R) {
    var wr = Math.sin(t * 9 + e.ph) * 2;
    ctx.fillStyle = '#8a7f9a';
    circ(-R * .8, 2 + wr * .5, R * .6); ctx.fill(); OL(1.3);
    circ(0, 1 - wr * .5, R * .75); ctx.fill(); OL(1.3);
    circ(R * .8, 2 + wr * .5, R * .6); ctx.fill(); OL(1.3);
    ctx.fillStyle = '#a99fc0'; ell(R * .8, 0 + wr * .5, R * .3, R * .2); ctx.fill();
    eyes(R * .65, -R * .1 + wr * .5, R * .95, -R * .1 + wr * .5, 1.2, '#ff5b6b', GLOW.red);
  };
  BODY.flesh_golem = function (e, t, R) {
    var st = Math.sin(t * 3 + e.ph) * 2;
    ctx.fillStyle = '#7d4a52'; ell(0, 0, R * 1.05, R * .95); ctx.fill(); OL(2);
    ctx.fillStyle = '#96606a'; ell(-R * .3, -R * .2, R * .5, R * .45); ctx.fill();
    // швы
    ctx.strokeStyle = '#3d2128'; ctx.lineWidth = 1.4;
    line(-R * .5, -R * .2, R * .4, R * .1);
    for (var i = 0; i < 4; i++) { var xx = -R * .4 + i * R * .24; line(xx, -R * .12 + i * 1.5, xx + 3, R * .12 + i * 1.5); }
    // ядро
    glow(GLOW.red, R * .1, R * .1, 8, .7);
    ctx.fillStyle = '#ff6b7f'; circ(R * .1, R * .1, 2.4); ctx.fill();
    // кулаки
    ctx.fillStyle = '#6d3f47';
    circ(-R * .95, R * .3 + st, R * .34); ctx.fill(); OL(1.5);
    circ(R * .95, R * .3 - st, R * .34); ctx.fill(); OL(1.5);
    // голова-обрубок
    ctx.fillStyle = '#8a5560'; circ(0, -R * .75, R * .38); ctx.fill(); OL(1.5);
    eyes(-R * .13, -R * .8, R * .13, -R * .8, 1.4, '#ffd23f', GLOW.gold);
  };
  BODY.elite = function (e, t, R) {
    var ac = (e.affix && AFF[e.affix]) ? AFF[e.affix].c : '#ff9f43';
    // пульс-кольцо
    ctx.strokeStyle = ac; ctx.globalAlpha = .18 + .1 * Math.sin(t * 4);
    ctx.lineWidth = 2; ell(0, R * .55, R * 1.3, R * .45); ctx.stroke();
    ctx.globalAlpha = 1;
    // латный корпус
    ctx.fillStyle = '#2a2433'; ell(0, 2, R, R * .95); ctx.fill(); OL(2);
    ctx.fillStyle = '#3d3548'; ell(-R * .25, -R * .1, R * .5, R * .55); ctx.fill();
    // пластины
    ctx.strokeStyle = '#57506b'; ctx.lineWidth = 1.4;
    line(-R * .6, R * .1, R * .6, R * .1); line(-R * .5, R * .5, R * .5, R * .5);
    // плечи-шипы
    ctx.fillStyle = '#3d3548';
    ctx.beginPath(); ctx.moveTo(-R * .9, -R * .2); ctx.lineTo(-R * 1.15, -R * .8); ctx.lineTo(-R * .5, -R * .45); ctx.closePath(); ctx.fill(); OL(1.4);
    ctx.beginPath(); ctx.moveTo(R * .9, -R * .2); ctx.lineTo(R * 1.15, -R * .8); ctx.lineTo(R * .5, -R * .45); ctx.closePath(); ctx.fill(); OL(1.4);
    // шлем
    ctx.fillStyle = '#211c2c'; circ(0, -R * .65, R * .5); ctx.fill(); OL(1.7);
    ctx.fillStyle = '#0c0a12'; ctx.fillRect(-R * .32, -R * .72, R * .64, R * .18);
    // рога
    ctx.strokeStyle = '#c9bfa4'; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(-R * .35, -R * .95); ctx.quadraticCurveTo(-R * .7, -R * 1.4, -R * .45, -R * 1.6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(R * .35, -R * .95); ctx.quadraticCurveTo(R * .7, -R * 1.4, R * .45, -R * 1.6); ctx.stroke();
    eyes(-R * .18, -R * .63, R * .18, -R * .63, 1.7, ac, GLOW.white);
  };
  BODY.boss = function (e, t, R) {
    var kc = e.kc || '#b657ff';
    var ph = (e.p6 && e.p6.phase) || 1;
    // общий рунный круг (быстрее и ярче с фазой)
    ctx.strokeStyle = kc; ctx.globalAlpha = .3 + ph * .06; ctx.lineWidth = 1.6;
    ctx.setLineDash([7, 9]); ctx.lineDashOffset = t * (18 + ph * 10);
    ell(0, R * .95, R * 1.5, R * .5); ctx.stroke();
    ctx.setLineDash([]); ctx.globalAlpha = 1;
    // фазовая аура
    if (ph >= 2) glowHex(kc, 0, -R * .3, R * 1.5, .22 + .1 * Math.sin(t * 4));
    if (ph >= 3) {
      var pp = (t * 1.4) % 1;
      ctx.globalAlpha = (1 - pp) * .5; ctx.strokeStyle = kc; ctx.lineWidth = 2.5;
      circ(0, 0, R * (1.1 + pp * .8)); ctx.stroke(); ctx.globalAlpha = 1;
    }
    (BOSSKIND[e.p6death ? 'death' : e.kind] || BOSSKIND.litch)(e, t, R, kc, ph);
  };

  var BOSSKIND = {};

  /* ЛИХ — парящий архилич: кастующие кости, самоцвет-фелактерия, орбитальные осколки */
  BOSSKIND.litch = function (e, t, R, kc, ph) {
    var hov = Math.sin(t * 2.6) * 3;
    glow(GLOW.purple, 0, -6, R * 1.7, .35);
    // рваная мантия
    ctx.fillStyle = '#3a265e';
    ctx.beginPath();
    ctx.moveTo(0, -R + hov);
    ctx.quadraticCurveTo(-R * .95, -R * .1 + hov, -R * .8, R * .7);
    ctx.lineTo(-R * .5, R * .5); ctx.lineTo(-R * .25, R * .85); ctx.lineTo(0, R * .55);
    ctx.lineTo(R * .25, R * .85); ctx.lineTo(R * .5, R * .5); ctx.lineTo(R * .8, R * .7);
    ctx.quadraticCurveTo(R * .95, -R * .1 + hov, 0, -R + hov);
    ctx.closePath(); ctx.fill(); OL(2.2);
    ctx.fillStyle = '#241540';
    ctx.beginPath();
    ctx.moveTo(R * .15, -R * .8 + hov); ctx.quadraticCurveTo(R * .7, -R * .1 + hov, R * .55, R * .6);
    ctx.lineTo(R * .8, R * .7); ctx.quadraticCurveTo(R * .95, -R * .1 + hov, 0, -R + hov); ctx.closePath(); ctx.fill();
    // кастующие кости-руки
    for (var s = -1; s <= 1; s += 2) {
      var hx = s * R * .8, hy = -R * .1 + Math.sin(t * 3 + s) * 3;
      ctx.strokeStyle = '#ddd3b8'; ctx.lineWidth = 2.4;
      line(s * R * .4, -R * .3 + hov, hx, hy);
      ctx.fillStyle = '#ddd3b8'; circ(hx, hy, 3); ctx.fill(); OL(1.2);
      glowHex(kc, hx, hy - 4, 8 + ph * 2, .7);
    }
    // фелактерия на груди
    glowHex(kc, 0, -R * .15 + hov, 10 + ph * 2, .9);
    ctx.fillStyle = kc; circ(0, -R * .15 + hov, 3.4); ctx.fill(); OL(1.4);
    // орбитальные осколки
    for (var i = 0; i < 3; i++) {
      var a = t * (1 + ph * .4) + i * 2.09;
      glowHex(kc, Math.cos(a) * R * 1.15, -R * .3 + Math.sin(a) * R * .4, 6, .8);
    }
    // череп + корона
    ctx.fillStyle = '#ddd3b8'; circ(0, -R * .62 + hov, R * .36); ctx.fill(); OL(1.8);
    var eye = ph >= 3 ? '#ff5b6b' : '#c77dff';
    ctx.fillStyle = '#0a0512'; circ(-R * .13, -R * .65 + hov, R * .08); ctx.fill(); circ(R * .13, -R * .65 + hov, R * .08); ctx.fill();
    ctx.fillStyle = eye; circ(-R * .13, -R * .65 + hov, R * .04); ctx.fill(); circ(R * .13, -R * .65 + hov, R * .04); ctx.fill();
    glowHex(kc, 0, -R * .62 + hov, R * .45, .8);
    ctx.fillStyle = kc;
    ctx.beginPath();
    ctx.moveTo(-R * .3, -R * .9 + hov); ctx.lineTo(-R * .2, -R * 1.14 + hov); ctx.lineTo(-R * .07, -R * .92 + hov);
    ctx.lineTo(0, -R * 1.2 + hov); ctx.lineTo(R * .07, -R * .92 + hov); ctx.lineTo(R * .2, -R * 1.14 + hov); ctx.lineTo(R * .3, -R * .9 + hov);
    ctx.closePath(); ctx.fill(); OL(1.2);
  };

  /* ГНИЛОЙ ВЛАДЫКА — раздутый болотный царь: брюхо-топь, камышовая корона, грибы */
  BOSSKIND.marsh_king = function (e, t, R, kc, ph) {
    var puls = 1 + Math.sin(t * 2.2) * .04 + (ph >= 2 ? .05 : 0);
    // слизь стекает
    ctx.fillStyle = 'rgba(140,200,110,0.5)';
    ell(-R * .5, R * .8, R * .2, R * .12); ctx.fill(); ell(R * .4, R * .85, R * .16, R * .1); ctx.fill();
    // брюхо
    ctx.fillStyle = '#3f6b34';
    ell(0, R * .1, R * 1.02 * puls, R * .82 * puls); ctx.fill(); OL(2.4);
    ctx.fillStyle = '#57894a'; ell(-R * .3, -R * .12, R * .5, R * .4); ctx.fill();
    // пятна топи
    ctx.fillStyle = '#2a4a22';
    circ(R * .3, R * .2, R * .2); ctx.fill(); circ(-R * .15, R * .4, R * .15); ctx.fill(); circ(R * .5, -R * .05, R * .12); ctx.fill();
    if (ph >= 3) glow(GLOW.green, 0, R * .1, R * 1.2, .3);
    // маленькие руки-лапы
    ctx.strokeStyle = '#57894a'; ctx.lineWidth = 3;
    line(-R * .8, 0, -R * 1.05, R * .4); line(R * .8, 0, R * 1.05, R * .4);
    // голова с короной из камыша
    ctx.fillStyle = '#57894a'; circ(0, -R * .72, R * .34); ctx.fill(); OL(1.8);
    ctx.strokeStyle = '#8a7a55'; ctx.lineWidth = 2;
    line(-R * .18, -R * .95, -R * .22, -R * 1.3); line(0, -R * 1, 0, -R * 1.38); line(R * .18, -R * .95, R * .22, -R * 1.3);
    ctx.fillStyle = '#6d5a3f'; circ(-R * .22, -R * 1.32, 1.8); ctx.fill(); circ(0, -R * 1.4, 1.8); ctx.fill(); circ(R * .22, -R * 1.32, 1.8); ctx.fill();
    eyes(-R * .12, -R * .76, R * .12, -R * .76, R * .06, '#c7ffb0', GLOW.green);
    // грибы на плечах (светятся в ярости)
    ctx.fillStyle = '#b06a6f';
    ctx.beginPath(); ctx.arc(-R * .62, -R * .35, R * .14, Math.PI, 0); ctx.fill();
    ctx.beginPath(); ctx.arc(R * .66, -R * .28, R * .11, Math.PI, 0); ctx.fill();
    if (ph >= 2) { glow(GLOW.green, -R * .62, -R * .4, 8, .5); glow(GLOW.green, R * .66, -R * .33, 6, .5); }
  };

  /* КОСТЯНОЙ КОЛОСС — исполин: череп-голова, грудная клетка с ядром, дубины-руки */
  BOSSKIND.bone_colossus = function (e, t, R, kc, ph) {
    var step = Math.sin(t * 3) * 2;
    // ноги-столбы
    ctx.fillStyle = '#cfc4a6';
    ctx.fillRect(-R * .5, R * .5, R * .3, R * .5); ctx.fillRect(R * .2, R * .5, R * .3, R * .5);
    OL(1.6);
    // массивные руки с дубинами
    for (var s = -1; s <= 1; s += 2) {
      ctx.strokeStyle = '#cfc4a6'; ctx.lineWidth = R * .18;
      line(s * R * .75, -R * .3, s * R * 1.05, R * .25 + step * s);
      ctx.fillStyle = '#b3a686'; circ(s * R * 1.05, R * .3 + step * s, R * .24); ctx.fill(); OL(1.8);
      ctx.strokeStyle = '#8f866c'; ctx.lineWidth = 1.4;
      line(s * R * .95, R * .2, s * R * 1.15, R * .4); line(s * R * 1, R * .38, s * R * 1.12, R * .2);
    }
    // грудная клетка с ядром
    ctx.fillStyle = '#ddd3b8';
    ell(0, 0, R * .8, R * .72); ctx.fill(); OL(2.2);
    ctx.strokeStyle = '#a3946f'; ctx.lineWidth = 2;
    for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(0, -R * .1 + i * R * .16, R * .62 - i * R * .08, .2 * Math.PI, .8 * Math.PI); ctx.stroke(); }
    var core = ph >= 3 ? '#ffd23f' : kc;
    glowHex(core, 0, -R * .05, 12 + ph * 3, .95);
    ctx.fillStyle = core; circ(0, -R * .05, 4); ctx.fill(); OL(1.4);
    // плечевые шипы
    ctx.fillStyle = '#ddd3b8';
    tri(-R * .7, -R * .5, -R * .95, -R * .95, -R * .45, -R * .6);
    tri(R * .7, -R * .5, R * .95, -R * .95, R * .45, -R * .6);
    // череп-голова
    ctx.fillStyle = '#ddd3b8'; circ(0, -R * .78, R * .34); ctx.fill(); OL(1.8);
    ctx.fillStyle = '#0a0512'; circ(-R * .12, -R * .8, R * .08); ctx.fill(); circ(R * .12, -R * .8, R * .08); ctx.fill();
    glowHex(kc, -R * .12, -R * .8, R * .2, .8); glowHex(kc, R * .12, -R * .8, R * .2, .8);
  };

  /* КРАСНАЯ ГЕРЦОГИНЯ — статная вампирша: высокий воротник, диадема, кровавые сферы */
  BOSSKIND.blood_duchess = function (e, t, R, kc, ph) {
    var hov = Math.sin(t * 2.4) * 2.5;
    glow(GLOW.red, 0, -4, R * 1.5, .3);
    // платье с разрезом
    ctx.fillStyle = '#5c2434';
    ctx.beginPath();
    ctx.moveTo(-R * .4, -R * .5 + hov);
    ctx.quadraticCurveTo(-R * .95, R * .3, -R * .8, R * .85);
    ctx.lineTo(-R * .2, R * .7); ctx.lineTo(0, R * .88); ctx.lineTo(R * .3, R * .7);
    ctx.quadraticCurveTo(R * .9, R * .3, R * .4, -R * .5 + hov);
    ctx.closePath(); ctx.fill(); OL(2.2);
    ctx.fillStyle = '#3a1420';
    ctx.beginPath(); ctx.moveTo(R * .1, -R * .45 + hov); ctx.quadraticCurveTo(R * .7, R * .3, R * .55, R * .78);
    ctx.lineTo(R * .8, R * .85); ctx.quadraticCurveTo(R * .95, R * .3, R * .4, -R * .5 + hov); ctx.closePath(); ctx.fill();
    // высокий воротник за головой
    ctx.fillStyle = '#7d2438';
    ctx.beginPath();
    ctx.moveTo(-R * .45, -R * .6 + hov); ctx.quadraticCurveTo(-R * .6, -R * 1.25 + hov, -R * .2, -R * 1.05 + hov);
    ctx.lineTo(0, -R * .85 + hov); ctx.lineTo(R * .2, -R * 1.05 + hov);
    ctx.quadraticCurveTo(R * .6, -R * 1.25 + hov, R * .45, -R * .6 + hov);
    ctx.closePath(); ctx.fill(); OL(1.6);
    // бледное лицо
    ctx.fillStyle = '#e8dccf'; circ(0, -R * .72 + hov, R * .28); ctx.fill(); OL(1.5);
    ctx.fillStyle = '#0a0512'; circ(-R * .1, -R * .75 + hov, R * .06); ctx.fill(); circ(R * .1, -R * .75 + hov, R * .06); ctx.fill();
    ctx.fillStyle = '#ff4757'; circ(-R * .1, -R * .75 + hov, R * .03); ctx.fill(); circ(R * .1, -R * .75 + hov, R * .03); ctx.fill();
    // диадема
    ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.arc(0, -R * .82 + hov, R * .26, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.fillStyle = '#ff4757'; circ(0, -R * 1.05 + hov, 2); ctx.fill();
    // кровавые сферы (больше с фазой)
    var nb = 2 + ph;
    for (var i = 0; i < nb; i++) {
      var a = t * 1.4 + i * (6.28 / nb);
      glow(GLOW.red, Math.cos(a) * R * 1.1, -R * .3 + Math.sin(a) * R * .45, 7 + ph, .85);
    }
  };

  /* СМЕРТЬ — финал: капюшон-пустота, коса, песочные часы, души в орбите */
  BOSSKIND.death = function (e, t, R, kc, ph) {
    var hov = Math.sin(t * 2.2) * 3;
    glow(GLOW.white, 0, -6, R * 1.6, .25);
    // рваный плащ
    ctx.fillStyle = '#1a1626';
    ctx.beginPath();
    ctx.moveTo(0, -R * 1.05 + hov);
    ctx.quadraticCurveTo(-R * 1, -R * .1 + hov, -R * .85, R * .8);
    ctx.lineTo(-R * .5, R * .55); ctx.lineTo(-R * .2, R * .9); ctx.lineTo(R * .1, R * .6); ctx.lineTo(R * .4, R * .88); ctx.lineTo(R * .8, R * .75);
    ctx.quadraticCurveTo(R, -R * .1 + hov, 0, -R * 1.05 + hov);
    ctx.closePath(); ctx.fill(); OL(2.4);
    // коса
    ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = 3;
    line(R * .7, R * .8, R * .5, -R * 1.1);
    ctx.fillStyle = '#e8e2cf';
    ctx.beginPath();
    ctx.moveTo(R * .5, -R * 1.1);
    ctx.quadraticCurveTo(-R * .6, -R * 1.35, -R * 1.1, -R * .8);
    ctx.quadraticCurveTo(-R * .3, -R * 1.0, R * .5, -R * .92);
    ctx.closePath(); ctx.fill(); OL(1.6);
    if (ph >= 2) glow(GLOW.white, -R * .3, -R * 1.1, 14, .5);
    // капюшон-пустота
    ctx.fillStyle = '#231d33'; circ(0, -R * .72 + hov, R * .36); ctx.fill(); OL(1.8);
    ctx.fillStyle = '#05030a'; circ(R * .03, -R * .7 + hov, R * .26); ctx.fill();
    var eye = ph >= 3 ? '#ff5b6b' : '#c7f4ff';
    ctx.fillStyle = eye; circ(-R * .05, -R * .72 + hov, R * .05); ctx.fill(); circ(R * .12, -R * .72 + hov, R * .05); ctx.fill();
    glow(GLOW.blue, R * .03, -R * .72 + hov, R * .35, .8);
    // песочные часы на поясе
    ctx.strokeStyle = '#e8b34a'; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-R * .3, R * .1); ctx.lineTo(-R * .16, R * .28); ctx.lineTo(-R * .3, R * .46); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-R * .16, R * .1); ctx.lineTo(-R * .3, R * .28); ctx.lineTo(-R * .16, R * .46); ctx.closePath(); ctx.stroke();
    // души в орбите
    for (var i = 0; i < 4; i++) {
      var a = t * (1.2 + ph * .3) + i * 1.57;
      glow(GLOW.green, Math.cos(a) * R * 1.2, -R * .2 + Math.sin(a) * R * .5, 7, .8);
    }
  };
  BODY._default = function (e, t, R) {
    ctx.fillStyle = '#5d8f46'; circ(0, 0, R); ctx.fill(); OL(1.6);
    ctx.fillStyle = '#77ab5c'; ell(-R * .25, -R * .2, R * .45, R * .4); ctx.fill();
    eyes(-R * .25, -R * .1, R * .25, -R * .1, 1.5, '#ff5b6b', GLOW.red);
  };

  function drawEnemy(e, t) {
    var p = W2S(e.x, e.y), x = p[0], y = p[1];
    var R = e.r;
    if (x < -80 || x > VW + 80 || y < -80 || y > VH + 80) return;
    var G = N.G;
    var face = (G && G.P && G.P.x > e.x) ? 1 : -1;
    /* читабельность: подсветка силуэта, чтобы враг не сливался с полом */
    glowHex(e.elite ? '#5a3a7a' : '#2e2545', x, y, R * 2.1, e.elite ? .5 : .38);
    shadowAt(x, y + R * .75, R * .95);
    var bob = Math.sin(t * 4 + e.ph) * 1.5;
    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale((e.squashX || 1) * (face || 1), e.squashY || 1);
    var fn = BODY[e.type] || BODY._default;
    fn(e, t, R, face);
    if (e.slowT > 0) {
      ctx.globalAlpha = .22; ctx.fillStyle = '#8dff57';
      circ(0, 0, R + 3); ctx.fill(); ctx.globalAlpha = 1;
    }
    if (e.hitT > 0) {
      ctx.globalAlpha = Math.min(.85, e.hitT * 7);
      ctx.fillStyle = '#fff'; circ(0, 0, R + 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (e.shields > 0) {
      for (var i = 0; i < e.shields; i++) {
        var a = t * 3 + TAU / 3 * i, sx = Math.cos(a) * (R + 14), sy = Math.sin(a) * (R + 14);
        glow(GLOW.blue, sx, sy, 9, .6);
        ctx.fillStyle = '#9fc4ff'; ctx.fillRect(sx - 2.5, sy - 5, 5, 10);
      }
    }
    ctx.restore();
    // имя аффикса
    if (e.elite && e.affix && AFF[e.affix]) {
      var A = AFF[e.affix], txt = A.n;
      ctx.save();
      ctx.font = '700 8px Rubik, sans-serif';
      var wd = ctx.measureText(txt).width, ly = y - R - 27;
      ctx.fillStyle = 'rgba(8,5,14,0.85)';
      ctx.fillRect(x - wd / 2 - 5, ly - 9, wd + 10, 13);
      ctx.strokeStyle = A.c; ctx.lineWidth = 1;
      ctx.strokeRect(x - wd / 2 - 5, ly - 9, wd + 10, 13);
      ctx.fillStyle = A.c;
      ctx.fillText(txt, x - wd / 2, ly + 1);
      ctx.restore();
    }
    // полоса ХП
    if (e.elite) {
      var w = e.boss ? 84 : 46;
      bar(x, y - R - 12, w, 4, e.hp / e.maxhp, e.boss ? '#b657ff' : '#ff9f43');
    }
  }

  /* ---------- подключение ---------- */
  N.gfx.shadow(shadowAt);
  N.gfx.floor(drawFloor);
  N.gfx.hero(drawHero);
  N.gfx.minion(drawMinion);
  N.gfx.golem(drawGolem);
  N.gfx.enemy(drawEnemy);
  window.__nxGfxActive = true;
})();
