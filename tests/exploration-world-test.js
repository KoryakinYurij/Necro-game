const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const stubCanvas = require('./jsdom-canvas-stub');

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));
const dom = new JSDOM(html, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: vc, beforeParse(window) {
    stubCanvas(window);
    window.__worldDrawText = [];
    window.__worldDrawCalls = [];
    const spiedContexts = new WeakSet();
    const getContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function (...args) {
      const ctx = getContext.apply(this, args);
      if (ctx && !spiedContexts.has(ctx)) {
        const fillText = ctx.fillText;
        ctx.fillText = function (txt, ...rest) {
          if (window.__worldDrawText.length < 80) window.__worldDrawText.push(String(txt));
          if (window.__worldDrawCalls.length < 160) window.__worldDrawCalls.push({ text: String(txt), x: rest[0], y: rest[1] });
          return fillText.call(this, txt, ...rest);
        };
        spiedContexts.add(ctx);
      }
      return ctx;
    };
  }
});
const { window } = dom;
const doc = window.document;
const fails = [];
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) fails.push(name);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  await wait(700);
  const N = window.__necro;
  const X = N.exploration;
  check('world capability доступен', !!X.world);
  if (!X.world) throw new Error('exploration world missing');

  const W = X.world;
  const seed = 0x12345678;
  const originalRandom = window.Math.random;
  let combatRandomCalls = 0;
  window.Math.random = function () { combatRandomCalls++; return .5; };
  const a = W.describeArea(seed, 0, 0);
  const b = W.describeArea(seed, 0, 0);
  check('same seed + spatial identity детерминированы', JSON.stringify(a) === JSON.stringify(b));
  const fixtureA = W.describeArea(0x12345678, 0, 0)[0];
  const fixtureB = W.describeArea(0xdeadbeef, 0, 0)[0];
  check('seed fixture A сохраняет стабильные поля', fixtureA.id === 'opportunity:0:0' && fixtureA.x === -282 && fixtureA.y === -562);
  check('seed fixture B отличается и сохраняет стабильные поля', fixtureB.id === 'opportunity:0:0' && fixtureB.x === 297 && fixtureB.y === 460 && (fixtureB.x !== fixtureA.x || fixtureB.y !== fixtureA.y));
  const isolated = W.create(seed);
  const escaped = isolated.visitArea(0, 0);
  escaped[0].x = 999999; escaped[0].area.x = 99; escaped[0].state = 'tampered';
  const intact = isolated.visitArea(0, 0)[0];
  check('мутация возвращённой копии не меняет cached descriptor', intact.x === fixtureA.x && intact.area.x === 0 && intact.state === 'generated');

  const s1 = W.create(seed);
  s1.visitArea(1, 0); s1.visitArea(0, 1); s1.visitArea(-1, 0);
  const snap1 = s1.snapshot();
  const s2 = W.create(seed);
  s2.visitArea(-1, 0); s2.visitArea(0, 1); s2.visitArea(1, 0);
  const snap2 = s2.snapshot();
  check('visit order не меняет descriptors', JSON.stringify(snap1) === JSON.stringify(snap2));
  check('world generation не потребляет combat Math.random', combatRandomCalls === 0);
  window.Math.random = originalRandom;
  const safeSeeds = [0, 1, 2, seed, 0x7fffffff, 0xffffffff];
  const starts = safeSeeds.map(s => W.describeArea(s, 0, 0).filter(d => d.hostile));
  check('start area всегда содержит meaningful opportunity', starts.every(list => list.length >= 1));
  check('hostile opportunity всегда вне safe-start exclusion', starts.every(list => list.every(d => Math.hypot(d.x, d.y) >= W.safeRadius)));
  check('первая destination всегда достаточно близко для быстрого выбора', starts.every(list => list.some(d => Math.hypot(d.x, d.y) <= W.quickDiscoverRadius)));

  X.setMode('exploration');
  N.startRun();
  const firstCard = doc.querySelector('#cards .card'); if (firstCard) firstCard.click();
  await wait(180);
  const G = N.G;
  const enemiesBefore = G.enemies.length;
  const live = W.current();
  check('каждый Exploration run получает run seed', Number.isInteger(live.seed) && live.seed >= 0);
  check('run seed доступен в game/debug state', G.explorationSeed === live.seed && W.current().seed === live.seed);
  check('world marker рисуется через supported render seam', window.__worldDrawText.some(t => t === '◆' || t === '⌂'));
  check('run seed видим в Exploration render', window.__worldDrawText.some(t => t === 'SEED ' + live.seed));
  const sizes = [[320, 240], [640, 360], [1440, 900]];
  let clampOk = true;
  for (const [vw, vh] of sizes) {
    Object.defineProperty(window, 'innerWidth', { value: vw, configurable: true });
    Object.defineProperty(window, 'innerHeight', { value: vh, configurable: true });
    window.__worldDrawCalls.length = 0;
    window.dispatchEvent(new window.Event('resize'));
    await wait(50);
    const marks = window.__worldDrawCalls.filter(c => c.text === '◆' || c.text === '⌂');
    const mark = marks[marks.length - 1];
    clampOk = clampOk && !!mark && mark.x >= 24 && mark.x <= vw - 24 && mark.y >= 24 && mark.y <= vh - 24;
  }
  check('edge-clamp держит marker внутри viewport разных размеров', clampOk);
  live.visitArea(0, 0); live.visitArea(1, 0);
  check('descriptors существуют без live enemy AI', G.enemies.length === enemiesBefore && live.snapshot().length >= 2);

  const previousRun = live;
  N.startRun();
  const restartCard = doc.querySelector('#cards .card'); if (restartCard) restartCard.click();
  await wait(180);
  const restarted = W.current();
  check('restart создаёт новый чистый world object', restarted !== previousRun && restarted.snapshot().length === 1 && !restarted.snapshot().some(d => d.id === 'opportunity:1:0'));

  console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
  console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION WORLD OK');
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 10000);
