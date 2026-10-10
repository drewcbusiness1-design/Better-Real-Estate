const express = require('express');
const bcrypt = require('bcryptjs');
const cookieSession = require('cookie-session');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const mailer = require('./mailer');

const { loadDB, saveDB, appendRecord } = require('./store');
const {isAffiliateOnlyUser} = require('./affiliateAccounts');
const { writeImage, readImage, writeDocument, readDocument } = require('./storage');
const dropship = require('./dropship');
const cjAdapter = require('./cj-adapter');
const policy = require('./policy');
const payments = require('./payments');
const ai = require('./ai');
const marketing = require('./marketing');
const communications = require('./communications');
const social = require('./social');
const dealResearchCache = require('./dealResearchCache');
const dealResearchJobs = require('./dealResearchJobs');
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
  pro: { monthly: 3000, annual: 32000, label: 'Better Plus' },  // $30/mo or $320/yr
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
  referralBonus: 100,             // $1 Better Credit each side, paid once on the referee's first qualifying purchase
  signupTrialDays: 7
};

const FOUNDER_PROGRAM_LIMIT = 50;
const FOUNDER_PLATINUM_DAYS = 14;


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

const publicUser = u => { if (!u) return null; const { passwordHash, marketingOptIn, marketingConsentAt, marketingUnsubscribedAt, marketingLastSentAt, marketingSequence, aiUsageDay, aiUsageCount, plusToolUsage, verificationEmailLastError, ...r } = u; return r; };
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
  if (ensureFirst100FounderProgram(db)) changed = true;
  if (syncOneCompanyMember(db, user)) changed = true;
  // Activity timestamps are owned by the heartbeat endpoint. Updating them in
  // every authenticated request caused unrelated page loads to become writes.
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

const defaultBuyBox = () => ({ minPrice: 0, maxPrice: 2000000, minArv: 0, maxArv: 0, minBeds: 0, minBaths: 0, cities: [], states: [], propertyTypes: [], minSpread: 0, rehabTolerance: 'any', active: true, public: false, strategy: '', updatedAt: null });
const defaultSettings = () => ({
  theme: 'light',
  feedDensity: 'comfortable',
  notifyOnMessage: true,
  messageEmailDelayMinutes: 60,
  notifyOnMatch: true,
  showMembershipLevel: true,
  showActivityStatus: true,
  tutorialCompletedVersion: 0,
  tutorialDismissedVersion: 0,
  tutorialCompletedKeys: [],
  tutorialHighestRank: -1,
  firstLookCompleted: false,
  guideContextTips: true,
  guideAnimations: true,
  guideCourseCompleted: [],
  guideCourseQuizPassed: [],
  guideCourseLastModule: 'foundations',
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
function withdrawableBalanceOf(db,user){ return Math.max(0,balanceOf(db,user.id)-Math.max(0,Number(user.betterCreditCents||0))); }
function isAdminUser(user) {
  return !!user && user.role === 'admin' && policy.isAdminEmail(user.email);
}
function isCompanyEntitled(user) { return !!(user?.companyPlanUntil && new Date(user.companyPlanUntil) > new Date()); }
function activeFounderPlatinum(user) {
  if (!user?.founderPlatinumUntil) return null;
  const until = new Date(user.founderPlatinumUntil);
  if (!Number.isFinite(until.getTime()) || until <= new Date()) return null;
  return { until: until.toISOString(), startedAt: user.founderPlatinumStartedAt || null, position: Number(user.founderLaunchPosition || 0) || null };
}
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
    !!activeFounderPlatinum(user) ||
    isCompanyEntitled(user)
  );
}
function isPlatinum(user) {
  if (isAdminUser(user)) return true;
  return !!user && (
    ((user.plan === 'platinum' || user.plan === 'wholesale') && user.planUntil && new Date(user.planUntil) > new Date()) ||
    grantIncludes(user, 'platinum') ||
    !!activeFounderPlatinum(user) ||
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
  if (a?.pro) return 'Plus';
  if (a?.trial) return 'Trial';
  return 'Free';
}

function accessFor(user) {
  const demoPlan = demoPlanAccess(user);
  if (demoPlan) return { adminUnlimited:false, wholesale:demoPlan==='wholesale', platinum:['platinum','wholesale'].includes(demoPlan), pro:['pro','platinum','wholesale'].includes(demoPlan), trial:false, demo:true, demoPlan };
  if (!user) return null;
  const grant = activeMembershipGrant(user);
  return {
    pro: isPro(user), platinum: isPlatinum(user), wholesale: isWholesale(user), trial: inTrial(user), full: hasFullAccess(user),
    adminUnlimited: isAdminUser(user), companyId: user.companyId || null, companyRole: user.companyRole || null,
    grantPlan: grant?.plan || null, grantUntil: grant?.until || null, grantReason: grant?.reason || null,
    founderPlatinumUntil: activeFounderPlatinum(user)?.until || null, founderLaunchPosition: Number(user.founderLaunchPosition || 0) || null,
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
  const remainingDays = active ? Math.max(1, Math.ceil((new Date(active.until).getTime() - Date.now()) / 86400000)) : 0;
  return {
    grantPlan: user?.grantPlan || null,
    grantUntil: user?.grantUntil || null,
    grantReason: user?.grantReason || null,
    grantedAt: user?.grantedAt || null,
    grantedBy: user?.grantedBy || null,
    remainingDays,
    active: !!active
  };
}

function founderProgramEligible(user) {
  return !!user && !isAdminUser(user) && user.role !== 'admin' && !isAffiliateOnlyUser(user) && user.demo !== true && user.founderProgramExcluded !== true;
}
function isDemoUser(user) { return !!user && user.demo === true; }
function demoPlanAccess(user) {
  if (!isDemoUser(user)) return null;
  const p = String(user.demoPlan || 'free').toLowerCase();
  return ['free','pro','platinum','wholesale'].includes(p) ? p : 'free';
}
function ensureFirst100FounderProgram(db) {
  db.founderAwards = db.founderAwards || [];
  const awards = db.founderAwards;
  const usersById = new Map((db.users || []).map(u => [u.id, u]));
  const now = new Date();
  let changed = false;

  // Preserve a tombstone for deleted Founder accounts so their spot returns to
  // the pool but the same identity cannot delete/re-register to claim it again.
  for (const award of awards) {
    if (award.voidedAt) continue;
    if (!usersById.has(award.userId)) {
      award.voidedAt = now.toISOString();
      award.voidReason = award.voidReason || 'account-deleted';
      award.voidedEmailLower = String(award.userEmail || '').trim().toLowerCase() || null;
      award.formerUserId = award.formerUserId || award.userId;
      changed = true;
    }
  }
  // Affiliate-only accounts never consume recognition, bonus dates or First 50 slots.
  for (const user of db.users || []) {
    if (!isAffiliateOnlyUser(user)) continue;
    for (const award of awards.filter(a => a.userId === user.id && !a.voidedAt && !a.limitExcludedAt)) {
      award.limitExcludedAt = now.toISOString(); award.limitExclusionReason = 'affiliate-only-account'; changed = true;
    }
    for (const key of ['foundingMemberAt','foundingMemberSource','founderLaunchPosition','founderPlatinumStartedAt','founderPlatinumUntil','founderLaunchNoticeSeenAt']) {
      if (user[key] != null) { user[key] = null; changed = true; }
    }
    if (user.foundingMember) { user.foundingMember = false; changed = true; }
  }
  const blockedEmails = new Set(awards.filter(a => a.voidedAt).map(a => String(a.voidedEmailLower || a.userEmail || '').trim().toLowerCase()).filter(Boolean));
  const ordered = (db.users || []).filter(u => founderProgramEligible(u) && !blockedEmails.has(String(u.email || '').trim().toLowerCase())).slice().sort((a,b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : Number.MAX_SAFE_INTEGER, tb = b.createdAt ? new Date(b.createdAt).getTime() : Number.MAX_SAFE_INTEGER;
    return ta - tb || String(a.id).localeCompare(String(b.id));
  });
  const eligibleRankIds = new Set(ordered.slice(0, FOUNDER_PROGRAM_LIMIT).map(u => u.id));
  // Retire only automatic program awards outside the reduced cap. Retain original
  // dates for audit and possible rank refill; never restart a previous bonus.
  const liveAwards = awards.filter(a => !a.voidedAt && !a.limitExcludedAt && usersById.has(a.userId)).sort((a,b) => new Date(a.signupAt || a.awardedAt || 0)-new Date(b.signupAt || b.awardedAt || 0) || String(a.userId).localeCompare(String(b.userId)));
  for (const award of liveAwards.filter(a => !eligibleRankIds.has(a.userId))) {
    award.limitExcludedAt = now.toISOString(); award.limitExclusionReason = 'founder-program-limit-50';
    const user = usersById.get(award.userId);
    user.founderLaunchPosition = null; user.founderPlatinumStartedAt = null; user.founderPlatinumUntil = null; user.founderLaunchNoticeSeenAt = null;
    if (user.foundingMemberSource === 'first100' || user.foundingMemberSource === 'first50') { user.foundingMember = false; user.foundingMemberAt = null; user.foundingMemberSource = null; }
    changed = true;
  }
  const activeAwards = awards.filter(a => !a.voidedAt && !a.limitExcludedAt && usersById.has(a.userId));
  const awardedIds = new Set(activeAwards.map(a => a.userId));


  // Fill any spots returned by deleted/spam accounts using original qualifying
  // signup order. Deleted accounts do not consume one of the current 50 spots.
  for (const user of ordered) {
    if (activeAwards.length >= FOUNDER_PROGRAM_LIMIT) break;
    if (awardedIds.has(user.id)) continue;
    const prior = awards.find(a => a.userId === user.id && !a.voidedAt && a.limitExcludedAt);
    if (prior) {
      delete prior.limitExcludedAt; delete prior.limitExclusionReason;
      activeAwards.push(prior); awardedIds.add(user.id);
      if (!user.foundingMember) { user.foundingMember = true; user.foundingMemberAt = prior.awardedAt; user.foundingMemberSource = 'first50'; }
      user.founderPlatinumStartedAt = prior.platinumStartsAt || null; user.founderPlatinumUntil = prior.platinumUntil || null;
      user.founderLaunchNoticeSeenAt = null; changed = true; continue;
    }
    const until = new Date(now.getTime() + FOUNDER_PLATINUM_DAYS * 86400000);
    const award = {
      id: `founder100-${crypto.randomUUID()}`, position: 0, userId: user.id, userName: user.name, userEmail: user.email,
      signupAt: user.createdAt || null, awardedAt: now.toISOString(), platinumStartsAt: now.toISOString(), platinumUntil: until.toISOString()
    };
    awards.push(award); activeAwards.push(award); awardedIds.add(user.id);
    if (!user.foundingMember) { user.foundingMember = true; user.foundingMemberAt = now.toISOString(); user.foundingMemberSource = 'first50'; }
    user.founderPlatinumStartedAt = now.toISOString();
    user.founderPlatinumUntil = until.toISOString();
    user.founderLaunchNoticeSeenAt = null;
    changed = true;
  }

  // Compact the live ranks as if deleted Founder accounts had never occupied a
  // position. Signup/award order remains deterministic and surviving users move
  // down automatically (e.g. #18 -> #16 after two earlier deletions).
  activeAwards.sort((a,b) => {
    const ta = new Date(a.signupAt || a.awardedAt || 0).getTime(), tb = new Date(b.signupAt || b.awardedAt || 0).getTime();
    return ta - tb || String(a.userId).localeCompare(String(b.userId));
  });
  activeAwards.forEach((award, i) => {
    const position = i + 1, user = usersById.get(award.userId);
    if (Number(award.position || 0) !== position) { award.position = position; changed = true; }
    if (user && Number(user.founderLaunchPosition || 0) !== position) { user.founderLaunchPosition = position; changed = true; }
  });
  return changed;
}

function grantMembership(db, user, { tier, days, reason = '', grantedBy = null, source = 'manual', mode = 'replace' } = {}) {
  tier = String(tier || '').toLowerCase();
  if (!GRANT_TIERS.has(tier)) throw new Error('Choose Plus, Platinum or Wholesale Teams.');
  const rawDays = Number(days);
  if (!Number.isFinite(rawDays) || rawDays < 1 || rawDays > 730) throw new Error('Choose a grant length between 1 and 730 days.');
  const n = Math.floor(rawDays);
  const now = new Date();
  db.membershipGrants = db.membershipGrants || [];
  const active = activeMembershipGrant(user);
  const previous = [...db.membershipGrants].reverse().find(g => g.userId === user.id && !g.revokedAt && new Date(g.expiresAt || 0) > now);
  let expires;
  if (mode === 'extend') {
    if (!active) throw new Error('There is no active complimentary membership to extend.');
    tier = active.plan;
    const base = new Date(active.until);
    expires = new Date(base.getTime() + n * 86400000);
    if (previous) { previous.revokedAt = now.toISOString(); previous.revokedBy = grantedBy || null; previous.revokeReason = 'extended'; }
    source = 'manual-extend';
  } else {
    expires = new Date(now.getTime() + n * 86400000);
    if (previous) { previous.revokedAt = now.toISOString(); previous.revokedBy = grantedBy || null; previous.revokeReason = 'replaced'; }
  }
  user.grantPlan = tier;
  user.grantUntil = expires.toISOString();
  user.grantReason = String(reason || '').trim().slice(0, 180) || (source === 'leaderboard' ? 'Leaderboard prize' : mode === 'extend' ? 'Complimentary membership extension' : 'Complimentary membership');
  user.grantedAt = now.toISOString();
  user.grantedBy = grantedBy || null;
  db.membershipGrants.push({
    id: crypto.randomUUID(), userId: user.id, tier, startsAt: now.toISOString(), expiresAt: expires.toISOString(),
    reason: user.grantReason, source, action: mode === 'extend' ? 'extend' : (active ? 'replace' : 'grant'),
    grantedBy: grantedBy || null, revokedAt: null, createdAt: now.toISOString()
  });
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
  const users = db.users.filter(u => u.role !== 'admin' && !isAffiliateOnlyUser(u));
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
  const { name, email, password, role, roles, referralCode, marketingOptIn } = req.body || {};
  if (!name || !email || !password) return res.status(400).json({ error: 'All fields are required.' });
  const selectedRoles = policy.normalizeSignupRoles(Array.isArray(roles) ? roles : [role]);
  if (!selectedRoles.length) return res.status(400).json({ error: 'Choose at least one role.' });
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
    role: policy.resolveRole(cleanEmail, selectedRoles[0]),
    roles: selectedRoles,
    bio: '', phone: '', location: '', investmentMarkets: [], avatarUrl: null, points: 0,
    buyBoxes: [defaultBuyBox()], settings: defaultSettings(),
    plan: 'free', planUntil: null, trialUntil,
    unlockCredits: PRICING.freeUnlocks,
    verified: false,
    paymentMethods: [], payoutMethod: null,
    emailVerified: false,
    marketingOptIn: marketingOptIn !== false,
    marketingConsentAt: marketingOptIn !== false ? new Date().toISOString() : null,
    marketingEnrollmentSource: 'signup-terms-v29.45',
    marketingUnsubscribedAt: null, marketingLastSentAt: null, marketingSequence: 0,
    referralCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
    referredBy: referrer ? referrer.id : null, referralPaid: false,
    createdAt: new Date().toISOString()
  };
  ensureUsername(db, user);
  db.users.push(user);
  ensureFirst100FounderProgram(db);
  const vtok = crypto.randomBytes(24).toString('hex');
  db.tokens.push({ token: vtok, userId: user.id, kind: 'verify', expires: Date.now() + 7 * 86400000 });
  const affCode=String(req.body?.affiliateCode||'').trim().toUpperCase(); const aff=(db.affiliateApplications||[]).find(a=>a.code===affCode&&a.status==='approved'); if(aff&&aff.userId!==user.id) user.affiliateReferrerId=aff.userId;
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
  const storedRoles = policy.normalizeSignupRoles(Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role === 'admin' ? 'buyer' : user.role]);
  const safeRoles = storedRoles.length ? storedRoles : ['buyer'];
  const correctRole = policy.resolveRole(user.email, safeRoles[0]);
  let changed = false;
  if (user.role !== correctRole) { user.role = correctRole; changed = true; }
  if (JSON.stringify(user.roles || []) !== JSON.stringify(safeRoles)) { user.roles = safeRoles; changed = true; }
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
    access: accessFor(u),
    demoAdminSession: !!(u?.demo && req.session?.adminReturnUserId)
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
  const { name, username, bio, phone, location, avatarData, roles } = req.body || {};
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
  if (roles !== undefined && !isAdminUser(req.user)) {
    const selectedRoles = policy.normalizeSignupRoles(roles);
    if (!selectedRoles.length) return res.status(400).json({ error: 'Choose at least one role.' });
    req.user.roles = selectedRoles;
    req.user.role = selectedRoles[0]; // legacy compatibility; role-aware features use the full roles array.
    ensureFirst100FounderProgram(req.db);
  }
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
      req.db.pipelineDeals = (req.db.pipelineDeals || []).filter(x => x.companyId !== company.id);
      req.db.buyerCrm = (req.db.buyerCrm || []).filter(x => x.companyId !== company.id);
      req.db.dealCalendarEvents = (req.db.dealCalendarEvents || []).filter(x => x.companyId !== company.id);
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
  req.db.activityEvents = (req.db.activityEvents || []).filter(x => x.userId !== userId);
  req.db.savedSearches = (req.db.savedSearches || []).filter(x => x.userId !== userId);
  req.db.pipelineDeals = (req.db.pipelineDeals || []).filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.dealCalendarEvents = (req.db.dealCalendarEvents || []).filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.dealNotifications = (req.db.dealNotifications || []).filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.feedFeedback = (req.db.feedFeedback || []).filter(x => x.userId !== userId && !ownedListingIds.has(x.listingId));
  req.db.dealDocuments = (req.db.dealDocuments || []).filter(x => x.ownerId !== userId && !ownedListingIds.has(x.listingId));
  req.db.buyerCrm = (req.db.buyerCrm || []).filter(x => x.ownerId !== userId);
  req.db.dealAnalyses = (req.db.dealAnalyses || []).filter(x => x.userId !== userId);

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
  for (const a of (req.db.founderAwards || [])) if (a.userId === userId) { a.userId = deletedId; a.userName = 'Deleted account'; a.userEmail = null; }
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
  if (typeof body.showActivityStatus === 'boolean') next.showActivityStatus = body.showActivityStatus;
  if (typeof body.firstLookCompleted === 'boolean') next.firstLookCompleted = body.firstLookCompleted;
  if (typeof body.guideContextTips === 'boolean') next.guideContextTips = body.guideContextTips;
  if (typeof body.guideAnimations === 'boolean') next.guideAnimations = body.guideAnimations;
  if (Array.isArray(body.guideCourseCompleted)) next.guideCourseCompleted = [...new Set(body.guideCourseCompleted.map(x => safeText(x,40)).filter(Boolean))].slice(0,24);
  if (Array.isArray(body.guideCourseQuizPassed)) next.guideCourseQuizPassed = [...new Set(body.guideCourseQuizPassed.map(x => safeText(x,40)).filter(Boolean))].slice(0,24);
  if (body.guideCourseLastModule !== undefined) next.guideCourseLastModule = safeText(body.guideCourseLastModule,40) || 'foundations';
  if (Array.isArray(body.quickOptions)) { const allowed=new Set(['compose','dealbuilder','buyercrm','pipeline','buybox','search','messages','liked','admin']); next.quickOptions=[...new Set(body.quickOptions.map(String).filter(x=>allowed.has(x)))].slice(0,6); if(!isAdminUser(req.user)) next.quickOptions=next.quickOptions.filter(x=>x!=='admin'); }
  if (body.tutorialCompletedVersion !== undefined) next.tutorialCompletedVersion = Math.max(0, Number(body.tutorialCompletedVersion)||0);
  if (body.tutorialDismissedVersion !== undefined) next.tutorialDismissedVersion = Math.max(0, Number(body.tutorialDismissedVersion)||0);
  if (Array.isArray(body.tutorialCompletedKeys)) next.tutorialCompletedKeys = [...new Set(body.tutorialCompletedKeys.map(x => String(x).slice(0,80)))].slice(-30);
  if (body.tutorialHighestRank !== undefined) next.tutorialHighestRank = Math.max(-1, Math.min(4, Number(body.tutorialHighestRank)||0));
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
  const members = db.users.filter(u => u.companyId === company.id && (!isAffiliateOnlyUser(u) || viewer?.id === u.id || isAdminUser(viewer))).map(publicProfileUser);
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
    states: cleanStates(b.states), propertyTypes: Array.isArray(b.propertyTypes) ? b.propertyTypes : [],
    minArv: Math.max(0,Number(b.minArv)||0), maxArv: Math.max(0,Number(b.maxArv)||0), minBeds: Math.max(0,Number(b.minBeds)||0), minBaths: Math.max(0,Number(b.minBaths)||0),
    rehabTolerance: ['any','light','moderate','heavy'].includes(b.rehabTolerance)?b.rehabTolerance:'any',
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
    return res.status(403).json({ error: max === 1 ? 'Free and Plus accounts get one buy box — upgrade to Platinum for up to 5.' : `You're at your limit of ${max} buy boxes.` });
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot connect real payment or payout methods. Convert the account to a real account first.' });
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
    betterCredit: Math.max(0,Number(req.user.betterCreditCents||0)),
    withdrawableBalance: withdrawableBalanceOf(req.db,req.user),
    sellerEarnings: req.db.ledger.filter(l=>l.userId===req.user.id&&l.type==='sale').reduce((n,l)=>n+Math.max(0,Number(l.amount||0)),0),
    sellerWithdrawals: Math.abs(req.db.ledger.filter(l=>l.userId===req.user.id&&l.type==='withdrawal').reduce((n,l)=>n+Math.min(0,Number(l.amount||0)),0)),
    ledger: req.db.ledger.filter(l => l.userId === req.user.id).sort((a,b) => new Date(b.at) - new Date(a.at)).slice(0, 100),
    paymentMethods: req.user.paymentMethods,
    payoutMethod: req.user.payoutMethod,
    minWithdrawal: PRICING.minWithdrawal
  });
});
app.post('/api/wallet/deposit', requireAuth, async (req, res) => {
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot connect real payment or payout methods. Convert the account to a real account first.' });
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });
  const amount = Math.round(Number(req.body?.amount) || 0);
  const bal = withdrawableBalanceOf(req.db, req.user);
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
  if (isDemoUser(user)) return;
  if (user.referredBy && !user.referralPaid) {
    const referrer = db.users.find(u => u.id === user.referredBy);
    if (referrer && !isDemoUser(referrer)) {
      ledgerAdd(db, referrer.id, 'referral', PRICING.referralBonus, 'Better Credit — referral · ' + user.name, { nonWithdrawable:true, referredUserId:user.id });
      ledgerAdd(db, user.id, 'referral', PRICING.referralBonus, 'Better Credit — referred signup', { nonWithdrawable:true, referrerId:referrer.id });
      referrer.betterCreditCents = Number(referrer.betterCreditCents||0) + PRICING.referralBonus;
      user.betterCreditCents = Number(user.betterCreditCents||0) + PRICING.referralBonus;
      user.referralPaid = true;
    }
  }
}

