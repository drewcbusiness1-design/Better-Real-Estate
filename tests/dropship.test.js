'use strict';
const assert = require('assert');
const dropship = require('../dropship');

const supplier = { id: 's1', name: 'CJ', kind: 'cj', markupPercent: 50, shipDays: '5-10' };
const priced = dropship.priceItem({ title: 'Test Faucet', cost: 10, shipping: 0, sku: 'v1', stock: 7 }, supplier);
assert.equal(priced.costCents, 1000);
assert.ok(priced.retailCents > priced.costCents);

const routed = dropship.routeOrder({
  order: { id: 'o1', price: 1850, shippingCostCents: 350, cjLogisticName: 'CJPacket', cjQuotedDays: '6-10' },
  item: { supplierSku: 'v1', cjVid: 'v1', cjPid: 'p1', cjFromCountryCode: 'CN', title: 'Test Faucet', cost: 1000, price: 1500 },
  supplier,
  buyer: { name: 'Buyer', email: 'buyer@example.com' },
  shipping: { line1: '1 Main St', city: 'Hightstown', state: 'NJ', zip: '08520' },
  crypto: { randomUUID: () => 'so1' }
});
assert.equal(routed.productCostCents, 1000);
assert.equal(routed.shippingCostCents, 350);
assert.equal(routed.costCents, 1350);
assert.equal(routed.chargedCents, 1850);
assert.equal(routed.cjLogisticName, 'CJPacket');
assert.equal(routed.cjVid, 'v1');
console.log('✓ Dropship routing tests passed');
