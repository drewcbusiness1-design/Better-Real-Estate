'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'public', 'style.css'), 'utf8');
const store = fs.readFileSync(path.join(root, 'store.js'), 'utf8');
const ai = require('../ai');

// Deal import + distribution.
assert(server.includes("app.post('/api/dispo/parse'"), 'deal import endpoint missing');
assert(client.includes('Import existing deal'), 'deal import UI missing');
assert.strictEqual(typeof ai.generateDealImport, 'function', 'AI deal import helper missing');
assert(server.includes("app.get('/api/listings/:id/distribution'"), 'distribution endpoint missing');
['Facebook', 'Instagram', 'SMS', 'Buyer email', 'Deal flyer', 'Story card'].forEach(x => assert(client.includes(x), `distribution asset missing: ${x}`));
assert(client.includes('Post once → distribute everywhere'), 'distribution workflow label missing');

// Reverse marketplace and matching.
assert(server.includes("app.get('/api/buyers-looking'"), 'Buyers Looking endpoint missing');
assert(client.includes("['buyers','Buyers Looking']"), 'Buyers Looking network tab missing');
assert(server.includes('buyerMatchesForListing'), 'listing-to-buyer matching helper missing');
assert(server.includes("app.get('/api/listings/:id/matches'"), 'listing match endpoint missing');
assert(server.includes("app.post('/api/listings/:id/notify-matches'"), 'matched buyer notification endpoint missing');
assert(client.includes('Notify matching buyers'), 'match notification UI missing');
assert(client.includes('Show this buy box publicly in Network → Buyers Looking'), 'public buy box control missing');
assert(client.includes('Actively buying') && client.includes('Selective') && client.includes('Paused'), 'buying status controls missing');

// Buyer capture growth loop.
assert(store.includes("'buyerLeads'"), 'buyer lead collection missing');
assert(server.includes("app.get('/api/buyer-portal/:type/:id'"), 'buyer portal lookup missing');
assert(server.includes("app.post('/api/buyer-portal/:type/:id'"), 'buyer portal capture missing');
assert(server.includes("app.get('/api/buyer-leads'"), 'buyer lead management endpoint missing');
assert(client.includes('Join buyer list') && client.includes('Copy buyer-list link'), 'buyer list UI missing');
assert(client.includes('I want to share my contact information and buying criteria'), 'buyer lead consent missing');

// Freshness.
assert(server.includes('LISTING_CONFIRM_DAYS = 14'), 'listing confirmation window missing');
assert(server.includes("app.post('/api/listings/:id/confirm-active'"), 'confirm active endpoint missing');
assert(server.includes("app.post('/api/listings/:id/archive'"), 'archive listing endpoint missing');
assert(client.includes('Still available') && client.includes('Needs seller confirmation'), 'freshness UI missing');

// Saved minor pricing UI request: Platinum, Team, Pro, Free + blue Team treatment.
const planSection = client.slice(client.indexOf("class: 'tiergrid4'"), client.indexOf('if (companySeatAccess)', client.indexOf("class: 'tiergrid4'")));
const order = ["key: 'platinum'", "key: 'wholesale'", "key: 'pro'", "key: 'free'"].map(x => planSection.indexOf(x));
assert(order.every(x => x >= 0) && order.every((x, i) => i === 0 || x > order[i - 1]), 'plan order must be Platinum, Team, Pro, Free');
assert(css.includes('.tiercard.teamfeatured') && css.includes('#2563eb'), 'Wholesale Team blue outline missing');

console.log('✓ Better Dispo, buyer demand, distribution & freshness tests passed');
