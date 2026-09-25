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
const communications = require('./communications');
const social = require('./social');
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
  wholesale: { monthly: 14900, annual: 150000, label: 'Better Wholesale Teams', seats: 5 },
  platinumFeeBps: 400,             // marketplace fee for Platinum sellers (vs 700 = 7% standard)
  maxBuyBoxes: { free: 1, seller: 1, buyer: 1, admin: 1, pro: 1, platinum: 5, wholesale: 5 },
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

const publicUser = u => { if (!u) return null; const { passwordHash, marketingOptIn, marketingConsentAt, marketingUnsubscribedAt, marketingLastSentAt, marketingSequence, aiUsageDay, aiUsageCount, verificationEmailLastError, ...r } = u; return r; };
const publicProfileUser = social.publicProfileUser;
const friendRelationship = social.friendRelationship;
const socialUserCard = social.socialUserCard;

function normalizeUsername(v) {
  return String(v || '').trim().toLowerCase().replace(/^@+/, '');
}
function usernameValid(v) { return /^[a-z0-9._]{3,30}$/.test(v) && !v.startsWith('.') && !v.endsWith('.'); }
function usernameTaken(db, username, exceptUserId = null) {
  const u = normalizeUsername(username);
  return db.users.some(x => x.id !== exceptUserId && normalizeUsername(x.username) === u);
}
function baseUsername(name, email) {
  const raw = String(name || email?.split('@')[0] || 'member').toLowerCase().replace(/[^a-z0-9._]+/g, '.').replace(/^\.+|\.+$/g, '').slice(0, 24);
  return usernameValid(raw) ? raw : ('member.' + crypto.randomBytes(2).toString('hex'));
}
function ensureUsername(db, user) {
  if (!user || (user.username && usernameValid(normalizeUsername(user.username)) && !usernameTaken(db, user.username, user.id))) return false;
  const base = baseUsername(user?.name, user?.email);
  let candidate = base, n = 2;
  while (usernameTaken(db, candidate, user.id)) candidate = (base.slice(0, 25) + '.' + n++).slice(0, 30);
  user.username = candidate;
  return true;
}
function publicCompany(c) {
  if (!c) return null;
  return { id: c.id, ownerId: c.ownerId, name: c.name, slug: c.slug, logoUrl: c.logoUrl || null, bio: c.bio || '', website: c.website || '', markets: c.markets || [], seatLimit: c.seatLimit || PRICING.wholesale.seats, createdAt: c.createdAt || null };
}
function companyForUser(db, user) { return user?.companyId ? (db.companies || []).find(c => c.id === user.companyId) || null : null; }
function slugifyCompany(v) { return String(v || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48) || 'company'; }
function uniqueCompanySlug(db, name, exceptId = null) {
  const base = slugifyCompany(name); let slug = base, n = 2;
  while ((db.companies || []).some(c => c.id !== exceptId && c.slug === slug)) slug = `${base.slice(0, 42)}-${n++}`;
  return slug;
}
function companyEntitlementUntilForOwner(owner) {
  if (!owner) return null;
  if (isAdminUser(owner)) return '9999-12-31T23:59:59.999Z';
  const paidUntil = owner.plan === 'wholesale' && owner.planUntil && new Date(owner.planUntil) > new Date() ? owner.planUntil : null;
  const grant = activeMembershipGrant(owner);
  const grantUntil = grant?.plan === 'wholesale' ? grant.until : null;
  if (!paidUntil) return grantUntil;
  if (!grantUntil) return paidUntil;
  return new Date(paidUntil) >= new Date(grantUntil) ? paidUntil : grantUntil;
}
function syncCompanyMemberEntitlements(db, owner) {
  if (!owner) return false;
  const company = (db.companies || []).find(c => c.ownerId === owner.id);
  if (!company) return false;
  const until = companyEntitlementUntilForOwner(owner);
  let changed = false;
  for (const member of db.users.filter(u => u.companyId === company.id && u.id !== owner.id)) {
    if ((member.companyPlanUntil || null) !== until) { member.companyPlanUntil = until; changed = true; }
  }
  return changed;
}
function syncOneCompanyMember(db, user) {
  if (!user?.companyId || user.companyRole === 'owner') return false;
  const company = companyForUser(db, user); if (!company) { user.companyId = null; user.companyRole = null; user.companyPlanUntil = null; return true; }
  const owner = db.users.find(u => u.id === company.ownerId);
  const until = companyEntitlementUntilForOwner(owner);
  if ((user.companyPlanUntil || null) !== until) { user.companyPlanUntil = until; return true; }
  return false;
}
async function requireAuth(req, res, next) {
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not signed in' });
  let changed = ensureUsername(db, user);
  if (syncOneCompanyMember(db, user)) changed = true;
  if (changed) await saveDB(db);
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

const defaultBuyBox = () => ({ minPrice: 0, maxPrice: 2000000, cities: [], propertyTypes: [], minSpread: 0, active: true, public: false, strategy: '', updatedAt: null });
const defaultSettings = () => ({
  theme: 'light',
  feedDensity: 'comfortable',
  notifyOnMessage: true,
  messageEmailDelayMinutes: 60,
  notifyOnMatch: true,
  showMembershipLevel: true,
  tutorialCompletedVersion: 0,
  tutorialDismissedVersion: 0,
  // Admin-only preference. Undefined on older accounts intentionally behaves
  // as ON so the site owner starts receiving signup notifications immediately.
  notifyOnNewSignup: true
});
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
function isAdminUser(user) {
  return !!user && user.role === 'admin' && policy.isAdminEmail(user.email);
}
function isCompanyEntitled(user) { return !!(user?.companyPlanUntil && new Date(user.companyPlanUntil) > new Date()); }
const GRANT_TIERS = new Set(['pro', 'platinum', 'wholesale']);
function activeMembershipGrant(user) {
  if (!user || !GRANT_TIERS.has(String(user.grantPlan || ''))) return null;
  const until = user.grantUntil ? new Date(user.grantUntil) : null;
  if (!until || !Number.isFinite(until.getTime()) || until <= new Date()) return null;
  return { plan: user.grantPlan, until: until.toISOString(), reason: user.grantReason || null, grantedAt: user.grantedAt || null };
}
function grantIncludes(user, tier) {
  const g = activeMembershipGrant(user);
  if (!g) return false;
  const rank = { pro: 1, platinum: 2, wholesale: 3 };
  return (rank[g.plan] || 0) >= (rank[tier] || 99);
}
function isWholesale(user) {
  if (isAdminUser(user)) return true;
  return !!user && (
    (user.plan === 'wholesale' && user.planUntil && new Date(user.planUntil) > new Date()) ||
    grantIncludes(user, 'wholesale') ||
    isCompanyEntitled(user)
  );
}
function isPro(user) {
  if (isAdminUser(user)) return true;
  return !!user && (
    ((user.plan === 'pro' || user.plan === 'platinum' || user.plan === 'wholesale') && user.planUntil && new Date(user.planUntil) > new Date()) ||
    grantIncludes(user, 'pro') ||
    isCompanyEntitled(user)
  );
}
function isPlatinum(user) {
  if (isAdminUser(user)) return true;
  return !!user && (
    ((user.plan === 'platinum' || user.plan === 'wholesale') && user.planUntil && new Date(user.planUntil) > new Date()) ||
    grantIncludes(user, 'platinum') ||
    isCompanyEntitled(user)
  );
}
function inTrial(user) {
  return !isAdminUser(user) && user.trialUntil && new Date(user.trialUntil) > new Date();
}
function hasFullAccess(user) { return isPro(user) || inTrial(user); }
function maxBuyBoxesFor(user) {
  if (isAdminUser(user)) return Number.MAX_SAFE_INTEGER;
  if (isWholesale(user)) return PRICING.maxBuyBoxes.wholesale;
  if (isPlatinum(user)) return PRICING.maxBuyBoxes.platinum;
  return PRICING.maxBuyBoxes[user.role] || 1;
}
function publicMembershipLabel(user) {
  if (!user || user.settings?.showMembershipLevel === false) return null;
  const a = accessFor(user);
  if (a?.adminUnlimited) return 'Admin';
  if (a?.wholesale) return 'Wholesale Teams';
  if (a?.platinum) return 'Platinum';
  if (a?.pro) return 'Pro';
  if (a?.trial) return 'Trial';
  return 'Free';
}

function accessFor(user) {
  if (!user) return null;
  const grant = activeMembershipGrant(user);
  return {
    pro: isPro(user), platinum: isPlatinum(user), wholesale: isWholesale(user), trial: inTrial(user), full: hasFullAccess(user),
    adminUnlimited: isAdminUser(user), companyId: user.companyId || null, companyRole: user.companyRole || null,
    grantPlan: grant?.plan || null, grantUntil: grant?.until || null, grantReason: grant?.reason || null,
    paidPlan: user.plan || 'free', paidPlanUntil: user.planUntil || null
  };
}
// Buy boxes moved from a single object to an array (Platinum can have
// several). This reads either shape so accounts created before the
// change keep working without a migration step.
function getBuyBoxes(user) {
  if (Array.isArray(user.buyBoxes) && user.buyBoxes.length) return user.buyBoxes;
  if (user.buyBox) return [user.buyBox];
  return [defaultBuyBox()];
}

function membershipGrantSummary(user) {
  const active = activeMembershipGrant(user);
  return {
    grantPlan: user?.grantPlan || null,
    grantUntil: user?.grantUntil || null,
    grantReason: user?.grantReason || null,
    grantedAt: user?.grantedAt || null,
    active: !!active
  };
}

function grantMembership(db, user, { tier, days, reason = '', grantedBy = null, source = 'manual' } = {}) {
  tier = String(tier || '').toLowerCase();
  if (!GRANT_TIERS.has(tier)) throw new Error('Choose Pro, Platinum or Wholesale Teams.');
  const rawDays = Number(days);
  if (!Number.isFinite(rawDays) || rawDays < 1 || rawDays > 730) throw new Error('Choose a grant length between 1 and 730 days.');
  const n = Math.floor(rawDays);
  const now = new Date();
  const expires = new Date(now.getTime() + n * 86400000);
  db.membershipGrants = db.membershipGrants || [];
  const previous = [...db.membershipGrants].reverse().find(g => g.userId === user.id && !g.revokedAt && new Date(g.expiresAt || 0) > now);
  if (previous) { previous.revokedAt = now.toISOString(); previous.revokedBy = grantedBy || null; previous.revokeReason = 'replaced'; }
  user.grantPlan = tier;
  user.grantUntil = expires.toISOString();
  user.grantReason = String(reason || '').trim().slice(0, 180) || (source === 'leaderboard' ? 'Leaderboard prize' : 'Complimentary membership');
  user.grantedAt = now.toISOString();
  user.grantedBy = grantedBy || null;
  db.membershipGrants.push({
    id: crypto.randomUUID(),
    userId: user.id,
    tier,
    startsAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    reason: user.grantReason,
    source,
    grantedBy: grantedBy || null,
    revokedAt: null,
    createdAt: now.toISOString()
  });
  // Sync every replacement, not only Wholesale grants. Replacing an active
  // Wholesale grant with a lower tier must remove inherited company access too.
  syncCompanyMemberEntitlements(db, user);
  return activeMembershipGrant(user);
}

function revokeMembershipGrant(db, user, revokedBy = null) {
  const hadGrant = !!user.grantPlan;
  const now = new Date().toISOString();
  const open = [...(db.membershipGrants || [])].reverse().find(g => g.userId === user.id && !g.revokedAt && new Date(g.expiresAt || 0) > new Date());
  if (open) { open.revokedAt = now; open.revokedBy = revokedBy || null; }
  user.grantPlan = null;
  user.grantUntil = null;
  user.grantReason = null;
  user.grantedAt = null;
  user.grantedBy = null;
  syncCompanyMemberEntitlements(db, user);
  return hadGrant;
}

function leaderboardRows(db, period = 'all') {
  const users = db.users.filter(u => u.role !== 'admin');
  const monthStart = new Date();
  monthStart.setUTCDate(1); monthStart.setUTCHours(0,0,0,0);
  const pointsByUser = new Map();
  const closesByUser = new Map();
  if (period === 'month') {
    for (const save of db.saves || []) {
      if (!save.verified) continue;
      const when = new Date(save.verifiedAt || save.at || 0);
      if (!Number.isFinite(when.getTime()) || when < monthStart) continue;
      const listing = db.listings.find(l => l.id === save.listingId);
      const ids = [save.userId, listing?.ownerId].filter(Boolean);
      for (const id of ids) {
        pointsByUser.set(id, (pointsByUser.get(id) || 0) + 100);
        closesByUser.set(id, (closesByUser.get(id) || 0) + 1);
      }
    }
  }
  return users.map(u => {
    const revs = db.reviews.filter(r => r.aboutUserId === u.id);
    const closedAll = db.saves.filter(save => save.verified && (save.userId === u.id || db.listings.find(l => l.id === save.listingId)?.ownerId === u.id)).length;
    const points = period === 'month' ? (pointsByUser.get(u.id) || 0) : Number(u.points || 0);
    const closed = period === 'month' ? (closesByUser.get(u.id) || 0) : closedAll;
    return {
      id: u.id, name: u.name, username: u.username || null, role: u.role, points, badge: badgeFor(points),
      avatarUrl: u.avatarUrl, verified: !!u.verified, closedDeals: closed,
      rating: revs.length ? (revs.reduce((sum, r) => sum + r.rating, 0) / revs.length).toFixed(1) : null,
      reviewCount: revs.length
    };
  }).sort((a, b) => b.points - a.points || b.closedDeals - a.closedDeals || a.name.localeCompare(b.name)).slice(0, 50);
}

async function sendNewSignupAlerts(db, newUser) {
  if (!mailer.configured()) return;
  const targets = [...new Set(policy.adminEmails().map(x => String(x).trim().toLowerCase()).filter(Boolean))];
  await Promise.allSettled(targets.map(async email => {
    const adminUser = db.users.find(u => u.email === email && isAdminUser(u));
    if (adminUser?.settings?.notifyOnNewSignup === false) return;
    await mailer.sendNewSignupAlert(email, newUser);
  }));
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
    username: null,
    passwordHash: bcrypt.hashSync(password, 10),
    role: policy.resolveRole(cleanEmail, role),
    bio: '', phone: '', location: '', avatarUrl: null, points: 0,
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
  ensureUsername(db, user);
  db.users.push(user);
  const vtok = crypto.randomBytes(24).toString('hex');
  db.tokens.push({ token: vtok, userId: user.id, kind: 'verify', expires: Date.now() + 7 * 86400000 });
  await saveDB(db);
  let verificationEmailSent = false;
  try {
    if (!mailer.configured()) throw new Error('RESEND_API_KEY is not configured for this deployment.');
    await mailer.sendVerification(user.email, user.name, vtok);
    verificationEmailSent = true;
    user.verificationEmailLastStatus = 'sent';
    user.verificationEmailLastAttemptAt = new Date().toISOString();
    user.verificationEmailLastError = null;
  } catch (e) {
    console.error('[mail][verification]', e.message);
    user.verificationEmailLastStatus = 'failed';
    user.verificationEmailLastAttemptAt = new Date().toISOString();
    user.verificationEmailLastError = String(e.message || 'Email delivery failed').slice(0, 500);
  }
  await saveDB(db);
  try { await sendNewSignupAlerts(db, user); }
  catch (e) { console.error('[mail][signup-alert]', e.message); }
  req.session.userId = user.id;
  res.json({ user: publicUser(user), pricing: PRICING, verificationEmailSent, mailConfigured: mailer.configured() });
});

