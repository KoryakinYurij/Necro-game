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
  virtualConsole: vc, beforeParse: stubCanvas
});
const { window } = dom;
const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
const fails = [];
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) fails.push(name);
}

(async () => {
  await wait(700);
  const N = window.__necro;
  const X = N.exploration;

  // Arena cinematic -> Exploration must clear all Arena-only presentation state.
  X.setMode('arena');
  N.startRun(); await wait(120);
  let card = doc.querySelector('#cards .card'); if (card) card.click();
  await wait(120);
  let G = N.G;
  X.spawn('boss', G.P.x + 250, G.P.y, 'fire');
  await wait(100);
  check('Arena boss включает letterbox', doc.querySelectorAll('.nx-lb.on').length === 2);
  check('Arena boss включает slow-mo', window.__nxTS === 0.3);
  X.setMode('exploration');
  await wait(80);
  check('Arena → Exploration снимает letterbox', doc.querySelectorAll('.nx-lb.on').length === 0);
  check('Arena → Exploration сбрасывает slow-mo/nameplate', window.__nxTS === 1 && !doc.querySelector('.nx-bossplate'));

  // Spatial biome changes may recolor the world, but must not trigger Arena cinematic bars.
  G.biomeIdx = 1;
  await wait(80);
  check('смена biomeIdx в Exploration не включает letterbox', doc.querySelectorAll('.nx-lb.on').length === 0);

  // Fresh Exploration run: cross legacy finale boundary and prove simulation continues quietly.
  N.startRun(); await wait(120);
  card = doc.querySelector('#cards .card'); if (card) card.click();
  await wait(120);
  G = N.G;
  G.P.hp = G.P.maxHp = G.P.displayHp = 1000000;
  const startT = G.time;
  N.P6.finaleAt = startT + 1;
  for (let i = 0; i < 20; i++) N.step(0.25);
  check('simulation clock пересёк legacy finale boundary', G.time >= startT + 4.9);
  check('Exploration остаётся play после finale boundary', N.state === 'play' && !G.finaleSpawned && !G.won);

  // Level-overflow path must not open Arena apotheosis UI in Exploration.
  G.specChosen = true;
  G.level = 60; G.xp = 0; G.lb = 0;
  let normalDrafts = 0, sawApotheosis = false;
  for (let i = 0; i < 3; i++) {
    G.need = 1;
    G.gems.push({ x: G.P.x, y: G.P.y, val: 1, at: false, ph: 0 });
    await wait(180);
    if (N.state === 'p6ui') sawApotheosis = true;
    for (let guard = 0; guard < 5 && N.state === 'levelup'; guard++) {
      normalDrafts++;
      const draft = doc.querySelector('#cards .card'); if (draft) draft.click();
      await wait(100);
    }
  }
  check('XP после 60 не открывает Arena apotheosis в Exploration', !sawApotheosis && doc.getElementById('p6Ov').classList.contains('hidden'));
  check('XP после 60 даёт обычную supporting progression', G.level >= 63 && normalDrafts >= 3 && N.state === 'play');

  console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
  console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION BOUNDARIES OK');
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 10000);
