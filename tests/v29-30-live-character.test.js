const fs=require('fs');
const path=require('path');
const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};
const root=path.join(__dirname,'..');
const app=fs.readFileSync(path.join(root,'public','app.js'),'utf8');
const css=fs.readFileSync(path.join(root,'public','style.css'),'utf8');

assert(app.includes('function createLivingBetterMascot'),'live mascot factory missing');
assert(app.includes('const BETTER_MASCOT_POSES'),'pose map missing');
assert(app.includes('setLivingMascotPose('),'pose setter missing');
assert(app.includes('function syncLivingBetterMascotHints'),'contextual mascot hint sync missing');
assert(app.includes("createLivingBetterMascot({variant:'header'"),'header must use live mascot component');
assert(app.includes("title:'A live character that changes with you'"),'new what\'s new step missing');
assert(css.includes('.living-better-mascot'),'live mascot styles missing');
assert(css.includes('.living-mascot-bubble'),'mascot speech bubble styles missing');
assert(css.includes('@keyframes bre-live-wave'),'wave animation missing');
assert(css.includes("clip-path:inset(0 0 18% 0)")||css.includes("clip-path:inset(0 0 20% 0)"),'header crop polish missing');
for(const name of ['idle','wave','point','welcome','celebrate','excited']){
  const p=path.join(root,'public','mascot-poses',`${name}.webp`);
  assert(fs.existsSync(p),`missing pose asset: ${name}`);
  assert(fs.statSync(p).size < 140*1024,`pose asset too heavy: ${name}`);
}
console.log('v29.30 live mascot character regression: PASS');
