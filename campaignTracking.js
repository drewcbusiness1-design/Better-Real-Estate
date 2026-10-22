'use strict';
const crypto=require('crypto');
const {isAffiliateOnlyUser}=require('./affiliateAccounts');
const proofStorage=require('./campaignProofStorage');
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
 if(!u||u.campaignId!==c.id||u.id===c.partnerUserId||u.affiliateReferrerId||u.referredBy||u.demo||u.role==='admin'||event.currency!=='usd'||!['pro','platinum','wholesale'].includes(event.tier)||!Number.isSafeInteger(event.amountCents)||event.amountCents<=0||!event.sourceId||!Number.isFinite(paidAt)||paidAt<start)return false;
 c.membershipPurchases=c.membershipPurchases||[];let changed=false;
 if(!c.membershipPurchases.some(p=>p.sourceId===event.sourceId)){c.membershipPurchases.push({id:'purchase-'+event.sourceId,userId:u.id,sourceId:event.sourceId,paymentIntentId:event.paymentIntentId||null,amountCents:event.amountCents,tier:event.tier,paidAt:new Date(paidAt).toISOString(),reversedAt:null});changed=true;}
 if(event.billingReason!=='subscription_create'||paidAt>start+c.purchaseWindowDays*DAY||c.sales.some(s=>s.userId===u.id||s.sourceId===event.sourceId))return changed;
 c.sales.push({id:'campaign-sale-'+u.id,userId:u.id,sourceId:event.sourceId,paymentIntentId:event.paymentIntentId||null,amountCents:event.amountCents,commissionCents:Math.floor(event.amountCents*3000/10000),tier:event.tier,paidAt:new Date(paidAt).toISOString(),availableAt:new Date(paidAt+c.holdDays*DAY).toISOString(),status:'pending',reversedAt:null});return true;
}
function reverseSales(c,{invoiceId,paymentIntentId,reason}){
 let changed=false;for(const s of [...(c.sales||[]),...(c.membershipPurchases||[])])if(!s.reversedAt&&((invoiceId&&s.sourceId===invoiceId)||(paymentIntentId&&s.paymentIntentId===paymentIntentId))){s.reversedAt=new Date().toISOString();s.status='reversed';s.reason=reason;changed=true;}return changed;
}
function totals(c,now=Date.now()){
 const approved=Object.values(c.reviews).filter(r=>r.status==='approved').length;
 const commission=c.sales.filter(s=>!s.reversedAt&&Date.parse(s.availableAt)<=now).reduce((n,s)=>n+s.commissionCents,0);
 const held=c.sales.filter(s=>!s.reversedAt&&Date.parse(s.availableAt)>now).reduce((n,s)=>n+s.commissionCents,0);
 const earned=approved*c.signupCents+commission,paid=c.payments.reduce((n,p)=>n+p.amountCents,0);
 return {approved,signupsEarnedCents:approved*c.signupCents,commissionCents:commission,heldCents:held,paidCents:paid,dueCents:Math.max(0,earned-paid),overpaidCents:Math.max(0,paid-earned)};
}
function review(c,db,input,actorId){
 if(c.status==='archived')fail('Restore this campaign before reviewing signups.',409);
 const u=db.users.find(u=>u.id===input.userId&&u.campaignId===c.id);if(!u)fail('Campaign member not found.',404);
 const status=input.status;if(!['approved','rejected','pending'].includes(status))fail('Choose a review status.');
 if(Number(input.expectedEvidenceRevision||0)!==Number(c.evidenceRevisions?.[u.id]||0))fail('Proof changed. Refresh and review the latest submission before deciding.',409);
 const evidence=String(input.evidence||'').trim();if(evidence.length<5||evidence.length>1500)fail('Add qualification evidence or a rejection reason (5–1,500 characters).');
 if(status==='approved'){
  const q=qualification(db,u);if(!q.emailConfirmed||!q.profileComplete||!q.returnVisit||!q.eligibleAccount)fail('Email confirmation, completed profile, eligible account and a separate-day return within seven days are required.');
  if(input.realEstateVerified!==true||input.meaningfulActionVerified!==true)fail('Confirm active US real estate participation and a meaningful platform action.');
  if(c.reviews[u.id]?.status!=='approved'&&totals(c).approved>=c.target)fail('The agreed signup target is already reached.');
 }
 const partnerReason=String(input.partnerReason||'').trim();if(partnerReason.length>500)fail('The partner-facing reason must be 500 characters or fewer.');
 const row={status,evidence,partnerReason,realEstateVerified:input.realEstateVerified===true,meaningfulActionVerified:input.meaningfulActionVerified===true,by:actorId,at:new Date().toISOString()};
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
   const db=await store.loadDB(),c=(db.acquisitionCampaigns||[]).find(c=>c.id===id);if(!c||c.status==='deleted')fail('Campaign not found.',404);
   const revision=c.revision;if(fn(c,db)===false)return c;c.revision++;
   if(store.FILE_MODE){db.__writeCampaigns=true;await store.saveDB(db);return c;}
   const rows=await store.sql('UPDATE kv_acquisitioncampaigns SET data=$2::jsonb,updated_at=now() WHERE id=$1 AND (data->>\'revision\')::bigint=$3 RETURNING data',[id,JSON.stringify(c),revision]);
   if(rows.length)return rows[0].data;
  }fail('Campaign changed. Refresh and retry.',409);
 }
 const serial=(id,fn)=>{if(!store.FILE_MODE)return mutate(id,fn);const task=tail.then(()=>mutate(id,fn));tail=task.catch(()=>{});return task;};
 return {mutate:serial,async record(event){const db=await store.loadDB(),u=db.users.find(u=>u.id===event.userId);if(u?.campaignId&&(db.acquisitionCampaigns||[]).some(c=>c.id===u.campaignId&&c.status!=='deleted'))return serial(u.campaignId,(c,db)=>recordSale(c,db,event));},async reverse(event){const db=await store.loadDB();for(const c of db.acquisitionCampaigns||[])if([...(c.sales||[]),...(c.membershipPurchases||[])].some(s=>(event.invoiceId&&s.sourceId===event.invoiceId)||(event.paymentIntentId&&s.paymentIntentId===event.paymentIntentId)))await serial(c.id,c=>reverseSales(c,event));}};
}
function linkPartner(c,db,input,actorId){
 if(c.status==='archived')fail('Restore the campaign before changing its partner.',409);
 const username=String(input.username||'').trim().toLowerCase().replace(/^@/,'');let partner=null;
 if(username||input.userId){partner=db.users.find(u=>input.userId?u.id===input.userId:String(u.username||'').toLowerCase()===username);if(!partner)fail('Member not found.',404);
  if(!isAffiliateOnlyUser(partner)||partner.demo||!partner.emailVerified)fail('Choose a real Affiliate-only account with a confirmed email.');
  if(partner.campaignId===c.id)fail('A referred member cannot manage their own acquisition campaign.');
 }
 c.history.push({action:'partner-link',previousPartnerUserId:c.partnerUserId||null,partnerUserId:partner?.id||null,by:actorId,at:new Date().toISOString()});c.partnerUserId=partner?.id||null;
}
function changeStatus(c,input,actorId){
 const status=input.status;if(!['active','paused','archived'].includes(status))fail('Choose active, paused or archived.');
 if(c.status==='archived'&&(input.restore!==true||status!=='paused'))fail('Use Restore to return this campaign to paused status.',409);
 c.status=status;c.archivedAt=status==='archived'?new Date().toISOString():null;
 c.history.push({action:input.restore?'restored':'status',status,by:actorId,at:new Date().toISOString()});
}
function publicProof(c,p){return {id:p.id,userId:p.userId,name:p.name,mime:p.mime,size:p.size,at:p.at,url:'/api/campaigns/'+encodeURIComponent(c.id)+'/proofs/'+encodeURIComponent(p.id)};}
function queueEvidence(c,userId){
 if(c.reviews[userId]?.status==='approved')fail('This referral is approved. Ask the admin to reopen it before changing proof.',409);
 c.evidenceRevisions=c.evidenceRevisions||{};c.evidenceRevisions[userId]=Number(c.evidenceRevisions[userId]||0)+1;
 if(c.reviews[userId]?.status==='rejected'){c.history.push({action:'resubmitted',userId,previous:c.reviews[userId],at:new Date().toISOString()});c.reviews[userId]={status:'pending',partnerReason:'Resubmitted for review',at:new Date().toISOString()};}
}
function partnerView(c,db,baseUrl){
 const members=db.users.filter(u=>u.campaignId===c.id).map(u=>({id:u.id,name:u.name,username:u.username,createdAt:u.createdAt,...qualification(db,u),review:{status:c.reviews[u.id]?.status||'pending',reason:c.reviews[u.id]?.partnerReason||'',at:c.reviews[u.id]?.at||null},proofs:(c.proofs||[]).filter(p=>p.userId===u.id).map(p=>publicProof(c,p)),submission:c.submissions?.[u.id]||null}));
 const purchaseMap=new Map([...(c.sales||[]),...(c.membershipPurchases||[])].map(p=>[p.sourceId,p])),purchases=[...purchaseMap.values()];
 const paying=members.filter(m=>purchases.some(s=>s.userId===m.id&&!s.reversedAt&&s.amountCents>0)).length;
 return {id:c.id,name:c.name,url:baseUrl+'/?view=auth&campaign='+c.code,platform:c.platform,status:c.status,target:c.target,signupCents:c.signupCents,rateBps:c.rateBps,purchaseWindowDays:c.purchaseWindowDays,holdDays:c.holdDays,createdAt:c.createdAt,archivedAt:c.archivedAt||null,members,counts:{tracked:members.length,approved:members.filter(m=>m.review.status==='approved').length,rejected:members.filter(m=>m.review.status==='rejected').length,pending:members.filter(m=>m.review.status==='pending'&&(m.submission||m.proofs.length)).length,awaitingProof:members.filter(m=>m.review.status==='pending'&&!m.submission&&!m.proofs.length).length},conversion:{signups:members.length,paying,notPaying:members.length-paying,percent:members.length?Math.round(paying/members.length*1000)/10:0},totals:totals(c),purchases:purchases.map(p=>({userId:p.userId,tier:p.tier,amountCents:p.amountCents,paidAt:p.paidAt,reversed:!!p.reversedAt})),sales:c.sales.map(s=>({id:s.id,userId:s.userId,tier:s.tier,amountCents:s.amountCents,commissionCents:s.commissionCents,paidAt:s.paidAt,availableAt:s.availableAt,status:s.reversedAt?'reversed':Date.parse(s.availableAt)<=Date.now()?'ready':'held',reason:s.reason||''})),payments:c.payments.map(p=>({id:p.id,amountCents:p.amountCents,reference:p.reference,at:p.at}))};
}
function install(app,{store,requireAuth,requireAdmin,baseUrl,service}){
 const safe=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Campaign request failed. Refresh and retry.'});}};
 app.get('/api/admin/campaigns',requireAuth,requireAdmin,safe(async(req,res)=>{const db=await store.loadDB();res.json({campaigns:(db.acquisitionCampaigns||[]).filter(c=>c.status!=='deleted').map(c=>{const p=db.users.find(u=>u.id===c.partnerUserId);return {...c,proofs:(c.proofs||[]).map(p=>publicProof(c,p)),partner:p?{id:p.id,name:p.name,username:p.username,email:p.email,emailVerified:!!p.emailVerified,eligible:isAffiliateOnlyUser(p)&&!p.demo}:null,url:baseUrl()+'/?view=auth&campaign='+c.code,totals:totals(c),members:db.users.filter(u=>u.campaignId===c.id).map(u=>({id:u.id,name:u.name,username:u.username,createdAt:u.createdAt,role:u.role,location:u.location,...qualification(db,u)}))};})});}));
 app.post('/api/admin/campaigns',requireAuth,requireAdmin,safe(async(req,res)=>{const c=newCampaign(req.body||{},req.user.id);await store.appendRecord('acquisitionCampaigns',c);res.json({campaign:c});}));
 app.post('/api/admin/campaigns/:id/review',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,(c,db)=>review(c,db,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/payment',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,c=>payment(c,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/status',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,c=>changeStatus(c,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/partner',requireAuth,requireAdmin,safe(async(req,res)=>{await service.mutate(req.params.id,(c,db)=>linkPartner(c,db,req.body||{},req.user.id));res.json({ok:true});}));
 app.post('/api/admin/campaigns/:id/delete',requireAuth,requireAdmin,safe(async(req,res)=>{let proofs=[];await service.mutate(req.params.id,c=>{if(req.body?.confirmation!==c.name)fail('Enter the campaign name to confirm deletion.');proofs=c.proofs||[];const id=c.id,revision=c.revision;for(const key of Object.keys(c))delete c[key];Object.assign(c,{id,revision,status:'deleted',deletedAt:new Date().toISOString(),deletedBy:req.user.id});});const cleanups=await Promise.allSettled(proofs.map(p=>proofStorage.remove(p.storageKey)));if(cleanups.some(r=>r.status==='rejected'))console.error('[campaigns] Deleted proof cleanup incomplete');res.json({ok:true});}));
 const requirePartner=(req,res,next)=>isAffiliateOnlyUser(req.user)&&req.user.emailVerified&&!req.user.demo?next():res.status(403).json({error:'Confirm your email and use a real Affiliate-only account to view campaign partnerships.'});
 app.get('/api/campaigns/me',requireAuth,requirePartner,safe(async(req,res)=>{const db=await store.loadDB();res.json({campaigns:(db.acquisitionCampaigns||[]).filter(c=>c.partnerUserId===req.user.id).map(c=>partnerView(c,db,baseUrl()))});}));
 app.post('/api/campaigns/:id/proofs',requireAuth,requirePartner,safe(async(req,res)=>{
  const userId=String(req.body?.userId||''),db=await store.loadDB(),c=(db.acquisitionCampaigns||[]).find(c=>c.id===req.params.id&&c.partnerUserId===req.user.id);
  const check=(c,db)=>{if(!c||c.partnerUserId!==req.user.id)fail('Campaign not found.',404);if(c.status==='archived')fail('Campaign is archived.',409);if(!db.users.some(u=>u.id===userId&&u.campaignId===c.id))fail('Referred member not found.',404);if(c.reviews[userId]?.status==='approved')fail('Ask the admin to reopen this approved referral first.',409);if((c.proofs||[]).filter(p=>p.userId===userId).length>=5)fail('A referral can have up to five proof files.');};check(c,db);
  const file=proofStorage.validate(req.body?.dataUrl,req.body?.name),key=await proofStorage.write(file.buffer),proof={id:crypto.randomUUID(),userId,submittedBy:req.user.id,name:file.name,mime:file.mime,size:file.size,storageKey:key,at:new Date().toISOString()};
  await service.mutate(c.id,(current,latest)=>{check(current,latest);queueEvidence(current,userId);current.proofs=current.proofs||[];current.proofs.push(proof);current.history.push({action:'proof-upload',userId,proofId:proof.id,by:req.user.id,at:proof.at});});res.json({proof:publicProof(c,proof)});
 }));
 app.get('/api/campaigns/:id/proofs/:proofId',requireAuth,safe(async(req,res)=>{
  const db=await store.loadDB(),c=(db.acquisitionCampaigns||[]).find(c=>c.id===req.params.id),admin=req.user.role==='admin'&&require('./policy').isAdminEmail(req.user.email);
  if(!c||!admin&&!(c.partnerUserId===req.user.id&&isAffiliateOnlyUser(req.user)&&req.user.emailVerified&&!req.user.demo))fail('Proof not found.',404);
  const p=(c.proofs||[]).find(p=>p.id===req.params.proofId);if(!p)fail('Proof not found.',404);const buffer=await proofStorage.read(p.storageKey);if(!buffer)fail('Proof file unavailable.',404);
  res.setHeader('Content-Type','application/octet-stream');res.setHeader('Content-Disposition',"attachment; filename*=UTF-8''"+encodeURIComponent(p.name));res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','private, no-store');res.send(buffer);
 }));
 app.post('/api/campaigns/:id/evidence',requireAuth,requirePartner,safe(async(req,res)=>{await service.mutate(req.params.id,(c,db)=>{
  if(c.partnerUserId!==req.user.id)fail('Campaign not found.',404);if(c.status==='archived')fail('This campaign is archived.',409);
  const userId=String(req.body?.userId||''),evidence=String(req.body?.evidence||'').trim();if(!db.users.some(u=>u.id===userId&&u.campaignId===c.id))fail('Referred member not found.',404);
  if(evidence.length<5||evidence.length>1500)fail('Provide 5–1,500 characters of public real estate evidence. Do not submit identity documents.');
  queueEvidence(c,userId);c.submissions=c.submissions||{};const entry={evidence,at:new Date().toISOString(),by:req.user.id};c.history.push({action:'partner-evidence',userId,previous:c.submissions[userId]||null,...entry});c.submissions[userId]=entry;
 });res.json({ok:true});}));
}
module.exports={newCampaign,signupCampaign,qualification,netInvoice,recordSale,reverseSales,totals,review,payment,linkPartner,changeStatus,partnerView,createService,install};
