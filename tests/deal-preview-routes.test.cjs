'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { app, getDB } = require('./connected-fixture');

async function run() {
  const db = getDB();
  const listing = db.listings[0];
  listing.createdAt = new Date(Date.now() - 2 * 86400000).toISOString();
  listing.lastConfirmedAt = listing.createdAt;
  const buyer = db.users.find(user => user.id === 'buyer');
  buyer.verified = true;
  buyer.buyBoxes.push(
    { active: false, public: true, cities: ['Inactive box'], maxPrice: 350000 },
    { public: false, cities: ['Private box'], maxPrice: 400000 }
  );
  db.users.push({ id: 'demo-preview', demo: true, verified: true, buyBoxes: [{ public: true, cities: ['Demo market'] }] });
  for (const [id, changes] of Object.entries({
    expired: { expiresAt: '2000-01-01' },
    archived: { availabilityStatus: 'archived' },
    sold: { sold: true },
    closed: { closedVerified: true },
    demo: { demo: true },
    'demo-owner': { ownerId: 'demo-preview' },
    'missing-owner': { ownerId: 'deleted-user' },
    older: { city: '97 Private Street, NJ', createdAt: new Date(Date.now() - 9 * 86400000).toISOString(), lastConfirmedAt: new Date().toISOString() }
  })) db.listings.push({ ...listing, id, ...changes });
  listing.city = 'Trenton, nj 08608';
  const cover = '/api/img/15f33dcc-031b-4655-abf0-f6ab3b8e8dc0.jpg';
  listing.photos = [cover, '/api/img/bced9768-e9da-47cf-9fd9-2848d981466d.png'];

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await (await fetch(base)).text();
    assert.match(home, /<h1>Find off-market deals\. <em>Reach the right buyers\.<\/em><\/h1>/);
    assert.match(home, /href="\/\?view=auth&amp;mode=signup" data-home-signup/);
    assert.doesNotMatch(home, /view=try|data-deal-intent|href="\/\?view=preview/);

    const response = await fetch(base + '/api/public/deal-preview/buyer');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { property } = await response.json();
    assert.deepEqual(property, {
      id: 'listing', market: 'Trenton, NJ', propertyType: 'Single family', asking: 200000, photo: cover, confirmedDaysAgo: 2
    });
    listing.sold = true;
    const fallback = await (await fetch(base + '/api/public/deal-preview/buyer')).json();
    assert.equal(fallback.property.id, 'older');
    assert.equal(fallback.property.market, null);
    listing.sold = false;

    for (const unsafe of ['https://example.test/house.jpg','/api/doc/notes.jpg','//example.test/house.jpg','/uploads/private-address.png']) {
      listing.photos = [unsafe, cover];
      const deniedPhoto = await (await fetch(base + '/api/public/deal-preview/buyer')).json();
      assert.equal(deniedPhoto.property.photo, null);
    }
    listing.photos = [];

    const sellerResponse = await fetch(base + '/api/public/deal-preview/seller');
    assert.equal(sellerResponse.status, 200);
    assert.equal(sellerResponse.headers.get('cache-control'), 'no-store');
    assert.deepEqual(await sellerResponse.json(), {
      buyBoxes: [{ markets: ['Trenton', 'NJ'], types: [], minPrice: null, maxPrice: 250000, verified: true }]
    });

    assert.equal((await fetch(base + '/api/public/deal-preview/private')).status, 404);
    assert.equal((await fetch(base + '/api/buyers-looking')).status, 401);
    assert.equal((await fetch(base + '/api/listings/listing')).status, 401);
    assert.equal(db.browsingUsage.length, 0);
    assert.equal(db.views.length, 0);

    const sampleAccounts = [
      { id: 'admin-only', role: 'admin', emailVerified: true },
      { id: 'demo-only', role: 'buyer', emailVerified: true, demo: true },
      { id: 'pending-only', role: 'buyer', emailVerified: false }
    ];
    for (const [count, members, milestone] of [[0, 0, false], [9, 9, false], [10, 10, true], [78, 70, true], [99, 90, true], [100, 100, true], [984, 900, true], [1234, 1000, true]]) {
      db.users = [...Array.from({ length: count }, (_, index) => ({
        ...sampleAccounts[index % sampleAccounts.length], id: 'signup-' + index
      }))];
      const response = await fetch(base + '/api/public/member-milestone');
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { members, milestone });
    }

  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

run().then(() => console.log('Public deal preview route assertions passed')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
