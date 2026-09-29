/* Better Real Estate Deal Intelligence background-job state.
   Uses the already-approved @netlify/blobs dependency in production so long-running
   research can survive beyond the originating browser request without adding a provider.
*/
const crypto = require('crypto');
let getStore = null;
try { ({ getStore } = require('@netlify/blobs')); } catch {}

const STORE_NAME = 'bre-deal-research-jobs';
const memory = new Map();
const isNetlify = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
function store(){
  if(!isNetlify || !getStore) return null;
  try { return getStore(STORE_NAME); } catch { return null; }
}
function jobKey(id){ return `job:${id}`; }
function lockKey(userId,researchKey){ return `lock:${crypto.createHash('sha256').update(`${userId}|${researchKey}`).digest('hex')}`; }
async function getJSON(key){ const s=store(); if(s){try{return await s.get(key,{type:'json',consistency:'strong'})}catch{return null}} return memory.get(key)||null; }
async function setJSON(key,value){ const s=store(); if(s){await s.setJSON(key,value);return value} memory.set(key,JSON.parse(JSON.stringify(value)));return value; }
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
