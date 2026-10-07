const assert=require('assert');
const fs=require('fs');
const policy=require('../policy');
const social=require('../social');

assert.deepEqual(policy.SIGNUP_ROLES,['buyer','seller','lender']);
assert.deepEqual(policy.normalizeSignupRoles(['buyer','lender','buyer','admin']),['buyer','lender']);
assert.equal(policy.resolveRole('ordinary@example.test','lender'),'lender');

const db={
  users:[
    {id:'viewer',name:'Viewer',role:'buyer',roles:['buyer']},
    {id:'multi',name:'Capital Buyer',role:'buyer',roles:['buyer','lender'],bio:'Private capital',location:'NJ',points:0},
    {id:'wholesaler',name:'Deal Source',role:'seller',roles:['seller'],bio:'Off market',location:'PA',points:0}
  ],listings:[],follows:[],friendRequests:[],friendships:[]
};
assert.equal(social.searchUsers(db,'viewer','', 'lender')[0].id,'multi');
assert.equal(social.searchUsers(db,'viewer','', 'buyer')[0].id,'multi');
assert.equal(social.searchUsers(db,'viewer','private capital','all')[0].id,'multi');
assert.deepEqual(social.publicProfileUser(db.users[1]).roles,['buyer','lender']);

const app=fs.readFileSync('public/app.js','utf8');
const server=fs.readFileSync('server.js','utf8');
const css=fs.readFileSync('public/style.css','utf8');
for(const s of ['Buyer / Investor','Seller / Wholesaler','Lender / Funder','Choose all that apply','Save roles']) assert(app.includes(s),`missing UI: ${s}`);
assert(app.includes("['lender','Lenders / Funders']"),'network lender filter missing');
assert(app.includes("if (hasRole(owner, 'seller'))"),'multi-role seller behavior missing');
assert(server.includes('roles: selectedRoles'),'signup must persist roles');
assert(server.includes("error: 'Choose at least one role.'"),'server role validation missing');
assert(css.includes('.rolemultiselect'),'multi-role responsive styling missing');
assert(app.includes('const TUTORIAL_VERSION = 57'),'tutorial version not advanced');
console.log('✓ v29.16 multi-role signup, discovery and profile regression passed');
