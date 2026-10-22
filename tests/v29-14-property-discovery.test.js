const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const pkg=require('../package.json');
assert(['2.9.29','2.9.30','2.9.31','2.9.32','2.9.33','2.9.34','2.9.35','2.9.36','2.9.37','2.9.38','2.9.39','2.9.40','2.9.41','2.9.45','2.9.46','2.9.47','2.9.48','2.9.51','2.9.53','2.9.54','2.9.55','2.9.57','2.9.58','2.9.59','2.9.60','2.9.61','2.9.62','2.9.63','2.9.64','2.9.65','2.9.66','2.9.67','2.9.68','2.9.69','2.9.70','2.9.71'].includes(pkg.version));

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
assert(src.includes("search_context_size:'high'"),'background research should use higher search context for evidence quality');
assert(src.includes('WEB_FACT_TIMEOUT_MS = 90000')&&src.includes('WEB_COMP_TIMEOUT_MS = 150000'),'background web research must be bounded but long enough for source discovery');
assert(src.includes("PRIMARY_PROPERTY_DOMAINS = ['zillow.com','realtor.com','redfin.com','homes.com'")&&src.includes('subject-core-property-facts-major-property-sites'),'must intentionally search multiple relevant public real-estate sources without pretending to scrape them');
assert(src.includes('do not scrape websites or bypass access controls'),'restricted sites must not be scraped');
console.log('v29.14 property discovery reliability tests passed');
