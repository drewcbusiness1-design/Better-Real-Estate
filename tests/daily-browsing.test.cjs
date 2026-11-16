'use strict';
const assert=require('node:assert/strict');
const browsing=require('../dailyBrowsing');
(async()=>{
  for(const [at,expectedDay,expectedReset] of [
    ['2026-11-15T04:59:59Z','2026-11-14','2026-11-15T05:00:00.000Z'],
    ['2026-11-15T05:00:00Z','2026-11-15','2026-11-16T05:00:00.000Z'],
    ['2026-03-08T05:00:00Z','2026-03-08','2026-03-09T04:00:00.000Z'],
    ['2026-11-01T04:00:00Z','2026-11-01','2026-11-02T05:00:00.000Z']
  ]){assert.equal(browsing.day(Date.parse(at)),expectedDay);assert.equal(browsing.resetsAt(Date.parse(at)),expectedReset);}
  let db={browsingUsage:[]};const store={FILE_MODE:true,loadDB:async()=>structuredClone(db),saveDB:async next=>{db=structuredClone(next);}};
  const service=browsing.create(store),now=Date.parse('2026-11-15T18:00:00Z');
  const repeat=await Promise.all(Array.from({length:15},()=>service.consume('a','same',now)));
  assert.equal(repeat.filter(x=>!x.repeated).length,1);assert.equal((await service.read('a')).listingIds.length,1);
  const parallel=await Promise.all(Array.from({length:45},(_,n)=>service.consume('a','property-'+n,now)));
  assert.equal(parallel.filter(x=>x.allowed).length,29);assert.equal((await service.read('a')).listingIds.length,30);
  assert.equal((await service.consume('b','property-0',now)).usage.used,1);
  assert.equal((await service.consume('a','new-day',Date.parse('2026-11-16T05:00:00Z'))).usage.used,1);
  // Exercise independent writers and failed optimistic writes against the production SQL interface.
  let row=null,conflicts=0;
  const sqlStore={FILE_MODE:false,init:async()=>{},sql:async(sql,args)=>{
    if(sql.startsWith('SELECT'))return row?[{data:structuredClone(row)}]:[];
    assert(sql.includes('ON CONFLICT(id) DO UPDATE'));assert(sql.includes("data->>'revision'"));assert(sql.includes('RETURNING data'));
    await new Promise(r=>setImmediate(r));
    if(row&&row.revision!==args[2]){conflicts++;return [];}
    row=JSON.parse(args[1]);return [{data:structuredClone(row)}];
  }};
  const clients=Array.from({length:4},()=>browsing.create(sqlStore));
  const races=await Promise.all(Array.from({length:35},(_,n)=>clients[n%4].consume('shared','property-'+n,now).catch(e=>({status:e.status}))));
  assert(conflicts>0);assert.equal(row.listingIds.length,Math.min(30,races.filter(x=>x.allowed).length));assert(row.listingIds.length<=30);
  for(let n=row.listingIds.length;n<30;n++)await clients[0].consume('shared','fill-'+n,now);
  assert.equal((await clients[1].consume('shared','over',now)).allowed,false);
  console.log('PASS daily browsing: Eastern midnight and DST, refresh/detail idempotency, parallel cap, account isolation, next-day reset, independent optimistic writers. PostgreSQL execution itself is not simulated as a database.');
})().catch(e=>{console.error(e);process.exitCode=1;});
