const fs=require('fs'), assert=require('assert');
const app=fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');
const server=fs.readFileSync(require('path').join(__dirname,'../server.js'),'utf8');
const store=fs.readFileSync(require('path').join(__dirname,'../store.js'),'utf8');
for(const token of ['renderDealBuilder','Smart Comps Workspace','Deal Analyzer','renderBuyerCRM','TUTORIAL_VERSION = 28','Skip entire tour','Skip this step','Restart platform tutorial']) assert(app.includes(token),token);
for(const token of ["/api/deal-builder/address","/api/buyer-crm","tutorialCompletedVersion","tutorialDismissedVersion"]) assert(server.includes(token),token);
assert(store.includes("'buyerCrm'")); assert(store.includes("'dealAnalyses'"));
console.log('v26 feature wiring tests passed');
