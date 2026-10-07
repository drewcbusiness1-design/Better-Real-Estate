const fs=require('fs'),vm=require('vm'),assert=require('assert');
(async()=>{const app=fs.readFileSync('public/app.js','utf8'),server=fs.readFileSync('server.js','utf8'),c={};vm.createContext(c);vm.runInContext(app.slice(app.indexOf('function reorderPropertyPhotos'),app.indexOf('async function api(')),c);
const original=['a','b','c'];assert.deepEqual(Array.from(c.reorderPropertyPhotos(original,2,0)),['c','a','b']);assert.deepEqual(original,['a','b','c']);assert.deepEqual(Array.from(c.reorderPropertyPhotos(original,0,2)),['b','c','a']);for(const [a,b] of [[-1,0],[0,3],[1.5,0]])assert.deepEqual(Array.from(c.reorderPropertyPhotos(original,a,b)),original);
let handler,saved;const ctx={app:{patch:(path,auth,fn)=>handler=fn},requireAuth:()=>{},isAdminUser:()=>false,writeImage:async x=>x==='data:first'?'new-first':'new-second',saveDB:async db=>saved=db,listingFreshness:()=>({})};vm.createContext(ctx);vm.runInContext(server.slice(server.indexOf("app.patch('/api/listings/:id',"),server.indexOf("app.delete('/api/listings/:id',")),ctx);
const listing={id:'same-id',ownerId:'owner',photos:['old-a','old-b']};const db={listings:[listing]};let result;const res={json:x=>result=x,status(x){this.code=x;return this;}};
await handler({db,user:{id:'owner'},params:{id:'same-id'},body:{address:'123 Main',city:'Town',asking:100000,photos:['old-b','data:first','old-a','data:second']}},res);
assert.strictEqual(saved,db);assert.equal(db.listings.length,1);assert.equal(listing.id,'same-id');assert.deepEqual(Array.from(result.listing.photos),['old-b','new-first','old-a','new-second']);
await handler({db,user:{id:'other'},params:{id:'same-id'},body:{}},res);assert.equal(res.code,403);
console.log('v29.36 photo reorder, persisted gallery order, identity and authorization: PASS');})();
