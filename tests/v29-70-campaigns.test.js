'use strict';
const assert=require('assert'),tracking=require('../campaignTracking'),{app,cookie,getDB}=require('./connected-fixture');
const server=app.listen(0,'127.0.0.1');
(async()=>{
 await new Promise(r=>server.on('listening',r));const base='http://127.0.0.1:'+server.address().port;
 async function req(path,method='GET',body,user='admin'){const r=await fetch(base+path,{method,headers:{'content-type':'application/json',...(user?{cookie:cookie(user)}:{})},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};}
 const endpoint='/api/admin/campaigns';assert.equal((await req(endpoint,'GET',null,null)).status,401);assert.equal((await req(endpoint,'GET',null,'buyer')).status,403);
 assert.equal((await req(endpoint,'POST',{name:'Invalid',platform:'Fiverr',target:2})).status,400);
 let r=await req(endpoint,'POST',{name:'Kenley trial',platform:'Fiverr',target:25});assert.equal(r.status,200);const c=r.data.campaign;assert.equal(c.rateBps,3000);assert.equal(c.signupCents,100);assert.equal(c.target,25);assert.match(c.code,/^[A-F0-9]{24}$/);
 assert.throws(()=>tracking.signupCampaign(getDB(),'bad'),/unavailable/);
 const signup=await req('/api/signup','POST',{name:'Campaign Recruit',email:'campaign-new@example.invalid',password:'password123',roles:['buyer'],campaignCode:c.code,affiliateCode:'ANY',referralCode:getDB().users[0].referralCode},null);assert.equal(signup.status,200);const id=signup.data.user.id,u=getDB().users.find(u=>u.id===id);assert.equal(u.campaignId,c.id);assert.equal(u.referredBy,null);assert.equal(u.affiliateReferrerId,undefined);
 const review={userId:id,status:'approved',evidence:'https://example.invalid/professional — checked US investor activity and a legitimate property post',realEstateVerified:true,meaningfulActionVerified:true};assert.equal((await req(endpoint+'/'+c.id+'/review','POST',review)).status,400);
 Object.assign(u,{emailVerified:true,location:'Trenton, NJ',createdAt:'2026-10-01T12:00:00Z',campaignAt:'2026-10-01T12:00:00Z'});getDB().activityEvents.push({id:'return',userId:id,at:'2026-10-02T12:00:00Z'});
 assert.equal((await req(endpoint+'/'+c.id+'/review','POST',review)).status,200);assert.equal((await req(endpoint+'/'+c.id+'/review','POST',review)).status,200);
 const service=tracking.createService(require('../store')),event={userId:id,sourceId:'invoice-first',amountCents:3000,tier:'pro',currency:'usd',billingReason:'subscription_create',paidAt:Date.parse('2026-10-02T12:00:00Z'),paymentIntentId:'pi-first'};
 await Promise.all(Array.from({length:6},()=>service.record(event)));await service.record({...event,sourceId:'renewal',billingReason:'subscription_cycle'});await service.record({...event,sourceId:'different-first'});
 r=await req(endpoint);let actual=r.data.campaigns[0];assert.equal(actual.sales.length,1);assert.equal(actual.sales[0].commissionCents,900);assert.equal(actual.totals.signupsEarnedCents,100);assert.equal(actual.totals.dueCents,1000);assert.equal(actual.totals.approved,1);
 assert.equal((await req(endpoint+'/'+c.id+'/payment','POST',{amountCents:1001,reference:'Fiverr excessive'})).status,400);
 assert.equal((await req(endpoint+'/'+c.id+'/payment','POST',{amountCents:1000,reference:'Fiverr receipt 1'})).status,200);
 assert.equal((await req(endpoint+'/'+c.id+'/payment','POST',{amountCents:1000,reference:'Fiverr receipt 1'})).status,400);
 await service.reverse({paymentIntentId:'pi-first',reason:'Refund'});await service.reverse({invoiceId:'invoice-first',reason:'Duplicate refund'});await service.record(event);actual=(await req(endpoint)).data.campaigns[0];assert.equal(actual.sales.length,1);assert.equal(actual.sales[0].status,'reversed');assert.equal(actual.totals.overpaidCents,900);assert.equal(actual.totals.dueCents,0);assert.equal(getDB().affiliateCommissions.length,0);
 assert.equal((await req(endpoint+'/'+c.id+'/status','POST',{status:'paused'})).status,200);assert.throws(()=>tracking.signupCampaign(getDB(),c.code),/unavailable/);
 assert.equal((await req('/api/signup','POST',{name:'Late recruit',email:'late@example.invalid',password:'password123',roles:['buyer'],campaignCode:c.code},null)).status,400);
 assert.equal(tracking.netInvoice({amount_paid:5500,total_taxes:[{amount:500}]}),5000);assert.equal(tracking.netInvoice({amount_paid:0,tax:500}),0);
 // Execute the actual webhook wiring with a local signature-verifier stub; no live Stripe calls.
 const payments=require('../payments');payments.verifyWebhook=raw=>JSON.parse(raw.toString());
 const second=(await req(endpoint,'POST',{name:'Webhook campaign',platform:'Fiverr',target:25})).data.campaign;
 const customer=getDB().users.find(x=>x.id==='buyer');Object.assign(customer,{campaignId:second.id,campaignAt:'2026-10-01T00:00:00Z',stripeSubscriptionId:'sub-campaign',plan:'pro'});
 const invoice={type:'invoice.payment_succeeded',data:{object:{id:'inv-webhook',subscription:'sub-campaign',amount_paid:3300,total_taxes:[{amount:300}],currency:'usd',billing_reason:'subscription_create',created:Date.parse('2026-10-02T12:00:00Z')/1000,payment_intent:'pi-webhook',lines:{data:[{period:{end:Date.parse('2026-11-02')/1000}}]}}}};
 assert.equal((await req('/api/payments/webhook','POST',invoice,null)).status,200);assert.equal((await req('/api/payments/webhook','POST',invoice,null)).status,200);
 let webhookCampaign=(await req(endpoint)).data.campaigns.find(x=>x.id===second.id);assert.equal(webhookCampaign.sales.length,1);assert.equal(webhookCampaign.sales[0].commissionCents,900);assert.equal(getDB().affiliateCommissions.length,0);
 assert.equal((await req('/api/payments/webhook','POST',{type:'charge.refunded',data:{object:{invoice:'inv-webhook',payment_intent:'pi-webhook'}}},null)).status,200);
 webhookCampaign=(await req(endpoint)).data.campaigns.find(x=>x.id===second.id);assert.equal(webhookCampaign.sales[0].status,'reversed');
 const copy=tracking.newCampaign({name:'second',platform:'Upwork',target:35},'admin');for(const e of [{...event,currency:'eur'},{...event,amountCents:0}])assert.equal(tracking.recordSale(copy,{users:[{...u,campaignId:copy.id}]},e),false);
 for(const e of [{...event,paidAt:Date.parse('2027-01-01')},{...event,billingReason:'subscription_cycle'}])tracking.recordSale(copy,{users:[{...u,campaignId:copy.id}]},e);assert.equal(copy.sales.length,0,'late purchases and renewals never earn commission');
 const later={...u,createdAt:'2026-10-01T23:55:00Z',lastActiveAt:'2026-10-09T00:00:00Z'};assert(!tracking.qualification({activityEvents:[]},later).returnVisit);assert(!tracking.qualification({activityEvents:[]},{...later,role:'affiliate',roles:['affiliate']}).eligibleAccount);
 console.log('PASS campaign admin authorization, signup attribution, review gates, duplicate/renewal exclusion, 30% calculation, external receipts, refund reconciliation, paused links and zero affiliate-wallet entries');
})().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>server.close());
