'use strict';
const assert=require('node:assert/strict');
const {summaryFor}=require('../notificationCounts.cjs');
const push=require('../nativePush.cjs');
const oldEnv={...process.env};
Object.assign(process.env,{APNS_TEAM_ID:'TEST',APNS_KEY_ID:'TEST',APNS_PRIVATE_KEY:'synthetic-unused',APNS_TOPIC:'org.example.test',ADMIN_EMAILS:'admin@example.invalid'});
const clone=x=>JSON.parse(JSON.stringify(x));
const since='2026-11-04T15:00:00.000Z';
const old='2026-11-04T14:00:00.000Z';
const fresh='2026-11-04T16:00:00.000Z';
function fixture(){return {
  users:[{id:'member',role:'buyer',email:'member@example.invalid'},{id:'sender',role:'buyer',name:'Sender'},{id:'affiliate',role:'affiliate'},{id:'admin',role:'admin',email:'admin@example.invalid'},{id:'fake-admin',role:'admin',email:'not-allowed@example.invalid'}],
  messages:[{id:'m1',fromUserId:'sender',toUserId:'member',read:false,at:old,body:'Private preview'},{id:'m2',fromUserId:'sender',toUserId:'member',read:true,at:old},{id:'outgoing',fromUserId:'member',toUserId:'sender',read:true,at:old}],
  friendRequests:[{id:'f1',fromUserId:'sender',toUserId:'member',status:'pending'},{id:'f2',fromUserId:'affiliate',toUserId:'member',status:'pending'},{id:'f3',fromUserId:'sender',toUserId:'member',status:'accepted'}],
  dealNotifications:[{id:'d1',userId:'member',read:false,at:old},{id:'d2',userId:'member',read:true,at:old}],
  affiliateApplications:[{id:'a1',status:'pending'},{id:'a2',status:'approved'}],
  reports:[{id:'r1',status:'open'},{id:'r2',status:'closed'}],
  campaignOutreach:[{id:'global',alerts:[{userId:'admin',read:false},{userId:'fake-admin',read:false},{userId:'admin',read:true}]}],
  nativePushDevices:[{id:'phone',userId:'member',token:'a'.repeat(64),environment:'sandbox',since,seen:[]}]
};}
async function run(db,deliver){let saves=0;const payloads=[];
  const result=await push.dispatch({loadDB:async()=>db,saveDB:async()=>saves++,deliver:async(device,payload)=>{payloads.push({device:clone(device),payload:clone(payload)});return deliver?deliver(device,payload):{status:200,reason:''};}});
  assert.equal(saves,1);return {result,payloads};
}
async function main(){
  const db=fixture(),member=db.users[0];
  const before=JSON.stringify(db),summary=summaryFor(db,member);
  assert.equal(summary.total,3);assert.equal(summary.profile,3);
  assert.deepEqual(summary.destinations,{messages:1,network:1,savedsearches:1,affiliate:0,reports:0,admin:0});
  assert.equal(JSON.stringify(db),before,'counting is read-only');
  assert.equal(summaryFor(db,db.users[3]).total,3,'allowlisted admin gets own admin counters');
  assert.equal(summaryFor(db,db.users[4]).total,0,'role alone cannot expose admin counts');

  const initial=await run(db);
  assert.equal(initial.result.sent,1);assert.equal(initial.result.badgeUpdates,1);assert.equal(initial.result.eligible,0);
  assert.deepEqual(initial.payloads[0].payload,{aps:{badge:3}});
  assert.equal(db.nativePushDevices[0].since,since);assert.deepEqual(db.nativePushDevices[0].seen,[]);
  assert.equal(db.nativePushDevices[0].badgeCount,3);
  assert.equal((await run(db)).payloads.length,0,'unchanged badges are not resent every minute');

  db.messages[0].read=true;
  const read=await run(db);assert.deepEqual(read.payloads[0].payload,{aps:{badge:2}});
  db.friendRequests[0].status='accepted';db.dealNotifications[0].read=true;
  const clear=await run(db);assert.deepEqual(clear.payloads[0].payload,{aps:{badge:0}});
  assert.equal((await run(db)).payloads.length,0,'zero is persisted after acceptance');

  const alertDB=fixture();alertDB.messages[0].at=fresh;
  const alerts=await run(alertDB);
  assert.equal(alerts.payloads.length,1,'no second badge push after a successful alert');
  assert.equal(alerts.payloads[0].payload.aps.badge,3);
  assert.equal(alerts.payloads[0].payload.aps.alert.body,'Private preview');
  assert.equal(alerts.payloads[0].payload.aps.sound,'better-bark.wav');
  assert.deepEqual(alertDB.nativePushDevices[0].seen,['message:m1']);
  assert.equal((await run(alertDB)).payloads.length,0,'accepted alert and badge do not replay');

  const multi=fixture();multi.nativePushDevices.push({...multi.nativePushDevices[0],id:'second',token:'b'.repeat(64),environment:'production'},{...multi.nativePushDevices[0],id:'other',userId:'sender',token:'c'.repeat(64)});
  const devices=await run(multi);assert.deepEqual(devices.payloads.map(x=>x.payload.aps.badge),[3,3,0]);
  assert.equal((await run(multi)).payloads.length,0);

  const retry=fixture(),originalError=console.error,logs=[];console.error=(...args)=>logs.push(args);
  try {
    const rejected=await run(retry,()=>({status:503,reason:'ServiceUnavailable'}));
    assert.equal(rejected.result.failed,1);assert.equal(rejected.result.sent,0);
    assert.equal(retry.nativePushDevices[0].badgeCount,undefined,'failed updates stay retryable');
    assert.equal((await run(retry)).result.badgeUpdates,1);
    const failedAlert=fixture();failedAlert.messages[0].at=fresh;
    const failure=await run(failedAlert,()=>{throw Object.assign(new Error('PRIVATE_FAILURE_SENTINEL'),{code:'ECONNRESET'});});
    assert.equal(failure.payloads.length,1,'failed alert is not followed by a badge retry in the same pass');
    assert.equal(failedAlert.nativePushDevices[0].badgeCount,undefined);
    assert.deepEqual(failedAlert.nativePushDevices[0].seen,[]);
    assert(!JSON.stringify(logs).includes('PRIVATE_FAILURE_SENTINEL'));
    const invalid=fixture();await run(invalid,()=>({status:400,reason:'BadDeviceToken'}));assert.equal(invalid.nativePushDevices.length,0);
  } finally {console.error=originalError;}

  // Exercise the real authenticated unregister route: only the owner's device
  // gets a zero badge, and persistence happens before the best-effort clear.
  const routes={},sent=[];let saved=false;
  const app={get(){},post(){},delete(path,...handlers){routes[path]=handlers.at(-1);}};
  push.register(app,{requireAuth(){},saveDB:async()=>{saved=true;},deliver:async(device,payload)=>{assert(saved);sent.push({id:device.id,payload});return {status:200};}});
  const logout=fixture();logout.nativePushDevices.push({...logout.nativePushDevices[0],id:'other',userId:'sender',token:'b'.repeat(64)});
  let response;
  await routes['/api/native-push/devices']({body:{token:'a'.repeat(64)},user:logout.users[0],db:logout},{json:x=>response=x});
  assert.deepEqual(response,{removed:true});assert.deepEqual(sent,[{id:'phone',payload:{aps:{badge:0}}}]);
  assert.equal(logout.nativePushDevices[0].id,'other');
  saved=false;sent.length=0;
  await routes['/api/native-push/devices']({body:{token:'b'.repeat(64)},user:logout.users[0],db:logout},{json:x=>response=x});
  assert.equal(sent.length,0,'cannot clear another account installation');assert.equal(logout.nativePushDevices.length,1);

  console.log('PASS native icon badges: exact shared counts/admin isolation, old unread sync, read/decrease/zero, deduplication, alerts, multi-device ownership, retry, invalid tokens and sign-out clear.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>{
  for(const key of ['APNS_TEAM_ID','APNS_KEY_ID','APNS_PRIVATE_KEY','APNS_TOPIC','ADMIN_EMAILS']){if(oldEnv[key]===undefined)delete process.env[key];else process.env[key]=oldEnv[key];}
});
