const path=require('path');
const root=path.join(__dirname,'..');
for(const key of ['DATABASE_URL','NETLIFY_DATABASE_URL','NETLIFY','AWS_LAMBDA_FUNCTION_NAME','LAMBDA_TASK_ROOT','OPENAI_API_KEY','RESEND_API_KEY','STRIPE_SECRET_KEY','CJ_API_KEY'])process.env[key]='';
process.env.SESSION_SECRET='connected-deals-local-qa';process.env.ADMIN_EMAILS='admin@example.test';process.env.APP_URL='http://127.0.0.1:3157';
const store=require(path.join(root,'store'));let db=Object.fromEntries(store.COLLECTIONS.map(k=>[k,[]]));
const now=new Date().toISOString();
for(const id of ['seller','buyer','paused','unknown','outsider','admin','teammate'])db.users.push({id,name:id[0].toUpperCase()+id.slice(1),username:id,email:id+'@example.test',emailVerified:true,founderProgramExcluded:true,role:id==='admin'?'admin':'buyer',roles:['buyer'],settings:{tutorialCompletedVersion:77,tutorialHighestRank:4,tutorialDismissedVersion:77,guideAnimations:false},createdAt:now,buyingStatus:id==='paused'?'paused':'active',plan:id==='seller'||id==='admin'?'wholesale':'platinum',planUntil:'2030-01-01T00:00:00.000Z',buyBoxes:['buyer','paused','unknown'].includes(id)?[{active:true,public:id!=='unknown',minPrice:0,maxPrice:250000,states:['NJ'],cities:['Trenton'],minArv:300000,minBeds:3,rehabTolerance:id==='unknown'?'light':'moderate',updatedAt:now}]:[]});
for(const id of ['seller','teammate'])Object.assign(db.users.find(u=>u.id===id),{companyId:'team',companyRole:id==='seller'?'owner':'member'});db.companies.push({id:'team',ownerId:'seller',name:'Fixture team',createdAt:now});
const base={id:'listing',ownerId:'seller',ownerName:'Seller',ownerEmail:'seller@example.test',companyId:'team',address:'123 Main St',city:'Trenton, NJ',propertyType:'Single family',asking:200000,arv:350000,rehab:50000,beds:3,baths:2,sqft:1500,year:1980,photos:[],notes:'Fixture property',createdAt:now,availabilityStatus:'active',expiresAt:'2030-01-01T00:00:00.000Z',lastConfirmedAt:now};db.listings.push(base);db.saves.push({id:'saved',userId:'seller',listingId:'listing',createdAt:now});
store.loadDB=async()=>structuredClone(db);store.saveDB=async next=>{db=structuredClone(next);};store.appendRecord=async(collection,row)=>{db[collection].push(structuredClone(row));};
const storage=require(path.join(root,'storage'));storage.writeDocument=async()=>'/api/doc/fixture.pdf';storage.readDocument=async()=>({contentType:'application/pdf',buffer:Buffer.from('%PDF-1.4 fixture')});storage.writeImage=async x=>x||null;
const app=require(path.join(root,'server'));
const Keygrip=require(path.join(root,'node_modules/keygrip')),keys=new Keygrip([process.env.SESSION_SECRET]);
function cookie(id){const val=Buffer.from(JSON.stringify({userId:id})).toString('base64'),raw='keyline_session='+val;return raw+'; keyline_session.sig='+keys.sign(raw);}
module.exports={app,cookie,root,getDB:()=>db};
if(require.main===module)app.listen(3157,'127.0.0.1',()=>console.log('QA fixture http://127.0.0.1:3157'));