app.post('/api/login', async (req, res) => {
  const { email, password } = req.body || {};
  const db = await loadDB();
  const login = String(email || '').trim().toLowerCase().replace(/^@/, '');
  const user = db.users.find(u => u.email === login || normalizeUsername(u.username) === login);
  if (!user || !bcrypt.compareSync(password || '', user.passwordHash)) return res.status(401).json({ error: 'Incorrect email or password.' });
  // Re-derive the role from the allowlist on each login. Adding or removing
  // an address in ADMIN_EMAILS takes effect immediately, and an 'admin'
  // value written into the database by any other means is overwritten here.
  const correctRole = policy.resolveRole(user.email, user.role === 'admin' ? 'buyer' : user.role);
  let changed = false;
  if (user.role !== correctRole) { user.role = correctRole; changed = true; }
  if (ensureUsername(db, user)) changed = true;
  if (syncOneCompanyMember(db, user)) changed = true;
  if (changed) await saveDB(db);
  req.session.userId = user.id;
  res.json({ user: publicUser(user), access: accessFor(user) });
});
app.post('/api/logout', async (req, res) => { req.session = null; res.json({ ok: true }); });
app.get('/api/me', async (req, res) => {
  const db = await loadDB();
  const u = db.users.find(x => x.id === req.session.userId);
  if (u) {
    let changed = ensureUsername(db, u);
    if (syncOneCompanyMember(db, u)) changed = true;
    if (changed) await saveDB(db);
  }
  res.json({
    user: publicUser(u),
    pricing: PRICING,
    balance: u ? balanceOf(db, u.id) : 0,
    access: accessFor(u)
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
  user.verificationEmailLastStatus = 'verified';
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
  try {
    if (!mailer.configured()) throw new Error('RESEND_API_KEY is not configured for this deployment.');
    await mailer.sendVerification(req.user.email, req.user.name, token);
    req.user.verificationEmailLastStatus = 'sent';
    req.user.verificationEmailLastAttemptAt = new Date().toISOString();
    req.user.verificationEmailLastError = null;
    await saveDB(req.db);
    res.json({ ok: true, mailConfigured: true });
  } catch (e) {
    console.error('[mail][verification-resend]', e.message);
    req.user.verificationEmailLastStatus = 'failed';
    req.user.verificationEmailLastAttemptAt = new Date().toISOString();
    req.user.verificationEmailLastError = String(e.message || 'Email delivery failed').slice(0, 500);
    await saveDB(req.db);
    res.status(502).json({ error: 'The confirmation email could not be sent. The site owner can check Admin → Email Center → Mail health for the exact delivery error.', mailConfigured: mailer.configured() });
  }
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
  const { name, username, bio, phone, location, avatarData } = req.body || {};
  if (name !== undefined) req.user.name = String(name).trim() || req.user.name;
  if (username !== undefined) {
    const clean = normalizeUsername(username);
    if (!usernameValid(clean)) return res.status(400).json({ error: 'Username must be 3–30 characters using letters, numbers, dots or underscores.' });
    if (usernameTaken(req.db, clean, req.user.id)) return res.status(409).json({ error: 'That username is already taken.' });
    if (normalizeUsername(req.user.username) !== clean) {
      const last = req.user.usernameChangedAt ? new Date(req.user.usernameChangedAt).getTime() : 0;
      const wait = 7 * 86400000;
      if (last && Date.now() - last < wait && !isAdminUser(req.user)) {
        const days = Math.max(1, Math.ceil((wait - (Date.now() - last)) / 86400000));
        return res.status(429).json({ error: `You can change your username again in ${days} day${days === 1 ? '' : 's'}.` });
      }
      req.user.username = clean;
      req.user.usernameChangedAt = new Date().toISOString();
    }
  }
  if (bio !== undefined) req.user.bio = String(bio).slice(0, 400);
  if (phone !== undefined) req.user.phone = String(phone).slice(0, 40);
  if (location !== undefined) req.user.location = String(location).trim().slice(0, 80);
  if (avatarData) { const url = await writeImage(avatarData); if (url) req.user.avatarUrl = url; }
  await saveDB(req.db); res.json({ user: publicUser(req.user) });
});

app.post('/api/me/password', requireAuth, async (req, res) => {
  const currentPassword = String(req.body?.currentPassword || '');
  const newPassword = String(req.body?.newPassword || '');
  if (!bcrypt.compareSync(currentPassword, req.user.passwordHash)) return res.status(401).json({ error: 'Current password is incorrect.' });
  if (newPassword.length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters.' });
  if (bcrypt.compareSync(newPassword, req.user.passwordHash)) return res.status(400).json({ error: 'Choose a password different from your current one.' });
  req.user.passwordHash = bcrypt.hashSync(newPassword, 10);
  req.user.passwordChangedAt = new Date().toISOString();
  req.db.tokens = req.db.tokens.filter(t => !(t.userId === req.user.id && t.kind === 'reset'));
  await saveDB(req.db);
  res.json({ ok: true });
});

app.delete('/api/me', requireAuth, async (req, res) => {
  const password = String(req.body?.password || '');
  const confirmation = String(req.body?.confirmation || '').trim().toUpperCase();
  if (confirmation !== 'DELETE') return res.status(400).json({ error: 'Type DELETE to confirm account deletion.' });
  if (!bcrypt.compareSync(password, req.user.passwordHash)) return res.status(401).json({ error: 'Password is incorrect.' });

  // Never orphan an active recurring charge. If Stripe cannot accept the
  // cancellation request, keep the account intact and tell the user instead.
  if (req.user.stripeSubscriptionId && payments.enabled()) {
    try { await payments.cancelSubscription(req.user.stripeSubscriptionId); }
    catch (e) { return res.status(400).json({ error: 'We could not stop your subscription yet, so the account was not deleted. Please try again.' }); }
  }

  const userId = req.user.id;
  const walletBalance = balanceOf(req.db, userId);
  if (walletBalance > 0) return res.status(409).json({ error: `Withdraw your remaining wallet balance of ${money(walletBalance)} before deleting your account.` });
  const activeOrder = req.db.orders.find(o => (o.buyerId === userId || o.sellerId === userId) && !['shipped','delivered','cancelled','refunded'].includes(String(o.shipStatus || o.status || '').toLowerCase()));
  if (activeOrder) return res.status(409).json({ error: 'You still have an active marketplace order. Finish or resolve it before deleting your account so nobody loses shipping or transaction access.' });
  const deletedId = 'deleted:' + crypto.createHash('sha256').update(userId).digest('hex').slice(0, 18);
  const ownedListingIds = new Set(req.db.listings.filter(l => l.ownerId === userId).map(l => l.id));
  const boughtOrderIds = new Set(req.db.orders.filter(o => o.buyerId === userId).map(o => o.id));

  const company = companyForUser(req.db, req.user);
  if (company) {
    if (company.ownerId === userId) {
      for (const member of req.db.users.filter(u => u.companyId === company.id && u.id !== userId)) {
        member.companyId = null; member.companyRole = null; member.companyPlanUntil = null;
        req.db.listings.filter(l => l.ownerId === member.id).forEach(l => { l.companyId = null; l.companyName = null; });
      }
      req.db.companyInvites = req.db.companyInvites.filter(i => i.companyId !== company.id);
      req.db.buyerLeads = (req.db.buyerLeads || []).filter(x => !(x.targetType === 'company' && x.targetId === company.id));
      req.db.companies = req.db.companies.filter(c => c.id !== company.id);
    } else {
      company.memberIds = (company.memberIds || []).filter(id => id !== userId);
    }
  }

  // Public/profile content is removed. Financial/order records that may be
  // required for accounting are retained but stripped of the deleted user's PII.
  req.db.listings = req.db.listings.filter(l => l.ownerId !== userId);
  req.db.shopItems = req.db.shopItems.filter(i => i.sellerId !== userId);
  req.db.saves = req.db.saves.filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.follows = req.db.follows.filter(x => x.followerId !== userId && x.followingId !== userId);
  req.db.friendRequests = req.db.friendRequests.filter(x => x.fromUserId !== userId && x.toUserId !== userId);
  req.db.friendships = req.db.friendships.filter(x => x.userAId !== userId && x.userBId !== userId);
  req.db.messages = req.db.messages.filter(x => x.fromUserId !== userId && x.toUserId !== userId);
  req.db.unlocks = req.db.unlocks.filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.views = req.db.views.filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.promotions = req.db.promotions.filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.alerts = req.db.alerts.filter(x => x.userId !== userId);
  req.db.tokens = req.db.tokens.filter(x => x.userId !== userId);
  req.db.companyInvites = req.db.companyInvites.filter(x => x.invitedBy !== userId && x.email !== req.user.email);
  req.db.dealNotes = req.db.dealNotes.filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.reviews = req.db.reviews.filter(x => x.aboutUserId !== userId && x.byUserId !== userId);
  req.db.buyerLeads = (req.db.buyerLeads || []).filter(x => x.userId !== userId && !(x.targetType === 'user' && x.targetId === userId));
  req.db.shareEvents = (req.db.shareEvents || []).filter(x => x.userId !== userId);
  req.db.membershipGrants = (req.db.membershipGrants || []).filter(x => x.userId !== userId && x.grantedBy !== userId);

  for (const o of req.db.offers) {
    if (o.buyerId === userId) { o.buyerId = deletedId; o.buyerName = 'Deleted account'; }
    if (o.sellerId === userId) { o.sellerId = deletedId; }
  }
  for (const o of req.db.orders) {
    if (o.buyerId === userId) {
      o.buyerId = deletedId; o.buyerName = 'Deleted account'; o.buyerEmail = null; o.shipping = null;
    }
    if (o.sellerId === userId) { o.sellerId = deletedId; o.sellerName = 'Deleted account'; }
  }
  for (const so of req.db.supplierOrders) {
    if (boughtOrderIds.has(so.orderId)) {
      if ('buyerName' in so) so.buyerName = 'Deleted account';
      if ('buyerEmail' in so) so.buyerEmail = null;
      if ('shipping' in so) so.shipping = null;
    }
  }
  for (const l of req.db.ledger) { if (l.userId === userId) l.userId = deletedId; if (l.description && req.user.name) l.description = String(l.description).split(req.user.name).join('Deleted account'); }
  for (const p of req.db.payouts) if (p.userId === userId) p.userId = deletedId;
  for (const r of req.db.reports) {
    if (r.buyerId === userId) { r.buyerId = deletedId; r.buyerName = 'Deleted account'; r.buyerEmail = null; }
    if (r.sellerId === userId) { r.sellerId = deletedId; r.sellerName = 'Deleted account'; }
  }

  req.db.users = req.db.users.filter(u => u.id !== userId);
  await saveDB(req.db);
  req.session = null;
  res.json({ ok: true });
});
app.patch('/api/me/settings', requireAuth, async (req, res) => {
  const body = req.body || {};
  const next = { ...defaultSettings(), ...req.user.settings };
  if (body.theme === 'light' || body.theme === 'dark') next.theme = body.theme;
  if (body.feedDensity === 'comfortable' || body.feedDensity === 'compact') next.feedDensity = body.feedDensity;
  if (typeof body.notifyOnMessage === 'boolean') next.notifyOnMessage = body.notifyOnMessage;
  if (typeof body.notifyOnMatch === 'boolean') next.notifyOnMatch = body.notifyOnMatch;
  if (typeof body.showMembershipLevel === 'boolean') next.showMembershipLevel = body.showMembershipLevel;
  if (body.tutorialCompletedVersion !== undefined) next.tutorialCompletedVersion = Math.max(0, Number(body.tutorialCompletedVersion)||0);
  if (body.tutorialDismissedVersion !== undefined) next.tutorialDismissedVersion = Math.max(0, Number(body.tutorialDismissedVersion)||0);
  if (isAdminUser(req.user) && typeof body.notifyOnNewSignup === 'boolean') next.notifyOnNewSignup = body.notifyOnNewSignup;
  if (body.messageEmailDelayMinutes !== undefined) {
    const n = Number(body.messageEmailDelayMinutes);
    if (![15,30,60,180,360,720,1440].includes(n)) return res.status(400).json({ error: 'Choose a valid unread-message reminder delay.' });
    next.messageEmailDelayMinutes = n;
  }
  req.user.settings = next;
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


/* ============================ WHOLESALE COMPANIES ============================ */
function companyMemberIds(db, company) {
  return db.users.filter(u => u.companyId === company.id).map(u => u.id);
}
function requireActiveCompany(req, res) {
  const company = companyForUser(req.db, req.user);
  if (!company) { res.status(404).json({ error: 'You are not part of a company workspace.' }); return null; }
  if (!isWholesale(req.user)) { res.status(403).json({ error: 'An active Better Wholesale Teams plan is required for this workspace.' }); return null; }
  return company;
}
function requireCompanyManager(req, res, company) {
  if (!company || !['owner','admin'].includes(req.user.companyRole)) { res.status(403).json({ error: 'Company owner or admin access is required.' }); return false; }
  return true;
}
function sanitizeCompanyBuyBox(b = {}) {
  return {
    id: String(b.id || crypto.randomUUID()),
    label: String(b.label || 'Company buy box').slice(0, 60),
    minPrice: Math.max(0, Number(b.minPrice) || 0),
    maxPrice: Math.max(0, Number(b.maxPrice) || 2000000),
    cities: Array.isArray(b.cities) ? b.cities.map(x => String(x).trim()).filter(Boolean).slice(0, 20) : String(b.cities || '').split(',').map(x => x.trim()).filter(Boolean).slice(0, 20),
    propertyTypes: Array.isArray(b.propertyTypes) ? b.propertyTypes.map(x => String(x)).slice(0, 12) : [],
    minSpread: Math.max(0, Number(b.minSpread) || 0),
    active: b.active !== false
  };
}

app.get('/api/company', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  const members = req.db.users.filter(u => u.companyId === company.id).map(u => ({ ...publicProfileUser(u), companyRole: u.companyRole || (u.id === company.ownerId ? 'owner' : 'member') }));
  const pendingInvites = ['owner','admin'].includes(req.user.companyRole)
    ? req.db.companyInvites.filter(i => i.companyId === company.id && i.status === 'pending' && i.expires > Date.now()).map(i => ({ id: i.id, email: i.email, role: i.role, expires: i.expires, createdAt: i.createdAt }))
    : [];
  const memberIds = new Set(companyMemberIds(req.db, company));
  const listings = req.db.listings.filter(l => l.companyId === company.id || memberIds.has(l.ownerId));
  const listingIds = new Set(listings.map(l => l.id));
  const views = req.db.views.filter(v => listingIds.has(v.listingId));
  const inquiryMessages = req.db.messages.filter(m => m.listingId && listingIds.has(m.listingId));
  res.json({ company: publicCompany(company), role: req.user.companyRole, members, pendingInvites, sharedBuyBoxes: company.buyBoxes || [], analytics: { listings: listings.length, views: views.length, uniqueViewers: new Set(views.map(v => v.userId)).size, inquiries: inquiryMessages.length } });
});

app.post('/api/company', requireAuth, async (req, res) => {
  if (!isWholesale(req.user)) return res.status(403).json({ error: 'Subscribe to Better Wholesale Teams before creating a company workspace.' });
  if (req.user.companyId) return res.status(409).json({ error: 'Your account is already connected to a company.' });
  const name = String(req.body?.name || '').trim().slice(0, 90);
  if (name.length < 2) return res.status(400).json({ error: 'Enter your company name.' });
  const company = {
    id: crypto.randomUUID(), name, slug: uniqueCompanySlug(req.db, name), ownerId: req.user.id,
    logoUrl: null, bio: '', website: '', markets: [], seatLimit: PRICING.wholesale.seats,
    memberIds: [req.user.id], buyBoxes: [sanitizeCompanyBuyBox({ label: 'Company buy box' })], createdAt: new Date().toISOString()
  };
  req.db.companies.push(company);
  req.user.companyId = company.id; req.user.companyRole = 'owner'; req.user.companyPlanUntil = null;
  req.db.listings.filter(l => l.ownerId === req.user.id).forEach(l => { l.companyId = company.id; l.companyName = company.name; });
  await saveDB(req.db);
  res.json({ company: publicCompany(company), role: 'owner' });
});

app.patch('/api/company', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  if (!requireCompanyManager(req, res, company)) return;
  const { name, bio, website, markets, logoData } = req.body || {};
  if (name !== undefined) {
    const clean = String(name).trim().slice(0, 90); if (clean.length < 2) return res.status(400).json({ error: 'Company name is too short.' });
    company.name = clean; company.slug = uniqueCompanySlug(req.db, clean, company.id);
    req.db.listings.filter(l => l.companyId === company.id).forEach(l => { l.companyName = clean; });
  }
  if (bio !== undefined) company.bio = String(bio).slice(0, 700);
  if (website !== undefined) company.website = String(website).trim().slice(0, 240);
  if (markets !== undefined) company.markets = (Array.isArray(markets) ? markets : String(markets).split(',')).map(x => String(x).trim()).filter(Boolean).slice(0, 20);
  if (logoData) { const url = await writeImage(logoData); if (url) company.logoUrl = url; }
  await saveDB(req.db);
  res.json({ company: publicCompany(company) });
});

app.patch('/api/company/buyboxes', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  if (!requireCompanyManager(req, res, company)) return;
  const boxes = Array.isArray(req.body?.buyBoxes) ? req.body.buyBoxes.slice(0, 10).map(sanitizeCompanyBuyBox) : [];
  if (!boxes.length) return res.status(400).json({ error: 'Keep at least one company buy box.' });
  company.buyBoxes = boxes;
  await saveDB(req.db);
  res.json({ buyBoxes: company.buyBoxes });
});

app.get('/api/company/listings', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  const ids = new Set(companyMemberIds(req.db, company));
  const listings = req.db.listings.filter(l => l.companyId === company.id || ids.has(l.ownerId)).map(l => ({ ...gateListing(l, req.user, req.db), owner: publicProfileUser(req.db.users.find(u => u.id === l.ownerId)) }));
  res.json({ listings });
});

app.get('/api/company/inbox', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  const ids = new Set(companyMemberIds(req.db, company));
  const listingMap = new Map(req.db.listings.filter(l => l.companyId === company.id || ids.has(l.ownerId)).map(l => [l.id, l]));
  const messages = req.db.messages.filter(m => m.listingId && listingMap.has(m.listingId)).sort((a,b) => new Date(b.at)-new Date(a.at)).slice(0, 100).map(m => {
    const listing = listingMap.get(m.listingId);
    const customerId = ids.has(m.fromUserId) ? m.toUserId : m.fromUserId;
    const customer = req.db.users.find(u => u.id === customerId);
    const teammate = req.db.users.find(u => u.id === (ids.has(m.fromUserId) ? m.fromUserId : m.toUserId));
    return { id: m.id, body: m.body, at: m.at, read: !!m.read, listingId: m.listingId, listingAddress: gateListing(listing, req.user, req.db).address, customer: customer ? publicProfileUser(customer) : null, teammate: teammate ? publicProfileUser(teammate) : null };
  });
  res.json({ messages });
});

