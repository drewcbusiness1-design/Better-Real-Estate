const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const di=require('../dealIntelligence');

// Two independent exact-address public real-estate sources establish Corroborated, never Verified.
const portal=(host,field,value)=>({field,value,source:`Web · ${host}`,sourceKey:`web:${host}`,sourceType:'Public web',sourceKind:'real_estate_portal',reliability:72,tier:2,subjectAddress:'5823 Union Grove Rd, Russellville, TN 37860',addressMatchScore:90});
let r=ds._resolveSubjectEvidence({address:'5823 Union Grove Rd, Russellville, TN 37860',web:{factEvidence:[portal('zillow.com','bedrooms',4),portal('redfin.com','bedrooms',4)]}});
assert.equal(r.subject.bedrooms,4);assert.equal(r.fieldEvidence.bedrooms.status,'corroborated');assert.equal(r.fieldEvidence.bedrooms.verified,false);


const sameFamily=ds._resolveField('bedrooms',[portal('zillow.com','bedrooms',4),portal('trulia.com','bedrooms',4)]);assert.equal(sameFamily.value,null);assert.equal(sameFamily.status,'recorded','Zillow + Trulia share a source family and must not count as two independent corroborators');
assert(ds._urlWasActuallySearched('https://www.zillow.com/homedetails/123-test/',['https://www.zillow.com/homedetails/123-test/?foo=1']));
assert(!ds._urlWasActuallySearched('https://www.zillow.com/homedetails/invented-child/',['https://www.zillow.com/']),'a surfaced domain/homepage must not validate an invented child URL');

// Conflicting multi-source evidence stays visible and cannot silently establish a core fact.
r=ds._resolveSubjectEvidence({address:'5823 Union Grove Rd, Russellville, TN 37860',web:{factEvidence:[portal('zillow.com','squareFootage',1917),portal('redfin.com','squareFootage',1917),portal('example.com','squareFootage',1030)]}});
assert.equal(r.subject.squareFootage,null);assert(['conflicting','corroborated_with_conflict'].includes(r.fieldEvidence.squareFootage.status));

// Unknown-distance comps from multiple sources can create a working range, but not precise ARV.
const now=Date.now(),iso=d=>new Date(now-d*86400000).toISOString().slice(0,10),subject={squareFootage:1917,propertyType:'Single family',bedrooms:4,bathrooms:1,yearBuilt:1960};
const comps=[
 {address:'101 A St',salePrice:150000,saleDate:iso(60),squareFootage:1850,propertyType:'Single family',bedrooms:4,bathrooms:2,source:'Web · Zillow',sourceKey:'web:zillow.com'},
 {address:'102 B St',salePrice:158000,saleDate:iso(90),squareFootage:1980,propertyType:'Single family',bedrooms:4,bathrooms:1,source:'Web · Redfin',sourceKey:'web:redfin.com'},
 {address:'103 C St',salePrice:154000,saleDate:iso(120),squareFootage:1900,propertyType:'Single family',bedrooms:3,bathrooms:1,source:'Web · Realtor',sourceKey:'web:realtor.com'}
];
const ca=di.analyzeComps(subject,comps);assert.equal(ca.valuationReady,false);assert.equal(ca.indicativeReady,true);assert(ca.workingEstimate>0);assert.equal(ca.precision,'working_range');assert.equal(ca.estimate,null);

const src=fs.readFileSync('dealSources.js','utf8'),app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),cache=fs.readFileSync('dealResearchCache.js','utf8'),bg=fs.readFileSync('netlify/functions/deal-research-background.js','utf8');
assert(src.includes("PRIMARY_PROPERTY_DOMAINS = ['zillow.com','realtor.com','redfin.com','homes.com'")&&src.includes('SECONDARY_PROPERTY_DOMAINS'));
assert(src.includes("webTool.filters={allowed_domains"));
assert(src.includes("passLabel:'subject-and-sold-comps-major-property-sites'")&&src.includes("passLabel:'subject-independent-property-and-public-record-sources'")&&src.includes("passLabel:'sold-comps-local-brokers-public-records-secondary'")&&src.includes("passLabel:'sold-comps-independent-corroboration'"));
assert(src.includes('regridCoverageError')&&src.includes('coverage_unavailable'),'Regrid coverage failures must be optional limitations, not blockers');
assert(cache.includes("VERSION='v29.15-complete-intelligence-r5'"));
assert(bg.includes("phase:'synthesis'")&&bg.includes('cache.persistEvidence(job.address,evidence,{synthesis,synthesisFailure})'),'final synthesis should be completed inside the background job when evidence supports it');
assert(app.includes('const TUTORIAL_VERSION = 50;')&&app.includes("release:47,title:'Multi-source investor intelligence'"));
assert(app.includes('aux-fact-grid')&&app.includes("a.arv?.precision==='working_range'?'Working ARV':'After-repair value'"));
assert(css.includes('.dealbuilderpage{width:min(1080px,100%)')&&css.includes('v29.15 final Deal Intelligence presentation repair')&&css.includes('.evidence-field-grid{grid-template-columns:repeat(3')&&css.includes('.aux-fact-grid{display:grid')); 
console.log('v29.15 perfect multi-source investor intelligence regression passed');
