/* Аудит-прогон: 2 минуты живого геймплея (ext+gfx+core), сбор runtime-ошибок. */
const fs = require('fs'), path = require('path');
const { JSDOM, VirtualConsole } = require(require.resolve('jsdom', { paths: [path.join(__dirname, '..', 'tests')] }));
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + String(e.message).slice(0, 220)));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ').slice(0, 220)));
const dom = new JSDOM(html, { runScripts: 'dangerously', pretendToBeVisual: true, url: 'http://localhost/', virtualConsole: vc });
const { window } = dom; const doc = window.document;
const wait = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  await wait(900);
  const N = window.__necro;
  N.startRun(); await wait(150);
  const t0 = Date.now();
  let ang = 0;
  while (Date.now() - t0 < 120000) {
    const G = N.G;
    if (!G) { await wait(50); continue; }
    // закрываем оверлеи как игрок
    const lu = doc.getElementById('levelup');
    if (lu && !lu.classList.contains('hidden') && N.state === 'levelup') {
      const cards = [...lu.querySelectorAll('.card')];
      const nm = c => c.querySelector('.cname')?.textContent || '';
      const prio = ['Костяное копьё', 'Блуждающие души', 'Похоронный звон', 'Кровавая нова'];
      let pick = cards.find(c => c.classList.contains('evo')) || prio.map(w => cards.find(c => nm(c).includes(w))).find(Boolean) || cards[0];
      if (pick) pick.click();
      await wait(30); continue;
    }
    const specOv = doc.getElementById('specOv');
    if (specOv && !specOv.classList.contains('hidden')) { specOv.querySelector('.spec-card .btn')?.click(); await wait(30); continue; }
    const p6 = doc.getElementById('p6Ov');
    if (p6 && !p6.classList.contains('hidden')) {
      const c = p6.querySelectorAll('#p6cards .card');
      (c.length ? c[0] : doc.getElementById('p6Skip'))?.click();
      await wait(30); continue;
    }
    const tr = doc.getElementById('trialOv');
    if (tr && tr.style.display === 'flex') { doc.getElementById('trB')?.click(); await wait(30); continue; }
    if (N.state === 'play' && G.P) {
      ang += 0.02;
      G.P.x += Math.cos(ang) * 3; G.P.y += Math.sin(ang) * 3;
      if (G.P.hp < G.P.maxHp * 0.35) G.P.hp = G.P.maxHp; // страховка от смерти — аудит не про выживание
    }
    await wait(30);
  }
  const G = N.G;
  console.log('сыграно сек:', Math.round(G.time), '| уровень:', G.level, '| киллы:', G.kills, '| state:', N.state);
  console.log('trial chain:', JSON.stringify(window.__nxp.runState()));
  console.log('ОШИБКИ (' + errors.length + '):');
  errors.slice(0, 10).forEach(e => console.log('  !', e));
  console.log(errors.length === 0 ? 'AUDIT RUN: ЧИСТО' : 'AUDIT RUN: ЕСТЬ ОШИБКИ');
  process.exit(errors.length === 0 ? 0 : 1);
})().catch(e => { console.error('ERR', e); process.exit(1); });
