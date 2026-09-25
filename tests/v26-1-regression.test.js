const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const app = fs.readFileSync('public/app.js','utf8');
const server = fs.readFileSync('server.js','utf8');
const css = fs.readFileSync('public/style.css','utf8');

test('new authenticated views are actually wired into renderer', () => {
  assert.match(app, /dealbuilder:\s*renderDealBuilder/);
  assert.match(app, /buyercrm:\s*renderBuyerCrm/);
});
test('deal builder quota is server enforced by membership', () => {
  assert.match(server, /function dealBuilderAllowance/);
  assert.match(server, /limit:\s*5/);
  assert.match(server, /dealBuilderTrialUses/);
  assert.match(server, /isPlatinum\(user\).*isWholesale\(user\)/s);
  assert.match(server, /DEAL_BUILDER_LIMIT/);
});
test('failed property intelligence does not consume quota before success', () => {
  const route = server.slice(server.indexOf("app.post('/api/deal-builder/address'"), server.indexOf("app.get('/api/buyer-crm'"));
  assert.ok(route.indexOf('propertyIntel.analyze(address)') < route.indexOf('dealBuilderUsageCount=Number'));
});
test('leaderboard explains points and uses right aligned points', () => {
  assert.match(app, /100 points to the verified seller and 100 points to the verified buyer/);
  assert.match(app, /Bronze/); assert.match(app, /Silver/); assert.match(app, /Gold/);
  assert.match(css, /\.lbpts\{margin-left:auto/);
  assert.match(css, /\.lbrow \.t,\.lbrow \.s,\.lbpts\{font-family:inherit\}/);
});
