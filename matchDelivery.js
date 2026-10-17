'use strict';
const store=require('./store'),mailer=require('./mailer'),rules=require('./connectedDeals');
let running=false;
async function run({limit=40}={}){
 if(running||!mailer.configured())return {sent:0,skipped:true};running=true;
 let sent=0,failed=0;const deadline=Date.now()+8000;
 try{const db=await store.loadDB();for(const n of (db.matchDeliveries||[]).filter(n=>n.kind==='buyer-match'&&!n.emailStatus).slice(0,limit)){
  if(Date.now()>deadline)break;
  const user=db.users.find(u=>u.id===n.userId),listing=db.listings.find(l=>l.id===n.listingId);
  const state=String(listing?.city||'').toUpperCase().match(/,\s*([A-Z]{2})(?:\s|$)/)?.[1]||'';
  const boxes=Array.isArray(user?.buyBoxes)?user.buyBoxes:user?.buyBox?[user.buyBox]:[];
  const eligible=user?.emailVerified&&user?.email&&user.demo!==true&&user.buyingStatus!=='paused'&&user.settings?.notifyOnMatch!==false&&user.settings?.notificationPrefs?.deals!==false&&listing&&rules.available(listing)&&(n.manual===true||db.users.find(u=>u.id===listing.ownerId)?.settings?.autoMatchListings!==false)&&boxes.some(b=>rules.match(b,listing,state).status==='match');
  const status=eligible?'sending':'skipped',at=new Date().toISOString();
  if(store.sql&&!store.FILE_MODE){const rows=await store.sql(`UPDATE ${store.tableFor('matchDeliveries')} SET data=data||$2::jsonb,updated_at=now() WHERE id=$1 AND NOT(data ? 'emailStatus') RETURNING id`,[n.id,JSON.stringify({emailStatus:status,emailAttemptAt:at})]);if(!rows.length)continue;}
  else{const fresh=await store.loadDB(),row=fresh.matchDeliveries.find(x=>x.id===n.id);if(!row||row.emailStatus)continue;Object.assign(row,{emailStatus:status,emailAttemptAt:at});fresh.__writeMatchDeliveries=true;await store.saveDB(fresh);}
  if(!eligible)continue;
  let result;try{result=await mailer.sendBuyerMatchNotice(user.email,user.name,listing,(process.env.APP_URL||'http://localhost:3000').replace(/\/$/,'')+'/?view=detail&id='+encodeURIComponent(listing.id),'better-'+n.id);if(result?.simulated)throw new Error('Email not configured');sent++;}catch{failed++;}
  const final={emailStatus:result&&!result.simulated?'sent':'failed',emailCompletedAt:new Date().toISOString()};
  if(store.sql&&!store.FILE_MODE)await store.sql(`UPDATE ${store.tableFor('matchDeliveries')} SET data=data||$2::jsonb,updated_at=now() WHERE id=$1`,[n.id,JSON.stringify(final)]);
  else{const fresh=await store.loadDB(),row=fresh.matchDeliveries.find(x=>x.id===n.id);if(row){Object.assign(row,final);fresh.__writeMatchDeliveries=true;await store.saveDB(fresh);}}
 }
 return {sent,failed};}finally{running=false;}
}
module.exports={run};
