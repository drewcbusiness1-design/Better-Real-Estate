'use strict';
const crypto=require('crypto');
const DAY=86400000;
const codeOf=v=>String(v||'').trim().toUpperCase();
const fail=(message,status=400)=>{const e=new Error(message);e.status=status;throw e;};
function newCampaign(input,actorId,now=Date.now()){
 const name=String(input.name||'').trim(),platform=String(input.platform||'');
 if(!name||name.length>100||!['Fiverr','Upwork'].includes(platform))fail('Enter a campaign name and choose Fiverr or Upwork.');
 const target=Number(input.target);if(!Number.isInteger(target)||target<5||target>1000)fail('Choose a target from 5 to 1,000 qualified users.');
 return {id:'campaign-'+crypto.randomUUID(),code:crypto.randomBytes(12).toString('hex').toUpperCase(),name,platform,target,signupCents:100,rateBps:3000,purchaseWindowDays:30,holdDays:14,status:'active',revision:0,createdBy:actorId,createdAt:new Date(now).toISOString(),reviews:{},sales:[],payments:[],history:[]};
}
function signupCampaign(db,code,now=Date.now()){
 if(!code)return null;
 const c=(db.acquisitionCampaigns||[]).find(c=>c.code===codeOf(code));
 if(!c||c.status!=='active')fail('This campaign link is unavailable. Ask the sender for an active link.');
 return {id:c.id,at:new Date(now).toISOString()};
}
function qualification(db,u){
 const start=Date.parse(u.createdAt),end=start+7*DAY,day=t=>new Date(t).toISOString().slice(0,10);
 const returns=[...(db.activityEvents||[]).filter(e=>e.userId===u.id).map(e=>e.at),u.lastActiveAt].filter(Boolean).map(Date.parse).filter(t=>Number.isFinite(t)&&t>start&&t<=end&&day(t)!==day(start));
 const roles=Array.isArray(u.roles)?u.roles:[u.role],ineligible=u.demo||roles.some(r=>['admin','affiliate','agent','realtor'].includes(r));
 return {emailConfirmed:!!u.emailVerified,profileComplete:!!u.name&&!!u.username&&!!(u.location||u.investmentMarkets?.length)&&roles.some(Boolean),returnVisit:returns.length>0,returnAt:returns.length?new Date(Math.min(...returns)).toISOString():null,eligibleAccount:!ineligible};
}
function netInvoice(inv){
 const paid=Number(inv.amount_paid),tax=Array.isArray(inv.total_taxes)?inv.total_taxes.reduce((n,t)=>n+Number(t.amount||0),0):Array.isArray(inv.total_tax_amounts)?inv.total_tax_amounts.reduce((n,t)=>n+Number(t.amount||0),0):Number(inv.tax||0);
 return Number.isSafeInteger(paid)&&Number.isSafeInteger(tax)?Math.max(0,paid-tax):0;
}
function recordSale(c,db,event){
 const u=db.users.find(u=>u.id===event.userId),paidAt=Number(event.paidAt),start=Date.parse(u?.campaignAt||u?.createdAt);
 if(!u||u.campaignId!==c.id||u.affiliateReferrerId||u.referredBy||u.demo||u.role==='admin'||event.currency!=='usd'||event.billingReason!=='subscription_create'||!['pro','platinum','wholesale'].includes(event.tier)||!Number.isSafeInteger(event.amountCents)||event.amountCents<=0||!event.sourceId||!Number.isFinite(paidAt)||paidAt<start||paidAt>start+c.purchaseWindowDays*DAY)return false;
 if(c.sales.some(s=>s.userId===u.id||s.sourceId===event.sourceId))return false;
 c.sales.push({id:'campaign-sale-'+u.id,userId:u.id,sourceId:event.sourceId,paymentIntentId:event.paymentIntentId||null,amountCents:event.amountCents,commissionCents:Math.floor(event.amountCents*3000/10000),tier:event.tier,paidAt:new Date(paidAt).toISOString(),availableAt:new Date(paidAt+c.holdDays*DAY).toISOString(),status:'pending',reversedAt:null});return true;
}
function reverseSales(c,{invoiceId,paymentIntentId,reason}){
 let changed=false;for(const s of c.sales)if(!s.reversedAt&&((invoiceId&&s.sourceId===invoiceId)||(paymentIntentId&&s.paymentIntentId===paymentIntentId))){s.reversedAt=new Date().toISOString();s.status='reversed';s.reason=reason;changed=true;}return changed;
}
function totals(c,now=Date.now()){
 const approved=Object.values(c.reviews).filter(r=>r.status==='approved').length;
 const commission=c.sales.filter(s=>!s.reversedAt&&Date.parse(s.availableAt)<=now).reduce((n,s)=>n+s.commissionCents,0);
 const held=c.sales.filter(s=>!s.reversedAt&&Date.parse(s.availableAt)>now).reduce((n,s)=>n+s.commissionCents,0);
 const earned=approved*c.signupCents+commission,paid=c.payments.reduce((n,p)=>n+p.amountCents,0);
 return {approved,signupsEarnedCents:approved*c.signupCents,commissionCents:commission,heldCents:held,paidCents:paid,dueCents:Math.max(0,earned-paid),overpaidCents:Math.max(0,paid-earned)};
}
function review(c,db,input,actorId){
 const u=db.users.find(u=>u.id===input.userId&&u.campaignId===c.id);if(!u)fail('Campaign member not found.',404);
 const status=input.status;if(!['approved','rejected','pending'].includes(status))fail('Choose a review status.');
 const evidence=String(input.evidence||'').trim();if(evidence.length<5||evidence.length>1500)fail('Add qualification evidence or a rejection reason (5–1,500 characters).');
 if(status==='approved'){
  const q=qualification(db,u);if(!q.emailConfirmed||!q.profileComplete||!q.returnVisit||!q.eligibleAccount)fail('Email confirmation, completed profile, eligible account and a separate-day return within seven days are required.');
  if(input.realEstateVerified!==true||input.meaningfulActionVerified!==true)fail('Confirm active US real estate participation and a meaningful platform action.');
  if(c.reviews[u.id]?.status!=='approved'&&totals(c).approved>=c.target)fail('The agreed signup target is already reached.');
 }
 const row={status,evidence,realEstateVerified:input.realEstateVerified===true,meaningfulActionVerified:input.meaningfulActionVerified===true,by:actorId,at:new Date().toISOString()};
 c.history.push({action:'review',userId:u.id,previous:c.reviews[u.id]||null,...row});c.reviews[u.id]=row;
}
function payment(c,input,actorId){
 const amount=Number(input.amountCents),reference=String(input.reference||'').trim();
 if(!Number.isSafeInteger(amount)||amount<=0||amount>totals(c).dueCents)fail('Payment must be a positive amount no greater than the amount due.');
 if(reference.length<3||reference.length>200)fail('Enter the Fiverr/Upwork payment reference (3–200 characters).');
 if(c.payments.some(p=>p.reference===reference))fail('This payment reference was already recorded.',409);
 c.payments.push({id:crypto.randomUUID(),amountCents:amount,reference,by:actorId,at:new Date().toISOString()});
}
function createService(store){
 let tail=Promise.resolve();
 async function mutate(id,fn){
  for(let n=0;n<12;n++){
   const db=await store.loadDB(),c=(db.acquisitionCampaigns||[]).find(c=>c.id===id);if(!c)fail('Campaign not found.',404);
   const revision=c.revision;if(fn(c,db)===false)return c;c.revision++;
   if(store.FILE_MODE){db.__writeCampaigns=true;await store.saveDB(db);return c;}
   const rows=await store.sql('UPDATE kv_acquisitioncampaigns SET data=$2::jsonb,updated_at=now() WHERE id=$1 AND (data->>\'revision\')::bigint=$3 RETURNING data',[id,JSON.stringify(c),revision]);
   if(rows.length)return rows[0].data;
  }fail('Campaign changed. Refresh and retry.',409);
 }
 const serial=(id,fn)=>{if(!store.FILE_MODE)return mutate(id,fn);const task=tail.then(()=>mutate(id,fn));tail=task.catch(()=>{});return task;};
 return {mutate:serial,async record(event){const db=await store.loadDB(),u=db.users.find(u=>u.id===event.userId);if(u?.campaignId)return serial(u.campaignId,(c,db)=>recordSale(c,db,event));},async reverse(event){const db=await store.loadDB();for(const c of db.acquisitionCampaigns||[])if(c.sales.some(s=>(event.invoiceId&&s.sourceId===event.invoiceId)||(event.paymentIntentId&&s.paymentIntentId===event.paymentIntentId)))await serial(c.id,c=>reverseSales(c,event));}};
}
function install(app,{store,requireAuth,requireAdmin,baseUrl,service}){
 const safe=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Campaign request failed. Refresh and retry.'});}};
 app.get('/api/admin/campaigns',requireAuth,requireAdmin,safe(async(req,res)=>{const db=await store.loadDB();res.json({campaigns:(db.acquisitionCampaigns||[]).map(c=>({...c,url:baseUrl()+'/?view=auth&campaign='+c.code,totals:totals(c),members:db.users.filter(u=>u.campaignId===c.id).map(u=>({id:u.id,name:u.name,username:u.username,createdAt:u.createdAt,role:u.role,location:u.location,...qualification(db,u)}))}))});}));
 app.post('/api/admin/campaigns',requireAuth,requireAdmin,safe(async(req,res)=>{const c=newCampaign(req.body||{},req.user.id);await store.appendRecord('acquisitionCampaigns',c);res.json({campaign:c});}));
 app.post('/api/admin/campaigns/:id/review',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,(c,db)=>review(c,db,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/payment',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,c=>payment(c,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/status',requireAuth,requireAdmin,safe(async(req,res)=>{const status=req.body?.status;if(!['active','paused'].includes(status))fail('Choose active or paused.');await service.mutate(req.params.id,c=>{c.status=status;c.history.push({action:'status',status,by:req.user.id,at:new Date().toISOString()});});res.json({ok:true});}));
}
module.exports={newCampaign,signupCampaign,qualification,netInvoice,recordSale,reverseSales,totals,review,payment,createService,install};
