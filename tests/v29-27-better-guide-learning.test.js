const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.resolve(__dirname, '..');
const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public/style.css'), 'utf8');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

assert.equal(pkg.version, '2.9.28', 'package version must include the v29.27 Guide baseline');
assert(app.includes("'learn'"), 'Learn route missing');
assert(app.includes('function openBetterGuide()'), 'Better Guide panel missing');
assert(app.includes('function renderLearnWholesaling()'), 'course renderer missing');
assert(app.includes("selector:'.better-guide-trigger'"), 'Guide tutorial step missing');
assert(app.includes("release:52,title:'Meet your Better Guide'"), 'v52 Guide What’s New step missing');
assert(app.includes("release:52,title:'Learn wholesaling inside Better'"), 'v52 course What’s New step missing');
assert(app.includes("const TUTORIAL_VERSION = 53;"), 'tutorial version must preserve and advance the Guide onboarding');
assert(app.includes('BETTER_GUIDE_COURSE'), 'course curriculum missing');
for (let n = 1; n <= 12; n++) assert(app.includes(`number:${n},`), `course module ${n} missing`);
for (const required of ['Deal Intelligence','Network','Deal Pipeline','Buyer CRM','Better Dispo','Transaction Hub','Command Center']) {
  assert(app.includes(required), `Better-centered workflow missing ${required}`);
}
assert(app.includes('Education only.'), 'course legal/professional disclaimer missing');
assert(app.includes('No fake activity or invented deal facts.'), 'truth guardrail missing');
assert(server.includes('guideCourseCompleted: []'), 'course progress default missing');
assert(server.includes('guideCourseQuizPassed: []'), 'quiz progress default missing');
assert(server.includes("guideCourseLastModule: 'foundations'"), 'resume position default missing');
assert(server.includes('body.guideContextTips'), 'Guide preference persistence missing');
assert(server.includes('body.guideAnimations'), 'Guide animation preference persistence missing');
assert(css.includes('max-height:calc(100dvh - 20px)'), 'Guide panel must use dynamic viewport height');
assert(css.includes('env(safe-area-inset-bottom'), 'mobile safe-area handling missing');
assert(css.includes('@media(prefers-reduced-motion:reduce)'), 'reduced-motion support missing');
assert(css.includes('overscroll-behavior:contain'), 'intentional scroll containment missing');

const logoA = fs.readFileSync(path.join(root, 'BRE- Logo.png'));
const logoB = fs.readFileSync(path.join(root, 'public/better-guide-logo.png'));
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
assert.equal(hash(logoA), hash(logoB), 'Guide must use the exact canonical Better logo bytes');
const mascotSize = fs.statSync(path.join(root, 'public/better-guide-mascot.webp')).size;
assert(mascotSize < 150 * 1024, `mascot asset should stay lightweight; got ${mascotSize} bytes`);

for (const forbidden of ['3 buyers are waiting','thousands of buyers','guaranteed closing','guaranteed deal']) {
  assert(!app.toLowerCase().includes(forbidden.toLowerCase()), `fabricated/hype copy detected: ${forbidden}`);
}

console.log('v29.27 Better Guide + learning regression: PASS');
