'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const toml = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const env = fs.readFileSync(path.join(root, '.env.example'), 'utf8');

for (const route of [
  '/api/admin/cj/products',
  '/api/admin/cj/import',
  '/api/shop/shipping-quote',
  '/api/admin/supplier-orders/:id/send-to-cj',
  '/api/admin/supplier-orders/:id/check-cj-status'
]) assert.ok(server.includes(route), 'Missing server route ' + route);

for (const endpoint of ['/api/admin/cj/products', '/api/admin/cj/import', '/api/shop/shipping-quote']) {
  assert.ok(client.includes(endpoint), 'Client is not wired to ' + endpoint);
}
assert.ok(toml.includes('cj-adapter.js'), 'Netlify function bundle must include cj-adapter.js');
assert.ok(env.includes('CJ_API_KEY='), '.env.example must document CJ_API_KEY');
assert.ok(!env.includes('CJ_EMAIL='), 'CJ_EMAIL is obsolete and should not be required');
console.log('✓ CJ integration wiring tests passed');
