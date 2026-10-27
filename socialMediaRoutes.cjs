'use strict';
const {publicProfileUser}=require('./social');
const {isAffiliateOnlyUser}=require('./affiliateAccounts');
function canShow(owner,viewer,admin=false){return Boolean(owner&&viewer&&(!isAffiliateOnlyUser(owner)||owner.id===viewer.id||admin));}
function connectionUsers(db,ownerId,kind){
 const ids=new Set();
 if(kind==='followers')for(const row of db.follows||[])if(row.followingId===ownerId)ids.add(row.followerId);
 if(kind==='friends')for(const row of db.friendships||[]){if(row.userAId===ownerId)ids.add(row.userBId);if(row.userBId===ownerId)ids.add(row.userAId);}
 return (db.users||[]).filter(x=>ids.has(x.id)&&!isAffiliateOnlyUser(x)).map(publicProfileUser).sort((a,b)=>a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
function register(app,{requireAuth,saveDB,writeImage,isAdminUser=()=>false}){
 app.get('/api/users/:id/connections',requireAuth,async(req,res)=>{
  const owner=req.db.users.find(x=>x.id===req.params.id);if(!canShow(owner,req.user,isAdminUser(req.user)))return res.status(404).json({error:'User not found.'});
  const kind=String(req.query.kind||'');if(!['followers','friends'].includes(kind))return res.status(400).json({error:'Choose followers or friends.'});
  const offset=Math.max(0,Math.min(100000,Math.floor(Number(req.query.offset)||0)));const all=connectionUsers(req.db,owner.id,kind);res.json({users:all.slice(offset,offset+50),hasMore:offset+50<all.length});
 });
 app.get('/api/users/:id/banner',requireAuth,async(req,res)=>{
  const owner=req.db.users.find(x=>x.id===req.params.id);if(!canShow(owner,req.user,isAdminUser(req.user)))return res.status(404).json({error:'User not found.'});
  res.json({bannerUrl:owner.bannerUrl||null});
 });
 app.post('/api/me/banner',requireAuth,async(req,res)=>{
  if(req.body?.reset===true){req.user.bannerUrl=null;await saveDB(req.db);return res.json({bannerUrl:null});}
  const data=String(req.body?.imageData||'');
  if(data.length>4*1024*1024||!/^data:image\/(jpeg|png|webp);base64,/.test(data))return res.status(400).json({error:'Choose a JPG, PNG or WebP image under 3 MB.'});
  const url=await writeImage(data);if(!url)return res.status(400).json({error:'That image could not be stored.'});
  req.user.bannerUrl=url;await saveDB(req.db);res.json({bannerUrl:url});
 });
}
module.exports={register,canShow,connectionUsers};
