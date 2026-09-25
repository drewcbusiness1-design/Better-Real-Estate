const RENTCAST_API_KEY = process.env.RENTCAST_API_KEY || '';
function configured(){ return !!RENTCAST_API_KEY; }
async function rc(path, params={}){
  if(!configured()) throw new Error('Property intelligence is not configured. Add RENTCAST_API_KEY in Netlify.');
  const q=new URLSearchParams(); Object.entries(params).forEach(([k,v])=>{ if(v!==undefined&&v!==null&&v!=='') q.set(k,String(v)); });
  const r=await fetch('https://api.rentcast.io/v1'+path+'?'+q.toString(),{headers:{Accept:'application/json','X-Api-Key':RENTCAST_API_KEY}});
  const d=await r.json().catch(()=>({})); if(!r.ok) throw new Error(d.message||d.error||`Property data request failed (${r.status}).`); return d;
}
function rehabScenarios(sqft, year){
  const sf=Math.max(500,Number(sqft)||1200); const age=year?Math.max(0,new Date().getFullYear()-Number(year)):40; const ageAdj=age>80?1.12:age>50?1.06:1;
  return [
    {key:'light',label:'Light cosmetic',perSqFt:Math.round(18*ageAdj),estimate:Math.round(sf*18*ageAdj),scope:'Paint, fixtures, flooring touch-ups and minor punch-list work.'},
    {key:'medium',label:'Moderate renovation',perSqFt:Math.round(42*ageAdj),estimate:Math.round(sf*42*ageAdj),scope:'Broader finishes plus typical kitchen/bath and system allowances.'},
    {key:'heavy',label:'Heavy / full renovation',perSqFt:Math.round(78*ageAdj),estimate:Math.round(sf*78*ageAdj),scope:'Major interior renovation with larger mechanical/structural contingency.'}
  ];
}
async function analyze(address){
  const [avm, records, rent] = await Promise.all([
    rc('/avm/value',{address,compCount:10,lookupSubjectAttributes:true}),
    rc('/properties',{address,limit:1}),
    rc('/avm/rent/long-term',{address,compCount:5,lookupSubjectAttributes:true}).catch(()=>null)
  ]);
  const record=Array.isArray(records)?records[0]||{}:{}; const subject={...(avm.subjectProperty||{}),...record};
  return { provider:'RentCast', generatedAt:new Date().toISOString(), subject, arv:{estimate:avm.price||null,low:avm.priceRangeLow||null,high:avm.priceRangeHigh||null}, rent:rent?{estimate:rent.rent||rent.price||null,low:rent.rentRangeLow||rent.priceRangeLow||null,high:rent.rentRangeHigh||rent.priceRangeHigh||null}:null, comparables:(avm.comparables||[]).slice(0,10), rehab:rehabScenarios(subject.squareFootage,subject.yearBuilt) };
}
module.exports={configured,analyze,rehabScenarios};
