const fs=require('fs'),crypto=require('crypto'),assert=require('assert');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
assert.equal(hash(fs.readFileSync('public/brand-logo-header.png')),'189adf36949dc19a6e269c9cc6478a982bb8214bb314c72ca7485d70282b2746');
assert.equal(hash(fs.readFileSync('public/style.css').subarray(0,236117)),'cb6fc63fb82007dfbdefbed9b510058b2cad015dfaa630651a8d087512b8a38d');
const s=fs.readFileSync('public/app.js','utf8');const h=s.slice(s.indexOf('function renderTop('),s.indexOf('function renderTabs('));assert(!h.includes('Partner email submissions'));assert.equal((h.match(/iconSvg\('mail',19\)/g)||[]).length,1);assert(!s.includes('profileConnections('));assert(!s.includes('website-banner-settings'));
console.log('PASS exact baseline header image, baseline style prefix, single original mail icon and no mobile-only profile controls');
