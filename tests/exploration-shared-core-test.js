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
    const oldRandom = window.Math.random;
    window.Math.random = () => 0;
    N.startRun();
    const warriorCard = [...window.document.querySelectorAll('#cards .card')]
      .find(c => (c.querySelector('.cname')?.textContent || '').includes('Скелеты-воины'));
    check('настоящий summon доступен через стартовый draft', !!warriorCard);
    if (warriorCard) warriorCard.click();
    window.Math.random = oldRandom;

    setTimeout(() => {
      try {
        const G = N.G;
        const x0 = G.P.x;
        window.dispatchEvent(new window.KeyboardEvent('keydown', { code: 'KeyD' }));
        N.step(0.2);
        window.dispatchEvent(new window.KeyboardEvent('keyup', { code: 'KeyD' }));
        check('movement update работает в Exploration', G.P.x > x0);

        const summoned = G.minions.find(m => m.kind === 'warriors' && !m.dead);
        check('draft реально создал shared-core миньона', !!summoned);

        G.enemies = [];
        G.projs = [];
        if (summoned) { summoned.dead = true; summoned.resp = 999; }
        G.weapons.spear = { id: 'spear', lvl: 1, timer: 0 };
        G.lvls.spear = 1;
        const projectileTarget = X.spawn('zom', G.P.x + 180, G.P.y, null);
        projectileTarget.spd = 0;
        const projectileHp0 = projectileTarget.hp;
        N.step(0.05);
        check('weapon создаёт projectile в Exploration', G.projs.length > 0);
        for (let i = 0; i < 30 && !projectileTarget.dead && projectileTarget.hp === projectileHp0; i++) N.step(0.02);
        check('projectile → hit → enemy HP работает', projectileTarget.dead || projectileTarget.hp < projectileHp0);

        delete G.weapons.spear;
        G.lvls.spear = 0;
        G.enemies = [];
        G.projs = [];
        if (summoned) {
          summoned.dead = false; summoned.resp = 0; summoned.cd = 0;
          summoned.x = G.P.x + 120; summoned.y = G.P.y;
          const minionTarget = X.spawn('zom', summoned.x + 24, summoned.y, null);
          minionTarget.spd = 0; minionTarget.dmg = 0;
          const minionHp0 = minionTarget.hp;
          for (let i = 0; i < 30 && !minionTarget.dead && minionTarget.hp === minionHp0; i++) N.step(0.05);
          check('настоящий summon → attack → enemy HP работает', minionTarget.dead || minionTarget.hp < minionHp0);
        } else {
          check('настоящий summon → attack → enemy HP работает', false);
        }
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
