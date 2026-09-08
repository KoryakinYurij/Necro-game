/* Тест «враждебного окружения»: без AudioContext, с мёртвыми обработчиками, без основного скрипта. */
const fs = require('fs');
const path = require('path');
function req(n) {
  try { return require(n); } catch (e) { }
  try { return require('/tmp/node_modules/' + n); } catch (e) { }
  console.error('Не найдена зависимость "' + n + '". Выполните: npm i --prefix tests ' + n);
  process.exit(2);
}
const { JSDOM, VirtualConsole } = req('jsdom');
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const fails = [];
const errors = [];
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name); if (!cond) fails.push(name); };
const noop = () => {};
function makeCtx(){const t={};return new Proxy(t,{get(a,k){if(k in a)return a[k];if(k==='createRadialGradient'||k==='createLinearGradient')return()=>({addColorStop:noop});if(k==='measureText')return()=>({width:10});return noop},set(a,k,v){a[k]=v;return true}});}
const jsdomOpts = (h, vc) => ({
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.HTMLCanvasElement.prototype.getContext = function () { if (!this.__c) this.__c = makeCtx(); return this.__c; };
    // враждебность №1: аудио недоступно
    delete w.AudioContext; delete w.webkitAudioContext;
  }
});
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e.message)));

const dom = new JSDOM(html, jsdomOpts(html, vc));
const { window } = dom;
const doc = window.document;

setTimeout(async () => {
  try {
    const N = window.__necro;
    check('игра загрузилась без AudioContext', !!N);

    // --- A. старт кнопкой без аудио ---
    doc.getElementById('startBtn').click();
    await new Promise(r => setTimeout(r, 200));
    check('НАЧАТЬ ЖАТВУ работает без AudioContext', N.state !== 'menu');

    // вернуть в меню для следующих проверок
    const card = doc.querySelector('#cards .card'); if (card) card.click();
    await new Promise(r => setTimeout(r, 100));

    // --- B. legacy Arena submode: normal handler + fallback must not double-toggle ---
    const modeBtn = doc.getElementById('modeBtn');
    const legacyBefore = N.meta.mode;
    modeBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('обычная Arena-кнопка переключает finale/endless ровно один раз', N.meta.mode !== legacyBefore);
    const selectedArenaMode = N.meta.mode;
    N.startRun();
    await new Promise(r => setTimeout(r, 120));
    check('новый Arena run получает выбранный finale/endless', N.G && N.G.mode === selectedArenaMode);
    const restartCard = doc.querySelector('#cards .card'); if (restartCard) restartCard.click();
    await new Promise(r => setTimeout(r, 80));

    // fallback остаётся рабочим, если основной onclick действительно отсутствует
    const fallbackBefore = N.meta.mode;
    modeBtn.onclick = null;
    modeBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('fallback переключает Arena finale/endless без onclick', N.meta.mode !== fallbackBefore);
    const explorationModeBtn = doc.getElementById('explorationModeBtn');
    const orchestrationBefore = N.exploration.mode;
    explorationModeBtn.click();
    await new Promise(r => setTimeout(r, 60));
    check('отдельный selector переключает orchestration mode', N.exploration.mode !== orchestrationBefore);
    explorationModeBtn.click();

    // пауза и резюме: штатный onclick не должен быть отменён fallback-слоем
    const pauseBtn = doc.getElementById('pauseBtn');
    pauseBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('обычная pause-кнопка ставит паузу ровно один раз', N.state === 'pause');
    const resumeBtn = doc.getElementById('resumeBtn');
    resumeBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('обычная resume-кнопка снимает паузу', N.state === 'play');
    pauseBtn.onclick = null;
    pauseBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('fallback pause работает без onclick', N.state === 'pause');
    resumeBtn.onclick = null;
    resumeBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('fallback resume работает без onclick', N.state === 'play');

    // звук: штатный и fallback сценарии отдельно
    const muteBtn = doc.getElementById('muteBtn');
    const normalMuteBefore = muteBtn.textContent;
    muteBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('обычная mute-кнопка переключает звук ровно один раз', muteBtn.textContent !== normalMuteBefore);
    const fallbackMuteBefore = muteBtn.textContent;
    muteBtn.onclick = null;
    muteBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('fallback mute работает без onclick', muteBtn.textContent !== fallbackMuteBefore);

    // выход в меню с экрана смерти
    N.state = 'over';
    doc.getElementById('overOv').classList.remove('hidden');
    const menuBtn = doc.getElementById('menuBtn');
    menuBtn.onclick = null;
    menuBtn.click();
    await new Promise(r => setTimeout(r, 120));
    check('дублёр возвращает в меню', N.state === 'menu' && !doc.getElementById('menu').classList.contains('hidden'));

    // повторный старт дублёром
    doc.getElementById('startBtn').onclick = null;
    doc.getElementById('startBtn').click();
    await new Promise(r => setTimeout(r, 150));
    check('дублёр стартует забег', N.state !== 'menu');

    // --- C. основной скрипт отсутствует: диагностика ---
    const stripped = html.replace(/<script>\(function\(\){[\s\S]*?\}\)\(\);<\/script>/, '');
    check('тестовое вырезание основного скрипта сработало', !stripped.includes('castUlt'));
    const vc2 = new VirtualConsole(); vc2.on('jsdomError', () => {});
    const dom2 = new JSDOM(stripped, jsdomOpts(stripped, vc2));
    await new Promise(r => setTimeout(r, 400));
    check('показано сообщение «скрипты не запустились»', !!dom2.window.document.getElementById('nxBootFail'));

    console.log('\nошибки окружения:', errors.length ? '' : 'НЕТ');
    errors.slice(0, 5).forEach(e => console.log('  !', e.slice(0, 200)));
    console.log('ИТОГ:', fails.length === 0 ? 'ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ' : 'ФЕЙЛЫ: ' + fails.join('; '));
    process.exit(fails.length ? 1 : 0);
  } catch (e) {
    console.error('CRASH:', (e && e.stack) || e);
    process.exit(1);
  }
}, 800);
