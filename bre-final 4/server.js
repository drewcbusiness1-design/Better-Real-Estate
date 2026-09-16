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
const policy = require('./policy');
const payments = require('./payments');
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
  pro: { monthly: 2900, label: 'Better Pro' },  // $29/mo
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

const publicUser = u => { if (!u) return null; const { passwordHash, ...r } = u; return r; };
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
  return user.plan === 'pro' && user.planUntil && new Date(user.planUntil) > new Date();
}
function inTrial(user) {
  return user.trialUntil && new Date(user.trialUntil) > new Date();
}
function hasFullAccess(user) { return isPro(user) || inTrial(user) || user.role === 'admin'; }


/* ============================ AUTH ============================ */
app.post('/api/signup', async (req, res) => {
  const { name, email, password, role, referralCode } = req.body || {};
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
    buyBox: defaultBuyBox(), settings: defaultSettings(),
    plan: 'free', planUntil: null, trialUntil,
    unlockCredits: PRICING.freeUnlocks,
    verified: false,
    paymentMethods: [], payoutMethod: null,
    emailVerified: false,
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
    access: u ? { pro: isPro(u), trial: inTrial(u), full: hasFullAccess(u) } : null
  });
});
app.get('/api/pricing', async (req, res) => res.json({ pricing: PRICING }));


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

app.get('/api/site/status', async (req, res) => res.json({ mailConfigured: mailer.configured() }));

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
app.patch('/api/me/buybox', requireAuth, async (req, res) => {
  const b = req.body || {};
  req.user.buyBox = {
    ...defaultBuyBox(), ...req.user.buyBox,
    minPrice: Number(b.minPrice) || 0, maxPrice: Number(b.maxPrice) || 2000000,
    cities: Array.isArray(b.cities) ? b.cities : String(b.cities || '').split(',').map(s => s.trim()).filter(Boolean),
    propertyTypes: Array.isArray(b.propertyTypes) ? b.propertyTypes : [],
    minSpread: Number(b.minSpread) || 0, active: b.active !== false
  };
  await saveDB(req.db); res.json({ buyBox: req.user.buyBox });
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
  if (!req.user.paymentMethods.length) return res.status(400).json({ error: 'Add a card first.' });
  // TODO(stripe): create a PaymentIntent and only credit the ledger from the webhook.
  ledgerAdd(req.db, req.user.id, 'deposit', amount, 'Wallet top-up', { simulated: true });
  maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ balance: balanceOf(req.db, req.user.id) });
});
app.post('/api/wallet/payout-method', requireAuth, async (req, res) => {
  const { accountName, last4 } = req.body || {};
  if (!accountName || !/^\d{4}$/.test(String(last4 || ''))) return res.status(400).json({ error: 'Account name and last 4 digits are required.' });
  // TODO(stripe): replace with a Stripe Connect account link; never collect full bank numbers here.
  req.user.payoutMethod = { accountName: String(accountName).slice(0, 80), last4: String(last4), connectedAt: new Date().toISOString() };
  await saveDB(req.db); res.json({ payoutMethod: req.user.payoutMethod });
});
app.post('/api/wallet/withdraw', requireAuth, async (req, res) => {
  const amount = Math.round(Number(req.body?.amount) || 0);
  const bal = balanceOf(req.db, req.user.id);
  if (!req.user.payoutMethod) return res.status(400).json({ error: 'Connect a payout account first.' });
  if (amount < PRICING.minWithdrawal) return res.status(400).json({ error: `Minimum withdrawal is ${money(PRICING.minWithdrawal)}.` });
  if (amount > bal) return res.status(400).json({ error: 'Withdrawal exceeds your balance.' });
  // TODO(stripe): create a Transfer/Payout via Stripe Connect; mark completed on webhook.
  ledgerAdd(req.db, req.user.id, 'withdrawal', -amount, 'Payout to ' + req.user.payoutMethod.accountName, { simulated: true });
  req.db.payouts.push({ id: crypto.randomUUID(), userId: req.user.id, amount, status: 'pending', at: new Date().toISOString() });
  await saveDB(req.db);
  res.json({ balance: balanceOf(req.db, req.user.id) });
});

