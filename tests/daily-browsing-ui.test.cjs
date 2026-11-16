'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/app.js','utf8');
let virtualScroll=0,testWindow=null;
class E{
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=[];this.dataset={};this.style={};this.scrollTop=0;this.clientHeight=600;for(const[k,v]of Object.entries(attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;if(k.startsWith('on'))this[k]=v;}this.append(...(Array.isArray(children)?children:[children]));}
 append(...xs){for(const x of xs.filter(x=>x!=null)){if(x instanceof E)x.parent=this;this.children.push(x);}}
 appendChild(x){this.append(x);return x;}replaceChildren(...xs){this.children=[];this.append(...xs);}remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get isConnected(){return !this.removed&&(!this.parent||this.parent.isConnected);}get offsetTop(){return this.parent?this.parent.children.indexOf(this)*600:0;}
 getBoundingClientRect(){const top=this.attrs.class==='daily-feed-slot'?this.offsetTop-virtualScroll:0;return {top,bottom:top+600};}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,v){this['on'+k]=v;}removeEventListener(k,v){if(this['on'+k]===v)delete this['on'+k];}scrollTo(o){this.scrollTop=o.top;this.onscroll?.();}
 scrollIntoView(){virtualScroll=this.offsetTop;testWindow?.onscroll?.();}
 get textContent(){return this.children.map(x=>x instanceof E?x.textContent:String(x)).join(' ');}
}
function all(e,p){return e instanceof E?[...(p(e)?[e]:[]),...e.children.flatMap(c=>all(c,p))]:[];}
(async()=>{
 let raf=[],calls=[],routeWrites=0;
 testWindow={innerHeight:670,addEventListener(k,v){this['on'+k]=v;},removeEventListener(k,v){if(this['on'+k]===v)delete this['on'+k];}};
 const ctx={window:testWindow,document:{documentElement:{classList:{add(){},remove(){}}}},Date,Math,Promise,Intl,el:(...a)=>new E(...a),state:{view:'feed',feedFocusId:null},go(){},writeRoute(){routeWrites++;},requestAnimationFrame:f=>raf.push(f),propertyCard:(l,c)=>new E('div',{class:'pcard'},[l.id,new E('button',{onclick:()=>c.openListingDetail(l.id)},'View details')])};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function browsingResetText('),source.indexOf('async function handlePurchaseResponse(')),ctx);
 const usage=used=>({unlimited:false,used,remaining:30-used,resetsAt:'2026-11-16T05:00:00Z'});
 const context={state:ctx.state,api:async()=>{throw Error('Scrolling must not call an admission API');},openListingDetail:id=>calls.push(id)};
 const flush=async()=>{for(let i=0;i<4;i++){const todo=raf;raf=[];todo.forEach(f=>f());await new Promise(r=>setImmediate(r));}};
 const packet=used=>({listingIds:['a','b','c'],feed:['a','b','c'].map(id=>({id,preview:true})),browsing:usage(used)});
 const wrap=new E('main');ctx.renderDailyFeed(wrap,packet(0),context);await flush();assert.equal(calls.length,0);assert.equal(ctx.state.browsing.remaining,30);
 const slots=all(wrap,e=>e.attrs.class==='daily-feed-slot');assert.equal(slots.length,3);slots[1].scrollIntoView();await flush();assert.equal(ctx.state.feedFocusId,'b');assert.equal(calls.length,0);assert.equal(ctx.state.browsing.remaining,30);assert(routeWrites>=2);
 const buttons=all(wrap,e=>e.tag==='button');assert.equal(buttons.length,3);assert(buttons.every(b=>b.textContent==='View details'),'No previous or next navigation controls');buttons[1].attrs.onclick();assert.deepEqual(calls,['b']);ctx.stopDailyFeed();
 virtualScroll=0;const full=new E('main');ctx.state.feedFocusId=null;ctx.renderDailyFeed(full,packet(30),context);await flush();assert.equal(all(full,e=>e.attrs.class==='daily-feed-slot').length,3,'Previews remain scrollable at the detail cap');assert(!full.textContent.includes('You have opened today'));assert.equal(ctx.state.browsing.remaining,0);ctx.stopDailyFeed();
 assert(source.includes('2 AI Deal Builder analyses per day'));assert(!source.includes('5 free listing unlocks'));assert(!source.includes('Use free credit'));assert(source.includes("p.set('feedItem',state.feedFocusId)"));
 const pcStart=source.indexOf('function propertyCard('),pcEnd=source.indexOf('/* ================= BETTER DISPO HELPERS',pcStart);vm.runInContext(source.slice(pcStart,pcEnd),ctx);let opened=null;const preview=ctx.propertyCard({id:'unseen',browsingRequired:true},{openListingDetail:id=>opened=id});assert(preview.textContent.includes('Open property'));all(preview,e=>e.tag==='button')[0].attrs.onclick();assert.equal(opened,'unseen');
 const profileStart=source.indexOf('async function renderProfile('),profileEnd=source.indexOf('/* ================= BUY BOX / SETTINGS',profileStart);
 Object.assign(ctx,{liveUIContext:()=>({openListingDetail:id=>opened=id}),membershipBadge:()=>null,roleLabel:()=> 'Seller',avatarNode:()=>new E('div'),shareStrip:()=>new E('div'),money:n=>{assert(Number.isFinite(n),'Restricted profiles must not format missing property data');return '$'+n;}});
 vm.runInContext(source.slice(profileStart,profileEnd),ctx);
 const profile=await ctx.renderProfile({state:{profileId:'seller'},go(){},render(){},api:async()=>({owner:{id:'seller',name:'Seller'},listings:[{id:'not-admitted',browsingRequired:true}],followerCount:0,reviews:[]})});
 assert(profile.textContent.includes('Open property'));assert(!profile.textContent.includes('NaN'));const open=all(profile,e=>e.tag==='button'&&e.textContent==='View property')[0];assert(open);open.attrs.onclick();assert.equal(opened,'not-admitted');
 console.log('PASS actual frontend DOM tests: free preview scrolling, zero quota requests on scroll, no navigation buttons, previews at the detail cap, route restoration, details navigation and safe profile placeholders. Not rendered-browser verification.');
})().catch(e=>{console.error(e);process.exitCode=1;});
