const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8');
assert(app.includes('demoFounderPreviewDismissKey'),'dismiss key helper missing');
assert(app.includes('demoFounderPreviewDismissed()'),'dismiss guard missing');
assert(app.includes("sessionStorage.setItem(key,'1')"),'close preview does not persist dismissal for current preview session');
assert(app.includes("demoFounderPreview()&&!demoFounderPreviewDismissed()"),'render can reopen dismissed founder preview');
console.log('v29.8 founder preview close regression passed');
