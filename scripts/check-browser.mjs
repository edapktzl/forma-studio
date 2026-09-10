import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';

const base = process.env.SITE_URL || 'http://localhost:3001';
const executable = process.env.BROWSER_PATH || 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'forma-browser-'));
const output = path.join(os.tmpdir(), 'forma-preview');
fs.mkdirSync(output, { recursive:true });
const browser = spawn(executable, ['--headless=new', '--disable-gpu', '--no-first-run', '--remote-debugging-port=9341', `--user-data-dir=${profile}`, 'about:blank'], {windowsHide:true,stdio:'ignore'});
const deadline = setTimeout(() => { browser.kill(); console.error('Browser tests timed out'); process.exit(1); }, 180000);
let ws;
try {
  let tabs;
  for (let i=0;i<30;i++) { try { tabs=await(await fetch('http://127.0.0.1:9341/json',{signal:AbortSignal.timeout(800)})).json(); break; } catch { await new Promise(r=>setTimeout(r,300)); } }
  if (!tabs) throw new Error('Browser did not start. Set BROWSER_PATH to a Chromium browser.');
  ws = new WebSocket(tabs.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise(r=>ws.addEventListener('open',r,{once:true}));
  let id=0;
  const pending=new Map();
  const errors=[];
  ws.addEventListener('message',e=>{const msg=JSON.parse(e.data);if(msg.id){pending.get(msg.id)?.(msg);pending.delete(msg.id);}if(msg.method==='Runtime.exceptionThrown')errors.push(msg.params.exceptionDetails.text);});
  const send=(method,params={})=>new Promise((resolve,reject)=>{const n=++id;pending.set(n,msg=>msg.error?reject(new Error(JSON.stringify(msg.error))):resolve(msg.result));ws.send(JSON.stringify({id:n,method,params}));});
  const evaluate=async expression=>{const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});if(result.exceptionDetails)throw new Error(JSON.stringify(result.exceptionDetails));return result.result.value;};
  const pause=ms=>new Promise(r=>setTimeout(r,ms));
  const visit=async route=>{await send('Page.navigate',{url:base+route});for(let i=0;i<50;i++){await pause(100);if(await evaluate(`location.pathname.replace(/\\/$/,'')===${JSON.stringify(route)} && document.readyState==='complete' && Boolean(document.querySelector('h1'))`))break;}await pause(250);};
  const viewport=async(width,height=950)=>send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:false});
  const screenshot=async name=>{const {data}=await send('Page.captureScreenshot',{format:'png'});fs.writeFileSync(path.join(output,name+'.png'),Buffer.from(data,'base64'));};
  await send('Page.enable');await send('Runtime.enable');
  for (const width of [1440,768,390]) {
    await viewport(width);
    for (const locale of ['en','tr']) {
      for (const page of ['', '/about','/services','/projects','/insights','/contact']) {
        const route=`/${locale}${page}`; await visit(route);
        assert.equal(await evaluate('document.documentElement.scrollWidth>innerWidth'),false,`Horizontal overflow: ${route} at ${width}`);
        assert.equal(await evaluate('document.documentElement.lang'),locale);
        if(!page)await screenshot(`home-${locale}-${width}`);
        if(locale==='en'&&width===1440&&page)await screenshot(page.slice(1)+'-desktop');
      }
    }
    console.log(`PASS: EN/TR primary pages at ${width}px, no horizontal overflow.`);
  }
  await viewport(390);await visit('/tr/projects');
  await evaluate('document.querySelectorAll(".project-filters button")[2].click()');await pause(200);
  assert.equal(await evaluate('document.querySelectorAll(".project-card").length'),1);
  assert.equal(await evaluate('document.querySelector(".project-card h3").textContent'),'Ortak Zemin');
  await evaluate('document.querySelector(".menu-toggle").click()');await pause(200);
  assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'),'true');
  await screenshot('mobile-menu');
  await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await pause(100);
  assert.equal(await evaluate('document.querySelector(".menu-toggle").getAttribute("aria-expanded")'),'false');
  await evaluate('document.querySelector(".menu-toggle").click()');await pause(100);
  await evaluate('document.querySelectorAll("#mobile-navigation a")[1].click()');await pause(700);
  assert.equal(await evaluate('location.pathname'),'/tr/about/');
  assert.equal(await evaluate('Boolean(document.querySelector("#mobile-navigation"))'),false);
  await visit('/tr/projects/the-olive-house');
  assert.equal(await evaluate('document.querySelector(".language-switch a").getAttribute("href")'),'/en/projects/the-olive-house/');
  await evaluate('document.querySelector(".language-switch a").click()');await pause(1000);
  assert.equal(await evaluate('document.documentElement.lang'),'en');
  assert.equal(await evaluate('location.pathname'),'/en/projects/the-olive-house/');
  await visit('/en/services');await evaluate('document.querySelector("summary").click()');
  assert.equal(await evaluate('document.querySelector("details").open'),true);
  console.log('PASS: project filters, mobile menu, Escape, mobile links, language switching, and FAQs.');
  const submissions=[];
  const downloads=[];
  await send('Network.enable');
  await send('Browser.setDownloadBehavior',{behavior:'deny',eventsEnabled:true});
  ws.addEventListener('message',event=>{const m=JSON.parse(event.data);if(m.method==='Network.requestWillBeSent'&&m.params.request.method==='POST')submissions.push(m.params.request.url);if(m.method==='Browser.downloadWillBegin')downloads.push(m.params.url);});
  for (const locale of ['en','tr']) {
   await visit(`/${locale}/contact`);
   assert.equal(await evaluate('document.querySelector("form").checkValidity()'),false);
   assert.deepEqual(await evaluate('Array.from(document.querySelectorAll("form input, form textarea")).map(el=>el.name)'),['name','email','phone','subject','message']);
   await evaluate(`document.querySelector('#name').value='Test Visitor';document.querySelector('#email').value='invalid';document.querySelector('#phone').value='+90 555 123 4567';document.querySelector('#subject').value='Project enquiry';document.querySelector('#message').value='I would like to discuss a residential project.';`);
   assert.equal(await evaluate('document.querySelector("form").checkValidity()'),false);
   await evaluate(`document.querySelector('#email').value='visitor@example.com';document.querySelector('form').requestSubmit();`);
   await pause(300);
   assert.equal(await evaluate('document.querySelector(".form-success h3").textContent'),locale==='en'?'Thank you for your message!':'Mesajınız için teşekkürler!');
   assert.equal(await evaluate('document.activeElement.classList.contains("form-success")'),true);
   assert.equal(await evaluate('document.querySelectorAll("a[download]").length'),0);
   await screenshot(`contact-success-${locale}`);
   await evaluate('document.querySelector(".form-success .text-link").click()');await pause(100);
   assert.equal(await evaluate('document.querySelector("#name").value'),'Test Visitor');
   assert.equal(await evaluate('document.activeElement.id'),'name');
  }
  assert.deepEqual(submissions,[], 'Static form must not send messages');
  assert.deepEqual(downloads,[], 'Contact form must not download files');
  assert.deepEqual(errors,[], 'Browser runtime errors');
  console.log('PASS: EN/TR contact fields, validation, success messages, edit flow, no submissions or downloads, and no runtime exceptions.');
  console.log(`Screenshots: ${output}`);
} finally {
  if(ws){ws.send(JSON.stringify({id:999999,method:'Browser.close'}));ws.close();}
  browser.kill();clearTimeout(deadline);
}
