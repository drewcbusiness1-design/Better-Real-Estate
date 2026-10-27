'use strict';
const crypto=require('node:crypto');
const push=require('./nativePush.cjs');
const jobs=require('./dealResearchJobs');
const store=require('./store');
function content(job){
 const status=String(job.status||'running');
 return {progress:status==='complete'?100:Math.min(99,Math.max(0,Number(job.progress)||0)),stage:String(job.message||'Researching property evidence').slice(0,120),status};
}
function payload(job){
 const terminal=['complete','failed'].includes(job.status);
 return {aps:{timestamp:Math.floor(Date.now()/1000),event:terminal?'end':'update','content-state':content(job),...(terminal?{'dismissal-date':Math.floor(Date.now()/1000)+300}:{'stale-date':Math.floor(Date.now()/1000)+120})}};
}
function register(app,{requireAuth,saveDB}){
 app.post('/api/native-live-activities',requireAuth,async(req,res)=>{
  if(!push.configured())return res.status(503).json({error:'Live Activity delivery is not configured.'});
  const job=await jobs.getJob(String(req.body?.jobId||''));
  if(!job||job.userId!==req.user.id)return res.status(404).json({error:'Research job not found.'});
  const token=String(req.body?.token||'').toLowerCase(),environment=req.body?.environment;
  if(!/^[0-9a-f]{64,512}$/.test(token)||!['sandbox','production'].includes(environment))return res.status(400).json({error:'Invalid activity registration.'});
  const id=crypto.createHash('sha256').update(token).digest('hex');
  req.db.nativeLiveActivities=(req.db.nativeLiveActivities||[]).filter(x=>Date.parse(x.expiresAt)>Date.now()&&x.id!==id);
  if(req.db.nativeLiveActivities.filter(x=>x.userId===req.user.id).length>=5)return res.status(429).json({error:'Too many active research activities.'});
  req.db.nativeLiveActivities.push({id,userId:req.user.id,jobId:job.id,token,environment,expiresAt:new Date(Date.now()+8*3600000).toISOString(),lastSentAt:0,lastProgress:-1});
  await saveDB(req.db); await notifyJob(job); res.json({registered:true});
 });
}
async function notifyJob(job,dependencies={}){
 if(!push.configured())return;
 const api=dependencies.store||store,deliver=dependencies.deliver||push.sendLive;
 const db=await api.loadDB();let changed=false;const now=Date.now(),terminal=['complete','failed'].includes(job.status);
 for(const device of [...(db.nativeLiveActivities||[])]){
  if(device.jobId!==job.id||device.userId!==job.userId)continue;
  if(Date.parse(device.expiresAt)<=now){db.nativeLiveActivities=db.nativeLiveActivities.filter(x=>x.id!==device.id);changed=true;continue;}
  if(!terminal&&now-Number(device.lastSentAt||0)<10000)continue;
  let r;try{r=await deliver(device,payload(job));}catch{continue;}
  if((terminal&&r.status===200)||r.status===410||['Unregistered','BadDeviceToken','DeviceTokenNotForTopic'].includes(r.reason))db.nativeLiveActivities=db.nativeLiveActivities.filter(x=>x.id!==device.id);
  else if(r.status===200){device.lastSentAt=now;device.lastProgress=content(job).progress;}
  changed=true;
 }
 if(changed)await api.saveDB(db);
}
async function refreshAll(){
 if(!push.configured())return;
 const db=await store.loadDB();
 for(const id of [...new Set((db.nativeLiveActivities||[]).map(x=>x.jobId))].slice(0,2)){
  const job=await jobs.getJob(id);if(job)await notifyJob(job);
 }
}
module.exports={register,notifyJob,content,payload,refreshAll};
