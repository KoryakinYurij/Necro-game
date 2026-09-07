const fs=require('fs'),path=require('path');
const {JSDOM}=require(require.resolve('jsdom',{paths:[path.join(__dirname,'..','tests')]}));
const html=fs.readFileSync(path.join(__dirname,'..','necro-v2.html'),'utf8');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,url:'http://localhost/'});
setTimeout(()=>{
  const N=dom.window.__necro;
  N.startRun();
  const c=dom.window.document.querySelector('#cards .card'); if(c)c.click();
  const t0=N.G.time;
  setTimeout(()=>{
    console.log('без step: time за 2с реального времени =', (N.G.time-t0).toFixed(2), '(state:', N.state+')');
    let t1=N.G.time;
    N.step(1);
    console.log('один N.step(1): time +=', (N.G.time-t1).toFixed(2));
    process.exit(0);
  },2000);
},900);
