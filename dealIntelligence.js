function num(v){const n=Number(v);return Number.isFinite(n)&&n>0?n:null}
function daysSince(v){const t=new Date(v).getTime();return Number.isFinite(t)?Math.max(0,(Date.now()-t)/86400000):null}
function clamp(n,a,b){return Math.max(a,Math.min(b,n))}
function similarity(subject,c){let score=100;const reasons=[];const dist=num(c.distanceMiles);if(dist!=null){score-=Math.min(35,dist*14);if(dist>2)reasons.push('farther away')}else{score-=8;reasons.push('distance missing')}
 const age=daysSince(c.saleDate);if(age!=null){score-=Math.min(35,age/365*14);if(age>365)reasons.push('older sale')}else{score-=12;reasons.push('sale date missing')}
 const ss=num(subject.squareFootage),cs=num(c.squareFootage);if(ss&&cs){const delta=Math.abs(cs-ss)/ss;score-=Math.min(28,delta*55);if(delta>.25)reasons.push('size differs')}else{score-=7}
 if(subject.propertyType&&c.propertyType&&String(subject.propertyType).toLowerCase()!==String(c.propertyType).toLowerCase()){score-=24;reasons.push('property type differs')}
 const sb=num(subject.bedrooms),cb=num(c.bedrooms);if(sb&&cb)score-=Math.min(10,Math.abs(sb-cb)*4)
 const sba=num(subject.bathrooms),cba=num(c.bathrooms);if(sba&&cba)score-=Math.min(8,Math.abs(sba-cba)*4)
 const sy=num(subject.yearBuilt),cy=num(c.yearBuilt);if(sy&&cy)score-=Math.min(8,Math.abs(sy-cy)/10*2)
 return {score:Math.round(clamp(score,0,100)),reasons}}
function analyzeComps(subject={},raw=[]){const seen=new Set();let comps=raw.map((c,i)=>{const price=num(c.salePrice||c.price);if(!price)return null;const key=(String(c.address||'').trim().toLowerCase()+'|'+price+'|'+String(c.saleDate||''));if(seen.has(key))return null;seen.add(key);const sim=similarity(subject,c);return {...c,index:i,salePrice:price,similarity:sim.score,reasons:sim.reasons,weight:Math.max(.05,sim.score/100)**2}}).filter(Boolean);
 if(comps.length>=3){const prices=comps.map(c=>c.salePrice).sort((a,b)=>a-b);const med=prices[Math.floor(prices.length/2)];comps=comps.map(c=>{const ratio=c.salePrice/med;if(ratio<.55||ratio>1.8)return {...c,outlier:true,weight:c.weight*.12,reasons:[...c.reasons,'price outlier']};return c})}
 comps.sort((a,b)=>b.similarity-a.similarity);const usable=comps.filter(c=>!c.outlier&&c.similarity>=45).slice(0,8);const pool=usable.length>=2?usable:comps.filter(c=>!c.outlier).slice(0,5);let estimate=null,low=null,high=null;if(pool.length){const w=pool.reduce((a,c)=>a+c.weight,0);estimate=Math.round(pool.reduce((a,c)=>a+c.salePrice*c.weight,0)/w);const vals=pool.map(c=>c.salePrice).sort((a,b)=>a-b);low=vals[0];high=vals[vals.length-1]}
 const confidence=pool.length>=4&&pool.filter(c=>c.similarity>=70).length>=3?'High':pool.length>=2?'Moderate':'Low';return {estimate,low,high,confidence,selected:pool.map(c=>({...c,included:true})),reviewed:comps.length,rejected:comps.filter(c=>c.outlier||c.similarity<45).length,method:'Similarity-weighted verified sold comps',generatedAt:new Date().toISOString(),warnings:[...(pool.length<3?['Fewer than three credible sold comps were supplied.']:[]),...(comps.some(c=>c.outlier)?['Price outliers were heavily discounted or excluded.']:[])]}}
module.exports={analyzeComps,_similarity:similarity};
