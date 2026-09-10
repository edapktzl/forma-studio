import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
const root=path.resolve('out');
const files=fs.readdirSync(root,{recursive:true}).filter(f=>f.endsWith('.html'));
let links=0;
for(const file of files) {
 const html=fs.readFileSync(path.join(root,file),'utf8');
 for(const m of html.matchAll(/(?:href|src)="(\/[^"#?]*)(?:[^\"]*)"/g)) {
  const url=m[1];
  assert.ok(url.startsWith('/forma-studio/'),`${file}: missing base path: ${url}`);
  let target=path.join(root,decodeURIComponent(url.slice('/forma-studio/'.length)));
  if(fs.existsSync(target)&&fs.statSync(target).isDirectory())target=path.join(target,'index.html');
  assert.ok(fs.existsSync(target),`${file}: missing target ${url}`);links++;
 }
}
assert.ok(files.length>=29);
console.log(`PASS: ${files.length} exported HTML files and ${links} internal links/assets.`);
