const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const stubCanvas = require('./jsdom-canvas-stub');

const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(e.message));
vc.on('error', (...a) => errors.push(a.join(' ')));
const dom = new JSDOM(html, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true,
  virtualConsole: vc, beforeParse: stubCanvas
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
        const x0 = G.P.x;
        window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyD' }));
        N.step(0.2);
        window.dispatchEvent(new window.KeyboardEvent('keyup', { code: 'KeyD' }));
        check('movement update работает в Exploration', G.P.x > x0);

        G.enemies = [];
        G.projs = [];
        G.weapons.spear = { id: 'spear', lvl: 1, timer: 0 };
        G.lvls.spear = 1;
        X.spawn('zom', G.P.x + 220, G.P.y, null);
        N.step(0.05);
        check('projectile update/spawn работает в Exploration', G.projs.length > 0);

        G.minions = [{ kind: 'warriors', x: G.P.x - 120, y: G.P.y, hp: 100, maxhp: 100,
          dmg: 10, spd: 120, cd: 0, dead: false, resp: 0, hitT: 0, slashT: 0,
          slotAng: 0, ph: 0, face: 1, tilt: 0 }];
        const mx0 = G.minions[0].x;
        N.step(0.2);
        check('summon/minion update работает в Exploration', G.minions[0].x !== mx0 || G.minions[0].slashT > 0);
        check('shared damage state остаётся живым', G.P.hp > 0 && G.enemies.length > 0);
        console.log('\nОшибки среды:', errors.length ? errors.slice(0, 5) : 'НЕТ');
        console.log('ИТОГ:', fails.length || errors.length ? 'FAIL' : 'EXPLORATION SHARED CORE OK');
        process.exit(fails.length || errors.length ? 1 : 0);
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

setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 9000);
