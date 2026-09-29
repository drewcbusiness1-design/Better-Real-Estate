/* Shared Deal Intelligence cache helpers for Express + Netlify background research. */
const crypto=require('crypto');
const {sql,tableFor,FILE_MODE,loadDB,saveDB}=require('./store');
const ds=require('./dealSources');
const VERSION='v29.15-perfect-multisource-r4';
const TTL_MS=24*60*60*1000;
const MIN_REFRESH_MS=30*60*1000;
function key(address){return `${VERSION}:${ds.cacheKey(address)}`}
function fingerprint(evidence){const compact={subject:evidence?.subject||{},fieldEvidence:evidence?.fieldEvidence||{},auxiliaryFacts:evidence?.auxiliaryFacts||{},identity:evidence?.identity||{},conflicts:evidence?.conflicts||[],conditionEvidence:evidence?.conditionEvidence||[],rehabAnalysis:evidence?.rehabAnalysis||null,comps:(evidence?.comps||[]).map(c=>({address:c.address,salePrice:c.salePrice,saleDate:c.saleDate,distanceMiles:c.distanceMiles,squareFootage:c.squareFootage,bedrooms:c.bedrooms,bathrooms:c.bathrooms,yearBuilt:c.yearBuilt,propertyType:c.propertyType,source:c.source,sourceKey:c.sourceKey}))};return crypto.createHash('sha256').update(JSON.stringify(compact)).digest('hex')}
async function persistEvidence(address,evidence,{synthesis=null,synthesisFailure=null}={}){
  const researchKey=key(address),retrievedAt=evidence?.retrievedAt||new Date().toISOString();
  if(sql&&!FILE_MODE){
    const t=tableFor('dealResearchCache');
    const rows=await sql(`SELECT id,data FROM ${t} WHERE data->>'key' = $1 LIMIT 1`,[researchKey]);
    const prior=rows?.[0]?.data||{},id=rows?.[0]?.id||crypto.randomUUID();
    const row={...prior,id:prior.id||id,key:researchKey,address,retrievedAt,evidence:JSON.parse(JSON.stringify(evidence))};if(synthesis)row.synthesis=JSON.parse(JSON.stringify(synthesis));if(synthesisFailure)row.synthesisFailure=JSON.parse(JSON.stringify(synthesisFailure));else if(synthesis)delete row.synthesisFailure;
    await sql(`INSERT INTO ${t} (id,data,updated_at) VALUES ($1,$2,now()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`,[id,JSON.stringify(row)]);
    return row;
  }
  const db=await loadDB();db.dealResearchCache=db.dealResearchCache||[];let row=db.dealResearchCache.find(x=>x.key===researchKey);
  const next={id:row?.id||crypto.randomUUID(),...(row||{}),key:researchKey,address,retrievedAt,evidence:JSON.parse(JSON.stringify(evidence))};if(synthesis)next.synthesis=JSON.parse(JSON.stringify(synthesis));if(synthesisFailure)next.synthesisFailure=JSON.parse(JSON.stringify(synthesisFailure));else if(synthesis)delete next.synthesisFailure;
  if(row)Object.assign(row,next);else db.dealResearchCache.push(next);await saveDB(db);return next;
}
module.exports={VERSION,TTL_MS,MIN_REFRESH_MS,key,persistEvidence,fingerprint};
