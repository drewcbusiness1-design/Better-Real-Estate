'use strict';
const crypto=require('crypto'), rules=require('./connectedDeals');
const intelligence=require('./dealIntelligence');
const seedCompanies=[
 {id:'sjs-title',name:'SJS Title',states:['NJ','PA'],phone:'8564064600',email:'Chrissy@sjstitleco.com',website:'https://www.sjstitleco.com/',sourceUrl:'https://www.sjstitleco.com/team',address:'1940 Route 70 E, Suite 225, Cherry Hill, NJ 08003',serviceNote:'Company website lists NJ and PA closings and a wholesale division. Confirm suitability for your transaction.',reviewedAt:'2026-10-17',active:true},
 {id:'investors-first-title',name:'Investors First Title Agency',states:['NJ','FL'],phone:'7323336520',email:'info@investorsfirsttitle.com',website:'https://investorsfirsttitle.com/',sourceUrl:'https://investorsfirsttitle.com/',address:'969 Holmdel Road, Suite 2, Holmdel, NJ 07733',serviceNote:'Company website lists residential and commercial services in NJ and FL. Other coverage requires confirmation.',reviewedAt:'2026-10-17',active:true}
];
const safeText=(s,n=1200)=>String(s??'').trim().slice(0,n);
function httpUrl(s){try{const u=new URL(s);return ['https:','http:'].includes(u.protocol)&&!u.username&&!u.password?u.href:'';}catch{return '';}}
function companies(db){const rows=new Map(seedCompanies.map(x=>[x.id,x]));for(const r of db.titleCompanies||[])rows.set(r.id,r);return [...rows.values()].sort((a,b)=>a.name.localeCompare(b.name));}
const own=(u,r)=>r.ownerId===u.id||Boolean(u.companyId&&r.companyId===u.companyId);
const collect=(db,k)=>db[k]||(db[k]=[]);
module.exports=function(app,ctx){
 const {requireAuth,saveDB,isAdminUser,canManageListing,gateListing,listingState,buyerMatchesForListing,socialUserCard,dealResearchKey,cleanCrmCriteria}=ctx;
 const panelHandlers={};function panelGet(path,handler){panelHandlers[path]=handler;app.get(path,requireAuth,handler);}
 function listing(req,res){const l=req.db.listings.find(x=>x.id===req.params.id);if(!l)res.status(404).json({error:'Property not found.'});return l;}
 function manage(req,res,l){if(!canManageListing(req.db,req.user,l)){res.status(403).json({error:'Property team access required.'});return false;}return true;}
 app.get('/api/title-companies',requireAuth,(req,res)=>{const state=safeText(req.query.state,2).toUpperCase();res.json({companies:companies(req.db).filter(x=>x.active!==false&&(!state||x.states.includes(state))),notice:'Independent businesses, listed alphabetically. Confirm licensing, service area, transaction type, fees and availability directly. Better does not provide title services or receive a referral fee.'});});
 app.get('/api/admin/title-companies',requireAuth,(req,res)=>{if(!isAdminUser(req.user))return res.status(403).json({error:'Admin access required.'});res.json({companies:companies(req.db)});});
 app.post('/api/admin/title-companies',requireAuth,async(req,res)=>{
  if(!isAdminUser(req.user))return res.status(403).json({error:'Admin access required.'});const b=req.body||{};
  const name=safeText(b.name,160),website=httpUrl(b.website),sourceUrl=httpUrl(b.sourceUrl);const states=(Array.isArray(b.states)?b.states:String(b.states||'').split(',')).map(x=>String(x).trim().toUpperCase()).filter(x=>/^[A-Z]{2}$/.test(x));
  if(!name||!website||!sourceUrl||!states.length)return res.status(400).json({error:'Name, website, source URL and confirmed service states are required.'});
  const email=safeText(b.email,160);if(email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Enter a valid public business email.'});
  if(b.id&&!companies(req.db).some(x=>x.id===b.id))return res.status(404).json({error:'Company not found.'});
  const row={id:b.id||crypto.randomUUID(),name,website,sourceUrl,states:[...new Set(states)],email,phone:safeText(b.phone,40).replace(/[^+\d ()-]/g,''),address:safeText(b.address,240),serviceNote:safeText(b.serviceNote,600),active:b.active!==false,reviewedAt:new Date().toISOString().slice(0,10),updatedBy:req.user.id};
  const list=collect(req.db,'titleCompanies'),i=list.findIndex(x=>x.id===row.id);if(i<0)list.push(row);else list[i]=row;await saveDB(req.db);res.json({company:row});
 });
 panelGet('/api/listings/:id/title-companies',(req,res)=>{const l=listing(req,res);if(!l)return;const state=listingState(l);res.json({state,companies:state?companies(req.db).filter(x=>x.active!==false&&x.states.includes(state)):[]});});
 panelGet('/api/listings/:id/evidence',(req,res)=>{
  const l=listing(req,res);if(!l)return;
  if(gateListing(l,req.user,req.db).locked)return res.json({status:'locked',message:'Unlock property details to view address-specific comparable sales.'});
  const address=[l.address,l.city].filter(Boolean).join(', '),key=dealResearchKey(address);
  const cached=(req.db.dealResearchCache||[]).find(x=>x.key===key);
  if(!cached?.evidence)return res.json({status:'unavailable',message:'No supported comparable-sales analysis is available for this property yet.',sellerArv:l.arv});
  const evidence=cached.evidence,age=Date.now()-new Date(cached.retrievedAt).getTime();
  if(!Number.isFinite(age)||age>86400000||(l.evidenceInvalidatedAt&&new Date(l.evidenceInvalidatedAt)>new Date(cached.retrievedAt)))return res.json({status:'stale',message:'Research is older than 24 hours. Refresh it in AI Deal Analysis before relying on it.',sellerArv:l.arv});
  const subject=evidence.subject||{},conflicts=[];
  for(const [local,remote] of [['beds','bedrooms'],['baths','bathrooms'],['sqft','squareFootage'],['year','yearBuilt']])if(rules.finite(l[local])&&rules.finite(subject[remote])&&Number(l[local])!==Number(subject[remote]))conflicts.push(local);
  if(l.propertyType&&subject.propertyType&&String(l.propertyType).toLowerCase().replace(/[^a-z]/g,'')!==String(subject.propertyType).toLowerCase().replace(/[^a-z]/g,''))conflicts.push('propertyType');
  const comp=intelligence.analyzeComps(evidence.comparisonSubject||subject,evidence.comps||[]),precision=intelligence.dealValuationPrecision(evidence,comp);
  if(conflicts.length||!evidence.identity?.sufficientForValuation||precision==='withheld'||String(comp.confidence).toLowerCase()==='low')return res.json({status:'insufficient',message:conflicts.length?'Listing facts differ from researched facts. Review before comparing estimates.':'Evidence is insufficient to assess the seller estimate.',conflicts,sellerArv:l.arv});
  const low=precision==='precise'?comp.low:comp.workingLow,high=precision==='precise'?comp.high:comp.workingHigh;
  const raw=Number(process.env.LISTING_ARV_WARNING_PERCENT||15),threshold=Number.isFinite(raw)?Math.min(100,Math.max(0,raw)):15;
  const seller=Number(l.arv),warning=Boolean(low>0&&high>0&&seller>0&&(seller<low*(1-threshold/100)||seller>high*(1+threshold/100)));
  const comparables=comp.selected.map(c=>({address:c.address,salePrice:c.salePrice,saleDate:c.saleDate,source:c.source,sourceUrl:httpUrl(c.sourceUrl||c.url),distanceMiles:c.distanceMiles}));
  res.json({status:'available',precision,low,high,confidence:comp.confidence,comparables,sellerArv:l.arv,warning,threshold,retrievedAt:cached.retrievedAt,message:warning?`Seller ARV falls more than ${threshold}% outside the supported range. This is a review flag, not a determination of value.`:'Compare seller estimates with the supporting sales. This analysis is not an appraisal.'});
 });
 panelGet('/api/listings/:id/responses',(req,res)=>{
  const l=listing(req,res);if(!l)return;const rows=(req.db.buyerResponses||[]).filter(x=>x.listingId===l.id);
  if(!canManageListing(req.db,req.user,l))return res.json({canManage:false,responses:rows.filter(x=>x.userId===req.user.id).map(({nextAction,...x})=>x)});
  const matches=buyerMatchesForListing(req.db,l),notifications=(req.db.dealNotifications||[]).filter(x=>x.listingId===l.id&&x.kind==='buyer-match');
  res.json({canManage:true,matched:matches.length,notified:new Set(notifications.map(x=>x.userId)).size,responded:rows.length,walkthroughs:rows.filter(x=>x.status==='walkthrough').length,offers:(req.db.offers||[]).filter(x=>x.listingId===l.id).length,responses:rows.map(x=>({...x,user:socialUserCard(req.db,req.user.id,req.db.users.find(u=>u.id===x.userId)||{})}))});
 });
 app.get('/api/listings/:id/connected',requireAuth,(req,res)=>{if(!listing(req,res))return;const out={};for(const key of ['title-companies','evidence','responses'])panelHandlers['/api/listings/:id/'+key](req,{json:value=>{out[key]=value;},status:()=>({json:value=>{out[key]=value;}})});res.json(out);});
 app.post('/api/listings/:id/responses',requireAuth,async(req,res)=>{
  const l=listing(req,res);if(!l)return;if(l.ownerId===req.user.id||!rules.available(l))return res.status(400).json({error:'Respond to an available property owned by another member.'});
  const b=req.body||{},status=String(b.status||'');if(!['interested','question','walkthrough','conditional','pass'].includes(status))return res.status(400).json({error:'Choose a valid response.'});
  const maxPrice=rules.finite(b.maxPrice)?Math.max(0,Number(b.maxPrice)):null,needsPhotos=b.needsPhotos===true,note=safeText(b.note,1200);
  if(status==='conditional'&&!maxPrice&&!needsPhotos)return res.status(400).json({error:'Set a price threshold or request more photos.'});if(status==='question'&&!note)return res.status(400).json({error:'Enter your question.'});
  const list=collect(req.db,'buyerResponses'),id=l.id+':'+req.user.id;let row=list.find(x=>x.id===id);if(!row){row={id,listingId:l.id,userId:req.user.id};list.push(row);}
  const unchanged=row.status===status&&row.note===note&&row.maxPrice===maxPrice&&row.needsPhotos===needsPhotos;if(unchanged)return res.json({response:row});
  Object.assign(row,{status,note,maxPrice,needsPhotos,photoCount:l.photos?.length||0,updatedAt:new Date().toISOString()});
  if(status!=='pass')collect(req.db,'dealNotifications').push({id:crypto.randomUUID(),userId:l.ownerId,listingId:l.id,title:'A buyer responded',body:`${req.user.name}: ${status==='conditional'?'interested with conditions':status}. Open the response board.`,read:false,at:row.updatedAt});
  await saveDB(req.db);res.json({response:row});
 });
 app.patch('/api/listings/:id/responses/:userId',requireAuth,async(req,res)=>{const l=listing(req,res);if(!l||!manage(req,res,l))return;const row=(req.db.buyerResponses||[]).find(x=>x.listingId===l.id&&x.userId===req.params.userId);if(!row)return res.status(404).json({error:'Response not found.'});row.nextAction=safeText(req.body?.nextAction,300);await saveDB(req.db);res.json({response:row});});
 app.get('/api/private-deals',requireAuth,(req,res)=>res.json({deals:(req.db.privateDeals||[]).filter(x=>x.ownerId===req.user.id)}));
 app.post('/api/private-deals',requireAuth,async(req,res)=>{
  const b=req.body||{},rows=collect(req.db,'privateDeals');let row=b.id&&rows.find(x=>x.id===b.id&&x.ownerId===req.user.id);if(b.id&&!row)return res.status(404).json({error:'Private deal not found.'});
  if(!safeText(b.address,240))return res.status(400).json({error:'A property address or identifying label is required.'});
  const next={id:row?.id||crypto.randomUUID(),ownerId:req.user.id,address:safeText(b.address,240),city:safeText(b.city,120),sourceUrl:httpUrl(b.sourceUrl),notes:safeText(b.notes,2000),nextAction:safeText(b.nextAction,300),stage:['review','contact','negotiation','title','closed','passed'].includes(b.stage)?b.stage:'review',updatedAt:new Date().toISOString(),createdAt:row?.createdAt||new Date().toISOString()};
  for(const k of ['asking','arv','rehab','beds','baths','sqft','year'])next[k]=rules.finite(b[k])?Math.max(0,Number(b[k])):null;
  next.propertyType=safeText(b.propertyType,60);if(row)Object.assign(row,next);else rows.push(next);await saveDB(req.db);res.json({deal:next});
 });
 app.get('/api/private-deals/:id/documents',requireAuth,(req,res)=>{if(!(req.db.privateDeals||[]).some(x=>x.id===req.params.id&&x.ownerId===req.user.id))return res.status(404).json({error:'Private opportunity not found.'});res.json({documents:(req.db.dealDocuments||[]).filter(x=>x.privateDealId===req.params.id&&x.ownerId===req.user.id)});});
 app.post('/api/private-deals/:id/documents',requireAuth,async(req,res)=>{if(!(req.db.privateDeals||[]).some(x=>x.id===req.params.id&&x.ownerId===req.user.id))return res.status(404).json({error:'Private opportunity not found.'});const name=safeText(req.body?.name,160),url=await require('./storage').writeDocument(req.body?.dataUrl,name);if(!url)return res.status(400).json({error:'Upload a PDF or image up to 5 MB.'});const row={id:crypto.randomUUID(),privateDealId:req.params.id,ownerId:req.user.id,name,url,visibility:'private',createdAt:new Date().toISOString()};collect(req.db,'dealDocuments').push(row);await saveDB(req.db);res.json({document:row});});
 app.delete('/api/private-deals/:id/documents/:docId',requireAuth,async(req,res)=>{if(!(req.db.privateDeals||[]).some(x=>x.id===req.params.id&&x.ownerId===req.user.id))return res.status(404).json({error:'Private opportunity not found.'});req.db.dealDocuments=(req.db.dealDocuments||[]).filter(x=>!(x.privateDealId===req.params.id&&x.id===req.params.docId));await saveDB(req.db);res.json({ok:true});});
 app.get('/api/deal-builder/property-photos',requireAuth,(req,res)=>{const key=dealResearchKey(safeText(req.query.address,400)),matches=req.db.listings.filter(l=>dealResearchKey([l.address,l.city].filter(Boolean).join(', '))===key&&!gateListing(l,req.user,req.db).locked);const photos=matches.flatMap(l=>(l.photos||[]).slice(0,12).map(url=>({url,source:'Member-uploaded Better listing',sourceListingId:l.id,recordedAt:l.updatedAt||l.createdAt,historical:!rules.available(l),identity:'Listing address matches your search; photo content is not independently verified.'}))).slice(0,12);res.json({photos,message:photos.length?'Member-provided property photos; confirm current condition independently.':'No permitted exact-address property photos are available. No external photo feed is configured.'});});
 app.delete('/api/private-deals/:id',requireAuth,async(req,res)=>{const rows=collect(req.db,'privateDeals'),i=rows.findIndex(x=>x.id===req.params.id&&x.ownerId===req.user.id);if(i<0)return res.status(404).json({error:'Private deal not found.'});rows.splice(i,1);req.db.dealDocuments=(req.db.dealDocuments||[]).filter(x=>x.privateDealId!==req.params.id);await saveDB(req.db);res.json({ok:true});});
 app.post('/api/deal-comparison',requireAuth,(req,res)=>{
  const ids=Array.isArray(req.body?.ids)?[...new Set(req.body.ids)]:[];if(!ids.length||ids.length>3)return res.status(400).json({error:'Select one to three properties.'});
  const out=[];for(const id of ids){let l=(req.db.privateDeals||[]).find(x=>x.id===id&&x.ownerId===req.user.id);if(!l){const candidate=req.db.listings.find(x=>x.id===id);if(candidate&&((req.db.saves||[]).some(x=>x.userId===req.user.id&&x.listingId===id)||candidate.ownerId===req.user.id))l=gateListing(candidate,req.user,req.db);}if(!l)return res.status(404).json({error:'A selected property is unavailable.'});out.push({id,address:l.address,city:l.city,...rules.comparison(l,req.body.assumptions)});}
  res.json({deals:out,notice:'Scenario estimates use seller or user inputs, not verified profits. ±10% ARV scenarios use the same cost assumptions. Missing facts are never treated as zero.'});
 });
 const crmFields=['name','email','phone','markets','buyBox','notes','status','criteria'];
 app.get('/api/buyer-crm/export',requireAuth,(req,res)=>{const rows=(req.db.buyerCrm||[]).filter(x=>own(req.user,x));res.type('text/csv').set('Content-Disposition','attachment; filename="better-buyers.csv"').send([crmFields.map(rules.csvCell).join(','),...rows.map(x=>crmFields.map(k=>rules.csvCell(k==='criteria'?JSON.stringify(x.criteria||{}):x[k])).join(','))].join('\r\n'));});
 app.post('/api/buyer-crm/import',requireAuth,async(req,res)=>{
  let parsed;try{parsed=rules.csvParse(req.body?.csv);}catch(e){return res.status(400).json({error:e.message});}const headers=parsed.shift()||[],mapping=req.body?.mapping||{},contacts=collect(req.db,'buyerCrm').filter(x=>own(req.user,x));const contactKey=x=>x.email?'email:'+String(x.email).trim().toLowerCase():'contact:'+String(x.name||'').toLowerCase()+'|'+String(x.phone||'');const seen=new Set(contacts.map(contactKey));
  const rows=parsed.map((cells,index)=>{const row={};for(const k of crmFields){const mapped=mapping[k]===undefined?headers.findIndex(h=>h.trim().toLowerCase()===k.toLowerCase()):Number(mapping[k]);row[k]=mapped>=0?safeText(cells[mapped],k==='notes'?1200:600):'';}const key=contactKey(row),duplicate=seen.has(key);seen.add(key);let criteriaError=null;if(row.criteria){try{const parsed=JSON.parse(row.criteria);if(!parsed||Array.isArray(parsed)||typeof parsed!=='object')criteriaError='Invalid structured criteria';}catch{criteriaError='Invalid structured criteria JSON';}}return {index,row,duplicate,error:!row.name?'Missing name':row.email&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(row.email)?'Invalid email':criteriaError};});
  if(req.body?.commit!==true)return res.json({headers,rows});
  const selected=new Set(Array.isArray(req.body.selected)?req.body.selected:[]);let imported=0;
  for(const item of rows){if(!selected.has(item.index)||item.duplicate||item.error)continue;const row={...item.row,id:crypto.randomUUID(),ownerId:req.user.id,companyId:req.user.companyId||null,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!['new','contacted','interested','pof','offer','closed','inactive'].includes(row.status))row.status='new';if(row.criteria){try{row.criteria=cleanCrmCriteria(JSON.parse(row.criteria));}catch{row.criteria={};}}req.db.buyerCrm.push(row);imported++;}
  await saveDB(req.db);res.json({imported});
 });
 app.get('/api/deal-introductions',requireAuth,(req,res)=>res.json({introductions:(req.db.dealIntroductions||[]).filter(x=>[x.senderId,x.recipientId].includes(req.user.id)).map(x=>({...x,senderName:req.db.users.find(u=>u.id===x.senderId)?.name||'Member',recipientName:req.db.users.find(u=>u.id===x.recipientId)?.name||'Member'}))}));
 app.post('/api/deal-introductions',requireAuth,async(req,res)=>{
  const b=req.body||{},l=req.db.listings.find(x=>x.id===b.listingId),recipient=req.db.users.find(x=>x.id===b.recipientId);if(!l||!rules.available(l)||!recipient||recipient.id===req.user.id||recipient.id===l.ownerId)return res.status(400).json({error:'Choose an available property and a different member.'});
  const rows=collect(req.db,'dealIntroductions');if(rows.some(x=>x.senderId===req.user.id&&x.recipientId===recipient.id&&x.listingId===l.id&&x.status==='pending'))return res.status(409).json({error:'An introduction is already awaiting a response.'});
  if(rows.filter(x=>x.senderId===req.user.id&&Date.now()-Date.parse(x.createdAt)<3600000).length>=10)return res.status(429).json({error:'Please wait before sending more introductions.'});
  const row={id:crypto.randomUUID(),senderId:req.user.id,recipientId:recipient.id,listingId:l.id,note:safeText(b.note,600),status:'pending',createdAt:new Date().toISOString()};rows.push(row);collect(req.db,'dealNotifications').push({id:crypto.randomUUID(),userId:recipient.id,listingId:l.id,title:'Property introduction request',body:`${req.user.name} would like to introduce you to a property. Accept or decline in your workspace.`,read:false,at:row.createdAt});await saveDB(req.db);res.json({introduction:row});
 });
 app.post('/api/deal-introductions/:id/respond',requireAuth,async(req,res)=>{
  const row=(req.db.dealIntroductions||[]).find(x=>x.id===req.params.id&&x.recipientId===req.user.id);if(!row)return res.status(404).json({error:'Introduction not found.'});if(row.status!=='pending')return res.json({introduction:row});const status=req.body?.accept===true?'accepted':'declined';row.status=status;row.respondedAt=new Date().toISOString();
  if(status==='accepted'){const l=req.db.listings.find(x=>x.id===row.listingId);if(!l)return res.status(404).json({error:'Property is no longer available.'});collect(req.db,'messages').push({id:'intro:'+row.id,fromUserId:req.user.id,fromName:req.user.name,toUserId:l.ownerId,listingId:l.id,body:`I accepted a property introduction from ${req.db.users.find(u=>u.id===row.senderId)?.name||'a Better member'}. I'd like to discuss this property.`,at:row.respondedAt,read:false});}
  await saveDB(req.db);res.json({introduction:row});
 });
};
