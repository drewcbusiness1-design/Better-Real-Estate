'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('public/app.js','utf8');
class E{
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=[];this.dataset={};this.style={};this.scrollTop=0;this.clientHeight=600;for(const[k,v]of Object.entries(attrs)){if(k.startsWith('data-'))this.dataset[k.slice(5).replace(/-([a-z])/g,(_,c)=>c.toUpperCase())]=v;if(k.startsWith('on'))this[k]=v;}this.append(...(Array.isArray(children)?children:[children]));}
 append(...xs){for(const x of xs.filter(x=>x!=null)){if(x instanceof E)x.parent=this;this.children.push(x);}}
 appendChild(x){this.append(x);return x;}replaceChildren(...xs){this.children=[];this.append(...xs);}remove(){this.removed=true;if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}
 get isConnected(){return !this.removed&&(!this.parent||this.parent.isConnected);}get offsetTop(){return this.parent?this.parent.children.indexOf(this)*600:0;}
 getBoundingClientRect(){const top=this.attrs.class==='daily-feed-slot'?this.offsetTop-(this.parent?.scrollTop||0):0;return {top,bottom:top+600};}
 setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}addEventListener(k,v){this['on'+k]=v;}removeEventListener(k,v){if(this['on'+k]===v)delete this['on'+k];}scrollTo(o){this.scrollTop=o.top;this.onscroll?.();}
 get textContent(){return this.children.map(x=>x instanceof E?x.textContent:String(x)).join(' ');}
}
function all(e,p){return e instanceof E?[...(p(e)?[e]:[]),...e.children.flatMap(c=>all(c,p))]:[];}
(async()=>{
 let raf=[],calls=[],routeWrites=0,fail=false,block=false;
 const ctx={Date,Math,Promise,Intl,el:(...a)=>new E(...a),state:{view:'feed',feedFocusId:null},go(){},writeRoute(){routeWrites++;},matchMedia:()=>({matches:true}),requestAnimationFrame:f=>raf.push(f),propertyCard:l=>new E('div',{class:'pcard'},l.id)};
 vm.createContext(ctx);vm.runInContext(source.slice(source.indexOf('function browsingResetText('),source.indexOf('async function handlePurchaseResponse(')),ctx);
 const usage=used=>({unlimited:false,used,remaining:30-used,resetsAt:'2026-11-16T05:00:00Z'});
 const context={state:ctx.state,api:async(_,p,b)=>{calls.push(b.listingId);if(fail)throw Error('Fixture connection failure');if(block){const e=Error('Daily cap');e.code='DAILY_BROWSING_LIMIT';e.browsing=usage(30);throw e;}return {listing:{id:b.listingId},browsing:usage(calls.length)};}};
 const flush=async()=>{for(let i=0;i<8;i++){const todo=raf;raf=[];todo.forEach(f=>f());await new Promise(r=>setImmediate(r));}};
 const wrap=new E('main');ctx.renderDailyFeed(wrap,{listingIds:['a','b','c'],browsing:usage(0)},context);
 assert.equal(calls.length,0,'No invisible quota use before mount');await flush();assert.deepEqual(calls,['a']);
 const stream=all(wrap,e=>e.attrs.class==='daily-feed-stream')[0],buttons=all(wrap,e=>e.tag==='button');buttons.find(b=>b.attrs['aria-label']==='Next property').attrs.onclick();await flush();assert.deepEqual(calls,['a','b']);assert.equal(ctx.state.feedFocusId,'b');
 buttons.find(b=>b.attrs['aria-label']==='Previous property').attrs.onclick();await flush();assert.equal(calls.length,2);assert.equal(ctx.state.feedFocusId,'a');assert(routeWrites>=3);
 fail=true;stream.scrollTo({top:1200});await flush();assert.equal(calls.length,3);await flush();assert.equal(calls.length,3,'No automatic retry loop');const retry=all(wrap,e=>e.tag==='button'&&e.textContent==='Try again')[0];assert(retry);fail=false;retry.attrs.onclick();await flush();assert.equal(calls.length,4);
 ctx.stopDailyFeed();
 const full=new E('main');ctx.renderDailyFeed(full,{listingIds:[],browsing:usage(30)},context);assert(full.textContent.includes('You have reached today’s 30 views'));assert(full.textContent.includes('two AI property analyses'));await flush();assert.equal(calls.length,4);
 const blocked=new E('main');ctx.state.feedFocusId=null;block=true;ctx.renderDailyFeed(blocked,{listingIds:['d','e'],browsing:usage(29)},context);await flush();assert(blocked.textContent.includes('You have reached today’s 30 views'));assert.equal(all(blocked,e=>e.attrs.class==='daily-feed-slot').length,1);
 ctx.stopDailyFeed();
 assert(source.includes('2 AI Deal Builder analyses per day'));assert(!source.includes('5 free listing unlocks'));assert(!source.includes('Use free credit'));assert(source.includes("p.set('feedItem',state.feedFocusId)"));
 console.log('PASS actual frontend functions in DOM harness: visible-card-only admission, next/previous, route restoration, no retry loop, recoverable failure, cap gate, blocked-card truncation, two-AI membership copy. This is not rendered-browser or responsive visual verification.');
})().catch(e=>{console.error(e);process.exitCode=1;});