app.post('/api/company/invites', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  if (!requireCompanyManager(req, res, company)) return;
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = req.body?.role === 'admin' ? 'admin' : 'member';
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  const existingMember = req.db.users.find(u => u.email === email && u.companyId === company.id);
  if (existingMember) return res.status(409).json({ error: 'That person is already on your company team.' });
  const existingUser = req.db.users.find(u => u.email === email);
  if (existingUser?.companyId && existingUser.companyId !== company.id) return res.status(409).json({ error: 'That account already belongs to another company.' });
  const members = req.db.users.filter(u => u.companyId === company.id).length;
  const pending = req.db.companyInvites.filter(i => i.companyId === company.id && i.status === 'pending' && i.expires > Date.now()).length;
  if (members + pending >= (company.seatLimit || PRICING.wholesale.seats)) return res.status(409).json({ error: `This plan includes ${company.seatLimit || PRICING.wholesale.seats} seats. Remove a pending invite or team member before inviting another.` });
  req.db.companyInvites = req.db.companyInvites.filter(i => !(i.companyId === company.id && i.email === email && i.status === 'pending'));
  const token = crypto.randomBytes(24).toString('hex');
  const invite = { id: crypto.randomUUID(), token, companyId: company.id, email, role, invitedBy: req.user.id, status: 'pending', createdAt: new Date().toISOString(), expires: Date.now() + 7 * 86400000 };
  req.db.companyInvites.push(invite);
  await saveDB(req.db);
  const appUrl = String(process.env.APP_URL || 'http://localhost:8888').replace(/\/$/, '');
  const inviteUrl = `${appUrl}/?view=companyjoin&invite=${encodeURIComponent(token)}`;
  mailer.sendCompanyInvite?.(email, company.name, req.user.name, inviteUrl).catch(e => console.error('[mail]', e.message));
  res.json({ invite: { id: invite.id, email, role, expires: invite.expires }, inviteUrl, accountExists: !!existingUser });
});

app.post('/api/company/invites/accept', requireAuth, async (req, res) => {
  const token = String(req.body?.token || '');
  const invite = req.db.companyInvites.find(i => i.token === token && i.status === 'pending');
  if (!invite || invite.expires < Date.now()) return res.status(400).json({ error: 'That company invitation is invalid or has expired.' });
  if (invite.email !== req.user.email) return res.status(403).json({ error: `This invite was sent to ${invite.email}. Sign in with that email to accept it.` });
  if (req.user.companyId && req.user.companyId !== invite.companyId) return res.status(409).json({ error: 'Leave your current company before joining another.' });
  const company = req.db.companies.find(c => c.id === invite.companyId);
  if (!company) return res.status(404).json({ error: 'Company not found.' });
  const owner = req.db.users.find(u => u.id === company.ownerId);
  if (!owner || !isWholesale(owner)) return res.status(403).json({ error: 'This company workspace is not currently active.' });
  const members = req.db.users.filter(u => u.companyId === company.id).length;
  if (members >= (company.seatLimit || PRICING.wholesale.seats)) return res.status(409).json({ error: 'This company has used all available seats.' });
  req.user.companyId = company.id; req.user.companyRole = invite.role === 'admin' ? 'admin' : 'member'; req.user.companyPlanUntil = companyEntitlementUntilForOwner(owner);
  company.memberIds = [...new Set([...(company.memberIds || []), req.user.id])];
  req.db.listings.filter(l => l.ownerId === req.user.id).forEach(l => { l.companyId = company.id; l.companyName = company.name; });
  invite.status = 'accepted'; invite.acceptedAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ company: publicCompany(company), role: req.user.companyRole, access: accessFor(req.user) });
});

app.patch('/api/company/members/:userId', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  if (req.user.companyRole !== 'owner') return res.status(403).json({ error: 'Only the company owner can change team roles.' });
  const member = req.db.users.find(u => u.id === req.params.userId && u.companyId === company.id);
  if (!member || member.id === company.ownerId) return res.status(404).json({ error: 'Team member not found.' });
  member.companyRole = req.body?.role === 'admin' ? 'admin' : 'member';
  await saveDB(req.db); res.json({ member: publicProfileUser(member), role: member.companyRole });
});

app.delete('/api/company/members/:userId', requireAuth, async (req, res) => {
  const company = requireActiveCompany(req, res); if (!company) return;
  if (!requireCompanyManager(req, res, company)) return;
  const member = req.db.users.find(u => u.id === req.params.userId && u.companyId === company.id);
  if (!member || member.id === company.ownerId) return res.status(404).json({ error: 'Team member not found.' });
  if (req.user.companyRole === 'admin' && member.companyRole === 'admin') return res.status(403).json({ error: 'Only the owner can remove another company admin.' });
  member.companyId = null; member.companyRole = null; member.companyPlanUntil = null;
  req.db.listings.filter(l => l.ownerId === member.id).forEach(l => { l.companyId = null; l.companyName = null; });
  company.memberIds = (company.memberIds || []).filter(id => id !== member.id);
  await saveDB(req.db); res.json({ ok: true });
});

app.post('/api/company/leave', requireAuth, async (req, res) => {
  const company = companyForUser(req.db, req.user);
  if (!company) return res.status(404).json({ error: 'You are not part of a company.' });
  if (company.ownerId === req.user.id) return res.status(400).json({ error: 'The company owner cannot leave. Remove team members or delete the company/account instead.' });
  req.user.companyId = null; req.user.companyRole = null; req.user.companyPlanUntil = null;
  req.db.listings.filter(l => l.ownerId === req.user.id).forEach(l => { l.companyId = null; l.companyName = null; });
  company.memberIds = (company.memberIds || []).filter(id => id !== req.user.id);
  await saveDB(req.db); res.json({ ok: true });
});

