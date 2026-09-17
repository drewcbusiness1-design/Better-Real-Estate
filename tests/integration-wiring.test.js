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
assert.ok(server.includes('function isAdminUser(user)'), 'Admin access needs a single allowlist-backed helper');
assert.ok(server.includes('return isAdminUser(user);'), 'Shop admin management must reuse the allowlist-backed admin helper');
assert.ok(server.includes('item.deleted = true'), 'Shop deletion should preserve transaction history with a soft delete');
assert.ok(server.includes('policy.checkShopItem({ title, description, category }, false)'), 'Private-seller restrictions must be rechecked when editing');
assert.ok(client.includes('shopmanage: renderShopManage'), 'Client is missing the shop listing manager');
assert.ok(client.includes('shopedit: renderShopEdit'), 'Client is missing the shop listing editor');
assert.ok(client.includes("state.user?.role === 'admin' ? 'Manage shop listings' : 'My shop listings'"), 'Shop manager must be discoverable for admins and regular sellers');
assert.ok(!client.includes('if (placeholder) placeholder.remove()'), 'Global render error handler must not reference an undefined placeholder');


// Customer-facing CJ privacy: CJ remains an admin-only integration detail.
// The public product/checkout/order APIs must strip CJ logistics identifiers,
// supplier names and raw image hosts from regular-user responses.
assert.ok(!client.includes("'Checking CJ shipping…'"), 'Customer checkout must not mention CJ while quoting shipping');
assert.ok(!client.includes('live CJ shipping price before payment'), 'Customer checkout copy must not mention CJ');
assert.ok(!client.includes("quote.logisticName || 'Shipping'"), 'Customer checkout must not render the supplier logistics method');
assert.ok(server.includes('function customerSafeSupplierText'), 'Public supplier text must be scrubbed before reaching customers');
assert.ok(server.includes('function publicShopPhotos'), 'Dropship images must be masked behind first-party product photo URLs');
assert.ok(server.includes("app.get('/api/shop/items/:id/photo/:index'"), 'Existing supplier-hosted product images need a first-party proxy');
assert.ok(server.includes('.map(publicShopOrder)'), 'Order history must use a customer-safe serializer');
assert.ok(server.includes('publicFulfilmentStatus(so)'), 'Buyer tracking must not expose the raw supplier-order object');
assert.ok(!server.includes("error: 'CJ shipping quotes are temporarily unavailable.'"), 'Customer shipping errors must not name CJ');
assert.ok(!server.includes("error: 'CJdropshipping is not connected right now.'"), 'Customer checkout errors must not name CJ');


// Checkout address autofill/autocomplete + legal/privacy disclosure.
for (const route of [
  "app.get('/api/address/config'",
  "app.post('/api/address/autocomplete'",
  "app.post('/api/address/details'"
]) assert.ok(server.includes(route), 'Missing address-autocomplete route ' + route);
assert.ok(server.includes("includedRegionCodes: ['us']"), 'Address suggestions should be restricted to the United States for current shipping support');
assert.ok(server.includes("'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY"), 'Google Places key must stay server-side');
assert.ok(!client.includes('GOOGLE_MAPS_API_KEY'), 'Google Maps API key name must not be referenced by browser code');
assert.ok(client.includes("autocomplete: 'shipping address-line1'"), 'Checkout street field must support browser saved-address autofill');
assert.ok(client.includes("'/api/address/autocomplete'"), 'Checkout must request typed address suggestions');
assert.ok(client.includes("'/api/address/details'"), 'Checkout must fill structured address fields after a suggestion is selected');
assert.ok(client.includes("'Google Maps'"), 'Google-provided suggestions must display Google Maps attribution');
assert.ok(env.includes('GOOGLE_MAPS_API_KEY='), '.env.example must document optional Google Places configuration');
assert.ok(client.includes('Google Maps Platform'), 'Terms/privacy must disclose Google Maps address autocomplete');
assert.ok(client.includes('Stripe processes card payments'), 'Privacy policy must disclose Stripe payment processing');
assert.ok(client.includes('shipping, supplier and fulfilment providers'), 'Privacy policy must disclose shipping/fulfilment sharing');

