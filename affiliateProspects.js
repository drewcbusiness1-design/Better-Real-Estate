const {isAffiliateOnlyUser}=require('./affiliateAccounts');
const STAGES=['new','contacted','interested','joined','not_interested'];
function canUseAffiliateTools(db,user){return !!user&&user.demo!==true&&(user.role==='admin'||isAffiliateOnlyUser(user)||(db.affiliateApplications||[]).some(a=>a.userId===user.id&&['pending','approved'].includes(a.status)));}
function prospectFields(body={}){
 const out={};for(const [key,max]of [['name',100],['email',160],['phone',50],['notes',1500]])if(key in body)out[key]=String(body[key]||'').trim().slice(0,max);
 if('stage'in body){if(!STAGES.includes(body.stage))throw new Error('Choose a valid prospect stage.');out.stage=body.stage;}
 if('nextFollowUp'in body){const value=String(body.nextFollowUp||'');if(value&&!Number.isFinite(Date.parse(value)))throw new Error('Choose a valid follow-up date.');out.nextFollowUp=value?new Date(value).toISOString():null;}
 if('name'in out&&!out.name)throw new Error('Prospect name is required.');return out;
}
function registerAffiliateProspects(app,{requireAuth,saveDB,crypto}) {
 const guard=(req,res,next)=>canUseAffiliateTools(req.db,req.user)?next():res.status(403).json({error:'Affiliate tools are for affiliate accounts and active applicants.'});
 app.get('/api/affiliate/prospects',requireAuth,guard,(req,res)=>res.json({prospects:(req.db.affiliateProspects||[]).filter(x=>x.userId===req.user.id).sort((a,b)=>String(b.updatedAt||b.createdAt).localeCompare(String(a.updatedAt||a.createdAt)))}));
 app.post('/api/affiliate/prospects',requireAuth,guard,async(req,res)=>{
  try{const fields=prospectFields(req.body);if(!fields.name)return res.status(400).json({error:'Prospect name is required.'});const rows=req.db.affiliateProspects=req.db.affiliateProspects||[];if(rows.filter(x=>x.userId===req.user.id).length>=500)return res.status(400).json({error:'Your prospect tracker holds up to 500 people.'});const row={...fields,id:crypto.randomUUID(),userId:req.user.id,stage:fields.stage||'new',createdAt:new Date().toISOString()};rows.push(row);await saveDB(req.db);res.json({prospect:row});}catch(e){res.status(400).json({error:e.message});}
 });
 app.patch('/api/affiliate/prospects/:id',requireAuth,guard,async(req,res)=>{
  const row=(req.db.affiliateProspects||[]).find(x=>x.id===req.params.id&&x.userId===req.user.id);if(!row)return res.status(404).json({error:'Prospect not found.'});try{Object.assign(row,prospectFields(req.body),{updatedAt:new Date().toISOString()});await saveDB(req.db);res.json({prospect:row});}catch(e){res.status(400).json({error:e.message});}
 });
 app.delete('/api/affiliate/prospects/:id',requireAuth,guard,async(req,res)=>{const rows=req.db.affiliateProspects||[],index=rows.findIndex(x=>x.id===req.params.id&&x.userId===req.user.id);if(index<0)return res.status(404).json({error:'Prospect not found.'});rows.splice(index,1);await saveDB(req.db);res.json({ok:true});});
}
module.exports={STAGES,canUseAffiliateTools,prospectFields,registerAffiliateProspects};
