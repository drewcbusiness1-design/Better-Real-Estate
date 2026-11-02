const assert = require('node:assert/strict');
const Module = require('module');
const old = Module._load;
Module._load = function (request, ...args) {
  if (request === '@apple/app-store-server-library') return {SignedDataVerifier: class {}, Environment: {PRODUCTION:'Production',SANDBOX:'Sandbox'}};
  return old.call(this, request, ...args);
};
const billing = require('../appleBilling');
Module._load = old;
const now = Date.now();
const later = new Date(now+86400000).toISOString();
const db = {users:[{id:'u1'}, {id:'u2'}]};
const tr = (id='original-1', product='org.betterrealestate.ios.teams.monthly', end=now+86400000) => ({originalTransactionId:id,transactionId:'tx1',productId:product,expiresDate:end});
assert.equal(Object.keys(billing.PRODUCT_PLANS).length,5);
assert.ok(!billing.PRODUCT_PLANS['org.betterrealestate.ios.teams.annual']);
assert.equal(billing.appleEntitlement(db.users[0]),null);
assert.equal(billing.grants(db.users[0],'pro'),false);
billing.attachVerified(db,db.users[0],tr());
assert.equal(billing.grants(db.users[0],'wholesale'),true);
assert.equal(billing.grants(db.users[0],'platinum'),true);
assert.throws(()=>billing.attachVerified(db,db.users[1],tr()),/another Better account/);
assert.equal(billing.appleEntitlement({appleSubscription:{productId:'org.betterrealestate.ios.plus.monthly', expiresAt:new Date(now-500).toISOString()}}),null);
assert.equal(billing.appleEntitlement({appleSubscription:{productId:'org.betterrealestate.ios.plus.monthly', expiresAt:later,revokedAt:new Date().toISOString()}}),null);
assert.throws(()=>billing.subscriptionFromTransaction(tr('original-1','org.betterrealestate.ios.teams.annual')),/Unrecognized/);
assert.throws(()=>billing.subscriptionFromTransaction({}),/Unrecognized/);
const previousExpiry = db.users[0].appleSubscription.expiresAt;
billing.attachVerified(db,db.users[0],tr('original-1','org.betterrealestate.ios.plus.monthly',now+60000));
assert.equal(db.users[0].appleSubscription.expiresAt,previousExpiry);
// A verified refund/revocation must disable access, even with future expiry.
billing.attachVerified(db, db.users[0], {...tr(), revocationDate: now});
assert.equal(billing.appleEntitlement(db.users[0]), null);
// A late refund for an older renewal must not cancel a newer paid renewal.
const renewed = { ...tr('original-1', 'org.betterrealestate.ios.teams.monthly', now+2*86400000), transactionId:'tx-new' };
billing.attachVerified(db,db.users[0],renewed);
billing.attachVerified(db,db.users[0],{ ...tr(), revocationDate: now });
assert.equal(billing.grants(db.users[0],'wholesale'),true);
// A stale notification must never clear a refund already applied to the same transaction.
billing.attachVerified(db,db.users[0],{ ...renewed, revocationDate: now });
billing.attachVerified(db,db.users[0],renewed);
assert.equal(billing.grants(db.users[0],'wholesale'),false);
// An expired transaction may be recorded, but cannot authorize access.
billing.attachVerified(db, db.users[1], tr('second-original', 'org.betterrealestate.ios.plus.monthly', now-1000));
assert.equal(billing.grants(db.users[1], 'pro'), false);
// An owner cannot claim two different Better accounts, even on renewal.
assert.throws(() => billing.attachVerified(db, db.users[1], tr()), /another Better account/);
console.log('Apple billing unit tests: passed');
