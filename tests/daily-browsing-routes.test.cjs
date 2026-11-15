'use strict';
const assert=require('node:assert/strict');const {app,cookie,getDB}=require('./connected-fixture');
(async()=>{
  const db=getDB(),free=db.users.find(u=>u.id==='outsider');Object.assign(free,{plan:'free',planUntil:null,trialUntil:'2030-01-01',unlockCredits:5,founderProgramExcluded:true});
  const owner=db.users.find(u=>u.id==='seller');owner.phone='6095550100';
  for(let n=1;n<36;n++)db.listings.push({...db.listings[0],id:'property-'+n,address:n+' Example Avenue',notes:'Private seller notes '+n});
  const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
  const call=async(user,path,method='GET',body,native=false)=>{const r=await fetch(base+path,{method,headers:{...(user?{cookie:cookie(user)}:{}),'Content-Type':'application/json',...(native?{'User-Agent':'BetterRealEstate-iOS/0.11'}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json(),cache:r.headers.get('cache-control')};};
  try{
    assert.equal((await call(null,'/api/pricing')).data.pricing.dailyFreeAiAnalyses,2);assert.equal((await call(null,'/api/pricing')).data.pricing.freeUnlocks,0);assert.equal((await call(null,'/api/pricing','GET',null,true)).data.pricing.freeUnlocks,5);
    let result=await call('outsider','/api/feed');assert.equal(result.data.browsing.used,0);assert(result.data.listingIds.length>=35);assert.deepEqual(result.data.feed,[]);assert(!JSON.stringify(result.data).includes('Private seller notes'));assert.equal(result.data.access.trial,false);assert.equal(result.cache,'no-store');
    assert.equal((await call(null,'/api/listings/listing')).status,401);
    result=await call('outsider','/api/browsing/view','POST',{listingId:'listing'});assert.equal(result.data.listing.address,'123 Main St');assert.equal(result.data.listing.locked,false);assert.equal(result.data.browsing.used,1);
    result=await call('outsider','/api/listings/listing');assert.equal(result.data.owner.phone,'6095550100');assert.equal(result.data.owner.email,'seller@example.test');assert.equal(result.data.listing.notes,'Fixture property');assert.equal(result.data.browsing.used,1);assert(result.data.otherListings.every(l=>l.address==='Address hidden'));
    assert.equal((await call('outsider','/api/browsing/view','POST',{listingId:'missing'})).status,404);
    const races=await Promise.all(Array.from({length:35},(_,n)=>call('outsider','/api/browsing/view','POST',{listingId:'property-'+(n+1)})));
    assert.equal(races.filter(x=>x.status===200).length,29);assert.equal(races.filter(x=>x.status===429).length,6);
    const blocked=races.findIndex(x=>x.status===429)+1;
    result=await call('outsider','/api/listings/property-'+blocked);assert.equal(result.status,429);assert(!JSON.stringify(result.data).includes('Private seller notes'));assert.equal(result.data.code,'DAILY_BROWSING_LIMIT');
    assert.equal((await call('outsider','/api/listings/listing')).status,200);
    result=await call('outsider','/api/feed');assert.deepEqual(result.data.listingIds,[]);assert.equal(result.data.browsing.remaining,0);
    const search=await call('outsider','/api/search?q=Example');assert(search.data.listings.some(l=>l.browsingRequired));assert(search.data.listings.filter(l=>l.browsingRequired).every(l=>!l.photos&&!l.address&&!l.asking&&!l.notes));
    const oldCredits=getDB().users.find(u=>u.id==='outsider').unlockCredits;
    assert.equal((await call('outsider','/api/listings/listing/unlock','POST',{})).status,410);assert.equal((await call('outsider','/api/billing/unlock-pack','POST',{})).status,410);assert.equal(getDB().users.find(u=>u.id==='outsider').unlockCredits,oldCredits);
    result=await call('outsider','/api/ai/listing-copy','POST',{});assert.equal(result.status,403);assert.equal(result.data.code,'AI_MEMBERSHIP_REQUIRED');
    assert.equal((await call('outsider','/api/deal-builder/usage')).data.usage.remaining,2);
    const support=await call('outsider','/api/support/message','POST',{id:'free-support-message',body:'I need help with my account.'});assert.equal(support.status,200);assert.equal(support.data.thread.mode,'waiting');assert(!support.data.thread.messages.some(m=>m.role==='ai'));
    for(const user of ['buyer','admin','teammate']){result=await call(user,'/api/browsing/usage');assert.equal(result.data.browsing.unlimited,true);assert.equal((await call(user,'/api/listings/property-'+blocked)).status,200);}
    result=await call('outsider','/api/feed','GET',null,true);assert(result.data.feed.length>=35);assert.equal(result.data.access.trial,true);assert.equal(result.data.feed[0].locked,false);
    assert.equal((await call('outsider','/api/deal-builder/usage','GET',null,true)).data.usage.limit,1);
    console.log('PASS actual routes: 30 full properties and contact details, concurrent request cap, repeated detail/refresh, server denial with no data leak, search placeholders, no new unlock purchases, two free AI analyses exposed, paid listing AI enforced, human support retained, paid/admin/team unlimited, native contract retained.');
  }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
