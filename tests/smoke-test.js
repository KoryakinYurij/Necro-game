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
const errors = [];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push('jsdomError: ' + e.message + (e.detail ? ' | ' + (e.detail.stack || e.detail.message || e.detail) : '')));
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

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
    window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop }));
  }
});

const { window } = dom;
const fails = [];
const check = (name, cond) => { console.log((cond ? 'PASS' : 'FAIL') + ' · ' + name); if (!cond) fails.push(name); };

setTimeout(() => {
  try {
    const N = window.__necro;
    check('__necro API доступен', !!N);
    check('state = menu', N.state === 'menu');
    check('castLegionSpell определён (фикс Z/X/C/V)', typeof window.castLegionSpell === 'function');
    check('save/castSpell/refreshRes в API', typeof N.save === 'function' && typeof N.castSpell === 'function' && typeof N.refreshRes === 'function');
    check('pactDefs/relicDefs/evoDefs/specDefs в API', Array.isArray(N.pactDefs) && Array.isArray(N.relicDefs) && Array.isArray(N.evoDefs) && Array.isArray(N.specDefs));
    check('spellHud создан', !!window.document.getElementById('spellHud'));
    check('grainfx создан', !!window.document.getElementById('grainfx'));
    check('nxStyle внедрён', !!window.document.getElementById('nxStyle'));
    check('админ-кнопка скрыта (нет ?admin)', window.document.getElementById('openAdminBtn').style.display === 'none');
    check('gfx-слой активен (подмена отрисовки)', !!window.__nxGfxActive);
    check('gfx API в __necro', !!(N.gfx && N.w2s && N.cam));

    // старт забега
    N.startRun();
    check('стартует выбор первого дара', N.state === 'levelup');
    const firstCard = window.document.querySelector('#cards .card');
    check('предложено 3 карты', window.document.querySelectorAll('#cards .card').length === 3);
    if (firstCard) firstCard.click();
    setTimeout(() => {
      try {
        const G = N.G;
        check('забег идёт (G существует)', !!G);
        check('время идёт', G.time > 0);
        check('режим по умолчанию — финал', G.mode === 'finale');
        check('1 переброс на старте', G.rerollsLeft >= 1);
        check('castSpell залоченного ритуала -> false', N.castSpell('black_catalyst') === false);
        check('spellHud виден в забеге', window.document.getElementById('spellHud').style.display !== 'none');

        // кузница душ: имитируем открытие Гримуара
        window.document.getElementById('openMetaBtn').click();
        check('кузница душ построена', !!window.document.getElementById('soulForge'));

        // тест обмена душ (цены перекалиброваны ×50)
        const meta = N.meta;
        meta.souls = 5000;
        const kn0 = meta.legion.knowledge;
        window.document.querySelector('[data-f=k1]').click();
        check('обмен 3000◆→5✦ работает (новая экономика)', meta.souls === 2000 && meta.legion.knowledge === kn0 + 5);

        // progression-слой: доктрины, печати, ачивки, испытания
        check('progression-слой активен', !!window.__nxp);
        check('панель «Пути некроманта» построена', !!window.document.getElementById('nxpPanel'));
        check('доктрина по умолчанию — ОРДА', window.__nxp.doctrine() === 'horde');
        window.__nxp.setDoctrine('rite');
        check('смена доктрины сохраняется', window.__nxp.doctrine() === 'rite');
        window.__nxp.setDoctrine('horde');
        check('HUD испытаний существует', !!window.document.getElementById('trialHud'));
        check('ран-трекер живой', !!window.__nxp.runState());

        console.log('\nОшибки за время теста:', errors.length ? '' : 'НЕТ');
        errors.slice(0, 8).forEach(e => console.log('  !', e.slice(0, 300)));
        console.log('\nИТОГ:', fails.length === 0 && errors.length === 0 ? 'SMOKE OK' : 'ЕСТЬ ПРОБЛЕМЫ: ' + fails.length + ' фейлов, ' + errors.length + ' ошибок');
        process.exit(fails.length === 0 && errors.length === 0 ? 0 : 1);
      } catch (e) {
        console.error('SMOKE FAIL (внутри забега):', (e && e.stack) || e);
        process.exit(1);
      }
    }, 4000);
  } catch (e) {
    console.error('SMOKE FAIL:', (e && e.stack) || e);
    process.exit(1);
  }
}, 900);

setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 20000);
