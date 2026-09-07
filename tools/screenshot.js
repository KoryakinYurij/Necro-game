/* Скриншоты игрового кадра без браузера (jsdom + node-canvas).
   Запуск: node tools/screenshot.js   (зависимости: см. tests/README.md)
   Результат: shots/shot_play.png, shots/zoom_hero.png, shots/zoom_zom.png */
const fs = require('fs');
const path = require('path');

function req(n) {
  try { return require(n); } catch (e) { }
  try { return require('/tmp/node_modules/' + n); } catch (e) { }
  console.error('Не найдена зависимость "' + n + '". Выполните: npm i --prefix tests ' + n);
  process.exit(2);
}
const { JSDOM, VirtualConsole } = req('jsdom');
const { createCanvas } = req('canvas');

const ROOT = path.join(__dirname, '..');
const SHOTS = path.join(ROOT, 'shots');
if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

const html = fs.readFileSync(path.join(ROOT, 'necro-v2.html'), 'utf8');
const vc = new VirtualConsole();
vc.on('jsdomError', e => console.log('JSDOM ERR:', String(e.message).slice(0, 150)));
const dom = new JSDOM(html, {
  url: 'http://localhost/', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole: vc
});
const { window } = dom;
const doc = window.document;
const cv = doc.getElementById('cv');

function capture(name) {
  const ctx = cv.getContext('2d');
  const w = cv.width, h = cv.height;
  const img = ctx.getImageData(0, 0, w, h);
  const out = createCanvas(w, h);
  const ox = out.getContext('2d');
  ox.putImageData(img, 0, 0);
  // тест-оверлей: DOM-стрелки индикаторов визуализируем в PNG из их стилей
  doc.querySelectorAll('.nx-ind').forEach(d => {
    if (parseFloat(d.style.opacity) < 0.1) return;
    const x = parseFloat(d.dataset.ax), y = parseFloat(d.dataset.ay), a = parseFloat(d.dataset.aa);
    if (isNaN(x)) return;
    ox.save(); ox.translate(x + 6, y + 6); ox.rotate(a);
    ox.globalAlpha = .9; ox.fillStyle = d.style.backgroundColor || '#fff';
    ox.beginPath(); ox.moveTo(10, 0); ox.lineTo(-7, 7); ox.lineTo(-3, 0); ox.lineTo(-7, -7); ox.closePath(); ox.fill();
    ox.restore();
  });
  fs.writeFileSync(path.join(SHOTS, name + '.png'), out.toBuffer('image/png'));
  console.log('saved shots/' + name + '.png', w + 'x' + h);
  return out;
}
function zoom(srcCanvas, sx, sy, sw, sh, name, scale) {
  const c = createCanvas(sw * scale, sh * scale);
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  x.drawImage(srcCanvas, sx, sy, sw, sh, 0, 0, sw * scale, sh * scale);
  fs.writeFileSync(path.join(SHOTS, name + '.png'), c.toBuffer('image/png'));
  console.log('saved shots/' + name + '.png');
}

setTimeout(() => {
  const N = window.__necro;
  console.log('state:', N.state);
  N.startRun();
  const c = doc.querySelector('#cards .card'); if (c) c.click();
  setTimeout(() => {
    const G = N.G;
    const mk = (type, dx, dy, extra) => Object.assign({
      id: Math.random(), type, x: G.P.x + dx, y: G.P.y + dy, hp: 40, maxhp: 40,
      r: 13, ph: Math.random() * 6, hitT: 0, slowT: 0, slowF: 1, squashX: 1, squashY: 1,
      elite: false, boss: false, dead: false, spd: 46, bspd: 46, dmg: 6, hitCd: 9, orbCd: 0,
      kx: 0, ky: 0, tilt: 0, sumT: 5, affix: null, shields: 0
    }, extra || {});
    G.enemies.push(mk('zom', -90, -40), mk('zom', 110, 30), mk('gho', -140, -20), mk('ghoul', -120, 70), mk('bat', 80, -80, { r: 9 }), mk('skel', -60, 100), mk('bone_archer', 140, 90));
    G.lvls.warriors = 1; G.weapons.warriors = { id: 'warriors', lvl: 1, timer: 1 };
    // цели за экраном — для стрелок-индикаторов
    G.enemies.push(mk('elite', 700, 100, { r: 24, elite: true, affix: 'fire' }));
    G.picks.push({ kind: 'heart', x: G.P.x - 700, y: G.P.y, ph: 0 });
    // две гибели прямо в кадре: кость и дух
    setTimeout(() => {
      for (var i = G.enemies.length - 1; i >= 0; i--) {
        if (G.enemies[i].type === 'skel' || G.enemies[i].type === 'gho') G.enemies.splice(i, 1);
      }
    }, 1200);
    G.minions.push(
      { kind: 'warriors', x: G.P.x - 45, y: G.P.y + 10, hp: 40, maxhp: 50, dead: false, ph: 0, face: 1, tilt: 0, slashT: 0, hitT: 0, cd: 1, resp: 0 },
      { kind: 'grave_hound', x: G.P.x + 55, y: G.P.y + 25, hp: 40, maxhp: 50, dead: false, ph: 1, face: -1, tilt: 0, slashT: 0, hitT: 0, cd: 1, resp: 0 },
      { kind: 'ash_zealot', x: G.P.x - 95, y: G.P.y + 55, hp: 40, maxhp: 50, dead: false, ph: 2, face: 1, tilt: 0, slashT: 0, hitT: 0, cd: 1, resp: 0 },
      { kind: 'cinder_bell', x: G.P.x + 100, y: G.P.y + 70, hp: 40, maxhp: 50, dead: false, ph: 3, face: -1, tilt: 0, slashT: 0, hitT: 0, cd: 1, resp: 0 }
    );
    // герой шагает для живой позы
    let dir = 1;
    const walk = setInterval(() => { G.P.x += dir * 3; if (Math.random() < 0.06) dir *= -1; }, 30);
    setTimeout(() => {
      clearInterval(walk);
      const full = capture('shot_play');
      const cx = Math.floor(cv.width / 2), cy = Math.floor(cv.height / 2);
      zoom(full, cx - 50, cy - 50, 100, 100, 'zoom_hero', 4);
      zoom(full, cx + 18, cy - 44, 100, 75, 'zoom_zom', 4);
      process.exit(0);
    }, 1500);
  }, 400);
}, 700);

setTimeout(() => process.exit(0), 8000);
