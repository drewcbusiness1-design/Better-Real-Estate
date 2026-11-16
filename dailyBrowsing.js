'use strict';
// One bounded row per account. Conditional writes serialize admission across devices.
const {AsyncLocalStorage}=require('node:async_hooks');
const context=new AsyncLocalStorage();
const LIMIT=30, TIMEZONE='America/New_York';
const website=()=>context.getStore()?.website===true;
function middleware(req,res,next){
  // Preserve the existing native API contract. Browser requests always use website policy.
  const native=/^BetterRealEstate-iOS\//.test(req.get('user-agent')||'')&&!req.get('sec-fetch-site');
  context.run({website:!native},()=>next());
}
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit'});
function day(at=Date.now()){const p=Object.fromEntries(formatter.formatToParts(new Date(at)).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;}
function resetsAt(at=Date.now()){
  const [y,m,d]=day(at).split('-').map(Number),target=Date.UTC(y,m-1,d+1);
  const clock=new Intl.DateTimeFormat('en-GB',{timeZone:TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
  let guess=target;
  for(let n=0;n<3;n++){const p=Object.fromEntries(clock.formatToParts(new Date(guess)).map(p=>[p.type,p.value]));const shown=Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute,+p.second);guess+=target-shown;}
  return new Date(guess).toISOString();
}
function ids(row,at=Date.now()){return row?.day===day(at)&&Array.isArray(row.listingIds)?[...new Set(row.listingIds)].slice(0,LIMIT):[];}
function usage(row,unlimited=false,at=Date.now()){
  const used=ids(row,at).length;
  return {unlimited,limit:unlimited?null:LIMIT,used,remaining:unlimited?null:Math.max(0,LIMIT-used),day:day(at),resetsAt:resetsAt(at),timezone:TIMEZONE};
}
function admitted(db,user,listingId,at=Date.now()){return !!user&&ids((db.browsingUsage||[]).find(r=>r.id===user.id),at).includes(listingId);}
function create(store){
  let tail=Promise.resolve();
  async function read(userId){
    if(store.FILE_MODE)return (await store.loadDB()).browsingUsage?.find(r=>r.id===userId)||null;
    await store.init();return (await store.sql('SELECT data FROM kv_browsingusage WHERE id=$1',[userId]))[0]?.data||null;
  }
  async function run(userId,listingId,at){
    for(let n=0;n<12;n++){
      const old=await read(userId),seen=ids(old,at);
      if(seen.includes(listingId))return {allowed:true,row:old,usage:usage(old,false,at),repeated:true};
      if(seen.length>=LIMIT)return {allowed:false,row:old,usage:usage(old,false,at)};
      const row={id:userId,day:day(at),listingIds:[...seen,listingId],revision:(Number(old?.revision)||0)+1};
      if(store.FILE_MODE){
        const db=await store.loadDB();db.browsingUsage=db.browsingUsage||[];
        const index=db.browsingUsage.findIndex(r=>r.id===userId);if(index<0)db.browsingUsage.push(row);else db.browsingUsage[index]=row;
        db.__writeBrowsingUsage=true;await store.saveDB(db);
        return {allowed:true,row,usage:usage(row,false,at),repeated:false};
      }
      const rows=await store.sql(`INSERT INTO kv_browsingusage(id,data,updated_at) VALUES($1,$2::jsonb,now()) ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data,updated_at=now() WHERE COALESCE((kv_browsingusage.data->>'revision')::bigint,0)=$3 RETURNING data`,[userId,JSON.stringify(row),Number(old?.revision)||0]);
      if(rows.length)return {allowed:true,row:rows[0].data,usage:usage(rows[0].data,false,at),repeated:false};
    }
    const error=new Error('Your browsing allowance changed. Please try again.');error.status=409;throw error;
  }
  return {read,consume(userId,listingId,at=Date.now()){
    if(!userId||typeof listingId!=='string'||!listingId||listingId.length>200)throw new Error('A valid property is required.');
    if(!store.FILE_MODE)return run(userId,listingId,at);
    const result=tail.then(()=>run(userId,listingId,at));tail=result.catch(()=>{});return result;
  }};
}
function bindDB(db){if(context.getStore())context.getStore().db=db;}
const currentDB=()=>context.getStore()?.db;
module.exports={bindDB,currentDB,LIMIT,TIMEZONE,website,middleware,day,resetsAt,ids,usage,admitted,create};
