'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
const client = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
const netlify = fs.readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const store = fs.readFileSync(path.join(root, 'store.js'), 'utf8');
const mailer = fs.readFileSync(path.join(root, 'mailer.js'), 'utf8');
const communications = require('../communications');

assert.strictEqual(communications.reminderDelayMinutes({ settings:{} }), 60, 'default unread reminder must be one hour');
assert.strictEqual(communications.reminderDelayMinutes({ settings:{ notifyOnMessage:false } }), 0, 'disabled unread reminders must not send');
assert.strictEqual(communications.reminderDelayMinutes({ settings:{ messageEmailDelayMinutes:15 } }), 15, 'custom reminder delay missing');
assert.strictEqual(communications.reminderDelayMinutes({ settings:{ messageEmailDelayMinutes:17 } }), 60, 'invalid reminder delay must normalize to default');

const db = { users:[
  {id:'a',role:'buyer',emailVerified:true,marketingOptIn:true,location:'Philadelphia, PA'},
  {id:'b',role:'seller',emailVerified:true,marketingOptIn:true,location:'Newark, NJ'},
  {id:'c',role:'buyer',emailVerified:false,marketingOptIn:true,location:'Philadelphia, PA'},
  {id:'d',role:'buyer',emailVerified:true,marketingOptIn:false,location:'Philadelphia, PA'},
  {id:'e',role:'buyer',emailVerified:true,marketingOptIn:true,marketingUnsubscribedAt:'x',location:'Philadelphia, PA'}
]};
assert.deepStrictEqual(communications.eligibleBroadcastUsers(db,{kind:'buyers',market:'Philadelphia'}).map(x=>x.id),['a'], 'broadcast audience must honor verification, opt-in, unsubscribe, role and market');

assert.ok(server.includes("app.get('/api/admin/email-center'"), 'admin email center API missing');
assert.ok(server.includes("app.post('/api/admin/email-center/broadcasts'"), 'broadcast API missing');
assert.ok(server.includes('await mailer.sendVerification(user.email, user.name, vtok)'), 'signup must await verification delivery');
assert.ok(client.includes('Unread-message email reminders'), 'unread reminder settings UI missing');
assert.ok(client.includes('1 hour (default)'), 'default reminder delay UI missing');
assert.ok(client.includes('Admin — Email Center') && client.includes('Compose broadcast'), 'admin email center UI missing');
assert.ok(store.includes("'emailBroadcasts'"), 'email broadcast storage missing');
assert.ok(mailer.includes('sendUnreadMessageReminder') && mailer.includes('sendAdminBroadcast') && mailer.includes('sendMailTest'), 'mailer communication templates missing');
assert.ok(netlify.includes('[functions."communications-cron"]') && netlify.includes('*/15 * * * *'), 'communications scheduler missing');
console.log('✓ Email verification diagnostics, broadcasts & unread reminders tests passed');