app.get('/api/companies/:id', async (req, res) => {
  const db = await loadDB();
  const company = db.companies.find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!company) return res.status(404).json({ error: 'Company not found.' });
  const viewer = db.users.find(u => u.id === req.session.userId);
  const memberIds = new Set(companyMemberIds(db, company));
  const members = db.users.filter(u => u.companyId === company.id).map(publicProfileUser);
  const listings = db.listings.filter(l => (l.companyId === company.id || memberIds.has(l.ownerId)) && listingFreshness(l).availabilityStatus !== 'archived').map(l => gateListing(l, viewer, db));
  res.json({ company: publicCompany(company), members, listings });
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
    minSpread: Number(b.minSpread) || 0, active: b.active !== false,
    public: b.public === true, strategy: String(b.strategy || '').trim().slice(0, 50),
    updatedAt: new Date().toISOString()
  };
  boxes[idx] = built;
  req.user.buyBoxes = boxes;
  if (['active','selective','paused'].includes(String(b.buyingStatus || ''))) req.user.buyingStatus = String(b.buyingStatus);
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
  boxes.push({ ...defaultBuyBox(), label: `Buy box ${boxes.length + 1}`, public: false, strategy: '', updatedAt: new Date().toISOString() });
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
  if (isAdminUser(req.user)) return res.json({ user: publicUser(req.user), adminUnlimited: true });
  const period = req.body?.period === 'annual' ? 'annual' : 'monthly';
  const tier = ['pro','platinum','wholesale'].includes(req.body?.tier) ? req.body.tier : 'pro';
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
      syncCompanyMemberEntitlements(req.db, req.user);
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
  if (isAdminUser(req.user)) return res.json({ user: publicUser(req.user), adminUnlimited: true, cancelsAtPeriodEnd: false });
  try {
    if (req.user.stripeSubscriptionId && payments.enabled()) {
      // Stops the next auto-charge. Access continues until the period
      // already paid for runs out — Stripe tells us when via webhook.
      await payments.cancelSubscription(req.user.stripeSubscriptionId);
      await saveDB(req.db);
      return res.json({ user: publicUser(req.user), cancelsAtPeriodEnd: true });
    }
    req.user.plan = 'free';
    req.user.planUntil = null;
    syncCompanyMemberEntitlements(req.db, req.user);
    await saveDB(req.db);
    res.json({ user: publicUser(req.user) });
  } catch (e) { res.status(400).json({ error: e.message }); }
});
app.post('/api/billing/unlock-pack', requireAuth, async (req, res) => {
  if (isAdminUser(req.user)) return res.json({ unlimited: true, unlockCredits: req.user.unlockCredits });
  try {
    const result = await chargeOrIntent(req.db, req.user, PRICING.unlockPack.price, 'unlock_pack', `${PRICING.unlockPack.qty} listing unlocks`);
    if (!result.paid) { await saveDB(req.db); return res.json({ requiresPayment: true, clientSecret: result.clientSecret, amount: result.amount }); }
    req.user.unlockCredits += PRICING.unlockPack.qty;
    maybePayReferral(req.db, req.user);
    await saveDB(req.db);
    res.json({ unlockCredits: req.user.unlockCredits });
  } catch (e) { res.status(400).json({ error: e.message }); }
});


/* ============================ BETTER DISPO ============================ */
const LISTING_CONFIRM_DAYS = 14;

function numFromText(v) {
  if (v === null || v === undefined || v === '') return null;
  const raw = String(v).trim().toLowerCase().replace(/[$,\s]/g, '');
  const m = raw.match(/-?\d+(?:\.\d+)?/); if (!m) return null;
  let n = Number(m[0]); if (!Number.isFinite(n)) return null;
  if (/k\b/.test(raw)) n *= 1000;
  if (/m\b/.test(raw)) n *= 1000000;
  return Math.round(n * 100) / 100;
}
function normalizePropertyType(v) {
  const x = String(v || '').toLowerCase();
  if (/multi|duplex|triplex|fourplex|4plex|2[- ]?4|multifamily/.test(x)) return 'Multi-family';
  if (/condo/.test(x)) return 'Condo';
  if (/town/.test(x)) return 'Townhouse';
  if (/mobile|manufactured/.test(x)) return 'Mobile home';
  if (/land|lot|acre/.test(x)) return 'Land';
  if (/commercial|retail|office|warehouse/.test(x)) return 'Commercial';
  if (/single|sfr|sfh|house\b/.test(x)) return 'Single family';
  return '';
}
function heuristicDealImport(rawText) {
  const raw = String(rawText || '').replace(/\r/g, '').slice(0, 16000);
  const lines = raw.split('\n').map(x => x.trim()).filter(Boolean);
  const one = raw.replace(/\n/g, ' ');
  const moneyAfter = labels => {
    for (const label of labels) {
      const re = new RegExp('(?:' + label + ')\\s*(?:price|estimate)?\\s*[:=-]?\\s*\\$?([0-9][0-9,]*(?:\\.[0-9]+)?\\s*[kKmM]?)', 'i');
      const hit = one.match(re); if (hit) return numFromText(hit[1]);
    }
    return null;
  };
  const addressLine = lines.find(x => /^\d{1,7}\s+[^,]{2,80}(?:,\s*[^,]+,?\s*[A-Z]{2}(?:\s+\d{5})?)?$/i.test(x)) || '';
  let address = '', city = '';
  if (addressLine) {
    const parts = addressLine.split(',').map(x => x.trim());
    address = parts[0] || '';
    if (parts.length >= 2) city = parts.slice(1).join(', ').replace(/\s+\d{5}(?:-\d{4})?$/, '').trim();
  }
  if (!city) {
    const loc = one.match(/(?:city|market|location)\s*[:=-]\s*([^|•;\n]{2,60})/i);
    if (loc) city = loc[1].trim().replace(/\s+\d{5}(?:-\d{4})?$/, '');
  }
  const beds = one.match(/(?:beds?|bedrooms?|br)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) || one.match(/(\d+(?:\.\d+)?)\s*(?:beds?|bedrooms?|br)\b/i);
  const baths = one.match(/(?:baths?|bathrooms?|ba)\s*[:=-]?\s*(\d+(?:\.\d+)?)/i) || one.match(/(\d+(?:\.\d+)?)\s*(?:baths?|bathrooms?|ba)\b/i);
  const sqft = one.match(/(?:sq\.?\s*ft\.?|sqft|square feet)\s*[:=-]?\s*([0-9,]+)/i) || one.match(/([0-9,]+)\s*(?:sq\.?\s*ft\.?|sqft|square feet)/i);
  const year = one.match(/(?:year built|built)\s*[:=-]?\s*((?:18|19|20)\d{2})/i);
  const propType = normalizePropertyType(one);
  const asking = moneyAfter(['asking', 'ask', 'price', 'assignment price']);
  const arv = moneyAfter(['arv', 'after repair value']);
  const rehab = moneyAfter(['rehab', 'repairs?', 'renovation']);
  const deadline = one.match(/(?:contract|assignment|closing|close|deadline|expires?)\s*(?:date)?\s*[:=-]?\s*(20\d{2}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/20\d{2})/i);
  let contractDeadline = '';
  if (deadline) {
    const v = deadline[1];
    if (/^20\d{2}-/.test(v)) contractDeadline = v;
    else { const [m,d,y] = v.split('/'); contractDeadline = `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; }
  }
  const warnings = [];
  if (!address) warnings.push('Address was not confidently detected.');
  if (!asking) warnings.push('Asking price was not confidently detected.');
  return {
    address, city, propertyType: propType, situation: '', asking, arv, rehab,
    beds: beds ? Number(beds[1]) : null, baths: baths ? Number(baths[1]) : null,
    sqft: sqft ? Number(String(sqft[1]).replace(/,/g,'')) : null, year: year ? Number(year[1]) : null,
    timeline: '', contractDeadline,
    notes: raw.slice(0, 1400), warnings
  };
}
function cleanImportedDeal(d = {}) {
  const types = ['Single family','Multi-family','Condo','Townhouse','Land','Mobile home','Commercial'];
  const situations = ['Motivated seller','Probate','Divorce','Pre-foreclosure','Investor exit','Inherited property','Tired landlord'];
  return {
    address: String(d.address || '').trim().slice(0, 180), city: String(d.city || '').trim().slice(0, 100),
    propertyType: types.includes(d.propertyType) ? d.propertyType : normalizePropertyType(d.propertyType),
    situation: situations.includes(d.situation) ? d.situation : '',
    asking: Number.isFinite(Number(d.asking)) && Number(d.asking) > 0 ? Number(d.asking) : null,
    arv: Number.isFinite(Number(d.arv)) && Number(d.arv) > 0 ? Number(d.arv) : null,
    rehab: Number.isFinite(Number(d.rehab)) && Number(d.rehab) >= 0 ? Number(d.rehab) : null,
    beds: Number.isFinite(Number(d.beds)) && Number(d.beds) >= 0 ? Number(d.beds) : null,
    baths: Number.isFinite(Number(d.baths)) && Number(d.baths) >= 0 ? Number(d.baths) : null,
    sqft: Number.isFinite(Number(d.sqft)) && Number(d.sqft) > 0 ? Number(d.sqft) : null,
    year: Number.isFinite(Number(d.year)) && Number(d.year) > 1700 ? Number(d.year) : null,
    timeline: String(d.timeline || '').trim().slice(0, 40), notes: String(d.notes || '').trim().slice(0, 1500),
    contractDeadline: /^20\d{2}-\d{2}-\d{2}$/.test(String(d.contractDeadline || '')) ? String(d.contractDeadline) : '',
    warnings: Array.isArray(d.warnings) ? d.warnings.map(x => String(x).slice(0,180)).slice(0,6) : []
  };
}
function listingFreshness(listing) {
  const now = Date.now();
  const confirmedAt = new Date(listing.lastConfirmedAt || listing.freshAt || listing.createdAt || 0).getTime();
  const expiresAt = listing.expiresAt ? new Date(listing.expiresAt).getTime() : null;
  const daysSince = confirmedAt ? Math.max(0, Math.floor((now - confirmedAt) / 86400000)) : null;
  const expired = listing.availabilityStatus === 'archived' || !!listing.archivedAt || (expiresAt && expiresAt < now);
  return {
    availabilityStatus: expired ? 'archived' : (listing.availabilityStatus || 'active'),
    lastConfirmedAt: listing.lastConfirmedAt || listing.freshAt || listing.createdAt || null,
    expiresAt: listing.expiresAt || null,
    needsConfirmation: !expired && daysSince !== null && daysSince >= 7,
    confirmedDaysAgo: daysSince
  };
}
function buyBoxMatchesListing(bb, listing) {
  if (!bb || bb.active === false) return false;
  const asking = Number(listing.asking || 0);
  if (asking < Number(bb.minPrice || 0) || asking > Number(bb.maxPrice || 2000000)) return false;
  const cities = Array.isArray(bb.cities) ? bb.cities.filter(Boolean) : [];
  if (cities.length && !cities.some(c => String(listing.city || '').toLowerCase().includes(String(c).toLowerCase()))) return false;
  const types = Array.isArray(bb.propertyTypes) ? bb.propertyTypes.filter(Boolean) : [];
  if (types.length && !types.includes(listing.propertyType)) return false;
  const spread = listing.arv ? Number(listing.arv) - asking : 0;
  if (Number(bb.minSpread || 0) > 0 && spread < Number(bb.minSpread)) return false;
  return true;
}
function buyerMatchesForListing(db, listing) {
  return (db.users || []).filter(u => u.id !== listing.ownerId && String(u.buyingStatus || 'active') !== 'paused').map(u => {
    const boxes = getBuyBoxes(u).filter(bb => buyBoxMatchesListing(bb, listing));
    return boxes.length ? { user: u, boxes } : null;
  }).filter(Boolean);
}
function publicBuyerDemand(db, viewerId) {
  const out = [];
  for (const u of db.users || []) {
    if (String(u.buyingStatus || 'active') === 'paused') continue;
    const company = u.companyId ? (db.companies || []).find(c => c.id === u.companyId) : null;
    getBuyBoxes(u).forEach((bb, index) => {
      if (bb.active === false || bb.public !== true) return;
      out.push({
        id: `${u.id}:${index}`, index, user: socialUserCard(db, viewerId, u),
        label: bb.label || 'Buy box', minPrice: Number(bb.minPrice || 0), maxPrice: Number(bb.maxPrice || 2000000),
        cities: bb.cities || [], propertyTypes: bb.propertyTypes || [], minSpread: Number(bb.minSpread || 0),
        strategy: String(bb.strategy || '').slice(0,50), buyingStatus: String(u.buyingStatus || 'active'),
        company: company ? { id: company.id, name: company.name, slug: company.slug } : null,
        updatedAt: bb.updatedAt || u.updatedAt || null
      });
    });
  }
  const statusRank = { active: 0, selective: 1, paused: 2 };
  return out.sort((a,b) => (statusRank[a.buyingStatus] ?? 3) - (statusRank[b.buyingStatus] ?? 3) || (b.updatedAt || '').localeCompare(a.updatedAt || '')).slice(0, 250);
}
function appBaseUrl() {
  return String(process.env.APP_URL || 'http://localhost:8888').replace(/\/$/, '');
}
function refSuffix(referralCode) {
  const clean = String(referralCode || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  return clean ? `?ref=${encodeURIComponent(clean)}` : '';
}
function listingPublicUrl(listing, referralCode = '') {
  return `${appBaseUrl()}/s/property/${encodeURIComponent(listing.id)}${refSuffix(referralCode)}`;
}
function distributionPack(listing, referralCode = '') {
  const url = listingPublicUrl(listing, referralCode);
  const price = `$${Number(listing.asking || 0).toLocaleString()}`;
  const arv = listing.arv ? ` | ARV est. $${Number(listing.arv).toLocaleString()}` : '';
  const rehab = listing.rehab !== null && listing.rehab !== undefined ? ` | Rehab est. $${Number(listing.rehab).toLocaleString()}` : '';
  const specs = [listing.beds ? `${listing.beds} bd` : '', listing.baths ? `${listing.baths} ba` : '', listing.sqft ? `${Number(listing.sqft).toLocaleString()} sqft` : ''].filter(Boolean).join(' | ');
  const headline = `${listing.city || 'Off-market property'} — ${price}`;
  const facts = [specs, `Asking ${price}${arv}${rehab}`, listing.propertyType, listing.contractDeadline ? `Deal deadline ${listing.contractDeadline}` : ''].filter(Boolean);
  const facebook = `${headline}\n\n${facts.join('\n')}\n\n${String(listing.notes || '').slice(0,500)}\n\nFull deal: ${url}`.trim();
  const instagram = `${headline}\n\n${facts.join('\n')}\n\nDM for details or view the full deal on Better Real Estate.\n${url}\n\n#RealEstateInvesting #WholesaleRealEstate #OffMarket`.trim();
  const sms = `${listing.city || 'Off-market deal'} | ${price}${listing.arv ? ` | ARV $${Number(listing.arv).toLocaleString()}` : ''}. Details: ${url}`.slice(0, 480);
  const emailSubject = `Off-market deal: ${listing.city || 'property'} — ${price}`;
  const emailBody = `${headline}\n\n${facts.join('\n')}\n\n${String(listing.notes || '').slice(0,900)}\n\nView photos and deal details:\n${url}\n\nVerify all property and deal information independently.`.trim();
  return { url, facebook, instagram, sms, emailSubject, emailBody, flyer: { headline, facts, notes: String(listing.notes || '').slice(0,700) } };
}

app.post('/api/dispo/parse', requireAuth, async (req, res) => {
  const rawText = String(req.body?.text || '').trim();
  if (rawText.length < 12) return res.status(400).json({ error: 'Paste the deal post, email or text you want to import.' });
  let parsed = heuristicDealImport(rawText); let enhanced = false;
  if ((isPlatinum(req.user) || isAdminUser(req.user)) && ai.configured()) {
    const isAdmin = isAdminUser(req.user);
    const day = new Date().toISOString().slice(0, 10);
    const limit = 30;
    if (!isAdmin) {
      if (req.user.aiUsageDay !== day) { req.user.aiUsageDay = day; req.user.aiUsageCount = 0; }
      if (Number(req.user.aiUsageCount || 0) < limit) {
        req.user.aiUsageCount = Number(req.user.aiUsageCount || 0) + 1;
        await saveDB(req.db);
        try { parsed = await ai.generateDealImport(rawText); enhanced = true; }
        catch (e) { console.error('[deal import ai]', e.message); }
      }
    } else {
      try { parsed = await ai.generateDealImport(rawText); enhanced = true; }
      catch (e) { console.error('[deal import ai]', e.message); }
    }
  }
  res.json({ deal: cleanImportedDeal(parsed), enhanced, mode: enhanced ? 'ai' : 'smart-parser' });
});

function dealBuilderAllowance(user) {
  if (isAdminUser(user) || isPlatinum(user) || isWholesale(user)) return { unlimited:true, limit:null, used:0, remaining:null, label:'Unlimited analyses' };
  const day = new Date().toISOString().slice(0,10);
  if (isPro(user)) {
    const used = user.dealBuilderUsageDay === day ? Number(user.dealBuilderUsageCount || 0) : 0;
    return { unlimited:false, limit:5, used, remaining:Math.max(0,5-used), label:`${Math.max(0,5-used)} of 5 analyses remaining today`, day };
  }
  const used = Number(user.dealBuilderTrialUses || 0);
  const active = inTrial(user);
  return { unlimited:false, limit:1, used, remaining:active ? Math.max(0,1-used) : 0, trial:true, trialActive:active, label:active ? (used ? 'Free trial analysis used' : '1 free trial analysis available') : 'Pro or Platinum required' };
}
app.get('/api/deal-builder/usage', requireAuth, (req,res) => res.json({ usage:dealBuilderAllowance(req.user) }));
app.post('/api/deal-builder/address', requireAuth, async (req,res) => {
  const address=String(req.body?.address||'').trim(); if(address.length<8) return res.status(400).json({error:'Enter a complete property address.'});
  if(!ai.configured()) return res.status(503).json({error:'AI Deal Builder is not configured. Add OPENAI_API_KEY in Netlify.'});
  const allowance=dealBuilderAllowance(req.user);
  if(!allowance.unlimited && allowance.remaining<=0) return res.status(403).json({error:isPro(req.user)?'You have used today’s 5 Deal Builder analyses. Platinum includes unlimited analyses.':(allowance.trialActive?'Your one free trial Deal Builder analysis has been used. Pro includes 5 per day and Platinum includes unlimited analyses.':'Your free trial has ended. Pro includes 5 Deal Builder analyses per day and Platinum includes unlimited analyses.'),code:'DEAL_BUILDER_LIMIT',usage:allowance});
  try {
    const analysis=await ai.generateAddressDealAnalysis(address); const aiDraft=analysis.description ? { description: analysis.description } : null;
    const day=new Date().toISOString().slice(0,10);
    if(!allowance.unlimited){ if(isPro(req.user)){ if(req.user.dealBuilderUsageDay!==day){req.user.dealBuilderUsageDay=day;req.user.dealBuilderUsageCount=0;} req.user.dealBuilderUsageCount=Number(req.user.dealBuilderUsageCount||0)+1; } else { req.user.dealBuilderTrialUses=Number(req.user.dealBuilderTrialUses||0)+1; } await saveDB(req.db); }
    res.json({analysis,aiDraft,usage:dealBuilderAllowance(req.user)});
  } catch(e){ console.error('[deal builder ai]',e.message); res.status(502).json({error:String(e.message).slice(0,300)}); }
});

app.get('/api/buyer-crm', requireAuth, async (req,res)=>{
  req.db.buyerCrm=req.db.buyerCrm||[]; const rows=req.db.buyerCrm.filter(x=>x.ownerId===req.user.id).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  res.json({contacts:rows});
});
app.post('/api/buyer-crm', requireAuth, async (req,res)=>{
  req.db.buyerCrm=req.db.buyerCrm||[]; const b=req.body||{}; const now=new Date().toISOString();
  let row=b.id&&req.db.buyerCrm.find(x=>x.id===b.id&&x.ownerId===req.user.id);
  if(!row){ row={id:crypto.randomUUID(),ownerId:req.user.id,createdAt:now}; req.db.buyerCrm.push(row); }
  row.name=String(b.name||row.name||'').trim().slice(0,100); row.email=String(b.email||row.email||'').trim().slice(0,160); row.phone=String(b.phone||row.phone||'').trim().slice(0,50);
  row.markets=String(b.markets||row.markets||'').trim().slice(0,300); row.buyBox=String(b.buyBox||row.buyBox||'').trim().slice(0,600); row.notes=String(b.notes||row.notes||'').trim().slice(0,1200);
  row.status=['new','contacted','interested','pof','offer','closed','inactive'].includes(b.status)?b.status:(row.status||'new'); row.updatedAt=now;
  if(!row.name) return res.status(400).json({error:'Buyer name is required.'}); await saveDB(req.db); res.json({contact:row});
});
app.delete('/api/buyer-crm/:id', requireAuth, async (req,res)=>{ req.db.buyerCrm=req.db.buyerCrm||[]; const n=req.db.buyerCrm.length; req.db.buyerCrm=req.db.buyerCrm.filter(x=>!(x.id===req.params.id&&x.ownerId===req.user.id)); if(req.db.buyerCrm.length===n)return res.status(404).json({error:'Buyer not found.'}); await saveDB(req.db); res.json({ok:true}); });

app.get('/api/buyers-looking', requireAuth, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase();
  const rows = publicBuyerDemand(req.db, req.user.id).filter(x => {
    if (!q) return true;
    return [x.user?.name, x.user?.username, x.company?.name, x.label, x.strategy, ...(x.cities || []), ...(x.propertyTypes || [])].filter(Boolean).join(' ').toLowerCase().includes(q);
  });
  res.json({ buyers: rows });
});

app.get('/api/listings/:id/matches', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Only the listing owner can view buyer matches.' });
  const matches = buyerMatchesForListing(req.db, listing);
  const publicMatches = matches.flatMap(m => m.boxes.filter(bb => bb.public === true).map(bb => ({
    user: socialUserCard(req.db, req.user.id, m.user),
    buyBox: { label: bb.label || 'Buy box', cities: bb.cities || [], propertyTypes: bb.propertyTypes || [], minPrice: bb.minPrice || 0, maxPrice: bb.maxPrice || 2000000, strategy: bb.strategy || '' }
  })));
  res.json({ totalMatches: matches.length, publicMatches: publicMatches.slice(0, 50), lastNotifiedAt: listing.lastMatchNotifyAt || null });
});

