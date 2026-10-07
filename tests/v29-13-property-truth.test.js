const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const pkg=require('../package.json');

assert.equal(pkg.version,'2.9.29');

// Wrong-parcel candidates must lose even if they are returned first.
const wrong={properties:{fields:{address:'99 Main St',scity:'Trenton',state2:'NJ',szip:'08608',num_bedrooms:4,num_bath:4}}};
const right={properties:{fields:{address:'10 Main St',scity:'Trenton',state2:'NJ',szip:'08608',num_bedrooms:3,num_bath:2}}};
const pick=ds._selectRegridFeature([wrong,right],'10 Main St, Trenton, NJ 08608');
assert.equal(pick.subject.address,'10 Main St');
assert.ok(pick.matchScore>=65);

// A single Regrid 4/4 must NOT be promoted as verified fact.
let resolved=ds._resolveSubjectEvidence({address:'10 Main St, Trenton, NJ 08608',regridSubject:{source:'Regrid',sourceType:'County / parcel records',sourceKey:'regrid',address:'10 Main St',city:'Trenton',state:'NJ',postalCode:'08608',addressMatchScore:90,bedrooms:4,bathrooms:4,squareFootage:1600,yearBuilt:1980,propertyType:'Single Family'},web:{factEvidence:[]}});
assert.equal(resolved.subject.bedrooms,null);
assert.equal(resolved.subject.bathrooms,null);
assert.equal(resolved.fieldEvidence.bedrooms.status,'recorded');

// Even one exact authorized MLS row is still only one source for core facts.
// It remains visible as evidence but is not promoted until independently corroborated.
resolved=ds._resolveSubjectEvidence({address:'10 Main St, Trenton, NJ 08608',mlsSubject:{source:'Example MLS',sourceKey:'mls:example',sourceType:'MLS / RESO',address:'10 Main St',city:'Trenton',state:'NJ',postalCode:'08608',addressMatchScore:95,bedrooms:4,bathrooms:4,squareFootage:1600,yearBuilt:1980,propertyType:'Single Family'},web:{factEvidence:[]}});
assert.equal(resolved.subject.bedrooms,null);
assert.equal(resolved.subject.bathrooms,null);
assert.equal(resolved.fieldEvidence.bedrooms.status,'recorded');

// Regrid 4/4 versus one independent 3/2 source is conflict: withhold, don't guess.
const webOne={factEvidence:[
  {field:'bedrooms',value:3,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80},
  {field:'bathrooms',value:2,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80}
]};
resolved=ds._resolveSubjectEvidence({address:'10 Main St, Trenton, NJ 08608',regridSubject:{source:'Regrid',sourceType:'County / parcel records',sourceKey:'regrid',address:'10 Main St',city:'Trenton',state:'NJ',postalCode:'08608',addressMatchScore:90,bedrooms:4,bathrooms:4},web:webOne});
assert.equal(resolved.subject.bedrooms,null);
assert.equal(resolved.subject.bathrooms,null);
assert.equal(resolved.fieldEvidence.bedrooms.status,'conflicting');

// Two independent 3/2 sources can outvote one weaker conflicting source, but conflict stays visible.
const webTwo={factEvidence:[
  {field:'bedrooms',value:3,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80},
  {field:'bedrooms',value:3,source:'Web · County',sourceKey:'web:county.example',sourceType:'Public web',reliability:90},
  {field:'bathrooms',value:2,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80},
  {field:'bathrooms',value:2,source:'Web · County',sourceKey:'web:county.example',sourceType:'Public web',reliability:90}
]};
resolved=ds._resolveSubjectEvidence({address:'10 Main St, Trenton, NJ 08608',regridSubject:{source:'Regrid',sourceType:'County / parcel records',sourceKey:'regrid',address:'10 Main St',city:'Trenton',state:'NJ',postalCode:'08608',addressMatchScore:90,bedrooms:4,bathrooms:4},web:webTwo});
assert.equal(resolved.subject.bedrooms,3);
assert.equal(resolved.subject.bathrooms,2);
assert.equal(resolved.fieldEvidence.bedrooms.status,'verified_with_conflict');
assert.ok(resolved.conflicts.some(x=>x.field==='bedrooms'));

const server=fs.readFileSync('server.js','utf8'),app=fs.readFileSync('public/app.js','utf8'),ai=fs.readFileSync('ai.js','utf8'),store=fs.readFileSync('store.js','utf8');
assert(server.includes('DEAL_RESEARCH_CACHE_TTL_MS'),'research cache required');
const cache=fs.readFileSync('dealResearchCache.js','utf8'); assert(server.includes('DEAL_RESEARCH_CACHE_VERSION = dealResearchCache.VERSION')&&cache.includes("VERSION='v29.15-complete-intelligence-r5'"),'cache namespace must invalidate stale research');
assert(server.includes('dealResearchCache'),'persistent research cache required');
assert(server.includes("analysis.subject[field]=verified[field]??null"),'AI guessed facts must be overwritten by verified facts');
assert(!server.includes("const evidence=(req.body?.evidence"),'browser evidence must not drive final valuation');
assert(server.includes("ARV withheld — closed-sale evidence insufficient"),'unsupported ARV must be withheld');
assert(server.includes('canShowArv=Boolean')&&server.includes('readyForAnalysis=Boolean(enoughIdentity&&canShowArv)'),'AI synthesis must require property truth while deterministic working ARV can remain visible');
assert(server.includes("if(!readyForAnalysis){"),'insufficient evidence must skip final AI synthesis');
assert(server.includes('newQualified=successfulAnalysis&&!wasQualified'),'same successful property must not consume another limited-plan analysis quota');
assert(app.includes('Verified property facts'),'tutorial must teach property truth');
assert(app.includes('Conflicts retained — disputed facts are not silently chosen'),'UI must surface conflicts');
assert(app.includes('cached to save API/Netlify usage'),'cost-saving cache must be visible');
assert(ai.toLowerCase().includes('never select a disputed raw value'),'AI must not choose conflicting source values itself');
assert(store.includes("'dealResearchCache'"),'research cache collection missing');
console.log('v29.13 property truth + cost guardrails tests passed');
