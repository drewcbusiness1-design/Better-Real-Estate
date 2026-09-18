/* =========================================================================
   seed.js — populate the site so it isn't empty.

     npm run seed          add demo accounts, listings and shop items
     npm run seed:clear    remove everything marked demo

   IMPORTANT — READ BEFORE LAUNCH
   The listings below are DEMO DATA. They are flagged `demo: true` and
   render with a "Sample listing" badge. Run `npm run seed:clear` before
   real buyers use the site.

   Leaving fabricated property listings up once strangers are signing up
   is not a grey area: advertising properties that aren't for sale is a
   deceptive trade practice, and every state real-estate commission treats
   fake inventory as fraud. It also destroys trust the first time someone
   calls about a house that doesn't exist. Seed for demos and screenshots,
   then clear it.

   The shop items are yours (Andrew's) — edit or remove them freely.
   ========================================================================= */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { loadDB, saveDB } = require('./store');

async function main() {
if (process.argv.includes('--clear')) {
  const db = await loadDB();
  const demoUserIds = db.users.filter(u => u.demo).map(u => u.id);
  db.listings = db.listings.filter(l => !l.demo);
  db.shopItems = db.shopItems.filter(i => !i.demo);
  db.users = db.users.filter(u => !u.demo);
  db.saves = db.saves.filter(s => !demoUserIds.includes(s.userId));
  db.follows = db.follows.filter(f => !demoUserIds.includes(f.followerId) && !demoUserIds.includes(f.followingId));
  db.friendRequests = db.friendRequests.filter(r => !demoUserIds.includes(r.fromUserId) && !demoUserIds.includes(r.toUserId));
  db.friendships = db.friendships.filter(f => !demoUserIds.includes(f.userAId) && !demoUserIds.includes(f.userBId));
  db.messages = db.messages.filter(m => !demoUserIds.includes(m.fromUserId) && !demoUserIds.includes(m.toUserId));
  await saveDB(db);
  console.log('Demo data cleared. Real accounts and listings untouched.');
  return;
}

const db = await loadDB();
const now = Date.now();
const ago = d => new Date(now - d * 86400000).toISOString();

function makeUser(name, email, role, bio, phone, opts = {}) {
  const existing = db.users.find(u => u.email === email);
  if (existing) return existing;
  const u = {
    id: crypto.randomUUID(), name, email,
    passwordHash: bcrypt.hashSync(opts.password || 'demo1234', 10),
    role, bio, phone, location: opts.location || '', avatarUrl: null, points: opts.points || 0,
    buyBox: { minPrice: 0, maxPrice: 2000000, cities: [], propertyTypes: [], minSpread: 0, active: true },
    settings: { theme: 'light', feedDensity: 'comfortable', notifyOnMessage: true, notifyOnMatch: true },
    plan: 'free', planUntil: null, trialUntil: new Date(now + 7 * 86400000).toISOString(),
    unlockCredits: 5, verified: !!opts.verified, emailVerified: true,
    paymentMethods: [], payoutMethod: null,
    referralCode: crypto.randomBytes(3).toString('hex').toUpperCase(),
    referredBy: null, referralPaid: false,
    demo: !opts.real,
    createdAt: ago(opts.daysAgo || 20)
  };
  db.users.push(u);
  return u;
}

/* ---------- the site owner ---------- */
const owner = makeUser('Andrew', 'drewcbusiness1@gmail.com', 'seller',
  'Founder of Better Real Estate. Wholesaling and novation deals, plus surplus furniture and appliances from finished projects.',
  '', { real: true, verified: true, password: 'changeme123', daysAgo: 30 });
owner.emailVerified = true;
owner.verified = true;

/* ---------- demo community ---------- */
const marisol = makeUser('Marisol Vega', 'marisol@example.com', 'seller', 'Wholesaler working probate and pre-foreclosure in Central Texas. 40+ assignments.', '(512) 555-0143', { verified: true, points: 300, daysAgo: 60 });
const dwight  = makeUser('Dwight Okafor', 'dwight@example.com', 'seller', 'Tired-landlord specialist. Small multifamily, Midwest.', '(216) 555-0178', { points: 200, daysAgo: 45 });
const priya   = makeUser('Priya Raman', 'priya@example.com', 'seller', 'Inherited and estate properties, Phoenix metro.', '(602) 555-0119', { verified: true, points: 100, daysAgo: 35 });
const tom     = makeUser('Tom Brennan', 'tom@example.com', 'buyer',  'Buy-and-hold investor. Cash, 10-day close, no inspection contingency under $200k.', '(704) 555-0166', { points: 100, daysAgo: 50 });
const alina   = makeUser('Alina Costa', 'alina@example.com', 'buyer', 'Flipper. Looking for 20%+ spread in TX and AZ.', '(480) 555-0102', { daysAgo: 28 });

/* ---------- demo listings ---------- */
const L = (owner, o) => {
  if (db.listings.find(x => x.address === o.address && x.city === o.city)) return;
  db.listings.push({
    id: crypto.randomUUID(), ownerId: owner.id, ownerName: owner.name, ownerEmail: owner.email,
    propertyType: 'Single family', situation: 'Motivated seller', timeline: 'Flexible',
    arv: null, rehab: null, beds: null, baths: null, sqft: null, year: null,
    notes: '', videoUrl: null, photos: [],
    boostUntil: null, boostWeight: 0, spotlightUntil: null,
    closedVerified: false, demo: true,
    freshAt: o.freshAt || ago(o.daysAgo ?? 3), createdAt: ago(o.daysAgo ?? 3),
    ...o
  });
};

L(marisol, { address: '4412 Cedar Bend Dr', city: 'Austin, TX', situation: 'Probate', propertyType: 'Single family',
  asking: 268000, arv: 385000, rehab: 52000, beds: 3, baths: 2, sqft: 1620, year: 1974, timeline: 'ASAP', daysAgo: 1,
  notes: 'Estate sale, heirs live out of state and want it closed fast. Original kitchen and baths, roof replaced 2021, foundation reportedly sound. Lockbox access, drive-by anytime. Clean title, probate already cleared.' });

L(marisol, { address: '918 Mesquite St', city: 'San Antonio, TX', situation: 'Pre-foreclosure', propertyType: 'Single family',
  asking: 154000, arv: 225000, rehab: 34000, beds: 3, baths: 1, sqft: 1180, year: 1962, timeline: '2-4 weeks', daysAgo: 2,
  notes: 'Auction date set for next month, owner wants to avoid it. Needs full cosmetic rehab plus HVAC. Occupied — 24 hours notice for showings.' });

L(dwight, { address: '2207 Larchmere Blvd', city: 'Cleveland, OH', situation: 'Tired landlord', propertyType: 'Multi-family',
  asking: 189000, arv: 265000, rehab: 28000, beds: 4, baths: 2, sqft: 2400, year: 1928, timeline: '1-2 months', daysAgo: 4,
  notes: 'Side-by-side duplex, both units currently rented at $850 each — under market by roughly $300/unit. Owner has held 22 years and is retiring. Separate utilities, newer boilers.' });

L(dwight, { address: '631 Hazelwood Ave', city: 'Detroit, MI', situation: 'Investor exit', propertyType: 'Single family',
  asking: 72000, arv: 128000, rehab: 31000, beds: 3, baths: 1, sqft: 1050, year: 1951, timeline: 'ASAP', daysAgo: 6,
  notes: 'Partially rehabbed then stalled — new electrical and plumbing already in, needs kitchen, bath, flooring and paint to finish. All permits pulled and current.' });

L(priya, { address: '10455 N 39th Pl', city: 'Phoenix, AZ', situation: 'Inherited property', propertyType: 'Single family',
  asking: 312000, arv: 425000, rehab: 45000, beds: 4, baths: 2, sqft: 1890, year: 1988, timeline: '2-4 weeks', daysAgo: 3,
  notes: 'Family wants a clean cash close, no repairs, no contingencies. Pool needs resurfacing. Block construction, tile roof in good shape. Vacant and empty.' });

L(priya, { address: '7719 W Osborn Rd', city: 'Phoenix, AZ', situation: 'Divorce', propertyType: 'Townhouse',
  asking: 198000, arv: 258000, rehab: 18000, beds: 2, baths: 2, sqft: 1240, year: 2003, timeline: 'ASAP', daysAgo: 5,
  notes: 'Both parties have signed off on selling, decree is final so there is no delay on signature. Light cosmetic work only — paint, carpet, one vanity. HOA $145/mo.' });

L(marisol, { address: '505 County Road 218', city: 'Round Rock, TX', situation: 'Motivated seller', propertyType: 'Land',
  asking: 89000, arv: 140000, rehab: 0, beds: null, baths: null, sqft: null, year: null, timeline: 'Flexible', daysAgo: 8,
  notes: '2.1 acres, unimproved, road frontage on the north edge. Utilities at the street. Survey from 2019 available on request.' });

L(dwight, { address: '1143 Superior Ave E', city: 'Cleveland, OH', situation: 'Motivated seller', propertyType: 'Commercial',
  asking: 245000, arv: 340000, rehab: 60000, beds: null, baths: null, sqft: 4200, year: 1946, timeline: '1-2 months', daysAgo: 11,
  notes: 'Mixed-use — ground floor retail with two apartments above. Retail space vacant, apartments occupied month-to-month. Needs a new roof.' });

/* ---------- Andrew's shop items ---------- */
const S = o => {
  if (db.shopItems.find(x => x.title === o.title && x.sellerId === owner.id)) return;
  db.shopItems.push({
    id: crypto.randomUUID(), sellerId: owner.id, sellerName: owner.name,
    condition: 'Used — good', stock: 1, location: 'Hightstown, NJ', photos: [],
    active: true, demo: false, createdAt: ago(o.daysAgo ?? 2), ...o,
    price: Math.round(o.priceDollars * 100)
  });
};

S({ title: 'Sectional sofa, charcoal fabric', category: 'Other', priceDollars: 425, condition: 'Used — good', daysAgo: 1,
  description: 'Three-piece sectional with chaise. From a staged property, light use. Some minor wear on one armrest. Pickup only — bring help, it is heavy.' });

S({ title: 'Solid wood dining table + 6 chairs', category: 'Other', priceDollars: 380, condition: 'Used — good', daysAgo: 1,
  description: 'Oak table, seats six comfortably, extends to eight with the leaf. Chairs have matching wood frames with upholstered seats. A few surface scratches on the table top, nothing structural.' });

S({ title: 'Queen bed frame with upholstered headboard', category: 'Other', priceDollars: 210, condition: 'Like new', daysAgo: 2,
  description: 'Neutral beige upholstered headboard, sturdy wood slat base, no box spring needed. Disassembles for transport. Mattress not included.' });

S({ title: 'Whirlpool stainless refrigerator, 25 cu ft', category: 'Appliances', priceDollars: 540, condition: 'Like new', daysAgo: 3,
  description: 'French door with bottom freezer and ice maker. Pulled from a kitchen remodel where the owner went custom panel. Works perfectly, under two years old.' });

S({ title: 'GE electric range, stainless', category: 'Appliances', priceDollars: 275, condition: 'Used — good', daysAgo: 3,
  description: 'Smooth top, self-cleaning oven. Fully functional, cosmetic scuff on the lower drawer front.' });

S({ title: 'Kohler pedestal sink + Delta faucet', category: 'Plumbing', priceDollars: 95, condition: 'New in box', stock: 2, daysAgo: 4,
  description: 'Two available, both still boxed. Over-ordered on a bathroom job.' });

S({ title: 'Luxury vinyl plank flooring — 340 sq ft', category: 'Flooring', priceDollars: 320, condition: 'New in box', daysAgo: 5,
  description: 'Warm oak finish, 7mm with attached pad, waterproof core. Leftover from a full-house install. Sealed boxes, dye lot matched.' });

S({ title: 'Interior doors, six-panel white — set of 5', category: 'Doors & Windows', priceDollars: 180, condition: 'Used — good', daysAgo: 6,
  description: 'Standard 30 inch, pre-hung, hardware included. Pulled during a remodel, all straight and functional.' });

S({ title: 'Brushed nickel light fixtures — lot of 8', category: 'Lighting', priceDollars: 140, condition: 'Used — good', daysAgo: 7,
  description: 'Mix of flush mounts and a small chandelier. All tested and working, bulbs not included.' });

S({ title: 'Goodman 3-ton AC condenser', category: 'HVAC', priceDollars: 650, condition: 'Used — good', daysAgo: 9,
  description: 'Removed during a system upgrade to a higher SEER unit. Was cooling fine when pulled. Sold as-is, no warranty — have your HVAC tech look before buying.' });

/* ---------- a little organic-looking activity ---------- */
const demoListings = db.listings.filter(l => l.demo);
[[tom, 0], [tom, 2], [alina, 0], [alina, 4], [alina, 1]].forEach(([u, idx]) => {
  const l = demoListings[idx];
  if (!l) return;
  if (db.saves.find(s => s.userId === u.id && s.listingId === l.id)) return;
  db.saves.push({ id: crypto.randomUUID(), userId: u.id, userName: u.name, userEmail: u.email, listingId: l.id, at: ago(1), verified: false });
});
[[tom, marisol], [alina, marisol], [alina, priya], [tom, dwight]].forEach(([a, b]) => {
  if (db.follows.find(f => f.followerId === a.id && f.followingId === b.id)) return;
  db.follows.push({ followerId: a.id, followingId: b.id, at: ago(4) });
});

await saveDB(db);
console.log(`Seeded: ${db.users.length} users, ${db.listings.length} listings, ${db.shopItems.length} shop items.`);
console.log('\nYour account:  drewcbusiness1@gmail.com  /  changeme123');
console.log('Demo accounts: marisol@example.com etc.  /  demo1234');
console.log('\nChange your password after first login. Run `npm run seed:clear` to remove demo listings before launch.');
}

main().then(() => process.exit(0)).catch(e => { console.error('Seed failed:', e.message); process.exit(1); });
