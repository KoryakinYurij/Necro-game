/* ============ NECRO v2 · SVG-SMIL АДАПТЕР (зомби из внешнего SVG) ============
   Парсит SMIL-анимацию (морфинг d + animateTransform), запекает цикл 2.4s
   в спрайт-ленту и рисует её кадрами на Canvas игры. Работает в браузере и jsdom. */
(function () {
  'use strict';
  var svgText = window.__ZOMBIE_SVG;
  if (!svgText || typeof DOMParser === 'undefined') return;
  var doc;
  try { doc = new DOMParser().parseFromString(svgText, 'image/svg+xml'); } catch (e) { return; }
  if (!doc || doc.getElementsByTagName('parsererror').length) return;
  var NSG = 'http://www.w3.org/2000/svg';
  var root = doc.getElementById('zombie') || doc.documentElement;
  if (!root) return;

  var DUR = 2.4, K = 24, F = 96, VB = 32;
  var CMDN = { M: 2, L: 2, Q: 4, Z: 0, H: 1, V: 1, C: 6, S: 4, T: 2, A: 7 };

  function nums(s) {
    var out = [], re = /-?\d*\.?\d+(?:e[-+]?\d+)?/gi, m;
    while ((m = re.exec(s))) out.push(parseFloat(m[0]));
    return out;
  }
  function parseD(d) {
    var ops = [], re = /([MLQZHVCSTA])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi, m, cur = null;
    while ((m = re.exec(d))) {
      if (m[1]) { cur = { c: m[1].toUpperCase(), n: [] }; ops.push(cur); }
      else if (cur) cur.n.push(parseFloat(m[0]));
    }
    return ops;
  }
  function flat(ops) {
    var a = [];
    for (var i = 0; i < ops.length; i++) for (var j = 0; j < ops[i].n.length; j++) a.push(ops[i].n[j]);
    return a;
  }
  function lerpArr(a, b, u) {
    var o = new Array(a.length);
    for (var i = 0; i < a.length; i++) o[i] = a[i] + (b[i] - a[i]) * u;
    return o;
  }
  function seg(keyTimes, values, p) {
    if (p <= keyTimes[0]) return values[0];
    for (var i = 0; i < keyTimes.length - 1; i++) {
      if (p >= keyTimes[i] && p <= keyTimes[i + 1]) {
        var u = (keyTimes[i + 1] - keyTimes[i]) ? (p - keyTimes[i]) / (keyTimes[i + 1] - keyTimes[i]) : 0;
        return { a: values[i], b: values[i + 1], u: u };
      }
    }
    return values[values.length - 1];
  }

  //预处理: для каждого path с <animate d> — ключи
  function prepPath(el) {
    var an = null, ch = el.childNodes;
    for (var i = 0; i < ch.length; i++) if (ch[i].nodeType === 1 && ch[i].getAttribute && ch[i].getAttribute('attributeName') === 'd') an = ch[i];
    var base = parseD(el.getAttribute('d') || '');
    var node = { el: el, cmds: base, frames: null, keyTimes: null };
    if (an) {
      var vals = (an.getAttribute('values') || '').split(';');
      var kt = (an.getAttribute('keyTimes') || '').split(';').map(parseFloat);
      node.frames = vals.map(function (v) { return flat(parseD(v)); });
      node.keyTimes = kt.length === vals.length ? kt : null;
      if (!node.keyTimes) { // равномерные
        node.keyTimes = vals.map(function (_, i) { return i / (vals.length - 1); });
      }
    }
    return node;
  }
  function prepTransform(el) {
    var an = null, ch = el.childNodes;
    for (var i = 0; i < ch.length; i++) if (ch[i].nodeType === 1 && ch[i].getAttribute && ch[i].getAttribute('attributeName') === 'transform') an = ch[i];
    if (an) {
      var type = an.getAttribute('type');
      var vals = (an.getAttribute('values') || '').split(';').map(nums);
      var kt = (an.getAttribute('keyTimes') || '').split(';').map(parseFloat);
      if (kt.length !== vals.length) kt = vals.map(function (_, i) { return i / (vals.length - 1); });
      return { anim: { type: type, vals: vals, kt: kt } };
    }
    var st = el.getAttribute('transform');
    if (st) return { static: parseStatic(st) };
    return null;
  }
  function parseStatic(st) {
    var ops = [], re = /(\w+)\s*\(([^)]*)\)/g, m;
    while ((m = re.exec(st))) ops.push({ type: m[1], nums: nums(m[2]) });
    return ops;
  }
  function applyOp(ctx, op) {
    var n = op.nums;
    if (op.type === 'translate') ctx.translate(n[0] || 0, n[1] || 0);
    else if (op.type === 'scale') { var s = n[0] || 1; ctx.scale(s, n.length > 1 ? n[1] : s); }
    else if (op.type === 'rotate') {
      var a = (n[0] || 0) * Math.PI / 180;
      if (n.length >= 3) { ctx.translate(n[1], n[2]); ctx.rotate(a); ctx.translate(-n[1], -n[2]); }
      else ctx.rotate(a);
    }
  }
  function effTransform(tp, p) {
    if (!tp) return [];
    if (tp.static) return tp.static;
    var s = seg(tp.anim.kt, tp.anim.vals, p);
    var v = (s.a && s.b) ? lerpArr(s.a, s.b, s.u) : s;
    return [{ type: tp.anim.type, nums: v }];
  }

  function drawNode(el, ctx, p, inh) {
    var tag = el.nodeType === 1 ? el.tagName : '';
    if (tag !== 'g' && tag !== 'path') return;
    ctx.save();
    var tp = el.__tp;
    var ops = effTransform(tp, p);
    for (var i = 0; i < ops.length; i++) applyOp(ctx, ops[i]);
    // наследование stroke
    var inh2 = { sc: inh.sc, sw: inh.sw };
    if (el.getAttribute) {
      var sc = el.getAttribute('stroke'); if (sc && sc !== 'none') inh2.sc = sc;
      var sw = el.getAttribute('stroke-width'); if (sw) inh2.sw = parseFloat(sw);
    }
    if (tag === 'path') {
      drawPath(el, ctx, p, inh2);
    } else {
      var ch = el.childNodes;
      for (var j = 0; j < ch.length; j++) if (ch[j].nodeType === 1) drawNode(ch[j], ctx, p, inh2);
    }
    ctx.restore();
  }
  function drawPath(el, ctx, p, inh) {
    var pn = el.__pn;
    var numbers;
    if (pn.frames) {
      var s = seg(pn.keyTimes, pn.frames, p);
      numbers = (s.a && s.b) ? lerpArr(s.a, s.b, s.u) : s;
    } else {
      numbers = flat(pn.cmds);
    }
    // replay
    var idx = 0;
    ctx.beginPath();
    for (var i = 0; i < pn.cmds.length; i++) {
      var c = pn.cmds[i].c, n = CMDN[c] || 0;
      if (c === 'M') ctx.moveTo(numbers[idx], numbers[idx + 1]);
      else if (c === 'L') ctx.lineTo(numbers[idx], numbers[idx + 1]);
      else if (c === 'Q') ctx.quadraticCurveTo(numbers[idx], numbers[idx + 1], numbers[idx + 2], numbers[idx + 3]);
      else if (c === 'C') ctx.bezierCurveTo(numbers[idx], numbers[idx + 1], numbers[idx + 2], numbers[idx + 3], numbers[idx + 4], numbers[idx + 5]);
      else if (c === 'Z') ctx.closePath();
      idx += n;
    }
    var fill = el.getAttribute('fill');
    var strokeAttr = el.getAttribute('stroke');
    if (fill && fill !== 'none') { ctx.fillStyle = fill; ctx.fill(); }
    var wantStroke = strokeAttr !== 'none' && (strokeAttr || el.getAttribute('stroke-width') || (fill === 'none'));
    if (wantStroke) {
      ctx.strokeStyle = (strokeAttr && strokeAttr !== 'none') ? strokeAttr : (inh.sc || '#202c28');
      ctx.lineWidth = parseFloat(el.getAttribute('stroke-width') || inh.sw || 2);
      ctx.stroke();
    }
  }

  // precompute метаданных
  (function walk(el) {
    if (el.nodeType !== 1) return;
    if (el.tagName === 'g') el.__tp = prepTransform(el);
    if (el.tagName === 'path') el.__pn = prepPath(el);
    var ch = el.childNodes;
    for (var i = 0; i < ch.length; i++) walk(ch[i]);
  })(root);
  var rootInh = { sc: root.getAttribute('stroke') || '#202c28', sw: parseFloat(root.getAttribute('stroke-width') || 3.4) };

  // запекаем ленту
  var strip = doc.createElement ? document.createElement('canvas') : null;
  if (!strip) return;
  strip.width = F * K; strip.height = F;
  var sctx = strip.getContext('2d');
  if (!sctx) return;
  sctx.lineJoin = 'round'; sctx.lineCap = 'round';
  for (var k = 0; k < K; k++) {
    sctx.setTransform(1, 0, 0, 1, 0, 0);
    sctx.clearRect(k * F, 0, F, F);
    sctx.setTransform(F / VB, 0, 0, F / VB, k * F, 0);
    drawNode(root, sctx, (k / K), rootInh);
  }

  window.__zombieStrip = strip;
  window.__drawZombieSprite = function (ctx, t, R) {
    var phase = ((t % DUR) + DUR) % DUR / DUR;
    var k = Math.min(K - 1, Math.floor(phase * K));
    var w = R * 2.6, h = R * 2.6;
    var ux = w / VB, uy = h / VB;
    ctx.save();
    ctx.translate(-16 * ux, R * 0.8 - 30 * uy);
    ctx.drawImage(strip, k * F, 0, F, F, 0, 0, w, h);
    ctx.restore();
  };
  window.__zombieAdapterReady = true;
})();
