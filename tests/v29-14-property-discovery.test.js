const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const pkg=require('../package.json');
assert.equal(pkg.version,'2.9.15');

// Regrid's documented response commonly stores the display address in properties.headline,
// outside properties.fields. v29.13 dropped it, causing valid parcels to fail identity matching.
const regrid={properties:{headline:'503 W Grand Prairie St, Palestine, IL 62451',fields:{
  scity:'Palestine',state2:'IL',szip:'62451',num_bedrooms:4,num_bath:1,recrdareano:1132,yearbuilt:1900,usedesc:'Single Family'
}}};
const normalized=ds._normRegrid(regrid);
assert.equal(normalized.address,'503 W Grand Prairie St, Palestine, IL 62451');
const pick=ds._selectRegridFeature([regrid],'503 W Grand Prairie St, Palestine, IL 62451');
assert.ok(pick.subject,'documented Regrid headline address must be matchable');
assert.ok(pick.matchScore>=65);

// One source is evidence, not verified truth.
let r=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:{...pick.subject,addressMatchScore:pick.matchScore},web:{factEvidence:[]}});
assert.equal(r.subject.bedrooms,null);
assert.equal(r.fieldEvidence.bedrooms.status,'recorded');

// Independent exact-address corroboration verifies matching facts.
const web={factEvidence:[
 {field:'bedrooms',value:4,source:'Web · broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80},
 {field:'bathrooms',value:1,source:'Web · broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80},
 {field:'squareFootage',value:1132,source:'Web · broker',sourceKey:'web:broker.example',sourceType:'Public web',reliability:80}
]};
r=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:{...pick.subject,addressMatchScore:pick.matchScore},web});
assert.equal(r.subject.bedrooms,4);
assert.equal(r.subject.bathrooms,1);
assert.equal(r.subject.squareFootage,1132);

const src=fs.readFileSync('dealSources.js','utf8');
assert(src.includes("search_context_size:'medium'"),'web research must use bounded context for Netlify reliability');
assert(src.includes('WEB_TIMEOUT_MS = 18000'),'web research timeout must be bounded');
assert(src.includes('major real-estate sources such as Zillow'),'must intentionally search relevant public real-estate sources without pretending to scrape them');
assert(src.includes('do not scrape websites or bypass access controls'),'restricted sites must not be scraped');
console.log('v29.14 property discovery reliability tests passed');
