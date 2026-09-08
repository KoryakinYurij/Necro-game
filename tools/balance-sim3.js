/* Симуляция баланса v3: бот идёт к ближайшему гему/врагу, выбирает оружие. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const stubCanvas = require('../tests/jsdom-canvas-stub');

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  beforeParse(window) {
    // блокируем авто-цикл rAF, чтобы управлять шагом вручную
    window.requestAnimationFrame = () => 0;
    window.cancelAnimationFrame = () => {};
  }
});
const { window } = dom;
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  await wait(900);
  const N = window.__necro;
  if (!N) { console.log('FAIL: no __necro'); process.exit(1); }
  N.startRun();
  await wait(100);
  const doc = window.document;

  const log = [];
  let lastMin = -1, simRerolled = false;

  for (let simT = 0; simT < 16.5 * 60; simT += 1 / 30) {
    const G = N.G;
    if (!G) { await wait(20); continue; }

    const lu = doc.getElementById('levelup');
    if (lu && !lu.classList.contains('hidden') && N.state === 'levelup') {
      const cards = [...lu.querySelectorAll('.card')];
      if (cards.length) {
        const prio = ['Костяное копьё', 'Блуждающие души', 'Похоронный звон', 'Кровавая нова', 'Скелеты-воины', 'Чумное облако', 'Взрыв трупов'];
        const nm = c => c.querySelector('.cname')?.textContent || '';
        // первый дар: если нет боевого оружия — переброс
        if (!simRerolled && !cards.some(c => prio.some(w => nm(c).includes(w)))) {
          const rb = doc.getElementById('rerollBtn');
          if (rb && !rb.disabled) { simRerolled = true; rb.click(); continue; }
        }
        let pick = cards.find(c => c.classList.contains('evo'));
        if (!pick) for (const w of prio) { pick = cards.find(c => nm(c).includes(w)); if (pick) break; }
        if (!pick) pick = cards.find(c => (c.querySelector('.cbadge')?.textContent || '').includes('НОВОЕ'));
        if (!pick) pick = cards.find(c => (c.querySelector('.cbadge')?.textContent || '').startsWith('УР.'));
        if (!pick) pick = cards[0];
        pick.click();
      }
      continue;
    }
    const specOv = doc.getElementById('specOv');
    if (specOv && !specOv.classList.contains('hidden')) {
      specOv.querySelector('.spec-card .btn')?.click();
      continue;
    }
    const p6 = doc.getElementById('p6Ov');
    if (p6 && !p6.classList.contains('hidden')) {
      const c = p6.querySelectorAll('#p6cards .card');
      if (c.length) c[0].click(); else doc.getElementById('p6Skip')?.click();
      continue;
    }
    if (N.state !== 'play') { await wait(5); continue; }

    // --- ИИ движения: к ближайшему гему, иначе от ближайшего врага по касательной ---
    const P = G.P, dt = 1 / 30;
    let tx = null, ty = null, best = 1e9;
    for (const gm of G.gems) {
      const d = (gm.x - P.x) ** 2 + (gm.y - P.y) ** 2;
      if (d < best) { best = d; tx = gm.x; ty = gm.y; }
    }
    let nearEnemy = null; let be2 = 1e9;
    for (const en of G.enemies) {
      if (en.dead) continue;
      const d = (en.x - P.x) ** 2 + (en.y - P.y) ** 2;
      if (d < be2) { be2 = d; nearEnemy = en; }
    }
    let vx = 0, vy = 0;
    if (nearEnemy && be2 < 170 * 170) {
      // кайт: убегать перпендикулярно вектору на врага
      const d = Math.sqrt(be2) || 1;
      const ex = (nearEnemy.x - P.x) / d, ey = (nearEnemy.y - P.y) / d;
      vx = -ey; vy = ex;
    } else if (tx != null && best > 40 * 40) {
      const d = Math.sqrt(best) || 1; vx = (tx - P.x) / d; vy = (ty - P.y) / d;
    }
    // эмуляция рывка когда враг вплотную и рывок готов
    if (nearEnemy && be2 < 90 * 90 && P.dashCd <= 0 && (vx || vy)) {
      P.dashDuration = .28; P.dashVx = vx * 580; P.dashVy = vy * 580;
      P.dashCd = P.maxDashCd; P.inv = Math.max(P.inv || 0, .32);
    }
    P.x += vx * P.speed * dt; P.y += vy * P.speed * dt;
    if (vx) P.face = vx > 0 ? 1 : -1;

    if ((G.ult || 0) >= 100 && (G.ultCd || 0) <= 0) { try { N.castUlt(); } catch {} }

    N.step(dt);

    const min = Math.floor(G.time / 60);
    if (min !== lastMin) {
      lastMin = min;
      const enemies = G.enemies.filter(e => !e.dead);
      const bosses = enemies.filter(e => e.type === 'boss');
      log.push({
        min, level: G.level, hp: Math.round(G.P.hp), maxHp: G.P.maxHp,
        enemies: enemies.length, kills: G.kills, gems: G.gems.length,
        boss: bosses.length ? bosses.map(b => b.hp + '/' + b.maxhp + '(' + (b.kind || '?') + ')').join('; ') : '',
      });
    }
    if (G.P.dead || G.won) break;
  }
  const G = N.G;
  console.log('min lvl   hp/maxHp enemies  kills  gems  boss');
  for (const r of log) {
    console.log(
      String(r.min).padStart(3), String(r.level).padStart(4),
      (r.hp + '/' + r.maxHp).padStart(9), String(r.enemies).padStart(7),
      String(r.kills).padStart(7), String(r.gems).padStart(5), '  ' + r.boss
    );
  }
  console.log('---');
  console.log('RESULT:', G.won ? 'WIN at ' + Math.floor(G.time) + 's' : G.P.dead ? 'DEAD at ' + Math.floor(G.time) + 's' : 'ALIVE at ' + Math.floor(G.time) + 's');
  console.log('kills:', G.kills, '| level:', G.level, '| souls:', G.soulsGained);
  console.log('weapons:', Object.entries(G.weapons || {}).map(([k, w]) => k + (w.evolved ? '★' : '') + 'L' + w.lvl).join(', ') || 'none');
  console.log('passives:', JSON.stringify(G.lvls));
  console.log('spec:', G.spec, '| pacts:', (G.pacts||[]).join(','), '| relics:', (G.relics||[]).join(','));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
