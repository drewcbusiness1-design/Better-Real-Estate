const fs=require('fs'),assert=require('assert');
const app=fs.readFileSync('public/app.js','utf8'),server=fs.readFileSync('server.js','utf8'),store=fs.readFileSync('store.js','utf8'),css=fs.readFileSync('public/style.css','utf8'),storage=fs.readFileSync('storage.js','utf8');
const must=(src,t,label=t)=>assert(src.includes(t),label);
// User activity analytics and heartbeat
['activityEvents','/api/activity/heartbeat','/api/admin/activity','activeNow','uniqueActive','24h','7d','30d','/api/admin/user-inspector'].forEach(t=>must(server,t));
['User activity','Active now','User inspector'].forEach(t=>must(app,t));
// Markets + feed personalization + For You/Following + negative feedback
['investmentMarkets','/api/me/markets','listingState','/api/feed/feedback'].forEach(t=>must(server,t));
['For You','Following','Investment markets','Not interested'].forEach(t=>must(app,t));
// Liked means watched by default, independent notification toggle
must(server,'notifyChanges: true'); must(server,"/api/saves/:listingId/notifications"); must(server,'notifyListingWatchers');
['Liked properties','Notifications on','Notifications off'].forEach(t=>must(app,t));
// Saved searches and alerts
['savedSearches','/api/saved-searches','searchMatchesListing','New deal alert match'].forEach(t=>must(server,t));
['Saved searches & deal alerts','Save search + alert'].forEach(t=>must(app,t));
// Buy boxes expanded
['minArv','maxArv','minBeds','minBaths','rehabTolerance','states: cleanStates'].forEach(t=>must(server,t));
['Min ARV ($)','Minimum beds','Rehab tolerance','Advanced buy boxes'].forEach(t=>must(app,t));
// Pipeline, calendar, market hubs, dashboard, team ops
['pipelineDeals','dealCalendarEvents','/api/pipeline','/api/deal-calendar','/api/market-hubs','/api/dashboard','/api/team-operations'].forEach(t=>must(server,t));
['renderPipeline','renderDealCalendar','renderMarketHubs','renderCommandCenter','Shared deal operations'].forEach(t=>must(app,t));
// Deal rooms + secure document vault + structured offers
['/api/listings/:id/deal-room/messages','dealDocuments','/api/listings/:id/documents','/api/doc/:key','emd','inspectionDays','expiresAt'].forEach(t=>must(server,t));
['Deal conversation','Document vault','Earnest money ($)','Inspection days','Offer expires'].forEach(t=>must(app,t));
must(storage,'writeDocument');must(storage,'5 * 1024 * 1024');
// Search, credibility, seller analytics retained
must(server,"/api/search"); must(app,'renderUniversalSearch'); must(server,'credibility'); must(server,"/api/listings/:id/analytics");
// Tutorial is mandatory and updated for this release
must(app,'const TUTORIAL_VERSION = 40;');['Command center','Liked & watched properties','Universal search','Deal pipeline','Deal calendar','Market Hubs','Investment markets'].forEach(t=>must(app,t));must(app,'releaseOnly');must(app,'launchProductUpdateTutorial');must(app,'trial:1');must(app,"selector:'.buyercrmpage',min:0");
// Every new routed view has a renderer and styling hooks
['commandcenter','search','savedsearches','pipeline','dealcalendar','markethubs','dealroom'].forEach(v=>must(app,`'${v}'`));
['feedcommand','pipeline-board','dealroom-grid','market-grid','searchbar-pro','watchgrid','admin-activity'].forEach(c=>must(css,'.'+c));
// No unapproved external intelligence dependency
assert(!/rentcast/i.test(app+server+store+storage),'RentCast must not reappear');
console.log('✓ v27 operating network, tutorial and presentation wiring tests passed');
