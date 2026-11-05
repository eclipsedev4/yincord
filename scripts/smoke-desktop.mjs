import {spawn, execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
const [executableArg, expectedVersion, outputArg = 'smoke-results'] = process.argv.slice(2);
if (!executableArg || !expectedVersion) throw new Error('Usage: node smoke-desktop.mjs <exe> <version> [results]');
const executable = path.resolve(executableArg), output = path.resolve(outputArg);
fs.mkdirSync(output, {recursive:true});
const port = await new Promise((resolve,reject) => {
 const server=net.createServer();
 server.on('error',reject).listen(0,'127.0.0.1',()=>{const p=server.address().port;server.close(()=>resolve(p));});
});
const env={...process.env}; delete env.NODE_OPTIONS;
const child=spawn(executable,['--fluxer-portable','--disable-gpu',`--remote-debugging-port=${port}`],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
let log=''; child.stdout.on('data',d=>{log+=d});child.stderr.on('data',d=>{log+=d});
let launchError; child.on('error',e=>{launchError=e});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function cdp(url, method, params={}) {
 return await new Promise((resolve,reject)=>{
  const ws=new WebSocket(url), timer=setTimeout(()=>{ws.close();reject(new Error('CDP timeout: '+method));},8000);
  ws.addEventListener('open',()=>ws.send(JSON.stringify({id:1,method,params})));
  ws.addEventListener('error',()=>{clearTimeout(timer);reject(new Error('CDP connection failed'));});
  ws.addEventListener('message',({data})=>{const m=JSON.parse(data);if(m.id!==1)return;clearTimeout(timer);ws.close();if(m.error)reject(new Error(JSON.stringify(m.error)));else resolve(m.result)});
 });
}
let result, lastState, lastPage;
const startedAt = Date.now();
try {
 const deadline=Date.now()+90000;
 while(Date.now()<deadline) {
  if(launchError) throw launchError;
  if(child.exitCode!==null || child.signalCode!==null) throw new Error('App exited before ready: '+child.exitCode);
  try {
   const targets=await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
   const page=targets.find(t=>t.type==='page' && t.url.startsWith('fluxer-app://app/'));
   if(page) {
    lastPage=page;
    const evaluated=await cdp(page.webSocketDebuggerUrl,'Runtime.evaluate',{expression:`(async()=>({url:location.href,title:document.title,text:document.body?.innerText?.trim()||'',actions:[...document.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&!b.disabled).map(b=>b.innerText.trim()).filter(Boolean),version:(await (await fetch('/version.json')).json()).version,bridge:typeof window.electron==='object'}))()`,awaitPromise:true,returnByValue:true});
    const state=evaluated.result?.value;
    lastState=state;
    const reported=log.includes('The renderer reported its build:') && log.includes('Web '+expectedVersion);
    const fatal=/NativeModulePreflight.*Fatal|native module preflight failed|Uncaught exception/i.test(log);
    if(fatal) throw new Error('Startup reported a fatal error');
    if(state?.version===expectedVersion && state.bridge && state.text.length>80 && state.actions.length>0 && /^Yincord/i.test(state.title) && reported && Date.now()-startedAt>10000) {
     const shot=await cdp(page.webSocketDebuggerUrl,'Page.captureScreenshot',{format:'png'});
     fs.writeFileSync(path.join(output,'window.png'),Buffer.from(shot.data,'base64'));
     result={ok:true,version:expectedVersion,page:state,processAlive:child.exitCode===null,executableBytes:fs.statSync(executable).size};
     break;
    }
   }
  } catch(e) { if(/fatal error/.test(e.message))throw e; }
  await sleep(1000);
 }
 if(!result) throw new Error('No populated local app page with matching renderer version and desktop bridge within 90 seconds');
 fs.writeFileSync(path.join(output,'result.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify(result,null,2));
} finally {
 fs.writeFileSync(path.join(output,'startup.log'),log);
 fs.writeFileSync(path.join(output,'observed-page.json'),JSON.stringify(lastState??null,null,2));
 if(!result && lastPage) {
  try { const shot=await cdp(lastPage.webSocketDebuggerUrl,'Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,'window.png'),Buffer.from(shot.data,'base64')); } catch {}
 }
 if(child.pid && child.exitCode===null) {
  if(process.platform==='win32') {try{execFileSync('taskkill',['/PID',String(child.pid),'/T','/F'],{stdio:'ignore'})}catch{}}
  else child.kill();
 }
}
