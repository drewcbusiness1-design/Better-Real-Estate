const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('public/app.js','utf8');
class Element{
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=[];this.events={};this.style={};this.dataset={};this.className=attrs.class||'';this.value=attrs.value||'';this.disabled=false;this.checked=false;this._text='';for(const [k,v]of Object.entries(attrs))if(k.startsWith('on'))this.events[k.slice(2)]=v;this.classList={add:(x)=>this.className+=' '+x,remove:()=>{},toggle:()=>{}};this.append(...(Array.isArray(children)?children:[children]));}
 append(...xs){this.children.push(...xs.filter(x=>x!==null&&x!==undefined));}appendChild(x){this.append(x);return x;}insertBefore(x){this.children.unshift(x);}get firstChild(){return this.children[0];}get childNodes(){return this.children;}replaceChildren(...xs){this.children=[];this.append(...xs);}setAttribute(key,value){this.attrs[key]=value;}addEventListener(k,fn){this.events[k]=fn;}dispatchEvent(e){this.events[e.type]?.(e);}focus(){}remove(){this.removed=true;}querySelector(){return null;}querySelectorAll(){return [];}get text(){return this._text+this.children.map(x=>x instanceof Element?x.text:String(x)).join(' ');}set textContent(x){this._text=x;this.children=[];}get textContent(){return this.text;}set innerHTML(x){this.children=[];this._text=x;}get innerHTML(){return this._text;}
}
let liveCalls=0, modal, notices=[];
const intro=new Element('div',{},[new Element('a',{href:'/?view=auth&mode=signup'},'Join Better')]);
intro.cloneNode=()=>{const anchor=new Element('a',{},'Join Better');const copy=new Element('div',{},[anchor]);copy.querySelector=()=>anchor;return copy;};
const workflow=new Element('section',{},'How Better works');
workflow.cloneNode=()=>new Element('section',{},'How Better works');
const state={view:'home',user:null};
const sandbox={homeIntro:intro,homeWorkflow:workflow,state,URLSearchParams,location:{pathname:'/'},el:(...args)=>new Element(...args),iconSvg:()=>new Element('span'),twoUp:(...xs)=>new Element('div',{},xs),money:n=>'$'+Number(n).toLocaleString(),cents:n=>'$'+n/100,initials:s=>s.slice(0,2),avatarNode:()=>new Element('span'),formatChatTime:()=> 'Test time',roleLabel:u=>u.role,hasRole:(u,r)=>u.roles?.includes(r),membershipBadge:()=>null,toast:t=>notices.push(t),withButtonBusy:async(b,fn)=>fn(),buzz:()=>{},openFormModal:(...args)=>{modal=args;},go:(v,x)=>Object.assign(sandbox.state,{view:v},x),writeRoute:()=>{},render:()=>{},requestAnimationFrame:fn=>fn(),document:{querySelector:()=>null},window:{scrollTo:()=>{}},history:{length:1},setTimeout:()=>0,openListingDetail:()=>{},openPropertyShare:()=>{},refreshUnread:()=>{},renderTop:()=>{},renderTabs:()=>{}};
vm.createContext(sandbox);
function extract(name){const m=source.match(new RegExp('^(?:async )?function '+name+'\\(','m'));assert(m,name);const tail=source.slice(m.index+m[0].length),next=tail.search(/^(?:async )?function /m);return source.slice(m.index,next<0?source.length:m.index+m[0].length+next);}
vm.runInContext(source.slice(source.indexOf('const ROUTED_VIEWS'),source.indexOf('function writeRoute')),sandbox);
vm.runInContext(source.slice(source.indexOf('/* Shared screen context:'),source.indexOf('function renderHome()')),sandbox);
for(const name of ['renderHome','renderPublicPropertyCard','canEditProperty','renderFeed','propertyCard','renderDetail','dealCalculator','renderProfile','renderChat','renderPipeline','renderDealRoom'])vm.runInContext(extract(name),sandbox);
const all=(e,p)=>!(e instanceof Element)?[]:[...(p(e)?[e]:[]),...e.children.flatMap(x=>all(x,p))];
const tick=()=>new Promise(resolve=>setImmediate(resolve));
(async()=>{
  sandbox.applyRouteParams(new URLSearchParams('view=try&screen=detail'));
  assert.equal(sandbox.state.view,'home','old public demo links fall back to the homepage');
  assert(!source.includes('renderTryItOut'));
  sandbox.api=async(method,path)=>{
    assert.equal(method,'GET');
    assert.equal(path,'/api/public/deal-preview/buyer');
    return {property:{id:'live-property',market:'Trenton, NJ',propertyType:'Single family',asking:100000,confirmedDaysAgo:1}};
  };
  const home=sandbox.renderHome();
  await tick();
  const cards=all(home,e=>e.className.includes('public-property-card'));
  assert.equal(cards.length,1);
  assert(cards[0].text.includes('Trenton, NJ'));
  assert(cards[0].text.includes('Seller confirmed 1 day ago'));
  assert(home.text.includes('How Better works'));
  assert.equal(all(home,e=>e.tag==='button').length,0);
  const signup=all(home,e=>e.tag==='a'&&e.text==='Join Better')[0];
  signup.events.click({button:0,preventDefault(){}});
  assert.equal(sandbox.state.authMode,'signup');
  const detail=all(cards[0],e=>e.tag==='a')[0];
  assert(detail.attrs.href.includes('property=live-property'));
  detail.events.click({button:0,preventDefault(){}});
  assert.equal(sandbox.state.authDealIntent,'buyer');
  assert.equal(sandbox.state.authPreviewId,'live-property');
  sandbox.api=async()=>({property:null});
  const empty=sandbox.renderHome();
  await tick();
  assert(empty.text.includes('No current listings to preview.'));
  assert.equal(all(empty,e=>e.className.includes('public-property-card')).length,0);
  sandbox.api=async()=>{throw Error('offline');};
  const unavailable=sandbox.renderHome();
  await tick();
  assert(unavailable.text.includes('The latest listing is temporarily unavailable.'));
  assert(!unavailable.text.includes('Try the'));
  console.log('PASS homepage latest listing, CTA, selected-property signup, empty and unavailable states, and retired demo route');
sandbox.verifyBanner=()=>null;sandbox.trialBar=()=>null;sandbox.state={view:'feed',user:{id:'real-member'},feedMode:'for-you',access:{pro:true}};sandbox.api=async(method,path)=>{liveCalls++;assert.equal(path,'/api/feed?mode=for-you');return {feed:[{id:'live-property',address:'Live property',city:'Real market',ownerId:'real-owner',ownerName:'Real owner',propertyType:'Single family',asking:100000,photos:[]}],access:{pro:true}};};const live=await sandbox.renderFeed();assert(live.text.includes('Live property'));assert(!live.text.includes('SAMPLE'));assert.equal(liveCalls,1);assert.equal(sandbox.state.user.id,'real-member');console.log('PASS production renderer default retains live API context');
sandbox.state={view:'dealroom',detailId:'real-property',user:{id:'real-member'}};sandbox.renderVault=async()=>new Element('div');sandbox.api=async(method,path)=>{if(path.endsWith('/deal-room'))return {room:{stage:'intake',tasks:[]},listing:{address:'Live property',city:'Real market'},canManage:true,messages:[],offers:[]};if(path.endsWith('/comp-board'))return {board:{comps:[]}};if(path.endsWith('/activity'))return {activity:[]};throw Error(path);};const room=await sandbox.renderDealRoom();assert(room.text.includes('Transaction tools'));assert(room.text.includes('Collaborative comp board'));assert(all(room,e=>e.className==='ops-card deal-tools').length===1);console.log('PASS production Deal room retains full transaction tools');
const css=fs.readFileSync('public/style.css','utf8');assert(css.includes('height:62px'));assert(css.includes('height:48px'));assert(css.includes('#topbar .bar{padding:12px 14px;gap:8px}'));assert(!source.includes('better-preview.mp4'));
console.log('PASS existing logo dimensions and no public demo video');
})().catch(e=>{console.error(e);process.exit(1)});
