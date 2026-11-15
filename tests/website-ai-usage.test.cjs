'use strict';
const assert=require('node:assert/strict'),quota=require('../websiteAiUsage');
(async()=>{
 let db={websiteAiUsage:[]};const store={FILE_MODE:true,loadDB:async()=>structuredClone(db),saveDB:async next=>{db=structuredClone(next);}},service=quota.create(store),now=Date.parse('2026-11-15T18:00:00Z');
 const results=await Promise.all(Array.from({length:10},(_,i)=>service.reserve('free','address-'+i,now)));
 assert.equal(results.filter(x=>x.allowed).length,2);let u=quota.usage(await service.read('free'),now);assert.equal(u.used,0);assert.equal(u.reserved,2);assert.equal(u.remaining,0);
 const first=results[0].reservation;assert.equal((await service.reserve('free',first.key,now)).fresh,false);
 assert.equal((await service.claim('free',first,'worker',now)).claimed,true);assert.equal((await service.claim('free',first,'worker',now)).claimed,false);
 await service.settle('free',first,true,now);await service.settle('free',first,true,now);u=quota.usage(await service.read('free'),now);assert.equal(u.used,1);assert.equal(u.reserved,1);
 await service.settle('free',results[1].reservation,false,now);u=quota.usage(await service.read('free'),now);assert.equal(u.used,1);assert.equal(u.remaining,1);
 const replacement=await service.reserve('free','replacement',now);await service.settle('free',replacement.reservation,true,now);assert.equal((await service.reserve('free','third',now)).allowed,false);assert.equal((await service.reserve('free',first.key,now)).completed,true);
 assert.equal((await service.reserve('other','new',now)).allowed,true);
 const tomorrow=Date.parse('2026-11-16T05:00:00Z');assert.equal((await service.reserve('free','tomorrow',tomorrow)).usage.remaining,1);await service.settle('free',first,true,tomorrow);assert.equal(quota.usage(await service.read('free'),tomorrow).used,0);
 const old=await service.reserve('abandoned','old',now);const resumed=await service.reserve('abandoned','old',now+quota.LEASE_MS+1);assert.notEqual(old.reservation.token,resumed.reservation.token);await service.settle('abandoned',old.reservation,true,now+quota.LEASE_MS+2);assert.equal(quota.usage(await service.read('abandoned'),now+quota.LEASE_MS+2).used,0);
 // Independent production writers force conflicts. Only two can reserve.
 let row=null,conflicts=0;const sqlStore={FILE_MODE:false,init:async()=>{},sql:async(q,p)=>{if(q.startsWith('SELECT'))return row?[{data:structuredClone(row)}]:[];assert(q.includes('ON CONFLICT(id) DO UPDATE'));assert(q.includes("data->>'revision'"));await new Promise(r=>setImmediate(r));if(row&&row.revision!==p[2]){conflicts++;return [];}row=JSON.parse(p[1]);return [{data:structuredClone(row)}];}};
 const writers=Array.from({length:5},()=>quota.create(sqlStore));const raced=await Promise.all(writers.map((w,n)=>w.reserve('shared','property-'+n,now)));assert.equal(raced.filter(r=>r.allowed).length,2);assert(conflicts>0);assert.equal(row.reservations.length,2);
 console.log('PASS free website AI: two concurrent reservations, duplicate worker exclusion, successful-only accounting, failed-slot release, replay idempotency, account isolation, Eastern reset, lease recovery and stale-token protection, independent production CAS writers.');
})().catch(e=>{console.error(e);process.exitCode=1;});
