'use strict';
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
const fs=require('node:fs');
const vm=require('node:vm');
const {EventEmitter}=require('node:events');
const source=fs.readFileSync(process.argv[2]||require.resolve('../nativePush.cjs'),'utf8');
const {privateKey,publicKey}=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
const pem=privateKey.export({type:'pkcs8',format:'pem'});
let checks=0;
function harness(options={}) {
  const state={connections:[],headers:[],payloads:[],logs:[],timers:new Set(),destroyed:0};
  const env={APNS_TEAM_ID:'TEST_TEAM',APNS_KEY_ID:'TEST_KEY',APNS_TOPIC:'org.example.test',APNS_PRIVATE_KEY:pem,...options.env};
  const http2={connect(url){
    if(options.connectError)throw options.connectError;
    state.connections.push(url);
    const client=new EventEmitter();
    client.destroy=()=>state.destroyed++;
    client.request=headers=>{
      if(options.requestError)throw options.requestError;
      state.headers.push(headers);
      const req=new EventEmitter();
      req.end=body=>{
        state.payloads.push(JSON.parse(body));
        queueMicrotask(()=>{
          if(options.connectionEvent)client.emit('error',options.connectionEvent);
          else if(options.requestEvent)req.emit('error',options.requestEvent);
          else if(options.timeout)[...state.timers][0]();
          else {req.emit('response',{':status':options.status||200});req.emit('data',JSON.stringify({reason:options.reason||''}));req.emit('end');}
        });
      };
      return req;
    };
    return client;
  }};
  const sandbox={module:{exports:{}},Buffer,Date,Set,process:{env},
    require:name=>name==='node:http2'?http2:name==='node:crypto'?(options.crypto||crypto):require(name),
    console:{error:(...args)=>state.logs.push(args)},
    setTimeout:fn=>{state.timers.add(fn);return fn;},clearTimeout:fn=>state.timers.delete(fn)};
  vm.runInNewContext(source,sandbox,{filename:'nativePush.cjs'});
  return {push:sandbox.module.exports,state,env};
}
function database() {return {
  users:[{id:'sender',name:'Test Sender'},{id:'receiver'}],
  messages:[{id:'one',toUserId:'receiver',fromUserId:'sender',body:'Private test preview',at:'2026-11-04T14:01:00.000Z',read:false}],
  nativePushDevices:[{id:'device',userId:'receiver',token:'a'.repeat(64),environment:'sandbox',since:'2026-11-04T14:00:00.000Z',seen:[]}]
};}
async function dispatch(h,db=database()) {
  let saves=0;
  const result=await h.push.dispatch({loadDB:async()=>db,saveDB:async saved=>{assert.equal(saved,db);saves++;}});
  assert.equal(saves,1);return {result,db};
}
function noResources(h) {assert.equal(h.state.timers.size,0);assert.equal(h.state.connections.length,h.state.destroyed);}
async function main() {
  for(const key of [pem,pem.replace(/\n/g,'\\n'),pem.replace(/\n/g,'\r\n')]) {
    const h=harness({env:{APNS_PRIVATE_KEY:key}}),{result,db}=await dispatch(h);
    assert.equal(result.sent,1);assert.equal(result.failed,0);
    const headers=h.state.headers[0],parts=headers.authorization.slice(7).split('.');
    assert.equal(JSON.parse(Buffer.from(parts[0],'base64url')).alg,'ES256');
    assert.equal(JSON.parse(Buffer.from(parts[1],'base64url')).iss,'TEST_TEAM');
    const signature=Buffer.from(parts[2],'base64url');assert.equal(signature.length,64);
    assert(crypto.verify('sha256',Buffer.from(parts.slice(0,2).join('.')),{key:publicKey,dsaEncoding:'ieee-p1363'},signature));
    assert.equal(headers['apns-topic'],'org.example.test');assert.equal(headers['apns-push-type'],'alert');
    assert.equal(h.state.connections[0],'https://api.sandbox.push.apple.com');
    assert.equal(h.state.payloads[0].aps.alert.title,'Test Sender');
    assert.equal(h.state.payloads[0].aps.alert.body,'Private test preview');
    assert.equal(h.state.payloads[0].aps.sound,'better-bark.wav');
    assert.equal(db.nativePushDevices[0].seen[0],'message:one');
    const again=await dispatch(h,db);assert.equal(again.result.sent,0);assert.equal(h.state.headers.length,1);
    assert.equal(h.state.logs.length,0);noResources(h);checks++;
  }
  {
    const h=harness();const r=await h.push.sendLive({token:'b'.repeat(64),environment:'production'},{aps:{event:'update'}});
    assert.equal(r.status,200);assert.equal(h.state.connections[0],'https://api.push.apple.com');
    assert.equal(h.state.headers[0]['apns-topic'],'org.example.test.push-type.liveactivity');
    assert.equal(h.state.headers[0]['apns-push-type'],'liveactivity');assert.equal(h.state.headers[0]['apns-priority'],'5');
    noResources(h);checks++;
  }
  for(const value of ['PRIVATE_KEY_SENTINEL',JSON.stringify(pem),'-----BEGIN PRIVATE KEY-----\nINVALID_PRIVATE_KEY_SENTINEL\n-----END PRIVATE KEY-----','']) {
    const h=harness({env:{APNS_PRIVATE_KEY:value}});
    if(!value) {
      assert.equal(h.push.configured(),false);
      await assert.rejects(h.push.sendLive({token:'device-token'},{aps:{}}),e=>e.apnsStage==='key-parse');
    } else {
      const {result,db}=await dispatch(h);assert.equal(result.sent,0);assert.equal(result.failed,1);
      assert.equal(db.nativePushDevices.length,1);assert.equal(db.nativePushDevices[0].since,'2026-11-04T14:00:00.000Z');
      assert.equal(db.nativePushDevices[0].seen.length,0);
      const logged=JSON.parse(h.state.logs[0][1]);assert.equal(logged.stage,'key-parse');
      assert(Object.values(logged.keyFormat).every(x=>typeof x==='boolean'));
      const logs=JSON.stringify(h.state.logs);
      for(const secret of ['PRIVATE_KEY_SENTINEL','INVALID_PRIVATE_KEY_SENTINEL','Test Sender','Private test preview','a'.repeat(64),pem.trim()])assert(!logs.includes(secret));
      if(value===JSON.stringify(pem))assert.equal(logged.keyFormat.surroundingQuotes,true);
    }
    assert.equal(h.state.connections.length,0);noResources(h);checks++;
  }
  {
    const wrongKey=crypto.generateKeyPairSync('ec',{namedCurve:'secp384r1'}).privateKey.export({type:'pkcs8',format:'pem'});
    const h=harness({env:{APNS_PRIVATE_KEY:wrongKey}});
    await assert.rejects(h.push.sendLive({},{}),e=>e.apnsStage==='key-validation'&&e.code==='APNS_INVALID_KEY_TYPE');
    assert.equal(h.state.connections.length,0);noResources(h);checks++;
  }
  {
    const h=harness({crypto:{...crypto,sign(){throw Object.assign(new Error('SECRET_ERROR_MESSAGE'),{code:'ERR_OSSL_UNSUPPORTED'});}}});
    const {result}=await dispatch(h);assert.equal(result.failed,1);
    assert.equal(JSON.parse(h.state.logs[0][1]).stage,'jwt-sign');
    assert(!JSON.stringify(h.state.logs).includes('SECRET_ERROR_MESSAGE'));
    assert.equal(h.state.connections.length,0);noResources(h);checks++;
  }
  for(const [option,stage] of [['connectError','http2-connect'],['connectionEvent','http2-connect'],['requestError','http2-request'],['requestEvent','http2-request'],['timeout','timeout']]) {
    const h=harness({[option]:option==='timeout'?true:Object.assign(new Error('SECRET_ERROR_MESSAGE'),{code:'ECONNRESET'})});
    const {result,db}=await dispatch(h);assert.equal(result.failed,1);assert.equal(result.sent,0);
    const log=JSON.parse(h.state.logs[0][1]);assert.equal(log.stage,stage);
    assert(!JSON.stringify(h.state.logs).includes('SECRET_ERROR_MESSAGE'));
    assert.equal(db.nativePushDevices[0].seen.length,0);noResources(h);checks++;
  }
  for(const [status,reason,removed] of [[403,'InvalidProviderToken',false],[400,'BadDeviceToken',true],[410,'Unregistered',true]]) {
    const h=harness({status,reason}),{result,db}=await dispatch(h);
    assert.equal(result.sent,0);assert.equal(db.nativePushDevices.length,removed?0:1);noResources(h);checks++;
  }
  console.log(`PASS: ${checks} native push crypto, privacy, transport cleanup and delivery regression scenarios (mock APNs; no production credentials).`);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
