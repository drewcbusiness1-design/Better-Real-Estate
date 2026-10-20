'use strict';
const crypto = require('crypto');
const CATEGORIES = ['Landscaping','Contractor','Cleaning','Painting','Roofing','Plumbing','Electrical','Property management','Photography','Title','Lending','Other'];
const STAGES = ['New inquiry','Quoting','Scheduled','In progress','Completed','Declined / canceled'];
const text = (v,n) => String(v ?? '').trim().slice(0,n);
const list = (v,n=12) => [...new Set((Array.isArray(v)?v:[]).map(x=>text(x,80)).filter(Boolean))].slice(0,n);
const enabled = u => u && u.settings?.serviceProvider === true && !(u.roles||[u.role]).includes('affiliate');
function profile(u) {
  const s=u.settings||{}, p=s.serviceProfile||{};
  return {userId:u.id,name:u.name,businessName:p.businessName||u.name,description:p.description||'',categories:s.serviceTypes||[],areas:p.areas||[],availability:p.availability||'Ask about availability',pricing:p.pricing||'Request a quote',contactPreference:p.contactPreference||'Better messages',photos:p.photos||[]};
}
function register(app,{requireAuth,saveDB,writeImage}) {
  app.get('/api/services',requireAuth,(req,res)=>{
    const q=text(req.query.q,80).toLowerCase(),area=text(req.query.area,80).toLowerCase(),category=text(req.query.category,80);
    const providers=req.db.users.filter(enabled).map(profile).filter(p=>(!category||p.categories.includes(category))&&(!q||[p.businessName,p.description,...p.categories].join(' ').toLowerCase().includes(q))&&(!area||p.areas.some(a=>a.toLowerCase().includes(area))));
    res.json({providers:providers.slice(0,100),categories:CATEGORIES});
  });
  app.get('/api/services/me',requireAuth,(req,res)=>res.json({enabled:enabled(req.user),profile:profile(req.user),categories:CATEGORIES,stages:STAGES,jobs:(req.db.serviceJobs||[]).filter(j=>j.providerId===req.user.id||j.customerId===req.user.id).map(j=>({...j,notes:j.providerId===req.user.id?j.notes:undefined,customerName:req.db.users.find(u=>u.id===j.customerId)?.name||'Member',providerName:req.db.users.find(u=>u.id===j.providerId)?.name||'Provider'}))}));
  app.patch('/api/services/me',requireAuth,async(req,res)=>{
    if((req.user.roles||[req.user.role]).includes('affiliate'))return res.status(403).json({error:'Choose a real estate or service-provider account in Settings first.'});
    const b=req.body||{},old=req.user.settings?.serviceProfile||{};
    const categories=list(b.categories).filter(c=>CATEGORIES.includes(c)),areas=list(b.areas,20);
    if(b.enabled!==false&&(!text(b.businessName,100)||!categories.length||!areas.length))return res.status(400).json({error:'Add a business name, service category and service area.'});
    const photos=[];
    for(const p of (Array.isArray(b.photos)?b.photos:old.photos||[]).slice(0,6)){
      if((old.photos||[]).includes(p))photos.push(p);
      else if(/^data:image\/(png|jpeg|webp);base64,/.test(String(p))&&String(p).length<=2800000){const url=await writeImage(p);if(!url)return res.status(400).json({error:'Unable to save that photo.'});photos.push(url);}
      else return res.status(400).json({error:'Choose a JPG, PNG or WebP photo smaller than 2 MB.'});
    }
    req.user.settings={...req.user.settings,serviceProvider:b.enabled!==false,serviceTypes:categories,defaultDashboard:b.defaultDashboard==='feed'?'feed':b.enabled===false?'feed':'services',serviceProfile:{businessName:text(b.businessName,100),description:text(b.description,1200),areas,availability:text(b.availability,100),pricing:text(b.pricing,120),contactPreference:['Better messages','Arrange a call in Better'].includes(b.contactPreference)?b.contactPreference:'Better messages',photos}};
    await saveDB(req.db);res.json({settings:req.user.settings,profile:profile(req.user)});
  });
  app.post('/api/services/:id/inquiries',requireAuth,async(req,res)=>{
    const provider=req.db.users.find(u=>u.id===req.params.id);
    if(!enabled(provider))return res.status(404).json({error:'Service provider is unavailable.'});
    if(provider.id===req.user.id)return res.status(400).json({error:'Choose another provider.'});
    if((req.user.roles||[req.user.role]).includes('affiliate'))return res.status(403).json({error:'Service inquiries require a regular account.'});
    const b=req.body||{},title=text(b.title,120),description=text(b.description,2000),area=text(b.area,100);
    if(!title||!description||!area)return res.status(400).json({error:'Add a job title, description and general location.'});
    const recent=(req.db.serviceJobs||[]).filter(j=>j.customerId===req.user.id&&Date.now()-Date.parse(j.createdAt)<60000);
    if(recent.length>=5)return res.status(429).json({error:'Please wait before requesting more quotes.'});
    if((req.db.serviceJobs||[]).some(j=>j.customerId===req.user.id&&j.providerId===provider.id&&j.title===title&&j.description===description&&!['Completed','Declined / canceled'].includes(j.stage)))return res.status(409).json({error:'This inquiry already exists. Open your requests to continue.'});
    const photos=[];for(const p of (Array.isArray(b.photos)?b.photos:[]).slice(0,3)){if(!/^data:image\/(png|jpeg|webp);base64,/.test(String(p))||String(p).length>2800000)return res.status(400).json({error:'Use JPG, PNG or WebP photos under 2 MB.'});const url=await writeImage(p);if(!url)return res.status(400).json({error:'Photo upload failed.'});photos.push(url);}
    const job={id:crypto.randomUUID(),providerId:provider.id,customerId:req.user.id,title,description,area,photos,stage:STAGES[0],notes:'',scheduledDate:'',createdAt:new Date().toISOString()};
    (req.db.serviceJobs||= []).push(job);
    req.db.messages.push({id:crypto.randomUUID(),fromUserId:req.user.id,fromName:req.user.name,toUserId:provider.id,listingId:null,body:'Service inquiry: '+title+'\n'+area+'\n'+description,at:job.createdAt,read:false});
    await saveDB(req.db);res.json({job});
  });
  app.patch('/api/services/jobs/:id',requireAuth,async(req,res)=>{
    const job=(req.db.serviceJobs||[]).find(j=>j.id===req.params.id&&j.providerId===req.user.id);
    if(!job)return res.status(404).json({error:'Job not found.'});
    const b=req.body||{};if(!STAGES.includes(b.stage))return res.status(400).json({error:'Choose a valid job stage.'});
    const date=text(b.scheduledDate,10);if(date&&(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(Date.parse(date))||new Date(date).toISOString().slice(0,10)!==date))return res.status(400).json({error:'Choose a valid date.'});
    Object.assign(job,{stage:b.stage,notes:text(b.notes,3000),scheduledDate:date,updatedAt:new Date().toISOString()});await saveDB(req.db);res.json({job});
  });
}
module.exports={register,CATEGORIES,STAGES,profile,enabled};
