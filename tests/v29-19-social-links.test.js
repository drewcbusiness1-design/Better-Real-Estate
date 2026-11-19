const fs=require('fs'); const assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'); const css=fs.readFileSync('public/style.css','utf8');
const required=[
 'https://www.instagram.com/thebetterrealestate',
 'https://www.facebook.com/share/1CfSN43wRg/?mibextid=wwXIfr',
 'https://www.tiktok.com/@andrewcoxjr?_r=1&_t=ZP-9AFle6a2CjO',
 'https://www.facebook.com/share/1DJyGhfC2a/?mibextid=wwXIfr'
];
required.forEach(u=>assert(app.includes(u),`missing social URL: ${u}`));
assert(app.includes("rel: 'noopener noreferrer'"),'external links must be protected');
assert(app.includes("target: '_blank'"),'social links should open in a new tab');
assert(app.includes("class: 'homewide homesocial'"),'homepage social links missing');
assert(app.includes("class: 'authsocial'"),'signup social links missing');
assert(app.includes('socialLinksBlock(true)'),'shared social block missing');
assert(css.includes('.sociallink:focus-visible'),'keyboard focus style missing');
assert(css.includes('@media(max-width:420px)'),'mobile social layout missing');
console.log('v29.19 social-links regression: PASS');
