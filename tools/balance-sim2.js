/* Симуляция баланса v2: бот орбитально двигается, выбирает оружие/эво,
   кастует ульту. Замеряет выживаемость по минутам. */
const fs = require('fs');
const path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
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
  let lastMin = -1, ang = 0, cx = 0, cy = 0;

  for (let simT = 0; simT < 16.5 * 60; simT += 1 / 30) {
    const G = N.G;
    if (!G) { await wait(20); continue; }

    // --- выбор карт ---
    const lu = doc.getElementById('levelup');
    if (lu && !lu.classList.contains('hidden') && N.state === 'levelup') {
      const cards = [...lu.querySelectorAll('.card')];
      if (cards.length) {
        let pick = cards.find(c => c.classList.contains('evo'))
          || cards.find(c => (c.querySelector('.cbadge')?.textContent || '').includes('НОВОЕ') && (c.querySelector('.cicon') && true))
          || cards.find(c => (c.querySelector('.cbadge')?.textContent || '').startsWith('УР.'))
          || cards[0];
        pick.click();
      }
      continue;
    }
    const specOv = doc.getElementById('specOv');
    if (specOv && !specOv.classList.contains('hidden')) {
      const btn = specOv.querySelector('.spec-card .btn');
      if (btn) btn.click();
      continue;
    }
    const p6 = doc.getElementById('p6Ov');
    if (p6 && !p6.classList.contains('hidden')) {
      const c = p6.querySelectorAll('#p6cards .card');
      if (c.length) c[0].click(); else doc.getElementById('p6Skip')?.click();
      continue;
    }
    if (N.state !== 'play') { await wait(5); continue; }

    // --- движение по орбите ---
    ang += (1 / 30) * (175 / 300);
    G.P.x = cx + Math.cos(ang) * 300;
    G.P.y = cy + Math.sin(ang) * 300;

    // --- ульта когда готова ---
    if ((G.ult || 0) >= 100 && (G.ultCd || 0) <= 0) { try { N.castUlt(); } catch {} }

    N.step(1 / 30);

    const min = Math.floor(G.time / 60);
    if (min !== lastMin) {
      lastMin = min;
      const enemies = G.enemies.filter(e => !e.dead);
      const bosses = enemies.filter(e => e.type === 'boss');
      log.push({
        min,
        level: G.level,
        hp: Math.round(G.P.hp),
        maxHp: G.P.maxHp,
        enemies: enemies.length,
        kills: G.kills,
        boss: bosses.length ? bosses.map(b => b.hp + '/' + b.maxhp + (b.kind ? '(' + b.kind + ')' : '')).join('; ') : '',
      });
    }
    if (G.P.dead || G.won) break;
  }
  const G = N.G;
  console.log('min lvl  hp/maxHp  enemies  kills   boss');
  for (const r of log) {
    console.log(
      String(r.min).padStart(3), String(r.level).padStart(4),
      (r.hp + '/' + r.maxHp).padStart(9), String(r.enemies).padStart(8),
      String(r.kills).padStart(7), '  ' + r.boss
    );
  }
  console.log('---');
  console.log('RESULT:', G.won ? 'WIN at ' + Math.floor(G.time) + 's' : G.P.dead ? 'DEAD at ' + Math.floor(G.time) + 's' : 'ALIVE at ' + Math.floor(G.time) + 's');
  console.log('kills:', G.kills, '| level:', G.level, '| souls:', G.soulsGained);
  console.log('weapons:', Object.entries(G.weapons || {}).map(([k, w]) => k + (w.evolved ? '★' : '') + 'L' + w.lvl).join(', '));
  console.log('passives:', JSON.stringify(G.lvls));
  console.log('spec:', G.spec, '| pacts:', (G.pacts||[]).join(','), '| relics:', (G.relics||[]).join(','));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
