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
    window.__encounterDrawText = [];
    const seen = new WeakSet();
    const getContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function (...args) {
      const ctx = getContext.apply(this, args);
      if (ctx && !seen.has(ctx)) {
        const fillText = ctx.fillText;
        ctx.fillText = function (txt, ...rest) {
          if (window.__encounterDrawText.length < 200) window.__encounterDrawText.push(String(txt));
          return fillText.call(this, txt, ...rest);
        };
        seen.add(ctx);
      }
      return ctx;
    };
  }
});
const { window } = dom;
const doc = window.document;
const fails = [];
const wait = ms => new Promise(r => setTimeout(r, ms));
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) fails.push(name);
}
function boundEnemies(G, id) {
  return G.enemies.filter(e => !e.dead && e.__explorationEncounterId === id);
}
function stepFor(N, seconds, dt = 0.03) {
  for (let t = 0; t < seconds; t += dt) N.step(Math.min(dt, seconds - t));
}

(async () => {
  await wait(700);
  const N = window.__necro;
  const X = N.exploration;
  X.setMode('exploration');
  N.startRun();
  const firstCard = doc.querySelector('#cards .card'); if (firstCard) firstCard.click();
  await wait(180);
  const G = N.G;
  G.weapons = {}; G.minions = [];
  const W = X.world;
  const E = X.encounters;
  check('encounter lifecycle capability доступен', !!E);
  if (!E) throw new Error('exploration encounters missing');

  const descriptor = W.current().snapshot()[0];
  const id = descriptor.id;
  check('runtime state отделён от immutable descriptor', descriptor.state === 'generated' && E.get(id).status === 'dormant');
  check('dormant Encounter не создаёт live combatants', boundEnemies(G, id).length === 0);

  // Standing at expedition spawn and routing around the activation edge must stay dormant.
  const spawn = { x: G.P.x, y: G.P.y };
  N.step(0.05);
  check('standing at spawn не активирует Encounter', E.get(id).status === 'dormant' && boundEnemies(G, id).length === 0);
  const bypassR = E.activationRadius + 60;
  for (const angle of [0, Math.PI / 2, Math.PI]) {
    G.P.x = descriptor.x + Math.cos(angle) * bypassR;
    G.P.y = descriptor.y + Math.sin(angle) * bypassR;
    N.step(0.05);
  }
  check('игрок может обойти Encounter вне activation radius', E.get(id).status === 'dormant' && boundEnemies(G, id).length === 0);

  // Activation #1 schedules one delayed member. Disengage before it fires.
  G.P.x = descriptor.x + E.activationRadius * 0.5;
  G.P.y = descriptor.y;
  N.step(0.05);
  const firstActive = E.get(id);
  check('proximity активирует Encounter', firstActive.status === 'active' && firstActive.activation === 1);
  check('activation создаёт immediate combatants через adapter', boundEnemies(G, id).length === 2);
  check('вся immediate formation остаётся вне safe-start radius', boundEnemies(G, id).every(e => Math.hypot(e.x - spawn.x, e.y - spawn.y) >= W.safeRadius));
  N.pause();
  await wait(E.delayedSpawnMs + 80);
  check('pause не продвигает delayed encounter spawn', boundEnemies(G, id).length === 2);
  N.resume();

  G.P.x = descriptor.x + E.leashRadius + 80;
  G.P.y = descriptor.y;
  N.step(0.05);
  check('leash/disengage возвращает active → dormant, не cleared', E.get(id).status === 'dormant' && boundEnemies(G, id).length === 0);

  // Activation #2: the stale delayed callback from activation #1 must not join the new group.
  G.P.x = descriptor.x + E.activationRadius * 0.5;
  G.P.y = descriptor.y;
  N.step(0.05);
  check('re-engage создаёт новую activation generation', E.get(id).status === 'active' && E.get(id).activation === 2);
  stepFor(N, (E.delayedSpawnMs + 120) / 1000);
  const secondWave = boundEnemies(G, id);
  check('stale delayed callback не создаёт врага в новой activation', secondWave.length === 3 && secondWave.every(e => e.__explorationActivation === 2));
  check('полная formation остаётся вне safe-start radius', secondWave.every(e => Math.hypot(e.x - spawn.x, e.y - spawn.y) >= W.safeRadius));

  // Kill one member through the shared combat pipeline, then disengage.
  G.P.hp = G.P.maxHp = G.P.displayHp = 1000000;
  G.weapons.spear = { id: 'spear', lvl: 1, timer: 0 };
  G.lvls.spear = 1;
  G.projs = [];
  const partialTarget = secondWave[0];
  const killedSlot = partialTarget.__explorationSlotId;
  for (const e of secondWave) e.spd = 0;
  secondWave.slice(1).forEach((e, i) => { e.x = descriptor.x - 260 - i * 35; e.y = descriptor.y + 180 + i * 30; });
  partialTarget.hp = 1;
  partialTarget.x = G.P.x + 110; partialTarget.y = G.P.y;
  for (let i = 0; i < 40 && !partialTarget.dead; i++) N.step(0.03);
  check('shared combat реально убивает bound enemy', partialTarget.dead);
  N.step(0.05);
  const partialState = E.get(id);
  check('частичная победа сохраняет defeated slot без premature clear', partialState.status === 'active' && partialState.defeatedSlots.includes(killedSlot) && partialState.defeatedSlots.length === 1);
  const killsAfterPartial = G.kills;
  const soulsAfterPartial = G.soulsGained;
  delete G.weapons.spear; G.lvls.spear = 0; G.projs = [];

  G.P.x = descriptor.x + E.leashRadius + 80;
  G.P.y = descriptor.y;
  N.step(0.05);
  check('partial disengage остаётся re-engageable dormant', E.get(id).status === 'dormant' && E.get(id).defeatedSlots.includes(killedSlot));
  G.P.x = descriptor.x + E.activationRadius * 0.5;
  G.P.y = descriptor.y;
  N.step(0.05);
  stepFor(N, (E.delayedSpawnMs + 120) / 1000);
  const thirdWave = boundEnemies(G, id);
  check('убитый slot не восстанавливается после отхода', thirdWave.length === 2 && !thirdWave.some(e => e.__explorationSlotId === killedSlot));
  check('disengage/re-engage не создаёт повторных kill payouts', G.kills === killsAfterPartial && G.soulsGained === soulsAfterPartial);

  // Finish remaining slots through the same combat core.
  G.weapons.spear = { id: 'spear', lvl: 1, timer: 0 };
  G.lvls.spear = 1;
  for (const target of [...thirdWave]) {
    thirdWave.filter(e => e !== target && !e.dead).forEach((e, i) => {
      e.spd = 0; e.x = G.P.x - 420 - i * 50; e.y = G.P.y + 220;
    });
    target.spd = 0; target.hp = 1;
    target.x = G.P.x + 105; target.y = G.P.y;
    G.weapons.spear.timer = 0;
    for (let i = 0; i < 40 && !target.dead; i++) N.step(0.03);
    N.step(0.05);
  }
  const cleared = E.get(id);
  check('cleared достигается только после active group defeated', cleared.status === 'cleared' && cleared.defeatedSlots.length === 3 && cleared.clearCount === 1);
  await wait(80);
  check('Cleared Encounter имеет видимый completion/reward-ready marker', window.__encounterDrawText.some(t => t === '✓' || t === '★'));

  const activationAtClear = cleared.activation;
  const killsAtClear = G.kills;
  const soulsAtClear = G.soulsGained;
  G.P.x = descriptor.x + E.leashRadius + 100;
  G.P.y = descriptor.y;
  N.step(0.05);
  G.P.x = descriptor.x;
  G.P.y = descriptor.y;
  N.step(0.05);
  stepFor(N, (E.delayedSpawnMs + 120) / 1000);
  const afterReturn = E.get(id);
  check('Cleared Encounter терминален и не активируется повторно', afterReturn.status === 'cleared' && afterReturn.activation === activationAtClear && boundEnemies(G, id).length === 0);
  check('Cleared Encounter не создаёт повторных enemy payouts', G.kills === killsAtClear && G.soulsGained === soulsAtClear);

  // A temporary delayed-slot spawn failure must recover inside the same activation.
  N.startRun();
  const recoveryCard = doc.querySelector('#cards .card'); if (recoveryCard) recoveryCard.click();
  await wait(180);
  const recoveryG = N.G;
  recoveryG.weapons = {}; recoveryG.minions = [];
  const recoveryDescriptor = W.current().snapshot()[0];
  const recoveryId = recoveryDescriptor.id;
  const recoverySpawn = X.spawn;
  let rearBlocked = true;
  X.spawn = function (type, x, y, affix) {
    const isRear = Math.abs(x - recoveryDescriptor.x) < 1 && Math.abs(y - (recoveryDescriptor.y - 42)) < 1;
    if (isRear && rearBlocked) return null;
    return recoverySpawn(type, x, y, affix);
  };
  recoveryG.P.x = recoveryDescriptor.x; recoveryG.P.y = recoveryDescriptor.y;
  N.step(0.05);
  stepFor(N, (E.delayedSpawnMs + 120) / 1000);
  check('temporary spawn failure оставляет Encounter active и missing slot не defeated', E.get(recoveryId).status === 'active' && E.get(recoveryId).defeatedSlots.length === 0 && boundEnemies(recoveryG, recoveryId).length === 2);
  const recoveryActivation = E.get(recoveryId).activation;
  rearBlocked = false;
  stepFor(N, 0.5);
  const recoveredWave = boundEnemies(recoveryG, recoveryId);
  check('temporary spawn failure ретраится в той же activation', recoveredWave.length === 3 && E.get(recoveryId).activation === recoveryActivation);
  recoveredWave.forEach(e => { e.dead = true; });
  N.step(0.05);
  check('Encounter после recovered spawn корректно завершается', E.get(recoveryId).status === 'cleared' && E.get(recoveryId).clearCount === 1);
  X.spawn = recoverySpawn;

  // A failed spawn is not a clear: no visit/disengage/error path may fabricate completion.
  N.startRun();
  const failedRunCard = doc.querySelector('#cards .card'); if (failedRunCard) failedRunCard.click();
  await wait(180);
  const failedG = N.G;
  const failedDescriptor = W.current().snapshot()[0];
  const savedSpawn = X.spawn;
  X.spawn = () => null;
  failedG.P.x = failedDescriptor.x; failedG.P.y = failedDescriptor.y;
  N.step(0.05);
  stepFor(N, (E.delayedSpawnMs + 80) / 1000);
  N.step(0.05);
  check('неудавшийся spawn не считается cleared', E.get(failedDescriptor.id).status === 'active' && E.get(failedDescriptor.id).clearCount === 0 && boundEnemies(failedG, failedDescriptor.id).length === 0);
  failedG.P.x = failedDescriptor.x + E.leashRadius + 80;
  N.step(0.05);
  check('failed active encounter disengage возвращает dormant', E.get(failedDescriptor.id).status === 'dormant' && E.get(failedDescriptor.id).clearCount === 0);
  X.spawn = savedSpawn;

  console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
  console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION ENCOUNTER OK');
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 12000);
