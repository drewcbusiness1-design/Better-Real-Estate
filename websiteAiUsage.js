'use strict';
// Free website analyses use reservations so parallel jobs cannot exceed two slots.
const crypto=require('node:crypto');
const browsing=require('./dailyBrowsing');
const LIMIT=2,LEASE_MS=30*60*1000;
function state(row,now=Date.now()){
  if(row?.day!==browsing.day(now))return {day:browsing.day(now),completed:[],reservations:[]};
  return {day:row.day,completed:[...new Set(row.completed||[])].slice(0,LIMIT),reservations:(row.reservations||[]).filter(r=>r.expiresAt>now).slice(0,LIMIT)};
}
function usage(row,now=Date.now()){
  const s=state(row,now),used=s.completed.length,reserved=s.reservations.length,remaining=Math.max(0,LIMIT-used-reserved);
  return {unlimited:false,limit:LIMIT,used,reserved,remaining,day:s.day,resetsAt:browsing.resetsAt(now),timezone:browsing.TIMEZONE,label:`${remaining} of 2 free analyses available today${reserved?' · '+reserved+' in progress':''}`};
}
function create(store){
  let tail=Promise.resolve();
  async function read(id){if(store.FILE_MODE)return (await store.loadDB()).websiteAiUsage?.find(r=>r.id===id)||null;await store.init();return (await store.sql('SELECT data FROM kv_websiteaiusage WHERE id=$1',[id]))[0]?.data||null;}
  async function run(id,fn,now){
    for(let n=0;n<12;n++){
      const old=await read(id),s=state(old,now),result=fn(s);
      if(!result.write)return {...result,row:old,usage:usage(old,now)};
      const row={id,...s,revision:(Number(old?.revision)||0)+1};
      if(store.FILE_MODE){const db=await store.loadDB();db.websiteAiUsage=(db.websiteAiUsage||[]).filter(r=>r.id!==id);db.websiteAiUsage.push(row);db.__writeWebsiteAiUsage=true;await store.saveDB(db);return {...result,row,usage:usage(row,now)};}
      const rows=await store.sql(`INSERT INTO kv_websiteaiusage(id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now() WHERE COALESCE((kv_websiteaiusage.data->>'revision')::bigint,0)=$3 RETURNING data`,[id,JSON.stringify(row),Number(old?.revision)||0]);
      if(rows.length)return {...result,row:rows[0].data,usage:usage(rows[0].data,now)};
    }
    const e=new Error('Your analysis allowance changed. Please try again.');e.status=409;throw e;
  }
  function mutate(id,fn,now){if(!store.FILE_MODE)return run(id,fn,now);const next=tail.then(()=>run(id,fn,now));tail=next.catch(()=>{});return next;}
  return {read,
    reserve(id,key,now=Date.now()){return mutate(id,s=>{
      if(s.completed.includes(key))return {allowed:true,completed:true,write:false};
      const old=s.reservations.find(r=>r.key===key);if(old)return {allowed:true,fresh:false,reservation:old,write:false};
      if(s.completed.length+s.reservations.length>=LIMIT)return {allowed:false,write:false};
      const reservation={key,token:crypto.randomUUID(),day:s.day,expiresAt:now+LEASE_MS};s.reservations.push(reservation);
      return {allowed:true,fresh:true,reservation,write:true};
    },now);},
    linkJob(id,reservation,jobId,now=Date.now()){return mutate(id,s=>{const r=s.reservations.find(r=>r.token===reservation?.token);if(!r)return {write:false};r.jobId=jobId;return {write:true};},now);},
    claim(id,reservation,phase,now=Date.now()){return mutate(id,s=>{const r=s.reservations.find(r=>r.token===reservation?.token);if(!r)return {claimed:false,write:false};if(r.processingUntil>now)return {claimed:false,write:false};r.phase=phase;r.processingUntil=now+15*60*1000;return {claimed:true,write:true};},now);},
    unlock(id,reservation,now=Date.now()){return mutate(id,s=>{const r=s.reservations.find(r=>r.token===reservation?.token);if(!r)return {write:false};delete r.processingUntil;delete r.phase;return {write:true};},now);},
    settle(id,reservation,successful,now=Date.now()){return mutate(id,s=>{
      if(s.day!==reservation?.day)return {write:false};
      const r=s.reservations.find(r=>r.token===reservation?.token);if(!r)return {write:false};
      s.reservations=s.reservations.filter(x=>x.token!==r.token);if(successful&&!s.completed.includes(r.key))s.completed.push(r.key);
      return {write:true};
    },now);}
  };
}
module.exports={LIMIT,LEASE_MS,state,usage,create};
