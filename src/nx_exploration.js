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
  var ACTIVATION_RADIUS = 180;
  var LEASH_RADIUS = 520;
  var DELAYED_SPAWN_MS = 180;
  var ENCOUNTER_SLOTS = [
    { id: 'front-left', type: 'zom', dx: -36, dy: 18, delay: 0 },
    { id: 'front-right', type: 'zom', dx: 36, dy: 18, delay: 0 },
    { id: 'rear', type: 'zom', dx: 0, dy: -42, delay: DELAYED_SPAWN_MS }
  ];
  var currentRun = null;
  var currentGame = null;
  var encounterStates = new WeakMap();

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
    var run = { seed: seed, visitArea: visitArea, snapshot: snapshot };
    encounterStates.set(run, new Map());
    return run;
  }

  function copyDescriptor(d) {
    return {
      id: d.id, kind: d.kind, hostile: d.hostile, state: d.state,
      area: { x: d.area.x, y: d.area.y }, x: d.x, y: d.y
    };
  }

  function stateMap(run) {
    var map = encounterStates.get(run);
    if (!map) { map = new Map(); encounterStates.set(run, map); }
    return map;
  }

  function descriptorFor(run, id) {
    var all = run ? run.snapshot() : [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function mutableEncounter(run, id) {
    var descriptor = descriptorFor(run, id);
    if (!descriptor || !descriptor.hostile) return null;
    var map = stateMap(run);
    if (!map.has(id)) map.set(id, {
      id: id, status: 'dormant', activation: 0,
      defeated: new Set(), live: new Map(), pending: [], clearCount: 0
    });
    return map.get(id);
  }

  function encounterView(run, id) {
    var state = mutableEncounter(run, id);
    if (!state) return null;
    var liveSlots = [];
    state.live.forEach(function (enemy, slotId) { if (enemy && !enemy.dead) liveSlots.push(slotId); });
    return {
      id: state.id, status: state.status, activation: state.activation,
      defeatedSlots: Array.from(state.defeated).sort(), liveSlots: liveSlots.sort(),
      clearCount: state.clearCount
    };
  }

  function spawnEncounterSlot(run, descriptor, state, slot, activation) {
    if (currentRun !== run || state.status !== 'active' || state.activation !== activation || state.defeated.has(slot.id)) return null;
    var existing = state.live.get(slot.id);
    if (existing && !existing.dead) return existing;
    var enemy = X.spawn(slot.type, descriptor.x + slot.dx, descriptor.y + slot.dy, null);
    if (!enemy) return null;
    enemy.__explorationEncounterId = descriptor.id;
    enemy.__explorationActivation = activation;
    enemy.__explorationSlotId = slot.id;
    state.live.set(slot.id, enemy);
    return enemy;
  }

  function queueEncounterSlot(run, descriptor, state, slot, activation) {
    if (!slot.delay) return spawnEncounterSlot(run, descriptor, state, slot, activation);
    state.pending.push({ slot: slot, left: slot.delay / 1000, activation: activation });
    return null;
  }

  function updatePendingSlots(run, descriptor, state, dt) {
    if (!state.pending.length || state.status !== 'active') return;
    var keep = [];
    state.pending.forEach(function (pending) {
      if (pending.activation !== state.activation) return;
      pending.left -= dt;
      if (pending.left <= 0) spawnEncounterSlot(run, descriptor, state, pending.slot, pending.activation);
      else keep.push(pending);
    });
    state.pending = keep;
  }

  function activateEncounter(run, descriptor) {
    var state = mutableEncounter(run, descriptor.id);
    if (!state || state.status !== 'dormant') return false;
    state.status = 'active';
    state.activation += 1;
    state.live.clear();
    state.pending = [];
    var activation = state.activation;
    ENCOUNTER_SLOTS.forEach(function (slot) {
      if (!state.defeated.has(slot.id)) queueEncounterSlot(run, descriptor, state, slot, activation);
    });
    return true;
  }

  function collectDefeated(state) {
    var deadSlots = [];
    state.live.forEach(function (enemy, slotId) { if (enemy && enemy.dead) deadSlots.push(slotId); });
    deadSlots.forEach(function (slotId) { state.defeated.add(slotId); state.live.delete(slotId); });
  }

  function allDefeated(state) {
    return ENCOUNTER_SLOTS.every(function (slot) { return state.defeated.has(slot.id); });
  }

  function removeLiveEnemies(state) {
    if (N.G && N.G.enemies && state.live.size) {
      var refs = new Set(Array.from(state.live.values()));
      for (var i = N.G.enemies.length - 1; i >= 0; i--) if (refs.has(N.G.enemies[i])) N.G.enemies.splice(i, 1);
    }
    state.live.clear();
    state.pending = [];
  }

  function clearEncounter(state) {
    if (!state || state.status !== 'active' || !allDefeated(state)) return false;
    removeLiveEnemies(state);
    state.status = 'cleared';
    state.clearCount += 1;
    return true;
  }

  function disengageEncounter(state) {
    if (!state || state.status !== 'active') return false;
    collectDefeated(state);
    if (allDefeated(state)) return clearEncounter(state);
    removeLiveEnemies(state);
    state.status = 'dormant';
    return true;
  }

  function updateEncounters(run, dt) {
    if (!run || !N.G || !N.G.P) return;
    var player = N.G.P;
    run.snapshot().filter(function (d) { return d.hostile; }).forEach(function (descriptor) {
      var state = mutableEncounter(run, descriptor.id);
      var dx = player.x - descriptor.x, dy = player.y - descriptor.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (state.status === 'active') {
        updatePendingSlots(run, descriptor, state, dt);
        collectDefeated(state);
        if (allDefeated(state)) { clearEncounter(state); return; }
        if (distance > LEASH_RADIUS) { disengageEncounter(state); return; }
      }
      if (state.status === 'dormant' && distance <= ACTIVATION_RADIUS) activateEncounter(run, descriptor);
    });
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

  function simTick(dt) {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P) return;
    var ax = Math.round(N.G.P.x / AREA_SIZE);
    var ay = Math.round(N.G.P.y / AREA_SIZE);
    run.visitArea(ax, ay);
    updateEncounters(run, dt || 0);
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
      var encounter = encounterView(run, d.id);
      var mark = encounter && encounter.status === 'cleared' ? '✓' : encounter && encounter.status === 'active' ? '✦' : '◆';
      ctx.globalAlpha = .9;
      ctx.fillStyle = encounter && encounter.status === 'cleared' ? '#8dff57' : encounter && encounter.status === 'active' ? '#ff4757' : '#ffd23f';
      ctx.fillText(mark, sx, sy);
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
  X.encounters = {
    activationRadius: ACTIVATION_RADIUS,
    leashRadius: LEASH_RADIUS,
    delayedSpawnMs: DELAYED_SPAWN_MS,
    get: function (id) { var run = ensureRun(); return run ? encounterView(run, id) : null; }
  };
  X.setSimulationHook(simTick);
  X.setWorldRenderHook(drawWorld);
})();
