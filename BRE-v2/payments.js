/* =========================================================================
   payments.js — Stripe.

   THE ONE RULE: money is only credited from a verified webhook, never
   from what the browser tells us. If you credit a wallet or activate a
   boost because the client said "payment succeeded", anyone can call
   that endpoint with curl and get paid features for free. The browser
   asks; Stripe confirms; the webhook credits.

   Set in Netlify → Environment variables:
       STRIPE_SECRET_KEY=sk_live_...
       STRIPE_WEBHOOK_SECRET=whsec_...
       STRIPE_PUBLISHABLE_KEY=pk_live_...   (sent to the browser)

   With no key set, everything falls back to simulated mode so local
   development and demos keep working.
   ========================================================================= */

let Stripe = null;
try { Stripe = require('stripe'); } catch { /* optional until you install it */ }

const KEY = process.env.STRIPE_SECRET_KEY;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = (Stripe && KEY) ? new Stripe(KEY, { apiVersion: '2024-06-20' }) : null;

const enabled = () => !!stripe;
const publishableKey = () => process.env.STRIPE_PUBLISHABLE_KEY || null;

/* ---------------- customers ---------------- */
async function ensureCustomer(user) {
  if (!stripe) return null;
  if (user.stripeCustomerId) return user.stripeCustomerId;
  const c = await stripe.customers.create({
    email: user.email, name: user.name, metadata: { userId: user.id }
  });
  user.stripeCustomerId = c.id;
  return c.id;
}

/* ---------------- one-off charges ----------------
   `purpose` and `meta` ride along on the PaymentIntent so the webhook
   knows what to unlock when Stripe confirms the money arrived.        */
async function createPaymentIntent(user, amountCents, purpose, meta = {}) {
  if (!stripe) throw new Error('Stripe is not configured.');
  const customerId = await ensureCustomer(user);
  return stripe.paymentIntents.create({
    amount: amountCents,
    currency: 'usd',
    customer: customerId,
    automatic_payment_methods: { enabled: true },
    metadata: { userId: user.id, purpose, ...stringifyMeta(meta) }
  });
}

function stringifyMeta(meta) {
  const out = {};
  for (const k in meta) if (meta[k] != null) out[k] = String(meta[k]).slice(0, 480);
  return out;
}

/* ---------------- saved cards ---------------- */
async function listPaymentMethods(user) {
  if (!stripe || !user.stripeCustomerId) return [];
  const pms = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card' });
  return pms.data.map(pm => ({
    id: pm.id, brand: (pm.card.brand || 'card').toUpperCase(),
    last4: pm.card.last4, expMonth: pm.card.exp_month, expYear: pm.card.exp_year
  }));
}
async function createSetupIntent(user) {
  if (!stripe) throw new Error('Stripe is not configured.');
  const customerId = await ensureCustomer(user);
  return stripe.setupIntents.create({ customer: customerId, automatic_payment_methods: { enabled: true } });
}
async function detachPaymentMethod(pmId) {
  if (!stripe) return;
  await stripe.paymentMethods.detach(pmId);
}

/* ---------------- subscriptions (Better Pro) ---------------- */
async function createSubscriptionCheckout(user, priceId, appUrl) {
  if (!stripe) throw new Error('Stripe is not configured.');
  const customerId = await ensureCustomer(user);
  return stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl}/?checkout=success`,
    cancel_url: `${appUrl}/?checkout=cancelled`,
    metadata: { userId: user.id, purpose: 'pro_subscription' }
  });
}
async function cancelSubscription(subscriptionId) {
  if (!stripe) return;
  await stripe.subscriptions.update(subscriptionId, { cancel_at_period_end: true });
}

/* ---------------- Connect (seller payouts) ----------------
   Sellers onboard through Stripe's hosted flow. Bank details never touch
   this server, which keeps you out of the business of storing them.    */
async function createConnectAccount(user, appUrl) {
  if (!stripe) throw new Error('Stripe is not configured.');
  let acctId = user.stripeAccountId;
  if (!acctId) {
    const acct = await stripe.accounts.create({
      type: 'express', email: user.email,
      capabilities: { transfers: { requested: true } },
      metadata: { userId: user.id }
    });
    acctId = acct.id;
    user.stripeAccountId = acctId;
  }
  const link = await stripe.accountLinks.create({
    account: acctId,
    refresh_url: `${appUrl}/?connect=retry`,
    return_url: `${appUrl}/?connect=done`,
    type: 'account_onboarding'
  });
  return { accountId: acctId, url: link.url };
}
async function connectAccountStatus(accountId) {
  if (!stripe || !accountId) return null;
  const a = await stripe.accounts.retrieve(accountId);
  return { payoutsEnabled: a.payouts_enabled, detailsSubmitted: a.details_submitted };
}
async function payout(accountId, amountCents) {
  if (!stripe) throw new Error('Stripe is not configured.');
  return stripe.transfers.create({ amount: amountCents, currency: 'usd', destination: accountId });
}

/* ---------------- webhook verification ---------------- */
function verifyWebhook(rawBody, signature) {
  if (!stripe) throw new Error('Stripe is not configured.');
  if (!WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET is not set.');
  return stripe.webhooks.constructEvent(rawBody, signature, WEBHOOK_SECRET);
}

module.exports = {
  enabled, publishableKey, ensureCustomer, createPaymentIntent,
  listPaymentMethods, createSetupIntent, detachPaymentMethod,
  createSubscriptionCheckout, cancelSubscription,
  createConnectAccount, connectAccountStatus, payout,
  verifyWebhook, stripe
};
