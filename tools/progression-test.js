/* Интеграционный тест progression-слоя: доктрины, испытания, печати, ачивки, благословения, кап уровня. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/' });
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' · ' + n); if (!c) fails++; };

function fakeEnemy(G, kind) {
  const P = G.P;
  const e = {
    id: 900000 + Math.floor(Math.random() * 9999), type: kind ? 'boss' : 'elite',
    elite: !kind, boss: !!kind, kind: kind || null,
    hp: 10, maxhp: 10, spd: 0, dmg: 0, r: 12, x: P.x + 600, y: P.y + 600,
    hitT: 0, hitCd: 5, orbCd: 5, slowT: 0, slowF: 1, kx: 0, ky: 0, ph: 0, sumT: 99,
    dead: false, affix: null, shields: 0, vortexCd: 99, stormCd: 99, fireTimer: 0,
    squashX: 1, squashY: 1, tilt: 0
  };
  G.enemies.push(e);
  return e;
}

(async () => {
  await wait(900);
  const N = window.__necro;
  N.startRun(); await wait(200);
  const c0 = doc.querySelector('#cards .card'); if (c0) c0.click();
  await wait(200);
  const G = N.G;

  check('доктрина ОРДА применена на старте (пакт swarm)', G.pacts.includes('swarm'));

  // испытание 1: накручиваем киллы
  G.kills += 120; await wait(250);
  check('оверлей награды показан (ЖАТВА)', doc.getElementById('trialOv').style.display === 'flex');
  const rel0 = G.relics.length;
  doc.getElementById('trA').click(); await wait(100);
  check('награда А: реликвия получена', G.relics.length === rel0 + 1);

  // испытание 2: два «чемпиона» через инъекцию+удаление
  for (let i = 0; i < 2; i++) {
    const f = fakeEnemy(G, null); await wait(150);
    G.enemies.splice(G.enemies.indexOf(f), 1); await wait(200);
  }
  check('оверлей награды показан (ЧЕМПИОНЫ)', doc.getElementById('trialOv').style.display === 'flex');
  const rr0 = G.rerollsLeft;
  doc.getElementById('trB').click(); await wait(100);
  check('награда Б: +1 переброс', G.rerollsLeft === rr0 + 1);

  // испытание 3: событие
  G.event = 'tide'; await wait(200);
  G.event = null; await wait(250);
  check('оверлей награды показан (ВЫСТОЯТЬ)', doc.getElementById('trialOv').style.display === 'flex');
  doc.getElementById('trB').click(); await wait(100);
  check('цепочка 3/3 + ачивка «Странник испытаний»', window.__nxp.runState().done === 3 && !!window.__nxp.ach().trialist);

  // печати: 4 владыки
  for (const k of ['litch', 'marsh_king', 'bone_colossus', 'blood_duchess']) {
    const f = fakeEnemy(G, k); await wait(150);
    G.enemies.splice(G.enemies.indexOf(f), 1); await wait(200);
  }
  const seals = window.__nxp.seals();
  check('печати всех четырёх владык', ['litch', 'marsh_king', 'bone_colossus', 'blood_duchess'].every(k => (seals[k] || 0) === 1));
  check('ачивка «Цареубийца»', !!window.__nxp.ach().regicide);

  // благословение разлочено и применяется в новом забеге
  window.__nxp.setBoon('royal');
  check('благословение «Венец» выбрано', window.__nxp.boon() === 'royal');
  N.startRun(); await wait(200);
  const c1 = doc.querySelector('#cards .card'); if (c1) c1.click();
  await wait(250);
  check('венец в новом забеге (реликвия grave_crown)', N.G.relics.includes('grave_crown'));

  // кап уровня: перелив XP -> апофеоз вместо драфта
  const G2 = N.G;
  G2.specChosen = true; G2.level = 60; G2.xp = 0;
  for (let i = 0; i < 3; i++) {
    G2.need = 1;
    G2.gems.push({ x: G2.P.x, y: G2.P.y, val: 1, at: false, ph: 0 });
    await wait(250);
  }
  check('после капа — апофеоз-выбор, не драфт (lb=3)', (G2.lb || 0) === 3 && N.state === 'p6ui');
  const pc = doc.querySelectorAll('#p6cards .card'); if (pc.length) pc[0].click();
  await wait(100);

  console.log('\nИТОГ:', fails === 0 ? 'PROGRESSION OK' : 'ФЕЙЛОВ: ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(1); });
