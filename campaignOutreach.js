'use strict';
const crypto=require('crypto'),{isAffiliateOnlyUser}=require('./affiliateAccounts');
const inbox=require('./outreachInbox');
const DAY=86400000,REPLY='partners@betterrealestate.org';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function email(v){const s=String(v||'').trim().toLowerCase();if(s.length>254||!/^[-a-z0-9.!#$%&'*+/=?^_`{|}~]+@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?\.[a-z]{2,63}$/.test(s))fail('Enter one valid recipient email address.');return s;}
function normalize(input){
 input=input||{};
 const to=email(input.to),subject=String(input.subject||'').trim(),body=String(input.body||'').trim(),source=String(input.source||'').trim();
 if(subject.length<3||subject.length>160||/[\r\n]/.test(subject))fail('Use a subject of 3–160 characters on one line.');
 if(body.length<20||body.length>6000)fail('Write a personalized message of 20–6,000 characters.');
 let url;try{url=new URL(source);}catch{fail('Paste the public website or professional profile where you found this contact.');}
 if(!['https:','http:'].includes(url.protocol)||url.username||url.password||source.length>1000)fail('Use a public HTTP(S) professional source link.');
 return {to,subject,body,source};
}
function eligible(db,id){const u=db.users.find(u=>u.id===id),a=(db.affiliateApplications||[]).find(a=>a.userId===id);if(!u||!isAffiliateOnlyUser(u)||!u.emailVerified||u.demo||u.suspended||u.disabled||u.deletedAt||a?.status==='suspended')fail('A confirmed, active Affiliate-only account is required.',403);return u;}
function contexts(db,id,base){eligible(db,id);const rows=(db.acquisitionCampaigns||[]).filter(c=>c.partnerUserId===id&&c.status==='active').map(c=>({id:c.id,name:c.name,link:base+'/?view=auth&campaign='+c.code}));const a=(db.affiliateApplications||[]).find(a=>a.userId===id&&a.status==='approved');if(a?.code)rows.push({id:'standard',name:'Standard affiliate program',link:base+'/s/join?aff='+encodeURIComponent(a.code)});return rows;}
function context(db,id,campaignId,base){const choices=contexts(db,id,base);if(!campaignId&&choices.length>1)fail('Choose the campaign or affiliate program for this draft.');const c=campaignId?choices.find(c=>c.id===campaignId):(choices.length===1?choices[0]:null);if(!c)fail('This campaign or affiliate program is no longer active or linked to you.',409);return c;}
function token(to){const secret=process.env.SESSION_SECRET;if(!secret)fail('Set SESSION_SECRET before enabling outreach.',503);const data=Buffer.from(to).toString('base64url');return data+'.'+crypto.createHmac('sha256',secret).update(data).digest('base64url');}
function verify(t){const [data,sig,...more]=String(t||'').split('.');if(more.length||!data||!sig||!process.env.SESSION_SECRET)fail('Invalid unsubscribe link.');const expected=crypto.createHmac('sha256',process.env.SESSION_SECRET).update(data).digest('base64url');if(sig.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))fail('Invalid unsubscribe link.');return email(Buffer.from(data,'base64url').toString());}
function snapshot(d,db,base,mailer){
 const u=eligible(db,d.authorId),c=context(db,u.id,d.contextId,base),postal=String(process.env.MARKETING_POSTAL_ADDRESS||'').trim();
 const unsubscribeUrl=base+'/api/outreach/unsubscribe?token='+encodeURIComponent(token(d.to)),from=mailer.outreachSender(u.name||u.username),replyTo=inbox.replyAddress(d)||REPLY;
 const text=d.body+'\n\nCreate your free Better account: '+c.link+'\nPaid memberships are optional.\n\n'+(u.name||u.username)+'\nOutreach partner for Better Real Estate\n\nPromotional invitation from Better Real Estate\n'+(postal||'[Company postal address must be configured]')+'\nUnsubscribe: '+unsubscribeUrl+'\nReplies: '+replyTo;
 const html='<div style="font:15px/1.6 system-ui;color:#12222d;max-width:600px;margin:auto;padding:24px;white-space:pre-wrap">'+esc(text).replace(esc(c.link),'<a href="'+esc(c.link)+'">Create a free account</a>').replace(esc(unsubscribeUrl),'<a href="'+esc(unsubscribeUrl)+'">Unsubscribe</a>')+'</div>';
 return {to:d.to,subject:d.subject,from,replyTo,text,html,unsubscribeUrl,key:'partner-outreach/'+d.id+'/'+d.revision,postal};
}
function blocked(g,db,to){return !!g.suppressions[hash(to)]||db.users.some(u=>String(u.email||'').trim().toLowerCase()===to&&(u.marketingOptIn===false||u.marketingUnsubscribedAt));}
function writer(store){let tail=Promise.resolve();
 async function mutate(fn){
  if(!store.FILE_MODE){await store.init();await store.sql('INSERT INTO kv_campaignoutreach(id,data) VALUES($1,$2::jsonb) ON CONFLICT(id) DO NOTHING',['global',JSON.stringify({id:'global',revision:0,drafts:[],suppressions:{}})]);}
  for(let i=0;i<15;i++){
   const db=await store.loadDB();db.campaignOutreach=db.campaignOutreach||[];let g=db.campaignOutreach.find(x=>x.id==='global');if(!g){g={id:'global',revision:0,drafts:[],suppressions:{}};db.campaignOutreach.push(g);}
   g.replies=g.replies||[];const revision=g.revision,result=fn(g,db);g.revision++;
   if(store.FILE_MODE){db.__writeOutreach=true;await store.saveDB(db);return result;}
   const rows=await store.sql('UPDATE kv_campaignoutreach SET data=$2::jsonb,updated_at=now() WHERE id=$1 AND (data->>\'revision\')::bigint=$3 RETURNING id',['global',JSON.stringify(g),revision]);if(rows.length)return result;
  }fail('The outreach queue changed. Refresh and retry.',409);
 }
 return fn=>{if(!store.FILE_MODE)return mutate(fn);const p=tail.then(()=>mutate(fn));tail=p.catch(()=>{});return p;};
}
function install(app,{store,requireAuth,requireAdmin,baseUrl,mailer}){
 const mutate=writer(store),safe=fn=>async(req,res)=>{try{await fn(req,res);}catch(e){res.status(e.status||500).json({error:e.status?e.message:'Outreach request failed. Refresh and retry.'});}};
 const admin=req=>req.user.role==='admin'&&require('./policy').isAdminEmail(req.user.email);
 const read=async()=>{const db=await store.loadDB();return {db,g:(db.campaignOutreach||[]).find(x=>x.id==='global')||{drafts:[],suppressions:{}}};};
 const find=(g,id)=>{const d=g.drafts.find(d=>d.id===id);if(!d)fail('Draft not found.',404);return d;};
 const own=(req,d)=>{if(!admin(req)&&d.authorId!==req.user.id)fail('Draft not found.',404);};
 const version=(d,b)=>{if(Number(b.expectedRevision)!==d.revision)fail('Draft changed. Refresh and review the current version.',409);};
 const audit=(d,action,by)=>{d.history.push({action,by,at:new Date().toISOString(),revision:d.revision});d.updatedAt=new Date().toISOString();};
 inbox.install(app,{mutate,read,find,own,admin,safe,requireAuth,requireAdmin,eligible,mailer});
 const project=(d,isAdmin)=>{const {approvalHash,approval,key,history,...out}=d;return {...out,...(isAdmin?{history}:{}),preview:approval||null};};
 app.get('/api/outreach',requireAuth,safe(async(req,res)=>{
  const {db,g}=await read(),isAdmin=admin(req);if(!isAdmin)eligible(db,req.user.id);
  const rows=g.drafts.filter(d=>isAdmin||d.authorId===req.user.id).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));const page=Math.max(1,Math.min(Math.ceil(rows.length/25)||1,Number(req.query.page)||1));
  res.json({inboxConfigured:inbox.configured(),drafts:rows.slice((page-1)*25,page*25).map(d=>project(d,isAdmin)),total:rows.length,page,totalPages:Math.ceil(rows.length/25)||1,contexts:isAdmin?[]:contexts(db,req.user.id,baseUrl()),sendingReady:mailer.configured()&&!!process.env.MARKETING_POSTAL_ADDRESS?.trim()&&!!process.env.SESSION_SECRET&&inbox.configured(),replyTo:REPLY});
 }));
 app.post('/api/outreach',requireAuth,safe(async(req,res)=>{
  const fields=normalize(req.body),contextId=String(req.body.contextId||'');const id=crypto.randomUUID();
  await mutate((g,db)=>{const chosen=context(db,req.user.id,contextId,baseUrl());if(blocked(g,db,fields.to))fail('This recipient has opted out of Better marketing.',409);if(g.drafts.filter(d=>d.authorId===req.user.id&&['draft','submitted','approved'].includes(d.status)).length>=50)fail('Finish existing drafts before adding more.',409);g.drafts.push({id,authorId:req.user.id,authorName:req.user.name||req.user.username,contextId:chosen.id,contextName:chosen.name,...fields,status:'draft',revision:1,createdAt:new Date().toISOString(),history:[]});});res.json({id});
 }));
 app.post('/api/outreach/:id/edit',requireAuth,safe(async(req,res)=>{const fields=normalize(req.body);await mutate((g,db)=>{const d=find(g,req.params.id);own(req,d);context(db,d.authorId,d.contextId,baseUrl());version(d,req.body);if(['sending','sent','uncertain'].includes(d.status))fail('A dispatched message cannot be edited.',409);Object.assign(d,fields,{status:'draft',revision:d.revision+1,approval:null,approvalHash:null,feedback:''});audit(d,'edited; approval cleared',req.user.id);});res.json({ok:true});}));
 app.post('/api/outreach/:id/submit',requireAuth,safe(async(req,res)=>{await mutate((g,db)=>{const d=find(g,req.params.id);own(req,d);version(d,req.body);context(db,d.authorId,d.contextId,baseUrl());if(!['draft','rejected'].includes(d.status))fail('Only a draft or rejected message can be submitted.',409);if(blocked(g,db,d.to))fail('This recipient has opted out.',409);d.status='submitted';d.approval=null;d.approvalHash=null;audit(d,'submitted',req.user.id);});res.json({ok:true});}));
 app.get('/api/outreach/:id/preview',requireAuth,safe(async(req,res)=>{const {db,g}=await read(),d=find(g,req.params.id);own(req,d);if(!admin(req))eligible(db,req.user.id);const preview=['sent','sending','uncertain'].includes(d.status)?d.approval:snapshot(d,db,baseUrl(),mailer);res.json({preview,revision:d.revision,previewHash:hash(JSON.stringify(preview))});}));
 app.post('/api/outreach/:id/review',requireAuth,requireAdmin,safe(async(req,res)=>{await mutate((g,db)=>{const d=find(g,req.params.id);version(d,req.body);if(!['submitted','approved'].includes(d.status))fail('Review a submitted message.',409);if(req.body.approved===true){if(blocked(g,db,d.to))fail('This recipient has opted out.',409);d.approval=snapshot(d,db,baseUrl(),mailer);if(!d.approval.postal)fail('Set MARKETING_POSTAL_ADDRESS before approving outreach.',503);d.approvalHash=hash(JSON.stringify(d.approval));if(req.body.previewHash!==d.approvalHash)fail('Open the current preview before approving this exact version.',409);d.status='approved';d.approvedBy=req.user.id;d.approvedAt=new Date().toISOString();}else{const feedback=String(req.body.feedback||'').trim();if(feedback.length<3||feedback.length>500)fail('Add 3–500 characters explaining the requested changes.');d.feedback=feedback;d.status='rejected';d.approval=null;d.approvalHash=null;}audit(d,d.status,req.user.id);});res.json({ok:true});}));
 app.post('/api/outreach/:id/send',requireAuth,requireAdmin,safe(async(req,res)=>{
  if(!mailer.configured())fail('Configure email delivery before sending.',503);
  const claim=await mutate((g,db)=>{
   const d=find(g,req.params.id);version(d,req.body);if(d.status==='sent')return {already:true};
   if(!['approved','uncertain','sending'].includes(d.status)||!d.approval)fail('Approve the exact message before sending.',409);
   if(d.status==='sending'&&Date.now()-Date.parse(d.attemptAt)<30000)fail('This message is already being sent.',409);
   if(d.firstAttemptAt&&Date.now()-Date.parse(d.firstAttemptAt)>23*3600000)fail('Retry window ended. Check the provider record before taking further action.',409);
   if(blocked(g,db,d.to))fail('This recipient has opted out.',409);
   const fresh=snapshot(d,db,baseUrl(),mailer);if(hash(JSON.stringify(fresh))!==d.approvalHash)fail('Sender, footer or referral details changed. Edit and resubmit for fresh approval.',409);
   if(!fresh.postal)fail('Configure the company postal address before sending.',503);
   if(!d.firstAttemptAt){
    if(!inbox.configured())fail('Configure the outreach receiving domain and signed webhook before sending new messages.',503);
    const attempts=g.drafts.filter(x=>x.firstAttemptAt&&Date.now()-Date.parse(x.firstAttemptAt)<DAY);
    if(attempts.some(x=>x.to===d.to))fail('This recipient was already contacted in the last 24 hours by a partner.',409);
    if(attempts.length>=100||attempts.filter(x=>x.authorId===d.authorId).length>=20)fail('Daily outreach limit reached (20 per partner, 100 total).',429);
    d.firstAttemptAt=new Date().toISOString();
   }
   d.status='sending';d.attemptAt=new Date().toISOString();audit(d,'send claimed',req.user.id);return {snapshot:d.approval,revision:d.revision};
  });
  if(claim.already)return res.json({ok:true,alreadySent:true});
  // Revalidate account/link and suppression after claiming, immediately before transport.
  try{const {db,g}=await read(),d=find(g,req.params.id);context(db,d.authorId,d.contextId,baseUrl());if(blocked(g,db,d.to))fail('Recipient opted out.',409);
   const result=await mailer.sendPartnerOutreach(claim.snapshot);if(result?.simulated||!result?.id)throw Error('Provider acceptance not confirmed');
   await mutate(g=>{const d=find(g,req.params.id);d.status='sent';d.providerId=result.id;d.sentAt=new Date().toISOString();d.error='';audit(d,'provider accepted',req.user.id);});res.json({ok:true,providerAccepted:true});
  }catch(e){await mutate(g=>{const d=find(g,req.params.id);d.status='uncertain';d.error='Sending was not confirmed. Check the provider, or retry this same approved message within 23 hours.';audit(d,'send unconfirmed',req.user.id);});res.status(502).json({error:'Sending was not confirmed. The saved message can be retried with the same duplicate-prevention key within 23 hours.'});}
 }));
 app.post('/api/outreach/suppress',requireAuth,requireAdmin,safe(async(req,res)=>{const to=email(req.body.to);await mutate(g=>{g.suppressions[hash(to)]={at:new Date().toISOString(),by:req.user.id};});res.json({ok:true});}));
 app.get('/api/outreach/unsubscribe',safe(async(req,res)=>{verify(req.query.token);res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width"><title>Stop Better marketing emails</title><h1>Stop Better marketing emails</h1><form method="post"><input type="hidden" name="token" value="'+esc(req.query.token)+'"><button>Unsubscribe from Better marketing</button></form>');}));
 app.post('/api/outreach/unsubscribe',safe(async(req,res)=>{const to=verify(req.query.token||req.body?.token);await mutate(g=>{g.suppressions[hash(to)]={at:new Date().toISOString(),by:'recipient'};});
  // Honor this stop request across the existing member-marketing system too.
  const db=await store.loadDB();let changed=false;for(const u of db.users)if(String(u.email||'').trim().toLowerCase()===to){u.marketingOptIn=false;u.marketingUnsubscribedAt=new Date().toISOString();changed=true;}if(changed)await store.saveDB(db);
  res.type('html').send('<!doctype html><meta name="viewport" content="width=device-width"><title>Unsubscribed</title><h1>You are unsubscribed</h1><p>Better marketing outreach has stopped. Account and transaction messages are unaffected.</p>');
 }));
}
module.exports={install,normalize,email,writer,snapshot,contexts,verify};
