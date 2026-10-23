'use strict';
const crypto=require('crypto'),policy=require('./policy');
function enqueue(g,db,d){
 g.alerts=g.alerts||[];d.submission=(d.submission||0)+1;d.submittedAt=new Date().toISOString();
 for(const u of db.users.filter(u=>u.role==='admin'&&policy.isAdminEmail(u.email)&&!u.demo&&!u.disabled&&!u.suspended&&!u.deletedAt))g.alerts.push({id:crypto.randomUUID(),userId:u.id,draftId:d.id,submission:d.submission,title:'Partner email needs approval',body:d.authorName+' submitted “'+d.subject+'” for review.',at:d.submittedAt,read:false,emailStatus:'pending'});
}
async function deliver({store,mutate,mailer,baseUrl},limit=5){
 if(!mailer.configured())return {sent:0,pending:true};let sent=0;
 const db=await store.loadDB(),g=(db.campaignOutreach||[]).find(x=>x.id==='global');
 const ids=(g?.alerts||[]).filter(a=>['pending','failed'].includes(a.emailStatus)||a.emailStatus==='sending'&&Date.now()-Date.parse(a.attemptAt)>60000).slice(0,limit).map(a=>a.id);
 for(const id of ids){
  const claim=await mutate((g,db)=>{const a=g.alerts?.find(x=>x.id===id);if(!a||a.emailStatus==='sent'||a.emailStatus==='sending'&&Date.now()-Date.parse(a.attemptAt)<60000)return null;const u=db.users.find(u=>u.id===a.userId&&u.role==='admin'&&policy.isAdminEmail(u.email)&&!u.disabled&&!u.suspended&&!u.deletedAt);if(!u){a.emailStatus='cancelled';return null;}if(a.firstAttemptAt&&Date.now()-Date.parse(a.firstAttemptAt)>23*3600000){a.emailStatus='expired';return null;}a.firstAttemptAt=a.firstAttemptAt||new Date().toISOString();a.attemptAt=new Date().toISOString();a.emailStatus='sending';return {id:a.id,to:u.email,title:a.title,body:a.body,key:'outreach-alert/'+a.id,url:baseUrl()+'/?view=admin&outreach=approvals'};});
  if(!claim)continue;
  try{const r=await mailer.sendOutreachApprovalAlert(claim);if(!r?.id||r.simulated)throw Error('Not confirmed');await mutate(g=>{const a=g.alerts.find(x=>x.id===id);a.emailStatus='sent';a.emailedAt=new Date().toISOString();});sent++;}
  catch{await mutate(g=>{const a=g.alerts.find(x=>x.id===id);a.emailStatus='failed';});}
 }
 return {sent};
}
async function run({limit=5}={}){const store=require('./store');return deliver({store,mutate:require('./campaignOutreach').writer(store),mailer:require('./mailer'),baseUrl:()=>String(process.env.APP_URL||'https://betterrealestate.org').replace(/\/$/,'')},limit);}
module.exports={enqueue,deliver,run};
