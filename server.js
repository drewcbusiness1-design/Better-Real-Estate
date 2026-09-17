const express = require('express');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mailer = require('./mailer');

const { loadDB, saveDB } = require('./store');
const { writeImage, readImage } = require('./storage');
const dropship = require('./dropship');
const cjAdapter = require('./cj-adapter');
const policy = require('./policy');
const payments = require('./payments');
const ai = require('./ai');
const marketing = require('./marketing');
const app = express();

/* Every app.get/post/patch/delete below is an async function. Express 4
   does not catch errors thrown inside an async handler on its own — an
   unhandled rejection there either hangs the request or, on Netlify,
   turns into an opaque 502 with no useful message. This wraps every
   handler so any thrown error (a database problem, a bug, anything)
   lands in the error-handling middleware at the bottom of this file
   and comes back to the browser as a plain, readable JSON message
   instead of a silent failure. */
['get', 'post', 'patch', 'delete'].forEach(method => {
  const original = app[method].bind(app);
  app[method] = (routePath, ...handlers) => original(routePath, ...handlers.map(h =>
    typeof h === 'function'
      ? (req, res, next) => Promise.resolve(h(req, res, next)).catch(next)
      : h
  ));
});
const PORT = process.env.PORT || 3000;

/* =======================================================================
   PRICING — every number the business runs on, in one place.
   Amounts are in CENTS.
   ======================================================================= */
const PRICING = {
  freeUnlocks: 5,                 // free detail unlocks before paywall
  unlockCredit: 199,              // $1.99 to unlock one listing's details
  unlockPack: { qty: 10, price: 1499 }, // $14.99 for 10
  pro: { monthly: 3000, annual: 32000, label: 'Better Pro' },  // $30/mo or $320/yr
  platinum: { monthly: 5000, annual: 50000, label: 'Better Platinum' },  // $50/mo or $500/yr
  platinumFeeBps: 400,             // marketplace fee for Platinum sellers (vs 700 = 7% standard)
  maxBuyBoxes: { free: 1, seller: 1, buyer: 1, admin: 1, pro: 1, platinum: 5 },
  promotions: {
    boost24:   { id: 'boost24',   label: 'Boost — 24 hours',  hours: 24,  price: 900,  weight: 1000 },
    boost3d:   { id: 'boost3d',   label: 'Boost — 3 days',    hours: 72,  price: 1900, weight: 1000 },
    boost7d:   { id: 'boost7d',   label: 'Boost — 7 days',    hours: 168, price: 3900, weight: 1000 },
    superboost:{ id: 'superboost',label: 'Super Boost — 1 hr top slot', hours: 1, price: 1500, weight: 5000 },
    spotlight: { id: 'spotlight', label: 'Spotlight badge — 7 days',    hours: 168, price: 1200, weight: 300 },
    bump:      { id: 'bump',      label: 'Bump to fresh',     hours: 0,   price: 300,  weight: 0 }
  },
  marketplaceFeeBps: 700,         // 7% platform take on shop sales
  verificationFee: 2500,          // $25 one-time seller verification
  minWithdrawal: 2000,            // $20 minimum payout
  referralBonus: 1000,            // $10 credit each side, paid on referee's first purchase
  signupTrialDays: 7
};


app.use((req, res, next) => {
  // Stripe signs the raw bytes, so the webhook route must not be JSON-parsed.
  if (req.originalUrl === '/api/payments/webhook') return next();
  express.json({ limit: '30mb' })(req, res, next);
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieSession({
  name: 'keyline_session',
  keys: [process.env.SESSION_SECRET || 'keyline-dev-secret-change-me'],
  maxAge: 30 * 24 * 60 * 60 * 1000
}));

const publicUser = u => { if (!u) return null; const { passwordHash, marketingOptIn, marketingConsentAt, marketingUnsubscribedAt, marketingLastSentAt, marketingSequence, aiUsageDay, aiUsageCount, ...r } = u; return r; };
const publicProfileUser = u => u ? ({
  id: u.id, name: u.name, role: u.role, bio: u.bio || '', avatarUrl: u.avatarUrl || null,
  points: Number(u.points || 0), verified: !!u.verified, createdAt: u.createdAt || null
}) : null;
async function requireAuth(req, res, next) {
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  req.user = user; req.db = db; next();
}
// Belt and braces: the stored role must say admin AND the email must be on
// the allowlist. A tampered database row alone is not enough.
const requireAdmin = (req, res, next) =>
  (req.user.role === 'admin' && policy.isAdminEmail(req.user.email))
    ? next()
    : res.status(403).json({ error: 'Admin only' });

/* ---------- shipping-address autocomplete ----------
   Browser autofill always works without this. If GOOGLE_MAPS_API_KEY is set,
   signed-in shoppers also get type-ahead US street-address suggestions via
   Google's Places API (New). The key never reaches public/app.js. */
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';
const addressRate = new Map();
function addressAutocompleteConfigured() { return !!GOOGLE_MAPS_API_KEY; }
function checkAddressRate(userId) {
  const now = Date.now();
  const key = String(userId || 'anon');
  const bucket = addressRate.get(key);
  if (!bucket || now - bucket.startedAt > 60_000) {
    addressRate.set(key, { startedAt: now, count: 1 });
    return true;
  }
  bucket.count += 1;
  // Plenty for normal typing with debounce, low enough to limit key abuse.
  return bucket.count <= 80;
}
function googleAddressComponent(components, type, preferShort = false) {
  const c = (components || []).find(x => Array.isArray(x.types) && x.types.includes(type));
  if (!c) return '';
  return String((preferShort ? c.shortText : c.longText) || c.longText || c.shortText || '').trim();
}
function normalizeGoogleAddress(place = {}) {
  const c = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  const streetNumber = googleAddressComponent(c, 'street_number');
  const route = googleAddressComponent(c, 'route');
  const premise = googleAddressComponent(c, 'premise');
  const subpremise = googleAddressComponent(c, 'subpremise');
  const city =
    googleAddressComponent(c, 'locality') ||
    googleAddressComponent(c, 'postal_town') ||
    googleAddressComponent(c, 'sublocality_level_1') ||
    googleAddressComponent(c, 'administrative_area_level_2');
  const state = googleAddressComponent(c, 'administrative_area_level_1', true);
  const postal = googleAddressComponent(c, 'postal_code');
  const suffix = googleAddressComponent(c, 'postal_code_suffix');
  const countryCode = googleAddressComponent(c, 'country', true).toUpperCase();
  const line1 = [streetNumber, route].filter(Boolean).join(' ') || premise || '';
  return {
    line1,
    line2: subpremise,
    city,
    state,
    zip: suffix && postal ? `${postal}-${suffix}` : postal,
    country: googleAddressComponent(c, 'country') || 'United States',
    countryCode: countryCode || 'US',
    formattedAddress: String(place.formattedAddress || '').trim()
  };
}

const defaultBuyBox = () => ({ minPrice: 0, maxPrice: 2000000, cities: [], propertyTypes: [], minSpread: 0, active: true });
const defaultSettings = () => ({ theme: 'light', feedDensity: 'comfortable', notifyOnMessage: true, notifyOnMatch: true });
const badgeFor = p => p >= 500 ? 'Gold' : p >= 200 ? 'Silver' : p >= 100 ? 'Bronze' : null;
const money = c => '$' + (c / 100).toFixed(2);

/* ---------- ledger helpers (single source of truth for money) ---------- */
function ledgerAdd(db, userId, type, amountCents, description, meta = {}) {
  const entry = { id: crypto.randomUUID(), userId, type, amount: amountCents, description, meta, at: new Date().toISOString() };
  db.ledger.push(entry);
  return entry;
}
function balanceOf(db, userId) {
  return db.ledger.filter(l => l.userId === userId).reduce((s, l) => s + l.amount, 0);
}
function isPro(user) {
  return (user.plan === 'pro' || user.plan === 'platinum') && user.planUntil && new Date(user.planUntil) > new Date();
}
function isPlatinum(user) {
  return user.plan === 'platinum' && user.planUntil && new Date(user.planUntil) > new Date();
}
function inTrial(user) {
  return user.trialUntil && new Date(user.trialUntil) > new Date();
}
function hasFullAccess(user) { return isPro(user) || inTrial(user) || user.role === 'admin'; }
function maxBuyBoxesFor(user) {
  if (isPlatinum(user)) return PRICING.maxBuyBoxes.platinum;
  return PRICING.maxBuyBoxes[user.role] || 1;
}
// Buy boxes moved from a single object to an array (Platinum can have
// several). This reads either shape so accounts created before the
// change keep working without a migration step.
function getBuyBoxes(user) {
  if (Array.isArray(user.buyBoxes) && user.buyBoxes.length) return user.buyBoxes;
  if (user.buyBox) return [user.buyBox];
  return [defaultBuyBox()];
}


/* ============================ AUTH ============================ */
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role, referralCode, marketingOptIn } = req.body || {};
  if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields are required.' });
  if (!policy.SIGNUP_ROLES.includes(role)) return res.status(400).json({ error: 'Invalid role.' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const db = await loadDB();
  const cleanEmail = email.trim().toLowerCase();
  if (db.users.find(u => u.email === cleanEmail)) return res.status(409).json({ error: 'An account with that email already exists.' });

  const referrer = referralCode ? db.users.find(u => u.referralCode === String(referralCode).trim().toUpperCase()) : null;
  const trialUntil = new Date(Date.now() + PRICING.signupTrialDays * 86400000).toISOString();
  const user = {
    id: crypto.randomUUID(), name: name.trim(), email: cleanEmail,
    passwordHash: bcrypt.hashSync(password, 10),
    role: policy.resolveRole(cleanEmail, role),
    bio: '', phone: '', avatarUrl: null, points: 0,
    buyBoxes: [defaultBuyBox()], settings: defaultSettings(),
    plan: 'free', planUntil: null, trialUntil,
    unlockCredits: PRICING.freeUnlocks,
    verified: false,
    paymentMethods: [], payoutMethod: null,
    emailVerified: false,
    marketingOptIn: marketingOptIn === true,
    marketingConsentAt: marketingOptIn === true ? new Date().toISOString() : null,
    marketingUnsubscribedAt: null, marketingLastSentAt: null, marketingSequence: 0,
    referralCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
    referredBy: referrer ? referrer.id : null, referralPaid: false,
    createdAt: new Date().toISOString()
  };
  db.users.push(user);
  const vtok = crypto.randomBytes(24).toString('hex');
  db.tokens.push({ token: vtok, userId: user.id, kind: 'verify', expires: Date.now() + 7 * 86400000 });
  await saveDB(db);
  mailer.sendVerification(user.email, user.name, vtok).catch(e => console.error('[mail]', e.message));
  req.session.userId = user.id;
  res.json({ user: publicUser(user), pricing: PRICING });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = await loadDB();
  const user = db.users.find(u => u.email === (email || '').trim().toLowerCase());
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  // Re-derive the role from the allowlist on each login. Adding or removing
  // an address in ADMIN_EMAILS takes effect immediately, and an 'admin'
  // value written into the database by any other means is overwritten here.
  const correctRole = policy.resolveRole(user.email, user.role === 'admin' ? 'buyer' : user.role);
  if (user.role !== correctRole) { user.role = correctRole; await saveDB(db); }
  req.session.userId = user.id;
  res.json({ user: publicUser(user) });
});
app.post('/api/logout', async (req, res) => { req.session = null; res.json({ ok: true }); });
app.get('/api/me', async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.session.userId);
  res.json({
    user: publicUser(u),
    pricing: PRICING,
    balance: u ? balanceOf(db, u.id) : 0,
    access: u ? { pro: isPro(u), platinum: isPlatinum(u), trial: inTrial(u), full: hasFullAccess(u) } : null
  });
});
app.get('/api/pricing', async (req, res) => res.json({ pricing: PRICING }));


