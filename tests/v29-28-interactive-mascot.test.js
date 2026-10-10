const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert(['2.9.29','2.9.30','2.9.31','2.9.32','2.9.33','2.9.34','2.9.35','2.9.36','2.9.37','2.9.38','2.9.39','2.9.40','2.9.41','2.9.45','2.9.46','2.9.47','2.9.48','2.9.49'].includes(pkg.version), 'package version must be at least the v29.28 mascot baseline');
assert(app.includes('createBetterMascotRig'), 'interactive mascot system is not wired');
assert(!app.includes("class:'better-guide-trigger-label'"), 'header must not render a Guide text pill');
assert(app.includes("release:53,title:'Meet the mascot, not another button'"), 'v53 mascot What’s New step missing');
assert(app.includes('function reactBetterMascot'), 'mascot interaction helper missing');
assert(app.includes("reactBetterMascot('celebrate')"), 'course completion mascot reaction missing');
assert(css.includes('@keyframes bre-rig-breathe')||css.includes('@keyframes bre-mascot-idle')||app.includes('function mascotLifeFrame'), 'mascot idle motion missing');
assert(css.includes('@keyframes bre-rig-ack')||css.includes('@keyframes bre-mascot-hello')||app.includes('function mascotPerform'), 'mascot open acknowledgement missing');
assert(css.includes('@keyframes bre-rig-celebrate-head')||css.includes('@keyframes bre-mascot-celebrate')||app.includes('celebrate:{'), 'mascot celebration motion missing');
assert(css.includes('.better-guide-trigger{')&&css.includes('border:0'), 'header mascot must remain a borderless standalone control');
assert(css.includes('.better-guide-trigger:hover,.better-guide-trigger:focus-visible,.better-guide-trigger.is-open'), 'hover/focus/open interaction missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'reduced motion support missing');
assert(app.includes('<svg class=\"mascot-svg\"')||fs.existsSync(path.join(root,'public/better-guide-mascot-cutout.webp')), 'mascot visual asset missing');

console.log('v29.28 interactive mascot regression: PASS');
