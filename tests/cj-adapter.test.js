'use strict';
const assert = require('assert');

process.env.CJ_API_KEY = 'test-cj-api-key-1234567890';

const calls = [];
global.fetch = async (url, options = {}) => {
  calls.push({ url: String(url), options });
  const json = (body) => ({ ok: true, status: 200, json: async () => body });

  if (String(url).endsWith('/authentication/getAccessToken')) {
    return json({ result: true, data: {
      accessToken: 'token-abc',
      refreshToken: 'refresh-abc',
      accessTokenExpiryDate: '2099-01-01T00:00:00Z'
    }});
  }
  if (String(url).includes('/product/listV2')) {
    return json({ result: true, data: {
      pageNumber: 1, pageSize: 16, totalRecords: 1, totalPages: 1,
      content: [{
        keyWord: 'faucet',
        productList: [{
          id: 'p1', sku: 'PSKU', nameEn: 'Test Faucet', bigImage: 'https://img/x.jpg',
          sellPrice: '8.50', threeCategoryName: 'Home', addMarkStatus: 1
        }]
      }]
    }});
  }
  if (String(url).endsWith('/logistic/freightCalculate')) {
    return json({ result: true, data: [
      { logisticName: 'Slow', logisticPrice: 2, taxesFee: 1, clearanceOperationFee: 0.5, logisticAging: '8-12' },
      { logisticName: 'Fast', totalPostageFee: 5.25, logisticPrice: 99, logisticAging: '4-7' }
    ]});
  }
  if (String(url).endsWith('/shopping/order/createOrderV2')) {
    return json({ result: true, data: { orderId: 'CJ-100', cjPayUrl: 'https://pay.example/cj', orderAmount: 15.25, postageAmount: 5.25, orderStatus: 'CREATED' } });
  }
  throw new Error('Unexpected fetch in test: ' + url);
};

const cj = require('../cj-adapter');

(async () => {
  const result = await cj.searchProducts({ query: 'faucet', countryCode: 'US' });
  assert.equal(result.total, 1);
  assert.equal(result.products[0].pid, 'p1');
  assert.equal(result.products[0].name, 'Test Faucet');

  const auth = calls[0];
  assert.ok(auth.url.endsWith('/authentication/getAccessToken'));
  assert.deepStrictEqual(JSON.parse(auth.options.body), { apiKey: process.env.CJ_API_KEY }, 'CJ auth must send API key only');
  const listCall = calls.find(c => c.url.includes('/product/listV2'));
  assert.equal(listCall.options.headers['CJ-Access-Token'], 'token-abc');
  assert.ok(listCall.url.includes('keyWord=faucet'));
  assert.ok(listCall.url.includes('countryCode=US'));
  assert.equal(result.products[0].categoryName, 'Home');
  assert.equal(result.products[0].freeShipping, true);


  const normalized = cj._normalizeVariant({
    vid: 'v-meta', pid: 'p-meta', variantSku: 'SKU-META', variantKey: 'Black-Large',
    variantImage: 'https://img/variant.jpg', variantSellPrice: 12.5, variantSugSellPrice: 24.99,
    variantWeight: 450, variantLength: 200, variantWidth: 100, variantHeight: 50,
    inventories: [{ countryCode: 'US', totalInventory: 8, verifiedWarehouse: 1 }]
  }, { pid: 'p-meta', productNameEn: 'Meta Product' });
  assert.equal(normalized.weight, 450);
  assert.equal(normalized.lengthMm, 200);
  assert.equal(normalized.widthMm, 100);
  assert.equal(normalized.heightMm, 50);
  assert.equal(normalized.stock, 8);
  assert.equal(normalized.fromCountryCode, 'US');

  const freight = await cj.freightOptions({ vid: 'v1', fromCountryCode: 'CN', toCountryCode: 'US', zip: '08520' });
  assert.equal(freight[0].logisticName, 'Slow');
  assert.equal(freight[0].price, 3.5, 'fallback freight must include taxes + clearance fees');
  assert.equal(freight[1].price, 5.25, 'totalPostageFee must be authoritative when present');

  const legacy = cj.normalizeShipping({ line1: '1 Main St', city: 'Hightstown', state: 'NJ 08520' });
  assert.equal(legacy.state, 'NJ');
  assert.equal(legacy.zip, '08520');

  const order = await cj.placeOrder({
    id: 'so1', orderId: 'o1', supplierSku: 'v1', cjFromCountryCode: 'CN', cjLogisticName: 'Slow',
    buyerName: 'Test Buyer', buyerEmail: 'buyer@example.com', qty: 1,
    shipping: { line1: '1 Main St', city: 'Hightstown', state: 'NJ', zip: '08520', country: 'United States', countryCode: 'US' }
  });
  assert.equal(order.cjOrderId, 'CJ-100');
  assert.equal(order.cjPayUrl, 'https://pay.example/cj');
  const createCall = calls.find(c => c.url.endsWith('/shopping/order/createOrderV2'));
  const payload = JSON.parse(createCall.options.body);
  assert.equal(payload.payType, 1);
  assert.equal(payload.logisticName, 'Slow');
  assert.equal(payload.products[0].vid, 'v1');
  assert.equal(payload.shippingZip, '08520');
  assert.ok(!Object.prototype.hasOwnProperty.call(payload, 'platform'), 'Do not send undocumented/fragile platform override');

  console.log('✓ CJ adapter tests passed');
})().catch(err => { console.error(err); process.exit(1); });
