'use strict';
// Direct APNs delivery. No third-party notification provider. Secrets stay server-side.
const http2 = require('node:http2');
const crypto = require('node:crypto');
const SOUND = 'better-bark.wav';
const configured = () => ['APNS_TEAM_ID','APNS_KEY_ID','APNS_PRIVATE_KEY','APNS_TOPIC'].every(k => Boolean(process.env[k]));
function jwt() {
  const head = Buffer.from(JSON.stringify({alg:'ES256',kid:process.env.APNS_KEY_ID})).toString('base64url');
  const body = Buffer.from(JSON.stringify({iss:process.env.APNS_TEAM_ID,iat:Math.floor(Date.now()/1000)})).toString('base64url');
  const data = `${head}.${body}`;
  return `${data}.${crypto.sign('sha256',Buffer.from(data),{key:process.env.APNS_PRIVATE_KEY.replace(/\\n/g,'\n'),dsaEncoding:'ieee-p1363'}).toString('base64url')}`;
}
function send(device,payload,live=false) {
  return new Promise((resolve,reject) => {
    const client = http2.connect(device.environment === 'sandbox' ? 'https://api.sandbox.push.apple.com' : 'https://api.push.apple.com');
    let settled=false;
    const finish=(error,result)=>{if(settled)return;settled=true;clearTimeout(timer);client.destroy();error?reject(error):resolve(result);};
    const timer=setTimeout(()=>finish(new Error('APNs timeout')),8000);
    client.on('error',error=>finish(error));
    const req=client.request({':method':'POST',':path':`/3/device/${device.token}`,authorization:`bearer ${jwt()}`,'apns-topic':process.env.APNS_TOPIC+(live?'.push-type.liveactivity':''),'apns-push-type':live?'liveactivity':'alert','apns-priority':live?'5':'10','apns-expiration':String(Math.floor(Date.now()/1000)+3600),'content-type':'application/json'});
    let status,body='';req.on('response',headers=>{status=Number(headers[':status']);});req.on('data',chunk=>{body+=chunk;});req.on('error',error=>finish(error));
    req.on('end',()=>{let reason='';try{reason=JSON.parse(body).reason||'';}catch{}finish(null,{status,reason});});req.end(JSON.stringify(payload));
  });
}
function eventsFor(db,user) {
  const prefs=user.settings?.notificationPrefs||{};
  const messages=prefs.messages===false?[]:(db.messages||[]).filter(x=>x.toUserId===user.id&&!x.read).map(x=>({id:'message:'+x.id,at:x.at,title:'New message',body:'You have a new message on Better Real Estate.',view:'messages'}));
  const deals=user.settings?.notifyOnMatch===false||prefs.deals===false||prefs.savedSearches===false?[]:(db.dealNotifications||[]).filter(x=>x.userId===user.id&&!x.read).map(x=>({id:'deal:'+x.id,at:x.at,title:'A new real estate update',body:'Open Better to see the latest opportunity.',view:'savedsearches'}));
  return [...messages,...deals].filter(x=>x.id&&!Number.isNaN(Date.parse(x.at))).sort((a,b)=>a.at.localeCompare(b.at)||a.id.localeCompare(b.id));
}
function payloadFor(event) {
  return {aps:{alert:{title:event.title,body:event.body},sound:SOUND},url:`https://betterrealestate.org/?view=${event.view}`};
}
function register(app,{requireAuth,saveDB}) {
  app.get('/api/native-push/status',requireAuth,async(req,res)=>res.json({ready:configured()}));
  const validate=(req,res)=>{
    const token=String(req.body?.token||'').toLowerCase();
    if(!/^[0-9a-f]{64,512}$/.test(token)){res.status(400).json({error:'Invalid device token.'});return null;}return token;
  };
  app.post('/api/native-push/devices',requireAuth,async(req,res)=>{
    if(!configured())return res.status(503).json({error:'Push delivery has not been configured.'});
    const token=validate(req,res);if(!token)return;
    const environment=req.body?.environment;if(!['sandbox','production'].includes(environment))return res.status(400).json({error:'Invalid push environment.'});
    req.db.nativePushDevices ||= [];
    const id=crypto.createHash('sha256').update(environment+':'+token).digest('hex');
    const existing=req.db.nativePushDevices.find(x=>x.id===id&&x.userId===req.user.id);
    req.db.nativePushDevices=req.db.nativePushDevices.filter(x=>x.token!==token);
    const owned=req.db.nativePushDevices.filter(x=>x.userId===req.user.id).sort((a,b)=>a.since.localeCompare(b.since));
    if(owned.length>=5)req.db.nativePushDevices=req.db.nativePushDevices.filter(x=>x.id!==owned[0].id);
    req.db.nativePushDevices.push(existing||{id,userId:req.user.id,token,environment,since:new Date().toISOString(),seen:[]});
    await saveDB(req.db);res.json({registered:true});
  });
  app.delete('/api/native-push/devices',requireAuth,async(req,res)=>{
    const token=validate(req,res);if(!token)return;
    req.db.nativePushDevices=(req.db.nativePushDevices||[]).filter(x=>!(x.userId===req.user.id&&x.token===token));
    await saveDB(req.db);res.json({removed:true});
  });
}
async function dispatch({loadDB,saveDB,deliver=send}) {
  if(!configured())return {configured:false,sent:0};
  const db=await loadDB();let sent=0,failed=0;const deadline=Date.now()+18000;
  for(const user of db.users||[]){
    for(const device of (db.nativePushDevices||[]).filter(x=>x.userId===user.id)){
      const seen=new Set(device.seen||[]);
      if(Date.now()>deadline)break;
      for(const event of eventsFor(db,user).filter(x=>x.at>=device.since&&!seen.has(x.id)).slice(0,20)){
        if(Date.now()>deadline)break;
        let result;try{result=await deliver(device,payloadFor(event));}catch{failed++;break;}
        if(result.status===410||['BadDeviceToken','Unregistered','DeviceTokenNotForTopic'].includes(result.reason)){
          db.nativePushDevices=db.nativePushDevices.filter(x=>x!==device);break;
        }
        if(result.status!==200){failed++;break;}
        if(event.at>device.since){device.since=event.at;seen.clear();}
        seen.add(event.id);device.seen=[...seen];sent++;
      }
    }
  }
  db.nativePushDevices=(db.nativePushDevices||[]).filter(x=>(db.users||[]).some(u=>u.id===x.userId));
  await saveDB(db);return {configured:true,sent,failed};
}
module.exports={register,dispatch,eventsFor,payloadFor,configured,sendLive:(device,payload)=>send(device,payload,true)};
