'use strict';
const crypto=require('crypto'),express=require('express');
function configured(){return !!process.env.SESSION_SECRET&&!!process.env.RESEND_WEBHOOK_SECRET&&/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(process.env.OUTREACH_REPLY_DOMAIN||'');}
function replyAddress(d){if(!configured())return null;return 'r+'+crypto.createHmac('sha256',process.env.SESSION_SECRET).update(d.id+'\n'+d.authorId).digest('hex').slice(0,32)+'@'+process.env.OUTREACH_REPLY_DOMAIN;}
function verify(raw,headers,now=Date.now()){
 const id=headers['svix-id'],ts=headers['svix-timestamp'],sig=headers['svix-signature'],secret=process.env.RESEND_WEBHOOK_SECRET;
 if(!Buffer.isBuffer(raw)||!secret||typeof id!=='string'||id.length>200||!/^\d+$/.test(ts||'')||Math.abs(now/1000-Number(ts))>300||typeof sig!=='string')return false;
 const expected=crypto.createHmac('sha256',Buffer.from(secret.replace(/^whsec_/,''),'base64')).update(id+'.'+ts+'.').update(raw).digest();
 return sig.split(' ').some(v=>{const [version,value]=v.split(',');if(version!=='v1'||!value)return false;const b=Buffer.from(value,'base64');return b.length===expected.length&&crypto.timingSafeEqual(b,expected);});
}
function address(v){const s=String(v||'').trim().toLowerCase(),m=s.match(/<([^<>]+)>$/);return m?m[1]:s;}
function plain(data){if(typeof data.text==='string'&&data.text.trim())return data.text.slice(0,40000);return String(data.html||'').slice(0,200000).replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi,'').replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&').slice(0,40000);}
function install(app,{mutate,read,find,own,admin,safe,requireAuth,requireAdmin,eligible,mailer}){
 app.post('/api/outreach/webhook',express.raw({type:'application/json',limit:'1mb'}),safe(async(req,res)=>{
  if(!verify(req.body,req.headers))return res.status(401).json({error:'Invalid webhook signature.'});
  let event;try{event=JSON.parse(req.body.toString());}catch{return res.status(400).json({error:'Invalid event JSON.'});}
  if(event.type!=='email.received')return res.json({ok:true,ignored:true});
  const id=event.data?.email_id;if(typeof id!=='string'||!/^[a-zA-Z0-9_-]{1,100}$/.test(id))return res.status(400).json({error:'Missing received email ID.'});
  const prior=await read();if((prior.g.replies||[]).some(r=>r.providerId===id))return res.json({ok:true,duplicate:true});
  const data=await mailer.retrieveReceivedEmail(id);if(data.id!==id)throw Error('Provider ID mismatch');
  const recipients=[...(Array.isArray(data.to)?data.to:[]),...(Array.isArray(data.received_for)?data.received_for:[])].map(address),from=address(data.from),at=new Date().toISOString();
  await mutate(g=>{
   if(g.replies.some(r=>r.providerId===id))return;
   const matches=g.drafts.filter(d=>d.firstAttemptAt&&recipients.includes(address(d.approval?.replyTo))&&/^r\+[a-f0-9]{32}@/.test(d.approval?.replyTo||''));
   const d=matches.length===1?matches[0]:null,reason=!d?'Unmatched or ambiguous reply address':from!==d.to?'Sender does not match the original recipient':String(data.authentication?.dmarc||'').toLowerCase()==='fail'?'Provider reported DMARC failure':'';
   g.replies.push({id:crypto.randomUUID(),providerId:id,draftId:d?.id||null,authorId:d?.authorId||null,quarantined:!!reason,reason,from:from.slice(0,254),subject:String(data.subject||'').slice(0,300),text:plain(data),at,providerReceivedAt:String(data.created_at||'').slice(0,60),attachments:(Array.isArray(data.attachments)?data.attachments:[]).slice(0,30).map(a=>({filename:String(a.filename||'attachment').slice(0,200),size:Math.max(0,Number(a.size)||0)}))});
  });res.json({ok:true});
 }));
 app.get('/api/outreach/inbox',requireAuth,safe(async(req,res)=>{
  const {db,g}=await read(),isAdmin=admin(req);if(!isAdmin)eligible(db,req.user.id);
  const replies=(g.replies||[]).filter(r=>isAdmin||(!r.quarantined&&r.authorId===req.user.id));
  const page=Math.max(1,Math.min(Math.ceil(replies.length/25)||1,Number(req.query.page)||1));res.json({configured:configured(),page,totalPages:Math.ceil(replies.length/25)||1,replies:replies.slice().sort((a,b)=>b.at.localeCompare(a.at)).slice((page-1)*25,page*25).map(r=>({...r,authorName:g.drafts.find(d=>d.id===r.draftId)?.authorName||''}))});
 }));
 app.get('/api/outreach/:id/thread',requireAuth,safe(async(req,res)=>{
  const {db,g}=await read(),d=find(g,req.params.id);own(req,d);if(!admin(req))eligible(db,req.user.id);
  res.json({subject:d.subject,to:d.to,outbound:d.approval?{text:d.approval.text,sentAt:d.sentAt||null,status:d.status}:null,replies:(g.replies||[]).filter(r=>r.draftId===d.id&&(admin(req)||!r.quarantined))});
 }));
}
module.exports={configured,replyAddress,verify,plain,install};
