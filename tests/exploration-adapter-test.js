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

    if (!X) throw new Error('exploration adapter missing');
    let liveTicks = 0;
    X.setMode('exploration');
    X.setSimulationHook(() => { liveTicks++; });
    N.startRun();
    check('Exploration стартует без стартовой группы', N.G.enemies.length === 0);

    const firstCard = window.document.querySelector('#cards .card');
    if (firstCard) firstCard.click();
    setTimeout(() => {
      try {
        check('Exploration перешёл в play', N.state === 'play');
        check('simulation seam вызывается живым game loop', liveTicks > 0);
        const beforePause = liveTicks;
        N.pause();
        setTimeout(() => {
          try {
            check('pause останавливает simulation seam', liveTicks === beforePause);
            X.setSimulationHook(null);
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
