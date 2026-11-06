'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const source=fs.readFileSync('public/app.js','utf8');
class E {
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=[];this.value=attrs.value||'';this.disabled=!!attrs.disabled;Object.assign(this,Object.fromEntries(Object.entries(attrs).filter(([k])=>k.startsWith('on'))));this.append(...(Array.isArray(children)?children:[children]));if(tag==='select')this.value=this.children[0]?.attrs.value;}
 append(...xs){this.children.push(...xs.filter(x=>x!=null));} appendChild(x){this.append(x);return x;} replaceChildren(...xs){this.children=[];this.append(...xs);} get textContent(){return this.children.map(x=>x instanceof E?x.textContent:String(x)).join(' ');} set textContent(v){this.children=[String(v)];}
}
const all=(e,p)=>e instanceof E?[...(p(e)?[e]:[]),...e.children.flatMap(x=>all(x,p))]:[];
let tax={status:'missing',ready:false},available=true,calls=[],renders=0,errors=[];
const d={application:{status:'approved',termsAcceptedAt:'2026-01-01',termsVersion:'test',rateBps:3000,code:'QA'},terms:{version:'test',rateBps:3000},metrics:{available:1000,pending:0,paid:0,clicks:0,sales:0},commissions:[],link:'https://example.test/qa'};
const ctx={el:(...a)=>new E(...a),state:{user:{id:'buyer'},access:{}},Date,Intl,Promise,encodeURIComponent,cents:n=>'$'+n/100,hasRole:()=>false,miniMetric:()=>new E('span'),renderAffiliateTools:async()=>new E('section'),renderAffiliateLeaderboard:()=>new E('section'),withButtonBusy:async(_,f)=>f(),toast:(m,k)=>errors.push({m,k}),render:()=>renders++,confirm:()=>true,FileReader:class{readAsDataURL(){this.result='data:application/pdf;base64,UERG';this.onload();}},api:async(m,p,b)=>{calls.push({m,p,b});if(p==='/api/affiliate/me')return d;if(p==='/api/affiliate/tax'){if(m==='GET')return {tax,submissionAvailable:available};return {tax:{status:'submitted'}};}if(p==='/api/admin/affiliate-tax')return {submissionAvailable:true,records:[{userId:'buyer',...tax}]};return {};}};
vm.createContext(ctx);
function extract(name){const re=new RegExp('^(?:async )?function '+name+'\\(','m'),match=source.match(re);assert(match);const start=match.index,next=source.slice(start+match[0].length).search(/^(?:async )?function /m);return source.slice(start,next<0?source.length:start+match[0].length+next);}
for(const name of ['renderAffiliateTax','renderAdminAffiliateTax','renderAffiliateCenter'])vm.runInContext(extract(name),ctx);
(async()=>{
 let card=await ctx.renderAffiliateTax();assert(!card.ready);assert(card.node.textContent.includes('Required before withdrawal'));assert(card.node.textContent.includes('Do not send tax IDs'));
 const form=all(card.node,e=>e.tag==='form')[0],file=all(form,e=>e.attrs.id==='affiliate-tax-file')[0],signed=all(form,e=>e.attrs.id==='affiliate-tax-signed')[0];
 await form.onsubmit({preventDefault(){}});assert.equal(calls.filter(c=>c.m==='POST').length,0);assert(form.textContent.includes('Choose a PDF'));
 file.files=[{size:100,name:'test.pdf'}];signed.checked=true;await form.onsubmit({preventDefault(){}});assert.equal(calls.at(-1).b.formType,'W-9');assert.equal(calls.at(-1).b.confirmSigned,true);assert.equal(renders,1);
 available=false;card=await ctx.renderAffiliateTax();assert.equal(all(card.node,e=>e.tag==='form').length,0);assert(!card.ready);
 available=true;
 for(const status of ['missing','submitted','rejected','foreign_review','needs_review']){tax={status,ready:false};const page=await ctx.renderAffiliateCenter(),button=all(page,e=>e.tag==='button'&&e.textContent==='Tax review required')[0];assert(button?.disabled,status);}
 tax={status:'approved',ready:true,documentId:'doc'};let page=await ctx.renderAffiliateCenter();assert.equal(all(page,e=>e.tag==='button'&&e.textContent==='Withdraw $10')[0].disabled,false);
 tax={status:'foreign_review',ready:false,documentId:'foreign',formType:'W-8',revision:2};let admin=await ctx.renderAdminAffiliateTax([{userId:'buyer',name:'QA Affiliate',email:'qa@example.test'}]);assert(!admin.textContent.includes('Approve W-9'));assert(admin.textContent.includes('Hold for review'));
 tax={status:'submitted',ready:false,documentId:'doc',formType:'W-9',revision:3};admin=await ctx.renderAdminAffiliateTax([{userId:'buyer',name:'QA Affiliate',email:'qa@example.test'}]);await all(admin,e=>e.tag==='button'&&e.textContent==='Approve W-9')[0].onclick();assert.equal(calls.findLast(c=>c.m==='POST').p,'/api/admin/affiliate-tax/buyer/review');assert.equal(calls.findLast(c=>c.m==='POST').b.revision,3);
 const original=ctx.api;ctx.api=async()=>{throw new Error('Unavailable');};card=await ctx.renderAffiliateTax();assert(!card.ready);assert(card.node.textContent.includes('could not be checked'));ctx.api=original;
 console.log('PASS executed affiliate/admin UI: labels, PDF/signed-form validation, exact payload, missing/unavailable/rejected/foreign/review withdrawal states, approved enablement, admin review identity/revision and safe error state. Browser visual QA remains blocked.');
})().catch(e=>{console.error(e);process.exitCode=1;});
