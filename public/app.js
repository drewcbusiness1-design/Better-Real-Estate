let state = {
  view: 'home', user: null, authMode: 'signup', pricing: null, access: null,
  detailId: null, profileId: null, photoIdx: 0, composePhotos: [], shopPhotos: [],
  shopCat: 'All', shopQ: '', shopItemId: null, shopEditId: null, shopEditPhotos: [], shopManageQ: '',
  networkTab: 'discover', networkQ: '', networkRole: 'all', chatUserId: null, unreadCount: 0, friendRequestCount: 0,
  companyId: null, companyInviteToken: null, buyerPortalType: null, buyerPortalId: null,
  pendingReferral: null, leaderboardPeriod: 'all', postAuthTarget: null, feedMode: 'for-you', searchQ: ''
};

const el = (tag, attrs = {}, children = []) => {
  const e = document.createElement(tag);
  for (const k in attrs) {
    if (k === 'class') e.className = attrs[k];
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), attrs[k]);
    else if (attrs[k] !== null && attrs[k] !== undefined) e.setAttribute(k, attrs[k]);
  }
  (Array.isArray(children) ? children : [children]).forEach(c => {
    if (typeof c === 'string' || typeof c === 'number') e.appendChild(document.createTextNode(String(c)));
    else if (c) e.appendChild(c);
  });
  return e;
 };

function iconSvg(name, size = 20) {
  const paths = {
    home:'<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V21h14V9.5"/><path d="M9 21v-7h6v7"/>',
    shop:'<path d="M4 7h16l-1 14H5L4 7Z"/><path d="M8 7a4 4 0 0 1 8 0"/>',
    plus:'<path d="M12 5v14M5 12h14"/>',
    network:'<circle cx="9" cy="8" r="3"/><path d="M3 20c.5-4 2.5-6 6-6s5.5 2 6 6"/><circle cx="18" cy="9" r="2"/><path d="M16 15c3 0 4.5 1.5 5 4"/>',
    user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c.7-5 3.3-7 8-7s7.3 2 8 7"/>',
    mail:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m4 7 8 6 8-6"/>',
    bolt:'<path d="m13 2-8 12h7l-1 8 8-12h-7l1-8Z"/>',
    wallet:'<path d="M3 6h15a3 3 0 0 1 3 3v10H5a2 2 0 0 1-2-2V6Z"/><path d="M3 6a3 3 0 0 1 3-3h11v3"/><path d="M16 12h5v4h-5a2 2 0 1 1 0-4Z"/>',
    moon:'<path d="M20 15.5A8.5 8.5 0 0 1 8.5 4 8.5 8.5 0 1 0 20 15.5Z"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
    search:'<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
  };
  const span = el('span', { class:'svgicon', 'aria-hidden':'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.home}</svg>`;
  return span;
}
function membershipBadge(label) { return label ? el('span', { class:'membershiplevel ' + String(label).toLowerCase().replace(/[^a-z]+/g,'-') }, label) : null; }

async function api(method, path, body) {
  const res = await fetch(path, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}


/* ================= toasts ================= */
function toast(msg, kind = '') {
  let wrap = document.getElementById('toastwrap');
  if (!wrap) { wrap = el('div', { id: 'toastwrap' }); document.body.appendChild(wrap); }
  const t = el('div', { class: 'toast ' + kind }, msg);
  wrap.appendChild(t);
  setTimeout(() => { t.classList.add('leaving'); setTimeout(() => t.remove(), 260); }, kind === 'err' ? 5200 : 3200);
}

/* ================= skeleton placeholders ================= */
function skeletonFeed(n = 3) {
  const wrap = el('div');
  for (let i = 0; i < n; i++) {
    wrap.appendChild(el('div', { class: 'skelcard' }, [
      el('div', { class: 'skel sk-img' }),
      el('div', { class: 'skel sk-line', style: 'width:55%' }),
      el('div', { class: 'skel sk-line', style: 'width:35%' }),
      el('div', { class: 'skel sk-line', style: 'width:75%;margin-bottom:16px' })
    ]));
  }
  return wrap;
}

/* haptic-ish tap feedback where supported */
const buzz = (ms = 8) => { try { navigator.vibrate && navigator.vibrate(ms); } catch {} };

const money = n => '$' + Number(n).toLocaleString();
const cents = c => '$' + (c / 100).toFixed(2).replace(/\.00$/, '');
const initials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const applyTheme = t => document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');

const ROUTED_VIEWS = new Set(['home','auth','feed','detail','shop','shopitem','sellitem','shopmanage','shopedit','orders','settings','me','profile','saved','messages','chat','network','workspace','upgrade','compose','buybox','promote','analytics','wallet','offers','boostpicker','companyworkspace','company','companyjoin','buyerportal','leaderboard','insights','admin','emailcenter','memberships','suppliers','fulfilment','reports','dealbuilder','buyercrm','commandcenter','search','savedsearches','pipeline','dealcalendar','markethubs','dealroom','transactionhub','affiliate','intake','about','terms','privacy','contact','faq','forgot']);
function applyRouteParams(params) {
  const requested = params.get('view');
  if (requested && ROUTED_VIEWS.has(requested)) state.view = requested;
  const id = params.get('id');
  const userId = params.get('user');
  const itemId = params.get('item');
  if (['detail','promote','analytics','dealroom'].includes(state.view)) state.detailId = id || null;
  if (state.view === 'profile') state.profileId = userId || null;
  if (state.view === 'chat') state.chatUserId = userId || null;
  if (state.view === 'shopitem') state.shopItemId = itemId || null;
  if (state.view === 'shopedit') state.shopEditId = itemId || null;
  if (state.view === 'company') state.companyId = params.get('company') || null;
  if (state.view === 'network') state.networkTab = params.get('tab') || 'discover';
  if (state.view === 'buyerportal') { state.buyerPortalType = params.get('type') || null; state.buyerPortalId = params.get('target') || null; }
  if (params.get('invite')) state.companyInviteToken = params.get('invite');
  if (state.view === 'intake') state.intakeCode = params.get('code') || null;
  return requested;
}
function routeUrl(view = state.view) {
  const p = new URLSearchParams();
  if (view && view !== (state.user ? 'feed' : 'home')) p.set('view', view);
  if (['detail','promote','analytics','dealroom'].includes(view) && state.detailId) p.set('id', state.detailId);
  if (view === 'profile' && state.profileId) p.set('user', state.profileId);
  if (view === 'intake' && state.intakeCode) p.set('code', state.intakeCode);
  if (view === 'chat' && state.chatUserId) p.set('user', state.chatUserId);
  if (view === 'shopitem' && state.shopItemId) p.set('item', state.shopItemId);
  if (view === 'shopedit' && state.shopEditId) p.set('item', state.shopEditId);
  if (view === 'company' && state.companyId) p.set('company', state.companyId);
  if (view === 'network' && state.networkTab && state.networkTab !== 'discover') p.set('tab', state.networkTab);
  if (view === 'buyerportal' && state.buyerPortalType && state.buyerPortalId) { p.set('type', state.buyerPortalType); p.set('target', state.buyerPortalId); }
  if ((view === 'companyjoin' || view === 'auth') && state.companyInviteToken) p.set('invite', state.companyInviteToken);
  const q = p.toString();
  return location.pathname + (q ? '?' + q : '');
}
function writeRoute(mode = 'push') {
  const url = routeUrl();
  const current = location.pathname + location.search;
  if (mode === 'replace') history.replaceState({ bre: true }, '', url);
  else if (url !== current) history.pushState({ bre: true }, '', url);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const incomingRef = String(params.get('ref') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  const incomingAff = String(params.get('aff') || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0,24);
  if(incomingAff){ state.pendingAffiliate=incomingAff; try{localStorage.setItem('bre_affiliate_code',incomingAff);}catch{} try{await api('GET','/api/affiliate/track/'+encodeURIComponent(incomingAff));}catch{} } else { try{state.pendingAffiliate=localStorage.getItem('bre_affiliate_code')||null;}catch{} }
  if (incomingRef) {
    state.pendingReferral = incomingRef;
    try { localStorage.setItem('bre_referral_code', incomingRef); } catch {}
  } else {
    try { state.pendingReferral = localStorage.getItem('bre_referral_code') || null; } catch {}
  }
  state.verifyToken = params.get('verify');
  state.resetToken = params.get('reset');
  const checkoutResult = params.get('checkout');
  const requestedView = applyRouteParams(params);
  try {
    const d = await api('GET', '/api/me');
    state.user = d.user; state.pricing = d.pricing; state.access = d.access;
  } catch {}
  if (!state.pricing) { try { state.pricing = (await api('GET', '/api/pricing')).pricing; } catch {} }
  try {
    const pc = await api('GET', '/api/payments/config');
    if (pc.enabled && pc.publishableKey && window.Stripe) state.stripe = window.Stripe(pc.publishableKey);
  } catch {}
  applyTheme(state.user?.settings?.theme || localStorage.getItem('bre_theme') || 'light');
  if (checkoutResult) {
    // Returning from Stripe's own checkout page. Clean the confusing
    // query string off the URL either way, and if it succeeded, give the
    // webhook a moment to land before refreshing — Stripe redirects the
    // browser back slightly before the webhook always arrives.
    const cleaned = new URLSearchParams(location.search);
    cleaned.delete('checkout');
    history.replaceState({ bre: true }, '', location.pathname + (cleaned.toString() ? '?' + cleaned.toString() : ''));
    if (checkoutResult === 'success') {
      setTimeout(async () => { await refreshMe(); toast('Your plan is active — thanks!', 'ok'); render(); }, 1800);
    }
  }
  if (state.verifyToken) state.view = 'verify';
  else if (state.resetToken) state.view = 'reset';
  else if (state.companyInviteToken && state.user) state.view = 'companyjoin';
  else if (state.user) state.view = requestedView && ROUTED_VIEWS.has(requestedView) && !['home','auth'].includes(requestedView) ? requestedView : 'feed';
  else if (state.companyInviteToken) { state.view = 'auth'; state.authMode = 'signup'; }
  else {
    const publicWithoutAccount = new Set(['home','auth','about','terms','privacy','contact','faq','forgot','buyerportal','affiliate']);
    if (requestedView && ROUTED_VIEWS.has(requestedView) && !publicWithoutAccount.has(requestedView)) {
      state.postAuthTarget = {
        view: requestedView,
        detailId: state.detailId,
        profileId: state.profileId,
        companyId: state.companyId,
        shopItemId: state.shopItemId,
        networkTab: state.networkTab
      };
      state.view = 'auth';
      state.authMode = 'signup';
    } else state.view = requestedView && ROUTED_VIEWS.has(requestedView) ? requestedView : 'home';
  }
  if (state.user) { await refreshUnread(); const prior=Number(state.user.settings?.tutorialHighestRank??-1), now=TUTORIAL_RANK[tutorialTier()]??0; if(prior>=0 && now>prior) state.launchNewFeatureTutorial=true; const completed=Number(state.user.settings?.tutorialCompletedVersion||0); if(completed>=28 && completed<TUTORIAL_VERSION) state.launchProductUpdateTutorial=true; const dp=state.user?.demoPreview?.type; if(state.user?.demo&&dp&&!sessionStorage.getItem('bre-demo-preview:'+dp)){sessionStorage.setItem('bre-demo-preview:'+dp,'1');if(dp==='onboarding')state.launchTutorialAfterNav=true;if(dp==='whatsnew')state.launchProductUpdateTutorial=true;} }
  if (!state.verifyToken && !state.resetToken) writeRoute('replace');
  render();
  if (state.user) api('POST','/api/activity/heartbeat').catch(()=>{}); setInterval(()=>{ if(state.user) api('POST','/api/activity/heartbeat').catch(()=>{}); },60000);
}
async function refreshMe() {
  try { const before=state.user ? (TUTORIAL_RANK[tutorialTier()]??0) : -1; const d = await api('GET', '/api/me'); state.user = d.user; state.access = d.access; state.demoAdminSession = !!d.demoAdminSession; const after=TUTORIAL_RANK[tutorialTier()]??0; if(before>=0 && after>before) state.launchNewFeatureTutorial=true; } catch {}
}
async function refreshUnread() {
  if (!state.user) { state.unreadCount = 0; state.friendRequestCount = 0; return 0; }
  try { const d = await api('GET', '/api/messages/unread-count'); state.unreadCount = Number(d.unreadCount || 0); } catch {}
  try { const f = await api('GET', '/api/friends/requests'); state.friendRequestCount = Number(f.incoming?.length || 0); } catch {}
  return state.unreadCount || 0;
}
let viewPollTimer = null;
function stopViewPolling() { if (viewPollTimer) { clearInterval(viewPollTimer); viewPollTimer = null; } }
function startViewPolling(fn, ms = 5000) {
  stopViewPolling();
  viewPollTimer = setInterval(() => {
    if (document.hidden) return;
    Promise.resolve().then(fn).catch(() => {});
  }, ms);
}
function go(view, extra = {}, options = {}) { Object.assign(state, { view }, extra); writeRoute(options.replace ? 'replace' : 'push'); window.scrollTo(0, 0); render(); }
function render() {
  stopViewPolling(); renderTop(); renderTabs(); renderApp(); renderFooter();
  const founderWelcomePending=!!(((state.user?.founderLaunchPosition&&!state.user?.founderLaunchNoticeSeenAt)||(demoFounderPreview()&&!demoFounderPreviewDismissed()))&&!state.founderWelcomeOpen&&!state.founderWelcomeScheduled);
  if(founderWelcomePending){state.founderWelcomeScheduled=true;setTimeout(()=>{state.founderWelcomeScheduled=false;showFounderWelcome(false);},320);return;}
  if(state.launchTutorialAfterNav){state.launchTutorialAfterNav=false;setTimeout(()=>startTutorial(false),450);}
  else if(state.launchNewFeatureTutorial){state.launchNewFeatureTutorial=false;setTimeout(()=>startTutorial(false,true),450);}
  else if(state.launchProductUpdateTutorial){state.launchProductUpdateTutorial=false;setTimeout(()=>startTutorial(false,false,true),450);}
}
window.addEventListener('popstate', () => {
  const params = new URLSearchParams(location.search);
  const requested = applyRouteParams(params);
  if (state.user) state.view = requested && ROUTED_VIEWS.has(requested) && !['home','auth'].includes(requested) ? requested : 'feed';
  else state.view = requested && ROUTED_VIEWS.has(requested) ? requested : 'home';
  window.scrollTo(0, 0);
  render();
});

function renderTop() {
  const brandEl = document.querySelector('.brand');
  if (brandEl && !brandEl.dataset.wired) {
    brandEl.dataset.wired = '1';
    brandEl.onclick = () => go(state.user ? 'feed' : 'home');
  }
  const nav = document.getElementById('navlinks');
  nav.innerHTML = '';
  nav.appendChild(el('button', {
    class: 'iconbtn', title: 'Toggle dark mode',
    onclick: async () => {
      const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      applyTheme(next); localStorage.setItem('bre_theme', next);
      if (state.user) { try { const { settings } = await api('PATCH', '/api/me/settings', { theme: next }); state.user.settings = settings; } catch {} }
      renderTop();
    }
  }, iconSvg(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon', 19)));
  if (!state.user) { nav.appendChild(el('button', { onclick: () => go('auth') }, 'Sign in')); return; }
  if (state.user?.demo && state.demoAdminSession) nav.appendChild(el('button',{class:'demo-return-btn',title:'Return to Admin',onclick:async()=>{try{await api('POST','/api/demo/return-admin');await refreshMe();go('admin',{}, {replace:true});}catch(e){toast(e.message,'err');}}},'Return to Admin'));
  const inboxBtn = el('button', { class: 'iconbtn', title: 'Messages', onclick: () => go('messages') }, iconSvg('mail',19));
  if (state.unreadCount > 0) inboxBtn.appendChild(el('span', { class: 'msgbadge' }, state.unreadCount > 99 ? '99+' : String(state.unreadCount)));
  nav.appendChild(inboxBtn);
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Boost a listing', onclick: () => go('boostpicker') }, iconSvg('bolt',19)));
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Wallet', onclick: () => go('wallet') }, iconSvg('wallet',19)));
  nav.appendChild(el('button', { class: 'iconbtn topquick', title: 'Quick options', 'aria-label':'Quick options', onclick: () => openQuickOptions() }, iconSvg('grid',19)));
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Search', 'aria-label':'Search', onclick: () => go('search') }, iconSvg('search',19)));
  nav.appendChild(el('button', { onclick: () => go('settings'), class: state.view === 'settings' ? 'active' : '' }, 'Settings'));
}

function renderTabs() {
  const tabs = document.getElementById('tabbar');
  tabs.innerHTML = '';
  if (!state.user) return;
  const items = [['feed','home','Feed'], ['shop','shop','Shop'], ['compose','plus','Post'], ['network','network','Network'], ['me','user','Profile']];
  items.forEach(([v, ic, label]) => {
    const active = state.view === v || (v === 'shop' && ['shopitem','sellitem','shopmanage','shopedit'].includes(state.view));
    const icon = el('span', { class: 'ic' }, iconSvg(ic, 21));
    if (v === 'network' && state.friendRequestCount > 0) icon.appendChild(el('span', { class: 'tabalert' }));
    tabs.appendChild(el('button', {
      class: active ? 'active' : '', onclick: () => go(v)
    }, [icon, el('span', {}, label)]));
  });
}

async function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const views = {
    home: renderHome, auth: renderAuth, feed: renderFeed, detail: renderDetail,
    compose: renderCompose, saved: renderSaved, messages: renderMessages, chat: renderChat, network: renderNetwork,
    me: renderMe, profile: renderProfile, settings: renderSettings, buybox: renderBuyBox,
    promote: renderPromote, leaderboard: renderLeaderboard, admin: renderAdmin, emailcenter: renderEmailCenter, memberships: renderMemberships,
    wallet: renderWallet, shop: renderShop, shopitem: renderShopItem, sellitem: renderSellItem, shopmanage: renderShopManage, shopedit: renderShopEdit, offers: renderOffers,
    upgrade: renderUpgrade, analytics: renderAnalytics, orders: renderOrders, suppliers: renderSuppliers, fulfilment: renderFulfilment, reports: renderReports,
    boostpicker: renderBoostPicker, workspace: renderWorkspace, companyworkspace: renderCompanyWorkspace, company: renderCompany, companyjoin: renderCompanyJoin, buyerportal: renderBuyerPortal, insights: renderDemandInsights, dealbuilder: renderDealBuilder, buyercrm: renderBuyerCRM, commandcenter: renderCommandCenter, search: renderUniversalSearch, savedsearches: renderSavedSearches, pipeline: renderPipeline, dealcalendar: renderDealCalendar, markethubs: renderMarketHubs, dealroom: renderDealRoom, transactionhub: renderTransactionHub, affiliate: renderAffiliateCenter, intake: renderDealIntake,
    about: pageAbout, terms: pageTerms, privacy: pagePrivacy, contact: pageContact, faq: pageFaq,
    forgot: renderForgot, reset: renderReset, verify: renderVerify
  };
  try { app.appendChild(await (views[state.view] || renderHome)()); }
  catch (e) {
    app.appendChild(el('div', { class: 'page' }, el('div', { class: 'empty' }, [
      el('h3', {}, 'Something went wrong'), el('p', {}, e.message),
      el('button', { class: 'btn-ghost', style: 'margin-top:18px', onclick: () => render() }, 'Try again')
    ])));
  }
}

/* ================= HOME ================= */
function renderHome() {
  const p = state.pricing;
  const wrap = el('div', { class: 'homepublic' });

  const primary = (label) => el('button', { class: 'btn-primary', onclick: () => { state.authMode = 'signup'; go('auth'); } }, label);
  const login = (label = 'Sign in') => el('button', { class: 'btn-ghost', onclick: () => { state.authMode = 'login'; go('auth'); } }, label);

  wrap.appendChild(el('section', { class: 'homehero' }, el('div', { class: 'homewide homehero-grid' }, [
    el('div', { class: 'homehero-copy' }, [
      el('div', { class: 'homeeyebrow' }, 'BUILT FOR REAL ESTATE DEALMAKERS'),
      el('h1', {}, ['The professional network for ', el('em', {}, 'off-market real estate.' )]),
      el('p', {}, 'Discover opportunities, connect with active buyers, market your deals and manage the relationships that move real estate — from one workspace.'),
      el('div', { class: 'herobtns' }, [primary('Join Better Real Estate'), login()]),
      el('div', { class: 'homeheronote' }, `Free for ${p?.signupTrialDays || 7} days · No card required`)
    ]),
    el('div', { class: 'homecap-panel' }, [
      el('div', { class: 'homecap-head' }, [el('span', {}, 'THE PLATFORM'), el('b', {}, 'One professional real estate workspace')]),
      capability('Better Dispo', 'Match buyers and build distribution assets', '01'),
      capability('Buyers Looking', 'See public acquisition criteria', '02'),
      capability('Network & Messages', 'Build relationships and talk directly', '03'),
      capability('Wholesale Teams', 'Work together with individual logins', '04'),
      el('div', { class: 'homecap-foot' }, ['Built around the deal — ', el('strong', {}, 'not around noise.')])
    ])
  ])));

  wrap.appendChild(el('section', { class: 'homeproof' }, el('div', { class: 'homewide homeproof-grid' }, [
    proofItem('01', 'Find opportunities', 'A real-estate-first feed built around properties and people — not unrelated social noise.'),
    proofItem('02', 'Find the right people', 'Public buy boxes, member discovery, follows, friends and direct messaging keep your network useful.'),
    proofItem('03', 'Move the deal', 'Better Dispo turns one deal into buyer matching and polished distribution assets without rebuilding it everywhere.')
  ])));

  wrap.appendChild(el('section', { class: 'homesection' }, el('div', { class: 'homewide' }, [
    el('div', { class: 'homesection-head' }, [
      el('div', { class: 'homeeyebrow' }, 'ONE WORKSPACE'),
      el('h2', {}, 'Less bouncing between tools. More focus on the deal.'),
      el('p', {}, 'Better Real Estate brings the core parts of sourcing, networking and disposition into a workspace designed around how real estate professionals actually work.')
    ]),
    el('div', { class: 'homefeature-grid' }, [
      homeFeature('Better Dispo', 'Paste or build a deal once. Match active buyers and create ready-to-share Facebook, Instagram, SMS, email and flyer assets.', 'Distribute'),
      homeFeature('Buyers Looking', 'See what investors are actively acquiring by market, property type, strategy and price range before you start outreach.', 'Match'),
      homeFeature('Real estate feed', 'Browse property-first posts, save opportunities and follow the people consistently bringing deals to your market.', 'Discover'),
      homeFeature('Network & messaging', 'Search members, build professional connections and take conversations directly into private messages.', 'Connect'),
      homeFeature('Wholesale Teams', 'Give your company a shared identity and workspace while each team member keeps a separate, accountable login.', 'Collaborate'),
      homeFeature('Marketplace', 'Source rehab-related products and materials without turning the professional deal experience into a general marketplace.', 'Source')
    ])
  ])));

  wrap.appendChild(el('section', { class: 'hometeam' }, el('div', { class: 'homewide hometeam-grid' }, [
    el('div', {}, [
      el('div', { class: 'homeeyebrow' }, 'FOR INDIVIDUALS AND TEAMS'),
      el('h2', {}, 'Professional enough to become the workspace you open every day.'),
      el('p', {}, 'Use Better Real Estate on your own or bring a wholesale company into a structured team workspace with individual accounts, company presence and shared deal operations.')
    ]),
    el('div', { class: 'hometeam-points' }, [
      teamPoint('Separate team logins', 'No shared-password workflow.'),
      teamPoint('Company presence', 'Keep the business identity connected to the people behind it.'),
      teamPoint('Built to grow', 'Start with the network and add the professional tools you need.')
    ])
  ])));

  wrap.appendChild(el('section', { class: 'homefinal' }, el('div', { class: 'homewide homefinal-inner' }, [
    el('div', {}, [el('div', { class: 'homeeyebrow' }, 'BETTER REAL ESTATE'), el('h2', {}, 'Make better your standard.'), el('p', {}, 'Build your network. Find the deal. Reach the buyer. Keep the work in one place.')]),
    el('div', { class: 'homefinal-actions' }, [primary('Create your account'), login('Already a member?')])
  ])));

  return wrap;
}
function capability(h, p, n) { return el('div', { class: 'homecap-row' }, [el('span', { class: 'homecap-num' }, n), el('div', {}, [el('b', {}, h), el('small', {}, p)]), el('span', { class: 'homecap-arrow' }, '→')]); }
function proofItem(n, h, p) { return el('div', { class: 'homeproof-item' }, [el('span', {}, n), el('div', {}, [el('h3', {}, h), el('p', {}, p)])]); }
function homeFeature(h, p, tag) { return el('article', { class: 'homefeature' }, [el('div', { class: 'homefeature-tag' }, tag), el('h3', {}, h), el('p', {}, p)]); }
function teamPoint(h, p) { return el('div', { class: 'hometeam-point' }, [el('span', {}, '✓'), el('div', {}, [el('b', {}, h), el('small', {}, p)])]); }

/* ================= AUTH ================= */
function renderAuth() {
  const wrap = el('div', { class: 'panel' });
  const isSignup = state.authMode === 'signup';
  wrap.appendChild(el('h2', {}, isSignup ? 'Create your account' : 'Welcome back'));
  wrap.appendChild(el('div', { class: 'sub' }, state.companyInviteToken ? (isSignup ? 'Create your account to join your company workspace.' : 'Sign in with the email that received your company invitation.') : (isSignup ? `${state.pricing?.signupTrialDays || 7} days of full access, no card required.` : 'Sign in to continue.')));

  let role = 'buyer';
  const name = el('input', { placeholder: 'Jordan Alvarez' });
  const email = el('input', { type: 'text', autocomplete: 'username', placeholder: isSignup ? 'you@email.com' : 'Email or @username' });
  const pass = el('input', { type: 'password', placeholder: isSignup ? 'At least 6 characters' : 'Your password' });
  const ref = el('input', { placeholder: 'Optional', value: state.pendingReferral || '' });
  const marketingOpt = el('input', { type: 'checkbox', style: 'width:auto;margin:0' });
  const err = el('div', { class: 'errmsg' });

  if (isSignup) {
    wrap.appendChild(el('label', {}, "I'm here as"));
    const tabs = el('div', { class: 'roletabs' });
    [['buyer','Buyer'],['seller','Seller']].forEach(([v, l]) => {
      const b = el('button', { class: v === role ? 'selected' : '' }, l);
      b.onclick = () => { role = v; [...tabs.children].forEach(c => c.classList.remove('selected')); b.classList.add('selected'); };
      tabs.appendChild(b);
    });
    wrap.appendChild(tabs);
    wrap.appendChild(el('div', { class: 'hint' }, 'Everyone can post, browse and use the marketplace — your role just sets which screen opens first.'));
    wrap.appendChild(el('label', {}, 'Name')); wrap.appendChild(name);
  }
  wrap.appendChild(el('label', {}, 'Email')); wrap.appendChild(email);
  wrap.appendChild(el('label', {}, 'Password')); wrap.appendChild(pass);
  if (isSignup) {
    wrap.appendChild(el('label', {}, 'Referral code')); wrap.appendChild(ref);
    const marketingRow = el('label', { class: 'marketingopt' }, [marketingOpt, el('span', {}, 'Email me new listings, marketplace updates and occasional activity reminders. I can unsubscribe anytime.')]);
    wrap.appendChild(marketingRow);
  }
  wrap.appendChild(err);

  const submit = el('button', { class: 'submitbtn' }, isSignup ? 'Create account' : 'Sign in');
  submit.onclick = async () => {
    err.textContent = '';
    try {
      const payload = isSignup
        ? { name: name.value.trim(), email: email.value.trim(), password: pass.value, role, referralCode: ref.value.trim(), affiliateCode: state.pendingAffiliate || '', marketingOptIn: marketingOpt.checked }
        : { email: email.value.trim(), password: pass.value };
      const d = await api('POST', isSignup ? '/api/signup' : '/api/login', payload);
      state.user = d.user; if (d.pricing) state.pricing = d.pricing;
      if (isSignup) {
        state.pendingReferral = null;
        state.launchTutorialAfterNav = true;
        try { localStorage.removeItem('bre_referral_code'); localStorage.removeItem('bre_affiliate_code'); } catch {}
      }
      await refreshMe();
      applyTheme(state.user.settings?.theme || 'light');
      if (isSignup && d.verificationEmailSent === false) toast('Your account was created, but the confirmation email could not be delivered. Use Resend on the feed; the admin can see the delivery issue in Email Center.', 'err');
      if (state.companyInviteToken) go('companyjoin');
      else if (state.postAuthTarget) {
        const target = state.postAuthTarget; state.postAuthTarget = null;
        go(target.view || 'feed', { detailId: target.detailId, profileId: target.profileId, companyId: target.companyId, shopItemId: target.shopItemId, networkTab: target.networkTab || 'discover' });
      } else go('feed');
    } catch (e) { err.textContent = e.message; }
  };
  wrap.appendChild(submit);
  wrap.appendChild(el('div', { class: 'switchline' }, el('a', {
    onclick: () => { state.authMode = isSignup ? 'login' : 'signup'; render(); }
  }, isSignup ? 'Already have an account? Sign in' : 'New here? Create an account')));
  if (!isSignup) wrap.appendChild(el('div', { class: 'switchline' }, el('a', { onclick: () => go('forgot') }, 'Forgot your password?')));
  wrap.appendChild(el('div', { class: 'hint', style: 'text-align:center;margin-top:14px' }, [
    'By continuing you agree to our ',
    el('a', { onclick: () => go('terms') }, 'Terms'), ' and ', el('a', { onclick: () => go('privacy') }, 'Privacy Policy'), '.'
  ]));
  return wrap;
}

/* ================= TRIAL / UPGRADE BAR ================= */
function trialBar() {
  if (!state.user || !state.access) return null;
  if (state.access.platinum) return null;
  if (state.access.trial) {
    const daysLeft = Math.max(0, Math.ceil((new Date(state.user.trialUntil) - Date.now()) / 86400000));
    return el('div', { class: 'trialbar' }, [
      el('div', {}, `Free trial — ${daysLeft} day${daysLeft === 1 ? '' : 's'} left. Full access to every listing.`),
      el('button', { onclick: () => go('upgrade') }, 'See plans')
    ]);
  }
  if (state.access.pro) {
    // Already paying — the nudge here is upward to Platinum, not a
    // generic "upgrade" (they're already upgraded once).
    return el('div', { class: 'trialbar' }, [
      el('div', {}, 'Get matching listings emailed to you before anyone else sees them — that\'s Platinum.'),
      el('button', { onclick: () => go('upgrade') }, 'See Platinum')
    ]);
  }
  return el('div', { class: 'trialbar' }, [
    el('div', {}, `${state.user.unlockCredits} free unlock${state.user.unlockCredits === 1 ? '' : 's'} left. Plus gives you unlimited.`),
    el('button', { onclick: () => go('upgrade') }, 'Upgrade')
  ]);
}

/* ================= CARD PAYMENT MODAL ================= */
// Shared by every purchase button. If the server says the wallet balance
// already covered it (or Stripe isn't configured yet), there's nothing to
// do here. Otherwise this shows a real Stripe card form, confirms the
// charge with Stripe directly (the card number never touches this
// server), then waits briefly for the webhook to actually grant the
// purchase before refreshing.
async function handlePurchaseResponse(resp, successMsg, onDone) {
  if (!resp?.requiresPayment) {
    toast(successMsg, 'ok');
    if (onDone) await onDone();
    return;
  }
  await payWithCard(resp.clientSecret, resp.amount, async () => {
    toast(successMsg, 'ok');
    if (onDone) await onDone();
  });
}

function payWithCard(clientSecret, amountCents, onSuccess) {
  return new Promise(resolve => {
    if (!state.stripe) {
      toast('Card payments are not set up on this site yet.', 'err');
      resolve(); return;
    }
    const overlay = el('div', { style: 'position:fixed;inset:0;background:rgba(10,10,10,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px;' });
    const panel = el('div', { class: 'panel', style: 'margin:0;max-width:400px;width:100%;animation:rise .25s' });
    panel.appendChild(el('h2', { style: 'font-size:22px' }, 'Pay ' + cents(amountCents)));
    panel.appendChild(el('div', { class: 'sub' }, 'Your card is charged directly by Stripe — this site never sees or stores your card number.'));
    const mount = el('div', { style: 'padding:12px 13px;border:1px solid var(--line);border-radius:9px;background:var(--bg-elev);margin-bottom:6px' });
    panel.appendChild(mount);
    const err = el('div', { class: 'errmsg' });
    panel.appendChild(err);
    const payBtn = el('button', { class: 'submitbtn' }, 'Pay now');
    const cancelBtn = el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:10px' }, 'Cancel');
    panel.appendChild(payBtn);
    panel.appendChild(cancelBtn);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    const elements = state.stripe.elements();
    const card = elements.create('card', { style: { base: { fontSize: '15px', color: 'var(--ink)' } } });
    card.mount(mount);

    function close() { overlay.remove(); resolve(); }
    cancelBtn.onclick = close;

    payBtn.onclick = async () => {
      payBtn.disabled = true; payBtn.textContent = 'Processing…';
      err.textContent = '';
      const { error, paymentIntent } = await state.stripe.confirmCardPayment(clientSecret, { payment_method: { card } });
      if (error) {
        err.textContent = error.message;
        payBtn.disabled = false; payBtn.textContent = 'Pay now';
        return;
      }
      if (paymentIntent?.status === 'succeeded') {
        payBtn.textContent = 'Payment received — updating your account…';
        // The webhook applies the purchase server-side; give it a moment.
        setTimeout(async () => { close(); if (onSuccess) await onSuccess(); }, 1600);
      }
    };
  });
}


async function renderFeed() {
  const wrap = el('div', { class: 'feedwrap' });
  const vb = verifyBanner(); if (vb) wrap.appendChild(vb);
  const tb = trialBar(); if (tb) wrap.appendChild(tb);
  let dash=null; try{dash=await api('GET','/api/dashboard');}catch{}
  if(dash) wrap.appendChild(el('div',{class:'feedcommand'},[el('div',{class:'feedcommand-stats'},[miniMetric(dash.matched,'Market matches'),miniMetric(dash.buyerMatches,'Buyer matches'),miniMetric(dash.pendingOffers,'Pending offers'),miniMetric(dash.upcoming?new Date(dash.upcoming.at).toLocaleDateString():'—','Next deadline')]) ]));
  wrap.appendChild(el('div', { class: 'feedhead' }, [
    el('div',{class:'feedmode'},[el('button',{class:state.feedMode==='for-you'?'active':'',onclick:()=>{state.feedMode='for-you';render();}},'For You'),el('button',{class:state.feedMode==='following'?'active':'',onclick:()=>{state.feedMode='following';render();}},'Following')]),
    el('div', {class:'feedtools'}, [el('button', { class: 'filterbtn', onclick: () => go('search') }, 'Search'),el('button', { class: 'filterbtn', onclick: () => go('saved') }, 'Liked'),el('button', { class: 'filterbtn', onclick: () => go('savedsearches') }, 'Deal alerts')])
  ]));
  const { feed, access } = await api('GET', '/api/feed?mode='+encodeURIComponent(state.feedMode));
  state.access = access || state.access;
  if (!feed.length) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('h3', {}, 'Nothing posted yet'),
      el('p', {}, 'Post a property and it shows up here instantly.'),
      el('button', { class: 'btn-primary', style: 'margin-top:16px', onclick: () => go('compose') }, 'Post a property')
    ]));
    return wrap;
  }
  feed.forEach((l, i) => {
    const card = propertyCard(l);
    card.style.animationDelay = Math.min(i * 45, 400) + 'ms';
    wrap.appendChild(card);
  });
  return wrap;
}

function propertyCard(l) {
  const spread = l.arv ? l.arv - l.asking : 0;
  let idx = 0;
  const imgEl = el('div', { class: 'imgwrap' });
  const img = l.photos?.length ? el('img', { src: l.photos[0], alt: l.city }) : el('div', { class: 'nophoto' }, 'No photo added');
  imgEl.appendChild(img);
  imgEl.appendChild(el('div', { class: 'pricebadge' }, money(l.asking)));
  if (spread > 0) imgEl.appendChild(el('div', { class: 'spreadbadge' }, '+' + money(spread)));
  if (l.photos?.length > 1) {
    const dots = el('div', { class: 'photodots' });
    l.photos.forEach((_, i) => dots.appendChild(el('span', { class: i === 0 ? 'on' : '' })));
    imgEl.appendChild(dots);
  }
  // Tap left/right thirds to page photos; tap the middle to open.
  const step = dir => {
    if (!l.photos?.length) return;
    idx = (idx + dir + l.photos.length) % l.photos.length;
    img.style.opacity = '0';
    setTimeout(() => { img.src = l.photos[idx]; img.style.opacity = '1'; }, 90);
    const dots = imgEl.querySelector('.photodots');
    if (dots) [...dots.children].forEach((d, i) => d.className = i === idx ? 'on' : '');
    buzz(6);
  };
  if (l.photos?.length > 1) {
    img.style.transition = 'opacity .18s ease, transform .5s cubic-bezier(.2,.8,.2,1)';
    const zl = el('div', { class: 'navzone l' }); zl.onclick = e => { e.stopPropagation(); step(-1); };
    const zr = el('div', { class: 'navzone r' }); zr.onclick = e => { e.stopPropagation(); step(1); };
    imgEl.appendChild(zl); imgEl.appendChild(zr);
    // swipe on touch
    let sx = null;
    imgEl.addEventListener('touchstart', e => { sx = e.touches[0].clientX; }, { passive: true });
    imgEl.addEventListener('touchend', e => {
      if (sx === null) return;
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 42) step(dx < 0 ? 1 : -1);
      sx = null;
    }, { passive: true });
  }
  imgEl.onclick = () => go('detail', { detailId: l.id, photoIdx: 0 });

  const specs = [];
  if (l.beds) specs.push(l.beds + ' bd');
  if (l.baths) specs.push(l.baths + ' ba');
  if (l.sqft) specs.push(l.sqft.toLocaleString() + ' sqft');
  if (l.year) specs.push('Built ' + l.year);
  specs.push(l.propertyType);

  const saveBtn = el('button', { class: l.savedByMe ? 'saved' : '' }, l.savedByMe ? '♥ Saved' : '♡ Save');
  saveBtn.onclick = async e => {
    e.stopPropagation();
    buzz();
    try {
      const { saved } = await api('POST', '/api/saves/toggle', { listingId: l.id });
      saveBtn.className = saved ? 'saved heartpop' : 'heartpop';
      saveBtn.textContent = saved ? '♥ Saved' : '♡ Save';
      setTimeout(() => saveBtn.classList.remove('heartpop'), 400);
      if (saved) toast('Saved to your list', 'ok');
    } catch (err) { toast(err.message, 'err'); }
  };

  return el('div', { class: 'pcard' }, [
    el('div', { class: 'owner' }, [
      el('div', { class: 'av', onclick: () => go('profile', { profileId: l.ownerId }) }, l.ownerAvatar ? el('img', { src: l.ownerAvatar }) : initials(l.ownerName)),
      el('div', { class: 'who', onclick: () => go('profile', { profileId: l.ownerId }) }, [
        el('div', { class: 'n' }, [l.ownerName, l.ownerVerified ? el('span', { class: 'vbadge' }, '✓ Verified') : null]),
        l.companyName ? el('div', { class: 'companybyline' }, l.companyName) : null,
        el('div', { class: 't' }, l.situation + ' · ' + l.timeline)
      ]),
      l.demo ? el('div', { class: 'demopill' }, 'SAMPLE') : (l.isBoosted ? el('div', { class: 'boostpill' }, 'PROMOTED') : (l.isSpotlight ? el('div', { class: 'spotbadge' }, '★') : null))
    ]),
    imgEl,
    el('div', { class: 'info' }, [
      el('div', { class: 'addr' }, l.locked ? l.city.split(',')[0] + ' — address hidden' : l.address),
      el('div', { class: 'cityline' }, l.city),
      el('div', { class: 'specs' }, specs.map(s => el('span', {}, s))),
      l.matchReasons?.length ? el('div', { class: 'matchrow' }, l.matchReasons.map(r => el('span', { class: 'matchtag' }, r))) : null,
      el('div', { class: 'actions' }, [
        saveBtn,
        el('button', { onclick: e => { e.stopPropagation(); shareNative({ kind: 'property', targetId: l.id, title: `${l.city} property on Better Real Estate`, text: `${money(l.asking)} · ${l.propertyType || 'Investment property'}` }); } }, 'Share'),
        el('button', { title:'Hide this property and improve recommendations', onclick: async e => { e.stopPropagation(); await api('POST','/api/feed/feedback',{listingId:l.id,kind:'hide'}); toast('Hidden from your feed','ok'); render(); } }, 'Not interested'),
        el('button', { class: 'primary', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, l.locked ? '🔒 Unlock' : 'View details')
      ])
    ])
  ]);
}

/* ================= BETTER DISPO HELPERS ================= */
async function copyTextValue(text, label = 'Copied') {
  try { await navigator.clipboard.writeText(String(text || '')); toast(label, 'ok'); }
  catch { prompt('Copy:', String(text || '')); }
}

function shareReferralSuffix() {
  const code = String(state.user?.referralCode || '').trim().toUpperCase();
  return code ? '?ref=' + encodeURIComponent(code) : '';
}
function shareUrl(kind = 'join', targetId = '') {
  const base = location.origin;
  const id = encodeURIComponent(String(targetId || ''));
  if (kind === 'property') return `${base}/s/property/${id}${shareReferralSuffix()}`;
  if (kind === 'profile') return `${base}/s/profile/${id}${shareReferralSuffix()}`;
  if (kind === 'company') return `${base}/s/company/${id}${shareReferralSuffix()}`;
  if (kind === 'buyer') return `${base}/s/buyer/${id}${shareReferralSuffix()}`;
  return `${base}/s/join${shareReferralSuffix()}`;
}
function trackShare(kind, targetId, channel) {
  if (!state.user) return;
  api('POST', '/api/share-events', { kind, targetId, channel }).catch(() => {});
}
async function shareNative({ kind = 'join', targetId = '', title = 'Better Real Estate', text = '' } = {}) {
  const url = shareUrl(kind, targetId);
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      trackShare(kind, targetId, 'native');
      return true;
    } catch (e) {
      if (e?.name === 'AbortError') return false;
    }
  }
  await copyTextValue(url, 'Share link copied');
  trackShare(kind, targetId, 'copy');
  return true;
}
function socialShareWindow(channel, kind, targetId, title, text = '') {
  const url = shareUrl(kind, targetId);
  const u = encodeURIComponent(url);
  const t = encodeURIComponent([title, text].filter(Boolean).join(' — '));
  const destinations = {
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${u}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
    x: `https://twitter.com/intent/tweet?url=${u}&text=${t}`
  };
  if (!destinations[channel]) return;
  trackShare(kind, targetId, channel);
  window.open(destinations[channel], '_blank', 'noopener,noreferrer,width=720,height=640');
}
function shareStrip({ kind = 'join', targetId = '', title = 'Better Real Estate', text = '', compact = false } = {}) {
  const bar = el('div', { class: 'sharestrip' + (compact ? ' compact' : '') });
  bar.appendChild(el('button', { class: 'shareprimary', onclick: () => shareNative({ kind, targetId, title, text }) }, 'Share'));
  bar.appendChild(el('button', { onclick: async () => { await copyTextValue(shareUrl(kind, targetId), 'Share link copied'); trackShare(kind, targetId, 'copy'); } }, 'Copy link'));
  bar.appendChild(el('button', { onclick: () => socialShareWindow('facebook', kind, targetId, title, text) }, 'Facebook'));
  bar.appendChild(el('button', { onclick: () => socialShareWindow('linkedin', kind, targetId, title, text) }, 'LinkedIn'));
  bar.appendChild(el('button', { onclick: () => socialShareWindow('x', kind, targetId, title, text) }, 'X'));
  return bar;
}
function escapeHtml(v) { return String(v ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch])); }
function openDealFlyer(pack, listing) {
  const w = window.open('', '_blank'); if (!w) { toast('Allow pop-ups to open the printable flyer.', 'err'); return; }
  const facts = (pack.flyer?.facts || []).map(x => `<div class="fact">${escapeHtml(x)}</div>`).join('');
  const photo = listing.photos?.[0] ? `<img class="heroimg" src="${escapeHtml(listing.photos[0])}">` : '';
  w.document.write(`<!doctype html><html><head><title>${escapeHtml(pack.flyer?.headline || 'Deal flyer')}</title><meta name="viewport" content="width=device-width"><style>
    body{font-family:Arial,sans-serif;color:#111;margin:0;background:#fafaf8}.sheet{max-width:820px;margin:28px auto;background:#fff;border:1px solid #ddd;border-radius:18px;overflow:hidden}.top{padding:28px;background:#111;color:white}.brand{font-weight:800;letter-spacing:.04em;color:#ffc531}.top h1{font-size:34px;margin:12px 0 4px}.heroimg{width:100%;max-height:420px;object-fit:cover}.body{padding:28px}.facts{display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin:0 0 22px}.fact{padding:12px;background:#f5f5f1;border-radius:10px;font-weight:600}.notes{white-space:pre-wrap;line-height:1.55}.url{word-break:break-all;padding:14px;background:#fff4e8;border:1px solid #ffd4af;border-radius:10px;margin-top:24px}.foot{font-size:12px;color:#666;margin-top:20px}.print{margin:0 0 18px;padding:10px 16px}@media print{.print{display:none}.sheet{border:0;margin:0;max-width:none}}
  </style></head><body><div class="sheet"><div class="top"><div class="brand">BETTER REAL ESTATE</div><h1>${escapeHtml(pack.flyer?.headline || '')}</h1><div>Make better your standard.</div></div>${photo}<div class="body"><button class="print" onclick="window.print()">Print / Save as PDF</button><div class="facts">${facts}</div><div class="notes">${escapeHtml(pack.flyer?.notes || '')}</div><div class="url">${escapeHtml(pack.url || '')}</div><div class="foot">Property details are seller-provided. Buyers should independently verify all figures, condition, title, availability and transaction terms.</div></div></div></body></html>`);
  w.document.close();
}

async function downloadStoryCard(pack, listing) {
  const canvas = document.createElement('canvas'); canvas.width = 1080; canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#111111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (listing.photos?.[0]) {
    try {
      const img = await new Promise((resolve, reject) => { const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => resolve(i); i.onerror = reject; i.src = listing.photos[0]; });
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height); const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);
    } catch {}
  }
  const g = ctx.createLinearGradient(0, 0, 0, canvas.height); g.addColorStop(0, 'rgba(0,0,0,.28)'); g.addColorStop(.45, 'rgba(0,0,0,.38)'); g.addColorStop(1, 'rgba(0,0,0,.92)'); ctx.fillStyle = g; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle = '#FFC531'; ctx.font = '700 42px Arial'; ctx.fillText('BETTER REAL ESTATE', 72, 110);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 72px Arial';
  const headline = String(pack.flyer?.headline || listing.city || 'Off-market property').slice(0,52);
  const words = headline.split(' '); let line = '', y = 1340;
  for (const word of words) { const test = line ? line + ' ' + word : word; if (ctx.measureText(test).width > 930 && line) { ctx.fillText(line,72,y); y += 84; line = word; } else line = test; }
  if (line) { ctx.fillText(line,72,y); y += 98; }
  ctx.font = '500 38px Arial'; ctx.fillStyle = '#f2f2f2';
  (pack.flyer?.facts || []).slice(0,3).forEach(f => { ctx.fillText(String(f).slice(0,58),72,y); y += 54; });
  ctx.fillStyle = '#E8590C'; ctx.fillRect(72, 1730, 936, 2);
  ctx.fillStyle = '#ffffff'; ctx.font = '700 40px Arial'; ctx.fillText('View the full deal on Better Real Estate',72,1800);
  ctx.fillStyle = '#FFC531'; ctx.font = '600 32px Arial'; ctx.fillText('BetterRealEstate.org',72,1855);
  const a = document.createElement('a'); a.download = `better-real-estate-${String(listing.city || 'deal').toLowerCase().replace(/[^a-z0-9]+/g,'-')}-story.png`; a.href = canvas.toDataURL('image/png'); a.click();
}

/* ================= DETAIL ================= */
async function renderDetail() {
  const d = await api('GET', '/api/listings/' + state.detailId);
  const { listing, owner, otherListings, reviews } = d;
  state.access = d.access || state.access;
  const wrap = el('div', { class: 'detail' });
  if (listing.openToJV) wrap.appendChild(el('div', { class:'jvbanner' }, [el('b', {}, 'Open to JV'), el('span', {}, 'The deal owner is open to joint-venture conversations.') ]));
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back to feed'));

  const gal = el('div', { class: 'gallery' });
  const main = el('div', { class: 'main' });
  if (listing.photos?.length) main.appendChild(el('img', { src: listing.photos[state.photoIdx] || listing.photos[0] }));
  else main.appendChild(el('div', {}, 'No photos on this listing'));
  gal.appendChild(main);
  if (listing.photos?.length > 1) {
    const th = el('div', { class: 'thumbs' });
    listing.photos.forEach((p, i) => {
      const t = el('img', { src: p, class: i === state.photoIdx ? 'on' : '' });
      t.onclick = () => { state.photoIdx = i; render(); };
      th.appendChild(t);
    });
    gal.appendChild(th);
  }
  wrap.appendChild(gal);

  const spread = listing.arv ? listing.arv - listing.asking : null;
  wrap.appendChild(el('div', { class: 'dhead' }, [
    el('div', {}, [el('h2', {}, listing.address), el('div', { class: 'c' }, listing.city), listing.freshness ? el('div', { class: 'freshnessline' }, [el('span', { class: 'freshnesspill' + (listing.freshness.needsConfirmation ? ' warn' : '') }, listing.freshness.needsConfirmation ? 'Needs seller confirmation' : `Confirmed ${listing.freshness.confirmedDaysAgo === 0 ? 'today' : listing.freshness.confirmedDaysAgo + 'd ago'}`), listing.contractDeadline ? el('span', {}, `Deadline ${listing.contractDeadline}`) : null]) : null]),
    el('div', { class: 'dprice' }, money(listing.asking))
  ]));
  wrap.appendChild(shareStrip({ kind: 'property', targetId: listing.id, title: `${listing.city} property on Better Real Estate`, text: `${money(listing.asking)} · ${listing.propertyType || 'Investment property'}` }));

  const cells = [
    ['Situation', listing.situation], ['Timeline', listing.timeline], ['Type', listing.propertyType],
    listing.arv ? ['Est. ARV', money(listing.arv)] : null,
    spread ? ['Spread', money(spread)] : null,
    listing.beds ? ['Beds', listing.beds] : null,
    listing.baths ? ['Baths', listing.baths] : null,
    listing.sqft ? ['Sq ft', listing.sqft.toLocaleString()] : null,
    listing.year ? ['Year built', listing.year] : null,
    listing.contractDeadline ? ['Deal deadline', listing.contractDeadline] : null
  ].filter(Boolean);
  wrap.appendChild(el('div', { class: 'dgrid' }, cells.map(([l, v]) => el('div', { class: 'dcell' }, [el('div', { class: 'l' }, l), el('div', { class: 'v' }, String(v))]))));

  // ---- PAYWALL ----
  if (listing.locked) {
    wrap.appendChild(el('div', { class: 'dsection' }, [
      el('h3', {}, 'Full details'),
      el('div', { class: 'lockwrap' }, [
        el('div', { class: 'blurred' }, [
          el('div', { class: 'dnotes' }, 'Exact address, seller notes, phone number and email are hidden until you unlock this listing. Sellers on Keyline share direct contact so you can negotiate without a middleman.'),
          el('div', { class: 'ownerbox', style: 'margin-top:14px' }, [el('div', { class: 'av' }, '••'), el('div', { class: 'meta' }, [el('div', { class: 'n' }, '••••• •••••'), el('div', { class: 's' }, '(•••) •••-••••')])])
        ]),
        el('div', { class: 'lockoverlay' }, [
          el('div', { class: 'lk' }, '🔒'),
          el('div', { class: 'lt' }, state.user.unlockCredits > 0
            ? `Unlock with 1 of your ${state.user.unlockCredits} free credits`
            : `Unlock for ${cents(state.pricing.unlockCredit)}`),
          el('div', { class: 'ld' }, 'Exact address, seller notes, phone and email — plus the ability to make an offer.'),
          el('button', {
            class: 'btn-primary', onclick: async () => {
              try {
                const r = await api('POST', `/api/listings/${listing.id}/unlock`);
                await handlePurchaseResponse(r, 'Unlocked', async () => { await refreshMe(); render(); });
              } catch (e) { toast(e.message, 'err'); }
            }
          }, state.user.unlockCredits > 0 ? 'Use free credit' : 'Unlock ' + cents(state.pricing.unlockCredit)),
          el('a', { onclick: () => go('upgrade') }, 'or go Plus for unlimited')
        ])
      ])
    ]));
    wrap.appendChild(dealCalculator(listing));
    return wrap;
  }

  if (listing.notes) wrap.appendChild(el('div', { class: 'dsection' }, [el('h3', {}, 'Seller notes'), el('div', { class: 'dnotes' }, listing.notes)]));
  wrap.appendChild(dealCalculator(listing));

  // owner
  const followBtn = el('button', {}, 'Follow');
  if (state.user && owner && state.user.id !== owner.id) {
    api('GET', '/api/follow/status/' + owner.id).then(({ following }) => {
      followBtn.textContent = following ? 'Following' : 'Follow'; followBtn.className = following ? 'following' : '';
    }).catch(() => {});
    followBtn.onclick = async () => {
      const { following } = await api('POST', '/api/follow', { userId: owner.id });
      followBtn.textContent = following ? 'Following' : 'Follow'; followBtn.className = following ? 'following' : '';
    };
  }
  const avg = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  wrap.appendChild(el('div', { class: 'dsection' }, [
    el('h3', {}, 'Posted by'),
    el('div', { class: 'ownerbox' }, [
      el('div', { class: 'av', onclick: () => go('profile', { profileId: owner.id }) }, owner.avatarUrl ? el('img', { src: owner.avatarUrl }) : initials(owner.name)),
      el('div', { class: 'meta', onclick: () => go('profile', { profileId: owner.id }) }, [
        el('div', { class: 'n' }, [owner.name, owner.verified ? el('span', { class: 'vbadge' }, '✓') : null, membershipBadge(owner.publicMembership)]),
        owner.company ? el('button', { class: 'companylink', onclick: e => { e.stopPropagation(); go('company', { companyId: owner.company.id }); } }, owner.company.name) : null,
        el('div', { class: 's' }, [owner.username ? '@' + owner.username : null, owner.phone, owner.email, avg ? `★ ${avg} (${reviews.length})` : null].filter(Boolean).join(' · '))
      ]),
      state.user && state.user.id !== owner.id ? followBtn : null
    ])
  ]));

  // offer + message
  if (state.user && state.user.id !== owner.id) {
    const amt = el('input', { type: 'number', placeholder: String(Math.round(listing.asking * 0.9)) });
    const days = el('input', { type: 'number', placeholder: '14' });
    const emd = el('input', { type: 'number', placeholder: '1000' });
    const inspection = el('input', { type: 'number', placeholder: '0' });
    const financing = el('select', {}, [['cash','Cash'],['hard-money','Hard money'],['private','Private money'],['conventional','Conventional'],['other','Other']].map(([v,l])=>el('option',{value:v},l)));
    const expires = el('input', { type: 'datetime-local' });
    const terms = el('textarea', { placeholder: 'Additional terms or notes…' });
    const ost = el('div', { class: 'okmsg' });
    const ob = el('button', { class: 'submitbtn' }, 'Submit offer');
    ob.onclick = async () => {
      try {
        await api('POST', '/api/offers', { listingId: listing.id, amount: amt.value, terms: terms.value, closeDays: days.value, emd: emd.value, inspectionDays: inspection.value, financing: financing.value, expiresAt: expires.value });
        ost.textContent = 'Offer sent. Track it under Profile → Offers.'; amt.value = ''; terms.value = '';
      } catch (e) { ost.className = 'errmsg'; ost.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'dsection' }, [
      el('h3', {}, 'Make an offer'),
      el('div',{class:'offer-builder-grid'},[el('div',{},[el('label',{},'Offer amount ($)'),amt]),el('div',{},[el('label',{},'Earnest money ($)'),emd]),el('div',{},[el('label',{},'Days to close'),days]),el('div',{},[el('label',{},'Inspection days'),inspection]),el('div',{},[el('label',{},'Financing'),financing]),el('div',{},[el('label',{},'Offer expires'),expires])]),
      el('label', {}, 'Additional terms'), terms, ob, ost
    ]));

    const msg = el('textarea', { placeholder: 'Ask about access, condition, or title…' });
    const mst = el('div', { class: 'okmsg' });
    const mb = el('button', { class: 'submitbtn' }, 'Send message');
    mb.onclick = async () => {
      if (!msg.value.trim()) return;
      try { await api('POST', '/api/messages', { toUserId: owner.id, listingId: listing.id, body: msg.value.trim() }); msg.value = ''; await refreshUnread(); go('chat', { chatUserId: owner.id }); }
      catch (e) { mst.className = 'errmsg'; mst.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'dsection' }, [el('h3', {}, 'Message the seller'), msg, mb, mst]));
  }

  if (state.user && (state.user.id === owner.id || (listing.companyId && state.user.companyId === listing.companyId) || state.access?.adminUnlimited)) {
    wrap.appendChild(el('div',{class:'dsection owner-ops'},[el('h3',{},'Deal operations'),el('div',{class:'owner-ops-actions'},[el('button',{class:'btn-primary',onclick:()=>go('dealroom',{detailId:listing.id})},'Open deal room'),el('button',{class:'btn-ghost',onclick:async()=>{await api('POST','/api/pipeline',{listingId:listing.id,title:listing.address,stage:'dispo'});toast('Added to pipeline','ok');go('pipeline');}},'Add to pipeline'),el('button',{class:'btn-ghost',onclick:()=>go('analytics',{detailId:listing.id})},'Listing analytics')]) ]));
  }

  if (state.user) {
    try {
      const sh = await api('GET', '/api/listings/' + encodeURIComponent(listing.id) + '/showings');
      const future = (sh.slots || []).filter(x => new Date(x.at) > new Date());
      if (future.length || sh.canManage) {
        const sec = el('div', { class:'dsection showingpanel' });
        sec.appendChild(el('div', { class:'sectioneyebrow' }, 'SHOWING SCHEDULER'));
        sec.appendChild(el('h3', {}, sh.canManage ? 'Coordinate property access' : 'Reserve a showing time'));
        const list = el('div', { class:'showinglist' });
        const drawSlots = slots => {
          list.innerHTML='';
          if (!slots.length) list.appendChild(el('div',{class:'hint'},sh.canManage ? 'No showing windows yet. Add one below.' : 'No showing windows are currently available. Message the seller to coordinate access.'));
          slots.forEach(slot => {
            const when = new Date(slot.at).toLocaleString([], {weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
            const actions=[];
            if (sh.canManage) actions.push(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm('Remove this showing time?'))return;await api('DELETE',`/api/listings/${listing.id}/showings/${slot.id}`);render();}},'Remove'));
            else if (!slot.booked) actions.push(el('button',{class:'btn-primary compactbtn',onclick:async()=>{try{await api('POST',`/api/listings/${listing.id}/showings/${slot.id}/book`);toast('Showing reserved','ok');render();}catch(e){toast(e.message,'err')}}},'Reserve'));
            list.appendChild(el('div',{class:'showingrow'},[el('div',{class:'grow'},[el('b',{},when),slot.note?el('div',{class:'hint'},slot.note):null,slot.booked?el('div',{class:'hint'},sh.canManage ? `Reserved${slot.bookedName ? ' by '+slot.bookedName : ''}` : 'Reserved'):null]),...actions]));
          });
        };
        drawSlots(future); sec.appendChild(list);
        if (sh.canManage) {
          const dt=el('input',{type:'datetime-local'}), note=el('input',{placeholder:'Access note (optional)'}), add=el('button',{class:'btn-primary'},'Add showing window');
          add.onclick=async()=>{try{if(!dt.value)throw new Error('Choose a date and time.');await api('POST','/api/listings/'+listing.id+'/showings',{at:new Date(dt.value).toISOString(),note:note.value});toast('Showing window added','ok');render();}catch(e){toast(e.message,'err')}};
          sec.appendChild(el('div',{class:'showingadd'},[dt,note,add]));
        }
        wrap.appendChild(sec);
      }
    } catch {}
  }

  if (otherListings.length) {
    wrap.appendChild(el('div', { class: 'dsection' }, [
      el('h3', {}, 'More from ' + owner.name),
      el('div', { class: 'minigrid' }, otherListings.map(o => el('div', { class: 'minicard', onclick: () => go('detail', { detailId: o.id, photoIdx: 0 }) }, [
        el('div', { class: 'mi' }, o.photos?.length ? el('img', { src: o.photos[0] }) : null),
        el('div', { class: 'mt' }, [el('b', {}, o.address), el('span', {}, money(o.asking))])
      ])))
    ]));
  }

  if (state.user && state.user.id === owner.id) {
    const command = el('div', { class:'dsection dealcommand' });
    command.appendChild(el('div',{class:'sectioneyebrow'},'DEAL COMMAND CENTER'));
    command.appendChild(el('h3',{},'Keep the deal moving'));
    command.appendChild(el('div',{class:'hint'},'Private operating notes, stage and tasks stay with this deal. They are not shown to buyers.'));
    try {
      const {room}=await api('GET','/api/listings/'+encodeURIComponent(listing.id)+'/deal-room');
      const stage=el('select',{},[['intake','Intake'],['marketing','Marketing'],['buyer-interest','Buyer interest'],['negotiation','Negotiation'],['title','Title / due diligence'],['closing','Closing'],['closed','Closed'],['on-hold','On hold']].map(([v,l])=>el('option',{value:v,selected:room.stage===v?'selected':null},l)));
      const next=el('input',{value:room.nextAction||'',placeholder:'Next action — e.g. Follow up with buyer Friday'});
      const notes=el('textarea',{placeholder:'Private deal notes…',rows:'4'},room.privateNotes||'');
      const taskList=el('div',{class:'dealtasks'}); let tasks=(room.tasks||[]).map(x=>({...x}));
      const paintTasks=()=>{taskList.innerHTML='';tasks.forEach((t,i)=>{const cb=el('input',{type:'checkbox'});cb.checked=!!t.done;cb.onchange=()=>t.done=cb.checked;const tx=el('input',{value:t.text,placeholder:'Task'});tx.oninput=()=>t.text=tx.value;const rm=el('button',{class:'iconremove',title:'Remove task',onclick:()=>{tasks.splice(i,1);paintTasks();}},'×');taskList.appendChild(el('div',{class:'dealtask'},[cb,tx,rm]));});}; paintTasks();
      const addTask=el('button',{class:'btn-ghost compactbtn',onclick:()=>{tasks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),text:'',done:false});paintTasks();}},'+ Add task');
      const save=el('button',{class:'btn-primary'},'Save deal room');
      save.onclick=async()=>{try{await api('PATCH','/api/listings/'+listing.id+'/deal-room',{stage:stage.value,nextAction:next.value,privateNotes:notes.value,tasks});toast('Deal room saved','ok');}catch(e){toast(e.message,'err')}};
      command.appendChild(el('div',{class:'dealcommandgrid'},[el('div',{},[el('label',{},'Stage'),stage]),el('div',{},[el('label',{},'Next action'),next])]));
      command.appendChild(el('label',{},'Tasks')); command.appendChild(taskList); command.appendChild(addTask); command.appendChild(el('label',{},'Private notes')); command.appendChild(notes); command.appendChild(save);
    } catch(e) { command.appendChild(el('div',{class:'errmsg'},e.message)); }
    wrap.appendChild(command);

    const dispo = el('div', { class: 'dsection betterdispopanel' });
    dispo.appendChild(el('div', { class: 'dispoeyebrow' }, 'BETTER DISPO'));
    dispo.appendChild(el('h3', {}, 'Move this deal'));
    const matchHost = el('div', { class: 'matchsummary' }, 'Checking buyer demand…');
    dispo.appendChild(matchHost);
    try {
      const m = await api('GET', '/api/listings/' + encodeURIComponent(listing.id) + '/matches');
      matchHost.innerHTML = '';
      matchHost.appendChild(el('div', { class: 'matchbig' }, String(m.totalMatches || 0)));
      matchHost.appendChild(el('div', {}, [el('b', {}, `buyer${m.totalMatches === 1 ? '' : 's'} currently match this deal`), el('div', { class: 'hint' }, m.publicMatches?.length ? `${m.publicMatches.length} have public buy boxes you can review now.` : 'Private buy boxes can still receive matching-deal alerts without exposing their criteria.') ]));
      const notify = el('button', { class: 'btn-primary' }, 'Notify matching buyers');
      notify.onclick = async () => { notify.disabled = true; notify.textContent = 'Notifying…'; try { const r = await api('POST', '/api/listings/' + encodeURIComponent(listing.id) + '/notify-matches'); toast(`${r.notified} matched buyer${r.notified === 1 ? '' : 's'} notified.`, 'ok'); notify.textContent = 'Buyers notified'; } catch (e) { toast(e.message, 'err'); notify.disabled = false; notify.textContent = 'Notify matching buyers'; } };
      dispo.appendChild(notify);
      if (m.publicMatches?.length) {
        const pm = el('div', { class: 'publicmatchlist' });
        m.publicMatches.slice(0,6).forEach(x => pm.appendChild(el('div', { class: 'publicmatchrow' }, [avatarNode(x.user, 'small'), el('div', { class: 'grow' }, [el('b', {}, x.user.name), el('div', { class: 'hint' }, [x.buyBox.label, x.buyBox.strategy, ...(x.buyBox.cities || [])].filter(Boolean).slice(0,3).join(' · '))]), el('button', { onclick: () => go('chat', { chatUserId: x.user.id }) }, 'Message')])));
        dispo.appendChild(pm);
      }
    } catch (e) { matchHost.textContent = e.message; }

    const distHost = el('div', { class: 'distributionbox' });
    try {
      const { pack } = await api('GET', '/api/listings/' + encodeURIComponent(listing.id) + '/distribution');
      distHost.appendChild(el('h4', {}, 'Post once → distribute everywhere'));
      distHost.appendChild(el('div', { class: 'hint' }, 'These are ready to paste into the channels you already use. Nothing is auto-posted without you choosing to share it.'));
      const grid = el('div', { class: 'distributiongrid' });
      [['Facebook', pack.facebook], ['Instagram', pack.instagram], ['SMS', pack.sms], ['Buyer email', pack.emailBody]].forEach(([label, text]) => grid.appendChild(el('button', { class: 'distbtn', onclick: () => copyTextValue(text, label + ' copy copied') }, [el('b', {}, label), el('span', {}, 'Copy')])));
      grid.appendChild(el('button', { class: 'distbtn', onclick: () => copyTextValue(pack.url, 'Public deal link copied') }, [el('b', {}, 'Deal link'), el('span', {}, 'Copy') ]));
      grid.appendChild(el('button', { class: 'distbtn', onclick: () => openDealFlyer(pack, listing) }, [el('b', {}, 'Deal flyer'), el('span', {}, 'Print / PDF') ]));
      grid.appendChild(el('button', { class: 'distbtn', onclick: () => downloadStoryCard(pack, listing) }, [el('b', {}, 'Story card'), el('span', {}, 'Download 9:16 PNG') ]));
      if (navigator.share) grid.appendChild(el('button', { class: 'distbtn', onclick: async () => { try { await navigator.share({ title: pack.flyer?.headline || 'Property deal', text: pack.sms, url: pack.url }); } catch {} } }, [el('b', {}, 'Share'), el('span', {}, 'Open share sheet') ]));
      distHost.appendChild(grid);
    } catch (e) { distHost.appendChild(el('div', { class: 'errmsg' }, e.message)); }
    dispo.appendChild(distHost);

    const freshnessActions = el('div', { class: 'freshnessactions' });
    freshnessActions.appendChild(el('button', { class: 'btn-ghost', onclick: async () => { try { await api('POST', '/api/listings/' + encodeURIComponent(listing.id) + '/confirm-active'); toast('Listing confirmed active for 14 more days.', 'ok'); render(); } catch (e) { toast(e.message, 'err'); } } }, '✓ Still available'));
    freshnessActions.appendChild(el('button', { class: 'btn-ghost', onclick: async () => { if (!confirm('Archive this listing? It will disappear from public feeds but will not be deleted.')) return; try { await api('POST', '/api/listings/' + encodeURIComponent(listing.id) + '/archive'); toast('Listing archived.', 'ok'); go('me'); } catch (e) { toast(e.message, 'err'); } } }, 'Archive listing'));
    dispo.appendChild(freshnessActions);
    dispo.appendChild(el('div', { class: 'row2', style: 'margin-top:12px' }, [
      el('button', { class: 'submitbtn', onclick: () => go('promote', { detailId: listing.id }) }, 'Promote listing'),
      el('button', { class: 'btn-ghost', onclick: () => go('analytics', { detailId: listing.id }) }, 'View analytics')
    ]));
    wrap.appendChild(dispo);
  }
  return wrap;
}

/* deal calculator — client side, no data leaves the page */
function dealCalculator(listing) {
  const box = el('div', { class: 'calcbox' });
  const arv = el('input', { type: 'number', value: listing.arv || '' });
  const rehab = el('input', { type: 'number', value: listing.rehab || 0 });
  const out = el('div');
  function calc() {
    const a = Number(arv.value) || 0, r = Number(rehab.value) || 0, p = listing.asking;
    const maoSeventy = a * 0.7 - r;
    const closing = a * 0.03 + p * 0.02;
    const profit = a - p - r - closing;
    const roi = p + r > 0 ? (profit / (p + r) * 100) : 0;
    out.innerHTML = '';
    [['Purchase price', money(p), ''], ['Rehab estimate', money(r), ''], ['Est. closing + holding', money(Math.round(closing)), ''],
     ['70% rule max offer', money(Math.round(maoSeventy)), maoSeventy >= p ? 'g' : 'r']].forEach(([l, v, c]) => {
      out.appendChild(el('div', { class: 'calcrow' }, [el('span', {}, l), el('span', { class: c }, v)]));
    });
    out.appendChild(el('div', { class: 'calcrow total' }, [
      el('span', {}, 'Projected profit'),
      el('span', { class: profit > 0 ? 'g' : 'r' }, money(Math.round(profit)) + ` (${roi.toFixed(0)}% ROI)`)
    ]));
  }
  arv.oninput = calc; rehab.oninput = calc;
  box.appendChild(twoUp('ARV ($)', arv, 'Rehab budget ($)', rehab));
  box.appendChild(out); calc();
  return el('div', { class: 'dsection' }, [el('h3', {}, 'Deal calculator'), box]);
}

/* ================= UPGRADE / PLANS ================= */
function renderUpgrade() {
  const p = state.pricing;
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, 'Plans'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Browse the feed free forever. Upgrade when you want unlimited unlocks — or the full toolkit.'));

  const st = el('div', { class: 'okmsg' });
  const adminUnlimited = state.access?.adminUnlimited === true || state.user?.role === 'admin';
  const currentTier = adminUnlimited ? 'admin' : state.access?.wholesale ? 'wholesale' : state.access?.platinum ? 'platinum' : state.access?.pro ? 'pro' : 'free';
  const companySeatAccess = currentTier === 'wholesale' && state.user?.companyId && state.user?.companyRole !== 'owner' && state.user?.plan !== 'wholesale';

  if (adminUnlimited) {
    wrap.appendChild(el('div', { class: 'card', style: 'padding:18px;margin:14px 0;border:1px solid var(--accent)' }, [
      el('h3', { style: 'margin:0 0 6px' }, 'Admin — Unlimited access'),
      el('div', { class: 'sub' }, 'All Better Real Estate platform features are permanently unlocked for this admin account. No subscription, unlock packs, AI quota, buy-box cap, or promotion charge is required.')
    ]));
  }
  if (!adminUnlimited && state.access?.grantPlan && state.access?.grantUntil && new Date(state.access.grantUntil) > new Date()) {
    const grantName = state.access.grantPlan === 'wholesale' ? 'Wholesale Teams' : state.access.grantPlan === 'platinum' ? 'Platinum' : 'Plus';
    wrap.appendChild(el('div', { class: 'grantbanner' }, [
      el('div', {}, [el('b', {}, `Complimentary ${grantName}`), el('div', { class: 'hint' }, `Granted through ${new Date(state.access.grantUntil).toLocaleDateString()}${state.access.grantReason ? ' · ' + state.access.grantReason : ''}. It expires automatically and does not cancel any paid subscription.`)]),
      el('span', { class: 'pill good' }, 'FREE ACCESS')
    ]));
  }

  wrap.appendChild(el('div', { class: 'tiergrid4' }, [
    tierCard({
      key: 'platinum', name: p.platinum.label, tagline: 'The full toolkit for active investors',
      priceLine: cents(p.platinum.monthly) + '/mo or ' + cents(p.platinum.annual) + '/yr',
      featured: true,
      perks: [
        'Everything in Plus, plus:',
        'First-look alerts — emailed the instant a match posts, before anyone else sees it',
        'Up to 5 buy boxes running at once',
        'Seller verification included free (normally ' + cents(p.verificationFee) + ')',
        'One free Super Boost every month (normally ' + cents(p.promotions.superboost.price) + ')',
        'Unlimited AI listing assistant — titles, descriptions and photo-aware drafts',
        'Unlimited Better Dispo AI enhancement, buyer matching and distribution tools',
        'Marketplace fee cut to ' + (p.platinumFeeBps / 100) + '% (from ' + (p.marketplaceFeeBps / 100) + '%)',
        'Investor workspace — compare saved properties, keep deal notes'
      ],
      current: currentTier === 'platinum',
      onMonthly: adminUnlimited ? null : () => subscribeTo('platinum', 'monthly', st),
      onAnnual: adminUnlimited ? null : () => subscribeTo('platinum', 'annual', st)
    }),
    tierCard({
      key: 'wholesale', name: p.wholesale.label, tagline: 'For professional wholesale teams',
      priceLine: cents(p.wholesale.monthly) + '/mo or ' + cents(p.wholesale.annual) + '/yr',
      perks: [
        'Everything in Platinum for the whole team',
        `${p.wholesale.seats} secure individual team seats`,
        'Branded company profile and company workspace',
        'Shared team property inventory',
        'Shared company-listing inquiry inbox',
        'Company acquisition buy box and team analytics',
        'Company buyer-list capture page',
        'Owner, admin and member permissions'
      ],
      current: currentTier === 'wholesale',
      onMonthly: adminUnlimited || companySeatAccess ? null : () => subscribeTo('wholesale', 'monthly', st),
      onAnnual: adminUnlimited || companySeatAccess ? null : () => subscribeTo('wholesale', 'annual', st)
    }),
    tierCard({
      key: 'pro', name: p.pro.label, tagline: 'For anyone unlocking regularly',
      priceLine: cents(p.pro.monthly) + '/mo or ' + cents(p.pro.annual) + '/yr',
      perks: ['Unlimited listing unlocks', 'Analytics on your own listings', 'Plus badge on your profile', 'AI Deal Builder — 5 analyses per day', 'AI listing assistant — 2 drafts per day', 'Better Dispo AI enhancement — 3 imports per day'],
      current: currentTier === 'pro',
      onMonthly: adminUnlimited ? null : () => subscribeTo('pro', 'monthly', st),
      onAnnual: adminUnlimited ? null : () => subscribeTo('pro', 'annual', st)
    }),
    tierCard({
      key: 'free', name: 'Free', tagline: '7-day trial, then pay as you browse',
      priceLine: 'Free',
      perks: ['Browse the whole feed, always', '5 free listing unlocks', `${cents(p.unlockCredit)} per unlock after that`, 'Smart deal-import parser and public buyer-list page'],
      current: currentTier === 'free'
    })
  ]));

  if (companySeatAccess) wrap.appendChild(el('div', { class: 'hint', style: 'margin-top:10px' }, 'Your Wholesale Teams access is provided by your company. Billing is managed by the company owner.'));
  if (currentTier === 'wholesale' && !companySeatAccess) wrap.appendChild(el('button', { class: 'btn-ghost', style: 'margin-top:12px', onclick: () => go('companyworkspace') }, state.user.companyId ? 'Open company workspace' : 'Set up company workspace'));
  wrap.appendChild(st);

  const paidTier = state.access?.paidPlan || state.user?.plan || 'free';
  const paidUntil = state.access?.paidPlanUntil || state.user?.planUntil || null;
  if (!adminUnlimited && paidTier !== 'free' && paidUntil && new Date(paidUntil) > new Date() && !companySeatAccess) {
    const paidName = paidTier === 'wholesale' ? 'Wholesale Teams' : paidTier === 'platinum' ? 'Platinum' : 'Plus';
    const cst = el('div', { class: 'okmsg' });
    const cancelBtn = el('button', { class: 'btn-ghost' }, 'Cancel auto-renewal');
    cancelBtn.onclick = async () => {
      if (!confirm(`Stop future automatic charges? You keep ${paidName} until ${new Date(paidUntil).toLocaleDateString()}, then it won't renew.`)) return;
      try {
        const r = await api('POST', '/api/billing/cancel');
        await refreshMe();
        cst.textContent = r.cancelsAtPeriodEnd ? `Won't renew — paid access stays active until ${new Date(paidUntil).toLocaleDateString()}.` : 'Cancelled.';
        render();
      } catch (e) { cst.className = 'errmsg'; cst.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'card', style: 'padding:16px;margin:18px 0' }, [
      el('div', { class: 'hint', style: 'margin-bottom:10px' }, `Paid ${paidName} is active through ${new Date(paidUntil).toLocaleDateString()}.${state.access?.grantPlan ? ' Your complimentary grant is tracked separately.' : ''}`),
      cancelBtn, cst
    ]));
  }

  if (!adminUnlimited) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Or just buy unlocks'));
    wrap.appendChild(el('div', { class: 'card', style: 'padding:22px' }, [
      el('h3', { style: 'margin:0 0 4px;font-size:18px' }, `${p.unlockPack.qty} unlock pack`),
      el('div', { style: "font-family:'Bricolage Grotesque',sans-serif;font-size:26px;font-weight:700" }, cents(p.unlockPack.price)),
      el('div', { class: 'sub' }, `${cents(Math.round(p.unlockPack.price / p.unlockPack.qty))} each vs ${cents(p.unlockCredit)} one at a time`),
      el('button', {
        class: 'submitbtn', onclick: async () => {
          try {
            const r = await api('POST', '/api/billing/unlock-pack');
            await handlePurchaseResponse(r, 'Credits added.', async () => { await refreshMe(); render(); });
          } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
        }
      }, 'Buy pack')
    ]));
  }
  return wrap;
}

async function subscribeTo(tier, period, st) {
  try {
    const r = await api('POST', '/api/billing/subscribe', { period, tier });
    if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    await handlePurchaseResponse(r, `${tier === 'wholesale' ? 'Wholesale Teams' : tier === 'platinum' ? 'Platinum' : 'Plus'} active — billed ${period}.`, async () => { await refreshMe(); render(); });
  } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
}

function tierCard({ key, name, tagline, priceLine, perks, current, featured, onMonthly, onAnnual }) {
  const card = el('div', { class: 'tiercard' + (featured ? ' featured' : '') + (key === 'wholesale' ? ' teamfeatured' : '') });
  if (featured) card.appendChild(el('div', { class: 'tierribbon' }, 'MOST POWERFUL'));
  card.appendChild(el('h3', { class: 'tiercard-name' }, name));
  card.appendChild(el('div', { class: 'tiercard-tagline' }, tagline));
  card.appendChild(el('div', { class: 'tiercard-price' }, priceLine));
  const list = el('ul', { class: 'tiercard-perks' });
  perks.forEach(p => list.appendChild(el('li', {}, p)));
  card.appendChild(list);
  if (current) {
    card.appendChild(el('div', { class: 'pill good', style: 'display:inline-block;margin-top:10px' }, 'Your current plan'));
  } else if (onMonthly) {
    card.appendChild(el('div', { class: 'planperiodactions' }, [
      el('button', { class: 'planperiodbtn', onclick: onMonthly }, 'Monthly'),
      el('button', { class: 'planperiodbtn', onclick: onAnnual }, 'Annual')
    ]));
  }
  return card;
}

/* ================= WALLET ================= */
async function renderWallet() {
  const w = await api('GET', '/api/wallet');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, 'Wallet'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Cash earnings and Better Credits stay clearly separated. Seller proceeds are real cash and can be withdrawn after payout setup.'));

  const st = el('div', { class: 'okmsg' });
  wrap.appendChild(el('div', { class: 'balancecard' }, [
    el('div', { class: 'l' }, 'Cash wallet balance'),
    el('div', { class: 'v' }, cents(w.balance)),
    el('div', { class: 'btns' }, [
      el('button', { class: 'solid', onclick: async () => {
        const amt = prompt('Top up how much? (dollars)', '25');
        if (!amt) return;
        try {
          const r = await api('POST', '/api/wallet/deposit', { amount: Math.round(Number(amt) * 100) });
          await handlePurchaseResponse(r, 'Funds added.', async () => render());
        } catch (e) { toast(e.message, 'err'); }
      } }, 'Add funds'),
      el('button', { onclick: async () => {
        const amt = prompt('Withdraw how much? (dollars)', String((w.balance / 100).toFixed(2)));
        if (!amt) return;
        try { await api('POST', '/api/wallet/withdraw', { amount: Math.round(Number(amt) * 100) }); render(); }
        catch (e) { toast(e.message, 'err'); }
      } }, 'Withdraw')
    ])
  ]));
  wrap.appendChild(el('div',{class:'wallet-balance-grid'},[
    el('div',{class:'wallet-balance-tile'},[el('small',{},'SELLER PROCEEDS EARNED'),el('b',{},cents(w.sellerEarnings||0)),el('span',{},'Real cash from your marketplace sales')]),
    el('div',{class:'wallet-balance-tile'},[el('small',{},'WITHDRAWABLE CASH'),el('b',{},cents(w.withdrawableBalance||0)),el('span',{},'Eligible cash balance available for payout')]),
    el('div',{class:'wallet-balance-tile credit'},[el('small',{},'BETTER CREDITS'),el('b',{},cents(w.betterCredit||0)),el('span',{},'Platform credit only · never cash-withdrawable')])
  ]));

  // payment methods
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Payment methods'));
  const pmBox = el('div', { class: 'card' });
  if (!w.paymentMethods.length) pmBox.appendChild(el('div', { class: 'cardchip' }, el('div', { class: 'dt' }, 'No card on file.')));
  w.paymentMethods.forEach(pm => pmBox.appendChild(el('div', { class: 'cardchip' }, [
    el('div', { class: 'brandbox' }, pm.brand),
    el('div', { class: 'grow' }, [el('div', { class: 'd' }, '•••• •••• •••• ' + pm.last4), el('div', { class: 'dt' }, `Expires ${pm.expMonth || '--'}/${pm.expYear || '--'}`)]),
    el('button', { onclick: async () => { await api('DELETE', '/api/wallet/payment-methods/' + pm.id); render(); } }, 'Remove')
  ])));
  wrap.appendChild(pmBox);

  const num = el('input', { placeholder: '4242 4242 4242 4242', inputmode: 'numeric' });
  const mm = el('input', { placeholder: 'MM', inputmode: 'numeric' });
  const yy = el('input', { placeholder: 'YYYY', inputmode: 'numeric' });
  const addSt = el('div', { class: 'errmsg' });
  const addBtn = el('button', { class: 'submitbtn' }, 'Add card');
  addBtn.onclick = async () => {
    const digits = num.value.replace(/\D/g, '');
    if (digits.length < 13) { addSt.textContent = 'That card number looks too short.'; return; }
    // Derive brand + last4 in the browser. The full number is never sent anywhere.
    const brand = /^4/.test(digits) ? 'VISA' : /^5[1-5]/.test(digits) ? 'MC' : /^3[47]/.test(digits) ? 'AMEX' : /^6/.test(digits) ? 'DISC' : 'CARD';
    try {
      await api('POST', '/api/wallet/payment-methods', {
        brand, last4: digits.slice(-4), expMonth: mm.value, expYear: yy.value,
        token: 'pm_local_' + Math.random().toString(36).slice(2, 12)
      });
      num.value = mm.value = yy.value = ''; render();
    } catch (e) { addSt.textContent = e.message; }
  };
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Add a card'));
  wrap.appendChild(el('div', { class: 'card', style: 'padding:16px' }, [
    el('label', {}, 'Card number'), num,
    twoUp('Exp month', mm, 'Exp year', yy),
    addBtn, addSt,
    el('div', { class: 'hint' }, state.stripe
      ? 'Real payments are handled by Stripe\'s own secure card form at checkout — your card number never reaches this server. This saved-card list is only used as a fallback before Stripe is fully configured.'
      : 'Card payments are not live on this site yet. Your full card number never leaves this page even so — only the brand and last four digits are derived and stored, as a placeholder until Stripe is connected.')
  ]));

  // payout — Stripe Connect: the user links their own bank account
  // directly with Stripe. Once linked, withdrawals above are automatic.
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Payout account'));
  const payoutBox = el('div', { class: 'card', style: 'padding:16px' });
  const pSt = el('div', { class: 'errmsg' });
  let statusLine = el('div', { class: 'hint' }, 'Checking your payout status…');
  payoutBox.appendChild(statusLine);
  const pBtn = el('button', { class: 'submitbtn' }, 'Set up payouts');
  pBtn.onclick = async () => {
    try {
      const r = await api('POST', '/api/wallet/payout-method');
      if (r.url) window.location.href = r.url;
    } catch (e) { pSt.textContent = e.message; }
  };
  payoutBox.appendChild(pBtn);
  payoutBox.appendChild(pSt);
  wrap.appendChild(payoutBox);
  api('GET', '/api/wallet/payout-status').then(({ status }) => {
    if (status?.payoutsEnabled) {
      statusLine.textContent = '✓ Payouts are set up. Withdrawals above go straight to your bank.';
      statusLine.className = 'hint';
      pBtn.textContent = 'Update payout details';
    } else if (status) {
      statusLine.textContent = 'Almost there — finish the form Stripe opened to activate payouts.';
    } else {
      statusLine.textContent = 'Link a bank account so withdrawals can be sent automatically — no need to wait on anyone to process it by hand.';
    }
  }).catch(() => {});

  // ledger
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Activity'));
  const led = el('div', { class: 'card' });
  if (!w.ledger.length) led.appendChild(el('div', { class: 'ledrow' }, el('div', { class: 'dt' }, 'No activity yet.')));
  w.ledger.forEach(l => led.appendChild(el('div', { class: 'ledrow' }, [
    el('div', { class: 'grow' }, [el('div', { class: 'd' }, l.description), el('div', { class: 'dt' }, new Date(l.at).toLocaleString())]),
    el('div', { class: 'amt ' + (l.amount > 0 ? 'pos' : 'neg') }, (l.amount > 0 ? '+' : '') + cents(l.amount))
  ])));
  wrap.appendChild(led);
  wrap.appendChild(st);
  return wrap;
}

/* ================= SHOP ================= */
async function renderShop() {
  const wrap = el('div', { class: 'page' });
  const { categories } = await api('GET', '/api/shop/categories');
  wrap.appendChild(el('h2', {}, 'Marketplace'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Furniture, flooring, cabinet hardware and fixtures from investors who just finished a rehab — plus certified electrical and appliance items sold directly by Better Real Estate.'));

  const search = el('input', { placeholder: 'Search items…', value: state.shopQ });
  search.onchange = () => { state.shopQ = search.value; render(); };
  wrap.appendChild(search);

  const chips = el('div', { class: 'chiprow', style: 'margin-top:14px' });
  ['All', ...categories].forEach(c => {
    const b = el('button', { class: state.shopCat === c ? 'on' : '' }, c);
    b.onclick = () => { state.shopCat = c; render(); };
    chips.appendChild(b);
  });
  wrap.appendChild(chips);

  const shopActions = el('div', { class: 'shopactions' }, [
    el('button', { class: 'btn-primary', onclick: () => go('sellitem') }, '＋ Sell an item'),
    el('button', { class: 'btn-ghost', onclick: () => go('shopmanage') }, state.user?.role === 'admin' ? 'Manage shop listings' : 'My shop listings')
  ]);
  wrap.appendChild(shopActions);

  const { items } = await api('GET', `/api/shop/items?category=${encodeURIComponent(state.shopCat)}&q=${encodeURIComponent(state.shopQ)}`);
  if (!items.length) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Nothing here yet'), el('p', {}, 'Be the first to list something.')])); return wrap; }

  const grid = el('div', { class: 'shopgrid' });
  items.forEach(i => {
    const openItem = () => go('shopitem', { shopItemId: i.id });
    const btn = el('button', { onclick: openItem }, 'View item');
    const photo = el('div', { class: 'si', onclick: openItem, style: 'cursor:pointer' }, i.photos?.length ? el('img', { src: i.photos[0], alt: i.title }) : 'No photo');
    const title = el('button', { class: 'shopcard-title', onclick: openItem }, i.title);
    grid.appendChild(el('div', { class: 'shopcard' }, [
      photo,
      el('div', { class: 'sb' }, [
        title,
        el('div', { class: 'p' }, cents(i.price)),
        el('div', { class: 'm' }, i.dropship ? i.condition : [i.condition, i.location].filter(Boolean).join(' · ')),
        el('div', { class: 'm' }, i.dropship ? 'Ships direct · ' + (i.shipDays || '3-7') + ' days' : 'by ' + i.sellerName)
      ]),
      btn
    ]));
  });
  wrap.appendChild(grid);
  return wrap;
}

async function renderShopItem() {
  const wrap = el('div', { class: 'page shopdetailpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('shop') }, '← Marketplace'));
  if (!state.shopItemId) {
    wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Product not selected'), el('p', {}, 'Go back to the marketplace and choose an item.') ]));
    return wrap;
  }

  const { item } = await api('GET', `/api/shop/items/${encodeURIComponent(state.shopItemId)}`);
  const addressAuto = item.dropship && state.user
    ? await api('GET', '/api/address/config').catch(() => ({ enabled: false }))
    : { enabled: false };
  const photos = Array.isArray(item.photos) ? item.photos.filter(Boolean) : [];
  const mainMedia = el('div', { class: 'productmainphoto' });
  let mainImg = null;
  if (photos.length) {
    mainImg = el('img', { src: photos[0], alt: item.title });
    mainMedia.appendChild(mainImg);
  } else {
    mainMedia.appendChild(el('div', { class: 'productnophoto' }, 'No photo available'));
  }
  const thumbs = el('div', { class: 'productthumbs' });
  photos.forEach((src, idx) => {
    const thumb = el('button', { class: idx === 0 ? 'active' : '' }, el('img', { src, alt: `${item.title} photo ${idx + 1}` }));
    thumb.onclick = () => {
      if (mainImg) mainImg.src = src;
      [...thumbs.children].forEach(x => x.classList.remove('active'));
      thumb.classList.add('active');
    };
    thumbs.appendChild(thumb);
  });

  const gallery = el('div', { class: 'productgallery' }, [mainMedia, thumbs]);
  const info = el('div', { class: 'productinfo' });
  info.appendChild(el('div', { class: 'productcategory' }, item.category || 'Marketplace'));
  info.appendChild(el('h1', {}, item.title));
  info.appendChild(el('div', { class: 'productprice' }, cents(item.price)));
  info.appendChild(el('div', { class: 'productmetarow' }, [
    el('span', {}, item.condition || 'New'),
    el('span', {}, item.stock > 0 ? `${item.stock} in stock` : 'Out of stock'),
    item.dropship ? el('span', {}, `Ships direct${item.shipDays ? ` · ${item.shipDays} days` : ''}`) : el('span', {}, item.location || 'Seller arranged')
  ]));

  if (item.variant) info.appendChild(el('div', { class: 'productdetailrow' }, [el('b', {}, 'Option'), el('span', {}, item.variant)]));
  if (item.weightGrams) info.appendChild(el('div', { class: 'productdetailrow' }, [el('b', {}, 'Weight'), el('span', {}, `${item.weightGrams} g`)]));
  if (item.dimensionsMm) info.appendChild(el('div', { class: 'productdetailrow' }, [el('b', {}, 'Dimensions'), el('span', {}, `${item.dimensionsMm.length} × ${item.dimensionsMm.width} × ${item.dimensionsMm.height} mm`)]));

  info.appendChild(el('div', { class: 'productsectiontitle' }, 'Product details'));
  info.appendChild(el('div', { class: 'productdescription' }, item.description || 'No additional description was provided.'));

  const checkout = el('div', { class: 'productcheckout' });
  checkout.appendChild(el('h3', {}, item.dropship ? 'Delivery & checkout' : 'Order this item'));
  const checkoutStatus = el('div', { class: 'errmsg' });

  if (item.dropship) {
    checkout.appendChild(el('div', { class: 'checkoutnote' }, 'Enter the delivery address to calculate shipping before payment. Saved browser addresses can fill these fields automatically.'));
    const line1 = el('input', {
      placeholder: 'Start typing your street address',
      name: 'shipping-address-line1',
      autocomplete: 'shipping address-line1',
      inputmode: 'text'
    });
    const line2 = el('input', {
      placeholder: 'Apartment, suite, unit (optional)',
      name: 'shipping-address-line2',
      autocomplete: 'shipping address-line2'
    });
    const city = el('input', { placeholder: 'City', name: 'shipping-city', autocomplete: 'shipping address-level2' });
    const stateCode = el('input', { placeholder: 'State (e.g. NJ)', name: 'shipping-state', autocomplete: 'shipping address-level1', maxlength: '30' });
    const zip = el('input', { placeholder: 'ZIP code', name: 'shipping-postal-code', autocomplete: 'shipping postal-code', inputmode: 'numeric' });
    const phone = el('input', { placeholder: 'Phone (optional)', name: 'shipping-phone', autocomplete: 'shipping tel', inputmode: 'tel' });
    const quoteBox = el('div', { class: 'quotesummary muted' }, 'Shipping has not been calculated yet.');
    const quoteBtn = el('button', { class: 'btn-ghost productquote' }, 'Calculate shipping');
    const buyBtn = el('button', { class: 'submitbtn', disabled: 'disabled' }, 'Continue to payment');
    let quote = null;

    const shippingPayload = () => ({
      name: state.user?.name || '',
      line1: line1.value.trim(), line2: line2.value.trim(), city: city.value.trim(), state: stateCode.value.trim(), zip: zip.value.trim(),
      phone: phone.value.trim(), country: 'United States', countryCode: 'US'
    });
    const invalidateQuote = () => {
      quote = null;
      buyBtn.disabled = true;
      quoteBox.className = 'quotesummary muted';
      quoteBox.textContent = 'Address changed — calculate shipping again.';
    };
    [line1, line2, city, stateCode, zip, phone].forEach(input => input.addEventListener('input', invalidateQuote));

    const addressWrap = el('div', { class: 'addressautocomplete' }, line1);
    const suggestionBox = el('div', { class: 'addresssuggestions', hidden: 'hidden' });
    addressWrap.appendChild(suggestionBox);
    let addressTimer = null;
    let addressSeq = 0;
    let addressSessionToken = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
    const hideAddressSuggestions = () => {
      suggestionBox.hidden = true;
      suggestionBox.innerHTML = '';
    };
    const renderAddressSuggestions = suggestions => {
      suggestionBox.innerHTML = '';
      if (!Array.isArray(suggestions) || !suggestions.length) {
        hideAddressSuggestions();
        return;
      }
      suggestions.forEach(suggestion => {
        const btn = el('button', { type: 'button', class: 'addresssuggestion' }, [
          el('span', { class: 'addresssuggestion-main' }, suggestion.mainText || suggestion.text),
          suggestion.secondaryText ? el('span', { class: 'addresssuggestion-sub' }, suggestion.secondaryText) : null
        ]);
        btn.onclick = async () => {
          hideAddressSuggestions();
          line1.value = suggestion.text || line1.value;
          try {
            const r = await api('POST', '/api/address/details', {
              placeId: suggestion.placeId,
              sessionToken: addressSessionToken
            });
            const a = r.address || {};
            if (a.line1) line1.value = a.line1;
            if (a.line2) line2.value = a.line2;
            if (a.city) city.value = a.city;
            if (a.state) stateCode.value = a.state;
            if (a.zip) zip.value = a.zip;
            invalidateQuote();
            addressSessionToken = (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now());
            city.focus();
          } catch {
            // Keep the selected suggestion text even if details are temporarily unavailable.
          }
        };
        suggestionBox.appendChild(btn);
      });
      suggestionBox.appendChild(el('div', { class: 'gmaps-attribution', translate: 'no' }, 'Google Maps'));
      suggestionBox.hidden = false;
    };
    if (addressAuto.enabled) {
      line1.addEventListener('input', () => {
        clearTimeout(addressTimer);
        const q = line1.value.trim();
        if (q.length < 3) {
          addressSeq += 1;
          hideAddressSuggestions();
          return;
        }
        const seq = ++addressSeq;
        addressTimer = setTimeout(async () => {
          try {
            const r = await api('POST', '/api/address/autocomplete', { input: q, sessionToken: addressSessionToken });
            if (seq === addressSeq) renderAddressSuggestions(r.suggestions || []);
          } catch {
            if (seq === addressSeq) hideAddressSuggestions();
          }
        }, 280);
      });
      line1.addEventListener('blur', () => setTimeout(hideAddressSuggestions, 180));
      line1.addEventListener('focus', () => {
        if (suggestionBox.children.length) suggestionBox.hidden = false;
      });
    }

    checkout.appendChild(el('label', {}, 'Street address')); checkout.appendChild(addressWrap);
    checkout.appendChild(el('label', {}, 'Apartment, suite, unit (optional)')); checkout.appendChild(line2);
    checkout.appendChild(el('div', { class: 'checkoutgrid' }, [
      el('div', {}, [el('label', {}, 'City'), city]),
      el('div', {}, [el('label', {}, 'State'), stateCode]),
      el('div', {}, [el('label', {}, 'ZIP code'), zip]),
      el('div', {}, [el('label', {}, 'Country'), el('input', { value: 'United States', name: 'shipping-country', autocomplete: 'shipping country-name', disabled: 'disabled' })])
    ]));
    checkout.appendChild(el('label', {}, 'Phone (optional)')); checkout.appendChild(phone);
    checkout.appendChild(quoteBtn);
    checkout.appendChild(quoteBox);
    checkout.appendChild(buyBtn);
    checkout.appendChild(checkoutStatus);

    quoteBtn.onclick = async () => {
      checkoutStatus.textContent = '';
      const shipping = shippingPayload();
      if (!shipping.line1 || !shipping.city || !shipping.state || !shipping.zip) {
        checkoutStatus.textContent = 'Street, city, state and ZIP are required.';
        return;
      }
      quoteBtn.disabled = true; quoteBtn.textContent = 'Checking shipping…';
      try {
        quote = await api('POST', '/api/shop/shipping-quote', { itemId: item.id, shipping });
        quoteBox.className = 'quotesummary';
        quoteBox.innerHTML = '';
        quoteBox.appendChild(el('div', {}, [el('span', {}, 'Item'), el('b', {}, cents(item.price))]));
        quoteBox.appendChild(el('div', {}, [el('span', {}, 'Shipping'), el('b', {}, cents(quote.shippingCostCents || 0))]));
        if (quote.days) {
          const eta = /day/i.test(String(quote.days)) ? String(quote.days) : `${quote.days} days`;
          quoteBox.appendChild(el('div', { class: 'quoteeta' }, `Estimated delivery: ${eta}`));
        }
        quoteBox.appendChild(el('div', { class: 'quotetotal' }, [el('span', {}, 'Total'), el('b', {}, cents(quote.totalCents))]));
        buyBtn.disabled = false;
      } catch (e) {
        quote = null; buyBtn.disabled = true; quoteBox.className = 'quotesummary muted';
        quoteBox.textContent = 'Shipping could not be calculated for that address.';
        checkoutStatus.textContent = e.message;
      } finally {
        quoteBtn.disabled = false; quoteBtn.textContent = 'Calculate shipping';
      }
    };

    buyBtn.onclick = async () => {
      if (!quote) return;
      buyBtn.disabled = true; buyBtn.textContent = 'Starting checkout…'; checkoutStatus.textContent = '';
      try {
        const r = await api('POST', '/api/shop/buy', { itemId: item.id, shipping: shippingPayload(), expectedTotalCents: quote.totalCents });
        await handlePurchaseResponse(r, 'Purchased — your order is in Profile → Orders', async () => go('orders'));
      } catch (e) {
        checkoutStatus.textContent = e.message;
        quote = null;
        quoteBox.className = 'quotesummary muted';
        quoteBox.textContent = 'Please calculate shipping again before retrying.';
      } finally {
        buyBtn.disabled = !quote;
        buyBtn.textContent = 'Continue to payment';
      }
    };
  } else {
    checkout.appendChild(el('div', { class: 'checkoutnote' }, [
      document.createTextNode(item.location ? `Located in ${item.location}. ` : ''),
      document.createTextNode('After purchase, coordinate pickup or delivery with the seller through your order details.')
    ]));
    const total = el('div', { class: 'quotesummary' }, [
      el('div', { class: 'quotetotal' }, [el('span', {}, 'Total'), el('b', {}, cents(item.price))])
    ]);
    const buyBtn = el('button', { class: 'submitbtn' }, `Buy for ${cents(item.price)}`);
    buyBtn.onclick = async () => {
      buyBtn.disabled = true; buyBtn.textContent = 'Starting checkout…'; checkoutStatus.textContent = '';
      try {
        const r = await api('POST', '/api/shop/buy', { itemId: item.id, shipping: null, expectedTotalCents: item.price });
        await handlePurchaseResponse(r, 'Purchased — your order is in Profile → Orders', async () => go('orders'));
      } catch (e) { checkoutStatus.textContent = e.message; }
      finally { buyBtn.disabled = false; buyBtn.textContent = `Buy for ${cents(item.price)}`; }
    };
    checkout.appendChild(total); checkout.appendChild(buyBtn); checkout.appendChild(checkoutStatus);
  }

  info.appendChild(checkout);
  wrap.appendChild(el('div', { class: 'productdetail' }, [gallery, info]));
  return wrap;
}

async function renderSellItem() {
  const [{ sellableCategories, bannedCategories, feeBps }, aiStatus] = await Promise.all([
    api('GET', '/api/shop/categories'),
    api('GET', '/api/ai/status').catch(() => ({ configured: false, available: false }))
  ]);
  const categories = sellableCategories;
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Sell an item'));
  wrap.appendChild(el('div', { class: 'sub' }, `Better Real Estate takes ${feeBps / 100}% when it sells. The rest lands in your wallet.`));
  wrap.appendChild(el('div', { class: 'policybox' }, [
    el('b', {}, 'No electronics or appliances'),
    document.createTextNode(`Anything mains-powered or battery-powered needs UL/ETL certification to be sold legally, and there is no way to verify that on a private listing — so ${bannedCategories.join(', ')} and any electrical item are not allowed here. Furniture, fixtures, hardware, flooring, doors, cabinets, countertops and hand tools are all welcome.`)
  ]));

  const title = el('input', { placeholder: 'Whirlpool fridge, stainless, 2022' });
  const cat = el('select', {}, categories.map(c => el('option', { value: c }, c)));
  const cond = el('select', {}, ['New in box', 'Like new', 'Used — good', 'Used — fair', 'For parts'].map(c => el('option', { value: c }, c)));
  const price = el('input', { type: 'number', placeholder: '450' });
  const stock = el('input', { type: 'number', value: 1 });
  const loc = el('input', { placeholder: 'Austin, TX' });
  const desc = el('textarea', { placeholder: 'Dimensions, why you\'re selling, pickup details.' });

  state.shopPhotos = [];
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  const preview = el('div', { class: 'previewrow' });
  const picker = el('div', { class: 'picker', onclick: () => fileInput.click() }, 'Add photos (up to 6)');
  fileInput.onchange = async () => {
    for (const f of [...fileInput.files].slice(0, 6 - state.shopPhotos.length)) state.shopPhotos.push(await downscale(f));
    fileInput.value = ''; draw();
  };
  function draw() {
    preview.innerHTML = '';
    state.shopPhotos.forEach((p, i) => preview.appendChild(el('div', { class: 'pv' }, [
      el('img', { src: p }), el('button', { onclick: () => { state.shopPhotos.splice(i, 1); draw(); } }, '×')
    ])));
  }

  wrap.appendChild(el('label', {}, 'Photos')); wrap.appendChild(picker); wrap.appendChild(fileInput); wrap.appendChild(preview);
  wrap.appendChild(el('label', {}, 'Title')); wrap.appendChild(title);
  wrap.appendChild(el('label', {}, 'Category')); wrap.appendChild(cat);
  wrap.appendChild(el('label', {}, 'Condition')); wrap.appendChild(cond);
  wrap.appendChild(twoUp('Price ($)', price, 'Quantity', stock));
  wrap.appendChild(el('label', {}, 'Location')); wrap.appendChild(loc);
  wrap.appendChild(el('label', {}, 'Description')); wrap.appendChild(desc);

  const aiMsg = el('div', { class: 'hint' });
  if (aiStatus.available && aiStatus.configured) {
    const aiBtn = el('button', { class: 'btn-ghost', type: 'button' }, '✨ Write listing with AI');
    aiBtn.onclick = async () => {
      aiBtn.disabled = true; aiBtn.textContent = 'Writing…'; aiMsg.textContent = '';
      try {
        const r = await api('POST', '/api/ai/listing-copy', {
          kind: 'shop',
          facts: { title: title.value, category: cat.value, condition: cond.value, price: price.value, quantity: stock.value, location: loc.value, description: desc.value },
          images: state.shopPhotos.slice(0, 3)
        });
        if (r.draft.title) title.value = r.draft.title;
        if (r.draft.description) desc.value = r.draft.description;
        if (r.draft.categorySuggestion && [...cat.options].some(o => o.value === r.draft.categorySuggestion)) cat.value = r.draft.categorySuggestion;
        aiMsg.textContent = r.draft.warnings?.length ? `AI draft applied. Review before posting. ${r.draft.warnings.join(' ')}` : 'AI draft applied. Review the facts before posting.';
      } catch (e) { aiMsg.textContent = e.message; }
      finally { aiBtn.disabled = false; aiBtn.textContent = '✨ Rewrite with AI'; }
    };
    wrap.appendChild(el('div', { class: 'aibox' }, [el('b', {}, state.access?.platinum || state.access?.wholesale || state.access?.adminUnlimited ? 'Unlimited AI Listing Assistant' : 'Better Plus AI Listing Assistant'), el('div', { class: 'hint' }, 'Uses your entered facts and up to three photos. It is instructed not to invent product details.'), aiBtn, aiMsg]));
  } else if (!state.access?.pro && state.user?.role !== 'admin') {
    wrap.appendChild(el('div', { class: 'aibox' }, [el('b', {}, 'AI listing writing — Better Plus'), el('div', { class: 'hint' }, 'Plus includes 2 AI listing drafts per day. Platinum includes unlimited use.'), el('button', { class: 'btn-ghost', type: 'button', onclick: () => go('upgrade') }, 'See Plus')]));
  }

  const err = el('div', { class: 'errmsg' });
  const sb = el('button', { class: 'submitbtn' }, 'List item');
  sb.onclick = async () => {
    try {
      await api('POST', '/api/shop/items', {
        title: title.value, category: cat.value, condition: cond.value, price: price.value,
        stock: stock.value, location: loc.value, description: desc.value, photos: state.shopPhotos
      });
      state.shopPhotos = []; go('shop');
    } catch (e) { err.textContent = e.message; }
  };
  wrap.appendChild(err); wrap.appendChild(sb);
  return wrap;
}


async function renderShopManage() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('shop') }, '← Marketplace'));
  const { items, admin } = await api('GET', '/api/shop/manage');
  wrap.appendChild(el('h2', {}, admin ? 'Manage shop listings' : 'My shop listings'));
  wrap.appendChild(el('div', { class: 'sub' }, admin
    ? 'Admins can edit, publish, unpublish or remove any marketplace item. Supplier cost stays visible only here.'
    : 'Edit your own marketplace items, update photos or price, temporarily unpublish them, or remove them.'));

  const search = el('input', { placeholder: 'Search your shop listings…', value: state.shopManageQ || '' });
  const listHost = el('div');
  const statsHost = el('div');
  wrap.appendChild(search); wrap.appendChild(statsHost); wrap.appendChild(listHost);

  const draw = () => {
    const q = String(search.value || '').trim().toLowerCase();
    state.shopManageQ = search.value;
    const filtered = items.filter(i => !q || `${i.title} ${i.category} ${i.sellerName || ''}`.toLowerCase().includes(q));
    statsHost.innerHTML = '';
    statsHost.appendChild(el('div', { class: 'shopmanagestats' }, [
      el('span', {}, `${items.filter(i => i.active && i.stock > 0).length} live`),
      el('span', {}, `${items.filter(i => !i.active || i.stock < 1).length} not live`),
      el('span', {}, `${items.reduce((n, i) => n + (i.soldCount || 0), 0)} sold`)
    ]));
    listHost.innerHTML = '';
    if (!filtered.length) {
      listHost.appendChild(el('div', { class: 'empty' }, [el('h3', {}, items.length ? 'No matching items' : 'No shop listings yet'), el('p', {}, items.length ? 'Try a different search.' : 'Post an item from the Shop tab.') ]));
      return;
    }
    const grid = el('div', { class: 'managegrid' });
    filtered.forEach(item => {
      const live = item.active && item.stock > 0;
      const status = live ? 'Live' : (item.stock < 1 ? 'Out of stock' : 'Unpublished');
      const statusClass = live ? 'good' : 'warn';
      const media = el('div', { class: 'managephoto' }, item.photos?.length ? el('img', { src: item.photos[0], alt: item.title }) : 'No photo');
      const meta = [
        el('div', { class: 'managehead' }, [el('span', { class: 'pill ' + statusClass }, status), item.dropship ? el('span', { class: 'pill warn' }, admin ? 'CJ / supplier' : 'Shipped item') : null]),
        el('div', { class: 't' }, item.title),
        el('div', { class: 's' }, `${cents(item.price)} · ${item.stock} in stock · ${item.category}`),
        admin ? el('div', { class: 's' }, `Seller: ${item.sellerName || 'Unknown'}`) : null,
        admin && item.dropship ? el('div', { class: 's' }, `Supplier cost ${cents(item.cost || 0)} · spread ${cents(Math.max(0, (item.price || 0) - (item.cost || 0)))}`) : null,
        el('div', { class: 's' }, `${item.soldCount || 0} sold${item.updatedAt ? ' · edited ' + new Date(item.updatedAt).toLocaleDateString() : ''}`)
      ];
      const actions = el('div', { class: 'manageactions' });
      if (live) actions.appendChild(el('button', { class: 'btn-ghost', onclick: () => go('shopitem', { shopItemId: item.id }) }, 'View'));
      actions.appendChild(el('button', { onclick: () => go('shopedit', { shopEditId: item.id }) }, 'Edit'));
      const toggle = el('button', { class: 'btn-ghost' }, item.active ? 'Unpublish' : 'Publish');
      toggle.disabled = !item.active && item.stock < 1;
      toggle.title = (!item.active && item.stock < 1) ? 'Set quantity above 0 before publishing.' : '';
      toggle.onclick = async () => {
        try {
          await api('PATCH', `/api/shop/items/${encodeURIComponent(item.id)}`, { active: !item.active });
          toast(item.active ? 'Listing unpublished' : 'Listing published', 'ok'); render();
        } catch (e) { toast(e.message, 'err'); }
      };
      actions.appendChild(toggle);
      const del = el('button', { class: 'dangerbtn' }, 'Delete');
      del.onclick = async () => {
        if (!confirm(`Remove "${item.title}" from the marketplace? Existing order records will be kept.`)) return;
        try { await api('DELETE', `/api/shop/items/${encodeURIComponent(item.id)}`); toast('Listing removed', 'ok'); render(); }
        catch (e) { toast(e.message, 'err'); }
      };
      actions.appendChild(del);
      grid.appendChild(el('div', { class: 'managecard' }, [media, el('div', { class: 'managebody' }, meta), actions]));
    });
    listHost.appendChild(grid);
  };
  search.addEventListener('input', draw);
  draw();
  return wrap;
}

async function renderShopEdit() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('shopmanage') }, '← Shop listings'));
  if (!state.shopEditId) {
    wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Listing not selected'), el('p', {}, 'Open Shop listings and choose Edit.') ]));
    return wrap;
  }
  const [{ item }, cats, aiStatus] = await Promise.all([
    api('GET', `/api/shop/manage/${encodeURIComponent(state.shopEditId)}`),
    api('GET', '/api/shop/categories'),
    api('GET', '/api/ai/status').catch(() => ({ configured: false, available: false }))
  ]);
  const admin = state.user?.role === 'admin';
  const categories = admin ? cats.categories : cats.sellableCategories;
  wrap.appendChild(el('h2', {}, 'Edit shop listing'));
  wrap.appendChild(el('div', { class: 'sub' }, admin && item.sellerId !== state.user.id ? `Posted by ${item.sellerName}. You are editing this as an admin.` : 'Changes update the existing marketplace item.'));

  if (admin && item.dropship) {
    wrap.appendChild(el('div', { class: 'admincostbox' }, [
      el('b', {}, 'Supplier inventory'),
      el('span', {}, `Cost: ${cents(item.cost || 0)}`),
      el('span', {}, `Current spread: ${cents(Math.max(0, item.price - (item.cost || 0)))}`),
      item.cjVariantSku ? el('span', {}, `CJ SKU: ${item.cjVariantSku}`) : null,
      item.cjLastSyncAt ? el('span', {}, `Last CJ sync: ${new Date(item.cjLastSyncAt).toLocaleString()}`) : null
    ]));
  }

  const title = el('input', { value: item.title || '' });
  const cat = el('select', {}, categories.map(c => el('option', { value: c }, c))); cat.value = categories.includes(item.category) ? item.category : 'Other';
  const conditions = [...new Set([item.condition, 'New in box', 'Like new', 'Used — good', 'Used — fair', 'For parts'].filter(Boolean))];
  const cond = el('select', {}, conditions.map(c => el('option', { value: c }, c))); cond.value = item.condition;
  const price = el('input', { type: 'number', min: '0.01', step: '0.01', value: (item.price / 100).toFixed(2) });
  const stock = el('input', { type: 'number', min: '0', step: '1', value: item.stock });
  const loc = el('input', { value: item.location || '', placeholder: 'City, ST or shipping origin' });
  const desc = el('textarea', {}); desc.value = item.description || '';

  state.shopEditPhotos = [...(item.photos || [])];
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  const preview = el('div', { class: 'previewrow' });
  const picker = el('div', { class: 'picker', onclick: () => fileInput.click() }, 'Add photos (up to 6)');
  const drawPhotos = () => {
    preview.innerHTML = '';
    state.shopEditPhotos.forEach((photo, idx) => preview.appendChild(el('div', { class: 'pv editpv' }, [
      el('img', { src: photo }),
      idx > 0 ? el('button', { class: 'pvmove pvleft', type: 'button', title: 'Move photo left', onclick: () => {
        [state.shopEditPhotos[idx - 1], state.shopEditPhotos[idx]] = [state.shopEditPhotos[idx], state.shopEditPhotos[idx - 1]]; drawPhotos();
      } }, '‹') : null,
      idx < state.shopEditPhotos.length - 1 ? el('button', { class: 'pvmove pvright', type: 'button', title: 'Move photo right', onclick: () => {
        [state.shopEditPhotos[idx + 1], state.shopEditPhotos[idx]] = [state.shopEditPhotos[idx], state.shopEditPhotos[idx + 1]]; drawPhotos();
      } }, '›') : null,
      el('button', { class: 'pvremove', type: 'button', title: 'Remove photo', onclick: () => { state.shopEditPhotos.splice(idx, 1); drawPhotos(); } }, '×')
    ])));
    picker.textContent = state.shopEditPhotos.length ? `Add more photos (${state.shopEditPhotos.length}/6)` : 'Add photos (up to 6)';
  };
  fileInput.onchange = async () => {
    for (const f of [...fileInput.files].slice(0, Math.max(0, 6 - state.shopEditPhotos.length))) state.shopEditPhotos.push(await downscale(f));
    fileInput.value = ''; drawPhotos();
  };
  drawPhotos();

  wrap.appendChild(el('div', { class: 'editshopform card' }, [
    el('label', {}, 'Photos'), picker, fileInput, preview,
    el('label', {}, 'Title'), title,
    twoUp('Category', cat, 'Condition', cond),
    twoUp('Price ($)', price, 'Quantity', stock),
    el('label', {}, 'Location / shipping origin'), loc,
    el('label', {}, 'Description'), desc
  ]));

  if (aiStatus.available && aiStatus.configured) {
    const aiMsg = el('div', { class: 'hint' });
    const aiBtn = el('button', { class: 'btn-ghost', type: 'button' }, '✨ Improve with AI');
    aiBtn.onclick = async () => {
      aiBtn.disabled = true; aiBtn.textContent = 'Writing…'; aiMsg.textContent = '';
      try {
        const r = await api('POST', '/api/ai/listing-copy', {
          kind: item.dropship && admin ? 'cj' : 'shop',
          facts: { title: title.value, category: cat.value, condition: cond.value, price: price.value, quantity: stock.value, location: loc.value, description: desc.value, variant: item.cjVariantOption || null, weightGrams: item.cjWeightGrams || null, dimensionsMm: item.cjLengthMm && item.cjWidthMm && item.cjHeightMm ? [item.cjLengthMm,item.cjWidthMm,item.cjHeightMm] : null },
          images: state.shopEditPhotos.slice(0, 3)
        });
        if (r.draft.title) title.value = r.draft.title;
        if (r.draft.description) desc.value = r.draft.description;
        if (r.draft.categorySuggestion && [...cat.options].some(o => o.value === r.draft.categorySuggestion)) cat.value = r.draft.categorySuggestion;
        aiMsg.textContent = r.draft.warnings?.length ? `Review before saving. ${r.draft.warnings.join(' ')}` : 'AI draft applied. Review before saving.';
      } catch (e) { aiMsg.textContent = e.message; }
      finally { aiBtn.disabled = false; aiBtn.textContent = '✨ Improve with AI'; }
    };
    wrap.appendChild(el('div', { class: 'aibox' }, [el('b', {}, admin ? 'AI listing assistant' : state.access?.platinum || state.access?.wholesale || state.access?.adminUnlimited ? 'Unlimited AI Listing Assistant' : 'Better Plus AI Listing Assistant'), aiBtn, aiMsg]));
  }

  const status = el('div', { class: 'errmsg' });
  const actionRow = el('div', { class: 'editactions' });
  const save = el('button', { class: 'submitbtn' }, 'Save changes');
  save.onclick = async () => {
    status.textContent = ''; save.disabled = true; save.textContent = 'Saving…';
    try {
      const r = await api('PATCH', `/api/shop/items/${encodeURIComponent(item.id)}`, {
        title: title.value, category: cat.value, condition: cond.value, price: price.value,
        stock: stock.value, location: loc.value, description: desc.value, photos: state.shopEditPhotos
      });
      state.shopEditPhotos = [...(r.item.photos || [])];
      toast('Shop listing updated', 'ok'); go('shopmanage');
    } catch (e) { status.textContent = e.message; save.disabled = false; save.textContent = 'Save changes'; }
  };
  const toggle = el('button', { class: 'btn-ghost' }, item.active ? 'Unpublish' : 'Publish');
  toggle.onclick = async () => {
    try {
      if (!item.active && Number(stock.value) < 1) throw new Error('Set quantity above 0 before publishing.');
      await api('PATCH', `/api/shop/items/${encodeURIComponent(item.id)}`, { active: !item.active, stock: stock.value });
      toast(item.active ? 'Listing unpublished' : 'Listing published', 'ok'); go('shopmanage');
    } catch (e) { status.textContent = e.message; }
  };
  const del = el('button', { class: 'dangerbtn' }, 'Delete listing');
  del.onclick = async () => {
    if (!confirm(`Delete "${item.title}" from the marketplace? Existing order records will remain.`)) return;
    try { await api('DELETE', `/api/shop/items/${encodeURIComponent(item.id)}`); toast('Listing removed', 'ok'); go('shopmanage'); }
    catch (e) { status.textContent = e.message; }
  };
  actionRow.appendChild(save); actionRow.appendChild(toggle); actionRow.appendChild(del);
  wrap.appendChild(status); wrap.appendChild(actionRow);
  return wrap;
}

async function renderOrders() {
  const { bought, sold } = await api('GET', '/api/shop/orders');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Orders'));

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Purchases'));
  const b = el('div', { class: 'card' });
  if (!bought.length) b.appendChild(el('div', { class: 'ledrow' }, el('div', { class: 'dt' }, 'Nothing bought yet.')));
  bought.forEach(o => {
    const statusPill = o.platformFulfilled
      ? el('span', { class: 'pill warn' }, 'shipping')
      : el('span', { class: 'pill ' + (o.shipStatus === 'shipped' ? 'good' : 'warn') }, o.shipStatus === 'shipped' ? 'shipped' : 'pending');
    const row = el('div', { class: 'ledrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'd' }, o.title),
        el('div', { class: 'dt' }, new Date(o.at).toLocaleDateString() + (o.tracking ? ' · tracking: ' + o.tracking : '')),
      ]),
      statusPill,
      el('div', { class: 'amt neg' }, cents(o.price))
    ]);
    b.appendChild(row);
    // Peer-to-peer purchases that have sat unshipped can be reported.
    if (!o.platformFulfilled && o.shipStatus !== 'shipped') {
      const reportBtn = el('button', { style: 'margin:0 16px 12px;font-size:12px' }, 'Report — never shipped');
      reportBtn.onclick = async () => {
        const reason = prompt(`What happened with "${o.title}"?`, 'Paid but item was never shipped.');
        if (!reason) return;
        try { await api('POST', `/api/orders/${o.id}/report`, { reason }); toast('Reported — an admin will review it.', 'ok'); }
        catch (e) { toast(e.message, 'err'); }
      };
      b.appendChild(reportBtn);
    }
  });
  wrap.appendChild(b);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Sales'));
  const s = el('div', { class: 'card' });
  if (!sold.length) s.appendChild(el('div', { class: 'ledrow' }, el('div', { class: 'dt' }, 'Nothing sold yet.')));
  sold.forEach(o => {
    s.appendChild(el('div', { class: 'ledrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 'd' }, o.title + ' → ' + o.buyerName),
        el('div', { class: 'dt' }, 'Fee ' + cents(o.fee) + (o.tracking ? ' · tracking: ' + o.tracking : ''))
      ]),
      o.platformFulfilled ? el('span', { class: 'pill warn' }, 'fulfilled') : el('span', { class: 'pill ' + (o.shipStatus === 'shipped' ? 'good' : 'warn') }, o.shipStatus === 'shipped' ? 'shipped' : 'pending'),
      el('div', { class: 'amt pos' }, '+' + cents(o.net))
    ]));
    if (!o.platformFulfilled && o.shipStatus !== 'shipped') {
      const trackInput = el('input', { placeholder: 'Tracking number (optional)', style: 'max-width:200px' });
      const shipBtn = el('button', {}, 'Mark shipped');
      shipBtn.onclick = async () => {
        try { await api('POST', `/api/orders/${o.id}/ship`, { tracking: trackInput.value }); toast('Marked shipped — buyer notified.', 'ok'); render(); }
        catch (e) { toast(e.message, 'err'); }
      };
      s.appendChild(el('div', { style: 'display:flex;gap:8px;margin:0 16px 12px' }, [trackInput, shipBtn]));
    }
  });
  wrap.appendChild(s);
  return wrap;
}

/* ================= PROMOTE ================= */
async function renderPromote() {
  const { listing } = await api('GET', '/api/listings/' + state.detailId);
  const { tiers } = await api('GET', '/api/promotions/tiers');
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Promote listing'));
  wrap.appendChild(el('div', { class: 'sub' }, listing.address));

  const st = el('div', { class: 'okmsg' });
  tiers.forEach(t => {
    const card = el('div', { class: 'card', style: 'padding:16px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center;gap:12px' }, [
      el('div', { class: 'grow' }, [
        el('div', { style: 'font-weight:600;font-size:14.5px' }, t.label),
        el('div', { class: 'hint', style: 'margin-top:2px' }, t.id === 'bump' ? 'Resets your freshness score — like reposting.'
          : t.id === 'superboost' ? 'Absolute top of every feed for one hour.'
          : t.id === 'spotlight' ? 'Gold star badge on your card in the feed.'
          : 'Pinned above organic listings for the whole window.')
      ]),
      el('button', { class: 'btn-primary', onclick: async () => {
        try {
          const r = await api('POST', '/api/promotions/buy', { listingId: listing.id, tierId: t.id });
          await handlePurchaseResponse(r, t.label + ' applied.', async () => { st.textContent = t.label + ' applied.'; });
        } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
      } }, cents(t.price))
    ]);
    wrap.appendChild(card);
  });
  wrap.appendChild(st);
  wrap.appendChild(el('div', { class: 'switchline' }, el('a', { onclick: () => go('detail', { detailId: listing.id }) }, 'Back to listing')));
  return wrap;
}

async function renderAnalytics() {
  const a = await api('GET', `/api/listings/${state.detailId}/analytics`);
  const rescue = [];
  if (a.views >= 10 && a.saveRate < 8) rescue.push('Interest is low relative to views. Recheck price, lead photo and headline before buying more promotion.');
  if (a.views < 10) rescue.push('This deal has limited exposure. Share the Better Dispo deal link and distribution copy before changing the economics.');
  if (a.saves > 0 && a.offers === 0) rescue.push('People are saving the deal but not offering. Add clearer access, condition, title and deadline information, then follow up with interested buyers.');
  if (a.unlocks > 0 && a.offers === 0) rescue.push('Buyers unlocked the details but have not offered. Direct follow-up may be more useful than additional reach.');
  if (!rescue.length) rescue.push('No obvious bottleneck yet. Keep the listing current and respond quickly to buyer activity.');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('detail', { detailId: state.detailId }) }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Listing analytics'));
  wrap.appendChild(el('div', { class: 'sub' }, 'What your promotion spend is actually buying.'));
  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(a.views, 'Views'), stat(a.uniqueViewers, 'Unique'), stat(a.saves, 'Likes'),
    stat(a.shares||0, 'Shares'), stat(a.inquiries||0, 'Inquiries'), stat(a.buyerMatches||0, 'Buyer matches'),
    stat(a.unlocks, 'Unlocks'), stat(a.offers, 'Offers'), stat(a.saveRate + '%', 'Like rate')
  ]));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Promotion spend'));
  wrap.appendChild(el('div', { class: 'card' }, el('div', { class: 'ledrow' }, [
    el('div', { class: 'grow' }, el('div', { class: 'd' }, 'Total spent promoting this listing')),
    el('div', { class: 'amt neg' }, cents(a.promoSpend))
  ])));
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Deal Rescue'));
  wrap.appendChild(el('div', { class:'card rescuecard' }, [el('div',{class:'dispoeyebrow'},'NEXT BEST ACTIONS'), ...rescue.map(x=>el('div',{class:'rescueitem'},[el('span',{},'→'),el('p',{},x)]))]));

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Interested buyers'));
  const box = el('div', { class: 'card' });
  if (!a.interested.length) box.appendChild(el('div', { class: 'ledrow' }, el('div', { class: 'dt' }, 'No saves yet.')));
  a.interested.forEach(i => box.appendChild(el('div', { class: 'ledrow' }, [
    el('div', { class: 'grow' }, [el('div', { class: 'd' }, i.name), el('div', { class: 'dt' }, i.email)]),
    el('div', { class: 'dt' }, new Date(i.at).toLocaleDateString())
  ])));
  wrap.appendChild(box);
  return wrap;
}
const stat = (v, l) => el('div', { class: 'statbox' }, [el('div', { class: 'v' }, String(v)), el('div', { class: 'l' }, l)]);

/* ================= OFFERS ================= */
async function renderOffers() {
  const { received, sent } = await api('GET', '/api/offers');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Offers'));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Received'));
  const r = el('div', { class: 'card' });
  if (!received.length) r.appendChild(el('div', { class: 'offerrow' }, el('div', { class: 'dt' }, 'No offers received.')));
  received.forEach(o => r.appendChild(el('div', { class: 'offerrow' }, [
    el('div', { class: 'grow' }, [
      el('div', { class: 't' }, money(o.amount) + ' — ' + o.listingAddress),
      el('div', { class: 's' }, o.buyerName + (o.closeDays ? ` · ${o.closeDays}d close` : '') + (o.terms ? ' · ' + o.terms : ''))
    ]),
    el('button',{class:'btn-ghost',onclick:()=>go('dealroom',{detailId:o.listingId})},'Deal room'),
    o.status === 'pending'
      ? el('div', { class: 'offerbtns' }, [
          el('button', { class: 'acc', onclick: async () => { await api('POST', `/api/offers/${o.id}/respond`, { status: 'accepted' }); render(); } }, 'Accept'),
          el('button', { onclick: async () => { await api('POST', `/api/offers/${o.id}/respond`, { status: 'declined' }); render(); } }, 'Decline')
        ])
      : el('span', { class: 'pill ' + (o.status === 'accepted' ? 'good' : 'bad') }, o.status)
  ])));
  wrap.appendChild(r);
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Sent'));
  const s = el('div', { class: 'card' });
  if (!sent.length) s.appendChild(el('div', { class: 'offerrow' }, el('div', { class: 'dt' }, 'No offers sent.')));
  sent.forEach(o => s.appendChild(el('div', { class: 'offerrow' }, [
    el('div', { class: 'grow' }, [el('div', { class: 't' }, money(o.amount) + ' — ' + o.listingAddress), el('div', { class: 's' }, new Date(o.at).toLocaleDateString())]),
    el('button',{class:'btn-ghost',onclick:()=>go('dealroom',{detailId:o.listingId})},'Deal room'),
    el('span', { class: 'pill ' + (o.status === 'accepted' ? 'good' : o.status === 'pending' ? 'warn' : 'bad') }, o.status)
  ])));
  wrap.appendChild(s);
  return wrap;
}

/* ================= COMPOSE ================= */

const TUTORIAL_VERSION = 44;
function tutorialTier(){
  if(state.user?.role==='admin'||state.access?.adminUnlimited)return'admin';
  if(state.access?.wholesale)return'wholesale'; if(state.access?.platinum)return'platinum';
  if(state.access?.pro)return'pro'; if(state.access?.trial)return'trial'; return'free';
}
const TUTORIAL_RANK={free:0,pro:1,platinum:2,wholesale:3,trial:1,admin:4};
function tutorialStepsFor(tier=tutorialTier()){
 const rank=TUTORIAL_RANK[tier]??0;
 return [
 {view:'feed',selector:null,min:0,title:'Welcome to Better Real Estate',copy:'We’ll walk through the workspace one feature at a time. The tour only includes tools available with your current membership.'},
 {view:'feed',selector:'.feedmode',min:0,release:29,title:'For You & Following',copy:'For You ranks deals using your markets, buy boxes and activity. Following keeps a predictable feed from people you chose to follow.'},
 {view:'commandcenter',selector:'.commandcenter',min:0,release:29,title:'Command center',copy:'See market matches, buyer matches, pending offers, property updates and your next deadline without hunting through the site.'},
 {view:'shop',selector:'#tabbar button:nth-child(2)',min:0,title:'Shop',copy:'Browse the marketplace side of Better Real Estate without leaving your workspace.'},
 {view:'compose',selector:'.composepage .dealbuilderentry',min:0,title:'Post a property',copy:'Start a listing here. You can build it manually, import existing deal notes, or begin with an AI Deal Builder analysis.'},
 {view:'network',selector:'#tabbar button:nth-child(4)',min:0,title:'Network',copy:'Find professionals, follow people, manage friends, and discover buyers through public buy boxes.'},
 {view:'messages',selector:'#app .page',min:0,title:'Messages',copy:'Keep deal conversations inside Better Real Estate. Reminder timing can be changed in Settings.'},
 {view:'me',selector:'#tabbar button:nth-child(5)',min:0,title:'Profile & tools',copy:'Your Profile connects you to saved properties, buy boxes, leaderboard, professional tools and membership controls.'},
 {view:'saved',selector:'.savedpage',min:0,release:29,title:'Liked & watched properties',copy:'Liking a property automatically watches it for meaningful changes. You can pause notifications without unliking it.'},
 {view:'search',selector:'.universal-search',min:0,release:29,title:'Universal search',copy:'Search properties and people, filter deals, then save useful criteria as a deal alert.'},
 {view:'savedsearches',selector:'.saved-searches-page',min:0,release:29,title:'Saved searches & deal alerts',copy:'Save criteria you care about and keep matching opportunities organized here.'},
 {view:'pipeline',selector:'.pipelinepage',min:0,release:29,title:'Deal pipeline',copy:'Move opportunities from lead through analysis, contract, dispo, closing and closed. Listing-linked deals open into private Deal Rooms for offers, documents and transaction conversation.'},
 {view:'dealcalendar',selector:'.calendarpage',min:0,release:29,title:'Deal calendar',copy:'Keep follow-ups, offer expirations, inspections and closing deadlines in one place.'},
 {view:'markethubs',selector:'.markethubspage',min:0,release:29,title:'Market Hubs',copy:'See where listings, investors and buyer demand are active across your markets.'},
 {view:'buybox',selector:'#app .page',min:0,release:29,title:'Advanced buy boxes',copy:'Define states, metros, price, ARV, beds, baths, rehab tolerance, strategy and spread so recommendations and buyer matching reflect what you actually buy.'},
 {view:'leaderboard',selector:'#app .page',min:0,title:'Leaderboard',copy:'Verified closings earn points for both sides. Track monthly and all-time activity and the membership rewards attached to points.'},
 {view:'wallet',selector:'#app .page',min:0,title:'Wallet & payouts',copy:'Eligible marketplace sales, referral credits and payout activity are organized here.'},
 {view:'me',selector:'.referral-center',min:0,release:32,title:'Referral center',copy:'Share your personal invite link and track link visits, signups, activated referrals and paid referrals from your profile.'},
 {view:'transactionhub',selector:'.transaction-hub',min:0,release:33,title:'Transaction hub',copy:'Keep contacts, follow-ups, deal tasks, intake submissions, credentials and closing outcomes together.'},
 {view:'affiliate',selector:'.affiliate-center',min:0,release:33,title:'Affiliate program',copy:'Apply for approval, accept the current commission terms, track membership sales and withdraw available earnings through secure payouts.'},
 {view:'affiliate',selector:'.payout-card',min:0,release:35,title:'Affiliate Wallet',copy:'Affiliate earnings are real cash: 30% one time on a qualifying customer’s first eligible paid membership, held for 3 days before withdrawal. Better Credits are separate and never cash-withdrawable.'},
 {view:'wallet',selector:'.wallet-balance-grid',min:0,release:35,title:'Cash and credits',copy:'Marketplace seller proceeds are real cash and can be withdrawn after payout setup. Better Credits are platform-only credit and cannot be cashed out.'},
 {view:'upgrade',selector:'.tiergrid4',min:0,release:32,title:'Better Plus access',copy:'Better Plus now includes daily access to more premium tools: 5 Deal Builder analyses, 2 AI listing drafts and 3 AI-enhanced Better Dispo imports. Platinum keeps unlimited access.'},
 {view:'boostpicker',selector:'#app .page',min:0,title:'Promote a listing',copy:'Choose one of your listings to boost when you want additional visibility.'},
 {view:'dealbuilder',selector:'.dealbuildersearch',min:1,title:'AI Deal Builder',copy:'Start with an address. Better researches available property evidence and sold comps before producing the investor analysis.'},
 {view:'dealbuilder',selector:'.verified-comps-card',min:1,release:39,title:'Verified sold comps · researched automatically',copy:'Add closed-sale comps you trust. Better scores similarity, discounts weak/outlier comps, and produces a separate comp-supported ARV with confidence instead of pretending address-only AI is verified market data.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:40,title:'Automatic property evidence',copy:'Better now checks any authorized MLS / RESO feeds your platform has connected, uses verified subject facts such as beds, baths and square footage when available, and automatically loads closed-sale evidence into the comp workspace. Source names and conflicts stay visible.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:41,title:'Live property + web research',copy:'Better now queries configured Regrid parcel records and performs public web research in addition to authorized MLS feeds. It cross-checks beds, baths, square footage, sale history and sold comps, flags source conflicts, and uses credible researched sold comps for the working ARV.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:42,title:'Verified property facts',copy:'Better now verifies the subject property field by field. Conflicting or single-source beds, baths, square footage, year built and property type are withheld instead of being presented as facts. Open Property evidence to see exactly what each source reported.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:43,title:'Production property intelligence',copy:'Better now resolves the exact property first, uses deterministic Regrid and authorized MLS evidence before spending on web research, checks nearby recorded closed sales, distinguishes Recorded from independently Verified facts, and withholds ARV unless the property and comp gates pass. Research is cached to reduce Netlify and API usage.'},
  {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:44,title:'Property research reliability',copy:'Better now runs a targeted, location-aware public-web research pass when deterministic sources leave facts or sold comps unresolved. Single-source values stay labeled Recorded and visible for reference, while only corroborated facts can unlock valuation.'},
 {view:'buyercrm',selector:'.buyercrmpage',min:0,title:'Buyer CRM',copy:'Keep buyer markets, buy boxes, private notes and follow-up stages in one pipeline.'},
 {view:'insights',selector:'.insightspage',min:0,title:'Demand Insights',copy:'See where published buyer demand is concentrated by market, property type and strategy.'},
 {view:'workspace',selector:'.workspacepage',min:2,title:'Investor Workspace',copy:'Compare saved properties and keep private deal notes in one place.'},
 {view:'companyworkspace',selector:'.companyhero',min:3,release:29,title:'Wholesale Team workspace',copy:'Team access adds shared buyer CRM, pipeline assignments, internal notes, activity and analytics while each teammate keeps a separate login.'},
 {view:'admin',selector:'.admin-activity',min:4,release:29,title:'Admin activity & user analytics',copy:'See who is active now, unique users over preset or custom periods, market activity, funnel signals and inspect individual accounts. Ordinary members never see this step.'},
 {view:'admin',selector:'.demo-account-card',min:4,release:37,title:'Demo accounts',copy:'Create controlled demo accounts for presentations and testing. Demo accounts never consume First 100 Founder places, never count in growth analytics, and cannot generate real billing, referral rewards, affiliate commissions or payouts.'},
 {view:'admin',selector:'.demo-preview-card',min:4,release:38,title:'Preview experiences',copy:'Use a demo account to safely replay Founder welcome, onboarding, and What’s New experiences without consuming Founder places, issuing access, changing analytics, or creating money.'},
 {view:'admin',selector:'.user-inspector',min:4,release:39,title:'Demo account controls',copy:'Demo rows now keep every action visible: enter the demo, reset its password or state, convert it to a real account, or permanently delete it with confirmation.'},
 {view:'admin',selector:'.user-inspector',min:4,release:36,title:'Membership access controls',copy:'Open Manage access on any non-admin account to grant, replace, extend or revoke complimentary membership access without touching the user’s paid subscription.'},
 {view:'me',selector:'.founder-program-card',min:0,release:36,when:()=>!!state.user?.founderLaunchPosition,title:'First 100 Founding Member',copy:'As one of the first 100 qualifying members, your profile carries Founding Member recognition and includes two weeks of complimentary Platinum access. Your referral link is ready to share with your network.'},
 {view:'feed',selector:'.topquick',min:0,release:31,title:'Quick options',copy:'Open your customizable shortcut menu from anywhere. Choose the platform actions you use most, customize up to six shortcuts, and use Back to return to your saved Quick Options without closing the menu.'},
 {view:'settings',selector:'.market-settings',min:0,release:29,title:'Investment markets',copy:'Choose the states you work in. They boost relevant properties in For You without hiding opportunities elsewhere.'},
 {view:'settings',selector:'#app .page',min:0,title:'Settings & help',copy:'Control notifications, membership display, appearance and account options. You can restart the guided tour here anytime.'},
 {view:'feed',selector:null,min:0,title:'You’re ready',copy:'That covers your current access. If your membership unlocks new tools later, you’ll get a short tour of only those new features.'}
 ].filter(x=>rank>=x.min&&(!x.when||x.when()));
}
function tutorialKey(tier=tutorialTier()){return `v${TUTORIAL_VERSION}:${tier}`;}
async function startTutorial(force=false,onlyNew=false,releaseOnly=false){
 if(!state.user)return;
 const tier=tutorialTier(),key=tutorialKey(tier);
 const seen=Array.isArray(state.user.settings?.tutorialCompletedKeys)?state.user.settings.tutorialCompletedKeys:[];
 if(!force&&seen.includes(key))return;
 let steps=tutorialStepsFor(tier);
 if(onlyNew){const prev=Number(state.user.settings?.tutorialHighestRank??-1),now=TUTORIAL_RANK[tier]??0;steps=steps.filter(x=>x.min>prev&&x.min<=now);if(!steps.length)return;} if(releaseOnly){steps=steps.filter(x=>x.release===TUTORIAL_VERSION);if(!steps.length)return;}
 let i=0,closed=false;
 const root=el('div',{class:'guided-tour-root','aria-live':'polite'});
 const dimTop=el('div',{class:'tour-dim tour-dim-top'}),dimLeft=el('div',{class:'tour-dim tour-dim-left'}),dimRight=el('div',{class:'tour-dim tour-dim-right'}),dimBottom=el('div',{class:'tour-dim tour-dim-bottom'});
 const ring=el('div',{class:'tour-focus-ring'}),card=el('div',{class:'guided-tour-card',role:'dialog','aria-modal':'true'});
 root.append(dimTop,dimLeft,dimRight,dimBottom,ring,card); document.body.appendChild(root);
 const allDims=[dimTop,dimLeft,dimRight,dimBottom];
 const save=async(dismiss=false)=>{const body={tutorialCompletedVersion:TUTORIAL_VERSION,tutorialCompletedKeys:[...new Set([...seen,key])],tutorialHighestRank:Math.max(Number(state.user.settings?.tutorialHighestRank??-1),TUTORIAL_RANK[tier]??0)};if(dismiss)body.tutorialDismissedVersion=TUTORIAL_VERSION;try{const r=await api('PATCH','/api/me/settings',body);state.user.settings=r.settings;}catch{}};
 const cleanup=()=>{closed=true;window.removeEventListener('resize',reposition);window.removeEventListener('scroll',reposition,true);root.remove();};
 const finish=async(d=false)=>{cleanup();await save(d);};
 const waitForTarget=async selector=>{if(!selector)return null;for(let n=0;n<40&&!closed;n++){const node=document.querySelector(selector);if(node&&node.getClientRects().length)return node;await new Promise(r=>setTimeout(r,50));}return null;};
 let currentTarget=null;
 const setBox=(node)=>{
   const vw=window.innerWidth,vh=window.innerHeight,pad=8;
   if(!node){ring.style.display='none';allDims.forEach(d=>{d.style.cssText='position:fixed;inset:0;display:block'});return null;}
   const raw=node.getBoundingClientRect();
   const l=Math.max(8,raw.left-pad),t=Math.max(8,raw.top-pad),r=Math.min(vw-8,raw.right+pad),b=Math.min(vh-8,raw.bottom+pad),w=Math.max(0,r-l),h=Math.max(0,b-t);
   ring.style.display='block';ring.style.left=`${l}px`;ring.style.top=`${t}px`;ring.style.width=`${w}px`;ring.style.height=`${h}px`;
   dimTop.style.cssText=`left:0;top:0;width:100vw;height:${t}px`;
   dimBottom.style.cssText=`left:0;top:${b}px;width:100vw;height:${Math.max(0,vh-b)}px`;
   dimLeft.style.cssText=`left:0;top:${t}px;width:${l}px;height:${h}px`;
   dimRight.style.cssText=`left:${r}px;top:${t}px;width:${Math.max(0,vw-r)}px;height:${h}px`;
   return {left:l,top:t,right:r,bottom:b,width:w,height:h};
 };
 const placeCard=(box)=>{
   const vw=window.innerWidth,vh=window.innerHeight,margin=16,gap=18,cw=Math.min(420,vw-margin*2),ch=Math.min(card.offsetHeight||300,vh-margin*2);
   let left=Math.max(margin,(vw-cw)/2),top=Math.max(margin,(vh-ch)/2);
   if(box){const spaces={right:vw-box.right,left:box.left,bottom:vh-box.bottom,top:box.top};const best=Object.entries(spaces).sort((a,b)=>b[1]-a[1])[0][0];
     if(best==='right'&&spaces.right>=cw+gap){left=box.right+gap;top=Math.min(Math.max(margin,box.top),vh-ch-margin)}
     else if(best==='left'&&spaces.left>=cw+gap){left=box.left-cw-gap;top=Math.min(Math.max(margin,box.top),vh-ch-margin)}
     else if(best==='bottom'&&spaces.bottom>=ch+gap){top=box.bottom+gap;left=Math.min(Math.max(margin,box.left),vw-cw-margin)}
     else if(spaces.top>=ch+gap){top=box.top-ch-gap;left=Math.min(Math.max(margin,box.left),vw-cw-margin)}
   }
   card.style.left=`${Math.round(left)}px`;card.style.top=`${Math.round(top)}px`;card.style.width=`${Math.round(cw)}px`;
 };
 function reposition(){if(closed)return;placeCard(setBox(currentTarget));}
 window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
 const focus=async step=>{
   currentTarget=null;setBox(null);
   if(state.view!==step.view){go(step.view);await new Promise(r=>setTimeout(r,80));}
   const target=await waitForTarget(step.selector);
   if(target){target.scrollIntoView({behavior:'auto',block:'center',inline:'nearest'});await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));currentTarget=target;}
   reposition();
 };
 const move=delta=>{const next=Math.max(0,Math.min(steps.length-1,i+delta));if(next===i&&delta>0)return finish();i=next;draw();};
 const draw=async()=>{
   if(closed)return; const step=steps[i]; card.innerHTML='';
   card.appendChild(el('div',{class:'tutorialprogress'},`${onlyNew?'NEW FEATURE TOUR':'GUIDED TOUR'} · ${i+1} OF ${steps.length}`));
   card.appendChild(el('h2',{},step.title));card.appendChild(el('p',{},step.copy));
   card.appendChild(el('div',{class:'tutorialmembership'},`Showing ${tier==='wholesale'?'Team':tier[0].toUpperCase()+tier.slice(1)} access`));
   const actions=el('div',{class:'tutorialactions'});
   actions.appendChild(el('button',{type:'button',class:'btn-ghost',disabled:i===0?'disabled':null,onclick:()=>move(-1)},'Back'));
   actions.appendChild(el('button',{type:'button',class:'btn-primary',onclick:()=>i===steps.length-1?finish():move(1)},i===steps.length-1?'Finish':'Next'));
   card.appendChild(actions);card.appendChild(el('button',{type:'button',class:'tutorialskip',onclick:()=>finish(true)},'Skip entire tour'));
   await focus(step);
 };
 await draw();
}

async function renderDealBuilder(){
  const wrap=el('div',{class:'page dealbuilderpage'});
  wrap.appendChild(el('div',{class:'pagehead'},[el('div',{},[el('div',{class:'dispoeyebrow'},'PROPERTY INTELLIGENCE'),el('h2',{},'AI Deal Builder'),el('div',{class:'sub'},'Start with an address. Better resolves the exact property first, checks approved records and authorized MLS data, conditionally corroborates unresolved facts on the public web, screens closed-sale comps, and only then allows AI to synthesize the verified evidence.')]) ]));
  const address=el('input',{placeholder:'123 Main St, City, ST 12345'}),run=el('button',{class:'btn-primary'},'Analyze property'),status=el('div',{class:'hint'}),results=el('div'),usage=el('div',{class:'dealbuilderusage'});
  const paintUsage=(u)=>{usage.innerHTML='';if(!u)return;usage.appendChild(el('div',{class:'usagepill '+(u.unlimited?'unlimited':'')},u.label));if(!u.unlimited)usage.appendChild(el('div',{class:'hint'},u.limit===5?'Plus includes 5 successful new-property analyses per day.':'Free trial includes one successful property analysis.'));};
  try{paintUsage((await api('GET','/api/deal-builder/usage')).usage)}catch(e){status.textContent=e.message||'Unable to load Deal Builder allowance.'}
  const search=el('div',{class:'card dealbuildersearch'},[el('div',{class:'dealbuildersearchtop'},[el('label',{},'Property address'),usage]),el('div',{class:'dealbuildersearchrow'},[address,run]),status]);wrap.appendChild(search);wrap.appendChild(results);
  const fmtFact=(field,v)=>{if(v===null||v===undefined||v==='')return '—';if(field==='squareFootage')return Number(v).toLocaleString()+' sq ft';if(field==='bathrooms')return Number(v)%1?Number(v).toFixed(1):String(Number(v));return String(v)};
  async function analyze(forceRefresh=false){
    if(!address.value.trim()){status.textContent='Enter a complete address.';return}
    run.disabled=true;run.textContent='Analyzing…';status.textContent='Preparing evidence-first property research…';results.innerHTML='';
    try{
      status.textContent='Step 1 of 2 · Resolving the exact property, approved records and closed-sale comps; web corroboration runs only if needed…';
      const researched=await api('POST','/api/deal-builder/research',{address:address.value.trim(),forceRefresh});const ev0=researched.evidence||{};
      status.textContent='Step 2 of 2 · Applying the property-truth and comp gates, then synthesizing only server-verified evidence…';
      const r=await api('POST','/api/deal-builder/address',{address:address.value.trim()});paintUsage(r.usage);
      const a=r.analysis,ev=r.evidence||ev0,live=ev.subject||{},p={...(a.subject||{})},aiDraft=r.aiDraft||null;
      const cacheText=ev.cache?.retrievedAt?` · Research ${ev.cache.hit?'reused':'updated'} ${new Date(ev.cache.retrievedAt).toLocaleString()}`:''; const synthText=r.synthesisReused?' · AI synthesis reused — no new AI call':r.synthesisDeferred?' · AI synthesis unavailable — verified evidence/comp result preserved without consuming an analysis use':'';
      status.textContent=`Analysis generated ${new Date(a.generatedAt).toLocaleString()} · ${a.provider}. Confidence: ${a.confidence||'Low'}. ${a.arvMethod||'Analysis'}${cacheText}${synthText} · Verified facts are source-backed; repair scenarios remain estimates.`;
      const selected=new Set((a.comparables||[]).map((_,i)=>i));let workingArv=Number(a.arv?.estimate)||0;
      // Keep the server's evidence-gated, similarity-weighted ARV. Do not replace it with a naive browser average.
      const calcArv=()=>workingArv;
      if(aiDraft?.description){const sentences=String(aiDraft.description).split(/(?<=[.!?])\s+/).filter(Boolean),body=el('div',{class:'aisummarybody'});if(sentences.length)body.appendChild(el('p',{class:'aisummarylead'},sentences[0]));if(sentences.length>1)body.appendChild(el('ul',{class:'aisummarypoints'},sentences.slice(1).map(x=>el('li',{},x))));results.appendChild(el('section',{class:'card aidraftcard'},[el('div',{class:'aisummaryhead'},[el('div',{},[el('div',{class:'sectiontitle'},'Property Analysis Summary'),el('div',{class:'hint'},'AI-organized analysis from verified evidence · Review before marketing')]),el('span',{class:'summaryconfidence'},`Confidence: ${a.confidence||'Low'}`)]),body]));}

      const evidenceCard=el('section',{class:'card source-evidence-card'},[el('div',{class:'sectiontitle'},'Property evidence'),el('div',{class:'hint'},ev.notice||'Source status unavailable.')]);
      if(ev.sources?.length)evidenceCard.appendChild(el('div',{class:'sourcechips'},ev.sources.map(x=>el('span',{class:'sourcechip'},x.name+' · '+x.type))));
      const identity=ev.identity||{};evidenceCard.appendChild(el('div',{class:'hint'},`Property match: ${identity.addressMatched?(identity.confidence||'Matched'):'Not sufficiently verified'}${identity.addressMatchScore!==null&&identity.addressMatchScore!==undefined?' · match score '+identity.addressMatchScore:''} · ${identity.resolvedCoreFields||0}/5 core facts verified.`));
      const factGrid=el('div',{class:'evidence-field-grid'}),fieldLabels={bedrooms:'Bedrooms',bathrooms:'Bathrooms',squareFootage:'Living area',yearBuilt:'Year built',propertyType:'Property type'};
      for(const field of Object.keys(fieldLabels)){
        const fe=ev.fieldEvidence?.[field]||{},value=fe.value!==null&&fe.value!==undefined?fmtFact(field,fe.value):(fe.status==='recorded'&&fe.recordedValue!==null&&fe.recordedValue!==undefined?fmtFact(field,fe.recordedValue):fe.status==='conflicting'?'Conflicting':'Not found');
        const raw=(fe.raw||[]).map(x=>`${x.source}: ${fmtFact(field,x.value)}`).join(' · ');const stateLabel=fe.status==='verified'?'Verified · independent agreement':fe.status==='verified_with_conflict'?'Verified consensus · conflict retained':fe.status==='conflicting'?'Withheld · credible sources disagree':fe.status==='recorded'?'Recorded · one source, not independently verified':'Not found';
        factGrid.appendChild(el('div',{class:'evidence-field'},[el('span',{},fieldLabels[field]),el('strong',{},value),el('small',{},stateLabel),raw?el('small',{class:'hint'},raw):null].filter(Boolean)));
      }
      evidenceCard.appendChild(factGrid);
      if(ev.conflicts?.length)evidenceCard.appendChild(el('div',{class:'evidence-conflicts'},[el('b',{},'Source conflicts — disputed facts were not promoted'),...ev.conflicts.map(x=>el('div',{class:'hint'},`${fieldLabels[x.field]||x.field}: ${(x.evidence||[]).map(y=>`${y.source} ${fmtFact(x.field,y.value)}`).join(' · ')}`))]));
      if(ev.webSources?.length)evidenceCard.appendChild(el('div',{class:'web-evidence-links'},[el('b',{},'Public web evidence'),...ev.webSources.slice(0,8).map((u,i)=>el('a',{href:u,target:'_blank',rel:'noopener noreferrer'},`Source ${i+1} · ${(()=>{try{return new URL(u).hostname.replace(/^www\./,'')}catch{return 'web'}})()}`))]));
      if(ev.errors?.length)evidenceCard.appendChild(el('div',{class:'hint'},'Source note: '+ev.errors.map(x=>x.source+': '+x.error).join(' · ')));
      const refresh=el('button',{class:'btn-ghost compactbtn',onclick:()=>analyze(true)},'Refresh research');evidenceCard.appendChild(el('div',{class:'evidence-actions'},[el('div',{class:'hint'},ev.cache?.retrievedAt?`Last researched ${new Date(ev.cache.retrievedAt).toLocaleString()}${ev.cache.hit?' · cached to save API/Netlify usage':''}${ev.cache?.refreshProtected?' · refresh protection reused recent evidence':''}`:'Research time unavailable'),refresh]));
      if(state.access?.adminUnlimited&&ev.diagnostics?.stages){const d=ev.diagnostics.stages,diag=el('details',{class:'research-diagnostics'},[el('summary',{},'Admin · Research diagnostics'),el('div',{class:'hint'},`Total research time: ${ev.diagnostics.durationMs??'—'} ms · diagnostics are cached and do not issue provider calls.`)]);const rows=[['Property identity',d.identity?.regrid?.status||'unknown',d.identity?.durationMs],['Regrid nearby sales',d.nearbySales?.status||'unknown',d.nearbySales?.durationMs],['Public web',d.web?.status||'unknown',d.web?.durationMs],['Comp gate',d.compGate?.status||'unknown',null]];for(const [name,st,ms] of rows)diag.appendChild(el('div',{class:'diagnostic-row'},[el('span',{},name),el('strong',{},st),el('small',{},ms!==null&&ms!==undefined?`${ms} ms`:'')]));evidenceCard.appendChild(diag);}
      results.appendChild(evidenceCard);

      const hasArv=()=>Number(calcArv())>0;
      const summary=el('div',{class:'dealgrid'},[
        metricCard('Working ARV',hasArv()?money(calcArv()):'Withheld',hasArv()?(a.arv?.low&&a.arv?.high?`${money(a.arv.low)}–${money(a.arv.high)} range`:a.arvMethod||'Working estimate'):'Not enough verified subject/comp evidence for a defensible number'),
        metricCard('Beds / baths',`${p.bedrooms??'—'} / ${p.bathrooms??'—'}`,p.squareFootage?`${Number(p.squareFootage).toLocaleString()} sq ft`:'Living area not verified'),
        metricCard('Year built',p.yearBuilt||'—',p.propertyType||'Property type not verified'),
        metricCard('Confidence',a.confidence||'Low',`${identity.resolvedCoreFields||0}/5 core facts verified${ev.conflicts?.length?' · '+ev.conflicts.length+' conflict'+(ev.conflicts.length===1?'':'s'):''}`)
      ]);results.appendChild(summary);

      const rehabSel=el('select',{},(a.rehab||[]).map(x=>el('option',{value:x.key},`${x.label} — ${money(x.estimate)}`))),ask=el('input',{type:'number',placeholder:'Your purchase / contract price'}),assignment=el('input',{type:'number',value:'10000'}),hold=el('input',{type:'number',value:'12000'}),numbers=el('div',{class:'dealnumbers'});
      const update=()=>{const arv=calcArv(),rh=(a.rehab||[]).find(x=>x.key===rehabSel.value)?.estimate||0,purchase=Number(ask.value)||0,fees=Number(assignment.value)||0,hc=Number(hold.value)||0;if(!arv){numbers.innerHTML='';numbers.append(metricCard('Working ARV','—','Await verified property/comp evidence'));numbers.append(metricCard('70% MAO','—','Withheld until ARV is supportable'));numbers.append(metricCard('Projected flip spread','—','Withheld until ARV is supportable'));return}const flip=arv-purchase-rh-hc,mao70=Math.max(0,Math.round(arv*.70-rh-fees));numbers.innerHTML='';numbers.append(metricCard('Working ARV',money(arv),a.arvMethod||'Working valuation'));numbers.append(metricCard('70% MAO',money(mao70),'ARV × 70% − rehab − assignment'));numbers.append(metricCard('Projected flip spread',money(flip),'Before financing/tax; edit assumptions'));};
      const analyzer=el('div',{class:'card dealanalyzer'},[el('div',{class:'sectiontitle'},'Deal Analyzer'),el('div',{class:'hint'},hasArv()?'Change the assumptions. Verified property facts remain separate from your deal assumptions.':'ARV-dependent deal math is intentionally withheld until Better has sufficient verified property/comp evidence.'),twoUp('Purchase / contract price',ask,'Repair scenario',rehabSel),twoUp('Assignment target',assignment,'Holding / closing allowance',hold),numbers]);[rehabSel,ask,assignment,hold].forEach(x=>x.oninput=update);update();results.appendChild(analyzer);

      const assumptions=el('div',{class:'card compsworkspace'},[el('div',{class:'sectiontitle'},'Smart Comps Workspace · Comp-supported valuation'),el('div',{class:'hint'},'Better favors recent nearby SOLD comps and does not use disputed subject facts as if they were verified. Add or remove sold comps you trust below.')]);(a.assumptions||[]).forEach(x=>assumptions.appendChild(el('div',{class:'rehabrow'},[el('span',{},x)])));(a.warnings||[]).forEach(x=>assumptions.appendChild(el('div',{class:'hint'},`Review: ${x}`)));results.appendChild(assumptions);
      const verifiedComps=(ev.comps||[]).filter(x=>x.salePrice).map(x=>({...x})),compHost=el('div',{class:'verified-comp-list'}),compSummary=el('div',{class:'comp-summary'});
      const repaintComps=async()=>{compHost.innerHTML='';compSummary.innerHTML='';if(!verifiedComps.length){compHost.appendChild(el('div',{class:'hint'},'No researched sold comps are available yet. Add verified closed sales manually if you have them.'));return}let ca;try{ca=(await api('POST','/api/deal-builder/comp-analysis',{subject:p,comps:verifiedComps})).compAnalysis}catch(e){compSummary.textContent=e.message;return}ca.selected.forEach(c=>compHost.appendChild(el('div',{class:'verified-comp-row'},[el('div',{class:'grow'},[el('b',{},c.address||'Sold comparable'),el('span',{},`${money(c.salePrice)}${c.saleDate?' · sold '+c.saleDate:''}${c.distanceMiles?` · ${c.distanceMiles} mi`:''}`),el('small',{},`Similarity ${c.similarity}%${c.squareFootage?' · '+Number(c.squareFootage).toLocaleString()+' sf':''}${c.reasons?.length?' · Review: '+c.reasons.join(', '):''}`)]),el('button',{class:'btn-ghost compactbtn',onclick:()=>{const ix=verifiedComps.findIndex(x=>String(x.address)===String(c.address)&&Number(x.salePrice)===Number(c.salePrice));if(ix>=0)verifiedComps.splice(ix,1);repaintComps();}},'Remove')])));if(ca.estimate){workingArv=Number(ca.estimate)||workingArv;compSummary.append(metricCard('Comp-supported ARV',money(ca.estimate),`${ca.confidence} confidence · ${ca.selected.length} selected sold comp${ca.selected.length===1?'':'s'}`),el('div',{class:'hint'},`Observed comp range ${money(ca.low)}–${money(ca.high)}. ${ca.warnings.join(' ')}`));update();}};
      const compCard=el('div',{class:'card verified-comps-card'},[el('div',{class:'sectiontitle'},'Verified sold comps · researched automatically'),el('div',{class:'hint'},ev.configured?'Closed sales from authorized MLS feeds and nearby Regrid recorded sales are prioritized. Public-web sold evidence is fallback/context unless distance and sale facts are independently established. Better screens distance, recency, size, type, beds/baths, age, duplicates and outliers before ARV can unlock.':'No live evidence source is connected. Add closed-sale evidence you trust manually.')]);
      const addComp=el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add verified sold comp',[{key:'address',label:'Comp address',placeholder:'123 Comparable St'},{key:'salePrice',label:'Sold price',type:'number'},{key:'saleDate',label:'Sale date',type:'date'},{key:'distanceMiles',label:'Distance (miles)',type:'number'},{key:'squareFootage',label:'Square feet',type:'number'},{key:'bedrooms',label:'Beds',type:'number'},{key:'bathrooms',label:'Baths',type:'number'},{key:'yearBuilt',label:'Year built',type:'number'},{key:'propertyType',label:'Property type',placeholder:'Single family'}],'Add sold comp',async v=>{if(!v.address.trim()||Number(v.salePrice)<=0)throw new Error('Comp address and sold price are required.');verifiedComps.push({...v,salePrice:Number(v.salePrice),distanceMiles:Number(v.distanceMiles)||null,squareFootage:Number(v.squareFootage)||null,bedrooms:Number(v.bedrooms)||null,bathrooms:Number(v.bathrooms)||null,yearBuilt:Number(v.yearBuilt)||null});await repaintComps();})},'Add verified sold comp');compCard.append(addComp,compSummary,compHost);results.appendChild(compCard);await repaintComps();
      const rh=el('div',{class:'card rehabcards'},[el('div',{class:'sectiontitle'},'Repair Scenarios'),el('div',{class:'hint'},'Planning allowances based on verified size/age when available — not a property inspection. Choose only after reviewing actual condition.')]);(a.rehab||[]).forEach(x=>rh.appendChild(el('div',{class:'rehabrow'},[el('div',{},[el('b',{},x.label),el('div',{class:'hint'},x.scope)]),el('strong',{},`${money(x.estimate)} · ~$${x.perSqFt}/sf`)])));results.appendChild(rh);
      const use=el('button',{class:'submitbtn'},'Use this property in a new listing');use.onclick=()=>{state.dealBuilderDraft={address:p.addressLine1||p.formattedAddress||address.value,city:[p.city,p.state].filter(Boolean).join(', '),propertyType:p.propertyType||'',arv:calcArv()||'',beds:p.bedrooms,baths:p.bathrooms,sqft:p.squareFootage,year:p.yearBuilt,rehab:(a.rehab||[]).find(x=>x.key===rehabSel.value)?.estimate||'',asking:ask.value,notes:aiDraft?.description||''};go('compose')};results.appendChild(use);
    }catch(e){status.textContent=e.message}finally{run.disabled=false;run.textContent='Analyze property'}
  }
  run.onclick=()=>analyze(false);
  return wrap;
}
function metricCard(k,v,s){return el('div',{class:'metriccard'},[el('span',{},k),el('strong',{},v),el('small',{},s||'')])}

async function renderBuyerCRM(){
  const wrap=el('div',{class:'page buyercrmpage'});wrap.appendChild(el('div',{class:'pagehead'},[el('div',{},[el('h2',{},'Buyer CRM'),el('div',{class:'sub'},'A private follow-up pipeline for the buyers behind your deals.')]),el('button',{class:'btn-primary',onclick:()=>openEditor()},'Add buyer')])); const host=el('div');wrap.appendChild(host);
  async function load(){const r=await api('GET','/api/buyer-crm');host.innerHTML=''; if(!r.contacts.length){host.appendChild(el('div',{class:'empty'},[el('h3',{},'Build your buyer pipeline'),el('p',{},'Save buyer criteria, follow-up status and private notes so relationships do not disappear into spreadsheets and DMs.'),el('button',{class:'btn-primary',onclick:()=>openEditor()},'Add first buyer')]));return} const board=el('div',{class:'crmgrid'}); ['new','contacted','interested','pof','offer','closed','inactive'].forEach(st=>{const col=el('div',{class:'crmcol'},[el('h3',{},st==='pof'?'POF received':st[0].toUpperCase()+st.slice(1))]);r.contacts.filter(x=>x.status===st).forEach(x=>col.appendChild(el('button',{class:'crmcard',onclick:()=>openEditor(x)},[el('b',{},x.name),el('span',{},x.markets||'No market saved'),el('small',{},x.buyBox||x.email||'Open to add criteria')] )));board.appendChild(col)});host.appendChild(board)}
  function openEditor(x={}){const modal=el('div',{class:'tutorialshade'}),card=el('div',{class:'tutorialcard crmeditor'}); const f={name:el('input',{value:x.name||'',placeholder:'Buyer / company name'}),email:el('input',{value:x.email||'',placeholder:'Email'}),phone:el('input',{value:x.phone||'',placeholder:'Phone'}),markets:el('input',{value:x.markets||'',placeholder:'Markets / ZIPs'}),buyBox:el('textarea',{placeholder:'Property types, price range, rehab tolerance, strategy…'},x.buyBox||''),notes:el('textarea',{placeholder:'Private relationship and follow-up notes'},x.notes||''),status:el('select',{},['new','contacted','interested','pof','offer','closed','inactive'].map(v=>el('option',{value:v,selected:(x.status||'new')===v?'selected':null},v==='pof'?'POF received':v[0].toUpperCase()+v.slice(1))))}; card.appendChild(el('h2',{},x.id?'Edit buyer':'Add buyer')); ['name','email','phone','markets','buyBox','notes','status'].forEach(k=>{card.appendChild(el('label',{},({name:'Name',email:'Email',phone:'Phone',markets:'Markets',buyBox:'Buy box',notes:'Private notes',status:'Pipeline status'})[k]));card.appendChild(f[k])}); const actions=el('div',{class:'tutorialactions'}); if(x.id)actions.appendChild(el('button',{class:'btn-danger',onclick:async()=>{if(confirm('Remove this buyer from your private CRM?')){await api('DELETE','/api/buyer-crm/'+x.id);modal.remove();load()}}},'Delete'));actions.appendChild(el('button',{class:'btn-ghost',onclick:()=>modal.remove()},'Cancel'));actions.appendChild(el('button',{class:'btn-primary',onclick:async()=>{try{await api('POST','/api/buyer-crm',{id:x.id,...Object.fromEntries(Object.entries(f).map(([k,e])=>[k,e.value]))});modal.remove();load()}catch(e){toast(e.message,'err')}}},'Save buyer'));card.appendChild(actions);modal.appendChild(card);document.body.appendChild(modal)}
  await load();return wrap;
}

async function renderCompose() {
  const wrap = el('div', { class: 'panel composepage' });
  wrap.appendChild(el('h2', {}, 'Post a property'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Appears in the feed immediately, ranked for the buyers it fits.'));
  const f = {
    address: el('input', { placeholder: '123 Maple St' }),
    city: el('input', { placeholder: 'Austin, TX' }),
    propertyType: el('select', {}, ['Single family','Multi-family','Condo','Townhouse','Land','Mobile home','Commercial'].map(s => el('option', { value: s }, s))),
    situation: el('select', {}, ['Motivated seller','Probate','Divorce','Pre-foreclosure','Investor exit','Inherited property','Tired landlord'].map(s => el('option', { value: s }, s))),
    asking: el('input', { type: 'number', placeholder: '185000' }),
    arv: el('input', { type: 'number', placeholder: '260000' }),
    rehab: el('input', { type: 'number', placeholder: '35000' }),
    beds: el('input', { type: 'number', placeholder: '3' }),
    baths: el('input', { type: 'number', placeholder: '2' }),
    sqft: el('input', { type: 'number', placeholder: '1450' }),
    year: el('input', { type: 'number', placeholder: '1978' }),
    timeline: el('select', {}, ['ASAP','2-4 weeks','1-2 months','Flexible'].map(s => el('option', { value: s }, s))),
    contractDeadline: el('input', { type: 'date' }),
    videoUrl: el('input', { placeholder: 'https://youtube.com/… (optional walkthrough)' }),
    notes: el('textarea', { placeholder: 'Condition, access, why they\'re selling.' })
  };
  if (state.dealBuilderDraft) { const d=state.dealBuilderDraft; ['address','city','propertyType','asking','arv','rehab','beds','baths','sqft','year','notes'].forEach(k=>{ if(d[k]!==undefined&&d[k]!==null&&f[k]) f[k].value=d[k]; }); state.dealBuilderDraft=null; }
  const builderLink = el('button',{class:'btn-primary',type:'button',onclick:()=>go('dealbuilder')},'Analyze an address with AI Deal Builder');
  wrap.appendChild(el('div',{class:'dealbuilderentry'},[el('div',{},[el('b',{},'Starting with an address?'),el('div',{class:'hint'},'Generate a preliminary description, ARV range, repair scenarios and deal analysis from the address before you build the listing.')]),builderLink]));
  const importText = el('textarea', { placeholder: 'Paste your existing Facebook deal post, email blast, text message or deal notes here…', style: 'min-height:130px' });
  const importStatus = el('div', { class: 'hint' });
  const importBtn = el('button', { class: 'btn-ghost', type: 'button' }, 'Import existing deal');
  importBtn.onclick = async () => {
    if (!importText.value.trim()) { importStatus.textContent = 'Paste an existing deal first.'; return; }
    importBtn.disabled = true; importBtn.textContent = 'Reading deal…'; importStatus.textContent = '';
    try {
      const r = await api('POST', '/api/dispo/parse', { text: importText.value });
      const d = r.deal || {};
      if (d.address) f.address.value = d.address;
      if (d.city) f.city.value = d.city;
      if (d.propertyType) f.propertyType.value = d.propertyType;
      if (d.situation) f.situation.value = d.situation;
      ['asking','arv','rehab','beds','baths','sqft','year'].forEach(k => { if (d[k] !== null && d[k] !== undefined && d[k] !== '') f[k].value = d[k]; });
      if (d.timeline && [...f.timeline.options].some(o => o.value === d.timeline)) f.timeline.value = d.timeline;
      if (d.contractDeadline) f.contractDeadline.value = d.contractDeadline;
      if (d.notes) f.notes.value = d.notes;
      importStatus.textContent = (r.enhanced ? 'AI-enhanced import applied. ' : 'Smart import applied. ') + (d.warnings?.length ? d.warnings.join(' ') : 'Review the fields, add photos, then post.');
    } catch (e) { importStatus.textContent = e.message; }
    finally { importBtn.disabled = false; importBtn.textContent = 'Import existing deal'; }
  };
  let dispoUsage=null; try{dispoUsage=(await api('GET','/api/tools/usage')).dispoAi;}catch{}
  wrap.appendChild(el('div', { class: 'dispoimport' }, [
    el('div', { class: 'dispoeyebrow' }, 'AUTO AI DEAL BUILDER'),
    el('h3', {}, 'Turn messy deal notes into a ready-to-market deal.'),
    el('div', { class: 'hint' }, 'Paste a Facebook post, email blast, text thread or rough notes. Better Real Estate extracts the deal facts, then Better Dispo handles buyer matching and distribution after you post.'),
    state.access?.pro ? el('div', { class: 'usagepill '+(dispoUsage?.unlimited?'unlimited':''), style:'margin-top:8px' }, dispoUsage?.unlimited?'Unlimited AI-enhanced imports':`${dispoUsage?.remaining ?? 0} of ${dispoUsage?.limit ?? 3} AI-enhanced imports remaining today`) : el('div',{class:'hint',style:'margin-top:6px'},'Smart import is available to everyone. Better Plus adds 3 AI-enhanced imports per day; Platinum is unlimited.'),
    state.access?.pro ? el('div', { class: 'hint', style: 'margin-top:6px' }, 'AI enhancement may send the pasted text to the configured AI provider. Review it before submitting if it contains information you do not want sent to the AI provider.') : null,
    importText, importBtn, importStatus
  ]));

  state.composePhotos = [];
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  const preview = el('div', { class: 'previewrow' });
  const picker = el('div', { class: 'picker', onclick: () => fileInput.click() }, 'Tap to add photos (up to 12)');
  fileInput.onchange = async () => {
    for (const file of [...fileInput.files].slice(0, 12 - state.composePhotos.length)) state.composePhotos.push(await downscale(file));
    fileInput.value = ''; draw();
  };
  function draw() {
    preview.innerHTML = '';
    state.composePhotos.forEach((p, i) => preview.appendChild(el('div', { class: 'pv' }, [
      el('img', { src: p }), el('button', { onclick: () => { state.composePhotos.splice(i, 1); draw(); } }, '×')
    ])));
    picker.textContent = state.composePhotos.length ? `Add more (${state.composePhotos.length}/12)` : 'Tap to add photos (up to 12)';
  }
  wrap.appendChild(el('label', {}, 'Photos')); wrap.appendChild(picker); wrap.appendChild(fileInput); wrap.appendChild(preview);
  wrap.appendChild(el('label', {}, 'Address')); wrap.appendChild(f.address);
  wrap.appendChild(el('label', {}, 'City / State')); wrap.appendChild(f.city);
  wrap.appendChild(el('label', {}, 'Property type')); wrap.appendChild(f.propertyType);
  wrap.appendChild(el('label', {}, 'Situation')); wrap.appendChild(f.situation);
  wrap.appendChild(twoUp('Asking price ($)', f.asking, 'Estimated ARV ($)', f.arv));
  wrap.appendChild(el('label', {}, 'Rehab estimate ($)')); wrap.appendChild(f.rehab);
  wrap.appendChild(twoUp('Beds', f.beds, 'Baths', f.baths));
  wrap.appendChild(twoUp('Sq ft', f.sqft, 'Year built', f.year));
  wrap.appendChild(el('label', {}, 'Seller timeline')); wrap.appendChild(f.timeline);
  wrap.appendChild(el('label', {}, 'Contract / assignment deadline (optional)')); wrap.appendChild(f.contractDeadline);
  wrap.appendChild(el('label', {}, 'Video walkthrough')); wrap.appendChild(f.videoUrl);
  wrap.appendChild(el('label', {}, 'Notes')); wrap.appendChild(f.notes);
  const openToJV = el('input', { type:'checkbox' });
  wrap.appendChild(el('label', { class:'checkrow dealoption' }, [openToJV, el('span', {}, [el('b', {}, 'Open to JV opportunities'), el('small', {}, 'Let other professionals know you are open to discussing a joint venture on this deal.')]) ]));
  if (state.access?.platinum || state.user?.role === 'admin') {
    const aiMsg = el('div', { class: 'hint' });
    const aiBtn = el('button', { class: 'btn-ghost', type: 'button' }, '✨ Draft property notes with AI');
    aiBtn.onclick = async () => {
      aiBtn.disabled = true; aiBtn.textContent = 'Writing…'; aiMsg.textContent = '';
      try {
        const r = await api('POST', '/api/ai/listing-copy', {
          kind: 'property',
          facts: { city: f.city.value, propertyType: f.propertyType.value, situation: f.situation.value, asking: f.asking.value, arv: f.arv.value, rehab: f.rehab.value, beds: f.beds.value, baths: f.baths.value, sqft: f.sqft.value, yearBuilt: f.year.value, timeline: f.timeline.value, existingNotes: f.notes.value },
          images: state.composePhotos.slice(0, 3)
        });
        if (r.draft.description) f.notes.value = r.draft.description;
        aiMsg.textContent = r.draft.warnings?.length ? `Draft applied. ${r.draft.warnings.join(' ')}` : 'Draft applied. Review it before posting.';
      } catch (e) { aiMsg.textContent = e.message; }
      finally { aiBtn.disabled = false; aiBtn.textContent = '✨ Rewrite property notes with AI'; }
    };
    wrap.appendChild(el('div', { class: 'aibox' }, [el('b', {}, 'Platinum AI Property Assistant'), el('div', { class: 'hint' }, 'Uses property facts and photos, with fair-housing-safe instructions. Exact street address is not sent to the AI.'), aiBtn, aiMsg]));
  } else {
    wrap.appendChild(el('div', { class: 'aibox' }, [el('b', {}, 'AI property writing — Platinum'), el('div', { class: 'hint' }, 'Turn your property facts and photos into clean listing notes.'), el('button', { class: 'btn-ghost', type: 'button', onclick: () => go('upgrade') }, 'See Platinum')]));
  }
  const err = el('div', { class: 'errmsg' });
  const submit = el('button', { class: 'submitbtn' }, 'Post to feed');
  submit.onclick = async () => {
    err.textContent = ''; submit.disabled = true; submit.textContent = 'Posting…';
    try {
      const payload = { photos: state.composePhotos };
      for (const k in f) payload[k] = f[k].value;
      payload.openToJV = openToJV.checked;
      const r = await api('POST', '/api/listings', payload);
      state.composePhotos = [];
      toast(r.matchCount ? `Posted — ${r.matchCount} buyer${r.matchCount === 1 ? '' : 's'} currently match this deal.` : 'Posted — Better Dispo is checking buyer demand.', 'ok');
      go('detail', { detailId: r.listing.id, photoIdx: 0 });
    } catch (e) { err.textContent = e.message; submit.disabled = false; submit.textContent = 'Post to feed'; }
  };
  wrap.appendChild(err); wrap.appendChild(submit);
  return wrap;
}
function twoUp(l1, i1, l2, i2) {
  return el('div', { class: 'row2' }, [el('div', {}, [el('label', {}, l1), i1]), el('div', {}, [el('label', {}, l2), i2])]);
}
function downscale(file, max = 1280) {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ================= SAVED / MESSAGES ================= */
async function renderSaved() {
  const wrap = el('div', { class: 'page savedpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2', {}, 'Liked properties'),el('div',{class:'sub'},'Liked properties are watched automatically. Turn change notifications off anytime without removing the property.')]),el('button',{class:'btn-ghost',onclick:()=>go('workspace')},'Compare') ]));
  const { listings } = await api('GET', '/api/saves/mine');
  if (!listings.length) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Nothing liked yet'), el('p', {}, 'Tap ♡ on a property in your feed. We’ll watch it for meaningful changes by default.')])); return wrap; }
  const grid = el('div', { class: 'watchgrid' });
  listings.forEach(l => {
    const toggle=el('button',{class:'watchtoggle '+(l.notifyChanges?'on':'')},l.notifyChanges?'Notifications on':'Notifications off');
    toggle.onclick=async e=>{e.stopPropagation();const next=!l.notifyChanges;const r=await api('PATCH','/api/saves/'+encodeURIComponent(l.id)+'/notifications',{enabled:next});l.notifyChanges=r.enabled;toggle.className='watchtoggle '+(r.enabled?'on':'');toggle.textContent=r.enabled?'Notifications on':'Notifications off';toast(r.enabled?'Change notifications enabled':'Notifications paused','ok');};
    grid.appendChild(el('div',{class:'watchcard'},[el('div',{class:'watchphoto',onclick:()=>go('detail',{detailId:l.id,photoIdx:0})},l.photos?.length?el('img',{src:l.photos[0]}):el('div',{class:'nophoto'},'No photo')),el('div',{class:'watchbody'},[el('b',{onclick:()=>go('detail',{detailId:l.id,photoIdx:0})},l.address),el('span',{},l.city+' · '+money(l.asking)),toggle]) ]));
  });
  wrap.appendChild(grid); return wrap;
}

function avatarNode(user, sizeClass = '') {
  return el('div', { class: 'personav ' + sizeClass }, user?.avatarUrl ? el('img', { src: user.avatarUrl, alt: '' }) : initials(user?.name));
}
function friendLabel(status) {
  return status === 'friends' ? 'Friends ✓' : status === 'outgoing_pending' ? 'Requested' : status === 'incoming_pending' ? 'Accept friend' : 'Add friend';
}
function friendButton(user, onChanged) {
  const b = el('button', { class: 'friendbtn' }, friendLabel(user.friendStatus));
  b.onclick = async (ev) => {
    ev?.stopPropagation?.();
    try {
      if (user.friendStatus === 'none' || !user.friendStatus) {
        const r = await api('POST', '/api/friends/request', { userId: user.id });
        user.friendStatus = r.status; user.friendRequestId = r.requestId || null;
      } else if (user.friendStatus === 'incoming_pending') {
        const r = await api('POST', '/api/friends/requests/' + encodeURIComponent(user.friendRequestId) + '/respond', { action: 'accept' });
        user.friendStatus = r.status; user.friendRequestId = null;
      } else if (user.friendStatus === 'outgoing_pending') {
        await api('DELETE', '/api/friends/request/' + encodeURIComponent(user.friendRequestId));
        user.friendStatus = 'none'; user.friendRequestId = null;
      } else if (user.friendStatus === 'friends') {
        if (!confirm('Remove ' + user.name + ' from your friends?')) return;
        await api('DELETE', '/api/friends/' + encodeURIComponent(user.id));
        user.friendStatus = 'none'; user.friendRequestId = null;
      }
      await refreshUnread();
      b.textContent = friendLabel(user.friendStatus);
      if (onChanged) onChanged(user);
    } catch (e) { toast(e.message, 'err'); }
  };
  return b;
}
function personCard(user, opts = {}) {
  const card = el('div', { class: 'personcard' });
  const main = el('div', { class: 'personmain', onclick: () => go('profile', { profileId: user.id }) }, [
    avatarNode(user),
    el('div', { class: 'personmeta' }, [
      el('div', { class: 'personname' }, [user.name, user.verified ? el('span', { class: 'vbadge' }, '✓') : null]),
      user.username ? el('div', { class: 'personhandle' }, '@' + user.username) : null,
      el('div', { class: 'personsub' }, [user.company?.name, user.role, ...(user.markets || []), user.location].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(' · ')),
      el('div', { class: 'personstats' }, `${user.listingCount || 0} listings · ${user.followerCount || 0} followers · ${user.friendCount || 0} friends`)
    ])
  ]);
  card.appendChild(main);
  const actions = el('div', { class: 'personactions' });
  const follow = el('button', {}, user.following ? 'Following' : 'Follow');
  follow.onclick = async () => {
    try { const r = await api('POST', '/api/follow', { userId: user.id }); user.following = r.following; follow.textContent = r.following ? 'Following' : 'Follow'; }
    catch (e) { toast(e.message, 'err'); }
  };
  actions.appendChild(follow);
  actions.appendChild(friendButton(user, opts.onFriendChanged));
  actions.appendChild(el('button', { class: 'primary', onclick: () => go('chat', { chatUserId: user.id }) }, 'Message'));
  card.appendChild(actions);
  return card;
}

function buyingStatusLabel(v) { return v === 'paused' ? 'Paused' : v === 'selective' ? 'Selective' : 'Actively buying'; }
function buyerDemandCard(row) {
  const u = row.user || {};
  const card = el('div', { class: 'buyerdemandcard' });
  card.appendChild(el('div', { class: 'buyerdemandhead' }, [
    avatarNode(u, 'small'),
    el('div', { class: 'grow' }, [
      el('div', { class: 'personname', onclick: () => go('profile', { profileId: u.id }) }, [u.name || 'Buyer', u.verified ? el('span', { class: 'vbadge' }, '✓') : null]),
      u.username ? el('div', { class: 'personhandle' }, '@' + u.username) : null,
      el('div', { class: 'personsub' }, [row.company?.name, row.strategy, ...(row.states || []), ...(row.cities || [])].filter(Boolean).slice(0,4).join(' · '))
    ]),
    el('span', { class: 'buyingstatus ' + (row.buyingStatus || 'active') }, buyingStatusLabel(row.buyingStatus))
  ]));
  card.appendChild(el('div', { class: 'buyerdemandtitle' }, row.label || 'Buy box'));
  const price = `${money(row.minPrice || 0)} – ${money(row.maxPrice || 2000000)}`;
  card.appendChild(el('div', { class: 'buyerdemandfacts' }, [
    el('span', {}, price),
    ...(row.propertyTypes || []).slice(0,3).map(x => el('span', {}, x)),
    row.minSpread ? el('span', {}, `Min spread ${money(row.minSpread)}`) : null
  ].filter(Boolean)));
  card.appendChild(el('div', { class: 'personactions' }, [
    el('button', { onclick: () => go('profile', { profileId: u.id }) }, 'View profile'),
    el('button', { onclick: () => shareNative({ kind: 'buyer', targetId: u.id, title: `${u.name || 'Investor'} is buying on Better Real Estate`, text: [...(row.cities || []).slice(0,3), row.strategy].filter(Boolean).join(' · ') }) }, 'Share'),
    el('button', { class: 'primary', onclick: () => go('chat', { chatUserId: u.id }) }, 'Message buyer')
  ]));
  return card;
}

async function renderNetwork() {
  const wrap = el('div', { class: 'page networkpage' });
  wrap.appendChild(el('div', { class: 'pageheadrow' }, [
    el('div', {}, [el('h2', {}, 'Network'), el('div', { class: 'sub' }, 'Find buyers, sellers and people you want to work with.')]),
    el('button', { class: 'btn-ghost', onclick: () => go('leaderboard') }, 'Leaderboard')
  ]));
  const tabs = el('div', { class: 'networktabs' });
  [['discover','Discover'],['buyers','Buyers Looking'],['friends','Friends'],['requests','Requests']].forEach(([key, label]) => {
    tabs.appendChild(el('button', { class: state.networkTab === key ? 'active' : '', onclick: () => { state.networkTab = key; writeRoute('replace'); render(); } }, label));
  });
  wrap.appendChild(tabs);


  if (state.networkTab === 'buyers') {
    const hero = el('div', { class: 'buyerslookinghero' }, [
      el('div', {}, [el('div', { class: 'dispoeyebrow' }, 'LIVE BUYER DEMAND'), el('h3', {}, 'See what investors are buying right now'), el('div', { class: 'sub' }, 'These are public buy boxes from Better Real Estate members. Message buyers whose criteria fit your deal.')]),
      el('button', { class: 'btn-primary', onclick: () => go('buybox') }, 'Publish my buy box')
    ]);
    wrap.appendChild(hero);
    const q = el('input', { placeholder: 'Search market, strategy, buyer, company or property type…', value: state.buyerDemandQ || '' });
    wrap.appendChild(q);
    const host = el('div', { class: 'buyerdemandgrid' }); wrap.appendChild(host);
    let timer = null, seq = 0;
    const load = async () => {
      const mine = ++seq; state.buyerDemandQ = q.value;
      host.innerHTML = '<div class="networkloading">Finding active buyers…</div>';
      try {
        const r = await api('GET', '/api/buyers-looking?q=' + encodeURIComponent(q.value));
        if (mine !== seq) return;
        host.innerHTML = '';
        if (!r.buyers.length) { host.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No public buy boxes found'), el('p', {}, 'Be the first buyer to publish what you are looking for.'), el('button', { class: 'btn-primary', onclick: () => go('buybox') }, 'Publish my buy box')])); return; }
        r.buyers.forEach(x => host.appendChild(buyerDemandCard(x)));
      } catch (e) { host.innerHTML = ''; host.appendChild(el('div', { class: 'errmsg' }, e.message)); }
    };
    q.oninput = () => { clearTimeout(timer); timer = setTimeout(load, 220); };
    await load();
    return wrap;
  }

  if (state.networkTab === 'friends') {
    const { friends } = await api('GET', '/api/friends');
    wrap.appendChild(el('div', { class: 'sub' }, friends.length ? `${friends.length} friend${friends.length === 1 ? '' : 's'}` : 'People you mutually connect with will show here.'));
    if (!friends.length) {
      wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No friends yet'), el('p', {}, 'Use Discover to find people and send a friend request.'), el('button', { class: 'btn-primary', onclick: () => { state.networkTab = 'discover'; render(); } }, 'Find people')]));
      return wrap;
    }
    const list = el('div', { class: 'peoplegrid' });
    friends.forEach(u => list.appendChild(personCard(u, { onFriendChanged: () => render() })));
    wrap.appendChild(list); return wrap;
  }

  if (state.networkTab === 'requests') {
    const { incoming, outgoing } = await api('GET', '/api/friends/requests');
    wrap.appendChild(el('div', { class: 'sectiontitle' }, `Incoming${incoming.length ? ' · ' + incoming.length : ''}`));
    if (!incoming.length) wrap.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'No incoming friend requests.')));
    else {
      const card = el('div', { class: 'card' });
      incoming.forEach(r => {
        const accept = el('button', {}, 'Accept');
        accept.onclick = async () => { try { await api('POST', '/api/friends/requests/' + encodeURIComponent(r.id) + '/respond', { action: 'accept' }); await refreshUnread(); render(); } catch (e) { toast(e.message, 'err'); } };
        const decline = el('button', {}, 'Decline');
        decline.onclick = async () => { try { await api('POST', '/api/friends/requests/' + encodeURIComponent(r.id) + '/respond', { action: 'decline' }); await refreshUnread(); render(); } catch (e) { toast(e.message, 'err'); } };
        card.appendChild(el('div', { class: 'listrow' }, [avatarNode(r.user, 'small'), el('div', { class: 'grow', onclick: () => go('profile', { profileId: r.user.id }) }, [el('div', { class: 't' }, r.user.name), el('div', { class: 's' }, [r.user.role, ...(r.user.markets || [])].filter(Boolean).slice(0, 2).join(' · '))]), accept, decline]));
      });
      wrap.appendChild(card);
    }
    wrap.appendChild(el('div', { class: 'sectiontitle' }, `Sent${outgoing.length ? ' · ' + outgoing.length : ''}`));
    if (!outgoing.length) wrap.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'No pending requests sent.')));
    else {
      const card = el('div', { class: 'card' });
      outgoing.forEach(r => {
        const cancel = el('button', {}, 'Cancel');
        cancel.onclick = async () => { try { await api('DELETE', '/api/friends/request/' + encodeURIComponent(r.id)); await refreshUnread(); render(); } catch (e) { toast(e.message, 'err'); } };
        card.appendChild(el('div', { class: 'listrow' }, [avatarNode(r.user, 'small'), el('div', { class: 'grow', onclick: () => go('profile', { profileId: r.user.id }) }, [el('div', { class: 't' }, r.user.name), el('div', { class: 's' }, 'Request pending')]), cancel]));
      });
      wrap.appendChild(card);
    }
    return wrap;
  }

  const controls = el('div', { class: 'networksearch' });
  const q = el('input', { placeholder: 'Search name, @username, company, market or role…', value: state.networkQ || '' });
  const role = el('select');
  [['all','All people'],['buyer','Buyers'],['seller','Sellers']].forEach(([v,l]) => role.appendChild(el('option', { value: v, selected: state.networkRole === v ? 'selected' : null }, l)));
  controls.appendChild(q); controls.appendChild(role); wrap.appendChild(controls);
  const results = el('div', { class: 'peoplegrid' }); wrap.appendChild(results);
  let searchTimer = null, seq = 0;
  const load = async () => {
    const mine = ++seq;
    state.networkQ = q.value; state.networkRole = role.value;
    results.innerHTML = '<div class="networkloading">Searching…</div>';
    try {
      const data = await api('GET', '/api/network/users?q=' + encodeURIComponent(q.value) + '&role=' + encodeURIComponent(role.value));
      if (mine !== seq) return;
      results.innerHTML = '';
      if (!data.users.length) { results.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No people found'), el('p', {}, 'Try another name, market, role or keyword.')])); return; }
      data.users.forEach(u => results.appendChild(personCard(u)));
    } catch (e) { if (mine === seq) { results.innerHTML = ''; results.appendChild(el('div', { class: 'errmsg' }, e.message)); } }
  };
  q.oninput = () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 260); };
  role.onchange = load;
  await load();
  return wrap;
}

async function renderDemandInsights() {
  const wrap=el('div',{class:'page insightspage'});
  wrap.appendChild(el('button',{class:'backbtn',onclick:()=>go('me')},'← Back'));
  wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'homeeyebrow'},'BUYER DEMAND'),el('h2',{},'Demand Insights'),el('div',{class:'sub'},'A live view of public buy-box demand already on Better Real Estate. Counts reflect published criteria, not guaranteed transactions.')]),el('button',{class:'btn-primary',onclick:()=>go('network',{networkTab:'buyers'})},'Open Buyers Looking')]));
  try{
    const d=await api('GET','/api/demand-insights');
    wrap.appendChild(el('div',{class:'insightsummary'},[stat(d.activeBuyBoxes,'Active public buy boxes'),stat(d.markets.length,'Markets represented'),stat(d.propertyTypes.length,'Property types')]));
    const section=(title,rows)=>el('div',{class:'insightblock'},[el('h3',{},title), rows.length?el('div',{class:'insightranks'},rows.map((r,i)=>el('div',{class:'insightrank'},[el('span',{class:'ranknum'},String(i+1).padStart(2,'0')),el('b',{class:'grow'},r.label),el('span',{class:'pill'},`${r.count} buy box${r.count===1?'':'es'}`)]))):el('div',{class:'empty compact'},el('p',{},'No public demand data yet.'))]);
    wrap.appendChild(el('div',{class:'insightsgrid'},[section('Top markets',d.markets),section('Property types',d.propertyTypes),section('Strategies',d.strategies)]));
  }catch(e){wrap.appendChild(el('div',{class:'errmsg'},e.message));}
  return wrap;
}

async function renderMessages() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('div', { class: 'pageheadrow' }, [
    el('div', {}, [el('h2', {}, 'Messages'), el('div', { class: 'sub' }, 'Your conversations with other members.')]),
    el('button', { class: 'btn-ghost', onclick: () => go('network') }, 'Find people')
  ]));
  const listHost = el('div');
  wrap.appendChild(listHost);

  const paint = async () => {
    const { conversations } = await api('GET', '/api/conversations');
    await refreshUnread();
    renderTop();
    renderTabs();
    listHost.innerHTML = '';
    if (!conversations.length) {
      listHost.appendChild(el('div', { class: 'empty' }, [
        el('h3', {}, 'No conversations yet'),
        el('p', {}, 'Message a seller from a listing, a friend, or someone you find in Network.'),
        el('button', { class: 'btn-primary', onclick: () => go('network') }, 'Open Network')
      ]));
      return;
    }
    const card = el('div', { class: 'chatlist' });
    conversations.forEach(c => card.appendChild(el('div', { class: 'chatrow' + (c.unreadCount ? ' unread' : ''), onclick: () => go('chat', { chatUserId: c.other.id }) }, [
      avatarNode(c.other),
      el('div', { class: 'chatpreview' }, [
        el('div', { class: 'chatpreviewtop' }, [el('b', {}, c.other.name), el('span', {}, formatChatTime(c.latest.at))]),
        el('div', { class: 'chatpreviewbody' }, (c.latest.outgoing ? 'You: ' : '') + c.latest.body),
        c.latest.listingAddress ? el('div', { class: 'chatcontext' }, 'Property: ' + c.latest.listingAddress) : null
      ]),
      c.unreadCount ? el('span', { class: 'unreadpill' }, String(c.unreadCount)) : null
    ])));
    listHost.appendChild(card);
  };

  await paint();
  startViewPolling(async () => {
    if (state.view !== 'messages') return;
    await paint();
  }, 7000);
  return wrap;
}
function formatChatTime(iso) {
  const d = new Date(iso); if (!Number.isFinite(d.getTime())) return '';
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}
async function renderChat() {
  if (!state.chatUserId) return renderMessages();
  let { other, messages } = await api('GET', '/api/conversations/' + encodeURIComponent(state.chatUserId));
  await refreshUnread();
  renderTop();
  renderTabs();
  const wrap = el('div', { class: 'page chatpage' });
  wrap.appendChild(el('div', { class: 'chathead' }, [
    el('button', { class: 'backbtn', onclick: () => go('messages') }, '← Messages'),
    el('div', { class: 'chatperson', onclick: () => go('profile', { profileId: other.id }) }, [avatarNode(other, 'small'), el('div', {}, [el('b', {}, other.name), el('span', {}, [other.role, ...(other.markets || [])].filter(Boolean).slice(0,2).join(' · '))])]),
    friendButton(other, () => {})
  ]));
  const stream = el('div', { class: 'chatstream' });
  wrap.appendChild(stream);
  const input = el('textarea', { placeholder: 'Write a message…', rows: '2' });
  const send = el('button', { class: 'btn-primary' }, 'Send');
  const composer = el('div', { class: 'chatcomposer' }, [input, send]);
  wrap.appendChild(composer);

  let lastSignature = '';
  const renderMessagesIntoStream = list => {
    const prevBottomGap = stream.scrollHeight - stream.scrollTop - stream.clientHeight;
    const shouldStickToBottom = prevBottomGap < 72;
    stream.innerHTML = '';
    if (!list.length) stream.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'Start the conversation.')));
    list.forEach(m => {
      const bubble = el('div', { class: 'bubble ' + (m.outgoing ? 'mine' : 'theirs') }, [
        m.listingAddress ? el('button', { class: 'bubblelisting', onclick: () => m.listingId && go('detail', { detailId: m.listingId, photoIdx: 0 }) }, 'Property · ' + m.listingAddress) : null,
        el('div', { class: 'bubbletext' }, m.body),
        el('div', { class: 'bubbletime' }, formatChatTime(m.at))
      ]);
      stream.appendChild(bubble);
    });
    if (shouldStickToBottom) stream.scrollTop = stream.scrollHeight;
  };
  const signatureFor = list => list.map(m => [m.id || m.at, m.body, m.outgoing ? '1' : '0'].join(':')).join('|');
  const syncChat = async ({ force = false } = {}) => {
    const currentUserId = state.chatUserId;
    const fresh = await api('GET', '/api/conversations/' + encodeURIComponent(currentUserId));
    if (state.view !== 'chat' || state.chatUserId !== currentUserId) return;
    other = fresh.other;
    messages = fresh.messages || [];
    const sig = signatureFor(messages);
    if (force || sig !== lastSignature) {
      lastSignature = sig;
      renderMessagesIntoStream(messages);
    }
    await refreshUnread();
    renderTop();
    renderTabs();
  };

  renderMessagesIntoStream(messages);
  lastSignature = signatureFor(messages);

  const doSend = async () => {
    const body = input.value.trim(); if (!body) return;
    send.disabled = true;
    try {
      await api('POST', '/api/messages', { toUserId: other.id, body });
      input.value = '';
      await syncChat({ force: true });
    }
    catch (e) { toast(e.message, 'err'); }
    finally { send.disabled = false; }
  };
  send.onclick = doSend;
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };
  setTimeout(() => { stream.scrollTop = stream.scrollHeight; input.focus(); }, 0);
  startViewPolling(async () => {
    if (state.view !== 'chat' || !state.chatUserId) return;
    await syncChat();
  }, 3000);
  return wrap;
}

function demoFounderPreview(){return state.user?.demo&&state.user?.demoPreview?.type==='founder'?state.user.demoPreview:null;}
function demoFounderPreviewDismissKey(preview=demoFounderPreview()){return preview?`bre-demo-founder-welcome-dismissed:${preview.createdAt||preview.position||'active'}`:null;}
function demoFounderPreviewDismissed(){const key=demoFounderPreviewDismissKey();return !!(key&&sessionStorage.getItem(key)==='1');}
function founderDisplayPosition(){return Number(demoFounderPreview()?.position||state.user?.founderLaunchPosition||0)||null;}
function founderInviteMessage(){
  const link=`${location.origin}/s/join?ref=${encodeURIComponent(state.user?.referralCode||'')}`;
  return {link,text:`I’m one of the first 100 Founding Members on Better Real Estate. It’s a real estate network and workspace for deals, buyers, investors, deal analysis, pipelines and more. Join through my link: ${link}`};
}
async function copyFounderInvite(){
  const {text}=founderInviteMessage();
  try{await navigator.clipboard.writeText(text);toast('Founder invite copied','ok');}catch{prompt('Copy your founder invite',text);}
}
function showFounderWelcome(force=false){
  const preview=demoFounderPreview();
  const position=founderDisplayPosition();
  if(!position)return;
  if(!preview&&!force&&state.user.founderLaunchNoticeSeenAt)return;
  if(state.founderWelcomeOpen)return;
  state.founderWelcomeOpen=true;
  const {link,text}=founderInviteMessage();
  const shade=el('div',{class:'founder-welcome-shade'}),card=el('div',{class:'founder-welcome-card',role:'dialog','aria-modal':'true'});
  const expires=preview?new Date(Date.now()+14*86400000).toLocaleDateString():(state.user.founderPlatinumUntil?new Date(state.user.founderPlatinumUntil).toLocaleDateString():null);
  card.append(
    el('div',{class:'founder-welcome-mark'},`#${position}`),
    el('div',{class:'eyebrow'},preview?'DEMO PREVIEW · FIRST 100 FOUNDING MEMBER':'FIRST 100 FOUNDING MEMBER'),
    el('h2',{},'You helped start Better Real Estate.'),
    el('p',{class:'founder-welcome-copy'},preview?`This is a safe preview of Founder #${position}. A real qualifying member would receive Founding Member recognition and 14 days of complimentary Platinum access${expires?` through ${expires}`:''}. Nothing is being awarded to this demo account.`:`You’re one of the first 100 qualifying members. Your account has Founding Member recognition${expires?` and complimentary Platinum access through ${expires}`:''}.`),
    el('div',{class:'founder-share-preview'},[el('small',{},'READY TO SHARE'),el('p',{},text)]),
    el('div',{class:'founder-welcome-actions'},[
      el('button',{class:'btn-ghost',onclick:copyFounderInvite},'Copy invite'),
      el('button',{class:'btn-ghost',onclick:async()=>{if(navigator.share){try{await navigator.share({title:'Better Real Estate',text,url:link});}catch{}}else copyFounderInvite();}},'Share'),
      el('button',{class:'btn-primary',onclick:async()=>{if(preview){const key=demoFounderPreviewDismissKey(preview);if(key)sessionStorage.setItem(key,'1');}else{try{await api('POST','/api/founder-program/acknowledge');state.user.founderLaunchNoticeSeenAt=new Date().toISOString();}catch{}}state.founderWelcomeOpen=false;shade.remove();render();}},preview?'Close preview':'Continue')
    ])
  );
  shade.appendChild(card);document.body.appendChild(shade);
}

function adminPlanLabel(plan){return plan==='wholesale'?'Wholesale Teams':plan==='platinum'?'Platinum':plan==='pro'?'Plus':plan==='admin'?'Admin':plan==='trial'?'Trial':'Free';}
function openAdminAccessModal(u,onDone=()=>{}){
  if(!u||u.role==='admin')return;
  const shade=el('div',{class:'quick-shade admin-access-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),card=el('div',{class:'quick-card admin-access-card'});
  const close=()=>shade.remove();
  const paidActive=u.paidPlan&&u.paidPlan!=='free'&&u.paidPlanUntil&&new Date(u.paidPlanUntil)>new Date();
  const founderUntil=u.access?.founderPlatinumUntil||u.founderAward?.platinumUntil||null;
  const founderActive=founderUntil&&new Date(founderUntil)>new Date();
  const grantActive=!!u.grant?.active;
  card.appendChild(el('div',{class:'quick-head admin-access-head'},[
    el('div',{},[el('div',{class:'eyebrow'},'ADMIN · MEMBERSHIP ACCESS'),el('h3',{},u.name),el('div',{class:'sub'},[u.username?'@'+u.username:null,u.email,accountAgeLabel(u.createdAt)].filter(Boolean).join(' · '))]),
    el('button',{class:'iconbtn',onclick:close,'aria-label':'Close'},'×')
  ]));
  card.appendChild(el('div',{class:'admin-access-summary'},[
    el('div',{class:'admin-access-stat'},[el('small',{},'PAID PLAN'),el('b',{},paidActive?adminPlanLabel(u.paidPlan):'None'),el('span',{},paidActive&&u.paidPlanUntil?`Through ${new Date(u.paidPlanUntil).toLocaleDateString()}`:'Paid billing stays separate')]),
    el('div',{class:'admin-access-stat'},[el('small',{},'COMPLIMENTARY'),el('b',{},grantActive?adminPlanLabel(u.grant.grantPlan):'None'),el('span',{},grantActive?`${u.grant.remainingDays||'—'} day${u.grant.remainingDays===1?'':'s'} remaining`:'No active admin grant')]),
    el('div',{class:'admin-access-stat'},[el('small',{},'FOUNDING BONUS'),el('b',{},u.founderAward?`Founder #${u.founderAward.position}`:'Not enrolled'),el('span',{},founderActive?`Platinum through ${new Date(founderUntil).toLocaleDateString()}`:u.founderAward?'Platinum bonus ended':'First 100 program only')]),
    el('div',{class:'admin-access-stat'},[el('small',{},'EFFECTIVE ACCESS'),el('b',{},u.access?.wholesale?'Wholesale Teams':u.access?.platinum?'Platinum':u.access?.pro?'Plus':u.access?.trial?'Trial':'Free'),el('span',{},'Resolved without changing paid billing')])
  ]));
  const form=el('div',{class:'admin-access-form'}),tier=el('select');[['platinum','Platinum'],['pro','Plus'],['wholesale','Wholesale Teams']].forEach(([v,l])=>tier.appendChild(el('option',{value:v},l)));
  if(grantActive)tier.value=u.grant.grantPlan;
  const duration=el('select');[['7','7 days'],['14','14 days'],['30','30 days'],['90','90 days'],['custom','Custom days']].forEach(([v,l])=>duration.appendChild(el('option',{value:v},l)));duration.value='30';
  const customDays=el('input',{type:'number',min:'1',max:'730',value:'30',placeholder:'1–730 days'});
  const reason=el('input',{value:u.grant?.grantReason||'Promotion / complimentary access',placeholder:'Reason for complimentary access'});
  const field=(label,node,help)=>el('label',{class:'admin-access-field'},[el('span',{},label),node,help?el('small',{},help):null]);
  const customField=field('Custom days',customDays,'Used only when Custom days is selected.');customField.style.display='none';
  duration.onchange=()=>{customField.style.display=duration.value==='custom'?'flex':'none';};
  form.append(field('Plan',tier,'Choose the complimentary tier.'),field('Duration',duration,'Preset or custom duration.'),customField,field('Reason',reason,'Recorded in the membership audit history.'));
  card.appendChild(form);
  const status=el('div',{class:'errmsg admin-access-status'});card.appendChild(status);
  const daysValue=()=>{const n=Number(duration.value==='custom'?customDays.value:duration.value);return Number.isFinite(n)?Math.floor(n):0;};
  const act=async(kind)=>{const n=daysValue();if(n<1||n>730){status.textContent='Choose a duration from 1 to 730 days.';return;}const label=kind==='extend'?'extend the current complimentary membership':grantActive?'replace the current complimentary membership':'grant complimentary access';if(!confirm(`Confirm: ${label} for ${u.name}?`))return;try{await api('POST','/api/admin/memberships/grant',{userId:u.id,tier:tier.value,days:n,reason:reason.value.trim(),mode:kind});toast(kind==='extend'?'Membership extended':grantActive?'Membership replaced':'Membership granted','ok');close();await onDone();}catch(e){status.textContent=e.message;}};
  const actions=el('div',{class:'admin-access-actions'});
  if(grantActive){
    actions.append(
      el('button',{class:'btn-ghost',onclick:()=>act('extend')},`Extend ${adminPlanLabel(u.grant.grantPlan)}`),
      el('button',{class:'btn-primary',onclick:()=>act('replace')},'Replace grant'),
      el('button',{class:'dangerbtn',onclick:async()=>{if(!confirm(`Revoke ${u.name}’s complimentary access? Paid access and the First 100 bonus stay untouched.`))return;try{await api('POST','/api/admin/memberships/revoke',{userId:u.id});toast('Complimentary membership revoked','ok');close();await onDone();}catch(e){status.textContent=e.message;}}},'Revoke grant')
    );
  }else actions.append(el('button',{class:'btn-primary',onclick:()=>act('replace')},'Grant access'));
  card.appendChild(actions);shade.appendChild(card);document.body.appendChild(shade);
}

/* ================= PROFILES ================= */
async function renderMe() {
  const wrap = el('div', { class: 'page' });
  const d = await api('GET', '/api/users/' + state.user.id + '/listings');
  const w = await api('GET', '/api/wallet');
  const mineHeader = el('div', { class: 'profilehero' }, [
    avatarNode(state.user, 'profile'),
    el('div', { class: 'profileherobody' }, [
      el('h2', {}, [state.user.name, state.user.verified ? el('span', { class: 'vbadge' }, '✓ Verified') : null, state.user.foundingMember ? el('span',{class:'founding-badge'},state.user.founderLaunchPosition?`Founding Member · #${state.user.founderLaunchPosition}`:'Founding Member') : null, state.user.settings?.showMembershipLevel !== false ? membershipBadge(state.access?.adminUnlimited ? 'Admin' : state.access?.wholesale ? 'Wholesale Teams' : state.access?.platinum ? 'Platinum' : state.access?.pro ? 'Plus' : state.access?.trial ? 'Trial' : 'Free') : null]),
      state.user.username ? el('div', { class: 'profileusername' }, '@' + state.user.username) : null,
      el('div', { class: 'sub' }, `${state.user.role} · ${d.listings.length} listing(s) · ${d.followerCount} follower(s) · ${d.friendCount || 0} friend(s) · ${state.user.points} pts · ${state.access?.adminUnlimited ? 'Admin — Unlimited' : state.access?.wholesale ? 'Wholesale Teams' : state.access?.platinum ? 'Platinum' : state.access?.pro ? 'Plus' : state.access?.trial ? 'Trial' : 'Free'}`),
      state.user.location ? el('div', { class: 'profilelocation' }, state.user.location) : null,
      state.user.investmentMarkets?.length ? el('div',{class:'profile-markets'},state.user.investmentMarkets.map(x=>el('span',{},x))) : null,
      state.user.bio ? el('p', { class: 'profilebio' }, state.user.bio) : null,
      el('div',{class:'profile-actions'},[el('button', { class: 'btn-ghost profileeditbtn', onclick: () => go('settings') }, state.user.avatarUrl ? 'Edit profile' : 'Add profile photo'),el('button',{class:'btn-ghost',onclick:async()=>{const url=location.origin+'/s/profile/'+encodeURIComponent(state.user.username||state.user.id);try{await navigator.clipboard.writeText(url);toast('Public profile link copied','ok')}catch{prompt('Copy public profile link',url);}}},'Copy public profile')])
    ])
  ]);
  wrap.appendChild(mineHeader);

  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(cents(w.balance), 'Wallet'), stat(state.user.unlockCredits, 'Unlocks'), stat(d.listings.length, 'Listings')
  ]));

  if(state.user.founderLaunchPosition){
    const until=state.user.founderPlatinumUntil?new Date(state.user.founderPlatinumUntil):null;
    wrap.appendChild(el('div',{class:'card founder-program-card'},[
      el('div',{class:'founder-program-copy'},[el('div',{class:'eyebrow'},`FOUNDING MEMBER #${state.user.founderLaunchPosition}`),el('h3',{},'You’re part of the first 100.'),el('p',{class:'sub'},until&&until>new Date()?`Your complimentary Platinum access is active through ${until.toLocaleDateString()}. Invite your network with your personal referral link.`:'Your Founding Member recognition stays on your profile. Invite your network with your personal referral link.')]),
      el('button',{class:'btn-ghost founder-share-btn',onclick:()=>showFounderWelcome(true)},'Share founder invite')
    ]));
  }

  const toolgroups = el('div', { class: 'profile-toolgroups' });
  const groups=[
    ['Workspace', [['Command center','commandcenter'],['Transaction hub','transactionhub'],['Deal pipeline','pipeline'],['Deal calendar','dealcalendar'],['AI Deal Builder','dealbuilder'],['Buyer CRM','buyercrm'],['Investor workspace'+(state.access?.platinum?'':' 🔒'),'workspace']]],
    ['Discover', [['Liked properties','saved'],['Saved searches & alerts','savedsearches'],['Buy box','buybox'],['Buyer demand insights','insights'],['Market Hubs','markethubs'],['Network & friends','network']]],
    ['Account & commerce', [['Messages','messages'],['Offers','offers'],['Affiliate center','affiliate'],['Wallet & payouts','wallet'],['Orders','orders'],[state.user.role==='admin'?'Admin — shop listings':'My shop listings','shopmanage'],['Plans & billing','upgrade']]]
  ];
  if(state.access?.wholesale||state.user.companyId)groups[0][1].push(['Company workspace','companyworkspace']);
  if(state.user.role==='admin')groups.push(['Administration',[['Admin command center','admin'],['Admin — Affiliates','affiliate'],['Admin — Email Center','emailcenter'],['Admin — Membership grants','memberships'],['Admin — suppliers','suppliers'],['Admin — fulfilment queue','fulfilment'],['Admin — reports','reports']]]);
  groups.forEach(([title,items])=>{const g=el('section',{class:'profile-toolgroup'},[el('div',{class:'eyebrow'},title)]);items.forEach(([t,v])=>g.appendChild(el('button',{class:'profile-tool',onclick:()=>go(v)},[el('span',{},t),el('b',{},'→')])));toolgroups.appendChild(g);});
  wrap.appendChild(toolgroups);

  // referral growth dashboard
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Referral center'));
  const referralCard = el('div', { class: 'card referral-center' });
  referralCard.appendChild(el('div',{class:'referral-head'},[el('div',{},[el('h3',{},'Grow Better Real Estate'),el('p',{class:'sub'},`Invite real estate professionals. You both receive ${cents(state.pricing.referralBonus)} in wallet credit when their first purchase is completed.`)]),state.user.foundingMember?el('span',{class:'founding-badge'},state.user.founderLaunchPosition?`Founding Member · #${state.user.founderLaunchPosition}`:'Founding Member'):null]));
  const referralMetrics=el('div',{class:'referral-metrics'},[miniMetric('—','Link visits'),miniMetric('—','Signups'),miniMetric('—','Activated'),miniMetric('—','Paid referrals')]);
  referralCard.appendChild(referralMetrics);
  referralCard.appendChild(el('div',{class:'referral-linkbox'},[el('div',{},[el('small',{},'YOUR REFERRAL LINK'),el('b',{style:'word-break:break-all'},shareUrl('join'))]),el('button',{class:'btn-ghost',onclick:async()=>{try{await navigator.clipboard.writeText(shareUrl('join'));toast('Referral link copied','ok')}catch{toast('Copy the link shown here','err')} }},'Copy link')]));
  referralCard.appendChild(shareStrip({ kind: 'join', title: 'Join me on Better Real Estate', text: 'A real-estate-only network for investors, wholesalers, buyers and live deals.' }));
  const referralList=el('div',{class:'referral-list'}); referralCard.appendChild(referralList);
  api('GET','/api/referrals/me').then(r=>{referralMetrics.innerHTML='';referralMetrics.append(miniMetric(r.metrics.clicks,'Link visits'),miniMetric(r.metrics.signups,'Signups'),miniMetric(r.metrics.activated,'Activated'),miniMetric(r.metrics.paid,'Paid referrals'));if(r.metrics.creditEarned)referralMetrics.appendChild(miniMetric(cents(r.metrics.creditEarned),'Credit earned'));referralList.innerHTML='';if(r.referrals?.length){referralList.appendChild(el('div',{class:'eyebrow'},'RECENT REFERRALS'));r.referrals.slice(0,8).forEach(x=>referralList.appendChild(el('div',{class:'referral-person'},[el('span',{},x.name+(x.username?' · @'+x.username:'')),el('small',{},x.paid?'Paid':x.activated?'Activated':'Joined')])));} }).catch(()=>{});
  wrap.appendChild(referralCard);

  // verification
  if (!state.user.verified) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Get verified'));
    const vst = el('div', { class: 'okmsg' });
    wrap.appendChild(el('div', { class: 'card', style: 'padding:16px' }, [
      el('div', { class: 'dnotes' }, 'Verified sellers rank higher in the feed and get a badge buyers can see. One-time ' + cents(state.pricing.verificationFee) + '.'),
      el('button', { class: 'submitbtn', onclick: async () => {
        try {
          const r = await api('POST', '/api/verify/request');
          await handlePurchaseResponse(r, 'Submitted — an admin will review it.', async () => { await refreshMe(); render(); });
        } catch (e) { vst.className = 'errmsg'; vst.textContent = e.message; }
      } }, state.user.verificationPending ? 'Pending review' : 'Request verification'),
      vst
    ]));
  }

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Your listings'));
  if (!d.listings.length) wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No listings yet'), el('p', {}, 'Post one from the + tab.')]));
  else {
    const card = el('div', { class: 'card' });
    d.listings.forEach(l => {
      const boosted = l.boostUntil && new Date(l.boostUntil) > new Date();
      card.appendChild(el('div', { class: 'listrow' }, [
        el('div', { class: 'grow', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [
          el('div', { class: 't' }, l.address),
          el('div', { class: 's' }, l.city + ' · ' + money(l.asking) + (boosted ? ' · promoted' : '') + (l.freshness?.availabilityStatus === 'archived' ? ' · archived' : l.freshness?.needsConfirmation ? ' · confirm availability' : ''))
        ]),
        l.freshness?.availabilityStatus === 'archived' || l.freshness?.needsConfirmation ? el('button', { onclick: async () => { try { await api('POST', '/api/listings/' + encodeURIComponent(l.id) + '/confirm-active'); toast('Listing confirmed active.', 'ok'); render(); } catch (e) { toast(e.message, 'err'); } } }, 'Confirm') : null,
        el('button', { onclick: () => go('analytics', { detailId: l.id }) }, 'Stats'),
        el('button', { onclick: () => go('promote', { detailId: l.id }) }, 'Promote')
      ]));
    });
    wrap.appendChild(card);
  }
  return wrap;
}

async function renderProfile() {
  const { owner, publicMembership, company, listings, followerCount, friendCount, friendship, reviews, credibility } = await api('GET', '/api/users/' + encodeURIComponent(state.profileId) + '/listings');
  owner.publicMembership = publicMembership || null;
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  const avg = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  const profileBody = el('div', { class: 'profileherobody' }, [
    el('h2', {}, [owner.name, owner.verified ? el('span', { class: 'vbadge' }, '✓ Verified') : null, owner.foundingMember ? el('span',{class:'founding-badge'},owner.founderLaunchPosition?`Founding Member · #${owner.founderLaunchPosition}`:'Founding Member') : null, membershipBadge(owner.publicMembership)]),
    owner.username ? el('div', { class: 'profileusername' }, '@' + owner.username) : null,
    owner.activityStatus ? el('div',{class:'activity-status'},[el('span',{class:'activity-dot'},''),owner.activityStatus]) : null,
    company ? el('button', { class: 'companychip', onclick: () => go('company', { companyId: company.id }) }, company.name) : null,
    el('div', { class: 'sub' }, `${owner.role} · ${listings.length} listing(s) · ${followerCount} follower(s) · ${friendCount || 0} friend(s)` + (avg ? ` · ★ ${avg} (${reviews.length})` : '')),
    owner.location ? el('div', { class: 'profilelocation' }, owner.location) : null,
    owner.investmentMarkets?.length ? el('div',{class:'profile-markets'},owner.investmentMarkets.map(x=>el('span',{},x))) : null,
    owner.bio ? el('p', { class: 'profilebio' }, owner.bio) : null
  ]);
  const profileHero = el('div', { class: 'profilehero' }, [avatarNode(owner, 'profile'), profileBody]);
  wrap.appendChild(profileHero);
  if(credibility) wrap.appendChild(el('div',{class:'credibility-row'},[credibility.accountSince?el('span',{},'Member since '+new Date(credibility.accountSince).toLocaleDateString(undefined,{month:'short',year:'numeric'})):null,el('span',{},`${credibility.verifiedClosings||0} verified closing${credibility.verifiedClosings===1?'':'s'}`),credibility.responseRate!==null?el('span',{},`${credibility.responseRate}% response rate`):null].filter(Boolean)));
  wrap.appendChild(shareStrip({ kind: 'profile', targetId: owner.id, title: `${owner.name} on Better Real Estate`, text: `${owner.role}${owner.location ? ' · ' + owner.location : ''}` }));

  if (state.user && state.user.id !== owner.id) {
    const actions = el('div', { class: 'profileactions' });
    const fb = el('button', { class: 'btn-ghost' }, 'Follow');
    api('GET', '/api/follow/status/' + owner.id).then(({ following }) => fb.textContent = following ? 'Following' : 'Follow').catch(() => {});
    fb.onclick = async () => { const { following } = await api('POST', '/api/follow', { userId: owner.id }); fb.textContent = following ? 'Following' : 'Follow'; };
    actions.appendChild(fb);
    const friendUser = { ...owner, friendStatus: friendship?.status || 'none', friendRequestId: friendship?.requestId || null };
    actions.appendChild(friendButton(friendUser, () => render()));
    actions.appendChild(el('button', { class: 'btn-primary', onclick: () => go('chat', { chatUserId: owner.id }) }, 'Message'));
    if (owner.role === 'seller') actions.appendChild(el('button', { class: 'btn-ghost', onclick: () => go('buyerportal', { buyerPortalType: 'user', buyerPortalId: owner.id }) }, 'Join buyer list'));
    wrap.appendChild(actions);
  }
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Listings'));
  const grid = el('div', { class: 'minigrid' });
  listings.forEach(l => grid.appendChild(el('div', { class: 'minicard', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [
    el('div', { class: 'mi' }, l.photos?.length ? el('img', { src: l.photos[0] }) : null),
    el('div', { class: 'mt' }, [el('b', {}, l.address), el('span', {}, money(l.asking))])
  ])));
  wrap.appendChild(listings.length ? grid : el('div', { class: 'empty' }, el('p', {}, 'Nothing posted yet.')));

  if (reviews?.length) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Reviews'));
    const rb = el('div', { class: 'card' });
    reviews.forEach(r => rb.appendChild(el('div', { class: 'ledrow' }, [
      el('div', { class: 'grow' }, [el('div', { class: 'd' }, '★'.repeat(r.rating) + ' — ' + r.byName), el('div', { class: 'dt' }, r.body)])
    ])));
    wrap.appendChild(rb);
  }
  return wrap;
}

/* ================= BUY BOX / SETTINGS ================= */
async function renderBuyBox() {
  const boxes = state.user.buyBoxes || (state.user.buyBox ? [state.user.buyBox] : [{ minPrice: 0, maxPrice: 2000000, cities: [], propertyTypes: [], minSpread: 0, active: true }]);
  if (state.buyBoxIndex === undefined || state.buyBoxIndex >= boxes.length) state.buyBoxIndex = 0;
  const idx = state.buyBoxIndex;
  const bb = boxes[idx] || {};
  const maxBoxes = state.access?.adminUnlimited ? Number.POSITIVE_INFINITY : state.access?.platinum ? 5 : 1;

  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Your buy box'));
  wrap.appendChild(el('div', { class: 'sub' }, 'The feed ranks around this. Nothing is hidden — matches rise to the top.'));

  if (boxes.length > 1 || maxBoxes > 1) {
    const tabs = el('div', { class: 'roletabs', style: 'margin-bottom:16px;flex-wrap:wrap' });
    boxes.forEach((b, i) => {
      const t = el('button', { class: i === idx ? 'selected' : '' }, b.label || `Box ${i + 1}`);
      t.onclick = () => { state.buyBoxIndex = i; render(); };
      tabs.appendChild(t);
    });
    if (boxes.length < maxBoxes) {
      const addBtn = el('button', { onclick: async () => {
        try { const r = await api('POST', '/api/me/buybox/add'); state.user.buyBoxes = r.buyBoxes; state.buyBoxIndex = r.buyBoxes.length - 1; render(); }
        catch (e) { toast(e.message, 'err'); }
      } }, '+ Add');
      tabs.appendChild(addBtn);
    }
    wrap.appendChild(tabs);
    if (maxBoxes === 1) {
      wrap.appendChild(el('div', { class: 'hint', style: 'margin-bottom:14px' }, 'Free and Plus get one buy box. Platinum runs up to 5 at once.'));
    }
  }

  const label = el('input', { placeholder: 'e.g. Flips under 200k', value: bb.label || '' });
  const minPrice = el('input', { type: 'number', value: bb.minPrice ?? 0 });
  const maxPrice = el('input', { type: 'number', value: bb.maxPrice ?? 2000000 });
  const minArv = el('input', { type: 'number', value: bb.minArv ?? 0 }); const maxArv = el('input', { type: 'number', value: bb.maxArv ?? 0 });
  const minBeds = el('input', { type: 'number', value: bb.minBeds ?? 0, min:'0' }); const minBaths = el('input', { type: 'number', value: bb.minBaths ?? 0, min:'0', step:'0.5' });
  let buyStates=[...(bb.states||[])];
  const rehabTolerance=el('select',{},[['any','Any rehab level'],['light','Light rehab'],['moderate','Moderate rehab'],['heavy','Heavy rehab / full gut']].map(([v,l])=>el('option',{value:v},l)));rehabTolerance.value=bb.rehabTolerance||'any';
  const cities = el('input', { placeholder: 'Philadelphia, Pittsburgh', value: (bb.cities || []).join(', ') });
  const minSpread = el('input', { type: 'number', value: bb.minSpread ?? 0 });
  const strategy = el('input', { placeholder: 'e.g. Fix & flip, BRRRR, rental', value: bb.strategy || '' });
  const buyingStatus = el('select', {}, [
    el('option', { value: 'active' }, 'Actively buying'),
    el('option', { value: 'selective' }, 'Selective'),
    el('option', { value: 'paused' }, 'Paused')
  ]); buyingStatus.value = state.user.buyingStatus || 'active';
  const publicBox = el('input', { type: 'checkbox' }); publicBox.checked = bb.public === true;
  const typeWrap = el('div', { class: 'card', style: 'margin-top:8px' });
  const sel = new Set(bb.propertyTypes || []);
  ['Single family','Multi-family','Condo','Townhouse','Land','Mobile home','Commercial'].forEach(t => {
    const sw = el('button', { class: 'switch' + (sel.has(t) ? ' on' : '') }, el('div', { class: 'knob' }));
    sw.onclick = () => { sel.has(t) ? (sel.delete(t), sw.classList.remove('on')) : (sel.add(t), sw.classList.add('on')); };
    typeWrap.appendChild(el('div', { class: 'togglerow' }, [el('div', { class: 'grow' }, el('div', { class: 'tl' }, t)), sw]));
  });
  if (boxes.length > 1) { wrap.appendChild(el('label', {}, 'Name this buy box')); wrap.appendChild(label); }
  wrap.appendChild(twoUp('Min price ($)', minPrice, 'Max price ($)', maxPrice));
  wrap.appendChild(twoUp('Min ARV ($)', minArv, 'Max ARV ($, 0 = any)', maxArv));
  wrap.appendChild(twoUp('Minimum beds', minBeds, 'Minimum baths', minBaths));
  wrap.appendChild(el('label', {}, 'States')); wrap.appendChild(statePicker(buyStates,x=>buyStates=x));
  wrap.appendChild(el('label', {}, 'Cities / metros (comma separated)')); wrap.appendChild(cities);
  wrap.appendChild(el('label', {}, 'Rehab tolerance')); wrap.appendChild(rehabTolerance);
  wrap.appendChild(el('label', {}, 'Minimum spread ($)')); wrap.appendChild(minSpread);
  wrap.appendChild(el('label', {}, 'Investment strategy')); wrap.appendChild(strategy);
  wrap.appendChild(el('label', {}, 'Buying status')); wrap.appendChild(buyingStatus);
  wrap.appendChild(el('label', { class: 'checkline' }, [publicBox, el('span', {}, 'Show this buy box publicly in Network → Buyers Looking')]));
  wrap.appendChild(el('div', { class: 'hint' }, 'Public buy boxes show your criteria and public profile only — not your email or phone number.'));
  wrap.appendChild(el('label', {}, 'Property types')); wrap.appendChild(typeWrap);
  const st = el('div', { class: 'okmsg' });
  const btnRow = el('div', { class: 'row2' });
  const save = el('button', { class: 'submitbtn' }, 'Save buy box');
  save.onclick = async () => {
    try {
      const { buyBoxes } = await api('PATCH', '/api/me/buybox', {
        index: idx, label: label.value, minPrice: minPrice.value, maxPrice: maxPrice.value, minArv:minArv.value, maxArv:maxArv.value, minBeds:minBeds.value, minBaths:minBaths.value, states:buyStates, cities: cities.value, rehabTolerance:rehabTolerance.value,
        minSpread: minSpread.value, propertyTypes: [...sel], active: true,
        strategy: strategy.value, public: publicBox.checked, buyingStatus: buyingStatus.value
      });
      state.user.buyBoxes = buyBoxes; state.user.buyingStatus = buyingStatus.value;
      st.textContent = publicBox.checked ? 'Saved — your criteria are now visible in Buyers Looking.' : 'Saved — feed re-ranked.';
    } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
  };
  btnRow.appendChild(save);
  if (boxes.length > 1) {
    const del = el('button', { class: 'btn-ghost' }, 'Delete this one');
    del.onclick = async () => {
      if (!confirm('Delete this buy box?')) return;
      try { const r = await api('DELETE', '/api/me/buybox/' + idx); state.user.buyBoxes = r.buyBoxes; state.buyBoxIndex = 0; render(); }
      catch (e) { toast(e.message, 'err'); }
    };
    btnRow.appendChild(del);
  }
  wrap.appendChild(btnRow); wrap.appendChild(st);
  const portalType = state.user.companyId ? 'company' : 'user';
  const portalTarget = state.user.companyId || state.user.id;
  const portalUrl = location.origin + location.pathname + '?view=buyerportal&type=' + portalType + '&target=' + encodeURIComponent(portalTarget);
  wrap.appendChild(el('div', { class: 'buyerlistshare' }, [
    el('div', {}, [el('b', {}, state.user.companyId ? 'Grow your company buyer list' : 'Grow your own buyer list'), el('div', { class: 'hint' }, "Share one buyer-list page anywhere. Buyers can submit their criteria without seeing anyone else's contact information.")]),
    el('button', { class: 'btn-ghost', onclick: async () => { try { await navigator.clipboard.writeText(portalUrl); toast('Buyer-list link copied', 'ok'); } catch { prompt('Copy your buyer-list link:', portalUrl); } } }, 'Copy buyer-list link')
  ]));
  try {
    const leadData = await api('GET', '/api/buyer-leads');
    if (leadData.leads?.length) {
      wrap.appendChild(el('div', { class: 'sectiontitle' }, `Captured buyers · ${leadData.leads.length}`));
      const leads = el('div', { class: 'card buyerleadlist' });
      leadData.leads.slice(0,20).forEach(x => leads.appendChild(el('div', { class: 'listrow' }, [
        el('div', { class: 'grow' }, [el('div', { class: 't' }, x.name), el('div', { class: 's' }, [x.email, x.phone, ...(x.cities || [])].filter(Boolean).slice(0,4).join(' · ')), el('div', { class: 'hint' }, [x.strategy, x.propertyTypes?.join(', ')].filter(Boolean).join(' · '))])
      ])));
      wrap.appendChild(leads);
    }
  } catch {}
  return wrap;
}

async function renderSettings() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, 'Settings'));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Profile'));
  const pbox = el('div', { class: 'card', style: 'padding:16px' });
  const nameI = el('input', { value: state.user.name });
  const usernameI = el('input', { value: state.user.username || '', placeholder: 'your.username', autocapitalize: 'none', autocomplete: 'username' });
  const bioI = el('textarea', {}); bioI.value = state.user.bio || '';
  const phoneI = el('input', { value: state.user.phone || '' });
  const locationI = el('input', { value: state.user.location || '', placeholder: 'e.g. Newark, NJ or South Jersey' });
  const avFile = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  let avData = null;
  const avPreviewImg = state.user.avatarUrl ? el('img', { src: state.user.avatarUrl, alt: 'Current profile photo' }) : null;
  const avPrev = el('div', { class: 'profilephotopicker', onclick: () => avFile.click() }, [
    el('div', { class: 'profilephotopreview' }, avPreviewImg || initials(state.user.name)),
    el('div', {}, [
      el('b', {}, state.user.avatarUrl ? 'Change profile photo' : 'Add a profile photo'),
      el('div', { class: 'hint' }, 'JPG, PNG or WebP. We resize it automatically.')
    ])
  ]);
  avFile.onchange = async () => {
    if (!avFile.files[0]) return;
    avData = await downscale(avFile.files[0], 400);
    const preview = avPrev.querySelector('.profilephotopreview');
    preview.innerHTML = '';
    preview.appendChild(el('img', { src: avData, alt: 'New profile photo preview' }));
    const label = avPrev.querySelector('b'); if (label) label.textContent = 'Photo ready — save to apply';
  };
  pbox.appendChild(el('label', {}, 'Display name')); pbox.appendChild(nameI);
  pbox.appendChild(el('label', {}, 'Username')); pbox.appendChild(usernameI);
  pbox.appendChild(el('div', { class: 'hint' }, 'Shown as @username. Usernames are searchable and can be changed once every 7 days.'));
  pbox.appendChild(el('label', {}, 'Phone (shown after unlock)')); pbox.appendChild(phoneI);
  pbox.appendChild(el('label', {}, 'Market / location')); pbox.appendChild(locationI);
  pbox.appendChild(el('label', {}, 'Bio')); pbox.appendChild(bioI);
  pbox.appendChild(el('label', {}, 'Profile photo')); pbox.appendChild(avPrev); pbox.appendChild(avFile);
  const pst = el('div', { class: 'okmsg' });
  pbox.appendChild(el('button', { class: 'submitbtn', onclick: async () => {
    try { const { user } = await api('PATCH', '/api/me', { name: nameI.value, username: usernameI.value, bio: bioI.value, phone: phoneI.value, location: locationI.value, avatarData: avData }); state.user = user; usernameI.value = user.username || ''; pst.textContent = 'Saved.'; }
    catch (e) { pst.className = 'errmsg'; pst.textContent = e.message; }
  } }, 'Save profile'));
  pbox.appendChild(pst);
  wrap.appendChild(pbox);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Investment markets'));
  let selectedMarkets=[...(state.user.investmentMarkets||[])];
  const marketBox=el('div',{class:'card market-settings'},[el('div',{class:'settings-copy'},[el('b',{},'Where do you work?'),el('div',{class:'hint'},'Choose one or more states. Better Real Estate uses these as a relevance signal in For You — it never locks you out of opportunities elsewhere.')])]);
  marketBox.appendChild(statePicker(selectedMarkets,x=>selectedMarkets=x));
  marketBox.appendChild(el('button',{class:'btn-primary',onclick:async()=>{const r=await api('PATCH','/api/me/markets',{states:selectedMarkets});state.user.investmentMarkets=r.states;toast('Investment markets saved','ok');}},'Save markets'));
  wrap.appendChild(marketBox);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Appearance & alerts'));
  const s = state.user.settings || {};
  const sbox = el('div', { class: 'card' });
  sbox.appendChild(toggleRow('Dark mode', 'Saved to your account.', s.theme === 'dark', async on => {
    applyTheme(on ? 'dark' : 'light'); localStorage.setItem('bre_theme', on ? 'dark' : 'light');
    const { settings } = await api('PATCH', '/api/me/settings', { theme: on ? 'dark' : 'light' });
    state.user.settings = settings; renderTop();
  }));
  sbox.appendChild(toggleRow('Compact feed', 'More properties per screen.', s.feedDensity === 'compact', async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { feedDensity: on ? 'compact' : 'comfortable' }); state.user.settings = settings;
  }));
  sbox.appendChild(toggleRow('Unread-message email reminders', 'If a direct message is still unread after your chosen delay, we email you once for that conversation.', s.notifyOnMessage !== false, async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { notifyOnMessage: on }); state.user.settings = settings;
    reminderDelay.disabled = !on;
  }));
  const reminderDelay = el('select', { style: 'margin:0 16px 14px;width:calc(100% - 32px)' }, [
    [15,'15 minutes'],[30,'30 minutes'],[60,'1 hour (default)'],[180,'3 hours'],[360,'6 hours'],[720,'12 hours'],[1440,'24 hours']
  ].map(([v,l]) => el('option', { value: v, selected: Number(s.messageEmailDelayMinutes || 60) === v ? 'selected' : null }, l)));
  reminderDelay.disabled = s.notifyOnMessage === false;
  reminderDelay.onchange = async () => {
    const { settings } = await api('PATCH', '/api/me/settings', { messageEmailDelayMinutes: Number(reminderDelay.value) }); state.user.settings = settings; toast('Unread-message reminder delay saved', 'ok');
  };
  sbox.appendChild(reminderDelay);
  sbox.appendChild(toggleRow('Alert me on buy box matches', 'When a new listing fits your criteria.', s.notifyOnMatch !== false, async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { notifyOnMatch: on }); state.user.settings = settings;
  }));
  sbox.appendChild(toggleRow('Display membership level on my profile', 'Shows your current Free, Plus, Platinum or Wholesale Teams level beside your name. You can hide it anytime.', s.showMembershipLevel !== false, async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { showMembershipLevel: on }); state.user.settings = settings; toast(on ? 'Membership level is visible' : 'Membership level hidden', 'ok');
  }));
  sbox.appendChild(toggleRow('Show activity status', 'Shows Active now or Active recently on your public profile without exposing an exact timestamp.', s.showActivityStatus !== false, async on => { const { settings } = await api('PATCH','/api/me/settings',{showActivityStatus:on}); state.user.settings=settings; }));
  sbox.appendChild(el('button', { class:'btn-ghost', style:'margin:0 16px 16px;width:calc(100% - 32px)', onclick:()=>startTutorial(true) }, 'Restart platform tutorial'));
  wrap.appendChild(sbox);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Account & security'));
  const abox = el('div', { class: 'card', style: 'padding:16px' });
  abox.appendChild(el('div', { class: 'hint', style: 'margin-bottom:12px' }, `Signed in as ${state.user.email} · @${state.user.username || 'username'}`));
  const currentPass = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Current password' });
  const newPass = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'New password (6+ characters)' });
  const confirmPass = el('input', { type: 'password', autocomplete: 'new-password', placeholder: 'Confirm new password' });
  const passSt = el('div', { class: 'okmsg' });
  abox.appendChild(el('label', {}, 'Change password')); abox.appendChild(currentPass); abox.appendChild(newPass); abox.appendChild(confirmPass);
  abox.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%', onclick: async () => {
    passSt.className = 'okmsg'; passSt.textContent = '';
    if (newPass.value !== confirmPass.value) { passSt.className = 'errmsg'; passSt.textContent = 'New passwords do not match.'; return; }
    try { await api('POST', '/api/me/password', { currentPassword: currentPass.value, newPassword: newPass.value }); currentPass.value = newPass.value = confirmPass.value = ''; passSt.textContent = 'Password changed.'; }
    catch (e) { passSt.className = 'errmsg'; passSt.textContent = e.message; }
  } }, 'Change password'));
  abox.appendChild(passSt);
  if (state.access?.wholesale || state.user.companyId) {
    abox.appendChild(el('div', { class: 'accountdivider' }));
    abox.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%', onclick: () => go('companyworkspace') }, 'Open company workspace'));
  } else {
    abox.appendChild(el('div', { class: 'accountdivider' }));
    abox.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%', onclick: () => go('upgrade') }, 'Wholesale company plans'));
  }
  wrap.appendChild(abox);

  wrap.appendChild(el('div', { class: 'sectiontitle dangertext' }, 'Delete account'));
  const dbox = el('div', { class: 'card dangerzone', style: 'padding:16px' });
  dbox.appendChild(el('div', { class: 'dnotes' }, 'Permanently removes your public profile, listings, friendships and messages. Financial/order records that must be retained are stripped of your profile information. If you own a company workspace, deleting your account closes that workspace for the team.'));
  const delPass = el('input', { type: 'password', autocomplete: 'current-password', placeholder: 'Your password' });
  const delConfirm = el('input', { placeholder: 'Type DELETE' });
  const delSt = el('div', { class: 'errmsg' });
  dbox.appendChild(delPass); dbox.appendChild(delConfirm);
  dbox.appendChild(el('button', { class: 'dangerbtn', onclick: async () => {
    if (delConfirm.value.trim().toUpperCase() !== 'DELETE') { delSt.textContent = 'Type DELETE to confirm.'; return; }
    if (!confirm('Permanently delete this Better Real Estate account? This cannot be undone.')) return;
    try { await api('DELETE', '/api/me', { password: delPass.value, confirmation: delConfirm.value }); state.user = null; state.access = null; state.companyId = null; state.companyInviteToken = null; go('home', {}, { replace: true }); }
    catch (e) { delSt.textContent = e.message; }
  } }, 'Permanently delete account'));
  dbox.appendChild(delSt); wrap.appendChild(dbox);

  wrap.appendChild(el('div',{class:'sectiontitle'},'Professional services profile'));
  const spbox=el('div',{class:'card'});const spTypes=el('input',{placeholder:'Services, comma separated — Title, Lending, Contractor',value:(state.user.settings?.serviceTypes||[]).join(', ')});spbox.appendChild(toggleRow('List me as a service provider','Make your professional services discoverable to investors in your markets.',state.user.settings?.serviceProvider===true,async on=>{const r=await api('PATCH','/api/me/settings',{serviceProvider:on,serviceTypes:spTypes.value.split(',').map(x=>x.trim()).filter(Boolean)});state.user.settings=r.settings;}));spbox.appendChild(el('div',{style:'padding:0 16px 16px'},[spTypes,el('button',{class:'btn-ghost',style:'margin-top:8px',onclick:async()=>{const r=await api('PATCH','/api/me/settings',{serviceTypes:spTypes.value.split(',').map(x=>x.trim()).filter(Boolean)});state.user.settings=r.settings;toast('Service profile updated','ok');}},'Save services')]));wrap.appendChild(spbox);
  wrap.appendChild(el('div',{class:'sectiontitle'},'Notification center'));
  const np=state.user.settings?.notificationPrefs||{}; const nbox=el('div',{class:'card notification-settings'});
  [['deals','Deals'],['messages','Messages'],['offers','Offers'],['pipeline','Pipeline'],['referrals','Referrals'],['social','Social'],['savedSearches','Saved searches'],['marketing','Marketing']].forEach(([key,label])=>nbox.appendChild(toggleRow(label,'Control in-app and email attention for this category.',np[key]!==false,async on=>{np[key]=on;const r=await api('PATCH','/api/me/settings',{notificationPrefs:np});state.user.settings=r.settings;})));
  wrap.appendChild(nbox);
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Email preferences'));
  const ep = await api('GET', '/api/email-preferences').catch(() => ({ marketingOptIn: false, marketingConfigured: false }));
  const ebox = el('div', { class: 'card' });
  ebox.appendChild(toggleRow('Product & activity emails', 'New listings, marketplace updates and occasional reminders. Never more than once every 48 hours. Transactional emails such as receipts and password resets are separate.', ep.marketingOptIn === true, async on => {
    const r = await api('PATCH', '/api/email-preferences', { marketingOptIn: on });
    ep.marketingOptIn = r.marketingOptIn;
    toast(on ? 'Marketing emails turned on' : 'Marketing emails turned off', 'ok');
  }));
  ebox.appendChild(el('div', { class: 'hint', style: 'padding:0 16px 14px' }, 'You can also unsubscribe from the link in any marketing email.'));
  wrap.appendChild(ebox);

  wrap.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:20px', onclick: async () => {
    await api('POST', '/api/logout'); state.user = null; go('home');
  } }, 'Log out'));
  return wrap;
}

async function renderCompanyJoin() {
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Join company workspace'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Company seats use individual logins, so your password and personal direct messages stay private.'));
  if (!state.user) {
    wrap.appendChild(el('button', { class: 'submitbtn', onclick: () => go('auth') }, 'Sign in or create account'));
    return wrap;
  }
  if (!state.companyInviteToken) {
    wrap.appendChild(el('div', { class: 'errmsg' }, 'This company invitation is missing or invalid.'));
    return wrap;
  }
  const st = el('div', { class: 'okmsg' });
  const accept = el('button', { class: 'submitbtn' }, 'Accept company invitation');
  accept.onclick = async () => {
    accept.disabled = true;
    try {
      const r = await api('POST', '/api/company/invites/accept', { token: state.companyInviteToken });
      state.companyInviteToken = null;
      await refreshMe();
      toast(`Joined ${r.company.name}`, 'ok');
      go('companyworkspace', {}, { replace: true });
    } catch (e) { st.className = 'errmsg'; st.textContent = e.message; accept.disabled = false; }
  };
  wrap.appendChild(accept); wrap.appendChild(st);
  wrap.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:10px', onclick: async () => { await api('POST', '/api/logout'); state.user = null; state.access = null; state.authMode = 'login'; go('auth', {}, { replace: true }); } }, 'Use a different account'));
  return wrap;
}

function companyLogoNode(company, cls = '') {
  return el('div', { class: 'companylogo ' + cls }, company?.logoUrl ? el('img', { src: company.logoUrl, alt: company.name || 'Company logo' }) : initials(company?.name || 'Company'));
}

async function renderCompany() {
  const id = state.companyId;
  if (!id) return el('div', { class: 'page' }, el('div', { class: 'empty' }, 'Company not found.'));
  const { company, members, listings } = await api('GET', '/api/companies/' + encodeURIComponent(id));
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => history.back() }, '← Back'));
  wrap.appendChild(el('div', { class: 'companyhero' }, [
    companyLogoNode(company, 'large'),
    el('div', { class: 'grow' }, [
      el('h2', {}, company.name),
      el('div', { class: 'profileusername' }, '@' + company.slug),
      company.bio ? el('p', { class: 'profilebio' }, company.bio) : null,
      company.markets?.length ? el('div', { class: 'sub' }, company.markets.join(' · ')) : null,
      company.website ? el('a', { href: company.website.startsWith('http') ? company.website : 'https://' + company.website, target: '_blank', rel: 'noopener noreferrer' }, company.website) : null
    ])
  ]));
  wrap.appendChild(shareStrip({ kind: 'company', targetId: company.id, title: `${company.name} on Better Real Estate`, text: company.markets?.length ? `Active in ${company.markets.slice(0,3).join(', ')}` : 'Real estate company profile' }));
  wrap.appendChild(el('div', { class: 'statgrid' }, [stat(members.length, 'Team'), stat(listings.length, 'Listings'), stat(company.seatLimit, 'Seats')]));
  wrap.appendChild(el('button', { class: 'submitbtn', style: 'margin:8px 0 14px', onclick: () => go('buyerportal', { buyerPortalType: 'company', buyerPortalId: company.id }) }, 'Join ' + company.name + "'s buyer list"));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Team'));
  const team = el('div', { class: 'peoplegrid' });
  members.forEach(m => team.appendChild(el('div', { class: 'personcard' }, el('div', { class: 'personmain', onclick: () => go('profile', { profileId: m.id }) }, [
    avatarNode(m), el('div', { class: 'personmeta' }, [el('div', { class: 'personname' }, m.name), m.username ? el('div', { class: 'personhandle' }, '@' + m.username) : null, el('div', { class: 'personsub' }, m.role)])
  ]))));
  wrap.appendChild(team);
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Company listings'));
  const grid = el('div', { class: 'minigrid' });
  listings.forEach(l => grid.appendChild(el('div', { class: 'minicard', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [
    el('div', { class: 'mi' }, l.photos?.length ? el('img', { src: l.photos[0] }) : null),
    el('div', { class: 'mt' }, [el('b', {}, l.address), el('span', {}, money(l.asking))])
  ])));
  wrap.appendChild(listings.length ? grid : el('div', { class: 'empty' }, el('p', {}, 'No company listings yet.')));
  return wrap;
}

async function renderBuyerPortal() {
  const wrap = el('div', { class: 'page buyerportalpage' });
  if (!state.buyerPortalType || !state.buyerPortalId) {
    wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Buyer list not found'), el('p', {}, 'This buyer-list link is incomplete.') ]));
    return wrap;
  }
  let data;
  try { data = await api('GET', '/api/buyer-portal/' + encodeURIComponent(state.buyerPortalType) + '/' + encodeURIComponent(state.buyerPortalId)); }
  catch (e) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Buyer list not found'), el('p', {}, e.message)])); return wrap; }
  const t = data.target;
  wrap.appendChild(el('div', { class: 'buyerportalhero' }, [
    t.logoUrl ? el('img', { src: t.logoUrl, class: 'buyerportallogo', alt: '' }) : el('div', { class: 'buyerportallogo fallback' }, initials(t.name)),
    el('div', {}, [el('div', { class: 'dispoeyebrow' }, 'BUYER LIST'), el('h2', {}, `Tell ${t.name} what you buy`), el('div', { class: 'sub' }, 'Share your real acquisition criteria once. This information goes directly to this wholesaler/company and can be updated later.')])
  ]));
  if (t.bio) wrap.appendChild(el('p', { class: 'profilebio' }, t.bio));
  if (t.markets?.length) wrap.appendChild(el('div', { class: 'buyerportalmarkets' }, t.markets.slice(0,10).map(m => el('span', {}, m))));

  const firstBox = state.user?.buyBoxes?.[0] || {};
  const name = el('input', { value: state.user?.name || '', placeholder: 'Your name' });
  const email = el('input', { type: 'email', value: state.user?.email || '', placeholder: 'you@example.com' });
  const phone = el('input', { value: state.user?.phone || '', placeholder: 'Phone (optional)' });
  const cities = el('input', { value: (firstBox.cities || []).join(', '), placeholder: 'Philadelphia, South Jersey, Newark' });
  const minPrice = el('input', { type: 'number', value: firstBox.minPrice ?? 0 });
  const maxPrice = el('input', { type: 'number', value: firstBox.maxPrice ?? 500000 });
  const strategy = el('input', { value: firstBox.strategy || '', placeholder: 'Fix & flip, BRRRR, rentals…' });
  const notes = el('textarea', { placeholder: 'Anything else they should know about what you buy?' });
  const selected = new Set(firstBox.propertyTypes || []);
  const types = el('div', { class: 'card buyertypepicker' });
  ['Single family','Multi-family','Condo','Townhouse','Land','Mobile home','Commercial'].forEach(type => {
    const c = el('input', { type: 'checkbox' }); c.checked = selected.has(type);
    c.onchange = () => c.checked ? selected.add(type) : selected.delete(type);
    types.appendChild(el('label', { class: 'checkline' }, [c, el('span', {}, type)]));
  });
  const consent = el('input', { type: 'checkbox' });
  const saveMine = el('input', { type: 'checkbox' }); saveMine.checked = !!state.user;
  const st = el('div', { class: 'okmsg' });
  const form = el('div', { class: 'card buyerportalform' });
  form.appendChild(twoUp('Name', name, 'Email', email));
  form.appendChild(el('label', {}, 'Phone')); form.appendChild(phone);
  form.appendChild(el('label', {}, 'Markets')); form.appendChild(cities);
  form.appendChild(twoUp('Minimum purchase price ($)', minPrice, 'Maximum purchase price ($)', maxPrice));
  form.appendChild(el('label', {}, 'Strategy')); form.appendChild(strategy);
  form.appendChild(el('label', {}, 'Property types')); form.appendChild(types);
  form.appendChild(el('label', {}, 'Notes')); form.appendChild(notes);
  form.appendChild(el('label', { class: 'checkline consentline' }, [consent, el('span', {}, `I want to share my contact information and buying criteria with ${t.name}.`)]));
  if (state.user) form.appendChild(el('label', { class: 'checkline' }, [saveMine, el('span', {}, 'Also save these criteria to my Better Real Estate buy box and publish it in Buyers Looking.')]));
  else form.appendChild(el('div', { class: 'hint' }, 'You do not need a Better Real Estate account to join this buyer list. Creating one later lets you publish a live buy box and receive matching-deal alerts.'));
  const submit = el('button', { class: 'submitbtn' }, 'Join buyer list');
  submit.onclick = async () => {
    submit.disabled = true; submit.textContent = 'Saving…'; st.textContent = '';
    try {
      const r = await api('POST', '/api/buyer-portal/' + encodeURIComponent(state.buyerPortalType) + '/' + encodeURIComponent(state.buyerPortalId), {
        name: name.value, email: email.value, phone: phone.value, cities: cities.value, minPrice: minPrice.value, maxPrice: maxPrice.value,
        strategy: strategy.value, propertyTypes: [...selected], notes: notes.value, consent: consent.checked, saveToProfile: !!state.user && saveMine.checked
      });
      if (r.savedToProfile) await refreshMe();
      st.className = 'okmsg'; st.textContent = `You're on ${t.name}'s buyer list.`;
      submit.textContent = 'Saved';
    } catch (e) { st.className = 'errmsg'; st.textContent = e.message; submit.disabled = false; submit.textContent = 'Join buyer list'; }
  };
  form.appendChild(submit); form.appendChild(st); wrap.appendChild(form);
  wrap.appendChild(el('div', { class: 'buyerportalfoot' }, [el('b', {}, 'Powered by Better Real Estate'), el('span', {}, 'Make better your standard.') ]));
  return wrap;
}

async function renderCompanyWorkspace() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('div', { class: 'pageheadrow' }, [
    el('div', {}, [el('h2', {}, 'Company workspace'), el('div', { class: 'sub' }, 'Shared tools for your wholesale team. Personal direct messages stay private.')]),
    el('button', { class: 'btn-ghost', onclick: () => go('upgrade') }, 'Plan & billing')
  ]));

  if (!state.access?.wholesale) {
    wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Wholesale Teams required'), el('p', {}, 'Company workspaces are included with Better Wholesale Teams.'), el('button', { class: 'btn-primary', onclick: () => go('upgrade') }, 'View Wholesale Teams')])) ;
    return wrap;
  }

  let data;
  try { data = await api('GET', '/api/company'); }
  catch (e) {
    if (!state.user.companyId) {
      const name = el('input', { placeholder: 'Company name' });
      const st = el('div', { class: 'okmsg' });
      wrap.appendChild(el('div', { class: 'card', style: 'padding:18px' }, [
        el('h3', {}, 'Create your company workspace'),
        el('p', { class: 'sub' }, `Your plan includes ${state.pricing?.wholesale?.seats || 5} secure individual team seats.`),
        name,
        el('button', { class: 'submitbtn', onclick: async () => {
          try { const r = await api('POST', '/api/company', { name: name.value }); await refreshMe(); state.companyId = r.company.id; go('companyworkspace', {}, { replace: true }); }
          catch (err) { st.className = 'errmsg'; st.textContent = err.message; }
        } }, 'Create workspace'), st
      ]));
      return wrap;
    }
    wrap.appendChild(el('div', { class: 'errmsg' }, e.message)); return wrap;
  }

  const company = data.company;
  state.companyId = company.id;
  const manager = ['owner','admin'].includes(data.role);
  wrap.appendChild(el('div', { class: 'companyhero' }, [
    companyLogoNode(company, 'large'),
    el('div', { class: 'grow' }, [el('h2', {}, company.name), el('div', { class: 'profileusername' }, '@' + company.slug), el('div', { class: 'sub' }, `${data.role} · ${data.members.length}/${company.seatLimit} seats used`), company.bio ? el('p', { class: 'profilebio' }, company.bio) : null]),
    el('button', { class: 'btn-ghost', onclick: () => go('company', { companyId: company.id }) }, 'Public profile')
  ]));
  wrap.appendChild(el('div', { class: 'statgrid' }, [stat(data.analytics.listings, 'Team listings'), stat(data.analytics.views, 'Listing views'), stat(data.analytics.inquiries, 'Inquiries')]));
  try { const ops=await api('GET','/api/team-operations'); if(ops.deals.length){wrap.appendChild(el('div',{class:'sectiontitle'},'Shared deal operations'));const opbox=el('div',{class:'team-ops-grid'});ops.deals.slice(0,12).forEach(d=>{const ass=el('select');ass.appendChild(el('option',{value:''},'Unassigned'));ops.members.forEach(m=>ass.appendChild(el('option',{value:m.id},m.name)));ass.value=d.assignedTo||'';ass.onchange=async()=>{await api('POST','/api/pipeline',{id:d.id,assignedTo:ass.value});toast('Assignment updated','ok');};opbox.appendChild(el('div',{class:'team-op-card'},[el('b',{},d.title),el('span',{},d.stage.replace('-',' ')),ass,d.listingId?el('button',{onclick:()=>go('dealroom',{detailId:d.listingId})},'Open deal room'):null]));});wrap.appendChild(opbox);if(ops.activity?.length){const activity=el('div',{class:'team-activity'});ops.activity.slice(0,10).forEach(a=>activity.appendChild(el('div',{class:'team-activity-row'},[el('span',{},a.text),el('small',{},new Date(a.at).toLocaleString())])));wrap.appendChild(activity);}} } catch {}
  const companyBuyerUrl = location.origin + location.pathname + '?view=buyerportal&type=company&target=' + encodeURIComponent(company.id);
  const leadData = await api('GET', '/api/buyer-leads').catch(() => ({ leads: [] }));
  wrap.appendChild(el('div', { class: 'buyerlistshare companybuyershare' }, [
    el('div', {}, [el('b', {}, 'Company buyer-list link'), el('div', { class: 'hint' }, `${leadData.leads.length} buyer${leadData.leads.length === 1 ? '' : 's'} captured · share one link in your bio, deal posts, email and website.`)]),
    el('button', { class: 'btn-ghost', onclick: async () => { try { await navigator.clipboard.writeText(companyBuyerUrl); toast('Company buyer-list link copied', 'ok'); } catch { prompt('Copy buyer-list link:', companyBuyerUrl); } } }, 'Copy buyer-list link')
  ]));
  if (leadData.leads.length) {
    const leads = el('div', { class: 'card buyerleadlist' });
    leadData.leads.slice(0, 12).forEach(x => leads.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, [el('div', { class: 't' }, x.name), el('div', { class: 's' }, [x.email, x.phone, ...(x.cities || [])].filter(Boolean).slice(0,4).join(' · ')), el('div', { class: 'hint' }, [x.strategy, x.propertyTypes?.join(', ')].filter(Boolean).join(' · '))])
    ])));
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Recent buyer-list signups'));
    wrap.appendChild(leads);
  }

  if (manager) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Company profile'));
    const edit = el('div', { class: 'card', style: 'padding:16px' });
    const name = el('input', { value: company.name });
    const website = el('input', { value: company.website || '', placeholder: 'https://yourcompany.com' });
    const markets = el('input', { value: (company.markets || []).join(', '), placeholder: 'Philadelphia, South Jersey, Atlanta' });
    const bio = el('textarea', {}); bio.value = company.bio || '';
    const logo = el('input', { type: 'file', accept: 'image/*' }); let logoData = null;
    logo.onchange = async () => { if (logo.files[0]) logoData = await downscale(logo.files[0], 500); };
    edit.appendChild(el('label', {}, 'Company name')); edit.appendChild(name);
    edit.appendChild(el('label', {}, 'Website')); edit.appendChild(website);
    edit.appendChild(el('label', {}, 'Markets')); edit.appendChild(markets);
    edit.appendChild(el('label', {}, 'Company bio')); edit.appendChild(bio);
    edit.appendChild(el('label', {}, 'Company logo')); edit.appendChild(logo);
    const est = el('div', { class: 'okmsg' });
    edit.appendChild(el('button', { class: 'submitbtn', onclick: async () => { try { await api('PATCH', '/api/company', { name: name.value, website: website.value, markets: markets.value, bio: bio.value, logoData }); est.textContent = 'Company profile saved.'; } catch (e) { est.className = 'errmsg'; est.textContent = e.message; } } }, 'Save company profile'));
    edit.appendChild(est); wrap.appendChild(edit);
  }

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Team members'));
  const memberCard = el('div', { class: 'card' });
  data.members.forEach(m => {
    const row = el('div', { class: 'listrow' }, [avatarNode(m, 'small'), el('div', { class: 'grow', onclick: () => go('profile', { profileId: m.id }) }, [el('div', { class: 't' }, m.name), el('div', { class: 's' }, '@' + (m.username || 'member'))])]);
    const actual = m.companyRole || (m.id === company.ownerId ? 'owner' : 'member');
    row.appendChild(el('span', { class: 'pill' }, actual));
    if (data.role === 'owner' && m.id !== state.user.id && m.id !== company.ownerId) {
      row.appendChild(el('button', { onclick: async () => { const next = actual === 'admin' ? 'member' : 'admin'; await api('PATCH', '/api/company/members/' + encodeURIComponent(m.id), { role: next }); render(); } }, actual === 'admin' ? 'Make member' : 'Make admin'));
    }
    if (manager && m.id !== state.user.id && m.id !== company.ownerId) {
      row.appendChild(el('button', { onclick: async () => { if (!confirm('Remove this person from the company workspace?')) return; await api('DELETE', '/api/company/members/' + encodeURIComponent(m.id)); render(); } }, 'Remove'));
    }
    memberCard.appendChild(row);
  });
  wrap.appendChild(memberCard);

  if (manager) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Invite team member'));
    const ibox = el('div', { class: 'card', style: 'padding:16px' });
    const email = el('input', { type: 'email', placeholder: 'teammate@company.com' });
    const role = el('select'); role.appendChild(el('option', { value: 'member' }, 'Member')); role.appendChild(el('option', { value: 'admin' }, 'Company admin'));
    const ist = el('div', { class: 'okmsg' });
    ibox.appendChild(twoUp('Email', email, 'Role', role));
    ibox.appendChild(el('button', { class: 'submitbtn', onclick: async () => { try { const r = await api('POST', '/api/company/invites', { email: email.value, role: role.value }); email.value = ''; ist.className = 'okmsg'; ist.innerHTML = ''; ist.appendChild(document.createTextNode('Invite sent. ')); const copy = el('button', { class: 'linkbtn', onclick: async () => { try { await navigator.clipboard.writeText(r.inviteUrl); toast('Invite link copied', 'ok'); } catch {} } }, 'Copy invite link'); ist.appendChild(copy); } catch (e) { ist.className = 'errmsg'; ist.textContent = e.message; } } }, 'Send invitation'));
    ibox.appendChild(ist);
    if (data.pendingInvites?.length) {
      const pending = el('div', { class: 'pendinginvites' });
      data.pendingInvites.forEach(i => pending.appendChild(el('div', { class: 'listrow' }, [el('div', { class: 'grow' }, [el('div', { class: 't' }, i.email), el('div', { class: 's' }, `${i.role} · pending`)] )])));
      ibox.appendChild(pending);
    }
    wrap.appendChild(ibox);
  }

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Shared acquisition box'));
  const bb = (data.sharedBuyBoxes || [])[0] || { label: 'Company buy box', minPrice: 0, maxPrice: 2000000, cities: [], minSpread: 0 };
  const bbox = el('div', { class: 'card', style: 'padding:16px' });
  const bLabel = el('input', { value: bb.label || 'Company buy box' });
  const bMin = el('input', { type: 'number', value: bb.minPrice || 0 }); const bMax = el('input', { type: 'number', value: bb.maxPrice || 2000000 });
  const bCities = el('input', { value: (bb.cities || []).join(', '), placeholder: 'Markets, comma separated' }); const bSpread = el('input', { type: 'number', value: bb.minSpread || 0 });
  bbox.appendChild(el('label', {}, 'Name')); bbox.appendChild(bLabel); bbox.appendChild(twoUp('Min price ($)', bMin, 'Max price ($)', bMax)); bbox.appendChild(el('label', {}, 'Markets')); bbox.appendChild(bCities); bbox.appendChild(el('label', {}, 'Minimum spread ($)')); bbox.appendChild(bSpread);
  const bst = el('div', { class: 'okmsg' });
  if (manager) bbox.appendChild(el('button', { class: 'submitbtn', onclick: async () => { try { await api('PATCH', '/api/company/buyboxes', { buyBoxes: [{ ...bb, label: bLabel.value, minPrice: bMin.value, maxPrice: bMax.value, cities: bCities.value, minSpread: bSpread.value }] }); bst.textContent = 'Shared buy box saved.'; } catch (e) { bst.className = 'errmsg'; bst.textContent = e.message; } } }, 'Save company buy box'));
  else [bLabel,bMin,bMax,bCities,bSpread].forEach(x => x.disabled = true);
  bbox.appendChild(bst); wrap.appendChild(bbox);

  const [{ listings }, { messages }] = await Promise.all([api('GET', '/api/company/listings'), api('GET', '/api/company/inbox')]);
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Team listings'));
  const lc = el('div', { class: 'card' });
  listings.slice(0, 30).forEach(l => lc.appendChild(el('div', { class: 'listrow' }, [el('div', { class: 'grow', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [el('div', { class: 't' }, l.address), el('div', { class: 's' }, `${l.city} · ${money(l.asking)} · ${l.owner?.name || 'Team'}`)]), el('button', { onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, 'Open')])));
  if (!listings.length) lc.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'Team listings will appear here.')));
  wrap.appendChild(lc);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Company listing inquiries'));
  const inbox = el('div', { class: 'card' });
  messages.slice(0, 30).forEach(m => inbox.appendChild(el('div', { class: 'companyinquiry' }, [
    el('div', { class: 'grow' }, [el('div', { class: 't' }, `${m.customer?.name || 'User'} · ${m.listingAddress}`), el('div', { class: 's' }, m.body), el('div', { class: 'hint' }, `${formatChatTime(m.at)}${m.teammate ? ' · handled by ' + m.teammate.name : ''}`)]),
    m.customer ? el('button', { onclick: () => go('chat', { chatUserId: m.customer.id }) }, 'Message') : null
  ])));
  if (!messages.length) inbox.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'Messages tied to team property listings will appear here.')));
  wrap.appendChild(inbox);

  if (data.role !== 'owner') wrap.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:22px', onclick: async () => { if (!confirm('Leave this company workspace?')) return; await api('POST', '/api/company/leave'); await refreshMe(); go('me'); } }, 'Leave company workspace'));
  return wrap;
}

function toggleRow(title, desc, initial, onChange) {
  const sw = el('button', { class: 'switch' + (initial ? ' on' : '') }, el('div', { class: 'knob' }));
  sw.onclick = async () => { const on = !sw.classList.contains('on'); sw.classList.toggle('on', on); try { await onChange(on); } catch {} };
  return el('div', { class: 'togglerow' }, [el('div', { class: 'grow' }, [el('div', { class: 'tl' }, title), desc ? el('div', { class: 'td' }, desc) : null]), sw]);
}

/* ================= LEADERBOARD ================= */
async function renderLeaderboard() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('div', { class: 'leaderboardhead' }, [el('div', { class: 'dispoeyebrow' }, 'VERIFIED PERFORMANCE'),el('h2', {}, 'Leaderboard'),el('div', { class: 'sub' }, 'Recognition based on verified closings — not self-reported wins.')]));
  wrap.appendChild(el('div', { class: 'card leaderboardinfo' }, [
    el('div', { class: 'leaderboardinfo-main' }, [el('strong', {}, 'How points work'),el('p', {}, 'Each deal an admin verifies as closed awards 100 points to the verified seller and 100 points to the verified buyer.'),el('p', { class: 'hint' }, 'Monthly rankings count points earned this month. All-time rankings show your full verified-closing total. Monthly leaders may receive complimentary membership prizes when awarded by an admin.')]),
    el('div', { class: 'leaderboardrules' }, [el('div', {}, [el('b', {}, '100'),el('span', {}, 'points per verified closing')]),el('div', {}, [el('b', {}, 'Bronze'),el('span', {}, '100+ points')]),el('div', {}, [el('b', {}, 'Silver'),el('span', {}, '200+ points')]),el('div', {}, [el('b', {}, 'Gold'),el('span', {}, '500+ points')])])
  ]));
  const tabs = el('div', { class: 'networktabs' });
  [['all','All time'],['month','This month']].forEach(([period,label]) => {
    const b = el('button', { class: state.leaderboardPeriod === period ? 'active' : '' }, label);
    b.onclick = () => { state.leaderboardPeriod = period; render(); };
    tabs.appendChild(b);
  });
  wrap.appendChild(tabs);
  const { leaderboard } = await api('GET', '/api/leaderboard?period=' + encodeURIComponent(state.leaderboardPeriod || 'all'));
  const card = el('div', { class: 'card' });
  if (!leaderboard.length || (state.leaderboardPeriod === 'month' && !leaderboard.some(r => r.points > 0))) card.appendChild(el('div', { class: 'lbrow' }, el('div', {}, state.leaderboardPeriod === 'month' ? 'No verified closing points this month yet.' : 'No verified deals yet.')));
  leaderboard.filter(r => state.leaderboardPeriod !== 'month' || r.points > 0).forEach((r, i) => card.appendChild(el('div', { class: 'lbrow' }, [
    el('div', { class: 'lbrank' }, String(i + 1)),
    el('div', { class: 'av', style: 'width:34px;height:34px;border-radius:50%;background:var(--surface-2);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;overflow:hidden' },
      r.avatarUrl ? el('img', { src: r.avatarUrl, style: 'width:100%;height:100%;object-fit:cover' }) : initials(r.name)),
    el('div', { class: 'grow', onclick: () => go('profile', { profileId: r.id }) }, [
      el('div', { class: 't' }, [r.name, r.verified ? el('span', { class: 'vbadge' }, '✓') : null, r.badge ? el('span', { class: 'badge ' + r.badge }, r.badge) : null]),
      el('div', { class: 's' }, `${r.role}${r.rating ? ' · ★ ' + r.rating : ''}${r.closedDeals ? ' · ' + r.closedDeals + ' closed' : ''}`)
    ]),
    el('div', { class: 'lbpts' }, r.points + ' pts')
  ])));
  wrap.appendChild(card);
  return wrap;
}

/* ================= ADMIN: EMAIL CENTER ================= */
async function renderEmailCenter() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Email Center'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Send opted-in product broadcasts, test mail delivery and monitor the verification-email setup. Unread-message reminders are transactional account notifications and are controlled by each member in Settings.'));

  const data = await api('GET', '/api/admin/email-center');
  const h = data.health || {};
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Mail health'));
  const health = el('div', { class: 'card', style: 'padding:16px' });
  health.appendChild(el('div', { class: 'statgrid' }, [
    stat(h.configured ? 'Ready' : 'Not ready', 'Resend API'),
    stat(data.marketingConfigured ? 'Ready' : 'Needs setup', 'Broadcast mail'),
    stat(data.counts?.emailVerified || 0, 'Verified emails'),
    stat(data.counts?.marketingOptIn || 0, 'Broadcast recipients')
  ]));
  health.appendChild(el('div', { class: 'dnotes', style: 'margin-top:12px' }, `From: ${h.from || 'Not set'} · App URL: ${h.appUrl || 'Not set'}`));
  if (h.usingSandboxSender) health.appendChild(el('div', { class: 'errmsg', style: 'margin-top:10px' }, 'The site is using Resend’s sandbox sender. That normally only delivers to the Resend account owner. Verify betterrealestate.org in Resend and set MAIL_FROM to an address on that verified domain before real signups.'));
  if (!h.configured) health.appendChild(el('div', { class: 'errmsg', style: 'margin-top:10px' }, 'RESEND_API_KEY is missing or unavailable to this deployment. Verification, password-reset and notification mail cannot be delivered.'));
  const testSt = el('span', { class: 'hint' });
  health.appendChild(el('div', { style: 'display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-top:14px' }, [
    el('button', { class: 'btn-ghost', onclick: async () => { try { await api('POST', '/api/admin/email-center/test', {}); testSt.className='okmsg'; testSt.textContent='Test sent to ' + state.user.email + '. Check inbox/spam.'; } catch(e) { testSt.className='errmsg'; testSt.textContent=e.message; } } }, 'Send test email'),
    testSt
  ]));
  wrap.appendChild(health);
  const signupAlertCard = el('div', { class: 'card adminalertcard' });
  signupAlertCard.appendChild(toggleRow(
    'Email me when someone signs up',
    'Sends a transactional admin alert for each new account. You can turn this off without affecting verification or user emails.',
    data.signupAlertsEnabled !== false,
    async enabled => { await api('PATCH', '/api/admin/email-center/signup-alerts', { enabled }); toast(enabled ? 'New-signup alerts enabled' : 'New-signup alerts disabled', 'ok'); }
  ));
  wrap.appendChild(signupAlertCard);
  if ((data.verificationFailures || []).length) {
    wrap.appendChild(el('div', { class:'sectiontitle' }, 'Recent verification delivery failures'));
    const fails = el('div', { class:'card' });
    data.verificationFailures.forEach(x => fails.appendChild(el('div',{class:'listrow'},[el('div',{class:'grow'},[el('div',{class:'t'},x.email),el('div',{class:'s'},x.at ? new Date(x.at).toLocaleString() : 'Unknown time'),el('div',{class:'hint'},x.error)])])));
    wrap.appendChild(fails);
  }

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Compose broadcast'));
  const box = el('div', { class: 'card', style: 'padding:16px' });
  const audience = el('select', {}, [
    ['all','All opted-in users'],['buyers','Buyers'],['sellers','Sellers / wholesalers'],['teams','Wholesale Team members']
  ].map(([v,l]) => el('option', { value:v }, l)));
  const market = el('input', { placeholder: 'Optional market filter, e.g. Philadelphia' });
  const audienceSt = el('div', { class: 'hint' }, 'Recipient count will only include verified users who opted into product & activity email.');
  const previewAudience = async () => { try { const r = await api('POST','/api/admin/email-center/preview-audience',{ audience:{ kind:audience.value, market:market.value.trim() } }); audienceSt.textContent = `${r.count} eligible recipient${r.count === 1 ? '' : 's'}.`; } catch(e) { audienceSt.textContent=e.message; } };
  audience.onchange = previewAudience; market.onchange = previewAudience;
  const subject = el('input', { placeholder: 'Subject line' });
  const headline = el('input', { placeholder: 'Email headline' });
  const body = el('textarea', { placeholder: 'Write the announcement…', style:'min-height:180px' });
  const ctaLabel = el('input', { value: 'Open Better Real Estate', placeholder: 'Button text' });
  const ctaUrl = el('input', { value: location.origin, placeholder: 'https://betterrealestate.org/...' });
  const timing = el('select', {}, [el('option',{value:'now'},'Send now'), el('option',{value:'later'},'Schedule for later')]);
  const when = el('input', { type:'datetime-local', style:'display:none' });
  timing.onchange = () => { when.style.display = timing.value === 'later' ? '' : 'none'; };
  const preview = el('div', { class:'emailpreview' }, [el('div',{class:'hint'},'Preview updates as you type.')]);
  const refreshPreview = () => { preview.innerHTML=''; preview.appendChild(el('div',{class:'emailpreviewbrand'},'BETTER REAL ESTATE')); preview.appendChild(el('h3',{},headline.value || 'Your email headline')); preview.appendChild(el('p',{},body.value || 'Your message will appear here.')); preview.appendChild(el('span',{class:'btn-primary',style:'display:inline-block'},ctaLabel.value || 'Open Better Real Estate')); };
  [headline,body,ctaLabel].forEach(x => x.addEventListener('input',refreshPreview));
  refreshPreview();
  const sendSt = el('div', { class:'hint' });
  [['Audience',audience],['Market filter',market],['Subject',subject],['Headline',headline],['Message',body],['Button text',ctaLabel],['Button link',ctaUrl],['Delivery',timing]].forEach(([label,input]) => { box.appendChild(el('label',{},label)); box.appendChild(input); });
  box.appendChild(when); box.appendChild(audienceSt);
  box.appendChild(el('label',{},'Preview')); box.appendChild(preview);
  box.appendChild(el('button', { class:'btn-ghost', style:'width:100%;margin-top:12px', onclick: async () => {
    try { await api('POST','/api/admin/email-center/broadcast-test',{ subject:subject.value, headline:headline.value, body:body.value, ctaLabel:ctaLabel.value, ctaUrl:ctaUrl.value, audience:{kind:audience.value,market:market.value.trim()} }); toast('Draft sent to ' + state.user.email, 'ok'); }
    catch(e) { toast(e.message,'err'); }
  } }, 'Send draft to myself'));
  box.appendChild(el('button', { class:'submitbtn', onclick: async () => {
    if (!subject.value.trim() || !headline.value.trim() || !body.value.trim()) { sendSt.className='errmsg'; sendSt.textContent='Subject, headline and message are required.'; return; }
    if (timing.value === 'later' && !when.value) { sendSt.className='errmsg'; sendSt.textContent='Choose a date and time.'; return; }
    const countText = audienceSt.textContent;
    if (!confirm(`${timing.value === 'later' ? 'Schedule' : 'Send'} this broadcast?\n\n${countText}\n\nOnly opted-in, verified users in this audience are eligible.`)) return;
    try {
      const scheduledAt = timing.value === 'later' ? new Date(when.value).toISOString() : new Date().toISOString();
      const r = await api('POST','/api/admin/email-center/broadcasts',{ subject:subject.value, headline:headline.value, body:body.value, ctaLabel:ctaLabel.value, ctaUrl:ctaUrl.value, audience:{kind:audience.value,market:market.value.trim()}, scheduledAt });
      sendSt.className='okmsg'; sendSt.textContent = timing.value === 'later' ? 'Broadcast scheduled.' : `Broadcast queued/sent. ${r.result?.sent || 0} delivered in the first batch.`;
      setTimeout(() => render(), 600);
    } catch(e) { sendSt.className='errmsg'; sendSt.textContent=e.message; }
  } }, 'Send / schedule broadcast'));
  box.appendChild(sendSt);
  wrap.appendChild(box);
  previewAudience();

  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Broadcast history'));
  const hist = el('div', { class:'card' });
  if (!(data.broadcasts || []).length) hist.appendChild(el('div',{class:'listrow'},el('div',{class:'s'},'No broadcasts yet.')));
  (data.broadcasts || []).forEach(b => hist.appendChild(el('div',{class:'listrow'},[
    el('div',{class:'grow'},[el('div',{class:'t'},b.subject),el('div',{class:'s'},`${b.status} · ${b.sentCount} sent${b.failedCount ? ' · ' + b.failedCount + ' failed' : ''} · ${new Date(b.scheduledAt).toLocaleString()}`), b.audience?.market ? el('div',{class:'hint'},`${b.audience.kind} · ${b.audience.market}`) : el('div',{class:'hint'},b.audience?.kind || 'all')]),
    el('span',{class:'pill ' + (b.status === 'sent' ? 'good' : '')},b.status)
  ])));
  wrap.appendChild(hist);
  return wrap;
}


/* ================= ADMIN: MEMBERSHIP GRANTS ================= */
async function renderMemberships() {
  const wrap = el('div', { class: 'page membershipadmin' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('div', { class: 'pageheadrow' }, [
    el('div', {}, [el('h2', {}, 'Membership grants'), el('div', { class: 'sub' }, 'Give a user complimentary Plus, Platinum or Wholesale Teams access for a fixed period. Grants expire automatically and never erase a paid subscription.')])
  ]));

  const search = el('input', { placeholder: 'Search name, email, @username, role or market…' });
  const host = el('div', { class: 'membershipusers' });
  const historyHost = el('div');
  const prizeHost = el('div');
  const founderHost = el('div');
  let seq = 0;

  const grantLabel = plan => plan === 'wholesale' ? 'Wholesale Teams' : plan === 'platinum' ? 'Platinum' : plan === 'pro' ? 'Plus' : 'None';
  const fmtDate = d => d ? new Date(d).toLocaleDateString() : '—';

  async function load() {
    const mine = ++seq;
    host.innerHTML = '<div class="networkloading">Loading members…</div>';
    try {
      const data = await api('GET', '/api/admin/memberships?q=' + encodeURIComponent(search.value.trim()));
      if (mine !== seq) return;
      host.innerHTML = '';
      prizeHost.innerHTML = '';
      historyHost.innerHTML = '';
      founderHost.innerHTML = '';

      const leader = data.monthlyLeader;
      const prize = el('div', { class: 'card prizecard' });
      prize.appendChild(el('div', { class: 'grow' }, [
        el('div', { class: 'dispoeyebrow' }, 'MONTHLY LEADERBOARD PRIZE'),
        el('h3', {}, leader && leader.points > 0 ? `${leader.name} leads with ${leader.points} pts` : 'No verified leader yet'),
        el('div', { class: 'hint' }, leader && leader.points > 0 ? 'Award a time-limited membership with one click. The grant will expire automatically.' : 'A prize becomes available when at least one closing earns verified points this month.')
      ]));
      const prizeControls = el('div', { class: 'grantcontrols compact' });
      const ptier = el('select', {}, [['platinum','Platinum'],['pro','Plus'],['wholesale','Wholesale Teams']].map(([v,l]) => el('option',{value:v},l)));
      const pdays = el('input', { type:'number', min:'1', max:'730', value:'30', title:'Days' });
      const award = el('button', { class: 'btn-primary', disabled: !(leader && leader.points > 0) }, 'Award prize');
      award.onclick = async () => {
        if (!leader || leader.points <= 0) return;
        if (!confirm(`Grant ${leader.name} ${grantLabel(ptier.value)} for ${pdays.value} days as this month's leaderboard prize?`)) return;
        try { await api('POST','/api/admin/memberships/award-leaderboard',{ tier:ptier.value, days:Number(pdays.value), reason:'Monthly leaderboard prize' }); toast('Leaderboard prize granted', 'ok'); await load(); } catch(e) { toast(e.message,'err'); }
      };
      prizeControls.append(ptier,pdays,award); prize.appendChild(prizeControls); prizeHost.appendChild(prize);

      const fp=data.founderProgram||{limit:100,claimed:0,remaining:100,awards:[]};
      const founderCard=el('div',{class:'card founder-admin-card'},[
        el('div',{class:'founder-admin-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'FIRST 100 FOUNDERS'),el('h3',{},`${fp.claimed} of ${fp.limit} places awarded`),el('div',{class:'hint'},`${fp.remaining} remaining. Qualifying accounts receive Founding Member recognition and two weeks of complimentary Platinum without altering paid billing.`)]),el('span',{class:'founding-badge'},`${fp.claimed}/${fp.limit}`)]),
        el('div',{class:'founder-admin-list'},(fp.awards||[]).slice(0,100).map(a=>el('div',{class:'founder-admin-row'},[el('b',{},`#${a.position} · ${a.userName||'Deleted account'}`),el('span',{},a.platinumUntil?`Platinum through ${new Date(a.platinumUntil).toLocaleDateString()}`:'Award recorded')])) )
      ]);
      founderHost.appendChild(founderCard);

      if (!data.users.length) host.appendChild(el('div',{class:'empty compact'},el('p',{},'No users match that search.')));
      data.users.forEach(u => {
        const activeGrant = u.grant?.active;
        const row = el('div', { class: 'card membershiprow' });
        const paid = u.paidPlan && u.paidPlan !== 'free' && u.paidPlanUntil && new Date(u.paidPlanUntil) > new Date();
        const meta = el('div', { class: 'membershipmeta' }, [
          el('div', { class: 'membershipname' }, [u.name, u.username ? el('span',{class:'personhandle'},'@'+u.username) : null]),
          el('div', { class: 's' }, `${u.email} · ${u.role}${u.location ? ' · ' + u.location : ''}`),
          el('div', { class: 'membershipbadges' }, [
            el('span', { class: 'pill' }, paid ? `Paid ${grantLabel(u.paidPlan)} through ${fmtDate(u.paidPlanUntil)}` : 'No active paid plan'),
            activeGrant ? el('span', { class: 'pill good' }, `Free ${grantLabel(u.grant.grantPlan)} through ${fmtDate(u.grant.grantUntil)}`) : el('span', { class: 'pill' }, 'No complimentary grant'),
            el('span', { class: u.verified ? 'pill good' : 'pill' }, u.verified ? 'Verified account' : (u.verificationPending ? 'Verification pending' : 'Not verified'))
          ]),
          activeGrant && u.grant.grantReason ? el('div', { class: 'hint' }, u.grant.grantReason) : null
        ]);
        const controls = el('div', { class: 'membershiprowactions' });
        controls.appendChild(el('button',{class:'btn-primary',onclick:()=>openAdminAccessModal(u,load)},'Manage access'));
        const verifyBtn = el('button', { class: u.verified ? 'btn-ghost adminverifybtn verified' : 'btn-ghost adminverifybtn' }, u.verified ? '✓ Verified' : 'Grant verification');
        verifyBtn.onclick = async () => {
          const next = !u.verified;
          if (!confirm(`${next ? 'Grant' : 'Remove'} account verification for ${u.name}?`)) return;
          try { await api('POST','/api/admin/set-user-verification',{ userId:u.id, verified:next }); toast(next ? 'Account verified' : 'Verification removed','ok'); await load(); } catch(e) { toast(e.message,'err'); }
        };
        controls.appendChild(verifyBtn);
        row.append(meta, controls); host.appendChild(row);
      });

      const history = el('div', { class:'card grantHistory' });
      if (!(data.history || []).length) history.appendChild(el('div',{class:'listrow'},el('div',{class:'s'},'No complimentary memberships have been granted yet.')));
      (data.history || []).forEach(g => history.appendChild(el('div',{class:'listrow'},[
        el('div',{class:'grow'},[
          el('div',{class:'t'},`${g.userName} · ${grantLabel(g.tier)}`),
          el('div',{class:'s'},`${new Date(g.startsAt).toLocaleDateString()} → ${new Date(g.expiresAt).toLocaleDateString()}${g.revokedAt ? ' · revoked ' + new Date(g.revokedAt).toLocaleDateString() : ''}`),
          el('div',{class:'hint'},`${g.reason || 'Complimentary membership'} · ${g.source === 'leaderboard' ? 'leaderboard prize' : g.action === 'extend' ? 'extended' : g.action === 'replace' ? 'replaced' : 'manual grant'}${g.grantedByName ? ' · by '+g.grantedByName : ''}`)
        ])
      ])));
      historyHost.appendChild(history);
    } catch(e) {
      host.innerHTML=''; host.appendChild(el('div',{class:'errmsg'},e.message));
    }
  }

  let timer;
  search.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(load, 250); });
  wrap.appendChild(search);
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Monthly prize'));
  wrap.appendChild(prizeHost);
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'First 100 Founders'));
  wrap.appendChild(founderHost);
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Users'));
  wrap.appendChild(host);
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Grant history'));
  wrap.appendChild(historyHost);
  load();
  return wrap;
}



/* ================= v29 TRANSACTION OS + AFFILIATES ================= */
function downloadExport(kind){window.location.href='/api/export/'+encodeURIComponent(kind);}
async function renderTransactionHub(){
 const wrap=el('div',{class:'page transaction-hub'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'TRANSACTION OS'),el('h2',{},'Transaction hub'),el('div',{class:'sub'},'Relationships, follow-ups, deal tasks, intake and closing records in one professional workspace.')]),el('button',{class:'btn-primary',onclick:()=>openFormModal('Add relationship',[{key:'name',label:'Name',placeholder:'Jordan Alvarez'},{key:'email',label:'Email',placeholder:'jordan@email.com'},{key:'tags',label:'Tags',placeholder:'Cash Buyer, Lender, Contractor'},{key:'markets',label:'Markets',placeholder:'NJ, PA'},{key:'notes',label:'Private notes',type:'textarea',placeholder:'What they buy, relationship context, follow-up notes…'}],'Add contact',async v=>{await api('POST','/api/contacts',{...v,tags:v.tags.split(',').map(x=>x.trim()).filter(Boolean),markets:v.markets.split(',').map(x=>x.trim()).filter(Boolean)});render();})},'+ Add contact')]));
 const d=await api('GET','/api/transaction-hub');const metrics=el('div',{class:'hub-metrics'},[miniMetric(d.contacts.length,'Relationships'),miniMetric(d.tasks.length,'Open tasks'),miniMetric(d.intake.length,'Intake leads'),miniMetric(d.outcomes.length,'Recorded outcomes')]);wrap.appendChild(metrics);
 const grid=el('div',{class:'hub-grid'});
 const contacts=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'RELATIONSHIP CRM'),el('h3',{},'People you do business with')]),el('button',{class:'btn-ghost',onclick:()=>downloadExport('contacts')},'Export CSV')])]);if(!d.contacts.length)contacts.appendChild(el('div',{class:'hub-empty'},'Add buyers, lenders, contractors, agents, title contacts and other relationships.'));d.contacts.slice(0,12).forEach(c=>contacts.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},c.name),el('span',{},[...(c.tags||[]),...(c.markets||[])].join(' · ')||c.email||'Relationship'),c.nextFollowUp?el('small',{},'Follow up '+new Date(c.nextFollowUp).toLocaleDateString()):null]),el('button',{class:'btn-ghost',onclick:()=>openFormModal('Update relationship',[{key:'notes',label:'Private notes',type:'textarea',value:c.notes||''},{key:'nextFollowUp',label:'Next follow-up',type:'datetime-local'}],'Save',async v=>{await api('PATCH','/api/contacts/'+c.id,v);render();})},'Update')])));grid.appendChild(contacts);
 const tasks=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'DEAL TASKS'),el('h3',{},'What needs to happen next')]),el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add deal task',[{key:'title',label:'Task',placeholder:'Confirm EMD receipt'},{key:'listingId',label:'Listing ID (optional)',placeholder:'Link to a deal room if needed'},{key:'dueAt',label:'Due date',type:'datetime-local'}],'Add task',async v=>{await api('POST','/api/deal-tasks',v);render();})},'+ Task')])]);if(!d.tasks.length)tasks.appendChild(el('div',{class:'hub-empty'},'No open tasks.'));d.tasks.slice(0,12).forEach(t=>tasks.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},t.title),t.dueAt?el('small',{},'Due '+new Date(t.dueAt).toLocaleString()):null]),el('button',{class:'hub-check',title:'Complete',onclick:async()=>{await api('PATCH','/api/deal-tasks/'+t.id,{status:'done'});render();}},'✓')])));grid.appendChild(tasks);
 const intake=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'DEAL INTAKE'),el('h3',{},'Let opportunities come to you')]),el('button',{class:'btn-ghost',onclick:async()=>{const x=await api('GET','/api/intake-link');try{await navigator.clipboard.writeText(x.url);toast('Deal intake link copied','ok')}catch{prompt('Copy your deal intake link',x.url);}}},'Copy intake link')])]);if(!d.intake.length)intake.appendChild(el('div',{class:'hub-empty'},'Share your intake link with sellers and partners. New submissions land here.'));d.intake.slice(0,10).forEach(x=>intake.appendChild(el('div',{class:'hub-row'},el('div',{class:'grow'},[el('b',{},x.address),el('span',{},x.name+(x.asking?' · '+money(x.asking):'')),x.notes?el('small',{},x.notes):null]))));grid.appendChild(intake);
 const outcomes=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'CLOSING RECORDS'),el('h3',{},'Outcomes & profit')]),el('button',{class:'btn-ghost',onclick:()=>downloadExport('outcomes')},'Export CSV')])]);if(!d.outcomes.length)outcomes.appendChild(el('div',{class:'hub-empty'},'Closed and completed deal outcomes will appear here.'));d.outcomes.slice(0,10).forEach(x=>outcomes.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},x.status.toUpperCase()),el('span',{},'Recorded '+new Date(x.createdAt).toLocaleDateString())]),el('strong',{class:x.profit>=0?'positive':'negative'},money(x.profit))])));grid.appendChild(outcomes);
 const creds=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'BUYER CREDENTIALS'),el('h3',{},'Proof & qualifications')]),el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add buyer credential',[{key:'label',label:'Credential name',placeholder:'Proof of Funds — Sept 2026'},{key:'note',label:'Private note',type:'textarea',placeholder:'Reference or verification note'}],'Add credential',async v=>{await api('POST','/api/credentials',{type:'proof-of-funds',...v});render();})},'+ Credential')])]);if(!d.credentials.length)creds.appendChild(el('div',{class:'hub-empty'},'Keep credential references here and selectively share deal documents through Deal Rooms.'));d.credentials.forEach(x=>creds.appendChild(el('div',{class:'hub-row'},el('div',{class:'grow'},[el('b',{},x.label),el('small',{},x.note||x.type)]))));grid.appendChild(creds);
 const services=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'SERVICE NETWORK'),el('h3',{},'Professionals for the deal')]),el('button',{class:'btn-ghost',onclick:()=>go('settings')},'My service profile')])]);try{const sr=await api('GET','/api/service-providers');if(!sr.providers.length)services.appendChild(el('div',{class:'hub-empty'},'Title, lending, contractor and other service profiles will appear as professionals opt in.'));sr.providers.slice(0,8).forEach(u=>services.appendChild(el('button',{class:'hub-provider',onclick:()=>go('profile',{profileId:u.id})},[avatarNode(u),el('div',{},[el('b',{},u.name),el('span',{},(u.settings?.serviceTypes||[]).join(' · ')||u.role)])])));}catch{}grid.appendChild(services);
 wrap.appendChild(grid);wrap.appendChild(el('div',{class:'hub-exportbar'},[el('div',{},[el('b',{},'Your data stays portable.'),el('span',{},'Export serious business records whenever you need them.')]),el('button',{class:'btn-ghost',onclick:()=>downloadExport('pipeline')},'Export pipeline CSV')]));return wrap;
}
async function renderAffiliateCenter(){
 const wrap=el('div',{class:'page affiliate-center'});
 if(!state.user){
  wrap.appendChild(el('section',{class:'affiliate-hero affiliate-public'},[
   el('div',{class:'eyebrow'},'BETTER AFFILIATES'),
   el('h2',{},'Earn 30% promoting Better Real Estate'),
   el('p',{},'Create a Better Real Estate account and request affiliate access. Every application is reviewed before an affiliate link is activated.'),
   el('div',{class:'terms-line'},[el('b',{},'30% commission'),el('span',{},'Eligible attributed membership sales')]),
   el('div',{class:'affiliate-public-actions'},[
    el('button',{class:'btn-primary',onclick:()=>{state.postAuthTarget={view:'affiliate'};state.authMode='signup';go('auth');}},'Create account & apply'),
    el('button',{class:'btn-ghost',onclick:()=>{state.postAuthTarget={view:'affiliate'};state.authMode='login';go('auth');}},'Sign in')
   ])
  ]));
  return wrap;
 }
 const d=await api('GET','/api/affiliate/me');wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'BETTER AFFILIATES'),el('h2',{},'Affiliate center'),el('div',{class:'sub'},'Earn a 30% one-time cash commission on a qualifying referred customer’s first eligible paid membership transaction.')]),el('div',{class:'affiliate-rate'},[el('strong',{},'30%'),el('span',{},'one-time commission')]) ]));
 if(state.access?.adminUnlimited){try{const ad=await api('GET','/api/admin/affiliates');const panel=el('section',{class:'hub-panel affiliate-admin'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'ADMIN'),el('h3',{},'Affiliate approvals')]),el('span',{class:'sub'},`${ad.applications.length} applications · ${cents(ad.totals.pending)} pending commissions`)])]);if(!ad.applications.length)panel.appendChild(el('div',{class:'hub-empty'},'No affiliate applications yet.'));ad.applications.slice().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt))).forEach(x=>panel.appendChild(el('div',{class:'affiliate-admin-row'},[el('div',{class:'grow'},[el('b',{},x.name+' · '+x.status),el('span',{},x.channels||x.audience||x.email),el('small',{},`${x.metrics.sales} sales · ${cents(x.metrics.paid)} paid`)]),el('div',{class:'affiliate-admin-actions'},['approved','denied','suspended','revoked'].filter(st=>st!==x.status).slice(0,2).map(st=>el('button',{class:st==='approved'?'btn-primary':'btn-ghost',onclick:async()=>{await api('POST','/api/admin/affiliates/'+x.id+'/status',{status:st});toast('Affiliate '+st,'ok');render();}},st.charAt(0).toUpperCase()+st.slice(1))))])));wrap.appendChild(panel);}catch(e){wrap.appendChild(el('div',{class:'errmsg'},e.message));}}
 if(!d.application){const card=el('section',{class:'affiliate-hero'},[el('h3',{},'Apply to become a Better affiliate'),el('p',{},'Tell us how you plan to introduce Better Real Estate to your audience. Every application is reviewed before affiliate links are activated.'),el('button',{class:'btn-primary',onclick:()=>openFormModal('Affiliate application',[{key:'audience',label:'Your audience',type:'textarea',placeholder:'Who do you reach and approximately how?'},{key:'channels',label:'Channels',placeholder:'Instagram, YouTube, REIA, newsletter…'},{key:'why',label:'Why Better Real Estate?',type:'textarea',placeholder:'How would you promote the platform responsibly?'}],'Submit application',async v=>{await api('POST','/api/affiliate/apply',v);toast('Affiliate application submitted','ok');render();})},'Request affiliate access')]);wrap.appendChild(card);return wrap;}
 const a=d.application;wrap.appendChild(el('div',{class:'affiliate-status '+a.status},[el('div',{},[el('small',{},'APPLICATION STATUS'),el('b',{},a.status.charAt(0).toUpperCase()+a.status.slice(1))]),a.status==='approved'?el('span',{},'Admin approved'):el('span',{},a.status==='pending'?'Waiting for admin review':'Contact support if you have questions') ]));if(a.status!=='approved')return wrap;
 if(!a.termsAcceptedAt||a.termsVersion!==d.terms.version||Number(a.rateBps)!==Number(d.terms.rateBps)){wrap.appendChild(el('section',{class:'terms-card'},[el('div',{class:'eyebrow'},'ACTION REQUIRED'),el('h3',{},'Review your affiliate terms'),el('p',{},d.terms.summary),el('div',{class:'affiliate-terms-list'},['Commission is paid once per qualifying referred customer, on their first eligible paid membership transaction.','Renewals, later billing cycles, cancellations and later resubscriptions, upgrades and downgrades do not create another commission.','Commissions remain pending for 3 days before becoming available.','Refunds, disputes, chargebacks, fraud or ineligible transactions may reverse the related commission.','Self-referrals, duplicate or fake accounts, tracking manipulation and other artificial commission activity are prohibited.','Cash affiliate earnings are separate from Better Credits. Better Credits cannot be withdrawn.','Payouts require secure Stripe Connect onboarding. Better Real Estate never stores full bank or debit-card credentials.','Affiliates must make required affiliate disclosures and are responsible for applicable taxes and lawful promotion.','Future material commission changes require affirmative in-platform acceptance before they apply to future earnings; legitimately earned commissions are not silently rewritten.'].map(x=>el('div',{class:'affiliate-term-item'},[el('span',{class:'affiliate-term-check'},'✓'),el('span',{},x)]))),el('div',{class:'terms-line'},[el('b',{},d.terms.ratePct+'% one-time commission'),el('span',{},d.terms.holdDays+'-day hold · renewals do not earn another commission')]),el('button',{class:'btn-primary',onclick:async()=>{await api('POST','/api/affiliate/accept-terms',{version:d.terms.version});toast('Affiliate terms accepted','ok');render();}},'Agree & activate affiliate link') ]));return wrap;}
 wrap.appendChild(el('div',{class:'affiliate-metrics'},[miniMetric(d.metrics.clicks,'Link clicks'),miniMetric(d.metrics.sales,'Membership sales'),miniMetric(cents(d.metrics.pending),'Pending'),miniMetric(cents(d.metrics.available),'Available'),miniMetric(cents(d.metrics.paid),'Paid') ]));
 const link=el('section',{class:'affiliate-link-card'},[el('div',{},[el('small',{},'YOUR AFFILIATE LINK'),el('b',{},d.link)]),el('button',{class:'btn-ghost',onclick:async()=>{await navigator.clipboard.writeText(d.link);toast('Affiliate link copied','ok');}},'Copy link')]);wrap.appendChild(link);
 const payout=el('section',{class:'payout-card'},[el('div',{},[el('h3',{},'Affiliate Wallet'),el('p',{class:'sub'},d.payoutConfigured?'Your secure payout destination is connected through Stripe. Available affiliate cash can be withdrawn after the 3-day hold.':'Connect an eligible bank account or debit-card payout destination securely through Stripe. Better Real Estate never stores your bank/card credentials.')]),el('div',{class:'payout-actions'},[el('button',{class:'btn-ghost',onclick:async()=>{const r=await api('POST','/api/affiliate/payout-onboarding',{});location.href=r.url;}},d.payoutConfigured?'Manage payout setup':'Connect payout account'),el('button',{class:'btn-primary',disabled:d.metrics.available<100,onclick:async()=>{if(!confirm('Withdraw '+cents(d.metrics.available)+' of available affiliate earnings?'))return;await api('POST','/api/affiliate/withdraw',{amountCents:d.metrics.available});toast('Affiliate withdrawal sent','ok');render();}},d.metrics.available>=100?'Withdraw '+cents(d.metrics.available):'Nothing available yet')])]);wrap.appendChild(payout);
 if(d.commissions.length){const hist=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},el('div',{},[el('div',{class:'eyebrow'},'EARNINGS'),el('h3',{},'Commission history')]))]);d.commissions.slice(0,25).forEach(c=>hist.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},c.tier+' membership'),el('small',{},new Date(c.createdAt).toLocaleDateString()+' · '+c.status)]),el('strong',{},cents(c.amountCents))])));wrap.appendChild(hist);}return wrap;
}
async function renderDealIntake(){const wrap=el('div',{class:'panel intake-public'}),code=state.intakeCode||new URLSearchParams(location.search).get('code');if(!code){wrap.appendChild(el('div',{class:'empty'},'This deal intake link is incomplete.'));return wrap;}const d=await api('GET','/api/intake/'+encodeURIComponent(code));wrap.appendChild(el('div',{class:'eyebrow'},'DEAL INTAKE'));wrap.appendChild(el('h2',{},'Send a property to '+d.owner.name));wrap.appendChild(el('p',{class:'sub'},'Share the basic opportunity details. Your submission goes directly into their Better Real Estate workspace.'));const refs={};[['name','Your name'],['email','Email'],['phone','Phone'],['address','Property address'],['asking','Asking price']].forEach(([k,l])=>{wrap.appendChild(el('label',{},l));refs[k]=el('input',{type:k==='asking'?'number':'text'});wrap.appendChild(refs[k]);});wrap.appendChild(el('label',{},'Property notes'));refs.notes=el('textarea',{placeholder:'Condition, occupancy, timeline, access, anything important…'});wrap.appendChild(refs.notes);const st=el('div',{class:'errmsg'});wrap.append(st,el('button',{class:'submitbtn',onclick:async()=>{try{await api('POST','/api/intake/'+encodeURIComponent(code),Object.fromEntries(Object.entries(refs).map(([k,v])=>[k,v.value])));wrap.innerHTML='';wrap.appendChild(el('div',{class:'empty'},[el('h3',{},'Property sent'),el('p',{},'Your deal was delivered through Better Real Estate.') ]));}catch(e){st.textContent=e.message;}}},'Submit property'));return wrap;}

function openCommandPalette(){if(!state.user)return;const shade=el('div',{class:'command-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),box=el('div',{class:'command-palette'}),input=el('input',{placeholder:'Search tools and actions…'}),list=el('div',{class:'command-list'});const actions=[...quickOptionCatalog(),{id:'search',title:'Search properties & people',desc:'Universal search',view:'search'},{id:'messages',title:'Messages',desc:'Open conversations',view:'messages'},{id:'offers',title:'Offers',desc:'Review sent and received offers',view:'offers'},{id:'calendar',title:'Deal calendar',desc:'Deadlines and reminders',view:'dealcalendar'}];const draw=()=>{list.innerHTML='';const q=input.value.toLowerCase();actions.filter(x=>(x.title+' '+x.desc).toLowerCase().includes(q)).slice(0,12).forEach(x=>list.appendChild(el('button',{onclick:()=>{shade.remove();go(x.view);}},[el('b',{},x.title),el('span',{},x.desc)])));};input.oninput=draw;input.onkeydown=e=>{if(e.key==='Escape')shade.remove();};box.append(input,list);shade.appendChild(box);document.body.appendChild(shade);draw();setTimeout(()=>input.focus(),20);}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommandPalette();}});

/* ================= v27 OPERATING NETWORK ================= */
const STATE_CODES=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
function miniMetric(value,label){return el('div',{class:'mini-metric'},[el('b',{},String(value)),el('span',{},label)]);}
function quickOptionCatalog(){
 const base=[
  {id:'compose',title:'Post a property',desc:'Create or import a listing',view:'compose'},
  {id:'dealbuilder',title:'Analyze a deal',desc:'Open AI Deal Builder',view:'dealbuilder'},
  {id:'buyercrm',title:'Buyer CRM',desc:'Manage buyers and relationships',view:'buyercrm'},
  {id:'pipeline',title:'Deal pipeline',desc:'View and manage opportunities',view:'pipeline'},
  {id:'transactionhub',title:'Transaction hub',desc:'Contacts, tasks, intake and closing tools',view:'transactionhub'},
  {id:'buybox',title:'Buy boxes',desc:'Manage what you buy',view:'buybox'},
  {id:'savedsearches',title:'Deal alerts',desc:'Saved searches and alerts',view:'savedsearches'},
  {id:'markethubs',title:'Market Hubs',desc:'Explore active investment markets',view:'markethubs'},
  {id:'affiliate',title:'Affiliate center',desc:'Apply, track sales and earnings',view:'affiliate'},
  {id:'liked',title:'Liked properties',desc:'View watched properties',view:'saved'}
 ];
 if(state.access?.adminUnlimited) base.push({id:'admin',title:'Admin users',desc:'User activity and account controls',view:'admin'});
 return base;
}
function selectedQuickOptions(){const allowed=new Set(quickOptionCatalog().map(x=>x.id));const saved=state.user?.settings?.quickOptions;const defaults=state.access?.adminUnlimited?['admin','transactionhub','compose','dealbuilder','pipeline']:['transactionhub','compose','dealbuilder','pipeline','liked'];return (Array.isArray(saved)?saved:defaults).filter(x=>allowed.has(x)).slice(0,6);}
async function saveQuickOptions(ids){const {settings}=await api('PATCH','/api/me/settings',{quickOptions:ids});state.user.settings=settings;}
function openQuickOptions(){
 const shade=el('div',{class:'quick-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),card=el('div',{class:'quick-card'});
 const head=el('div',{class:'quick-head'},[el('div',{},[el('div',{class:'eyebrow'},'QUICK OPTIONS'),el('h3',{},'Your shortcuts')]),el('button',{class:'iconbtn',title:'Close',onclick:()=>shade.remove()},'×')]);card.append(head);
 const chosen=selectedQuickOptions(),catalog=quickOptionCatalog();catalog.filter(x=>chosen.includes(x.id)).forEach(x=>card.appendChild(el('button',{class:'quick-option',onclick:()=>{shade.remove();go(x.view);}},[el('b',{},x.title),el('span',{},x.desc)])));
 card.appendChild(el('button',{class:'quick-customize',onclick:()=>{shade.remove();openQuickCustomizer();}},'Customize quick options'));
 shade.appendChild(card);document.body.appendChild(shade);
}
function openQuickCustomizer(){
 const shade=el('div',{class:'quick-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),card=el('div',{class:'quick-card'}),catalog=quickOptionCatalog(),chosen=new Set(selectedQuickOptions());
 card.appendChild(el('div',{class:'quick-head'},[el('div',{},[el('div',{class:'eyebrow'},'QUICK OPTIONS'),el('h3',{},'Choose shortcuts'),el('div',{class:'sub'},'Select up to 6 actions. You can change these anytime.')]),el('button',{class:'iconbtn',onclick:()=>shade.remove()},'×')]));
 const list=el('div',{class:'quick-custom-list'});catalog.forEach(x=>{const cb=el('input',{type:'checkbox'});cb.checked=chosen.has(x.id);cb.onchange=()=>{if(cb.checked&&[...list.querySelectorAll('input:checked')].length>6){cb.checked=false;toast('Choose up to 6 quick options.','err');}};list.appendChild(el('label',{class:'quick-custom-row'},[cb,el('span',{},[el('b',{},x.title),el('small',{},x.desc)])]));});
 const back=el('button',{class:'btn-ghost',type:'button'},'Back');back.onclick=()=>{shade.remove();openQuickOptions();};const save=el('button',{class:'btn-primary'},'Save quick options');save.onclick=async()=>{const ids=catalog.filter((x,i)=>list.querySelectorAll('input')[i].checked).map(x=>x.id);if(!ids.length)return toast('Choose at least one quick option.','err');try{await saveQuickOptions(ids);shade.remove();toast('Quick options updated.','ok');renderTop();openQuickOptions();}catch(e){toast(e.message,'err')}};const actions=el('div',{class:'quick-custom-actions'},[back,save]);card.append(list,actions);shade.appendChild(card);document.body.appendChild(shade);
}

function openFormModal(title,fields,saveLabel,onSave){const shade=el('div',{class:'quick-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),card=el('div',{class:'quick-card form-modal'});card.appendChild(el('div',{class:'quick-head'},[el('div',{},[el('div',{class:'eyebrow'},'BETTER REAL ESTATE'),el('h3',{},title)]),el('button',{class:'iconbtn',onclick:()=>shade.remove()},'×')]));const refs={};fields.forEach(f=>{card.appendChild(el('label',{},f.label));let input;if(f.type==='textarea'){input=el('textarea',{placeholder:f.placeholder||''});input.value=f.value||'';}else{input=el('input',{type:f.type||'text',placeholder:f.placeholder||'',value:f.value||''});}refs[f.key]=input;card.appendChild(input);});const st=el('div',{class:'errmsg'}),actions=el('div',{class:'form-modal-actions'},[el('button',{class:'btn-ghost',onclick:()=>shade.remove()},'Cancel'),el('button',{class:'btn-primary',onclick:async e=>{e.currentTarget.disabled=true;st.textContent='';try{await onSave(Object.fromEntries(Object.entries(refs).map(([k,v])=>[k,v.value])));shade.remove();}catch(err){st.textContent=err.message;e.currentTarget.disabled=false;}}},saveLabel||'Save')]);card.append(st,actions);shade.appendChild(card);document.body.appendChild(shade);setTimeout(()=>Object.values(refs)[0]?.focus(),20);}
function statePicker(selected=[],onChange){const chosen=new Set(selected||[]),wrap=el('div',{class:'state-picker'});STATE_CODES.forEach(code=>{const b=el('button',{type:'button',class:chosen.has(code)?'on':''},code);b.onclick=()=>{chosen.has(code)?chosen.delete(code):chosen.add(code);b.classList.toggle('on',chosen.has(code));onChange?.([...chosen]);};wrap.appendChild(b);});return wrap;}
async function renderCommandCenter(){
 const wrap=el('div',{class:'page commandcenter'}),d=await api('GET','/api/dashboard');
 wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'OPERATING NETWORK'),el('h2',{},'Command center'),el('div',{class:'sub'},'The work that needs your attention, without hunting through the site.')]),el('button',{class:'btn-primary',onclick:openQuickCreate},'+ Quick create')]));
 wrap.appendChild(el('div',{class:'command-grid'},[miniMetric(d.matched,'Deals in your markets'),miniMetric(d.buyerMatches,'Buyer matches'),miniMetric(d.pendingOffers,'Offers waiting'),miniMetric(d.upcoming?new Date(d.upcoming.at).toLocaleDateString():'—','Next deadline')]));
 const actions=el('div',{class:'command-actions'});[['Deal pipeline','pipeline'],['Deal calendar','dealcalendar'],['Saved searches','savedsearches'],['Market Hubs','markethubs'],['Buyer CRM','buyercrm'],['Liked properties','saved']].forEach(([t,v])=>actions.appendChild(el('button',{onclick:()=>go(v)},t)));wrap.appendChild(actions);
 if(d.upcoming)wrap.appendChild(el('div',{class:'attention-card'},[el('span',{class:'eyebrow'},'NEXT UP'),el('b',{},d.upcoming.title),el('span',{},new Date(d.upcoming.at).toLocaleString())]));
 if(d.recentViewed?.length){wrap.appendChild(el('div',{class:'sectiontitle'},'Recently viewed'));const rv=el('div',{class:'recent-strip'});d.recentViewed.forEach(x=>rv.appendChild(el('button',{class:'recent-card',onclick:()=>go('detail',{detailId:x.id})},[x.photo?el('img',{src:x.photo}):el('div',{class:'recent-placeholder'},'BRE'),el('div',{},[el('b',{},x.address),el('span',{},x.city+' · '+money(x.asking))])])));wrap.appendChild(rv);}
 try{const n=await api('GET','/api/notifications');if(n.notifications.length){wrap.appendChild(el('div',{class:'sectiontitle'},`Property updates${n.unread?' · '+n.unread+' new':''}`));const box=el('div',{class:'notification-list'});n.notifications.slice(0,8).forEach(x=>box.appendChild(el('button',{class:'notification-row',onclick:()=>go('detail',{detailId:x.listingId})},[el('b',{},x.title),el('span',{},x.body),el('small',{},new Date(x.at).toLocaleString())])));wrap.appendChild(box);if(n.unread)api('POST','/api/notifications/read').catch(()=>{});}}catch{}
 return wrap;
}
async function renderUniversalSearch(){
 const wrap=el('div',{class:'page universal-search'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Search'),el('div',{class:'sub'},'Find properties and people. Filter deals, then save the criteria as an alert.')]),el('button',{class:'btn-ghost',onclick:()=>go('savedsearches')},'Saved searches')]));
 const q=el('input',{placeholder:'Address, city, property type, person…',value:state.searchQ||''}),st=el('select');st.appendChild(el('option',{value:''},'All states'));STATE_CODES.forEach(x=>st.appendChild(el('option',{value:x},x)));const max=el('input',{type:'number',placeholder:'Max price'}),type=el('select');['','Single Family','Multi Family','Condo','Townhouse','Land','Commercial'].forEach(x=>type.appendChild(el('option',{value:x},x||'All property types')));const goBtn=el('button',{class:'btn-primary'},'Search');
 wrap.appendChild(el('div',{class:'searchbar-pro'},[q,st,max,type,goBtn]));const host=el('div');wrap.appendChild(host);
 const load=async()=>{state.searchQ=q.value;host.innerHTML='<div class="networkloading">Searching…</div>';try{const r=await api('GET',`/api/search?q=${encodeURIComponent(q.value)}&state=${encodeURIComponent(st.value)}&maxPrice=${encodeURIComponent(max.value)}&type=${encodeURIComponent(type.value)}`);host.innerHTML='';host.appendChild(el('div',{class:'search-section-head'},[el('h3',{},`Properties · ${r.listings.length}`),el('button',{class:'btn-ghost',onclick:()=>openFormModal('Save this search',[{key:'name',label:'Alert name',value:'My deal alert',placeholder:'e.g. Philadelphia flips under $200k'}],'Save alert',async v=>{if(!v.name.trim())throw new Error('Name your alert.');await api('POST','/api/saved-searches',{name:v.name,query:q.value,states:st.value?[st.value]:[],propertyTypes:type.value?[type.value]:[],maxPrice:max.value,alerts:true});toast('Deal alert saved','ok');})},'Save search + alert')]));const grid=el('div',{class:'search-property-grid'});r.listings.forEach(l=>grid.appendChild(propertyCard(l)));if(!r.listings.length)grid.appendChild(el('div',{class:'empty'},'No matching properties.'));host.appendChild(grid);host.appendChild(el('h3',{class:'search-section-head'},`People · ${r.people.length}`));const people=el('div',{class:'peoplegrid'});r.people.forEach(u=>people.appendChild(personCard(u)));host.appendChild(people);if(r.companies?.length){host.appendChild(el('h3',{class:'search-section-head'},`Companies · ${r.companies.length}`));const cg=el('div',{class:'search-chip-grid'});r.companies.forEach(c=>cg.appendChild(el('button',{class:'search-entity-chip',onclick:()=>go('company',{companyId:c.id})},[el('b',{},c.name),el('span',{},(c.markets||[]).join(' · ')||'Company workspace')] )));host.appendChild(cg);}if(r.buyers?.length){host.appendChild(el('h3',{class:'search-section-head'},`Buyers · ${r.buyers.length}`));const bg=el('div',{class:'buyerdemandgrid'});r.buyers.forEach(x=>bg.appendChild(buyerDemandCard(x)));host.appendChild(bg);}if(r.markets?.length){host.appendChild(el('h3',{class:'search-section-head'},'Markets'));host.appendChild(el('div',{class:'search-chip-grid'},r.markets.map(m=>el('button',{class:'search-entity-chip',onclick:()=>{q.value=m;st.value=m;load();}},m))));}}catch(e){host.innerHTML='';host.appendChild(el('div',{class:'errmsg'},e.message));}};goBtn.onclick=load;q.onkeydown=e=>{if(e.key==='Enter')load();};await load();return wrap;
}
async function renderSavedSearches(){
 const wrap=el('div',{class:'page saved-searches-page'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Saved searches & deal alerts'),el('div',{class:'sub'},'Keep your best search criteria and see how many live properties match right now.')]),el('button',{class:'btn-primary',onclick:()=>go('search')},'Create from search')]));const r=await api('GET','/api/saved-searches');if(!r.searches.length){wrap.appendChild(el('div',{class:'empty'},[el('h3',{},'No deal alerts yet'),el('p',{},'Search for a market or deal type, then save the search to start tracking it.') ]));return wrap;}const list=el('div',{class:'saved-search-list'});r.searches.forEach(x=>list.appendChild(el('div',{class:'saved-search-card'},[el('div',{class:'grow'},[el('b',{},x.name),el('span',{},[x.query,...(x.states||[]),...(x.propertyTypes||[])].filter(Boolean).join(' · ')||'Any matching property'),el('small',{},`${x.matchCount} live match${x.matchCount===1?'':'es'} · ${x.alerts?'Alerts on':'Alerts off'}`)]),el('button',{onclick:()=>{state.searchQ=x.query||'';go('search');}},'View matches'),el('button',{class:'btn-ghost',onclick:async()=>{if(confirm('Delete this saved search?')){await api('DELETE','/api/saved-searches/'+x.id);render();}}},'Delete')] )));wrap.appendChild(list);return wrap;
}
async function renderPipeline(){
 const wrap=el('div',{class:'page pipelinepage'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Deal pipeline'),el('div',{class:'sub'},'Move opportunities from first look to closing. Team deals are shared automatically inside a Team workspace.')]),el('button',{class:'btn-primary',onclick:()=>openFormModal('Add pipeline lead',[{key:'title',label:'Deal or lead name',placeholder:'123 Market St or Seller lead'},{key:'nextAction',label:'Next action',placeholder:'Call seller tomorrow'}],'+ Add lead',async v=>{if(!v.title.trim())throw new Error('Add a deal or lead name.');await api('POST','/api/pipeline',{title:v.title,nextAction:v.nextAction,stage:'lead'});render();})},'+ Add lead')]));const {deals}=await api('GET','/api/pipeline'),stages=[['lead','Lead'],['analyzing','Analyzing'],['contacted','Contacted'],['contract','Under contract'],['dispo','Dispo'],['closing','Closing'],['closed','Closed'],['dead','Dead']];const board=el('div',{class:'pipeline-board'});stages.forEach(([key,label])=>{const col=el('div',{class:'pipeline-col'},[el('div',{class:'pipeline-col-head'},[el('b',{},label),el('span',{},String(deals.filter(d=>d.stage===key).length))])]);deals.filter(d=>d.stage===key).forEach(d=>{const select=el('select');stages.forEach(([v,l])=>select.appendChild(el('option',{value:v},l)));select.value=d.stage;select.onchange=async()=>{await api('POST','/api/pipeline',{id:d.id,stage:select.value});render();};col.appendChild(el('div',{class:'pipeline-card'},[el('b',{},d.title),d.nextAction?el('small',{},d.nextAction):null,select,el('button',{class:'btn-ghost',onclick:()=>openFormModal('Private pipeline notes',[{key:'notes',label:'Internal notes',type:'textarea',value:d.notes||'',placeholder:'Context, follow-up notes, seller details…'}],'Save notes',async v=>{await api('POST','/api/pipeline',{id:d.id,notes:v.notes});render();})},d.notes?'Edit notes':'Add notes'),d.listingId?el('button',{onclick:()=>go('dealroom',{detailId:d.listingId})},'Deal room'):null]));});board.appendChild(col);});wrap.appendChild(board);return wrap;
}
async function renderDealCalendar(){
 const wrap=el('div',{class:'page calendarpage'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Deal calendar'),el('div',{class:'sub'},'Closing dates, follow-ups, inspections and offer deadlines in one timeline.')]),el('button',{class:'btn-primary',onclick:()=>openFormModal('Add deal reminder',[{key:'title',label:'Reminder title',placeholder:'Follow up with buyer'},{key:'at',label:'Date & time',type:'datetime-local'}],'Add reminder',async v=>{if(!v.title.trim()||!v.at)throw new Error('Add a title and date.');await api('POST','/api/deal-calendar',{title:v.title,at:v.at});render();})},'+ Add reminder')]));const {events}=await api('GET','/api/deal-calendar');if(!events.length){wrap.appendChild(el('div',{class:'empty'},[el('h3',{},'Your calendar is clear'),el('p',{},'Add a follow-up or deadline from here.')]));return wrap;}const list=el('div',{class:'calendar-list'});events.forEach(e=>list.appendChild(el('div',{class:'calendar-event'},[el('div',{class:'calendar-date'},[el('b',{},new Date(e.at).toLocaleDateString(undefined,{month:'short',day:'numeric'})),el('span',{},new Date(e.at).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}))]),el('div',{class:'grow'},[el('b',{},e.title),el('span',{},e.kind||'Follow-up')]),e.system?el('span',{class:'pill'},'Automatic'):el('button',{class:'btn-ghost',onclick:async()=>{await api('DELETE','/api/deal-calendar/'+e.id);render();}},'Done')] )));wrap.appendChild(list);return wrap;
}
async function renderMarketHubs(){
 const wrap=el('div',{class:'page markethubspage'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Market Hubs'),el('div',{class:'sub'},'See where listings, investors and buyer demand are building across Better Real Estate.')]),el('button',{class:'btn-ghost',onclick:()=>go('settings')},'Edit my markets')]));const {markets}=await api('GET','/api/market-hubs');const grid=el('div',{class:'market-grid'});markets.forEach(m=>grid.appendChild(el('div',{class:'market-card'},[el('div',{class:'market-code'},m.state),el('div',{class:'market-stats'},[miniMetric(m.listings,'Listings'),miniMetric(m.buyers,'Buy boxes'),miniMetric(m.investors,'Investors')]),el('button',{onclick:()=>{state.searchQ=m.state;go('search');}},'Explore market')] )));if(!markets.length)grid.appendChild(el('div',{class:'empty'},'Market activity will appear as members choose markets and post properties.'));wrap.appendChild(grid);return wrap;
}
async function renderDealRoom(){
 const wrap=el('div',{class:'page dealroompage'});wrap.appendChild(el('button',{class:'backbtn',onclick:()=>history.length>1?history.back():go('pipeline')},'← Back'));if(!state.detailId){wrap.appendChild(el('div',{class:'empty'},'Choose a listing or offer to open its deal room.'));return wrap;}let roomData;try{roomData=await api('GET','/api/listings/'+encodeURIComponent(state.detailId)+'/deal-room');}catch(e){wrap.appendChild(el('div',{class:'errmsg'},e.message));return wrap;}const {room,listing,canManage,messages,offers}=roomData;wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'PRIVATE DEAL ROOM'),el('h2',{},listing.address),el('div',{class:'sub'},listing.city)]),el('button',{class:'btn-ghost',onclick:()=>go('detail',{detailId:state.detailId})},'View listing')]));
 const left=el('section',{class:'ops-card'});left.appendChild(el('h3',{},'Deal status'));if(canManage){const stage=el('select');[['intake','Intake'],['marketing','Marketing'],['buyer-interest','Buyer interest'],['negotiation','Negotiation'],['title','Title'],['closing','Closing'],['closed','Closed'],['on-hold','On hold']].forEach(([v,l])=>stage.appendChild(el('option',{value:v},l)));stage.value=room.stage;const next=el('input',{placeholder:'Next action',value:room.nextAction||''}),notes=el('textarea',{placeholder:'Private deal-team notes'});notes.value=room.privateNotes||'';const save=el('button',{class:'btn-primary'},'Save deal room');save.onclick=async()=>{await api('PATCH','/api/listings/'+state.detailId+'/deal-room',{stage:stage.value,nextAction:next.value,privateNotes:notes.value,tasks:room.tasks||[]});toast('Deal room saved','ok');};left.append(el('label',{},'Stage'),stage,el('label',{},'Next action'),next,el('label',{},'Private team notes'),notes,save);}else left.appendChild(el('div',{class:'deal-stage-public'},[el('b',{},String(room.stage||'active').replace('-',' ')),el('span',{},'Seller-managed deal status')]));
 const offerBox=el('section',{class:'ops-card'});offerBox.appendChild(el('h3',{},'Offers'));if(!offers.length)offerBox.appendChild(el('div',{class:'hint'},'No structured offers in this room yet.'));offers.forEach(o=>offerBox.appendChild(el('div',{class:'room-offer'},[el('b',{},money(o.amount)),el('span',{},[o.financing?.replace('-',' '),o.emd?`${money(o.emd)} EMD`:null,o.closeDays?`${o.closeDays}d close`:null,o.inspectionDays!==undefined?`${o.inspectionDays}d inspection`:null].filter(Boolean).join(' · ')),el('small',{},o.status)])));
 const msgBox=el('section',{class:'ops-card room-messages'});msgBox.appendChild(el('h3',{},'Deal conversation'));const stream=el('div',{class:'room-message-stream'});(messages||[]).forEach(m=>stream.appendChild(el('div',{class:'room-message '+(m.fromUserId===state.user.id?'mine':'')},[el('b',{},m.fromUserId===state.user.id?'You':(m.fromName||'Participant')),el('span',{},m.body),el('small',{},new Date(m.at).toLocaleString())])));if(!(messages||[]).length)stream.appendChild(el('div',{class:'hint'},'Keep transaction-specific communication attached to the deal.'));const input=el('textarea',{placeholder:'Message the deal room…'}),send=el('button',{class:'btn-primary'},'Send');let recipient=null;if(canManage&&offers.length){recipient=el('select');const seen=new Set();offers.forEach(o=>{if(!seen.has(o.buyerId)){seen.add(o.buyerId);recipient.appendChild(el('option',{value:o.buyerId},o.buyerName||'Buyer'));}});msgBox.appendChild(recipient);}send.onclick=async()=>{if(!input.value.trim())return;try{await api('POST',`/api/listings/${state.detailId}/deal-room/messages`,{body:input.value.trim(),toUserId:recipient?.value||null});render();}catch(e){toast(e.message,'err');}};msgBox.append(stream,input,send);
 const vault=el('section',{class:'ops-card deal-vault'},[el('h3',{},'Document vault'),el('p',{class:'sub'},'Deal documents stay private. Team-only files are never shown to buyers.'),await renderVault(state.detailId)]);
 const tools=el('section',{class:'ops-card deal-tools'},[el('h3',{},'Transaction tools'),el('p',{class:'sub'},'Keep the work attached to this deal instead of scattering it across apps.')]);
 tools.appendChild(el('div',{class:'deal-tool-actions'},[el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add deal task',[{key:'title',label:'Task',placeholder:'Order title search'},{key:'dueAt',label:'Due date',type:'datetime-local'}],'Add task',async v=>{await api('POST','/api/deal-tasks',{...v,listingId:state.detailId});toast('Task added','ok');})},'Add task'),canManage?el('button',{class:'btn-ghost',onclick:async()=>{const r=await api('GET','/api/offers/compare/'+state.detailId);const lines=r.offers.map(o=>`${money(o.amount)} · ${o.financing||'cash'} · ${money(o.emd||0)} EMD · ${o.closeDays||'—'}d close`).join('\n')||'No offers yet.';alert(lines);}},'Compare offers'):null,el('button',{class:'btn-ghost',onclick:()=>openFormModal('Record deal outcome',[{key:'status',label:'Outcome',placeholder:'closed, assigned, sold, held or dead'},{key:'purchase',label:'Purchase price',type:'number'},{key:'rehab',label:'Rehab / work',type:'number'},{key:'holding',label:'Holding costs',type:'number'},{key:'closing',label:'Closing costs',type:'number'},{key:'resale',label:'Resale / exit price',type:'number'},{key:'assignmentFee',label:'Assignment fee',type:'number'},{key:'notes',label:'Outcome notes',type:'textarea'}],'Record outcome',async v=>{await api('POST','/api/deals/'+state.detailId+'/outcome',v);toast('Deal outcome recorded','ok');})},'Record outcome')]));
 const comp=el('section',{class:'ops-card comp-board'},[el('h3',{},'Collaborative comp board'),el('p',{class:'sub'},'Keep the comps you actually trust attached to the deal.')]);try{const cr=await api('GET','/api/deals/'+state.detailId+'/comp-board');const list=el('div',{class:'comp-list'});(cr.board.comps||[]).forEach(c=>list.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},c.address),el('small',{},money(c.salePrice)+(c.distance?' · '+c.distance:''))]),el('span',{class:'pill'},c.included===false?'Excluded':'Included')] )));if(!(cr.board.comps||[]).length)list.appendChild(el('div',{class:'hint'},'No comps saved yet.'));comp.append(list,el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add comparable',[{key:'address',label:'Comp address',placeholder:'123 Comparable St'},{key:'salePrice',label:'Sale price',type:'number'},{key:'distance',label:'Distance / relevance',placeholder:'0.4 mi'},{key:'notes',label:'Notes',type:'textarea'}],'Add comp',async v=>{const latest=await api('GET','/api/deals/'+state.detailId+'/comp-board');const comps=[...(latest.board.comps||[]),{...v,included:true}];await api('POST','/api/deals/'+state.detailId+'/comp-board',{comps,notes:latest.board.notes||''});render();})},'+ Add comp'));}catch{}
 const timeline=el('section',{class:'ops-card deal-timeline'},[el('h3',{},'Deal activity')]);try{const ar=await api('GET','/api/deals/'+state.detailId+'/activity');if(!ar.activity.length)timeline.appendChild(el('div',{class:'hint'},'Activity will build as tasks, documents, collaborators and outcomes move forward.'));ar.activity.slice(0,12).forEach(a=>timeline.appendChild(el('div',{class:'timeline-row'},[el('span',{class:'timeline-dot'}),el('div',{},[el('b',{},a.text),el('small',{},a.userName+' · '+new Date(a.at).toLocaleString())])])));}catch{}
 wrap.appendChild(el('div',{class:'dealroom-grid'},[left,offerBox,msgBox,vault,tools,comp,timeline]));return wrap;
}

async function renderVault(listingId){const host=el('div');let r;try{r=await api('GET','/api/listings/'+listingId+'/documents');}catch(e){host.appendChild(el('div',{class:'errmsg'},e.message));return host;}const list=el('div',{class:'vault-list'});r.documents.forEach(d=>list.appendChild(el('div',{class:'vault-row'},[el('a',{href:d.url,target:'_blank',rel:'noopener'},d.name),el('span',{},d.visibility==='participants'?'Shared with participants':'Team only'),r.canManage?el('button',{class:'btn-ghost',onclick:async()=>{await api('DELETE',`/api/listings/${listingId}/documents/${d.id}`);render();}},'Remove'):null] )));host.appendChild(list);if(r.canManage){const file=el('input',{type:'file',accept:'.pdf,image/png,image/jpeg,image/webp'}),visibility=el('select');visibility.append(el('option',{value:'team'},'Team only'),el('option',{value:'participants'},'Share with offer participants'));const up=el('button',{class:'btn-ghost'},'Upload document');up.onclick=()=>{const f=file.files?.[0];if(!f)return toast('Choose a document first','err');if(f.size>5*1024*1024)return toast('Documents must be 5 MB or smaller','err');const reader=new FileReader();reader.onload=async()=>{try{await api('POST',`/api/listings/${listingId}/documents`,{name:f.name,dataUrl:reader.result,visibility:visibility.value});toast('Document added','ok');render();}catch(e){toast(e.message,'err');}};reader.readAsDataURL(f);};host.append(file,visibility,up);}return host;}

function accountAgeLabel(createdAt){if(!createdAt)return 'Account age unavailable';const days=Math.max(0,Math.floor((Date.now()-new Date(createdAt).getTime())/86400000));if(days<1)return 'Joined today';if(days<30)return `Account age ${days} day${days===1?'':'s'}`;const months=Math.floor(days/30.44);if(months<12)return `Account age ${months} month${months===1?'':'s'}`;const years=Math.floor(months/12),rem=months%12;return `Account age ${years}y${rem?' '+rem+'m':''}`;}

/* ================= ADMIN ================= */
async function renderAdmin() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Admin'));
  try {
    const rev = await api('GET', '/api/admin/revenue');
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Revenue'));
    wrap.appendChild(el('div', { class: 'statgrid' }, [
      stat(cents(rev.total), 'Total'), stat(cents(rev.promoRev), 'Promotions'),
      stat(cents(rev.feeRev), 'Shop fees'), stat(cents(rev.unlockRev), 'Unlocks'),
      stat(cents(rev.subRev), 'Subscriptions'), stat(rev.users, 'Users')
    ]));
  } catch {}

  wrap.appendChild(el('div',{class:'sectiontitle'},'User activity'));
  const activityCard=el('div',{class:'card admin-activity'}),activityControls=el('div',{class:'activity-controls'}),activityHost=el('div');
  const customStart=el('input',{type:'datetime-local'}),customEnd=el('input',{type:'datetime-local'});let activityPreset='24h';
  const loadActivity=async()=>{let url='/api/admin/activity?preset='+activityPreset;if(activityPreset==='custom')url+=`&start=${encodeURIComponent(customStart.value)}&end=${encodeURIComponent(customEnd.value)}`;const d=await api('GET',url);activityHost.innerHTML='';activityHost.appendChild(el('div',{class:'statgrid'},[stat(d.metrics.activeNow,'Active now'),stat(d.metrics.uniqueActive,'Unique active'),stat(d.metrics.returning,'Returning'),stat(d.metrics.signups,'New signups'),stat(d.metrics.listings,'Listings'),stat(d.metrics.messages,'Messages'),stat(d.metrics.dealBuilderRuns,'Deal analyses'),stat(d.metrics.profilesCompleted,'Profiles set up'),stat(d.metrics.engaged,'Engaged users'),stat(d.metrics.paid,'Paid access')]));if(d.activeNow.length){activityHost.appendChild(el('div',{class:'admin-active-list'},[el('b',{},'On the site now'),...d.activeNow.map(u=>el('div',{class:'admin-active-user'},[el('span',{},u.name),el('small',{},[u.plan,...(u.markets||[])].filter(Boolean).join(' · '))]))]));}if(d.markets.length)activityHost.appendChild(el('div',{class:'market-mini'},d.markets.map(m=>el('span',{},`${m.state} · ${m.count}`))));if(d.plans)activityHost.appendChild(el('div',{class:'market-mini'},Object.entries(d.plans).map(([p,n])=>el('span',{},`${p} · ${n}`))));};
  [['24h','24 hours'],['7d','1 week'],['30d','1 month'],['custom','Custom']].forEach(([v,l])=>activityControls.appendChild(el('button',{class:v==='24h'?'active':'',onclick:async e=>{activityPreset=v;[...activityControls.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));e.currentTarget.classList.add('active');customStart.style.display=customEnd.style.display=v==='custom'?'block':'none';if(v!=='custom'||(customStart.value&&customEnd.value))await loadActivity();}},l)));
  customStart.style.display=customEnd.style.display='none';customStart.onchange=customEnd.onchange=()=>{if(customStart.value&&customEnd.value)loadActivity();};activityControls.append(customStart,customEnd);activityCard.append(activityControls,activityHost);wrap.appendChild(activityCard);await loadActivity();
  wrap.appendChild(el('div',{class:'sectiontitle'},'Demo accounts'));
  const demoCard=el('div',{class:'card demo-account-card'});
  const demoHead=el('div',{class:'demo-account-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'CONTROLLED TESTING'),el('h3',{},'Create demo account'),el('p',{class:'sub'},'Create a safe account for testing Better Real Estate. Demo activity never consumes Founder places, changes growth analytics, or creates real billing, referral rewards, affiliate commissions or payouts.')]),el('span',{class:'demo-admin-badge'},'DEMO')]);
  const demoGrid=el('div',{class:'demo-form-grid'});
  const field=(label,control,help='')=>{const f=el('label',{class:'demo-field'},[el('span',{class:'demo-field-label'},label),control]);if(help)f.appendChild(el('small',{},help));return f;};
  const dName=el('input',{placeholder:'Example: Better Demo'}),dEmail=el('input',{type:'email',placeholder:'demo@example.com'}),dPass=el('input',{type:'password',placeholder:'At least 6 characters'});
  const dRole=el('select',{},[['buyer','Buyer / Investor'],['seller','Seller / Wholesaler'],['agent','Agent'],['service','Service provider']].map(([v,l])=>el('option',{value:v},l)));
  const dPlan=el('select',{},[['free','Free'],['pro','Better Plus'],['platinum','Platinum'],['wholesale','Wholesale Teams']].map(([v,l])=>el('option',{value:v},l)));
  const dStatus=el('div',{class:'demo-feedback','aria-live':'polite'});
  const createDemo=el('button',{class:'btn-primary demo-primary-action'},'Create Demo Account');
  const refreshDemoChoices=async()=>{const r=await api('GET','/api/admin/user-inspector?q=');pvUser.innerHTML='';const demos=r.users.filter(u=>u.demo);pvUser.appendChild(el('option',{value:''},demos.length?'Select a demo account':'No demo accounts yet'));demos.forEach(u=>pvUser.appendChild(el('option',{value:u.id},`${u.name} · ${adminPlanLabel(u.demoPlan||'free')}`)));updatePreviewControls();};
  createDemo.onclick=async()=>{dStatus.textContent='';createDemo.disabled=true;try{const r=await api('POST','/api/admin/demo-accounts',{name:dName.value.trim(),email:dEmail.value.trim(),password:dPass.value,role:dRole.value,demoPlan:dPlan.value});dName.value=dEmail.value=dPass.value='';dStatus.textContent=`Created ${r.user.name}. Choose it below to start a preview.`;dStatus.className='demo-feedback success';toast('Demo account created','ok');await loadInspector();await refreshDemoChoices();pvUser.value=r.user.id;updatePreviewControls();}catch(e){dStatus.textContent=e.message;dStatus.className='demo-feedback error';}finally{createDemo.disabled=false;}};
  demoGrid.append(field('Display name',dName),field('Demo email',dEmail),field('Password',dPass),field('Role',dRole),field('Simulated membership',dPlan));
  demoCard.append(demoHead,demoGrid,el('div',{class:'demo-action-row'},[createDemo]),dStatus);wrap.appendChild(demoCard);

  const previewCard=el('div',{class:'card demo-preview-card'});
  const previewHead=el('div',{class:'demo-account-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'SAFE EXPERIENCE PREVIEW'),el('h3',{},'Preview the real user experience'),el('p',{class:'sub'},'Choose a demo account and an experience. Start Preview arms the real user flow, then Enter Demo lets you view it immediately without knowing the demo password.')]),el('span',{class:'demo-admin-badge'},'PREVIEW')]);
  const previewGrid=el('div',{class:'demo-preview-form'}),pvUser=el('select',{'aria-label':'Demo account'}),pvType=el('select',{'aria-label':'Experience'}),pvPosition=el('input',{type:'number',min:'1',max:'100',value:'7','aria-label':'Simulated Founder position'}),pvRun=el('button',{class:'btn-primary'},'Start Preview'),pvClear=el('button',{class:'btn-ghost'},'Reset Preview'),pvEnter=el('button',{class:'btn-ghost'},'Enter Demo'),pvStatus=el('div',{class:'demo-preview-summary','aria-live':'polite'});
  pvType.append(el('option',{value:'founder'},'First 100 Founder welcome'),el('option',{value:'onboarding'},'New-user onboarding'),el('option',{value:'whatsnew'},'What’s New tutorial'));
  const updatePreviewControls=()=>{const has=!!pvUser.value;pvRun.disabled=pvClear.disabled=pvEnter.disabled=!has;const founder=pvType.value==='founder';pvPosition.closest?.('.demo-field')?.classList.toggle('is-hidden',!founder);pvPosition.style.display=founder?'block':'none';};
  pvType.onchange=updatePreviewControls;pvUser.onchange=()=>{pvStatus.innerHTML='';updatePreviewControls();};
  pvRun.onclick=async()=>{if(!pvUser.value)return;pvRun.disabled=true;try{const r=await api('POST',`/api/admin/demo-accounts/${pvUser.value}/preview`,{type:pvType.value,position:Number(pvPosition.value||7)});const label=pvType.options[pvType.selectedIndex]?.text||'Preview';pvStatus.innerHTML='';pvStatus.append(el('b',{},`Preview ready: ${label}${r.demoPreview?.position?` · Founder #${r.demoPreview.position}`:''}`),el('span',{},'Enter Demo to see the experience exactly as that user will see it. You can return to Admin from the top navigation.'));toast('Demo preview ready','ok');}catch(e){pvStatus.textContent=e.message;}finally{pvRun.disabled=false;updatePreviewControls();}};
  pvClear.onclick=async()=>{if(!pvUser.value)return;try{await api('POST',`/api/admin/demo-accounts/${pvUser.value}/preview`,{type:'none'});pvStatus.innerHTML='';pvStatus.append(el('b',{},'Preview reset'),el('span',{},'The selected demo account is back to its normal demo state.'));toast('Demo preview reset','ok');}catch(e){pvStatus.textContent=e.message;}};
  pvEnter.onclick=async()=>{if(!pvUser.value)return;if(!confirm('Enter this demo account now? You can return to Admin using the “Return to Admin” button in the top navigation.'))return;try{const r=await api('POST',`/api/admin/demo-accounts/${pvUser.value}/enter`);state.user=r.user;state.access=r.access;state.demoAdminSession=true;state.launchTutorialAfterNav=false;state.launchProductUpdateTutorial=false;go('feed',{}, {replace:true});}catch(e){toast(e.message,'err');}};
  previewGrid.append(field('Demo account',pvUser,'Only controlled Demo accounts appear here.'),field('Experience',pvType),field('Founder position',pvPosition,'Used only for the Founder welcome.'));
  previewCard.append(previewHead,previewGrid,el('div',{class:'demo-action-row preview-actions'},[pvRun,pvEnter,pvClear]),pvStatus);wrap.appendChild(previewCard);await refreshDemoChoices();
  wrap.appendChild(el('div',{class:'sectiontitle'},'User inspector'));
  const inspector=el('div',{class:'card user-inspector'}),iq=el('input',{placeholder:'Search name, username or email…'}),ih=el('div');inspector.append(iq,ih);wrap.appendChild(inspector);let it;
  const loadInspector=async()=>{
    const r=await api('GET','/api/admin/user-inspector?q='+encodeURIComponent(iq.value));ih.innerHTML='';
    r.users.slice(0,20).forEach(u=>{
      const badges=el('div',{class:'inspector-badges'});
      if(u.demo)badges.appendChild(el('span',{class:'demo-admin-badge'},'DEMO'));
      if(u.verified)badges.appendChild(el('span',{class:'vbadge'},'✓ Verified'));
      if(u.foundingMember)badges.appendChild(el('span',{class:'founding-badge'},u.founderAward?`Founding Member · #${u.founderAward.position}`:'Founding Member'));
      const accessText=u.role==='admin'?'Admin · unlimited':u.access?.wholesale?'Wholesale Teams':u.access?.platinum?'Platinum':u.access?.pro?'Plus':u.access?.trial?'Trial':'Free';
      const details=[u.demo?`Demo access: ${adminPlanLabel(u.demoPlan||'free')}`:null,u.demoPreview?`Preview: ${u.demoPreview.type}${u.demoPreview.position?` #${u.demoPreview.position}`:''}`:null,`${u.listings} listings`,`${u.saves} liked`,`${u.messages} messages`,accountAgeLabel(u.createdAt),u.lastActiveAt?'Last active '+new Date(u.lastActiveAt).toLocaleString():'No activity yet'].filter(Boolean);
      if(u.grant?.active)details.push(`Grant: ${adminPlanLabel(u.grant.grantPlan)} · ${u.grant.remainingDays}d left`);
      if(u.founderAward)details.push(`First 100 · #${u.founderAward.position}`);
      const actions=el('div',{class:'inspector-actions'});
      if(u.role!=='admin')actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:()=>openAdminAccessModal(u,loadInspector)},'Manage access'));
      if(u.demo){
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{try{const r=await api('POST',`/api/admin/demo-accounts/${u.id}/enter`);state.user=r.user;state.access=r.access;state.demoAdminSession=true;go('feed',{}, {replace:true});}catch(e){toast(e.message,'err')}}},'Enter demo'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:()=>openFormModal('Reset demo password',[{key:'password',label:'New demo password',type:'password',placeholder:'At least 6 characters'}],'Reset password',async v=>{await api('POST',`/api/admin/demo-accounts/${u.id}/password`,{password:v.password});toast('Demo password reset','ok');})},'Reset password'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm(`Reset ${u.name} to a clean demo state?`))return;try{await api('POST',`/api/admin/demo-accounts/${u.id}/reset`);toast('Demo account reset','ok');await loadInspector();}catch(e){toast(e.message,'err')}}},'Reset demo'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm(`Convert ${u.name} into a real account? This cannot restore old rewards or Founder eligibility retroactively.`))return;try{await api('POST',`/api/admin/demo-accounts/${u.id}/convert`,{confirmation:'CONVERT'});toast('Converted to real account','ok');await loadInspector();}catch(e){toast(e.message,'err')}}},'Convert to real'));
        actions.appendChild(el('button',{class:'dangerbtn compactbtn',onclick:async()=>{const typed=prompt(`Permanently delete demo account ${u.name}? Type DELETE DEMO to confirm.`);if(typed!=='DELETE DEMO')return;try{await api('DELETE',`/api/admin/demo-accounts/${u.id}`,{confirmation:'DELETE DEMO'});toast('Demo account deleted','ok');await loadInspector();await refreshDemoChoices();}catch(e){toast(e.message,'err')}}},'Delete demo'));
      }
      actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{const next=!u.foundingMember;if(!confirm(`${next?'Grant':'Remove'} Founding Member status for ${u.name}?`))return;try{await api('POST','/api/admin/set-founding-member',{userId:u.id,foundingMember:next});toast(next?'Founding Member granted':'Founding Member removed','ok');await loadInspector();}catch(e){toast(e.message,'err')} }},u.foundingMember?'Remove founding':'Grant founding'));
      ih.appendChild(el('div',{class:'inspector-row'},[el('div',{class:'grow'},[el('b',{},u.name),el('span',{},[u.username?'@'+u.username:null,u.email,accessText].filter(Boolean).join(' · ')),el('small',{},details.join(' · '))]),badges,actions]));
    });
  };
  iq.oninput=()=>{clearTimeout(it);it=setTimeout(loadInspector,200)};await loadInspector();

  const { pending } = await api('GET', '/api/admin/pending');
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Verify closed deals'));
  const c = el('div', { class: 'card' });
  if (!pending.length) c.appendChild(el('div', { class: 'listrow' }, el('div', { class: 's' }, 'Nothing pending.')));
  pending.forEach(p => c.appendChild(el('div', { class: 'listrow' }, [
    el('div', { class: 'grow' }, [
      el('div', { class: 't' }, p.listing ? p.listing.address + ' — ' + p.listing.city : 'Listing removed'),
      el('div', { class: 's' }, p.userName + ' (' + p.userEmail + ')')
    ]),
    el('button', { onclick: async () => { await api('POST', '/api/admin/verify', { saveId: p.id }); render(); } }, 'Mark closed')
  ])));
  wrap.appendChild(c);

  const { pending: vpend } = await api('GET', '/api/admin/verifications');
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Seller verification requests'));
  const v = el('div', { class: 'card' });
  if (!vpend.length) v.appendChild(el('div', { class: 'listrow' }, el('div', { class: 's' }, 'Nothing pending.')));
  vpend.forEach(u => v.appendChild(el('div', { class: 'listrow' }, [
    el('div', { class: 'grow' }, [el('div', { class: 't' }, u.name), el('div', { class: 's' }, u.email)]),
    el('button', { onclick: async () => { await api('POST', '/api/admin/verify-user', { userId: u.id }); render(); } }, 'Approve')
  ])));
  wrap.appendChild(v);

  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Account verification'));
  const verifyAdmin = el('div', { class:'card adminverifysearch' });
  const verifySearch = el('input', { placeholder:'Search a member to grant or remove verification…' });
  const verifyResults = el('div');
  const loadVerifyUsers = async () => {
    try {
      const data = await api('GET','/api/admin/memberships?q='+encodeURIComponent(verifySearch.value||''));
      verifyResults.innerHTML='';
      const rows=(data.users||[]).slice(0, verifySearch.value.trim() ? 20 : 8);
      if(!rows.length) verifyResults.appendChild(el('div',{class:'listrow'},el('div',{class:'s'},'No matching members.')));
      rows.forEach(u=>{
        const btn=el('button',{class:u.verified?'btn-ghost compactbtn verifiedaction':'btn-primary compactbtn'},u.verified?'Remove verification':'Grant verification');
        btn.onclick=async()=>{const next=!u.verified;if(!confirm(`${next?'Grant':'Remove'} account verification for ${u.name}?`))return;try{await api('POST','/api/admin/set-user-verification',{userId:u.id,verified:next});toast(next?'Account verified':'Verification removed','ok');await loadVerifyUsers();}catch(e){toast(e.message,'err')}};
        verifyResults.appendChild(el('div',{class:'listrow adminverifyrow'},[el('div',{class:'grow'},[el('div',{class:'t'},[u.name,u.verified?el('span',{class:'vbadge'},'✓ Verified'):null]),el('div',{class:'s'},[u.username?'@'+u.username:null,u.email,u.role,accountAgeLabel(u.createdAt)].filter(Boolean).join(' · '))]),btn]));
      });
    } catch(e){verifyResults.innerHTML='';verifyResults.appendChild(el('div',{class:'errmsg'},e.message));}
  };
  let verifyTimer; verifySearch.oninput=()=>{clearTimeout(verifyTimer);verifyTimer=setTimeout(loadVerifyUsers,220)};
  verifyAdmin.append(verifySearch,verifyResults); wrap.appendChild(verifyAdmin); await loadVerifyUsers();
  return wrap;
}

boot();

/* ================= FOOTER + STATIC PAGES ================= */
function renderFooter() {
  const f = document.getElementById('sitefooter');
  if (!f) return;
  f.innerHTML = '';
  const links = [['about','About'],['faq','FAQ'],['terms','Terms'],['privacy','Privacy'],['contact','Contact']];
  const row = el('div', { class: 'footlinks' });
  links.forEach(([v, l]) => row.appendChild(el('a', { onclick: () => go(v) }, l)));
  f.appendChild(el('div', { class: 'footinner' }, [
    row,
    el('div', { class: 'footmeta' }, `© ${new Date().getFullYear()} Better Real Estate · drewcbusiness1@gmail.com`),
    el('div', { class: 'footdisc' }, 'Better Real Estate is a listing and marketing platform. We are not a licensed real estate brokerage and do not provide brokerage, legal, tax, or investment advice. Verify every property independently and consult your own professionals before transacting.')
  ]));
}

const staticPage = (title, sub, blocks) => {
  const wrap = el('div', { class: 'page staticpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go(state.user ? 'feed' : 'home') }, '← Back'));
  wrap.appendChild(el('h2', {}, title));
  if (sub) wrap.appendChild(el('div', { class: 'sub' }, sub));
  blocks.forEach(([h, body]) => {
    if (h) wrap.appendChild(el('h3', { class: 'stheading' }, h));
    (Array.isArray(body) ? body : [body]).forEach(p => wrap.appendChild(el('p', { class: 'stbody' }, p)));
  });
  return wrap;
};

function pageAbout() {
  return staticPage('About', 'Why this exists.', [
    [null, 'Better Real Estate started from a simple problem: the best deals never make it to the portals. They move through group chats, mailing lists, and people who happen to know each other. If you are not already inside one of those circles, you are looking at the same picked-over inventory as everyone else.'],
    ['What we built', 'A feed where off-market properties are posted by the people who control them, ranked against the criteria you actually buy on — price range, market, property type, minimum spread. You follow the sellers who bring you good deals. You message them directly. There is no middleman collecting a fee for an introduction.'],
    ['The marketplace', 'Every rehab generates surplus: appliances that came out of a kitchen remodel, flooring left over from a full-house install, doors pulled during a renovation. And every rehab needs those same things. The marketplace connects one to the other.'],
    ['Who runs it', 'Better Real Estate is run by Andrew, an independent investor working wholesaling and novation deals. This is a small, self-funded operation, not a venture-backed portal. If something is broken or you want a feature, the contact page reaches a real person.'],
    ['What we are not', 'We are not a licensed brokerage. We do not represent buyers or sellers, hold escrow, or give legal, tax, or investment advice. We are a place where principals find each other and negotiate directly. Do your own diligence on every property and every counterparty.']
  ]);
}

function pageFaq() {
  return staticPage('Frequently asked questions', null, [
    ['Is browsing free?', 'Yes, and it stays free. You can scroll every listing, see photos, price, beds and baths, estimated ARV and spread, and the city — without paying anything. What costs money is opening a listing in full: exact address, seller notes, phone number and email, and the ability to submit an offer.'],
    ['What do I get with a new account?', 'Seven days of full access with no card required, then five free unlocks. After that it is $1.99 per unlock, $14.99 for ten, or $29 a month for unlimited plus analytics on your own listings.'],
    ['How does the ranking work?', 'Your buy box drives it. Set a price range, the markets you work, property types and a minimum spread, and matching listings rise to the top. Freshness, how many other buyers saved a listing, and whether you follow the seller all factor in. Promoted listings are pinned above organic ones and are labelled as promoted.'],
    ['What does promoting a listing do?', 'It pins your property above organic listings in every matching feed for the window you buy — 24 hours through a week, or a one-hour top slot with Super Boost. You can see exactly what it bought you in the analytics for that listing: views, saves, unlocks and offers.'],
    ['How does the marketplace fee work?', 'Listing an item is free. When it sells, Better Real Estate keeps 7% and the rest lands in your wallet. You can withdraw once your balance clears $20.'],
    ['Are listings verified?', 'Sellers can pay for verification, which puts a badge on their profile after an admin reviews them. That verifies the person, not the property. Nobody inspects the houses. Treat every listing as unverified information from a stranger until you have confirmed it yourself — pull the county record, check title, and walk the property.'],
    ['Can I sell appliances or electronics?', 'No. Users cannot list anything mains-powered or battery-powered — that means appliances, HVAC equipment, power tools, light fixtures, electrical parts and consumer electronics. Anything electrical needs a UL or ETL listing to be sold legally in the US, and there is no way to verify that on a private listing. Uncertified electrical goods are a genuine fire risk, not a paperwork technicality. Furniture, plumbing fixtures, cabinet and door hardware, flooring, doors, windows, countertops and hand tools are all welcome. Electrical goods sold through the Better Real Estate shop come from suppliers who have provided certification documents to us in writing.'],
    ['How do I delete my account?', 'Email drewcbusiness1@gmail.com and it will be handled. Account self-deletion is on the build list.']
  ]);
}

function pageTerms() {
  return staticPage('Terms of Service', 'Last updated September 18, 2026. Plain-English summary, not a substitute for legal review.', [
    [null, 'By creating an account you agree to these terms. If you do not agree, do not use the site.'],
    ['1. What this service is', 'Better Real Estate is an online platform where users post property listings and items for sale, and communicate with each other. We are not a real estate brokerage, agent, escrow holder, lender, or party to any transaction between users. We do not verify property ownership, condition, title, valuation, or any statement a user makes.'],
    ['2. Your account', 'You must be 18 or older and provide accurate information. You are responsible for everything that happens under your account and for keeping your password secure. One account per person. Usernames may be changed subject to reasonable anti-abuse limits. You may permanently delete your account from Settings, subject to retention of records we reasonably need for completed transactions, accounting, fraud prevention or legal obligations.'],
    ['2a. Company workspaces', 'Wholesale Teams workspaces are licensed for the number of seats shown on the plan. Each team member must use their own login; sharing passwords or creating duplicate identities to evade seat limits is not allowed. Company owners and admins may manage members and company content. Listing-related inquiries may be visible to authorized members of the company workspace, while personal direct messages that are not connected to company listings remain private to the individual account. The company owner is responsible for team access and billing.'],
    ['3. What you may not post', 'Do not post property you have no legal right to sell or market. Do not post false, misleading, or fabricated listings. Do not post items you do not have. Do not harass other users, scrape the site, or attempt to circumvent payment. We remove content and terminate accounts for any of the above, without refund.'],
    ['3a. No electronics or appliances', 'Users may not list any item that runs on mains power or a battery. This includes but is not limited to appliances, HVAC equipment, water heaters, power tools, light fixtures, lamps, bulbs, wiring, breakers, outlets, switches, smart-home devices, alarms, detectors, generators, batteries and consumer electronics. Listings that appear to be electrical may be rejected automatically and accounts that repeatedly attempt to evade this rule may be terminated.'],
    ['4. Transactions between users', 'Any deal you reach with another user is strictly between you and them. We do not guarantee that a listed property exists, is available, is priced accurately, or that any user will perform. You are solely responsible for your own due diligence, contracts, inspections, title work, and compliance with the laws of your jurisdiction.'],
    ['5. Payments, subscriptions, and promotions', 'Payments may be processed by Stripe or another disclosed payment provider. Promotions, unlocks, verification, subscriptions and marketplace purchases are charged when purchased. Promotions run for the stated window and are non-refundable once they begin. Subscriptions renew until cancelled and can be cancelled anytime, effective at the end of the current period. Marketplace sales are subject to the platform fee stated at listing.'],
    ['5b. Affiliate program', 'Affiliate participation requires approval. Under the current affiliate terms, approved affiliates earn a 30% ONE-TIME commission on a qualifying referred customer’s first eligible paid membership transaction only. Membership renewals, later billing cycles, cancellation and later resubscription, upgrades and downgrades do not create another commission unless Better Real Estate expressly adopts different terms in a future agreement. Commissions are held for 3 days before becoming available and may be reversed for refunds, disputes, chargebacks, fraud or ineligible activity. Self-referrals, duplicate/fake accounts, tracking manipulation and other abusive activity are prohibited. Available cash earnings are paid through the disclosed Stripe Connect payout system after required payout onboarding. Better Real Estate does not store full bank or card credentials. Any future commission-rate or material compensation-term change requires affirmative in-platform acceptance before the new terms apply to future earnings, and does not silently rewrite legitimately earned commissions. Affiliates are responsible for required disclosures, taxes and lawful promotion. Better Credits are separate promotional credits and are not cash-withdrawable.'],
    ['5a. Address autocomplete', el('span', {}, [
      'Checkout may offer browser autofill and Google Maps address suggestions to help you enter a shipping address. Google Maps suggestions are subject to the ',
      el('a', { href: 'https://cloud.google.com/maps-platform/terms', target: '_blank', rel: 'noopener noreferrer' }, 'Google Maps Platform Terms of Service'),
      ' and ',
      el('a', { href: 'https://policies.google.com/privacy', target: '_blank', rel: 'noopener noreferrer' }, 'Google Privacy Policy'),
      '. You remain responsible for reviewing the selected address before placing an order.'
    ])],
    ['5b. AI-assisted listing tools', 'Some paid features use an AI service to draft or improve listing titles, descriptions and property notes from information and photos you choose to provide. AI output is a draft, may be incomplete or inaccurate, and must be reviewed before publishing. You remain responsible for the truth, legality and fair-housing compliance of anything you post. Do not use AI tools to create discriminatory housing content or to infer sensitive personal characteristics.'],
    ['5c. Marketing emails', 'Marketing emails are optional. You may opt in at signup or in Settings and may opt out at any time through Settings or the unsubscribe link in each marketing email. These may include automated activity emails and occasional product announcements sent by Better Real Estate. Transactional and account-service messages such as password resets, email confirmation, receipts, security notices, order updates and unread-message reminders are separate and may still be sent when needed to provide the service; unread-message reminders can be disabled or delayed in Settings.'],
    ['6. Wallet and payouts', 'Wallet balances are a record of amounts owed to you from platform activity. They are not a bank deposit, are not insured, and earn no interest. Payouts are sent to the account you connect, subject to the stated minimum and to identity verification where required by law.'],
    ['7. No warranty', 'The service is provided as-is. We do not promise it will be uninterrupted, error-free, or that any listing or user is legitimate.'],
    ['8. Limitation of liability', 'To the maximum extent the law allows, our total liability to you for any claim relating to the service is limited to the amount you paid us in the twelve months before the claim arose.'],
    ['9. Changes and termination', 'We may update these terms; continued use after an update means you accept it. We may suspend or terminate accounts that violate these terms.'],
    ['10. Contact', 'Questions about these terms: drewcbusiness1@gmail.com'],
    ['A necessary note', 'This document is a working template for a small platform. Before scaling real payments, marketplace payouts, or regulated transaction services, have a lawyer review these terms and the privacy policy for the states and countries where you operate.']
  ]);
}

function pagePrivacy() {
  return staticPage('Privacy Policy', 'Last updated September 18, 2026.', [
    [null, 'This policy explains what Better Real Estate collects, why we use it, which service providers may receive it, and the choices available to you.'],
    ['What we collect', 'Account information you give us, including your name, username, email address, phone number if you add one, profile photo, bio and optional market/location. If you use a Wholesale Teams workspace, we also collect company profile details, team membership, role, invitations and shared acquisition criteria. Content you post, including property listings, addresses, photos, notes, deal-import text and marketplace items. If you join a wholesaler or company buyer list, we collect the contact information and acquisition criteria you choose to submit and share those details with the specific wholesaler/company whose buyer-list page you used. Activity such as what you view, like/save, watch, unlock, offer on, buy or sell, people you follow, friend requests and friendships, messages you send through the site, selected investment markets, saved-search criteria, deal-pipeline activity, deal-room messages and documents you choose to upload, deal-calendar reminders and recent account activity used to show the site owner aggregate usage analytics and current active-user status. For shipped marketplace orders, we collect the delivery name, street address, apartment or unit, city, state, ZIP code and optional phone number needed to quote shipping and fulfil the order.'],
    ['Address autofill and autocomplete', el('span', {}, [
      'Your browser may offer its own saved-address autofill. When typed address suggestions are enabled, partial address text and an autocomplete session identifier are sent through our server to Google Maps Platform so suggestions can be returned. If you select a suggestion, Google may return address components such as street, city, state and ZIP to fill the checkout form. We do not use device geolocation for this feature. We keep the shipping address needed for the order, but we do not intentionally store the list of autocomplete suggestions. Google handles its data under the ',
      el('a', { href: 'https://policies.google.com/privacy', target: '_blank', rel: 'noopener noreferrer' }, 'Google Privacy Policy'),
      ' and Google Maps Platform terms.'
    ])],
    ['AI-assisted listing tools', el('span', {}, [
      'If you choose an AI writing feature, the listing facts, draft text and up to a limited number of photos needed for that request are sent through our server to OpenAI so a draft can be generated. We avoid sending an exact property street address for the property-notes assistant. OpenAI states that API inputs and outputs are not used to train its models by default unless the API customer explicitly opts in to data sharing. OpenAI may retain API content for abuse-monitoring purposes under its API data controls. Review OpenAI’s ',
      el('a', { href: 'https://openai.com/policies/privacy-policy', target: '_blank', rel: 'noopener noreferrer' }, 'Privacy Policy'),
      ' and business-data information for details. AI output is not automatically published; you are expected to review it first.'
    ])],
    ['Marketing email', 'If you affirmatively opt in, we use your email address, name and limited account/activity information to send product, listing and marketplace engagement emails, including automated activity messages and occasional administrator announcements. The automated engagement sequence is limited to no more than one message every 48 hours. Our email provider receives the information needed to deliver the message. Every marketing email includes an unsubscribe link and email-preferences link. Opting out of marketing does not stop transactional/account-service messages needed for your account, purchases, security, password resets or enabled unread-message reminders.'],
    ['Affiliate and referral data', 'If you use a referral or affiliate link, we record attribution, link activity, qualifying membership sales, commission status, Better Credit rewards and related fraud-prevention/audit information. Approved affiliates use Stripe-hosted payout onboarding; Better Real Estate does not store full bank or card credentials.'],
    ['Payments and payouts', el('span', {}, [
      'Stripe processes card payments, subscriptions and seller payout onboarding when those features are enabled. Our server does not receive or store your full card number or full bank-account number. We may receive and store limited payment metadata and processor identifiers, such as card brand, last four digits, expiration date, Stripe customer/payment identifiers, payment status and transaction amount. Stripe may also process transaction, browser, device, IP-address and fraud-prevention signals under its own ',
      el('a', { href: 'https://stripe.com/privacy', target: '_blank', rel: 'noopener noreferrer' }, 'Privacy Policy'),
      '.'
    ])],
    ['Why we collect it', 'To run your account, rank your For You feed against your selected markets and buy boxes, power saved-search/deal alerts, liked-property change notifications, Buyers Looking and deal matching, operate buyer-list capture pages, generate Better Dispo distribution tools, power member search, friend connections and direct messaging, operate company workspaces and team permissions, connect buyers and sellers, quote shipping, fulfil marketplace orders, process payments and payouts, prevent fraud and abuse, provide support, send transactional messages such as confirmations, shipping notices, password resets and enabled unread-message reminders, provide AI-assisted listing/deal-import tools when you invoke them, and send optional marketing messages when you opt in.'],
    ['What other users can see', 'Your name, username, role, bio, optional market/location, profile photo, listing count, follower count, friend count, points, verification status, company affiliation and reviews may be public and may appear in member search. Authorized members of the same Wholesale Teams workspace may see company listings, team analytics, shared acquisition criteria and messages tied to company property listings. Personal direct messages not tied to company listings are not included in the company inbox. Your email address and phone number are shown to another user only where the product requires it, such as after they unlock one of your property listings. Direct messaging does not by itself reveal your email address or phone number. Exact property addresses are hidden from users who have not unlocked that property listing. Shipping addresses entered for marketplace checkout are not displayed publicly.'],
    ['Who we share it with', "We share information only as needed to operate the service: the specific wholesaler/company when you intentionally submit that business's buyer-list form; Stripe and financial-service providers for payments, fraud prevention and payouts; Google Maps Platform for optional address suggestions; shipping, supplier and fulfilment providers for delivering marketplace orders; OpenAI for eligible AI-assisted listing or deal-import generation when you invoke those features; email providers for transactional and opted-in marketing messages; hosting, database and storage providers that run the site; and authorities when disclosure is legally required. We do not sell your personal information for money or provide it to third parties for their own unrelated advertising."],
    ['Cookies and similar technology', 'We use a session cookie to keep you signed in. Payment providers such as Stripe may use cookies, browser/device information and similar signals for payment security and fraud prevention. We do not operate third-party advertising trackers on the site.'],
    ['Your choices', 'You can edit your profile, username and password, manage your marketplace listings, and permanently delete your account from Settings. Browser address autofill can be controlled in your browser settings, and you can always type your shipping address manually instead of selecting an autocomplete suggestion. Marketing email can be turned on or off in Settings or through the unsubscribe link in any marketing message. Unread-message email reminders can be turned off or delayed in Settings. AI writing features are optional and only send content when you choose to use them. To request a copy of your data or correction that is not available in the product, email drewcbusiness1@gmail.com. Additional legal rights may apply depending on where you live.'],
    ['Retention and security', 'We keep account, order, payment and transaction records for as long as reasonably needed to provide the service, resolve disputes, prevent fraud, and meet tax, accounting or other legal obligations. When you delete an account, public profile content and ordinary social data are removed; transaction records we must retain are de-identified where practical. Shipping information may remain with the related order record only where reasonably needed for those purposes. Passwords are stored as bcrypt hashes and never in readable form. No system is perfectly secure, so avoid posting sensitive information that is not necessary for a transaction.'],
    ['Children', 'This service is not for anyone under 18 and we do not knowingly collect personal information from children.'],
    ['Contact', 'drewcbusiness1@gmail.com']
  ]);
}

function pageContact() {
  const wrap = el('div', { class: 'page staticpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go(state.user ? 'feed' : 'home') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Contact'));
  wrap.appendChild(el('div', { class: 'sub' }, 'A real person reads these.'));
  wrap.appendChild(el('div', { class: 'card', style: 'padding:22px' }, [
    el('div', { class: 'stbody' }, 'Email us directly:'),
    el('a', { href: 'mailto:drewcbusiness1@gmail.com', class: 'contactmail' }, 'drewcbusiness1@gmail.com'),
    el('div', { class: 'stbody', style: 'margin-top:16px' }, 'Useful things to include: your account email, the listing or item involved, and a screenshot if something looks broken. Expect a reply within a business day or two.')
  ]));
  const subj = el('input', { placeholder: 'What is this about?' });
  const body = el('textarea', { placeholder: 'Tell us what you need.' });
  const btn = el('button', { class: 'submitbtn' }, 'Open in your email app');
  btn.onclick = () => {
    window.location.href = `mailto:drewcbusiness1@gmail.com?subject=${encodeURIComponent(subj.value || 'Better Real Estate enquiry')}&body=${encodeURIComponent(body.value)}`;
  };
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Or compose here'));
  wrap.appendChild(el('div', { class: 'card', style: 'padding:18px' }, [
    el('label', {}, 'Subject'), subj, el('label', {}, 'Message'), body, btn
  ]));
  return wrap;
}

/* ================= VERIFY / FORGOT / RESET ================= */
async function renderVerify() {
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Confirming your email'));
  const msg = el('div', { class: 'sub' }, 'One moment…');
  wrap.appendChild(msg);
  try {
    await api('POST', '/api/verify-email', { token: state.verifyToken });
    msg.className = 'okmsg';
    msg.textContent = 'Your email is confirmed. You can post listings and reset your password now.';
    await refreshMe();
    wrap.appendChild(el('button', { class: 'submitbtn', onclick: () => { history.replaceState({}, '', '/'); go(state.user ? 'feed' : 'auth'); } }, 'Continue'));
  } catch (e) {
    msg.className = 'errmsg'; msg.textContent = e.message;
    wrap.appendChild(el('button', { class: 'submitbtn', onclick: () => { history.replaceState({}, '', '/'); go('home'); } }, 'Back to site'));
  }
  return wrap;
}

function renderForgot() {
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Reset your password'));
  wrap.appendChild(el('div', { class: 'sub' }, 'We will email you a link to set a new one.'));
  const email = el('input', { type: 'email', autocomplete: 'email', placeholder: 'you@email.com' });
  const st = el('div', { class: 'okmsg' });
  wrap.appendChild(el('label', {}, 'Email')); wrap.appendChild(email);
  const btn = el('button', { class: 'submitbtn' }, 'Send reset link');
  btn.onclick = async () => {
    try {
      await api('POST', '/api/forgot-password', { email: email.value.trim() });
      st.className = 'okmsg';
      st.textContent = 'If an account exists for that address, a reset link is on its way. Check spam too.';
    } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
  };
  wrap.appendChild(btn); wrap.appendChild(st);
  wrap.appendChild(el('div', { class: 'switchline' }, el('a', { onclick: () => { state.authMode = 'login'; go('auth'); } }, 'Back to sign in')));
  return wrap;
}

function renderReset() {
  const wrap = el('div', { class: 'panel' });
  wrap.appendChild(el('h2', {}, 'Set a new password'));
  const p1 = el('input', { type: 'password', placeholder: 'At least 6 characters' });
  const p2 = el('input', { type: 'password', placeholder: 'Type it again' });
  const st = el('div', { class: 'errmsg' });
  wrap.appendChild(el('label', {}, 'New password')); wrap.appendChild(p1);
  wrap.appendChild(el('label', {}, 'Confirm password')); wrap.appendChild(p2);
  const btn = el('button', { class: 'submitbtn' }, 'Save new password');
  btn.onclick = async () => {
    if (p1.value !== p2.value) { st.className = 'errmsg'; st.textContent = 'Those two passwords do not match.'; return; }
    try {
      await api('POST', '/api/reset-password', { token: state.resetToken, password: p1.value });
      st.className = 'okmsg'; st.textContent = 'Password updated. Signing you in…';
      setTimeout(() => { history.replaceState({}, '', '/'); state.authMode = 'login'; go('auth'); }, 1200);
    } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
  };
  wrap.appendChild(btn); wrap.appendChild(st);
  return wrap;
}

/* verification banner shown on the feed until confirmed */
function verifyBanner() {
  if (!state.user || state.user.emailVerified) return null;
  const st = el('span', {});
  const b = el('div', { class: 'trialbar', style: 'border-color:var(--clay);background:var(--clay-soft);color:var(--clay-text)' }, [
    el('div', {}, [state.user.verificationEmailLastStatus === 'failed' ? 'Your last confirmation email could not be delivered. Try Resend; if it fails again, the admin can diagnose it in Email Center. ' : 'Confirm your email to post listings. Check your inbox for the link. ', st]),
    el('button', {
      style: 'background:var(--clay)',
      onclick: async () => {
        try { const r = await api('POST', '/api/resend-verification'); st.textContent = r.mailConfigured ? 'Sent. Check inbox and spam.' : 'Mail is not configured.'; state.user.verificationEmailLastStatus = 'sent'; }
        catch (e) { st.textContent = e.message; }
      }
    }, 'Resend')
  ]);
  return b;
}

/* ================= ADMIN: SUPPLIERS ================= */
async function renderSuppliers() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Suppliers'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Dropship inventory is admin-only. Users cannot list electrical goods at all — these come from suppliers who have given you certification documents.'));

  const { suppliers, kinds } = await api('GET', '/api/admin/suppliers');

  const name = el('input', { placeholder: 'CJdropshipping' });
  const kind = el('select', {}, kinds.map(k => el('option', { value: k.id }, k.label)));
  const markup = el('input', { type: 'number', value: 60 });
  const ship = el('input', { placeholder: '5-9', value: '5-9' });
  const note = el('div', { class: 'hint' }, kinds[0].note);
  kind.onchange = () => { note.textContent = (kinds.find(k => k.id === kind.value) || {}).note || ''; };

  const addBox = el('div', { class: 'card', style: 'padding:18px' }, [
    el('label', {}, 'Supplier name'), name,
    el('label', {}, 'Type'), kind, note,
    twoUp('Default markup (%)', markup, 'Ship days', ship),
    el('button', { class: 'submitbtn', onclick: async () => {
      try {
        await api('POST', '/api/admin/suppliers', { name: name.value, kind: kind.value, markupPercent: markup.value, shipDays: ship.value });
        toast('Supplier added', 'ok'); render();
      } catch (e) { toast(e.message, 'err'); }
    } }, 'Add supplier')
  ]);
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Add a supplier'));
  wrap.appendChild(addBox);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Your suppliers'));
  if (!suppliers.length) wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'None yet'), el('p', {}, 'Add one above, then import their catalog.')]));
  else {
    const box = el('div', { class: 'card' });
    suppliers.forEach(s => box.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 't' }, s.name),
        el('div', { class: 's' }, `${s.markupPercent}% markup · ships ${s.shipDays} days`)
      ]),
      el('button', { onclick: () => showImport(s) }, 'Import catalog')
    ])));
    wrap.appendChild(box);
  }

  const importArea = el('div');
  wrap.appendChild(importArea);

  function showImport(s) {
    importArea.innerHTML = '';
    importArea.appendChild(el('div', { class: 'sectiontitle' }, 'Add products from ' + s.name));

    if (s.kind === 'cj') {
      const cjHost = el('div');
      importArea.appendChild(cjHost);
      cjCatalogBrowser(s).then(node => cjHost.appendChild(node)).catch(e => {
        cjHost.appendChild(el('div', { class: 'errmsg' }, e.message));
      });
    }

    let mode = 'form';
    const tabs = el('div', { class: 'roletabs', style: 'margin-bottom:14px' });
    const formBtn = el('button', { class: 'selected' }, 'Add one item');
    const bulkBtn = el('button', {}, 'Paste a list (advanced)');
    tabs.appendChild(formBtn); tabs.appendChild(bulkBtn);
    importArea.appendChild(tabs);

    const body = el('div');
    importArea.appendChild(body);

    formBtn.onclick = () => { mode = 'form'; formBtn.className = 'selected'; bulkBtn.className = ''; drawBody(); };
    bulkBtn.onclick = () => { mode = 'bulk'; bulkBtn.className = 'selected'; formBtn.className = ''; drawBody(); };

    async function drawBody() {
      body.innerHTML = '';
      if (mode === 'bulk') { body.appendChild(bulkForm(s)); return; }
      body.appendChild(await singleItemForm(s));
    }
    drawBody();
  }

  async function cjCatalogBrowser(supplier) {
    const panel = el('div', { class: 'card', style: 'padding:18px;margin-bottom:16px' });
    const [status, aiStatus] = await Promise.all([
      api('GET', '/api/admin/cj/status'),
      api('GET', '/api/ai/status').catch(() => ({ configured: false, available: false }))
    ]);
    panel.appendChild(el('div', { class: 't', style: 'font-size:16px;margin-bottom:6px' }, 'CJdropshipping catalog'));

    if (!status.connected) {
      panel.appendChild(el('div', { class: 'policybox' }, [
        el('b', {}, 'CJ is not connected yet.'),
        document.createTextNode(' Add CJ_API_KEY in Netlify → Site configuration → Environment variables, redeploy, then come back here. Your key stays on the server and is never sent to the browser.')
      ]));
      return panel;
    }

    const controls = el('div', { style: 'display:grid;grid-template-columns:minmax(180px,1fr) 120px auto auto;gap:8px;align-items:end' });
    const q = el('input', { placeholder: 'Search CJ — faucet, cabinet pull, smart lock…' });
    const country = el('select', {}, [
      el('option', { value: '' }, 'All stock'),
      el('option', { value: 'US' }, 'US stock'),
      el('option', { value: 'CN' }, 'China stock')
    ]);
    const freeWrap = el('label', { style: 'display:flex;align-items:center;gap:6px;margin:0 0 9px' });
    const free = el('input', { type: 'checkbox', style: 'width:auto;margin:0' });
    freeWrap.appendChild(free); freeWrap.appendChild(document.createTextNode('Free shipping only'));
    const searchBtn = el('button', { class: 'btn-primary', style: 'border:none;margin-bottom:0' }, 'Search CJ');
    controls.appendChild(q); controls.appendChild(country); controls.appendChild(freeWrap); controls.appendChild(searchBtn);
    panel.appendChild(controls);

    const note = el('div', { class: 'hint', style: 'margin-top:8px' }, 'Importing a variant automatically saves its real CJ product/variant IDs and adds the product to My Products on CJ. Freight is quoted live to each buyer at checkout, so you do not have to guess shipping cost.');
    panel.appendChild(note);
    const results = el('div', { style: 'margin-top:14px' });
    panel.appendChild(results);

    async function showVariants(productSummary) {
      results.innerHTML = '';
      results.appendChild(el('div', { class: 'hint' }, 'Loading variants…'));
      try {
        const { product } = await api('GET', `/api/admin/cj/products/${encodeURIComponent(productSummary.pid)}?country=${encodeURIComponent(country.value)}`);
        const { categories } = await api('GET', '/api/shop/categories');

        function drawVariantList() {
          results.innerHTML = '';
          const header = el('div', { class: 'listrow', style: 'align-items:flex-start' }, [
            product.image ? el('img', { src: product.image, style: 'width:84px;height:84px;object-fit:cover;border-radius:10px' }) : null,
            el('div', { class: 'grow' }, [
              el('div', { class: 't' }, product.name),
              el('div', { class: 's' }, product.categoryName || 'CJ product'),
              el('div', { class: 's' }, `${product.variants?.length || 0} variant(s) · category will auto-map to ${product.suggestedCategory || 'Other'}`)
            ]),
            el('button', { onclick: () => doSearch(1) }, '← Results')
          ]);
          results.appendChild(header);
          results.appendChild(el('div', { class: 'hint', style: 'margin:10px 0' }, 'Choose a variant, then review the auto-filled listing before publishing. CJ cost, photos, SKU, stock, weight/dimensions, category and a suggested retail price are filled automatically.'));

          const live = (product.variants || []).filter(v => v.stock > 0);
          if (!live.length) {
            results.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No in-stock variants'), el('p', {}, 'Try another product or remove the warehouse filter.') ]));
            return;
          }
          const rows = el('div', { class: 'card' });
          live.slice(0, 30).forEach(v => {
            const origin = v.fromCountryCode === 'US' ? 'US stock' : (v.fromCountryCode ? `${v.fromCountryCode} stock` : 'CJ stock');
            const reviewBtn = el('button', { class: 'btn-primary', style: 'border:none' }, 'Review');
            reviewBtn.onclick = () => drawReview(v);
            rows.appendChild(el('div', { class: 'listrow' }, [
              v.image ? el('img', { src: v.image, style: 'width:58px;height:58px;object-fit:cover;border-radius:8px' }) : null,
              el('div', { class: 'grow' }, [
                el('div', { class: 't' }, v.option || v.name || 'Variant'),
                el('div', { class: 's' }, `${v.sku || v.vid} · CJ cost ${cents(Math.round(v.price * 100))} · auto retail ${cents(v.autoRetailCents)}`),
                el('div', { class: 's' }, `${origin} · ${v.stock.toLocaleString()} in stock${v.weight ? ` · ${v.weight} g` : ''}`)
              ]),
              reviewBtn
            ]));
          });
          results.appendChild(rows);
          if (live.length > 30) results.appendChild(el('div', { class: 'hint' }, `Showing the first 30 of ${live.length} in-stock variants.`));
        }

        function drawReview(v) {
          results.innerHTML = '';
          const defaultTitle = v.option && !String(product.name || '').toLowerCase().includes(String(v.option).toLowerCase())
            ? `${product.name} — ${v.option}` : product.name;
          const title = el('input', { value: defaultTitle || v.name || 'CJ product' });
          const categorySel = el('select', {}, categories.map(c => el('option', { value: c }, c)));
          categorySel.value = categories.includes(product.suggestedCategory) ? product.suggestedCategory : 'Other';
          const retail = el('input', { type: 'number', min: '0.01', step: '0.01', value: (v.autoRetailCents / 100).toFixed(2) });
          const descDefault = [
            product.description || '',
            v.option ? `Option: ${v.option}` : '',
            v.weight ? `Approx. product weight: ${v.weight} g.` : '',
            (v.lengthMm && v.widthMm && v.heightMm) ? `Approx. dimensions: ${v.lengthMm} × ${v.widthMm} × ${v.heightMm} mm.` : ''
          ].filter(Boolean).join('\n\n').slice(0, 1000);
          const desc = el('textarea', { style: 'min-height:120px' });
          desc.value = descDefault;

          let photos = [...new Set([v.image, product.image, ...(product.images || [])].filter(Boolean))].slice(0, 6);
          const photoRow = el('div', { class: 'previewrow', style: 'margin:8px 0 14px' });
          const drawReviewPhotos = () => {
            photoRow.innerHTML = '';
            if (!photos.length) {
              photoRow.appendChild(el('div', { class: 'hint' }, 'No product photos selected.'));
              return;
            }
            photos.forEach((src, idx) => photoRow.appendChild(el('div', { class: 'pv editpv' }, [
              el('img', { src }),
              el('button', { class: 'pvremove', type: 'button', title: 'Remove photo', onclick: () => {
                photos.splice(idx, 1);
                drawReviewPhotos();
              } }, '×')
            ])));
          };
          drawReviewPhotos();

          const costCents = Math.round(v.price * 100);
          const profitCents = Math.max(0, v.autoRetailCents - costCents);
          const details = el('div', { class: 'policybox', style: 'margin-bottom:12px' }, [
            el('b', {}, 'Auto-filled from CJ'),
            el('div', {}, `CJ cost: ${cents(costCents)} · Suggested retail: ${cents(v.autoRetailCents)} · Gross product spread: ${cents(profitCents)}`),
            el('div', {}, `SKU: ${v.sku || '—'} · Stock: ${v.stock.toLocaleString()} · Ships from: ${v.fromCountryCode || 'CJ warehouse'}`),
            el('div', {}, `${v.weight ? `Weight: ${v.weight} g` : 'Weight unavailable'}${v.lengthMm && v.widthMm && v.heightMm ? ` · Dimensions: ${v.lengthMm} × ${v.widthMm} × ${v.heightMm} mm` : ''}`),
            el('div', { class: 'hint', style: 'margin-top:6px' }, 'Shipping is still quoted live from CJ at customer checkout. It is not included in this retail price.')
          ]);

          const aiMsg = el('div', { class: 'hint' });
          const aiBtn = el('button', { class: 'btn-ghost', type: 'button' }, aiStatus.configured ? '✨ Regenerate polished copy' : 'AI copy not configured');
          aiBtn.disabled = !aiStatus.configured;
          const runAi = async (automatic = false) => {
            if (!aiStatus.configured) return;
            aiBtn.disabled = true; aiBtn.textContent = automatic ? '✨ Polishing listing…' : '✨ Writing…'; aiMsg.textContent = '';
            if (automatic) publish.disabled = true;
            try {
              const r = await api('POST', '/api/ai/listing-copy', {
                kind: 'cj',
                facts: {
                  sourceTitle: defaultTitle || v.name || product.name,
                  sourceDescription: product.description || '',
                  currentCategory: categorySel.value,
                  variant: v.option || '',
                  weightGrams: v.weight || null,
                  dimensionsMm: v.lengthMm && v.widthMm && v.heightMm ? [v.lengthMm, v.widthMm, v.heightMm] : null
                },
                images: photos.slice(0, 3)
              });
              if (r.draft.title) title.value = r.draft.title;
              if (r.draft.description) desc.value = r.draft.description;
              if (r.draft.categorySuggestion && categories.includes(r.draft.categorySuggestion)) categorySel.value = r.draft.categorySuggestion;
              aiMsg.textContent = r.draft.warnings?.length ? `AI cleaned the listing. Review before publishing. ${r.draft.warnings.join(' ')}` : 'AI cleaned the supplier copy. Review before publishing.';
            } catch (e) {
              aiMsg.textContent = automatic ? `AI copy could not be generated; the original draft is still editable. ${e.message}` : e.message;
            } finally {
              aiBtn.disabled = false; aiBtn.textContent = '✨ Regenerate polished copy';
              if (automatic) publish.disabled = false;
            }
          };

          const publish = el('button', { class: 'btn-primary', style: 'border:none;width:100%' }, 'Publish to Marketplace');
          publish.onclick = async () => {
            publish.disabled = true; publish.textContent = 'Publishing…';
            try {
              const r = await api('POST', '/api/admin/cj/import', {
                supplierId: supplier.id,
                pid: product.pid,
                vid: v.vid,
                title: title.value.trim(),
                category: categorySel.value,
                retailPrice: retail.value,
                description: desc.value.trim(),
                photos
              });
              publish.textContent = 'Published';
              toast(`${r.item.title} is live at ${cents(r.item.price)} + live CJ shipping`, 'ok');
            } catch (e) {
              publish.disabled = false; publish.textContent = 'Publish to Marketplace'; toast(e.message, 'err');
            }
          };

          results.appendChild(el('div', { style: 'display:flex;justify-content:space-between;gap:10px;align-items:center;margin-bottom:10px' }, [
            el('div', { class: 't', style: 'font-size:18px' }, 'Review CJ listing'),
            el('button', { onclick: drawVariantList }, '← Variants')
          ]));
          results.appendChild(details);
          results.appendChild(el('label', {}, 'Photos from CJ — remove any you do not want to publish'));
          results.appendChild(photoRow);
          results.appendChild(el('label', {}, 'Title')); results.appendChild(title);
          results.appendChild(el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' }, [
            el('div', {}, [el('label', {}, 'Marketplace category'), categorySel]),
            el('div', {}, [el('label', {}, 'Retail price ($)'), retail])
          ]));
          results.appendChild(el('label', {}, 'Description')); results.appendChild(desc);
          results.appendChild(el('div', { class: 'aibox' }, [
            el('b', {}, 'AI listing cleanup'),
            el('div', { class: 'hint' }, aiStatus.configured ? 'Automatically removes supplier language and rewrites the title and description without inventing specs.' : 'Add OPENAI_API_KEY in Netlify to enable automatic supplier-copy cleanup.'),
            aiBtn, aiMsg
          ]));
          results.appendChild(publish);
          if (aiStatus.configured) setTimeout(() => runAi(true), 0);
        }

        drawVariantList();
      } catch (e) {
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'errmsg' }, e.message));
      }
    }

    async function doSearch(page = 1) {
      searchBtn.disabled = true; searchBtn.textContent = 'Searching…';
      results.innerHTML = '';
      results.appendChild(el('div', { class: 'hint' }, 'Searching CJ…'));
      try {
        const r = await api('GET', `/api/admin/cj/products?q=${encodeURIComponent(q.value.trim())}&country=${encodeURIComponent(country.value)}&freeShipping=${free.checked ? '1' : '0'}&page=${page}&size=16`);
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'hint', style: 'margin-bottom:8px' }, `${r.total.toLocaleString()} CJ result(s)`));
        if (!r.products.length) {
          results.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No CJ products found'), el('p', {}, 'Try a broader search or remove the stock filter.') ]));
          return;
        }
        const list = el('div', { class: 'card' });
        r.products.forEach(prod => {
          list.appendChild(el('div', { class: 'listrow' }, [
            prod.image ? el('img', { src: prod.image, style: 'width:64px;height:64px;object-fit:cover;border-radius:8px' }) : null,
            el('div', { class: 'grow' }, [
              el('div', { class: 't' }, prod.name),
              el('div', { class: 's' }, `${prod.categoryName || 'CJ product'} · from ${cents(Math.round(prod.price * 100))}`),
              prod.freeShipping ? el('div', { class: 's' }, 'CJ marks this product free-shipping eligible') : null
            ]),
            el('button', { onclick: () => showVariants(prod) }, 'Variants')
          ]));
        });
        results.appendChild(list);
        const pager = el('div', { style: 'display:flex;justify-content:space-between;gap:8px;margin-top:10px' });
        const prev = el('button', { disabled: r.page <= 1 ? 'disabled' : null, onclick: () => doSearch(r.page - 1) }, '← Previous');
        const next = el('button', { disabled: r.page * r.size >= r.total ? 'disabled' : null, onclick: () => doSearch(r.page + 1) }, 'Next →');
        pager.appendChild(prev); pager.appendChild(el('span', { class: 'hint' }, `Page ${r.page}`)); pager.appendChild(next);
        results.appendChild(pager);
      } catch (e) {
        results.innerHTML = '';
        results.appendChild(el('div', { class: 'errmsg' }, e.message));
      } finally {
        searchBtn.disabled = false; searchBtn.textContent = 'Search CJ';
      }
    }

    searchBtn.onclick = () => doSearch(1);
    q.addEventListener('keydown', e => { if (e.key === 'Enter') doSearch(1); });
    return panel;
  }

  async function singleItemForm(supplier) {
    const { categories } = await api('GET', '/api/shop/categories');
    const wrap = el('div', { class: 'card', style: 'padding:18px' });
    wrap.appendChild(el('div', { class: 'policybox' }, [
      el('b', {}, 'Before adding anything electrical'),
      document.createTextNode('Get UL or ETL certification from this supplier in writing and keep it on file. Uncertified electrical goods are not legal to sell and are a real fire risk.')
    ]));

    const title = el('input', { placeholder: 'Matte black pendant light' });
    const category = el('select', {}, categories.map(c => el('option', { value: c }, c)));
    const cost = el('input', { type: 'number', placeholder: '18.50' });
    const shipping = el('input', supplier.kind === 'cj'
      ? { type: 'number', value: 0, disabled: 'disabled', title: 'CJ freight is quoted live at checkout.' }
      : { type: 'number', placeholder: '4.00' });
    const markup = el('input', { type: 'number', value: supplier.markupPercent });
    const stock = el('input', { type: 'number', value: 25 });
    const sku = el('input', { placeholder: 'Optional — their product code' });
    const desc = el('textarea', { placeholder: 'What it is, dimensions, anything a buyer should know.' });

    const preview = el('div', { class: 'calcbox' });
    function updatePreview() {
      const c = (Number(cost.value) || 0) * 100 + (Number(shipping.value) || 0) * 100;
      const m = Number(markup.value) || 0;
      const retail = Math.round(c * (1 + m / 100));
      preview.innerHTML = '';
      preview.appendChild(el('div', { class: 'calcrow' }, [el('span', {}, 'Your cost + shipping'), el('span', {}, cents(c))]));
      preview.appendChild(el('div', { class: 'calcrow total' }, [el('span', {}, 'Buyer will pay'), el('span', { class: 'g' }, cents(retail))]));
    }
    [cost, shipping, markup].forEach(inp => inp.addEventListener('input', updatePreview));
    updatePreview();

    // Reuses the same photo picker pattern as the regular sell-item form.
    let photos = [];
    const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
    const previewRow = el('div', { class: 'previewrow' });
    const picker = el('div', { class: 'picker', onclick: () => fileInput.click() }, 'Add photos (optional)');
    fileInput.onchange = async () => {
      for (const f of [...fileInput.files].slice(0, 6 - photos.length)) photos.push(await downscale(f));
      fileInput.value = ''; drawPhotos();
    };
    function drawPhotos() {
      previewRow.innerHTML = '';
      photos.forEach((p, i) => previewRow.appendChild(el('div', { class: 'pv' }, [
        el('img', { src: p }), el('button', { onclick: () => { photos.splice(i, 1); drawPhotos(); } }, '×')
      ])));
    }

    wrap.appendChild(el('label', {}, 'Title')); wrap.appendChild(title);
    wrap.appendChild(el('label', {}, 'Category')); wrap.appendChild(category);
    wrap.appendChild(twoUp('Your cost ($)', cost, supplier.kind === 'cj' ? 'Shipping — live CJ quote' : 'Shipping cost ($)', shipping));
    wrap.appendChild(twoUp('Markup (%)', markup, 'Stock quantity', stock));
    wrap.appendChild(el('label', {}, 'Their product code (SKU)')); wrap.appendChild(sku);
    if (supplier.kind === 'cj') wrap.appendChild(el('div', { class: 'hint' }, 'CJ freight is quoted live at buyer checkout. The catalog browser above is recommended because it fills the real product/variant IDs and adds the product to My Products automatically. If you use this manual form, the product code must be a real CJ variant ID (vid).'));
    wrap.appendChild(el('label', {}, 'Description')); wrap.appendChild(desc);
    wrap.appendChild(el('label', {}, 'Photos')); wrap.appendChild(picker); wrap.appendChild(fileInput); wrap.appendChild(previewRow);
    wrap.appendChild(preview);

    const err = el('div', { class: 'errmsg' });
    const btn = el('button', { class: 'submitbtn' }, 'Add to marketplace');
    btn.onclick = async () => {
      if (!title.value.trim() || !cost.value) { err.textContent = 'Title and cost are required.'; return; }
      try {
        const r = await api('POST', `/api/admin/suppliers/${supplier.id}/import`, {
          products: [{
            title: title.value, category: category.value, cost: cost.value, shipping: shipping.value,
            markupPercent: markup.value, stock: stock.value, sku: sku.value, description: desc.value, photos
          }]
        });
        toast('Added to the marketplace', 'ok');
        title.value = ''; cost.value = ''; shipping.value = ''; sku.value = ''; desc.value = ''; photos = []; drawPhotos(); updatePreview();
        err.className = 'okmsg'; err.textContent = `Live now: ${r.items[0].title} at ${cents(r.items[0].price)}`;
      } catch (e) { err.className = 'errmsg'; err.textContent = e.message; }
    };
    wrap.appendChild(btn); wrap.appendChild(err);
    return wrap;
  }

  function bulkForm(s) {
    const ta = el('textarea', { style: 'min-height:170px;font-family:monospace;font-size:12.5px',
      placeholder: '[\n  {"title":"Matte black pendant light","cost":18.50,"shipping":4.00,"sku":"PL-882","stock":50},\n  {"title":"Smart WiFi thermostat","cost":42.00,"shipping":6.50,"sku":"TH-119","stock":30}\n]' });
    const st = el('div', { class: 'hint' });
    return el('div', { class: 'card', style: 'padding:18px' }, [
      el('div', { class: 'hint', style: 'margin-bottom:10px' }, 'For adding many products at once. Paste a JSON list — each needs at least a title and cost. Markup, category and pricing are applied automatically. Use "Add one item" instead unless you specifically have a list like this.'),
      el('div', { class: 'policybox' }, [
        el('b', {}, 'Before importing anything electrical'),
        document.createTextNode('Get UL or ETL certification documents from this supplier in writing and keep them on file. Selling uncertified electrical goods in the US is not legal, and "the supplier said it was fine" is not a defense if something causes a fire.')
      ]),
      ta,
      el('button', { class: 'submitbtn', onclick: async () => {
        let products;
        try { products = JSON.parse(ta.value); }
        catch { st.className = 'errmsg'; st.textContent = 'That is not valid JSON.'; return; }
        try {
          const r = await api('POST', `/api/admin/suppliers/${s.id}/import`, { products });
          toast(`Imported ${r.imported} product(s)`, 'ok');
          st.className = 'okmsg';
          st.textContent = r.items.map(i => `${i.title} — cost ${cents(i.cost)} → retail ${cents(i.price)}`).join('\n');
        } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
      } }, 'Import products'),
      st
    ]);
  }

  return wrap;
}

/* ================= ADMIN: FULFILMENT QUEUE ================= */
async function renderFulfilment() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Fulfilment queue'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Every dropship sale lands here. Place the order with the supplier, then paste the tracking number back in.'));

  try {
    const { connected } = await api('GET', '/api/admin/cj/status');
    wrap.appendChild(el('div', { class: connected ? 'trialbar' : 'policybox' }, connected
      ? 'CJdropshipping is connected. Buyer freight is quoted live, and \"Create on CJ\" sends the order to CJ. CJ returns a payment link so you can finish supplier payment without re-entering it.'
      : 'CJdropshipping isn\'t connected yet — set CJ_API_KEY in Netlify environment variables, then redeploy.'));
  } catch {}

  const { orders } = await api('GET', '/api/admin/supplier-orders');
  const pending = orders.filter(o => o.status === 'pending').length;
  const profit = orders.reduce((s, o) => s + (o.chargedCents - o.costCents), 0);
  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(orders.length, 'Total orders'), stat(pending, 'Awaiting order'), stat(cents(profit), 'Gross profit')
  ]));

  if (!orders.length) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Nothing to fulfil'), el('p', {}, 'Dropship sales appear here automatically.')])); return wrap; }

  const box = el('div', { class: 'card' });
  orders.forEach(o => {
    const sh = o.shipping;
    const trackInput = el('input', { placeholder: 'Tracking number', value: o.tracking || '', style: 'max-width:200px' });
    const sel = el('select', { style: 'max-width:140px' }, ['pending','ordered','shipped','delivered','cancelled','refunded'].map(s =>
      el('option', { value: s, selected: s === o.status ? 'selected' : null }, s)));
    box.appendChild(el('div', { class: 'offerrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 't' }, o.title),
        el('div', { class: 's' }, `${o.supplierName}${o.supplierSku ? ' · ' + o.supplierSku : ''} · cost ${cents(o.costCents)} → charged ${cents(o.chargedCents)} · profit ${cents(o.chargedCents - o.costCents)}`),
        el('div', { class: 's' }, sh ? `Ship to ${o.buyerName}, ${sh.line1}, ${sh.city}, ${sh.state}${sh.zip ? ' ' + sh.zip : ''}` : 'No shipping address captured'),
        o.supplierKind === 'cj' && o.cjLogisticName ? el('div', { class: 's' }, `CJ shipping: ${o.cjLogisticName}${o.cjQuotedDays ? ' · ' + o.cjQuotedDays + ' days' : ''}${o.shippingCostCents ? ' · ' + cents(o.shippingCostCents) : ''}`) : null,
        o.cjRawStatus ? el('div', { class: 's' }, `CJ status: ${o.cjRawStatus}${o.cjOrderId ? ' · order ' + o.cjOrderId : ''}`) : null,
        el('div', { class: 's' }, o.buyerEmail)
      ]),
      el('div', { style: 'display:flex;gap:6px;align-items:center;flex-wrap:wrap' }, [
        el('button', { onclick: () => {
          const text = `${o.title}${o.supplierSku ? ' (SKU ' + o.supplierSku + ')' : ''}\nQty: 1\nShip to:\n${o.buyerName}\n${sh ? sh.line1 + '\n' + sh.city + ', ' + sh.state + (sh.zip ? ' ' + sh.zip : '') : 'No address captured'}`;
          navigator.clipboard.writeText(text).then(() => toast('Copied — paste into your supplier\'s order form', 'ok')).catch(() => toast('Could not copy', 'err'));
        } }, '📋 Copy for supplier'),
        o.supplierKind === 'cj' ? (o.cjOrderId
          ? el('span', { style: 'display:flex;gap:6px;flex-wrap:wrap' }, [
              el('button', { onclick: async () => {
                try {
                  const r = await api('POST', `/api/admin/supplier-orders/${o.id}/check-cj-status`);
                  toast('CJ status: ' + (r.cjStatus || 'unknown') + (r.order.tracking ? ' · tracking added' : ''), 'ok');
                  render();
                } catch (e) { toast(e.message, 'err'); }
              } }, '🔄 Check CJ status'),
              o.cjPayUrl ? el('button', { class: 'btn-primary', style: 'border:none', onclick: () => window.open(o.cjPayUrl, '_blank', 'noopener') }, 'Pay on CJ ↗') : null
            ])
          : el('button', { class: 'btn-primary', style: 'border:none', onclick: async () => {
              try {
                const q = await api('GET', `/api/admin/supplier-orders/${o.id}/cj-quote`);
                const ship = q.selected;
                const newProfit = q.order.chargedCents - q.order.costCents;
                if (!confirm(`Create this order on CJdropshipping now?\n\nItem: ${o.title}\nCJ shipping: ${ship.logisticName} — ${cents(Math.round(ship.price * 100))}${ship.days ? ` (${ship.days} days)` : ''}\nCurrent gross profit after CJ cost: ${cents(newProfit)}\n\nCJ will return a payment link. No CJ balance is charged automatically.`)) return;
                const r = await api('POST', `/api/admin/supplier-orders/${o.id}/send-to-cj`);
                toast(r.payUrl ? 'Created on CJ — use the Pay on CJ button to finish supplier payment.' : 'Created on CJ.', 'ok');
                render();
              } catch (e) { toast(e.message, 'err'); }
            } }, ' Create on CJ')
        ) : null,
        trackInput, sel,
        el('button', { onclick: async () => {
          try {
            await api('POST', `/api/admin/supplier-orders/${o.id}/status`, { status: sel.value, tracking: trackInput.value });
            toast(sel.value === 'shipped' ? 'Updated — buyer emailed automatically' : 'Updated', 'ok'); render();
          } catch (e) { toast(e.message, 'err'); }
        } }, 'Save')
      ])
    ]));
  });
  wrap.appendChild(box);
  return wrap;
}

/* ================= ADMIN: REPORTS ================= */
async function renderReports() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Reports'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Buyers who say a peer-to-peer purchase never shipped. Dropship orders you fulfil yourself never show up here.'));

  const { reports } = await api('GET', '/api/admin/reports');
  const open = reports.filter(r => r.status === 'open');
  const closed = reports.filter(r => r.status !== 'open');

  wrap.appendChild(el('div', { class: 'statgrid' }, [stat(open.length, 'Open'), stat(closed.length, 'Resolved')]));

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Open'));
  const openBox = el('div', { class: 'card' });
  if (!open.length) openBox.appendChild(el('div', { class: 'listrow' }, el('div', { class: 's' }, 'Nothing open.')));
  open.forEach(r => {
    const noteInput = el('input', { placeholder: 'Note (optional)', style: 'max-width:220px' });
    openBox.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 't' }, r.itemTitle),
        el('div', { class: 's' }, `Buyer: ${r.buyerName} (${r.buyerEmail}) · Seller: ${r.sellerName}`),
        el('div', { class: 's' }, '"' + r.reason + '"'),
        el('div', { class: 's' }, new Date(r.at).toLocaleDateString())
      ]),
      el('div', { style: 'display:flex;gap:6px;flex-wrap:wrap;align-items:center' }, [
        noteInput,
        el('button', { onclick: async () => { await api('POST', `/api/admin/reports/${r.id}/resolve`, { status: 'resolved', note: noteInput.value }); toast('Marked resolved', 'ok'); render(); } }, 'Resolve'),
        el('button', { onclick: async () => { await api('POST', `/api/admin/reports/${r.id}/resolve`, { status: 'dismissed', note: noteInput.value }); toast('Dismissed', 'ok'); render(); } }, 'Dismiss')
      ])
    ]));
  });
  wrap.appendChild(openBox);

  if (closed.length) {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Resolved / dismissed'));
    const closedBox = el('div', { class: 'card' });
    closed.forEach(r => closedBox.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 't' }, r.itemTitle + ' — ' + r.sellerName),
        el('div', { class: 's' }, r.note ? r.note : '(no note)')
      ]),
      el('span', { class: 'pill ' + (r.status === 'resolved' ? 'good' : 'bad') }, r.status)
    ])));
    wrap.appendChild(closedBox);
  }
  return wrap;
}

/* ================= BOOST PICKER ================= */
// Previously the only way to find promotions was to open a listing and
// scroll to the bottom — easy to miss entirely. This is a direct,
// unmissable entry point: tap the lightning bolt in the top bar, land
// straight on a page to buy one.
async function renderBoostPicker() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, ' Boost a listing'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Pin one of your listings above organic results for a set window, or grab the one-hour Super Boost top slot.'));

  const { listings } = await api('GET', '/api/users/' + state.user.id + '/listings');
  if (!listings.length) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('h3', {}, "You don't have a listing yet"),
      el('p', {}, 'Post one first, then come back here to boost it.'),
      el('button', { class: 'btn-primary', style: 'margin-top:16px', onclick: () => go('compose') }, 'Post a property')
    ]));
    return wrap;
  }

  const box = el('div', { class: 'card' });
  listings.forEach(l => {
    const boosted = l.boostUntil && new Date(l.boostUntil) > new Date();
    box.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, [
        el('div', { class: 't' }, l.address),
        el('div', { class: 's' }, l.city + (boosted ? ' · currently promoted' : ' · not promoted right now'))
      ]),
      el('button', { class: boosted ? '' : 'btn-primary', style: boosted ? '' : 'border:none', onclick: () => go('promote', { detailId: l.id }) }, boosted ? 'Extend' : ' Boost')
    ]));
  });
  wrap.appendChild(box);
  return wrap;
}

/* ================= INVESTOR WORKSPACE (Platinum) ================= */
async function renderWorkspace() {
  const wrap = el('div', { class: 'page workspacepage' });
  wrap.appendChild(el('h2', {}, 'Investor workspace'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Compare your saved properties side by side and keep notes on each.'));

  if (!state.access?.platinum) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('h3', {}, 'Platinum feature'),
      el('p', {}, 'Compare saved properties and keep deal notes across all of them — included with Platinum.'),
      el('button', { class: 'btn-primary', style: 'margin-top:16px', onclick: () => go('upgrade') }, 'See Platinum')
    ]));
    return wrap;
  }

  let data;
  try { data = await api('GET', '/api/workspace'); }
  catch (e) { wrap.appendChild(el('div', { class: 'empty' }, el('p', {}, e.message))); return wrap; }

  const { listings, notes } = data;
  if (!listings.length) {
    wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Nothing saved yet'), el('p', {}, 'Save a few properties from the feed and they\'ll line up here for comparison.')]));
    return wrap;
  }

  const table = el('div', { style: 'overflow-x:auto' });
  const grid = el('div', { style: `display:grid;grid-template-columns:repeat(${listings.length},minmax(200px,1fr));gap:12px;` });
  listings.forEach(l => {
    const spread = l.arv ? l.arv - l.asking : null;
    const noteEntry = notes.find(n => n.listingId === l.id);
    const noteBox = el('textarea', { placeholder: 'Deal notes…', style: 'min-height:80px;font-size:13px' });
    noteBox.value = noteEntry?.notes || '';
    let saveTimer = null;
    noteBox.oninput = () => {
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => api('POST', '/api/workspace/notes', { listingId: l.id, notes: noteBox.value }).catch(() => {}), 700);
    };
    grid.appendChild(el('div', { class: 'card', style: 'padding:14px;cursor:default' }, [
      el('div', { class: 't', style: 'font-weight:700;margin-bottom:2px;cursor:pointer', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, l.address),
      el('div', { class: 's', style: 'margin-bottom:10px' }, l.city),
      dealRow('Asking', money(l.asking)),
      l.arv ? dealRow('Est. ARV', money(l.arv)) : null,
      spread ? dealRow('Spread', money(spread)) : null,
      l.beds ? dealRow('Beds/Baths', `${l.beds} / ${l.baths || '—'}`) : null,
      el('div', { class: 'hint', style: 'margin:10px 0 6px' }, 'Your notes'),
      noteBox
    ]));
  });
  table.appendChild(grid);
  wrap.appendChild(table);
  return wrap;
}
function dealRow(label, value) {
  return el('div', { style: 'display:flex;justify-content:space-between;font-size:12.5px;padding:3px 0;border-bottom:1px solid var(--line)' }, [
    el('span', { class: 'hint' }, label), el('span', { style: 'font-weight:600' }, value)
  ]);
}
