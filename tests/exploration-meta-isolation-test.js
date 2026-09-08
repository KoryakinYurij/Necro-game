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
    const M = N.meta;
    M.souls = 12345;
    Object.assign(M.legion, {
      knowledge: 9000, ash: 8000, doctrine: 'rite', focus: 'blood', boon: 'relic',
      nodes: { bone_rites: 1, grave_bond: 1, pack_law: 1, corpse_cycle: 1 },
      unlocked: { warrior: 1, archer: 1, swarm: 1, wraith: 1 },
      unlockedSummons: { bone_priest: 1, grave_hound: 1 },
      unlockedRituals: { black_catalyst: 1 }
    });
    const beforeMeta = { souls: M.souls, knowledge: M.legion.knowledge, ash: M.legion.ash };

    X.setMode('exploration');
    X.setDifficulty({ hp: 1, dmg: 1 });
    N.startRun();
    const firstCard = window.document.querySelector('#cards .card');
    if (firstCard) firstCard.click();
    setTimeout(() => {
      try {
        const G = N.G;
        check('developed meta не меняет army baseline', G.army.dmg === 0 && G.army.hp === 0);
        check('developed meta не меняет attack baseline', Math.abs(G.P.atkMult - 1) < 1e-9);
        check('legacy family unlocks не переходят в Exploration', !(G.legionUnlocked || []).includes('wraith'));
        check('legacy summon unlocks не переходят в Exploration', !G.legion.unlockedSummons.bone_priest && !G.legion.unlockedSummons.grave_hound);
        check('legacy ritual input отключён в Exploration', N.castSpell('black_catalyst') === false);
        check('legacy sacrifice input отключён в Exploration', window.__nxp.sacrifice() === false);
        check('legacy spell HUD скрыт в Exploration', window.document.getElementById('spellHud').style.display === 'none');

        G.kills = 24;
        G.ult = 100;
        X.setDifficulty({ hp: 0.01, dmg: 1 });
        const elite = X.spawn('elite', G.P.x + 50, G.P.y);
        N.castUlt();
        check('контрольный elite убит через shared combat', elite.dead || elite.hp <= 0);
        check('Exploration kill не пишет legacy souls', M.souls === beforeMeta.souls);
        check('Exploration kill не пишет legacy knowledge', M.legion.knowledge === beforeMeta.knowledge);
        check('Exploration kill не пишет legacy ash', M.legion.ash === beforeMeta.ash);
        console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
        console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION META ISOLATION OK');
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