app.post('/api/listings/:id/notify-matches', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Only the listing owner can notify matched buyers.' });
  const last = listing.lastMatchNotifyAt ? new Date(listing.lastMatchNotifyAt).getTime() : 0;
  if (!isAdminUser(req.user) && last && Date.now() - last < 24 * 3600000) return res.status(429).json({ error: 'Matched buyers were notified recently. Try again later.' });
  const matches = buyerMatchesForListing(req.db, listing).filter(m => m.user.settings?.notifyOnMatch !== false).slice(0, 75);
  const url = listingPublicUrl(listing);
  await Promise.all(matches.map(m => mailer.sendBuyerMatchNotice?.(m.user.email, m.user.name, listing, url).catch(e => console.error('[match notify]', e.message))));
  listing.lastMatchNotifyAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ ok: true, notified: matches.length, at: listing.lastMatchNotifyAt });
});

app.post('/api/listings/:id/confirm-active', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  const now = new Date();
  listing.availabilityStatus = 'active'; listing.archivedAt = null; listing.lastConfirmedAt = now.toISOString(); listing.freshAt = now.toISOString();
  listing.expiresAt = new Date(now.getTime() + LISTING_CONFIRM_DAYS * 86400000).toISOString();
  await saveDB(req.db);
  res.json({ listing: { ...listing, freshness: listingFreshness(listing) } });
});

app.post('/api/listings/:id/archive', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  listing.availabilityStatus = 'archived'; listing.archivedAt = new Date().toISOString();
  await saveDB(req.db); res.json({ ok: true });
});

app.get('/api/listings/:id/distribution', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Only the listing owner can generate distribution assets.' });
  res.json({ pack: distributionPack(listing, req.user.referralCode) });
});

/* ============================ DEAL OPERATIONS ============================ */
function canManageListing(db, user, listing) {
  if (!user || !listing) return false;
  if (isAdminUser(user) || listing.ownerId === user.id) return true;
  return !!(listing.companyId && user.companyId && listing.companyId === user.companyId && ['owner','admin','member'].includes(user.companyRole || 'member'));
}
function dealRoomFor(listing) {
  listing.dealRoom = listing.dealRoom || { stage:'marketing', nextAction:'', privateNotes:'', tasks:[], updatedAt:null };
  listing.dealRoom.tasks = Array.isArray(listing.dealRoom.tasks) ? listing.dealRoom.tasks : [];
  return listing.dealRoom;
}
app.get('/api/listings/:id/deal-room', requireAuth, async (req,res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,listing)) return res.status(403).json({error:'This deal room is private to the listing owner and their company team.'});
  res.json({ room:dealRoomFor(listing), listing:{id:listing.id,address:listing.address,city:listing.city,contractDeadline:listing.contractDeadline||null} });
});
app.patch('/api/listings/:id/deal-room', requireAuth, async (req,res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,listing)) return res.status(403).json({error:'Not allowed.'});
  const room=dealRoomFor(listing), b=req.body||{};
  const stages=new Set(['intake','marketing','buyer-interest','negotiation','title','closing','closed','on-hold']);
  if(b.stage!==undefined){ if(!stages.has(String(b.stage))) return res.status(400).json({error:'Choose a valid deal stage.'}); room.stage=String(b.stage); }
  if(b.nextAction!==undefined) room.nextAction=String(b.nextAction).trim().slice(0,240);
  if(b.privateNotes!==undefined) room.privateNotes=String(b.privateNotes).slice(0,4000);
  if(Array.isArray(b.tasks)) room.tasks=b.tasks.slice(0,30).map(t=>({id:String(t.id||crypto.randomUUID()),text:String(t.text||'').trim().slice(0,180),done:t.done===true})).filter(t=>t.text);
  room.updatedAt=new Date().toISOString(); room.updatedBy=req.user.id; await saveDB(req.db); res.json({room});
});
app.get('/api/listings/:id/showings', async (req,res) => {
  const db=await loadDB(), listing=db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  const viewer=db.users.find(u=>u.id===req.session.userId); const manage=canManageListing(db,viewer,listing);
  const slots=(listing.showingSlots||[]).filter(x=>manage || (!x.bookedBy && new Date(x.at)>new Date())).map(x=>({id:x.id,at:x.at,note:x.note||'',booked:!!x.bookedBy,bookedBy:manage?x.bookedBy:null,bookedName:manage?x.bookedName:null}));
  res.json({slots,canManage:manage});
});
app.post('/api/listings/:id/showings', requireAuth, async (req,res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,listing)) return res.status(403).json({error:'Not allowed.'});
  const at=new Date(req.body?.at); if(!Number.isFinite(at.getTime())||at<=new Date()) return res.status(400).json({error:'Choose a future showing time.'});
  listing.showingSlots=listing.showingSlots||[]; if(listing.showingSlots.length>=40) return res.status(400).json({error:'Remove an old showing slot before adding another.'});
  const slot={id:crypto.randomUUID(),at:at.toISOString(),note:String(req.body?.note||'').trim().slice(0,120),bookedBy:null,bookedName:null,createdAt:new Date().toISOString()}; listing.showingSlots.push(slot); await saveDB(req.db); res.json({slot});
});
app.post('/api/listings/:id/showings/:slotId/book', requireAuth, async (req,res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  if(listing.ownerId===req.user.id) return res.status(400).json({error:'You own this listing.'});
  const slot=(listing.showingSlots||[]).find(x=>x.id===req.params.slotId); if(!slot) return res.status(404).json({error:'Showing time not found.'});
  if(slot.bookedBy) return res.status(409).json({error:'That showing time was already reserved.'});
  if(new Date(slot.at)<=new Date()) return res.status(409).json({error:'That showing time has passed.'});
  slot.bookedBy=req.user.id; slot.bookedName=req.user.name; slot.bookedAt=new Date().toISOString(); await saveDB(req.db); res.json({ok:true});
});
app.delete('/api/listings/:id/showings/:slotId', requireAuth, async (req,res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing) return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,listing)) return res.status(403).json({error:'Not allowed.'});
  listing.showingSlots=(listing.showingSlots||[]).filter(x=>x.id!==req.params.slotId); await saveDB(req.db); res.json({ok:true});
});
app.get('/api/demand-insights', requireAuth, async (req,res) => {
  const rows=publicBuyerDemand(req.db,req.user.id); const markets=new Map(), types=new Map(), strategies=new Map();
  for(const r of rows){ for(const c of (r.cities||[])){const k=String(c).trim();if(k) markets.set(k,(markets.get(k)||0)+1)} for(const t of (r.propertyTypes||[])){const k=String(t).trim();if(k) types.set(k,(types.get(k)||0)+1)} if(r.strategy){const k=String(r.strategy).trim();strategies.set(k,(strategies.get(k)||0)+1)} }
  const top=m=>[...m.entries()].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).slice(0,12).map(([label,count])=>({label,count}));
  res.json({activeBuyBoxes:rows.length,markets:top(markets),propertyTypes:top(types),strategies:top(strategies),generatedAt:new Date().toISOString()});
});

