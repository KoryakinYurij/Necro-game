#!/usr/bin/env python3
"""Сборка necro-v2.html: чистая база -> правки ядра -> инъекция слоёв.
Запуск из любого места: python3 tools/build.py"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.path.join(ROOT, 'uploads', 'necro-deluxe.html')
OUT = os.path.join(ROOT, 'necro-v2.html')
SRC = os.path.join(ROOT, 'src')

src = open(BASE, encoding='utf-8').read()

CORE = [
    # баланс: плотность и темп
    ('maxEnemies:300', 'maxEnemies:220'),
    ('Math.floor(24+r*55)', 'Math.floor(24+r*40)'),
    ('Math.min(32,1.2+e*2.6+e**1.45*.6)', 'Math.min(24,1.2+e*2.2+e**1.45*.5)'),
    ('Math.max(55,100-e*4)', 'Math.max(85,125-e*4)'),
    ('a.eliteFreq=50*n.elite', 'a.eliteFreq=65*n.elite'),
    # A6: ранняя сложность — первый босс и чемпион позже
    ('nextBoss:90,', 'nextBoss:120,'),
    ('nextElite:75,', 'nextElite:95,'),
    # баланс: выживаемость
    ('if(n.dead||n.inv>0)return;n.inv=.35;', 'if(n.dead||n.inv>0)return;n.inv=.55;'),
    ('t=Math.max(1,Math.round(t-r)),n.hp-=t,',
     't=Math.max(1,Math.round(t-r)),a.time<20&&(t=Math.max(1,Math.round(t*.6))),a.time-(n.hitGate||-9)<.5&&(t=Math.max(1,Math.round(t*.5))),n.hitGate=a.time,(()=>{let c=0;for(let m of a.minions)m.dead||c++;c>=5?t=Math.max(1,Math.round(t*.8)):c>=3&&(t=Math.max(1,Math.round(t*.9)))})(),n.hp-=t,'),
    # баланс: ульта
    ('(t?45:n?14:1.35)*r', '(t?45:n?14:.9)*r'),
    # перебросы
    ('rerollsLeft:0', 'rerollsLeft:1'),
    ('a.xp-=a.need,a.level++,a.need=be(a.level),a.queue++',
     'a.xp-=a.need,a.level++,a.level%3==0&&a.rerollsLeft++,a.need=be(a.level),a.level>60?((a.lb=(a.lb||0)+1)%3||Cr(`apotheosis`)):a.queue++'),
    # режим по умолчанию: финал
    ('souls:0,mode:`endless`,legion:', 'souls:0,mode:`finale`,legion:'),
    # фикс L1: души начисляются в банк живьём при подборе, победа не должна удваивать
    ('let t=a.soulsGained;a.soulsGained+=t,d.souls+=t,p(),ie();',
     'let t=a.soulsGained;p(),ie();'),
    # фикс L2: единый источник кривых сложности (реальные значения в объявлении,
    # поздний override удалён)
    ('hpTime:e=>1+.36*e+.048*e*e,dmgTime:e=>1+.07*e+.003*e*e',
     'hpTime:e=>1+.32*e+.0235*e*e,dmgTime:e=>1+.07*e+.0026*e*e'),
    ('j.hpTime=e=>1+.32*e+.0235*e*e,j.dmgTime=e=>1+.07*e+.0026*e*e;', ''),
    # читабельность: виньетка мягче (периферия не проваливается в черноту)
    ('radial-gradient(circle,#0000 46%,#05020a8c 75%,#020105eb 100%)',
     'radial-gradient(circle,#0000 55%,#05020a70 78%,#020105c9 100%)'),
    # ПЕРФ: sqrt вместо hypot в горячем хелпере дистанции
    ('A=(e,t,n,r)=>Math.hypot(e-n,t-r)',
     'A=(e,t,n,r)=>Math.sqrt((e-n)*(e-n)+(t-r)*(t-r))'),
    # ПЕРФ: legionStatus.innerHTML только при изменении
    ('c.innerHTML=e.length?`✦ `+e.map(e=>t[e]||e).join(` · `):``,c.classList.toggle(`on`,e.length>0)',
     '(s=>{s!==c._nx&&(c._nx=s,c.innerHTML=s)})(e.length?`✦ `+e.map(e=>t[e]||e).join(` · `):``),c.classList.toggle(`on`,e.length>0)'),
    # ПЕРФ: бары через transform scaleX (без layout-трэша)
    ('style.width=k(a.xp/a.need*100,0,100)+`%`',
     'style.transform=`scaleX(${k(a.xp/a.need*100,0,100)/100})`'),
    ('e(`hpfill`).style.width=n+`%`,e(`hplag`).style.width=r+`%`',
     'e(`hpfill`).style.transform=`scaleX(${n/100})`,e(`hplag`).style.transform=`scaleX(${r/100})`'),
    ('e(`dashBarFill`).style.width=s+`%`',
     'e(`dashBarFill`).style.transform=`scaleX(${s/100})`'),
    # ПЕРФ: CSS баров под scaleX
    ('#xpfill{width:0%;height:100%;box-shadow:0 0 14px var(--c-green-glow);background:linear-gradient(90deg,#38ef7d,#11998e);transition:width .15s cubic-bezier(.1,.8,.3,1)}',
     '#xpfill{width:100%;transform:scaleX(0);transform-origin:left;height:100%;box-shadow:0 0 14px var(--c-green-glow);background:linear-gradient(90deg,#38ef7d,#11998e);transition:transform .15s cubic-bezier(.1,.8,.3,1)}'),
    ('#hpfill{background:linear-gradient(#ff6b6b,#b71540);width:100%;transition:width .1s ease-out;',
     '#hpfill{background:linear-gradient(#ff6b6b,#b71540);width:100%;transform-origin:left;transition:transform .1s ease-out;'),
    ('#hplag{background:#ffeaa7;width:100%;transition:width .4s cubic-bezier(.2,.8,.2,1);',
     '#hplag{background:#ffeaa7;width:100%;transform-origin:left;transition:transform .4s cubic-bezier(.2,.8,.2,1);'),
    ('#dashBarFill{background:#70a1ff;width:100%;height:100%;transition:width 50ms linear}',
     '#dashBarFill{background:#70a1ff;width:100%;height:100%;transform-origin:left;transition:transform 50ms linear}'),
    # БАЛАНС/UX: первый драфт гарантированно содержит оружие (нет «беззубых» стартов)
    ('let o=0;for(;t.length<3&&r.length&&o++<40;){',
     '((a.time||0)<5&&!t.some(q=>q.type===`w`))&&(()=>{let q=n.find(w=>w.type===`w`);q&&(t.push(q),r=r.filter(e=>e[0]!==q))})(),0;let o=0;for(;t.length<3&&r.length&&o++<40;){'),
    # КОНТЕНТ: семья ПЕПЕЛ (2 саммона) в данные призыва
    ('{id:`grave_mourner`,name:`Плакальщица`,icon:`☽`,col:`#b7a9ce`,family:`spirit`,role:`ослабление`,desc:`оплакивает павших и ослабляет врагов`}]',
     '{id:`grave_mourner`,name:`Плакальщица`,icon:`☽`,col:`#b7a9ce`,family:`spirit`,role:`ослабление`,desc:`оплакивает павших и ослабляет врагов`},{id:`ash_zealot`,name:`Пепельный зелот`,icon:`✹`,col:`#ff9f43`,family:`ash`,role:`фронтлайн`,desc:`горит верой и держит строй огнём`},{id:`cinder_bell`,name:`Угольный звонарь`,icon:`♒`,col:`#ffb066`,family:`ash`,role:`поддержка`,desc:`угольный набат поджигает врагов вокруг`}]'),
    ('bone_knight:{hp:260,dmg:52,spd:135,lifeT:0}}[e]',
     'bone_knight:{hp:260,dmg:52,spd:135,lifeT:0},ash_zealot:{hp:150,dmg:24,spd:75,lifeT:0},cinder_bell:{hp:95,dmg:18,spd:60,lifeT:0}}[e]'),
    # ЛЕГИОН-ОСЬ 3: семейные саммоны возрождаются как армия (кроме ритуальных и голема)
    ('n.resp<=0&&(n.kind===`warriors`||n.kind===`archers`)){if(yt()>=j.minionCap+(a.spec===`commander`?10:0)){n.resp=1;continue}let e=M[n.kind][R(n.kind)-1],r=n.kind===`warriors`&&a.weapons.warriors?.evolved;n.dead=!1,n.hp=n.maxhp=Math.round(e.hp*(r?2:1)*(1+a.army.hp)),',
     'n.resp<=0&&n.kind!==`ritual`&&n.kind!==`golem`){if(yt()>=j.minionCap+(a.spec===`commander`?10:0)){n.resp=1;continue}let r=n.kind===`warriors`&&a.weapons.warriors?.evolved;n.dead=!1,n.hp=n.maxhp=M[n.kind]?Math.round(M[n.kind][R(n.kind)-1].hp*(r?2:1)*(1+a.army.hp)):n.maxhp,'),
    ('!e&&a.legion&&O(.38)',
     '!e&&a.legion&&O(d.legion&&d.legion.focus?.55:.38)'),
    ('let n=e[Math.floor(Math.random()*e.length)];',
     'let n=(()=>{let f=d.legion&&d.legion.focus,fs=f===`corpse`?[`corpse`,`swarm`]:f?[f]:null;if(fs){let w=e.filter(q=>fs.includes(q.family));if(w.length&&O(.65))return w[Math.floor(Math.random()*w.length)]}return e[Math.floor(Math.random()*e.length)]})();'),
    ('a.nums.push({x:e,y:t,txt:String(n),col:r,big:i,t:0})',
     '(o=>(o.x=e,o.y=t,o.txt=String(n),o.col=r,o.big=i,o.t=0,a.nums.push(o)))((a._np=a._np||[]).pop()||{})'),
    ('a.nums=a.nums.filter(e=>e.t<.85)',
     'a.nums=a.nums.filter(e=>e.t<.85||((a._np=a._np||[]).push(e),!1))'),
    ('e.length&&t.push({special:`evo`,w:e[0].w,name:e[0].name,icon:e[0].icon,c:e[0].c,d:e[0].desc})',
     'e.length&&(t.push({special:`evo`,w:e[0].w,name:e[0].name,icon:e[0].icon,c:e[0].c,d:e[0].desc}),t.push({special:`evo`,variant:1,w:e[0].w,name:({spear:`КОСТЯНОЙ ГАРПУН`,souls:`ДУШЕВНЫЙ ШТОРМ`,warriors:`КОСТЯНАЯ ФАЛАНГА`,nova:`БАГРОВЫЙ ИМПУЛЬС`}[e[0].w]||e[0].name),icon:e[0].icon,c:`#9ff7ff`,d:({spear:`Одно чудовищное копьё: +30 урона, пронзает всю толпу — но без веера и ускорения`,souls:`Орбита ×1.8 быстрее и урон ×2 — вместо +2 душ и ширины`,warriors:`Фаланга: воины ×3 крепче, но урон ×1.2 вместо вихря`,nova:`Импульс: новы ×1.7 чаще, но радиус меньше`}[e[0].w]||e[0].desc)}))'),
    ('n.evolved=!0', 'n.evolved=!0,n.evoB=!!t.variant'),
    # вариант B: копьё-гарпун (v объявлен в let-цепочке, чтобы не тронуть глобал)
    ('let r=M.spear[n.lvl-1],i=n.evolved,o=r.count+(i?2:0),s=r.dmg+(i?12:0),c=r.pierce+ +!!i,l=r.cd*(i?.7:1)',
     'let r=M.spear[n.lvl-1],i=n.evolved,v=n.evoB,o=r.count+(i?(v?0:2):0),s=r.dmg+(i?(v?30:12):0),c=r.pierce+(i?(v?4:1):0),l=r.cd*(i?(v?1:.7):1)'),
    # вариант B: шторм душ
    ('let n=M.souls[i.lvl-1],r=i.evolved,o=n.n+(r?2:0),s=n.r+(r?26:0),c=n.dmg*(r?1.5:1);a.soulAng+=e*n.spd;',
     'let n=M.souls[i.lvl-1],r=i.evolved,v=i.evoB,o=n.n+(r?(v?1:2):0),s=n.r+(r?(v?0:26):0),c=n.dmg*(r?(v?2:1.5):1);a.soulAng+=e*n.spd*(r&&v?1.8:1);'),
    # вариант B: импульс новы
    ('let n=M.nova[c.lvl-1],r=c.evolved,i=n.r*(r?1.45:1),o=n.dmg*(r?1.7:1),s=r?0:n.cost;',
     'let n=M.nova[c.lvl-1],r=c.evolved,v=c.evoB,i=n.r*(r?(v?1.1:1.45):1),o=n.dmg*(r?(v?1.3:1.7):1),s=r?0:n.cost;'),
    ('c.timer=n.cd,', 'c.timer=n.cd*(r&&v?.6:1),'),
    ('d.mode=d.mode||`endless`', 'd.mode=d.mode||`finale`'),
    # аудио не должно ломать кнопки (безопасный AudioContext)
    ('function fe(){return ce||(ce=new(window.AudioContext||window.webkitAudioContext)),ce.state===`suspended`&&ce.resume(),ce}',
     'function fe(){try{ce||(ce=new(window.AudioContext||window.webkitAudioContext)),ce.state===`suspended`&&ce.resume()}catch(e){}return ce}'),
    # кинематограф: управляемый таймскейл для slow-mo
    ('cr=t,i===',
     'cr=t,window.__nxTS!=null&&(n*=window.__nxTS),i==='),
    # настройки: громкость
    ('l.gain.setValueAtTime(i,s),',
     'l.gain.setValueAtTime(i*(window.__nxVol==null?1:window.__nxVol),s),'),
    ('o.gain.setValueAtTime(t,s),o.gain.exponentialRampToValueAtTime(1e-4,s+e)',
     'o.gain.setValueAtTime(t*(window.__nxVol==null?1:window.__nxVol),s),o.gain.exponentialRampToValueAtTime(1e-4,s+e)'),
    # настройки: масштаб тряски
    ('let e=(Math.random()-.5)*a.shake,t=(Math.random()-.5)*a.shake;',
     'let e=(Math.random()-.5)*a.shake*(window.__nxShk==null?1:window.__nxShk),t=(Math.random()-.5)*a.shake*(window.__nxShk==null?1:window.__nxShk);'),
    # настройки: отключение цифр урона
    # сочные цифры урона: pop-масштаб, центр, золотое свечение крита
    ('for(let e of a.nums){let t=1-e.t/.85,n=Z(e.x),r=Q(e.y);h.globalAlpha=Math.min(1,t*1.6),h.font=(e.big?`700 17px`:`700 13px`)+` Rubik, sans-serif`,h.strokeStyle=`rgba(0,0,0,0.85)`,h.lineWidth=3,h.strokeText(e.txt,n,r),h.fillStyle=e.col,h.fillText(e.txt,n,r),h.globalAlpha=1}',
     'if(window.__nxNums!==0)for(let e of a.nums){let t=1-e.t/.85,n=Z(e.x),r=Q(e.y),p=e.t<.16?1+(1-e.t/.16)*.6:1;h.save(),h.translate(n,r),h.scale(p,p),h.globalAlpha=Math.min(1,t*1.6),h.textAlign=`center`,e.big&&C(S.gold,0,2,16,t*.7),h.font=(e.big?`800 19px`:`700 13px`)+` Rubik, sans-serif`,h.strokeStyle=`rgba(0,0,0,0.85)`,h.lineWidth=3,h.strokeText(e.txt,0,0),h.fillStyle=e.col,h.fillText(e.txt,0,0),h.restore()}'),
    # Exploration #2: один simulation seam внутри живого sr (тот же путь использует test step)
    ('sr=function(t){let n=a.P;',
     'sr=function(t){(window.__nxOrchestrationMode||`arena`)===`exploration`&&typeof window.__nxExplorationSimHook===`function`&&window.__nxExplorationSimHook(t);let n=a.P;'),
    # Exploration #2: legacy стартовая группа остаётся только у Arena control
    ('for(let e=0;e<4;e++){let t=e*Math.PI/2+D(-.25,.25);H(`zom`,a.P.x+Math.cos(t)*240,a.P.y+Math.sin(t)*240)}mt(!0)',
     'if((window.__nxOrchestrationMode||`arena`)===`arena`)for(let e=0;e<4;e++){let t=e*Math.PI/2+D(-.25,.25);H(`zom`,a.P.x+Math.cos(t)*240,a.P.y+Math.sin(t)*240)}mt(!0)'),
    # API расширения + единый orchestration adapter (не переиспользует legacy d.mode/P6)
    ('castUlt:()=>Vr()}',
     'castUlt:()=>Vr(),save:p,castSpell:Bn,refreshRes:Mn,renderMeta:X,pactDefs:We,relicDefs:He,evoDefs:Ne,specDefs:Ve,weaponDefs:je,isMuted:()=>le,toggleMute:ge,resume:()=>wt(),pause:()=>Ct(),refreshMenu:Rn,w2s:(e,t)=>[e-Wn+v,t-Gn+y],cam:()=>({w:g,h:_}),gfx:{enemy:e=>{er=e},hero:e=>{Zn=e},minion:e=>{Qn=e},golem:e=>{$n=e},floor:e=>{Yn=e},shadow:e=>{Kn=e}},icons:Be,families:Te,summons:Oe,exploration:{get mode(){return window.__nxOrchestrationMode||`arena`},setMode:e=>{if(e!==`arena`&&e!==`exploration`)throw new Error(`invalid orchestration mode`);window.__nxOrchestrationMode=e},setSimulationHook:e=>{if(e!=null&&typeof e!==`function`)throw new TypeError(`simulation hook must be a function or null`);window.__nxExplorationSimHook=e}}},window.castLegionSpell=Bn'),
    # подсказка в меню
    ('Движение — <b>WASD</b> · рывок — <b>Пробел / Shift</b> · атака — <b>автоматически</b>',
     'Движение — <b>WASD</b> · рывок — <b>Пробел / Shift</b> · атака — <b>автоматически</b> · ритуалы — <b>Z X C V</b>'),
]

for old, new in CORE:
    c = src.count(old)
    assert c == 1, f'ожидалось 1 вхождение, найдено {c}: {old[:60]}'
    src = src.replace(old, new, 1)
print('core edits:', len(CORE))

# пакетные правки (old, new, ожидаемое число вхождений) — мета-экономика ×50 и кап уровня
CORE_MULTI = [
    ('cost:40,', 'cost:2000,', 3),
    ('cost:65,', 'cost:3250,', 3),
    ('cost:90,', 'cost:4500,', 4),
    ('cost:110,', 'cost:5500,', 4),
    ('cost:140,', 'cost:7000,', 5),
    ('d.legion.knowledge<80?!1:(d.legion.knowledge-=80',
     'd.legion.knowledge<4000?!1:(d.legion.knowledge-=4000', 1),
    # вариант B эволюции воинов: фаланга (×3 HP вместо ×2, ×1.2 урона вместо ×1.8)
    ('(r?2:1)', '(r?(a.weapons.warriors?.evoB?3:2):1)', 2),
    ('(s?1.8:1)', '(s?(a.weapons.warriors?.evoB?1.2:1.8):1)', 1),
]
for old, new, n in CORE_MULTI:
    c = src.count(old)
    assert c == n, f'ожидалось {n} вхождений, найдено {c}: {old[:60]}'
    src = src.replace(old, new)
print('core multi edits:', len(CORE_MULTI))

css = open(os.path.join(SRC, 'nx_style.css'), encoding='utf-8').read()
ext = open(os.path.join(SRC, 'nx_ext.js'), encoding='utf-8').read()
gfx = open(os.path.join(SRC, 'nx_gfx.js'), encoding='utf-8').read()
prog = open(os.path.join(SRC, 'nx_progression.js'), encoding='utf-8').read()
svgz = open(os.path.join(SRC, 'nx_svgzombie.js'), encoding='utf-8').read()
import json as _json
_svg_path = os.path.join(ROOT, 'assets', 'zombie-walk.svg')
_svg = open(_svg_path, encoding='utf-8').read() if os.path.exists(_svg_path) else ''

block = (
    '\n<style id="nxStyle">\n' + css + '\n</style>\n'
    '<div id="grainfx"></div>\n'
    '<script id="nxExt">\n' + ext + '\n</script>\n'
    '<script id="nxProg">\n' + prog + '\n</script>\n'
    '<script id="nxGfx">\n' + gfx + '\n</script>\n'
    '<script id="nxSvgData">window.__ZOMBIE_SVG = ' + _json.dumps(_svg) + ';</script>\n'
    '<script id="nxSvgZombie">\n' + svgz + '\n</script>\n'
)
assert src.count('</body>') == 1
src = src.replace('</body>', block + '</body>', 1)
open(OUT, 'w', encoding='utf-8').write(src)
print('built', os.path.relpath(OUT, ROOT), len(src), 'bytes')
