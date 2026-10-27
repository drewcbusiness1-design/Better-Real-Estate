'use strict';
const assert=require('assert');const {app,cookie,getDB}=require('./connected-fixture');
(async()=>{const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));const base='http://127.0.0.1:'+server.address().port;
const call=async(user,path,method='GET',body)=>{const r=await fetch(base+path,{method,headers:{...(user?{cookie:cookie(user)}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,data:await r.json()};};
try{
await call('buyer','/api/me/settings','PATCH',{shopLayout:'list'});assert.equal(getDB().users.find(u=>u.id==='buyer').settings.shopLayout,'list');assert.notEqual(getDB().users.find(u=>u.id==='outsider').settings.shopLayout,'list');await call('buyer','/api/me/settings','PATCH',{shopLayout:'arbitrary'});assert.equal(getDB().users.find(u=>u.id==='buyer').settings.shopLayout,'list');
const db=getDB();db.shopItems.push({id:'cart-item',sellerId:'seller',title:'A lamp',price:1500,stock:2,active:true,photos:[],category:'Other'});
assert.equal((await call(null,'/api/shop/cart')).status,401);
assert.equal((await call('buyer','/api/shop/cart','POST',{itemId:'cart-item',price:1})).status,200);
await call('buyer','/api/shop/cart','POST',{itemId:'cart-item'});
let cart=await call('buyer','/api/shop/cart');assert.equal(cart.data.items.length,1);assert.equal(cart.data.items[0].price,1500);
assert.equal((await call('outsider','/api/shop/cart')).data.items.length,0);
assert.equal((await call('seller','/api/shop/cart','POST',{itemId:'cart-item'})).status,400);
assert.equal((await call('buyer','/api/shop/cart','POST',{itemId:'missing'})).status,404);
assert(!JSON.stringify((await call('outsider','/api/users/buyer/listings')).data.owner).includes('shopCart'));
await call('buyer','/api/shop/cart','POST',{itemId:'cart-item',action:'remove'});assert.equal((await call('buyer','/api/shop/cart')).data.items.length,0);
// Same-company membership does not confer management rights.
assert.equal((await call('teammate','/api/listings/listing/deal-room','PATCH',{stage:'closing'})).status,403);
assert.equal((await call('seller','/api/listings/listing/deal-room','PATCH',{stage:'closing'})).status,200);
assert.equal((await call('admin','/api/listings/listing/deal-room','PATCH',{stage:'marketing'})).status,200);
assert.equal((await call('buyer','/api/me/banner','POST',{reset:true})).status,200);
assert.equal((await call('buyer','/api/users/buyer/banner')).data.bannerUrl,null);
assert.equal((await call('buyer','/api/me/banner','POST',{imageData:'invalid'})).status,400);
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1cAAAAASUVORK5CYII=';
assert.equal((await call('buyer','/api/me/banner','POST',{imageData:png,userId:'outsider'})).status,200);assert.equal((await call('seller','/api/users/buyer/banner')).data.bannerUrl,png);assert.equal((await call('seller','/api/users/outsider/banner')).data.bannerUrl,null);

getDB().follows.push({followerId:'buyer',followingId:'seller'});const connections=await call('seller','/api/users/seller/connections?kind=followers');assert.equal(connections.status,200);assert.equal(connections.data.users[0].id,'buyer');assert(!JSON.stringify(connections.data).includes('buyer@example.test'));
assert.equal((await call('seller','/api/users/seller/connections?kind=bad')).status,400);
getDB().users.find(u=>u.id==='buyer').lastActiveAt=new Date().toISOString();getDB().users.find(u=>u.id==='buyer').settings.showActivityStatus=false;
const profile=await call('seller','/api/users/buyer/listings');assert.equal(profile.data.owner.activityStatus,null);
// Confirmed wallet checkout removes a cart entry only after fulfilment.
getDB().ledger.push({id:'funds',userId:'buyer',amount:10000,type:'deposit'});
await call('buyer','/api/shop/cart','POST',{itemId:'cart-item'});
assert.equal((await call('buyer','/api/shop/buy','POST',{itemId:'cart-item',expectedTotalCents:1})).status,409);
assert.equal((await call('buyer','/api/shop/cart')).data.items.length,1);
const purchase=await call('buyer','/api/shop/buy','POST',{itemId:'cart-item',expectedTotalCents:1500});assert.equal(purchase.status,200);
assert.equal((await call('buyer','/api/shop/cart')).data.items.length,0);assert.equal(getDB().shopItems.find(x=>x.id==='cart-item').stock,1);
console.log('PASS v29.76 real routes: account cart isolation/current pricing, no self-add, owner/admin permissions, banner reset/input validation, followers sanitization and presence privacy');
}finally{server.close();}})().catch(e=>{console.error(e);process.exitCode=1});
