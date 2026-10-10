'use strict';
const crypto=require('crypto');
const policy=require('./policy');
const BASE_BPS=3000,MAX_BPS=4000,STEP_BPS=100,TOP_COUNT=5,HOLD_DAYS=3;
const TERMS_VERSION='2026-10-10-v4';
const MILESTONES=[{sales:10,amountCents:500},{sales:25,amountCents:1000},{sales:50,amountCents:1500},{sales:100,amountCents:2500}];
const BONUS_BUDGET_BPS=300;
const TERMS={version:TERMS_VERSION,rateBps:BASE_BPS,ratePct:30,maxRatePct:40,holdDays:HOLD_DAYS,oneTime:true,summary:'30% base one-time commission on a qualifying referred customer’s first eligible paid membership. The all-time top 5 earn one additional percentage point on each eligible purchase, including that purchase, up to 40%. Rank is evaluated including the new purchase. Leaving the top 5 resets the rate to 30%; returning starts a new bonus run. Rankings count eligible paid membership acquisitions, not clicks, free signups or renewals. Refunds, disputes and ineligible sales do not count. Ties use earliest first eligible sale, then account ID. One-time sales milestones offer up to $5 at 10, $10 at 25, $15 at 50 and $25 at 100 eligible new purchases under this bonus program. Total milestone bonuses are capped at 3% of that program’s membership revenue retained after acquisition commissions. Individual awards may be lower when the budget cap applies, and are not topped up later. Past sales do not create retroactive milestone payouts. Pending or available bonuses may be reversed if refunds or disputes invalidate the milestone or its revenue budget. Earnings are held for 3 days and may be reversed under the existing refund, dispute and fraud rules.'};
const realUser=u=>u&&!u.demo&&u.role!=='admin'&&!policy.isAdminEmail(u.email);
const acquisitionKey=c=>c.acquisitionId||String(c.sourceId||c.id).split(':partial:')[0];
function acquisitions(db){
 const groups=new Map();
 for(const c of db.affiliateCommissions||[]){
  if(c.kind!=='membership_acquisition'||!c.customerUserId||!Number.isFinite(Date.parse(c.createdAt))||Number(c.grossCents)<=0)continue;
  const key=c.affiliateUserId+':'+acquisitionKey(c);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(c);
 }
 const seen=new Set(),rows=[];
 for(const group of groups.values()){
  if(group.some(c=>c.status==='reversed'||c.rankingReversedAt))continue;
  const c=group.filter(c=>['pending','available','paid'].includes(c.status)).sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt)||String(a.id).localeCompare(String(b.id)))[0];
  if(!c||seen.has(c.customerUserId)||c.customerUserId===c.affiliateUserId)continue;
  const customer=(db.users||[]).find(u=>u.id===c.customerUserId);if(customer?.demo)continue;
  seen.add(c.customerUserId);rows.push(c);
 }
 return rows;
}
function ranks(db){
 const valid=acquisitions(db),rows=[];
 for(const a of db.affiliateApplications||[]){
  const user=(db.users||[]).find(u=>u.id===a.userId);if(a.status!=='approved'||!realUser(user)||rows.some(x=>x.userId===user.id))continue;
  const sales=valid.filter(c=>c.affiliateUserId===user.id);if(!sales.length)continue;
  rows.push({userId:user.id,name:user.name||'Affiliate',sales:sales.length,firstSaleAt:sales.reduce((s,c)=>s<c.createdAt?s:c.createdAt,sales[0].createdAt)});
 }
 rows.sort((a,b)=>b.sales-a.sales||a.firstSaleAt.localeCompare(b.firstSaleAt)||a.userId.localeCompare(b.userId));
 return rows.map((r,i)=>({...r,rank:i+1,topFive:i<TOP_COUNT}));
}
function reconcileState(db,resetId){
 const previous=(db.affiliateLeaderboardState||[]).find(x=>x.id==='current');
 const top=ranks(db).slice(0,TOP_COUNT).map(x=>x.userId),cycles={};
 for(const id of top)cycles[id]=id!==resetId&&previous?.topFive?.includes(id)&&previous?.cycles?.[id]||crypto.randomUUID();
 return {id:'current',revision:Number(previous?.revision??-1)+1,topFive:top,cycles};
}
function bonusPoints(db,state,userId){return Math.min(10,acquisitions(db).filter(c=>c.affiliateUserId===userId&&c.bonusCycleId===state.cycles[userId]&&c.topFiveAtPurchase===true).length);}
function milestoneSummary(db,userId){
 const valid=acquisitions(db).filter(c=>c.affiliateUserId===userId&&c.leaderboardPolicyVersion==='v29.47');
 const net=valid.reduce((total,c)=>{
  const group=(db.affiliateCommissions||[]).filter(x=>x.kind==='membership_acquisition'&&x.affiliateUserId===userId&&acquisitionKey(x)===acquisitionKey(c));
  const commission=group.reduce((n,x)=>n+Math.max(0,Number(x.amountCents)||0),0);
  return total+Math.max(0,Number(c.grossCents)-commission);
 },0);
 const bonuses=(db.affiliateCommissions||[]).filter(c=>c.affiliateUserId===userId&&c.kind==='sales_milestone_bonus');
 const spent=bonuses.filter(c=>['pending','available','paid'].includes(c.status)).reduce((n,c)=>n+Number(c.amountCents||0),0),budget=Math.floor(net*BONUS_BUDGET_BPS/10000);
 return {sales:valid.length,budgetCents:budget,awardedCents:spent,remainingBudgetCents:Math.max(0,budget-spent),budgetPct:3,
  milestones:MILESTONES.map(m=>({...m,earned:bonuses.some(c=>c.threshold===m.sales),awardedCents:bonuses.filter(c=>c.threshold===m.sales).reduce((n,c)=>n+Number(c.amountCents||0),0),status:bonuses.find(c=>c.threshold===m.sales)?.status||'not_earned'}))};
}
function invalidBonusIds(db){
 const ids=[];
 for(const userId of new Set((db.affiliateCommissions||[]).filter(c=>c.kind==='sales_milestone_bonus').map(c=>c.affiliateUserId))){
  const summary=milestoneSummary(db,userId);let excess=Math.max(0,summary.awardedCents-summary.budgetCents);
  const unpaid=(db.affiliateCommissions||[]).filter(c=>c.affiliateUserId===userId&&c.kind==='sales_milestone_bonus'&&['pending','available'].includes(c.status)).sort((a,b)=>b.threshold-a.threshold);
  for(const c of unpaid)if(summary.sales<c.threshold||excess>0){ids.push(c.id);excess=Math.max(0,excess-Number(c.amountCents||0));}
 }
 return ids;
}
function snapshot(db,state,userId){
 const rows=ranks(db),own=rows.find(x=>x.userId===userId),topFive=!!own?.topFive;
 const points=topFive?bonusPoints(db,state,userId):0;
 return {period:'all',baseRatePct:30,maxRatePct:40,topCount:TOP_COUNT,rows:rows.slice(0,50).map(r=>({...r,isYou:r.userId===userId})),totalAffiliates:rows.length,
  milestones:milestoneSummary(db,userId),own:{rank:own?.rank||null,sales:own?.sales||0,topFive,bonusPoints:points,currentRatePct:30+points,rateBps:BASE_BPS+points*STEP_BPS,nextTopFiveRatePct:Math.min(40,31+points)}};
}
function plan(db,event,resetId){
 const before=(db.affiliateLeaderboardState||[]).find(x=>x.id==='current');
 let state=reconcileState(db,resetId),row=null;
 const reverseBonusIds=invalidBonusIds(db),bonuses=[];
 const effectiveDB={...db,affiliateCommissions:(db.affiliateCommissions||[]).map(c=>reverseBonusIds.includes(c.id)?{...c,status:'reversed'}:c)};
 if(event){
  const user=(db.users||[]).find(u=>u.id===event.userId),app=(db.affiliateApplications||[]).find(a=>a.userId===user?.affiliateReferrerId&&a.status==='approved');
  const affiliate=(db.users||[]).find(u=>u.id===app?.userId);
  const valid=event.billingReason==='subscription_create'&&Number.isSafeInteger(event.amountCents)&&event.amountCents>0&&typeof event.sourceId==='string'&&event.sourceId.length>0;
  const duplicate=(db.affiliateCommissions||[]).some(c=>c.sourceId===event.sourceId||(c.customerUserId===user?.id&&c.kind==='membership_acquisition'));
  if(valid&&realUser(user)&&realUser(affiliate)&&app?.userId!==user.id&&app?.termsAcceptedAt&&app.termsVersion===TERMS_VERSION&&Number(app.rateBps)===BASE_BPS&&!duplicate){
   const now=new Date(),id='affiliate_acquisition:'+user.id;
   row={id,acquisitionId:id,affiliateUserId:app.userId,customerUserId:user.id,sourceId:event.sourceId,rootSourceId:event.sourceId,paymentIntentId:typeof event.paymentIntentId==='string'?event.paymentIntentId:null,tier:event.tier||user.plan||'pro',grossCents:event.amountCents,rateBps:BASE_BPS,amountCents:0,status:'pending',createdAt:now.toISOString(),availableAt:new Date(now.getTime()+HOLD_DAYS*86400000).toISOString(),termsVersion:TERMS_VERSION,kind:'membership_acquisition',oneTime:true,leaderboardPolicyVersion:'v29.47'};
   const withSale={...db,affiliateCommissions:[...(db.affiliateCommissions||[]),row],affiliateLeaderboardState:[state]};
   state=reconcileState(withSale);state.revision=Number(before?.revision??-1)+1;
   const rank=ranks(withSale).find(x=>x.userId===app.userId);
   row.leaderboardRank=rank?.rank||null;row.topFiveAtPurchase=!!rank?.topFive;
   row.bonusCycleId=row.topFiveAtPurchase?state.cycles[app.userId]:null;
   row.bonusPoints=row.topFiveAtPurchase?Math.min(10,bonusPoints(db,state,app.userId)+1):0;
   row.rateBps=BASE_BPS+row.bonusPoints*STEP_BPS;row.amountCents=Math.floor(event.amountCents*row.rateBps/10000);
   const summary=milestoneSummary({...effectiveDB,affiliateCommissions:[...effectiveDB.affiliateCommissions,row]},app.userId);
   let remaining=summary.remainingBudgetCents;
   for(const milestone of summary.milestones){
    if(summary.sales<milestone.sales||milestone.earned)continue;
    const amount=Math.min(milestone.amountCents,remaining);if(amount<1)continue;
    const bonusId='affiliate_milestone:'+app.userId+':'+milestone.sales;
    bonuses.push({id:bonusId,affiliateUserId:app.userId,sourceId:bonusId,rootSourceId:bonusId,kind:'sales_milestone_bonus',threshold:milestone.sales,amountCents:amount,maxAmountCents:milestone.amountCents,status:'pending',createdAt:now.toISOString(),availableAt:new Date(now.getTime()+HOLD_DAYS*86400000).toISOString(),termsVersion:TERMS_VERSION,oneTime:true,budgetCapBps:BONUS_BUDGET_BPS,leaderboardPolicyVersion:'v29.47'});
    remaining-=amount;
   }

  }
 }
 const changed=!before||JSON.stringify(before.topFive)!==JSON.stringify(state.topFive)||JSON.stringify(before.cycles)!==JSON.stringify(state.cycles);
 return {state,row,bonuses,reverseBonusIds,changed:changed||reverseBonusIds.length>0,expectedRevision:Number(before?.revision??-1)};
}
// A revision claim and the acquisition row commit in one PostgreSQL statement.
// Competing webhooks retry with a fresh snapshot; rates cannot share a stale rank.
const COMMIT_SQL=`WITH claim AS (
 INSERT INTO kv_affiliateleaderboardstate (id,data,updated_at)
 SELECT 'current',$1::jsonb,now() WHERE $3::jsonb IS NULL OR (
  NOT EXISTS (SELECT 1 FROM kv_affiliatecommissions c WHERE c.data->>'sourceId'=$3::jsonb->>'sourceId' OR (c.data->>'customerUserId'=$3::jsonb->>'customerUserId' AND c.data->>'kind'='membership_acquisition'))
  AND EXISTS (SELECT 1 FROM kv_affiliateapplications a WHERE a.data->>'userId'=$3::jsonb->>'affiliateUserId' AND a.data->>'status'='approved' AND a.data->>'termsVersion'=$3::jsonb->>'termsVersion' AND a.data->>'termsAcceptedAt' IS NOT NULL AND a.data->>'rateBps'='3000')
  AND EXISTS (SELECT 1 FROM kv_users u WHERE u.id=$3::jsonb->>'customerUserId' AND COALESCE(u.data->>'demo','false')!='true' AND COALESCE(u.data->>'role','')!='admin' AND lower(COALESCE(u.data->>'email',''))!=ALL($4::text[]) AND u.data->>'affiliateReferrerId'=$3::jsonb->>'affiliateUserId')
  AND EXISTS (SELECT 1 FROM kv_users u WHERE u.id=$3::jsonb->>'affiliateUserId' AND COALESCE(u.data->>'demo','false')!='true' AND COALESCE(u.data->>'role','')!='admin' AND lower(COALESCE(u.data->>'email',''))!=ALL($4::text[]))
 )
 ON CONFLICT (id) DO UPDATE SET data=EXCLUDED.data,updated_at=now()
 WHERE (kv_affiliateleaderboardstate.data->>'revision')::bigint=$2::bigint
 RETURNING data
), commission AS (
 INSERT INTO kv_affiliatecommissions (id,data,updated_at)
 SELECT $3::jsonb->>'id',$3::jsonb,now() FROM claim WHERE $3::jsonb IS NOT NULL
 ON CONFLICT (id) DO NOTHING RETURNING data
), bonuses AS (
 INSERT INTO kv_affiliatecommissions (id,data,updated_at)
 SELECT bonus->>'id',bonus,now() FROM claim,jsonb_array_elements($5::jsonb) AS bonus
 ON CONFLICT (id) DO NOTHING RETURNING data
), reversals AS (
 UPDATE kv_affiliatecommissions SET data=data||jsonb_build_object('status','reversed','reversedAt',now()::text,'reversalReason','Milestone eligibility or revenue budget reduced by refund/dispute'),updated_at=now()
 WHERE id=ANY($6::text[]) AND data->>'status' IN ('pending','available') AND EXISTS (SELECT 1 FROM claim) RETURNING data
) SELECT claim.data AS state,(SELECT data FROM commission) AS commission FROM claim`;
function createRecorder(store){
 let tail=Promise.resolve();
 const run=async(event,resetId,initialDB)=>{
  for(let attempt=0;attempt<12;attempt++){
   const db=attempt===0&&initialDB&&!store.FILE_MODE?initialDB:await store.loadDB(),p=plan(db,event,resetId);
   if(!p.row&&!p.changed)return {db,state:p.state,row:null};
   if(store.FILE_MODE){db.affiliateLeaderboardState=[p.state];if(p.row)db.affiliateCommissions.push(p.row,...p.bonuses);for(const c of db.affiliateCommissions)if(p.reverseBonusIds.includes(c.id)){c.status='reversed';c.reversedAt=new Date().toISOString();c.reversalReason='Milestone eligibility or revenue budget reduced by refund/dispute';}await store.saveDB(db);return {db,state:p.state,row:p.row,bonuses:p.bonuses};}
   const result=await store.sql(COMMIT_SQL,[JSON.stringify(p.state),p.expectedRevision,p.row?JSON.stringify(p.row):null,policy.adminEmails().map(x=>String(x).toLowerCase()),JSON.stringify(p.bonuses),p.reverseBonusIds]);
   if(result.length){db.affiliateLeaderboardState=[p.state];if(p.row)db.affiliateCommissions.push(p.row,...p.bonuses);for(const c of db.affiliateCommissions)if(p.reverseBonusIds.includes(c.id)){c.status='reversed';c.reversalReason='Milestone eligibility or revenue budget reduced by refund/dispute';}return {db,state:p.state,row:p.row,bonuses:p.bonuses};}
  }
  throw new Error('Affiliate purchase is being processed. Retry the payment event.');
 };
 const serial=(...args)=>{if(!store.FILE_MODE)return run(...args);const task=tail.then(()=>run(...args));tail=task.catch(()=>{});return task;};
 return {recordMembership:(event)=>serial(event),reconcile:(db,resetId)=>serial(null,resetId,db)};
}
module.exports={MILESTONES,BONUS_BUDGET_BPS,milestoneSummary,invalidBonusIds,BASE_BPS,MAX_BPS,STEP_BPS,TOP_COUNT,TERMS,TERMS_VERSION,acquisitions,ranks,bonusPoints,snapshot,plan,COMMIT_SQL,createRecorder};
