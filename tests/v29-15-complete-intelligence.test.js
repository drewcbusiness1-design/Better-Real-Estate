const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const intel=require('../dealIntelligence');

// Real-world sold-result date formats such as 10/21/25 must not be discarded.
assert.equal(ds._evidenceDateGrounded('2025-10-21','Sold 10/21/25'),true,'2-digit-year sold dates must ground');
assert.equal(ds._evidenceDateGrounded('2025-10-21','Sold Oct 21, 2025'),true,'abbreviated month sold dates must ground');
assert.equal(ds._compEvidenceGrounded({address:'2113 Kerrwood Dr, Anderson, IN 46011',salePrice:136999,saleDate:'2025-10-21',evidenceText:'2113 Kerrwood Dr, Anderson, IN — $136,999 — sold 10/21/25'}),true,'grounded sold comp should survive extraction');

// The subject property's own abnormal sale must never enter its ARV comp set.
const subject={address:'1905 Drexel Dr, Anderson, IN 46011',bedrooms:3,bathrooms:1,squareFootage:1171,yearBuilt:1927};
const deduped=ds._dedupeComps([
  {address:'1905 Drexel Dr, Anderson, IN 46011',salePrice:2105,saleDate:'2026-03-25',source:'Web · Zillow',sourceKey:'web:zillow.com'},
  {address:'2113 Kerrwood Dr, Anderson, IN 46011',salePrice:136999,saleDate:'2025-10-21',source:'Web · Trulia',sourceKey:'web:trulia.com'}
],subject);
assert.equal(deduped.length,1);assert.equal(deduped[0].address,'2113 Kerrwood Dr, Anderson, IN 46011');

// Recorded non-conflicting facts may guide deterministic comp similarity without becoming verified truth.
const comparison=ds._comparisonSubject({subject:{address:'1905 Drexel Dr, Anderson, IN 46011',bedrooms:null,bathrooms:null,squareFootage:null,yearBuilt:null,propertyType:null},fieldEvidence:{bedrooms:{status:'recorded',recordedValue:3},bathrooms:{status:'recorded',recordedValue:1},squareFootage:{status:'recorded',recordedValue:1171},yearBuilt:{status:'recorded',recordedValue:1927},propertyType:{status:'conflicting',recordedValue:'Single Family'}}});
assert.equal(comparison.bedrooms,3);assert.equal(comparison.squareFootage,1171);assert.equal(comparison.propertyType,null,'conflicting property type must stay out of comparison context');

// Replay the live Anderson property pattern that previously left ARV blank.
// Three recent, reasonably similar sold comps from one portal family may support a LOW-confidence
// working range; they may NOT unlock the precise valuation label without the stricter distance gate.
const comps=[
  ['2825 Brentwood Dr, Anderson, IN 46011',140000,'2026-03-13',1270,3,1],
  ['2121 Euclid Dr, Anderson, IN 46011',110000,'2026-01-09',1136,2,1],
  ['2113 Kerrwood Dr, Anderson, IN 46011',136999,'2025-10-21',1300,3,1],
  ['2006 Costello Dr, Anderson, IN 46011',130000,'2025-11-24',1652,3,1]
].map(([address,salePrice,saleDate,squareFootage,bedrooms,bathrooms])=>({address,salePrice,saleDate,squareFootage,bedrooms,bathrooms,source:'Web · Trulia',sourceKey:'web:trulia.com',sourceFamily:'portal:zillow-group'}));
const ca=intel.analyzeComps(comparison,comps);
assert.equal(ca.valuationReady,false);
assert.equal(ca.indicativeReady,true,'the real Anderson comp pattern should produce a working range instead of a blank ARV');
assert(ca.workingEstimate>0&&ca.workingLow>0&&ca.workingHigh>0);
assert.equal(ca.sourceDiversity,1);
assert(ca.usableWorkingCount>=3);
assert(ca.warnings.some(x=>/one source/i.test(x)),'single-source-family working range must stay visibly caveated');

// When an exact-address public comp table supplies trustworthy distances, two unusually strong
// recent/nearby closed sales may satisfy the inherited precise-ARV exception. Cheap abnormal
// transfers are screened as outliers and must not drag the retail after-repair value down.
const distanceBacked=intel.analyzeComps({...comparison,propertyType:'single family'},[
  {address:'1820 Euclid Dr, Anderson, IN 46011',salePrice:68000,saleDate:'2026-05-20',distanceMiles:.04,squareFootage:800,bedrooms:2,bathrooms:1,propertyType:'single family',source:'Web · Trulia',sourceKey:'web:trulia.com'},
  {address:'2005 Euclid Dr, Anderson, IN 46011',salePrice:37000,saleDate:'2026-01-09',distanceMiles:.08,squareFootage:1646,bedrooms:2,bathrooms:1,propertyType:'single family',source:'Web · Trulia',sourceKey:'web:trulia.com'},
  {address:'2113 Kerrwood Dr, Anderson, IN 46011',salePrice:136999,saleDate:'2025-10-21',distanceMiles:.19,squareFootage:1300,bedrooms:3,bathrooms:1,propertyType:'single family',source:'Web · Trulia',sourceKey:'web:trulia.com'},
  {address:'2825 Brentwood Dr, Anderson, IN 46011',salePrice:140000,saleDate:'2026-03-13',distanceMiles:.24,squareFootage:1270,bedrooms:3,bathrooms:1,propertyType:'single family',source:'Web · Trulia',sourceKey:'web:trulia.com'}
]);
assert.equal(distanceBacked.valuationReady,true,'two unusually strong recent/nearby distance-backed comps should unlock precise ARV');
assert.equal(distanceBacked.precision,'precise');
assert(distanceBacked.estimate>120000&&distanceBacked.estimate<145000,'outlier-screened ARV should stay near the two strong retail comps');
assert(distanceBacked.warnings.some(x=>/outlier/i.test(x)),'abnormal low transfers should stay visibly excluded');

const app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),server=fs.readFileSync('server.js','utf8'),sources=fs.readFileSync('dealSources.js','utf8'),cache=fs.readFileSync('dealResearchCache.js','utf8');
assert(app.includes('const TUTORIAL_VERSION = 59;')||app.includes('const TUTORIAL_VERSION = 59;')&&app.includes("release:48,title:'Complete Deal Intelligence'"));
assert(app.includes('recorded/established mix')&&app.includes('source page')&&app.includes('facts surfaced')&&app.includes('independently established'),'recorded values must remain visible, surfaced facts must be distinguished from independent establishment, and source metadata must be explicit');
assert(css.includes('v29.15 final Deal Intelligence presentation repair')&&css.includes('grid-template-columns:repeat(3,minmax(0,1fr))')&&css.includes('.fact-meta{display:grid'),'evidence UI must not clip source labels');
assert(server.includes('canShowArv=Boolean')&&server.includes('readyForAnalysis=Boolean(enoughIdentity&&canShowArv)'),'deterministic ARV display must be separate from stricter AI synthesis gate');
assert(sources.includes("needFacts:true,needComps:true")&&sources.includes("passLabel:'subject-independent-property-and-public-record-sources'")&&sources.includes("passLabel:'sold-comps-independent-corroboration'")&&sources.includes("!compAnalysis.valuationReady"),'research must be adaptive, multi-source, public-record aware, and keep improving a working range toward precision');
assert(cache.includes("v29.15-complete-intelligence-r5"),'old incomplete research cache must be invalidated');
console.log('v29.15 complete Deal Intelligence regression passed');