/* ============================ SHARE / REFERRAL GROWTH ============================ */
function shareHtmlEscape(value) {
  return String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
}
function absoluteShareAsset(value) {
  if (!value) return `${appBaseUrl()}/brand-logo.png`;
  try { return new URL(String(value), appBaseUrl()).href; }
  catch { return `${appBaseUrl()}/brand-logo.png`; }
}
function sanitizedReferral(value) {
  return String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
}
function shareLandingHtml({ title, description, image, destination, autoRedirect = false }) {
  const safeTitle = shareHtmlEscape(title || 'Better Real Estate');
  const safeDescription = shareHtmlEscape(description || 'Real estate deals, buyers and investor connections in one place.');
  const safeImage = shareHtmlEscape(absoluteShareAsset(image));
  const safeDestination = shareHtmlEscape(destination || appBaseUrl());
  const canonical = shareHtmlEscape(appBaseUrl() + destination);
  const redirectMeta = autoRedirect ? `<meta http-equiv="refresh" content="0;url=${safeDestination}">` : '';
  const redirectScript = autoRedirect ? `<script>location.replace(${JSON.stringify(destination || '/')});</script>` : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<meta name="description" content="${safeDescription}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Better Real Estate">
<meta property="og:title" content="${safeTitle}">
<meta property="og:description" content="${safeDescription}">
<meta property="og:image" content="${safeImage}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${safeTitle}">
<meta name="twitter:description" content="${safeDescription}">
<meta name="twitter:image" content="${safeImage}">
<link rel="canonical" href="${canonical}">${redirectMeta}
<style>
  *{box-sizing:border-box}body{font-family:Inter,system-ui,-apple-system,sans-serif;background:#0b0b0a;color:#f7f6f1;min-height:100vh;margin:0;display:grid;place-items:center;padding:24px}.card{width:min(560px,100%);background:#161614;border:1px solid #34342f;border-radius:20px;overflow:hidden;box-shadow:0 30px 80px rgba(0,0,0,.4)}.image{width:100%;height:300px;object-fit:cover;background:#222}.body{padding:26px}.brand{font-size:12px;font-weight:800;letter-spacing:.1em;color:#ff7a29}.body h1{font-size:28px;line-height:1.1;margin:10px 0 10px}.body p{color:#cfcdc4;line-height:1.55;margin:0 0 22px}.cta{display:inline-block;background:#fff;color:#0b0b0a;text-decoration:none;font-weight:750;padding:12px 18px;border-radius:10px}.foot{font-size:12px;color:#8f8d85;margin-top:18px}
</style>
</head>
<body><main class="card"><img class="image" src="${safeImage}" alt=""><div class="body"><div class="brand">BETTER REAL ESTATE</div><h1>${safeTitle}</h1><p>${safeDescription}</p><a class="cta" href="${safeDestination}">View on Better Real Estate</a><div class="foot">Make better your standard.</div></div></main>${redirectScript}</body></html>`;
}

function destinationWithRef(pathname, referral) {
  const join = pathname.includes('?') ? '&' : '?';
  return pathname + (referral ? `${join}ref=${encodeURIComponent(referral)}` : '');
}

app.get('/s/join', async (req, res) => {
  const referral = sanitizedReferral(req.query.ref);
  const destination = destinationWithRef('/?view=auth', referral);
  res.type('html').send(shareLandingHtml({
    title: 'Join Better Real Estate',
    description: 'A real-estate-only network for investors, wholesalers, buyers, properties and deal distribution.',
    image: '/brand-logo.png',
    destination,
    autoRedirect: true
  }));
});

app.get('/s/property/:id', async (req, res) => {
  const db = await loadDB();
  const listing = db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).type('html').send('Property not found.');
  const referral = sanitizedReferral(req.query.ref);
  const city = listing.city || 'Investment property';
  const facts = [
    `Asking $${Number(listing.asking || 0).toLocaleString()}`,
    listing.arv ? `ARV estimate $${Number(listing.arv).toLocaleString()}` : null,
    listing.propertyType || null
  ].filter(Boolean).join(' · ');
  const destination = destinationWithRef(`/?view=detail&id=${encodeURIComponent(listing.id)}`, referral);
  res.type('html').send(shareLandingHtml({
    title: `${city} deal | Better Real Estate`,
    description: `${facts}. View photos and deal details on Better Real Estate.`,
    image: listing.photos?.[0] || '/brand-logo.png',
    destination
  }));
});

app.get('/s/profile/:id', async (req, res) => {
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.params.id || normalizeUsername(u.username) === normalizeUsername(req.params.id));
  if (!user) return res.status(404).type('html').send('Profile not found.');
  const referral = sanitizedReferral(req.query.ref);
  const listingCount = db.listings.filter(l => l.ownerId === user.id && listingFreshness(l).availabilityStatus !== 'archived').length;
  const destination = destinationWithRef(`/?view=profile&user=${encodeURIComponent(user.id)}`, referral);
  res.type('html').send(shareLandingHtml({
    title: `${user.name} on Better Real Estate`,
    description: `${user.role} · ${listingCount} active listing${listingCount === 1 ? '' : 's'}${user.location ? ` · ${user.location}` : ''}.`,
    image: user.avatarUrl || '/brand-logo.png',
    destination
  }));
});

app.get('/s/company/:id', async (req, res) => {
  const db = await loadDB();
  const company = db.companies.find(c => c.id === req.params.id || c.slug === req.params.id);
  if (!company) return res.status(404).type('html').send('Company not found.');
  const referral = sanitizedReferral(req.query.ref);
  const activeListings = db.listings.filter(l => (l.companyId === company.id || db.users.some(u => u.companyId === company.id && u.id === l.ownerId)) && listingFreshness(l).availabilityStatus !== 'archived').length;
  const destination = destinationWithRef(`/?view=company&company=${encodeURIComponent(company.id)}`, referral);
  res.type('html').send(shareLandingHtml({
    title: `${company.name} | Better Real Estate`,
    description: `${activeListings} active listing${activeListings === 1 ? '' : 's'}${company.markets?.length ? ` · ${company.markets.slice(0,3).join(', ')}` : ''}.`,
    image: company.logoUrl || '/brand-logo.png',
    destination
  }));
});

app.get('/s/buyer/:id', async (req, res) => {
  const db = await loadDB();
  const user = db.users.find(u => u.id === req.params.id || normalizeUsername(u.username) === normalizeUsername(req.params.id));
  if (!user) return res.status(404).type('html').send('Buyer page not found.');
  const referral = sanitizedReferral(req.query.ref);
  const publicBox = getBuyBoxes(user).find(bb => bb.public === true && bb.active !== false);
  const markets = publicBox?.cities?.slice(0,4).join(', ') || user.location || 'multiple markets';
  const destination = destinationWithRef(`/?view=profile&user=${encodeURIComponent(user.id)}`, referral);
  res.type('html').send(shareLandingHtml({
    title: `${user.name} is buying on Better Real Estate`,
    description: `Investor demand in ${markets}${publicBox?.strategy ? ` · ${publicBox.strategy}` : ''}.`,
    image: user.avatarUrl || '/brand-logo.png',
    destination
  }));
});

app.post('/api/share-events', requireAuth, async (req, res) => {
  req.db.shareEvents = req.db.shareEvents || [];
  const now = Date.now();
  const recent = req.db.shareEvents.filter(e => e.userId === req.user.id && now - new Date(e.at || 0).getTime() < 60_000).length;
  if (recent < 30) {
    req.db.shareEvents.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      kind: String(req.body?.kind || 'site').slice(0, 30),
      targetId: String(req.body?.targetId || '').slice(0, 120),
      channel: String(req.body?.channel || 'share').slice(0, 30),
      at: new Date().toISOString()
    });
    await saveDB(req.db);
  }
  res.json({ ok: true });
});

function buyerPortalTarget(db, type, id) {
  if (type === 'company') {
    const c = (db.companies || []).find(x => x.id === id || x.slug === id);
    if (!c) return null;
    return { type: 'company', id: c.id, name: c.name, slug: c.slug, logoUrl: c.logoUrl || null, bio: c.bio || '', markets: c.markets || [] };
  }
  const u = (db.users || []).find(x => x.id === id || normalizeUsername(x.username) === normalizeUsername(id));
  if (!u) return null;
  return { type: 'user', id: u.id, name: u.name, username: u.username || null, logoUrl: u.avatarUrl || null, bio: u.bio || '', markets: [u.location].filter(Boolean) };
}
app.get('/api/buyer-portal/:type/:id', async (req, res) => {
  const db = await loadDB(); const target = buyerPortalTarget(db, req.params.type, req.params.id);
  if (!target) return res.status(404).json({ error: 'Buyer list not found.' });
  res.json({ target });
});
app.post('/api/buyer-portal/:type/:id', async (req, res) => {
  const db = await loadDB(); const target = buyerPortalTarget(db, req.params.type, req.params.id);
  if (!target) return res.status(404).json({ error: 'Buyer list not found.' });
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0,100), email = String(b.email || '').trim().toLowerCase().slice(0,180);
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Name and a valid email are required.' });
  if (b.consent !== true) return res.status(400).json({ error: 'Confirm that you want to share your buying criteria with this wholesaler/company.' });
  const user = db.users.find(u => u.id === req.session?.userId) || null;
  const lead = {
    id: crypto.randomUUID(), targetType: target.type, targetId: target.id, userId: user?.id || null,
    name, email, phone: String(b.phone || '').trim().slice(0,40),
    cities: (Array.isArray(b.cities) ? b.cities : String(b.cities || '').split(',')).map(x => String(x).trim()).filter(Boolean).slice(0,20),
    propertyTypes: Array.isArray(b.propertyTypes) ? b.propertyTypes.slice(0,10) : [],
    minPrice: Number(b.minPrice || 0), maxPrice: Number(b.maxPrice || 2000000), strategy: String(b.strategy || '').trim().slice(0,80),
    notes: String(b.notes || '').trim().slice(0,500), consentAt: new Date().toISOString(), createdAt: new Date().toISOString()
  };
  db.buyerLeads = db.buyerLeads || [];
  const existing = db.buyerLeads.find(x => x.targetType === lead.targetType && x.targetId === lead.targetId && x.email === lead.email);
  if (existing) Object.assign(existing, lead, { id: existing.id, createdAt: existing.createdAt || lead.createdAt }); else db.buyerLeads.push(lead);
  if (user && b.saveToProfile === true) {
    const boxes = getBuyBoxes(user); boxes[0] = { ...defaultBuyBox(), ...(boxes[0] || {}), label: boxes[0]?.label || 'My buy box', minPrice: lead.minPrice, maxPrice: lead.maxPrice, cities: lead.cities, propertyTypes: lead.propertyTypes, strategy: lead.strategy, active: true, public: true, updatedAt: new Date().toISOString() };
    user.buyBoxes = boxes; delete user.buyBox; user.buyingStatus = user.buyingStatus || 'active';
  }
  await saveDB(db); res.json({ ok: true, savedToProfile: !!(user && b.saveToProfile === true) });
});
app.get('/api/buyer-leads', requireAuth, async (req, res) => {
  const company = companyForUser(req.db, req.user);
  const rows = (req.db.buyerLeads || []).filter(x => company ? (x.targetType === 'company' && x.targetId === company.id) : (x.targetType === 'user' && x.targetId === req.user.id));
  res.json({ leads: rows.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,250) });
});

/* ============================ LISTINGS ============================ */
app.post('/api/listings', requireAuth, async (req, res) => {
  if (!req.user.emailVerified && !isAdminUser(req.user)) return res.status(403).json({ error: 'Confirm your email before posting a listing.' });
  const b = req.body || {};
  if (!b.address || !b.city || !b.asking) return res.status(400).json({ error: 'Address, city, and asking price are required.' });
  const photos = (await Promise.all((Array.isArray(b.photos) ? b.photos : []).slice(0, 12).map(writeImage))).filter(Boolean);
  const activeCompany = companyForUser(req.db, req.user);
  const listing = {
    id: crypto.randomUUID(), ownerId: req.user.id, ownerName: req.user.name, ownerEmail: req.user.email,
    companyId: activeCompany && isWholesale(req.user) ? activeCompany.id : null,
    companyName: activeCompany && isWholesale(req.user) ? activeCompany.name : null,
    address: String(b.address).trim(), city: String(b.city).trim(),
    propertyType: b.propertyType || 'Single family', situation: b.situation || 'Motivated seller',
    asking: Number(b.asking), arv: b.arv ? Number(b.arv) : null, rehab: b.rehab ? Number(b.rehab) : null,
    beds: b.beds ? Number(b.beds) : null, baths: b.baths ? Number(b.baths) : null,
    sqft: b.sqft ? Number(b.sqft) : null, year: b.year ? Number(b.year) : null,
    timeline: b.timeline || 'Flexible', notes: String(b.notes || '').slice(0, 1500),
    videoUrl: String(b.videoUrl || '').slice(0, 300) || null,
    contractDeadline: /^20\d{2}-\d{2}-\d{2}$/.test(String(b.contractDeadline || '')) ? String(b.contractDeadline) : null,
    openToJV: b.openToJV === true || b.openToJV === 'true',
    photos, boostUntil: null, boostWeight: 0, spotlightUntil: null,
    freshAt: new Date().toISOString(), lastConfirmedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + LISTING_CONFIRM_DAYS * 86400000).toISOString(), availabilityStatus: 'active', archivedAt: null,
    closedVerified: false,
    createdAt: new Date().toISOString()
  };
  req.db.listings.push(listing); await saveDB(req.db);
  notifyPlatinumMatches(req.db, listing).catch(e => console.error('[alerts]', e.message));
  const matchCount = buyerMatchesForListing(req.db, listing).length;
  res.json({ listing: { ...listing, freshness: listingFreshness(listing) }, matchCount });
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
  if (unlocked) return { ...listing, freshness: listingFreshness(listing), locked: false };
  const { address, notes, ownerEmail, videoUrl, ...rest } = listing;
  return { ...rest, freshness: listingFreshness(listing), address: 'Address hidden', notes: null, ownerEmail: null, videoUrl: null, locked: true };
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
  const ownerCompany = owner?.companyId ? db.companies.find(c => c.id === owner.companyId) : null;
  const gatedOwner = owner ? { ...publicProfileUser(owner), email: gated.locked ? null : owner.email, phone: gated.locked ? null : owner.phone } : null;
  if (gatedOwner) gatedOwner.publicMembership = publicMembershipLabel(owner);
  if (gatedOwner && ownerCompany) gatedOwner.company = publicCompany(ownerCompany);
  res.json({
    listing: gated,
    owner: gatedOwner,
    otherListings: others,
    unlockCredits: viewer ? viewer.unlockCredits : 0,
    access: accessFor(viewer),
    reviews: db.reviews.filter(r => r.aboutUserId === listing.ownerId)
  });
});

app.post('/api/listings/:id/unlock', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Not found.' });
  if (isAdminUser(req.user)) return res.json({ ok: true, already: true, adminUnlimited: true });
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
  if (req.db.listings[i].ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  req.db.listings.splice(i, 1); await saveDB(req.db); res.json({ ok: true });
});

app.get('/api/users/:id/listings', async (req, res) => {
  const db = await loadDB();
  const owner = db.users.find(u => u.id === req.params.id);
  if (!owner) return res.status(404).json({ error: 'User not found.' });
  const viewer = db.users.find(u => u.id === req.session.userId);
  const ownerCompany = owner.companyId ? db.companies.find(c => c.id === owner.companyId) : null;
  res.json({
    owner: publicProfileUser(owner),
    publicMembership: publicMembershipLabel(owner),
    company: ownerCompany ? publicCompany(ownerCompany) : null,
    listings: db.listings.filter(l => l.ownerId === owner.id && (viewer?.id === owner.id || listingFreshness(l).availabilityStatus !== 'archived')).map(l => gateListing(l, viewer, db)),
    followerCount: db.follows.filter(f => f.followingId === owner.id).length,
    friendCount: db.friendships.filter(f => f.userAId === owner.id || f.userBId === owner.id).length,
    friendship: viewer ? friendRelationship(db, viewer.id, owner.id) : { status: 'none', requestId: null },
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
  const feed = db.listings.filter(l => listingFreshness(l).availabilityStatus !== 'archived').map(l => {
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
  res.json({ feed, access: accessFor(viewer) });
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

  // Admin accounts have every promotion included with no quota. Platinum
  // keeps its normal one-Super-Boost-per-calendar-month benefit.
  const adminIncluded = isAdminUser(req.user);
  const thisMonth = new Date().toISOString().slice(0, 7); // 'YYYY-MM'
  const freeBoostAvailable = !adminIncluded && tierId === 'superboost' && isPlatinum(req.user) && req.user.lastFreeBoostMonth !== thisMonth;

  let usedFreeBoost = adminIncluded || freeBoostAvailable;
  if (freeBoostAvailable) {
    req.user.lastFreeBoostMonth = thisMonth;
  } else if (!adminIncluded) {
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
  req.db.promotions.push({ id: crypto.randomUUID(), listingId, userId: req.user.id, tierId, price: usedFreeBoost ? 0 : tier.price, freeWithPlatinum: freeBoostAvailable, includedWithAdmin: adminIncluded, at: new Date().toISOString() });
  if (!usedFreeBoost) maybePayReferral(req.db, req.user);
  await saveDB(req.db);
  res.json({ listing, usedFreeBoost, adminIncluded });
});

/* ============================ SELLER ANALYTICS ============================ */
app.get('/api/listings/:id/analytics', requireAuth, async (req, res) => {
  const l = req.db.listings.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found.' });
  if (l.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
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
app.post('/api/admin/set-user-verification', requireAuth, requireAdmin, async (req, res) => {
  const u = req.db.users.find(x => x.id === req.body?.userId && x.role !== 'admin');
  if (!u) return res.status(404).json({ error: 'User not found.' });
  u.verified = req.body?.verified === true;
  u.verificationPending = false;
  u.verifiedAt = u.verified ? new Date().toISOString() : null;
  await saveDB(req.db);
  res.json({ ok: true, verified: u.verified });
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
  res.json({ configured: ai.configured(), available: isPlatinum(req.user), model: ai.configured() ? ai.model() : null });
});
app.post('/api/ai/listing-copy', requireAuth, async (req, res) => {
  const kind = ['shop','property','cj'].includes(req.body?.kind) ? req.body.kind : 'shop';
  const isAdmin = isAdminUser(req.user);
  if (kind === 'cj' && !isAdmin) return res.status(403).json({ error: 'Admin only.' });
  if (!isAdmin && !isPlatinum(req.user)) return res.status(403).json({ error: 'AI listing assistance is a Platinum feature.' });
  if (!ai.configured()) return res.status(503).json({ error: 'AI listing assistance is not configured yet.' });

  const day = new Date().toISOString().slice(0, 10);
  const limit = 30;
  if (!isAdmin) {
    if (req.user.aiUsageDay !== day) { req.user.aiUsageDay = day; req.user.aiUsageCount = 0; }
    if (Number(req.user.aiUsageCount || 0) >= limit) return res.status(429).json({ error: 'Daily AI listing limit reached. Try again tomorrow.' });
    req.user.aiUsageCount = Number(req.user.aiUsageCount || 0) + 1;
    await saveDB(req.db);
  }

  const facts = req.body?.facts && typeof req.body.facts === 'object' ? req.body.facts : {};
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : [];
  try {
    const draft = await ai.generateListingCopy({ kind, facts, images, allowedCategories: kind === 'property' ? [] : SHOP_CATEGORIES });
    if (draft.categorySuggestion && !SHOP_CATEGORIES.includes(draft.categorySuggestion) && kind !== 'property') draft.categorySuggestion = '';
    res.json({ draft, remainingToday: isAdmin ? null : Math.max(0, limit - req.user.aiUsageCount), unlimited: isAdmin });
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
  return isAdminUser(user);
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

/* ============================ SOCIAL NETWORK ============================ */
app.get('/api/network/users', requireAuth, async (req, res) => {
  res.json({ users: social.searchUsers(req.db, req.user.id, req.query.q, req.query.role) });
});

app.get('/api/friends', requireAuth, async (req, res) => {
  const ids = new Set();
  req.db.friendships.forEach(f => {
    if (f.userAId === req.user.id) ids.add(f.userBId);
    if (f.userBId === req.user.id) ids.add(f.userAId);
  });
  const friends = [...ids].map(id => req.db.users.find(u => u.id === id)).filter(Boolean).map(u => socialUserCard(req.db, req.user.id, u));
  friends.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ friends });
});

app.get('/api/friends/requests', requireAuth, async (req, res) => {
  const pending = req.db.friendRequests.filter(r => r.status === 'pending' && (r.fromUserId === req.user.id || r.toUserId === req.user.id));
  const incoming = pending.filter(r => r.toUserId === req.user.id).map(r => ({ ...r, user: socialUserCard(req.db, req.user.id, req.db.users.find(u => u.id === r.fromUserId)) })).filter(r => r.user);
  const outgoing = pending.filter(r => r.fromUserId === req.user.id).map(r => ({ ...r, user: socialUserCard(req.db, req.user.id, req.db.users.find(u => u.id === r.toUserId)) })).filter(r => r.user);
  res.json({ incoming, outgoing });
});

app.get('/api/friends/status/:userId', requireAuth, async (req, res) => {
  res.json(friendRelationship(req.db, req.user.id, req.params.userId));
});

app.post('/api/friends/request', requireAuth, async (req, res) => {
  const userId = String(req.body?.userId || '');
  if (!userId || userId === req.user.id) return res.status(400).json({ error: "You can't friend yourself." });
  const other = req.db.users.find(u => u.id === userId);
  if (!other) return res.status(404).json({ error: 'User not found.' });
  const rel = friendRelationship(req.db, req.user.id, userId);
  if (rel.status === 'friends') return res.json({ status: 'friends' });
  const pendingOut = req.db.friendRequests.filter(r => r.fromUserId === req.user.id && r.status === 'pending').length;
  if (rel.status === 'none' && pendingOut >= 100) return res.status(429).json({ error: 'You have too many pending friend requests. Cancel some before sending more.' });
  if (rel.status === 'outgoing_pending') return res.json({ status: 'outgoing_pending', requestId: rel.requestId });
  if (rel.status === 'incoming_pending') {
    const i = req.db.friendRequests.findIndex(r => r.id === rel.requestId);
    if (i >= 0) req.db.friendRequests.splice(i, 1);
    req.db.friendships.push({ id: crypto.randomUUID(), userAId: req.user.id, userBId: userId, at: new Date().toISOString() });
    await saveDB(req.db);
    return res.json({ status: 'friends' });
  }
  const request = { id: crypto.randomUUID(), fromUserId: req.user.id, toUserId: userId, status: 'pending', at: new Date().toISOString() };
  req.db.friendRequests.push(request);
  await saveDB(req.db);
  res.json({ status: 'outgoing_pending', requestId: request.id });
});

app.post('/api/friends/requests/:id/respond', requireAuth, async (req, res) => {
  const action = String(req.body?.action || '').toLowerCase();
  const i = req.db.friendRequests.findIndex(r => r.id === req.params.id && r.toUserId === req.user.id && r.status === 'pending');
  if (i < 0) return res.status(404).json({ error: 'Friend request not found.' });
  const request = req.db.friendRequests[i];
  if (!['accept','decline'].includes(action)) return res.status(400).json({ error: 'Choose accept or decline.' });
  req.db.friendRequests.splice(i, 1);
  if (action === 'accept') {
    const exists = req.db.friendships.some(f => (f.userAId === req.user.id && f.userBId === request.fromUserId) || (f.userAId === request.fromUserId && f.userBId === req.user.id));
    if (!exists) req.db.friendships.push({ id: crypto.randomUUID(), userAId: request.fromUserId, userBId: req.user.id, at: new Date().toISOString() });
  }
  await saveDB(req.db);
  res.json({ status: action === 'accept' ? 'friends' : 'none' });
});

app.delete('/api/friends/request/:id', requireAuth, async (req, res) => {
  const i = req.db.friendRequests.findIndex(r => r.id === req.params.id && r.fromUserId === req.user.id && r.status === 'pending');
  if (i < 0) return res.status(404).json({ error: 'Friend request not found.' });
  req.db.friendRequests.splice(i, 1);
  await saveDB(req.db);
  res.json({ status: 'none' });
});

app.delete('/api/friends/:userId', requireAuth, async (req, res) => {
  const userId = req.params.userId;
  const before = req.db.friendships.length;
  req.db.friendships = req.db.friendships.filter(f => !((f.userAId === req.user.id && f.userBId === userId) || (f.userAId === userId && f.userBId === req.user.id)));
  if (before === req.db.friendships.length) return res.status(404).json({ error: 'Friendship not found.' });
  await saveDB(req.db);
  res.json({ status: 'none' });
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
  const clean = String(body || '').trim();
  if (!toUserId || !clean) return res.status(400).json({ error: 'Message body is required.' });
  if (toUserId === req.user.id) return res.status(400).json({ error: "You can't message yourself." });
  const other = req.db.users.find(u => u.id === toUserId);
  if (!other) return res.status(404).json({ error: 'User not found.' });
  const recentCount = req.db.messages.filter(m => m.fromUserId === req.user.id && Date.now() - new Date(m.at).getTime() < 60_000).length;
  if (recentCount >= 30) return res.status(429).json({ error: 'Too many messages at once. Try again in a minute.' });
  const listing = listingId ? req.db.listings.find(l => l.id === listingId) : null;
  const msg = { id: crypto.randomUUID(), fromUserId: req.user.id, fromName: req.user.name, toUserId, listingId: listing?.id || null, body: clean.slice(0, 2000), at: new Date().toISOString(), read: false };
  req.db.messages.push(msg); await saveDB(req.db); res.json({ message: msg });
});

app.get('/api/conversations', requireAuth, async (req, res) => {
  const mine = req.db.messages.filter(m => m.toUserId === req.user.id || m.fromUserId === req.user.id).sort((a, b) => new Date(b.at) - new Date(a.at));
  const map = new Map();
  for (const m of mine) {
    const otherId = m.fromUserId === req.user.id ? m.toUserId : m.fromUserId;
    if (!map.has(otherId)) {
      const other = req.db.users.find(u => u.id === otherId);
      if (!other) continue;
      const listing = m.listingId ? req.db.listings.find(l => l.id === m.listingId) : null;
      const visibleListing = listing ? gateListing(listing, req.user, req.db) : null;
      map.set(otherId, {
        other: socialUserCard(req.db, req.user.id, other),
        latest: { id: m.id, body: m.body, at: m.at, outgoing: m.fromUserId === req.user.id, listingId: m.listingId || null, listingAddress: visibleListing?.address || null },
        unreadCount: 0
      });
    }
    if (m.toUserId === req.user.id && !m.read) map.get(otherId).unreadCount += 1;
  }
  res.json({ conversations: [...map.values()] });
});

app.get('/api/conversations/:userId', requireAuth, async (req, res) => {
  const other = req.db.users.find(u => u.id === req.params.userId);
  if (!other) return res.status(404).json({ error: 'User not found.' });
  let changed = false;
  const messages = req.db.messages
    .filter(m => (m.fromUserId === req.user.id && m.toUserId === other.id) || (m.fromUserId === other.id && m.toUserId === req.user.id))
    .sort((a, b) => new Date(a.at) - new Date(b.at))
    .map(m => {
      if (m.toUserId === req.user.id && !m.read) { m.read = true; m.readAt = new Date().toISOString(); changed = true; }
      const listing = m.listingId ? req.db.listings.find(l => l.id === m.listingId) : null;
      const visibleListing = listing ? gateListing(listing, req.user, req.db) : null;
      return { id: m.id, body: m.body, at: m.at, outgoing: m.fromUserId === req.user.id, listingId: m.listingId || null, listingAddress: visibleListing?.address || null, read: !!m.read };
    });
  if (changed) await saveDB(req.db);
  res.json({ other: socialUserCard(req.db, req.user.id, other), messages });
});

app.get('/api/messages/unread-count', requireAuth, async (req, res) => {
  res.json({ unreadCount: req.db.messages.filter(m => m.toUserId === req.user.id && !m.read).length });
});

// Backward-compatible flat inbox for older clients.
app.get('/api/messages', requireAuth, async (req, res) => {
  const mine = req.db.messages.filter(m => m.toUserId === req.user.id || m.fromUserId === req.user.id).map(m => {
    const otherId = m.fromUserId === req.user.id ? m.toUserId : m.fromUserId;
    const other = req.db.users.find(u => u.id === otherId);
    const listing = m.listingId ? req.db.listings.find(l => l.id === m.listingId) : null;
    const visibleListing = listing ? gateListing(listing, req.user, req.db) : null;
    return { ...m, otherName: other?.name || 'Unknown', otherId, listingAddress: visibleListing?.address || null, outgoing: m.fromUserId === req.user.id };
  }).sort((a, b) => new Date(b.at) - new Date(a.at));
  res.json({ messages: mine });
});

/* ============================ LEADERBOARD & ADMIN ============================ */
app.get('/api/leaderboard', async (req, res) => {
  const db = await loadDB();
  const period = String(req.query.period || 'all') === 'month' ? 'month' : 'all';
  res.json({ leaderboard: leaderboardRows(db, period), period });
});
app.get('/api/admin/pending', requireAuth, requireAdmin, async (req, res) => {
  res.json({ pending: req.db.saves.filter(s => !s.verified).map(s => ({ ...s, listing: req.db.listings.find(l => l.id === s.listingId) })) });
});
app.post('/api/admin/verify', requireAuth, requireAdmin, async (req, res) => {
  const save = req.db.saves.find(s => s.id === req.body?.saveId);
  if (!save) return res.status(404).json({ error: 'Not found.' });
  if (save.verified) return res.status(409).json({ error: 'Already verified.' });
  save.verified = true;
  save.verifiedAt = new Date().toISOString();
  const listing = req.db.listings.find(l => l.id === save.listingId);
  if (listing) listing.closedVerified = true;
  const buyer = req.db.users.find(u => u.id === save.userId);
  const seller = listing ? req.db.users.find(u => u.id === listing.ownerId) : null;
  if (buyer) buyer.points = Number(buyer.points || 0) + 100;
  if (seller) seller.points = Number(seller.points || 0) + 100;
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

/* ============================ ADMIN MEMBERSHIP GRANTS ============================ */
app.get('/api/admin/memberships', requireAuth, requireAdmin, async (req, res) => {
  const q = String(req.query.q || '').trim().toLowerCase().slice(0, 120);
  const users = req.db.users
    .filter(u => u.role !== 'admin')
    .filter(u => !q || [u.name, u.email, u.username, u.role, u.location].filter(Boolean).join(' ').toLowerCase().includes(q))
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 120)
    .map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      username: u.username || null,
      role: u.role,
      location: u.location || '',
      paidPlan: u.plan || 'free',
      paidPlanUntil: u.planUntil || null,
      grant: membershipGrantSummary(u),
      access: accessFor(u),
      createdAt: u.createdAt || null,
      verified: !!u.verified,
      verificationPending: !!u.verificationPending
    }));
  const history = (req.db.membershipGrants || [])
    .slice()
    .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 80)
    .map(g => {
      const u = req.db.users.find(x => x.id === g.userId);
      return { ...g, userName: u?.name || 'Deleted account', userEmail: u?.email || null };
    });
  const monthly = leaderboardRows(req.db, 'month');
  res.json({ users, history, monthlyLeader: monthly[0] || null });
});

app.post('/api/admin/memberships/grant', requireAuth, requireAdmin, async (req, res) => {
  const user = req.db.users.find(u => u.id === req.body?.userId && u.role !== 'admin');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  let grant;
  try {
    grant = grantMembership(req.db, user, {
      tier: req.body?.tier,
      days: req.body?.days,
      reason: req.body?.reason,
      grantedBy: req.user.id,
      source: 'manual'
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  await saveDB(req.db);
  if (mailer.configured() && user.emailVerified) mailer.sendMembershipGranted?.(user.email, user.name, { tier: grant.plan, expiresAt: grant.until, reason: user.grantReason }).catch(e => console.error('[mail][membership-grant]', e.message));
  res.json({ ok: true, user: { id: user.id, name: user.name, email: user.email }, grant, access: accessFor(user) });
});

app.post('/api/admin/memberships/revoke', requireAuth, requireAdmin, async (req, res) => {
  const user = req.db.users.find(u => u.id === req.body?.userId && u.role !== 'admin');
  if (!user) return res.status(404).json({ error: 'User not found.' });
  revokeMembershipGrant(req.db, user, req.user.id);
  await saveDB(req.db);
  res.json({ ok: true, access: accessFor(user) });
});

app.post('/api/admin/memberships/award-leaderboard', requireAuth, requireAdmin, async (req, res) => {
  const leader = leaderboardRows(req.db, 'month').find(r => r.points > 0);
  if (!leader) return res.status(409).json({ error: 'There is no monthly leaderboard leader with verified closing points yet.' });
  const user = req.db.users.find(u => u.id === leader.id);
  if (!user) return res.status(404).json({ error: 'Leaderboard user not found.' });
  let grant;
  try {
    grant = grantMembership(req.db, user, {
      tier: req.body?.tier || 'platinum',
      days: req.body?.days || 30,
      reason: req.body?.reason || `Monthly leaderboard prize — ${leader.points} pts`,
      grantedBy: req.user.id,
      source: 'leaderboard'
    });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
  await saveDB(req.db);
  if (mailer.configured() && user.emailVerified) mailer.sendMembershipGranted?.(user.email, user.name, { tier: grant.plan, expiresAt: grant.until, reason: user.grantReason }).catch(e => console.error('[mail][membership-prize]', e.message));
  res.json({ ok: true, winner: leader, grant });
});


/* ============================ ADMIN EMAIL CENTER ============================ */
app.get('/api/admin/email-center', requireAuth, requireAdmin, async (req, res) => {
  const health = mailer.health();
  const counts = {
    users: req.db.users.filter(u => u.role !== 'admin').length,
    emailVerified: req.db.users.filter(u => u.role !== 'admin' && u.emailVerified).length,
    marketingOptIn: req.db.users.filter(u => u.role !== 'admin' && u.emailVerified && u.marketingOptIn === true && !u.marketingUnsubscribedAt).length,
    verificationPending: req.db.users.filter(u => u.role !== 'admin' && !u.emailVerified).length
  };
  const broadcasts = (req.db.emailBroadcasts || []).slice().sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 30)
    .map(b => ({ id:b.id, subject:b.subject, audience:b.audience, status:b.status, scheduledAt:b.scheduledAt, createdAt:b.createdAt, sentCount:Number(b.sentCount||0), failedCount:Number(b.failedCount||0), finishedAt:b.finishedAt || null }));
  const verificationFailures = req.db.users.filter(u => u.role !== 'admin' && u.verificationEmailLastStatus === 'failed').sort((a,b) => new Date(b.verificationEmailLastAttemptAt || 0) - new Date(a.verificationEmailLastAttemptAt || 0)).slice(0, 10).map(u => ({ email:u.email, at:u.verificationEmailLastAttemptAt || null, error:u.verificationEmailLastError || 'Delivery failed' }));
  res.json({
    health,
    marketingConfigured: marketing.configured(),
    counts,
    broadcasts,
    verificationFailures,
    signupAlertsEnabled: req.user.settings?.notifyOnNewSignup !== false
  });
});

app.patch('/api/admin/email-center/signup-alerts', requireAuth, requireAdmin, async (req, res) => {
  const next = { ...defaultSettings(), ...req.user.settings };
  next.notifyOnNewSignup = req.body?.enabled !== false;
  req.user.settings = next;
  await saveDB(req.db);
  res.json({ enabled: next.notifyOnNewSignup });
});

app.post('/api/admin/email-center/preview-audience', requireAuth, requireAdmin, async (req, res) => {
  const users = communications.eligibleBroadcastUsers(req.db, req.body?.audience || {});
  res.json({ count: users.length });
});

app.post('/api/admin/email-center/test', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (!mailer.configured()) throw new Error('RESEND_API_KEY is not configured for this deployment.');
    const result = await mailer.sendMailTest(req.user.email);
    res.json({ ok: true, result: result?.id ? { id: result.id } : result });
  } catch (e) {
    console.error('[mail][admin-test]', e.message);
    res.status(502).json({ error: e.message });
  }
});

app.post('/api/admin/email-center/broadcast-test', requireAuth, requireAdmin, async (req, res) => {
  if (!marketing.configured()) return res.status(400).json({ error: 'Marketing email is not fully configured. Check Mail health first.' });
  let draft;
  try { draft = communications.normalizeBroadcastInput(req.body || {}, req.user.id); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  try {
    await mailer.sendAdminBroadcast(req.user.email, req.user.name, {
      subject: `[TEST] ${draft.subject}`, headline: draft.headline, body: draft.body, ctaLabel: draft.ctaLabel, ctaUrl: draft.ctaUrl,
      unsubscribeUrl: `${String(process.env.APP_URL || '').replace(/\/$/, '')}/?view=settings`,
      preferencesUrl: `${String(process.env.APP_URL || '').replace(/\/$/, '')}/?view=settings`,
      postalAddress: String(process.env.MARKETING_POSTAL_ADDRESS || '').trim()
    });
    res.json({ ok: true });
  } catch (e) { res.status(502).json({ error: e.message }); }
});

app.post('/api/admin/email-center/broadcasts', requireAuth, requireAdmin, async (req, res) => {
  if (!marketing.configured()) return res.status(400).json({ error: 'Marketing email is not fully configured. Check Mail health first.' });
  let broadcast;
  try { broadcast = communications.normalizeBroadcastInput(req.body || {}, req.user.id); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  req.db.emailBroadcasts.push(broadcast);
  await saveDB(req.db);
  const sendNow = new Date(broadcast.scheduledAt).getTime() <= Date.now() + 30_000;
  const result = sendNow ? await communications.runBroadcastCycle({ broadcastId: broadcast.id, limit: 40 }) : { queued: true };
  res.json({ ok: true, broadcastId: broadcast.id, status: broadcast.status, result });
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
          const tier = ['pro','platinum','wholesale'].includes(sess.metadata?.tier) ? sess.metadata.tier : 'pro';
          user.plan = tier;
          user.planPeriod = period;
          user.stripeSubscriptionId = sess.subscription;
          // Approximate for right now — the invoice.payment_succeeded event
          // below fires moments later with Stripe's exact period end and
          // corrects this. Good enough as a starting value in the meantime.
          user.planUntil = new Date(Date.now() + (period === 'annual' ? 365 : 30) * 86400000).toISOString();
          syncCompanyMemberEntitlements(db, user);
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
          if (user.plan === 'wholesale') syncCompanyMemberEntitlements(db, user);
          const planLabel = user.plan === 'wholesale' ? PRICING.wholesale.label : user.plan === 'platinum' ? PRICING.platinum.label : PRICING.pro.label;
          const isRenewal = db.ledger.some(l => l.userId === user.id && l.description?.startsWith(planLabel));
          ledgerAdd(db, user.id, 'purchase', 0, isRenewal ? `${planLabel} — renewed automatically` : `${planLabel} — subscribed`, { invoiceId: inv.id, charged: inv.amount_paid });
          await saveDB(db);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const user = db.users.find(u => u.stripeSubscriptionId === sub.id);
        if (user) { user.plan = 'free'; user.planUntil = null; user.stripeSubscriptionId = null; syncCompanyMemberEntitlements(db, user); await saveDB(db); }
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

/* ============================ IMAGES (Blobs + durable DB fallback) ============================ */
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