// charge helper: wallet first, then card
function charge(db, user, amountCents, description, meta = {}) {
  const bal = balanceOf(db, user.id);
  if (bal >= amountCents) {
    ledgerAdd(db, user.id, 'purchase', -amountCents, description, meta);
    return { source: 'wallet' };
  }
  if (!user.paymentMethods.length) throw new Error('Add a card or top up your wallet first.');
  // TODO(stripe): charge the saved payment method here; credit only on webhook success.
  ledgerAdd(db, user.id, 'card_charge', 0, description + ' (card •••• ' + user.paymentMethods[0].last4 + ')', { ...meta, charged: amountCents, simulated: true });
  return { source: 'card' };
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
  try {
    charge(req.db, req.user, PRICING.pro.monthly, 'Better Pro — 1 month');
    const base = isPro(req.user) ? new Date(req.user.planUntil).getTime() : Date.now();
    req.user.plan = 'pro';
    req.user.planUntil = new Date(base + 30 * 86400000).toISOString();
    maybePayReferral(req.db, req.user);
    await saveDB(req.db);
    res.json({ user: publicUser(req.user) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/billing/cancel', requireAuth, async (req, res) => {
  req.user.plan = 'free'; await saveDB(req.db); res.json({ user: publicUser(req.user) });
});
app.post('/api/billing/unlock-pack', requireAuth, async (req, res) => {
  try {
    charge(req.db, req.user, PRICING.unlockPack.price, `${PRICING.unlockPack.qty} listing unlocks`);
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
  res.json({ listing });
});

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
    owner: owner ? { ...publicUser(owner), email: gated.locked ? null : owner.email, phone: gated.locked ? null : owner.phone } : null,
    otherListings: others,
    unlockCredits: viewer ? viewer.unlockCredits : 0,
    access: viewer ? { pro: isPro(viewer), trial: inTrial(viewer), full: hasFullAccess(viewer) } : null,
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
    try { charge(req.db, req.user, PRICING.unlockCredit, 'Listing unlock — ' + listing.address, { listingId: listing.id }); }
    catch (e) { return res.status(400).json({ error: e.message }); }
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
    owner: publicUser(owner),
    listings: db.listings.filter(l => l.ownerId === owner.id).map(l => gateListing(l, viewer, db)),
    followerCount: db.follows.filter(f => f.followingId === owner.id).length,
    reviews: db.reviews.filter(r => r.aboutUserId === owner.id)
  });
});

/* ============================ FEED ALGORITHM ============================ */
function scoreListing(listing, viewer, db) {
  let score = 0; const reasons = []; const now = Date.now();
  const promoActive = listing.boostUntil && new Date(listing.boostUntil).getTime() > now;
  if (promoActive) { score += (listing.boostWeight || 1000); reasons.push('Promoted'); }
  if (listing.spotlightUntil && new Date(listing.spotlightUntil).getTime() > now) score += 300;

  if (viewer?.buyBox?.active) {
    const bb = viewer.buyBox;
    if (listing.asking >= bb.minPrice && listing.asking <= bb.maxPrice) { score += 220; reasons.push('In your price range'); }
    else { const d = listing.asking < bb.minPrice ? bb.minPrice - listing.asking : listing.asking - bb.maxPrice; score -= Math.min(200, d / 2000); }
    if (bb.cities.length) {
      if (bb.cities.some(c => listing.city.toLowerCase().includes(c.toLowerCase()))) { score += 180; reasons.push('In a market you follow'); }
      else score -= 60;
    }
    if (bb.propertyTypes.length && bb.propertyTypes.includes(listing.propertyType)) { score += 90; reasons.push('Property type match'); }
    const sp = listing.arv ? listing.arv - listing.asking : 0;
    if (bb.minSpread && sp >= bb.minSpread) { score += 140; reasons.push('Spread above your minimum'); }
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
  res.json({ feed, access: viewer ? { pro: isPro(viewer), trial: inTrial(viewer), full: hasFullAccess(viewer) } : null });
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
  try { charge(req.db, req.user, tier.price, tier.label + ' — ' + listing.address, { listingId }); }
  catch (e) { return res.status(400).json({ error: e.message }); }

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
  req.db.promotions.push({ id: crypto.randomUUID(), listingId, userId: req.user.id, tierId, price: tier.price, at: new Date().toISOString() });
  maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ listing });
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
  try { charge(req.db, req.user, PRICING.verificationFee, 'Seller verification'); }
  catch (e) { return res.status(400).json({ error: e.message }); }
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

/* ============================ SHOP / MARKETPLACE ============================ */
const SHOP_CATEGORIES = ['Appliances','HVAC','Plumbing','Electrical','Flooring','Doors & Windows','Lighting','Cabinets & Counters','Roofing','Tools','Fixtures','Other'];
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
  res.json({ items });
});

