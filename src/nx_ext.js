/* ============ NECRO v2 · EXTENSION LAYER ============ */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- ДИАГНОСТИКА: ошибки наружу, а не в пустоту ---------- */
  function showErr(msg) {
    try {
      var el = $('nxErr');
      if (!el) {
        el = document.createElement('div');
        el.id = 'nxErr';
        document.body.appendChild(el);
      }
      el.textContent = '⚠ ' + String(msg).slice(0, 160);
      el.style.opacity = '1';
      clearTimeout(el._t);
      el._t = setTimeout(function () { el.style.opacity = '0'; }, 7000);
    } catch (e) { }
  }
  window.addEventListener('error', function (e) { showErr((e && e.message) || 'ошибка скрипта'); });
  window.addEventListener('unhandledrejection', function (e) { showErr((e.reason && e.reason.message) || String(e.reason)); });

  var N = window.__necro;
  if (!N) {
    // основной скрипт не выполнился (обычно: предпросмотр блокирует код)
    var d = document.createElement('div');
    d.id = 'nxBootFail';
    d.innerHTML = '<b>Скрипты игры не запустились.</b><br>Такое бывает в предпросмотре приложения или мессенджера — он блокирует код страницы.' +
      '<br><br>Скачайте файл <b>necro-v2.html</b> и откройте его в обычном браузере: Chrome, Safari, Edge или Firefox.';
    document.body.appendChild(d);
    return;
  }
  var meta = N.meta;
  var isTouch = document.documentElement.classList.contains('touch');

  /* ---------- тосты ---------- */
  function toast(txt, col) {
    var t = document.createElement('div');
    t.className = 'nx-toast';
    t.style.color = col || '#ffd23f';
    t.textContent = txt;
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); }, 1400);
    setTimeout(function () { t.remove(); }, 2100);
  }

  /* ---------- тестовая панель: только через ?admin ---------- */
  (function () {
    var b = $('openAdminBtn');
    if (b && !/[?&#]admin/.test(location.search + location.hash)) b.style.display = 'none';
  })();

  /* ---------- 1. КУЗНЯ ДУШ: раковина для душ ---------- */
  function forge(cost, field, gain, msg) {
    if (meta.souls < cost) { toast('НЕ ХВАТАЕТ ТЁМНЫХ ДУШ', '#ff6b7f'); return; }
    meta.souls -= cost;
    meta.legion[field] += gain;
    if (N.save) N.save();
    if (N.refreshRes) N.refreshRes();
    toast(msg, '#ffd23f');
  }
  function buildForge() {
    var panel = document.querySelector('#metaOv .legion-panel');
    if (!panel || $('soulForge')) return;
    var d = document.createElement('div');
    d.id = 'soulForge';
    d.innerHTML =
      '<div class="forge-title">КУЗНЯ ДУШ · ПЛАВЬ ДАРЫ ЖАТВЫ</div>' +
      '<div class="forge-row">' +
      '<button class="forge-btn" data-f="k1">3000 ◆ → 5 ✦ знаний</button>' +
      '<button class="forge-btn" data-f="k2">14000 ◆ → 25 ✦ знаний</button>' +
      '<button class="forge-btn" data-f="a1">3000 ◆ → 5 ◈ праха</button>' +
            '<button class="forge-btn" data-f="k3">12000 ◆ → 100 ✦</button>' +
            '<button class="forge-btn" data-f="k4">60000 ◆ → 500 ✦</button>' +
      '</div>';
    var footer = panel.querySelector('.legion-footer');
    if (footer) footer.insertAdjacentElement('beforebegin', d);
    else panel.appendChild(d);
    d.querySelector('[data-f=k1]').onclick = function () { forge(3000, 'knowledge', 5, 'ЗНАНИЯ ВЫКОВАНЫ'); };
    d.querySelector('[data-f=k2]').onclick = function () { forge(14000, 'knowledge', 25, 'ЗНАНИЯ ВЫКОВАНЫ'); };
    d.querySelector('[data-f=a1]').onclick = function () { forge(3000, 'ash', 5, 'ПРАХ СОБРАН'); };
    d.querySelector('[data-f=k3]').onclick = function () { forge(12000, 'knowledge', 100, 'ЗНАНИЯ ВЫКОВАНЫ'); };
    d.querySelector('[data-f=k4]').onclick = function () { forge(60000, 'knowledge', 500, 'ЗНАНИЯ ВЫКОВАНЫ'); };
  }
  var openMetaBtn = $('openMetaBtn');
  if (openMetaBtn) openMetaBtn.addEventListener('click', buildForge);

  /* ---------- 2. HUD РИТУАЛОВ (прах, кулдаун, кликабельно) ---------- */
  var SPELLS = [
    { id: 'black_catalyst', key: 'Z', ico: '⚗', name: 'Чёрный катализатор', cost: 8 },
    { id: 'second_burial', key: 'X', ico: '♰', name: 'Второе погребение', cost: 12 },
    { id: 'bone_liturgy', key: 'C', ico: '⛨', name: 'Костяная литургия', cost: 10 },
    { id: 'last_breath', key: 'V', ico: '✧', name: 'Зов последнего дыхания', cost: 12 }
  ];
  var hud = document.createElement('div');
  hud.id = 'spellHud';
  var ashTag = document.createElement('div');
  ashTag.className = 'ashTag';
  ashTag.innerHTML = '◈ <b id="ashVal">0</b>';
  hud.appendChild(ashTag);
  var slots = {};
  SPELLS.forEach(function (s) {
    var el = document.createElement('div');
    el.className = 'spell-slot locked';
    el.title = s.name + ' · ' + s.cost + ' ◈ · общий откат 12 с';
    el.innerHTML =
      '<span class="sp-key">' + (isTouch ? '▪' : s.key) + '</span>' +
      '<span class="sp-ico">' + s.ico + '</span>' +
      '<span class="sp-cost">' + s.cost + '◈</span>' +
      '<div class="sp-cd"></div>';
    el.addEventListener('click', function () {
      if (N.castSpell && N.castSpell(s.id)) toast(s.name.toUpperCase(), '#8ef7c9');
      else if (!meta.legion.unlockedRituals || !meta.legion.unlockedRituals[s.id]) toast('РИТУАЛ ЗАПЕРТ — ОТКРОЙ В ГРИМУАРЕ', '#9d8caf');
      else if (meta.legion.ash < s.cost) toast('МАЛО ПРАХА', '#ff6b7f');
      else toast('ОТКАТ РИТУАЛА', '#9d8caf');
    });
    hud.appendChild(el);
    slots[s.id] = { el: el, cd: el.querySelector('.sp-cd') };
  });
  document.body.appendChild(hud);

  function updHud() {
    requestAnimationFrame(updHud);
    if (N.exploration && N.exploration.mode === 'exploration') { hud.style.display = 'none'; return; }
    var G = N.G, run = G && G.legion;
    hud.style.display = run ? 'flex' : 'none';
    if (!run) return;
    var ashEl = $('ashVal');
    if (ashEl) ashEl.textContent = meta.legion.ash;
    var cd = run.spellT || 0;
    SPELLS.forEach(function (s) {
      var st = slots[s.id];
      var unlocked = !!(meta.legion.unlockedRituals && meta.legion.unlockedRituals[s.id]);
      st.el.classList.toggle('locked', !unlocked);
      st.cd.style.height = (unlocked && cd > 0 ? Math.min(100, cd / 12 * 100) : 0) + '%';
      st.el.style.opacity = unlocked ? (meta.legion.ash < s.cost ? '.55' : '1') : '';
    });
    // эскалация комбо: растёт масштаб и свечение с множителем
    var ctEl = $('comboTag');
    if (ctEl && G && ctEl.classList.contains('on')) {
      var mult = G.comboMult || 1;
      var key = mult.toFixed(2);
      if (ctEl.dataset.sc !== key) {
        ctEl.dataset.sc = key;
        ctEl.style.transform = 'scale(' + (1 + (mult - 1) * .6).toFixed(2) + ')';
        ctEl.style.textShadow = '2px 2px #000, 0 0 ' + Math.round(8 + (mult - 1) * 60) + 'px #ffd23f';
      }
    }
  }
  requestAnimationFrame(updHud);

  /* ---------- 3. ИТОГИ ЗАБЕГА: путь, эволюции, пакты, реликвии ---------- */
  function summaryHTML(G) {
    if (!G) return '';
    var h = '';
    if (G.spec && N.specDefs) {
      var sp = N.specDefs.find(function (x) { return x.id === G.spec; });
      if (sp) h += '<span class="nxchip" style="color:' + sp.sc + ';border-color:' + sp.sc + '">ПУТЬ: ' + sp.name + '</span>';
    }
    Object.keys(G.weapons || {}).forEach(function (k) {
      if (G.weapons[k] && G.weapons[k].evolved && N.evoDefs) {
        var ev = N.evoDefs.find(function (x) { return x.w === k; });
        if (ev) h += '<span class="nxchip" style="color:' + ev.c + ';border-color:' + ev.c + '">★ ' + ev.name + '</span>';
      }
    });
    (G.pacts || []).forEach(function (id) {
      if (!N.pactDefs) return;
      var p = N.pactDefs.find(function (x) { return x.id === id; });
      if (p) h += '<span class="nxchip" style="color:' + p.c + ';border-color:' + p.c + '">ПАКТ: ' + p.n + '</span>';
    });
    (G.relics || []).forEach(function (id) {
      if (!N.relicDefs) return;
      var r = N.relicDefs.find(function (x) { return x.id === id; });
      if (r) h += '<span class="nxchip" style="color:' + r.c + ';border-color:' + r.c + '">' + r.n + '</span>';
    });
    return h;
  }
  function fillSummary(ov, anchorSel) {
    if (!ov || ov.classList.contains('hidden')) return;
    var G = N.G;
    if (!G) return;
    var box = ov.querySelector('.nx-summary');
    if (!box) {
      box = document.createElement('div');
      box.className = 'nx-summary';
      var anchor = ov.querySelector(anchorSel);
      if (anchor) anchor.insertAdjacentElement('afterend', box);
      else { var p = ov.querySelector('.panel'); if (p) p.appendChild(box); }
    }
    var h = summaryHTML(G);
    if (box.innerHTML !== h) box.innerHTML = h;
  }
  ['overOv', 'winOv'].forEach(function (id) {
    var ov = $(id);
    if (!ov) return;
    new MutationObserver(function () {
      fillSummary(ov, id === 'overOv' ? '#oloot' : '#winImprints');
    }).observe(ov, { attributes: true, attributeFilter: ['class'] });
  });

  /* ---------- 3b. КАРТЫ: 3D-tilt при наведении + burst при выборе ---------- */
  var nxTiltLast = null;
  document.addEventListener('mousemove', function (ev) {
    var c = ev.target && ev.target.closest ? ev.target.closest('.card') : null;
    if (nxTiltLast && nxTiltLast !== c) {
      nxTiltLast.style.setProperty('--rx', '0deg');
      nxTiltLast.style.setProperty('--ry', '0deg');
    }
    if (c) {
      var r = c.getBoundingClientRect();
      var ux = (ev.clientX - r.left) / r.width - .5;
      var uy = (ev.clientY - r.top) / r.height - .5;
      c.style.setProperty('--ry', (ux * 9).toFixed(1) + 'deg');
      c.style.setProperty('--rx', (-uy * 7).toFixed(1) + 'deg');
    }
    nxTiltLast = c;
  });
  document.addEventListener('click', function (ev) {
    var c = ev.target && ev.target.closest ? ev.target.closest('.card') : null;
    if (!c) return;
    var r = c.getBoundingClientRect();
    var host = document.createElement('div');
    host.className = 'nx-burst';
    host.style.left = (r.left + r.width / 2) + 'px';
    host.style.top = (r.top + r.height / 2) + 'px';
    var col = c.style.getPropertyValue('--ac') || '#ffd23f';
    for (var i = 0; i < 10; i++) {
      var s = document.createElement('i');
      s.style.setProperty('--a', (i * 36 + Math.random() * 20) + 'deg');
      s.style.setProperty('--d', (46 + Math.random() * 34) + 'px');
      s.style.background = col;
      host.appendChild(s);
    }
    document.body.appendChild(host);
    setTimeout(function () { host.remove(); }, 700);
  });

  /* ---------- 3c. ЕДИНЫЙ SVG-НАБОР ИКОНОК (сетка 24, stroke 1.8) ---------- */
  function ic(b) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">' + b + '</svg>';
  }
  var ICONS = {
    spear: ic('<path d="M4 20L14 10"/><path d="M14 10l6-6-1.5 4.5L14 10z"/><path d="M6.5 17.5L5 19"/>'),
    souls: ic('<circle cx="12" cy="12" r="2.2"/><path d="M12 5a7 7 0 0 1 7 7"/><path d="M12 19a7 7 0 0 1-7-7"/><circle cx="19" cy="12" r="1.3"/><circle cx="5" cy="12" r="1.3"/>'),
    warriors: ic('<circle cx="12" cy="8.5" r="4.5"/><path d="M10.2 8h.01M13.8 8h.01"/><path d="M10 11h4"/><path d="M8 20l1.2-4.5h5.6L16 20"/>'),
    archers: ic('<path d="M7 4a12 12 0 0 1 0 16"/><path d="M7 4v16"/><path d="M7 12h13"/><path d="M20 12l-3-2m3 2l-3 2"/>'),
    corpses: ic('<circle cx="12" cy="12" r="2.6"/><path d="M12 4.5V7M12 17v2.5M4.5 12H7M17 12h2.5M6.8 6.8l1.7 1.7M15.5 15.5l1.7 1.7M17.2 6.8l-1.7 1.7M8.5 15.5l-1.7 1.7"/>'),
    plague: ic('<path d="M12 4c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/><circle cx="10" cy="14" r="1.1"/><circle cx="14" cy="15.5" r=".9"/>'),
    nova: ic('<path d="M12 6c2.4 3.3 4.6 5.6 4.6 8a4.6 4.6 0 0 1-9.2 0C7.4 11.6 9.6 9.3 12 6z"/><path d="M12 2.5V4M4.5 12H3m18 0h-1.5M6.2 5.5L5 4.3M17.8 5.5L19 4.3"/>'),
    circle: ic('<circle cx="12" cy="12" r="8" stroke-dasharray="4 3"/><path d="M12 8.2l1.1 2.7 2.7 1.1-2.7 1.1-1.1 2.7-1.1-2.7-2.7-1.1 2.7-1.1z"/>'),
    bell: ic('<path d="M12 4a5 5 0 0 1 5 5v4l2 3H5l2-3V9a5 5 0 0 1 5-5z"/><path d="M10 19a2 2 0 0 0 4 0"/>'),
    fury: ic('<path d="M13 3L6 13h5l-1 8 7-10h-5l1-8z"/>'),
    power: ic('<path d="M5 4l5 6M10 3l4 7M16 4l3 6"/><path d="M7 20c2-3 8-3 10 0"/>'),
    tempo: ic('<circle cx="12" cy="13" r="7"/><path d="M12 13V9.5M12 13l2.8 2"/><path d="M9 3h6"/>'),
    boots: ic('<path d="M7 4h6v8h4a3 3 0 0 1 3 3v3H7z"/><path d="M7 12h6"/>'),
    magnet: ic('<path d="M6 4v7a6 6 0 0 0 12 0V4"/><path d="M6 4h4v5H6zM14 4h4v5h-4z"/>'),
    flesh: ic('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 8v6M9 11h6"/>'),
    wisdom: ic('<path d="M5 5h9a4 4 0 0 1 4 4v10H9a4 4 0 0 1-4-4z"/><path d="M18 19H9"/><circle cx="12" cy="11" r="2"/>'),
    greed: ic('<circle cx="12" cy="12" r="7"/><path d="M10 10.5h.01M14 10.5h.01"/><path d="M9.5 14h5"/>'),
    blood: ic('<path d="M12 4c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10z"/><path d="M9.5 14a2.5 2.5 0 0 0 2.5 2.5"/>'),
    corpse_call: ic('<path d="M4 20h16"/><path d="M9 20v-6a3 3 0 0 1 6 0v6"/><path d="M9 15H7m10 0h-2"/>'),
    grave_ward: ic('<path d="M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z"/><path d="M12 7v6"/>'),
    omen: ic('<path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6z"/><circle cx="12" cy="12" r="2.5"/>'),
    wrath: ic('<path d="M12 4c1 3 4 4.5 4 8a4 4 0 0 1-8 0c0-2 1-3.5 2-4.5 0 2 2 2.5 2-3.5z"/>'),
    thorns: ic('<path d="M4 18c3 0 3-4 6-4s3 4 6 4"/><path d="M8 14l-1-3m7 3l1-3M12 14v-4"/>'),
    chest: ic('<path d="M4 8a4 4 0 0 1 4-4h8a4 4 0 0 1 4 4v2H4z"/><path d="M4 10h16v8H4z"/><path d="M12 12v3"/>'),
    feast: ic('<path d="M7 4h10v3a5 5 0 0 1-10 0z"/><path d="M12 12v6M8 20h8"/>')
  };
  var FAM_ICONS = {
    warrior: ic('<path d="M12 3v10"/><path d="M9 6h6"/><path d="M8 20a4 4 0 0 1 8 0z"/><path d="M10 13h4"/>'),
    archer: ic('<path d="M6 4a12 12 0 0 1 0 16M6 4v16"/><path d="M6 12h14m0 0l-3-2m3 2l-3 2"/>'),
    wraith: ic('<path d="M12 4a6 6 0 0 1 6 6c0 4-2 6-2 10l-2-2-2 2-2-2-2 2c0-4-2-6-2-10a6 6 0 0 1 6-6z"/><path d="M10 10h.01M14 10h.01"/>'),
    swarm: ic('<circle cx="8" cy="9" r="2.5"/><circle cx="15" cy="7" r="2"/><circle cx="13" cy="14" r="2.5"/><circle cx="7" cy="16" r="1.5"/><circle cx="17" cy="17" r="1.3"/>')
  };
  var SUM_ICONS = {
    bone_priest: ic('<path d="M12 3v18"/><path d="M8 7h8"/><path d="M12 12l4 3"/><circle cx="17" cy="16" r="1.5"/>'),
    grave_hound: ic('<path d="M5 17l3-8 4 3 4-3 3 8"/><path d="M9 17h10"/><path d="M12 12v-2"/>'),
    grave_witch: ic('<path d="M6 14h12l-2 6H8z"/><path d="M9 14c0-4 6-4 6 0"/><path d="M12 6v2"/>'),
    ghost_wisp: ic('<path d="M12 4c3 4 5 6 5 9a5 5 0 0 1-10 0c0-3 2-5 5-9z"/><path d="M10 13h.01M14 13h.01"/>'),
    bone_knight: ic('<path d="M8 4h8v7a4 4 0 0 1-8 0z"/><path d="M8 8h8"/><path d="M6 20l2-5h8l2 5"/>'),
    brood_mother: ic('<ellipse cx="12" cy="13" rx="7" ry="6"/><circle cx="10" cy="12" r="1.2"/><circle cx="14" cy="14" r="1"/><path d="M12 7V5"/>'),
    soul_ferryman: ic('<path d="M12 3v3"/><path d="M9 6h6v6H9z"/><path d="M12 9h.01"/><path d="M7 20c1.5-4 8.5-4 10 0"/>'),
    grave_mourner: ic('<path d="M12 4a5 5 0 0 1 5 5c0 5-2 7-5 11-3-4-5-6-5-11a5 5 0 0 1 5-5z"/><path d="M12 11v3"/>')
  };
  if (N.icons) { for (var ik in ICONS) N.icons[ik] = ICONS[ik]; }
  if (N.families) N.families.forEach(function (f) { if (FAM_ICONS[f.id]) f.icon = FAM_ICONS[f.id]; });
  if (N.summons) N.summons.forEach(function (s) { if (SUM_ICONS[s.id]) s.icon = SUM_ICONS[s.id]; });

  /* ---------- 4b. СМЕРТИ ВРАГОВ: разлёт + улетающая душа ---------- */
  var nxPrev = {}, nxPrevTime = 0, nxDeaths = [];
  function nxFam(type) {
    switch (type) {
      case 'skel': case 'bone_archer': case 'bone_officer': case 'grave_guard': return 'bone';
      case 'gho': case 'wraith': return 'spirit';
      case 'blood_fiend': case 'martyr': return 'blood';
      case 'slime': case 'slime_mini': case 'spitter': return 'slime';
      default: return 'flesh';
    }
  }
  function nxTrack(G) {
    if (!G || !G.enemies) { nxPrev = {}; return; }
    if (G.time < nxPrevTime - 1) { nxPrev = {}; nxDeaths.length = 0; }
    nxPrevTime = G.time;
    var cur = {};
    for (var i = 0; i < G.enemies.length; i++) cur[G.enemies[i].id] = G.enemies[i];
    for (var id in nxPrev) {
      if (!cur[id] && nxDeaths.length < 60) {
        var p = nxPrev[id];
        nxDeaths.push({ x: p.x, y: p.y, r: p.r, type: p.type, boss: p.boss, t0: -1, life: p.boss ? 1.1 : 0.6, seed: Math.random() * 6.28 });
      }
    }
    nxPrev = cur;
  }
  function nxDrawDeaths(G, t, dt) {
    if (!G) return;
    for (var i = nxDeaths.length - 1; i >= 0; i--) {
      var d = nxDeaths[i];
      if (d.t0 < 0) d.t0 = t;
      var u = (t - d.t0) / d.life;
      if (u >= 1) { nxDeaths.splice(i, 1); continue; }
      var p = N.w2s(d.x, d.y);
      if (p[0] < -90 || p[0] > VWg + 90 || p[1] < -90 || p[1] > VHg + 90) continue;
      var fade = 1 - u, ease = u * (2 - u);
      var fam = nxFam(d.type);
      // вспышка-кольцо в момент гибели
      if (u < 0.4) {
        ctx.globalAlpha = (0.4 - u) * 1.6;
        ctx.strokeStyle = fam === 'blood' ? '#ff6b7f' : fam === 'spirit' ? '#a9c4e8' : '#d9d2bd';
        ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p[0], p[1], d.r * (0.5 + u * 2.6), 0, 6.283); ctx.stroke();
        ctx.globalAlpha = 1;
      }
      // осколки по семействам
      var n = d.boss ? 14 : (fam === 'bone' ? 6 : 5);
      for (var k = 0; k < n; k++) {
        var a = d.seed + k * 6.283 / n;
        var dist = (d.boss ? 48 : 26) * ease;
        var sx = p[0] + Math.cos(a) * dist;
        var sy = p[1] + Math.sin(a) * dist * 0.6 + (fam === 'spirit' ? -8 * u : 30 * u * u);
        ctx.globalAlpha = fade * 0.9;
        if (fam === 'bone') {
          ctx.strokeStyle = '#d9d2bd'; ctx.lineWidth = 1.6;
          ctx.save(); ctx.translate(sx, sy); ctx.rotate(a + u * 6);
          ctx.beginPath(); ctx.moveTo(-2.4, 0); ctx.lineTo(2.4, 0); ctx.stroke();
          ctx.restore();
        } else if (fam === 'spirit') {
          ctx.fillStyle = 'rgba(170,190,225,' + (fade * 0.4).toFixed(2) + ')';
          ctx.beginPath(); ctx.arc(sx, sy, 2 + u * 5, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = fam === 'blood' ? '#c23a4a' : fam === 'slime' ? '#63a84e' : '#7da55c';
          ctx.beginPath(); ctx.arc(sx, sy, 2.2 * fade + 0.6, 0, 6.283); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
      // душа взлетает — фирменный штрих жатвы
      var su = ease, wob = Math.sin(t * 6 + d.seed) * 4 * u;
      var gy = p[1] - su * (d.boss ? 74 : 36);
      glowSoft(p[0] + wob, gy, d.boss ? 14 : 8, fade * 0.9);
      ctx.fillStyle = 'rgba(216,255,230,' + (fade).toFixed(2) + ')';
      ctx.beginPath(); ctx.arc(p[0] + wob, gy, d.boss ? 3 : 1.8, 0, 6.283); ctx.fill();
    }
  }
  function glowSoft(x, y, r, a) {
    ctx.globalCompositeOperation = 'lighter';
    var g = ctx.createRadialGradient(x, y, 1, x, y, r);
    g.addColorStop(0, 'rgba(159,232,176,' + (0.8 * a).toFixed(3) + ')');
    g.addColorStop(1, 'rgba(159,232,176,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, 6.283); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }
  var VWg = 800, VHg = 600;

  /* ---------- 4. АТМОСФЕРА: грейдинг, туман, угли, свеча ---------- */
  var cv = $('cv'), ctx = cv ? cv.getContext('2d') : null;
  ctx.globalCompositeOperation = 'saturation';
  var HAS_BLEND = ctx.globalCompositeOperation === 'saturation';
  ctx.globalCompositeOperation = 'source-over';

  function mkFog() {
    var c = document.createElement('canvas'); c.width = c.height = 640;
    var g = c.getContext('2d');
    for (var i = 0; i < 18; i++) {
      var x = Math.random() * 640, y = Math.random() * 640, r = 70 + Math.random() * 160;
      var gr = g.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, 'rgba(126,112,168,0.055)');
      gr.addColorStop(1, 'rgba(126,112,168,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
    }
    return c;
  }
  var fog1 = mkFog(), fog2 = mkFog();
  var embers = [];
  for (var ei = 0; ei < 46; ei++) {
    embers.push({ x: Math.random(), y: Math.random(), s: .7 + Math.random() * 1.9, v: .012 + Math.random() * .03, ph: Math.random() * 6.28, tw: Math.random() * 6.28 });
  }
  var BIOME_GRADE = ['#2b2140', '#1d2b1a', '#251a38', '#33151a'];
  var BIOME_MOTE = ['rgba(168,140,235,', 'rgba(150,225,130,', 'rgba(150,185,235,', 'rgba(255,150,80,'];
  var lastT = 0;
  function atmo(ts) {
    requestAnimationFrame(atmo);
    var t = ts / 1000, dt = Math.min(.05, t - (lastT || t)); lastT = t;
    var w = cv.clientWidth || cv.width, h = cv.clientHeight || cv.height;
    if (!ctx || w < 2 || h < 2) return;
    var G = N.G, bi = (G && G.biomeIdx) || 0;
    VWg = w; VHg = h;
    nxTrack(G);
    ctx.save();
    if (HAS_BLEND) {
      // биома-грейд: приглушаем неон, добавляем тон (с кроссфейдом при смене биома)
      ctx.globalCompositeOperation = 'soft-light';
      ctx.globalAlpha = .16;
      ctx.fillStyle = nxBiGrade(bi, t);
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = 'saturation';
      ctx.globalAlpha = .13;
      ctx.fillStyle = 'hsl(263,12%,52%)';
      ctx.fillRect(0, 0, w, h);
    }
    // туман
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = .9;
    var o1 = (t * 7) % 640, o2 = (t * 12) % 640;
    var y1 = -40 + Math.sin(t * .11) * 16, y2 = h * .25 + Math.cos(t * .09) * 18;
    ctx.drawImage(fog1, -o1, y1, w * 1.35, h * 1.35);
    ctx.drawImage(fog1, w - o1, y1, w * 1.35, h * 1.35);
    ctx.drawImage(fog2, -o2, y2, w * 1.5, h * 1.4);
    ctx.drawImage(fog2, w - o2, y2, w * 1.5, h * 1.4);
    // угли / пепел по биомам
    ctx.globalCompositeOperation = 'lighter';
    var mote = BIOME_MOTE[bi];
    for (var i = 0; i < embers.length; i++) {
      var p = embers[i];
      p.y -= p.v * dt * (bi === 3 ? 1.6 : 1);
      p.x += Math.sin(t * .7 + p.ph) * .00025;
      if (p.y < -.02) { p.y = 1.02; p.x = Math.random(); }
      var a = .16 + .3 * Math.abs(Math.sin(t * 1.3 + p.tw));
      ctx.fillStyle = mote + a.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(p.x * w, p.y * h, p.s, 0, 6.283); ctx.fill();
    }
    // тёплая свеча вокруг героя
    if (G && G.P && !G.P.dead) {
      var fl = .9 + .1 * Math.sin(t * 9) + .05 * Math.sin(t * 23);
      var r = 115 * fl, gx = w / 2, gy = h / 2 + 35;
      var cg = ctx.createRadialGradient(gx, gy, 6, gx, gy, r);
      cg.addColorStop(0, 'rgba(255,196,120,0.09)');
      cg.addColorStop(1, 'rgba(255,196,120,0)');
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 1;
      ctx.fillStyle = cg;
      ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    // свечение поверх игровых эффектов (прячет «квадратность» частиц)
    if (G && N.w2s) {
      ctx.globalCompositeOperation = 'lighter';
      var ii, pp, aa;
      var rings = G.rings || [];
      for (ii = 0; ii < rings.length; ii++) {
        var rg = rings[ii]; pp = rg.t / rg.life;
        var rp = N.w2s(rg.x, rg.y);
        ctx.globalAlpha = (1 - pp) * .16;
        ctx.strokeStyle = 'rgba(' + rg.col + ',1)';
        ctx.lineWidth = rg.wid * 4;
        ctx.beginPath();
        ctx.arc(rp[0], rp[1], rg.r0 + (rg.r1 - rg.r0) * pp, 0, 6.283);
        ctx.stroke();
      }
      var parts = G.parts || [];
      var pn = Math.min(parts.length, 140);
      for (ii = 0; ii < pn; ii++) {
        var pt = parts[ii]; aa = 1 - pt.t / pt.life;
        var qp = N.w2s(pt.x, pt.y);
        ctx.globalAlpha = aa * .22;
        ctx.fillStyle = pt.col;
        ctx.beginPath(); ctx.arc(qp[0], qp[1], pt.size * 2.2, 0, 6.283); ctx.fill();
      }
      var gems = G.gems || [];
      var gn = Math.min(gems.length, 90);
      for (ii = 0; ii < gn; ii++) {
        var gm = gems[ii];
        var gp = N.w2s(gm.x, gm.y);
        ctx.globalAlpha = .10 + .06 * Math.sin(t * 5 + gm.ph);
        ctx.fillStyle = gm.val >= 15 ? '#c77dff' : (gm.val >= 5 ? '#4da3ff' : '#6dff7c');
        ctx.beginPath(); ctx.arc(gp[0], gp[1], 9, 0, 6.283); ctx.fill();
      }
      var picks = G.picks || [];
      var kn = Math.min(picks.length, 24);
      for (ii = 0; ii < kn; ii++) {
        var pk = picks[ii];
        var kp = N.w2s(pk.x, pk.y);
        ctx.globalAlpha = .14 + .08 * Math.sin(t * 3 + (pk.ph || 0));
        ctx.fillStyle = pk.kind === 'heart' ? '#ff6b7f' : '#ffe9b0';
        ctx.beginPath(); ctx.arc(kp[0], kp[1], 13, 0, 6.283); ctx.fill();
      }
      var corpses = G.corpses || [];
      var cn = Math.min(corpses.length, 50);
      for (ii = 0; ii < cn; ii++) {
        var cp = corpses[ii];
        var cpos = N.w2s(cp.x, cp.y);
        ctx.globalAlpha = .05 + .03 * Math.sin(t * 2.4 + ii);
        ctx.fillStyle = '#ff9f43';
        ctx.beginPath(); ctx.arc(cpos[0], cpos[1], 10, 0, 6.283); ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }
    nxDrawDeaths(G, t, dt);
    nxHudFx(G, t, w, h);
    nxCine(G, t);
    ctx.restore();
  }
  requestAnimationFrame(atmo);

  /* ---------- 4c. ТРЕЙЛЫ САМОЦВЕТОВ + СТРЕЛКИ ЗА ЭКРАНОМ ---------- */
  function nxHudFx(G, t, w, h) {
    if (!G || !N.w2s) return;
    var i, p;
    // трейл притянутых самоцветов
    var gems = G.gems || [];
    var gn = Math.min(gems.length, 90);
    var hp = N.w2s(G.P.x, G.P.y);
    ctx.globalCompositeOperation = 'lighter';
    for (i = 0; i < gn; i++) {
      var g = gems[i];
      if (!g.at) continue;
      p = N.w2s(g.x, g.y);
      var dx = hp[0] - p[0], dy = hp[1] - p[1], L = Math.hypot(dx, dy) || 1;
      var len = Math.min(26, L * .3);
      ctx.globalAlpha = .35;
      ctx.strokeStyle = g.val >= 15 ? '#c77dff' : (g.val >= 5 ? '#4da3ff' : '#6dff7c');
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0] - dx / L * len, p[1] - dy / L * len); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    // стрелки к целям за экраном: босс, элита, сердце, редкий лут
    var targets = [];
    var en = G.enemies || [];
    for (i = 0; i < en.length; i++) {
      var e2 = en[i];
      if (e2.dead) continue;
      if (e2.boss) targets.push({ x: e2.x, y: e2.y, c: '#ff4757', s: 7 });
      else if (e2.elite) targets.push({ x: e2.x, y: e2.y, c: '#ff9f43', s: 5 });
    }
    var pk = G.picks || [];
    for (i = 0; i < pk.length; i++) {
      var pc = pk[i];
      if (pc.kind === 'heart') targets.push({ x: pc.x, y: pc.y, c: '#ff6b7f', s: 4.5 });
      else if (pc.kind === 'loot' && pc.r >= 2) targets.push({ x: pc.x, y: pc.y, c: '#ffd23f', s: 4.5 });
    }
    var m = 26, shown = 0;
    if (!indHost) indInit();
    for (i = 0; i < indPool.length; i++) {
      var el = indPool[i];
      if (i < targets.length) {
        var tg = targets[i];
        var sp = N.w2s(tg.x, tg.y);
        if (sp[0] >= -10 && sp[0] <= w + 10 && sp[1] >= -10 && sp[1] <= h + 10) { el.style.opacity = 0; continue; }
        var cx = Math.max(m, Math.min(w - m, sp[0]));
        var cy = Math.max(m, Math.min(h - m, sp[1]));
        var ang = Math.atan2(sp[1] - cy, sp[0] - cx);
        var sc = 1 + Math.sin(t * 5 + i) * .15;
        el.style.opacity = .9;
        el.style.background = tg.c;
        el.style.width = el.style.height = (tg.s * 2.4) + 'px';
        el.style.transform = 'translate(' + (cx - tg.s * 1.2) + 'px,' + (cy - tg.s * 1.2) + 'px) rotate(' + ang.toFixed(3) + 'rad) scale(' + sc.toFixed(2) + ')';
        el.dataset.ax = (cx - tg.s * 1.2).toFixed(1);
        el.dataset.ay = (cy - tg.s * 1.2).toFixed(1);
        el.dataset.aa = ang.toFixed(3);
        shown++;
      } else {
        el.style.opacity = 0;
      }
    }
  }
  var indHost = null, indPool = [];
  function indInit() {
    indHost = document.createElement('div');
    indHost.id = 'nxInd';
    document.body.appendChild(indHost);
    for (var i = 0; i < 8; i++) {
      var d = document.createElement('div');
      d.className = 'nx-ind';
      indHost.appendChild(d);
      indPool.push(d);
    }
  }

  /* ---------- 4e. КИНЕМАТОГРАФ: letterbox, slow-mo, смена биома ---------- */
  var lbTop = null, lbBot = null, lbTimer = null, bossSlowTimer = null;
  function lbInit() {
    lbTop = document.createElement('div'); lbTop.className = 'nx-lb nx-lb-t';
    lbBot = document.createElement('div'); lbBot.className = 'nx-lb nx-lb-b';
    document.body.appendChild(lbTop); document.body.appendChild(lbBot);
  }
  function clearLetterbox() {
    if (lbTimer) { clearTimeout(lbTimer); lbTimer = null; }
    if (lbTop) { lbTop.classList.remove('on'); lbBot.classList.remove('on'); }
  }
  function letterbox(ms) {
    if (!lbTop) lbInit();
    clearLetterbox();
    lbTop.classList.add('on'); lbBot.classList.add('on');
    lbTimer = setTimeout(function () { clearLetterbox(); }, ms || 2200);
  }
  function clearCinematicState() {
    clearLetterbox();
    if (bossSlowTimer) { clearTimeout(bossSlowTimer); bossSlowTimer = null; }
    window.__nxTS = 1;
    document.querySelectorAll('.nx-bossplate').forEach(function (el) { el.remove(); });
  }
  function hex2rgb(hx) {
    return [parseInt(hx.slice(1, 3), 16), parseInt(hx.slice(3, 5), 16), parseInt(hx.slice(5, 7), 16)];
  }
  var nxBiCur = -1, nxBiOld = 0, nxBiT = -99;
  function nxBiGrade(bi, t) {
    if (nxBiCur !== bi) {
      if (nxBiCur >= 0) {
        nxBiOld = nxBiCur; nxBiT = t;
        if (!(N.exploration && N.exploration.mode === 'exploration')) letterbox(1600);
      }
      nxBiCur = bi;
    }
    var u = nxBiT < 0 ? 1 : Math.min(1, (t - nxBiT) / 2);
    if (u >= 1) return BIOME_GRADE[bi];
    var a = hex2rgb(BIOME_GRADE[nxBiOld]), b = hex2rgb(BIOME_GRADE[bi]);
    var m = [0, 1, 2].map(function (k) { return Math.round(a[k] + (b[k] - a[k]) * u); });
    return 'rgb(' + m[0] + ',' + m[1] + ',' + m[2] + ')';
  }
  var nxBossSeen = {};
  function nxCine(G, t) {
    if (!G) return;
    if (N.exploration && N.exploration.mode === 'exploration') {
      clearCinematicState();
      return;
    }
    if (G.time < (nxCine.lastT || 0) - 1) nxBossSeen = {};
    nxCine.lastT = G.time;
    var en = G.enemies || [];
    for (var i = 0; i < en.length; i++) {
      var e = en[i];
      if (!e.boss || nxBossSeen[e.id]) continue;
      nxBossSeen[e.id] = 1;
      bossIntro(e);
    }
  }
  function bossIntro(e) {
    letterbox(2400);
    window.__nxTS = 0.3;
    if (bossSlowTimer) clearTimeout(bossSlowTimer);
    bossSlowTimer = setTimeout(function () { window.__nxTS = 1; bossSlowTimer = null; }, 500);
    var np = document.createElement('div');
    np.className = 'nx-bossplate';
    np.style.borderColor = e.kc || '#ff4757';
    np.style.color = e.kc || '#ff4757';
    np.textContent = e.p6death ? '☠ СМЕРТЬ ☠' : (e.bname || 'БОСС');
    document.body.appendChild(np);
    setTimeout(function () { np.classList.add('out'); }, 2000);
    setTimeout(function () { np.remove(); }, 2800);
  }

  /* ---------- 5b. НАСТРОЙКИ: громкость, тряска, цифры, качество ---------- */
  var nxS = { vol: 1, shk: 1, nums: 1, q: 1 };
  try {
    var nxJ = JSON.parse(localStorage.getItem('nx_settings_v1'));
    if (nxJ) for (var nk in nxS) if (nk in nxJ) nxS[nk] = nxJ[nk];
  } catch (e) { }
  function nxApply() {
    window.__nxVol = nxS.vol;
    window.__nxShk = nxS.shk;
    window.__nxNums = nxS.nums ? 1 : 0;
    var g = $('grainfx');
    if (g) g.style.display = nxS.q ? '' : 'none';
  }
  function nxSave() { try { localStorage.setItem('nx_settings_v1', JSON.stringify(nxS)); } catch (e) { } }
  nxApply();
  function buildSettings() {
    if ($('nxSetOv')) return;
    var ov = document.createElement('div');
    ov.id = 'nxSetOv'; ov.className = 'overlay hidden';
    ov.innerHTML = '<div class="panel" style="max-width:420px">' +
      '<h1 class="title" style="font-size:24px">НАСТРОЙКИ</h1>' +
      '<div class="nx-set-row"><span>Громкость</span><input type="range" id="nxVol" min="0" max="100"></div>' +
      '<div class="nx-set-row"><span>Тряска экрана</span><input type="range" id="nxShk" min="0" max="100"></div>' +
      '<div class="nx-set-row"><span>Цифры урона</span><input type="checkbox" id="nxNums"></div>' +
      '<div class="nx-set-row"><span>Эффекты (туман, зерно)</span><input type="checkbox" id="nxQ"></div>' +
      '<button class="btn" id="nxSetClose">ЗАКРЫТЬ</button></div>';
    document.body.appendChild(ov);
    var sync = function () {
      $('nxVol').value = Math.round(nxS.vol * 100);
      $('nxShk').value = Math.round(nxS.shk * 100);
      $('nxNums').checked = !!nxS.nums;
      $('nxQ').checked = !!nxS.q;
    };
    ov.addEventListener('click', function (ev) { if (ev.target === ov) ov.classList.add('hidden'); });
    $('nxSetClose').onclick = function () { ov.classList.add('hidden'); };
    $('nxVol').oninput = function () { nxS.vol = this.value / 100; nxApply(); nxSave(); };
    $('nxShk').oninput = function () { nxS.shk = this.value / 100; nxApply(); nxSave(); };
    $('nxNums').onchange = function () { nxS.nums = this.checked ? 1 : 0; nxApply(); nxSave(); };
    $('nxQ').onchange = function () { nxS.q = this.checked ? 1 : 0; nxApply(); nxSave(); };
    ov._sync = sync;
  }
  (function () {
    var gb = document.createElement('button');
    gb.className = 'icobtn'; gb.textContent = '⚙';
    gb.setAttribute('aria-label', 'Настройки');
    gb.onclick = function () {
      buildSettings();
      var ov = $('nxSetOv');
      ov.classList.toggle('hidden');
      if (!ov.classList.contains('hidden') && ov._sync) ov._sync();
    };
    var btns = $('btns');
    if (btns) btns.appendChild(gb);
  })();

  /* ---------- 5. патч хинта + контроль дрона ---------- */
  setInterval(function () {
    var hint = $('hint');
    if (hint && !isTouch && hint.textContent.indexOf('РЫВОК') > -1 && hint.textContent.indexOf('РИТУАЛ') === -1) {
      hint.textContent += ' · Z X C V — РИТУАЛЫ';
    }
    if (droneGain && AC) {
      var muted = N.isMuted ? N.isMuted() : false;
      droneGain.gain.setTargetAtTime(muted ? 0 : .045 * nxS.vol, AC.currentTime, .4);
    }
  }, 800);

  /* ---------- 6. ЭМБИЕНТ: дрон + дальний колокол ---------- */
  var AC = null, droneGain = null;
  function bell() {
    if (!AC || (N.isMuted && N.isMuted())) { setTimeout(bell, 9000 + Math.random() * 9000); return; }
    try {
      var t = AC.currentTime, o = AC.createOscillator(), g = AC.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(174, t);
      o.frequency.exponentialRampToValueAtTime(87, t + 2.8);
      g.gain.setValueAtTime(.0001, t);
      g.gain.exponentialRampToValueAtTime(.03, t + .09);
      g.gain.exponentialRampToValueAtTime(.0001, t + 3);
      o.connect(g).connect(AC.destination);
      o.start(t); o.stop(t + 3.1);
    } catch (e) { }
    setTimeout(bell, 9000 + Math.random() * 9000);
  }
  function startDrone() {
    if (AC) return;
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      var master = AC.createGain(); master.gain.value = 0; master.connect(AC.destination);
      droneGain = master;
      var f = AC.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 210; f.Q.value = .6; f.connect(master);
      [[55, 'triangle', .05], [82.4, 'sine', .028], [110, 'sine', .018]].forEach(function (v) {
        var o = AC.createOscillator(); o.type = v[1]; o.frequency.value = v[0];
        var g = AC.createGain(); g.gain.value = v[2];
        o.connect(g).connect(f); o.start();
      });
      var lfo = AC.createOscillator(); lfo.frequency.value = .07;
      var lg = AC.createGain(); lg.gain.value = 70;
      lfo.connect(lg).connect(f.frequency); lfo.start();
      master.gain.setTargetAtTime(.045, AC.currentTime, 4);
      setTimeout(bell, 6000);
    } catch (e) { }
  }
  document.addEventListener('pointerdown', startDrone, { once: true });

  /* ---------- 7. ОТКАЗОУСТОЙЧИВОСТЬ КНОПОК ----------
     Дублёры срабатывают только если основной обработчик не отработал. */
  function guard(id, fn) {
    var el = $(id);
    if (!el) return;
    el.addEventListener('click', function () {
      setTimeout(function () {
        try { fn(); } catch (e) { showErr((e && e.message) || e); }
      }, 40);
    });
  }
  function goMenu() {
    ['overOv', 'winOv', 'pauseOv', 'metaOv', 'p6Ov', 'levelup', 'specOv', 'adminOv'].forEach(function (id) {
      var el = $(id); if (el) el.classList.add('hidden');
    });
    var m = $('menu'); if (m) m.classList.remove('hidden');
    N.state = 'menu';
    if (N.refreshMenu) { try { N.refreshMenu(); } catch (e) { } }
  }
  (function setupExplorationModeSelector() {
    if (!N.exploration || $('explorationModeBtn')) return;
    var legacy = $('modeBtn');
    if (!legacy || !legacy.parentNode) return;
    var b = document.createElement('button');
    b.id = 'explorationModeBtn';
    b.className = 'btn ghost';
    legacy.parentNode.insertBefore(b, legacy);
    function sync() {
      var mode = N.exploration.mode;
      b.innerHTML = 'ОРКЕСТРАЦИЯ: <b>' + (mode === 'exploration' ? 'ИССЛЕДОВАНИЕ' : 'АРЕНА') + '</b>';
      legacy.style.display = mode === 'exploration' ? 'none' : '';
    }
    b.addEventListener('click', function () {
      N.exploration.setMode(N.exploration.mode === 'exploration' ? 'arena' : 'exploration');
      sync();
    });
    sync();
  })();
  guard('startBtn', function () { if (N.state === 'menu') N.startRun(); });
  guard('restartBtn1', function () { if (N.state === 'pause' || N.state === 'menu') N.startRun(); });
  guard('restartBtn2', function () { if (N.state === 'over') N.startRun(); });
  guard('winAgainBtn', function () { if (N.state === 'win') N.startRun(); });
  guard('resumeBtn', function () { if (N.state === 'pause' && N.resume) N.resume(); });
  guard('menuBtn', function () { if (N.state !== 'menu') goMenu(); });
  guard('winMenuBtn', function () { if (N.state !== 'menu') goMenu(); });
  guard('closeMetaBtn', function () {
    var el = $('metaOv');
    if (el && !el.classList.contains('hidden')) el.classList.add('hidden');
  });
  (function () {
    var pb = $('pauseBtn');
    if (pb) pb.addEventListener('click', function () {
      var before = N.state;
      setTimeout(function () {
        if (N.state === before) {
          if (before === 'play' && N.pause) N.pause();
          else if (before === 'pause' && N.resume) N.resume();
        }
      }, 40);
    }, true);
    var mb = $('muteBtn');
    if (mb) mb.addEventListener('click', function () {
      var before = mb.textContent;
      setTimeout(function () {
        if (mb.textContent === before && N.toggleMute) N.toggleMute();
      }, 40);
    }, true);
    var mdb = $('modeBtn');
    if (mdb) mdb.addEventListener('click', function () {
      // Capture the pre-click state before the legacy onclick runs. If that handler
      // changes the mode, the fallback does nothing; if it is missing, recover once.
      var before = N.meta.mode;
      setTimeout(function () {
        if (N.meta.mode === before) {
          var d = N.meta;
          d.mode = d.mode === 'finale' ? 'endless' : 'finale';
          if (N.save) N.save();
          mdb.innerHTML = 'РЕЖИМ: <b>' + (d.mode === 'finale' ? 'ФИНАЛ 15 МИН' : 'БЕСКОНЕЧНЫЙ') + '</b>';
        }
      }, 40);
    }, true);
  })();
})();
