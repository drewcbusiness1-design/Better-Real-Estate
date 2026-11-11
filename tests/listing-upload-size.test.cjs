'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const src=fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');
const helpers=src.slice(src.indexOf('const LISTING_UPLOAD_MAX_BYTES='),src.indexOf('function downscale('));
(async()=>{
 const calls=[];const ctx={Blob,JSON,fetch:async data=>({blob:async()=>new Blob([data])}),downscale:async(b,max,limit)=>{calls.push({max,limit});return 'data:image/jpeg;base64,'+'a'.repeat(Math.min(limit-22,100000));}};vm.createContext(ctx);vm.runInContext(helpers,ctx);
 const small={notes:'A test',photos:['/api/img/existing.jpg','data:image/jpeg;base64,YQ==']};assert.equal(await ctx.prepareListingPayload(small),small);
 const large={notes:'屋'.repeat(1000),photos:Array(12).fill('data:image/jpeg;base64,'+'a'.repeat(600000))};const original=JSON.stringify(large);const fixed=await ctx.prepareListingPayload(large);assert.equal(fixed.photos.length,12);assert(new Blob([JSON.stringify(fixed)]).size<3500000);assert.equal(JSON.stringify(large),original);assert.equal(calls.length,12);
 await assert.rejects(ctx.prepareListingPayload({notes:'屋'.repeat(1500000),photos:[]}),/too large/);
 console.log('PASS aggregate budget: small payload unchanged, 12 oversized photos fit, UTF-8 accounting, original retained, oversize text rejected.');
 const api=src.slice(src.indexOf('async function api('),src.indexOf('/* ================= toasts'));
 const auth={user:{id:'qa'}};const apiCtx={state:auth,document:{activeElement:null},fetch:async()=>({ok:false,status:413,json:async()=>{throw Error('text/plain')}})};vm.createContext(apiCtx);vm.runInContext(api,apiCtx);await assert.rejects(apiCtx.api('POST','/api/listings',{}),e=>e.status===413&&/form is still here/.test(e.message));assert.equal(auth.user.id,'qa');
 console.log('PASS text/plain 413 is actionable without clearing the account.');
 const start=src.indexOf('  submit.onclick = async () => {',src.indexOf('async function renderCompose()'));
 const handler=src.slice(start,src.indexOf('  wrap.appendChild(err);',start));
 for(const scenario of ['busy','photos','failure','success']){
  let sent=0,navigated=0;const state={composePhotos:['original'],composeEditId:null};const submit={disabled:scenario==='busy'};const err={};const f={address:{value:'Local fixture'},city:{value:'Trenton, NJ'},asking:{value:'100000'},propertyType:{value:'Single family'}};
  const c={state,submit,err,f,photoProcessing:scenario==='photos',editingListing:null,openToJV:{checked:false},prepareListingPayload:async p=>p,api:async()=>{sent++;if(scenario==='failure')throw Error('Upload failed');return {listing:{id:'fixture'},matchCount:0}},mascotSiteEvent(){},toast(){},go(){navigated++}};
  vm.createContext(c);vm.runInContext(handler,c);await c.submit.onclick();
  if(['busy','photos'].includes(scenario)){assert.equal(sent,0);assert.deepEqual(state.composePhotos,['original']);}
  if(scenario==='failure'){assert.equal(navigated,0);assert.deepEqual(state.composePhotos,['original']);assert.equal(f.address.value,'Local fixture');assert.equal(submit.disabled,false);assert.equal(err.textContent,'Upload failed');}
  if(scenario==='success'){assert.equal(navigated,1);assert.equal(state.composePhotos.length,0);}
 }
 console.log('PASS actual submit handler: duplicate/wait guards, failed post keeps fields/photos, success alone navigates and clears.');
})().catch(e=>{console.error(e);process.exitCode=1});
