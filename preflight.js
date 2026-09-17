#!/usr/bin/env node
/* =========================================================================
   preflight.js — run before you go live.
       npm run preflight
   Checks configuration and flags anything that will break or expose you.
   ========================================================================= */
const fs = require('fs');
const path = require('path');

let fail = 0, warn = 0;
const ok   = m => console.log('  \x1b[32m✓\x1b[0m ' + m);
const bad  = m => { fail++; console.log('  \x1b[31m✗\x1b[0m ' + m); };
const soft = m => { warn++; console.log('  \x1b[33m!\x1b[0m ' + m); };
const head = m => console.log('\n\x1b[1m' + m + '\x1b[0m');

head('Database');
const conn = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;
if (!conn) bad('No database connected. Add a DATABASE_URL environment variable (e.g. a free Neon.tech Postgres connection string) in Site configuration → Environment variables, then redeploy. (On Netlify itself, signup and login now fail with a clear error instead of crashing until this is done — but nothing will actually save until it is.)');
else if (!/^postgres(ql)?:\/\//.test(conn)) bad('Connection string is not a Postgres URL.');
else ok('Postgres connection string present.');
if (fs.existsSync(path.join(__dirname, 'db.json'))) soft('A leftover db.json exists. It is no longer used — delete it so nobody edits the wrong thing.');

head('Sessions');
const secret = process.env.SESSION_SECRET;
if (!secret) bad('SESSION_SECRET is not set. Sessions are signed with a public default — anyone can forge a login.');
else if (secret.length < 24) bad('SESSION_SECRET is too short. Use 32+ random characters.');
else if (/change|secret|test|default|keyline/i.test(secret)) bad('SESSION_SECRET looks like a placeholder. Generate a real one.');
else ok('SESSION_SECRET set and looks random.');

head('Email');
if (!process.env.RESEND_API_KEY) bad('RESEND_API_KEY not set. Password resets and email confirmation will not send.');
else ok('Resend API key present.');
const from = process.env.MAIL_FROM || '';
if (!from) soft('MAIL_FROM not set — will fall back to Resend\'s sandbox sender, fine for testing only.');
else if (/@gmail\.com|@yahoo\.|@outlook\.|@hotmail\./i.test(from)) bad('MAIL_FROM uses a free mailbox domain. Gmail\'s DMARC policy will cause rejections — send from your own verified domain and set MAIL_REPLY_TO to your Gmail.');
else ok('MAIL_FROM uses a custom domain.');

head('Payments');
if (!process.env.STRIPE_SECRET_KEY) soft('STRIPE_SECRET_KEY not set — purchases run in simulated mode. Fine until you charge real money.');
else {
  ok('Stripe key present.');
  if (/^sk_test_/.test(process.env.STRIPE_SECRET_KEY)) soft('Using a Stripe TEST key. Swap for the live key when you launch.');
  if (!process.env.STRIPE_WEBHOOK_SECRET) bad('STRIPE_WEBHOOK_SECRET missing. Without webhook verification, anyone can call your endpoints and get paid features for free.');
}

head('CJdropshipping');
if (!process.env.CJ_API_KEY) soft('CJ_API_KEY not set — CJ catalog browsing, live freight quotes and order creation will stay disabled.');
else if (String(process.env.CJ_API_KEY).trim().length < 20) bad('CJ_API_KEY looks too short to be a real CJ API key.');
else ok('CJ API key present (server-side only).');

head('App');
if (!process.env.APP_URL) bad('APP_URL not set. Confirmation and reset links in emails will point at localhost.');
else if (!/^https:\/\//.test(process.env.APP_URL) && !/localhost/.test(process.env.APP_URL)) bad('APP_URL is not https. Sessions and payment tokens must not cross plain HTTP.');
else ok('APP_URL set.');

head('Admin access');
const admins = String(process.env.ADMIN_EMAILS || '').split(',').map(s => s.trim()).filter(Boolean);
if (!admins.length) bad('ADMIN_EMAILS is not set. Nobody can reach the admin panel, supplier tools or fulfilment queue. Set it to your email address.');
else {
  ok(`Admin allowlist set: ${admins.join(', ')}`);
  if (admins.length > 1) soft(`${admins.length} addresses have admin. Keep this list as short as possible.`);
}
const policySrc = fs.readFileSync(path.join(__dirname, 'policy.js'), 'utf8');
if (/SIGNUP_ROLES = \['buyer', 'seller'\]/.test(policySrc)) ok('Admin cannot be selected at signup.');
else bad('SIGNUP_ROLES in policy.js has been changed — make sure \'admin\' is not selectable at signup.');

head('Marketplace policy');
if (/USER_BANNED_CATEGORIES = \['Appliances', 'Electrical', 'HVAC'\]/.test(policySrc)) ok('Electronics ban is active for user listings.');
else soft('USER_BANNED_CATEGORIES has been modified — confirm that was deliberate.');

head('Content');
console.log('  Manual checks — nothing here can verify these for you:');
console.log('   • Run `npm run seed:clear` so no fabricated listings are live.');
console.log('   • Post real listings so the feed is not empty.');
console.log('   • Change the seeded password on drewcbusiness1@gmail.com.');
console.log('   • Have Terms and Privacy reviewed before taking payments.');
console.log('   • Confirm UL/ETL certification on every electrical item you dropship.');

console.log('\n' + '─'.repeat(52));
if (fail) console.log(`\x1b[31m${fail} blocking issue(s)\x1b[0m` + (warn ? `, ${warn} warning(s)` : ''));
else if (warn) console.log(`\x1b[33mNo blockers, ${warn} warning(s).\x1b[0m`);
else console.log('\x1b[32mAll checks passed.\x1b[0m');
console.log('─'.repeat(52) + '\n');
process.exit(fail ? 1 : 0);
