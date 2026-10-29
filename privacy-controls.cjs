'use strict';
const VERSION='2026-10-28-v1';
const AI_PATHS=new Set(['/api/ai/listing-copy','/api/dispo/parse','/api/deal-builder/research/start','/api/deal-builder/research','/api/deal-builder/address','/api/deal-builder/comp-analysis']);
function allowed(user){return user?.settings?.aiSharingConsentVersion===VERSION;}
function denied(res){return res.status(403).json({code:'AI_CONSENT_REQUIRED',error:'Allow sharing with OpenAI before using AI tools. You can use non-AI tools or request human support instead.'});}
function register(app,{requireAuth,saveDB}){
 app.get('/api/me/ai-consent',requireAuth,(req,res)=>res.json({allowed:allowed(req.user),version:VERSION}));
 app.post('/api/me/ai-consent',requireAuth,async(req,res)=>{
  if(req.body?.version!==VERSION||typeof req.body?.allow!=='boolean')return res.status(400).json({error:'Choose whether to allow OpenAI sharing.'});
  req.user.settings||={};req.user.settings.aiSharingConsentVersion=req.body.allow?VERSION:null;
  req.user.settings.aiSharingConsentAt=req.body.allow?new Date().toISOString():null;
  await saveDB(req.db);res.json({allowed:allowed(req.user),version:VERSION});
 });
 app.use((req,res,next)=>{
  if(req.method!=='POST'||!AI_PATHS.has(req.path))return next();
  return requireAuth(req,res,()=>allowed(req.user)?next():denied(res));
 });
}
const OWNERS=['userId','ownerId','customerId','providerId','fromUserId','toUserId','requesterId','uploadedBy','submittedBy'];
function owned(row,id){return row&&OWNERS.some(key=>row[key]===id);}
function media(value){const found=new Set();function walk(x){if(typeof x==='string'){const raw=x.match(/^((?:doc-)?[0-9a-fA-F-]{36}\.[a-zA-Z0-9]+)$/);if(raw)found.add(raw[1]);const m=x.match(/^(?:https:\/\/(?:www\.)?betterrealestate\.org)?\/(?:api\/(?:img|doc)|uploads)\/([a-zA-Z0-9-]+\.[a-zA-Z0-9]+)$/);if(m)found.add(m[1]);}else if(Array.isArray(x))x.forEach(walk);else if(x&&typeof x==='object')Object.values(x).forEach(walk);}walk(value);return found;}
function collectOwnedMedia(db,id){return [...media([db.users.find(u=>u.id===id),...Object.values(db).filter(Array.isArray).flatMap(rows=>rows.filter(row=>owned(row,id)))])];}
async function cleanup(db,id,keys,{deleteMedia=require('./storage').deleteMedia}={}){
 const remove=['nativePushDevices','nativeLiveActivities','dealNotes','relationshipContacts','dealTasks','dealActivity','fileRequests','buyerCredentials','compBoards','dealCollaborators','intakeSubmissions','dealResearchJobs','dealResearchCache'];
 for(const collection of remove)db[collection]=(db[collection]||[]).filter(row=>!owned(row,id));
 const remaining={...db,users:db.users.filter(u=>u.id!==id)};
 const referenced=media(remaining);
 for(const key of keys)if(!referenced.has(key))await deleteMedia(key);
}
module.exports={VERSION,AI_PATHS,allowed,denied,register,collectOwnedMedia,cleanup,media};
