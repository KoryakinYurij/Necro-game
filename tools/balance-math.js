// Аналитика баланса: кривые врагов и игрока по минутам
const j = {
  maxEnemies: 220, minionCap: 34,
  powerScale: { hp: .01, dmg: .003, cap: .7 },
  hpTime: m => 1 + .36*m + .048*m*m,
  dmgTime: m => 1 + .07*m + .003*m*m,
  threatRate: m => Math.min(24, 1.2 + m*2.2 + Math.pow(m,1.45)*.5),
};
const xpNeed = e => e===1?5:Math.floor(4+e*2+Math.pow(e,1.55)*1.3);

console.log('=== КРИВЫЕ ВРАГОВ (базовый зомби: 14 HP, 6 dmg) ===');
console.log('min  hpMul   dmgMul  spawn/s  capEn  threat(=зомби/с)  TTK-зомби@100dps');
for (let m=0;m<=15;m++){
  const hpM=j.hpTime(m), dM=j.dmgTime(m), tr=j.threatRate(m), cap=Math.min(j.maxEnemies,Math.floor(24+m*40));
  const hp = Math.round(14*hpM);
  console.log(
    String(m).padStart(3),
    (hpM.toFixed(2)+'x').padStart(6),
    (dM.toFixed(2)+'x').padStart(7),
    tr.toFixed(1).padStart(8),
    String(cap).padStart(6),
    (tr/1).toFixed(1).padStart(7),
    (hp/100).toFixed(2)+'s'
  );
}
console.log('\nС учётом powerScale (до +70% HP / +35% dmg при сильном билде):');
console.log('  к 15-й мин зомби = ', Math.round(14*j.hpTime(15)*1.7), 'HP, урон', (6*j.dmgTime(15)*1.35).toFixed(1));
console.log('\n=== XP-кривая (уровень -> нужно очков) ===');
let acc=0; const rows=[];
for(let lv=1;lv<=40;lv++){const n=xpNeed(lv); acc+=n; if(lv%5===0||lv<=5) rows.push(`lv${lv}: ${n} (сумма ${acc})`);}
console.log(rows.join('\n'));

console.log('\n=== УРОН ИГРОКА по веткам оружия (5 уровней) ===');
const M={
 spear:[{dmg:16,count:1,cd:.9},{dmg:21,count:1,cd:.85},{dmg:26,count:2,cd:.8},{dmg:32,count:2,cd:.75},{dmg:40,count:3,cd:.7}],
 corpses:[{cd:2.4,n:2,dmg:42},{cd:2.3,n:2,dmg:58},{cd:2.1,n:3,dmg:66},{cd:2,n:3,dmg:82},{cd:1.7,n:4,dmg:104}],
 nova:[{cd:4,dmg:28},{cd:3.9,dmg:38},{cd:3.6,dmg:46},{cd:3.4,dmg:56},{cd:3.1,dmg:72}],
 bell:[{cd:3.2,dmg:16},{cd:2.9,dmg:21},{cd:2.6,dmg:26},{cd:2.3,dmg:32},{cd:2,dmg:40}],
 fury:[{cd:2.9,n:1,dmg:24},{cd:2.7,n:1,dmg:32},{cd:2.5,n:2,dmg:38},{cd:2.2,n:2,dmg:46},{cd:2,n:3,dmg:58}],
};
for(const k in M){
  console.log(k+': '+M[k].map(s=>{
    const dps=((s.dmg*(s.count||s.n||1))/s.cd).toFixed(0);
    return dps;
  }).join(' → ')+' dps');
}
console.log('\n=== БАФФЫ ПАССИВОК (макс 5 стаков) ===');
console.log('power +12%/ур → x1.6 | tempo +8%/ур (кап 2.5х) | boots +6%/ур (кап 330)');
console.log('flesh +12 ОЗ/ур → +60 | omen +8% крит/ур | wisdom +10% xp/ур | greed +20% xp/ур');
