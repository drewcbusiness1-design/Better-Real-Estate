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
  listing.photos = ['/uploads/private-address.png'];

  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = 'http://127.0.0.1:' + server.address().port;
  try {
    const home = await (await fetch(base)).text();
    assert.match(home, /<h1>Find off-market deals\. <em>Reach the right buyers\.<\/em><\/h1>/);
    assert.match(home, /href="\/\?view=preview&amp;intent=seller"/);
    assert.match(home, /href="\/\?view=preview&amp;intent=buyer"/);

    const response = await fetch(base + '/api/public/deal-preview/buyer');
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const { property } = await response.json();
    assert.deepEqual(property, {
      id: 'listing', market: 'Trenton, NJ', propertyType: 'Single family', asking: 200000, confirmedDaysAgo: 2
    });
    listing.sold = true;
    const fallback = await (await fetch(base + '/api/public/deal-preview/buyer')).json();
    assert.equal(fallback.property.id, 'older');
    assert.equal(fallback.property.market, null);
    listing.sold = false;

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
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
}

run().then(() => console.log('Public deal preview route assertions passed')).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
