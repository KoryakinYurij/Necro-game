/* Тест легион-оси: доктрины с армией, фокус-лоадаут, Жертва. */
const fs = require('fs'), path = require('path');
const { JSDOM } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const stubCanvas = require('../tests/jsdom-canvas-stub');
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', beforeParse: stubCanvas });
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));
let fails = 0;
const check = (n, c) => { console.log((c ? 'PASS' : 'FAIL') + ' · ' + n); if (!c) fails++; };
const near = (a, b) => Math.abs(a - b) < 1e-9;

(async () => {
  await wait(900);
  const N = window.__necro;
  N.startRun(); await wait(250);
  const c0 = doc.querySelector('#cards .card'); if (c0) c0.click();
  await wait(250);
  let G = N.G;

  check('доктрина ОРДА: +15% HP армии', near(G.army.hp, 0.15) && near(G.army.dmg, 0));

  // Жертва: фейковый миньон крови
  G.minions.push({ kind: 'grave_hound', dead: false, hp: 5, maxhp: 5, x: G.P.x + 40, y: G.P.y, cd: 1, resp: 0, hitT: 0, slashT: 0, slotAng: 0, ph: 0, face: 1, tilt: 0 });
  await wait(150);
  check('кнопка Жертвы видна при живом миньоне', doc.getElementById('sacBtn').style.display === 'block');
  G.P.hp = G.P.maxHp * .5;
  const hp0 = G.P.hp;
  const ok = window.__nxp.sacrifice();
  check('Жертва принята (трупа нет, HP+', ok === true && G.minions[0].dead === true && G.P.hp > hp0);
  check('кулдаун Жертвы блокирует повтор', window.__nxp.sacrifice() === false);

  // АККОРДЫ: 3 кости → +6% урона армии; 5 → +10% HP армии
  for (let i = 0; i < 3; i++) G.minions.push({ kind: 'bone_priest', dead: false, hp: 5, maxhp: 5, x: G.P.x, y: G.P.y, cd: 1, resp: 0 });
  await wait(250);
  check('аккорд КОСТЬ 1: +6% урона армии', near(G.army.dmg, 0.06));
  for (let i = 0; i < 2; i++) G.minions.push({ kind: 'bone_knight', dead: false, hp: 5, maxhp: 5, x: G.P.x, y: G.P.y, cd: 1, resp: 0 });
  await wait(250);
  check('аккорд КОСТЬ 2: +10% HP армии (итог 0.25)', near(G.army.hp, 0.25));

  // доктрина РИТУАЛ + фокус КРОВЬ
  window.__nxp.setDoctrine('rite');
  window.__nxp.setFocus('blood');
  N.startRun(); await wait(250);
  const c1 = doc.querySelector('#cards .card'); if (c1) c1.click();
  await wait(250);
  G = N.G;
  check('РИТУАЛ+КРОВЬ: армия 0.08 HP / 0.20 dmg', near(G.army.hp, 0.08) && near(G.army.dmg, 0.20));
  check('пакт Голода от доктрины применён', G.pacts.includes('famine'));

  // фокус ТЛЕН: +1 переброс
  window.__nxp.setFocus('corpse');
  N.startRun(); await wait(250);
  const c2 = doc.querySelector('#cards .card'); if (c2) c2.click();
  await wait(250);
  G = N.G;
  check('фокус ТЛЕН: 2 переброса на старте', N.G.rerollsLeft === 2);

  // слой 3: убеждаемся, что время идёт (spec/левелапы не стопят сцену)
  G.specChosen = true;
  for (let g = 0; g < 6 && N.state !== 'play'; g++) {
    const lu3 = doc.getElementById('levelup');
    if (lu3 && !lu3.classList.contains('hidden')) { const cc = lu3.querySelectorAll('.card'); if (cc.length) { cc[0].click(); await wait(120); continue; } }
    const sp3 = doc.getElementById('specOv');
    if (sp3 && !sp3.classList.contains('hidden')) { const b3 = sp3.querySelector('.spec-card .btn'); if (b3) { b3.click(); await wait(120); continue; } }
    const p63 = doc.getElementById('p6Ov');
    if (p63 && !p63.classList.contains('hidden')) { const cc = p63.querySelectorAll('#p6cards .card'); (cc.length ? cc[0] : doc.getElementById('p6Skip')).click(); await wait(120); continue; }
    await wait(120);
  }

  // СЛОЙ 3: эхо семей на ульте (кость >=3 живых)
  for (let i = 0; i < 5; i++) G.minions.push({ kind: i < 3 ? 'bone_priest' : 'bone_knight', dead: false, hp: 5000, maxhp: 5000, x: G.P.x + 400, y: G.P.y + 400, cd: 9, resp: 0 });
  await wait(500);
  G.ult = 100; G.ultCd = 0;
  const ad0 = G.army.dmg;
  N.castUlt();
  await wait(800);
  check('ЭХО КОСТИ на ульте: +2% урона армии', near(G.army.dmg, ad0 + 0.02));

  // ЩИТ АРМИИ: фаза с миньонами (забег 3) против контроля (забег 4), урон ×100 для контраста
  const mkZ = (dmg) => ({ id: 777000 + Math.random(), type: 'zom', x: G.P.x + 5, y: G.P.y, hp: 5000, maxhp: 5000, spd: 0, dmg, r: 13, ph: 0, hitT: 0, hitCd: 0, orbCd: 9, slowT: 0, slowF: 1, kx: 0, ky: 0, sumT: 99, dead: false, elite: false, boss: false, affix: null, shields: 0, squashX: 1, squashY: 1, tilt: 0 });
  const firstHit = async (GG, dmg) => {
    GG.time = 30; GG.P.x += 6000; GG.P.y += 6000; GG.enemies.length = 0;
    GG.P.maxHp = 5000; GG.P.hp = 5000; GG.P.inv = 0; GG.P.hitGate = -9;
    GG.enemies.push(mkZ(dmg));
    const h0 = GG.P.hp;
    for (let i = 0; i < 160 && GG.P.hp === h0; i++) await wait(50);
    return h0 - GG.P.hp;
  };
  G.time = 30;
  const dWith = await firstHit(G, 100);
  N.startRun(); await wait(250);
  const c3 = doc.querySelector('#cards .card'); if (c3) c3.click();
  await wait(250);
  const G4 = N.G; G4.specChosen = true;
  const dCtl = await firstHit(G4, 100);
  check('ЩИТ АРМИИ: с 5+ миньонами урон ≈×0.8 (' + dWith + ' vs ' + dCtl + ')', dWith > 0 && dCtl > 0 && dWith <= dCtl * 0.85);
  G = G4;

  // Жертва в финале: КД 5с и двойной прирост армии
  G.finaleSpawned = true;
  G.minions.push({ kind: 'grave_witch', dead: false, hp: 5000, maxhp: 5000, x: G.P.x + 6400, y: G.P.y + 6400, cd: 9, resp: 0 });
  await wait(300);
  for (let i = 0; i < 400 && window.__nxp.sacCd() > 0; i++) await wait(60);
  const ah0 = G.army.hp;
  const okF = window.__nxp.sacrifice();
  check('Жертва в финале: КД 5с и +4% HP армии', okF === true && window.__nxp.sacCd() <= 5.01 && near(G.army.hp, ah0 + 0.04));

  // КОНТЕНТ: семья ПЕПЕЛ — фокус открывает семью, аккорды и ульт-эволюция
  window.__nxp.setFocus('ash');
  N.startRun(); await wait(250);
  const c4 = doc.querySelector('#cards .card'); if (c4) c4.click();
  await wait(250);
  G = N.G; G.specChosen = true;
  check('фокус ПЕПЕЛ открывает семью навсегда', N.meta.legion.unlockedSummons.ash_zealot === 1);
  check('фокус ПЕПЕЛ: +6% урона армии на старте', near(G.army.dmg, 0.08 + 0.06));
  for (let i = 0; i < 3; i++) G.minions.push({ kind: i < 2 ? 'ash_zealot' : 'cinder_bell', dead: false, hp: 5000, maxhp: 5000, x: G.P.x + 400, y: G.P.y + 400, cd: 9, resp: 0 });
  await wait(600);
  check('аккорды ПЕПЛА 2/3: +8% урона армии', near(G.army.dmg, 0.14 + 0.08));
  G.ult = 100; G.ultCd = 0;
  const ad1 = G.army.dmg;
  N.castUlt();
  await wait(800);
  check('УЛЬТ-ЭВОЛЮЦИЯ ПЕПЛА: +5% урона и ЭХО +6 ГНЕВА', near(G.army.dmg, ad1 + 0.05) && G.ult >= 5);

  console.log('\nИТОГ:', fails === 0 ? 'LEGION OK' : 'ФЕЙЛОВ: ' + fails);
  process.exit(fails === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(1); });
