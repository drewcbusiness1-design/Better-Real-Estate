const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const social = fs.readFileSync(path.join(root, 'social.js'), 'utf8');
const store = fs.readFileSync(path.join(root, 'store.js'), 'utf8');
const payments = fs.readFileSync(path.join(root, 'payments.js'), 'utf8');

// Browser navigation / refresh persistence.
assert.ok(client.includes("window.addEventListener('popstate'"), 'Back/forward route restore missing');
assert.ok(client.includes('function routeUrl(') && client.includes('history.pushState'), 'SPA route history writing missing');
assert.ok(client.includes("if (state.view === 'profile') state.profileId = userId || null"), 'Profile deep-link id missing');
assert.ok(client.includes("if (state.view === 'chat') state.chatUserId = userId || null"), 'Chat deep-link id missing');
assert.ok(client.includes("if (state.view === 'shopitem') state.shopItemId = itemId || null"), 'Shop-item deep-link id missing');

// Account controls.
assert.ok(server.includes("app.post('/api/me/password'"), 'Password-change endpoint missing');
assert.ok(server.includes("app.delete('/api/me'"), 'Account-deletion endpoint missing');
assert.ok(server.includes('usernameTaken(req.db, clean, req.user.id)'), 'Unique username enforcement missing');
assert.ok(server.includes("normalizeUsername(u.username) === login"), 'Username login missing');
assert.ok(social.includes('username: u.username || null'), 'Public profile username missing');
assert.ok(client.includes('Permanently delete account'), 'Delete-account settings UI missing');
assert.ok(client.includes('Change password'), 'Password settings UI missing');

// Wholesale teams.
assert.ok(server.includes("wholesale: { monthly: 14900, annual: 150000"), 'Wholesale Teams pricing missing');
assert.ok(store.includes("'companies','companyInvites'"), 'Company collections missing');
assert.ok(server.includes("app.post('/api/company'"), 'Company creation endpoint missing');
assert.ok(server.includes("app.post('/api/company/invites'"), 'Company invite endpoint missing');
assert.ok(server.includes("app.post('/api/company/invites/accept'"), 'Company invite acceptance missing');
assert.ok(server.includes("app.get('/api/company/inbox'"), 'Shared company-listing inbox missing');
assert.ok(server.includes("app.get('/api/company/listings'"), 'Shared team listings missing');
assert.ok(server.includes("app.patch('/api/company/buyboxes'"), 'Shared company buy box missing');
assert.ok(client.includes('Company workspace') && client.includes('Shared acquisition box'), 'Company workspace UI missing');
assert.ok(client.includes('Personal direct messages stay private'), 'Team privacy distinction missing');
assert.ok(payments.includes('?view=upgrade&checkout=success'), 'Stripe return should preserve plans route');

console.log('✓ Account, route-state & wholesale-team wiring tests passed');
