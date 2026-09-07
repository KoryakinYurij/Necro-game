/* Баланс-сим аккордов семей: достижимы ли пороги при живом драфте.
   Ускорение через window.__nxTS; бот приоритизирует саммоны и армию. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);
  const N = window.__necro;
  // мета-прогресс игрока: саммоны открыты, фокус на кость
  N.meta.legion.unlockedSummons = { bone_priest: 1, bone_knight: 1, grave_hound: 1, grave_witch: 1, ghost_wisp: 1 };
  window.__nxp.setFocus('bone');
  window.__nxTS = 15;
  N.startRun(); await wait(120);

  const SUMMON_RE = /жрец|рыцарь|гончая|ведьма|огонёк/i;
  const WEAPONS = ['Скелеты-воины', 'Скелеты-лучники', 'Костяное копьё', 'Блуждающие души'];
  let lastMin = -1, ang = 0;
  const t0 = Date.now();

  while (Date.now() - t0 < 420000) {
    const G = N.G;
    if (!G) { await wait(40); continue; }
    const st = N.state;
    if (st === 'levelup') {
      const cards = [...doc.querySelectorAll('#cards .card')];
      const badge = c => (c.querySelector('.cbadge')?.textContent || '');
      const nm = c => (c.querySelector('.cname')?.textContent || '');
      let pick = cards.find(c => badge(c) === 'НОВЫЙ ПРИСЛУЖНИК' && SUMMON_RE.test(nm(c)))
        || cards.find(c => c.classList.contains('evo'))
        || cards.find(c => badge(c) === 'НОВЫЙ ПРИСЛУЖНИК')
        || WEAPONS.map(w => cards.find(c => nm(c).includes(w))).find(Boolean)
        || cards[0];
      if (pick) pick.click();
      await wait(40); continue;
    }
    if (st === 'spec') { doc.querySelector('#specOv .spec-card .btn')?.click(); await wait(40); continue; }
    if (st === 'p6ui') {
      const c = doc.querySelectorAll('#p6cards .card');
      (c.length ? c[0] : doc.getElementById('p6Skip'))?.click();
      await wait(40); continue;
    }
    const tr = doc.getElementById('trialOv');
    if (tr && tr.style.display === 'flex') { doc.getElementById('trB')?.click(); await wait(40); continue; }
    if (st === 'win' || st === 'over') break;
    if (st === 'play' && G.P) {
      ang += 0.03;
      G.P.x += Math.cos(ang) * 4; G.P.y += Math.sin(ang) * 4;
      if (G.P.hp < G.P.maxHp * 0.3) G.P.hp = G.P.maxHp; // страховка игрока (миньоны всё ещё умирают честно)
    }
    const min = Math.floor(G.time / 60);
    if (min !== lastMin) {
      lastMin = min;
      const rs = window.__nxp.runState() || {};
      const alive = {};
      for (const m of G.minions) if (!m.dead) alive[m.kind] = (alive[m.kind] || 0) + 1;
      console.log('min', String(min).padStart(2),
        '| chords', JSON.stringify(rs.chords || {}),
        '| army', G.army.dmg.toFixed(2) + '/' + G.army.hp.toFixed(2),
        '| minions', JSON.stringify(alive).slice(0, 110));
    }
    await wait(40);
  }
  const G = N.G;
  console.log('---');
  console.log('RESULT:', G.won ? 'WIN' : G.P.dead ? 'DEAD' : 'TIMEOUT', Math.floor(G.time) + 's',
    '| chords final:', JSON.stringify((window.__nxp.runState() || {}).chords || {}));
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
