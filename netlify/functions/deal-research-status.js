/* Lightweight status endpoint for Deal Intelligence background jobs. */
const jobs=require('../../dealResearchJobs');
exports.handler=async(event)=>{
  const q=event.queryStringParameters||{},job=await jobs.authorizedJob(q.jobId,q.token,'status');
  if(!job)return {statusCode:404,headers:{'content-type':'application/json'},body:JSON.stringify({error:'Research job not found.'})};
  return {statusCode:200,headers:{'content-type':'application/json','cache-control':'no-store'},body:JSON.stringify({job:jobs.publicJob(job),retryAfterMs:job.status==='running'?8000:job.status==='queued'?5000:0})};
};
