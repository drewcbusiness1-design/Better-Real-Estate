/* Better Real Estate Deal Intelligence background-job state.
   Production state is stored in the existing Better Real Estate Postgres data layer
   so the API function, background worker, and polling requests share one durable source.
   Local tests/dev use in-process memory when no database is configured.
*/
const crypto = require('crypto');
const { sql, init, tableFor, FILE_MODE } = require('./store');

const COLLECTION = 'dealResearchJobs';
const memory = new Map();
function jobKey(id){ return `job:${id}`; }
function lockKey(userId,researchKey){ return `lock:${crypto.createHash('sha256').update(`${userId}|${researchKey}`).digest('hex')}`; }

async function getJSON(key){
  if(sql && !FILE_MODE){
    await init();
    const rows = await sql(`SELECT data FROM ${tableFor(COLLECTION)} WHERE id = $1 LIMIT 1`, [key]);
    return rows?.[0]?.data || null;
  }
  return memory.get(key) || null;
}
async function setJSON(key,value){
  const clean = JSON.parse(JSON.stringify(value));
  if(sql && !FILE_MODE){
    await init();
    await sql(`INSERT INTO ${tableFor(COLLECTION)} (id,data,updated_at) VALUES ($1,$2,now()) ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()`, [key, JSON.stringify(clean)]);
    return clean;
  }
  memory.set(key, clean);
  return clean;
}
async function getJob(id){ return getJSON(jobKey(id)); }
async function saveJob(job){ job.updatedAt=new Date().toISOString(); await setJSON(jobKey(job.id),job); return job; }
async function startOrReuse({userId,address,researchKey,cacheVersion,forceRefresh=false}){
  const lk=lockKey(userId,researchKey), priorLock=await getJSON(lk);
  if(priorLock?.jobId){
    const prior=await getJob(priorLock.jobId);
    if(prior && ['queued','running'].includes(prior.status)) return {...prior,reused:true};
  }
  const job={id:crypto.randomUUID(),userId,address,researchKey,cacheVersion,forceRefresh,status:'queued',phase:'queued',progress:2,message:'Research queued.',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),runToken:crypto.randomBytes(32).toString('hex'),statusToken:crypto.randomBytes(24).toString('hex'),attempt:0,error:null,evidence:null};
  await saveJob(job); await setJSON(lk,{jobId:job.id,createdAt:job.createdAt}); return job;
}
async function authorizedJob(id,token,kind='status'){
  const job=await getJob(id); if(!job)return null;
  const expected=kind==='run'?job.runToken:job.statusToken;
  if(!token||!expected)return null;const a=Buffer.from(String(token)),b=Buffer.from(String(expected));if(a.length!==b.length||!crypto.timingSafeEqual(a,b))return null;
  return job;
}
async function updateJob(id,patch){ const job=await getJob(id); if(!job)return null; Object.assign(job,patch||{}); return saveJob(job); }
function publicJob(job){ if(!job)return null; const {runToken,statusToken,...safe}=job; return safe; }
module.exports={startOrReuse,getJob,authorizedJob,updateJob,saveJob,publicJob};