app.post('/api/shop/buy', requireAuth, async (req, res) => {
  const item = req.db.shopItems.find(i => i.id === req.body?.itemId);
  if (!item || !item.active || item.stock < 1) return res.status(404).json({ error: 'Item unavailable.' });
  if (item.sellerId === req.user.id) return res.status(400).json({ error: "That's your own listing." });
  try { charge(req.db, req.user, item.price, 'Purchase — ' + item.title, { itemId: item.id }); }
  catch (e) { return res.status(400).json({ error: e.message }); }

  const isDropship = !!item.dropship;
  const fee = isDropship ? 0 : Math.round(item.price * PRICING.marketplaceFeeBps / 10000);
  const net = item.price - fee;
  if (!isDropship) {
    ledgerAdd(req.db, item.sellerId, 'sale', net, 'Sold — ' + item.title + ' (after ' + (PRICING.marketplaceFeeBps/100) + '% fee)', { itemId: item.id, gross: item.price, fee });
  }
  item.stock -= 1; if (item.stock < 1) item.active = false;
  const shipping = req.body?.shipping || null;
  const order = { id: crypto.randomUUID(), itemId: item.id, title: item.title, buyerId: req.user.id, buyerName: req.user.name, sellerId: item.sellerId, price: item.price, fee, net, status: 'paid', shipping, dropship: !!item.dropship, at: new Date().toISOString() };
  req.db.orders.push(order);

  // Dropship items go into the fulfilment queue instead of paying a user out.
  if (item.dropship) {
    const supplier = req.db.suppliers.find(s => s.id === item.supplierId) || null;
    req.db.supplierOrders.push(dropship.routeOrder({ order, item, supplier, buyer: req.user, shipping, crypto }));
  }
  maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ order, balance: balanceOf(req.db, req.user.id) });
});

app.get('/api/shop/orders', requireAuth, async (req, res) => {
  res.json({
    bought: req.db.orders.filter(o => o.buyerId === req.user.id),
    sold: req.db.orders.filter(o => o.sellerId === req.user.id)
  });
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

/* ---- Stripe Connect: seller payouts ---- */
app.post('/api/payments/connect', requireAuth, async (req, res) => {
  try {
    const appUrl = process.env.APP_URL || 'http://localhost:8888';
    const { accountId, url } = await payments.createConnectAccount(req.user, appUrl);
    req.user.stripeAccountId = accountId;
    await saveDB(req.db);
    res.json({ url });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

app.get('/api/payments/connect/status', requireAuth, async (req, res) => {
  try { res.json({ status: await payments.connectAccountStatus(req.user.stripeAccountId) }); }
  catch (e) { res.json({ status: null }); }
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
        }
        maybePayReferral(db, user);
        await saveDB(db);
      }

      if (event.type === 'checkout.session.completed') {
        const sess = event.data.object;
        const user = db.users.find(u => u.id === sess.metadata?.userId);
        if (user && sess.mode === 'subscription') {
          user.plan = 'pro';
          user.stripeSubscriptionId = sess.subscription;
          user.planUntil = new Date(Date.now() + 31 * 86400000).toISOString();
          maybePayReferral(db, user);
          await saveDB(db);
        }
      }

      if (event.type === 'invoice.payment_succeeded') {
        const inv = event.data.object;
        const user = db.users.find(u => u.stripeSubscriptionId === inv.subscription);
        if (user) {
          user.plan = 'pro';
          user.planUntil = new Date(Date.now() + 31 * 86400000).toISOString();
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
    const priced = dropship.priceItem(row, supplier);
    if (!priced) continue;
    const item = {
      id: crypto.randomUUID(), sellerId: req.user.id, sellerName: 'Better Real Estate',
      title: priced.title, category: priced.category, condition: 'New in box',
      price: priced.retailCents, cost: priced.costCents, margin: priced.marginCents,
      stock: priced.stock, location: priced.shipsFrom || 'Ships direct',
      description: priced.description,
      photos: Array.isArray(row.photos) ? row.photos.filter(p => typeof p === 'string' && p.startsWith('http')) : [],
      supplierId: supplier.id, supplierSku: priced.sku, dropship: true,
      shipDays: supplier.shipDays,
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
  so.status = status;
  if (tracking) so.tracking = String(tracking).slice(0, 120);
  so.updatedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ order: so });
});

// Buyer-facing tracking
app.get('/api/orders/:id/tracking', requireAuth, async (req, res) => {
  const order = req.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Not found.' });
  if (order.buyerId !== req.user.id && req.user.role !== 'admin') return res.status(403).json({ error: 'Not your order.' });
  const so = req.db.supplierOrders.find(s => s.orderId === order.id);
  res.json({ order, fulfilment: so || null });
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
