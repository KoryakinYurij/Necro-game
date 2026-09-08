const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));

const noop = () => {};
function makeCtx() {
  const target = {};
  return new Proxy(target, {
    get(t, k) {
      if (k in t) return t[k];
      if (k === 'createRadialGradient' || k === 'createLinearGradient' || k === 'createPattern')
        return () => ({ addColorStop: noop });
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) });
      return noop;
    },
    set(t, k, v) { t[k] = v; return true; }
  });
}
const dom = new JSDOM(html, {
  url: 'http://localhost/',
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  virtualConsole: vc,
  beforeParse(window) {
    window.HTMLCanvasElement.prototype.getContext = function () {
      if (!this.__ctx) this.__ctx = makeCtx();
      return this.__ctx;
    };
    window.matchMedia = window.matchMedia || (() => ({
      matches: false, addListener: noop, removeListener: noop,
      addEventListener: noop, removeEventListener: noop
    }));
  }
});

const { window } = dom;
const fails = [];
function check(name, cond) {
  console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name);
  if (!cond) fails.push(name);
}
setTimeout(() => {
  try {
    const N = window.__necro;
    const X = N && N.exploration;
    check('единый exploration adapter доступен', !!X);
    check('legacy P6 contract сохранён', !!(N && N.P6 && N.P6.waveT));
    check('orchestration mode по умолчанию arena', X && X.mode === 'arena');
    check('adapter умеет менять mode', X && typeof X.setMode === 'function');
    check('adapter имеет simulation seam', X && typeof X.setSimulationHook === 'function');
    check('adapter имеет world render seam', X && typeof X.setWorldRenderHook === 'function');
    check('adapter имеет explicit spawn', X && typeof X.spawn === 'function');
    check('adapter имеет dedicated difficulty capability', X && typeof X.setDifficulty === 'function');
    const modeBtn = window.document.getElementById('modeBtn');
    const explorationModeBtn = window.document.getElementById('explorationModeBtn');
    check('отдельный selector показывает Arena', !!explorationModeBtn && explorationModeBtn.textContent.includes('АРЕНА'));
    check('legacy finale/endless control сохранён в Arena', !!modeBtn && modeBtn.style.display !== 'none');
    explorationModeBtn && explorationModeBtn.click();
    check('selector выбирает Exploration', X && X.mode === 'exploration' && explorationModeBtn.textContent.includes('ИССЛЕДОВАНИЕ'));
    check('legacy mode control скрыт в Exploration', modeBtn && modeBtn.style.display === 'none');
    explorationModeBtn && explorationModeBtn.click();
    check('selector возвращает Arena control', X && X.mode === 'arena' && explorationModeBtn.textContent.includes('АРЕНА') && modeBtn.style.display !== 'none');

    if (!X) throw new Error('exploration adapter missing');
    let liveTicks = 0, renderTicks = 0;
    X.setMode('exploration');
    X.setSimulationHook(() => { liveTicks++; });
    if (X.setWorldRenderHook) X.setWorldRenderHook(() => { renderTicks++; });
    N.startRun();
    check('Exploration стартует без стартовой группы', N.G.enemies.length === 0);
    const legacyP6 = N.P6;
    const oldRandom = window.Math.random;
    window.Math.random = () => 0.5;
    X.setDifficulty({ hp: 1, dmg: 1 });
    const low = X.spawn('zom', 10000, 10000);
    X.setDifficulty({ hp: 2, dmg: 1.5 });
    const high = X.spawn('zom', 10100, 10000);
    window.Math.random = oldRandom;
    check('spatial difficulty меняет HP через отдельный capability', high.maxhp > low.maxhp * 1.8);
    check('difficulty capability не мутирует legacy P6 contract', N.P6 === legacyP6 && !!N.P6.waveT);

    const firstCard = window.document.querySelector('#cards .card');
    if (firstCard) firstCard.click();
    setTimeout(() => {
      try {
        check('Exploration перешёл в play', N.state === 'play');
        check('simulation seam вызывается живым game loop', liveTicks > 0);
        check('world render seam вызывается существующим renderer', renderTicks > 0);
        const beforePause = liveTicks;
        N.pause();
        setTimeout(() => {
          try {
            check('pause останавливает simulation seam', liveTicks === beforePause);
            X.setSimulationHook(null);
            if (X.setWorldRenderHook) X.setWorldRenderHook(null);
            X.setMode('arena');
            N.startRun();
            check('Arena control сохраняет стартовую группу', N.G.enemies.length === 4);
            console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
            console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION ADAPTER OK');
            process.exit(fails.length || errors.length ? 1 : 0);
          } catch (e) {
            console.error(e.stack || e);
            process.exit(1);
          }
        }, 120);
      } catch (e) {
        console.error(e.stack || e);
        process.exit(1);
      }
    }, 180);
  } catch (e) {
    console.error(e.stack || e);
    process.exit(1);
  }
}, 700);

setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 8000);
