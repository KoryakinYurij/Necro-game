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
  return new Proxy({}, {
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
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc,
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
    const X = N.exploration;
    X.setMode('exploration');
    X.setDifficulty({ hp: 1.25, dmg: 1 });
    N.startRun();
    const firstCard = window.document.querySelector('#cards .card');
    if (firstCard) firstCard.click();

    setTimeout(() => {
      try {
        const G = N.G;
        G.minions = [];
        const oldRandom = window.Math.random;
        window.Math.random = () => 0.5;
        G.time = 30;
        const hpEarly = X.spawn('zom', 5000, 5000).maxhp;
        G.enemies = [];
        G.time = 600;
        const hpLate = X.spawn('zom', 5000, 5000).maxhp;
        G.enemies = [];
        window.Math.random = oldRandom;
        check('elapsed time не меняет baseline HP в Exploration', hpEarly === hpLate);
        function hitAt(time, dmgScale) {
          X.setDifficulty({ hp: 1, dmg: dmgScale });
          G.time = time;
          G.enemies = [];
          G.minions = [];
          G.P.hp = G.P.maxHp = G.P.displayHp = 1000;
          G.P.inv = 0;
          G.P.hitGate = -999;
          const enemy = X.spawn('zom', G.P.x, G.P.y);
          enemy.hitCd = 0;
          N.step(0.016);
          return 1000 - G.P.hp;
        }

        const dmgEarly = hitAt(30, 1);
        const dmgLate = hitAt(600, 1);
        const dmgHard = hitAt(600, 2);
        console.log('damage samples:', { dmgEarly, dmgLate, dmgHard });
        check('elapsed time не меняет фактический входящий урон', dmgEarly === dmgLate && dmgEarly > 0);
        check('dedicated dmg scale меняет фактический входящий урон', dmgHard > dmgLate * 1.8);
        console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
        console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION DIFFICULTY OK');
        process.exit(fails.length || errors.length ? 1 : 0);
      } catch (e) {
        console.error(e.stack || e);
        process.exit(1);
      }
    }, 220);
  } catch (e) {
    console.error(e.stack || e);
    process.exit(1);
  }
}, 700);

setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 9000);
