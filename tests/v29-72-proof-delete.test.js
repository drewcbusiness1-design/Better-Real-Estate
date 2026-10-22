'use strict';
const assert=require('assert'),{app,cookie,getDB}=require('./connected-fixture'),tracking=require('../campaignTracking'),proofs=require('../campaignProofStorage');
const files=new Map();proofs.write=async b=>{const key=require('crypto').randomUUID();files.set(key,b);return key;};proofs.read=async k=>files.get(k);proofs.remove=async k=>files.delete(k);
const server=app.listen(0,'127.0.0.1');
(async()=>{
 await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(path,body,user='admin',method=body?'POST':'GET'){const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(user?{cookie:cookie(user)}:{})},...(body?{body:JSON.stringify(body)}:{})});const type=r.headers.get('content-type');return {status:r.status,headers:r.headers,data:type?.includes('json')?await r.json():await r.text()};}
 const db=getDB();db.users.push({id:'partner',name:'Partner',username:'partner',email:'partner@example.invalid',emailVerified:true,role:'affiliate',roles:['affiliate'],settings:{},createdAt:new Date().toISOString()});
 const root='/api/admin/campaigns',c=(await req(root,{name:'Proof trial',platform:'Fiverr',target:35})).data.campaign,id=c.id;
 assert.equal((await req(root+'/'+id+'/partner',{userId:'partner'})).status,200);
 const u=getDB().users.find(u=>u.id==='buyer');Object.assign(u,{campaignId:id,campaignAt:'2026-10-01T00:00:00Z',createdAt:'2026-10-01T00:00:00Z',location:'NJ'});getDB().activityEvents.push({id:'return',userId:u.id,at:'2026-10-02T00:00:00Z'});
 const upload='/api/campaigns/'+id+'/proofs',body={userId:'buyer',name:'business.pdf',dataUrl:'data:application/pdf;base64,'+Buffer.from('%PDF-1.4 fixture').toString('base64')};
 assert.equal((await req(upload,body,'buyer')).status,403);assert.equal((await req(upload,{...body,userId:'outsider'},'partner')).status,404);assert.equal((await req(upload,{...body,dataUrl:'data:application/pdf;base64,'+Buffer.from('bad').toString('base64')},'partner')).status,400);
 const uploaded=await req(upload,body,'partner');assert.equal(uploaded.status,200);const p=uploaded.data.proof;assert(!('storageKey'in p));assert.equal((await req(p.url,null,'outsider')).status,404);assert.equal((await req(p.url,null,null)).status,401);
 for(const who of ['partner','admin']){const r=await req(p.url,null,who);assert.equal(r.status,200);assert(r.data.startsWith('%PDF-'));assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert(r.headers.get('content-disposition').startsWith('attachment;'));}
 let mine=(await req('/api/campaigns/me',null,'partner')).data.campaigns[0];assert.equal(mine.counts.pending,1);assert.equal(mine.totals.approved,0);assert.equal(mine.totals.signupsEarnedCents,0);assert.equal(mine.members[0].proofs.length,1);
 const review={userId:'buyer',status:'approved',evidence:'Reviewed public qualification proof',realEstateVerified:true,meaningfulActionVerified:true};assert.equal((await req(root+'/'+id+'/review',review)).status,409);
 assert.equal((await req(root+'/'+id+'/review',{...review,expectedEvidenceRevision:1})).status,200);assert.equal((await req(upload,body,'partner')).status,409);
 mine=(await req('/api/campaigns/me',null,'partner')).data.campaigns[0];assert.equal(mine.totals.approved,1);assert.equal(mine.totals.signupsEarnedCents,100);
 assert.equal((await req(root+'/'+id+'/review',{...review,status:'rejected',expectedEvidenceRevision:1})).status,200);
 assert.equal((await req(upload,{...body,name:'photo.png',dataUrl:'data:image/png;base64,'+Buffer.from([137,80,78,71,13,10,26,10,0]).toString('base64')},'partner')).status,200);
 mine=(await req('/api/campaigns/me',null,'partner')).data.campaigns[0];assert.equal(mine.members[0].review.status,'pending');assert.equal(mine.totals.approved,0);
 assert.equal((await req(root+'/'+id+'/review',{...review,expectedEvidenceRevision:1})).status,409);
 const picker=(await req('/api/admin/user-inspector?q=partner')).data.users.find(u=>u.id==='partner');assert.equal(picker.emailVerified,true);
 assert.equal((await req(root+'/'+id+'/delete',{confirmation:c.name},'partner')).status,403);assert.equal((await req(root+'/'+id+'/delete',{confirmation:'wrong'})).status,400);assert.equal((await req(root+'/'+id+'/delete',{confirmation:c.name})).status,200);
 assert.equal((await req(root)).data.campaigns.length,0);assert.equal((await req('/api/campaigns/me',null,'partner')).data.campaigns.length,0);assert.equal((await req(p.url)).status,404);assert.equal(files.size,0);assert(getDB().users.some(u=>u.id==='buyer'));assert.throws(()=>tracking.signupCampaign(getDB(),c.code));assert.equal((await req(root+'/'+id+'/status',{status:'active'})).status,404);
 await tracking.createService(require('../store')).record({userId:'buyer',sourceId:'later',amountCents:3000,tier:'pro',currency:'usd',billingReason:'subscription_create',paidAt:Date.now()});await tracking.createService(require('../store')).reverse({invoiceId:'later'});
 const signup=await req('/api/signup',{name:'Verify First',email:'verify-first@example.invalid',password:'password123',roles:['buyer']},null);assert.equal(signup.status,200);let fresh=getDB().users.find(u=>u.email==='verify-first@example.invalid');assert(!fresh.foundingMember);assert(!fresh.founderPlatinumUntil);assert.equal((await req('/api/admin/set-founding-member',{userId:fresh.id,foundingMember:true})).status,400);const token=getDB().tokens.find(t=>t.userId===fresh.id&&t.kind==='verify').token;assert.equal((await req('/api/verify-email',{token},null)).status,200);fresh=getDB().users.find(u=>u.id===fresh.id);assert(fresh.emailVerified);assert(fresh.foundingMember);assert(fresh.founderLaunchPosition);
 for(const mime of ['image/jpeg','image/webp']){const b=mime==='image/jpeg'?Buffer.from([255,216,255,0]):Buffer.from('RIFF0000WEBP');assert.equal(proofs.validate('data:'+mime+';base64,'+b.toString('base64'),'proof').mime,mime);}
 assert.throws(()=>proofs.validate('data:application/pdf;base64,'+Buffer.alloc(2*1024*1024+1).toString('base64'),'large'));
 console.log('PASS private PDF/image proof authorization, pending counts, explicit approval, stale review protection, reopening/resubmission, member search verification flag, confirmed admin deletion, disabled links and safe later billing');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