async function unsubscribeMarketing(req, res) {
  const id = marketing.verifyToken(req.query?.token || req.body?.token);
  if (!id) return res.status(400).type('html').send('<!doctype html><meta charset="utf-8"><title>Invalid link</title><p>This unsubscribe link is invalid or expired.</p>');
  const db = await loadDB();
  const user = db.users.find(u => u.id === id);
  if (!user) return res.status(404).type('html').send('<!doctype html><meta charset="utf-8"><title>Not found</title><p>This account could not be found.</p>');
  user.marketingOptIn = false;
  user.marketingUnsubscribedAt = new Date().toISOString();
  await saveDB(db);
  if (req.method === 'POST') return res.status(200).send('ok');
  return res.type('html').send(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Unsubscribed</title><body style="font-family:system-ui;background:#faf9f6;color:#14181c;padding:40px"><main style="max-width:560px;margin:auto;background:white;border:1px solid #ddd8ce;border-radius:14px;padding:28px"><h1 style="font-size:24px">You’re unsubscribed</h1><p>You won’t receive Better Real Estate marketing emails unless you turn them back on in Settings. Transactional messages such as password resets, receipts and order updates are unaffected.</p><a href="${String(process.env.APP_URL || '/').replace(/\/$/, '')}/?view=settings">Open email preferences</a></main></body>`);
}
app.get('/api/marketing/unsubscribe', unsubscribeMarketing);
app.post('/api/marketing/unsubscribe', unsubscribeMarketing);


/* ============ EMAIL VERIFICATION & PASSWORD RESET ============ */
function consumeToken(db, token, kind) {
  const i = db.tokens.findIndex(t => t.token === token && t.kind === kind);
  if (i === -1) return null;
  const t = db.tokens[i];
  db.tokens.splice(i, 1);
  if (t.expires < Date.now()) return null;
  return t;
}

app.post('/api/verify-email', async (req, res) => {
  const db = await loadDB();
  const t = consumeToken(db, req.body?.token, 'verify');
  if (!t) { await saveDB(db); return res.status(400).json({ error: 'That confirmation link is invalid or has expired.' }); }
  const user = db.users.find(u => u.id === t.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.emailVerified = true;
  await saveDB(db);
  mailer.sendWelcome(user.email, user.name).catch(e => console.error('[mail]', e.message));
  res.json({ ok: true });
});

app.post('/api/resend-verification', requireAuth, async (req, res) => {
  if (req.user.emailVerified) return res.status(409).json({ error: 'Your email is already confirmed.' });
  req.db.tokens = req.db.tokens.filter(t => !(t.userId === req.user.id && t.kind === 'verify'));
  const token = crypto.randomBytes(24).toString('hex');
  req.db.tokens.push({ token, userId: req.user.id, kind: 'verify', expires: Date.now() + 7 * 86400000 });
  await saveDB(req.db);
  mailer.sendVerification(req.user.email, req.user.name, token).catch(e => console.error('[mail]', e.message));
  res.json({ ok: true, mailConfigured: mailer.configured() });
});

app.post('/api/forgot-password', async (req, res) => {
  const db = await loadDB();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = db.users.find(u => u.email === email);
  // Always report success — never reveal whether an address has an account.
  if (user) {
    db.tokens = db.tokens.filter(t => !(t.userId === user.id && t.kind === 'reset'));
    const token = crypto.randomBytes(24).toString('hex');
    db.tokens.push({ token, userId: user.id, kind: 'reset', expires: Date.now() + 3600000 });
    await saveDB(db);
    mailer.sendPasswordReset(user.email, user.name, token).catch(e => console.error('[mail]', e.message));
  }
  res.json({ ok: true });
});

app.post('/api/reset-password', async (req, res) => {
  const { token, password } = req.body || {};
  if (!password || password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters.' });
  const db = await loadDB();
  const t = consumeToken(db, token, 'reset');
  if (!t) { await saveDB(db); return res.status(400).json({ error: 'That reset link is invalid or has expired.' }); }
  const user = db.users.find(u => u.id === t.userId);
  if (!user) return res.status(404).json({ error: 'Account not found.' });
  user.passwordHash = bcrypt.hashSync(password, 10);
  await saveDB(db);
  res.json({ ok: true });
});

app.get('/api/site/status', async (req, res) => res.json({ mailConfigured: mailer.configured(), aiConfigured: ai.configured(), marketingConfigured: marketing.configured() }));

/* ============================ PROFILE ============================ */
app.patch('/api/me', requireAuth, async (req, res) => {
  const { name, bio, phone, avatarData } = req.body || {};
  if (name !== undefined) req.user.name = String(name).trim() || req.user.name;
  if (bio !== undefined) req.user.bio = String(bio).slice(0, 400);
  if (phone !== undefined) req.user.phone = String(phone).slice(0, 40);
  if (avatarData) { const url = await writeImage(avatarData); if (url) req.user.avatarUrl = url; }
  await saveDB(req.db); res.json({ user: publicUser(req.user) });
});
app.patch('/api/me/settings', requireAuth, async (req, res) => {
  req.user.settings = { ...defaultSettings(), ...req.user.settings, ...(req.body || {}) };
  await saveDB(req.db); res.json({ settings: req.user.settings });
});

app.get('/api/email-preferences', requireAuth, async (req, res) => {
  res.json({ marketingOptIn: req.user.marketingOptIn === true, marketingConfigured: marketing.configured() });
});
app.patch('/api/email-preferences', requireAuth, async (req, res) => {
  const optIn = req.body?.marketingOptIn === true;
  req.user.marketingOptIn = optIn;
  if (optIn) {
    req.user.marketingConsentAt = new Date().toISOString();
    req.user.marketingUnsubscribedAt = null;
  } else {
    req.user.marketingUnsubscribedAt = new Date().toISOString();
  }
  await saveDB(req.db);
  res.json({ marketingOptIn: req.user.marketingOptIn });
});
app.patch('/api/me/buybox', requireAuth, async (req, res) => {
  const b = req.body || {};
  const boxes = getBuyBoxes(req.user);
  const idx = Number.isInteger(b.index) ? b.index : 0;
  const built = {
    ...defaultBuyBox(), ...(boxes[idx] || {}),
    label: (b.label !== undefined ? String(b.label).slice(0, 40) : boxes[idx]?.label) || null,
    minPrice: Number(b.minPrice) || 0, maxPrice: Number(b.maxPrice) || 2000000,
    cities: Array.isArray(b.cities) ? b.cities : String(b.cities || '').split(',').map(s => s.trim()).filter(Boolean),
    propertyTypes: Array.isArray(b.propertyTypes) ? b.propertyTypes : [],
    minSpread: Number(b.minSpread) || 0, active: b.active !== false
  };
  boxes[idx] = built;
  req.user.buyBoxes = boxes;
  delete req.user.buyBox; // fully migrated to the array now that it's been touched
  await saveDB(req.db);
  res.json({ buyBoxes: req.user.buyBoxes });
});
app.post('/api/me/buybox/add', requireAuth, async (req, res) => {
  const boxes = getBuyBoxes(req.user);
  const max = maxBuyBoxesFor(req.user);
  if (boxes.length >= max) {
    return res.status(403).json({ error: max === 1 ? 'Free and Pro accounts get one buy box — upgrade to Platinum for up to 5.' : `You're at your limit of ${max} buy boxes.` });
  }
  boxes.push({ ...defaultBuyBox(), label: `Buy box ${boxes.length + 1}` });
  req.user.buyBoxes = boxes;
  delete req.user.buyBox;
  await saveDB(req.db);
  res.json({ buyBoxes: req.user.buyBoxes });
});
app.delete('/api/me/buybox/:index', requireAuth, async (req, res) => {
  const boxes = getBuyBoxes(req.user);
  const idx = Number(req.params.index);
  if (boxes.length <= 1) return res.status(400).json({ error: 'You need at least one buy box.' });
  if (idx < 0 || idx >= boxes.length) return res.status(404).json({ error: 'Not found.' });
  boxes.splice(idx, 1);
  req.user.buyBoxes = boxes;
  await saveDB(req.db);
  res.json({ buyBoxes: req.user.buyBoxes });
});

/* ============================ WALLET & PAYMENTS ============================
   IMPORTANT: no raw card number is ever sent to or stored by this server.
   The client derives brand + last4 and sends a placeholder token, which is
   the same shape Stripe Elements returns (pm_xxx). Swapping in real Stripe
   means replacing the token source and the two TODO blocks below.
   ========================================================================= */
