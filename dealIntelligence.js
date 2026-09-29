function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
function daysSince(v){const t=new Date(v).getTime();return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):null}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function normType(v){const s=String(v||'').toLowerCase();if(/single.*family|detached|sfr/.test(s))return'single family';if(/multi.*family|duplex|triplex|fourplex/.test(s))return'multi family';if(/condo/.test(s))return'condo';if(/town/.test(s))return'townhouse';if(/mobile|manufactured/.test(s))return'mobile home';if(/land|vacant/.test(s))return'land';if(/commercial/.test(s))return'commercial';return s.trim()}
function canonicalAddress(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function similarity(subject,c){
  let score=100;const reasons=[];const dist=num(c.distanceMiles);if(dist!=null){score-=Math.min(40,dist*15);if(dist>1.5)reasons.push('farther away');if(dist>5){score-=25;reasons.push('outside 5-mile comp radius')}}else{score-=18;reasons.push('distance not independently verified')}
  const age=daysSince(c.saleDate);if(age!=null){score-=Math.min(40,age/365*15);if(age>365)reasons.push('older sale');if(age>1095){score-=25;reasons.push('sale older than 3 years')}}else{score-=30;reasons.push('sale date missing')}
  const ss=num(subject.squareFootage),cs=num(c.squareFootage);if(ss&&cs){const delta=Math.abs(cs-ss)/ss;score-=Math.min(30,delta*60);if(delta>.25)reasons.push('size differs materially')}else{score-=8;reasons.push('size comparison incomplete')}
  const st=normType(subject.propertyType),ct=normType(c.propertyType);if(st&&ct&&st!==ct){score-=28;reasons.push('property type differs')}
  const sb=num(subject.bedrooms),cb=num(c.bedrooms);if(sb&&cb){const d=Math.abs(sb-cb);score-=Math.min(12,d*5);if(d>=2)reasons.push('bed count differs')}
  const sba=num(subject.bathrooms),cba=num(c.bathrooms);if(sba&&cba){const d=Math.abs(sba-cba);score-=Math.min(10,d*4);if(d>=1.5)reasons.push('bath count differs')}
  const sy=num(subject.yearBuilt),cy=num(c.yearBuilt);if(sy&&cy){const d=Math.abs(sy-cy);score-=Math.min(10,d/10*2);if(d>30)reasons.push('age differs')}
  return {score:Math.round(clamp(score,0,100)),reasons,ageDays:age,distanceMiles:dist}
}
function adjustedSalePrice(subject,c){const sale=num(c.salePrice||c.price);if(!sale)return null;const ss=num(subject.squareFootage),cs=num(c.squareFootage);if(!ss||!cs||Math.abs(ss-cs)/ss<.03)return Math.round(sale);const ppsf=sale/cs,raw=(ss-cs)*ppsf*.35,cap=sale*.15,adj=clamp(raw,-cap,cap);return Math.round(sale+adj)}
function analyzeComps(subject={},raw=[]){
  const seen=new Map();let comps=[];
  for(let i=0;i<(raw||[]).length;i++){
    const c=raw[i]||{},price=num(c.salePrice||c.price);if(!price||!c.address)continue;
    const key=`${canonicalAddress(c.address)}|${Math.round(price)}|${String(c.saleDate||'').slice(0,10)}`;
    if(seen.has(key)){const prior=seen.get(key);prior.corroboratingSources=[...new Set([...(prior.corroboratingSources||[prior.source]),c.source].filter(Boolean))];continue}
    const sim=similarity(subject,c),adjusted=adjustedSalePrice(subject,{...c,salePrice:price});const row={...c,index:i,salePrice:price,adjustedSalePrice:adjusted,similarity:sim.score,reasons:sim.reasons,ageDays:sim.ageDays,distanceVerified:sim.distanceMiles!=null,weight:Math.max(.05,sim.score/100)**2};seen.set(key,row);comps.push(row)
  }
  if(comps.length>=3){const prices=comps.map(c=>c.salePrice).sort((a,b)=>a-b),med=prices[Math.floor(prices.length/2)];comps=comps.map(c=>{const ratio=c.salePrice/med;if(ratio<.55||ratio>1.8)return {...c,outlier:true,weight:c.weight*.08,reasons:[...c.reasons,'price outlier']};return c})}
  comps=comps.map(c=>{const stale=c.ageDays==null||c.ageDays>1095,tooFar=c.distanceVerified&&Number(c.distanceMiles)>5,typeMismatch=normType(subject.propertyType)&&normType(c.propertyType)&&normType(subject.propertyType)!==normType(c.propertyType);return {...c,hardRejected:Boolean(stale||tooFar||typeMismatch),reasons:[...c.reasons,...(stale?['stale/undated sale']:[]),...(tooFar?['too far away']:[]),...(typeMismatch?['non-comparable property type']:[])]}}).sort((a,b)=>b.similarity-a.similarity);
  const selected=comps.filter(c=>!c.outlier&&!c.hardRejected&&c.similarity>=55).slice(0,8);
  const distanceVerifiedCount=selected.filter(c=>c.distanceVerified).length,recentCount=selected.filter(c=>c.ageDays!=null&&c.ageDays<=548).length,strong=selected.filter(c=>c.distanceVerified&&Number(c.distanceMiles)<=1.5&&c.ageDays!=null&&c.ageDays<=365&&c.similarity>=80);
  const valuationReady=(selected.length>=3&&distanceVerifiedCount>=2&&recentCount>=2)||strong.length>=2;
  let estimate=null,low=null,high=null;
  if(valuationReady){const w=selected.reduce((a,c)=>a+c.weight,0);estimate=Math.round(selected.reduce((a,c)=>a+(c.adjustedSalePrice||c.salePrice)*c.weight,0)/w);const vals=selected.map(c=>c.adjustedSalePrice||c.salePrice).sort((a,b)=>a-b);low=vals[Math.max(0,Math.floor((vals.length-1)*.15))];high=vals[Math.min(vals.length-1,Math.ceil((vals.length-1)*.85))]}
  const confidence=valuationReady?(selected.length>=4&&distanceVerifiedCount>=3&&recentCount>=3?'High':'Moderate'):'Low';
  const warnings=[];if(selected.length<3)warnings.push('Fewer than three usable closed sales survived comp screening.');if(distanceVerifiedCount<2)warnings.push('Too few selected comps have independently established distance.');if(recentCount<2)warnings.push('Too few selected comps closed within the preferred 18-month window.');if(comps.some(c=>c.outlier))warnings.push('Price outliers were excluded.');if(comps.some(c=>c.hardRejected))warnings.push('Stale, distant, undated, or property-type-mismatched sales were rejected.');
  return {estimate,low,high,confidence,valuationReady,selected:selected.map(c=>({...c,included:true})),reviewed:comps.length,rejected:comps.filter(c=>c.outlier||c.hardRejected||c.similarity<55).length,distanceVerifiedCount,recentCount,strongCount:strong.length,method:'Evidence-gated similarity-weighted closed-sale comps with capped living-area adjustment',generatedAt:new Date().toISOString(),warnings};
}
module.exports={analyzeComps,_similarity:similarity,_adjustedSalePrice:adjustedSalePrice};
