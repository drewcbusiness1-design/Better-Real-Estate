/* Long-running Deal Intelligence worker. Netlify Background Functions run independently
   of the initial browser request, allowing careful source research instead of racing a short deadline. */
const jobs=require('../../dealResearchJobs');
const dealSources=require('../../dealSources');
const intelligence=require('../../dealIntelligence');
const cache=require('../../dealResearchCache');

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
    evidence.compAnalysis=intelligence.analyzeComps(evidence.subject||{},evidence.comps||[]);evidence.serverOwned=true;evidence.cache={hit:false,version:cache.VERSION,retrievedAt:evidence.retrievedAt||new Date().toISOString(),ageMs:0,refreshProtected:false};
    await jobs.updateJob(job.id,{status:'running',phase:'saving',progress:94,message:'Saving verified evidence and preparing the analysis.'});
    await cache.persistEvidence(job.address,evidence);
    await jobs.updateJob(job.id,{status:'complete',phase:'complete',progress:100,message:evidence.compAnalysis?.valuationReady?'Research complete. Verified evidence and sold comps are ready.':'Research complete. Better preserved the evidence it could verify and withheld unsupported valuation.',completedAt:new Date().toISOString(),durationMs:Date.now()-started,evidence});
  }catch(e){
    console.error('[deal research background]',e?.message,e?.stack);
    await jobs.updateJob(job.id,{status:'failed',phase:'failed',progress:100,message:'Property research could not complete.',error:String(e?.message||e).slice(0,400),completedAt:new Date().toISOString(),durationMs:Date.now()-started});
  }
};
