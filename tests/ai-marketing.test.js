'use strict';
const assert = require('assert');
process.env.SESSION_SECRET = 'test-secret-long-enough-for-signatures';
const marketing = require('../marketing');
const ai = require('../ai');

const user = { id: 'user-123', name: 'Jordan' };
const token = marketing.signUser(user);
assert.strictEqual(marketing.verifyToken(token), user.id, 'marketing unsubscribe token should round-trip');
assert.strictEqual(marketing.verifyToken(token.slice(0, -2) + 'zz'), null, 'tampered unsubscribe token must fail');
assert.strictEqual(ai._safeImageUrl('javascript:alert(1)'), null, 'AI image input must reject non-image/non-https URLs');
assert.ok(ai._safeImageUrl('data:image/jpeg;base64,AAAA'), 'AI image input should accept image data URLs');
assert.strictEqual(ai._extractOutputText({ output:[{content:[{type:'output_text',text:'{"ok":true}'}]}] }), '{"ok":true}');
console.log('✓ AI + marketing helper tests passed');
