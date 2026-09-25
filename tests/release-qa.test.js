const fs=require('fs'), assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
// Every URL-routable view must have a renderer; every literal go() target must render.
const routed=(app.match(/const ROUTED_VIEWS = new Set\(\[(.*?)\]\)/s)||[])[1];
assert(routed,'ROUTED_VIEWS missing');
const routedSet=new Set([...routed.matchAll(/'([^']+)'/g)].map(m=>m[1]));
const viewsBlock=(app.match(/const views = \{(.*?)\n  \};/s)||[])[1];
assert(viewsBlock,'view renderer map missing');
const viewSet=new Set([...viewsBlock.matchAll(/\b([A-Za-z][\w]*)\s*:/g)].map(m=>m[1]));
for(const v of routedSet) assert(viewSet.has(v),`routed view ${v} has no renderer`);
for(const m of app.matchAll(/\bgo\(['"]([^'"]+)/g)) assert(viewSet.has(m[1]),`go(${m[1]}) has no renderer`);
// New authenticated destinations and endpoints.
for(const v of ['dealbuilder','buyercrm']) assert(routedSet.has(v)&&viewSet.has(v),`${v} must be routable and renderable`);
for(const route of ["app.get('/api/deal-builder/usage', requireAuth", "app.post('/api/deal-builder/address', requireAuth", "app.get('/api/buyer-crm', requireAuth", "app.post('/api/buyer-crm', requireAuth", "app.delete('/api/buyer-crm/:id', requireAuth"]) assert(server.includes(route),`auth guard missing: ${route}`);
// Membership policy: Pro 5/day, free one trial use, Platinum/Team/Admin unlimited; charge only after successful analyze.
assert(server.includes('if (isAdminUser(user) || isPlatinum(user) || isWholesale(user)) return { unlimited:true'),'unlimited tiers mismatch');
assert(server.includes('limit:5') && server.includes('5-used'),'Pro daily limit mismatch');
assert(server.includes('dealBuilderTrialUses'),'free trial usage missing');
const analyzePos=server.indexOf('const analysis=await propertyIntel.analyze(address)');
const chargePos=server.indexOf('req.user.dealBuilderUsageCount=Number(req.user.dealBuilderUsageCount||0)+1');
assert(analyzePos>=0 && chargePos>analyzePos,'usage must only increment after successful property analysis');
// Leaderboard copy must match server scoring and tolerate legacy users with no points field.
assert(app.includes('100 points to the verified seller and 100 points to the verified buyer'),'leaderboard explanation missing');
assert(server.includes('buyer.points = Number(buyer.points || 0) + 100') && server.includes('seller.points = Number(seller.points || 0) + 100'),'leaderboard award must safely add 100 points');
assert(css.includes('.lbpts{margin-left:auto') && css.includes('font-family:inherit'),'leaderboard points alignment/font polish missing');
// Packaging/config docs required by existing integration tests and deploy setup.
assert(fs.existsSync('.env.example'),'.env.example missing from release');
for(const k of ['DATABASE_URL=','SESSION_SECRET=','CJ_API_KEY=','GOOGLE_MAPS_API_KEY=','OPENAI_API_KEY=','RENTCAST_API_KEY=']) assert(fs.readFileSync('.env.example','utf8').includes(k),`.env.example missing ${k}`);
console.log('✓ exhaustive release wiring QA passed');
