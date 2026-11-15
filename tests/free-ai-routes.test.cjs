'use strict';
const assert=require('node:assert/strict');const {app,cookie,getDB}=require('./connected-fixture');
const jobs=require('../dealResearchJobs'),sources=require('../dealSources'),intelligence=require('../dealIntelligence'),ai=require('../ai');
const active=new Map();let starts=0,researchCalls=0,aiCalls=0,fail=false;
jobs.startOrReuse=async args=>{starts++;const job={...args,id:'fixture-job-'+starts,status:'queued',runToken:'fixture-run-token-'+starts,createdAt:new Date().toISOString()};active.set(job.id,job);return job;};
jobs.getJob=async id=>active.get(id)||null;jobs.authorizedJob=async(id,token)=>{const j=active.get(id);return j?.runToken===token?j:null;};jobs.updateJob=async(id,patch)=>{const j=active.get(id);Object.assign(j,patch);return j;};
sources.research=async address=>{researchCalls++;if(fail)throw Error('Fixture provider timeout');return {subject:{address,city:'Trenton',state:'NJ',squareFootage:1500,bedrooms:3,bathrooms:2,yearBuilt:1980,propertyType:'Single family'},identity:{sufficientForValuation:true},fieldEvidence:{},comps:[],retrievedAt:new Date().toISOString()};};
intelligence.analyzeComps=()=>({valuationReady:true,indicativeReady:false,estimate:300000,low:280000,high:320000,confidence:'High',method:'Fixture',selected:[],reviewed:3});intelligence.dealValuationPrecision=()=> 'precise';intelligence.estimateRehab=()=>({scenarios:[],recommendedKey:'moderate'});ai.configured=()=>true;ai.generateAddressDealAnalysis=async()=>{aiCalls++;return {subject:{},description:'Local fixture narrative',arv:{estimate:300000},warnings:[]};};
const worker=require('../netlify/functions/deal-research-background');
(async()=>{
 const u=getDB().users.find(u=>u.id==='outsider');Object.assign(u,{plan:'free',planUntil:null,trialUntil:null,founderProgramExcluded:true});
 const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
 const call=async(path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{cookie:cookie('outsider'),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
 try{
  assert.equal((await call('/api/deal-builder/usage')).data.usage.remaining,2);
  const first=await call('/api/deal-builder/research/start','POST',{address:'100 Fixture Avenue, Trenton NJ'});assert.equal(first.status,202);assert.equal(starts,1);
  const repeated=await call('/api/deal-builder/research/start','POST',{address:'100 Fixture Avenue, Trenton NJ'});assert.equal(repeated.data.jobId,first.data.jobId);assert.equal(starts,1);
  const second=await call('/api/deal-builder/research/start','POST',{address:'200 Fixture Avenue, Trenton NJ'});assert.equal(second.status,202);
  const third=await call('/api/deal-builder/research/start','POST',{address:'300 Fixture Avenue, Trenton NJ'});assert.equal(third.status,403);assert.equal(third.data.code,'DEAL_BUILDER_LIMIT');assert.equal(starts,2);assert.equal(researchCalls,0);
  const job1=active.get(first.data.jobId);assert(!Object.hasOwn(jobs.publicJob(job1),'websiteFreeReservation'));assert(!Object.hasOwn(jobs.publicJob(job1),'runToken'));
  await Promise.all([worker.handler({body:JSON.stringify({jobId:job1.id,runToken:job1.runToken})}),worker.handler({body:JSON.stringify({jobId:job1.id,runToken:job1.runToken})})]);assert.equal(researchCalls,1);assert.equal(aiCalls,1);
  let usage=(await call('/api/deal-builder/usage')).data.usage;assert.equal(usage.used,1);assert.equal(usage.reserved,1);
  fail=true;const job2=active.get(second.data.jobId);await worker.handler({body:JSON.stringify({jobId:job2.id,runToken:job2.runToken})});fail=false;
  usage=(await call('/api/deal-builder/usage')).data.usage;assert.equal(usage.used,1);assert.equal(usage.remaining,1);
  const final=await call('/api/deal-builder/address','POST',{address:'100 Fixture Avenue, Trenton NJ'});assert.equal(final.status,200);assert.equal(final.data.usage.used,1);assert.equal(aiCalls,1);
  const reopened=await call('/api/deal-builder/address','POST',{address:'100 Fixture Avenue, Trenton NJ'});assert.equal(reopened.status,200);assert.equal(reopened.data.usage.used,1);assert.equal(aiCalls,1);
  const stale=await call('/api/deal-builder/address','POST',{address:'400 Fixture Avenue, Trenton NJ'});assert.equal(stale.status,409);usage=(await call('/api/deal-builder/usage')).data.usage;assert.equal(usage.remaining,1);assert.equal(usage.reserved,0);
  const replacement=await call('/api/deal-builder/research/start','POST',{address:'300 Fixture Avenue, Trenton NJ'});const job3=active.get(replacement.data.jobId);await worker.handler({body:JSON.stringify({jobId:job3.id,runToken:job3.runToken})});usage=(await call('/api/deal-builder/usage')).data.usage;assert.equal(usage.used,2);assert.equal(usage.remaining,0);assert.equal(aiCalls,2);
  assert.equal((await call('/api/deal-builder/research','POST',{address:'500 Fixture Avenue, Trenton NJ'})).status,403);assert.equal((await call('/api/ai/listing-copy','POST',{})).status,403);
  console.log('PASS actual free AI entry points and background worker with stubbed providers: two slots, duplicate-job reuse, no third provider call, one worker per token, failed-job refund, cached reopening, no stale-cache charge, successful daily cap, private reservation tokens, listing AI still paid.');
 }finally{server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