/* ============================ SUBSCRIPTION & UNLOCKS ============================ */
app.post('/api/billing/subscribe', requireAuth, async (req, res) => {
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });
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
      { amountCents: amount, interval: period === 'annual' ? 'year' : 'month', label: tierConfig.label + ' — ' + (period === 'annual' ? 'Annual' : 'Monthly'), tier, betterCreditCents: Math.min(amount, Number(req.user.betterCreditCents||0)) },
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
  const states=Array.isArray(bb.states)?bb.states.filter(Boolean):[]; if(states.length&&!states.includes(listingState(listing)))return false;
  const cities = Array.isArray(bb.cities) ? bb.cities.filter(Boolean) : [];
  if (cities.length && !cities.some(c => String(listing.city || '').toLowerCase().includes(String(c).toLowerCase()))) return false;
  if(Number(bb.minArv||0)>0&&Number(listing.arv||0)<Number(bb.minArv))return false; if(Number(bb.maxArv||0)>0&&Number(listing.arv||0)>Number(bb.maxArv))return false;
  if(Number(bb.minBeds||0)>0&&Number(listing.beds||0)<Number(bb.minBeds))return false; if(Number(bb.minBaths||0)>0&&Number(listing.baths||0)<Number(bb.minBaths))return false;
  if(bb.rehabTolerance&&bb.rehabTolerance!=='any'&&listing.rehab){const cap=bb.rehabTolerance==='light'?30000:bb.rehabTolerance==='moderate'?75000:Infinity;if(Number(listing.rehab)>cap)return false;}
  const types = Array.isArray(bb.propertyTypes) ? bb.propertyTypes.filter(Boolean) : [];
  if (types.length && !types.includes(listing.propertyType)) return false;
  const spread = listing.arv ? Number(listing.arv) - asking : 0;
  if (Number(bb.minSpread || 0) > 0 && spread < Number(bb.minSpread)) return false;
  return true;
}
function buyBoxHasBuyerIntent(bb) {
  if (!bb || bb.active === false) return false;
  // Every new account receives an unconstrained default buy box. That placeholder
  // is not buyer intent and must never turn the platform user count into a
  // property-specific "buyer matches" number. A match requires criteria the
  // buyer actually saved/published.
  const hasLocation = (Array.isArray(bb.states) && bb.states.some(Boolean)) || (Array.isArray(bb.cities) && bb.cities.some(Boolean));
  const hasType = Array.isArray(bb.propertyTypes) && bb.propertyTypes.some(Boolean);
  const hasNumbers = Number(bb.minPrice || 0) > 0 || Number(bb.maxPrice || 2000000) < 2000000 || Number(bb.minArv || 0) > 0 || Number(bb.maxArv || 0) > 0 || Number(bb.minBeds || 0) > 0 || Number(bb.minBaths || 0) > 0 || Number(bb.minSpread || 0) > 0;
  const hasStrategy = String(bb.strategy || '').trim().length > 0;
  const hasRehabPreference = !!bb.rehabTolerance && bb.rehabTolerance !== 'any';
  return !!bb.updatedAt || bb.public === true || hasLocation || hasType || hasNumbers || hasStrategy || hasRehabPreference;
}
function buyerMatchesForListing(db, listing) {
  return (db.users || []).filter(u => !isAffiliateOnlyUser(u) && u.id !== listing.ownerId && u.demo !== true && String(u.buyingStatus || 'active') !== 'paused').map(u => {
    const boxes = getBuyBoxes(u).filter(bb => buyBoxHasBuyerIntent(bb) && buyBoxMatchesListing(bb, listing));
    return boxes.length ? { user: u, boxes } : null;
  }).filter(Boolean);
}
function publicBuyerDemand(db, viewerId) {
  const out = [];
  for (const u of db.users || []) {
    if (isAffiliateOnlyUser(u) || String(u.buyingStatus || 'active') === 'paused') continue;
    const company = u.companyId ? (db.companies || []).find(c => c.id === u.companyId) : null;
    getBuyBoxes(u).forEach((bb, index) => {
      if (bb.active === false || bb.public !== true) return;
      out.push({
        id: `${u.id}:${index}`, index, user: socialUserCard(db, viewerId, u),
        label: bb.label || 'Buy box', minPrice: Number(bb.minPrice || 0), maxPrice: Number(bb.maxPrice || 2000000),
        cities: bb.cities || [], states: bb.states || [], propertyTypes: bb.propertyTypes || [], minSpread: Number(bb.minSpread || 0), minArv:Number(bb.minArv||0), maxArv:Number(bb.maxArv||0), minBeds:Number(bb.minBeds||0), minBaths:Number(bb.minBaths||0), rehabTolerance:bb.rehabTolerance||'any',
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

function plusToolAllowance(user, tool, limit) {
  if (isAdminUser(user) || isPlatinum(user) || isWholesale(user)) return { unlimited:true, limit:null, used:0, remaining:null };
  if (!isPro(user)) return { unlimited:false, allowed:false, limit:0, used:0, remaining:0 };
  const day = new Date().toISOString().slice(0,10);
  const root = user.plusToolUsage && user.plusToolUsage.day === day ? user.plusToolUsage : { day, counts:{} };
  const used = Number(root.counts?.[tool] || 0);
  return { unlimited:false, allowed:true, limit, used, remaining:Math.max(0,limit-used), day };
}
async function consumePlusTool(db, user, tool, limit) {
  const a = plusToolAllowance(user, tool, limit);
  if (a.unlimited) return a;
  if (!a.allowed || a.remaining <= 0) return a;
  const day = new Date().toISOString().slice(0,10);
  if (!user.plusToolUsage || user.plusToolUsage.day !== day) user.plusToolUsage = { day, counts:{} };
  user.plusToolUsage.counts = user.plusToolUsage.counts || {};
  user.plusToolUsage.counts[tool] = Number(user.plusToolUsage.counts[tool] || 0) + 1;
  await saveDB(db);
  return plusToolAllowance(user, tool, limit);
}

app.post('/api/dispo/parse', requireAuth, async (req, res) => {
  const rawText = String(req.body?.text || '').trim();
  if (rawText.length < 12) return res.status(400).json({ error: 'Paste the deal post, email or text you want to import.' });
  let parsed = heuristicDealImport(rawText); let enhanced = false;
  if (isPro(req.user) && ai.configured()) {
    const allowance = plusToolAllowance(req.user, 'dispoAi', 3);
    if (allowance.unlimited || allowance.remaining > 0) {
      if (!allowance.unlimited) await consumePlusTool(req.db, req.user, 'dispoAi', 3);
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
  return { unlimited:false, limit:1, used, remaining:active ? Math.max(0,1-used) : 0, trial:true, trialActive:active, label:active ? (used ? 'Free trial analysis used' : '1 free trial analysis available') : 'Plus or Platinum required' };
}
app.get('/api/deal-builder/usage', requireAuth, (req,res) => res.json({ usage:dealBuilderAllowance(req.user) }));
app.get('/api/tools/usage', requireAuth, (req,res)=>res.json({ dealBuilder:dealBuilderAllowance(req.user), listingAi:plusToolAllowance(req.user,'listingAi',2), dispoAi:plusToolAllowance(req.user,'dispoAi',3) }));
function dealBuilderLimitError(req,allowance){return isPro(req.user)?'You have used today’s 5 Deal Builder analyses. Platinum includes unlimited analyses.':(allowance.trialActive?'Your one free trial Deal Builder analysis has been used. Plus includes 5 per day and Platinum includes unlimited analyses.':'Your free trial has ended. Plus includes 5 Deal Builder analyses per day and Platinum includes unlimited analyses.');}
const DEAL_RESEARCH_CACHE_VERSION = dealResearchCache.VERSION;
const DEAL_RESEARCH_CACHE_TTL_MS = dealResearchCache.TTL_MS;
const DEAL_RESEARCH_MIN_REFRESH_MS = dealResearchCache.MIN_REFRESH_MS;
const DEAL_SYNTHESIS_FAILURE_COOLDOWN_MS = 30 * 60 * 1000;
function dealResearchKey(address){ return dealResearchCache.key(address); }
function priorQualifiedDealProperty(db,user,key){ return (db.dealAnalyses||[]).some(x=>x.userId===user.id&&x.qualified===true&&x.researchKey===key); }
function addressDealAllowance(db,user,key){ const base=dealBuilderAllowance(user), prior=priorQualifiedDealProperty(db,user,key); return {...base, priorQualified:prior, allowedForAddress:prior||base.unlimited||base.remaining>0}; }
function evidenceFingerprint(evidence){
  const compact={subject:evidence?.subject||{},comparisonSubject:evidence?.comparisonSubject||{},fieldEvidence:evidence?.fieldEvidence||{},auxiliaryFacts:evidence?.auxiliaryFacts||{},identity:evidence?.identity||{},conflicts:evidence?.conflicts||[],conditionEvidence:evidence?.conditionEvidence||[],rehabAnalysis:evidence?.rehabAnalysis||null,comps:(evidence?.comps||[]).map(c=>({address:c.address,salePrice:c.salePrice,saleDate:c.saleDate,distanceMiles:c.distanceMiles,squareFootage:c.squareFootage,bedrooms:c.bedrooms,bathrooms:c.bathrooms,yearBuilt:c.yearBuilt,propertyType:c.propertyType,source:c.source,sourceKey:c.sourceKey}))};
  return crypto.createHash('sha256').update(JSON.stringify(compact)).digest('hex');
}
function evidenceOnlyDealAnalysis(address,evidence,compAnalysis,reason){
  const verified=evidence?.subject||{},rehab=evidence?.rehabAnalysis||{};
  const hasWorking=Boolean(compAnalysis?.valuationReady||compAnalysis?.indicativeReady),workingEstimate=compAnalysis?.valuationReady?compAnalysis.estimate:compAnalysis?.workingEstimate,workingLow=compAnalysis?.valuationReady?compAnalysis.low:compAnalysis?.workingLow,workingHigh=compAnalysis?.valuationReady?compAnalysis.high:compAnalysis?.workingHigh;
  return {provider:'Better Real Estate Evidence Engine',generatedAt:new Date().toISOString(),subject:{formattedAddress:verified.address||address,addressLine1:verified.address||address,city:verified.city||'',state:verified.state||'',propertyType:verified.propertyType??null,bedrooms:verified.bedrooms??null,bathrooms:verified.bathrooms??null,squareFootage:verified.squareFootage??null,yearBuilt:verified.yearBuilt??null},arv:{estimate:hasWorking?workingEstimate:null,low:hasWorking?workingLow:null,high:hasWorking?workingHigh:null,precision:compAnalysis?.precision||'withheld'},rehab:rehab.scenarios||[],recommendedRehabKey:rehab.recommendedKey||'moderate',rehabBasis:rehab.basis||null,description:reason?`Property evidence and comp analysis are available, but AI synthesis is temporarily unavailable: ${reason}`:(compAnalysis?.valuationReady?'Better completed an evidence-gated property and closed-sale analysis.':compAnalysis?.indicativeReady?'Better completed a cross-source working ARV range. More distance evidence would be required to call the valuation precise.':'Better completed property research and deterministic repair planning, but the closed-sale evidence is still insufficient for a defensible ARV.'),confidence:hasWorking?(compAnalysis.confidence||'Low'):'Low',assumptions:[],warnings:[reason?'The evidence, deterministic comp result and repair planning are still shown. This AI synthesis failure did not consume an analysis allowance.':compAnalysis?.indicativeReady&&!compAnalysis?.valuationReady?'Working ARV is an evidence-backed range, not a precise valuation, because comp-distance support is incomplete.':'Precise ARV remains evidence-gated. Repair scenarios remain planning estimates, not inspection findings.'],comparables:hasWorking?(compAnalysis.selected||[]).map(c=>({address:c.address,price:c.adjustedSalePrice||c.salePrice,salePrice:c.salePrice,saleDate:c.saleDate,distanceMiles:c.distanceMiles,similarity:c.similarity,source:c.source})):[],rent:null};
}
app.post('/api/deal-builder/research/start', requireAuth, async (req,res) => {
  const address=String(req.body?.address||'').trim(); if(address.length<8)return res.status(400).json({error:'Enter a complete property address.'});
  const key=dealResearchKey(address),addressAllowance=addressDealAllowance(req.db,req.user,key);if(!addressAllowance.allowedForAddress)return res.status(403).json({error:dealBuilderLimitError(req,addressAllowance),code:'DEAL_BUILDER_LIMIT',usage:addressAllowance});
  const now=Date.now(),forceRefresh=req.body?.forceRefresh===true;req.db.dealResearchCache=req.db.dealResearchCache||[];
  const cached=req.db.dealResearchCache.find(x=>x.key===key),age=cached?now-new Date(cached.retrievedAt||0).getTime():Infinity;
  if(cached?.evidence&&age<DEAL_RESEARCH_CACHE_TTL_MS&&(!forceRefresh||age<DEAL_RESEARCH_MIN_REFRESH_MS)){
    const evidence=JSON.parse(JSON.stringify(cached.evidence));evidence.serverOwned=true;evidence.cache={hit:true,version:DEAL_RESEARCH_CACHE_VERSION,retrievedAt:cached.retrievedAt,ageMs:age,refreshProtected:forceRefresh&&age<DEAL_RESEARCH_MIN_REFRESH_MS};
    return res.json({state:'complete',address,evidence,usage:addressAllowance});
  }
  const job=await dealResearchJobs.startOrReuse({userId:req.user.id,address,researchKey:key,cacheVersion:DEAL_RESEARCH_CACHE_VERSION,forceRefresh});
  res.status(job.reused?200:202).json({state:job.status,jobId:job.id,runToken:job.runToken,reused:Boolean(job.reused),backgroundPath:'/.netlify/functions/deal-research-background',statusPath:'/api/deal-builder/research/status',usage:addressAllowance});
});

app.get('/api/deal-builder/research/status', requireAuth, async (req,res) => {
  try{
    const job=await dealResearchJobs.getJob(String(req.query?.jobId||''));
    if(!job||job.userId!==req.user.id)return res.status(404).json({error:'Research job not found.'});
    return res.set('Cache-Control','no-store').json({job:dealResearchJobs.publicJob(job),retryAfterMs:job.status==='running'?8000:job.status==='queued'?5000:0});
  }catch(e){console.error('[deal research status]',e?.message);return res.status(500).json({error:'Unable to read property research status.'});}
});

app.post('/api/deal-builder/research', requireAuth, async (req,res) => {
  const address=String(req.body?.address||'').trim(); if(address.length<8) return res.status(400).json({error:'Enter a complete property address.'});
  const key=dealResearchKey(address),addressAllowance=addressDealAllowance(req.db,req.user,key); if(!addressAllowance.allowedForAddress)return res.status(403).json({error:dealBuilderLimitError(req,addressAllowance),code:'DEAL_BUILDER_LIMIT',usage:addressAllowance});
  try{
    const dealSources=require('./dealSources'),intelligence=require('./dealIntelligence'),now=Date.now(),forceRefresh=req.body?.forceRefresh===true;
    req.db.dealResearchCache=req.db.dealResearchCache||[];
    let cached=req.db.dealResearchCache.find(x=>x.key===key),age=cached?now-new Date(cached.retrievedAt||0).getTime():Infinity;
    if(cached && age<DEAL_RESEARCH_CACHE_TTL_MS && (!forceRefresh || age<DEAL_RESEARCH_MIN_REFRESH_MS)){
      const evidence=JSON.parse(JSON.stringify(cached.evidence||{})); evidence.cache={hit:true,version:DEAL_RESEARCH_CACHE_VERSION,retrievedAt:cached.retrievedAt,ageMs:age,refreshProtected:forceRefresh&&age<DEAL_RESEARCH_MIN_REFRESH_MS}; evidence.serverOwned=true;
      return res.json({address,evidence,usage:addressAllowance});
    }
    const evidence=await dealSources.research(address);evidence.compAnalysis=intelligence.analyzeComps(evidence.comparisonSubject||evidence.subject||{},evidence.comps||[]);evidence.rehabAnalysis=intelligence.estimateRehab(evidence.comparisonSubject||evidence.subject||{},evidence.conditionEvidence||[],evidence.fieldEvidence||{});evidence.serverOwned=true;evidence.cache={hit:false,version:DEAL_RESEARCH_CACHE_VERSION,retrievedAt:evidence.retrievedAt||new Date().toISOString(),ageMs:0,refreshProtected:false};
    const row={id:cached?.id||crypto.randomUUID(),key,address,retrievedAt:evidence.retrievedAt||new Date().toISOString(),evidence:JSON.parse(JSON.stringify(evidence)),synthesis:null};
    if(cached)Object.assign(cached,row);else req.db.dealResearchCache.push(row);
    const cutoff=Date.now()-7*24*60*60*1000;req.db.dealResearchCache=req.db.dealResearchCache.filter(x=>new Date(x.retrievedAt||0).getTime()>=cutoff).sort((a,b)=>String(b.retrievedAt).localeCompare(String(a.retrievedAt))).slice(0,500);
    await saveDB(req.db);
    res.json({address,evidence,usage:addressAllowance});
  }catch(e){console.error('[deal builder research]',e.message);res.status(502).json({error:`Property research failed: ${String(e.message).slice(0,240)}`});}
});
app.post('/api/deal-builder/address', requireAuth, async (req,res) => {
  const address=String(req.body?.address||'').trim(); if(address.length<8) return res.status(400).json({error:'Enter a complete property address.'});
  const key=dealResearchKey(address),addressAllowance=addressDealAllowance(req.db,req.user,key); if(!addressAllowance.allowedForAddress)return res.status(403).json({error:dealBuilderLimitError(req,addressAllowance),code:'DEAL_BUILDER_LIMIT',usage:addressAllowance});
  try {
    req.db.dealResearchCache=req.db.dealResearchCache||[];const cached=req.db.dealResearchCache.find(x=>x.key===key);const age=cached?Date.now()-new Date(cached.retrievedAt||0).getTime():Infinity;
    if(!cached||!cached.evidence||age>=DEAL_RESEARCH_CACHE_TTL_MS)return res.status(409).json({error:'Property research is missing or stale. Run property research again before analysis.',code:'DEAL_RESEARCH_REQUIRED'});
    // SECURITY/INTEGRITY: final valuation always uses server-cached evidence. Browser-supplied evidence is intentionally ignored.
    const evidence=JSON.parse(JSON.stringify(cached.evidence)); evidence.serverOwned=true; evidence.cache={...(evidence.cache||{}),hit:true,version:DEAL_RESEARCH_CACHE_VERSION,retrievedAt:cached.retrievedAt,ageMs:age};
    const intelligence=require('./dealIntelligence'),compAnalysis=intelligence.analyzeComps(evidence.comparisonSubject||evidence.subject||{},evidence.comps||[]); evidence.compAnalysis=compAnalysis;evidence.rehabAnalysis=evidence.rehabAnalysis||intelligence.estimateRehab(evidence.comparisonSubject||evidence.subject||{},evidence.conditionEvidence||[],evidence.fieldEvidence||{});
    const verified=evidence.subject||{},coreFields=['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType'];
    const enoughIdentity=Boolean(evidence.identity?.sufficientForValuation),arvPrecision=intelligence.dealValuationPrecision(evidence,compAnalysis),canShowArv=Boolean(arvPrecision!=='withheld'&&(compAnalysis.estimate||compAnalysis.workingEstimate)),readyForAnalysis=Boolean(enoughIdentity&&canShowArv);
    if(evidence.diagnostics?.stages)evidence.diagnostics.stages.compGate={status:arvPrecision,reviewed:compAnalysis.reviewed,selected:compAnalysis.selected.length,warnings:compAnalysis.warnings,confidence:arvPrecision==='working_range'&&!enoughIdentity?'Low':compAnalysis.confidence,sourceDiversity:compAnalysis.sourceDiversity,distanceVerified:compAnalysis.distanceVerifiedCount};
    let analysis,aiDraft=null,synthesisReused=false,synthesisDeferred=false,synthesisError=null,createdSynthesis=false,synthesisFailureRecorded=false;const fp=evidenceFingerprint(evidence);
    if(!readyForAnalysis){
      analysis=evidenceOnlyDealAnalysis(address,evidence,compAnalysis,null);
    }else if(cached.synthesis?.fingerprint===fp&&cached.synthesis?.analysis){
      analysis=JSON.parse(JSON.stringify(cached.synthesis.analysis));aiDraft=cached.synthesis.aiDraft?JSON.parse(JSON.stringify(cached.synthesis.aiDraft)):null;synthesisReused=true;
    }else{
      const recentFailure=cached.synthesisFailure?.fingerprint===fp&&(Date.now()-new Date(cached.synthesisFailure.at||0).getTime())<DEAL_SYNTHESIS_FAILURE_COOLDOWN_MS;
      if(recentFailure){
        synthesisDeferred=true;synthesisError=safeText(cached.synthesisFailure.error||'temporarily unavailable',220);analysis=evidenceOnlyDealAnalysis(address,evidence,compAnalysis,synthesisError);
      }else if(!ai.configured()){
        synthesisDeferred=true;synthesisError='OPENAI_API_KEY is not configured';analysis=evidenceOnlyDealAnalysis(address,evidence,compAnalysis,synthesisError);
      }else{
        try{
          analysis=await ai.generateAddressDealAnalysis(address,evidence);aiDraft=analysis.description?{description:analysis.description}:null;
          cached.synthesis={fingerprint:fp,analysis:JSON.parse(JSON.stringify(analysis)),aiDraft:aiDraft?JSON.parse(JSON.stringify(aiDraft)):null,generatedAt:new Date().toISOString()};delete cached.synthesisFailure;createdSynthesis=true;
        }catch(synthesisErr){
          synthesisDeferred=true;synthesisError=safeText(synthesisErr?.message||synthesisErr,220);cached.synthesisFailure={fingerprint:fp,error:synthesisError,at:new Date().toISOString()};synthesisFailureRecorded=true;analysis=evidenceOnlyDealAnalysis(address,evidence,compAnalysis,synthesisError);
          console.error('[deal builder synthesis degraded]',synthesisError);
        }
      }
    }
    analysis.subject=analysis.subject||{};for(const field of coreFields)analysis.subject[field]=verified[field]??null;
    if(verified.address)analysis.subject.formattedAddress=verified.address;if(verified.city)analysis.subject.city=verified.city;if(verified.state)analysis.subject.state=verified.state;
    analysis.rehab=evidence.rehabAnalysis?.scenarios||analysis.rehab||[];analysis.recommendedRehabKey=evidence.rehabAnalysis?.recommendedKey||analysis.recommendedRehabKey||'moderate';analysis.rehabBasis=evidence.rehabAnalysis?.basis||analysis.rehabBasis||null;
    if(canShowArv){const precise=arvPrecision==='precise';analysis.arv={estimate:precise?compAnalysis.estimate:compAnalysis.workingEstimate,low:precise?compAnalysis.low:compAnalysis.workingLow,high:precise?compAnalysis.high:compAnalysis.workingHigh,precision:arvPrecision};analysis.confidence=arvPrecision==='working_range'&&!enoughIdentity?'Low':compAnalysis.confidence;analysis.arvMethod=compAnalysis.method;analysis.comparables=compAnalysis.selected.map(c=>({address:c.address,price:c.adjustedSalePrice||c.salePrice,salePrice:c.salePrice,saleDate:c.saleDate,distanceMiles:c.distanceMiles,similarity:c.similarity,source:c.source}));if(!precise)analysis.warnings=[...(analysis.warnings||[]),'This is a working ARV range from researched closed sales. Better does not label it precise until the stricter distance and subject-fact gates pass.'];if(!readyForAnalysis)analysis.warnings=[...(analysis.warnings||[]),'AI narrative synthesis was withheld because core subject facts still need stronger independent confirmation; deterministic ARV, repair planning and deal math remain available.'];}
    else{analysis.arv={estimate:null,low:null,high:null,precision:'withheld'};analysis.confidence='Low';analysis.arvMethod='ARV withheld — closed-sale evidence insufficient';analysis.warnings=[...(analysis.warnings||[]),'Better could not establish enough credible recent closed-sale evidence for a defensible ARV.'];}
    analysis.auxiliaryFacts=evidence.auxiliaryFacts||{};
    if(evidence.conflicts?.length)analysis.warnings=[...(analysis.warnings||[]),...evidence.conflicts.map(x=>`${x.field} has conflicting source evidence and was not accepted as established property truth.`)].slice(0,8);
    const successfulAnalysis=Boolean(compAnalysis.valuationReady&&readyForAnalysis&&!synthesisDeferred),wasQualified=priorQualifiedDealProperty(req.db,req.user,key),newQualified=successfulAnalysis&&!wasQualified;
    // Persist one successful-property event per user/property. Reopening or re-synthesizing the same
    // property must not inflate analytics or later leak an unsaved duplicate through an unrelated DB write.
    if(newQualified){
      req.db.dealAnalyses=req.db.dealAnalyses||[];
      req.db.dealAnalyses.push({id:crypto.randomUUID(),userId:req.user.id,address,researchKey:key,createdAt:new Date().toISOString(),qualified:true,synthesisReused});
    }
    if(newQualified&&!addressAllowance.unlimited){const day=new Date().toISOString().slice(0,10);if(isPro(req.user)){if(req.user.dealBuilderUsageDay!==day){req.user.dealBuilderUsageDay=day;req.user.dealBuilderUsageCount=0;}req.user.dealBuilderUsageCount=Number(req.user.dealBuilderUsageCount||0)+1;}else req.user.dealBuilderTrialUses=Number(req.user.dealBuilderTrialUses||0)+1;}
    // A newly generated synthesis belongs to the server-side research cache even when the user
    // previously qualified this same property, so persist it without creating another usage event.
    if(newQualified||createdSynthesis||synthesisFailureRecorded)await saveDB(req.db);
    res.json({analysis,aiDraft,evidence,usage:{...dealBuilderAllowance(req.user),priorQualified:wasQualified||successfulAnalysis},qualified:successfulAnalysis,evidenceReady:readyForAnalysis,synthesisReused,synthesisDeferred,synthesisError});
  } catch(e){console.error('[deal builder ai]',e.message);res.status(502).json({error:`AI synthesis failed after research completed: ${String(e.message).slice(0,240)}`});}
});

app.get('/api/deal-builder/diagnostics', requireAuth, (req,res)=>{
  if(!isAdminUser(req.user))return res.status(403).json({error:'Admin access required.'});
  const address=String(req.query?.address||'').trim();if(address.length<8)return res.status(400).json({error:'Enter a complete property address.'});
  const key=dealResearchKey(address),row=(req.db.dealResearchCache||[]).find(x=>x.key===key);if(!row)return res.status(404).json({error:'No cached research exists for this address. Diagnostics never trigger provider calls.'});
  const ev=row.evidence||{};res.json({address:row.address,retrievedAt:row.retrievedAt,cacheVersion:DEAL_RESEARCH_CACHE_VERSION,diagnostics:ev.diagnostics||{},identity:ev.identity||{},fieldEvidence:ev.fieldEvidence||{},regridCandidates:ev.rawSubjects?.regridCandidates||[],errors:ev.errors||[],compGate:ev.compAnalysis||null,synthesisCached:Boolean(row.synthesis?.analysis)});
});

app.get('/api/deal-builder/sources', requireAuth, (req,res)=>{ const ds=require('./dealSources'); res.json({sources:ds.configuredSources()}); });

app.post('/api/deal-builder/comp-analysis', requireAuth, async (req,res)=>{
  try{
    const intelligence=require('./dealIntelligence');
    const subject=req.body?.subject||{}; const comps=Array.isArray(req.body?.comps)?req.body.comps:[];
    res.json({compAnalysis:intelligence.analyzeComps(subject,comps)});
  }catch(e){res.status(400).json({error:String(e.message||e).slice(0,300)});}
});

app.get('/api/buyer-crm', requireAuth, async (req,res)=>{
  req.db.buyerCrm=req.db.buyerCrm||[]; const rows=req.db.buyerCrm.filter(x=>x.ownerId===req.user.id || (req.user.companyId&&x.companyId===req.user.companyId)).sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt)));
  res.json({contacts:rows});
});
app.post('/api/buyer-crm', requireAuth, async (req,res)=>{
  req.db.buyerCrm=req.db.buyerCrm||[]; const b=req.body||{}; const now=new Date().toISOString();
  let row=b.id&&req.db.buyerCrm.find(x=>x.id===b.id&&x.ownerId===req.user.id);
  if(!row){ row={id:crypto.randomUUID(),ownerId:req.user.id,companyId:req.user.companyId||null,createdAt:now}; req.db.buyerCrm.push(row); }
  row.name=String(b.name||row.name||'').trim().slice(0,100); row.email=String(b.email||row.email||'').trim().slice(0,160); row.phone=String(b.phone||row.phone||'').trim().slice(0,50);
  row.markets=String(b.markets||row.markets||'').trim().slice(0,300); row.buyBox=String(b.buyBox||row.buyBox||'').trim().slice(0,600); row.notes=String(b.notes||row.notes||'').trim().slice(0,1200);
  row.status=['new','contacted','interested','pof','offer','closed','inactive'].includes(b.status)?b.status:(row.status||'new'); row.updatedAt=now;
  if(!row.name) return res.status(400).json({error:'Buyer name is required.'}); await saveDB(req.db); res.json({contact:row});
});
app.delete('/api/buyer-crm/:id', requireAuth, async (req,res)=>{ req.db.buyerCrm=req.db.buyerCrm||[]; const n=req.db.buyerCrm.length; req.db.buyerCrm=req.db.buyerCrm.filter(x=>!(x.id===req.params.id&&(x.ownerId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId)))); if(req.db.buyerCrm.length===n)return res.status(404).json({error:'Buyer not found.'}); await saveDB(req.db); res.json({ok:true}); });

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

function notifyListingWatchers(db, listing, title, body) {
  db.dealNotifications = db.dealNotifications || [];
  const watcherIds=(db.saves||[]).filter(s=>s.listingId===listing.id&&s.notifyChanges!==false&&s.userId!==listing.ownerId).map(s=>s.userId);
  const now=new Date().toISOString();
  for(const userId of watcherIds) db.dealNotifications.push({id:crypto.randomUUID(),userId,listingId:listing.id,title,body,read:false,at:now});
}
app.post('/api/listings/:id/confirm-active', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  const now = new Date();
  listing.availabilityStatus = 'active'; listing.archivedAt = null; listing.lastConfirmedAt = now.toISOString(); listing.freshAt = now.toISOString();
  listing.expiresAt = new Date(now.getTime() + LISTING_CONFIRM_DAYS * 86400000).toISOString();
  notifyListingWatchers(req.db, listing, 'Property confirmed active', `${listing.address} was confirmed active by the seller.`);
  await saveDB(req.db);
  res.json({ listing: { ...listing, freshness: listingFreshness(listing) } });
});

app.post('/api/listings/:id/archive', requireAuth, async (req, res) => {
  const listing = req.db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (listing.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  listing.availabilityStatus = 'archived'; listing.archivedAt = new Date().toISOString();
  notifyListingWatchers(req.db, listing, 'Property status changed', `${listing.address} is no longer listed as active.`);
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
  const manage=canManageListing(req.db,req.user,listing), participant=req.db.offers.some(o=>o.listingId===listing.id&&(o.buyerId===req.user.id||o.sellerId===req.user.id));
  if(!manage&&!participant) return res.status(403).json({error:'This deal room is private to the deal team and participating buyers.'});
  const messages=(req.db.messages||[]).filter(m=>m.listingId===listing.id&&(manage||m.fromUserId===req.user.id||m.toId===req.user.id)).slice(-100);
  const offers=(req.db.offers||[]).filter(o=>o.listingId===listing.id&&(manage||o.buyerId===req.user.id));
  res.json({ room:dealRoomFor(listing), listing:{id:listing.id,address:listing.address,city:listing.city,contractDeadline:listing.contractDeadline||null,ownerId:listing.ownerId}, canManage:manage, messages, offers });
});
app.post('/api/listings/:id/deal-room/messages', requireAuth, async (req,res)=>{const listing=req.db.listings.find(l=>l.id===req.params.id);if(!listing)return res.status(404).json({error:'Listing not found.'});const manage=canManageListing(req.db,req.user,listing),offers=req.db.offers.filter(o=>o.listingId===listing.id&&(o.buyerId===req.user.id||o.sellerId===req.user.id));if(!manage&&!offers.length)return res.status(403).json({error:'Join the deal by submitting an offer before using its deal room.'});const body=String(req.body?.body||'').trim().slice(0,2000);if(!body)return res.status(400).json({error:'Write a message first.'});const toUserId=manage?String(req.body?.toUserId||offers[0]?.buyerId||''):listing.ownerId;if(!toUserId)return res.status(400).json({error:'Choose a participant.'});const msg={id:crypto.randomUUID(),fromUserId:req.user.id,fromName:req.user.name,toUserId,listingId:listing.id,body,at:new Date().toISOString(),read:false};req.db.messages.push(msg);await saveDB(req.db);res.json({message:msg});});
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
  const affiliateCode = String(req.query.aff||'').trim().toUpperCase().replace(/[^A-Z0-9_-]/g,'').slice(0,24);
  if (affiliateCode) { try { const db=await loadDB(); const a=(db.affiliateApplications||[]).find(a=>a.code===affiliateCode&&a.status==='approved'); if(a){db.affiliateClicks=db.affiliateClicks||[];db.affiliateClicks.push({id:crypto.randomUUID(),affiliateUserId:a.userId,code:a.code,at:new Date().toISOString()});await saveDB(db);} } catch(e){console.error('[affiliate-click]',e.message);} }
  if (referral) {
    try {
      const db = await loadDB();
      const referrer = (db.users || []).find(u => String(u.referralCode || '').toUpperCase() === referral);
      if (referrer) {
        db.referralClicks = db.referralClicks || [];
        db.referralClicks.push({ id: crypto.randomUUID(), referrerId: referrer.id, code: referral, at: new Date().toISOString() });
        if (db.referralClicks.length > 50000) db.referralClicks = db.referralClicks.slice(-50000);
        await saveDB(db);
      }
    } catch (e) { console.error('[referral-click]', e.message); }
  }
  let destination = destinationWithRef('/?view=auth', referral); if(affiliateCode) destination += (destination.includes('?')?'&':'?')+'aff='+encodeURIComponent(affiliateCode);
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
  if (!user || isAffiliateOnlyUser(user)) return res.status(404).type('html').send('Profile not found.');
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


app.get('/api/affiliate/track/:code', async(req,res)=>{const a=(req.db.affiliateApplications||[]).find(a=>a.code===String(req.params.code||'').toUpperCase()&&a.status==='approved');if(!a)return res.status(404).json({error:'Affiliate link not found.'});req.db.affiliateClicks=req.db.affiliateClicks||[];req.db.affiliateClicks.push({id:crypto.randomUUID(),affiliateUserId:a.userId,code:a.code,at:new Date().toISOString()});await saveDB(req.db);res.json({ok:true,affiliateUserId:a.userId});});

app.get('/api/referrals/me', requireAuth, async (req, res) => {
  const referrals = (req.db.users || []).filter(u => u.referredBy === req.user.id);
  const activated = referrals.filter(u => (u.investmentMarkets || []).length || u.bio || u.avatarUrl || (req.db.listings || []).some(l => l.ownerId === u.id) || (req.db.messages || []).some(m => m.fromUserId === u.id || m.fromId === u.id));
  const paid = referrals.filter(u => u.referralPaid === true);
  const clicks = (req.db.referralClicks || []).filter(x => x.referrerId === req.user.id);
  const creditEarned = (req.db.ledger || []).filter(x => x.userId === req.user.id && x.type === 'referral').reduce((n,x)=>n+Number(x.amount||0),0);
  res.json({ code:req.user.referralCode, url:`${appBaseUrl()}/s/join?ref=${encodeURIComponent(req.user.referralCode || '')}`, metrics:{ clicks:clicks.length, signups:referrals.length, activated:activated.length, paid:paid.length, creditEarned }, referrals:referrals.slice().sort((a,b)=>new Date(b.createdAt||0)-new Date(a.createdAt||0)).slice(0,50).map(u=>({ id:u.id,name:u.name,username:u.username||null,createdAt:u.createdAt||null,activated:activated.some(x=>x.id===u.id),paid:u.referralPaid===true })) });
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
  req.db.listings.push(listing);
  req.db.dealNotifications=req.db.dealNotifications||[];
  for(const search of (req.db.savedSearches||[]).filter(x=>x.alerts!==false&&x.userId!==req.user.id)){ if(searchMatchesListing(search,listing)) req.db.dealNotifications.push({id:crypto.randomUUID(),userId:search.userId,listingId:listing.id,title:'New deal alert match',body:`${listing.city} matches “${search.name}” at $${Number(listing.asking).toLocaleString()}.`,read:false,at:new Date().toISOString()}); }
  await saveDB(req.db);
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
    !isAffiliateOnlyUser(u) && isPlatinum(u) && u.id !== listing.ownerId && u.settings?.notifyOnMatch !== false
  );
  for (const u of candidates) {
    const boxes = getBuyBoxes(u);
    const hit = boxes.find(bb => buyBoxMatchesListing(bb, listing));
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

app.post('/api/listings/:id/view', requireAuth, async (req, res) => {
  // View analytics are intentionally isolated from the property-details read path.
  // A single analytics write must never make a buyer wait for the page to open.
  await appendRecord('views', { id: crypto.randomUUID(), listingId: req.params.id, userId: req.user.id, at: new Date().toISOString() });
  res.json({ ok: true });
});

app.get('/api/listings/:id', async (req, res) => {
  const db = await loadDB();
  const listing = db.listings.find(l => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  const viewer = db.users.find(u => u.id === req.session.userId);

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

app.patch('/api/listings/:id', requireAuth, async (req, res) => {
  const listing=req.db.listings.find(l=>l.id===req.params.id);
  if(!listing)return res.status(404).json({error:'Listing not found.'});
  if(listing.ownerId!==req.user.id&&!isAdminUser(req.user))return res.status(403).json({error:'Not your listing.'});
  const b=req.body||{};
  if(!String(b.address||'').trim()||!String(b.city||'').trim()||!Number(b.asking))return res.status(400).json({error:'Address, city, and asking price are required.'});
  const photos=(await Promise.all((Array.isArray(b.photos)?b.photos:[]).slice(0,12).map(async x=>String(x||'').startsWith('data:')?writeImage(x):String(x||'')))).filter(Boolean);
  Object.assign(listing,{address:String(b.address).trim(),city:String(b.city).trim(),propertyType:b.propertyType||'Single family',situation:b.situation||'Motivated seller',asking:Number(b.asking),arv:b.arv?Number(b.arv):null,rehab:b.rehab?Number(b.rehab):null,beds:b.beds?Number(b.beds):null,baths:b.baths?Number(b.baths):null,sqft:b.sqft?Number(b.sqft):null,year:b.year?Number(b.year):null,timeline:b.timeline||'Flexible',notes:String(b.notes||'').slice(0,1500),videoUrl:String(b.videoUrl||'').slice(0,300)||null,contractDeadline:/^20\d{2}-\d{2}-\d{2}$/.test(String(b.contractDeadline||''))?String(b.contractDeadline):null,openToJV:b.openToJV===true||b.openToJV==='true',photos,updatedAt:new Date().toISOString()});
  await saveDB(req.db);res.json({listing:{...listing,freshness:listingFreshness(listing)}});
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
  if (isAffiliateOnlyUser(owner) && viewer?.id !== owner.id && !isAdminUser(viewer)) return res.status(404).json({error:'User not found.'});
  const ownerCompany = owner.companyId ? db.companies.find(c => c.id === owner.companyId) : null;
  const inbound=(db.messages||[]).filter(m=>m.toUserId===owner.id), outbound=(db.messages||[]).filter(m=>m.fromUserId===owner.id);
  const inboundPeople=new Set(inbound.map(m=>m.fromUserId).filter(Boolean)), respondedPeople=new Set(outbound.map(m=>m.toUserId).filter(id=>inboundPeople.has(id)));
  const credibility={accountSince:owner.createdAt||null,verifiedClosings:(db.saves||[]).filter(x=>x.userId===owner.id&&x.verified).length,responseRate:inboundPeople.size?Math.round(respondedPeople.size/inboundPeople.size*100):null};
  res.json({
    owner: publicProfileUser(owner),
    publicMembership: publicMembershipLabel(owner),
    company: ownerCompany ? publicCompany(ownerCompany) : null,
    listings: db.listings.filter(l => l.ownerId === owner.id && (viewer?.id === owner.id || listingFreshness(l).availabilityStatus !== 'archived')).map(l => gateListing(l, viewer, db)),
    followerCount: db.follows.filter(f => f.followingId === owner.id && !isAffiliateOnlyUser(db.users.find(u => u.id === f.followerId))).length,
    friendCount: db.friendships.filter(f => (f.userAId === owner.id || f.userBId === owner.id) && !isAffiliateOnlyUser(db.users.find(u => u.id === (f.userAId === owner.id ? f.userBId : f.userAId)))).length,
    friendship: viewer ? friendRelationship(db, viewer.id, owner.id) : { status: 'none', requestId: null },
    reviews: db.reviews.filter(r => r.aboutUserId === owner.id),
    credibility
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
  if (bb.states?.length && bb.states.some(st => listingState(listing)===st)) { score += 170; reasons.push('State match'); }
  if (bb.propertyTypes.length && bb.propertyTypes.includes(listing.propertyType)) { score += 90; reasons.push('Property type match'); }
  if (bb.minBeds && Number(listing.beds||0) >= bb.minBeds) { score += 45; reasons.push('Bed count match'); }
  if (bb.minBaths && Number(listing.baths||0) >= bb.minBaths) score += 30;
  if (listing.arv && (!bb.minArv || listing.arv>=bb.minArv) && (!bb.maxArv || listing.arv<=bb.maxArv)) { score += 75; reasons.push('ARV range match'); }
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
    const markets = Array.isArray(viewer.investmentMarkets) ? viewer.investmentMarkets : [];
    if (markets.length && markets.some(m => listingState(listing) === String(m).toUpperCase())) { score += 210; reasons.push('In your market'); }
    const feedback = (db.feedFeedback || []).find(f => f.userId === viewer.id && f.listingId === listing.id);
    if (feedback?.kind === 'hide') score -= 100000;
    if (feedback?.kind === 'less') score -= 500;
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


function listingMomentum(db,l){
  const views=(db.views||[]).filter(x=>x.listingId===l.id).length;
  const saves=(db.saves||[]).filter(x=>x.listingId===l.id).length;
  const offers=(db.offers||[]).filter(x=>x.listingId===l.id).length;
  const inquiries=(db.messages||[]).filter(x=>x.listingId===l.id&&x.toUserId===l.ownerId).length;
  const shares=(db.shareEvents||[]).filter(x=>x.kind==='property'&&x.targetId===l.id).length;
  const matches=buyerMatchesForListing(db,l).length;
  const score=Math.min(100,views+3*saves+5*inquiries+7*offers+2*shares+Math.min(matches,8)*2);
  const level=score>=30?'active':score>=8?'moving':'quiet';
  const label=level==='active'?'Active interest':level==='moving'?'Building momentum':'New opportunity';
  const parts=[]; if(saves)parts.push(`${saves} save${saves===1?'':'s'}`); if(inquiries)parts.push(`${inquiries} conversation${inquiries===1?'':'s'}`); if(offers)parts.push(`${offers} offer${offers===1?'':'s'}`); if(matches)parts.push(`${matches} buyer match${matches===1?'':'es'}`);
  return {level,label,score,detail:parts.slice(0,2).join(' · ')};
}

app.get('/api/feed', async (req, res) => {
  const db = await loadDB();
  const viewer = db.users.find(u => u.id === req.session.userId) || null;
  const saved = viewer ? new Set(db.saves.filter(s => s.userId === viewer.id).map(s => s.listingId)) : new Set();
  const now = Date.now();
  const mode = String(req.query.mode || 'for-you');
  const followedIds = viewer ? new Set(db.follows.filter(f => f.followerId === viewer.id).map(f => f.followingId)) : new Set();
  const hiddenIds = viewer ? new Set((db.feedFeedback || []).filter(f => f.userId === viewer.id && f.kind === 'hide').map(f => f.listingId)) : new Set();
  const feed = db.listings.filter(l => listingFreshness(l).availabilityStatus !== 'archived' && !hiddenIds.has(l.id) && (mode !== 'following' || followedIds.has(l.ownerId))).map(l => {
    const { score, reasons } = scoreListing(l, viewer, db);
    const owner = db.users.find(u => u.id === l.ownerId);
    const gated = gateListing(l, viewer, db);
    return {
      ...gated, _score: score, matchReasons: reasons,
      ownerAvatar: owner?.avatarUrl || null, ownerVerified: !!owner?.verified,
      saveCount: db.saves.filter(s => s.listingId === l.id).length,
      momentum: listingMomentum(db,l),
      savedByMe: saved.has(l.id),
      isBoosted: !!(l.boostUntil && new Date(l.boostUntil).getTime() > now),
      isSpotlight: !!(l.spotlightUntil && new Date(l.spotlightUntil).getTime() > now),
      demo: !!l.demo
    };
  }).sort((a, b) => b._score - a._score);
  res.json({ feed, access: accessFor(viewer), dashboard: viewer ? dashboardSummary(db, viewer) : null });
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



app.post('/api/listings/:id/documents', requireAuth, async (req,res)=>{
  const listing=req.db.listings.find(l=>l.id===req.params.id); if(!listing)return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,listing))return res.status(403).json({error:'Only the deal team can add documents.'});
  const name=String(req.body?.name||'Document').trim().slice(0,160), visibility=['team','participants'].includes(req.body?.visibility)?req.body.visibility:'team';
  const url=await writeDocument(String(req.body?.dataUrl||''),name); if(!url)return res.status(400).json({error:'Upload a PDF, PNG, JPG or WebP file up to 5 MB.'});
  req.db.dealDocuments=req.db.dealDocuments||[]; const row={id:crypto.randomUUID(),listingId:listing.id,ownerId:req.user.id,name,url,visibility,createdAt:new Date().toISOString()};req.db.dealDocuments.push(row);await saveDB(req.db);res.json({document:row});
});
app.get('/api/listings/:id/documents', requireAuth, async (req,res)=>{const listing=req.db.listings.find(l=>l.id===req.params.id);if(!listing)return res.status(404).json({error:'Listing not found.'});const manage=canManageListing(req.db,req.user,listing);const participant=req.db.offers.some(o=>o.listingId===listing.id&&(o.buyerId===req.user.id||o.sellerId===req.user.id));if(!manage&&!participant)return res.status(403).json({error:'You do not have access to this deal vault.'});const docs=(req.db.dealDocuments||[]).filter(d=>d.listingId===listing.id&&(manage||d.visibility==='participants'));res.json({documents:docs,canManage:manage});});
app.delete('/api/listings/:id/documents/:docId', requireAuth, async (req,res)=>{const listing=req.db.listings.find(l=>l.id===req.params.id);if(!listing||!canManageListing(req.db,req.user,listing))return res.status(403).json({error:'Not allowed.'});req.db.dealDocuments=(req.db.dealDocuments||[]).filter(d=>!(d.id===req.params.docId&&d.listingId===listing.id));await saveDB(req.db);res.json({ok:true});});
app.get('/api/doc/:key', requireAuth, async (req,res)=>{const doc=(req.db.dealDocuments||[]).find(d=>String(d.url||'').endsWith('/'+req.params.key));if(!doc)return res.status(404).end();const listing=req.db.listings.find(l=>l.id===doc.listingId),manage=canManageListing(req.db,req.user,listing),participant=req.db.offers.some(o=>o.listingId===doc.listingId&&(o.buyerId===req.user.id||o.sellerId===req.user.id));if(!manage&&!(participant&&doc.visibility==='participants'))return res.status(403).end();const stored=await readDocument(req.params.key);if(!stored)return res.status(404).end();res.setHeader('Content-Type',stored.contentType);res.setHeader('Content-Disposition',`inline; filename="${String(doc.name||'document').replace(/["\\]/g,'')}"`);res.send(stored.buffer);});

/* ============================ v27 OPERATING NETWORK ============================ */
const US_STATES = new Set(['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC']);
const cleanStates = xs => [...new Set((Array.isArray(xs)?xs:[]).map(x=>String(x||'').trim().toUpperCase()).filter(x=>US_STATES.has(x)))].slice(0,12);
function listingState(l){ const m=String(l?.city||'').toUpperCase().match(/,\s*([A-Z]{2})(?:\s|$)/); return m?m[1]:''; }
const activityWindowMs = { '24h':86400000, '7d':7*86400000, '30d':30*86400000 };
function actualPlanLabel(u){const a=accessFor(u);return a?.adminUnlimited?'Admin':a?.wholesale?'Wholesale Teams':a?.platinum?'Platinum':a?.pro?'Plus':a?.trial?'Trial':'Free';} function safeActivityUser(u){ return {id:u.id,name:u.name,username:u.username||null,email:u.email,role:u.role,roles:Array.isArray(u.roles)?u.roles:[u.role].filter(Boolean),plan:actualPlanLabel(u),verified:!!u.verified,foundingMember:!!u.foundingMember,demo:!!u.demo,demoPlan:u.demoPlan||null,demoPreview:u.demoPreview||null,lastActiveAt:u.lastActiveAt||null,createdAt:u.createdAt||null,markets:u.investmentMarkets||[]}; }
function notificationSummaryFor(db,user){
  const messages=(db.messages||[]).filter(m=>m.toUserId===user.id&&!m.read).length;
  const network=(db.friendRequests||[]).filter(r=>r.status==='pending'&&r.toUserId===user.id&&!isAffiliateOnlyUser(db.users.find(u=>u.id===r.fromUserId))).length;
  const savedsearches=(db.dealNotifications||[]).filter(n=>n.userId===user.id&&!n.read).length;
  const admin=isAdminUser(user);
  const affiliate=admin?(db.affiliateApplications||[]).filter(a=>a.status==='pending').length:0;
  const reports=admin?(db.reports||[]).filter(r=>r.status==='open').length:0;
  const destinations={messages,network,savedsearches,affiliate,reports};
  const profile=Object.values(destinations).reduce((n,x)=>n+Number(x||0),0);
  return {total:profile,profile,destinations};
}
app.post('/api/activity/heartbeat', requireAuth, async (req,res)=>{
  const now=new Date(), nowIso=now.toISOString();
  if(isDemoUser(req.user)){ return res.json({ok:true,at:req.user.lastActiveAt||nowIso,demo:true,notifications:notificationSummaryFor(req.db,req.user)}); }
  req.db.activityEvents=req.db.activityEvents||[];
  let changed=false;
  if(!req.user.lastActiveAt || now-new Date(req.user.lastActiveAt)>90_000){req.user.lastActiveAt=nowIso;changed=true;}
  const last=[...req.db.activityEvents].reverse().find(x=>x.userId===req.user.id);
  if(!last||now-new Date(last.at)>15*60_000){req.db.activityEvents.push({id:crypto.randomUUID(),userId:req.user.id,at:nowIso});changed=true;}
  const cutoff=Date.now()-180*86400000;
  if(req.db.activityEvents.length>50000){req.db.activityEvents=req.db.activityEvents.filter(x=>new Date(x.at).getTime()>=cutoff);changed=true;}
  if(changed) await saveDB(req.db);
  res.json({ok:true,at:req.user.lastActiveAt||nowIso,notifications:notificationSummaryFor(req.db,req.user)});
});
app.get('/api/notifications', requireAuth, async (req,res)=>{const rows=(req.db.dealNotifications||[]).filter(n=>n.userId===req.user.id).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,60);res.json({notifications:rows,unread:rows.filter(n=>!n.read).length});});
app.post('/api/notifications/read', requireAuth, async (req,res)=>{for(const n of (req.db.dealNotifications||[]))if(n.userId===req.user.id)n.read=true;await saveDB(req.db);res.json({ok:true});});
app.get('/api/admin/activity', requireAuth, requireAdmin, async (req,res)=>{
  const now=Date.now(), preset=String(req.query.preset||'24h'); let start;
  if(preset==='all'){ start=0; } else if(preset==='custom'){ const d=new Date(req.query.start); start=Number.isFinite(d.getTime())?d.getTime():now-86400000; } else start=now-(activityWindowMs[preset]||86400000);
  const endQ=new Date(req.query.end); const end=preset==='custom'&&Number.isFinite(endQ.getTime())?Math.min(now,endQ.getTime()):now;
  const activityInRange=value=>{const t=value?new Date(value).getTime():NaN;return Number.isFinite(t)&&t>=start&&t<=end};
  const inRange=u=>activityInRange(u.lastActiveAt);
  const activeNow=req.db.users.filter(u=>!isDemoUser(u)&&now-new Date(u.lastActiveAt||0).getTime()<=2*60_000).map(safeActivityUser).sort((a,b)=>String(b.lastActiveAt).localeCompare(String(a.lastActiveAt)));
  const historicalIds=new Set((req.db.activityEvents||[]).filter(e=>{return activityInRange(e.at)}).map(e=>e.userId)); const activeUsers=req.db.users.filter(u=>!isDemoUser(u)&&(historicalIds.has(u.id)||inRange(u))).map(safeActivityUser).sort((a,b)=>String(b.lastActiveAt).localeCompare(String(a.lastActiveAt)));
  const demoIds=new Set(req.db.users.filter(isDemoUser).map(u=>u.id)); const listings=req.db.listings.filter(l=>!demoIds.has(l.ownerId)).filter(l=>{return activityInRange(l.createdAt)});
  const messages=req.db.messages.filter(m=>!demoIds.has(m.fromUserId)&&!demoIds.has(m.toUserId)).filter(m=>{return activityInRange(m.at||m.createdAt)});
  const analyses=(req.db.dealAnalyses||[]).filter(x=>!demoIds.has(x.userId)).filter(x=>{return activityInRange(x.createdAt||x.at)});
  const signups=req.db.users.filter(u=>!isDemoUser(u)).filter(u=>{return activityInRange(u.createdAt)});
  const marketCounts={}; for(const u of activeUsers) for(const m of (u.markets||[])) marketCounts[m]=(marketCounts[m]||0)+1;
  res.json({preset,historyNote:preset==='all'?'All available recorded activity. Older event detail may have been pruned; users with recorded activity remain included through their last activity.':null,start:new Date(start).toISOString(),end:new Date(end).toISOString(),activeNow,activeUsers,metrics:{activeNow:activeNow.length,uniqueActive:activeUsers.length,returning:activeUsers.filter(u=>new Date(u.createdAt||0).getTime()<start).length,signups:signups.length,profilesCompleted:req.db.users.filter(u=>!isDemoUser(u)&&(u.bio||u.avatarUrl||(u.investmentMarkets||[]).length)).length,engaged:req.db.users.filter(u=>!isDemoUser(u)&&(req.db.listings.some(l=>l.ownerId===u.id)||req.db.messages.some(m=>m.fromUserId===u.id)||req.db.saves.some(x=>x.userId===u.id))).length,paid:req.db.users.filter(u=>!isDemoUser(u)&&(isPro(u)||isPlatinum(u)||isWholesale(u))).length,listings:listings.length,messages:messages.length,dealBuilderRuns:analyses.length},plans:req.db.users.filter(u=>!isDemoUser(u)).reduce((o,u)=>{const p=actualPlanLabel(u);o[p]=(o[p]||0)+1;return o;},{}),markets:Object.entries(marketCounts).sort((a,b)=>b[1]-a[1]).slice(0,12).map(([state,count])=>({state,count}))});
});
app.get('/api/admin/user-inspector', requireAuth, requireAdmin, async (req,res)=>{ const q=String(req.query.q||'').trim().toLowerCase(); const awards=req.db.founderAwards||[]; const users=req.db.users.filter(u=>!q||[u.name,u.email,u.username].some(v=>String(v||'').toLowerCase().includes(q))).slice().sort((a,b)=>{const ta=new Date(a.createdAt||0).getTime(),tb=new Date(b.createdAt||0).getTime();return tb-ta||String(b.id).localeCompare(String(a.id));}).slice(0,40).map(u=>{ const award=awards.find(a=>a.userId===u.id&&!a.voidedAt&&!a.limitExcludedAt)||null; return {...safeActivityUser(u),listings:req.db.listings.filter(l=>l.ownerId===u.id).length,saves:req.db.saves.filter(s=>s.userId===u.id).length,messages:req.db.messages.filter(m=>m.fromUserId===u.id||m.toUserId===u.id).length,paidPlan:u.plan||'free',paidPlanUntil:u.planUntil||null,grant:membershipGrantSummary(u),access:accessFor(u),founderAward:award}; }); res.json({users}); });
app.patch('/api/me/markets', requireAuth, async (req,res)=>{ req.user.investmentMarkets=cleanStates(req.body?.states); await saveDB(req.db); res.json({states:req.user.investmentMarkets}); });
app.post('/api/feed/feedback', requireAuth, async (req,res)=>{ const listingId=String(req.body?.listingId||''),kind=['hide','less'].includes(req.body?.kind)?req.body.kind:null; if(!listingId||!kind)return res.status(400).json({error:'Choose valid feedback.'}); req.db.feedFeedback=req.db.feedFeedback||[]; req.db.feedFeedback=req.db.feedFeedback.filter(f=>!(f.userId===req.user.id&&f.listingId===listingId)); req.db.feedFeedback.push({id:crypto.randomUUID(),userId:req.user.id,listingId,kind,at:new Date().toISOString()}); await saveDB(req.db); res.json({ok:true}); });
app.patch('/api/saves/:listingId/notifications', requireAuth, async (req,res)=>{ const row=req.db.saves.find(s=>s.userId===req.user.id&&s.listingId===req.params.listingId); if(!row)return res.status(404).json({error:'Save the property first.'}); row.notifyChanges=req.body?.enabled!==false; await saveDB(req.db); res.json({enabled:row.notifyChanges}); });
function searchMatchesListing(s,l){ if(!s||!l)return false; const q=String(s.query||'').trim().toLowerCase(); if(q&&!`${l.address||''} ${l.city||''} ${l.propertyType||''}`.toLowerCase().includes(q))return false; if(s.states?.length&&!s.states.some(x=>listingState(l)===x))return false; if(s.propertyTypes?.length&&!s.propertyTypes.includes(l.propertyType))return false; if(Number(s.maxPrice)>0&&Number(l.asking)>Number(s.maxPrice))return false; if(Number(s.minPrice)>0&&Number(l.asking)<Number(s.minPrice))return false; return true; }
app.get('/api/saved-searches', requireAuth, async (req,res)=>{ const rows=(req.db.savedSearches||[]).filter(x=>x.userId===req.user.id); res.json({searches:rows.map(x=>({...x,matchCount:req.db.listings.filter(l=>listingFreshness(l).availabilityStatus!=='archived'&&searchMatchesListing(x,l)).length}))}); });
app.post('/api/saved-searches', requireAuth, async (req,res)=>{ req.db.savedSearches=req.db.savedSearches||[]; const b=req.body||{}; const row={id:crypto.randomUUID(),userId:req.user.id,name:String(b.name||'Deal alert').trim().slice(0,60),query:String(b.query||'').trim().slice(0,100),states:cleanStates(b.states),propertyTypes:Array.isArray(b.propertyTypes)?b.propertyTypes.slice(0,8).map(String):[],minPrice:Math.max(0,Number(b.minPrice)||0),maxPrice:Math.max(0,Number(b.maxPrice)||0),alerts:b.alerts!==false,createdAt:new Date().toISOString()}; req.db.savedSearches.push(row); await saveDB(req.db); res.json({search:row}); });
app.delete('/api/saved-searches/:id', requireAuth, async (req,res)=>{ req.db.savedSearches=(req.db.savedSearches||[]).filter(x=>!(x.id===req.params.id&&x.userId===req.user.id)); await saveDB(req.db); res.json({ok:true}); });
app.get('/api/search', requireAuth, async (req,res)=>{ const q=String(req.query.q||'').trim().toLowerCase(),stateQ=String(req.query.state||'').trim().toUpperCase(),max=Number(req.query.maxPrice)||0,type=String(req.query.type||''); const listings=req.db.listings.filter(l=>listingFreshness(l).availabilityStatus!=='archived').filter(l=>(!q||`${l.address||''} ${l.city||''} ${l.propertyType||''}`.toLowerCase().includes(q))&&(!stateQ||String(l.city||'').toUpperCase().includes(stateQ))&&(!max||Number(l.asking)<=max)&&(!type||l.propertyType===type)).slice(0,60).map(l=>gateListing(l,req.user,req.db)); const people=req.db.users.filter(u=>!isAffiliateOnlyUser(u)&&u.id!==req.user.id&&(!q||`${u.name||''} ${u.username||''} ${(u.investmentMarkets||[]).join(' ')}`.toLowerCase().includes(q))).slice(0,30).map(publicProfileUser); const companies=(req.db.companies||[]).filter(c=>!q||`${c.name||''} ${c.slug||''} ${(c.markets||[]).join(' ')}`.toLowerCase().includes(q)).slice(0,20).map(publicCompany); const buyers=publicBuyerDemand(req.db,req.user.id).filter(x=>!q||`${x.user?.name||''} ${x.label||''} ${(x.cities||[]).join(' ')} ${x.strategy||''}`.toLowerCase().includes(q)).slice(0,20); const marketSet=new Set();for(const l of req.db.listings){const st=listingState(l);if(st)marketSet.add(st);}for(const u of req.db.users.filter(u=>!isAffiliateOnlyUser(u)))for(const st of (u.investmentMarkets||[]))marketSet.add(st);const markets=[...marketSet].filter(x=>!q||x.toLowerCase().includes(q)).slice(0,20); res.json({listings,people,companies,buyers,markets}); });
app.get('/api/pipeline', requireAuth, async (req,res)=>{ const rows=(req.db.pipelineDeals||[]).filter(x=>x.userId===req.user.id|| (req.user.companyId&&x.companyId===req.user.companyId)); res.json({deals:rows}); });
app.post('/api/pipeline', requireAuth, async (req,res)=>{ req.db.pipelineDeals=req.db.pipelineDeals||[]; const b=req.body||{},listing=b.listingId?req.db.listings.find(l=>l.id===b.listingId):null; let row=b.id&&req.db.pipelineDeals.find(x=>x.id===b.id&&(x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId))); if(!row){row={id:crypto.randomUUID(),userId:req.user.id,companyId:req.user.companyId||null,createdAt:new Date().toISOString()};req.db.pipelineDeals.push(row);} row.listingId=String(b.listingId||row.listingId||'');row.title=String(b.title||row.title||listing?.address||'Untitled deal').slice(0,120);row.stage=['lead','analyzing','contacted','contract','dispo','closing','closed','dead'].includes(b.stage)?b.stage:(row.stage||'lead');row.nextAction=String(b.nextAction||row.nextAction||'').slice(0,180);if(b.notes!==undefined)row.notes=String(b.notes||'').slice(0,2000);if(b.assignedTo!==undefined){const member=req.db.users.find(u=>u.id===b.assignedTo&&u.companyId===req.user.companyId);row.assignedTo=member?member.id:null;}row.updatedAt=new Date().toISOString();await saveDB(req.db);res.json({deal:row}); });
app.delete('/api/pipeline/:id', requireAuth, async (req,res)=>{ req.db.pipelineDeals=(req.db.pipelineDeals||[]).filter(x=>!(x.id===req.params.id&&(x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId))));await saveDB(req.db);res.json({ok:true}); });
app.get('/api/deal-calendar', requireAuth, async (req,res)=>{ let events=(req.db.dealCalendarEvents||[]).filter(x=>x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId)); const owned=new Set(req.db.listings.filter(l=>l.ownerId===req.user.id||(req.user.companyId&&l.companyId===req.user.companyId)).map(l=>l.id)); for(const l of req.db.listings.filter(l=>owned.has(l.id)&&l.contractDeadline)){const at=new Date(l.contractDeadline+'T17:00:00');if(Number.isFinite(at.getTime()))events.push({id:'contract-'+l.id,listingId:l.id,title:`Contract deadline · ${l.address}`,at:at.toISOString(),kind:'contract deadline',system:true});} for(const o of req.db.offers.filter(o=>(o.buyerId===req.user.id||o.sellerId===req.user.id)&&o.expiresAt)){events.push({id:'offer-'+o.id,listingId:o.listingId,title:`Offer expires · ${o.listingAddress}`,at:o.expiresAt,kind:'offer expiration',system:true});} events=events.sort((a,b)=>String(a.at).localeCompare(String(b.at))); res.json({events}); });
app.post('/api/deal-calendar', requireAuth, async (req,res)=>{ req.db.dealCalendarEvents=req.db.dealCalendarEvents||[]; const b=req.body||{},d=new Date(b.at); if(!Number.isFinite(d.getTime()))return res.status(400).json({error:'Choose a valid date.'}); const row={id:crypto.randomUUID(),userId:req.user.id,companyId:req.user.companyId||null,listingId:String(b.listingId||''),title:String(b.title||'Deal deadline').slice(0,120),at:d.toISOString(),kind:String(b.kind||'follow-up').slice(0,40),createdAt:new Date().toISOString()};req.db.dealCalendarEvents.push(row);await saveDB(req.db);res.json({event:row}); });
app.delete('/api/deal-calendar/:id', requireAuth, async (req,res)=>{req.db.dealCalendarEvents=(req.db.dealCalendarEvents||[]).filter(x=>!(x.id===req.params.id&&(x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId))));await saveDB(req.db);res.json({ok:true});});
app.get('/api/market-hubs', requireAuth, async (req,res)=>{ const states={}; for(const l of req.db.listings.filter(x=>listingFreshness(x).availabilityStatus!=='archived')){const m=String(l.city||'').match(/,\s*([A-Z]{2})(?:\s|$)/);if(!m)continue;states[m[1]]=states[m[1]]||{state:m[1],listings:0,buyers:0,investors:0};states[m[1]].listings++;} for(const u of req.db.users.filter(u=>!isAffiliateOnlyUser(u)))for(const st of (u.investmentMarkets||[])){states[st]=states[st]||{state:st,listings:0,buyers:0,investors:0};states[st].investors++;} for(const u of req.db.users.filter(u=>!isAffiliateOnlyUser(u)))for(const bb of getBuyBoxes(u))for(const c of (bb.cities||[])){const m=String(c).match(/\b([A-Z]{2})\b/);if(m){states[m[1]]=states[m[1]]||{state:m[1],listings:0,buyers:0,investors:0};states[m[1]].buyers++;}} res.json({markets:Object.values(states).sort((a,b)=>(b.listings+b.buyers+b.investors)-(a.listings+a.buyers+a.investors))}); });
function dashboardSummary(db,user){
  const markets=user.investmentMarkets||[];
  const matched=db.listings.filter(l=>listingFreshness(l).availabilityStatus!=='archived'&&markets.some(m=>String(l.city||'').includes(m))).length;
  const mine=db.listings.filter(l=>l.ownerId===user.id);
  const buyerMatches=mine.reduce((n,l)=>n+buyerMatchesForListing(db,l).length,0);
  const pendingOffers=db.offers.filter(o=>(o.sellerId===user.id||o.buyerId===user.id)&&o.status==='pending').length;
  const upcoming=(db.dealCalendarEvents||[]).filter(e=>e.userId===user.id&&new Date(e.at)>new Date()).sort((a,b)=>new Date(a.at)-new Date(b.at))[0]||null;
  const seen=new Set(),recentViewed=[];
  for(const v of db.views.filter(v=>v.userId===user.id).sort((a,b)=>new Date(b.at)-new Date(a.at))){if(seen.has(v.listingId))continue;const l=db.listings.find(x=>x.id===v.listingId);if(l){seen.add(v.listingId);recentViewed.push({id:l.id,address:l.address,city:l.city,asking:l.asking,photo:l.photos?.[0]||null});if(recentViewed.length>=5)break;}}
  return {matched,buyerMatches,pendingOffers,upcoming,recentViewed};
}
app.get('/api/dashboard', requireAuth, async (req,res)=>res.json(dashboardSummary(req.db,req.user)));
app.get('/api/team-operations', requireAuth, async (req,res)=>{ if(!req.user.companyId)return res.status(403).json({error:'Join a Team workspace to use shared operations.'}); const members=req.db.users.filter(u=>u.companyId===req.user.companyId).map(u=>({id:u.id,name:u.name,username:u.username})); const deals=(req.db.pipelineDeals||[]).filter(x=>x.companyId===req.user.companyId); const crm=(req.db.buyerCrm||[]).filter(x=>x.companyId===req.user.companyId); const listings=req.db.listings.filter(l=>l.companyId===req.user.companyId); const activity=[...deals.map(d=>({at:d.updatedAt||d.createdAt,text:`Pipeline · ${d.title} · ${d.stage}`})),...crm.map(c=>({at:c.updatedAt||c.createdAt,text:`Buyer CRM · ${c.name} · ${c.status}`})),...listings.map(l=>({at:l.createdAt,text:`Listing posted · ${l.address}`}))].filter(x=>x.at).sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,30); res.json({members,deals,activity,analytics:{pipeline:deals.length,buyers:crm.length,listings:listings.length}}); });


/* ================= v29 TRANSACTION OS + AFFILIATES ================= */
const AFFILIATE_RATE_BPS = 3000; // 30.00% — versioned terms below
const AFFILIATE_HOLD_DAYS = 3;
function safeText(v,n=500){ return String(v||'').trim().slice(0,n); }
function canAccessDeal(db,user,listingId){
  const l=db.listings.find(x=>x.id===listingId); if(!l)return false;
  return canManageListing(db,user,l) || db.offers.some(o=>o.listingId===listingId&&(o.buyerId===user.id||o.sellerId===user.id)) || (db.dealCollaborators||[]).some(c=>c.listingId===listingId&&c.userId===user.id&&c.status==='active');
}
function logDealActivity(db, listingId, user, kind, text, meta={}){ db.dealActivity=db.dealActivity||[]; db.dealActivity.push({id:crypto.randomUUID(),listingId,userId:user?.id||null,userName:user?.name||'System',kind,text:safeText(text,500),meta,at:new Date().toISOString()}); }
function affiliateTerms(){ return {version:'2026-09-27-v3',rateBps:AFFILIATE_RATE_BPS,ratePct:30,holdDays:AFFILIATE_HOLD_DAYS,oneTime:true,summary:'30% one-time commission on a qualifying referred customer’s first eligible paid Better Real Estate membership transaction. Renewals and later billing cycles do not earn another commission. Earnings are held for 3 days and may be reversed for refunds, disputes, fraud or ineligible sales.'}; }
function affiliateForUser(db,userId){return (db.affiliateApplications||[]).find(a=>a.userId===userId&&a.status==='approved')||null;}
function affiliateCommission(db,user,amountCents,sourceId,tier){
  if(!user?.affiliateReferrerId||!amountCents||amountCents<1)return null;
  const app=affiliateForUser(db,user.affiliateReferrerId); const currentTerms=affiliateTerms(); if(!app||app.userId===user.id||!app.termsAcceptedAt||app.termsVersion!==currentTerms.version||Number(app.rateBps)!==currentTerms.rateBps)return null;
  db.affiliateCommissions=db.affiliateCommissions||[];
  // One lifetime membership-acquisition commission per referred customer.
  // Stripe creates a fresh invoice ID every billing cycle, so source-ID-only
  // deduplication would accidentally make the program recurring.
  if(db.affiliateCommissions.some(c=>c.sourceId===sourceId))return null;
  if(db.affiliateCommissions.some(c=>c.affiliateUserId===app.userId&&c.customerUserId===user.id&&c.kind==='membership_acquisition'))return null;
  const amount=Math.floor(Number(amountCents)*Number(app.rateBps||AFFILIATE_RATE_BPS)/10000), now=new Date();
  const row={id:crypto.randomUUID(),affiliateUserId:app.userId,customerUserId:user.id,sourceId,tier:tier||user.plan||'pro',grossCents:Number(amountCents),rateBps:Number(app.rateBps||AFFILIATE_RATE_BPS),amountCents:amount,status:'pending',createdAt:now.toISOString(),availableAt:new Date(now.getTime()+AFFILIATE_HOLD_DAYS*86400000).toISOString(),termsVersion:app.termsVersion||affiliateTerms().version,kind:'membership_acquisition',oneTime:true};
  db.affiliateCommissions.push(row); return row;
}
function affiliateBalances(db,userId){const rows=(db.affiliateCommissions||[]).filter(c=>c.affiliateUserId===userId);const now=Date.now();for(const c of rows)if(c.status==='pending'&&new Date(c.availableAt).getTime()<=now)c.status='available';const sum=st=>rows.filter(c=>c.status===st).reduce((n,c)=>n+Number(c.amountCents||0),0);return {pending:sum('pending'),available:sum('available'),paid:sum('paid'),reversed:sum('reversed'),rows};}

app.get('/api/transaction-hub', requireAuth, async (req,res)=>{
 const uid=req.user.id,companyId=req.user.companyId||null,scope=x=>x.userId===uid||(companyId&&x.companyId===companyId);
 res.json({contacts:(req.db.relationshipContacts||[]).filter(scope),tasks:(req.db.dealTasks||[]).filter(x=>scope(x)&&x.status!=='done'),fileRequests:(req.db.fileRequests||[]).filter(x=>x.requestedBy===uid||x.requestedFrom===uid),credentials:(req.db.buyerCredentials||[]).filter(x=>x.userId===uid),intake:(req.db.intakeSubmissions||[]).filter(x=>x.ownerId===uid),outcomes:(req.db.dealOutcomes||[]).filter(x=>x.userId===uid||(companyId&&x.companyId===companyId))});
});
app.post('/api/contacts', requireAuth, async(req,res)=>{req.db.relationshipContacts=req.db.relationshipContacts||[];const b=req.body||{},row={id:crypto.randomUUID(),userId:req.user.id,companyId:b.shared&&req.user.companyId?req.user.companyId:null,name:safeText(b.name,100),email:safeText(b.email,160),phone:safeText(b.phone,50),tags:(Array.isArray(b.tags)?b.tags:[]).map(x=>safeText(x,40)).slice(0,12),markets:(Array.isArray(b.markets)?b.markets:[]).map(x=>safeText(x,40)).slice(0,12),notes:safeText(b.notes,1500),nextFollowUp:b.nextFollowUp&&Number.isFinite(new Date(b.nextFollowUp).getTime())?new Date(b.nextFollowUp).toISOString():null,lastContactAt:new Date().toISOString(),createdAt:new Date().toISOString()};if(!row.name)return res.status(400).json({error:'Contact name is required.'});req.db.relationshipContacts.push(row);await saveDB(req.db);res.json({contact:row});});
app.patch('/api/contacts/:id', requireAuth, async(req,res)=>{const x=(req.db.relationshipContacts||[]).find(x=>x.id===req.params.id&&(x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId)));if(!x)return res.status(404).json({error:'Contact not found.'});for(const k of ['name','email','phone','notes'])if(k in req.body)x[k]=safeText(req.body[k],k==='notes'?1500:160);if('nextFollowUp'in req.body)x.nextFollowUp=req.body.nextFollowUp?new Date(req.body.nextFollowUp).toISOString():null;x.updatedAt=new Date().toISOString();await saveDB(req.db);res.json({contact:x});});
app.post('/api/deal-tasks', requireAuth, async(req,res)=>{req.db.dealTasks=req.db.dealTasks||[];const b=req.body||{},listingId=safeText(b.listingId,80);if(listingId&&!canAccessDeal(req.db,req.user,listingId))return res.status(403).json({error:'You do not have access to that deal.'});const row={id:crypto.randomUUID(),userId:req.user.id,companyId:req.user.companyId||null,listingId,title:safeText(b.title,140),assignedTo:safeText(b.assignedTo,80)||req.user.id,dueAt:b.dueAt?new Date(b.dueAt).toISOString():null,status:'open',createdAt:new Date().toISOString()};if(!row.title)return res.status(400).json({error:'Task title is required.'});req.db.dealTasks.push(row);if(listingId)logDealActivity(req.db,listingId,req.user,'task',`Task created · ${row.title}`);await saveDB(req.db);res.json({task:row});});
app.patch('/api/deal-tasks/:id', requireAuth, async(req,res)=>{const x=(req.db.dealTasks||[]).find(x=>x.id===req.params.id&&(x.userId===req.user.id||x.assignedTo===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId)));if(!x)return res.status(404).json({error:'Task not found.'});if(req.body.status)x.status=['open','done'].includes(req.body.status)?req.body.status:x.status;if(req.body.title)x.title=safeText(req.body.title,140);x.updatedAt=new Date().toISOString();if(x.listingId)logDealActivity(req.db,x.listingId,req.user,'task',`${x.status==='done'?'Completed':'Updated'} · ${x.title}`);await saveDB(req.db);res.json({task:x});});
app.get('/api/deals/:listingId/activity', requireAuth, async(req,res)=>{if(!canAccessDeal(req.db,req.user,req.params.listingId))return res.status(403).json({error:'Deal access required.'});res.json({activity:(req.db.dealActivity||[]).filter(x=>x.listingId===req.params.listingId).sort((a,b)=>String(b.at).localeCompare(String(a.at)))});});
app.post('/api/deals/:listingId/file-requests', requireAuth, async(req,res)=>{if(!canAccessDeal(req.db,req.user,req.params.listingId))return res.status(403).json({error:'Deal access required.'});req.db.fileRequests=req.db.fileRequests||[];const b=req.body||{},row={id:crypto.randomUUID(),listingId:req.params.listingId,requestedBy:req.user.id,requestedFrom:safeText(b.requestedFrom,80),label:safeText(b.label,120)||'Requested document',status:'open',createdAt:new Date().toISOString()};if(!row.requestedFrom)return res.status(400).json({error:'Choose who should provide the document.'});req.db.fileRequests.push(row);logDealActivity(req.db,row.listingId,req.user,'file-request',`Requested document · ${row.label}`);await saveDB(req.db);res.json({request:row});});
app.post('/api/credentials', requireAuth, async(req,res)=>{req.db.buyerCredentials=req.db.buyerCredentials||[];const b=req.body||{},row={id:crypto.randomUUID(),userId:req.user.id,type:['proof-of-funds','preapproval','entity','other'].includes(b.type)?b.type:'proof-of-funds',label:safeText(b.label,120)||'Buyer credential',note:safeText(b.note,600),verified:false,createdAt:new Date().toISOString()};req.db.buyerCredentials.push(row);await saveDB(req.db);res.json({credential:row});});
app.post('/api/deals/:listingId/collaborators', requireAuth, async(req,res)=>{const l=req.db.listings.find(x=>x.id===req.params.listingId);if(!l||!canManageListing(req.db,req.user,l))return res.status(403).json({error:'Only the deal owner/team can add collaborators.'});const target=req.db.users.find(u=>u.id===req.body?.userId);if(!target)return res.status(404).json({error:'User not found.'});req.db.dealCollaborators=req.db.dealCollaborators||[];let row=req.db.dealCollaborators.find(c=>c.listingId===l.id&&c.userId===target.id);if(!row){row={id:crypto.randomUUID(),listingId:l.id,userId:target.id,role:safeText(req.body?.role,60)||'Collaborator',status:'active',addedBy:req.user.id,createdAt:new Date().toISOString()};req.db.dealCollaborators.push(row);}logDealActivity(req.db,l.id,req.user,'collaborator',`${target.name} added as ${row.role}`);await saveDB(req.db);res.json({collaborator:row});});
app.post('/api/deals/:listingId/outcome', requireAuth, async(req,res)=>{if(!canAccessDeal(req.db,req.user,req.params.listingId))return res.status(403).json({error:'Deal access required.'});req.db.dealOutcomes=req.db.dealOutcomes||[];const b=req.body||{},row={id:crypto.randomUUID(),listingId:req.params.listingId,userId:req.user.id,companyId:req.user.companyId||null,status:['closed','dead','assigned','sold','held'].includes(b.status)?b.status:'closed',purchase:Number(b.purchase)||0,rehab:Number(b.rehab)||0,holding:Number(b.holding)||0,closing:Number(b.closing)||0,resale:Number(b.resale)||0,assignmentFee:Number(b.assignmentFee)||0,notes:safeText(b.notes,1200),createdAt:new Date().toISOString()};row.profit=row.resale+row.assignmentFee-row.purchase-row.rehab-row.holding-row.closing;req.db.dealOutcomes.push(row);logDealActivity(req.db,row.listingId,req.user,'outcome',`Deal marked ${row.status}`);await saveDB(req.db);res.json({outcome:row});});

app.get('/api/deals/:listingId/comp-board', requireAuth, async(req,res)=>{if(!canAccessDeal(req.db,req.user,req.params.listingId))return res.status(403).json({error:'Deal access required.'});const board=(req.db.compBoards||[]).find(x=>x.listingId===req.params.listingId)||{listingId:req.params.listingId,comps:[],notes:''};res.json({board});});
app.post('/api/deals/:listingId/comp-board', requireAuth, async(req,res)=>{if(!canAccessDeal(req.db,req.user,req.params.listingId))return res.status(403).json({error:'Deal access required.'});req.db.compBoards=req.db.compBoards||[];let board=req.db.compBoards.find(x=>x.listingId===req.params.listingId);if(!board){board={id:crypto.randomUUID(),listingId:req.params.listingId,comps:[],notes:'',createdAt:new Date().toISOString()};req.db.compBoards.push(board);}if(Array.isArray(req.body?.comps))board.comps=req.body.comps.slice(0,30).map(c=>({address:safeText(c.address,180),salePrice:Number(c.salePrice)||0,distance:safeText(c.distance,40),notes:safeText(c.notes,300),included:c.included!==false}));if('notes'in(req.body||{}))board.notes=safeText(req.body.notes,2000);board.updatedAt=new Date().toISOString();logDealActivity(req.db,req.params.listingId,req.user,'comps','Collaborative comp board updated');await saveDB(req.db);res.json({board});});
app.get('/api/service-providers', requireAuth, async(req,res)=>{const q=safeText(req.query.q,80).toLowerCase(),market=safeText(req.query.market,40).toUpperCase();const rows=req.db.users.filter(u=>!isAffiliateOnlyUser(u)&&u.id!==req.user.id&&u.settings?.serviceProvider===true).filter(u=>!q||[u.name,u.bio,...(u.settings?.serviceTypes||[])].join(' ').toLowerCase().includes(q)).filter(u=>!market||(u.investmentMarkets||[]).includes(market)).slice(0,100).map(publicUser);res.json({providers:rows});});

app.get('/api/offers/compare/:listingId', requireAuth, async(req,res)=>{const l=req.db.listings.find(x=>x.id===req.params.listingId);if(!l||!canManageListing(req.db,req.user,l))return res.status(403).json({error:'Only the seller/team can compare offers.'});res.json({listing:{id:l.id,address:l.address},offers:req.db.offers.filter(o=>o.listingId===l.id).sort((a,b)=>Number(b.amount)-Number(a.amount))});});
app.get('/api/buyer-matches/:listingId', requireAuth, async(req,res)=>{const l=req.db.listings.find(x=>x.id===req.params.listingId);if(!l||!canManageListing(req.db,req.user,l))return res.status(403).json({error:'Only the listing owner/team can view buyer matches.'});const rows=buyerMatchesForListing(req.db,l).map(x=>{const u=req.db.users.find(u=>u.id===(x.userId||x.id));const reasons=[];if(u?.investmentMarkets?.some(m=>String(l.city||'').includes(m)))reasons.push('Works in this market');if(getBuyBoxes(u||{}).some(bb=>(bb.cities||[]).some(c=>String(l.city||'').toLowerCase().includes(String(c).toLowerCase()))))reasons.push('Buy box location match');if((req.db.saves||[]).some(s=>s.userId===u?.id))reasons.push('Active property saver');return {...x,reasons:reasons.length?reasons:['Matches stated buying criteria']};});res.json({matches:rows});});

app.get('/api/intake-link', requireAuth, async(req,res)=>{if(!req.user.intakeCode)req.user.intakeCode=crypto.randomBytes(8).toString('hex');await saveDB(req.db);res.json({code:req.user.intakeCode,url:`${appBaseUrl()}/?view=intake&code=${req.user.intakeCode}`});});
app.get('/api/intake/:code', async(req,res)=>{const owner=req.db.users.find(u=>u.intakeCode===req.params.code);if(!owner)return res.status(404).json({error:'Intake link not found.'});res.json({owner:{name:owner.name,username:owner.username||null,avatarUrl:owner.avatarUrl||null}});});
app.post('/api/intake/:code', async(req,res)=>{const owner=req.db.users.find(u=>u.intakeCode===req.params.code);if(!owner)return res.status(404).json({error:'Intake link not found.'});req.db.intakeSubmissions=req.db.intakeSubmissions||[];const b=req.body||{},row={id:crypto.randomUUID(),ownerId:owner.id,name:safeText(b.name,100),email:safeText(b.email,160),phone:safeText(b.phone,50),address:safeText(b.address,180),asking:Number(b.asking)||0,notes:safeText(b.notes,1500),status:'new',createdAt:new Date().toISOString()};if(!row.name||!row.address)return res.status(400).json({error:'Name and property address are required.'});req.db.intakeSubmissions.push(row);await saveDB(req.db);res.json({ok:true});});

app.get('/api/export/:kind', requireAuth, async(req,res)=>{let rows=[];if(req.params.kind==='contacts')rows=(req.db.relationshipContacts||[]).filter(x=>x.userId===req.user.id);else if(req.params.kind==='pipeline')rows=(req.db.pipelineDeals||[]).filter(x=>x.userId===req.user.id||(req.user.companyId&&x.companyId===req.user.companyId));else if(req.params.kind==='outcomes')rows=(req.db.dealOutcomes||[]).filter(x=>x.userId===req.user.id);else return res.status(400).json({error:'Unknown export.'});const keys=[...new Set(rows.flatMap(x=>Object.keys(x).filter(k=>!['notes'].includes(k))))];const esc=v=>'"'+String(v??'').replace(/"/g,'""')+'"';res.type('text/csv').setHeader('Content-Disposition',`attachment; filename="better-${req.params.kind}.csv"`);res.send([keys.map(esc).join(','),...rows.map(r=>keys.map(k=>esc(r[k])).join(','))].join('\n'));});

require('./affiliateProspects').registerAffiliateProspects(app,{requireAuth,saveDB,crypto});
app.get('/api/affiliate/qr',requireAuth,(req,res)=>{
 const a=affiliateForUser(req.db,req.user.id),terms=affiliateTerms();
 if(!a||!a.termsAcceptedAt||a.termsVersion!==terms.version||Number(a.rateBps)!==Number(terms.rateBps))return res.status(403).json({error:'Approve and accept current affiliate terms before sharing a QR code.'});
 try{res.type('image/svg+xml').set('Cache-Control','private, max-age=3600').send(require('./affiliateQR').qrSVG(`${appBaseUrl()}/s/join?aff=${encodeURIComponent(a.code)}`));}catch(e){res.status(400).json({error:e.message});}
});
app.get('/api/affiliate/me', requireAuth, async(req,res)=>{const appRow=(req.db.affiliateApplications||[]).find(a=>a.userId===req.user.id)||null,bal=affiliateBalances(req.db,req.user.id),clicks=(req.db.affiliateClicks||[]).filter(x=>x.affiliateUserId===req.user.id).length,sales=bal.rows.length;res.json({application:appRow,terms:affiliateTerms(),metrics:{clicks,sales,pending:bal.pending,available:bal.available,paid:bal.paid,reversed:bal.reversed},commissions:bal.rows.sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).slice(0,100),link:appRow?.status==='approved'?`${appBaseUrl()}/s/join?aff=${encodeURIComponent(appRow.code)}`:null,payoutConfigured:!!req.user.stripeAccountId});});
app.post('/api/affiliate/apply', requireAuth, async(req,res)=>{
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });req.db.affiliateApplications=req.db.affiliateApplications||[];let row=req.db.affiliateApplications.find(a=>a.userId===req.user.id);if(row&&['pending','approved'].includes(row.status))return res.status(409).json({error:`Affiliate application is already ${row.status}.`});const b=req.body||{};row={id:crypto.randomUUID(),userId:req.user.id,name:req.user.name,email:req.user.email,status:'pending',audience:safeText(b.audience,800),channels:safeText(b.channels,500),why:safeText(b.why,1000),code:(req.user.username||req.user.referralCode||crypto.randomBytes(5).toString('hex')).replace(/[^a-z0-9_-]/gi,'').toUpperCase().slice(0,24),rateBps:AFFILIATE_RATE_BPS,termsVersion:affiliateTerms().version,termsAcceptedAt:null,createdAt:new Date().toISOString()};req.db.affiliateApplications.push(row);await saveDB(req.db);res.json({application:row});});
app.post('/api/affiliate/accept-terms', requireAuth, async(req,res)=>{const a=(req.db.affiliateApplications||[]).find(a=>a.userId===req.user.id&&a.status==='approved');if(!a)return res.status(403).json({error:'Approved affiliate access required.'});const t=affiliateTerms();if(req.body?.version!==t.version)return res.status(409).json({error:'Affiliate terms changed. Review the latest terms.'});a.termsVersion=t.version;a.rateBps=t.rateBps;a.termsAcceptedAt=new Date().toISOString();req.db.affiliateTerms=req.db.affiliateTerms||[];req.db.affiliateTerms.push({id:crypto.randomUUID(),userId:req.user.id,version:t.version,rateBps:t.rateBps,acceptedAt:a.termsAcceptedAt});await saveDB(req.db);res.json({ok:true,application:a});});
app.post('/api/affiliate/payout-onboarding', requireAuth, async(req,res)=>{
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot connect real payment or payout methods. Convert the account to a real account first.' });const a=affiliateForUser(req.db,req.user.id);if(!a||!a.termsAcceptedAt)return res.status(403).json({error:'Approve and accept affiliate terms first.'});const out=await payments.createConnectAccount(req.user,appBaseUrl());await saveDB(req.db);res.json(out);});
app.post('/api/affiliate/withdraw', requireAuth, async(req,res)=>{
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });const a=affiliateForUser(req.db,req.user.id);if(!a||!a.termsAcceptedAt)return res.status(403).json({error:'Approved affiliate access required.'});const bal=affiliateBalances(req.db,req.user.id),amount=Math.floor(Number(req.body?.amountCents||bal.available));if(amount<100)return res.status(400).json({error:'Minimum affiliate withdrawal is $1.00.'});if(amount>bal.available)return res.status(400).json({error:'Withdrawal exceeds available affiliate earnings.'});if(!req.user.stripeAccountId)return res.status(400).json({error:'Connect a payout account first.'});const status=await payments.connectAccountStatus(req.user.stripeAccountId);if(!status?.payoutsEnabled)return res.status(400).json({error:'Finish payout verification before withdrawing.'});const transfer=await payments.payout(req.user.stripeAccountId,amount);let left=amount;for(const c of bal.rows.filter(c=>c.status==='available').sort((a,b)=>String(a.availableAt).localeCompare(String(b.availableAt)))){if(left<=0)break;const take=Math.min(left,c.amountCents);if(take===c.amountCents)c.status='paid';else{c.amountCents-=take;req.db.affiliateCommissions.push({...c,id:crypto.randomUUID(),amountCents:take,status:'paid',sourceId:c.sourceId+':partial:'+Date.now()});}c.paidAt=new Date().toISOString();c.transferId=transfer.id;left-=take;}await saveDB(req.db);res.json({ok:true,transferId:transfer.id,amountCents:amount});});
app.get('/api/admin/affiliates', requireAuth, requireAdmin, async(req,res)=>{const apps=(req.db.affiliateApplications||[]).map(a=>{const b=affiliateBalances(req.db,a.userId);return {...a,metrics:{pending:b.pending,available:b.available,paid:b.paid,reversed:b.reversed,sales:b.rows.length}}});res.json({applications:apps,terms:affiliateTerms(),totals:{clicks:(req.db.affiliateClicks||[]).length,commissions:(req.db.affiliateCommissions||[]).length,pending:(req.db.affiliateCommissions||[]).filter(x=>x.status==='pending').reduce((n,x)=>n+x.amountCents,0),paid:(req.db.affiliateCommissions||[]).filter(x=>x.status==='paid').reduce((n,x)=>n+x.amountCents,0)}});});
app.post('/api/admin/affiliates/:id/status', requireAuth, requireAdmin, async(req,res)=>{const a=(req.db.affiliateApplications||[]).find(a=>a.id===req.params.id);if(!a)return res.status(404).json({error:'Application not found.'});const status=req.body?.status;if(!['approved','denied','suspended','revoked'].includes(status))return res.status(400).json({error:'Invalid status.'});a.status=status;a.reviewedAt=new Date().toISOString();a.reviewedBy=req.user.id;if(status==='approved'){a.rateBps=AFFILIATE_RATE_BPS;a.termsVersion=affiliateTerms().version;a.termsAcceptedAt=null;}await saveDB(req.db);res.json({application:a});});


app.get('/api/listings/:id/network-intelligence', requireAuth, async(req,res)=>{
  const l=req.db.listings.find(x=>x.id===req.params.id); if(!l)return res.status(404).json({error:'Listing not found.'});
  if(!canManageListing(req.db,req.user,l))return res.status(403).json({error:'Only the listing owner/team can view network intelligence.'});
  const matches=buyerMatchesForListing(req.db,l); const networkIds=new Set((req.db.follows||[]).filter(f=>f.followerId===req.user.id).map(f=>f.followingId));
  for(const f of (req.db.friendships||[])){if(f.status!=='accepted')continue;if(f.fromUserId===req.user.id)networkIds.add(f.toUserId);if(f.toUserId===req.user.id)networkIds.add(f.fromUserId);}
  const inNetwork=matches.filter(m=>networkIds.has(m.userId||m.id)).length;
  const matchCount=matches.length; const summary=inNetwork?`${inNetwork} matching buyer${inNetwork===1?' is':'s are'} already in your network based on stated buying criteria.`:`${matchCount} buyer${matchCount===1?'':'s'} match stated buying criteria for this property.`;
  res.json({matchCount,inNetwork,summary,momentum:listingMomentum(req.db,l)});
});
app.get('/api/onboarding/first-look', requireAuth, async(req,res)=>{
  const markets=req.user.investmentMarkets||[]; const deals=req.db.listings.filter(l=>l.ownerId!==req.user.id&&listingFreshness(l).availabilityStatus!=='archived'&&(!markets.length||markets.some(m=>String(l.city||'').includes(m)))).length;
  const people=req.db.users.filter(u=>!isAffiliateOnlyUser(u)&&u.id!==req.user.id&&(!markets.length||(u.investmentMarkets||[]).some(m=>markets.includes(m)))).length;
  const mine=req.db.listings.filter(l=>l.ownerId===req.user.id); const matches=mine.reduce((n,l)=>n+buyerMatchesForListing(req.db,l).length,0);
  res.json({complete:!!req.user.settings?.firstLookCompleted,markets,deals,people,matches});
});
app.post('/api/onboarding/first-look/complete', requireAuth, async(req,res)=>{req.user.settings={...defaultSettings(),...(req.user.settings||{}),firstLookCompleted:true};await saveDB(req.db);res.json({ok:true});});

/* ============================ SELLER ANALYTICS ============================ */
app.get('/api/listings/:id/analytics', requireAuth, async (req, res) => {
  const l = req.db.listings.find(x => x.id === req.params.id);
  if (!l) return res.status(404).json({ error: 'Not found.' });
  if (l.ownerId !== req.user.id && !isAdminUser(req.user)) return res.status(403).json({ error: 'Not your listing.' });
  const views = req.db.views.filter(v => v.listingId === l.id);
  const saves = req.db.saves.filter(s => s.listingId === l.id);
  const unlocks = req.db.unlocks.filter(u => u.listingId === l.id);
  const offers = req.db.offers.filter(o => o.listingId === l.id);
  const shares = (req.db.shareEvents||[]).filter(e => e.kind === 'property' && e.targetId === l.id);
  const inquiries = (req.db.messages||[]).filter(m => m.listingId === l.id && m.toUserId === l.ownerId);
  const buyerMatches = buyerMatchesForListing(req.db,l).length;
  const spend = req.db.promotions.filter(p => p.listingId === l.id).reduce((s, p) => s + p.price, 0);
  res.json({
    views: views.length, uniqueViewers: new Set(views.map(v => v.userId)).size,
    saves: saves.length, unlocks: unlocks.length, offers: offers.length, shares:shares.length, inquiries:inquiries.length, buyerMatches,
    promoSpend: spend,
    saveRate: views.length ? Math.round(saves.length / views.length * 100) : 0,
    interested: saves.map(s => ({ name: s.userName, email: s.userEmail, at: s.at }))
  });
});

/* ============================ OFFERS ============================ */
app.post('/api/offers', requireAuth, async (req, res) => {
  const { listingId, amount, terms, closeDays, emd, financing, inspectionDays, expiresAt } = req.body || {};
  const listing = req.db.listings.find(l => l.id === listingId);
  if (!listing) return res.status(404).json({ error: 'Listing not found.' });
  if (!amount) return res.status(400).json({ error: 'Offer amount is required.' });
  const offer = {
    id: crypto.randomUUID(), listingId, listingAddress: listing.address,
    buyerId: req.user.id, buyerName: req.user.name, sellerId: listing.ownerId,
    amount: Number(amount), terms: String(terms || '').slice(0, 600),
    closeDays: Number(closeDays) || null, emd: Math.max(0,Number(emd)||0), financing: ['cash','hard-money','private','conventional','other'].includes(financing)?financing:'cash', inspectionDays: Math.max(0,Number(inspectionDays)||0), expiresAt: expiresAt && Number.isFinite(new Date(expiresAt).getTime()) ? new Date(expiresAt).toISOString() : null, status: 'pending', at: new Date().toISOString()
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

app.post('/api/founder-program/acknowledge', requireAuth, async (req,res)=>{
  if (!req.user.founderLaunchPosition) return res.status(400).json({ error:'This account is not part of the First 50 Founders program.' });
  req.user.founderLaunchNoticeSeenAt = new Date().toISOString();
  await saveDB(req.db);
  res.json({ ok:true, seenAt:req.user.founderLaunchNoticeSeenAt });
});

app.post('/api/admin/set-founding-member', requireAuth, requireAdmin, async (req,res)=>{
  const u=req.db.users.find(x=>x.id===req.body?.userId && x.role!=='admin');
  if(!u)return res.status(404).json({error:'User not found.'});
  if (isAffiliateOnlyUser(u) && req.body?.foundingMember === true) return res.status(400).json({error:'Affiliate-only accounts are not eligible for Founding Member recognition.'});
  u.foundingMember=req.body?.foundingMember===true;
  u.foundingMemberAt=u.foundingMember?new Date().toISOString():null;
  await saveDB(req.db);
  res.json({ok:true,foundingMember:u.foundingMember});
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
  const usage=plusToolAllowance(req.user,'listingAi',2); res.json({ configured: ai.configured(), available: isPro(req.user), model: ai.configured() ? ai.model() : null, usage });
});
app.post('/api/ai/listing-copy', requireAuth, async (req, res) => {
  const kind = ['shop','property','cj'].includes(req.body?.kind) ? req.body.kind : 'shop';
  const isAdmin = isAdminUser(req.user);
  if (kind === 'cj' && !isAdmin) return res.status(403).json({ error: 'Admin only.' });
  if (!isAdmin && !isPro(req.user)) return res.status(403).json({ error: 'AI listing assistance requires Better Plus or higher.' });
  if (!ai.configured()) return res.status(503).json({ error: 'AI listing assistance is not configured yet.' });

  const listingAllowance = plusToolAllowance(req.user, 'listingAi', 2);
  if (!listingAllowance.unlimited && listingAllowance.remaining <= 0) return res.status(429).json({ error: 'Today’s Better Plus AI listing drafts are used. Platinum includes unlimited AI listing assistance.' });
  if (!listingAllowance.unlimited) await consumePlusTool(req.db, req.user, 'listingAi', 2);

  const facts = req.body?.facts && typeof req.body.facts === 'object' ? req.body.facts : {};
  const images = Array.isArray(req.body?.images) ? req.body.images.slice(0, 3) : [];
  try {
    const draft = await ai.generateListingCopy({ kind, facts, images, allowedCategories: kind === 'property' ? [] : SHOP_CATEGORIES });
    if (draft.categorySuggestion && !SHOP_CATEGORIES.includes(draft.categorySuggestion) && kind !== 'property') draft.categorySuggestion = '';
    const after=plusToolAllowance(req.user,'listingAi',2); res.json({ draft, remainingToday: after.remaining, unlimited: after.unlimited });
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });
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
  req.db.saves.push({ id: crypto.randomUUID(), userId: req.user.id, userName: req.user.name, userEmail: req.user.email, listingId, at: new Date().toISOString(), verified: false, notifyChanges: true });
  await saveDB(req.db); res.json({ saved: true, notifyChanges: true });
});
app.get('/api/saves/mine', requireAuth, async (req, res) => {
  const mine = req.db.saves.filter(s => s.userId === req.user.id);
  const listings = mine.map(s => { const l=req.db.listings.find(x => x.id === s.listingId); if(!l) return null; return { ...gateListing(l, req.user, req.db), notifyChanges: s.notifyChanges !== false }; }).filter(Boolean);
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
  const friends = [...ids].map(id => req.db.users.find(u => u.id === id)).filter(u => u && !isAffiliateOnlyUser(u)).map(u => socialUserCard(req.db, req.user.id, u));
  friends.sort((a, b) => a.name.localeCompare(b.name));
  res.json({ friends });
});

app.get('/api/friends/requests', requireAuth, async (req, res) => {
  const pending = req.db.friendRequests.filter(r => r.status === 'pending' && (r.fromUserId === req.user.id || r.toUserId === req.user.id));
  const incoming = pending.filter(r => r.toUserId === req.user.id).map(r => ({ ...r, user: socialUserCard(req.db, req.user.id, req.db.users.find(u => u.id === r.fromUserId)) })).filter(r => r.user && !isAffiliateOnlyUser(r.user));
  const outgoing = pending.filter(r => r.fromUserId === req.user.id).map(r => ({ ...r, user: socialUserCard(req.db, req.user.id, req.db.users.find(u => u.id === r.toUserId)) })).filter(r => r.user && !isAffiliateOnlyUser(r.user));
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
  if (isAffiliateOnlyUser(other) || isAffiliateOnlyUser(req.user)) return res.status(403).json({error:'Affiliate-only accounts are separate from the real estate Network.'});
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
  const target = req.db.users.find(u => u.id === userId);
  if (!target || isAffiliateOnlyUser(target) || isAffiliateOnlyUser(req.user)) return res.status(404).json({error:'Network user not found.'});
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

app.get('/api/notification-summary', requireAuth, async (req,res)=>{res.json(notificationSummaryFor(req.db,req.user));});

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
  const subRev = req.db.ledger.filter(l => l.description?.includes('Better Pro') || l.description?.includes('Better Plus') || l.description?.includes('Better Platinum') || l.description?.includes('Better Wholesale Teams')).reduce((s, l) => s + Math.abs(l.meta?.charged || l.amount), 0);
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
      verificationPending: !!u.verificationPending,
      founderAward: (req.db.founderAwards || []).find(a => a.userId === u.id && !a.voidedAt&&!a.limitExcludedAt) || null
    }));
  const history = (req.db.membershipGrants || [])
    .slice()
    .sort((a,b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 80)
    .map(g => {
      const u = req.db.users.find(x => x.id === g.userId);
      const admin = req.db.users.find(x => x.id === g.grantedBy);
      return { ...g, userName: u?.name || 'Deleted account', userEmail: u?.email || null, grantedByName: admin?.name || (g.grantedBy ? 'Admin' : null) };
    });
  const monthly = leaderboardRows(req.db, 'month');
  const founderAwards = (req.db.founderAwards || []).filter(a=>!a.voidedAt&&!a.limitExcludedAt&&req.db.users.some(u=>u.id===a.userId)).slice().sort((a,b)=>Number(a.position||0)-Number(b.position||0));
  res.json({ users, history, monthlyLeader: monthly[0] || null, founderProgram:{limit:FOUNDER_PROGRAM_LIMIT,claimed:founderAwards.length,remaining:Math.max(0,FOUNDER_PROGRAM_LIMIT-founderAwards.length),awards:founderAwards} });
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
      source: 'manual',
      mode: req.body?.mode === 'extend' ? 'extend' : 'replace'
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


/* ============================ ADMIN DEMO ACCOUNTS ============================ */
app.post('/api/admin/demo-accounts', requireAuth, requireAdmin, async (req, res) => {
  const b = req.body || {};
  const name = String(b.name || '').trim().slice(0,80);
  const email = String(b.email || '').trim().toLowerCase();
  const password = String(b.password || '');
  const requestedRole = policy.SIGNUP_ROLES.includes(b.role) ? b.role : 'buyer';
  const demoPlan = ['free','pro','platinum','wholesale'].includes(String(b.demoPlan||'free').toLowerCase()) ? String(b.demoPlan||'free').toLowerCase() : 'free';
  if (!name || !email || !password) return res.status(400).json({ error:'Name, email and password are required.' });
  if (password.length < 6) return res.status(400).json({ error:'Password must be at least 6 characters.' });
  if (req.db.users.some(u => String(u.email||'').toLowerCase() === email)) return res.status(409).json({ error:'An account with that email already exists.' });
  const user = {
    id: crypto.randomUUID(), name, email, username:null, passwordHash:bcrypt.hashSync(password,10), role:requestedRole, roles:[requestedRole],
    bio:'', phone:'', location:'', investmentMarkets:[], avatarUrl:null, points:0, buyBoxes:[defaultBuyBox()], settings:defaultSettings(),
    plan:'free', planUntil:null, trialUntil:null, unlockCredits:PRICING.freeUnlocks, verified:false, paymentMethods:[], payoutMethod:null,
    emailVerified:true, marketingOptIn:false, marketingConsentAt:null, marketingUnsubscribedAt:null, marketingLastSentAt:null, marketingSequence:0,
    referralCode:crypto.randomBytes(3).toString('hex').toUpperCase(), referredBy:null, referralPaid:false,
    demo:true, demoPlan, demoPreview:null, demoCreatedBy:req.user.id, demoCreatedAt:new Date().toISOString(), createdAt:new Date().toISOString()
  };
  ensureUsername(req.db,user); req.db.users.push(user); await saveDB(req.db);
  res.json({ ok:true, user:{...safeActivityUser(user), demo:true, demoPlan} });
});
app.patch('/api/admin/demo-accounts/:id', requireAuth, requireAdmin, async (req,res)=>{
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u)); if(!user)return res.status(404).json({error:'Demo account not found.'});
  const p=String(req.body?.demoPlan||'').toLowerCase(); if(p&&!['free','pro','platinum','wholesale'].includes(p))return res.status(400).json({error:'Choose Free, Plus, Platinum or Wholesale Teams.'});
  if(p)user.demoPlan=p; await saveDB(req.db); res.json({ok:true,user:{...safeActivityUser(user),demo:true,demoPlan:user.demoPlan,demoPreview:user.demoPreview||null}});
});
app.post('/api/admin/demo-accounts/:id/preview', requireAuth, requireAdmin, async (req,res)=>{
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u)); if(!user)return res.status(404).json({error:'Demo account not found.'});
  const type=String(req.body?.type||'').toLowerCase();
  if(!['founder','onboarding','whatsnew','none'].includes(type))return res.status(400).json({error:'Choose Founder welcome, onboarding, What’s New, or clear preview.'});
  if(type==='none'){user.demoPreview=null;}
  else if(type==='founder'){
    const position=Math.max(1,Math.min(FOUNDER_PROGRAM_LIMIT,Math.floor(Number(req.body?.position||7))||7));
    user.demoPreview={type:'founder',position,createdAt:new Date().toISOString()};
  }else user.demoPreview={type,createdAt:new Date().toISOString()};
  await saveDB(req.db);
  res.json({ok:true,demoPreview:user.demoPreview||null});
});
app.post('/api/admin/demo-accounts/:id/enter', requireAuth, requireAdmin, async (req,res)=>{
  const adminId=req.user.id;
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u));
  if(!user)return res.status(404).json({error:'Demo account not found.'});
  req.session.adminReturnUserId=adminId;
  req.session.userId=user.id;
  res.json({ok:true,user:publicUser(user),access:accessFor(user)});
});
app.post('/api/demo/return-admin', requireAuth, async (req,res)=>{
  if(!isDemoUser(req.user)||!req.session?.adminReturnUserId)return res.status(403).json({error:'No Admin demo session is active.'});
  const admin=req.db.users.find(u=>u.id===req.session.adminReturnUserId&&u.role==='admin');
  if(!admin)return res.status(403).json({error:'Admin return session is no longer available.'});
  req.session.userId=admin.id; delete req.session.adminReturnUserId;
  res.json({ok:true,user:publicUser(admin),access:accessFor(admin)});
});
app.post('/api/admin/demo-accounts/:id/reset', requireAuth, requireAdmin, async (req,res)=>{
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u)); if(!user)return res.status(404).json({error:'Demo account not found.'});
  const keep=new Set(['id','name','email','username','passwordHash','role','referralCode','demo','demoPlan','demoCreatedBy','demoCreatedAt','createdAt','emailVerified']);
  for(const k of Object.keys(user))if(!keep.has(k))delete user[k];
  Object.assign(user,{bio:'',phone:'',location:'',investmentMarkets:[],avatarUrl:null,points:0,buyBoxes:[defaultBuyBox()],settings:defaultSettings(),plan:'free',planUntil:null,trialUntil:null,unlockCredits:PRICING.freeUnlocks,verified:false,paymentMethods:[],payoutMethod:null,marketingOptIn:false,referredBy:null,referralPaid:false,demoResetAt:new Date().toISOString()});
  for(const c of ['saves','follows','friendRequests','friendships','messages','unlocks','offers','reviews','views','alerts','dealNotes','buyerLeads','shareEvents','buyerCrm','dealAnalyses','activityEvents','savedSearches','pipelineDeals','dealDocuments','dealCalendarEvents','dealNotifications','feedFeedback','referralClicks','relationshipContacts','dealTasks','dealActivity','fileRequests','buyerCredentials','compBoards','dealCollaborators','dealOutcomes','intakeSubmissions','affiliateApplications','affiliateClicks','affiliateCommissions','affiliateTerms','affiliateProspects']) req.db[c]=(req.db[c]||[]).filter(x=>x.userId!==user.id&&x.fromUserId!==user.id&&x.toUserId!==user.id&&x.ownerId!==user.id&&x.buyerId!==user.id&&x.sellerId!==user.id&&x.referrerId!==user.id&&x.affiliateUserId!==user.id);
  req.db.listings=(req.db.listings||[]).filter(x=>x.ownerId!==user.id); req.db.membershipGrants=(req.db.membershipGrants||[]).filter(x=>x.userId!==user.id); await saveDB(req.db); res.json({ok:true});
});
app.post('/api/admin/demo-accounts/:id/password', requireAuth, requireAdmin, async (req,res)=>{
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u)); if(!user)return res.status(404).json({error:'Demo account not found.'});
  const password=String(req.body?.password||''); if(password.length<6)return res.status(400).json({error:'Demo password must be at least 6 characters.'});
  user.passwordHash=bcrypt.hashSync(password,10); user.demoPasswordResetAt=new Date().toISOString(); user.demoPasswordResetBy=req.user.id; await saveDB(req.db); res.json({ok:true});
});
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req,res)=>{
  const target=req.db.users.find(u=>u.id===req.params.id);
  if(!target)return res.status(404).json({error:'Account not found.'});
  if(target.role==='admin')return res.status(403).json({error:'Admin accounts cannot be deleted from User Inspector.'});
  if(target.id===req.user.id)return res.status(403).json({error:'You cannot delete your own Admin account here.'});
  if(isDemoUser(target))return res.status(400).json({error:'Use Delete demo for controlled demo accounts.'});
  if(String(req.body?.confirmation||'').trim().toUpperCase()!=='DELETE USER')return res.status(400).json({error:'Type DELETE USER to confirm.'});
  if(target.stripeSubscriptionId)return res.status(409).json({error:'This account has a subscription record. Resolve billing before deleting it.'});
  if(balanceOf(req.db,target.id)>0)return res.status(409).json({error:'This account has a seller-wallet balance. Resolve it before deletion.'});
  const activeOrder=(req.db.orders||[]).find(o=>(o.buyerId===target.id||o.sellerId===target.id)&&!['shipped','delivered','cancelled','refunded'].includes(String(o.shipStatus||o.status||'').toLowerCase()));
  if(activeOrder)return res.status(409).json({error:'This account has an active marketplace order and cannot be deleted yet.'});
  const id=target.id;
  const founderAward=(req.db.founderAwards||[]).find(a=>a.userId===id&&!a.voidedAt&&!a.limitExcludedAt);
  if(founderAward){founderAward.voidedAt=new Date().toISOString();founderAward.voidReason='admin-account-deletion';founderAward.voidedEmailLower=String(target.email||founderAward.userEmail||'').trim().toLowerCase()||null;founderAward.formerUserId=id;}
  const ownedListingIds=new Set((req.db.listings||[]).filter(l=>l.ownerId===id).map(l=>l.id));
  const touches=(x)=>x&&[x.userId,x.fromUserId,x.toUserId,x.ownerId,x.buyerId,x.sellerId,x.referrerId,x.affiliateUserId,x.followerId,x.followingId,x.byUserId,x.aboutUserId,x.grantedBy,x.invitedBy].includes(id);
  for(const c of ['saves','follows','friendRequests','friendships','messages','unlocks','promotions','alerts','tokens','dealNotes','buyerLeads','shareEvents','buyerCrm','dealAnalyses','activityEvents','savedSearches','pipelineDeals','dealDocuments','dealCalendarEvents','dealNotifications','feedFeedback','referralClicks','relationshipContacts','dealTasks','dealActivity','fileRequests','buyerCredentials','compBoards','dealCollaborators','dealOutcomes','intakeSubmissions','affiliateApplications','affiliateClicks','affiliateCommissions','affiliateTerms','affiliateProspects','membershipGrants','reviews']){
    req.db[c]=(req.db[c]||[]).filter(x=>!touches(x)&&!ownedListingIds.has(x.listingId));
  }
  req.db.views=(req.db.views||[]).filter(x=>x.userId!==id&&!ownedListingIds.has(x.listingId));
  req.db.listings=(req.db.listings||[]).filter(x=>x.ownerId!==id);
  req.db.shopItems=(req.db.shopItems||[]).filter(x=>x.sellerId!==id);
  req.db.companyInvites=(req.db.companyInvites||[]).filter(x=>x.invitedBy!==id&&String(x.email||'').toLowerCase()!==String(target.email||'').toLowerCase());
  for(const o of (req.db.offers||[])){if(o.buyerId===id){o.buyerId='deleted:admin';o.buyerName='Deleted account';}if(o.sellerId===id)o.sellerId='deleted:admin';}
  req.db.users=req.db.users.filter(u=>u.id!==id);
  ensureFirst100FounderProgram(req.db);
  await saveDB(req.db);
  res.json({ok:true});
});

