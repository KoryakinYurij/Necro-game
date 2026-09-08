/* Симуляция баланса: гоняет забег в jsdom, автоматически выбирает карты,
   замеряет выживаемость по минутам и урон боссов. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const stubCanvas = require('../tests/jsdom-canvas-stub');

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  url: 'http://localhost/',
  beforeParse: stubCanvas,
});
const { window } = dom;
window.matchMedia = window.matchMedia || (() => ({ matches: false }));

function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(900);
  const N = window.__necro;
  if (!N) { console.log('FAIL: no __necro'); process.exit(1); }

  N.startRun();
  await wait(100);

  const log = [];
  let lastMin = -1;

  // симулируем до 16 минут игрового времени
  for (let simT = 0; simT < 16.5 * 60; simT += 1 / 30) {
    // выбираем карты если открыт экран левелапа
    const doc = window.document;
    const lu = doc.getElementById('levelup');
    if (lu && !lu.classList.contains('hidden')) {
      const cards = lu.querySelectorAll('.card');
      if (cards.length) {
        // простая стратегия: приоритет эволюциям, потом оружие, потом первое
        let pick = null;
        for (const c of cards) if (c.classList.contains('evo')) { pick = c; break; }
        if (!pick) pick = cards[0];
        pick.click();
      }
    }
    const specOv = doc.getElementById('specOv');
    if (specOv && !specOv.classList.contains('hidden')) {
      const btn = specOv.querySelector('.spec-card .btn');
      if (btn) btn.click();
    }
    const p6 = doc.getElementById('p6Ov');
    if (p6 && !p6.classList.contains('hidden')) {
      const c = p6.querySelectorAll('#p6cards .card');
      if (c.length) c[0].click();
      else { const s = doc.getElementById('p6Skip'); if (s) s.click(); }
    }

    N.step(1 / 30);
    const G = N.G;
    if (!G) continue;
    const min = Math.floor(G.time / 60);
    if (min !== lastMin) {
      lastMin = min;
      const enemies = G.enemies.filter(e => !e.dead);
      const boss = enemies.find(e => e.type === 'boss');
      log.push({
        min,
        level: G.level,
        hp: Math.round(G.P.hp),
        maxHp: G.P.maxHp,
        enemies: enemies.length,
        kills: G.kills,
        bossHp: boss ? boss.hp : null,
        bossMax: boss ? boss.maxhp : null,
        threat: Math.round(G.threat || 0),
        ult: Math.round(G.ult || 0),
      });
    }
    if (G.P.dead) break;
    if (G.won) break;
  }
  const G = N.G;
  console.log('min lvl  hp/maxHp  enemies  kills   bossHP');
  for (const r of log) {
    console.log(
      String(r.min).padStart(3),
      String(r.level).padStart(3),
      (r.hp + '/' + r.maxHp).padStart(8),
      String(r.enemies).padStart(8),
      String(r.kills).padStart(6),
      r.bossHp != null ? (r.bossHp + '/' + r.bossMax).padStart(12) : ''
    );
  }
  console.log('---');
  console.log('RESULT:', G.won ? 'WIN' : G.P.dead ? 'DEAD at ' + Math.floor(G.time) + 's' : 'ALIVE at ' + Math.floor(G.time) + 's');
  console.log('kills:', G.kills, 'level:', G.level, 'souls:', G.soulsGained);
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
