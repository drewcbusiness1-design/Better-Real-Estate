const fs = require('fs');
const assert = require('assert');
const crypto = require('crypto');
const app = fs.readFileSync('public/app.js','utf8');
const css = fs.readFileSync('public/style.css','utf8');
const handoff = fs.readFileSync('HANDOFF-V29.md','utf8');

for (const token of [
  'function setButtonBusy(button, busy)',
  'async function withButtonBusy(button, work)',
  "button.classList.add('tap-ack')",
  "data-busy=\"true\"",
  "const optimistic = { id: 'pending-' + Date.now(), body, outgoing: true",
  "input.value = ''",
  "input.value = input.value.trim() ? body + '\\n' + input.value : body",
  "if (state.view !== 'chat' || !state.chatUserId || sendingMessage) return;",
  "release:49,title:'Responsive actions'",
  "release:49,title:'Mobile scrolling & messaging polish'",
  'const TUTORIAL_VERSION = 49;'
]) assert(app.includes(token) || css.includes(token), token);

for (const token of [
  'button:not(:disabled):active',
  'button.tap-ack',
  'button[data-busy="true"]::after',
  '.tutorialshade,.quick-shade,.founder-welcome-shade,.command-shade',
  '.tutorialcard,.quick-card,.founder-welcome-card,.command-palette,.admin-access-card,.form-modal',
  '-webkit-overflow-scrolling:touch',
  'touch-action:pan-y',
  'touch-action:pan-x',
  '.admin-access-actions',
  '.chatcomposer'
]) assert(css.includes(token), token);

for (const token of [
  'MOBILE SCROLLING + ACTION FEEDBACK',
  'successful send clears the composer immediately',
  'failed send restores the draft',
  'BRE- Logo.png',
  'Post Your First Property — Free',
  'phone verification is NOT required'
]) assert(handoff.includes(token), token);

const logo = fs.readFileSync('assets/BRE- Logo.png');
assert.equal(crypto.createHash('sha256').update(logo).digest('hex'), 'b5bcb06562541a21bde475d120831d7144f3a95f40e125e4b35bfb1b9921739b');
console.log('v29.15 mobile scrolling + responsive action regression passed');
