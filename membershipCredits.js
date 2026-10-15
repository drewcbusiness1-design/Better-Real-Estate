/* Selected membership credits: one active reservation per member, no background job. */
const crypto=require('crypto');
const fail=message=>{const e=new Error(message);e.status=409;throw e;};
function validate(value,total){const n=value===undefined?0:value;if(!Number.isSafeInteger(n)||n<0||n>total)throw new Error('Choose a valid credit amount in whole cents, up to the membership payment.');return n;}
function create(store){
 let tail=Promise.resolve();
 const read=async id=>store.FILE_MODE?(await store.loadDB()).users.find(u=>u.id===id):(await store.sql('SELECT data FROM kv_users WHERE id=$1',[id]))[0]?.data;
 const run=async(id,fn)=>{for(let n=0;n<8;n++){const user=await read(id);if(!user)fail('Account not found.');const old=user.membershipCreditState||{revision:0};const state=structuredClone(old),result=fn(state,Number(user.betterCreditCents||0));if(result===false)return {user,state:old};state.revision=(old.revision||0)+1;
 const debit=result?.debit||0;const entry=debit?{id:'membership-credit-'+result.sessionId,userId:id,type:'purchase',amount:-debit,description:'Better Credit applied to membership',meta:{nonWithdrawable:true,betterCreditSession:result.sessionId},at:new Date().toISOString()}:null;
 if(store.FILE_MODE){const db=await store.loadDB(),u=db.users.find(x=>x.id===id);if(!u)fail('Account not found.');u.membershipCreditState=state;u.betterCreditCents=Number(u.betterCreditCents||0)-debit;if(entry&&!db.ledger.some(l=>l.id===entry.id))db.ledger.push(entry);db.__writeMembershipCredits=true;await store.saveDB(db);return {user:u,state};}
 const rows=await store.sql(`WITH changed AS (UPDATE kv_users SET data=jsonb_set(jsonb_set(data,'{membershipCreditState}',$2::jsonb),'{betterCreditCents}',to_jsonb(COALESCE((data->>'betterCreditCents')::bigint,0)-$4::bigint)),updated_at=now() WHERE id=$1 AND COALESCE((data->'membershipCreditState'->>'revision')::int,0)=$3 AND COALESCE((data->>'betterCreditCents')::bigint,0)>=GREATEST($4::bigint,COALESCE(($2::jsonb->'active'->>'amount')::bigint,0)) RETURNING data), receipt AS (INSERT INTO kv_ledger(id,data) SELECT $5,$6::jsonb FROM changed WHERE $4::bigint>0 ON CONFLICT DO NOTHING RETURNING id) SELECT data FROM changed`,[id,JSON.stringify(state),old.revision||0,debit,entry?.id||'unused',JSON.stringify(entry)]);
 if(rows.length)return {user:rows[0].data,state};
 }fail('Your credits changed. Please refresh and try again.');};
 const mutate=(id,fn)=>{if(!store.FILE_MODE)return run(id,fn);const p=tail.then(()=>run(id,fn));tail=p.catch(()=>{});return p;};
 return {read,
 reserve:async(id,amount,total,tier,period)=>{validate(amount,total);return mutate(id,(s,balance)=>{if(s.active)fail('A credit checkout is already open. Resume or cancel it before starting another.');if(amount>balance)fail('Your available Better Credits changed. Refresh and choose a lower amount.');s.active={id:crypto.randomUUID(),amount,total,tier,period,createdAt:new Date().toISOString()};return {};});},
 link:(id,reservation,session)=>mutate(id,s=>{if(s.active?.id!==reservation)return false;s.active.sessionId=session.id;s.active.url=session.url;return {};}),
 release:(id,reservation)=>mutate(id,s=>{if(s.active?.id!==reservation)return false;delete s.active;return {};}),
 complete:(id,sess)=>mutate(id,(s,balance)=>{if(s.active?.id!==sess.metadata?.creditReservationId)return false;const a=s.active;if(a.amount!==Number(sess.metadata.betterCreditCents)||a.tier!==sess.metadata.tier||a.period!==sess.metadata.period)fail('Checkout credit details did not match.');if(a.amount>balance)fail('Credit balance requires review.');delete s.active;return {debit:a.amount,sessionId:sess.id};}),
 available:user=>Math.max(0,Number(user?.betterCreditCents||0)-Number(user?.membershipCreditState?.active?.amount||0))};
}
module.exports={create,validate};
