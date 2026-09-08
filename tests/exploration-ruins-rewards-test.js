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
const fails = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) fails.push(name);
}
function stepFor(N, seconds, dt = 0.03) {
  for (let t = 0; t < seconds; t += dt) N.step(Math.min(dt, seconds - t));
}
function boundEnemies(G, id) {
  return G.enemies.filter(e => !e.dead && e.__explorationEncounterId === id);
}async function startRun(N, X, { warriors = false } = {}) {
  X.setMode('exploration');
  const oldRandom = window.Math.random;
  if (warriors) window.Math.random = () => 0;
  N.startRun();
  let card = null;
  if (warriors) {
    card = [...doc.querySelectorAll('#cards .card')]
      .find(c => (c.querySelector('.cname')?.textContent || '').includes('Скелеты-воины'));
  }
  card = card || doc.querySelector('#cards .card');
  if (card) card.click();
  window.Math.random = oldRandom;
  await wait(100);
  return N.G;
}

async function openReward(N, X, G) {
  const W = X.world, E = X.encounters, P = X.pois;
  const ruins = W.current().snapshot().find(d => d.poiType === 'ruins');
  G.P.x = ruins.x; G.P.y = ruins.y;
  N.step(0.05);
  stepFor(N, (E.delayedSpawnMs + 120) / 1000);
  boundEnemies(G, ruins.id).forEach(e => { e.dead = true; });
  N.step(0.05);
  await wait(40);
  const overlay = doc.getElementById('nxRuinsReward');
  if (!overlay || overlay.classList.contains('hidden') || N.state !== 'pause') throw new Error('Ruins reward did not open safely');
  return { ruins, P, overlay };
}

function clickReward(overlay, id) {
  const button = overlay.querySelector(`[data-ruins-reward="${id}"]`);
  if (!button) throw new Error('reward button missing: ' + id);
  button.click();
}async function assertFreshReset(N, X, statKey, name) {
  const G = await startRun(N, X);
  check(name + ' не переносится в новый run', G.B[statKey] === 0 && !(G.explorationRewards || []).length);
}

(async () => {
  await wait(700);
  const N = window.__necro;
  const X = N.exploration;

  // Weapon reward: stat survives recalc and participates in a real projectile hit.
  let G = await startRun(N, X);
  let opened = await openReward(N, X, G);
  const weaponBase = { b: G.B.dmg, mult: G.P.dmgMult };
  clickReward(opened.overlay, 'reaping_edge');
  check('weapon reward применяет +25 run-local damage', G.B.dmg === weaponBase.b + 25 && G.P.dmgMult >= weaponBase.mult + .24);
  N.recalc();
  check('weapon reward устойчив после recalc', G.B.dmg === weaponBase.b + 25 && G.P.dmgMult >= weaponBase.mult + .24);
  G.enemies = []; G.projs = [];
  G.weapons = { spear: { id: 'spear', lvl: 1, timer: 0 } }; G.lvls.spear = 1;
  const oldRandom = window.Math.random; window.Math.random = () => .5;
  const weaponTarget = X.spawn('zom', G.P.x + 180, G.P.y, null);
  weaponTarget.spd = 0; weaponTarget.dmg = 0; const weaponHp = weaponTarget.hp;
  for (let i = 0; i < 50 && weaponTarget.hp === weaponHp && !weaponTarget.dead; i++) N.step(0.03);
  window.Math.random = oldRandom;
  check('weapon reward участвует в настоящем projectile hit', weaponTarget.dead || weaponTarget.hp < weaponHp);
  await assertFreshReset(N, X, 'dmg', 'weapon reward');
  // Minion reward: real shared summon attack uses the boosted multiplier.
  G = await startRun(N, X, { warriors: true });
  const warrior = G.minions.find(m => m.kind === 'warriors' && !m.dead);
  check('minion reward test имеет настоящий summon', !!warrior);
  opened = await openReward(N, X, G);
  const minionBase = { b: G.B.mdmg, mult: G.P.mdmg };
  clickReward(opened.overlay, 'legion_teeth');
  check('minion reward применяет +25 run-local minion damage', G.B.mdmg === minionBase.b + 25 && G.P.mdmg >= minionBase.mult + .24);
  N.recalc();
  check('minion reward устойчив после recalc', G.B.mdmg === minionBase.b + 25 && G.P.mdmg >= minionBase.mult + .24);
  G.enemies = []; G.projs = [];
  if (warrior) {
    warrior.dead = false; warrior.resp = 0; warrior.cd = 0;
    warrior.x = G.P.x + 120; warrior.y = G.P.y;
  }
  const minionRandom = window.Math.random; window.Math.random = () => .5;
  const minionTarget = X.spawn('zom', G.P.x + 144, G.P.y, null);
  minionTarget.spd = 0; minionTarget.dmg = 0; const minionHp = minionTarget.hp;
  for (let i = 0; i < 50 && minionTarget.hp === minionHp && !minionTarget.dead; i++) N.step(0.04);
  window.Math.random = minionRandom;
  check('minion reward участвует в настоящем summon hit', !!warrior && (minionTarget.dead || minionTarget.hp < minionHp));
  await assertFreshReset(N, X, 'mdmg', 'minion reward');
  // HP reward: max HP changes immediately, survives recalc, then resets next expedition.
  G = await startRun(N, X);
  opened = await openReward(N, X, G);
  const hpBase = { b: G.B.hp, max: G.P.maxHp };
  clickReward(opened.overlay, 'ossuary_heart');
  check('HP reward применяет +40 run-local max HP', G.B.hp === hpBase.b + 40 && G.P.maxHp === hpBase.max + 40);
  N.recalc();
  check('HP reward устойчив после recalc', G.B.hp === hpBase.b + 40 && G.P.maxHp === hpBase.max + 40);
  await assertFreshReset(N, X, 'hp', 'HP reward');

  console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
  console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION RUINS REWARDS OK');
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 15000);