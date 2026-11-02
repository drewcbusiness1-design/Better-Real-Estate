// Better native Apple billing. Never grant access from unverified client data.
'use strict';
const { SignedDataVerifier, Environment } = require('@apple/app-store-server-library');
const PRODUCT_PLANS = Object.freeze({
  'org.betterrealestate.ios.plus.monthly': ['pro','monthly'],
  'org.betterrealestate.ios.plus.annual': ['pro','annual'],
  'org.betterrealestate.ios.platinum.monthly': ['platinum','monthly'],
  'org.betterrealestate.ios.platinum.annual': ['platinum','annual'],
  'org.betterrealestate.ios.teams.monthly': ['wholesale','monthly']
});
const rank = { pro: 1, platinum: 2, wholesale: 3 };
function appleEntitlement(user, now = Date.now()) {
  const e = user?.appleSubscription;
  if (!e || !PRODUCT_PLANS[e.productId] || !Number.isFinite(Date.parse(e.expiresAt)) || Date.parse(e.expiresAt) <= now || e.revokedAt) return null;
  return { ...e, tier: PRODUCT_PLANS[e.productId][0] };
}
function grants(user, tier) { const e = appleEntitlement(user); return !!e && rank[e.tier] >= rank[tier]; }
function rootCerts() { const certs = JSON.parse(require('node:fs').readFileSync(require('node:path').join(__dirname, 'apple-root-certificates.json'), 'utf8')); if (!Array.isArray(certs) || !certs.length) throw Error('Apple certificate trust roots not configured'); return certs.map(x => Buffer.from(x, 'base64')); }
async function verified(method, token) {
  if (typeof token !== 'string' || token.length > 30000 || token.split('.').length !== 3) throw Error('Invalid Apple signed payload');
  const roots = rootCerts();
  const appId = Number(process.env.APPLE_APP_ID);
  if (!Number.isSafeInteger(appId) || appId <= 0) throw Error('APPLE_APP_ID not configured');
  const common = ['org.betterrealestate.ios'];
  // Verification is tried in both environments; successful cryptographic verification is mandatory.
  for (const env of [Environment.PRODUCTION, Environment.SANDBOX]) {
    try {
      const verifier = new SignedDataVerifier(roots, true, env, ...common, env === Environment.PRODUCTION ? appId : undefined);
      return await verifier[method](token);
    } catch (err) { if (env === Environment.SANDBOX) throw Error('Apple signature verification failed'); }
  }
}
function subscriptionFromTransaction(t) {
  const plan = PRODUCT_PLANS[t?.productId];
  if (!plan || !t.originalTransactionId || !t.transactionId || !Number.isFinite(Number(t.expiresDate))) throw Error('Unrecognized Apple subscription transaction');
  return { productId: t.productId, originalTransactionId: String(t.originalTransactionId), transactionId: String(t.transactionId), expiresAt: new Date(Number(t.expiresDate)).toISOString(), revokedAt: t.revocationDate ? new Date(Number(t.revocationDate)).toISOString() : null, plan: plan[0], period: plan[1] };
}
function attachVerified(db, user, t) {
  const s = subscriptionFromTransaction(t);
  const owner = db.users.find(u => u.id !== user.id && u.appleSubscription?.originalTransactionId === s.originalTransactionId);
  if (owner) throw Error('Apple subscription belongs to another Better account');
  const existing = user.appleSubscription;
  // Older notifications must not erase a more recent renewal. A refund for a
  // superseded transaction does not revoke the renewed transaction.
  if (existing?.originalTransactionId === s.originalTransactionId) {
    if (Date.parse(existing.expiresAt) > Date.parse(s.expiresAt)) return existing;
    if (existing.transactionId !== s.transactionId && Date.parse(existing.expiresAt) === Date.parse(s.expiresAt)) return existing;
    if (existing.revokedAt && !s.revokedAt && existing.transactionId === s.transactionId) return existing;
  }
  user.appleSubscription = { productId:s.productId, originalTransactionId:s.originalTransactionId, transactionId:s.transactionId, expiresAt:s.expiresAt, revokedAt:s.revokedAt };
  return user.appleSubscription;
}
function install(app, {requireAuth,loadDB,saveDB,syncCompanyMemberEntitlements}) {
  app.post('/api/apple-billing/confirm', requireAuth, async (req,res) => {
    const signed = req.body?.signedTransaction;
    try {
      const t = await verified('verifyAndDecodeTransaction', signed);
      const s = attachVerified(req.db, req.user, t);
      syncCompanyMemberEntitlements(req.db, req.user);
      await saveDB(req.db);
      res.json({ ok:true, active:!!appleEntitlement(req.user), productId:s.productId });
    } catch (err) { res.status(400).json({error:err.message}); }
  });
  app.post('/api/apple-billing/notifications', async (req,res) => {
    try {
      const notice = await verified('verifyAndDecodeNotification', req.body?.signedPayload);
      const transaction = notice.data?.signedTransactionInfo;
      if (!transaction) return res.status(200).json({ok:true});
      const t = await verified('verifyAndDecodeTransaction', transaction);
      const s = subscriptionFromTransaction(t);
      const db = await loadDB();
      const user = db.users.find(u => u.appleSubscription?.originalTransactionId === s.originalTransactionId);
      if (user) {
        // Signed expiration, revocation and renewal records are authoritative.
        attachVerified(db, user, t);
        syncCompanyMemberEntitlements(db, user);
        await saveDB(db);
      }
      res.status(200).json({ok:true});
    } catch (err) { res.status(400).json({error:'Apple notification could not be verified'}); }
  });
}
module.exports = { PRODUCT_PLANS, appleEntitlement, grants, subscriptionFromTransaction, attachVerified, install };
