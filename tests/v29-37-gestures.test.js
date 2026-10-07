const fs=require('fs'),vm=require('vm'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'),tasks=[],poses=[];
const context={performance:{now:()=>0},setTimeout:(fn,t)=>{tasks.push({fn,t});return tasks.length;},clearTimeout:()=>{},mascotNeutral:()=>({}),mascotExpression:()=>{},mascotSetTarget:(r,p)=>poses.push(p),mascotReturnHome:r=>r.home=true};vm.createContext(context);
vm.runInContext(app.slice(app.indexOf('function mascotPerform('),app.indexOf('function playBetterMascotBehavior(')),context);
const rig=()=>({isConnected:true,classList:{contains:()=>false},dataset:{},_mascot:{actionToken:0}});
for(const name of ['wave','thumbsup','celebrate']){tasks.length=0;poses.length=0;const r=rig();context.mascotPerform(r,name);assert.equal(r.dataset.gesture,name);for(const task of tasks)task.fn();assert(poses[0].armLR>=78);assert(r.home);if(name==='wave')assert(new Set(poses.map(p=>p.armLR)).size>1);if(name==='celebrate'){assert(poses.every(p=>p.armRR<0));assert(poses.some(p=>p.rootY===-3));}}
tasks.length=0;poses.length=0;const r=rig();context.mascotPerform(r,'wave');r._mascot.actionToken++;tasks.forEach(t=>t.fn());assert.equal(poses.length,0);assert(!r.home);
const still=rig();still.classList.contains=()=>true;tasks.length=0;context.mascotPerform(still,'wave');assert.equal(tasks.length,0);
console.log('v29.37 multi-step gestures, cancellation and reduced motion: PASS');
