const fs = require('fs');
function req(n){try{return require(n)}catch(e){}try{return require('/tmp/node_modules/'+n)}catch(e){}process.exit(2);}
const { JSDOM, VirtualConsole } = req('jsdom');
const path = require('path');
const html = fs.readFileSync(path.join(__dirname, '..', 'necro-v2.html'), 'utf8');
const errors=[];
const vc = new VirtualConsole();
vc.on('jsdomError', e => errors.push(String(e.message).slice(0,200)));
const noop = () => {};
function makeCtx(){ return new Proxy({}, {
  get(t,k){ if(k in t)return t[k]; if(k==='createRadialGradient'||k==='createLinearGradient'||k==='createPattern')return()=>({addColorStop:noop}); if(k==='measureText')return()=>({width:10}); if(k==='getImageData')return()=>({data:new Uint8ClampedArray(4)}); return noop; },
  set(t,k,v){ t[k]=v; return true; }
}); }
const dom = new JSDOM(html,{url:'http://localhost/',runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,beforeParse(window){
  window.HTMLCanvasElement.prototype.getContext=function(){ if(!this.__ctx)this.__ctx=makeCtx(); return this.__ctx; };
  window.matchMedia=window.matchMedia||(()=>({matches:false,addListener:noop,removeListener:noop,addEventListener:noop,removeEventListener:noop}));
}});
const { window } = dom; const doc = window.document;
const fails=[]; const check=(n,c)=>{console.log((c?'PASS':'FAIL')+' · '+n); if(!c)fails.push(n);};
setTimeout(()=>{
  const N = window.__necro;
  N.startRun();
  const c = doc.querySelector('#cards .card'); if (c) c.click();
  setTimeout(()=>{
    const G = N.G;
    // настройки
    const gear = [...doc.querySelectorAll('.icobtn')].find(b=>b.textContent==='⚙');
    check('кнопка настроек есть', !!gear);
    gear.click();
    check('оверлей настроек открыт', !!doc.getElementById('nxSetOv') && !doc.getElementById('nxSetOv').classList.contains('hidden'));
    const vol = doc.getElementById('nxVol');
    vol.value = 40; vol.oninput();
    check('громкость применилась', Math.abs(window.__nxVol - 0.4) < 1e-9);
    const nums = doc.getElementById('nxNums');
    nums.checked = false; nums.onchange();
    check('цифры выключились', window.__nxNums === 0);
    nums.checked = true; nums.onchange();
    doc.getElementById('nxSetClose').click();
    check('оверлей закрылся', doc.getElementById('nxSetOv').classList.contains('hidden'));
    // босс → кинематограф
    G.enemies.push({ id: 777, type:'boss', kind:'litch', boss:true, elite:true, kc:'#b657ff', bname:'ЛИХ',
      x:G.P.x+150, y:G.P.y, hp:500, maxhp:1000, r:28, ph:0, hitT:0, slowT:0, slowF:1, squashX:1, squashY:1,
      spd:0, bspd:0, dmg:10, hitCd:9, orbCd:0, kx:0, ky:0, tilt:0, sumT:99, affix:null, shields:0, dead:false,
      p6:{phase:2, atk:99, sub:0} });
    setTimeout(()=>{
      check('неймплейт босса показан', !!doc.querySelector('.nx-bossplate') && doc.querySelector('.nx-bossplate').textContent.includes('ЛИХ'));
      check('letterbox включён', doc.querySelectorAll('.nx-lb.on').length === 2);
      check('slow-mo действительно включён', window.__nxTS === 0.3);
      setTimeout(()=>{
        check('slow-mo восстановлен', window.__nxTS === 1);
        console.log('ошибки:', errors.length ? errors : 'НЕТ');
        console.log('ИТОГ:', fails.length===0 && errors.length===0 ? 'CINE OK' : 'ФЕЙЛЫ: '+fails.join(','));
        process.exit(fails.length||errors.length?1:0);
      }, 520);
    }, 100);
  }, 400);
}, 700);