app.post('/api/wallet/payment-methods', requireAuth, async (req, res) => {
  const { brand, last4, expMonth, expYear, token } = req.body || {};
  if (!last4 || String(last4).length !== 4 || !/^\d{4}$/.test(String(last4))) return res.status(400).json({ error: 'Card details look wrong.' });
  if (/^\d{12,}$/.test(String(token || ''))) return res.status(400).json({ error: 'Refusing to store a raw card number.' });
  const pm = {
    id: crypto.randomUUID(), brand: brand || 'Card', last4: String(last4),
    expMonth: Number(expMonth) || null, expYear: Number(expYear) || null,
    token: token || ('pm_test_' + crypto.randomBytes(8).toString('hex')),
    addedAt: new Date().toISOString()
  };
  req.user.paymentMethods.push(pm); await saveDB(req.db);
  res.json({ paymentMethod: pm });
});
app.delete('/api/wallet/payment-methods/:id', requireAuth, async (req, res) => {
  req.user.paymentMethods = req.user.paymentMethods.filter(p => p.id !== req.params.id);
  await saveDB(req.db); res.json({ ok: true });
});
app.get('/api/wallet', requireAuth, async (req, res) => {
  res.json({
    balance: balanceOf(req.db, req.user.id),
    ledger: req.db.ledger.filter(l => l.userId === req.user.id).sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, 100),
    paymentMethods: req.user.paymentMethods,
    payoutMethod: req.user.payoutMethod,
    minWithdrawal: PRICING.minWithdrawal
  });
});
app.post('/api/wallet/deposit', requireAuth, async (req, res) => {
  const amount = Math.round(Number(req.body?.amount) || 0);
  if (amount < 500) return res.status(400).json({ error: 'Minimum top-up is $5.00.' });
  if (payments.enabled()) {
    try {
      const pi = await payments.createPaymentIntent(req.user, amount, 'wallet_topup');
      await saveDB(req.db);
      return res.json({ requiresPayment: true, clientSecret: pi.client_secret, amount });
    } catch (e) { return res.status(400).json({ error: e.message }); }
  }
  // Stripe not configured yet — record it so the flow is testable.
  ledgerAdd(req.db, req.user.id, 'deposit', amount, 'Wallet top-up (simulated — Stripe not configured)', { simulated: true });
  maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ balance: balanceOf(req.db, req.user.id) });
});
app.post('/api/wallet/payout-method', requireAuth, async (req, res) => {
  // Stripe Connect: the user links their own bank account directly with
  // Stripe on Stripe's own hosted page. Their banking details never touch
  // this server, and once linked, withdrawals below are fully automatic —
  // nobody has to review or send anything by hand.
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:8888';
    if (!payments.enabled()) return res.status(400).json({ error: 'Payments are not configured yet.' });
    const { accountId, url } = await payments.createConnectAccount(req.user, appUrl);
    req.user.stripeAccountId = accountId;
    await saveDB(req.db);
    res.json({ url });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.get('/api/wallet/payout-status', requireAuth, async (req, res) => {
  try { res.json({ status: await payments.connectAccountStatus(req.user.stripeAccountId) }); }
  catch (e) { res.json({ status: null }); }
});
app.post('/api/wallet/withdraw', requireAuth, async (req, res) => {
  const amount = Math.round(Number(req.body?.amount) || 0);
  const bal = balanceOf(req.db, req.user.id);
  if (amount < PRICING.minWithdrawal) return res.status(400).json({ error: `Minimum withdrawal is ${money(PRICING.minWithdrawal)}.` });
  if (amount > bal) return res.status(400).json({ error: 'Withdrawal exceeds your balance.' });

  if (payments.enabled() && req.user.stripeAccountId) {
    const status = await payments.connectAccountStatus(req.user.stripeAccountId);
    if (!status?.payoutsEnabled) return res.status(400).json({ error: 'Finish linking your bank account first — it only takes a minute.' });
    await payments.payout(req.user.stripeAccountId, amount);
    ledgerAdd(req.db, req.user.id, 'withdrawal', -amount, 'Payout to your bank account', { automatic: true });
  } else if (payments.enabled()) {
    return res.status(400).json({ error: 'Link a payout account first.' });
  } else {
    // Stripe not configured yet — record it so the flow is testable, but
    // nothing actually moves until real keys are added.
    ledgerAdd(req.db, req.user.id, 'withdrawal', -amount, 'Payout (simulated — Stripe not configured)', { simulated: true });
  }
  await saveDB(req.db);
  res.json({ balance: balanceOf(req.db, req.user.id) });
});

// charge helper: wallet first, then Stripe. When the wallet doesn't cover
// it and Stripe is live, this returns a PaymentIntent for the browser to
// confirm with a real card — the purchase itself is only granted once the
// webhook confirms Stripe actually charged the card (see
// /api/payments/webhook). If Stripe isn't configured yet, falls back to a
// simulated charge so the whole app is still testable before real keys
// are added.
async function chargeOrIntent(db, user, amountCents, purpose, description, meta = {}) {
  const bal = balanceOf(db, user.id);
  if (bal >= amountCents) {
    ledgerAdd(db, user.id, 'purchase', -amountCents, description, meta);
    return { paid: true };
  }
  if (payments.enabled()) {
    const pi = await payments.createPaymentIntent(user, amountCents, purpose, meta);
    return { paid: false, clientSecret: pi.client_secret, amount: amountCents };
  }
  if (!user.paymentMethods.length) throw new Error('Add a card or top up your wallet first.');
  ledgerAdd(db, user.id, 'card_charge', 0, description + ' (simulated — Stripe not configured)', { ...meta, charged: amountCents, simulated: true });
  return { paid: true };
}
function maybePayReferral(db, user) {
  if (user.referredBy && !user.referralPaid) {
    const referrer = db.users.find(u => u.id === user.referredBy);
    if (referrer) {
      ledgerAdd(db, referrer.id, 'referral', PRICING.referralBonus, 'Referral bonus — ' + user.name);
      ledgerAdd(db, user.id, 'referral', PRICING.referralBonus, 'Welcome referral credit');
      user.referralPaid = true;
    }
  }
}

/* ============================ SUBSCRIPTION & UNLOCKS ============================ */
app.post('/api/billing/subscribe', requireAuth, async (req, res) => {
  const period = req.body?.period === 'annual' ? 'annual' : 'monthly';
  const tier = req.body?.tier === 'platinum' ? 'platinum' : 'pro';
  const tierConfig = PRICING[tier];
  try {
    if (!payments.enabled()) {
      // Stripe not configured yet — fall back to a one-time simulated
      // grant so the app stays testable. No real recurring charge exists
      // in this mode; see below for how real auto-renewal works.
      const amount = period === 'annual' ? tierConfig.annual : tierConfig.monthly;
      const days = period === 'annual' ? 365 : 30;
      const base = (req.user.plan === tier && isPro(req.user)) ? new Date(req.user.planUntil).getTime() : Date.now();
      req.user.plan = tier; req.user.planPeriod = period;
      req.user.planUntil = new Date(base + days * 86400000).toISOString();
      ledgerAdd(req.db, req.user.id, 'purchase', 0, `${tierConfig.label} — ${period} (simulated — Stripe not configured)`, { simulated: true });
      maybePayReferral(req.db, req.user);
      await saveDB(req.db);
      return res.json({ user: publicUser(req.user) });
    }
    // Real Stripe subscription: Stripe itself charges the card again
    // automatically at the end of every period, with zero code running
    // here to make that happen. Redirect the browser to Stripe's own
    // checkout page to collect the card.
    const appUrl = process.env.APP_URL || 'http://localhost:8888';
    const amount = period === 'annual' ? tierConfig.annual : tierConfig.monthly;
    const session = await payments.createSubscriptionCheckout(
      req.user,
      { amountCents: amount, interval: period === 'annual' ? 'year' : 'month', label: tierConfig.label + ' — ' + (period === 'annual' ? 'Annual' : 'Monthly'), tier },
      appUrl
    );
    await saveDB(req.db); // persists stripeCustomerId if it was just created
    res.json({ checkoutUrl: session.url });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/billing/cancel', requireAuth, async (req, res) => {
  try {
    if (req.user.stripeSubscriptionId && payments.enabled()) {
      // Stops the next auto-charge. Access continues until the period
      // already paid for runs out — Stripe tells us when via webhook.
      await payments.cancelSubscription(req.user.stripeSubscriptionId);
      await saveDB(req.db);
      return res.json({ user: publicUser(req.user), cancelsAtPeriodEnd: true });
    }
    req.user.plan = 'free';
    await saveDB(req.db);
    res.json({ user: publicUser(req.user) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/billing/unlock-pack', requireAuth, async (req, res) => {
  try {
    const result = await chargeOrIntent(req.db, req.user, PRICING.unlockPack.price, 'unlock_pack', `${PRICING.unlockPack.qty} listing unlocks`);
    if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }
    req.user.unlockCredits += PRICING.unlockPack.qty;
    maybePayReferral(req.db, req.user);
    await saveDB(req.db);
    res.json({ unlockCredits: req.user.unlockCredits });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

/* ============================ LISTINGS ============================ */
app.post('/api/listings', requireAuth, async (req, res) => {
  if (!req.user.emailVerified && req.user.role !== 'admin') return res.status(403).json({ error: 'Confirm your email before posting a listing.' });
  const b = req.body || {};
  if (!b.address || !b.city || !b.asking) return res.status(400).json({ error: 'Address, city, and asking price are required.' });
  const photos = (await Promise.all((Array.isArray(b.photos) ? b.photos : []).slice(0, 12).map(writeImage))).filter(Boolean);
  const listing = {
    id: crypto.randomUUID(), ownerId: req.user.id, ownerName: req.user.name, ownerEmail: req.user.email,
    address: String(b.address).trim(), city: String(b.city).trim(),
    propertyType: b.propertyType || 'Single family', situation: b.situation || 'Motivated seller',
    asking: Number(b.asking), arv: b.arv ? Number(b.arv) : null, rehab: b.rehab ? Number(b.rehab) : null,
    beds: b.beds ? Number(b.beds) : null, baths: b.baths ? Number(b.baths) : null,
    sqft: b.sqft ? Number(b.sqft) : null, year: b.year ? Number(b.year) : null,
    timeline: b.timeline || 'Flexible', notes: String(b.notes || '').slice(0, 1500),
    videoUrl: String(b.videoUrl || '').slice(0, 300) || null,
    photos, boostUntil: null, boostWeight: 0, spotlightUntil: null,
    freshAt: new Date().toISOString(), closedVerified: false,
    createdAt: new Date().toISOString()
  };
  req.db.listings.push(listing); await saveDB(req.db);
  notifyPlatinumMatches(req.db, listing).catch(e => console.error('[alerts]', e.message));
  res.json({ listing });
});

// Platinum: email a match the instant a new listing goes up, before
// anyone else sees it — the actual thing "early access" always should
// have meant. A hard price/city/type check, not the full ranking
// algorithm — a real estate alert should be simple to reason about.
async function notifyPlatinumMatches(db, listing) {
  const candidates = db.users.filter(u =>
    isPlatinum(u) && u.id !== listing.ownerId && u.settings?.notifyOnMatch !== false
  );
  for (const u of candidates) {
    const boxes = getBuyBoxes(u);
    const hit = boxes.find(bb => {
      if (!bb.active) return false;
      if (listing.asking < bb.minPrice || listing.asking > bb.maxPrice) return false;
      if (bb.cities.length && !bb.cities.some(c => listing.city.toLowerCase().includes(c.toLowerCase()))) return false;
      if (bb.propertyTypes.length && !bb.propertyTypes.includes(listing.propertyType)) return false;
      return true;
    });
    if (hit) mailer.sendMatchAlert(u.email, u.name, listing).catch(e => console.error('[mail]', e.message));
  }
}

function gateListing(listing, user, db) {
  // Free users see everything EXCEPT exact address, contact and notes until unlocked.
  const unlocked = user && (hasFullAccess(user) || listing.ownerId === user.id ||
    db.unlocks.some(u => u.userId === user.id && u.listingId === listing.id));
  if (unlocked) return { ...listing, locked: false };
  const { address, notes, ownerEmail, videoUrl, ...rest } = listing;
  return { ...rest, address: 'Address hidden', notes: null, ownerEmail: null, videoUrl: null, locked: true };
}

app.get('/api/listings/:id', async (req, res) => {
  const db = await loadDB();
  const listing = db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  const viewer = db.users.find(u => u.id === req.session.userId);

  if (viewer && viewer.id !== listing.ownerId) {
    db.views.push({ id: crypto.randomUUID(), listingId: listing.id, userId: viewer.id, at: new Date().toISOString() });
    await saveDB(db);
  }
  const owner = db.users.find(u => u.id === listing.ownerId);
  const gated = gateListing(listing, viewer, db);
  const others = db.listings.filter(l => l.ownerId === listing.ownerId && l.id !== listing.id)
    .map(l => ({ id: l.id, address: gated.locked ? 'Address hidden' : l.address, asking: l.asking, photos: l.photos }));
  res.json({
    listing: gated,
    owner: owner ? { ...publicProfileUser(owner), email: gated.locked ? null : owner.email, phone: gated.locked ? null : owner.phone } : null,
    otherListings: others,
    unlockCredits: viewer ? viewer.unlockCredits : 0,
    access: viewer ? { pro: isPro(viewer), platinum: isPlatinum(viewer), trial: inTrial(viewer), full: hasFullAccess(viewer) } : null,
    reviews: db.reviews.filter(r => r.aboutUserId === listing.ownerId)
  });
});

app.post('/api/listings/:id/unlock', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Not found.' });
  if (req.db.unlocks.some(u => u.userId === req.user.id && u.listingId === listing.id)) return res.json({ ok: true, already: true });

  if (req.user.unlockCredits > 0) {
    req.user.unlockCredits -= 1;
  } else {
    let result;
    try { result = await chargeOrIntent(req.db, req.user, PRICING.unlockCredit, 'listing_unlock', 'Listing unlock — ' + listing.address, { listingId: listing.id }); }
    catch (e) { return res.status(400).json({ error: e.message }); }
    if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }
    maybePayReferral(req.db, req.user);
  }
  req.db.unlocks.push({ id: crypto.randomUUID(), userId: req.user.id, listingId: listing.id, at: new Date().toISOString() });
  await saveDB(req.db);
  res.json({ ok: true, unlockCredits: req.user.unlockCredits });
});

app.delete('/api/listings/:id', requireAuth, async (req, res) => {
  const i = req.db.listings.findIndex(l => l.id === req.params.id);
  if (i === -1) return res.status(404).json({ error: 'Not found.' });
  if (req.db.listings[i].ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your listing.' });
  req.db.listings.splice(i, 1); await saveDB(req.db); res.json({ ok: true });
});

app.get('/api/users/:id/listings', async (req, res) => {
  const db = await loadDB();
  const owner = db.users.find(u => u.id === req.params.id);
  if (!owner) return res.status(404).json({ error: 'User not found.' });
  const viewer = db.users.find(u => u.id === req.session.userId);
  res.json({
    owner: publicProfileUser(owner),
    listings: db.listings.filter(l => l.ownerId === owner.id).map(l => gateListing(l, viewer, db)),
    followerCount: db.follows.filter(f => f.followingId === owner.id).length,
    reviews: db.reviews.filter(r => r.aboutUserId === owner.id)
  });
});

/* ============================ FEED ALGORITHM ============================ */
function scoreOneBuyBox(bb, listing) {
  let score = 0; const reasons = [];
  if (!bb?.active) return { score, reasons };
  if (listing.asking >= bb.minPrice && listing.asking <= bb.maxPrice) { score += 220; reasons.push('In your price range'); }
  else { const d = listing.asking < bb.minPrice ? bb.minPrice - listing.asking : listing.asking - bb.maxPrice; score -= Math.min(200, d / 2000); }
  if (bb.cities.length) {
    if (bb.cities.some(c => listing.city.toLowerCase().includes(c.toLowerCase()))) { score += 180; reasons.push('In a market you follow'); }
    else score -= 60;
  }
  if (bb.propertyTypes.length && bb.propertyTypes.includes(listing.propertyType)) { score += 90; reasons.push('Property type match'); }
  const sp = listing.arv ? listing.arv - listing.asking : 0;
  if (bb.minSpread && sp >= bb.minSpread) { score += 140; reasons.push('Spread above your minimum'); }
  return { score, reasons };
}

function scoreListing(listing, viewer, db) {
  let score = 0; const reasons = []; const now = Date.now();
  const promoActive = listing.boostUntil && new Date(listing.boostUntil).getTime() > now;
  if (promoActive) { score += (listing.boostWeight || 1000); reasons.push('Promoted'); }
  if (listing.spotlightUntil && new Date(listing.spotlightUntil).getTime() > now) score += 300;

  if (viewer) {
    // Platinum can run several buy boxes at once — score against all of
    // them and use whichever one this listing fits best, so a match on
    // ANY saved box surfaces the listing, not just the first one.
    const boxes = getBuyBoxes(viewer);
    let best = { score: 0, reasons: [] };
    for (const bb of boxes) {
      const r = scoreOneBuyBox(bb, listing);
      if (r.score > best.score) best = r;
    }
    score += best.score;
    reasons.push(...best.reasons);
  }
  const spread = listing.arv ? listing.arv - listing.asking : 0;
  if (spread > 0) score += Math.min(150, spread / 1000);
  const ageDays = (now - new Date(listing.freshAt || listing.createdAt).getTime()) / 86400000;
  score += Math.max(0, 120 - ageDays * 10);
  if (ageDays < 1) reasons.push('New today');
  const saves = db.saves.filter(s => s.listingId === listing.id).length;
  score += Math.min(120, saves * 15);
  if (saves >= 3) reasons.push('Popular with buyers');
  if (viewer && db.follows.some(f => f.followerId === viewer.id && f.followingId === listing.ownerId)) { score += 160; reasons.push('From someone you follow'); }
  const owner = db.users.find(u => u.id === listing.ownerId);
  if (owner?.verified) { score += 80; }
  if (listing.photos?.length) score += 60;
  if (listing.closedVerified) score -= 900;
  return { score, reasons: reasons.slice(0, 3) };
}

app.get('/api/feed', async (req, res) => {
  const db = await loadDB();
  const viewer = db.users.find(u => u.id === req.session.userId) || null;
  const saved = viewer ? new Set(db.saves.filter(s => s.userId === viewer.id).map(s => s.listingId)) : new Set();
  const now = Date.now();
  const feed = db.listings.map(l => {
    const { score, reasons } = scoreListing(l, viewer, db);
    const owner = db.users.find(u => u.id === l.ownerId);
    const gated = gateListing(l, viewer, db);
    return {
      ...gated, _score: score, matchReasons: reasons,
      ownerAvatar: owner?.avatarUrl || null, ownerVerified: !!owner?.verified,
      saveCount: db.saves.filter(s => s.listingId === l.id).length,
      savedByMe: saved.has(l.id),
      isBoosted: !!(l.boostUntil && new Date(l.boostUntil).getTime() > now),
      isSpotlight: !!(l.spotlightUntil && new Date(l.spotlightUntil).getTime() > now),
      demo: !!l.demo
    };
  }).sort((a, b) => b._score - a._score);
  res.json({ feed, access: viewer ? { pro: isPro(viewer), platinum: isPlatinum(viewer), trial: inTrial(viewer), full: hasFullAccess(viewer) } : null });
});

/* ============================ PROMOTIONS ============================ */
app.get('/api/promotions/tiers', async (req, res) => res.json({ tiers: Object.values(PRICING.promotions) }));
app.post('/api/promotions/buy', requireAuth, async (req, res) => {
  const { listingId, tierId } = req.body || {};
  const listing = req.db.listings.find(l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
  const tier = PRICING.promotions[tierId];
  if (!tier) return res.status(400).json({ error: 'Unknown promotion.' });

  // Platinum: one Super Boost included free per calendar month.
  const thisMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const freeBoostAvailable = tierId === 'superboost' && isPlatinum(req.user) && req.user.lastFreeBoostMonth !== thisMonth;

  let usedFreeBoost = false;
  if (freeBoostAvailable) {
    usedFreeBoost = true;
    req.user.lastFreeBoostMonth = thisMonth;
  } else {
    let result;
    try { result = await chargeOrIntent(req.db, req.user, tier.price, 'promotion', tier.label + ' — ' + listing.address, { listingId, tierId }); }
    catch (e) { return res.status(400).json({ error: e.message }); }
    if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }
  }

  if (tierId === 'bump') {
    listing.freshAt = new Date().toISOString();
  } else if (tierId === 'spotlight') {
    const base = Math.max(Date.now(), listing.spotlightUntil ? new Date(listing.spotlightUntil).getTime() : 0);
    listing.spotlightUntil = new Date(base + tier.hours * 3600000).toISOString();
  } else {
    const base = Math.max(Date.now(), listing.boostUntil ? new Date(listing.boostUntil).getTime() : 0);
    listing.boostUntil = new Date(base + tier.hours * 3600000).toISOString();
    listing.boostWeight = Math.max(listing.boostWeight || 0, tier.weight);
  }
  req.db.promotions.push({ id: crypto.randomUUID(), listingId, userId: req.user.id, tierId, price: usedFreeBoost ? 0 : tier.price, freeWithPlatinum: usedFreeBoost, at: new Date().toISOString() });
  if (!usedFreeBoost) maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ listing, usedFreeBoost });
});

/* ============================ SELLER ANALYTICS ============================ */
app.get('/api/listings/:id/analytics', requireAuth, async (req, res) => {
  const l = req.db.listings.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found.' });
  if (l.ownerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your listing.' });
  const views = req.db.views.filter(v => v.listingId === l.id);
  const saves = req.db.saves.filter(s => s.listingId === l.id);
  const unlocks = req.db.unlocks.filter(u => u.listingId === l.id);
  const offers = req.db.offers.filter(o => o.listingId === l.id);
  const spend = req.db.promotions.filter(p => p.listingId === l.id).reduce((s, p) => s + p.price, 0);
  res.json({
    views: views.length, uniqueViewers: new Set(views.map(v => v.userId)).size,
    saves: saves.length, unlocks: unlocks.length, offers: offers.length,
    promoSpend: spend,
    saveRate: views.length ? Math.round(saves.length / views.length * 100) : 0,
    interested: saves.map(s => ({ name: s.userName, email: s.userEmail, at: s.at }))
  });
});

/* ============================ OFFERS ============================ */
app.post('/api/offers', requireAuth, async (req, res) => {
  const { listingId, amount, terms, closeDays } = req.body || {};
  const listing = req.db.listings.find(l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (!amount) return res.status(400).json({ error: 'Offer amount is required.' });
  const offer = {
    id: crypto.randomUUID(), listingId, listingAddress: listing.address,
    buyerId: req.user.id, buyerName: req.user.name, sellerId: listing.ownerId,
    amount: Number(amount), terms: String(terms || '').slice(0, 600),
    closeDays: Number(closeDays) || null, status: 'pending', at: new Date().toISOString()
  };
  req.db.offers.push(offer); await saveDB(req.db);
  res.json({ offer });
});
app.get('/api/offers', requireAuth, async (req, res) => {
  res.json({
    received: req.db.offers.filter(o => o.sellerId === req.user.id),
    sent: req.db.offers.filter(o => o.buyerId === req.user.id)
  });
});
app.post('/api/offers/:id/respond', requireAuth, async (req, res) => {
  const o = req.db.offers.find(x => x.id === req.params.id);
  if (!o) return res.status(404).json({ error: 'Not found.' });
  if (o.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your offer to answer.' });
  const { status, counterAmount } = req.body || {};
  if (!['accepted','declined','countered'].includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  o.status = status;
  if (status === 'countered') o.counterAmount = Number(counterAmount) || null;
  await saveDB(req.db); res.json({ offer: o });
});

/* ============================ REVIEWS ============================ */
app.post('/api/reviews', requireAuth, async (req, res) => {
  const { aboutUserId, rating, body } = req.body || {};
  const r = Number(rating);
  if (!aboutUserId || !(r >= 1 && r <= 5)) return res.status(400).json({ error: 'Rating must be 1–5.' });
  if (aboutUserId === req.user.id) return res.status(400).json({ error: "You can't review yourself." });
  const dealt = req.db.offers.some(o => o.status === 'accepted' &&
    ((o.buyerId === req.user.id && o.sellerId === aboutUserId) || (o.sellerId === req.user.id && o.buyerId === aboutUserId)));
  if (!dealt) return res.status(403).json({ error: 'You can only review someone after an accepted deal.' });
  const review = { id: crypto.randomUUID(), aboutUserId, byUserId: req.user.id, byName: req.user.name, rating: r, body: String(body || '').slice(0, 600), at: new Date().toISOString() };
  req.db.reviews.push(review); await saveDB(req.db);
  res.json({ review });
});

/* ============================ VERIFICATION ============================ */
app.post('/api/verify/request', requireAuth, async (req, res) => {
  if (req.user.verified) return res.status(409).json({ error: 'Already verified.' });
  if (isPlatinum(req.user)) {
    // Included free with Platinum — still goes through the same admin
    // review before the badge is actually granted, just no charge.
    req.user.verificationPending = true;
    await saveDB(req.db);
    return res.json({ ok: true, waived: true });
  }
  let result;
  try { result = await chargeOrIntent(req.db, req.user, PRICING.verificationFee, 'verification', 'Seller verification'); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }
  req.user.verificationPending = true;
  maybePayReferral(req.db, req.user);
  await saveDB(req.db); res.json({ ok: true });
});
app.get('/api/admin/verifications', requireAuth, requireAdmin, async (req, res) => {
  res.json({ pending: req.db.users.filter(u => u.verificationPending && !u.verified).map(publicUser) });
});
app.post('/api/admin/verify-user', requireAuth, requireAdmin, async (req, res) => {
  const u = req.db.users.find(x => x.id === req.body?.userId);
  if (!u) return res.status(404).json({ error: 'Not found.' });
  u.verified = true; u.verificationPending = false; await saveDB(req.db); res.json({ ok: true });
});


/* ====================== ADDRESS AUTOCOMPLETE ====================== */
app.get('/api/address/config', async (req, res) => {
  res.json({ enabled: addressAutocompleteConfigured() });
});

app.post('/api/address/autocomplete', requireAuth, async (req, res) => {
  if (!addressAutocompleteConfigured()) {
    return res.status(503).json({ error: 'Address suggestions are not configured.' });
  }
  if (!checkAddressRate(req.user.id)) {
    return res.status(429).json({ error: 'Too many address lookups. Please wait a moment.' });
  }
  const input = String(req.body?.input || '').trim().slice(0, 180);
  const sessionToken = String(req.body?.sessionToken || '').trim().slice(0, 120);
  if (input.length < 3) return res.json({ suggestions: [] });

  const body = {
    input,
    includedRegionCodes: ['us'],
    languageCode: 'en',
    regionCode: 'us',
    includeQueryPredictions: false
  };
  if (sessionToken) body.sessionToken = sessionToken;

  try {
    const upstream = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.structuredFormat.mainText.text,suggestions.placePrediction.structuredFormat.secondaryText.text'
      },
      body: JSON.stringify(body)
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('[address autocomplete]', upstream.status, data?.error?.message || 'Google Places error');
      return res.status(502).json({ error: 'Address suggestions are temporarily unavailable.' });
    }
    const suggestions = (data.suggestions || []).map(x => x.placePrediction).filter(Boolean).slice(0, 5).map(pred => ({
      placeId: pred.placeId,
      text: pred.text?.text || '',
      mainText: pred.structuredFormat?.mainText?.text || pred.text?.text || '',
      secondaryText: pred.structuredFormat?.secondaryText?.text || ''
    })).filter(x => x.placeId && x.text);
    res.json({ suggestions });
  } catch (e) {
    console.error('[address autocomplete]', e.message);
    res.status(502).json({ error: 'Address suggestions are temporarily unavailable.' });
  }
});

app.post('/api/address/details', requireAuth, async (req, res) => {
  if (!addressAutocompleteConfigured()) {
    return res.status(503).json({ error: 'Address suggestions are not configured.' });
  }
  if (!checkAddressRate(req.user.id)) {
    return res.status(429).json({ error: 'Too many address lookups. Please wait a moment.' });
  }
  const placeId = String(req.body?.placeId || '').trim();
  const sessionToken = String(req.body?.sessionToken || '').trim().slice(0, 120);
  if (!/^[A-Za-z0-9_-]{8,300}$/.test(placeId)) return res.status(400).json({ error: 'Invalid address selection.' });

  const q = new URLSearchParams({ languageCode: 'en', regionCode: 'us' });
  if (sessionToken) q.set('sessionToken', sessionToken);
  try {
    const upstream = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}?${q.toString()}`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
        'X-Goog-FieldMask': 'formattedAddress,addressComponents'
      }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      console.error('[address details]', upstream.status, data?.error?.message || 'Google Places error');
      return res.status(502).json({ error: 'That address could not be completed automatically.' });
    }
    const address = normalizeGoogleAddress(data);
    if (address.countryCode && address.countryCode !== 'US') {
      return res.status(400).json({ error: 'Shipping is currently available only within the United States.' });
    }
    res.json({ address });
  } catch (e) {
    console.error('[address details]', e.message);
    res.status(502).json({ error: 'That address could not be completed automatically.' });
  }
});

/* ============================ SHOP / MARKETPLACE ============================ */
const SHOP_CATEGORIES = ['Appliances','HVAC','Plumbing','Electrical','Flooring','Doors & Windows','Lighting','Cabinets & Counters','Roofing','Tools','Fixtures','Other'];


app.get('/api/ai/status', requireAuth, async (req, res) => {
  res.json({ configured: ai.configured(), available: req.user.role === 'admin' || isPlatinum(req.user), model: ai.configured() ? ai.model() : null });
});
app.post('/api/ai/listing-copy', requireAuth, async (req, res) => {
  const kind = ['shop','property','cj'].includes(req.body?.kind) ? req.body.kind : 'shop';
  const isAdmin = req.user.role === 'admin' && policy.isAdminEmail(req.user.email);
  if (kind === 'cj' && !isAdmin) return res.status(403).json({ error: 'Admin only.' });
  if (!isAdmin && !isPlatinum(req.user)) return res.status(403).json({ error: 'AI listing assistance is a Platinum feature.' });
  if (!ai.configured()) return res.status(503).json({ error: 'AI listing assistance is not configured yet.' });

  const day = new Date().toISOString().slice(0, 10);
  if (req.user.aiUsageDay !== day) { req.user.aiUsageDay = day; req.user.aiUsageCount = 0; }
  const limit = isAdmin ? 200 : 30;
  if (Number(req.user.aiUsageCount || 0) >= limit) return res.status(429).json({ error: 'Daily AI listing limit reached. Try again tomorrow.' });
  req.user.aiUsageCount = Number(req.user.aiUsageCount || 0) + 1;
  await saveDB(req.db);

  const facts = req.body?.facts && typeof req.body.facts === 'object' ? req.body.facts : {};
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : [];
  try {
    const draft = await ai.generateListingCopy({ kind, facts, images, allowedCategories: kind === 'property' ? [] : SHOP_CATEGORIES });
    if (draft.categorySuggestion && !SHOP_CATEGORIES.includes(draft.categorySuggestion) && kind !== 'property') draft.categorySuggestion = '';
    res.json({ draft, remainingToday: Math.max(0, limit - req.user.aiUsageCount) });
  } catch (e) {
    console.error('[ai listing]', e.message);
    res.status(502).json({ error: 'AI listing assistance is temporarily unavailable. ' + e.message });
  }
});
function customerSafeSupplierText(value) {
  return String(value || '')
    .replace(/https?:\/\/(?:www\.)?cjdropshipping\.com\S*/gi, '')
    .replace(/\bCJ\s*Dropshipping\b/gi, '')
    .replace(/\bCJDropshipping\b/gi, '')
    .replace(/\bCJ\b/gi, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .trim();
}

function publicShopPhotos(item) {
  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  if (!item.dropship) return photos;
  return photos.map((src, index) => /^https?:\/\//i.test(String(src))
    ? `/api/shop/items/${encodeURIComponent(item.id)}/photo/${index}`
    : src);
}
function publicShopItem(item) {
  return {
    id: item.id, title: customerSafeSupplierText(item.title), category: item.category, condition: item.condition,
    price: item.price, stock: item.stock, location: item.dropship ? '' : item.location, description: customerSafeSupplierText(item.description),
    photos: publicShopPhotos(item), sellerName: item.dropship ? (customerSafeSupplierText(item.sellerName) || 'Better Real Estate') : item.sellerName,
    dropship: !!item.dropship, shipDays: customerSafeSupplierText(item.shipDays) || null, createdAt: item.createdAt,
    variant: customerSafeSupplierText(item.cjVariantOption) || null, weightGrams: item.cjWeightGrams || null,
    dimensionsMm: (item.cjLengthMm && item.cjWidthMm && item.cjHeightMm)
      ? { length: item.cjLengthMm, width: item.cjWidthMm, height: item.cjHeightMm } : null
  };
}

function publicShopOrder(order) {
  return {
    id: order.id, itemId: order.itemId, title: customerSafeSupplierText(order.title),
    buyerId: order.buyerId, buyerName: order.buyerName,
    sellerId: order.sellerId, sellerName: order.dropship ? (customerSafeSupplierText(order.sellerName) || 'Better Real Estate') : order.sellerName,
    price: order.price, productPrice: order.productPrice,
    shippingCostCents: order.shippingCostCents || 0,
    fee: order.fee, net: order.net, status: order.status,
    shipStatus: order.shipStatus, tracking: order.tracking || null,
    shipping: order.shipping || null,
    platformFulfilled: !!order.dropship,
    estimatedDelivery: order.cjQuotedDays || null,
    at: order.at, shippedAt: order.shippedAt || null
  };
}

function publicFulfilmentStatus(so) {
  if (!so) return null;
  return {
    status: so.status || null,
    tracking: so.tracking || null,
    updatedAt: so.updatedAt || null
  };
}
app.get('/api/shop/categories', async (req, res) => res.json({
  categories: SHOP_CATEGORIES,
  sellableCategories: SHOP_CATEGORIES.filter(c => !policy.USER_BANNED_CATEGORIES.includes(c)),
  bannedCategories: policy.USER_BANNED_CATEGORIES,
  feeBps: PRICING.marketplaceFeeBps
}));

app.post('/api/shop/items', requireAuth, async (req, res) => {
  const b = req.body || {};
  if (!b.title || !b.price) return res.status(400).json({ error: 'Title and price are required.' });
  // Users may not list electronics. Admin dropship inventory is exempt
  // because supplier certification is collected before import.
  const banned = policy.checkShopItem(
    { title: b.title, description: b.description, category: b.category }, false);
  if (banned) return res.status(403).json({ error: banned });
  const item = {
    id: crypto.randomUUID(), sellerId: req.user.id, sellerName: req.user.name,
    title: String(b.title).slice(0, 120), category: SHOP_CATEGORIES.includes(b.category) ? b.category : 'Other',
    condition: b.condition || 'Used — good', price: Math.round(Number(b.price) * 100),
    stock: Number(b.stock) || 1, location: String(b.location || '').slice(0, 80),
    description: String(b.description || '').slice(0, 1000),
    photos: (await Promise.all((Array.isArray(b.photos) ? b.photos : []).slice(0, 6).map(writeImage))).filter(Boolean),
    active: true, createdAt: new Date().toISOString()
  };
  req.db.shopItems.push(item); await saveDB(req.db);
  res.json({ item });
});

app.get('/api/shop/items', async (req, res) => {
  const db = await loadDB();
  const { category, q } = req.query;
  let items = db.shopItems.filter(i => i.active && i.stock > 0);
  if (category && category !== 'All') items = items.filter(i => i.category === category);
  if (q) { const s = String(q).toLowerCase(); items = items.filter(i => i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s)); }
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ items: items.map(publicShopItem) });
});

app.get('/api/shop/items/:id/photo/:index', async (req, res) => {
  const db = await loadDB();
  const item = db.shopItems.find(i => i.id === req.params.id && i.active && i.stock > 0);
  if (!item) return res.status(404).end();
  const index = Number(req.params.index);
  if (!Number.isInteger(index) || index < 0) return res.status(404).end();
  const src = Array.isArray(item.photos) ? item.photos[index] : null;
  if (!src || !/^https?:\/\//i.test(String(src))) return res.status(404).end();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const upstream = await fetch(src, { signal: controller.signal, redirect: 'follow' });
    if (!upstream.ok) return res.status(404).end();
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    if (!/^image\//i.test(contentType)) return res.status(404).end();
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length > 8 * 1024 * 1024) return res.status(413).end();
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400, s-maxage=604800');
    res.send(buf);
  } catch {
    res.status(404).end();
  } finally {
    clearTimeout(timer);
  }
});

app.get('/api/shop/items/:id', async (req, res) => {
  const db = await loadDB();
  const item = db.shopItems.find(i => i.id === req.params.id && i.active && i.stock > 0);
  if (!item) return res.status(404).json({ error: 'Item unavailable.' });
  res.json({ item: publicShopItem(item) });
});


function isShopAdmin(user) {
  return !!user && user.role === 'admin' && policy.isAdminEmail(user.email);
}
function canManageShopItem(user, item) {
  return !!user && !!item && (isShopAdmin(user) || item.sellerId === user.id);
}
function managedShopItem(item, db, viewer) {
  const base = {
    ...publicShopItem(item),
    active: !!item.active,
    sellerId: item.sellerId,
    sellerName: item.sellerName,
    soldCount: db.orders.filter(o => o.itemId === item.id && o.status === 'paid').length,
    updatedAt: item.updatedAt || null,
    deleted: !!item.deleted
  };
  if (isShopAdmin(viewer)) {
    base.cost = Number(item.cost || 0) || 0;
    base.margin = Number(item.margin || 0) || 0;
    base.supplierId = item.supplierId || null;
    base.supplierSku = item.supplierSku || null;
    base.cjPid = item.cjPid || null;
    base.cjVid = item.cjVid || null;
    base.cjVariantSku = item.cjVariantSku || null;
    base.cjFromCountryCode = item.cjFromCountryCode || null;
    base.cjLastSyncAt = item.cjLastSyncAt || null;
  }
  return base;
}

// Listing management. Regular users only see/manage their own shop items;
// admins can manage every marketplace item, including CJ inventory.
app.get('/api/shop/manage', requireAuth, async (req, res) => {
  const admin = isShopAdmin(req.user);
  const includeDeleted = admin && String(req.query.includeDeleted || '') === '1';
  let items = req.db.shopItems.filter(i => includeDeleted || !i.deleted);
  if (!admin) items = items.filter(i => i.sellerId === req.user.id);
  items.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));
  res.json({ items: items.map(i => managedShopItem(i, req.db, req.user)), admin });
});

app.get('/api/shop/manage/:id', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.params.id && !i.deleted);
  if (!item) return res.status(404).json({ error: 'Shop listing not found.' });
  if (!canManageShopItem(req.user, item)) return res.status(403).json({ error: 'You cannot edit this listing.' });
  res.json({ item: managedShopItem(item, req.db, req.user) });
});

app.patch('/api/shop/items/:id', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.params.id && !i.deleted);
  if (!item) return res.status(404).json({ error: 'Shop listing not found.' });
  if (!canManageShopItem(req.user, item)) return res.status(403).json({ error: 'You cannot edit this listing.' });
  const b = req.body || {};

  const title = b.title === undefined ? item.title : String(b.title || '').trim().slice(0, 120);
  const description = b.description === undefined ? item.description : String(b.description || '').slice(0, 1000);
  const category = b.category === undefined ? item.category : (SHOP_CATEGORIES.includes(b.category) ? b.category : 'Other');
  if (!title) return res.status(400).json({ error: 'Title is required.' });

  // Apply the private-seller restricted-category policy on every edit too,
  // so a normal user cannot publish a compliant item and later turn it into
  // a prohibited electrical/appliance listing.
  if (!item.dropship) {
    const banned = policy.checkShopItem({ title, description, category }, false);
    if (banned) return res.status(403).json({ error: banned });
  }

  let priceCents = item.price;
  if (b.price !== undefined) {
    const dollars = Number(b.price);
    if (!Number.isFinite(dollars) || dollars <= 0) return res.status(400).json({ error: 'Price must be greater than $0.' });
    priceCents = Math.round(dollars * 100);
    if (item.dropship && Number(item.cost || 0) > 0 && priceCents <= Number(item.cost)) {
      return res.status(400).json({ error: 'Retail price must stay above the supplier cost.' });
    }
  }

  let stock = item.stock;
  if (b.stock !== undefined) {
    const n = Number(b.stock);
    if (!Number.isFinite(n) || n < 0) return res.status(400).json({ error: 'Quantity cannot be negative.' });
    stock = Math.floor(n);
  }

  if (b.photos !== undefined) {
    if (!Array.isArray(b.photos)) return res.status(400).json({ error: 'Photos must be a list.' });
    const next = [];
    const photoProxyPrefix = `/api/shop/items/${encodeURIComponent(item.id)}/photo/`;
    for (const photo of b.photos.slice(0, 6)) {
      if (typeof photo !== 'string') continue;
      if (photo.startsWith('data:image/')) {
        const stored = await writeImage(photo);
        if (stored) next.push(stored);
      } else if ((item.photos || []).includes(photo)) {
        // Existing stored image references may be retained/reordered.
        next.push(photo);
      } else if (photo.startsWith(photoProxyPrefix)) {
        // Customer-safe proxy URLs are what the editor receives for dropship
        // images. Resolve them back to the existing stored source by index so
        // removing one image does not accidentally discard every remaining one.
        const idxText = photo.slice(photoProxyPrefix.length);
        const idx = /^\d+$/.test(idxText) ? Number(idxText) : -1;
        const original = idx >= 0 ? (item.photos || [])[idx] : null;
        if (original) next.push(original);
      }
    }
    item.photos = [...new Set(next)].slice(0, 6);
  }

  item.title = title;
  item.category = category;
  item.condition = b.condition === undefined ? item.condition : String(b.condition || 'Used — good').slice(0, 60);
  item.price = priceCents;
  item.stock = stock;
  item.location = b.location === undefined ? item.location : String(b.location || '').slice(0, 80);
  item.description = description;
  if (b.active !== undefined) item.active = !!b.active;
  if (item.dropship) {
    item.margin = Math.max(0, item.price - (Number(item.cost || 0) || 0));
    if (b.price !== undefined) item.cjPricingMode = 'manual';
  }
  item.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ item: managedShopItem(item, req.db, req.user) });
});

app.delete('/api/shop/items/:id', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.params.id && !i.deleted);
  if (!item) return res.status(404).json({ error: 'Shop listing not found.' });
  if (!canManageShopItem(req.user, item)) return res.status(403).json({ error: 'You cannot delete this listing.' });
  // Soft-delete so completed orders, payout records and supplier-order history
  // retain a stable item reference. The item disappears from shop + management.
  item.active = false;
  item.deleted = true;
  item.deletedAt = new Date().toISOString();
  item.updatedAt = item.deletedAt;
  await saveDB(req.db);
  res.json({ ok: true });
});

// Shared by the instant (wallet/simulated) purchase path and the Stripe
// webhook, so a card-paid marketplace order is fulfilled exactly the same
// way as a wallet-paid one — fee split, stock, and dropship routing all
// happen in one place instead of being duplicated and risking drift.
function fulfilShopPurchase(db, item, buyer, shipping, pricing = {}) {
  const isDropship = !!item.dropship;
  const seller = db.users.find(u => u.id === item.sellerId);
  const feeBps = (seller && isPlatinum(seller)) ? PRICING.platinumFeeBps : PRICING.marketplaceFeeBps;
  const fee = isDropship ? 0 : Math.round(item.price * feeBps / 10000);
  const shippingCostCents = isDropship ? Math.max(0, Number(pricing.shippingCostCents || 0) || 0) : 0;
  const totalPrice = isDropship ? item.price + shippingCostCents : item.price;
  const net = item.price - fee;
  if (!isDropship) {
    ledgerAdd(db, item.sellerId, 'sale', net, 'Sold — ' + item.title + ' (after ' + (feeBps / 100) + '% fee)', { itemId: item.id, gross: item.price, fee });
  }
  item.stock -= 1; if (item.stock < 1) item.active = false;
  const order = {
    id: crypto.randomUUID(), itemId: item.id, title: customerSafeSupplierText(item.title),
    buyerId: buyer.id, buyerName: buyer.name, buyerEmail: buyer.email,
    sellerId: item.sellerId, sellerName: item.sellerName,
    price: totalPrice, productPrice: item.price, shippingCostCents,
    fee, net, status: 'paid', shipStatus: isDropship ? null : 'pending', tracking: null,
    shipping, dropship: isDropship,
    cjLogisticName: pricing.cjLogisticName || null,
    cjQuotedDays: pricing.cjQuotedDays || null,
    at: new Date().toISOString()
  };
  db.orders.push(order);
  if (isDropship) {
    const supplier = db.suppliers.find(s => s.id === item.supplierId) || null;
    db.supplierOrders.push(dropship.routeOrder({ order, item, supplier, buyer, shipping, crypto }));
  }
  return order;
}

async function quoteDropshipShipping(item, shipping) {
  if (!item?.dropship) return null;
  if (!item.cjVid && !item.supplierSku) return null;
  const sh = cjAdapter.normalizeShipping(shipping || {});
  if (!sh.line1 || !sh.city || !sh.state || !sh.zip) {
    const err = new Error('Street, city, state and ZIP are required for shipping.');
    err.status = 400;
    throw err;
  }
  const options = await cjAdapter.freightOptions({
    vid: item.cjVid || item.supplierSku,
    quantity: 1,
    fromCountryCode: item.cjFromCountryCode || 'CN',
    toCountryCode: sh.countryCode || 'US',
    zip: sh.zip
  });
  if (!options.length) {
    const err = new Error('No shipping method is available for this item to that address.');
    err.status = 400;
    throw err;
  }
  const best = options[0];
  return {
    logisticName: best.logisticName,
    shippingCostCents: Math.round(best.price * 100),
    days: best.days || '',
    options: options.slice(0, 8)
  };
}

app.post('/api/shop/shipping-quote', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.body?.itemId);
  if (!item || !item.active || item.stock < 1) return res.status(404).json({ error: 'Item unavailable.' });
  if (!item.dropship) return res.json({ shippingCostCents: 0, totalCents: item.price, days: '' });
  const supplier = req.db.suppliers.find(s => s.id === item.supplierId);
  if (supplier?.kind !== 'cj') return res.json({ shippingCostCents: 0, totalCents: item.price, days: item.shipDays || '' });
  if (!cjAdapter.configured()) return res.status(503).json({ error: 'Shipping quotes are temporarily unavailable.' });
  const shipping = cjAdapter.normalizeShipping(req.body?.shipping || {});
  try {
    const quote = await quoteDropshipShipping(item, shipping);
    res.json({
      shippingCostCents: quote.shippingCostCents,
      totalCents: item.price + quote.shippingCostCents,
      days: quote.days || ''
    });
  } catch (e) {
    const status = e.status || e.statusCode || 503;
    const safe = status >= 500
      ? 'Shipping is temporarily unavailable. Please try again in a moment.'
      : String(e.message || 'Shipping could not be calculated.').replace(/CJdropshipping|\bCJ\b/gi, 'shipping provider');
    res.status(status).json({ error: safe });
  }
});

app.post('/api/shop/buy', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.body?.itemId);
  if (!item || !item.active || item.stock < 1) return res.status(404).json({ error: 'Item unavailable.' });
  if (item.sellerId === req.user.id) return res.status(400).json({ error: "That's your own listing." });

  let shipping = req.body?.shipping || null;
  let pricing = { shippingCostCents: 0, cjLogisticName: null, cjQuotedDays: null };
  if (item.dropship) {
    shipping = cjAdapter.normalizeShipping(shipping || {});
    if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.zip) {
      return res.status(400).json({ error: 'Street, city, state and ZIP are required for shipped items.' });
    }
    const supplier = req.db.suppliers.find(s => s.id === item.supplierId);
    if (supplier?.kind === 'cj') {
      if (!cjAdapter.configured()) return res.status(503).json({ error: 'Shipping is temporarily unavailable. Please try again shortly.' });
      let quote;
      try {
        quote = await quoteDropshipShipping(item, shipping);
      } catch (e) {
        const status = e.status || e.statusCode || 503;
        const safe = status >= 500
          ? 'Shipping is temporarily unavailable. Please try again in a moment.'
          : String(e.message || 'Shipping could not be calculated.').replace(/CJdropshipping|\bCJ\b/gi, 'shipping provider');
        return res.status(status).json({ error: safe });
      }
      pricing = { shippingCostCents: quote.shippingCostCents, cjLogisticName: quote.logisticName, cjQuotedDays: quote.days };
    }
  }

  const amount = item.price + pricing.shippingCostCents;
  const expectedTotal = Number(req.body?.expectedTotalCents);
  if (Number.isFinite(expectedTotal) && expectedTotal > 0 && Math.round(expectedTotal) !== amount) {
    return res.status(409).json({
      error: `Shipping changed before checkout. New total is ${money(amount)}. Please review and try again.`,
      totalCents: amount,
      shippingCostCents: pricing.shippingCostCents
    });
  }
  let result;
  try {
    result = await chargeOrIntent(req.db, req.user, amount, 'shop_purchase', 'Purchase — ' + customerSafeSupplierText(item.title), {
      itemId: item.id,
      shipping: JSON.stringify(shipping || {}),
      shippingCostCents: String(pricing.shippingCostCents || 0),
      cjLogisticName: pricing.cjLogisticName || '',
      cjQuotedDays: pricing.cjQuotedDays || ''
    });
  } catch (e) { return res.status(400).json({ error: e.message }); }
  if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }

  const order = fulfilShopPurchase(req.db, item, req.user, shipping, pricing);
  maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ order: publicShopOrder(order), balance: balanceOf(req.db, req.user.id) });
});

app.get('/api/shop/orders', requireAuth, async (req, res) => {
  res.json({
    bought: req.db.orders.filter(o => o.buyerId === req.user.id).map(publicShopOrder),
    sold: req.db.orders.filter(o => o.sellerId === req.user.id).map(publicShopOrder)
  });
});

// Seller marks their own (non-dropship) sale shipped, with tracking.
app.post('/api/orders/:id/ship', requireAuth, async (req, res) => {
  const order = req.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.sellerId !== req.user.id) return res.status(403).json({ error: 'Not your sale.' });
  if (order.dropship) return res.status(400).json({ error: 'Dropship orders ship from the Fulfilment queue.' });
  const tracking = String(req.body?.tracking || '').slice(0, 120);
  order.shipStatus = 'shipped';
  order.tracking = tracking || null;
  order.shippedAt = new Date().toISOString();
  await saveDB(req.db);
  const buyer = req.db.users.find(u => u.id === order.buyerId);
  if (buyer) mailer.sendShippedNotice(buyer.email, buyer.name, customerSafeSupplierText(order.title), tracking).catch(e => console.error('[mail]', e.message));
  res.json({ order });
});

// Buyer reports an order that never shipped. Visible to admins to review.
app.post('/api/orders/:id/report', requireAuth, async (req, res) => {
  const order = req.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found.' });
  if (order.buyerId !== req.user.id) return res.status(403).json({ error: 'Not your order.' });
  if (req.db.reports.some(r => r.orderId === order.id && r.status === 'open')) {
    return res.status(409).json({ error: 'Already reported — an admin will review it.' });
  }
  const reason = String(req.body?.reason || '').slice(0, 500);
  const report = {
    id: crypto.randomUUID(), orderId: order.id, itemTitle: order.title,
    buyerId: req.user.id, buyerName: req.user.name, buyerEmail: req.user.email,
    sellerId: order.sellerId, sellerName: order.sellerName,
    reason, status: 'open', at: new Date().toISOString()
  };
  req.db.reports.push(report);
  await saveDB(req.db);
  res.json({ report });
});

app.get('/api/admin/reports', requireAuth, requireAdmin, async (req, res) => {
  res.json({ reports: req.db.reports.sort((a, b) => new Date(b.at) - new Date(a.at)) });
});
app.post('/api/admin/reports/:id/resolve', requireAuth, requireAdmin, async (req, res) => {
  const report = req.db.reports.find(r => r.id === req.params.id);
  if (!report) return res.status(404).json({ error: 'Not found.' });
  report.status = req.body?.status === 'dismissed' ? 'dismissed' : 'resolved';
  report.note = String(req.body?.note || '').slice(0, 500);
  report.resolvedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ report });
});

/* ============================ SOCIAL ============================ */
app.post('/api/saves/toggle', requireAuth, async (req, res) => {
  const { listingId } = req.body || {};
  const i = req.db.saves.findIndex(s => s.userId === req.user.id && s.listingId === listingId);
  if (i >= 0) { req.db.saves.splice(i, 1); await saveDB(req.db); return res.json({ saved: false }); }
  req.db.saves.push({ id: crypto.randomUUID(), userId: req.user.id, userName: req.user.name, userEmail: req.user.email, listingId, at: new Date().toISOString(), verified: false });
  await saveDB(req.db); res.json({ saved: true });
});
app.get('/api/saves/mine', requireAuth, async (req, res) => {
  const listings = req.db.saves.filter(s => s.userId === req.user.id)
    .map(s => req.db.listings.find(l => l.id === s.listingId)).filter(Boolean)
    .map(l => gateListing(l, req.user, req.db));
  res.json({ listings });
});

/* ---- Investor workspace (Platinum): compare saved properties, keep notes ---- */
app.get('/api/workspace', requireAuth, async (req, res) => {
  if (!isPlatinum(req.user)) return res.status(403).json({ error: 'The investor workspace is a Platinum feature.' });
  const listings = req.db.saves.filter(s => s.userId === req.user.id)
    .map(s => req.db.listings.find(l => l.id === s.listingId)).filter(Boolean)
    .map(l => gateListing(l, req.user, req.db));
  const notes = req.db.dealNotes.filter(n => n.userId === req.user.id);
  res.json({ listings, notes });
});
app.post('/api/workspace/notes', requireAuth, async (req, res) => {
  if (!isPlatinum(req.user)) return res.status(403).json({ error: 'The investor workspace is a Platinum feature.' });
  const { listingId, notes } = req.body || {};
  if (!listingId) return res.status(400).json({ error: 'Missing listingId.' });
  let entry = req.db.dealNotes.find(n => n.userId === req.user.id && n.listingId === listingId);
  if (!entry) { entry = { id: crypto.randomUUID(), userId: req.user.id, listingId }; req.db.dealNotes.push(entry); }
  entry.notes = String(notes || '').slice(0, 2000);
  entry.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ note: entry });
});

app.post('/api/follow', requireAuth, async (req, res) => {
  const { userId } = req.body || {};
  if (userId === req.user.id) return res.status(400).json({ error: "You can't follow yourself." });
  const i = req.db.follows.findIndex(f => f.followerId === req.user.id && f.followingId === userId);
  if (i >= 0) { req.db.follows.splice(i, 1); await saveDB(req.db); return res.json({ following: false }); }
  req.db.follows.push({ followerId: req.user.id, followingId: userId, at: new Date().toISOString() });
  await saveDB(req.db); res.json({ following: true });
});
app.get('/api/follow/status/:userId', requireAuth, async (req, res) =>
  res.json({ following: req.db.follows.some(f => f.followerId === req.user.id && f.followingId === req.params.userId) }));

app.post('/api/messages', requireAuth, async (req, res) => {
  const { toUserId, listingId, body } = req.body || {};
  if (!toUserId || !body) return res.status(400).json({ error: 'Message body is required.' });
  const msg = { id: crypto.randomUUID(), fromUserId: req.user.id, fromName: req.user.name, toUserId, listingId: listingId || null, body: String(body).slice(0, 2000), at: new Date().toISOString(), read: false };
  req.db.messages.push(msg); await saveDB(req.db); res.json({ message: msg });
});
app.get('/api/messages', requireAuth, async (req, res) => {
  const mine = req.db.messages.filter(m => m.toUserId === req.user.id || m.fromUserId === req.user.id).map(m => {
    const otherId = m.fromUserId === req.user.id ? m.toUserId : m.fromUserId;
    const other = req.db.users.find(u => u.id === otherId);
    const listing = m.listingId ? req.db.listings.find(l => l.id === m.listingId) : null;
    return { ...m, otherName: other?.name || 'Unknown', otherId, listingAddress: listing?.address || null, outgoing: m.fromUserId === req.user.id };
  }).sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ messages: mine });
});

/* ============================ LEADERBOARD & ADMIN ============================ */
app.get('/api/leaderboard', async (req, res) => {
  const db = await loadDB();
  const rows = db.users.filter(u => u.role !== 'admin').map(u => {
    const revs = db.reviews.filter(r => r.aboutUserId === u.id);
    const closed = db.saves.filter(s => s.verified && db.listings.find(l => l.id === s.listingId)?.ownerId === u.id).length;
    return {
      id: u.id, name: u.name, role: u.role, points: u.points, badge: badgeFor(u.points),
      avatarUrl: u.avatarUrl, verified: !!u.verified, closedDeals: closed,
      rating: revs.length ? (revs.reduce((s, r) => s + r.rating, 0) / revs.length).toFixed(1) : null,
      reviewCount: revs.length
    };
  }).sort((a, b) => b.points - a.points).slice(0, 50);
  res.json({ leaderboard: rows });
});
app.get('/api/admin/pending', requireAuth, requireAdmin, async (req, res) => {
  res.json({ pending: req.db.saves.filter(s => !s.verified).map(s => ({ ...s, listing: req.db.listings.find(l => l.id === s.listingId) })) });
});
app.post('/api/admin/verify', requireAuth, requireAdmin, async (req, res) => {
  const save = req.db.saves.find(s => s.id === req.body?.saveId);
  if (!save) return res.status(404).json({ error: 'Not found.' });
  if (save.verified) return res.status(409).json({ error: 'Already verified.' });
  save.verified = true;
  const listing = req.db.listings.find(l => l.id === save.listingId);
  if (listing) listing.closedVerified = true;
  const buyer = req.db.users.find(u => u.id === save.userId);
  const seller = listing ? req.db.users.find(u => u.id === listing.ownerId) : null;
  if (buyer) buyer.points += 100;
  if (seller) seller.points += 100;
  await saveDB(req.db); res.json({ ok: true });
});
app.get('/api/admin/revenue', requireAuth, requireAdmin, async (req, res) => {
  const promoRev = req.db.promotions.reduce((s, p) => s + p.price, 0);
  const feeRev = req.db.orders.reduce((s, o) => s + o.fee, 0);
  const unlockRev = req.db.ledger.filter(l => l.description?.startsWith('Listing unlock')).reduce((s, l) => s + Math.abs(l.meta?.charged || l.amount), 0);
  const subRev = req.db.ledger.filter(l => l.description?.includes('Better Pro')).reduce((s, l) => s + Math.abs(l.meta?.charged || l.amount), 0);
  res.json({ promoRev, feeRev, unlockRev, subRev, total: promoRev + feeRev + unlockRev + subRev,
    users: req.db.users.length, listings: req.db.listings.length, orders: req.db.orders.length });
});



/* ============================ STRIPE ============================ */
app.get('/api/payments/config', async (req, res) => {
  res.json({ enabled: payments.enabled(), publishableKey: payments.publishableKey() });
});

// Browser asks to start a payment. Nothing is granted here — the webhook
// grants it once Stripe confirms the money actually moved.
app.post('/api/payments/intent', requireAuth, async (req, res) => {
  const { purpose, listingId, tierId } = req.body || {};
  if (!payments.enabled()) return res.status(400).json({ error: 'Payments are not configured yet.' });

  let amount, meta = {};
  if (purpose === 'wallet_topup') {
    amount = Math.round(Number(req.body.amount) || 0);
    if (amount < 500) return res.status(400).json({ error: 'Minimum top-up is $5.00.' });
  } else if (purpose === 'unlock_pack') {
    amount = PRICING.unlockPack.price;
  } else if (purpose === 'promotion') {
    const tier = PRICING.promotions[tierId];
    if (!tier) return res.status(400).json({ error: 'Unknown promotion.' });
    const listing = req.db.listings.find(l => l.id === listingId);
    if (!listing || listing.ownerId !== req.user.id) return res.status(403).json({ error: 'Not your listing.' });
    amount = tier.price; meta = { listingId, tierId };
  } else if (purpose === 'verification') {
    amount = PRICING.verificationFee;
  } else if (purpose === 'listing_unlock') {
    const listing = req.db.listings.find(l => l.id === listingId);
    if (!listing) return res.status(404).json({ error: 'Listing not found.' });
    amount = PRICING.unlockCredit; meta = { listingId };
  } else {
    return res.status(400).json({ error: 'Unknown purchase type.' });
  }

  try {
    const pi = await payments.createPaymentIntent(req.user, amount, purpose, meta);
    await saveDB(req.db); // persists stripeCustomerId if it was just created
    res.json({ clientSecret: pi.client_secret, amount });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.post('/api/payments/setup-intent', requireAuth, async (req, res) => {
  try {
    const si = await payments.createSetupIntent(req.user);
    await saveDB(req.db);
    res.json({ clientSecret: si.client_secret });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/payments/methods', requireAuth, async (req, res) => {
  try { res.json({ methods: await payments.listPaymentMethods(req.user) }); }
  catch (e) { res.json({ methods: [], error: e.message }); }
});

/* ---- THE WEBHOOK: the only place money is credited ----
   Mounted with a raw body parser because Stripe signs the exact bytes. */
app.post('/api/payments/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    let event;
    try {
      event = payments.verifyWebhook(req.body, req.headers['stripe-signature']);
    } catch (e) {
      console.error('[stripe] signature verification failed:', e.message);
      return res.status(400).send('Invalid signature');
    }

    const db = await loadDB();
    try {
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object;
        const { userId, purpose, listingId, tierId } = pi.metadata || {};
        const user = db.users.find(u => u.id === userId);
        if (!user) { console.warn('[stripe] unknown user on', pi.id); return res.json({ received: true }); }

        // Idempotency: Stripe retries webhooks, so never apply one twice.
        if (db.ledger.some(l => l.meta?.paymentIntentId === pi.id)) {
          return res.json({ received: true, duplicate: true });
        }

        if (purpose === 'wallet_topup') {
          ledgerAdd(db, user.id, 'deposit', pi.amount, 'Wallet top-up', { paymentIntentId: pi.id });
        } else if (purpose === 'unlock_pack') {
          user.unlockCredits += PRICING.unlockPack.qty;
          ledgerAdd(db, user.id, 'purchase', 0, `${PRICING.unlockPack.qty} listing unlocks`, { paymentIntentId: pi.id, charged: pi.amount });
        } else if (purpose === 'promotion') {
          const listing = db.listings.find(l => l.id === listingId);
          const tier = PRICING.promotions[tierId];
          if (listing && tier) {
            if (tierId === 'bump') listing.freshAt = new Date().toISOString();
            else if (tierId === 'spotlight') {
              const base = Math.max(Date.now(), listing.spotlightUntil ? new Date(listing.spotlightUntil).getTime() : 0);
              listing.spotlightUntil = new Date(base + tier.hours * 3600000).toISOString();
            } else {
              const base = Math.max(Date.now(), listing.boostUntil ? new Date(listing.boostUntil).getTime() : 0);
              listing.boostUntil = new Date(base + tier.hours * 3600000).toISOString();
              listing.boostWeight = Math.max(listing.boostWeight || 0, tier.weight);
            }
            db.promotions.push({ id: crypto.randomUUID(), listingId, userId: user.id, tierId, price: pi.amount, at: new Date().toISOString() });
          }
          ledgerAdd(db, user.id, 'purchase', 0, (tier ? tier.label : 'Promotion'), { paymentIntentId: pi.id, charged: pi.amount, listingId });
        } else if (purpose === 'verification') {
          user.verificationPending = true;
          ledgerAdd(db, user.id, 'purchase', 0, 'Seller verification', { paymentIntentId: pi.id, charged: pi.amount });
        } else if (purpose === 'listing_unlock') {
          if (!db.unlocks.some(u => u.userId === user.id && u.listingId === listingId)) {
            db.unlocks.push({ id: crypto.randomUUID(), userId: user.id, listingId, at: new Date().toISOString() });
          }
          ledgerAdd(db, user.id, 'purchase', 0, 'Listing unlock', { paymentIntentId: pi.id, charged: pi.amount, listingId });
        } else if (purpose === 'pro_subscription') {
          const period = pi.metadata.period === 'annual' ? 'annual' : 'monthly';
          const days = period === 'annual' ? 365 : 30;
          const base = isPro(user) ? new Date(user.planUntil).getTime() : Date.now();
          user.plan = 'pro';
          user.planPeriod = period;
          user.planUntil = new Date(base + days * 86400000).toISOString();
          ledgerAdd(db, user.id, 'purchase', 0, `Better Pro — ${period === 'annual' ? '1 year' : '1 month'}`, { paymentIntentId: pi.id, charged: pi.amount });
        } else if (purpose === 'shop_purchase') {
          const item = db.shopItems.find(i => i.id === pi.metadata.itemId);
          if (item && item.stock > 0) {
            let shipping = null;
            try { shipping = JSON.parse(pi.metadata.shipping || 'null'); } catch {}
            fulfilShopPurchase(db, item, user, shipping, {
              shippingCostCents: Number(pi.metadata.shippingCostCents || 0) || 0,
              cjLogisticName: pi.metadata.cjLogisticName || null,
              cjQuotedDays: pi.metadata.cjQuotedDays || null
            });
          }
        }
        maybePayReferral(db, user);
        await saveDB(db);
      }

      if (event.type === 'checkout.session.completed') {
        const sess = event.data.object;
        const user = db.users.find(u => u.id === sess.metadata?.userId);
        if (user && sess.mode === 'subscription') {
          const period = sess.metadata?.period === 'annual' ? 'annual' : 'monthly';
          const tier = sess.metadata?.tier === 'platinum' ? 'platinum' : 'pro';
          user.plan = tier;
          user.planPeriod = period;
          user.stripeSubscriptionId = sess.subscription;
          // Approximate for right now — the invoice.payment_succeeded event
          // below fires moments later with Stripe's exact period end and
          // corrects this. Good enough as a starting value in the meantime.
          user.planUntil = new Date(Date.now() + (period === 'annual' ? 365 : 30) * 86400000).toISOString();
          maybePayReferral(db, user);
          await saveDB(db);
        }
      }

      if (event.type === 'invoice.payment_succeeded') {
        // Fires on the very first payment AND every automatic renewal
        // after that — this is the event that makes auto-renewal actually
        // work with zero further action from anyone. Stripe's own
        // period-end timestamp is used directly rather than adding days
        // ourselves, so it's exact regardless of month lengths or leap years.
        const inv = event.data.object;
        const user = db.users.find(u => u.stripeSubscriptionId === inv.subscription);
        const periodEnd = inv.lines?.data?.[0]?.period?.end;
        if (user) {
          // plan/tier was already set correctly by checkout.session.completed
          // above (or stays whatever it already was on a renewal) — this
          // event only needs to correct the exact expiry timestamp.
          user.planUntil = periodEnd ? new Date(periodEnd * 1000).toISOString() : new Date(Date.now() + 31 * 86400000).toISOString();
          const isRenewal = db.ledger.some(l => l.userId === user.id && l.description?.startsWith('Better Pro'));
          ledgerAdd(db, user.id, 'purchase', 0, isRenewal ? 'Better Pro — renewed automatically' : 'Better Pro — subscribed', { invoiceId: inv.id, charged: inv.amount_paid });
          await saveDB(db);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const user = db.users.find(u => u.stripeSubscriptionId === sub.id);
        if (user) { user.plan = 'free'; user.stripeSubscriptionId = null; await saveDB(db); }
      }

      if (event.type === 'charge.dispute.created') {
        console.error('[stripe] CHARGEBACK opened:', event.data.object.id, event.data.object.amount);
      }
    } catch (e) {
      console.error('[stripe] handler error:', e.message);
      return res.status(500).send('handler error');
    }
    res.json({ received: true });
  });

/* ============================ IMAGES (Netlify Blobs) ============================ */
app.get('/api/img/:key', async (req, res) => {
  try {
    const img = await readImage(req.params.key);
    if (!img) return res.status(404).end();
    res.set('Content-Type', img.contentType);
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(img.buffer);
  } catch (e) { res.status(500).end(); }
});

/* ============================ HEALTH ============================ */
app.get('/api/health', async (req, res) => {
  const out = { ok: true, time: new Date().toISOString() };
  try { const db = await loadDB(); out.db = 'connected'; out.users = db.users.length; out.listings = db.listings.length; }
  catch (e) { out.ok = false; out.db = 'error: ' + e.message; }
  out.mail = mailer.configured() ? 'configured' : 'console-only';
  out.appUrl = process.env.APP_URL || 'NOT SET — emails will link to localhost, which is why the link failed to open';
  out.payments = payments.enabled() ? (process.env.STRIPE_WEBHOOK_SECRET ? 'live' : 'key set but STRIPE_WEBHOOK_SECRET missing') : 'simulated';
  out.admins = policy.adminEmails().length;
  res.status(out.ok ? 200 : 503).json(out);
});

/* ============================ DROPSHIP / SUPPLIERS ============================ */
// Admin: register a supplier
app.post('/api/admin/suppliers', requireAuth, requireAdmin, async (req, res) => {
  const { name, kind, markupPercent, shipDays, notes } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Supplier name is required.' });
  const supplier = {
    id: crypto.randomUUID(), name: String(name).slice(0, 80),
    kind: kind || 'manual', markupPercent: Number(markupPercent) || 60,
    shipDays: String(shipDays || '3-7'), notes: String(notes || '').slice(0, 400),
    active: true, createdAt: new Date().toISOString()
  };
  req.db.suppliers.push(supplier);
  await saveDB(req.db);
  res.json({ supplier });
});

app.get('/api/admin/suppliers', requireAuth, requireAdmin, async (req, res) => {
  res.json({ suppliers: req.db.suppliers, kinds: dropship.KINDS });
});

// Admin: import a batch of supplier products into the shop
app.post('/api/admin/suppliers/:id/import', requireAuth, requireAdmin, async (req, res) => {
  const supplier = req.db.suppliers.find(s => s.id === req.params.id);
  if (!supplier) return res.status(404).json({ error: 'Supplier not found.' });
  const rows = Array.isArray(req.body?.products) ? req.body.products : [];
  if (!rows.length) return res.status(400).json({ error: 'No products supplied.' });

  const created = [];
  for (const row of rows.slice(0, 200)) {
    // CJ freight is quoted live at checkout. Never bake a manual CJ shipping
    // estimate into the product markup and then charge live freight again.
    const pricingRow = supplier.kind === 'cj' ? { ...row, shipping: 0, ship_cost: 0 } : row;
    const priced = dropship.priceItem(pricingRow, supplier);
    if (!priced) continue;
    const item = {
      id: crypto.randomUUID(), sellerId: req.user.id, sellerName: 'Better Real Estate',
      title: priced.title, category: priced.category, condition: 'New in box',
      price: priced.retailCents, cost: priced.costCents, margin: priced.marginCents,
      stock: priced.stock, location: priced.shipsFrom || 'Ships direct',
      description: priced.description,
      photos: Array.isArray(row.photos) ? row.photos.filter(p => typeof p === 'string' && p.startsWith('http')).slice(0, 6) : [],
      supplierId: supplier.id, supplierSku: priced.sku, dropship: true,
      cjPid: row.cjPid || null,
      cjVid: row.cjVid || (supplier.kind === 'cj' ? priced.sku : null),
      cjVariantSku: row.cjVariantSku || null,
      cjFromCountryCode: row.cjFromCountryCode || null,
      cjProductSku: row.cjProductSku || null,
      cjCategoryName: row.cjCategoryName || null,
      shipDays: row.shipDays || supplier.shipDays,
      active: true, demo: false, createdAt: new Date().toISOString()
    };
    req.db.shopItems.push(item);
    created.push(item);
  }
  await saveDB(req.db);
  res.json({ imported: created.length, items: created });
});

// Supplier-routed orders (what the fulfilment queue works from)
app.get('/api/admin/supplier-orders', requireAuth, requireAdmin, async (req, res) => {
  res.json({ orders: req.db.supplierOrders.sort((a, b) => new Date(b.at) - new Date(a.at)) });
});

app.post('/api/admin/supplier-orders/:id/status', requireAuth, requireAdmin, async (req, res) => {
  const so = req.db.supplierOrders.find(o => o.id === req.params.id);
  if (!so) return res.status(404).json({ error: 'Not found.' });
  const { status, tracking } = req.body || {};
  if (!dropship.STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status.' });
  const justShipped = status === 'shipped' && so.status !== 'shipped';
  so.status = status;
  if (tracking) so.tracking = String(tracking).slice(0, 120);
  so.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  if (justShipped && so.buyerEmail) {
    mailer.sendShippedNotice(so.buyerEmail, so.buyerName, customerSafeSupplierText(so.title), so.tracking).catch(e => console.error('[mail]', e.message));
  }
  res.json({ order: so });
});

/* ---- CJdropshipping API 2.0: catalog, freight, order placement + status ---- */
app.get('/api/admin/cj/status', requireAuth, requireAdmin, async (req, res) => {
  res.json({ connected: cjAdapter.configured(), apiVersion: '2.0' });
});

app.post('/api/admin/cj/test', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'Set CJ_API_KEY first.' });
  await cjAdapter.getAccessToken();
  res.json({ ok: true });
});

app.get('/api/admin/cj/products', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected. Set CJ_API_KEY.' });
  const result = await cjAdapter.searchProducts({
    query: String(req.query.q || '').trim(),
    page: Number(req.query.page || 1),
    size: Number(req.query.size || 16),
    countryCode: String(req.query.country || '').trim(),
    freeShipping: String(req.query.freeShipping || '') === '1'
  });
  res.json(result);
});

app.get('/api/admin/cj/products/:pid', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected. Set CJ_API_KEY.' });
  const product = await cjAdapter.getProduct(req.params.pid, String(req.query.country || '').trim());
  const suggestedCategory = dropship.guessCategory(`${product.name || ''} ${product.categoryName || ''}`);
  product.suggestedCategory = suggestedCategory;
  product.variants = (product.variants || []).map(v => {
    const costCents = Math.round((Number(v.price) || 0) * 100);
    const autoRetailCents = dropship.smartRetailCents(costCents, v.suggestedPrice);
    return {
      ...v,
      autoRetailCents,
      autoMarginCents: Math.max(0, autoRetailCents - costCents)
    };
  });
  res.json({ product });
});

app.post('/api/admin/cj/import', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected. Set CJ_API_KEY.' });
  const supplier = req.db.suppliers.find(s => s.id === req.body?.supplierId && s.kind === 'cj');
  if (!supplier) return res.status(404).json({ error: 'CJdropshipping supplier not found. Add a CJ supplier first.' });

  const pid = String(req.body?.pid || '').trim();
  const vid = String(req.body?.vid || '').trim();
  if (!pid || !vid) return res.status(400).json({ error: 'CJ product and variant are required.' });
  if (req.db.shopItems.some(i => i.cjVid === vid && i.active)) {
    return res.status(409).json({ error: 'That CJ variant is already live in your marketplace.' });
  }

  const product = await cjAdapter.getProduct(pid);
  const variant = (product.variants || []).find(v => v.vid === vid);
  if (!variant) return res.status(404).json({ error: 'CJ variant not found on that product.' });
  if (!variant.price || variant.price <= 0) return res.status(400).json({ error: 'CJ did not return a valid price for that variant.' });
  if (!variant.stock || variant.stock < 1) return res.status(400).json({ error: 'That CJ variant is currently out of stock.' });

  await cjAdapter.addToMyProduct(pid);

  const defaultTitle = variant.option && !String(product.name || '').toLowerCase().includes(String(variant.option).toLowerCase())
    ? `${product.name || variant.name} — ${variant.option}`
    : (product.name || variant.name || 'CJ product');
  const customTitle = String(req.body?.title || '').trim();
  const title = customerSafeSupplierText((customTitle || defaultTitle).slice(0, 120)) || 'Product';
  const requestedCategory = String(req.body?.category || '');
  const category = dropship.VALID_CATEGORIES.includes(requestedCategory)
    ? requestedCategory : dropship.guessCategory(`${title} ${product.categoryName || ''}`);

  const costCents = Math.round(variant.price * 100);
  const autoRetailCents = dropship.smartRetailCents(costCents, variant.suggestedPrice);
  const requestedRetail = Number(req.body?.retailPrice);
  const manualRetailCents = Number.isFinite(requestedRetail) && requestedRetail > 0
    ? Math.round(requestedRetail * 100) : null;
  if (manualRetailCents && manualRetailCents <= costCents) {
    return res.status(400).json({ error: 'Retail price must be higher than the current CJ product cost.' });
  }
  const retailCents = manualRetailCents || autoRetailCents;
  const usingAutoPrice = !manualRetailCents || Math.abs(manualRetailCents - autoRetailCents) <= 1;
  if (!retailCents || retailCents <= costCents) {
    return res.status(400).json({ error: 'Could not calculate a profitable retail price for that CJ variant.' });
  }

  const sourcePhotos = [...new Set([variant.image, product.image, ...(product.images || [])].filter(Boolean))].slice(0, 6);
  let photos = sourcePhotos;
  if (req.body?.photos !== undefined) {
    if (!Array.isArray(req.body.photos)) return res.status(400).json({ error: 'Photos must be a list.' });
    const requested = [...new Set(req.body.photos.filter(p => typeof p === 'string' && p))].slice(0, 6);
    const invalid = requested.find(p => !sourcePhotos.includes(p));
    if (invalid) return res.status(400).json({ error: 'One or more selected product photos are invalid.' });
    photos = requested;
  }
  const generatedDescription = [
    product.description,
    variant.option ? `Option: ${variant.option}` : '',
    variant.weight ? `Approx. product weight: ${variant.weight} g.` : '',
    (variant.lengthMm && variant.widthMm && variant.heightMm)
      ? `Approx. dimensions: ${variant.lengthMm} × ${variant.widthMm} × ${variant.heightMm} mm.` : ''
  ].filter(Boolean).join('\n\n').slice(0, 1000);
  const requestedDescription = String(req.body?.description || '').trim();
  const description = customerSafeSupplierText((requestedDescription || generatedDescription).slice(0, 1000));
  const actualMarkupPercent = Math.round(((retailCents / costCents) - 1) * 1000) / 10;

  const item = {
    id: crypto.randomUUID(), sellerId: req.user.id, sellerName: 'Better Real Estate',
    title, category, condition: 'New in box',
    price: retailCents, cost: costCents, margin: retailCents - costCents,
    stock: variant.stock,
    location: variant.fromCountryCode === 'US' ? 'United States' : 'International fulfillment',
    description, photos,
    supplierId: supplier.id, supplierSku: variant.vid, dropship: true,
    cjPid: pid, cjVid: variant.vid, cjVariantSku: variant.sku,
    cjBarcode: variant.barcode || null,
    cjVariantOption: variant.option || null,
    cjFromCountryCode: variant.fromCountryCode || 'CN', cjProductSku: product.sku || null,
    cjCategoryId: product.categoryId || null, cjCategoryName: product.categoryName || null,
    cjWeightGrams: variant.weight || product.weight || null,
    cjLengthMm: variant.lengthMm || null, cjWidthMm: variant.widthMm || null, cjHeightMm: variant.heightMm || null,
    cjSuggestedPrice: variant.suggestedPrice || null,
    cjPricingMode: usingAutoPrice ? 'auto' : 'manual',
    cjAutoRetailCents: autoRetailCents,
    cjMarkupPercent: actualMarkupPercent,
    cjLastSyncAt: new Date().toISOString(),
    shipDays: product.deliveryCycle || supplier.shipDays,
    active: true, demo: false, createdAt: new Date().toISOString()
  };
  req.db.shopItems.push(item);
  await saveDB(req.db);
  res.json({ item });
});

async function refreshSupplierOrderFreight(so) {
  const sh = cjAdapter.normalizeShipping(so.shipping || {});
  if (!sh.zip) throw new Error('This order has no ZIP code, so CJ freight cannot be quoted.');
  const options = await cjAdapter.freightOptions({
    vid: so.cjVid || so.supplierSku,
    quantity: so.qty || 1,
    fromCountryCode: so.cjFromCountryCode || 'CN',
    toCountryCode: sh.countryCode || 'US',
    zip: sh.zip
  });
  if (!options.length) throw new Error('CJ returned no available shipping methods for this order.');
  const selected = options[0];
  so.cjLogisticName = selected.logisticName;
  so.cjQuotedDays = selected.days || null;
  so.shippingCostCents = Math.round(selected.price * 100);
  so.costCents = (Number(so.productCostCents ?? so.costCents ?? 0) || 0) + so.shippingCostCents;
  so.updatedAt = new Date().toISOString();
  return { selected, options };
}

app.get('/api/admin/supplier-orders/:id/cj-quote', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected.' });
  const so = req.db.supplierOrders.find(o => o.id === req.params.id);
  if (!so) return res.status(404).json({ error: 'Not found.' });
  if (so.supplierKind !== 'cj') return res.status(400).json({ error: 'This is not a CJ order.' });
  const { selected, options } = await refreshSupplierOrderFreight(so);
  await saveDB(req.db);
  res.json({ order: so, selected, options: options.slice(0, 8) });
});

app.post('/api/admin/supplier-orders/:id/send-to-cj', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected. Set CJ_API_KEY.' });
  const so = req.db.supplierOrders.find(o => o.id === req.params.id);
  if (!so) return res.status(404).json({ error: 'Not found.' });
  if (so.cjOrderId) return res.status(409).json({ error: 'Already sent to CJ — order ' + so.cjOrderId });
  if (so.supplierKind !== 'cj') return res.status(400).json({ error: 'This is not a CJ order.' });

  // Re-quote immediately before creating the CJ order so we do not submit a
  // shipping method that disappeared since the customer checked out.
  await refreshSupplierOrderFreight(so);
  const result = await cjAdapter.placeOrder(so);
  if (!result.cjOrderId) throw new Error('CJ created the request but did not return an order ID. Check the CJ dashboard before retrying.');
  so.cjOrderId = result.cjOrderId;
  so.cjPayUrl = result.cjPayUrl || null;
  so.cjOrderAmountCents = result.orderAmount != null ? Math.round(result.orderAmount * 100) : null;
  so.cjPostageAmountCents = result.postageAmount != null ? Math.round(result.postageAmount * 100) : null;
  // Once CJ returns its own order total, use it as the authoritative supplier
  // cost for margin reporting. This also catches a CJ product-price change that
  // happened after the item was imported.
  if (so.cjOrderAmountCents && so.cjOrderAmountCents > 0) {
    so.costCents = so.cjOrderAmountCents;
    if (so.cjPostageAmountCents != null) {
      so.shippingCostCents = so.cjPostageAmountCents;
      so.productCostCents = Math.max(0, so.cjOrderAmountCents - so.cjPostageAmountCents);
    }
  }
  so.cjRawStatus = result.status || 'CREATED';
  so.status = 'ordered';
  so.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ order: so, payUrl: so.cjPayUrl });
});

app.post('/api/admin/supplier-orders/:id/check-cj-status', requireAuth, requireAdmin, async (req, res) => {
  if (!cjAdapter.configured()) return res.status(400).json({ error: 'CJdropshipping is not connected.' });
  const so = req.db.supplierOrders.find(o => o.id === req.params.id);
  if (!so) return res.status(404).json({ error: 'Not found.' });
  if (!so.cjOrderId) return res.status(400).json({ error: "Hasn't been sent to CJ yet." });
  const info = await cjAdapter.getOrderStatus(so.cjOrderId);
  if (!info) return res.json({ order: so, cjStatus: null });
  const justShipped = !!info.trackingNumber && so.status !== 'shipped';
  if (info.trackingNumber) { so.tracking = info.trackingNumber; so.status = 'shipped'; }
  if (info.status === 'DELIVERED') so.status = 'delivered';
  if (info.status === 'CANCELLED') so.status = 'cancelled';
  so.cjRawStatus = info.status;
  so.cjTrackingProvider = info.trackingProvider || so.cjTrackingProvider || null;
  so.cjTrackingUrl = info.trackingUrl || so.cjTrackingUrl || null;
  so.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  if (justShipped && so.buyerEmail) {
    mailer.sendShippedNotice(so.buyerEmail, so.buyerName, customerSafeSupplierText(so.title), so.tracking).catch(e => console.error('[mail]', e.message));
  }
  res.json({ order: so, cjStatus: info.status });
});

// Buyer-facing tracking
app.get('/api/orders/:id/tracking', requireAuth, async (req, res) => {
  const order = req.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found.' });
  const admin = isShopAdmin(req.user);
  if (order.buyerId !== req.user.id && !admin) return res.status(403).json({ error: 'Not your order.' });
  const so = req.db.supplierOrders.find(s => s.orderId === order.id);
  if (admin) return res.json({ order, fulfilment: so || null });
  res.json({ order: publicShopOrder(order), fulfilment: publicFulfilmentStatus(so) });
});

// Catches anything thrown or rejected in any route above (see the
// app.get/post/patch/delete wrapper near the top of this file). Always
// the last app.use() — Express only routes here when a handler calls
// next(err) or throws.
app.use((err, req, res, next) => {
  console.error('[error]', req.method, req.originalUrl, '—', err.message);
  const status = err.status || err.statusCode || 500;
  res.status(status).json({
    error: status === 500
      ? (err.message || 'Something went wrong on our end. Please try again in a moment.')
      : err.message
  });
});

if (require.main === module) {
  app.listen(PORT, () => console.log(`Better Real Estate running at http://localhost:${PORT}`));
}

module.exports = app;
