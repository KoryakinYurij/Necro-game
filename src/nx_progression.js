/* ============ NECRO v2 · PROGRESSION LAYER ============
   Горизонтальная мета и внутризабеговые цели без правки ядра:
   - ИСПЫТАНИЯ биома: цепочка из 3 целей с наградами-выборами (решения, а не контент);
   - ПЕЧАТИ: трофеи за убийство боссов (мета-валюта охоты);
   - ДОКТРИНЫ: пре-ран стойки с трейдоффами (бесплатный пакт на старте);
   - ДОСТИЖЕНИЯ → БЛАГОСЛОВЕНИЯ: разлоки стартовых бонусов (HoloCure-паттерн).
   Всё через window.__necro; персист через N.save(). */
(function () {
    'use strict';
    var N = window.__necro;
    if (!N) return;
    function isExploration() { return !!(N.exploration && N.exploration.mode === 'exploration'); }

    var meta = N.meta;
    meta.legion = meta.legion || {};
    var L = meta.legion;
    L.seals = L.seals || {};
    L.ach = L.ach || {};
    L.boon = L.boon || null;
    L.doctrine = L.doctrine || 'horde';
    L.focus = L.focus || null;

    function save() { try { N.save && N.save(); } catch (e) {} }
    function toast(txt, col) {
        var t = document.createElement('div');
        t.className = 'nx-toast';
        t.style.color = col || '#ffd23f';
        t.textContent = txt;
        document.body.appendChild(t);
        setTimeout(function () { t.classList.add('out'); }, 1600);
        setTimeout(function () { t.remove(); }, 2400);
    }

    /* ---------- справочники ---------- */
    var DOCTRINES = {
        horde: { n: 'ОРДА', pact: 'swarm', armyHp: .15, d: 'Стартовый пакт Полчищ (+60% душ/опыта, +35% врагов) и +15% к здоровью армии.' },
        hunt: { n: 'ОХОТА', pact: 'hubris', armyDmg: .15, d: 'Стартовый пакт Гордыни (реликвия с каждого босса, боссы чаще) и +15% к урону армии.' },
        rite: { n: 'РИТУАЛ', pact: 'famine', armyHp: .08, armyDmg: .08, d: 'Стартовый пакт Голода (+3 брони, +35% урона армии, лечение слабее) и +8% к здоровью и урону армии.' }
    };
    var FOCUS = {
        bone: { n: 'КОСТЬ', d: 'армия: +12% здоровья миньонов на старте' },
        blood: { n: 'КРОВЬ', d: 'армия: +12% урона миньонов на старте' },
        corpse: { n: 'ТЛЕН', d: '+1 переброс карт на старте' },
        spirit: { n: 'ДУХ', d: 'забег с 30% заряда ульты' },
        ash: { n: 'ПЕПЕЛ', d: 'открывает семью ПЕПЕЛ навсегда; армия: +6% урона на старте' }
    };
    var BOONS = {
        reroll: { n: 'Запасный обет', d: '+1 переброс карт на старте', ach: 'winner' },
        relic: { n: 'Дар склепа', d: 'случайная реликвия на старте', ach: 'slayer' },
        ult: { n: 'Тлеющий гнев', d: 'забег с 50% заряда ульты', ach: 'veteran' },
        dash: { n: 'Лёгкая поступь', d: '-20% к перезарядке рывка', ach: 'trialist' },
        royal: { n: 'Венец регентa', d: 'реликвия «Корона Склепа» на старте', ach: 'regicide' }
    };
    var ACH_DEFS = {
        winner: { n: 'Жнец Смерти', d: 'победи в финале' },
        slayer: { n: 'Тысяча костей', d: '1500 жертв за один забег' },
        veteran: { n: 'За гранью', d: 'достигни 40 уровня' },
        trialist: { n: 'Странник испытаний', d: 'пройди 3 испытания за один забег' },
        regicide: { n: 'Цареубийца', d: 'собери печати всех четырёх владык' }
    };
    var BOSS_NAMES = { litch: 'ЛИХ', marsh_king: 'ВЛАДЫКА', bone_colossus: 'КОЛОСС', blood_duchess: 'ГЕРЦОГИНЯ' };

    /* ---------- достижения ---------- */
    function unlockAch(id) {
        if (L.ach[id]) return;
        L.ach[id] = 1;
        save();
        toast('✦ ДОСТИЖЕНИЕ: ' + ACH_DEFS[id].n + ' — открыто благословение', '#ffd23f');
        renderMetaX();
    }

    /* ---------- UI: панель в мета-оверлее ---------- */
    function buildPanel() {
        var panel = document.querySelector('#metaOv .legion-panel');
        if (!panel || document.getElementById('nxpPanel')) return;
        var d = document.createElement('div');
        d.id = 'nxpPanel';
        d.style.cssText = 'margin-top:14px;text-align:left;font-size:12px;line-height:1.5;color:#b7a9ce';
        panel.appendChild(d);
        renderMetaX();
    }
    function renderMetaX() {
        var d = document.getElementById('nxpPanel');
        if (!d) return;
        var h = '<div style="color:#8ef7c9;font-weight:700;letter-spacing:1px;margin-bottom:6px">ПУТИ НЕКРОМАНТА</div>';
        h += '<div style="color:#e6dfd1;font-weight:600">Доктрина (стойка на забег):</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px">';
        for (var k in DOCTRINES) {
            var on = L.doctrine === k;
            h += '<button data-doc="' + k + '" style="cursor:pointer;border:1px solid ' + (on ? '#8dff57' : '#3d2f59') + ';color:' + (on ? '#8dff57' : '#beb2d6') + ';background:#0f0a1a;border-radius:4px;padding:4px 10px;font:600 11px Rubik,sans-serif" title="' + DOCTRINES[k].d + '">' + DOCTRINES[k].n + '</button>';
        }
        h += '</div>';
        h += '<div style="color:#e6dfd1;font-weight:600">Фокус легиона (лоадаут):</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px">';
        h += '<button data-focus="" style="cursor:pointer;border:1px solid ' + (!L.focus ? '#8dff57' : '#3d2f59') + ';color:' + (!L.focus ? '#8dff57' : '#beb2d6') + ';background:#0f0a1a;border-radius:4px;padding:4px 10px;font:600 11px Rubik,sans-serif">НЕТ</button>';
        for (var fk in FOCUS) {
            var onf = L.focus === fk;
            h += '<button data-focus="' + fk + '" style="cursor:pointer;border:1px solid ' + (onf ? '#8dff57' : '#3d2f59') + ';color:' + (onf ? '#8dff57' : '#beb2d6') + ';background:#0f0a1a;border-radius:4px;padding:4px 10px;font:600 11px Rubik,sans-serif" title="' + FOCUS[fk].d + '">' + FOCUS[fk].n + '</button>';
        }
        h += '</div>';
        h += '<div style="color:#e6dfd1;font-weight:600">Печати владык:</div><div style="margin:4px 0 10px">';
        var anySeal = false;
        for (var b in BOSS_NAMES) {
            anySeal = true;
            var c = L.seals[b] || 0;
            h += '<span style="display:inline-block;margin:0 8px 4px 0;color:' + (c ? '#ffd23f' : '#5c5070') + '">' + (c ? '◆' : '◇') + ' ' + BOSS_NAMES[b] + ' ×' + c + '</span>';
        }
        if (!anySeal) h += '<span style="color:#5c5070">—</span>';
        h += '</div>';
        h += '<div style="color:#e6dfd1;font-weight:600">Благословение (одно на забег):</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin:4px 0 10px">';
        var anyBoon = false;
        for (var bk in BOONS) {
            if (!L.ach[BOONS[bk].ach]) continue;
            anyBoon = true;
            var onb = L.boon === bk;
            h += '<button data-boon="' + bk + '" style="cursor:pointer;border:1px solid ' + (onb ? '#b657ff' : '#3d2f59') + ';color:' + (onb ? '#b657ff' : '#beb2d6') + ';background:#0f0a1a;border-radius:4px;padding:4px 10px;font:600 11px Rubik,sans-serif" title="' + BOONS[bk].d + '">' + BOONS[bk].n + '</button>';
        }
        if (!anyBoon) h += '<span style="color:#5c5070">открывается достижениями ↓</span>';
        h += '</div>';
        h += '<div style="color:#e6dfd1;font-weight:600">Достижения:</div><div style="margin-top:2px">';
        for (var ak in ACH_DEFS) {
            var got = !!L.ach[ak];
            h += '<div style="color:' + (got ? '#8dff57' : '#5c5070') + '">' + (got ? '★' : '☆') + ' <b>' + ACH_DEFS[ak].n + '</b> — ' + ACH_DEFS[ak].d + '</div>';
        }
        h += '</div>';
        d.innerHTML = h;
        d.querySelectorAll('[data-doc]').forEach(function (btn) {
            btn.onclick = function () { L.doctrine = btn.getAttribute('data-doc'); save(); renderMetaX(); toast('ДОКТРИНА: ' + DOCTRINES[L.doctrine].n, '#8ef7c9'); };
        });
        d.querySelectorAll('[data-focus]').forEach(function (btn) {
            btn.onclick = function () { L.focus = btn.getAttribute('data-focus') || null; save(); renderMetaX(); };
        });
        d.querySelectorAll('[data-boon]').forEach(function (btn) {
            btn.onclick = function () {
                var k = btn.getAttribute('data-boon');
                L.boon = (L.boon === k) ? null : k;
                save(); renderMetaX();
            };
        });
    }
    var openMetaBtn = document.getElementById('openMetaBtn');
    if (openMetaBtn) openMetaBtn.addEventListener('click', buildPanel);

    /* ---------- HUD испытаний ---------- */
    var hud = document.createElement('div');
    hud.id = 'trialHud';
    hud.style.cssText = 'position:fixed;top:110px;left:50%;transform:translate(-50%);z-index:6;pointer-events:none;' +
        'background:#120d1dd1;border:1px solid #426d67;border-radius:5px;padding:4px 10px;color:#8ef7c9;' +
        'font:700 10px Rubik,sans-serif;display:none;white-space:nowrap';
    document.body.appendChild(hud);

    /* ---------- оверлей награды ---------- */
    var ov = document.createElement('div');
    ov.id = 'trialOv';
    ov.style.cssText = 'position:fixed;top:0;bottom:0;left:0;right:0;z-index:11;display:none;justify-content:center;align-items:center;background:#040208b3;backdrop-filter:blur(3px)';
    ov.innerHTML = '<div style="text-align:center;background:linear-gradient(#181126,#0e0917);border:2px solid #433261;border-radius:8px;padding:22px 26px;max-width:92vw;box-shadow:0 0 0 4px #06040a,0 10px 40px #000">' +
        '<div id="trTitle" style="color:#ffd23f;font:800 16px Cinzel,serif;letter-spacing:1px">ИСПЫТАНИЕ ПРОЙДЕНО</div>' +
        '<div id="trSub" style="color:#b7a9ce;margin:6px 0 14px;font-size:12px">выбери награду</div>' +
        '<div style="display:flex;gap:12px;justify-content:center;flex-wrap:wrap">' +
        '<button id="trA" style="cursor:pointer;min-width:180px;background:#0f0a1a;border:2px solid #ffd23f;color:#ffd23f;border-radius:6px;padding:10px 14px;font:700 11px Rubik,sans-serif"></button>' +
        '<button id="trB" style="cursor:pointer;min-width:180px;background:#0f0a1a;border:2px solid #8dff57;color:#8dff57;border-radius:6px;padding:10px 14px;font:700 11px Rubik,sans-serif"></button>' +
        '</div></div>';
    document.body.appendChild(ov);

    function pickRelicName() {
        var owned = (N.G && N.G.relics) || [];
        var pool = N.relicDefs.filter(function (r) { return owned.indexOf(r.id) === -1; });
        return pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
    }
    function showReward(title) {
        var G = N.G; if (!G) return;
        var rel = pickRelicName();
        document.getElementById('trTitle').textContent = title || 'ИСПЫТАНИЕ ПРОЙДЕНО';
        var a = document.getElementById('trA');
        var b = document.getElementById('trB');
        a.textContent = rel ? 'РЕЛИКВИЯ: ' + rel.n.toUpperCase() : '+50 ◆ ДУШ';
        b.textContent = '+1 ПЕРЕБРОС И +40% ОЗ';
        ov.style.display = 'flex';
        a.onclick = function () {
            ov.style.display = 'none';
            if (rel) { G.relics.push(rel.id); N.recalc(); toast('РЕЛИКВИЯ: ' + rel.n, '#ffd23f'); }
            else { meta.souls += 50; save(); toast('+50 ◆', '#b657ff'); }
        };
        b.onclick = function () {
            ov.style.display = 'none';
            G.rerollsLeft += 1;
            G.P.hp = Math.min(G.P.maxHp, G.P.hp + G.P.maxHp * .4);
            toast('+1 ПЕРЕБРОС, +40% ОЗ', '#8dff57');
        };
    }

    /* ---------- ран-трекеры ---------- */
    var run = null; // сбрасывается при смене объекта G
    function freshRun(G) {
        return {
            G: G,
            docApplied: false,
            seen: {},            // id -> {boss,kind,elite,hp}
            killsBase: 0,
            elitesKilled: 0,
            trialIdx: 0,
            trialsDone: 0,
            biomeIdx: G.biomeIdx,
            evSeen: false,
            evDone: false,
            chords: { bone: 0, blood: 0, corpse: 0, spirit: 0, ash: 0 },
            ultSeen: false,
            lastT: null
        };
    }
    function applyStartBonuses(G) {
        run.docApplied = true;
        var doc = DOCTRINES[L.doctrine];
        if (doc && G.pacts.indexOf(doc.pact) === -1) {
            G.pacts.push(doc.pact);
            toast('ДОКТРИНА «' + doc.n + '»', '#8ef7c9');
        }
        /* легион-ось: доктрина и фокус дают армии стартовые модификаторы */
        G.army = G.army || { dmg: 0, hp: 0 };
        if (doc) { G.army.hp += doc.armyHp || 0; G.army.dmg += doc.armyDmg || 0; }
        if (L.focus === 'bone') G.army.hp += .12;
        if (L.focus === 'blood') G.army.dmg += .12;
        if (L.focus === 'corpse') G.rerollsLeft += 1;
        if (L.focus === 'spirit') G.ult = Math.max(G.ult || 0, 30);
        if (L.focus === 'ash') {
            G.army.dmg += .06;
            if (!L.unlockedSummons.ash_zealot) {
                L.unlockedSummons.ash_zealot = 1; L.unlockedSummons.cinder_bell = 1;
                save(); toast('СЕМЬЯ ПЕПЕЛ ОТКРЫТА', '#ff9f43');
            }
        }
        N.recalc();
        if (L.boon === 'reroll') G.rerollsLeft += 1;
        if (L.boon === 'ult') G.ult = Math.max(G.ult || 0, 50);
        if (L.boon === 'dash') G.P.maxDashCd *= .8;
        if (L.boon === 'relic') {
            var rel = pickRelicName();
            if (rel) { G.relics.push(rel.id); N.recalc(); }
        }
        if (L.boon === 'royal' && G.relics.indexOf('grave_crown') === -1) {
            G.relics.push('grave_crown'); N.recalc();
        }
    }

    /* ---------- детекторы ---------- */
    function scanEnemies(G) {
        var now = {};
        for (var i = 0; i < G.enemies.length; i++) {
            var e = G.enemies[i];
            if (!e.elite && !e.boss) continue;
            now[e.id] = { boss: !!e.boss, elite: e.type === 'elite', kind: e.kind || null, hp: e.hp };
        }
        if (run.seen) {
            for (var id in run.seen) {
                if (now[id]) continue; // жив
                var was = run.seen[id];
                if (was.boss) onBossKilled(G, was.kind);
                else if (was.elite) run.elitesKilled++;
            }
        }
        run.seen = now;
    }
    function onBossKilled(G, kind) {
        if (!kind) return;
        L.seals[kind] = (L.seals[kind] || 0) + 1;
        save();
        toast('◆ ПЕЧАТЬ: ' + (BOSS_NAMES[kind] || kind) + ' (' + L.seals[kind] + ')', '#ffd23f');
        var all = Object.keys(BOSS_NAMES).every(function (k) { return (L.seals[k] || 0) > 0; });
        if (all) unlockAch('regicide');
        renderMetaX();
    }

    var TRIALS = [
        { n: 'ЖАТВА', goal: 120, txt: function (G) { return 'принеси в жертву 120 врагов (' + Math.min(120, G.kills - run.killsBase) + '/120)'; } },
        { n: 'ЧЕМПИОНЫ', goal: 2, txt: function () { return 'срази 2 чемпионов (' + Math.min(2, run.elitesKilled) + '/2)'; } },
        { n: 'ВЫСТОЯТЬ', goal: 1, txt: function () { return run.evSeen ? 'переживи событие!' : 'жди событие и переживи его'; } }
    ];

    function updateTrials(G) {
        if (G.biomeIdx !== run.biomeIdx) { // новый биом — новая цепочка
            run.biomeIdx = G.biomeIdx;
            run.trialIdx = 0; run.evSeen = false; run.evDone = false;
            run.killsBase = G.kills; run.elitesKilled = 0;
        }
        if (run.trialIdx >= 3) { hud.style.display = 'none'; return; }
        var tr = TRIALS[run.trialIdx];
        // событие
        if (G.event) run.evSeen = true;
        if (run.evSeen && !G.event && !run.evDone) run.evDone = true;
        var done =
            run.trialIdx === 0 ? (G.kills - run.killsBase) >= 120 :
            run.trialIdx === 1 ? run.elitesKilled >= 2 :
            run.evDone;
        if (done) {
            run.trialIdx++; run.trialsDone++;
            if (run.trialsDone >= 3) unlockAch('trialist');
            showReward('ИСПЫТАНИЕ «' + tr.n + '» ПРОЙДЕНО');
        }
        var cur = TRIALS[Math.min(run.trialIdx, 2)];
        hud.style.display = 'block';
        hud.textContent = '☰ ' + cur.n + ': ' + cur.txt(G) + (run.trialIdx ? ' · цепочка ' + (run.trialIdx + 1) + '/3' : ' · 1/3');
    }

    function checkAch(G) {
        if (G.kills >= 1500) unlockAch('slayer');
        if (G.level >= 40) unlockAch('veteran');
        if (G.won) unlockAch('winner');
    }

    /* ---------- ЖЕРТВА: сакрифиц миньона за ресурс (ось легиона) ---------- */
    var KIND_FAM = {
        bone_priest: 'bone', bone_knight: 'bone', golem: 'bone', warriors: 'bone', archers: 'bone',
        grave_hound: 'blood',
        grave_witch: 'corpse', brood_mother: 'corpse', ritual: 'corpse',
        ghost_wisp: 'spirit', soul_ferryman: 'spirit', grave_mourner: 'spirit',
        ash_zealot: 'ash', cinder_bell: 'ash'
    };
    var sacCd = 0;
    var sacBtn = document.createElement('div');
    sacBtn.id = 'sacBtn';
    sacBtn.style.cssText = 'position:fixed;bottom:18px;left:50%;transform:translate(-50%);z-index:6;cursor:pointer;' +
        'background:#120d1dd1;border:1px solid #b657ff;border-radius:5px;padding:5px 12px;color:#d9b3ff;' +
        'font:700 10px Rubik,sans-serif;display:none;user-select:none';
    sacBtn.textContent = '♰ ЖЕРТВА [F]';
    document.body.appendChild(sacBtn);
    sacBtn.onclick = function () { sacrifice(); };
    window.addEventListener('keydown', function (e) {
        if (e.code === 'KeyF' && !e.repeat) sacrifice();
    });

    function sacrifice() {
        if (isExploration()) return false;
        var G = N.G;
        if (!G || N.state !== 'play' || sacCd > 0) return false;
        var m = null;
        for (var i = G.minions.length - 1; i >= 0; i--) if (!G.minions[i].dead) { m = G.minions[i]; break; }
        if (!m) { toast('НЕТ КОГО ПРИНЕСТИ В ЖЕРТВУ', '#ff6b7f'); return false; }
        m.dead = true; m.hp = 0; m.resp = 1e9;
        var fam = KIND_FAM[m.kind] || 'army';
        if (fam === 'blood') G.P.hp = Math.min(G.P.maxHp, G.P.hp + G.P.maxHp * .08);
        else if (fam === 'spirit') G.ult = Math.min((N.P6 && N.P6.ultMax) || 100, (G.ult || 0) + 6);
        else if (fam === 'corpse') { G.army.hp += G.finaleSpawned ? .04 : .02; N.recalc(); }
        else { G.army.dmg += G.finaleSpawned ? .04 : .02; N.recalc(); }
        G.rings.push({ x: m.x, y: m.y, r0: 6, r1: 46, t: 0, life: .4, col: '182, 87, 255', wid: 3 });
        sacCd = G.finaleSpawned ? 5 : 10;
        toast('ЖЕРТВА ПРИНЯТА: ' + ({ bone: '+2% урона армии', army: '+2% урона армии', blood: '+8% ОЗ', spirit: '+6 ГНЕВА', corpse: '+2% здоровья армии', ash: '+2% урона армии' })[fam], '#b657ff');
        return true;
    }

    /* ---------- АККОРДЫ СЕМЕЙ: пороговые синергии живых миньонов одной семьи ---------- */
    var CHORDS = {
        bone: [
            { n: 3, d: '+6% урона армии', f: function (G) { G.army.dmg += .06; } },
            { n: 5, d: '+10% здоровья армии', f: function (G) { G.army.hp += .10; } }
        ],
        blood: [
            { n: 2, d: '-10% перезарядки рывка', f: function (G) { G.P.maxDashCd *= .9; } },
            { n: 3, d: '+6% урона армии', f: function (G) { G.army.dmg += .06; } }
        ],
        corpse: [
            { n: 2, d: '+8% здоровья армии', f: function (G) { G.army.hp += .08; } },
            { n: 3, d: '+1 переброс', f: function (G) { G.rerollsLeft += 1; } }
        ],
        spirit: [
            { n: 2, d: '+15 ГНЕВА', f: function (G) { G.ult = Math.min((N.P6 && N.P6.ultMax) || 100, (G.ult || 0) + 15); } },
            { n: 3, d: '+4% урона и здоровья армии', f: function (G) { G.army.dmg += .04; G.army.hp += .04; } }
        ],
        ash: [
            { n: 2, d: '+4% урона армии', f: function (G) { G.army.dmg += .04; } },
            { n: 3, d: 'ещё +4% урона и +4% здоровья армии', f: function (G) { G.army.dmg += .04; G.army.hp += .04; } }
        ]
    };
    /* УЛЬТ-ЭВОЛЮЦИИ: при аккорде tier-2 ульта получает семейный престиж-эффект */
    var ULTEVO = {
        bone: { d: 'КОРОНА КОСТЕЙ: два рыцаря восстают из ульты', f: function (G) {
            for (var i = 0; i < 2; i++) G.minions.push({ kind: 'bone_knight', x: G.P.x + D2(-40, 40), y: G.P.y + D2(-40, 40), hp: 260, maxhp: 260, dmg: 52, spd: 135, cd: .5, dead: false, resp: 5, hitT: 0, slashT: 0, slotAng: Math.random() * 6, ph: Math.random() * 6, face: 1, tilt: 0 });
        } },
        blood: { d: 'КРОВАВЫЙ УРОК: рывок готов, +20% ОЗ', f: function (G) { G.P.dashCd = 0; G.P.hp = Math.min(G.P.maxHp, G.P.hp + G.P.maxHp * .20); } },
        corpse: { d: 'ПИР ТЛЕНА: три круга и +2% HP армии', f: function (G) {
            for (var i = 0; i < 3; i++) G.minions.push({ kind: 'ritual', x: G.P.x + D2(-35, 35), y: G.P.y + D2(-35, 35), hp: 40, maxhp: 40, dmg: 12, lifeT: 6.5, cd: .3, dead: false, resp: 7, slotAng: Math.random() * 6, ph: Math.random() * 6, face: 1, tilt: 0, slashT: 0, hitT: 0 });
            G.army.hp += .02;
        } },
        spirit: { d: 'ХОР ДУШ: +40 ГНЕВА вслед за ультой', f: function (G) { G.ult = Math.min((N.P6 && N.P6.ultMax) || 100, (G.ult || 0) + 40); } },
        ash: { d: 'УГОЛЬНЫЙ ВЕНЕЦ: +5% урона армии навсегда', f: function (G) { G.army.dmg += .05; } }
    };
    var FAM_NAME = { bone: 'КОСТЬ', blood: 'КРОВЬ', corpse: 'ТЛЕН', spirit: 'ДУХ', ash: 'ПЕПЕЛ' };

    function updateChords(G) {
        var fc = { bone: 0, blood: 0, corpse: 0, spirit: 0, ash: 0 };
        for (var i = 0; i < G.minions.length; i++) {
            var m = G.minions[i];
            if (m.dead || m.kind === 'ritual') continue;
            var fm = KIND_FAM[m.kind];
            if (fm && fc[fm] != null) fc[fm]++;
        }
        for (var fam in CHORDS) {
            var tier = run.chords[fam] || 0;
            while (tier < 2 && fc[fam] >= CHORDS[fam][tier].n) {
                CHORDS[fam][tier].f(G);
                N.recalc();
                toast('АККОРД ' + FAM_NAME[fam] + ' ' + (tier + 1) + ': ' + CHORDS[fam][tier].d, '#8ef7c9');
                tier++;
            }
            run.chords[fam] = tier;
        }
        return fc;
    }

    /* ---------- ЭХО СЕМЕЙ: ульта резонирует с живой армией ---------- */
    function echoFamilies(G, fc) {
        if (fc.bone >= 3) { G.army.dmg += .02; N.recalc(); toast('ЭХО КОСТИ: +2% урона армии', '#d9d2bd'); }
        if (fc.blood >= 2) { G.P.hp = Math.min(G.P.maxHp, G.P.hp + G.P.maxHp * .10); toast('ЭХО КРОВИ: +10% ОЗ', '#ff6b7f'); }
        if (fc.corpse >= 2) {
            for (var i = 0; i < 2; i++) {
                G.minions.push({
                    kind: 'ritual', x: G.P.x + D2(-30, 30), y: G.P.y + D2(-30, 30),
                    hp: 40, maxhp: 40, dmg: 12, lifeT: 6.5, cd: .3, dead: false, resp: 7,
                    slotAng: Math.random() * 6, ph: Math.random() * 6, face: 1, tilt: 0, slashT: 0, hitT: 0
                });
            }
            toast('ЭХО ТЛЕНА: круг восстал из пепла', '#8dff57');
        }
        if (fc.spirit >= 2) { G.ult = Math.min((N.P6 && N.P6.ultMax) || 100, (G.ult || 0) + 15); toast('ЭХО ДУХА: +15 ГНЕВА', '#8ef7c9'); }
        if (fc.ash >= 2) { G.ult = Math.min((N.P6 && N.P6.ultMax) || 100, (G.ult || 0) + 6); toast('ЭХО ПЕПЛА: +6 ГНЕВА', '#ff9f43'); }
        for (var f2 in ULTEVO) {
            if ((run.chords[f2] || 0) >= 2 && fc[f2] >= 2) {
                ULTEVO[f2].f(G); N.recalc();
                toast('УЛЬТ-ЭВОЛЮЦИЯ: ' + ULTEVO[f2].d, '#ffd23f');
            }
        }
    }
    function D2(a, b) { return a + Math.random() * (b - a); }

    /* ---------- главный поллинг ---------- */
    function tick() {
        requestAnimationFrame(tick);
        if (isExploration()) { hud.style.display = 'none'; sacBtn.style.display = 'none'; return; }
        var G = N.G;
        var st = N.state;
        if (st === 'menu' || !G) { run = null; hud.style.display = 'none'; sacBtn.style.display = 'none'; return; }
        if (!run || run.G !== G) run = freshRun(G);
        if (st !== 'play') return;
        if (!run.docApplied) applyStartBonuses(G);
        scanEnemies(G);
        if (ov.style.display !== 'flex') updateTrials(G);
        checkAch(G);
        var nowR = performance.now() / 1000;
        var dtR = run.lastT == null ? 0 : Math.min(.25, nowR - run.lastT);
        run.lastT = nowR;
        if (sacCd > 0) sacCd = Math.max(0, sacCd - dtR);
        var alive = 0;
        for (var i2 = 0; i2 < G.minions.length; i2++) if (!G.minions[i2].dead) alive++;
        sacBtn.style.display = alive ? 'block' : 'none';
        sacBtn.style.opacity = sacCd > 0 ? '.45' : '1';
        sacBtn.textContent = sacCd > 0 ? '♰ ЖЕРТВА ' + Math.ceil(sacCd) + 'с' : '♰ ЖЕРТВА [F]';
        var fc = updateChords(G);
        if (G.ultFlash > 0 && !run.ultSeen) { run.ultSeen = true; echoFamilies(G, fc); }
        if ((G.ultFlash || 0) <= 0) run.ultSeen = false;
    }
    requestAnimationFrame(tick);

    window.__nxp = {
        version: 1,
        doctrine: function () { return L.doctrine; },
        seals: function () { return L.seals; },
        ach: function () { return L.ach; },
        boon: function () { return L.boon; },
        setDoctrine: function (k) { if (DOCTRINES[k]) { L.doctrine = k; save(); } },
        setBoon: function (k) { L.boon = (BOONS[k] && L.ach[BOONS[k].ach]) ? k : null; save(); },
        focus: function () { return L.focus; },
        setFocus: function (k) { L.focus = FOCUS[k] ? k : null; save(); },
        sacrifice: sacrifice,
        sacCd: function () { return sacCd; },
        runState: function () { return run && { trial: run.trialIdx, elites: run.elitesKilled, done: run.trialsDone, chords: run.chords }; }
    };
})();
