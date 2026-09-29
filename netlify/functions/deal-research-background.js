/* Long-running Deal Intelligence worker. Netlify Background Functions run independently
   of the initial browser request, allowing careful source research instead of racing a short deadline. */
const jobs=require('../../dealResearchJobs');
const dealSources=require('../../dealSources');
const intelligence=require('../../dealIntelligence');
const cache=require('../../dealResearchCache');
const ai=require('../../ai');

exports.handler=async(event)=>{
  let body={};try{body=JSON.parse(event.body||'{}')}catch{return}
  const job=await jobs.authorizedJob(body.jobId,body.runToken,'run');
  if(!job||!['queued','running'].includes(job.status))return;
  const started=Date.now();
  try{
    await jobs.updateJob(job.id,{status:'running',phase:'identity',progress:8,message:'Resolving the exact property and checking deterministic records.',startedAt:new Date().toISOString(),attempt:Number(job.attempt||0)+1});
    const evidence=await dealSources.research(job.address,{onProgress:async(p)=>{
      await jobs.updateJob(job.id,{status:'running',phase:p.phase||'research',progress:p.progress||20,message:p.message||'Researching property evidence.',stageDetail:p.detail||null});
    }});
    evidence.compAnalysis=intelligence.analyzeComps(evidence.subject||{},evidence.comps||[]);evidence.rehabAnalysis=intelligence.estimateRehab(evidence.subject||{},evidence.conditionEvidence||[],evidence.fieldEvidence||{});evidence.serverOwned=true;evidence.cache={hit:false,version:cache.VERSION,retrievedAt:evidence.retrievedAt||new Date().toISOString(),ageMs:0,refreshProtected:false};
    let synthesis=null,synthesisFailure=null;const comp=evidence.compAnalysis||{},enoughIdentity=Boolean(evidence.identity?.sufficientForValuation),hasArv=Boolean((comp.valuationReady||comp.indicativeReady)&&(comp.estimate||comp.workingEstimate));
    if(enoughIdentity&&hasArv&&ai.configured()){
      await jobs.updateJob(job.id,{status:'running',phase:'synthesis',progress:94,message:'Turning the verified research into a complete investor analysis.'});
      try{const analysis=await ai.generateAddressDealAnalysis(job.address,evidence),fp=cache.fingerprint(evidence);synthesis={fingerprint:fp,analysis,aiDraft:analysis?.description?{description:analysis.description}:null,generatedAt:new Date().toISOString()};}
      catch(e){synthesisFailure={fingerprint:cache.fingerprint(evidence),error:String(e?.message||e).slice(0,220),at:new Date().toISOString()};evidence.diagnostics=evidence.diagnostics||{};evidence.diagnostics.synthesis={status:'degraded',error:synthesisFailure.error};}
    }
    await jobs.updateJob(job.id,{status:'running',phase:'saving',progress:98,message:'Saving evidence, valuation and investor analysis.'});
    await cache.persistEvidence(job.address,evidence,{synthesis,synthesisFailure});
    const completeMessage=comp.valuationReady?'Research complete. Property facts, closed comps and precise ARV support are ready.':comp.indicativeReady?'Research complete. Property facts and a cross-source working ARV range are ready.':'Research complete. Better preserved the evidence it could establish and withheld unsupported ARV.';
    await jobs.updateJob(job.id,{status:'complete',phase:'complete',progress:100,message:completeMessage,completedAt:new Date().toISOString(),durationMs:Date.now()-started,evidence});
  }catch(e){
    console.error('[deal research background]',e?.message,e?.stack);
    await jobs.updateJob(job.id,{status:'failed',phase:'failed',progress:100,message:'Property research could not complete.',error:String(e?.message||e).slice(0,400),completedAt:new Date().toISOString(),durationMs:Date.now()-started});
  }
};
