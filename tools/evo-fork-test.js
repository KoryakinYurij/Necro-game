/* Тест вилок эволюций 2-из-2: в драфте две карты эволюции, флаг evoB ставится корректно. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' · ' + n); if (!c) fails++; };

(async () => {
  await wait(900);
  const N = window.__necro;
  N.startRun(); await wait(200);
  const c0 = doc.querySelector('#cards .card'); if (c0) c0.click();
  await wait(150);
  const G = N.G;
  G.specChosen = true;

  // готовим эволюцию копья: оружие L5 + темп L3
  G.weapons.spear = { id: 'spear', lvl: 5, timer: 0 };
  G.lvls.spear = 5; G.lvls.tempo = 3;

  // провоцируем левел-ап через гем (val=2 => две итерации, queue выходит в +1)
  G.need = 1; G.xp = 0;
  G.gems.push({ x: G.P.x, y: G.P.y, val: 30, at: false, ph: 0 });
  await wait(400);
  console.log('dbg: state', N.state, 'level', G.level, 'queue', G.queue, 'xp', G.xp, 'need', G.need, 'gems', G.gems.length, 'xpMult', G.P.xpMult);
  check('открыт драфт', N.state === 'levelup');
  const cards = [...doc.querySelectorAll('#cards .card')];
  const evoCards = cards.filter(c => (c.querySelector('.cbadge')?.textContent || '') === 'ЭВОЛЮЦИЯ');
  check('в драфте ДВЕ карты эволюции', evoCards.length === 2);
  const names = evoCards.map(c => c.querySelector('.cname')?.textContent || '');
  check('вариант B присутствует (КОСТЯНОЙ ГАРПУН)', names.some(n => n.includes('ГАРПУН')));
  check('вариант A присутствует (Костяной ливень)', names.some(n => n.includes('ливень') || n.includes('Ливень')));

  // выбираем B
  const bCard = evoCards.find(c => (c.querySelector('.cname')?.textContent || '').includes('ГАРПУН'));
  if (bCard) bCard.click();
  await wait(150);
  check('оружие эволюционировало', !!G.weapons.spear.evolved);
  check('флаг варианта B установлен', G.weapons.spear.evoB === true);

  // короткий прогон: гарпун стреляет без падений
  for (let i = 0; i < 120; i++) N.step(1 / 30);
  check('кадры идут, ошибок нет', N.state === 'play' || N.state === 'levelup' || N.state === 'p6ui');

  // варианты B остальных эволюций
  const evos = [
    { w: 'nova', p: 'power', name: 'ИМПУЛЬС' },
    { w: 'souls', p: 'magnet', name: 'ШТОРМ' },
    { w: 'warriors', p: 'flesh', name: 'ФАЛАНГА' }
  ];
  for (const ev of evos) {
    for (let g = 0; g < 6 && N.state !== 'play'; g++) {
      const lu2 = doc.getElementById('levelup');
      if (lu2 && !lu2.classList.contains('hidden')) { const cc = lu2.querySelectorAll('.card'); if (cc.length) { cc[0].click(); await wait(120); continue; } }
      const p6b = doc.getElementById('p6Ov');
      if (p6b && !p6b.classList.contains('hidden')) { const cc = p6b.querySelectorAll('#p6cards .card'); (cc.length ? cc[0] : doc.getElementById('p6Skip')).click(); await wait(120); continue; }
      const sp = doc.getElementById('specOv');
      if (sp && !sp.classList.contains('hidden')) { const b2 = sp.querySelector('.spec-card .btn'); if (b2) { b2.click(); await wait(120); continue; } }
      await wait(120);
    }
    G.weapons[ev.w] = { id: ev.w, lvl: 5, timer: 0 };
    G.lvls[ev.w] = 5; G.lvls[ev.p] = 3;
    G.need = 1; G.xp = 0;
    G.gems.push({ x: G.P.x, y: G.P.y, val: 30, at: false, ph: 0 });
    await wait(450);
    const cards2 = [...doc.querySelectorAll('#cards .card')];
    const b = cards2.find(c => (c.querySelector('.cname')?.textContent || '').includes(ev.name));
    check('вилка ' + ev.w + ': карта B присутствует', !!b);
    if (b) b.click();
    await wait(150);
    check('вилка ' + ev.w + ': evoB применён', G.weapons[ev.w].evolved === true && G.weapons[ev.w].evoB === true);
  }

  console.log('\nИТОГ:', fails === 0 ? 'EVO-FORK OK' : 'ФЕЙЛОВ: ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(1); });
