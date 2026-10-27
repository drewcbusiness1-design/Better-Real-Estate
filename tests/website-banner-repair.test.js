const assert = require('node:assert/strict');
const { register } = require('../websiteBanner');
const routes = {};
const app = { get: (path, auth, fn) => routes['GET ' + path] = fn, post: (path, auth, fn) => routes['POST ' + path] = fn };
let saved = null;
register(app, { requireAuth() {}, saveDB: async db => { saved = JSON.parse(JSON.stringify(db)); }, writeImage: async () => '/api/img/test.jpg', isAdminUser: () => false });
const owner = { id: 'owner', role: 'buyer' }, other = { id: 'other', role: 'buyer' };
const db = { users: [owner, other] };
function response() { return { statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } }; }
(async () => {
 let res = response(); await routes['POST /api/me/banner']({ user: owner, db, body: { imageData: 'data:image/jpeg;base64,YWJj' } }, res);
 assert.equal(res.body.bannerUrl, '/api/img/test.jpg'); assert.equal(saved.users[0].bannerUrl, '/api/img/test.jpg');
 res = response(); routes['GET /api/users/:id/banner']({ user: other, db: saved, params: { id: 'owner' } }, res); assert.equal(res.body.bannerUrl, '/api/img/test.jpg');
 res = response(); await routes['POST /api/me/banner']({ user: other, db, body: { imageData: 'data:text/html;base64,YWJj' } }, res); assert.equal(res.statusCode, 400); assert.equal(owner.bannerUrl, '/api/img/test.jpg');
 res = response(); await routes['POST /api/me/banner']({ user: owner, db, body: { reset: true } }, res); assert.equal(saved.users[0].bannerUrl, null);
 console.log('PASS banner save, persisted read, validation and removal');
})().catch(e => { console.error(e); process.exitCode = 1; });