app.delete('/api/admin/demo-accounts/:id', requireAuth, requireAdmin, async (req,res)=>{
  const idx=req.db.users.findIndex(u=>u.id===req.params.id&&isDemoUser(u)); if(idx<0)return res.status(404).json({error:'Demo account not found.'});
  const user=req.db.users[idx]; if(String(req.body?.confirmation||'').trim().toUpperCase()!=='DELETE DEMO')return res.status(400).json({error:'Type DELETE DEMO to confirm.'});
  if(req.session?.userId===user.id)return res.status(409).json({error:'Return to Admin before deleting the demo account.'});
  const id=user.id;
  for(const c of ['saves','follows','friendRequests','friendships','messages','unlocks','offers','reviews','views','alerts','dealNotes','buyerLeads','shareEvents','buyerCrm','dealAnalyses','activityEvents','savedSearches','pipelineDeals','dealDocuments','dealCalendarEvents','dealNotifications','feedFeedback','referralClicks','relationshipContacts','dealTasks','dealActivity','fileRequests','buyerCredentials','compBoards','dealCollaborators','dealOutcomes','intakeSubmissions','affiliateApplications','affiliateClicks','affiliateCommissions','affiliateTerms','affiliateProspects']) req.db[c]=(req.db[c]||[]).filter(x=>x.userId!==id&&x.fromUserId!==id&&x.toUserId!==id&&x.ownerId!==id&&x.buyerId!==id&&x.sellerId!==id&&x.referrerId!==id&&x.affiliateUserId!==id);
  req.db.listings=(req.db.listings||[]).filter(x=>x.ownerId!==id); req.db.membershipGrants=(req.db.membershipGrants||[]).filter(x=>x.userId!==id); req.db.users.splice(idx,1); await saveDB(req.db); res.json({ok:true});
});
app.post('/api/admin/demo-accounts/:id/convert', requireAuth, requireAdmin, async (req,res)=>{
  const user=req.db.users.find(u=>u.id===req.params.id&&isDemoUser(u)); if(!user)return res.status(404).json({error:'Demo account not found.'});
  if(String(req.body?.confirmation||'').trim().toUpperCase()!=='CONVERT')return res.status(400).json({error:'Type CONVERT to confirm.'});
  user.demo=false; user.demoPlan=null; user.founderProgramExcluded=true; user.convertedFromDemoAt=new Date().toISOString(); user.convertedFromDemoBy=req.user.id; await saveDB(req.db);
  res.json({ok:true,user:safeActivityUser(user)});
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
    .map(b => ({ id:b.id, subject:b.subject, sender:b.sender||'notifications', audience:b.audience, status:b.status, scheduledAt:b.scheduledAt, createdAt:b.createdAt, sentCount:Number(b.sentCount||0), failedCount:Number(b.failedCount||0), finishedAt:b.finishedAt || null }));
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

app.get('/api/admin/email-center/recipients', requireAuth, requireAdmin, async(req,res)=>{
  const query=String(req.query.q||'').trim().toLowerCase().slice(0,160),eligible=new Set(communications.eligibleBroadcastUsers(req.db,{kind:'all'}).map(u=>u.id));
  const matches=(req.db.users||[]).filter(u=>u.role!=='admin'&&!isDemoUser(u)&&(!query||[u.name,u.username,u.email].some(x=>String(x||'').toLowerCase().includes(query))));
  res.json({users:matches.slice(0,50).map(u=>({id:u.id,name:u.name||'',username:u.username||'',email:u.email||'',eligible:eligible.has(u.id),reason:eligible.has(u.id)?null:!u.emailVerified?'Email not verified':u.marketingUnsubscribedAt?'Unsubscribed':'Product email opt-in required'})),hasMore:matches.length>50});
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
      subject: `[TEST] ${draft.subject}`, headline: draft.headline, body: draft.body, ctaLabel: draft.ctaLabel, ctaUrl: draft.ctaUrl, sender: draft.sender,
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
  if(broadcast.audience.kind==='selected'&&!communications.eligibleBroadcastUsers(req.db,broadcast.audience).length)return res.status(400).json({error:'No eligible recipients selected.'});
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot create real billing, payouts, purchases, referrals or affiliate earnings. Convert the account to a real account first.' });
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
  if (isDemoUser(req.user)) return res.status(403).json({ error:'Demo accounts cannot connect real payment or payout methods. Convert the account to a real account first.' });
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
          ledgerAdd(db, user.id, 'purchase', 0, `Better Plus — ${period === 'annual' ? '1 year' : '1 month'}`, { paymentIntentId: pi.id, charged: pi.amount });
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
          const creditUsed=Math.max(0,Number(sess.metadata?.betterCreditCents||0)); if(creditUsed && !db.ledger.some(l=>l.meta?.betterCreditSession===sess.id)){ user.betterCreditCents=Math.max(0,Number(user.betterCreditCents||0)-creditUsed); ledgerAdd(db,user.id,'purchase',-creditUsed,'Better Credit applied to membership',{nonWithdrawable:true,betterCreditSession:sess.id}); }
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
          affiliateCommission(db,user,Number(inv.amount_paid||0),inv.id,user.plan);
          await saveDB(db);
        }
      }

      if (event.type === 'customer.subscription.deleted') {
        const sub = event.data.object;
        const user = db.users.find(u => u.stripeSubscriptionId === sub.id);
        if (user) { user.plan = 'free'; user.planUntil = null; user.stripeSubscriptionId = null; syncCompanyMemberEntitlements(db, user); await saveDB(db); }
      }

      if (event.type === 'charge.refunded' || event.type === 'charge.dispute.created') {
        const ch=event.data.object; const customerId=ch.customer || ch?.payment_intent?.customer; const customer=db.users.find(u=>u.stripeCustomerId===customerId);
        if(customer){ for(const c of (db.affiliateCommissions||[]).filter(c=>c.customerUserId===customer.id&&['pending','available'].includes(c.status))){ c.status='reversed'; c.reversedAt=new Date().toISOString(); c.reversalReason=event.type==='charge.refunded'?'Refund':'Chargeback'; } await saveDB(db); }
        if(event.type==='charge.dispute.created') console.error('[stripe] CHARGEBACK opened:', ch.id, ch.amount);
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
