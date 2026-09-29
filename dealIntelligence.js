function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
function daysSince(v){const t=new Date(v).getTime();return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):null}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function normType(v){const s=String(v||'').toLowerCase();if(/single.*family|detached|sfr/.test(s))return'single family';if(/multi.*family|duplex|triplex|fourplex/.test(s))return'multi family';if(/condo/.test(s))return'condo';if(/town/.test(s))return'townhouse';if(/mobile|manufactured/.test(s))return'mobile home';if(/land|vacant/.test(s))return'land';if(/commercial/.test(s))return'commercial';return s.trim()}
function canonicalAddress(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function sourceFamily(v){const s=String(v||'').toLowerCase();if(/zillow\.com|trulia\.com|zillow-group/.test(s))return'portal:zillow-group';if(/realtor\.com/.test(s))return'portal:realtor';if(/redfin\.com/.test(s))return'portal:redfin';if(/homes\.com/.test(s))return'portal:homes';return s||'unknown'}
function similarity(subject,c){
  let score=100;const reasons=[];const dist=num(c.distanceMiles);if(dist!=null){score-=Math.min(40,dist*15);if(dist>1.5)reasons.push('farther away');if(dist>5){score-=25;reasons.push('outside 5-mile comp radius')}}else{score-=18;reasons.push('distance not independently established')}
  const age=daysSince(c.saleDate);if(age!=null){score-=Math.min(40,age/365*15);if(age>365)reasons.push('older sale');if(age>1095){score-=25;reasons.push('sale older than 3 years')}}else{score-=30;reasons.push('sale date missing')}
  const ss=num(subject.squareFootage),cs=num(c.squareFootage);if(ss&&cs){const delta=Math.abs(cs-ss)/ss;score-=Math.min(30,delta*60);if(delta>.25)reasons.push('size differs materially')}else{score-=8;reasons.push('size comparison incomplete')}
  const st=normType(subject.propertyType),ct=normType(c.propertyType);if(st&&ct&&st!==ct){score-=28;reasons.push('property type differs')}
  const sb=num(subject.bedrooms),cb=num(c.bedrooms);if(sb&&cb){const d=Math.abs(sb-cb);score-=Math.min(12,d*5);if(d>=2)reasons.push('bed count differs')}
  const sba=num(subject.bathrooms),cba=num(c.bathrooms);if(sba&&cba){const d=Math.abs(sba-cba);score-=Math.min(10,d*4);if(d>=1.5)reasons.push('bath count differs')}
  const sy=num(subject.yearBuilt),cy=num(c.yearBuilt);if(sy&&cy){const d=Math.abs(sy-cy);score-=Math.min(10,d/10*2);if(d>30)reasons.push('age differs')}
  if(c.distressed===true){score-=30;reasons.push('distressed/as-is sale')}
  return {score:Math.round(clamp(score,0,100)),reasons,ageDays:age,distanceMiles:dist}
}
function adjustedSalePrice(subject,c){const sale=num(c.salePrice||c.price);if(!sale)return null;const ss=num(subject.squareFootage),cs=num(c.squareFootage);if(!ss||!cs||Math.abs(ss-cs)/ss<.03)return Math.round(sale);const ppsf=sale/cs,raw=(ss-cs)*ppsf*.35,cap=sale*.15,adj=clamp(raw,-cap,cap);return Math.round(sale+adj)}
function analyzeComps(subject={},raw=[]){
  const seen=new Map();let comps=[];
  for(let i=0;i<(raw||[]).length;i++){
    const c=raw[i]||{},price=num(c.salePrice||c.price);if(!price||!c.address)continue;
    const key=`${canonicalAddress(c.address)}|${Math.round(price)}|${String(c.saleDate||'').slice(0,10)}`;
    if(seen.has(key)){const prior=seen.get(key);prior.corroboratingSources=[...new Set([...(prior.corroboratingSources||[prior.source]),c.source].filter(Boolean))];prior.corroboratingSourceFamilies=[...new Set([...(prior.corroboratingSourceFamilies||[prior.sourceFamily||sourceFamily(prior.sourceKey||prior.source)]),c.sourceFamily||sourceFamily(c.sourceKey||c.source)].filter(Boolean))];if(prior.distanceMiles==null&&c.distanceMiles!=null){prior.distanceMiles=c.distanceMiles;prior.distanceVerification=c.distanceVerification||prior.distanceVerification}if(c.distressed===true)prior.distressed=true;continue}
    const sim=similarity(subject,c),adjusted=adjustedSalePrice(subject,{...c,salePrice:price}),fam=c.sourceFamily||sourceFamily(c.sourceKey||c.source);const row={...c,sourceFamily:fam,corroboratingSourceFamilies:[...new Set([...(c.corroboratingSourceFamilies||[]),fam].filter(Boolean))],index:i,salePrice:price,adjustedSalePrice:adjusted,similarity:sim.score,reasons:sim.reasons,ageDays:sim.ageDays,distanceVerified:sim.distanceMiles!=null,weight:Math.max(.05,sim.score/100)**2};seen.set(key,row);comps.push(row)
  }
  if(comps.length>=3){const prices=comps.filter(c=>c.distressed!==true).map(c=>c.salePrice).sort((a,b)=>a-b),med=prices.length?prices[Math.floor(prices.length/2)]:null;comps=comps.map(c=>{if(!med)return c;const ratio=c.salePrice/med;if(ratio<.55||ratio>1.8)return {...c,outlier:true,weight:c.weight*.08,reasons:[...c.reasons,'price outlier']};return c})}
  comps=comps.map(c=>{const stale=c.ageDays==null||c.ageDays>1095,tooFar=c.distanceVerified&&Number(c.distanceMiles)>5,typeMismatch=normType(subject.propertyType)&&normType(c.propertyType)&&normType(subject.propertyType)!==normType(c.propertyType),distressed=c.distressed===true;return {...c,hardRejected:Boolean(stale||tooFar||typeMismatch||distressed),reasons:[...c.reasons,...(stale?['stale/undated sale']:[]),...(tooFar?['too far away']:[]),...(typeMismatch?['non-comparable property type']:[]),...(distressed?['distressed/as-is sale excluded from ARV']:[])]}}).sort((a,b)=>b.similarity-a.similarity);
  const selected=comps.filter(c=>!c.outlier&&!c.hardRejected&&c.similarity>=55).slice(0,8);
  const distanceVerifiedCount=selected.filter(c=>c.distanceVerified).length,recentCount=selected.filter(c=>c.ageDays!=null&&c.ageDays<=548).length,strong=selected.filter(c=>c.distanceVerified&&Number(c.distanceMiles)<=0.75&&c.ageDays!=null&&c.ageDays<=365&&c.similarity>=75);
  const sourceFamilies=new Set();for(const c of selected){for(const f of c.corroboratingSourceFamilies||[])sourceFamilies.add(sourceFamily(f));if(c.sourceFamily)sourceFamilies.add(sourceFamily(c.sourceFamily));else if(c.sourceKey||c.source)sourceFamilies.add(sourceFamily(c.sourceKey||c.source))}
  sourceFamilies.delete('unknown');const sourceDiversity=sourceFamilies.size||new Set(selected.map(c=>sourceFamily(c.sourceKey||c.source)).filter(x=>x&&x!=='unknown')).size;
  const strongSimilarCount=selected.filter(c=>c.similarity>=65).length;
  const usableWorkingCount=selected.filter(c=>c.similarity>=60).length;
  const valuationReady=(selected.length>=3&&distanceVerifiedCount>=2&&recentCount>=2)||strong.length>=2;
  // A working ARV is intentionally less strict than a precise ARV. Three recent, reasonably
  // similar closed sales may support a LOW-confidence underwriting range even when public-web
  // sources do not expose trustworthy distance. This never unlocks the precise valuation label.
  const indicativeReady=!valuationReady&&selected.length>=3&&recentCount>=2&&usableWorkingCount>=3;
  let workingEstimate=null,workingLow=null,workingHigh=null;
  if(valuationReady||indicativeReady){const w=selected.reduce((a,c)=>a+c.weight,0);workingEstimate=Math.round(selected.reduce((a,c)=>a+(c.adjustedSalePrice||c.salePrice)*c.weight,0)/w);const vals=selected.map(c=>c.adjustedSalePrice||c.salePrice).sort((a,b)=>a-b);workingLow=vals[Math.max(0,Math.floor((vals.length-1)*.15))];workingHigh=vals[Math.min(vals.length-1,Math.ceil((vals.length-1)*.85))]}
  const estimate=valuationReady?workingEstimate:null,low=valuationReady?workingLow:null,high=valuationReady?workingHigh:null;
  const confidence=valuationReady?(selected.length>=4&&distanceVerifiedCount>=3&&recentCount>=3?'High':'Moderate'):indicativeReady?(selected.length>=4&&recentCount>=3&&sourceDiversity>=3?'Moderate':'Low'):'Low';
  const warnings=[];if(selected.length<3)warnings.push(valuationReady&&strong.length>=2?'Precise ARV is supported by the two-strong-comp exception; additional comparable sales would further strengthen confidence.':'Fewer than three usable closed sales survived comp screening.');if(distanceVerifiedCount<2)warnings.push(indicativeReady?'Selected comps support a working ARV range, but too few have independently established distance for a precise ARV.':'Too few selected comps have established distance.');if(recentCount<2)warnings.push('Too few selected comps closed within the preferred 18-month window.');if(sourceDiversity<2&&selected.length)warnings.push('Selected comps are concentrated in one source and need cross-source support.');if(comps.some(c=>c.outlier))warnings.push('Price outliers were excluded.');if(comps.some(c=>c.distressed))warnings.push('Explicitly distressed/as-is sales were excluded from after-repair valuation.');if(comps.some(c=>c.hardRejected&&!c.distressed))warnings.push('Stale, distant, undated, or property-type-mismatched sales were rejected.');
  const method=valuationReady?'Evidence-gated similarity-weighted closed-sale comps with distance support, distressed-sale screening and capped living-area adjustment':indicativeReady?(sourceDiversity>=2?'Cross-source similarity-weighted closed-sale working range; distance support is insufficient for precise ARV':'Similarity-weighted closed-sale working range from one source family; useful for underwriting but not precise until independently corroborated'):'Insufficient closed-sale evidence for a defensible ARV';
  return {estimate,low,high,workingEstimate,workingLow,workingHigh,confidence,valuationReady,indicativeReady,precision:valuationReady?'precise':indicativeReady?'working_range':'withheld',selected:selected.map(c=>({...c,included:true})),reviewed:comps.length,rejected:comps.filter(c=>c.outlier||c.hardRejected||c.similarity<55).length,distanceVerifiedCount,recentCount,sourceDiversity,strongCount:strong.length,usableWorkingCount,method,generatedAt:new Date().toISOString(),warnings};
}
function estimateRehab(subject={},conditionEvidence=[],fieldEvidence={}){
  const recordedSqft=num(fieldEvidence?.squareFootage?.recordedValue),sqft=num(subject.squareFootage)||recordedSqft;
  const recordedYear=num(fieldEvidence?.yearBuilt?.recordedValue),year=num(subject.yearBuilt)||recordedYear;
  const text=(conditionEvidence||[]).map(x=>`${x.summary||''} ${x.evidenceText||''}`).join(' ').toLowerCase();
  let recommendedKey='moderate',conditionBasis='No reliable inspection-level condition evidence was found; moderate planning allowance is the default.';
  if(/full\s+(?:cleanout|rehab|renovation)|gut\s+(?:rehab|renovation)|needs?\s+(?:a\s+)?full\s+(?:rehab|renovation)|major\s+rehab|fire\s+damage|significant\s+water\s+damage|teardown/.test(text)){recommendedKey='heavy';conditionBasis='Exact-address source evidence describes a full/major rehab or equivalent heavy scope.'}
  else if(/fixer|handyman|needs?\s+work|as[- ]is|renovation|rehab|deferred\s+maintenance/.test(text)){recommendedKey='moderate';conditionBasis='Exact-address source evidence describes fixer/rehab/deferred-maintenance condition.'}
  else if(/renovated|updated|move[- ]?in|turnkey|new\s+(?:roof|hvac|kitchen|bath)/.test(text)){recommendedKey='light';conditionBasis='Exact-address source evidence indicates renovated/updated condition; use light planning until inspection confirms.'}
  const ageFactor=year&&year<1940?1.08:year&&year<1970?1.04:year&&year>2010?.92:1;
  const typeFactor=/multi/.test(normType(subject.propertyType))?1.08:/mobile/.test(normType(subject.propertyType))?.88:1;
  const area=sqft||1400;
  const specs=[
    {key:'light',label:'Light / cosmetic',rate:18,lowRate:12,highRate:26,floor:14000,scope:'Paint, flooring, fixtures, punch-list work and limited cosmetic updates.'},
    {key:'moderate',label:'Moderate renovation',rate:40,lowRate:30,highRate:58,floor:30000,scope:'Cosmetics plus meaningful kitchen/bath, mechanical, exterior and deferred-maintenance work.'},
    {key:'heavy',label:'Heavy / full rehab',rate:70,lowRate:55,highRate:98,floor:55000,scope:'Full cleanout/renovation planning with substantial systems, kitchen/bath, interior/exterior and contingency.'}
  ];
  const factor=ageFactor*typeFactor,scenarios=specs.map(x=>{const estimate=Math.round(Math.max(x.floor,area*x.rate*factor)/500)*500,low=Math.round(Math.max(x.floor*.8,area*x.lowRate*factor)/500)*500,high=Math.round(Math.max(x.floor*1.2,area*x.highRate*factor)/500)*500;return {...x,estimate,low,high,perSqFt:Math.round(estimate/area),rate:undefined,lowRate:undefined,highRate:undefined,floor:undefined}}).map(({rate,lowRate,highRate,floor,...x})=>x);
  const sourceCount=new Set((conditionEvidence||[]).map(x=>x.sourceKey||x.source).filter(Boolean)).size;
  return {recommendedKey,scenarios,basis:conditionBasis,squareFootageBasis:sqft||null,squareFootageStatus:subject.squareFootage?'established':recordedSqft?'recorded':'assumed-1400',yearBasis:year||null,conditionSourceCount:sourceCount,confidence:sourceCount>=2&&sqft?'Moderate':sqft?'Planning':'Low',disclaimer:'Planning estimate only — not a contractor bid or inspection. Actual scope, labor, permits and hidden conditions can materially change cost.'};
}
module.exports={analyzeComps,estimateRehab,_similarity:similarity,_adjustedSalePrice:adjustedSalePrice};
