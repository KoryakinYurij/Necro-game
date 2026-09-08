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
    window.__ruinsDraw = [];
    const seen = new WeakSet();
    const getContext = window.HTMLCanvasElement.prototype.getContext;
    window.HTMLCanvasElement.prototype.getContext = function (...args) {
      const ctx = getContext.apply(this, args);
      if (ctx && !seen.has(ctx)) {
        const fillText = ctx.fillText;
        ctx.fillText = function (txt, ...rest) {
          window.__ruinsDraw.push({ text: String(txt), x: rest[0], y: rest[1] });
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
  const W = X.world, E = X.encounters, P = X.pois;
  check('POI capability доступен', !!P);
  if (!P) throw new Error('exploration POIs missing');
  const ruins = W.current().snapshot().find(d => d.kind === 'ruins');
  check('start opportunity семантически Ruins', !!ruins && ruins.poiType === 'ruins');
  if (!ruins) throw new Error('ruins descriptor missing');
  const id = ruins.id;
  check('Ruins начинается guarded отдельно от Encounter state', P.get(id).status === 'guarded' && E.get(id).status === 'dormant');
  await wait(80);
  check('Ruins имеет узнаваемый world marker', window.__ruinsDraw.some(c => c.text === '⌂' || c.text === 'РУИНЫ'));
  check('стартовые Ruins находятся внутри limited cue radius', Math.hypot(ruins.x - G.P.x, ruins.y - G.P.y) <= P.cueRadius);
  const beforeFar = { x: G.P.x, y: G.P.y };
  N.pause();
  G.P.x = ruins.x + P.cueRadius + 300; G.P.y = ruins.y;
  window.__ruinsDraw.length = 0;
  await wait(80);
  check('Ruins cue не превращается в дальний постоянный waypoint', !window.__ruinsDraw.some(c => c.text === '⌂' || c.text === 'РУИНЫ'));
  G.P.x = beforeFar.x; G.P.y = beforeFar.y;
  N.resume();

  const phaseBefore = G.phase, eventBefore = G.event;
  G.P.x = ruins.x; G.P.y = ruins.y;
  N.step(0.05);
  check('подход запускает локальный guard Encounter', E.get(id).status === 'active' && boundEnemies(G, id).length === 2);
  check('Ruins не запускает global Arena wave/event', G.phase === phaseBefore && G.event === eventBefore);
  stepFor(N, (E.delayedSpawnMs + 100) / 1000);
  boundEnemies(G, id).forEach(e => { e.dead = true; });
  N.step(0.05);
  await wait(80);
  check('guard clear переводит POI в reward-ready', E.get(id).status === 'cleared' && P.get(id).status === 'reward-ready');

  const ov = doc.getElementById('nxRuinsReward');
  check('собственный Exploration reward UI открыт', !!ov && !ov.classList.contains('hidden'));
  check('place reward не переводит игру в legacy decision state', N.state === 'play' && doc.getElementById('p6Ov').classList.contains('hidden') && doc.getElementById('levelup').classList.contains('hidden'));
  const rewardButtons = ov ? [...ov.querySelectorAll('[data-ruins-reward]')] : [];
  check('Ruins предлагает три build choice', rewardButtons.length === 3);

  const relicsBefore = JSON.stringify(G.relics || []);
  const pactsBefore = JSON.stringify(G.pacts || []);
  const metaBefore = JSON.stringify(N.meta);
  const dmgBefore = G.P.dmgMult;
  const bDmgBefore = G.B.dmg;
  const levelBeforeReward = G.level, queueBeforeReward = G.queue;
  window.__ruinsDraw.length = 0;
  const edgeButton = rewardButtons.find(b => b.getAttribute('data-ruins-reward') === 'reaping_edge');
  if (edgeButton) edgeButton.click();
  await wait(60);
  check('Ruins reward claim работает через собственный UI', P.get(id).claimedReward === 'reaping_edge');
  check('reward меняет current-expedition combat stat', G.B.dmg === bDmgBefore + 25 && G.P.dmgMult >= dmgBefore + .24);
  N.recalc();
  check('Exploration reward переживает обычный recalc', G.B.dmg === bDmgBefore + 25 && G.P.dmgMult >= dmgBefore + .24);
  check('reward flow не пишет legacy relic/pact/meta', JSON.stringify(G.relics || []) === relicsBefore && JSON.stringify(G.pacts || []) === pactsBefore && JSON.stringify(N.meta) === metaBefore);
  check('Ruins reward не подменяет ordinary XP progression', G.level === levelBeforeReward && G.queue === queueBeforeReward && N.state === 'play');
  check('после claim POI visibly Cleared', P.get(id).status === 'cleared' && P.get(id).claimCount === 1);
  check('Cleared Ruins рисует completion marker на месте', window.__ruinsDraw.some(c => c.text === '✓'));
  check('reward overlay закрыт после claim', ov.classList.contains('hidden'));

  const dmgAfter = G.B.dmg;
  check('повторный claim отклонён', P.claim(id, 'reaping_edge') === false);
  check('повторный claim не удваивает reward', G.B.dmg === dmgAfter && P.get(id).claimCount === 1);

  window.__ruinsDraw.length = 0;
  G.P.x = ruins.x + 1800; G.P.y = ruins.y;
  N.step(0.05);
  await wait(80);
  check('после clear Ruins больше не даёт edge navigation cue', !window.__ruinsDraw.some(c => c.text === '⌂' || c.text === 'РУИНЫ'));

  G.P.x = ruins.x; G.P.y = ruins.y;
  N.step(0.05);
  await wait(50);
  check('возврат к Cleared Ruins не открывает reward снова', P.get(id).status === 'cleared' && ov.classList.contains('hidden') && P.get(id).claimCount === 1);

  N.startRun();
  const restartCard = doc.querySelector('#cards .card'); if (restartCard) restartCard.click();
  await wait(180);
  const freshG = N.G;
  const freshRuins = W.current().snapshot().find(d => d.poiType === 'ruins');
  check('новая экспедиция сбрасывает Ruins state и reward', !!freshRuins && P.get(freshRuins.id).status === 'guarded' && P.get(freshRuins.id).claimCount === 0 && freshG.B.dmg === 0 && !(freshG.explorationRewards || []).length);

  console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
  console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION RUINS OK');
  process.exit(fails.length || errors.length ? 1 : 0);
})().catch(e => { console.error(e.stack || e); process.exit(1); });
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 12000);