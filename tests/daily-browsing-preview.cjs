'use strict';
// Disposable local data only. Never mount this fixture in production.
const {app,cookie,getDB}=require('./connected-fixture');
const browsing=require('../dailyBrowsing');
for(const key of ['REGRID_API_TOKEN','MLS_RESO_TOKEN','MLS_RESO_SOURCES_JSON','BRIDGE_API_KEY','OPENAI_API_KEY','RESEND_API_KEY','STRIPE_SECRET_KEY'])process.env[key]='';
const free=getDB().users.find(u=>u.id==='outsider');Object.assign(free,{plan:'free',planUntil:null,trialUntil:null,unlockCredits:0});
const plus={...getDB().users.find(u=>u.id==='buyer'),id:'preview-plus',name:'Plus preview',username:'preview.plus',email:'plus@example.test',plan:'pro',planUntil:'2030-01-01T00:00:00Z'};getDB().users.push(plus);
for(const u of getDB().users){u.settings={...u.settings,tutorialCompletedVersion:94,tutorialHighestRank:4,tutorialDismissedVersion:94,firstLookCompleted:true,guideAnimations:false};u.founderLaunchNoticeSeenAt=new Date().toISOString();}
for(let i=1;i<40;i++)getDB().listings.push({...getDB().listings[0],id:'property-'+i,address:i+' Example Avenue',demo:true,photos:[],notes:'Sample property for local UI review only. This is not a real opportunity.'});
app.get('/__preview',(req,res)=>res.type('html').send(`<!doctype html><meta charset="utf-8"><title>Better daily browsing local review</title><style>body{font:14px system-ui;background:#ddd;padding:16px}header{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:16px}iframe{height:850px;border:1px solid #aaa;background:white}label{display:flex;gap:5px}</style><header><b>Disposable local preview</b><label>Width<select id="w"><option>320</option><option selected>390</option><option>1440</option></select></label><label>Theme<select id="t"><option>light</option><option>dark</option></select></label><label>Account<select id="u"><option value="outsider">Free</option><option value="preview-plus">Plus</option><option value="buyer">Platinum</option><option value="admin">Admin</option></select></label><label>Page<select id="p"><option>feed</option><option>upgrade</option><option>dealbuilder</option><option>faq</option><option>support</option></select></label><label>Used<input id="n" type="number" min="0" max="30" value="0" style="width:50px"></label><button id="load">Review</button></header><iframe id="f" title="Actual website fixture" style="width:390px"></iframe><script>function load(){f.style.width=w.value+'px';f.src='/__preview/login/'+u.value+'?theme='+t.value+'&view='+p.value+'&used='+n.value}document.querySelector('#load').onclick=load;load()</script>`));
app.get('/__preview/login/:id',(req,res)=>{
 const user=getDB().users.find(u=>u.id===req.params.id);if(!user)return res.status(404).send('Choose a preview account.');
 user.settings.theme=req.query.theme==='dark'?'dark':'light';
 if(user.id==='outsider'){const count=Math.min(30,Math.max(0,Number(req.query.used)||0));getDB().browsingUsage=[{id:user.id,day:browsing.day(),listingIds:Array.from({length:count},(_,i)=>'property-'+(i+1)),revision:1}];}
 res.setHeader('Set-Cookie',cookie(user.id).split('; ').map(s=>s+'; Path=/; SameSite=Lax'));res.redirect('/?view='+(['feed','upgrade','dealbuilder','faq','support'].includes(req.query.view)?req.query.view:'feed'));
});
app.listen(3159,'127.0.0.1',()=>console.log('Open http://127.0.0.1:3159/__preview . All data is disposable; no production accounts or provider keys are used. Ctrl+C stops.'));
