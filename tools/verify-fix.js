/* Проверка фикса L1: при победе банк душ == soulsGained (без удвоения). */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, {
  runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/',
  beforeParse(w) { w.requestAnimationFrame = () => 0; w.cancelAnimationFrame = () => {}; }
});
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);
  const N = window.__necro;
  N.startRun(); await wait(50);
  // первый дар
  const c0 = doc.querySelector('#cards .card'); if (c0) c0.click();
  N.P6.finaleAt = 45; // финал через 45 сек для скорости

  for (let t = 0; t < 120 && N.state !== 'win'; t += 1 / 30) {
    const G = N.G; if (!G) continue;
    // закрываем оверлеи
    const lu = doc.getElementById('levelup');
    if (lu && !lu.classList.contains('hidden')) { const c = lu.querySelectorAll('.card'); if (c.length) { c[0].click(); continue; } }
    const p6 = doc.getElementById('p6Ov');
    if (p6 && !p6.classList.contains('hidden')) { const c = p6.querySelectorAll('#p6cards .card'); (c.length ? c[0] : doc.getElementById('p6Skip')).click(); continue; }
    if (N.state !== 'play') { await wait(5); continue; }

    // бот кружит; если финальный босс появился — опускаем ему HP до 1 (тест победы)
    const boss = G.enemies.find(e => e.type === 'boss' && e.p6death);
    if (boss && boss.hp > 1) boss.hp = 1;
    if (!G.weapons.spear) G.weapons.spear = { id: 'spear', lvl: 5, timer: 0 };
    G.P.x += Math.cos(t * .6) * 175 / 30; G.P.y += Math.sin(t * .6) * 175 / 30;
    if (G.P.hp < G.P.maxHp * .6) G.P.hp = G.P.maxHp; // бога-режим до финала
    N.step(1 / 30);
  }
  const G = N.G;
  console.log('state:', N.state);
  console.log('soulsGained (экран победы):', G.soulsGained);
  console.log('банк душ (meta.souls):      ', N.meta.souls);
  console.log(G.soulsGained === N.meta.souls ? 'PASS · удвоения нет' : 'FAIL · банк != награда забега');
  process.exit(0);
})().catch(e => { console.error('ERR', e); process.exit(1); });
