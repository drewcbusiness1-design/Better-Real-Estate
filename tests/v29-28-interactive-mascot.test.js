const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.equal(pkg.version, '2.9.29', 'package version must be v29.28');
assert(app.includes('createBetterMascotRig'), 'interactive mascot system is not wired');
assert(!app.includes("class:'better-guide-trigger-label'"), 'header must not render a Guide text pill');
assert(app.includes("release:53,title:'Meet the mascot, not another button'"), 'v53 mascot What’s New step missing');
assert(app.includes('function reactBetterMascot'), 'mascot interaction helper missing');
assert(app.includes("reactBetterMascot('celebrate')"), 'course completion mascot reaction missing');
assert(css.includes('@keyframes bre-rig-breathe')||css.includes('@keyframes bre-mascot-idle'), 'mascot idle motion missing');
assert(css.includes('@keyframes bre-rig-ack')||css.includes('@keyframes bre-mascot-hello'), 'mascot open acknowledgement missing');
assert(css.includes('@keyframes bre-rig-celebrate-head')||css.includes('@keyframes bre-mascot-celebrate'), 'mascot celebration motion missing');
assert(css.includes('.better-guide-trigger{position:relative;overflow:visible;border:0;background:transparent')||css.includes('.better-guide-trigger{width:62px;height:48px'), 'header mascot must remain a borderless standalone control');
assert(css.includes('.better-guide-trigger:hover,.better-guide-trigger:focus-visible,.better-guide-trigger.is-open'), 'hover/focus/open interaction missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'reduced motion support missing');
assert(fs.existsSync(path.join(root, 'public/better-guide-mascot-cutout.webp')), 'mascot cutout asset missing');
assert(fs.statSync(path.join(root, 'public/better-guide-mascot-cutout.webp')).size < 100 * 1024, 'mascot cutout should stay lightweight');

console.log('v29.28 interactive mascot regression: PASS');
