'use strict';
const land=v=>/\bland\b|vacant\s+lot|unimproved|acreage/i.test(String(v||''));
function context(ev={},requested=false){
 const fe=ev.fieldEvidence?.propertyType||{},resolved=ev.subject?.propertyType,conflict=String(fe.status||'').includes('conflict'),resolvedLand=land(resolved),resolvedBuilding=!!resolved&&!resolvedLand;
 // Raw provider claims cannot override the resolved subject or decide its type.
 const active=resolvedLand||(!resolvedBuilding&&requested);
 return {active,verified:resolvedLand&&!conflict,requested:!!requested,rejectedRequest:!!requested&&resolvedBuilding};
}
function repairs(){return {recommendedKey:'none',scenarios:[{key:'none',label:'No building repairs / Not applicable',estimate:0,perSqFt:0,scope:'Vacant land has no house-renovation allowance. Enter any clearing, access, utilities or site-work budget separately.'}],basis:'Land mode; no building size, age or residential renovation assumptions are used.',confidence:'Not applicable',disclaimer:'Zero is a building-repair allowance, not a claim that land needs no work. Verify site conditions and obtain actual quotes.'};}
function withheld(raw=[]){return {estimate:null,low:null,high:null,workingEstimate:null,workingLow:null,workingHigh:null,valuationReady:false,indicativeReady:false,precision:'withheld',confidence:'Low',selected:[],excluded:raw.map(c=>({...c,included:false,reasons:[land(c.propertyType)?'Land sale requires parcel size, zoning, access, utilities and use comparability before valuation.':'Residential or unclassified sale cannot establish land value.']})),reviewed:raw.length,rejected:raw.length,distanceVerifiedCount:0,recentCount:0,sourceDiversity:0,strongCount:0,usableWorkingCount:0,method:'Land valuation withheld; residential ARV and the 70% rule do not apply.',warnings:['Land value requires verified parcel identity and comparable land sales, including size, zoning, access, utilities and restrictions. Better does not yet establish all of these inputs.']};}
function finalize(a,ev,ctx){a.landMode=true;a.landReport=report(ev,ctx);a.landTypeVerified=ctx.verified;a.subject={...a.subject,bedrooms:null,bathrooms:null,squareFootage:null,yearBuilt:null};a.rehab=repairs().scenarios;a.recommendedRehabKey='none';a.rehabBasis=repairs().basis;a.arv={estimate:null,low:null,high:null,precision:'withheld'};a.comparables=[];a.confidence='Low';a.arvMethod=withheld().method;a.description=ctx.verified?'Sources identify this property as land. Building repairs, residential ARV and the residential 70% formula are not applicable. Review parcel evidence and supporting sources.':'Land mode was selected or land-related evidence was found, but the property type still needs confirmation. Resolve any conflicting parcel or building evidence before relying on an analysis.';a.warnings=[a.description,...withheld().warnings];return a;}
function positive(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)&&n>0?n:null;}
function established(f){return !!f&&['verified','corroborated'].includes(f.status)&&f.value!==null&&f.value!==undefined;}
function report(ev,ctx,now=Date.now()){
 const aux=ev.auxiliaryFacts||{},facts={};
 for(const field of ['lotSizeSqFt','parcelNumber','zoning','roadAccess','utilities','floodZone','annualTaxes','assessedValue','lastSalePrice','lastSaleDate','currentListPrice']){
  const f=aux[field]||ev.fieldEvidence?.[field]||{},conflict=String(f.status||'').includes('conflict');
  facts[field]={value:conflict?null:f.value??f.recordedValue??null,status:conflict?'conflicting':f.status||'missing',sources:f.raw||f.sources||[],alternatives:f.alternatives||[]};
 }
 const size=positive(facts.lotSizeSqFt.value),acres=size?size/43560:null;
 const identity=!!ev.identity?.addressMatched,missing=[];
 if(!identity)missing.push('Exact parcel identity');if(!ctx.verified)missing.push('Resolved land property type');
 for(const [field,label]of [['parcelNumber','Cross-source parcel number'],['lotSizeSqFt','Cross-source parcel size'],['zoning','Cross-source zoning'],['roadAccess','Cross-source road access'],['utilities','Cross-source utility availability']])if(!established(facts[field]))missing.push(label);
 const canon=v=>String(v||'').toLowerCase().replace(/[^a-z0-9]/g,''),seen=new Set(),excluded=[],sales=[];
 for(const c of [...(ev.comps||[])].sort((a,b)=>new Date(b.saleDate)-new Date(a.saleDate))){const reasons=[],price=positive(c.salePrice),sqft=positive(c.lotSizeSqFt??c.lotSize),days=(now-new Date(c.saleDate).getTime())/86400000,distance=c.distanceMiles===null||c.distanceMiles===undefined||c.distanceMiles===''?null:Number(c.distanceMiles),key=canon(c.address||c.listingKey);
  if(!land(c.propertyType))reasons.push('Not identified as a land sale');if(!price)reasons.push('Closed sale price missing');if(!Number.isFinite(days)||days<0||days>730)reasons.push('Sale date missing, future or older than 24 months');
  if(!sqft)reasons.push('Comparable parcel size missing');if(!Number.isFinite(distance)||distance<0||distance>10)reasons.push('Distance missing or beyond 10 miles');if(c.distressed)reasons.push('Distressed sale');if(!c.sourceUrl&&c.sourceKind!=='authorized_mls')reasons.push('Source provenance missing');if(!key||seen.has(key))reasons.push('Duplicate or missing parcel address');
  if(canon(c.address)===canon(ev.subject?.address||ev.subject?.formattedAddress))reasons.push('Subject parcel is not its own comparable');
  if(size&&sqft&&(sqft/size<.5||sqft/size>2))reasons.push('Parcel size outside one-half to twice subject size');
  if((ev.comps||[]).some(other=>other!==c&&canon(other.address)===key&&String(other.saleDate).slice(0,10)===String(c.saleDate).slice(0,10)&&Number(other.salePrice)!==Number(c.salePrice)))reasons.push('Conflicting closed-sale prices for the same parcel and date');
  if(c.landConflicts?.length)reasons.push('Conflicting comparable parcel fields: '+c.landConflicts.join(', '));
  if(reasons.length){excluded.push({...c,reasons});continue;}seen.add(key);
  const eligibility=[];for(const field of ['zoning','roadAccess','utilities'])if(!c[field]||!facts[field].value||canon(c[field])!==canon(facts[field].value))eligibility.push(field+' not established as comparable');
  sales.push({...c,lotSizeSqFt:sqft,acres:sqft/43560,pricePerAcre:price/(sqft/43560),valuationEligible:eligibility.length===0,valuationIssues:eligibility});
 }
 const candidates=sales.filter(c=>c.valuationEligible),median=xs=>{const a=[...xs].sort((a,b)=>a-b),m=Math.floor(a.length/2);return a.length?(a.length%2?a[m]:(a[m-1]+a[m])/2):null;},center=median(candidates.map(c=>c.pricePerAcre));
 const accepted=candidates.filter(c=>!center||c.pricePerAcre>=center/3&&c.pricePerAcre<=center*3);
 for(const c of candidates)if(!accepted.includes(c)){c.valuationEligible=false;c.valuationIssues.push('Unit price is an outlier relative to the candidate median');}
 const sources=new Set(accepted.map(c=>c.sourceFamily||c.sourceKey||c.source));
 if(accepted.length<3)missing.push('At least three comparable closed land sales');if(sources.size<2)missing.push('At least two independent comparable-source families');
 const ready=!missing.length&&acres>0,range=ready?{low:Math.round(Math.min(...accepted.map(c=>c.pricePerAcre))*acres),high:Math.round(Math.max(...accepted.map(c=>c.pricePerAcre))*acres),estimate:Math.round(median(accepted.map(c=>c.pricePerAcre))*acres),confidence:'Moderate',method:'Observed comparable land price per acre × subject acres; no development profit, residential ARV or buildability assumption.'}:null;
 const price=positive(facts.currentListPrice.value),tax=positive(facts.annualTaxes.value);
 return {facts,acres,range,sales,excluded,missing,metrics:{askingPrice:price,askingPerAcre:price&&acres?price/acres:null,annualTaxes:tax,monthlyTaxEquivalent:tax?tax/12:null,observedMedianPerAcre:median(sales.map(c=>c.pricePerAcre))},notice:'Closed-sale unit prices describe those parcels. They are not a subject valuation unless parcel size, zoning, access and utilities are established and comparable. Assessed value is not market value. Buildability, title, flood risk, wetlands, easements and utility capacity require independent due diligence.'};
}

module.exports={land,context,repairs,withheld,finalize,report};
