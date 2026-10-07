const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),server=fs.readFileSync('server.js','utf8');
for(const x of ["Free to join · No card required","function downloadDealCard","function dealMilestones","function showClosingCelebration","function maybeShowFirstLoginPayoff","buyer-match-moment","deal-momentum","TUTORIAL_VERSION = 55"]) assert(app.includes(x),x);
for(const x of ["function listingMomentum","/api/listings/:id/network-intelligence","/api/onboarding/first-look","firstLookCompleted"]) assert(server.includes(x),x);
for(const x of [".deal-momentum",".deal-milestones",".closing-celebration","button:active:not(:disabled)"]) assert(css.includes(x),x);
assert(!app.includes('`Free for ${p?.signupTrialDays || 7} days · No card required`'));
assert(!app.includes('function downloadProfileCard')&&!app.includes('Share profile card')&&!app.includes('shareable profile card'),'Shareable profile card feature should remain removed');
console.log('✓ v29.17 Better Moments + acquisition copy regression passed');
