'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'better-usage-'));
 try{
  for(const name of ['store.js','affiliateAccounts.js','policy.js'])fs.copyFileSync(path.join(__dirname,'..',name),path.join(dir,name));
  for(const key of ['DATABASE_URL','NETLIFY_DATABASE_URL','NETLIFY','AWS_LAMBDA_FUNCTION_NAME','LAMBDA_TASK_ROOT'])process.env[key]='';
  const store=require(path.join(dir,'store.js'));const old=await store.loadDB();old.users.push({id:'a',name:'Member'});await store.saveDB(old);
  const stale=await store.loadDB(),fresh=await store.loadDB();fresh.browsingUsage=[{id:'a',day:'2026-11-15',listingIds:['one'],revision:1}];fresh.websiteAiUsage=[{id:'a',day:'2026-11-15',completed:['address'],reservations:[],revision:1}];fresh.__writeBrowsingUsage=true;fresh.__writeWebsiteAiUsage=true;await store.saveDB(fresh);
  stale.users[0].name='Changed name';await store.saveDB(stale);
  const saved=await store.loadDB();assert.equal(saved.users[0].name,'Changed name');assert.equal(saved.browsingUsage[0].listingIds.length,1);assert.equal(saved.websiteAiUsage[0].completed.length,1);
  const src=fs.readFileSync(path.join(__dirname,'../store.js'),'utf8');assert(src.includes("c==='campaignOutreach'||c==='browsingUsage'||c==='websiteAiUsage'"));
  saved.users=[];await store.saveDB(saved);const deleted=await store.loadDB();assert.equal(deleted.browsingUsage.length,0);assert.equal(deleted.websiteAiUsage.length,0);assert(src.includes('DELETE FROM kv_websiteaiusage WHERE id=$1'));
  console.log('PASS real file-store persistence: unrelated stale account saves retain dedicated browsing and AI usage records, deleted accounts remove their quota records; generic SQL saves exclude dedicated quota collections.');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
})().catch(e=>{console.error(e);process.exitCode=1;});
