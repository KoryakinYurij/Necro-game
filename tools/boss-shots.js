/* Скриншоты всех боссов: по одному рядом с героем, зум в shots/.
   Запуск: node tools/boss-shots.js */
const fs = require('fs');
const path = require('path');
function req(n) {
  try { return require(n); } catch (e) { }
  try { return require('/tmp/node_modules/' + n); } catch (e) { }
  console.error('npm i --prefix tests ' + n); process.exit(2);
}
const { JSDOM, VirtualConsole } = req('jsdom');
const { createCanvas } = req('canvas');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
const html = fs.readFileSync(path.join(ROOT, 'necro-v2.html'), 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('JSDOM ERR:', String(e.message).slice(0, 150)));
const dom = new JSDOM(html, { url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc });
const { window } = dom;
const doc = window.document;
const cv = doc.getElementById('cv');

const BOSSES = [
  ['litch', '#b657ff', 2],
  ['marsh_king', '#8dff57', 3],
  ['bone_colossus', '#d9d2bd', 2],
  ['blood_duchess', '#ff4757', 3],
  ['death', '#c7f4ff', 3]
];

function snap(name) {
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const img = ctx.getImageData(0, 0, w, h);
  const full = createCanvas(w, h);
  full.getContext('2d').putImageData(img, 0, 0);
  const cx = Math.floor(w / 2) + 130, cy = Math.floor(h / 2);
  const c = createCanvas(480, 480);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(full, cx - 80, cy - 80, 160, 160, 0, 0, 480, 480);
  fs.writeFileSync(path.join(SHOTS, name + '.png'), c.toBuffer('image/png'));
  console.log('saved shots/' + name + '.png');
}

setTimeout(() => {
  const N = window.__necro;
  N.startRun();
  const c = doc.querySelector('#cards .card'); if (c) c.click();
  setTimeout(() => {
    const G = N.G;
    let i = 0;
    function next() {
      if (i >= BOSSES.length) { console.log('все боссы сняты'); process.exit(0); }
      const [kind, kc, phase] = BOSSES[i];
      G.enemies.length = 0;
      G.enemies.push({
        id: 9000 + i, type: 'boss', kind, boss: true, elite: true, kc, bname: kind,
        x: G.P.x + 130, y: G.P.y, hp: phase === 3 ? 200 : 500, maxhp: 1000, r: 28, ph: 1, hitT: 0, slowT: 0,
        slowF: 1, squashX: 1, squashY: 1, spd: 0, bspd: 0, dmg: 10, hitCd: 9, orbCd: 0,
        kx: 0, ky: 0, tilt: 0, sumT: 99, affix: null, shields: 0, dead: false,
        p6: { phase, atk: 99, sub: 0 }, p6death: kind === 'death'
      });
      setTimeout(() => { snap('boss_' + kind); i++; next(); }, 500);
    }
    next();
  }, 400);
}, 700);
setTimeout(() => process.exit(0), 20000);
