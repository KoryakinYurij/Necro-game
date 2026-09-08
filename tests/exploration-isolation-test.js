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
    const X = N.exploration;
    X.setMode('exploration');
    X.setDifficulty({ hp: 1, dmg: 1 });
    N.startRun();
    const firstCard = window.document.querySelector('#cards .card');
    if (firstCard) firstCard.click();

    setTimeout(() => {
      try {
        const G = N.G;
        G.P.hp = G.P.maxHp = G.P.displayHp = 1000000;
        check('Exploration не получает legacy start bonuses/pacts', (G.pacts || []).length === 0);
        check('progression HUD скрыт в Exploration', window.document.getElementById('trialHud').style.display === 'none');

        for (let i = 0; i < 2400; i++) N.step(0.25); // 10 simulated minutes

        check('10 минут стоя не создают ambient/timed enemies', G.enemies.length === 0);
        check('Arena phase/event machine не продвигается', G.phase === 'wave' && !G.event);
        check('pact/apotheosis modals не срабатывают', (G.pacts || []).length === 0 && window.document.getElementById('p6Ov').classList.contains('hidden'));
        check('timed biome не меняется', G.biomeIdx === 0);
        check('finale не запускается раньше своей границы', !G.finaleSpawned);
        const boss = X.spawn('boss', 1200, 1200);
        check('boss для проверки cinematic создан', !!boss && boss.boss);
        setTimeout(() => {
          try {
            check('boss intro не меняет timescale в Exploration', window.__nxTS !== 0.3);
            check('boss nameplate не появляется в Exploration', !window.document.querySelector('.nx-bossplate'));
            console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
            console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION ISOLATION OK');
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

setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 10000);
