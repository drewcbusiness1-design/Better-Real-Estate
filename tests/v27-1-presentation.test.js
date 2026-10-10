const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),server=fs.readFileSync('server.js','utf8');
for(const t of ["title: 'Quick options'","openQuickOptions()","openQuickCustomizer()","iconSvg('grid',19)","iconSvg('search',19)","quickOptions","accountAgeLabel","TUTORIAL_VERSION = 67"]) assert(app.includes(t),t);
assert(!app.includes("'YOUR WORKSPACE'"),'redundant workspace heading removed');
assert(!app.includes("'What needs your attention'"),'redundant workspace title removed');
assert(!app.includes("'Skip this step'"),'redundant tutorial action removed');
for(const t of ['grid-template-columns:repeat(4,minmax(0,1fr))','min-width:92px','activity-controls button.active','adminverifyrow .compactbtn']) assert(css.includes(t),t);
assert(server.includes('body.quickOptions'),'quick options persist server-side');
console.log('✓ v27.1 presentation acceptance tests passed');
