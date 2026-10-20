const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync(require('path').join(__dirname,'../public/app.js'),'utf8');
const helper=source.match(/function defaultMemberDashboard\(\)\{[^\n]+/)[0];
const handler=source.slice(source.indexOf('  submit.onclick = async () => {'),source.indexOf('  wrap.appendChild(submit);',source.indexOf('  submit.onclick = async () => {')));
(async()=>{
for(const isSignup of [true,false])for(const kind of ['member','affiliate','service'])for(const special of ['default','invite','target']){
 const user={roles:[kind],settings:{defaultDashboard:kind==='service'?'services':'feed'}};
 const state={companyInviteToken:special==='invite'?'invite':null,postAuthTarget:special==='target'?{view:'detail',detailId:'example'}:null};let navigation;const err={textContent:''};
 const ctx={submit:{},err,isSignup,roles:[kind],state,name:{value:'Test'},email:{value:'test@example.invalid'},pass:{value:'password'},signupServices:{value:'landscaping'},ref:{value:''},signupPhone:{value:''},withButtonBusy:async(_,fn)=>fn(),api:async()=>({user}),refreshMe:async()=>{},applyTheme:()=>{},toast:()=>{},localStorage:{removeItem(){}},hasRole:(u,r)=>u.roles.includes(r),go:(view,extra)=>navigation={view,extra}};
 vm.createContext(ctx);vm.runInContext(helper+'\n'+handler,ctx);await ctx.submit.onclick();assert.equal(err.textContent,'');const expected=special==='invite'?'companyjoin':special==='target'?'detail':kind==='affiliate'?'affiliate':kind==='service'?'services':'feed';assert.equal(navigation.view,expected,`${isSignup}/${kind}/${special}`);
}
console.log('PASS actual signup/login handler: member, affiliate, provider dashboards, invite and intended-route precedence');
})();
