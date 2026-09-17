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

assert.ok(server.includes("app.get('/api/shop/items/:id'"), 'Missing marketplace product-detail route');
assert.ok(server.includes('function publicShopItem'), 'Marketplace responses must be sanitized');
assert.ok(server.includes('items: items.map(publicShopItem)'), 'Marketplace list must not expose supplier cost/internal CJ fields');
assert.ok(client.includes('shopitem: renderShopItem'), 'Client is missing the internal marketplace product page');
assert.ok(client.includes("'Calculate shipping'"), 'Product page must calculate live shipping without browser prompts');
assert.ok(client.includes("'Continue to payment'"), 'Product page must provide an integrated checkout action');


// Shop listing management: owners can manage only their own items; admins can
// manage everything. The client exposes the manager in Shop/Profile and uses
// edit/publish/unpublish/delete routes instead of requiring database changes.
for (const route of [
  "app.get('/api/shop/manage'",
  "app.get('/api/shop/manage/:id'",
  "app.patch('/api/shop/items/:id'",
  "app.delete('/api/shop/items/:id'"
]) assert.ok(server.includes(route), 'Missing shop-management route ' + route);
assert.ok(server.includes("isShopAdmin(user) || item.sellerId === user.id"), 'Shop-management authorization must be owner-or-admin');
assert.ok(server.includes("user.role === 'admin' && policy.isAdminEmail(user.email)"), 'Shop admin management must honor the admin email allowlist');
assert.ok(server.includes('item.deleted = true'), 'Shop deletion should preserve transaction history with a soft delete');
assert.ok(server.includes('policy.checkShopItem({ title, description, category }, false)'), 'Private-seller restrictions must be rechecked when editing');
assert.ok(client.includes('shopmanage: renderShopManage'), 'Client is missing the shop listing manager');
assert.ok(client.includes('shopedit: renderShopEdit'), 'Client is missing the shop listing editor');
assert.ok(client.includes("state.user?.role === 'admin' ? 'Manage shop listings' : 'My shop listings'"), 'Shop manager must be discoverable for admins and regular sellers');
assert.ok(!client.includes('if (placeholder) placeholder.remove()'), 'Global render error handler must not reference an undefined placeholder');

console.log('✓ CJ integration wiring tests passed');
