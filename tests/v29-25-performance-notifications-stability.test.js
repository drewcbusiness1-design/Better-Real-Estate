const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'),server=fs.readFileSync('server.js','utf8'),store=fs.readFileSync('store.js','utf8'),css=fs.readFileSync('public/style.css','utf8');

// Root-cause performance: no 50-table cold-start DDL loop, one read round-trip, dirty writes only.
assert(store.includes("SELECT tablename FROM pg_tables WHERE schemaname = 'public'"),'DB init should discover schema instead of sequentially recreating every table');
assert(store.includes("join(' UNION ALL ')"),'loadDB should read collections in one database round trip');
assert(store.includes('db.__snapshotData'),'loadDB/saveDB should track row content snapshots');
assert(store.includes('if (beforeData.get(id) === serialized) continue;'),'saveDB should not rewrite unchanged rows');
assert(!server.match(/requireAuth[\s\S]{0,900}lastActiveAt\s*=\s*new Date/),'regular authenticated requests must not become activity writes');
assert(server.includes("app.post('/api/activity/heartbeat'")&&server.includes('req.user.lastActiveAt=nowIso'),'heartbeat owns activity timestamp writes');
assert(app.includes('heartbeatInFlight')&&app.includes("controller.abort(),8000"),'heartbeat must not overlap or hang indefinitely in the browser');

// Notification hierarchy reuses one aggregate source and existing orange badge language.
assert(server.includes("app.get('/api/notification-summary'"),'notification summary endpoint missing');
for(const key of ['messages','network','savedsearches','affiliate','reports']) assert(server.includes(key),`notification destination ${key} missing`);
assert(app.includes('notificationSummary')&&app.includes("notificationCountFor(v)"),'profile child notification routing missing');
assert(app.includes("v === 'me'")&&app.includes('tab-msgbadge'),'Profile aggregate badge missing');
assert(css.includes('.profile-row-badge')&&css.includes('.tab-msgbadge'),'notification badge positioning polish missing');

// Founder deletion/rank reconciliation.
assert(server.includes('voidedAt')&&server.includes('voidedEmailLower')&&server.includes('formerUserId'),'Founder deletion tombstone missing');
assert(server.includes('activeAwards.sort')&&server.includes('user.founderLaunchPosition = position'),'Founder ranks must compact after deleted accounts');
assert(server.includes(".sort((a,b)=>{const ta=new Date(a.createdAt||0).getTime(),tb=new Date(b.createdAt||0).getTime();return tb-ta"),'User Inspector must default newest-first');

// Requested UX cleanup.
assert(!app.includes('function downloadProfileCard')&&!app.toLowerCase().includes('shareable profile card'),'Shareable Profile Card feature must be removed');
assert(app.includes("await api('POST',`/api/admin/demo-accounts/${pvUser.value}/enter`)"),'Start Preview must enter the demo immediately');
assert(app.includes("['approved','Approve'],['denied','Deny']"),'Pending affiliate actions should be Approve / Deny');
assert(app.includes("['suspended','Suspend'],['revoked','Terminate']"),'Approved affiliate actions should be Suspend / Terminate');
assert(css.includes('.profile-action-equal')&&css.includes('.lockoverlay>a{margin-bottom:10px'),'profile button sizing / unlock spacing cleanup missing');
assert(css.includes('.route-loading')&&css.includes('.loading-wheel'),'route loading feedback missing');
assert(css.includes('.networkloading::before')&&css.includes('.settings-inline-loading::before'),'localized loading wheels missing');
console.log('v29.25 performance root-cause + notifications + stability regression: PASS');
