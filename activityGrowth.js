// UTC buckets from recorded timestamps; no inferred historical activity.
const DAY=86400000;
const time=value=>{if(typeof value!=='string'||!value.trim())return NaN;return Date.parse(value);};
function growth(db,start,end,isDemo,now=Date.now()){
 if(!Number.isFinite(start)||!Number.isFinite(end)||start>end)throw new Error('Choose a valid date range.');
 const users=(db.users||[]).filter(u=>!isDemo(u));const ids=new Set(users.map(u=>u.id));
 const signups=users.map(u=>time(u.createdAt)).filter(t=>Number.isFinite(t)&&t<=end&&t>=0);
 const events=(db.activityEvents||[]).filter(e=>ids.has(e.userId)).map(e=>({...e,t:time(e.at)})).filter(e=>Number.isFinite(e.t)&&e.t>=0&&e.t<=end);
 const earliest=[...signups,...events.map(e=>e.t)].reduce((min,t)=>Math.min(min,t),end);const from=start===0?earliest:start;
 const span=end-from,unit=span>90*DAY?7*DAY:DAY;
 const align=t=>unit===DAY?Math.floor(t/DAY)*DAY:Math.floor((t-4*DAY)/unit)*unit+4*DAY;
 const first=align(from),last=align(end),bucketCount=Math.floor((last-first)/unit)+1;
 // Bound output for extremely long custom windows without changing the date range.
 const step=bucketCount>520?Math.ceil(bucketCount/520)*unit:unit;
 const buckets=[];let cumulative=signups.filter(t=>t<from).length;
 for(let at=first;at<=last;at+=step){const lo=Math.max(at,from),hi=Math.min(at+step,end+1);const count=signups.filter(t=>t>=lo&&t<hi).length;cumulative+=count;const active=new Set(events.filter(e=>e.t>=lo&&e.t<hi).map(e=>e.userId));buckets.push({at:new Date(at).toISOString(),end:new Date(Math.min(at+step-1,end)).toISOString(),signups:count,cumulative,active:active.size,partial:lo>at||hi<at+step});}
 return {buckets,intervalDays:step/DAY,timezone:'UTC',coverageStart:events.length?new Date(events.reduce((min,e)=>Math.min(min,e.t),end)).toISOString():null,note:'Signups and cumulative totals use current non-demo accounts with valid signup dates; deleted accounts are not reconstructed. Active users are deduplicated within each UTC bucket from retained activity events only. Missing or pruned event history is not zero activity. Edge buckets may be partial.',through:new Date(Math.min(end,now)).toISOString()};
}
module.exports={growth};