// CJ gallery editing: admins can curate imported images before publish, and
// customer-safe proxy URLs must round-trip through the editor without causing
// every remaining supplier image to be discarded on save.
assert.ok(client.includes('Photos from CJ — remove any you do not want to publish'), 'CJ review must allow photo curation before publish');
assert.ok(client.includes('description: desc.value.trim(),\n                photos'), 'CJ import must submit the curated photo list');
assert.ok(server.includes('const photoProxyPrefix = `/api/shop/items/${encodeURIComponent(item.id)}/photo/`;'), 'Shop edit must recognize first-party dropship photo proxies');
assert.ok(server.includes('const original = idx >= 0 ? (item.photos || [])[idx] : null;'), 'Shop edit must map retained proxy photos back to the stored image');
assert.ok(server.includes('const sourcePhotos = [...new Set([variant.image, product.image'), 'CJ import must build an allowlist of source product photos');
assert.ok(server.includes("error: 'One or more selected product photos are invalid.'"), 'CJ import must reject arbitrary remote photo injection');

console.log('✓ CJ integration wiring tests passed');

// v11 AI listing assistant + opt-in marketing automation.
for (const route of [
  "app.get('/api/ai/status'",
  "app.post('/api/ai/listing-copy'",
  "app.get('/api/email-preferences'",
  "app.patch('/api/email-preferences'",
  "app.get('/api/marketing/unsubscribe'",
  "app.post('/api/marketing/unsubscribe'"
]) assert.ok(server.includes(route), 'Missing v11 route ' + route);
assert.ok(server.includes("AI listing assistance is a Platinum feature."), 'Regular AI listing generation must be Platinum-gated');
assert.ok(server.includes("kind === 'cj' && !isAdmin"), 'CJ AI generation must remain admin-only');
assert.ok(client.includes('✨ Write listing with AI'), 'Platinum shop sellers need the AI listing button');
assert.ok(client.includes('✨ Draft property notes with AI'), 'Platinum property posts need AI drafting');
assert.ok(client.includes('AI listing cleanup'), 'CJ review must expose the AI cleanup state');
assert.ok(client.includes('setTimeout(() => runAi(true), 0)'), 'CJ review should automatically polish supplier copy when AI is configured');
assert.ok(client.includes('marketingOptIn: marketingOpt.checked'), 'Signup must send explicit marketing consent');
assert.ok(client.includes('Product & activity emails'), 'Settings must expose marketing preferences');
assert.ok(client.includes('AI-assisted listing tools'), 'Privacy/terms must disclose AI processing');
assert.ok(client.includes('Marketing email'), 'Privacy policy must disclose optional marketing email');
assert.ok(env.includes('OPENAI_API_KEY='), '.env.example must document OPENAI_API_KEY');
assert.ok(env.includes('MARKETING_EMAILS_ENABLED=false'), 'Marketing automation must default off until configured');
assert.ok(env.includes('MARKETING_POSTAL_ADDRESS='), 'Commercial email footer address must be configured');
assert.ok(toml.includes('[functions."marketing-cron"]'), 'Netlify scheduled marketing function must be configured');
assert.ok(toml.includes('schedule = "0 15 * * *"'), 'Marketing scheduler should run once daily and enforce 48h per-user eligibility');
assert.ok(server.includes('marketingConsentAt, marketingUnsubscribedAt, marketingLastSentAt, marketingSequence, aiUsageDay, aiUsageCount'), 'Marketing/AI usage metadata must not leak through public user serializers');
assert.ok(server.includes('const publicProfileUser = u => u ? ({'), 'Public profiles need a strict allowlist serializer');
assert.ok(server.includes('owner: publicProfileUser(owner)'), 'Public profile route must not reuse the private account serializer');
assert.ok(server.includes('{ ...publicProfileUser(owner), email: gated.locked ? null : owner.email, phone: gated.locked ? null : owner.phone }'), 'Listing detail should add contact info only through the unlock gate');
assert.ok(client.includes("'/api/users/' + encodeURIComponent(state.profileId) + '/listings'"), 'Profile screen must call the server route that actually exists');

// Permanent admin super-access: allowlisted admins get every paid platform
// feature without subscription expiry or usage quotas. Commerce purchases stay paid.
assert.ok(server.includes("if (isAdminUser(user)) return true;"), 'Admin must bypass Pro/Platinum expiry gates');
assert.ok(server.includes('if (isAdminUser(user)) return Number.MAX_SAFE_INTEGER;'), 'Admin buy boxes must be unlimited server-side');
assert.ok(server.includes('adminUnlimited: isAdminUser(user)'), 'Client access payload must explicitly identify unlimited admin access');
assert.ok(server.includes('if (!isAdmin) {'), 'AI usage quota must be skipped for admin');
assert.ok(server.includes('const adminIncluded = isAdminUser(req.user);'), 'Promotions must be included for admin without monthly limits');
assert.ok(client.includes('Admin — Unlimited access'), 'Plans screen must identify permanent admin access');
assert.ok(client.includes('Number.POSITIVE_INFINITY : state.access?.platinum ? 5 : 1'), 'Admin buy-box UI must not cap at Platinum five-box limit');
