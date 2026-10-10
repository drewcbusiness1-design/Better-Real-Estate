'use strict';
const assert=require('assert');
const {TERMS,ranks,acquisitions,plan,snapshot,createRecorder,milestoneSummary,invalidBonusIds}=require('../affiliateLeaderboard');
const copy=x=>JSON.parse(JSON.stringify(x));
const users=['a','b','c','d','e','f'].map(id=>({id,name:'Affiliate '+id,email:id+'@example.invalid',role:'affiliate'}));
const db={users,affiliateApplications:users.map(u=>({id:'app-'+u.id,userId:u.id,status:'approved',termsAcceptedAt:'2026-10-10',termsVersion:TERMS.version,rateBps:3000})),affiliateCommissions:[],affiliateLeaderboardState:[]};
for(let i=0;i<6;i++)for(let n=0;n<10-i;n++)db.affiliateCommissions.push({id:'legacy-'+i+'-'+n,affiliateUserId:users[i].id,customerUserId:'old-'+i+'-'+n,sourceId:'invoice-'+i+'-'+n,kind:'membership_acquisition',grossCents:10000,amountCents:3000,rateBps:3000,status:'paid',createdAt:new Date(Date.UTC(2026,0,1,i,n)).toISOString()});
const historical=JSON.stringify(db.affiliateCommissions);
let number=0;
function sale(affiliate,extra={}){
 const id='buyer-'+(++number);db.users.push({id,name:'Buyer',email:id+'@example.invalid',role:'buyer',affiliateReferrerId:affiliate});
 const event={userId:id,billingReason:'subscription_create',amountCents:10001,sourceId:'paid-'+number,tier:'pro',...extra},p=plan(db,event);db.affiliateLeaderboardState=[p.state];if(p.row)db.affiliateCommissions.push(p.row,...p.bonuses);return {row:p.row,event};
}
assert.equal(ranks(db).length,6);assert.equal(ranks(db)[4].userId,'e');assert.equal(snapshot(db,plan(db).state,'a').own.currentRatePct,30,'legacy amounts must not generate retroactive bonus');
const first=sale('e');assert.equal(first.row.rateBps,3100);assert.equal(first.row.amountCents,3100);assert.equal(first.row.leaderboardRank,5);
assert.equal(plan(db,first.event).row,null,'invoice retry must not grow bonus');
assert.equal(plan(db,{...first.event,sourceId:'renewal'}).row,null,'renewals must not generate another commission');
sale('e');assert.equal(snapshot(db,db.affiliateLeaderboardState[0],'e').own.currentRatePct,32);
sale('d');sale('d');for(let i=0;i<12;i++)sale('f');
assert.equal(ranks(db).at(-1).userId,'e');assert.equal(snapshot(db,db.affiliateLeaderboardState[0],'e').own.currentRatePct,30,'falling to sixth resets immediately');
let returning;for(let i=0;i<4;i++){const s=sale('e');if(s.row.topFiveAtPurchase){returning=s;break;}else assert.equal(s.row.rateBps,3000);}
assert(returning);assert.equal(returning.row.rateBps,3100,'re-entry starts a fresh run, not previous 32%');
for(let i=0;i<14;i++)sale('e');assert.equal(snapshot(db,db.affiliateLeaderboardState[0],'e').own.currentRatePct,40);assert.equal(db.affiliateCommissions.at(-1).rateBps,4000);
assert.equal(JSON.stringify(db.affiliateCommissions.slice(0,45)),historical,'historical paid commissions must not be rewritten');
const last=db.affiliateCommissions.at(-1);db.affiliateCommissions.push({...last,id:last.id+'-partial',sourceId:last.sourceId+':partial:1',amountCents:100,status:'paid'});
const count=acquisitions(db).length;assert.equal(acquisitions(db).filter(c=>c.customerUserId===last.customerUserId).length,1,'partial payout must not become another sale or bonus point');last.status='reversed';assert.equal(acquisitions(db).length,count-1,'refunded acquisition and paid split must not count');
for(const extra of [{billingReason:'subscription_cycle'},{billingReason:'subscription_update'},{billingReason:undefined},{amountCents:0},{amountCents:-1},{amountCents:Infinity},{amountCents:1.2}])assert.equal(sale('a',extra).row,null);
const app=db.affiliateApplications[0];app.termsVersion='2026-09-27-v3';assert.equal(sale('a').row,null,'new material commission terms require acceptance');app.termsVersion=TERMS.version;
const self=plan(db,{userId:'a',billingReason:'subscription_create',sourceId:'self',amountCents:3000});assert.equal(self.row,null);
const demoBuyer={id:'demo',role:'buyer',demo:true,affiliateReferrerId:'a'};db.users.push(demoBuyer);assert.equal(plan(db,{userId:'demo',billingReason:'subscription_create',sourceId:'demo',amountCents:3000}).row,null);
app.status='suspended';let p=plan(db);db.affiliateLeaderboardState=[p.state];assert(!ranks(db).some(r=>r.userId==='a'));app.status='approved';p=plan(db,null,'a');db.affiliateLeaderboardState=[p.state];assert.equal(snapshot(db,p.state,'a').own.currentRatePct,30);
assert(snapshot(db,p.state,'e').rows.every(r=>!('email'in r)&&!('customerUserId'in r)&&!('amountCents'in r)),'leaderboard must not expose emails, customers or cash balances');
const ties={users:copy(users),affiliateApplications:copy(db.affiliateApplications),affiliateCommissions:users.map(u=>({id:u.id,affiliateUserId:u.id,customerUserId:'tie-'+u.id,sourceId:'tie-'+u.id,kind:'membership_acquisition',grossCents:3000,status:'pending',createdAt:'2026-01-01T00:00:00Z'}))};assert.deepEqual(ranks(ties).map(x=>x.userId),['a','b','c','d','e','f']);
// Milestone awards use only new program revenue and never outrun their budget.
function milestoneFixture(gross){
 const d={users:[copy(users[0])],affiliateApplications:[{...copy(db.affiliateApplications[0]),status:'approved'}],affiliateCommissions:[],affiliateLeaderboardState:[]};
 for(let i=0;i<25;i++){
  const id='milestone-buyer-'+i;d.users.push({id,role:'buyer',affiliateReferrerId:'a'});
  const p=plan(d,{userId:id,billingReason:'subscription_create',amountCents:gross,sourceId:'milestone-invoice-'+i});
  d.affiliateLeaderboardState=[p.state];d.affiliateCommissions.push(p.row,...p.bonuses);
  const sum=milestoneSummary(d,'a');assert(sum.awardedCents<=sum.budgetCents);
 }
 return d;
}
const rewards=milestoneFixture(3000),rewardRows=rewards.affiliateCommissions.filter(c=>c.kind==='sales_milestone_bonus');
assert.equal(rewardRows.length,2);assert.equal(rewardRows[0].amountCents,500);assert(rewardRows[1].amountCents<=1000);assert.equal(acquisitions(rewards).length,25);
assert.equal(new Date(rewardRows[0].availableAt)-new Date(rewardRows[0].createdAt),3*86400000);
const small=milestoneFixture(100),smallBonuses=small.affiliateCommissions.filter(c=>c.kind==='sales_milestone_bonus');assert(smallBonuses[0].amountCents<500);assert.equal(smallBonuses.length,2);
assert.equal(milestoneSummary(db,'a').sales,0,'old sales must not earn retroactive milestone cash');
rewards.affiliateCommissions.filter(c=>c.kind==='membership_acquisition').slice(0,16).forEach(c=>c.rankingReversedAt='now');
assert.deepEqual(new Set(invalidBonusIds(rewards)),new Set(rewardRows.map(c=>c.id)),'refunds below thresholds invalidate unpaid cash');
rewardRows[0].status='paid';const paidAmount=rewardRows[0].amountCents;assert(!invalidBonusIds(rewards).includes(rewardRows[0].id));assert.equal(rewardRows[0].amountCents,paidAmount);
(async()=>{
 let saved={users:[{id:'aff',role:'affiliate',email:'aff@example.invalid'},{id:'buyer',role:'buyer',affiliateReferrerId:'aff'}],affiliateApplications:[{userId:'aff',status:'approved',termsAcceptedAt:'now',termsVersion:TERMS.version,rateBps:3000}],affiliateCommissions:[],affiliateLeaderboardState:[]};
 const store={FILE_MODE:true,loadDB:async()=>copy(saved),saveDB:async db=>{saved=copy(db);}};
 const recorder=createRecorder(store),event={userId:'buyer',billingReason:'subscription_create',amountCents:3000,sourceId:'invoice-concurrent'};
 const results=await Promise.all([recorder.recordMembership(event),recorder.recordMembership(event)]);assert.equal(results.filter(r=>r.row).length,1);assert.equal(saved.affiliateCommissions.length,1);assert.equal(saved.affiliateCommissions[0].rateBps,3100);
 console.log('v29.47 affiliate rate increments/cap/reset/re-entry, ties, paid-only ranking, refund/partial payout, current terms, privacy and duplicate events: PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
