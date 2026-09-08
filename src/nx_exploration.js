/* ============ NECRO v2 · EXPLORATION WORLD ============
   #3: deterministic world descriptors only. No live encounter entities here. */
(function () {
  'use strict';
  var N = window.__necro;
  if (!N || !N.exploration) return;
  var X = N.exploration;

  var AREA_SIZE = 1400;
  var SAFE_RADIUS = 420;
  var QUICK_DISCOVER_RADIUS = 700;
  var currentRun = null;
  var currentGame = null;

  function mix32(x) {
    x = (x ^ (x >>> 16)) >>> 0;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }

  function areaSeed(seed, ax, ay) {
    var h = seed >>> 0;
    h ^= Math.imul(ax | 0, 0x9e3779b1);
    h ^= Math.imul(ay | 0, 0x85ebca77);
    return mix32(h >>> 0);
  }

  function localRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function describeArea(seed, ax, ay) {
    var rng = localRng(areaSeed(seed, ax, ay));
    var x, y;
    if (ax === 0 && ay === 0) {
      var angle = rng() * Math.PI * 2;
      var radius = SAFE_RADIUS + 100 + rng() * 120;
      x = Math.round(Math.cos(angle) * radius);
      y = Math.round(Math.sin(angle) * radius);
    } else {
      x = Math.round(ax * AREA_SIZE + (rng() - .5) * AREA_SIZE * .45);
      y = Math.round(ay * AREA_SIZE + (rng() - .5) * AREA_SIZE * .45);
    }
    return [{
      id: 'opportunity:' + ax + ':' + ay,
      kind: 'opportunity', hostile: true, state: 'generated',
      area: { x: ax, y: ay }, x: x, y: y
    }];
  }

  function createWorld(seed) {
    seed = seed >>> 0;
    var areas = new Map();
    function visitArea(ax, ay) {
      var key = ax + ',' + ay;
      if (!areas.has(key)) areas.set(key, describeArea(seed, ax, ay));
      return areas.get(key).map(copyDescriptor);
    }
    function snapshot() {
      var all = [];
      areas.forEach(function (list) { list.forEach(function (d) { all.push(copyDescriptor(d)); }); });
      all.sort(function (a, b) { return a.id.localeCompare(b.id); });
      return all;
    }
    return { seed: seed, visitArea: visitArea, snapshot: snapshot };
  }

  function copyDescriptor(d) {
    return {
      id: d.id, kind: d.kind, hostile: d.hostile, state: d.state,
      area: { x: d.area.x, y: d.area.y }, x: d.x, y: d.y
    };
  }

  function freshSeed() {
    var v = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(v);
      return v[0] >>> 0;
    }
    return mix32((Date.now() ^ Math.floor((window.performance?.now() || 0) * 1000)) >>> 0);
  }

  function ensureRun() {
    if (X.mode !== 'exploration' || !N.G) return null;
    if (currentGame !== N.G) {
      currentGame = N.G;
      currentRun = createWorld(freshSeed());
      currentGame.explorationSeed = currentRun.seed;
      currentRun.visitArea(0, 0);
    }
    return currentRun;
  }

  function simTick() {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P) return;
    var ax = Math.round(N.G.P.x / AREA_SIZE);
    var ay = Math.round(N.G.P.y / AREA_SIZE);
    run.visitArea(ax, ay);
  }

  function drawWorld(ctx) {
    var run = ensureRun();
    if (!run || !N.w2s) return;
    var cam = N.cam ? N.cam() : { w: ctx.canvas.width, h: ctx.canvas.height };
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 20px Rubik, sans-serif';
    var player = N.G && N.G.P;
    var visible = run.snapshot();
    if (player) visible.sort(function (a, b) {
      var adx = a.x - player.x, ady = a.y - player.y;
      var bdx = b.x - player.x, bdy = b.y - player.y;
      return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
    });
    visible.slice(0, 1).forEach(function (d) {
      var p = N.w2s(d.x, d.y);
      var margin = 24;
      var sx = Math.max(margin, Math.min(cam.w - margin, p[0]));
      var sy = Math.max(margin, Math.min(cam.h - margin, p[1]));
      ctx.globalAlpha = .9;
      ctx.fillStyle = '#ffd23f';
      ctx.fillText('◆', sx, sy);
    });
    ctx.globalAlpha = .55;
    ctx.textAlign = 'left';
    ctx.font = '600 10px Rubik, sans-serif';
    ctx.fillStyle = '#d9d2bd';
    ctx.fillText('SEED ' + run.seed, 12, Math.max(14, cam.h - 14));
    ctx.restore();
  }

  X.world = {
    areaSize: AREA_SIZE,
    safeRadius: SAFE_RADIUS,
    quickDiscoverRadius: QUICK_DISCOVER_RADIUS,
    describeArea: describeArea,
    create: createWorld,
    current: function () { return ensureRun(); }
  };
  X.setSimulationHook(simTick);
  X.setWorldRenderHook(drawWorld);
})();
