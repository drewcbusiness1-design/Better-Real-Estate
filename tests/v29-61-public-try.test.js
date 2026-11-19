const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('public/app.js','utf8');
class Element {
 constructor(tag,attrs={},children=[]){this.tag=tag;this.attrs=attrs;this.children=[];this.events={};this.disabled=false;this.checked=false;for(const [k,v]of Object.entries(attrs))if(k.startsWith('on'))this.events[k.slice(2)]=v;this.append(...(Array.isArray(children)?children:[children]));}
 append(...xs){this.children.push(...xs.filter(x=>x!==null&&x!==undefined));}appendChild(x){this.append(x);return x;}addEventListener(k,fn){this.events[k]=fn;}
 get text(){return this.children.map(x=>x instanceof Element?x.text:String(x)).join(' ');}
}
let storage=new Map(),blocked=false;
const sandbox={state:{view:'try',tryStep:0,user:null},URLSearchParams,location:{pathname:'/'},sessionStorage:{getItem:k=>{if(blocked)throw Error('blocked');return storage.get(k);},setItem:(k,v)=>{if(blocked)throw Error('blocked');storage.set(k,v);}},el:(...args)=>new Element(...args),iconSvg:()=>new Element('span'),money:n=>'$'+n.toLocaleString(),go:(v,extra)=>Object.assign(sandbox.state,{view:v},extra),writeRoute:()=>{},render:()=>{},requestAnimationFrame:fn=>fn(),document:{querySelector:()=>null},window:{scrollTo:()=>{}},api:()=>{throw Error('Demo must not call API');}};
vm.createContext(sandbox);
vm.runInContext(source.slice(source.indexOf('const ROUTED_VIEWS'),source.indexOf('function writeRoute')),sandbox);
vm.runInContext(source.slice(source.indexOf('const TRY_PROPERTIES'),source.indexOf('function renderHome()')),sandbox);
const tree=()=>sandbox.renderTryItOut();
function all(e,p){return !(e instanceof Element)?[]:[...(p(e)?[e]:[]),...e.children.flatMap(x=>all(x,p))];}
const click=(root,text)=>{const found=all(root,e=>e.tag==='button'&&e.text===text);assert(found.length>=1,text);assert(!found[0].disabled,text+' disabled');found[0].events.click();};
for(const market of ['Memphis, TN','Cleveland, OH','Birmingham, AL']){
 sandbox.state={view:'try',tryStep:0,user:null};let root=tree();assert.equal(all(root,e=>e.attrs.class==='try-property-card').length,3);click(root,'Explore '+market);assert.equal(sandbox.state.tryStep,1);assert(tree().text.includes(market));click(tree(),'Find a sample buyer');click(tree(),'Open sample conversation');assert.equal(sandbox.state.tryStep,3);click(tree(),'Send sample message');assert(tree().text.includes('simulated reply'));click(tree(),'Open sample Deal room');root=tree();const finish=all(root,e=>e.tag==='button'&&e.text==='Finish sample deal')[0];assert(finish.disabled);const checks=all(root,e=>e.tag==='input');assert.equal(checks.length,3);for(let i=0;i<3;i++){checks[i].checked=true;checks[i].events.change();assert.equal(finish.disabled,i<2);}checks[1].checked=false;checks[1].events.change();assert(finish.disabled);checks[1].checked=true;checks[1].events.change();click(root,'Finish sample deal');assert.equal(sandbox.state.tryStep,5);assert(tree().text.includes('not a real closing'));click(tree(),'Sign up free');assert.equal(sandbox.state.view,'auth');assert.equal(sandbox.state.authMode,'signup');assert.equal(sandbox.state.postAuthTarget,null);
 console.log('PASS full sample workflow and optional signup',market);
}
sandbox.state={view:'try',tryStep:0,user:null};sandbox.applyRouteParams(new URLSearchParams('view=try&step=4'));assert.equal(sandbox.state.tryStep,4);assert(sandbox.routeUrl().includes('view=try&step=4'));sandbox.state.tryMemory=undefined;assert.equal(sandbox.tryRead().checks.filter(Boolean).length,3);assert(tree().text.includes('3 of 3 sample milestones'));sandbox.applyRouteParams(new URLSearchParams('view=try&step=999'));assert.equal(sandbox.state.tryStep,5);sandbox.applyRouteParams(new URLSearchParams('view=try&step=-5'));assert.equal(sandbox.state.tryStep,0);
storage.set('bre-public-try-v1','bad json');sandbox.state.tryMemory=undefined;assert.doesNotThrow(tree);blocked=true;click(tree(),'Explore Birmingham, AL');click(tree(),'Find a sample buyer');click(tree(),'Open sample conversation');click(tree(),'Send sample message');assert(tree().text.includes('Two-unit opportunity'));assert(tree().text.includes('simulated reply'));
assert(source.includes("new Set(['try','home','auth'"));assert(!source.slice(source.indexOf('const TRY_PROPERTIES'),source.indexOf('function renderHome()')).includes('api('));assert(!source.includes('better-preview.mp4'));
console.log('PASS refresh/deep links, invalid steps, corrupt/blocked storage, isolated demo and video removal');
