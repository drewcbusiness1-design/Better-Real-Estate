// Email-confirmation reminders reuse the communications scheduler. No marketing content.
const crypto=require('crypto'),policy=require('./policy');
const INTERVAL_MS=48*60*60*1000;
function verificationReminderDue(user,now=Date.now()) {
  if(!user||user.emailVerified||user.demo===true||user.role==='admin'||policy.isAdminEmail(user.email)||!user.email)return false;
  const dates=[user.createdAt,user.verificationEmailLastAttemptAt,user.verificationReminderAttemptAt].filter(Boolean).map(x=>Date.parse(x));
  return dates.length>0&&dates.every(Number.isFinite)&&now-Math.max(...dates)>=INTERVAL_MS;
}
function createVerificationReminderRunner({store,mailer,clock=()=>Date.now()}) {
  const patchUser=async(id,patch)=>{
    if(store.FILE_MODE||!store.sql){const db=await store.loadDB(),u=db.users.find(x=>x.id===id);if(!u)return;Object.assign(u,patch);await store.saveDB(db);}
    else await store.sql(`UPDATE ${store.tableFor('users')} SET data=data || $2::jsonb,updated_at=now() WHERE id=$1`,[id,JSON.stringify(patch)]);
  };
  return async function runVerificationReminderCycle({limit=40}={}) {
    if(!mailer.configured())return {sent:0,skipped:true,reason:'mail-not-configured'};
    const db=await store.loadDB(),now=clock(),at=new Date(now).toISOString(),cutoff=new Date(now-INTERVAL_MS).toISOString();
    const due=db.users.filter(u=>verificationReminderDue(u,now)).sort((a,b)=>String(a.verificationReminderAttemptAt||a.createdAt).localeCompare(String(b.verificationReminderAttemptAt||b.createdAt)));
    let sent=0,failed=0;
    for(const candidate of due.slice(0,Math.max(1,Math.min(60,Number(limit)||40)))) {
      let user;
      if(store.FILE_MODE||!store.sql){const fresh=await store.loadDB();user=fresh.users.find(u=>u.id===candidate.id);if(!verificationReminderDue(user,now))continue;user.verificationReminderAttemptAt=at;await store.saveDB(fresh);}
      else {
        const rows=await store.sql(`UPDATE ${store.tableFor('users')} SET data=data || jsonb_build_object('verificationReminderAttemptAt',$2::text),updated_at=now()
          WHERE id=$1 AND COALESCE(data->>'emailVerified','false')<>'true' AND COALESCE(data->>'demo','false')<>'true'
          AND COALESCE(data->>'role','')<>'admin' AND NOT(lower(COALESCE(data->>'email',''))=ANY($4::text[]))
          AND COALESCE(data->>'verificationReminderAttemptAt','')<=$3
          AND COALESCE(data->>'verificationEmailLastAttemptAt','')<=$3 RETURNING data`,[candidate.__id||candidate.id,at,cutoff,policy.adminEmails()]);
        user=rows[0]?.data;if(!user)continue;
      }
      try {
        // Recheck after claiming; user may have verified while this cycle was loading.
        const fresh=await store.loadDB(),current=fresh.users.find(u=>u.id===user.id);if(!current||current.emailVerified||Date.parse(current.verificationEmailLastAttemptAt||0)>now-INTERVAL_MS)continue;
        let token=fresh.tokens.find(t=>t.userId===user.id&&t.kind==='verify'&&Number(t.expires)>now+INTERVAL_MS)?.token;
        if(!token){token=crypto.randomBytes(24).toString('hex');await store.appendRecord('tokens',{token,userId:user.id,kind:'verify',expires:now+7*24*60*60*1000});}
        await mailer.sendVerification(current.email,current.name,token);
        await patchUser(user.id,{verificationReminderSentAt:at,verificationEmailLastStatus:'sent',verificationEmailLastAttemptAt:at,verificationEmailLastError:null});sent++;
      }catch(error){await patchUser(user.id,{verificationEmailLastStatus:'failed',verificationEmailLastAttemptAt:at,verificationEmailLastError:String(error.message||'Email delivery failed').slice(0,500)});failed++;}
    }
    return {sent,failed,due:due.length};
  };
}
module.exports={INTERVAL_MS,verificationReminderDue,createVerificationReminderRunner,runVerificationReminderCycle:createVerificationReminderRunner({store:require('./store'),mailer:require('./mailer')})};
