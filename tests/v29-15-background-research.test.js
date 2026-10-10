const assert=require('assert'),fs=require('fs');
(async()=>{
const app=fs.readFileSync('public/app.js','utf8'),server=fs.readFileSync('server.js','utf8'),sources=fs.readFileSync('dealSources.js','utf8'),toml=fs.readFileSync('netlify.toml','utf8');
assert(fs.existsSync('netlify/functions/deal-research-background.js'),'background worker missing');
assert(fs.existsSync('dealResearchJobs.js'),'job store missing');
assert(fs.existsSync('dealResearchCache.js'),'shared cache helper missing');
assert(server.includes("/api/deal-builder/research/start"),'async research start endpoint missing');
assert(server.includes("app.get('/api/deal-builder/research/status'")&&server.includes("statusPath:'/api/deal-builder/research/status'"),'authenticated API-backed research status route missing');
assert(server.includes("job.userId!==req.user.id"),'research status must be scoped to the signed-in user');
assert(app.includes("/api/deal-builder/research/start")&&app.includes('deal-research-background')===false,'client should use server-provided background path rather than hardcoding it');
assert(app.includes('Researching property · ${job.progress||0}%'),'progress UI missing');
assert(app.includes("credentials:'same-origin'")&&!app.includes('started.statusToken'),'status polling must use the existing authenticated API session rather than a separate ephemeral status function/token');
assert(fs.readFileSync('store.js','utf8').includes("'dealResearchJobs'"),'background job state must be stored in the existing durable Postgres data layer');
assert(toml.includes('[functions."deal-research-background"]')&&toml.includes('background = true'),'Netlify background mode missing');
assert(sources.includes('WEB_FACT_TIMEOUT_MS = 90000')&&sources.includes('WEB_COMP_TIMEOUT_MS = 150000'),'background-quality web budgets missing');
assert(sources.includes("u.searchParams.set('path',`/us/${parsed.state.toLowerCase()}`)"),'Regrid state-path constrained lookup missing');
assert(sources.includes("queryMode='street_plus_state_path'")&&sources.includes("queryMode='full_address_fallback'"),'Regrid bounded fallback strategy missing');
assert(sources.includes('webIdentitySources')&&sources.includes('webIdentitySources:webIdentity.length'),'strong exact-address web evidence must be able to support identity when deterministic parcel data is unavailable');
assert(sources.includes('verifyWebCompDistances')&&sources.includes("limit','1'"),'web sold comps should use bounded Regrid exact-address coordinate verification when subject coordinates exist');
assert(sources.includes("/api/v2/parcels/query")&&sources.includes("fields[saleprice][gt]")&&sources.includes("fields[saledate][gte]")&&sources.includes('REGRID_NEARBY_LIMIT = 40'),'nearby Regrid research must request recent sold parcels directly instead of billing for 100 arbitrary nearby parcels');
assert(sources.includes('rankWebCompsForVerification'),'web comp coordinate checks must spend Regrid lookups on the strongest candidates first');
assert(app.includes('const TUTORIAL_VERSION = 68;')||app.includes('const TUTORIAL_VERSION = 68;')&&app.includes("release:45,title:'Deep background property research'"),'tutorial v45 missing');

// Exact-address strong web evidence may establish identity without pretending that one portal verified the facts.
const ds=require('../dealSources');
const address='503 W Grand Prairie St, Palestine, IL 62451';
const web={factEvidence:[
 {field:'bedrooms',value:4,subjectAddress:address,addressMatchScore:100,source:'Web · County',sourceKey:'web:county.example',sourceType:'Public web',sourceKind:'county_assessor',reliability:98,tier:4},
 {field:'bedrooms',value:4,subjectAddress:address,addressMatchScore:100,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',sourceKind:'broker_listing',reliability:86,tier:3},
 {field:'squareFootage',value:1132,subjectAddress:address,addressMatchScore:100,source:'Web · County',sourceKey:'web:county.example',sourceType:'Public web',sourceKind:'county_assessor',reliability:98,tier:4},
 {field:'squareFootage',value:1132,subjectAddress:address,addressMatchScore:100,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',sourceKind:'broker_listing',reliability:86,tier:3},
 {field:'propertyType',value:'Single family',subjectAddress:address,addressMatchScore:100,source:'Web · County',sourceKey:'web:county.example',sourceType:'Public web',sourceKind:'county_assessor',reliability:98,tier:4},
 {field:'propertyType',value:'Single family',subjectAddress:address,addressMatchScore:100,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',sourceKind:'broker_listing',reliability:86,tier:3}
]};
const resolved=ds._resolveSubjectEvidence({address,web});
assert.equal(resolved.identity.addressMatched,true,'strong exact-address public evidence should support property identity');
assert.equal(resolved.subject.bedrooms,4);assert.equal(resolved.subject.squareFootage,1132);assert.equal(resolved.subject.propertyType,'Single family');

// Job state deduplicates repeated clicks on the same user/property and protects run/status reads with random tokens.
const jobs=require('../dealResearchJobs');
const j1=await jobs.startOrReuse({userId:'u-test',address,researchKey:'r-test',cacheVersion:'x'}),j2=await jobs.startOrReuse({userId:'u-test',address,researchKey:'r-test',cacheVersion:'x'});
assert.equal(j1.id,j2.id);assert.equal(j2.reused,true);assert(await jobs.authorizedJob(j1.id,j1.runToken,'run'));assert.equal(await jobs.authorizedJob(j1.id,'wrong','run'),null);
console.log('v29.15 deep background Deal Intelligence regression passed');
})().catch(e=>{console.error(e);process.exit(1)});
