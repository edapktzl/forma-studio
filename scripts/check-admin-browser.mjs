import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const credentials=JSON.parse(fs.readFileSync('.env.admin.local','utf8'));
const profile=fs.mkdtempSync(path.join(os.tmpdir(),'forma-admin-check-'));
const executable=process.env.BROWSER_PATH||'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser=spawn(executable,['--headless=new','--disable-gpu','--no-first-run','--remote-debugging-port=9342',`--user-data-dir=${profile}`,'about:blank'],{windowsHide:true,stdio:'ignore'});
const timer=setTimeout(()=>{browser.kill();console.error('Admin browser check timed out.');process.exit(1);},180000);
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let ws;
try{
 let tabs;
 for(let i=0;i<40;i++){try{tabs=await(await fetch('http://127.0.0.1:9342/json',{signal:AbortSignal.timeout(1000)})).json();break;}catch{await pause(250);}}
 assert(tabs,'Browser did not start.');
 ws=new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
 await new Promise(resolve=>ws.addEventListener('open',resolve,{once:true}));
 let id=0;const pending=new Map(),errors=[];
 ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails.text);if(m.method==='Page.javascriptDialogOpening')send('Page.handleJavaScriptDialog',{accept:true});});
 const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,m=>m.error?reject(new Error(JSON.stringify(m.error))):resolve(m.result));ws.send(JSON.stringify({id:n,method,params}));});
 const evaluate=async expression=>{const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(r.exceptionDetails)throw new Error(r.exceptionDetails.text);return r.result.value;};
 const until=async(expression,label)=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await pause(150);}throw new Error('Timed out: '+label);};
 const visit=async route=>{await send('Page.navigate',{url:'http://localhost:3001'+route});await until(`document.readyState==='complete' && !!document.querySelector('h1')`,'route '+route);};
 const fill=async(selector,value)=>{await evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw new Error('Missing input');const prototype=e.tagName==='TEXTAREA'?HTMLTextAreaElement.prototype:e.tagName==='SELECT'?HTMLSelectElement.prototype:HTMLInputElement.prototype;Object.getOwnPropertyDescriptor(prototype,'value').set.call(e,${JSON.stringify(value)});e.dispatchEvent(new Event('input',{bubbles:true}));e.dispatchEvent(new Event('change',{bubbles:true}));})()`);};
 const click=async text=>{const found=await evaluate(`(()=>{const e=[...document.querySelectorAll('button')].find(e=>e.textContent.trim().startsWith(${JSON.stringify(text)}));if(e){e.click();return true;}return false;})()`);assert(found,'Button not found: '+text);};
 await send('Page.enable');await send('Runtime.enable');
 await visit('/projects');
 await until(`location.pathname.startsWith('/login')`,'unauthorized redirect');
 await fill('input[name=email]',credentials.email);await fill('input[name=password]',credentials.password);await click('Sign in to workspace');
 await until(`document.querySelector('h1')?.textContent==='Room to create.'`,'dashboard after login');
 for(const width of [1440,390]){
  await send('Emulation.setDeviceMetricsOverride',{width,height:950,deviceScaleFactor:1,mobile:false});
  for(const route of ['/dashboard','/projects','/articles','/testimonials','/messages','/media','/categories']){
   await visit(route);await until(`!!document.querySelector('.sidebar') && !document.querySelector('[role=status]')?.textContent.includes('Loading')`,route+' loaded');
   assert(await evaluate('document.documentElement.scrollWidth<=innerWidth+2'),'Overflow at '+width+' '+route);
   assert(!(await evaluate(`document.body.innerText.includes('Internal Server Error')`)),route);
  }
  await visit('/dashboard');await pause(300);
  const shot=await send('Page.captureScreenshot',{format:'png'});
  fs.mkdirSync('storage/admin-preview',{recursive:true});fs.writeFileSync(`storage/admin-preview/dashboard-${width}.png`,Buffer.from(shot.data,'base64'));
 }
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
 await visit('/testimonials');await click('+ Add testimonial');
 const name='Browser check '+Date.now();
 await until(`!!document.querySelector('input[name=client_name]')`,'new form');
 await fill('input[name=client_name]',name);await fill('textarea[name=quote]','Thoughtful design and a wonderful collaboration.');
 await click('Save testimonial');await until(`document.querySelector('[role=alert]')?.textContent.includes('Turkish')`,'missing translation feedback');
 await fill('textarea[name=quote]','Özenli tasarım ve harika bir iş birliği.');
 await evaluate(`document.querySelectorAll('.editor-aside select')[0].value='published';document.querySelectorAll('.editor-aside select')[0].dispatchEvent(new Event('change',{bubbles:true}));`);
 await click('Save testimonial');await until(`document.querySelector('[role=status]')?.textContent.includes('has been saved')`,'testimonial creation');
 await visit('/testimonials');
 await until(`document.body.innerText.includes(${JSON.stringify(name)})`,'created testimonial list');
 await evaluate(`(()=>{const row=[...document.querySelectorAll('tbody tr')].find(r=>r.innerText.includes(${JSON.stringify(name)}));row.querySelector('button').click();})()`);
 await until(`!!document.querySelector('input[name=client_name]')`,'edit form');
 await fill('input[name=company]','Updated studio partner');await click('Save testimonial');await until(`document.querySelector('[role=status]')?.textContent.includes('has been saved')`,'testimonial update');
 await visit('/testimonials');await until(`document.body.innerText.includes(${JSON.stringify(name)})`,'updated list');
 await evaluate(`(()=>{const row=[...document.querySelectorAll('tbody tr')].find(r=>r.innerText.includes(${JSON.stringify(name)}));row.querySelector('.danger-text').click();})()`);
 await until(`!document.querySelector('tbody')?.innerText.includes(${JSON.stringify(name)})`,'testimonial deletion');
 await click('Sign out');await until(`location.pathname.startsWith('/login')`,'logout');
 assert.deepEqual(errors,[],'Browser exceptions');
 console.log('PASS: authentication, seven admin pages, desktop/mobile layout, bilingual create/edit/delete, logout.');
}finally{clearTimeout(timer);ws?.close();browser.kill();}
