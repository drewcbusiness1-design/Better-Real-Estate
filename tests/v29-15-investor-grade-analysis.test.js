const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const intel=require('../dealIntelligence');

// Grounded evidence must actually contain the returned value.
assert(ds._evidenceTextGrounded('bedrooms',4,'503 W Grand Prairie St — 4 beds · 1 bath'));
assert(ds._evidenceTextGrounded('squareFootage',1132,'Total interior livable area: 1,132 sqft'));
assert(!ds._evidenceTextGrounded('squareFootage',1030,'Total interior livable area: 1,132 sqft'));
assert(ds._compEvidenceGrounded({address:'308 S Pike St, Palestine, IL',salePrice:89500,saleDate:'2026-06-18',evidenceText:'308 S Pike St sold for $89,500 on June 18, 2026'}));
assert(!ds._compEvidenceGrounded({address:'308 S Pike St, Palestine, IL',salePrice:89500,saleDate:'2026-06-18',evidenceText:'Nearby property sold for $89,500 on June 18, 2026'}));

// Three grounded exact-address portal sources may be Corroborated, but are not mislabeled Verified.
const portal=(sourceKey)=>({value:4,source:sourceKey,sourceKey,sourceKind:'real_estate_portal',sourceType:'Public web',reliability:72,tier:2});
const cor=ds._resolveField('bedrooms',[portal('web:zillow.com'),portal('web:realtor.com'),portal('web:trulia.com')]);
assert.equal(cor.value,4);assert.equal(cor.status,'corroborated');assert.equal(cor.verified,false);assert.equal(cor.corroborated,true);
const one=ds._resolveField('bedrooms',[portal('web:zillow.com')]);assert.equal(one.value,null);assert.equal(one.recordedValue,4);assert.equal(one.status,'recorded');

// ARV should work from exact sold comps with established source-reported distances, while explicit distressed sales are rejected.
const subject={bedrooms:4,bathrooms:1,squareFootage:1132,propertyType:'Single Family'};
const comps=[
{address:'608 W Harrison St, Palestine, IL',salePrice:116200,saleDate:'2025-11-03',bedrooms:3,bathrooms:1,squareFootage:1216,propertyType:'Single Family',distanceMiles:.13,source:'Web · Trulia'},
{address:'207 N Steele St, Palestine, IL',salePrice:20000,saleDate:'2026-08-27',bedrooms:3,bathrooms:1,squareFootage:1104,propertyType:'Single Family',distanceMiles:.21,source:'Web · Trulia',distressed:true},
{address:'308 S Pike St, Palestine, IL',salePrice:89500,saleDate:'2026-06-18',bedrooms:4,bathrooms:1.5,squareFootage:1308,propertyType:'Single Family',distanceMiles:.26,source:'Web · Trulia'},
{address:'310 E Harrison St, Palestine, IL',salePrice:93000,saleDate:'2026-03-27',bedrooms:2,bathrooms:1,squareFootage:1180,propertyType:'Single Family',distanceMiles:.50,source:'Web · Trulia'},
{address:'205 S Jackson St, Palestine, IL',salePrice:81500,saleDate:'2026-04-24',bedrooms:3,bathrooms:1,squareFootage:1621,propertyType:'Single Family',distanceMiles:.42,source:'Web · Trulia'}
];
const ca=intel.analyzeComps(subject,comps);assert(ca.valuationReady);assert(ca.estimate>70000&&ca.estimate<130000);assert(ca.distanceVerifiedCount>=3);assert(ca.warnings.some(x=>/distressed/i.test(x)));

// Repair planning remains available even without AI and uses sourced condition evidence.
const rehab=intel.estimateRehab(subject,[{sourceKey:'web:zillow.com',summary:'needs a full cleanout and rehab',evidenceText:'needs a full cleanout and rehab'}],{squareFootage:{recordedValue:1132}});
assert.equal(rehab.recommendedKey,'heavy');assert.equal(rehab.scenarios.length,3);assert(rehab.scenarios.find(x=>x.key==='heavy').estimate>60000);assert(rehab.scenarios.find(x=>x.key==='heavy').high>rehab.scenarios.find(x=>x.key==='heavy').low);

const app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),src=fs.readFileSync('dealSources.js','utf8'),cache=fs.readFileSync('dealResearchCache.js','utf8');
assert(app.includes('const TUTORIAL_VERSION = 71;')||app.includes('const TUTORIAL_VERSION = 71;')&&app.includes("release:46,title:'Investor-grade analysis'")&&app.includes("release:47,title:'Multi-source investor intelligence'"));
for(const token of ['deal-intel-snapshot','evidence-summary-line','View source detail and provenance','Repair planning','Current ask'])assert(app.includes(token),token);
for(const token of ['.dealbuilderpage{width:min(1080px,100%)','.evidence-field-grid{grid-template-columns:repeat(3','.rehab-scenario-grid{display:grid','.deal-intel-snapshot{display:grid'])assert(css.includes(token),token);
assert(src.includes("u.searchParams.set('token',token)")&&src.includes("'x-regrid-token':token"),'Regrid auth must support documented token forms');
assert(cache.includes("VERSION='v29.39-complete-facts-r7'"),'new cache namespace must invalidate bad prior evidence');
console.log('v29.15 investor-grade analysis + presentation regression passed');
