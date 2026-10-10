let state = {
  view: 'home', user: null, authMode: 'signup', pricing: null, access: null,
  detailId: null, profileId: null, photoIdx: 0, composePhotos: [], shopPhotos: [],
  shopCat: 'All', shopQ: '', shopItemId: null, shopEditId: null, shopEditPhotos: [], shopManageQ: '',
  networkTab: 'discover', networkQ: '', networkRole: 'all', chatUserId: null, unreadCount: 0, friendRequestCount: 0, notificationSummary: { profile:0, destinations:{} },
  companyId: null, companyInviteToken: null, buyerPortalType: null, buyerPortalId: null,
  pendingReferral: null, leaderboardPeriod: 'all', postAuthTarget: null, feedMode: 'for-you', searchQ: '',
  detailPreview: null, mascotAwareness: { lastHumanActivity: Date.now(), lastPersistentCue: 0, activeField: null }
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
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.12 2.12-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1.03 1.55V20.3h-3v-.09a1.7 1.7 0 0 0-1.03-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06-2.12-2.12.06-.06A1.7 1.7 0 0 0 7 15a1.7 1.7 0 0 0-1.55-1.03H5.3v-3h.15A1.7 1.7 0 0 0 7 9.94a1.7 1.7 0 0 0-.34-1.88L6.6 8l2.12-2.12.06.06a1.7 1.7 0 0 0 1.88.34A1.7 1.7 0 0 0 11.7 4.7V4.6h3v.1a1.7 1.7 0 0 0 1.03 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06L19.8 8l-.06.06a1.7 1.7 0 0 0-.34 1.88 1.7 1.7 0 0 0 1.55 1.03h.15v3h-.15A1.7 1.7 0 0 0 19.4 15Z"/>'
  };
  const span = el('span', { class:'svgicon', 'aria-hidden':'true' });
  span.innerHTML = `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${paths[name] || paths.home}</svg>`;
  return span;
}
function membershipBadge(label) { return label ? el('span', { class:'membershiplevel ' + String(label).toLowerCase().replace(/[^a-z]+/g,'-') }, label) : null; }

const ACCOUNT_ROLE_OPTIONS = [
  ['buyer','Buyer / Investor','Find and acquire deals'],
  ['seller','Seller / Wholesaler','Post and move properties'],
  ['lender','Lender / Funder','Provide capital and connect with deals'],
  ['affiliate','Marketing / Affiliate only','Promote Better and apply for affiliate access. Hidden from the real estate Network.']
];
const ACCOUNT_ROLE_LABELS = Object.fromEntries(ACCOUNT_ROLE_OPTIONS.map(([value,label]) => [value,label]));
function userRoles(user) {
  if (!user) return [];
  if (user.role === 'admin') return ['admin'];
  const roles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role];
  return [...new Set(roles.filter(r => ACCOUNT_ROLE_LABELS[r]))];
}
function hasRole(user, role) { return userRoles(user).includes(role); }
function roleLabel(user) {
  if (user?.role === 'admin') return 'Admin';
  const labels = userRoles(user).map(r => ACCOUNT_ROLE_LABELS[r]);
  return labels.join(' · ') || 'Member';
}
function buildRoleSelector(initialRoles = [], onChange = () => {}) {
  const selected = new Set((initialRoles || []).filter(r => ACCOUNT_ROLE_LABELS[r]));
  const tabs = el('div', { class:'roletabs rolemultiselect' });
  const sync = () => {
    [...tabs.children].forEach(button => {
      const active = selected.has(button.dataset.role);
      button.classList.toggle('selected', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    onChange([...selected]);
  };
  ACCOUNT_ROLE_OPTIONS.forEach(([value,label,description]) => {
    const button = el('button', { type:'button', class:selected.has(value) ? 'selected' : '', 'aria-pressed':selected.has(value) ? 'true' : 'false' }, [
      el('b', {}, label), el('small', {}, description)
    ]);
    button.dataset.role = value;
    button.onclick = () => {
      if (selected.has(value)) selected.delete(value);
      else { if (value === 'affiliate') selected.clear(); else selected.delete('affiliate'); selected.add(value); }
      sync();
    };
    tabs.appendChild(button);
  });
  return { element:tabs, values:() => [...selected], set(values){ selected.clear(); (values||[]).forEach(v => ACCOUNT_ROLE_LABELS[v] && selected.add(v)); sync(); } };
}

function reorderPropertyPhotos(photos,from,to){
  const ordered=[...photos];
  if(!Number.isInteger(from)||!Number.isInteger(to)||from<0||to<0||from>=ordered.length||to>=ordered.length)return ordered;
  const [photo]=ordered.splice(from,1);ordered.splice(to,0,photo);return ordered;
}

async function api(method, path, body) {
  const actionTarget=document.activeElement;
  const res = await fetch(path, {
    method, credentials: 'include',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Something went wrong.');
  try{mascotActionCompleted(method,path,data,actionTarget);}catch{}
  return data;
}


/* ================= toasts ================= */
function toast(msg, kind = '') {
  if(state.user)setTimeout(()=>mascotSiteEvent(kind==='err'?'error':kind==='ok'?'success':'ack'),0);
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

/* v49 — every action acknowledges the tap immediately; async actions can also
   expose a consistent busy state without duplicating submissions. */
function setButtonBusy(button, busy) {
  if (!button) return;
  if (busy) {
    button.dataset.wasDisabled = button.disabled ? '1' : '0';
    button.dataset.busy = 'true';
    button.setAttribute('aria-busy', 'true');
    button.disabled = true;
  } else {
    const wasDisabled = button.dataset.wasDisabled === '1';
    delete button.dataset.busy;
    delete button.dataset.wasDisabled;
    button.removeAttribute('aria-busy');
    button.disabled = wasDisabled;
  }
}
async function withButtonBusy(button, work) {
  if (!button || button.dataset.busy === 'true') return;
  setButtonBusy(button, true);
  try { return await work(); }
  finally { setButtonBusy(button, false); }
}
document.addEventListener('pointerdown', e => {
  const button = e.target?.closest?.('button');
  if (!button || button.disabled) return;
  button.classList.add('tap-ack');
  buzz(4);
  setTimeout(() => button.classList.remove('tap-ack'), 180);
}, { passive: true });

const money = n => '$' + Number(n).toLocaleString();
const cents = c => '$' + (c / 100).toFixed(2).replace(/\.00$/, '');
const initials = n => (n || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
const applyTheme = t => document.documentElement.setAttribute('data-theme', t === 'dark' ? 'dark' : 'light');

const ROUTED_VIEWS = new Set(['home','auth','feed','detail','shop','shopitem','sellitem','shopmanage','shopedit','orders','settings','me','profile','saved','messages','chat','network','workspace','upgrade','compose','buybox','promote','analytics','wallet','offers','boostpicker','companyworkspace','company','companyjoin','buyerportal','leaderboard','insights','admin','emailcenter','memberships','suppliers','fulfilment','reports','dealbuilder','buyercrm','commandcenter','search','savedsearches','pipeline','dealcalendar','markethubs','dealroom','transactionhub','affiliate','intake','learn','about','terms','privacy','contact','faq','forgot']);
function applyRouteParams(params) {
  const requested = params.get('view');
  if (requested && ROUTED_VIEWS.has(requested)) state.view = requested;
  const id = params.get('id');
  const userId = params.get('user');
  const itemId = params.get('item');
  if (['detail','promote','analytics','dealroom'].includes(state.view)) state.detailId = id || null;
  if (state.view === 'compose') state.composeEditId = id || null;
  if (state.view === 'profile') state.profileId = userId || null;
  if (state.view === 'chat') state.chatUserId = userId || null;
  if (state.view === 'shopitem') state.shopItemId = itemId || null;
  if (state.view === 'shopedit') state.shopEditId = itemId || null;
  if (state.view === 'company') state.companyId = params.get('company') || null;
  if (state.view === 'network') state.networkTab = params.get('tab') || 'discover';
  if (state.view === 'buyerportal') { state.buyerPortalType = params.get('type') || null; state.buyerPortalId = params.get('target') || null; }
  if (params.get('invite')) state.companyInviteToken = params.get('invite');
  if (state.view === 'intake') state.intakeCode = params.get('code') || null;
  if (state.view === 'learn') state.guideCourseModule = params.get('module') || state.user?.settings?.guideCourseLastModule || 'foundations';
  return requested;
}
function routeUrl(view = state.view) {
  const p = new URLSearchParams();
  if (view && view !== (state.user ? 'feed' : 'home')) p.set('view', view);
  if (['detail','promote','analytics','dealroom'].includes(view) && state.detailId) p.set('id', state.detailId);
  if (view === 'compose' && state.composeEditId) p.set('id', state.composeEditId);
  if (view === 'profile' && state.profileId) p.set('user', state.profileId);
  if (view === 'intake' && state.intakeCode) p.set('code', state.intakeCode);
  if (view === 'learn' && state.guideCourseModule) p.set('module', state.guideCourseModule);
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
  window.BetterPixel?.pause();
  const url = routeUrl();
  const current = location.pathname + location.search;
  if (mode === 'replace') history.replaceState({ bre: true }, '', url);
  else if (url !== current) history.pushState({ bre: true }, '', url);
}

async function boot() {
  const params = new URLSearchParams(location.search);
  const incomingRef = String(params.get('ref') || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
  const incomingAff = String(params.get('aff') || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0,24);
  if(incomingAff){ state.pendingAffiliate=incomingAff; try{localStorage.setItem('bre_affiliate_code',incomingAff);}catch{} api('GET','/api/affiliate/track/'+encodeURIComponent(incomingAff)).catch(()=>{}); } else { try{state.pendingAffiliate=localStorage.getItem('bre_affiliate_code')||null;}catch{} }
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
  else if (state.user) state.view = requestedView && ROUTED_VIEWS.has(requestedView) && !['home','auth'].includes(requestedView) ? requestedView : (hasRole(state.user,'affiliate') ? 'affiliate' : 'feed');
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
  if (state.user) { refreshUnread().then(()=>{ renderTop(); renderTabs(); }).catch(()=>{}); const prior=Number(state.user.settings?.tutorialHighestRank??-1), now=TUTORIAL_RANK[tutorialTier()]??0; if(prior>=0 && now>prior) state.launchNewFeatureTutorial=true; const completed=Number(state.user.settings?.tutorialCompletedVersion||0); if(completed>=28 && completed<TUTORIAL_VERSION) state.launchProductUpdateTutorial=true; const dp=state.user?.demoPreview?.type; if(state.user?.demo&&dp&&!sessionStorage.getItem('bre-demo-preview:'+dp)){sessionStorage.setItem('bre-demo-preview:'+dp,'1');if(dp==='onboarding')state.launchTutorialAfterNav=true;if(dp==='whatsnew')state.launchProductUpdateTutorial=true;} }
  if (!state.verifyToken && !state.resetToken) writeRoute('replace');
  render();
  let heartbeatInFlight=false;
  const sendHeartbeat=async()=>{if(!state.user||document.hidden||heartbeatInFlight)return;heartbeatInFlight=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);try{const res=await fetch('/api/activity/heartbeat',{method:'POST',credentials:'include',signal:controller.signal});if(res.ok){const data=await res.json().catch(()=>null);if(data?.notifications){const before=JSON.stringify(state.notificationSummary||{});applyNotificationSummary(data.notifications);if(before!==JSON.stringify(state.notificationSummary||{})){renderTop();renderTabs();}}}}catch{}finally{clearTimeout(timer);heartbeatInFlight=false;}};
  if(state.user) sendHeartbeat(); setInterval(sendHeartbeat,90000);
}
async function refreshMe() {
  try { const before=state.user ? (TUTORIAL_RANK[tutorialTier()]??0) : -1; const d = await api('GET', '/api/me'); state.user = d.user; state.access = d.access; state.demoAdminSession = !!d.demoAdminSession; const after=TUTORIAL_RANK[tutorialTier()]??0; if(before>=0 && after>before) state.launchNewFeatureTutorial=true; } catch {}
}
function applyNotificationSummary(summary){
  const before=state.notificationSummary||{destinations:{}};const incoming=summary||{profile:0,destinations:{}};
  if(state.user){if(Number(incoming.destinations?.messages||0)>Number(before.destinations?.messages||0))setTimeout(()=>mascotSiteEvent('message'),80);else if(Number(incoming.profile||0)>Number(before.profile||0))setTimeout(()=>mascotSiteEvent('message'),80);}
  state.notificationSummary = incoming;
  state.unreadCount = Number(summary?.destinations?.messages || 0);
  state.friendRequestCount = Number(summary?.destinations?.network || 0);
}
async function refreshUnread() {
  if (!state.user) { applyNotificationSummary({profile:0,destinations:{}}); return 0; }
  try { applyNotificationSummary(await api('GET','/api/notification-summary')); } catch {}
  return state.unreadCount || 0;
}
function notificationCountFor(view){ return Number(state.notificationSummary?.destinations?.[view] || 0); }
function notificationBadge(count, className='navcount'){ const n=Number(count||0); return n>0?el('span',{class:className},n>99?'99+':String(n)):null; }
let viewPollTimer = null;
function stopViewPolling() { if (viewPollTimer) { clearInterval(viewPollTimer); viewPollTimer = null; } }
function startViewPolling(fn, ms = 5000) {
  stopViewPolling();
  viewPollTimer = setInterval(() => {
    if (document.hidden) return;
    Promise.resolve().then(fn).catch(() => {});
  }, ms);
}
function go(view, extra = {}, options = {}) { if(view==='compose'&&!Object.prototype.hasOwnProperty.call(extra,'composeEditId')){state.composeEditId=null;state.composePhotos=[];if(!Object.prototype.hasOwnProperty.call(extra,'dealBuilderDraft'))state.dealBuilderDraft=null;} Object.assign(state, { view }, extra); writeRoute(options.replace ? 'replace' : 'push'); window.scrollTo(0, 0); render(); }
function openListingDetail(listingOrId, photoIdx = 0) {
  const preview = listingOrId && typeof listingOrId === 'object' ? listingOrId : null;
  const id = String(preview?.id || listingOrId || '').trim();
  if (!id) { toast('This property could not be opened. Please refresh and try again.', 'err'); return; }
  state.detailPreview = preview ? { ...preview } : null;
  go('detail', { detailId: id, photoIdx: Number.isInteger(photoIdx) ? photoIdx : 0 });
  // Analytics must never block navigation. Record the view after the detail request has had a head start.
  if (state.user) setTimeout(() => api('POST', '/api/listings/' + encodeURIComponent(id) + '/view', {}).catch(() => {}), 900);
}
function renderDetailPreview(listing) {
  const wrap = el('div', { class: 'detail detail-preview', 'aria-busy': 'true' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => history.length > 1 ? history.back() : go('feed') }, '← Back to feed'));
  const gal = el('div', { class: 'gallery' });
  const main = el('div', { class: 'main' });
  const photo = listing.photos?.[state.photoIdx] || listing.photos?.[0];
  main.appendChild(photo ? el('img', { src: photo, alt: listing.city || 'Property' }) : el('div', {}, 'No photos on this listing'));
  gal.appendChild(main); wrap.appendChild(gal);
  wrap.appendChild(el('div', { class: 'dhead' }, [
    el('div', {}, [el('h2', {}, listing.locked ? (listing.city?.split(',')[0] || 'Property') + ' — address hidden' : (listing.address || 'Property')), el('div', { class: 'c' }, listing.city || '')]),
    el('div', { class: 'dprice' }, money(listing.asking))
  ]));
  const specs = [listing.beds ? listing.beds + ' bd' : null, listing.baths ? listing.baths + ' ba' : null, listing.sqft ? Number(listing.sqft).toLocaleString() + ' sqft' : null, listing.propertyType].filter(Boolean);
  if (specs.length) wrap.appendChild(el('div', { class: 'specs' }, specs.map(x => el('span', {}, x))));
  wrap.appendChild(el('div', { class: 'detail-loading', role: 'status' }, [el('b', {}, 'Opening property…'), el('span', {}, 'Loading the rest of the details.') ]));
  return wrap;
}
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
  if (state.user) state.view = requested && ROUTED_VIEWS.has(requested) && !['home','auth'].includes(requested) ? requested : (hasRole(state.user,'affiliate') ? 'affiliate' : 'feed');
  else state.view = requested && ROUTED_VIEWS.has(requested) ? requested : 'home';
  window.scrollTo(0, 0);
  render();
});


const BETTER_MASCOT_DEFAULTS={
  rootY:0,rootR:0,rootS:1,
  torsoX:0,torsoY:0,torsoR:0,torsoSX:1,torsoSY:1,
  headX:0,headY:0,headR:0,headSX:1,headSY:1,
  muzzleX:0,muzzleY:0,muzzleR:0,muzzleS:1,
  earL:0,earR:0,
  armLX:0,armLY:0,armLR:0,armRX:0,armRY:0,armRR:0,
  pawLX:0,pawLY:0,pawLR:0,pawRX:0,pawRY:0,pawRR:0,
  tailR:0,tailS:1
};
function mascotNeutral(){return {...BETTER_MASCOT_DEFAULTS};}
function createBetterMascotRig({variant='header',label='Better mascot',hidden=false}={}){
  const attrs={class:`better-mascot-rig mascot-${variant}`,'data-life':'header-character-v4','data-posture':'sit'};
  if(hidden)attrs['aria-hidden']='true';else{attrs.role='img';attrs['aria-label']=label;}
  const rig=el('span',attrs);
  rig.innerHTML=`<svg class="mascot-svg" viewBox="0 0 120 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="breFur" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7bd62"/><stop offset=".55" stop-color="#dd8d32"/><stop offset="1" stop-color="#b96220"/></linearGradient>
      <linearGradient id="breFurLight" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe0a3"/><stop offset="1" stop-color="#eda04a"/></linearGradient>
      <linearGradient id="breLens" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#292929"/><stop offset="1" stop-color="#050505"/></linearGradient>
    </defs>
    <g class="mascot-tail"><path d="M87 111 C101 108 109 101 113 92" fill="none" stroke="url(#breFur)" stroke-width="14" stroke-linecap="round"/><path d="M98 107 C105 104 109 99 111 94" fill="none" stroke="#efaa4d" stroke-width="4" stroke-linecap="round" opacity=".7"/></g>
    <g class="mascot-torso">
      <path d="M33 83 C37 70 47 66 60 66 C73 66 83 70 87 83 C93 101 91 127 82 142 L38 142 C29 127 27 101 33 83 Z" fill="url(#breFur)"/>
      <path d="M48 78 C53 74 67 74 72 78 L78 113 L60 130 L42 113 Z" fill="#171717" stroke="#dfa33b" stroke-width="2.2" stroke-linejoin="round"/>
      <path d="M45 86 L60 99 L75 86" fill="none" stroke="#f0b44a" stroke-width="1.6"/>
      <path d="M48 76 Q52 84 56 77 Q60 86 64 77 Q68 84 72 76" fill="#f3bd69" opacity=".9"/>
      <ellipse cx="42" cy="141" rx="15" ry="6" fill="#bd6b24"/><ellipse cx="78" cy="141" rx="15" ry="6" fill="#bd6b24"/>
    </g>
    <g class="mascot-arm-left"><path d="M38 83 C32 94 30 108 34 120" fill="none" stroke="url(#breFur)" stroke-width="15" stroke-linecap="round"/><g class="mascot-paw-left"><path class="mascot-thumb" d="M27 122 L25 112 Q25 105 29 107 L33 117 L39 117 Q43 118 42 123 L40 128 L30 128 Z" fill="url(#breFurLight)" stroke="#bd863b" stroke-width="1.5"/><ellipse cx="34" cy="122" rx="10.5" ry="8.5" fill="url(#breFurLight)"/><path d="M28 121 Q34 117 40 121" fill="none" stroke="#c8792b" stroke-width="1" opacity=".55"/><circle cx="30" cy="124" r="1.4" fill="#5d3824"/><circle cx="34" cy="126" r="1.5" fill="#5d3824"/><circle cx="38" cy="124" r="1.4" fill="#5d3824"/></g></g>
    <g class="mascot-arm-right"><path d="M82 83 C88 94 90 108 86 120" fill="none" stroke="url(#breFur)" stroke-width="15" stroke-linecap="round"/><g class="mascot-paw-right"><ellipse cx="86" cy="122" rx="10.5" ry="8.5" fill="url(#breFurLight)"/><path d="M80 121 Q86 117 92 121" fill="none" stroke="#c8792b" stroke-width="1" opacity=".55"/><circle cx="82" cy="124" r="1.4" fill="#5d3824"/><circle cx="86" cy="126" r="1.5" fill="#5d3824"/><circle cx="90" cy="124" r="1.4" fill="#5d3824"/></g></g>
    <g class="mascot-head">
      <g class="mascot-ear-left"><path d="M34 34 C20 29 14 41 17 56 C19 69 25 78 32 76 C39 73 40 61 38 48 Z" fill="#b96622"/><path d="M30 39 C23 41 22 55 28 67" fill="none" stroke="#d98531" stroke-width="3" stroke-linecap="round"/></g>
      <g class="mascot-ear-right"><path d="M86 34 C100 29 106 41 103 56 C101 69 95 78 88 76 C81 73 80 61 82 48 Z" fill="#b96622"/><path d="M90 39 C97 41 98 55 92 67" fill="none" stroke="#d98531" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M60 20 C43 18 31 28 28 45 C25 61 35 76 49 80 C53 82 56 83 60 83 C64 83 67 82 71 80 C85 76 95 61 92 45 C89 28 77 18 60 20 Z" fill="url(#breFur)"/>
      <path d="M48 24 L53 17 L58 23 L62 16 L67 23 L72 19 L73 27" fill="url(#breFur)"/>
      <path d="M34 47 Q43 39 54 44" fill="none" stroke="#9e551e" stroke-width="1.8" opacity=".45"/><path d="M66 44 Q77 39 86 47" fill="none" stroke="#9e551e" stroke-width="1.8" opacity=".45"/>
      <g class="mascot-muzzle"><ellipse cx="60" cy="62" rx="22" ry="15" fill="#f6d29a"/><ellipse cx="60" cy="56" rx="7.5" ry="5.5" fill="#2b1c18"/><path d="M60 61 Q53 67 47 64 M60 61 Q67 67 73 64" fill="none" stroke="#6a3b26" stroke-width="1.7" stroke-linecap="round"/><path d="M50 69 Q60 77 70 69 Q67 80 60 81 Q53 80 50 69" fill="#3a211d"/><path d="M56 73 Q60 77 64 73" fill="#ef7f78"/></g>
      <g class="mascot-face-details"><path class="mascot-brow-left" d="M36 38 Q44 34 52 38" fill="none" stroke="#7f431b" stroke-width="2.2" stroke-linecap="round"/><path class="mascot-brow-right" d="M68 38 Q76 34 84 38" fill="none" stroke="#7f431b" stroke-width="2.2" stroke-linecap="round"/><path class="mascot-lid-left" d="M35 47 Q44 51 53 47" fill="none" stroke="#e5a24c" stroke-width="4" stroke-linecap="round" opacity="0"/><path class="mascot-lid-right" d="M67 47 Q76 51 85 47" fill="none" stroke="#e5a24c" stroke-width="4" stroke-linecap="round" opacity="0"/></g>
      <g class="mascot-glasses"><path d="M31 42 Q43 37 55 41 L53 54 Q42 58 35 52 Z" fill="url(#breLens)" stroke="#d8a13a" stroke-width="1.5"/><path d="M65 41 Q77 37 89 42 L85 52 Q78 58 67 54 Z" fill="url(#breLens)" stroke="#d8a13a" stroke-width="1.5"/><path d="M54 44 Q60 41 66 44" fill="none" stroke="#d8a13a" stroke-width="2"/><path d="M35 44 L29 42 M85 44 L91 42" stroke="#d8a13a" stroke-width="1.5"/></g>
    </g>
  </svg>`;
  const now=performance.now();
  rig._mascot={current:mascotNeutral(),target:mascotNeutral(),velocity:{},mood:'idle',pointer:{x:0,y:0,last:0},gaze:{x:0,y:0},lastTs:0,born:now,nextIdle:now+7000+Math.random()*4500,sequenceUntil:0,actionToken:0,breathPhase:Math.random()*Math.PI*2};
  rig.dataset.expression='content';wireBetterMascotRig(rig);return rig;
}
function mascotExpression(rig,name='content',duration=0){if(!rig)return;rig.dataset.expression=name;clearTimeout(rig._expressionTimer);if(duration)rig._expressionTimer=setTimeout(()=>{if(rig.isConnected)rig.dataset.expression='content';},duration);}
function mascotSetTarget(rig,patch={},mood){if(!rig?._mascot)return;Object.assign(rig._mascot.target,patch);if(mood)rig._mascot.mood=mood;}
function mascotApply(rig){
  const c=rig._mascot.current,st=rig.style,set=(n,v,u='')=>st.setProperty(n,Number(v).toFixed(u==='scale'?4:2)+(u==='scale'?'':u));
  set('--root-y',c.rootY,'px');set('--root-r',c.rootR,'deg');set('--root-s',c.rootS,'scale');
  set('--torso-x',c.torsoX,'px');set('--torso-y',c.torsoY,'px');set('--torso-r',c.torsoR,'deg');set('--torso-sx',c.torsoSX,'scale');set('--torso-sy',c.torsoSY,'scale');
  set('--head-x',c.headX,'px');set('--head-y',c.headY,'px');set('--head-r',c.headR,'deg');set('--head-sx',c.headSX,'scale');set('--head-sy',c.headSY,'scale');
  set('--muzzle-x',c.muzzleX,'px');set('--muzzle-y',c.muzzleY,'px');set('--muzzle-r',c.muzzleR,'deg');set('--muzzle-s',c.muzzleS,'scale');
  set('--ear-l',c.earL,'deg');set('--ear-r',c.earR,'deg');
  set('--arm-lx',c.armLX,'px');set('--arm-ly',c.armLY,'px');set('--arm-lr',c.armLR,'deg');set('--arm-rx',c.armRX,'px');set('--arm-ry',c.armRY,'px');set('--arm-rr',c.armRR,'deg');
  set('--paw-lx',c.pawLX,'px');set('--paw-ly',c.pawLY,'px');set('--paw-lr',c.pawLR,'deg');set('--paw-rx',c.pawRX,'px');set('--paw-ry',c.pawRY,'px');set('--paw-rr',c.pawRR,'deg');set('--tail-r',c.tailR,'deg');set('--tail-s',c.tailS,'scale');
}
function mascotSpringStep(rig,dt){
  const m=rig._mascot;if(!m)return;const stiffness=m.mood==='celebrate'?8.2:m.mood==='guide'?6.8:m.mood==='react'?6.2:4.4,damping=.86;
  for(const key of Object.keys(BETTER_MASCOT_DEFAULTS)){let v=m.velocity[key]||0,cur=m.current[key],target=m.target[key];v+=(target-cur)*stiffness*dt;v*=Math.pow(damping,dt*60);m.current[key]=cur+v*dt*60;m.velocity[key]=v;}
  mascotApply(rig);
}
function mascotReturnHome(rig,delay=0){
  const go=()=>{if(!rig?.isConnected||!rig._mascot)return;rig.dataset.posture='sit';delete rig.dataset.gesture;mascotSetTarget(rig,mascotNeutral(),'idle');rig._mascot.nextIdle=performance.now()+6000+Math.random()*5000;};
  if(delay)setTimeout(go,delay);else go();
}
function mascotIdleSequence(rig,now){
  const m=rig._mascot;if(!m||now<m.nextIdle||now<m.sequenceUntil)return;const token=++m.actionToken;
  const sequences=[
    [{t:0,p:{headR:-4.2,headX:-.8,earL:-3.5,earR:1.2,tailR:3}},{t:1250,p:{headR:2.2,headX:.4,earL:1,earR:-2}},{t:2400,p:mascotNeutral()}],
    [{t:0,p:{torsoY:-.55,torsoSY:1.008,headY:-.75,muzzleY:.18,earL:-1.8,earR:-1.8}},{t:1500,p:mascotNeutral()}],
    [{t:0,p:{tailR:8,headR:1.8}},{t:520,p:{tailR:-5,headR:-1.2}},{t:1040,p:{tailR:5,headR:.8}},{t:1600,p:mascotNeutral()}],
    [{t:0,p:{armLR:34,armLY:-1,pawLY:-1,pawLR:8,headR:-2.5,tailR:6}},{t:850,p:{armLR:18,pawLR:4}},{t:1700,p:mascotNeutral()}],
    [{t:0,p:{rootY:-2.2,torsoY:-1.3,torsoSY:1.026,headY:-1.3,armLY:1.2,armRY:1.2,earL:-3,earR:-3,tailR:5}},{t:1550,p:{rootY:-.8,torsoY:-.4,torsoSY:1.01,headY:-.5}},{t:2500,p:mascotNeutral()}],
    [{t:0,p:{torsoY:.9,torsoSY:.995,headY:.7,muzzleY:.15,earL:2,earR:2}},{t:1700,p:mascotNeutral()}]
  ];
  const seq=sequences[Math.floor(Math.random()*sequences.length)],end=(seq.at(-1)?.t||1800)+350;m.sequenceUntil=now+end;m.mood='idle';
  for(const step of seq)setTimeout(()=>{if(rig.isConnected&&rig._mascot?.actionToken===token&&rig._mascot.mood==='idle')mascotSetTarget(rig,{...mascotNeutral(),...step.p},'idle');},step.t);
  m.nextIdle=now+9000+Math.random()*7000;
}
function mascotLifeFrame(rig,ts){
  if(!rig.isConnected){rig._cleanupMascot?.();return;}const m=rig._mascot;if(!m)return;if(!m.lastTs)m.lastTs=ts;const dt=Math.min(.032,(ts-m.lastTs)/1000||.016);m.lastTs=ts;
  const pointerFresh=m.pointer.last&&performance.now()-m.pointer.last<700,motionLocked=['guide','celebrate','react'].includes(m.mood);
  if(pointerFresh&&!motionLocked){
    const rr=rig.getBoundingClientRect(),dx=m.pointer.x-(rr.left+rr.width/2),dy=m.pointer.y-(rr.top+rr.height/2),dist=Math.hypot(dx,dy),dead=70;
    if(dist>dead){const influence=Math.max(0,1-(dist-dead)/720),gx=Math.max(-1,Math.min(1,dx/430))*influence,gy=Math.max(-1,Math.min(1,dy/360))*influence;m.gaze.x+=(gx-m.gaze.x)*Math.min(1,dt*1.25);m.gaze.y+=(gy-m.gaze.y)*Math.min(1,dt*1.05);mascotSetTarget(rig,{...mascotNeutral(),headX:m.gaze.x*1.35,headY:m.gaze.y*.7,headR:m.gaze.x*3.2,muzzleX:m.gaze.x*.2,muzzleY:m.gaze.y*.12,earL:-m.gaze.x*.8,earR:m.gaze.x*.8,torsoR:m.gaze.x*.35},'watch');}
  } else if(m.mood==='watch'){m.gaze.x*=Math.max(0,1-dt*1.2);m.gaze.y*=Math.max(0,1-dt*1.2);if(Math.abs(m.gaze.x)<.015&&Math.abs(m.gaze.y)<.015)mascotReturnHome(rig);}
  mascotPersistentAwareness(rig,ts);
  if(m.mood==='idle'){
    const breath=Math.sin((ts-m.born)/1500+m.breathPhase);m.target.torsoSY=1+breath*.0035;m.target.torsoY=-breath*.16;m.target.headY=-breath*.09;m.target.muzzleY=breath*.035;mascotIdleSequence(rig,ts);
  }
  mascotSpringStep(rig,dt);rig._lifeRaf=requestAnimationFrame(t=>mascotLifeFrame(rig,t));
}
function mascotPerform(rig,name='ack',duration=1250,side=0){
  if(!rig||rig.classList.contains('motion-off')||!rig._mascot)return;const m=rig._mascot,token=++m.actionToken;m.sequenceUntil=performance.now()+duration+250;
  rig.dataset.gesture=name;
  if(['wave','thumbsup','celebrate'].includes(name)){
    duration=name==='celebrate'?2400:name==='wave'?2100:1900;m.sequenceUntil=performance.now()+duration+250;
    const base=name==='celebrate'?{armLR:78,armRR:-78,headY:-2,tailR:10}:{armLR:82,pawLR:-70,headR:-3,tailR:8};
    const steps=name==='wave'?[{t:0,p:base},{t:650,p:{...base,armLR:104,pawLR:-88}},{t:1100,p:base},{t:1550,p:{...base,armLR:104,pawLR:-88}}]:name==='celebrate'?[{t:0,p:base},{t:600,p:{...base,rootY:-3,armLR:98,armRR:-98,tailR:-10}},{t:1200,p:base},{t:1800,p:{...base,rootY:-3,armLR:98,armRR:-98,tailR:-10}}]:[{t:0,p:base},{t:850,p:{...base,headY:-2,torsoY:-1}}];
    mascotExpression(rig,name==='celebrate'?'joy':'happy',duration+250);
    steps.forEach(step=>setTimeout(()=>{if(rig.isConnected&&m.actionToken===token)mascotSetTarget(rig,{...mascotNeutral(),...step.p},name==='celebrate'?'celebrate':'react');},step.t));
    clearTimeout(m._behaviorTimer);m._behaviorTimer=setTimeout(()=>{if(rig.isConnected&&m.actionToken===token)mascotReturnHome(rig);},duration);return;
  }
  const plans={
    ack:{headY:-1.2,headR:side*2.2,torsoY:-.45,tailR:7,earL:-2,earR:-2},
    curious:{headR:-6,headX:-.8,earL:-5,earR:3,torsoR:-.7},
    paw:{armLR:42,armLY:-1.4,pawLY:-1.4,pawLR:10,headR:-2.5,tailR:7},
    celebrate:{rootY:-1.4,torsoY:-1.4,torsoSY:1.012,headY:-2,earL:-5,earR:-5,armLR:38,armRR:-38,pawLY:-1.8,pawRY:-1.8,pawLR:8,pawRR:-8,tailR:12,tailS:1.03},
    perk:{torsoY:-.8,headY:-1.2,earL:-4,earR:-4,tailR:6},
    stand:{rootY:-2.4,torsoY:-1.5,torsoSY:1.028,headY:-1.4,armLY:1.5,armRY:1.5,pawLY:2.2,pawRY:2.2,earL:-3,earR:-3,tailR:5},
    lean:{torsoR:side*2.6,headR:side*-3.5,headX:side*-.8,rootR:side*.5,tailR:side*-5},
    settle:{torsoY:1.1,torsoSY:.994,headY:.85,muzzleY:.18,earL:2.2,earR:2.2,armLY:.5,armRY:.5}
  };
  const expressions={ack:'happy',curious:'curious',paw:'happy',celebrate:'joy',perk:'alert',stand:'alert',lean:'focused',settle:'sleepy'};mascotExpression(rig,expressions[name]||'content',duration+250);
  rig.dataset.posture=name==='stand'?'stand':name==='settle'?'settle':'sit';mascotSetTarget(rig,{...mascotNeutral(),...(plans[name]||plans.ack)},name==='celebrate'?'celebrate':'react');
  clearTimeout(m._behaviorTimer);m._behaviorTimer=setTimeout(()=>{if(rig.isConnected&&rig._mascot?.actionToken===token)mascotReturnHome(rig);},duration);
}
function playBetterMascotBehavior(rig,kind='ack',duration=1000){if(performance.now()<Number(rig?._mascot?.eventUntil||0)&&kind!=='celebrate')return;const map={wave:'wave',thumbsup:'thumbsup',celebrate:'celebrate',curious:'curious',paw:'paw',tail:'perk',ear:'curious',ack:'ack',stand:'stand',lean:'lean',settle:'settle'};mascotPerform(rig,map[kind]||'ack',duration);}
function wireBetterMascotRig(rig){
  const motionOff=state.user?.settings?.guideAnimations===false||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;mascotSetTarget(rig,mascotNeutral(),'idle');
  if(motionOff){rig.classList.add('motion-off');Object.assign(rig._mascot.current,mascotNeutral());mascotApply(rig);return rig;}
  let lastPointerSample=0;
  const onPointer=e=>{const now=performance.now();if(now-lastPointerSample<45||!rig.isConnected||!rig._mascot)return;lastPointerSample=now;rig._mascot.pointer.x=e.clientX;rig._mascot.pointer.y=e.clientY;rig._mascot.pointer.last=now;};
  const onAction=e=>{if(!rig.isConnected||!rig._mascot||performance.now()<Number(rig._mascot.eventUntil||0)||rig._mascot.mood==='guide'||e.target?.closest?.('.better-guide-trigger'))return;const target=e.target?.closest?.('button,a,[role="button"],input,select,textarea');if(!target)return;const rr=rig.getBoundingClientRect(),tr=target.getBoundingClientRect(),side=Math.sign((tr.left+tr.width/2)-(rr.left+rr.width/2));mascotPerform(rig,'lean',850,side||1);};
  document.addEventListener('pointermove',onPointer,{passive:true});document.addEventListener('pointerdown',onAction,{passive:true});
  rig._cleanupMascot=()=>{document.removeEventListener('pointermove',onPointer);document.removeEventListener('pointerdown',onAction);cancelAnimationFrame(rig._lifeRaf);};rig._lifeRaf=requestAnimationFrame(t=>mascotLifeFrame(rig,t));return rig;
}
function aimBetterMascotAt(rig,target,point=true){
  if(!rig||!target||rig.classList.contains('motion-off')||!rig._mascot)return;const rr=rig.getBoundingClientRect(),tr=target.getBoundingClientRect(),dx=(tr.left+tr.width/2)-(rr.left+rr.width/2),dy=(tr.top+tr.height/2)-(rr.top+rr.height/2),right=dx>=0,nx=Math.max(-1,Math.min(1,dx/420)),ny=Math.max(-1,Math.min(1,dy/340));
  const patch={...mascotNeutral(),headX:nx*1.6,headY:ny*.8,headR:nx*3.8,torsoR:nx*.45,earL:-nx,earR:nx,tailR:-nx*4};
  if(point&&right)Object.assign(patch,{armRR:-58,armRY:-1.2,pawRX:1.8,pawRY:-1.2,pawRR:-12});else if(point)Object.assign(patch,{armLR:58,armLY:-1.2,pawLX:-1.8,pawLY:-1.2,pawLR:12});
  if(performance.now()<Number(rig._mascot.eventUntil||0))return;
  const token=++rig._mascot.actionToken;rig._mascot.sequenceUntil=performance.now()+2200;mascotExpression(rig,'focused',2200);mascotSetTarget(rig,patch,'guide');clearTimeout(rig._guideResetTimer);rig._guideResetTimer=setTimeout(()=>{if(rig.isConnected&&rig._mascot?.actionToken===token)mascotReturnHome(rig);},2050);
}

function renderTop() {
  const brandEl = document.querySelector('.brand');
  if (brandEl && !brandEl.dataset.wired) {
    brandEl.dataset.wired = '1';
    brandEl.onclick = () => go(state.user ? (hasRole(state.user,'affiliate') ? 'affiliate' : 'feed') : 'home');
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
  if(!hasRole(state.user,'affiliate')){
  const inboxBtn = el('button', { class: 'iconbtn', title: 'Messages', onclick: () => go('messages') }, iconSvg('mail',19));
  if (state.unreadCount > 0) inboxBtn.appendChild(el('span', { class: 'msgbadge' }, state.unreadCount > 99 ? '99+' : String(state.unreadCount)));
  nav.appendChild(inboxBtn);
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Boost a listing', onclick: () => go('boostpicker') }, iconSvg('bolt',19)));
  }
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Wallet', onclick: () => go('wallet') }, iconSvg('wallet',19)));
  nav.appendChild(el('button', { class: 'iconbtn topquick', title: 'Quick options', 'aria-label':'Quick options', onclick: () => openQuickOptions() }, iconSvg('grid',19)));
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Search', 'aria-label':'Search', onclick: () => go('search') }, iconSvg('search',19)));
  nav.appendChild(el('button', { onclick: () => go('settings'), class: 'top-settings-btn '+(state.view === 'settings' ? 'active' : ''), title:'Settings' }, [iconSvg('settings',18),el('span',{class:'top-settings-label'},'Settings')]));
  nav.appendChild(el('button', {
    class:'better-guide-trigger',
    title:'Open Better Guide', 'aria-label':'Open Better Guide',
    onpointerenter:e=>{const rig=e.currentTarget.querySelector('.better-mascot-rig'),now=performance.now();if(now-Number(rig._mascot.lastGreeting||-10000)>7000){rig._mascot.lastGreeting=now;playBetterMascotBehavior(rig,'wave',2100);}},
    onclick:e=>{const rig=e.currentTarget.querySelector('.better-mascot-rig');playBetterMascotBehavior(rig,'wave',2100);setTimeout(()=>openBetterGuide(),95);}
  }, el('span',{class:'better-mascot-stage','aria-hidden':'true'},createBetterMascotRig({variant:'header',hidden:true,label:'Better mascot'}))));
}

function renderTabs() {
  const tabs = document.getElementById('tabbar');
  tabs.innerHTML = '';
  if (!state.user) return;
  const items = hasRole(state.user,'affiliate') ? [['affiliate','grid','Affiliate'],['wallet','wallet','Wallet'],['settings','settings','Settings']] : [['feed','home','Feed'], ['shop','shop','Shop'], ['compose','plus','Post'], ['network','network','Network'], ['me','user','Profile']];
  items.forEach(([v, ic, label]) => {
    const active = state.view === v || (v === 'shop' && ['shopitem','sellitem','shopmanage','shopedit'].includes(state.view));
    const icon = el('span', { class: 'ic' }, iconSvg(ic, 21));
    if (v === 'network' && state.friendRequestCount > 0) icon.appendChild(notificationBadge(state.friendRequestCount,'msgbadge tab-msgbadge'));
    if (v === 'me' && Number(state.notificationSummary?.profile||0)>0) icon.appendChild(notificationBadge(state.notificationSummary.profile,'msgbadge tab-msgbadge'));
    tabs.appendChild(el('button', {
      class: active ? 'active' : '', onclick: () => go(v)
    }, [icon, el('span', {}, label)]));
  });
}

async function renderApp() {
  const app = document.getElementById('app');
  if(state.user||!['home','about','faq','upgrade','affiliate'].includes(state.view))window.BetterPixel?.pause();
  app.innerHTML = '';
  const views = {
    home: renderHome, auth: renderAuth, feed: renderFeed, detail: renderDetail,
    compose: renderCompose, saved: renderSaved, messages: renderMessages, chat: renderChat, network: renderNetwork,
    me: renderMe, profile: renderProfile, settings: renderSettings, buybox: renderBuyBox,
    promote: renderPromote, leaderboard: renderLeaderboard, admin: renderAdmin, emailcenter: renderEmailCenter, memberships: renderMemberships,
    wallet: renderWallet, shop: renderShop, shopitem: renderShopItem, sellitem: renderSellItem, shopmanage: renderShopManage, shopedit: renderShopEdit, offers: renderOffers,
    upgrade: renderUpgrade, analytics: renderAnalytics, orders: renderOrders, suppliers: renderSuppliers, fulfilment: renderFulfilment, reports: renderReports,
    boostpicker: renderBoostPicker, workspace: renderWorkspace, companyworkspace: renderCompanyWorkspace, company: renderCompany, companyjoin: renderCompanyJoin, buyerportal: renderBuyerPortal, insights: renderDemandInsights, dealbuilder: renderDealBuilder, buyercrm: renderBuyerCRM, commandcenter: renderCommandCenter, search: renderUniversalSearch, savedsearches: renderSavedSearches, pipeline: renderPipeline, dealcalendar: renderDealCalendar, markethubs: renderMarketHubs, dealroom: renderDealRoom, transactionhub: renderTransactionHub, affiliate: renderAffiliateCenter, intake: renderDealIntake, learn: renderLearnWholesaling,
    about: pageAbout, terms: pageTerms, privacy: pagePrivacy, contact: pageContact, faq: pageFaq,
    forgot: renderForgot, reset: renderReset, verify: renderVerify
  };
  let routeLoadTimer=null;
  try {
    const requestedView = state.view, requestedDetailId = state.detailId, requestedComposeEditId=state.composeEditId||null;
    if (requestedView === 'detail' && state.detailPreview?.id === requestedDetailId) app.appendChild(renderDetailPreview(state.detailPreview));
    else routeLoadTimer=setTimeout(()=>{if(state.view===requestedView&&!app.firstChild)app.appendChild(el('div',{class:'route-loading',role:'status','aria-live':'polite'},[el('span',{class:'loading-wheel','aria-hidden':'true'}),el('span',{},'Loading…')]));},220);
    const rendered = await (views[requestedView] || renderHome)();
    clearTimeout(routeLoadTimer); routeLoadTimer=null;
    // Ignore stale async renders if the user navigated elsewhere while data was loading.
    if (state.view !== requestedView || (requestedView === 'detail' && state.detailId !== requestedDetailId) || (requestedView==='compose'&&(state.composeEditId||null)!==requestedComposeEditId)) return;
    const preserveDetailScroll = requestedView === 'detail' ? window.scrollY : null;
    app.replaceChildren(rendered);
    window.BetterPixel?.update({view:requestedView,signedIn:!!state.user,adMeasurement:state.user?.settings?.adMeasurement});
    if (requestedView === 'detail') {
      state.detailPreview = null;
      if (preserveDetailScroll !== null && preserveDetailScroll > 0) requestAnimationFrame(() => window.scrollTo({ top: preserveDetailScroll, behavior: 'auto' }));
    }
    if(state.user && requestedView==='feed') setTimeout(maybeShowFirstLoginPayoff,80);
  }
  catch (e) {
    if(routeLoadTimer)clearTimeout(routeLoadTimer);
    app.innerHTML='';
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
      el('div', { class: 'homeheronote' }, 'Free to join · No card required')
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
  wrap.appendChild(el('div', { class: 'homewide homesocial' }, [el('span', {}, 'Follow Better'), socialLinksBlock(true)]));

  return wrap;
}
function capability(h, p, n) { return el('div', { class: 'homecap-row' }, [el('span', { class: 'homecap-num' }, n), el('div', {}, [el('b', {}, h), el('small', {}, p)]), el('span', { class: 'homecap-arrow' }, '→')]); }
function proofItem(n, h, p) { return el('div', { class: 'homeproof-item' }, [el('span', {}, n), el('div', {}, [el('h3', {}, h), el('p', {}, p)])]); }
function homeFeature(h, p, tag) { return el('article', { class: 'homefeature' }, [el('div', { class: 'homefeature-tag' }, tag), el('h3', {}, h), el('p', {}, p)]); }
function teamPoint(h, p) { return el('div', { class: 'hometeam-point' }, [el('span', {}, '✓'), el('div', {}, [el('b', {}, h), el('small', {}, p)])]); }

const BETTER_SOCIAL_LINKS = [
  ['Instagram', 'https://www.instagram.com/thebetterrealestate'],
  ['Facebook', 'https://www.facebook.com/share/1CfSN43wRg/?mibextid=wwXIfr'],
  ['TikTok', 'https://www.tiktok.com/@andrewcoxjr?_r=1&_t=ZP-9AFle6a2CjO'],
  ['Founder', 'https://www.facebook.com/share/1DJyGhfC2a/?mibextid=wwXIfr']
];
function socialLinksBlock(compact = false) {
  return el('div', { class: 'sociallinks' + (compact ? ' compact' : '') }, BETTER_SOCIAL_LINKS.map(([label, href]) =>
    el('a', { class: 'sociallink', href, target: '_blank', rel: 'noopener noreferrer', 'aria-label': `${label} — opens in a new tab` }, [
      el('span', { class: 'socialdot', 'aria-hidden': 'true' }, label === 'Instagram' ? '◎' : label === 'TikTok' ? '♪' : label === 'Founder' ? 'F' : 'f'),
      el('span', {}, label)
    ])
  ));
}

/* ================= AUTH ================= */
function renderAuth() {
  const wrap = el('div', { class: 'panel' });
  const isSignup = state.authMode === 'signup';
  wrap.appendChild(el('h2', {}, isSignup ? 'Create your account' : 'Welcome back'));
  wrap.appendChild(el('div', { class: 'sub' }, state.companyInviteToken ? (isSignup ? 'Create your account to join your company workspace.' : 'Sign in with the email that received your company invitation.') : (isSignup ? `Free to join. No card required.${state.pricing?.signupTrialDays ? ` New accounts also get ${state.pricing.signupTrialDays} days of full access.` : ''}` : 'Sign in to continue.')));

  let roles = isSignup && state.postAuthTarget?.view === 'affiliate' ? ['affiliate'] : [];
  const name = el('input', { placeholder: 'Jordan Alvarez' });
  const email = el('input', { type: 'text', autocomplete: 'username', placeholder: isSignup ? 'you@email.com' : 'Email or @username' });
  const pass = el('input', { type: 'password', placeholder: isSignup ? 'At least 6 characters' : 'Your password' });
  const ref = el('input', { placeholder: 'Optional', value: state.pendingReferral || '' });
  const err = el('div', { class: 'errmsg' });

  if (isSignup) {
    wrap.appendChild(el('label', {}, "How do you work in real estate?"));
    const rolePicker = buildRoleSelector(roles, next => { roles = next; });
    wrap.appendChild(rolePicker.element);
    wrap.appendChild(el('div', { class: 'hint' }, 'Choose all that apply for real estate, or choose Marketing / Affiliate only to keep your account separate from Network. Affiliate links require application approval.'));
    wrap.appendChild(el('label', {}, 'Name')); wrap.appendChild(name);
  }
  wrap.appendChild(el('label', {}, 'Email')); wrap.appendChild(email);
  wrap.appendChild(el('label', {}, 'Password')); wrap.appendChild(pass);
  if (isSignup) {
    wrap.appendChild(el('label', {}, 'Referral code')); wrap.appendChild(ref);
  }
  wrap.appendChild(err);

  const submit = el('button', { class: 'submitbtn' }, isSignup ? 'Create account' : 'Sign in');
  submit.onclick = async () => {
    err.textContent = '';
    try {
      await withButtonBusy(submit, async () => {
      if (isSignup && !roles.length) throw new Error('Choose at least one role.');
      const payload = isSignup
        ? { name: name.value.trim(), email: email.value.trim(), password: pass.value, role: roles[0], roles, referralCode: ref.value.trim(), affiliateCode: state.pendingAffiliate || '', marketingOptIn: true }
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
      } else go(hasRole(state.user,'affiliate') ? 'affiliate' : 'feed');
      });
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
  if (isSignup && !state.companyInviteToken) wrap.appendChild(el('div', { class: 'authsocial' }, [el('span', {}, 'Follow Better'), socialLinksBlock(true)]));
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
  wrap.appendChild(el('div', { class: 'feedhead' }, [
    el('div',{class:'feedmode'},[el('button',{class:state.feedMode==='for-you'?'active':'',onclick:()=>{state.feedMode='for-you';render();}},'For You'),el('button',{class:state.feedMode==='following'?'active':'',onclick:()=>{state.feedMode='following';render();}},'Following')]),
    el('div', {class:'feedtools'}, [el('button', { class: 'filterbtn', onclick: () => go('search') }, 'Search'),el('button', { class: 'filterbtn', onclick: () => go('saved') }, 'Liked'),el('button', { class: 'filterbtn', onclick: () => go('savedsearches') }, 'Deal alerts')])
  ]));
  const { feed, access, dashboard: dash } = await api('GET', '/api/feed?mode='+encodeURIComponent(state.feedMode));
  state.access = access || state.access;
  if(dash) wrap.insertBefore(el('div',{class:'feedcommand'},[el('div',{class:'feedcommand-stats'},[miniMetric(dash.matched,'Market matches'),miniMetric(dash.buyerMatches,'Buyer matches'),miniMetric(dash.pendingOffers,'Pending offers'),miniMetric(dash.upcoming?new Date(dash.upcoming.at).toLocaleDateString():'—','Next deadline')]) ]), wrap.firstChild);
  if (!feed.length) {
    wrap.appendChild(el('div', { class: 'empty' }, [
      el('h3', {}, state.feedMode==='following'?'Your network is quiet. For now.':'Quiet in here. Let’s fix that.'),
      el('p', {}, state.feedMode==='following'?'Follow active real estate people or switch to For You to discover deals.':'Post the first property and give buyers something worth opening Better for.'),
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
  imgEl.onclick = () => openListingDetail(l, idx);

  const specs = [];
  if (l.beds) specs.push(l.beds + ' bd');
  if (l.baths) specs.push(l.baths + ' ba');
  if (l.sqft) specs.push(l.sqft.toLocaleString() + ' sqft');
  if (l.year) specs.push('Built ' + l.year);
  specs.push(l.propertyType);

  const saveBtn = el('button', { class: l.savedByMe ? 'saved' : '' }, l.savedByMe ? '♥ Saved' : '♡ Save');
  saveBtn.onclick = async e => {
    e.stopPropagation();
    try {
      await withButtonBusy(saveBtn, async () => {
        const { saved } = await api('POST', '/api/saves/toggle', { listingId: l.id });
        saveBtn.className = saved ? 'saved heartpop' : 'heartpop';
        saveBtn.textContent = saved ? '♥ Saved' : '♡ Save';
        setTimeout(() => saveBtn.classList.remove('heartpop'), 400);
        if (saved) toast('Saved to your list', 'ok');
      });
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
      l.momentum?.label ? el('div',{class:'deal-momentum '+(l.momentum.level||'quiet')},[el('span',{class:'momentum-dot'},''),el('b',{},l.momentum.label),el('span',{},l.momentum.detail||'')]) : null,
      el('div', { class: 'actions' }, [
        saveBtn,
        el('button', { onclick: e => { e.stopPropagation(); openPropertyShare(l); } }, 'Share'),
        el('button', { title:'Hide this property and improve recommendations', onclick: async e => { e.stopPropagation(); await api('POST','/api/feed/feedback',{listingId:l.id,kind:'hide'}); toast('Hidden from your feed','ok'); render(); } }, 'Not interested'),
        el('button', { class: 'primary', onclick: e => { e.stopPropagation(); openListingDetail(l, idx); } }, l.locked ? '🔒 Unlock' : 'View details')
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
function propertyShareCaption(listing) {
  const locationLabel = [listing.city, listing.state].filter(Boolean).join(', ') || listing.city || 'Investment property';
  const lines = [`Investment Opportunity — ${locationLabel}`];
  if (Number(listing.asking) > 0) lines.push(`Asking Price: ${money(listing.asking)}`);
  if (Number(listing.arv) > 0) lines.push(`Estimated ARV: ${money(listing.arv)}`);
  if (listing.rehab !== null && listing.rehab !== undefined && Number(listing.rehab) > 0) lines.push(`Estimated Repairs: ${money(listing.rehab)}`);
  const specs = [listing.beds ? `${listing.beds} Beds` : '', listing.baths ? `${listing.baths} Baths` : '', listing.sqft ? `${Number(listing.sqft).toLocaleString()} Sq Ft` : ''].filter(Boolean);
  if (specs.length) lines.push(specs.join(' | '));
  if (listing.propertyType) lines.push(`Property Type: ${listing.propertyType}`);
  if (listing.contractDeadline) lines.push(`Deal Deadline: ${listing.contractDeadline}`);
  lines.push('', 'Looking to connect with buyers interested in this property. View the full deal, photos, property information, and connect directly through Better Real Estate.', '', shareUrl('property', listing.id));
  return lines.join('\n');
}
function openPropertyShare(listing) {
  const caption = propertyShareCaption(listing);
  const url = shareUrl('property', listing.id);
  const overlay = el('div', { class:'property-share-overlay', onclick:e=>{ if(e.target===overlay) overlay.remove(); } });
  const text = el('textarea', { class:'property-share-copy', readonly:'readonly', rows:'12' }); text.value = caption;
  const card = el('div', { class:'property-share-card', role:'dialog', 'aria-modal':'true', 'aria-label':'Share property' }, [
    el('div',{class:'property-share-head'},[el('div',{},[el('div',{class:'eyebrow'},'READY TO POST'),el('h3',{},'Share this property'),el('p',{class:'hint'},'A professional post is prepared from this listing’s actual information. Edit it after pasting anywhere you share deals.')]),el('button',{class:'property-share-close','aria-label':'Close',onclick:()=>overlay.remove()},'×')]),
    text
  ]);
  const actions=el('div',{class:'property-share-actions'});
  actions.appendChild(el('button',{class:'btn-primary',onclick:async()=>{await copyTextValue(caption,'Property post copied');trackShare('property',listing.id,'caption-copy');}},'Copy ready-to-post caption'));
  actions.appendChild(el('button',{class:'btn-ghost',onclick:async()=>{if(navigator.share){try{await navigator.share({title:`${locationLabelForShare(listing)} property on Better Real Estate`,text:caption,url});trackShare('property',listing.id,'native');return;}catch(e){if(e?.name==='AbortError')return;}}await copyTextValue(caption,'Property post copied');}},'Open share sheet'));
  [['Facebook','facebook'],['LinkedIn','linkedin'],['X','x']].forEach(([label,ch])=>actions.appendChild(el('button',{class:'btn-ghost',onclick:async()=>{await copyTextValue(caption,'Post copied — paste it into '+label);socialShareWindow(ch,'property',listing.id,`${locationLabelForShare(listing)} property on Better Real Estate`,caption);}},label)));
  card.appendChild(actions); card.appendChild(el('div',{class:'property-share-note'},'The direct link opens this exact property so interested people can view the deal and connect on Better Real Estate.'));
  overlay.appendChild(card); document.body.appendChild(overlay); text.focus(); text.select();
}
function locationLabelForShare(listing) { return [listing.city, listing.state].filter(Boolean).join(', ') || listing.city || 'Investment'; }
function propertyShareBar(listing) {
  const bar=el('div',{class:'property-share-bar'},[el('div',{},[el('b',{},'Share this deal'),el('span',{},'Ready-to-post property copy and a direct listing link.')])]);
  bar.appendChild(el('button',{class:'btn-primary',onclick:()=>openPropertyShare(listing)},'Prepare post'));
  bar.appendChild(el('button',{class:'btn-ghost',onclick:async()=>{await copyTextValue(shareUrl('property',listing.id),'Property link copied');trackShare('property',listing.id,'copy');}},'Copy link'));
  return bar;
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



function downloadDealCard(pack, listing) {
  const c=document.createElement('canvas');c.width=1080;c.height=1350;const x=c.getContext('2d');
  x.fillStyle='#0a0a0b';x.fillRect(0,0,1080,1350);x.fillStyle='#f4b51c';x.fillRect(0,0,16,1350);
  x.fillStyle='#fff';x.font='700 40px Arial';x.fillText('BetterRealEstate',70,92);x.fillStyle='#f4b51c';x.font='700 24px Arial';x.fillText('OFF-MARKET OPPORTUNITY',70,145);
  x.fillStyle='#fff';x.font='700 60px Arial';const title=(pack.flyer?.headline||listing.address||listing.city||'Property opportunity').slice(0,32);x.fillText(title,70,290);
  x.fillStyle='#bbb';x.font='500 32px Arial';x.fillText(String(listing.city||''),70,350);
  x.fillStyle='#f4b51c';x.font='800 62px Arial';x.fillText(money(listing.asking||0),70,470);
  x.strokeStyle='#343434';x.lineWidth=2;x.strokeRect(70,545,940,430);x.fillStyle='#fff';x.font='600 31px Arial';let y=620;
  const facts=[...(pack.flyer?.facts||[])]; if(listing.beds)facts.push(`${listing.beds} beds`);if(listing.baths)facts.push(`${listing.baths} baths`);if(listing.sqft)facts.push(`${Number(listing.sqft).toLocaleString()} sqft`);
  [...new Set(facts)].slice(0,6).forEach(f=>{x.fillText('• '+String(f).slice(0,52),105,y);y+=58;});
  x.fillStyle='#fff';x.font='700 34px Arial';x.fillText('View the full deal on Better',70,1130);x.fillStyle='#f4b51c';x.font='700 32px Arial';x.fillText('BetterRealEstate.org',70,1190);x.fillStyle='#888';x.font='500 22px Arial';x.fillText('Property information provided by the listing owner.',70,1260);
  const a=document.createElement('a');a.download=`better-deal-${String(listing.city||'property').toLowerCase().replace(/[^a-z0-9]+/g,'-')}.png`;a.href=c.toDataURL('image/png');a.click();
}

function dealMilestones(current='intake') {
  const map={intake:0,marketing:0,'buyer-interest':1,negotiation:2,title:3,closing:4,closed:5,'on-hold':-1};
  const steps=['Posted','Buyer interest','Connected','Negotiating','Under contract','Closed'];
  const n=map[current] ?? 0;
  return el('div',{class:'deal-milestones'},steps.map((x,i)=>el('div',{class:'deal-milestone '+(i<n?'done':i===n?'current':'')},[el('span',{},i<n?'✓':String(i+1)),el('small',{},x)])));
}
function showClosingCelebration(listing) {
  const o=el('div',{class:'closing-celebration'},el('div',{class:'closing-card'},[
    el('button',{class:'closing-x',onclick:()=>o.remove()},'×'),el('div',{class:'closing-mark'},'✓'),
    el('div',{class:'eyebrow'},'DEAL CLOSED'),el('h2',{},'That one moved.'),
    el('p',{},`${listing.address || listing.city} made it across the finish line.`),
    el('button',{class:'btn-primary',onclick:()=>{o.remove();downloadStoryCard({flyer:{headline:'DEAL CLOSED',facts:[listing.city||'',money(listing.asking||0),'BetterRealEstate.org']},url:shareUrl('property',listing.id)},listing);}},'Create closing share card'),
    el('button',{class:'btn-ghost',onclick:()=>o.remove()},'Back to the deal')
  ])); document.body.appendChild(o);
}
async function maybeShowFirstLoginPayoff() {
  if(!state.user || state.user.settings?.firstLookCompleted) return;
  try { const d=await api('GET','/api/onboarding/first-look'); if(d.complete) return;
    const o=el('div',{class:'first-look-overlay'}), card=el('div',{class:'first-look-card'});let markets=[...(state.user.investmentMarkets||[])];
    card.append(el('div',{class:'eyebrow'},'MAKE BETTER YOURS'),el('h2',{},'Tell Better where you work.'),el('p',{class:'sub'},'Choose your markets so your first feed, people and buyer matches start relevant.'));
    card.appendChild(statePicker(markets,x=>markets=x));
    const btn=el('button',{class:'btn-primary'},'Show me my Better');btn.onclick=async()=>{try{await withButtonBusy(btn,async()=>{if(markets.length)await api('PATCH','/api/me/markets',{states:markets});await api('POST','/api/onboarding/first-look/complete',{});state.user.settings={...(state.user.settings||{}),firstLookCompleted:true};o.remove();const r=await api('GET','/api/onboarding/first-look');if(r.matches||r.people||r.deals)toast(`Ready: ${r.deals||0} relevant deals · ${r.people||0} people · ${r.matches||0} buyer matches`,'ok');render();});}catch(e){toast(e.message,'err')}};card.appendChild(btn);o.appendChild(card);document.body.appendChild(o);
  } catch {}
}

/* ================= DETAIL ================= */
async function renderDetail() {
  if (!state.detailId) throw new Error('This property link is missing its listing ID. Return to the feed and open it again.');
  const d = await api('GET', '/api/listings/' + encodeURIComponent(state.detailId));
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
      t.onclick = () => {
        state.photoIdx = i;
        main.replaceChildren(el('img', { src: p }));
        th.querySelectorAll('img').forEach((img, idx) => img.classList.toggle('on', idx === i));
        writeRoute('replace');
      };
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
  wrap.appendChild(propertyShareBar(listing));
  if (state.user && state.user.id === listing.ownerId) {
    const intelligenceSlot=el('div',{class:'buyer-match-slot'}); wrap.appendChild(intelligenceSlot);
    api('GET','/api/listings/'+encodeURIComponent(listing.id)+'/network-intelligence').then(ni=>{
      if(state.view!=='detail'||state.detailId!==listing.id||!intelligenceSlot.isConnected||ni.matchCount<=0)return;
      intelligenceSlot.replaceChildren(el('div',{class:'buyer-match-moment'},[el('div',{},[el('div',{class:'eyebrow'},'BUYER MATCH'),el('h3',{},ni.matchCount===1?'You may have found your buyer.':`You may have found ${ni.matchCount} buyers.`),el('p',{},ni.summary)]),el('button',{class:'btn-primary',onclick:()=>go('network',{networkTab:'buyers'})},'Review matches')]));
    }).catch(()=>{});
  }

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
          el('div', { class: 'dnotes' }, 'Exact address, seller notes, phone number and email are hidden until you unlock this listing. Sellers on Better Real Estate share direct contact so you can negotiate without a middleman.'),
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
      try {
        await withButtonBusy(followBtn, async () => {
          const { following } = await api('POST', '/api/follow', { userId: owner.id });
          followBtn.textContent = following ? 'Following' : 'Follow'; followBtn.className = following ? 'following' : '';
        });
      } catch (e) { toast(e.message, 'err'); }
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
    wrap.appendChild(el('div',{class:'dsection owner-ops'},[el('h3',{},'Deal operations'),el('div',{class:'owner-ops-actions'},[el('button',{class:'btn-primary',onclick:()=>go('compose',{composeEditId:listing.id})},'Edit property'),el('button',{class:'btn-primary',onclick:()=>go('dealroom',{detailId:listing.id})},'Open deal room'),el('button',{class:'btn-ghost',onclick:async()=>{await api('POST','/api/pipeline',{listingId:listing.id,title:listing.address,stage:'dispo'});toast('Added to pipeline','ok');go('pipeline');}},'Add to pipeline'),el('button',{class:'btn-ghost',onclick:()=>go('analytics',{detailId:listing.id})},'Listing analytics')]) ]));
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
            if (sh.canManage) actions.push(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm('Remove this showing time?'))return;try{await api('DELETE',`/api/listings/${listing.id}/showings/${slot.id}`);const fresh=await api('GET',`/api/listings/${listing.id}/showings`);drawSlots((fresh.slots||[]).filter(x=>new Date(x.at)>new Date()));toast('Showing window removed','ok');}catch(e){toast(e.message,'err')}}},'Remove'));
            else if (!slot.booked) actions.push(el('button',{class:'btn-primary compactbtn',onclick:async()=>{try{await api('POST',`/api/listings/${listing.id}/showings/${slot.id}/book`);const fresh=await api('GET',`/api/listings/${listing.id}/showings`);drawSlots((fresh.slots||[]).filter(x=>new Date(x.at)>new Date()));toast('Showing reserved','ok');}catch(e){toast(e.message,'err')}}},'Reserve'));
            list.appendChild(el('div',{class:'showingrow'},[el('div',{class:'grow'},[el('b',{},when),slot.note?el('div',{class:'hint'},slot.note):null,slot.booked?el('div',{class:'hint'},sh.canManage ? `Reserved${slot.bookedName ? ' by '+slot.bookedName : ''}` : 'Reserved'):null]),...actions]));
          });
        };
        drawSlots(future); sec.appendChild(list);
        if (sh.canManage) {
          const toggle=el('button',{class:'btn-ghost compactbtn showing-toggle'},'+ Add access window');
          const dt=el('input',{type:'datetime-local'}), note=el('input',{placeholder:'Access note (optional)'}), add=el('button',{class:'btn-primary'},'Add window');
          const form=el('div',{class:'showingadd is-collapsed'},[dt,note,add]);
          toggle.onclick=()=>{const open=form.classList.toggle('is-open');form.classList.toggle('is-collapsed',!open);toggle.textContent=open?'Cancel':'+ Add access window';if(open)dt.focus();};
          add.onclick=async()=>{try{if(!dt.value)throw new Error('Choose a date and time.');await withButtonBusy(add,async()=>{await api('POST','/api/listings/'+listing.id+'/showings',{at:new Date(dt.value).toISOString(),note:note.value});const fresh=await api('GET',`/api/listings/${listing.id}/showings`);drawSlots((fresh.slots||[]).filter(x=>new Date(x.at)>new Date()));dt.value='';note.value='';form.classList.remove('is-open');form.classList.add('is-collapsed');toggle.textContent='+ Add access window';toast('Showing window added','ok');});}catch(e){toast(e.message,'err')}};
          sec.appendChild(el('div',{class:'showing-actions'},toggle));
          sec.appendChild(form);
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
      save.onclick=async()=>{try{const was=room.stage;await withButtonBusy(save,()=>api('PATCH','/api/listings/'+listing.id+'/deal-room',{stage:stage.value,nextAction:next.value,privateNotes:notes.value,tasks}));toast('Deal room saved','ok');if(stage.value!==was){if(stage.value==='closed'){mascotSiteEvent('closed');showClosingCelebration(listing);}else if(['title','closing'].includes(stage.value))mascotSiteEvent('undercontract');else mascotSiteEvent('dealprogress');}}catch(e){toast(e.message,'err')}};
      command.appendChild(dealMilestones(room.stage));
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
      grid.appendChild(el('button', { class: 'distbtn', onclick: () => downloadDealCard(pack, listing) }, [el('b', {}, 'Shareable deal card'), el('span', {}, 'Download 4:5 feed PNG') ]));
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
  wrap.appendChild(el('div', { class: 'sub' }, 'Your account stays free. Browse the feed anytime, and upgrade only when you want more unlocks or the full toolkit.'));

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
      key: 'free', name: 'Free', tagline: 'Free account · includes 7 days of full access',
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

/* ================= BETTER GUIDE + LEARNING ================= */

const BETTER_GUIDE_COURSE = [
  {
    slug:'foundations', number:1, title:'Wholesaling Foundations', stage:'START HERE',
    goal:'Understand the wholesaling workflow and set up Better so every lesson has somewhere useful to go.',
    overview:[
      'Wholesaling is a deal-sourcing and contract-based real estate strategy. The exact legal requirements, disclosures, licensing rules and permitted transaction structures vary by state, so Better teaches the operating workflow without pretending one legal rule fits every market.',
      'Your job is to identify a real opportunity, understand the property and seller situation, build a defensible deal, connect it with a qualified buyer, and keep the transaction organized through closing.'
    ],
    better:[
      'Complete your Better profile and choose every role that actually applies to you so the Network can represent what you do.',
      'Set your investment markets in Settings. Better uses those states as relevance signals without hiding opportunities elsewhere.',
      'Use the Better Guide whenever a feature is unfamiliar instead of leaving the workflow to hunt through disconnected tools.'
    ],
    action:{view:'settings',label:'Set up my Better account'},
    quiz:{q:'What should you do before treating a wholesaling rule as universal?',options:['Use the same rule in every state','Check the requirements for the market and transaction structure','Assume a buyer will handle it'],correct:1,explain:'Correct. Real-estate rules differ by jurisdiction. Better can organize the workflow, but local legal requirements still matter.'}
  },
  {
    slug:'market', number:2, title:'Choose a Market', stage:'BUILD YOUR FOCUS',
    goal:'Create a repeatable market focus instead of chasing random properties everywhere.',
    overview:[
      'A focused market makes it easier to learn pricing, buyer behavior, neighborhoods, title practices and common property types. You can expand later after your process is repeatable.',
      'Look for enough transaction activity to support real comparable sales and enough investor demand that you can build relationships instead of starting from zero on every deal.'
    ],
    better:[
      'Add the states you actually work in under Settings → Investment markets.',
      'Use Market Hubs to observe real Better activity where available. Do not mistake missing Better activity for proof that a market itself has no demand.',
      'Create Buy Boxes for the kinds of properties you or your buyers actually want so Better can use those criteria throughout the network.'
    ],
    action:{view:'markethubs',label:'Open Market Hubs'},
    quiz:{q:'Why start with a focused market?',options:['It guarantees every deal will sell','It helps you learn pricing, buyers and process deeply enough to repeat it','It removes the need for due diligence'],correct:1,explain:'Exactly. Focus improves pattern recognition and relationships; it does not guarantee a deal.'}
  },
  {
    slug:'opportunities', number:3, title:'Find Real Opportunities', stage:'SOURCE DEALS',
    goal:'Build an opportunity pipeline that is based on real seller/property information, not hype.',
    overview:[
      'A lead is not a deal. Start by collecting enough information to understand the property, seller goals, timing and any obvious transaction constraints.',
      'Use ethical outreach and accurate representations. Avoid presenting yourself, your authority, or a property in a way that is not true.'
    ],
    better:[
      'Use Deal Intake when you want a clean way to collect opportunity information.',
      'Add opportunities to Deal Pipeline early so follow-ups, deadlines and status do not live only in your head.',
      'When you already have deal notes, Better can help structure them into the rest of the workflow without inventing missing facts.'
    ],
    action:{view:'intake',label:'Open Deal Intake'},
    quiz:{q:'When does a lead become worth deeper analysis?',options:['As soon as you have an address','When you have enough real information to evaluate the opportunity','When someone says it is a great deal'],correct:1,explain:'Right. Better should help organize evidence, not replace missing facts with confidence.'}
  },
  {
    slug:'seller', number:4, title:'Seller Discovery', stage:'UNDERSTAND THE DEAL',
    goal:'Learn what matters to the seller while capturing the facts you need to evaluate the opportunity.',
    overview:[
      'Good seller conversations are discovery, not pressure. Understand condition, occupancy, timing, liens or known title issues, the seller’s priorities, and what outcome they are trying to achieve.',
      'Do not promise a closing, price, or buyer outcome you cannot support. Write down what you learn so the next decision is based on the same facts.'
    ],
    better:[
      'Keep opportunity notes and follow-ups in Deal Pipeline rather than scattering them across texts and spreadsheets.',
      'Use Deal Calendar for inspection dates, callbacks, offer expirations and closing-related deadlines.',
      'Use private Deal Rooms when a listing-linked transaction needs documents, offers and deal conversation in one place.'
    ],
    action:{view:'pipeline',label:'Open Deal Pipeline'},
    quiz:{q:'What is the purpose of the seller conversation?',options:['Pressure the seller into accepting quickly','Collect the facts, priorities and constraints needed to evaluate a real solution','Avoid writing anything down'],correct:1,explain:'Correct. Better decisions start with accurate discovery and an organized record.'}
  },
  {
    slug:'analysis', number:5, title:'Analyze the Property', stage:'RUN THE NUMBERS',
    goal:'Use Better Deal Intelligence to separate property evidence, sold comps, repairs and deal math instead of guessing.',
    overview:[
      'Start with property identity and facts before valuation. Beds, baths, square footage, property type and parcel identity should not be treated as verified when credible sources conflict.',
      'ARV is only as useful as the subject match and comparable sales supporting it. Repair planning should be explicit enough that changing the scope changes the economics instead of hiding inside one magic number.'
    ],
    better:[
      'Open AI Deal Builder / Deal Intelligence with the exact property address.',
      'Review Property Evidence and conflicts before relying on valuation. Better intentionally withholds unsupported facts rather than fabricating precision.',
      'Review sold comps, ARV confidence, repair planning, MAO and spread together. The AI explanation should interpret grounded numbers, not invent them.'
    ],
    action:{view:'dealbuilder',label:'Analyze a property in Better'},
    quiz:{q:'What should come before a precise ARV?',options:['A confident-sounding AI paragraph','Verified property identity and credible sold-comp evidence','A seller asking price'],correct:1,explain:'Correct. Better’s property-truth rules intentionally put identity and evidence before valuation precision.'}
  },
  {
    slug:'offer', number:6, title:'Build the Offer', stage:'MAKE A DECISION',
    goal:'Turn the analysis into an offer you can explain rather than a number you hope works.',
    overview:[
      'Your offer should reflect the property, repair assumptions, transaction costs, desired margin, buyer reality and the structure you are actually using.',
      'A formula is a decision aid, not permission to ignore uncertainty. If the property facts or comps are weak, the offer process needs more diligence, not fake precision.'
    ],
    better:[
      'Use Deal Intelligence to keep ARV, repair range, MAO and spread visible together.',
      'Save the opportunity to Pipeline so the offer, follow-up and deadlines stay connected to the deal.',
      'Use Deal Calendar for offer expiration or seller follow-up instead of relying on memory.'
    ],
    action:{view:'dealbuilder',label:'Review deal math'},
    quiz:{q:'If the property evidence is weak, what is the best next step?',options:['Increase confidence so the seller accepts','Do more diligence and treat the numbers as uncertain','Ignore the comp set'],correct:1,explain:'Exactly. Uncertainty should be visible and handled, not hidden.'}
  },
  {
    slug:'contracts', number:7, title:'Contracts & Due Diligence', stage:'CONTROL THE WORKFLOW',
    goal:'Understand what needs to be tracked once an opportunity moves toward contract.',
    overview:[
      'Contracts create real obligations. Assignment, marketing, disclosure, earnest-money, inspection and cancellation rules can differ by state and agreement, so use appropriate local legal or title guidance when needed.',
      'Operationally, your job is to keep the agreement, deadlines, access, title work and communications organized so nothing critical disappears in a text thread.'
    ],
    better:[
      'Move the opportunity to the correct Pipeline stage instead of leaving it marked as a lead.',
      'Use Deal Room for the private transaction conversation and document workflow on listing-linked deals.',
      'Put material dates in Deal Calendar and use Transaction Hub for tasks, contacts, credentials and closing outcomes.'
    ],
    action:{view:'transactionhub',label:'Open Transaction Hub'},
    quiz:{q:'What should Better replace in this stage?',options:['Local legal advice','Scattered tracking of tasks, contacts, dates and deal communication','The signed agreement itself'],correct:1,explain:'Right. Better is the operating layer; it does not replace required legal documents or professional advice.'}
  },
  {
    slug:'buyers', number:8, title:'Build Your Buyer Network', stage:'BUILD DEMAND',
    goal:'Stop rebuilding a buyer list from scratch every time you get a property.',
    overview:[
      'A buyer list is strongest when you know what each buyer actually wants, where they buy, their strategy and whether they can perform.',
      'The goal is not the biggest contact list. It is a useful network with criteria you can match against real opportunities.'
    ],
    better:[
      'Use Network to find wholesalers, investors, buyers and funders by their real profile roles.',
      'Use public Buy Boxes where available to understand stated criteria, and create your own Buy Box so others can understand yours.',
      'Keep private buyer notes and relationship status in Buyer CRM. Better buyer matching must use actual criteria — never an invented buyer count.'
    ],
    action:{view:'network',label:'Build my Better network'},
    quiz:{q:'What makes a buyer list useful?',options:['Having the most names possible','Knowing real criteria and keeping relationships organized','Sending every deal to everyone'],correct:1,explain:'Correct. Relevant criteria and relationships beat a giant unqualified list.'}
  },
  {
    slug:'dispo', number:9, title:'Dispositions in Better', stage:'MARKET THE DEAL',
    goal:'Package and distribute a real opportunity clearly enough that qualified buyers can evaluate it.',
    overview:[
      'Good dispositions starts with accuracy. Present the property, asking price, known condition, access process, material deal terms and supporting information without inventing certainty.',
      'Make it easy for buyers to understand the opportunity and take the next step. Track interest instead of losing it across posts and DMs.'
    ],
    better:[
      'Post the property to Better once the information is ready for distribution.',
      'Use Better Dispo to structure the listing and create channel-ready distribution material from the real deal data.',
      'Use the property page, buyer matching, sharing and Messages to move interested people into an organized conversation.'
    ],
    action:{view:'compose',label:'Post a property in Better'},
    quiz:{q:'What should Better Dispo never do?',options:['Organize real property information','Create distribution assets','Invent missing deal facts to make a listing look stronger'],correct:2,explain:'Exactly. Distribution should make a real deal clearer, not make up a better one.'}
  },
  {
    slug:'buyer-management', number:10, title:'Manage Buyer Interest', stage:'MOVE THE DEAL',
    goal:'Turn interest into an organized process with communication, offers and follow-up.',
    overview:[
      'Once buyers respond, speed matters, but organization matters too. Track who is interested, what they asked for, whether they submitted an offer, and what still needs to happen.',
      'Keep material information consistent across buyers. If something about the property changes, update the source information instead of letting different versions circulate.'
    ],
    better:[
      'Use Messages for direct conversation and Buyer CRM for private relationship notes and follow-up status.',
      'Use Deal Rooms for listing-linked offers, files and transaction conversation.',
      'Use Pipeline and Command Center to keep the real next action visible without fabricating activity.'
    ],
    action:{view:'buyercrm',label:'Open Buyer CRM'},
    quiz:{q:'What is the goal after buyer interest appears?',options:['Send different facts to each buyer','Track the conversation, offers and next actions consistently','Stop updating the property'],correct:1,explain:'Correct. The system should make the deal easier to follow, not create competing versions of the truth.'}
  },
  {
    slug:'closing', number:11, title:'From Contract to Closing', stage:'FINISH THE DEAL',
    goal:'Keep the transaction moving through title, tasks, documents, deadlines and final outcome.',
    overview:[
      'Closing requires coordination. Title or settlement work, document requests, buyer/seller communication, access and deadlines all need a clear owner.',
      'Problems should become explicit tasks and conversations rather than surprises discovered at the end.'
    ],
    better:[
      'Use Transaction Hub for task/checklist work, contacts, credentials and closing outcome confirmation.',
      'Use Deal Calendar for material dates and Deal Room for the transaction’s private working space.',
      'When the deal is actually closed, record the real outcome. Better Moments and activity should only celebrate events that truly happened.'
    ],
    action:{view:'transactionhub',label:'Manage a transaction'},
    quiz:{q:'When should Better mark or celebrate a closing?',options:['When a buyer says they are interested','Only when the real closing outcome is confirmed','As soon as the property is posted'],correct:1,explain:'Correct. Better’s milestones and moments must stay grounded in real activity.'}
  },
  {
    slug:'repeat', number:12, title:'Build a Repeatable Business', stage:'DO IT AGAIN, BETTER',
    goal:'Turn your first complete workflow into a process you can repeat without adding chaos.',
    overview:[
      'The point of a system is not to create more tabs. It is to make the next opportunity easier to source, analyze, distribute and close because your relationships and workflow already live somewhere useful.',
      'Review what actually produced results: where the opportunity came from, which buyers responded, where the deal slowed down, and what information was missing.'
    ],
    better:[
      'Keep your profile, markets, Buy Boxes, Network and Buyer CRM current so future opportunities start with context.',
      'Use Pipeline, Command Center, Saved Searches, Deal Alerts and Market Hubs as the operating layer instead of rebuilding the process in separate spreadsheets and group chats.',
      'Use Better Guide for feature help and advanced member guidance while keeping the free course available whenever you want to revisit the fundamentals.'
    ],
    action:{view:'commandcenter',label:'Open Command Center'},
    quiz:{q:'What should make the second deal easier than the first?',options:['More disconnected tools','A repeatable Better workflow with retained relationships, criteria and deal organization','Skipping analysis'],correct:1,explain:'That’s the idea. Better should become the operating home for the process, not another place you have to duplicate it.'}
  }
];

const BETTER_GUIDE_HELP = [
  {terms:'post property listing sell deal',title:'Post a property',copy:'Start from Post. Build the listing manually, import existing deal notes, or begin from Deal Intelligence.',view:'compose'},
  {terms:'arv comps repair mao deal intelligence analysis',title:'Understand Deal Intelligence',copy:'Better verifies the subject property and evidence first, then shows sold comps, ARV confidence, repair planning and deal math.',view:'dealbuilder'},
  {terms:'buyer buyers network connections investor wholesaler lender funder',title:'Find buyers and build your network',copy:'Use Network, public Buy Boxes and Buyer CRM to build real relationships and criteria.',view:'network'},
  {terms:'pipeline crm follow up lead stages',title:'Organize a deal',copy:'Use Deal Pipeline for deal stages and Buyer CRM for private buyer relationship notes.',view:'pipeline'},
  {terms:'wholesale course learn beginner training',title:'Learn wholesaling',copy:'Take the free Better-centered wholesaling course and continue from your saved module.',view:'learn'},
  {terms:'password username delete account settings notifications',title:'Account & settings',copy:'Open Settings to manage your profile, alerts, password and account controls.',view:'settings'},
  {terms:'affiliate referral credit money commission payout',title:'Referrals and affiliate program',copy:'Referral credits and affiliate cash earnings are separate. Open Affiliate Center or your profile Referral Center for the applicable workflow.',view:'affiliate'},
  {terms:'help support contact problem bug',title:'Contact Better support',copy:'If self-service help does not solve it, open Contact and send the Better team the details.',view:'contact'}
];

function betterGuidePremium(){return !!(state.access?.pro||state.access?.platinum||state.access?.wholesale||state.access?.adminUnlimited||state.user?.role==='admin');}
function betterGuideCompleted(){return Array.isArray(state.user?.settings?.guideCourseCompleted)?state.user.settings.guideCourseCompleted:[];}
function betterGuideQuizPassed(){return Array.isArray(state.user?.settings?.guideCourseQuizPassed)?state.user.settings.guideCourseQuizPassed:[];}
function betterGuideModule(slug){return BETTER_GUIDE_COURSE.find(x=>x.slug===slug)||BETTER_GUIDE_COURSE[0];}
async function saveBetterGuideSettings(patch){
  const r=await api('PATCH','/api/me/settings',patch); state.user.settings=r.settings; return r.settings;
}
function betterGuideProgress(){const done=betterGuideCompleted().filter(x=>BETTER_GUIDE_COURSE.some(m=>m.slug===x));return {done,total:BETTER_GUIDE_COURSE.length,pct:Math.round((done.length/BETTER_GUIDE_COURSE.length)*100)};}
function affiliateGuideOnly(){return hasRole(state.user,'affiliate');}
function guideHelpCatalog(){return affiliateGuideOnly()?[
 {title:'Affiliate training and scripts',terms:'training tools calls Zillow Investor Base Facebook script',copy:'Learn who Better helps, find relevant business contacts and use the shared scripts.',view:'affiliate'},
 {title:'Prospects and follow-ups',terms:'prospect contact follow up tracker',copy:'Keep your private prospect notes and next follow-up in Affiliate Center.',view:'affiliate'},
 {title:'Affiliate earnings and tracked link',terms:'commission rate bonus leaderboard link QR earnings payout',copy:'Review approval, terms, tracked signup link and eligible earnings.',view:'affiliate'},
 {title:'Account settings',terms:'settings password email profile',copy:'Manage your account and notification preferences.',view:'settings'},
 {title:'Contact support',terms:'help support contact',copy:'Get help from the Better team.',view:'contact'}
 ]:BETTER_GUIDE_HELP;}
function guideContext(){
 if(affiliateGuideOnly())return ['Build a useful introduction','Open Affiliate Center for training, scripts, your private prospects, approval and earnings. Start with a business need and a free account.'];
  const map={
    dealbuilder:['Deal Intelligence','Review property evidence before relying on ARV. If facts conflict, Better will keep the uncertainty visible.'],
    network:['Network','Use roles and Buy Boxes to find people who actually fit the relationship you need.'],
    pipeline:['Deal Pipeline','Keep the opportunity in the stage it is really in and make the next follow-up explicit.'],
    buyercrm:['Buyer CRM','Capture real buyer criteria and relationship notes so matching improves over time.'],
    compose:['Post a property','Use only property and deal information you can support. Better Dispo can structure it without inventing missing facts.'],
    transactionhub:['Transaction Hub','Put tasks, contacts, credentials and closing outcomes in one place so the deal does not disappear into separate threads.'],
    affiliate:['Affiliate Center','Use your tracked Better affiliate link. Cash affiliate earnings stay separate from Better Credits.'],
    settings:['Settings','Manage your markets, notifications, Guide preferences and account controls here.'],
    learn:['Learn Wholesaling','The course intentionally teaches the workflow through Better so you can practice each step where you will actually manage it.']
  };
  return map[state.view]||['Better Guide','I can help you learn Better, continue the free wholesaling course, or find the right tool for what you are doing.'];
}
function guidePremiumInsight(){
 if(affiliateGuideOnly())return {title:'Plan your next conversation',copy:'Review the outreach training and current plans, then follow up with an interested prospect who has agreed to hear more.',view:'affiliate'};
  const markets=Array.isArray(state.user?.investmentMarkets)?state.user.investmentMarkets:[];
  const marketLine=markets.length?` Your Better profile currently focuses on ${markets.slice(0,3).join(', ')}${markets.length>3?' and more':''}.`:'';
  if(state.view==='dealbuilder')return {title:'Deal Intelligence companion',copy:'Use the Guide as a second set of eyes on the workflow: subject-property truth first, then comp strength, repair assumptions and deal math. It will not turn weak evidence into a confident number.',view:'dealbuilder'};
  if(state.view==='network'||state.view==='buyercrm')return {title:'Buyer-network companion',copy:'Use real roles, Buy Boxes and relationship notes to decide who belongs in the conversation.'+marketLine,view:'buyercrm'};
  if(state.view==='pipeline'||state.view==='transactionhub')return {title:'Deal workflow companion',copy:'Keep the next real action visible across Pipeline, Deal Rooms, Calendar and Transaction Hub rather than creating a second tracking system.',view:'pipeline'};
  if(state.view==='learn')return {title:'Learning companion',copy:'Your course progress is tied to this account. I can keep the learning path connected to the Better tool used in each module.',view:'learn',module:state.guideCourseModule};
  return {title:'Personalized Better workflow',copy:'Advanced guidance uses your real Better context, membership access and saved course progress to keep the next step relevant.'+marketLine,view:betterGuideNextStep().view,module:betterGuideNextStep().module};
}

function betterGuideNextStep(){
 if(affiliateGuideOnly())return {title:'Open your affiliate workbench',copy:'Prepare a relevant introduction, review scripts and update your private follow-ups.',view:'affiliate'};
  const progress=betterGuideProgress();
  if(progress.done<progress.total){const next=BETTER_GUIDE_COURSE.find(m=>!betterGuideCompleted().includes(m.slug))||BETTER_GUIDE_COURSE[0];return {title:`Continue lesson ${next.number}`,copy:next.title,view:'learn',module:next.slug};}
  if(!state.user?.bio||!(state.user?.investmentMarkets||[]).length)return {title:'Tighten your profile',copy:'Add your market and a useful bio so your Better profile gives the network context.',view:'settings'};
  return {title:'Use your operating workspace',copy:'Open Command Center to review real matches, activity and next actions available to your account.',view:'commandcenter'};
}
function closeBetterGuide(){document.querySelector('.better-guide-shade')?.remove();document.documentElement.classList.remove('better-guide-open');document.body.classList.remove('better-guide-open');const trigger=document.querySelector('.better-guide-trigger');trigger?.classList.remove('is-open');trigger?.focus?.({preventScroll:true});}
function reactBetterMascot(kind='ack',expression=null){
  document.querySelectorAll('.better-mascot-rig').forEach(rig=>{const now=performance.now();if(now<Number(rig._mascot?.eventUntil||0)&&kind!=='celebrate')return;playBetterMascotBehavior(rig,kind,kind==='celebrate'?2400:kind==='wave'?2100:kind==='thumbsup'?1900:760);if(rig._mascot)rig._mascot.eventUntil=now+(kind==='celebrate'?2650:kind==='wave'?2350:kind==='thumbsup'?2150:1000);if(expression)mascotExpression(rig,expression,kind==='celebrate'?1600:1050);});
}
// Confirmed page actions only; no extra requests or polling.
function mascotActionCompleted(method,path,data,target){
  if(!state.user||method==='GET')return;
  let type=null;
  if(path==='/api/follow'&&data.following)type='follow';
  else if(path==='/api/saves/toggle'&&data.saved)type='saved';
  else if(path==='/api/messages'&&method==='POST')type='sent';
  else if(path==='/api/friends/request'&&method==='POST')type='friend';
  else if(/^\/api\/friends\/requests\/[^/]+\/respond$/.test(path)&&data.status==='friends')type='friend';
  if(!type)return;
  mascotSiteEvent(type);
  if(target?.isConnected)document.querySelectorAll('.better-mascot-rig').forEach(rig=>{
    if(!rig._mascot||rig.classList.contains('motion-off'))return;
    const rr=rig.getBoundingClientRect(),tr=target.getBoundingClientRect();
    const dx=tr.left+tr.width/2-rr.left-rr.width/2,dy=tr.top+tr.height/2-rr.top-rr.height/2;
    mascotSetTarget(rig,{headX:Math.max(-1.6,Math.min(1.6,dx/300)),headY:Math.max(-.8,Math.min(.8,dy/340)),headR:Math.max(-3.8,Math.min(3.8,dx/110))});
  });
}
function mascotSiteEvent(type){const map={message:['tail','alert'],sent:['thumbsup','happy'],friend:['wave','happy'],learning:['celebrate','joy'],follow:['thumbsup','happy'],listing:['celebrate','joy'],saved:['thumbsup','happy'],error:['curious','concerned'],success:['thumbsup','happy'],tutorial:['curious','focused'],dealprogress:['perk','focused'],undercontract:['stand','joy'],closed:['celebrate','joy'],wake:['curious','alert']};const x=map[type];if(x)reactBetterMascot(x[0],x[1]);}
function mascotMarkHumanActivity(){
  const a=state.mascotAwareness||(state.mascotAwareness={lastHumanActivity:Date.now(),lastPersistentCue:0,activeField:null}),wasIdle=Date.now()-Number(a.lastHumanActivity||0)>75000;
  a.lastHumanActivity=Date.now();if(wasIdle&&state.user)setTimeout(()=>mascotSiteEvent('wake'),40);
}
function mascotPersistentAwareness(rig,now){
  if(!rig?._mascot||rig.classList.contains('motion-off'))return false;const a=state.mascotAwareness||(state.mascotAwareness={lastHumanActivity:Date.now(),lastPersistentCue:0,activeField:null}),quietFor=Date.now()-Number(a.lastHumanActivity||Date.now());
  if(quietFor>75000&&rig._mascot.mood==='idle'){if(rig.dataset.expression!=='sleepy')mascotExpression(rig,'sleepy');mascotSetTarget(rig,{...mascotNeutral(),headY:.75,torsoY:.65,torsoSY:.996,earL:2.5,earR:2.5,muzzleY:.14},'idle');return true;}
  if(rig.dataset.expression==='sleepy'&&quietFor<75000)mascotExpression(rig,'content');
  if(state.unreadCount>0&&rig._mascot.mood==='idle'&&now-Number(a.lastPersistentCue||0)>11000){a.lastPersistentCue=now;const msg=document.querySelector('button[title="Messages"]');if(msg){mascotExpression(rig,'alert',2100);aimBetterMascotAt(rig,msg,false);return true;}}
  return false;
}
function wireMascotSituationalAwareness(){
  if(window.__betterMascotAwarenessWired)return;window.__betterMascotAwarenessWired=true;
  ['pointerdown','keydown','touchstart','wheel'].forEach(type=>document.addEventListener(type,mascotMarkHumanActivity,{passive:true}));
  document.addEventListener('focusin',e=>{const t=e.target;if(!t?.matches?.('input,textarea,select,[contenteditable="true"]'))return;mascotMarkHumanActivity();state.mascotAwareness.activeField=t;document.querySelectorAll('.better-mascot-rig').forEach(r=>{if(performance.now()<Number(r._mascot?.eventUntil||0))return;mascotExpression(r,'focused',1200);aimBetterMascotAt(r,t,false);});});
  document.addEventListener('focusout',e=>{if(state.mascotAwareness?.activeField===e.target)state.mascotAwareness.activeField=null;});
}
wireMascotSituationalAwareness();
function navigateFromGuide(view,module){closeBetterGuide();if(module)state.guideCourseModule=module;go(view);}
function openBetterGuide(){
  if(!state.user)return go('auth'); closeBetterGuide();
  const shade=el('div',{class:'better-guide-shade',role:'presentation'}),panel=el('section',{class:'better-guide-panel',role:'dialog','aria-modal':'true','aria-label':'Better Guide',tabindex:'-1'});
  document.documentElement.classList.add('better-guide-open');document.body.classList.add('better-guide-open');
  shade.onclick=e=>{if(e.target===shade)closeBetterGuide();};
  panel.onkeydown=e=>{if(e.key==='Escape'){e.preventDefault();closeBetterGuide();}};
  const [ctxTitle,ctxCopy]=guideContext(),progress=betterGuideProgress(),next=betterGuideNextStep();
  const mascot=el('div',{class:'guide-mascot-stage is-panel','aria-label':'Better Guide mascot'},createBetterMascotRig({variant:'panel',label:'Better mascot'}));
  const close=el('button',{class:'iconbtn guide-close','aria-label':'Close Better Guide',onclick:closeBetterGuide},'×');
  panel.appendChild(el('div',{class:'better-guide-head'},[mascot,el('div',{class:'grow'},[el('div',{class:'dispoeyebrow'},'BETTER GUIDE'),el('h2',{},'How can I help?'),el('div',{class:'hint'},'Platform help, learning and guidance without leaving your workflow.')]),close]));
  if(state.user?.settings?.guideContextTips!==false)panel.appendChild(el('div',{class:'guide-context-card'},[el('b',{},ctxTitle),el('div',{class:'hint'},ctxCopy)]));
  const tourDone=Number(state.user?.settings?.tutorialCompletedVersion||0)>=TUTORIAL_VERSION;
  panel.appendChild(el('div',{class:'guide-progress-center'},[el('div',{},[el('span',{},'Platform tour'),el('b',{},tourDone?'Complete':'Available')]),el('div',{},[el('span',{},affiliateGuideOnly()?'Affiliate workbench':'Wholesaling course'),el('b',{},affiliateGuideOnly()?'Ready':`${progress.done}/${progress.total}`)])]));
  const quick=el('div',{class:'guide-quick-grid'});
  quick.append(
    el('button',{onclick:()=>{closeBetterGuide();startTutorial(true);}},[el('b',{},'Guide me through Better'),el('span',{},'Replay the platform tutorial')]),
    el('button',{onclick:()=>affiliateGuideOnly()?navigateFromGuide('affiliate'):navigateFromGuide('learn',state.user?.settings?.guideCourseLastModule||next.module||'foundations')},[el('b',{},affiliateGuideOnly()?'Affiliate training & tools':'Learn Wholesaling — Free'),el('span',{},affiliateGuideOnly()?'Scripts, plans and follow-ups':`${progress.done}/${progress.total} modules complete`)]),
    el('button',{onclick:()=>navigateFromGuide('faq')},[el('b',{},'Help center'),el('span',{},'Browse common questions')]),
    el('button',{onclick:()=>navigateFromGuide('contact')},[el('b',{},'Contact support'),el('span',{},'Get help from the Better team')])
  );
  panel.appendChild(quick);
  panel.appendChild(el('div',{class:'guide-section-label'},'SEARCH BETTER HELP'));
  const input=el('input',{class:'guide-search',placeholder:affiliateGuideOnly()?'Try “scripts”, “prospects”, or “earnings”':'Try “ARV”, “post a property”, or “affiliate”','aria-label':'Search Better Help'}),results=el('div',{class:'guide-search-results'});
  const drawResults=()=>{const q=input.value.trim().toLowerCase();results.innerHTML='';const rows=(q?guideHelpCatalog().filter(x=>(x.terms+' '+x.title+' '+x.copy).toLowerCase().includes(q)):guideHelpCatalog().slice(0,4)).slice(0,6);if(!rows.length){results.appendChild(el('div',{class:'guide-empty'},'No exact help topic found. Try a shorter search or contact support.'));return;}rows.forEach(x=>results.appendChild(el('button',{onclick:()=>navigateFromGuide(x.view)},[el('b',{},x.title),el('span',{},x.copy)])));};
  input.oninput=drawResults;panel.append(input,results);drawResults();
  panel.appendChild(el('div',{class:'guide-section-label'},'YOUR NEXT STEP'));
  panel.appendChild(el('button',{class:'guide-next-card',onclick:()=>navigateFromGuide(next.view,next.module)},[el('div',{},[el('b',{},next.title),el('span',{},next.copy)]),el('span',{class:'guide-arrow'},'→')]));
  panel.appendChild(el('div',{class:'guide-section-label'},'PERSONALIZED MEMBER GUIDANCE'));
  if(affiliateGuideOnly())panel.appendChild(el('div',{class:'guide-premium-card unlocked'},[el('b',{},'Help with your affiliate work'),el('div',{class:'hint'},'Use your approved tracked link, keep prospect notes private, and review the current terms for eligible earnings.'),el('button',{class:'btn-ghost',onclick:()=>navigateFromGuide('affiliate')},'Open affiliate center')]));
  else if(betterGuidePremium()){const insight=guidePremiumInsight();panel.appendChild(el('div',{class:'guide-premium-card unlocked'},[el('b',{},insight.title),el('div',{class:'hint'},insight.copy),el('div',{class:'guide-premium-actions'},[el('button',{class:'btn-primary',onclick:()=>navigateFromGuide(insight.view,insight.module)},'Open guided workflow'),el('button',{class:'btn-ghost',onclick:()=>navigateFromGuide('learn',state.user?.settings?.guideCourseLastModule||'foundations')},'Continue learning')]) ]));}
  else panel.appendChild(el('div',{class:'guide-premium-card'},[el('b',{},'Free help stays useful'),el('div',{class:'hint'},'The course, product help and basic contextual guidance are free. Paid memberships add deeper personalized workflow guidance without locking the fundamentals away.'),el('button',{class:'btn-ghost',onclick:()=>navigateFromGuide('upgrade')},'See membership options')]));
  shade.appendChild(panel);document.body.appendChild(shade);document.querySelector('.better-guide-trigger')?.classList.add('is-open');requestAnimationFrame(()=>{reactBetterMascot('wave');input.focus({preventScroll:true});});
}

async function markGuideModuleComplete(slug){
  const completed=[...new Set([...betterGuideCompleted(),slug])];
  const passed=[...new Set([...betterGuideQuizPassed(),slug])];
  await saveBetterGuideSettings({guideCourseCompleted:completed,guideCourseQuizPassed:passed,guideCourseLastModule:slug});
  mascotSiteEvent('learning');
}
async function openGuideModule(slug){state.guideCourseModule=slug;writeRoute('push');try{await saveBetterGuideSettings({guideCourseLastModule:slug});}catch{}renderApp();window.scrollTo(0,0);}

async function renderLearnWholesaling(){
  const wrap=el('div',{class:'page better-learning-page'}),module=betterGuideModule(state.guideCourseModule||state.user?.settings?.guideCourseLastModule||'foundations'),progress=betterGuideProgress();
  const hero=el('section',{class:'guide-course-hero'},[
    el('div',{class:'guide-course-mascot'},[createBetterMascotRig({variant:'course',label:'Better mascot, the Better Real Estate golden retriever mascot'}),el('img',{class:'guide-course-logo',src:'/better-guide-logo.png',alt:'Better Real Estate'})]),
    el('div',{class:'grow'},[el('div',{class:'dispoeyebrow'},'FREE BETTER REAL ESTATE COURSE'),el('h1',{},'Learn wholesaling by doing it in Better.'),el('p',{},'From your first opportunity to buyer relationships and closing, each module teaches the workflow and then sends you into the real Better tool built for that step. The course is free; the goal is to help you build the habit of running the business in one place.'),el('div',{class:'guide-progress-row'},[el('div',{class:'guide-progress-track'},el('span',{style:`width:${progress.pct}%`})),el('b',{},`${progress.done} of ${progress.total} complete`)])])
  ]);wrap.appendChild(hero);
  if(progress.done===progress.total)wrap.appendChild(el('div',{class:'guide-course-achievement'},[el('b',{},'Wholesaling Foundations — Completed'),el('span',{},'You completed the full free Better-centered course. This is a learning milestone, not a professional certification or license.') ]));
  const layout=el('div',{class:'guide-course-layout'}),sidebar=el('aside',{class:'guide-course-nav','aria-label':'Wholesaling course modules'}),detail=el('section',{class:'guide-lesson'});
  BETTER_GUIDE_COURSE.forEach(m=>{const done=betterGuideCompleted().includes(m.slug);sidebar.appendChild(el('button',{class:(m.slug===module.slug?'active ':'')+(done?'done':''),onclick:()=>openGuideModule(m.slug)},[el('span',{class:'guide-module-num'},done?'✓':String(m.number)),el('span',{class:'grow'},[el('b',{},m.title),el('small',{},m.stage)])]));});
  const lessonHead=el('div',{class:'guide-lesson-head'},[el('div',{},[el('div',{class:'tutorialprogress'},`MODULE ${module.number} OF ${BETTER_GUIDE_COURSE.length} · ${module.stage}`),el('h2',{},module.title),el('p',{},module.goal)]),el('button',{class:'btn-ghost',onclick:()=>openBetterGuide()},'Ask Better Guide')]);detail.appendChild(lessonHead);
  detail.appendChild(el('div',{class:'guide-lesson-block'},[el('h3',{},'What you need to know'),...module.overview.map(x=>el('p',{},x))]));
  detail.appendChild(el('div',{class:'guide-lesson-block better-workflow'},[el('div',{class:'guide-section-label'},'DO THIS IN BETTER'),el('h3',{},'Turn the lesson into a workflow'),el('ol',{},module.better.map(x=>el('li',{},x))),el('button',{class:'btn-primary',onclick:()=>go(module.action.view)},module.action.label)]));
  const quiz=el('div',{class:'guide-lesson-block guide-quiz'},[el('div',{class:'guide-section-label'},'KNOWLEDGE CHECK'),el('h3',{},module.quiz.q)]),status=el('div',{class:'guide-quiz-status','aria-live':'polite'}),choices=el('div',{class:'guide-quiz-choices'});
  module.quiz.options.forEach((option,index)=>choices.appendChild(el('button',{class:'btn-ghost',onclick:async e=>{choices.querySelectorAll('button').forEach(b=>b.classList.remove('correct','wrong'));if(index===module.quiz.correct){e.currentTarget.classList.add('correct');status.className='guide-quiz-status okmsg';status.textContent=module.quiz.explain;reactBetterMascot('celebrate');try{await withButtonBusy(e.currentTarget,()=>markGuideModuleComplete(module.slug));const next=BETTER_GUIDE_COURSE[module.number];if(next)status.appendChild(el('button',{class:'btn-primary guide-next-module',onclick:()=>openGuideModule(next.slug)},'Continue to next module'));else status.appendChild(el('div',{class:'guide-course-finish'},'Course complete. Keep using Better Guide whenever you want to revisit a workflow.'));renderTop();}catch(err){status.className='guide-quiz-status errmsg';status.textContent=err.message;}}else{e.currentTarget.classList.add('wrong');status.className='guide-quiz-status errmsg';status.textContent='Not quite. Review the lesson and try again.';}}},option)));
  quiz.append(choices,status);detail.appendChild(quiz);
  if(betterGuideCompleted().includes(module.slug))detail.insertBefore(el('div',{class:'guide-complete-banner'},'Completed — your progress is saved to this Better account.'),detail.children[1]||null);
  detail.appendChild(el('div',{class:'guide-course-disclaimer'},'Education only. Better Real Estate helps organize and analyze your workflow; it does not replace state-specific legal, licensing, title, tax, accounting, or other professional advice.'));
  layout.append(sidebar,detail);wrap.appendChild(layout);return wrap;
}

/* ================= COMPOSE ================= */

const TUTORIAL_VERSION = 70;
function tutorialTier(){
  if(state.user?.role==='admin'||state.access?.adminUnlimited)return'admin';
  if(state.access?.wholesale)return'wholesale'; if(state.access?.platinum)return'platinum';
  if(state.access?.pro)return'pro'; if(state.access?.trial)return'trial'; return'free';
}
const TUTORIAL_RANK={free:0,pro:1,platinum:2,wholesale:3,trial:1,admin:4};
function tutorialStepsFor(tier=tutorialTier()){
 const rank=TUTORIAL_RANK[tier]??0;
 return [
 {view:'settings',selector:'#app .page',min:0,release:70,title:'Advertising measurement preferences',copy:'Optional Meta Pixel measures public marketing page visits. You can turn advertising measurement off in Settings. Private pages and browser privacy signals are respected; email and phone preferences are separate.'},
 {view:'admin',selector:'.growth-toggle',min:4,release:69,title:'Explore real growth',copy:'Open growth charts for the selected date range. UTC signup and active-user trends use recorded history, exclude demos and label partial periods.'},
 {view:'affiliate',selector:'.affiliate-admin',min:4,release:69,title:'Manage the affiliate program',copy:'Review applications, performance, commissions and bonus payout states. Admin controls are separate from an affiliate’s personal participation.'},
 {view:'affiliate',selector:'.affiliate-content-editor',min:4,release:69,title:'Edit shared training',copy:'Update guidance, prospect sourcing and call/share scripts. Save publishes the plain text to the affiliate workbench; Cancel preserves the current copy.'},
 {view:'affiliate',selector:'.affiliate-calculator',min:0,release:69,title:'Plan commissions by membership',copy:'Choose a current plan, monthly or annual payment, customer count and 30–40% scenario rate. This estimate does not change your earned rate or include milestone cash.'},
 {view:'affiliate',selector:'.affiliate-sourcing',min:0,release:69,title:'Find relevant business conversations',copy:'Review approaches for Zillow business listing contacts, Investor Base, Facebook groups and local real estate communities. Ask permission and respect opt-outs.'},
 {view:'affiliate',selector:'.affiliate-leaderboard',min:0,release:68,title:'Affiliate leaderboard and bonus rate',copy:'Rankings count eligible paid membership purchases. Each purchase while you are in the top 5 adds one percentage point to that purchase’s commission, from 30% up to 40%. Leaving the top 5 resets you to 30%; returning starts a new run. Free signups and renewals do not count.'},
 {view:'affiliate',selector:'.affiliate-milestones',min:0,release:68,title:'Sales milestone bonuses',copy:'Eligible new purchases build toward one-time cash bonuses at 10, 25, 50 and 100 sales. Rewards are capped at 3% of membership revenue retained after commissions, so the displayed maximum may be reduced. Past sales and renewals do not generate milestone payouts.'},
 {view:'affiliate',selector:'.affiliate-product-guide',min:0,release:67,title:'Explain Better’s business value',copy:'Learn who Better helps, which tools solve their workflow problems, and how to guide someone from a free account to a useful first action. Review current plans before discussing paid access; free signups do not earn a paid-membership commission.'},
 {view:'feed',selector:null,min:0,title:'Welcome to Better Real Estate',copy:'We’ll walk through the workspace one feature at a time. The tour only includes tools available with your current membership.'},
 {view:'feed',selector:'.feedmode',min:0,release:29,title:'For You & Following',copy:'For You ranks deals using your markets, buy boxes and activity. Following keeps a predictable feed from people you chose to follow.'},
 {view:'commandcenter',selector:'.commandcenter',min:0,release:29,title:'Command center',copy:'See market matches, buyer matches, pending offers, property updates and your next deadline without hunting through the site.'},
 {view:'shop',selector:'#tabbar button:nth-child(2)',min:0,title:'Shop',copy:'Browse the marketplace side of Better Real Estate without leaving your workspace.'},
 {view:'compose',selector:'.composepage .dealbuilderentry',min:0,title:'Post a property',copy:'Start a listing here. You can build it manually, import existing deal notes, or begin with an AI Deal Builder analysis.'},
 {view:'network',selector:'#tabbar button:nth-child(4)',min:0,title:'Network',copy:'Find professionals, follow people, manage friends, and discover buyers through public buy boxes.'},
 {view:'messages',selector:'#app .page',min:0,title:'Messages',copy:'Keep deal conversations inside Better Real Estate. Reminder timing can be changed in Settings.'},
 {view:'me',selector:'#tabbar button:nth-child(5)',min:0,title:'Profile & tools',copy:'Your Profile connects you to saved properties, buy boxes, leaderboard, professional tools and membership controls.'},
 {view:'me',selector:'.profile-card-share',min:0,release:51,title:'Shareable Better cards',copy:'Create a branded profile card from your real profile information. Property owners also get shareable 4:5 deal cards from Better Dispo.'},
 {view:'feed',selector:'.feedhead',min:0,release:51,title:'Deal momentum & better matching',copy:'Better now turns real saves, conversations, offers and buyer criteria into clearer momentum and match moments. No activity is fabricated.'},
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
 {view:'affiliate',selector:'.payout-card',min:0,release:35,title:'Affiliate Wallet',copy:'Affiliate earnings are real cash: 30% base, with top 5 purchase bonuses up to 40%, one time on a qualifying customer’s first eligible paid membership. Earnings are held for 3 days before withdrawal. Better Credits are separate and never cash-withdrawable.'},
 {view:'wallet',selector:'.wallet-balance-grid',min:0,release:35,title:'Cash and credits',copy:'Marketplace seller proceeds are real cash and can be withdrawn after payout setup. Better Credits are platform-only credit and cannot be cashed out.'},
 {view:'upgrade',selector:'.tiergrid4',min:0,release:32,title:'Better Plus access',copy:'Better Plus now includes daily access to more premium tools: 5 Deal Builder analyses, 2 AI listing drafts and 3 AI-enhanced Better Dispo imports. Platinum keeps unlimited access.'},
 {view:'boostpicker',selector:'#app .page',min:0,title:'Promote a listing',copy:'Choose one of your listings to boost when you want additional visibility.'},
 {view:'dealbuilder',selector:'.dealbuildersearch',min:1,title:'AI Deal Builder',copy:'Start with an address. Better researches available property evidence and sold comps before producing the investor analysis.'},
 {view:'dealbuilder',selector:'.verified-comps-card',min:1,release:39,title:'Closed-sale comps · researched automatically',copy:'Add closed-sale comps you trust. Better scores similarity, discounts weak/outlier comps, and produces a separate comp-supported ARV with confidence instead of pretending address-only AI is verified market data.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:40,title:'Automatic property evidence',copy:'Better now checks any authorized MLS / RESO feeds your platform has connected, uses verified subject facts such as beds, baths and square footage when available, and automatically loads closed-sale evidence into the comp workspace. Source names and conflicts stay visible.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:41,title:'Live property + web research',copy:'Better now queries configured Regrid parcel records and performs public web research in addition to authorized MLS feeds. It cross-checks beds, baths, square footage, sale history and sold comps, flags source conflicts, and uses credible researched sold comps for the working ARV.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:42,title:'Verified property facts',copy:'Better now verifies the subject property field by field. Conflicting or single-source beds, baths, square footage, year built and property type are withheld instead of being presented as facts. Open Property evidence to see exactly what each source reported.'},
 {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:43,title:'Production property intelligence',copy:'Better now resolves the exact property first, uses deterministic Regrid and authorized MLS evidence before spending on web research, checks nearby recorded closed sales, distinguishes Recorded from independently Verified facts, and withholds ARV unless the property and comp gates pass. Research is cached to reduce Netlify and API usage.'},
  {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:44,title:'Property research reliability',copy:'Better now runs a targeted, location-aware public-web research pass when deterministic sources leave facts or sold comps unresolved. Single-source values stay labeled Recorded and visible for reference, while only corroborated facts can unlock valuation.'},
  {view:'dealbuilder',selector:'.source-evidence-card',min:1,release:45,title:'Deep background property research',copy:'Deal Intelligence no longer races a short browser request. Better can spend the time needed resolving the exact parcel, cross-checking public property evidence, researching closed sales, screening conflicts and only then producing an evidence-backed analysis. Fresh research is cached so reopening the property does not repeat paid work.'},
  {view:'dealbuilder',selector:'.deal-intel-snapshot',min:1,release:46,title:'Investor-grade analysis',copy:'Deal Intelligence separates established property facts from source detail, screens distressed sales, accepts grounded distance evidence, and provides transparent repair-planning ranges with a recommended scenario.'},
  {view:'dealbuilder',selector:'.deal-intel-snapshot',min:1,release:47,title:'Multi-source investor intelligence',copy:'Deal Intelligence now researches multiple public real-estate sources by default, treats parcel data as optional corroboration, cross-checks exact-address facts, expands sold-comp research when needed, and returns a complete investor snapshot with ARV precision, repair planning and deal math.'},
  {view:'dealbuilder',selector:'.deal-intel-snapshot',min:1,release:48,title:'Complete Deal Intelligence',copy:'Better now carries recorded property facts cleanly into the investor view, keeps searching independent sources when corroboration is weak, cross-checks sold comps across multiple source families, and preserves deterministic working ARV, repair planning and deal math even when AI narrative synthesis remains evidence-gated.'},
  {view:'network',selector:'.personactions',min:0,release:49,title:'Responsive actions',copy:'Follow, friend, save, send and other actions now acknowledge your tap immediately and show a consistent processing state when the server is still working, so you never have to guess whether Better registered the action.'},
  {view:'messages',selector:'.page',min:0,release:49,title:'Mobile scrolling & messaging polish',copy:'Long panels, modals, lists and workspaces remain reachable on mobile, and sent messages clear from the composer immediately while failed sends restore the draft instead of losing it.'},
  {view:'network',selector:'.networksearch',min:0,release:50,title:'Roles that match how you work',copy:'Profiles can now identify as Buyer / Investor, Seller / Wholesaler, Lender / Funder, or any combination. Use Network filters to find the exact people a deal needs, and update your own roles anytime in Settings.'},
 {view:'buyercrm',selector:'.buyercrmpage',min:0,title:'Buyer CRM',copy:'Keep buyer markets, buy boxes, private notes and follow-up stages in one pipeline.'},
 {view:'insights',selector:'.insightspage',min:0,title:'Demand Insights',copy:'See where published buyer demand is concentrated by market, property type and strategy.'},
 {view:'workspace',selector:'.workspacepage',min:2,title:'Investor Workspace',copy:'Compare saved properties and keep private deal notes in one place.'},
 {view:'companyworkspace',selector:'.companyhero',min:3,release:29,title:'Wholesale Team workspace',copy:'Team access adds shared buyer CRM, pipeline assignments, internal notes, activity and analytics while each teammate keeps a separate login.'},
 {view:'affiliate',selector:'.affiliate-tools',min:0,release:66,title:'Your affiliate workbench',copy:'Use call scripts and copyable messages, share your approved tracked link or QR code, and keep a private prospect list with stages and follow-up dates. Prospect stages are self-reported; commissions come only from actual eligible paid memberships. Affiliate-only accounts do not use a First 50 Founder slot.'},
 {view:'settings',selector:'#app .page',min:0,release:66,title:'Your account emails',copy:'New signups have product emails enabled under Terms. Turn them off in Settings or unsubscribe from a marketing email. Email-confirmation reminders stop when you verify.'},
 {view:'affiliate',selector:'.affiliate-center',min:0,release:65,title:'Marketing and affiliate accounts',copy:'Choose Marketing / Affiliate only at signup to keep your account separate from the real estate Network. Affiliate access still requires approval. Open Affiliate in the footer beside FAQ and Contact.'},
 {view:'admin',selector:'.admin-activity',min:4,release:29,title:'Admin activity & user analytics',copy:'See who is active now, unique users over preset or custom periods, market activity, funnel signals and inspect individual accounts. Ordinary members never see this step.'},
 {view:'admin',selector:'.demo-account-card',min:4,release:37,title:'Demo accounts',copy:'Create controlled demo accounts for presentations and testing. Demo accounts never consume First 50 Founder places, never count in growth analytics, and cannot generate real billing, referral rewards, affiliate commissions or payouts.'},
 {view:'admin',selector:'.demo-preview-card',min:4,release:38,title:'Preview experiences',copy:'Use a demo account to safely replay Founder welcome, onboarding, and What’s New experiences without consuming Founder places, issuing access, changing analytics, or creating money.'},
 {view:'admin',selector:'.user-inspector',min:4,release:39,title:'Demo account controls',copy:'Demo rows now keep every action visible: enter the demo, reset its password or state, convert it to a real account, or permanently delete it with confirmation.'},
 {view:'admin',selector:'.user-inspector',min:4,release:36,title:'Membership access controls',copy:'Open Manage access on any non-admin account to grant, replace, extend or revoke complimentary membership access without touching the user’s paid subscription.'},
 {view:'me',selector:'.founder-program-card',min:0,release:36,when:()=>!!state.user?.founderLaunchPosition,title:'First 50 Founding Member',copy:'As one of the first 50 qualifying members, your profile carries Founding Member recognition and includes two weeks of complimentary Platinum access. Your referral link is ready to share with your network.'},
 {view:'feed',selector:'.topquick',min:0,release:31,title:'Quick options',copy:'Open your customizable shortcut menu from anywhere. Choose the platform actions you use most, customize up to six shortcuts, and use Back to return to your saved Quick Options without closing the menu.'},
 {view:'settings',selector:'.market-settings',min:0,release:29,title:'Investment markets',copy:'Choose the states you work in. They boost relevant properties in For You without hiding opportunities elsewhere.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:52,title:'Meet your Better Guide',copy:'Your Better Guide lives beside Settings. Open him anytime for platform help, contextual guidance, tutorials, support, and the free Learn Wholesaling course built around Better Real Estate.'},
 {view:'learn',selector:'.better-learning-page',min:0,release:52,title:'Learn wholesaling inside Better',copy:'The free course teaches the wholesaling workflow while showing where to do each step in Better — research a property, build your network, post a deal, manage buyers, and move the transaction forward.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:53,title:'Meet the mascot, not another button',copy:'The Better mascot now is the control: no Guide pill, no stacked circles. He reacts to hover, taps, tutorials and course wins while keeping Settings clear and the rest of Better unchanged.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:54,title:'A mascot that actually feels alive',copy:'Better Guide is now a layered interactive character instead of a moving picture. His head, ears, raised paw, body and tail move independently, he follows nearby interaction, reacts to the tutorial target and settles back into a restrained idle state.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:54,title:'The mascot now reacts continuously',copy:'The mascot now runs as one continuous character rig. He follows nearby pointer movement, leans with page motion, reacts to page actions, aims toward tutorial targets, and celebrates course progress without swapping between rendered poses.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:56,title:'More expression, more context',copy:'Better Guide now changes facial expression and body response for meaningful moments such as guidance, success, errors and new attention — while staying grounded in the header.'},
 {view:'detail',selector:'.owner-ops',min:0,release:56,title:'Edit your property posts',copy:'On a property you own, use Edit property to update pricing, facts, notes, photos, video, deadline and JV availability without recreating the post.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:55,title:'A rebuilt mascot that stays home',copy:'The Better mascot now lives on a fixed header stage with separately articulated head, muzzle, ears, arms, paws, torso and tail. Gaze is damped, idle motion pauses naturally, and tutorial pointing uses the nearest paw without moving the character out of his header home.'},
 {view:'admin',selector:'.admin-activity',min:4,release:65,title:'All-time user activity',copy:'Choose All time to view all available recorded activity. Demo accounts are excluded. Older event detail may have been pruned.'},
 {view:'me',selector:'.founder-program-card',min:0,release:63,when:()=>!!state.user?.founderLaunchPosition,title:'First 50 Founders',copy:'Founder recognition and two weeks of complimentary Platinum are limited to the first 50 qualifying accounts. Your signup rank and bonus dates appear here; paid memberships and separate admin grants remain independent.'},
 {view:'dealbuilder',selector:'.verified-comps-card',min:1,release:62,title:'Sold comps and working ARV',copy:'Review selected and excluded closed sales, adjusted prices and source links. A corroborated working range can support deal math when subject size and identity are established; missing distance or recorded subject details keep it separate from a precise ARV. Add or remove comps to update the calculator.'},
 {view:'dealbuilder',selector:'.dealbuildersearch',min:0,release:61,title:'Clear property evidence and deal numbers',copy:'Better preserves full and half bathroom details, labels unresolved facts and keeps withheld ARV out of the calculator. Number cards fit desktop and mobile. Research skips sold-comp expansion when the subject cannot be located; review source details before underwriting.'},
 {view:'compose',selector:'.previewrow',min:0,release:60,title:'Start a fresh property post',copy:'Post always opens a blank property form. To update an existing property, open its detail page and choose Edit property. Your photo dragging and saved gallery order remain available.'},
 {view:'dealbuilder',selector:'.dealbuildersearch',min:0,release:60,title:'Property facts before comps',copy:'Better searches for bedrooms, bathrooms and other exact-address facts before researching sold comps. Check the complete street, city and state. Missing or conflicting evidence stays clearly labeled; source failures are shown instead of being mistaken for missing property facts.'},
 {view:'emailcenter',selector:'[aria-label="Email audience"]',min:4,release:60,title:'Email selected people',copy:'In Email Center, choose Select individual people, search by name or email, and check the recipients you want. Only eligible verified, opted-in people receive the email. Review the count before sending or scheduling.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:59,title:'Waves, thumbs up and celebrations',copy:'Better Guide greets you with a raised-paw wave, gives a thumbs up for confirmed follows, likes and sent messages, and celebrates completed lessons and deal wins with both arms and a happy bounce. His paws stay inside his own space beside Settings. Animation preferences and reduced motion are respected.'},
 {view:'compose',selector:'.previewrow',min:0,release:59,title:'Put your best property photo first',copy:'When posting or editing a property, drag photos by their labels with your mouse or finger to arrange the gallery. Arrow buttons also work with a keyboard. The first photo becomes the cover. Removing one photo keeps the others, and Save changes updates the existing property.'},
 {view:'feed',selector:'.better-guide-trigger',min:0,release:57,title:'The mascot now remembers what needs attention',copy:'The Better mascot can keep an eye on unread messages, follow the field you are actively working in, react when a deal advances, celebrate under-contract and closed milestones, and settle into a sleepy state after real inactivity. These cues use existing page state without adding a new polling service.'},
 {view:'settings',selector:'#app .page',min:0,title:'Settings & help',copy:'Control notifications, membership display, appearance and account options. You can restart the guided tour here anytime.'},
 {view:'feed',selector:null,min:0,title:'You’re ready',copy:'That covers your current access. If your membership unlocks new tools later, you’ll get a short tour of only those new features.'}
 ].filter(x=>rank>=x.min&&(!state.access?.adminUnlimited||!['.affiliate-leaderboard','.affiliate-milestones','.affiliate-status','.affiliate-link-card','.payout-card','.affiliate-hero'].includes(x.selector))&&(!x.when||x.when())&&(!hasRole(state.user,'affiliate')||['affiliate','settings','wallet'].includes(x.view)));
}
function tutorialKey(tier=tutorialTier()){return `v${TUTORIAL_VERSION}:${tier}`;}
function tutorialDockLayout(vw,vh,height,box,preferredSide){
 const mobile=vw<900,margin=mobile?12:16;
 const width=mobile?vw-margin*2:Math.min(360,Math.floor(vw*.32));
 const maxHeight=mobile?Math.max(100,Math.floor(vh*.44)):Math.max(100,vh-112);
 let side=preferredSide||(box&&box.width<vw*.5&&box.left>vw*.5?'left':'right');
 if(mobile)side='bottom';
 const actualHeight=Math.min(height,maxHeight);
 return {side,width,maxHeight,left:side==='left'?margin:vw-width-margin,
  top:mobile?vh-actualHeight-margin:Math.min(96,Math.max(margin,vh-actualHeight-margin))};
}
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
 let currentTarget=null,preferredSide=null;
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
   let layout=tutorialDockLayout(window.innerWidth,window.innerHeight,0,box,preferredSide);
   card.style.width=`${layout.width}px`;card.style.setProperty('max-height',`${layout.maxHeight}px`,'important');
   layout=tutorialDockLayout(window.innerWidth,window.innerHeight,card.offsetHeight,box,preferredSide);
   card.dataset.dock=layout.side;const toggle=card.querySelector('.tutorial-dock-toggle');if(toggle)toggle.textContent=layout.side==='left'?'Move right':'Move left';card.style.left=`${layout.left}px`;card.style.top=`${layout.top}px`;
 };

 function reposition(){if(closed)return;placeCard(setBox(currentTarget));}
 window.addEventListener('resize',reposition);window.addEventListener('scroll',reposition,true);
 const focus=async step=>{
   currentTarget=null;setBox(null);
   if(state.view!==step.view){go(step.view);await new Promise(r=>setTimeout(r,80));}
   const target=await waitForTarget(step.selector);
   if(target){target.scrollIntoView({behavior:'auto',block:window.innerWidth<900?'start':'center',inline:'nearest'});if(window.innerWidth<900)window.scrollBy(0,-88);await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)));currentTarget=target;}
   reposition();
 };
 const move=delta=>{const next=Math.max(0,Math.min(steps.length-1,i+delta));if(next===i&&delta>0)return finish();i=next;draw();};
 const draw=async()=>{
   if(closed)return; const step=steps[i]; card.innerHTML='';
   const tutorialMascot=createBetterMascotRig({variant:'tutorial',hidden:true});
   card.appendChild(el('div',{class:'guide-tutor-head'},[el('div',{class:'guide-mascot-stage is-tutorial','aria-hidden':'true'},tutorialMascot),el('div',{},[el('b',{},'Better Guide'),el('span',{},releaseOnly?'What’s new in Better':'I’ll show you around')])]));
   card.appendChild(el('button',{type:'button',class:'tutorial-dock-toggle',onclick:()=>{preferredSide=card.dataset.dock==='left'?'right':'left';reposition();card.querySelector('.tutorial-dock-toggle').textContent=preferredSide==='left'?'Move right':'Move left';}},preferredSide==='left'?'Move right':'Move left'));
   card.appendChild(el('div',{class:'tutorialprogress'},`${onlyNew?'NEW FEATURE TOUR':releaseOnly?'WHAT’S NEW':'GUIDED TOUR'} · ${i+1} OF ${steps.length}`));
   card.appendChild(el('h2',{},step.title));card.appendChild(el('p',{},step.copy));
   if(i===0&&!onlyNew&&!releaseOnly)card.appendChild(el('button',{type:'button',class:'btn-ghost guide-tour-course-cta',onclick:async()=>{cleanup();state.guideCourseModule=state.user?.settings?.guideCourseLastModule||'foundations';go('learn');}},'I’m new to wholesaling — start the free course'));
   card.appendChild(el('div',{class:'tutorialmembership'},`Showing ${tier==='wholesale'?'Team':tier[0].toUpperCase()+tier.slice(1)} access`));
   const actions=el('div',{class:'tutorialactions'});
   actions.appendChild(el('button',{type:'button',class:'btn-ghost',disabled:i===0?'disabled':null,onclick:()=>move(-1)},'Back'));
   actions.appendChild(el('button',{type:'button',class:'btn-primary',onclick:()=>i===steps.length-1?finish():move(1)},i===steps.length-1?'Finish':'Next'));
   card.appendChild(actions);card.appendChild(el('button',{type:'button',class:'tutorialskip',onclick:()=>finish(true)},'Skip entire tour'));
   await focus(step);
   if(currentTarget)aimBetterMascotAt(tutorialMascot,currentTarget);
 };
 await draw();
}

function dealValuationPrecision(ev,ca){
  if(!ev?.identity?.addressMatched||(!ca?.valuationReady&&!ca?.indicativeReady))return 'withheld';
  const fields=ev.fieldEvidence||{},core=['bedrooms','bathrooms','squareFootage','propertyType'];
  if(core.some(f=>String(fields[f]?.status||'').includes('conflict')))return 'withheld';
  if(ev.identity.sufficientForValuation&&ca.valuationReady)return 'precise';
  const size=fields.squareFootage,type=fields.propertyType;
  const establishedSize=['verified','corroborated'].includes(size?.status)&&Number(size.value)>0;
  const recordedType=type?.value||type?.recordedValue||ev.subject?.propertyType;
  return establishedSize&&recordedType?'working_range':'withheld';
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
      status.textContent='Starting a thorough property-research job. You can wait here while Better cross-checks the address, records, public sources and sold comps…';
      const started=await api('POST','/api/deal-builder/research/start',{address:address.value.trim(),forceRefresh});
      let ev0=started.evidence||{};
      if(started.state!=='complete'){
        if(!started.reused){
          const bg=await fetch(started.backgroundPath,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jobId:started.jobId,runToken:started.runToken})});
          if(!bg.ok&&bg.status!==202)throw new Error('Unable to start the background property research job.');
        }
        let waitMs=started.reused?4000:2500,finished=false;
        while(!finished){
          await new Promise(resolve=>setTimeout(resolve,waitMs));
          const sr=await fetch(`${started.statusPath}?jobId=${encodeURIComponent(started.jobId)}`,{headers:{Accept:'application/json'},credentials:'same-origin',cache:'no-store'});if(!sr.ok){let detail='';try{detail=(await sr.json())?.error||''}catch{}throw new Error(detail||'Unable to read the property research status.');}
          const sj=await sr.json(),job=sj.job||{};status.textContent=`Researching property · ${job.progress||0}% · ${job.message||'Checking evidence…'}`;
          if(job.status==='complete'){ev0=job.evidence||{};finished=true;break}
          if(job.status==='failed')throw new Error(job.error||'Property research could not complete.');
          waitMs=Math.min(Math.max(Number(sj.retryAfterMs)||5000,5000),12000);
        }
      }
      status.textContent='Research complete · assembling the cross-source investor analysis…';
      const r=await api('POST','/api/deal-builder/address',{address:address.value.trim()});paintUsage(r.usage);
      const a=r.analysis,ev=r.evidence||ev0,live=ev.subject||{},p={...(a.subject||{})},aiDraft=r.aiDraft||null;
      const cacheText=ev.cache?.retrievedAt?` · Research ${ev.cache.hit?'reused':'updated'} ${new Date(ev.cache.retrievedAt).toLocaleString()}`:''; const synthText=r.synthesisReused?' · AI synthesis reused — no new AI call':r.synthesisDeferred?' · AI synthesis unavailable — verified evidence/comp result preserved without consuming an analysis use':'';
      status.textContent=`Analysis generated ${new Date(a.generatedAt).toLocaleString()} · ${a.provider}. Confidence: ${a.confidence||'Low'}. ${a.arvMethod||'Analysis'}${cacheText}${synthText} · Verified facts are source-backed; repair scenarios remain estimates.`;
      const selected=new Set((a.comparables||[]).map((_,i)=>i));let workingArv=a.arv?.precision==='withheld'?0:Number(a.arv?.estimate)||0;
      // Keep the server's evidence-gated, similarity-weighted ARV. Do not replace it with a naive browser average.
      let workingPrecision=a.arv?.precision||'withheld',workingLow=a.arv?.low,workingHigh=a.arv?.high;
      const calcArv=()=>workingArv;
      if(aiDraft?.description){const sentences=String(aiDraft.description).split(/(?<=[.!?])\s+/).filter(Boolean),body=el('div',{class:'aisummarybody'});if(sentences.length)body.appendChild(el('p',{class:'aisummarylead'},sentences[0]));if(sentences.length>1)body.appendChild(el('ul',{class:'aisummarypoints'},sentences.slice(1).map(x=>el('li',{},x))));results.appendChild(el('section',{class:'card aidraftcard'},[el('div',{class:'aisummaryhead'},[el('div',{},[el('div',{class:'sectiontitle'},'Property Analysis Summary'),el('div',{class:'hint'},'AI-organized analysis from verified evidence · Review before marketing')]),el('span',{class:'summaryconfidence'},`Confidence: ${a.confidence||'Low'}`)]),body]));}

      const identity=ev.identity||{},establishedCount=Number(identity.resolvedCoreFields||0),verifiedCount=Number(identity.verifiedCoreFields||0),corroboratedCount=Number(identity.corroboratedCoreFields||0),coreFields=['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType'],recordedCount=coreFields.filter(f=>ev.fieldEvidence?.[f]?.status==='recorded').length,conflictCount=coreFields.filter(f=>ev.fieldEvidence?.[f]?.status==='conflicting').length,foundCount=coreFields.filter(f=>{const fe=ev.fieldEvidence?.[f]||{};return fe.status&&fe.status!=='missing'}).length;
      const displayCore=(field)=>{const fe=ev.fieldEvidence?.[field]||{};if(fe.value!==null&&fe.value!==undefined&&fe.value!=='')return fe.value;if(fe.status==='recorded'&&fe.recordedValue!==null&&fe.recordedValue!==undefined&&fe.recordedValue!=='')return fe.recordedValue;return null};
      const evidenceHead=el('div',{class:'evidence-head'},[
        el('div',{},[el('div',{class:'sectiontitle'},'Property evidence'),el('div',{class:'hint'},live.address||address.value.trim())]),
        el('span',{class:`evidence-match-badge ${identity.addressMatched?'matched':'limited'}`},identity.addressMatched?`${identity.confidence||'Matched'} match`:'Match limited')
      ]);
      const evidenceCard=el('section',{class:'card source-evidence-card'},[evidenceHead]);
      const uniqueSources=[];for(const x of ev.sources||[]){if(!uniqueSources.some(y=>y.name===x.name&&y.type===x.type))uniqueSources.push(x)}
      if(uniqueSources.length)evidenceCard.appendChild(el('div',{class:'sourcechips'},uniqueSources.map(x=>el('span',{class:'sourcechip'},x.name+' · '+x.type))));
      evidenceCard.appendChild(el('div',{class:'evidence-summary-line'},[
        el('span',{},`${foundCount}/5 facts surfaced`),
        el('span',{},`${establishedCount} independently established`),
        verifiedCount?el('span',{},`${verifiedCount} verified`):null,
        corroboratedCount?el('span',{},`${corroboratedCount} corroborated`):null,
        recordedCount?el('span',{},`${recordedCount} recorded`):null,
        conflictCount?el('span',{},`${conflictCount} conflict${conflictCount===1?'':'s'}`):null,
        identity.addressMatchScore!==null&&identity.addressMatchScore!==undefined?el('span',{},`Address match ${identity.addressMatchScore}`):null
      ].filter(Boolean)));
      if(!foundCount)evidenceCard.appendChild(el('div',{class:'evidence-warning'},'No exact-address property facts were returned. Check the full street, city, state and ZIP; review source limitations and research diagnostics below before retrying.'));
      const factGrid=el('div',{class:'evidence-field-grid'}),fieldLabels={bedrooms:'Bedrooms',bathrooms:'Bathrooms',squareFootage:'Living area',yearBuilt:'Year built',propertyType:'Property type'};
      const factStatus=(fe)=>fe.status==='verified'||fe.status==='verified_with_conflict'?['Verified','verified']:fe.status==='corroborated'||fe.status==='corroborated_with_conflict'?['Corroborated','corroborated']:fe.status==='conflicting'?['Conflicting','conflicting']:fe.status==='recorded'?['Recorded','recorded']:['Not found','missing'];
      for(const field of Object.keys(fieldLabels)){
        const fe=ev.fieldEvidence?.[field]||{},value=fe.value!==null&&fe.value!==undefined?fmtFact(field,fe.value):(fe.status==='recorded'&&fe.recordedValue!==null&&fe.recordedValue!==undefined?fmtFact(field,fe.recordedValue):fe.status==='conflicting'?'Conflicting':'—'),[statusLabel,statusClass]=factStatus(fe),pageCount=new Set((fe.raw||fe.sources||[]).map(x=>x.sourceUrl||x.source).filter(Boolean)).size,independentCount=Number(fe.independentSources||0);
        const sourceMeta=pageCount?`${pageCount} source page${pageCount===1?'':'s'}${independentCount?` · ${independentCount} independent`:''}`:null;
        factGrid.appendChild(el('div',{class:`evidence-field evidence-${statusClass}`},[el('span',{},fieldLabels[field]),el('strong',{},value),el('div',{class:'fact-meta'},[el('span',{class:`fact-status ${statusClass}`},statusLabel),sourceMeta?el('small',{},sourceMeta):null].filter(Boolean))]));
      }
      evidenceCard.appendChild(factGrid);
      const aux=ev.auxiliaryFacts||{},auxDefs=[['currentListPrice','Current list price','money'],['lastSalePrice','Last sale','money'],['lastSaleDate','Last sale date','text'],['lotSizeSqFt','Lot size','sqft'],['annualTaxes','Annual taxes','money'],['assessedValue','Assessed value','money'],['rentEstimate','Rent estimate','money'],['parcelNumber','Parcel / APN','text']],auxRows=[];
      for(const [key,label,type] of auxDefs){const x=aux[key];if(!x||x.value===null||x.value===undefined||x.value==='')continue;let v=String(x.value);if(type==='money')v=money(Number(x.value));else if(type==='sqft')v=`${Number(x.value).toLocaleString()} sq ft`;auxRows.push(el('div',{class:'aux-fact'},[el('span',{},label),el('strong',{},v),el('small',{},x.status==='verified'||x.status==='corroborated'?'Cross-source':'Recorded source')]))}
      if(auxRows.length)evidenceCard.appendChild(el('div',{class:'aux-fact-grid'},auxRows));
      const evidenceDetails=el('details',{class:'evidence-details'},[el('summary',{},'View source detail and provenance')]);
      for(const field of Object.keys(fieldLabels)){
        const fe=ev.fieldEvidence?.[field]||{},rows=fe.raw||[];if(!rows.length)continue;
        const group=el('div',{class:'evidence-source-group'},[el('b',{},fieldLabels[field])]);
        rows.forEach(x=>group.appendChild(el('div',{class:'evidence-source-row'},[el('span',{},fmtFact(field,x.value)),el('small',{},x.source||'Source'),x.sourceUrl?el('a',{href:x.sourceUrl,target:'_blank',rel:'noopener noreferrer'},'Open source'):null].filter(Boolean))));evidenceDetails.appendChild(group);
      }
      if(ev.conflicts?.length)evidenceDetails.appendChild(el('div',{class:'evidence-conflicts'},[el('b',{},'Conflicts retained — disputed facts are not silently chosen'),...ev.conflicts.map(x=>el('div',{class:'hint'},`${fieldLabels[x.field]||x.field}: ${(x.evidence||[]).map(y=>`${y.source} ${fmtFact(x.field,y.value)}`).join(' · ')}`))]));
      if(ev.conditionEvidence?.length){
        const cg=el('div',{class:'evidence-source-group'},[el('b',{},'Condition evidence')]);
        ev.conditionEvidence.slice(0,6).forEach(x=>{
          cg.appendChild(el('div',{class:'evidence-source-row condition-row'},[
            el('span',{},x.summary||x.evidenceText),
            el('small',{},x.source||'Source'),
            x.sourceUrl?el('a',{href:x.sourceUrl,target:'_blank',rel:'noopener noreferrer'},'Open source'):null
          ].filter(Boolean)));
        });
        evidenceDetails.appendChild(cg);
      }
      if(ev.webSources?.length){const counts=new Map();for(const u of ev.webSources){let host='web';try{host=new URL(u).hostname.replace(/^www\./,'')}catch{};const prior=counts.get(host)||{host,count:0,url:u};prior.count++;counts.set(host,prior)}const wg=el('div',{class:'evidence-source-group'},[el('b',{},'Public web sources')]);[...counts.values()].slice(0,10).forEach(x=>wg.appendChild(el('a',{class:'source-domain-link',href:x.url,target:'_blank',rel:'noopener noreferrer'},`${x.host}${x.count>1?` ×${x.count}`:''}`)));evidenceDetails.appendChild(wg)}
      evidenceCard.appendChild(evidenceDetails);
      const sourceNotes=[...(ev.limitations||[]),...(ev.errors||[])];if(sourceNotes.length)evidenceCard.appendChild(el('div',{class:`evidence-warning ${ev.errors?.length?'has-error':'is-note'}`},[el('b',{},ev.errors?.length?'Source limitations':'Source note'),el('span',{},sourceNotes.map(x=>x.source+': '+x.error).join(' · '))]));
      const refresh=el('button',{class:'btn-ghost compactbtn',onclick:()=>analyze(true)},'Refresh research');evidenceCard.appendChild(el('div',{class:'evidence-actions'},[el('div',{class:'hint'},ev.cache?.retrievedAt?`Last researched ${new Date(ev.cache.retrievedAt).toLocaleString()}${ev.cache.hit?' · cached to save API/Netlify usage':''}${ev.cache?.refreshProtected?' · recent research reused':''}`:'Research time unavailable'),refresh]));
      if((state.access?.adminUnlimited||state.user?.role==='admin')&&ev.diagnostics?.stages){const d=ev.diagnostics.stages,r=d.identity?.regrid||{},diag=el('details',{class:'research-diagnostics'},[el('summary',{},'Admin · Research diagnostics'),el('div',{class:'hint'},`Total research time: ${ev.diagnostics.durationMs??'—'} ms · ${ev.diagnostics.webPasses??0} public-web pass(es) · diagnostics are cached and do not issue provider calls.`)]);const rows=[['Regrid (optional)',`${r.status||'unknown'}${r.count!==undefined?' · '+r.count+' candidate(s)':''}`,d.identity?.durationMs],['Public web',`${d.web?.status||'unknown'}${d.web?.sourceCount!==undefined?' · '+d.web.sourceCount+' source URL(s)':''}${d.web?.passes?.length?' · '+d.web.passes.length+' pass(es)':''}`,null],['Closed-sale comp gate',`${d.compGate?.status||'unknown'}${d.compGate?.selected!==undefined?' · '+d.compGate.selected+' selected':''}${d.compGate?.sourceDiversity!==undefined?' · '+d.compGate.sourceDiversity+' source groups':''}${d.compGate?.distanceVerified!==undefined?' · '+d.compGate.distanceVerified+' distance-established':''}`,null]];for(const [name,st,ms] of rows)diag.appendChild(el('div',{class:'diagnostic-row'},[el('span',{},name),el('strong',{},st),el('small',{},ms!==null&&ms!==undefined?`${ms} ms`:'')]));for(const pass of d.web?.passes||[])diag.appendChild(el('div',{class:'diagnostic-row diagnostic-pass'},[el('span',{},pass.passLabel||'Public-web pass'),el('strong',{},`${pass.status||'unknown'} · ${pass.factRows||0} accepted / ${pass.returnedFactRows??pass.factRows??0} returned facts`),el('small',{},pass.error||pass.incompleteReason||'')]));evidenceCard.appendChild(diag)}
      const hasArv=()=>Number(calcArv())>0,rehabRows=a.rehab||[],recommendedRehab=rehabRows.find(x=>x.key===(a.recommendedRehabKey||ev.rehabAnalysis?.recommendedKey))||rehabRows.find(x=>x.key==='moderate')||rehabRows[0]||null;
      const snapshot=el('section',{class:'deal-intel-snapshot'},[
        metricCard(a.arv?.precision==='working_range'?'Working ARV':'After-repair value',hasArv()?money(calcArv()):'Withheld',hasArv()?(a.arv?.low&&a.arv?.high?`${money(a.arv.low)}–${money(a.arv.high)} ${a.arv?.precision==='working_range'?'working':'comp'} range`:a.arvMethod||'Comp-supported valuation'):'Awaiting a defensible sold-comp set'),
        metricCard('Repair planning',recommendedRehab?money(recommendedRehab.estimate):'—',recommendedRehab?`${recommendedRehab.label}${recommendedRehab.low&&recommendedRehab.high?` · ${money(recommendedRehab.low)}–${money(recommendedRehab.high)}`:''}`:'Condition/size evidence insufficient'),
        metricCard('Property',`${displayCore('bedrooms')??'—'} bd · ${displayCore('bathrooms')??'—'} ba`,displayCore('squareFootage')?`${Number(displayCore('squareFootage')).toLocaleString()} sq ft${displayCore('yearBuilt')?' · built '+displayCore('yearBuilt'):''}${establishedCount<5?' · recorded/established mix':''}`:'Living area not found'),
        metricCard('Evidence confidence',a.confidence||identity.confidence||'Low',`${foundCount}/5 surfaced · ${establishedCount} independently established${recordedCount?' · '+recordedCount+' recorded':''}${conflictCount?' · '+conflictCount+' conflict'+(conflictCount===1?'':'s'):''}`)
      ]);results.append(snapshot,evidenceCard);

      const rehabSel=el('select',{},rehabRows.map(x=>el('option',{value:x.key,selected:recommendedRehab?.key===x.key?'selected':null},`${x.label} — ${money(x.estimate)}`))),ask=el('input',{type:'number',placeholder:'Your purchase / contract price',value:ev.marketSnapshot?.askingPrice||ev.auxiliaryFacts?.currentListPrice?.value||''}),assignment=el('input',{type:'number',value:'10000'}),hold=el('input',{type:'number',value:'12000'}),numbers=el('div',{class:'dealnumbers'});
      const update=()=>{const arv=calcArv(),rh=(rehabRows.find(x=>x.key===rehabSel.value)||recommendedRehab)?.estimate||0,purchase=Number(ask.value)||0,fees=Number(assignment.value)||0,hc=Number(hold.value)||0;numbers.innerHTML='';snapshot.firstElementChild.replaceWith(metricCard(workingPrecision==='working_range'?'Working ARV':'After-repair value',arv?money(arv):'Withheld',arv?`${workingLow&&workingHigh?money(workingLow)+'–'+money(workingHigh)+' · ':''}${workingPrecision==='working_range'?'Working range; confirm before underwriting':'Comp-supported valuation'}`:'Awaiting subject facts and defensible sold-comp support'));if(!arv){numbers.append(metricCard('ARV','—','Awaiting sufficient sold-comp support'));numbers.append(metricCard('Repair estimate',rh?money(rh):'—','Planning estimate remains available'));numbers.append(metricCard('70% MAO','—','Unlocks when ARV passes the evidence gate'));numbers.append(metricCard('Projected spread','—','Unlocks when ARV passes the evidence gate'));return}const flip=arv-purchase-rh-hc,mao70=Math.max(0,Math.round(arv*.70-rh-fees)),projectCost=purchase+rh+hc;numbers.append(metricCard(workingPrecision==='working_range'?'Working ARV':'ARV',money(arv),workingPrecision==='working_range'?'Working comp range — not a precise valuation':'Comp-supported valuation'));numbers.append(metricCard('Repair estimate',money(rh),(rehabRows.find(x=>x.key===rehabSel.value)||recommendedRehab)?.label||'Planning scenario'));numbers.append(metricCard('70% MAO',money(mao70),'ARV × 70% − repairs − assignment target'));numbers.append(metricCard('Projected flip spread',purchase>0?money(flip):'—',purchase>0?'ARV − purchase − repairs − holding/closing':'Enter your purchase / contract price'));numbers.append(metricCard('Projected project cost',purchase>0?money(projectCost):'—',purchase>0?'Purchase + repairs + holding/closing':'Enter your purchase / contract price'));};
      const analyzer=el('section',{class:'card dealanalyzer'},[el('div',{class:'analysis-section-head'},[el('div',{},[el('div',{class:'sectiontitle'},'Deal Analyzer'),el('div',{class:'hint'},hasArv()?'Edit your acquisition assumptions below. Better keeps sourced property facts separate from your deal inputs.':'Repair planning stays available even when valuation evidence is limited. Selected and excluded sold comps show their screening reasons and source links. A working range is low-confidence underwriting support, not a precise ARV. ARV-dependent math unlocks when Better has a defensible precise or clearly-labeled working ARV range.')]),ev.marketSnapshot?.askingPrice?el('span',{class:'market-price-pill'},`Current ask ${money(ev.marketSnapshot.askingPrice)}`):null].filter(Boolean)),twoUp('Purchase / contract price',ask,'Repair scenario',rehabSel),twoUp('Assignment target',assignment,'Holding / closing allowance',hold),numbers]);[rehabSel,ask,assignment,hold].forEach(x=>x.oninput=update);update();results.appendChild(analyzer);

      const assumptions=el('div',{class:'card compsworkspace'},[el('div',{class:'sectiontitle'},'Smart Comps Workspace · Comp-supported valuation'),el('div',{class:'hint'},'Better favors recent nearby SOLD comps and does not use disputed subject facts as if they were verified. Add or remove sold comps you trust below.')]);(a.assumptions||[]).forEach(x=>assumptions.appendChild(el('div',{class:'rehabrow'},[el('span',{},x)])));(a.warnings||[]).forEach(x=>assumptions.appendChild(el('div',{class:'hint'},`Review: ${x}`)));results.appendChild(assumptions);
      const verifiedComps=(ev.comps||[]).filter(x=>x.salePrice).map(x=>({...x})),compHost=el('div',{class:'verified-comp-list'}),compSummary=el('div',{class:'comp-summary'});
      const repaintComps=async(recalculate=true)=>{compHost.innerHTML='';compSummary.innerHTML='';if(!verifiedComps.length){workingArv=0;update();compHost.appendChild(el('div',{class:'hint'},'No researched sold comps are available yet. Add verified closed sales manually if you have them.'));return}let ca;try{ca=recalculate?(await api('POST','/api/deal-builder/comp-analysis',{subject:ev.comparisonSubject||p,comps:verifiedComps})).compAnalysis:ev.compAnalysis}catch(e){compSummary.textContent=e.message;return}if(!ca){compHost.appendChild(el('div',{class:'hint'},'Saved comp scoring unavailable.'));return}ca.selected.forEach(c=>compHost.appendChild(el('div',{class:'verified-comp-row'},[el('div',{class:'grow'},[el('b',{},c.address||'Sold comparable'),el('span',{},`${money(c.salePrice)}${c.saleDate?' · sold '+c.saleDate:''}${c.distanceMiles?` · ${c.distanceMiles} mi`:''}`),el('small',{},`Similarity ${c.similarity}%${c.squareFootage?' · '+Number(c.squareFootage).toLocaleString()+' sf':''} · Adjusted sale ${money(c.adjustedSalePrice||c.salePrice)}${c.reasons?.length?' · Review: '+c.reasons.join(', '):''}`),c.sourceUrl?el('a',{href:c.sourceUrl,target:'_blank',rel:'noopener noreferrer'},'Open source'):null]),el('button',{class:'btn-ghost compactbtn',onclick:()=>{const ix=verifiedComps.findIndex(x=>String(x.address)===String(c.address)&&Number(x.salePrice)===Number(c.salePrice));if(ix>=0)verifiedComps.splice(ix,1);repaintComps();}},'Remove')])));if(ca.excluded?.length){const rejected=el('details',{},[el('summary',{},`Excluded sales · ${ca.excluded.length}`)]);ca.excluded.forEach(c=>rejected.appendChild(el('div',{class:'verified-comp-row'},[el('div',{class:'grow'},[el('b',{},c.address),el('span',{},`${money(c.salePrice)} · ${c.saleDate||'Date unavailable'}`),el('small',{},(c.reasons||[]).join(' · ')),c.sourceUrl?el('a',{href:c.sourceUrl,target:'_blank',rel:'noopener noreferrer'},'Open source'):null].filter(Boolean))])));compHost.appendChild(rejected);}const compPrecision=dealValuationPrecision(ev,ca),cEst=compPrecision!=='withheld'?Number(ca.estimate||ca.workingEstimate)||0:0,cLow=ca.low||ca.workingLow,cHigh=ca.high||ca.workingHigh;if(recalculate){workingArv=cEst;workingPrecision=cEst?compPrecision:'withheld';workingLow=cLow;workingHigh=cHigh;update();status.textContent=cEst?`Comp assumptions updated · ${workingPrecision==='working_range'?'Working ARV range; not a precise valuation':'Comp-supported ARV'} · Property facts retain their source status.`:'Comp assumptions updated · ARV withheld until subject facts and sold comps support valuation.';}if(!cEst)compSummary.appendChild(el('div',{class:'hint'},`ARV withheld · ${ca.selected.length} selected / ${ca.reviewed} reviewed. ${(ca.warnings||[]).join(' ')} Subject identity, size and non-conflicting property type are required for a working range.`));if(cEst){compSummary.append(metricCard(compPrecision==='precise'?'Comp-supported ARV':'Working ARV',money(cEst),`${ca.confidence} confidence · ${ca.selected.length} selected sold comp${ca.selected.length===1?'':'s'} · ${compPrecision==='precise'?'precise gate passed':'subject or distance support incomplete'}`),el('div',{class:'hint'},`Observed comp range ${money(cLow)}–${money(cHigh)}. ${ca.warnings.join(' ')}`));update();}};
      const compCard=el('div',{class:'card verified-comps-card'},[el('div',{class:'sectiontitle'},'Closed-sale comps · researched automatically'),el('div',{class:'hint'},ev.configured?'Better researches multiple public real-estate and brokerage sources by default, adds authorized MLS/RESO when configured, and uses parcel records only as optional corroboration. Closed sales are cross-checked, deduplicated, screened for distress/outliers, and ranked by recency and similarity before ARV is calculated.':'No live evidence source is connected. Add closed-sale evidence you trust manually.')]);
      const addComp=el('button',{class:'btn-ghost',onclick:()=>openFormModal('Add verified sold comp',[{key:'address',label:'Comp address',placeholder:'123 Comparable St'},{key:'salePrice',label:'Sold price',type:'number'},{key:'saleDate',label:'Sale date',type:'date'},{key:'distanceMiles',label:'Distance (miles)',type:'number'},{key:'squareFootage',label:'Square feet',type:'number'},{key:'bedrooms',label:'Beds',type:'number'},{key:'bathrooms',label:'Baths',type:'number'},{key:'yearBuilt',label:'Year built',type:'number'},{key:'propertyType',label:'Property type',placeholder:'Single family'}],'Add sold comp',async v=>{if(!v.address.trim()||Number(v.salePrice)<=0)throw new Error('Comp address and sold price are required.');verifiedComps.push({...v,salePrice:Number(v.salePrice),distanceMiles:Number(v.distanceMiles)||null,squareFootage:Number(v.squareFootage)||null,bedrooms:Number(v.bedrooms)||null,bathrooms:Number(v.bathrooms)||null,yearBuilt:Number(v.yearBuilt)||null});await repaintComps();})},'Add verified sold comp');compCard.append(addComp,compSummary,compHost);results.appendChild(compCard);await repaintComps(false);
      const rh=el('section',{class:'card rehabcards'},[el('div',{class:'analysis-section-head'},[el('div',{},[el('div',{class:'sectiontitle'},'Repair planning'),el('div',{class:'hint'},a.rehabBasis||ev.rehabAnalysis?.basis||'Scenario planning from established/recorded size, age and sourced condition evidence.')]),el('span',{class:'fact-status corroborated'},'Planning estimate')]),el('div',{class:'rehab-scenario-grid'})]);const rhGrid=rh.querySelector('.rehab-scenario-grid');rehabRows.forEach(x=>rhGrid.appendChild(el('div',{class:`rehab-scenario ${recommendedRehab?.key===x.key?'recommended':''}`},[el('div',{class:'rehab-scenario-head'},[el('b',{},x.label),recommendedRehab?.key===x.key?el('span',{class:'recommended-pill'},'Recommended'):null].filter(Boolean)),el('strong',{},money(x.estimate)),x.low&&x.high?el('small',{},`${money(x.low)}–${money(x.high)} planning range`):null,el('div',{class:'hint'},x.scope),el('small',{},`~$${x.perSqFt}/sf midpoint`)])));rh.appendChild(el('div',{class:'rehab-disclaimer'},ev.rehabAnalysis?.disclaimer||'Planning estimate only — actual contractor scope and hidden conditions can materially change cost.'));results.appendChild(rh);
      const use=el('button',{class:'submitbtn'},'Use this property in a new listing');use.onclick=()=>{state.dealBuilderDraft={address:p.addressLine1||p.formattedAddress||address.value,city:[p.city,p.state].filter(Boolean).join(', '),propertyType:p.propertyType||'',arv:calcArv()||'',beds:p.bedrooms,baths:p.bathrooms,sqft:p.squareFootage,year:p.yearBuilt,rehab:(a.rehab||[]).find(x=>x.key===rehabSel.value)?.estimate||'',asking:ask.value,notes:aiDraft?.description||''};go('compose',{dealBuilderDraft:state.dealBuilderDraft})};results.appendChild(use);
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

function wirePropertyPhotoDrag(preview,status,redraw){
  let drag=null,frame=0;
  const finish=(commit=false)=>{
    if(!drag)return;const d=drag;drag=null;cancelAnimationFrame(frame);d.ghost?.remove();d.tile.classList.remove('is-dragging');preview.querySelectorAll('.is-drop-target').forEach(x=>x.classList.remove('is-drop-target'));
    document.removeEventListener('keydown',escape);try{d.handle.releasePointerCapture(d.id);}catch{}
    if(commit&&d.started&&d.to!==null&&d.to!==d.from){state.composePhotos=reorderPropertyPhotos(state.composePhotos,d.from,d.to);redraw();status.textContent=`Photo moved to position ${d.to+1}. Save to keep your order.`;preview.querySelector(`[data-photo-index="${d.to}"] .property-photo-handle`)?.focus({preventScroll:true});}
    else if(d.started)status.textContent='Photo order unchanged.';
  };
  const escape=e=>{if(e.key==='Escape'){e.preventDefault();finish();}};
  const locate=()=>{
    if(!drag)return;const d=drag;preview.querySelectorAll('.is-drop-target').forEach(x=>x.classList.remove('is-drop-target'));const r=preview.getBoundingClientRect();d.to=null;
    if(d.x<r.left-12||d.x>r.right+12||d.y<r.top-12||d.y>r.bottom+12)return;
    let best=Infinity;preview.querySelectorAll('.property-photo-tile').forEach(tile=>{const b=tile.getBoundingClientRect(),distance=Math.hypot(d.x-(b.left+b.width/2),d.y-(b.top+b.height/2));if(distance<best){best=distance;d.to=Number(tile.dataset.photoIndex);}});
    preview.querySelector(`[data-photo-index="${d.to}"]`)?.classList.add('is-drop-target');
  };
  const tick=()=>{if(!drag)return;if(!preview.isConnected){finish();return;}if(drag.started){const speed=drag.y<70?-10:drag.y>innerHeight-70?10:0;if(speed){window.scrollBy(0,speed);locate();}}frame=requestAnimationFrame(tick);};
  preview.addEventListener('pointerdown',e=>{const handle=e.target.closest('.property-photo-handle');if(!handle||e.button!==0||!e.isPrimary)return;finish();const tile=handle.closest('.property-photo-tile');drag={id:e.pointerId,handle,tile,from:Number(tile.dataset.photoIndex),to:null,x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,started:false};handle.setPointerCapture(e.pointerId);document.addEventListener('keydown',escape);e.preventDefault();frame=requestAnimationFrame(tick);});
  preview.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;const d=drag;d.x=e.clientX;d.y=e.clientY;if(!d.started&&Math.hypot(d.x-d.startX,d.y-d.startY)>6){d.started=true;d.ghost=d.tile.cloneNode(true);d.ghost.className='property-photo-tile property-photo-drag-ghost';d.ghost.setAttribute('aria-hidden','true');d.ghost.inert=true;document.body.appendChild(d.ghost);d.tile.classList.add('is-dragging');status.textContent='Dragging photo. Drop on another photo to reorder.';}if(d.started){d.ghost.style.left=`${d.x-56}px`;d.ghost.style.top=`${d.y-80}px`;locate();e.preventDefault();}});
  preview.addEventListener('pointerup',e=>{if(drag&&e.pointerId===drag.id){drag.x=e.clientX;drag.y=e.clientY;locate();finish(true);}});preview.addEventListener('pointercancel',()=>finish());preview.addEventListener('lostpointercapture',()=>finish());return ()=>finish();
}
async function renderCompose() {
  const editingId=state.composeEditId||null;let editingListing=null;
  if(editingId){const r=await api('GET','/api/listings/'+encodeURIComponent(editingId));editingListing=r.listing;if(!editingListing||(editingListing.ownerId!==state.user?.id&&!state.access?.adminUnlimited))throw new Error('You do not have permission to edit this property.');}
  const wrap = el('div', { class: 'panel composepage' });
  wrap.appendChild(el('h2', {}, editingListing?'Edit property':'Post a property'));
  wrap.appendChild(el('div', { class: 'sub' }, editingListing?'Update the property details buyers see. Changes publish immediately.':'Appears in the feed immediately, ranked for the buyers it fits.'));
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
  if(editingListing){['address','city','propertyType','situation','asking','arv','rehab','beds','baths','sqft','year','timeline','contractDeadline','videoUrl','notes'].forEach(k=>{if(editingListing[k]!==undefined&&editingListing[k]!==null&&f[k])f[k].value=editingListing[k];});}
  if (state.dealBuilderDraft&&!editingListing) { const d=state.dealBuilderDraft; ['address','city','propertyType','asking','arv','rehab','beds','baths','sqft','year','notes'].forEach(k=>{ if(d[k]!==undefined&&d[k]!==null&&f[k]) f[k].value=d[k]; }); state.dealBuilderDraft=null; }
  const builderLink = el('button',{class:'btn-primary',type:'button',onclick:()=>go('dealbuilder')},'Analyze an address with AI Deal Builder');
  if(!editingListing)wrap.appendChild(el('div',{class:'dealbuilderentry'},[el('div',{},[el('b',{},'Starting with an address?'),el('div',{class:'hint'},'Generate a preliminary description, ARV range, repair scenarios and deal analysis from the address before you build the listing.')]),builderLink]));
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
  if(!editingListing)wrap.appendChild(el('div', { class: 'dispoimport' }, [
    el('div', { class: 'dispoeyebrow' }, 'AUTO AI DEAL BUILDER'),
    el('h3', {}, 'Turn messy deal notes into a ready-to-market deal.'),
    el('div', { class: 'hint' }, 'Paste a Facebook post, email blast, text thread or rough notes. Better Real Estate extracts the deal facts, then Better Dispo handles buyer matching and distribution after you post.'),
    state.access?.pro ? el('div', { class: 'usagepill '+(dispoUsage?.unlimited?'unlimited':''), style:'margin-top:8px' }, dispoUsage?.unlimited?'Unlimited AI-enhanced imports':`${dispoUsage?.remaining ?? 0} of ${dispoUsage?.limit ?? 3} AI-enhanced imports remaining today`) : el('div',{class:'hint',style:'margin-top:6px'},'Smart import is available to everyone. Better Plus adds 3 AI-enhanced imports per day; Platinum is unlimited.'),
    state.access?.pro ? el('div', { class: 'hint', style: 'margin-top:6px' }, 'AI enhancement may send the pasted text to the configured AI provider. Review it before submitting if it contains information you do not want sent to the AI provider.') : null,
    importText, importBtn, importStatus
  ]));

  if(editingId!==(state.composeEditId||null))return wrap;
  state.composePhotos = editingListing?[...(editingListing.photos||[])]:[];
  const fileInput = el('input', { type: 'file', accept: 'image/*', multiple: true, style: 'display:none' });
  const preview = el('div', { class: 'previewrow' });
  const picker = el('div', { class: 'picker', onclick: () => fileInput.click() }, 'Tap to add photos (up to 12)');
  fileInput.onchange = async () => {
    for (const file of [...fileInput.files].slice(0, 12 - state.composePhotos.length)) state.composePhotos.push(await downscale(file));
    fileInput.value = ''; draw();
  };
  const photoOrderStatus=el('div',{class:'hint property-photo-order-status',role:'status','aria-live':'polite'});
  const cancelPhotoDrag=wirePropertyPhotoDrag(preview,photoOrderStatus,draw);
  function draw() {
    cancelPhotoDrag();
    preview.innerHTML = '';
    state.composePhotos.forEach((p,i)=>{
      const move=(to)=>{state.composePhotos=reorderPropertyPhotos(state.composePhotos,i,to);draw();photoOrderStatus.textContent=`Photo moved to position ${to+1}. The first photo is the cover.`;preview.querySelector(`[data-photo-index="${to}"] .property-photo-actions button:not(:disabled)`)?.focus({preventScroll:true});};
      preview.appendChild(el('div',{class:'property-photo-tile','data-photo-index':i},[
        el('img',{src:p,alt:`Property photo ${i+1}`,draggable:'false'}),
        el('button',{type:'button',class:'property-photo-caption property-photo-handle','aria-label':`Drag photo ${i+1} to reorder`},`⠿ ${i===0?'Cover photo':`Photo ${i+1}`}`),
        el('div',{class:'property-photo-actions'},[
          el('button',{type:'button',class:'btn-ghost',disabled:i===0?'disabled':null,'aria-label':`Move photo ${i+1} earlier`,onclick:()=>move(i-1)},'←'),
          el('button',{type:'button',class:'btn-ghost',disabled:i===state.composePhotos.length-1?'disabled':null,'aria-label':`Move photo ${i+1} later`,onclick:()=>move(i+1)},'→')
        ]),
        el('button',{type:'button',class:'property-photo-remove','aria-label':`Remove photo ${i+1}`,onclick:()=>{state.composePhotos.splice(i,1);draw();photoOrderStatus.textContent='Photo removed.';}},'×')
      ]));
    });
    picker.textContent = state.composePhotos.length ? `Add more (${state.composePhotos.length}/12)` : 'Tap to add photos (up to 12)';
  }
  wrap.appendChild(el('label', {}, 'Photos')); wrap.appendChild(picker); wrap.appendChild(fileInput);wrap.appendChild(el('div',{class:'hint'},'Drag a photo by its label to change the order, or use the arrows. The first photo is the cover. Save to keep your new order.')); wrap.appendChild(preview);wrap.appendChild(photoOrderStatus);draw();
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
  const openToJV = el('input', { type:'checkbox' });openToJV.checked=!!editingListing?.openToJV;
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
  const submit = el('button', { class: 'submitbtn' }, editingListing?'Save property changes':'Post to feed');
  submit.onclick = async () => {
    err.textContent='';submit.disabled=true;submit.textContent=editingListing?'Saving…':'Posting…';
    try {
      const payload = { photos: state.composePhotos };
      for (const k in f) payload[k] = f[k].value;
      payload.openToJV = openToJV.checked;
      const r=editingListing?await api('PATCH','/api/listings/'+encodeURIComponent(editingListing.id),payload):await api('POST','/api/listings',payload);
      state.composePhotos=[];state.composeEditId=null;mascotSiteEvent('listing');
      toast(editingListing?'Property updated.':(r.matchCount?`Posted — ${r.matchCount} buyer${r.matchCount===1?'':'s'} currently match this deal.`:'Posted — Better Dispo is checking buyer demand.'),'ok');
      go('detail', { detailId: r.listing.id, photoIdx: 0 });
    }catch(e){err.textContent=e.message;mascotSiteEvent('error');submit.disabled=false;submit.textContent=editingListing?'Save property changes':'Post to feed';}
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
    if (user.friendStatus === 'friends' && !confirm('Remove ' + user.name + ' from your friends?')) return;
    try {
      await withButtonBusy(b, async () => {
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
          await api('DELETE', '/api/friends/' + encodeURIComponent(user.id));
          user.friendStatus = 'none'; user.friendRequestId = null;
        }
        await refreshUnread();
        b.textContent = friendLabel(user.friendStatus);
        if (onChanged) onChanged(user);
      });
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
      el('div', { class: 'personsub' }, [user.company?.name, roleLabel(user), ...(user.markets || []), user.location].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).slice(0, 3).join(' · ')),
      el('div', { class: 'personstats' }, `${user.listingCount || 0} listings · ${user.followerCount || 0} followers · ${user.friendCount || 0} friends`)
    ])
  ]);
  card.appendChild(main);
  const actions = el('div', { class: 'personactions' });
  const follow = el('button', {}, user.following ? 'Following' : 'Follow');
  follow.onclick = async () => {
    try { await withButtonBusy(follow, async () => { const r = await api('POST', '/api/follow', { userId: user.id }); user.following = r.following; follow.textContent = r.following ? 'Following' : 'Follow'; }); }
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
    load();
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
        accept.onclick = async () => { try { await withButtonBusy(accept, async () => { await api('POST', '/api/friends/requests/' + encodeURIComponent(r.id) + '/respond', { action: 'accept' }); await refreshUnread(); render(); }); } catch (e) { toast(e.message, 'err'); } };
        const decline = el('button', {}, 'Decline');
        decline.onclick = async () => { try { await withButtonBusy(decline, async () => { await api('POST', '/api/friends/requests/' + encodeURIComponent(r.id) + '/respond', { action: 'decline' }); await refreshUnread(); render(); }); } catch (e) { toast(e.message, 'err'); } };
        card.appendChild(el('div', { class: 'listrow' }, [avatarNode(r.user, 'small'), el('div', { class: 'grow', onclick: () => go('profile', { profileId: r.user.id }) }, [el('div', { class: 't' }, r.user.name), el('div', { class: 's' }, [roleLabel(r.user), ...(r.user.markets || [])].filter(Boolean).slice(0, 2).join(' · '))]), accept, decline]));
      });
      wrap.appendChild(card);
    }
    wrap.appendChild(el('div', { class: 'sectiontitle' }, `Sent${outgoing.length ? ' · ' + outgoing.length : ''}`));
    if (!outgoing.length) wrap.appendChild(el('div', { class: 'empty compact' }, el('p', {}, 'No pending requests sent.')));
    else {
      const card = el('div', { class: 'card' });
      outgoing.forEach(r => {
        const cancel = el('button', {}, 'Cancel');
        cancel.onclick = async () => { try { await withButtonBusy(cancel, async () => { await api('DELETE', '/api/friends/request/' + encodeURIComponent(r.id)); await refreshUnread(); render(); }); } catch (e) { toast(e.message, 'err'); } };
        card.appendChild(el('div', { class: 'listrow' }, [avatarNode(r.user, 'small'), el('div', { class: 'grow', onclick: () => go('profile', { profileId: r.user.id }) }, [el('div', { class: 't' }, r.user.name), el('div', { class: 's' }, 'Request pending')]), cancel]));
      });
      wrap.appendChild(card);
    }
    return wrap;
  }

  const controls = el('div', { class: 'networksearch' });
  const q = el('input', { placeholder: 'Search name, @username, company, market or role…', value: state.networkQ || '' });
  const role = el('select');
  [['all','All people'],['buyer','Buyers / Investors'],['seller','Sellers / Wholesalers'],['lender','Lenders / Funders']].forEach(([v,l]) => role.appendChild(el('option', { value: v, selected: state.networkRole === v ? 'selected' : null }, l)));
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
  load();
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
  }, 10000);
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
    el('div', { class: 'chatperson', onclick: () => go('profile', { profileId: other.id }) }, [avatarNode(other, 'small'), el('div', {}, [el('b', {}, other.name), el('span', {}, [roleLabel(other), ...(other.markets || [])].filter(Boolean).slice(0,2).join(' · '))])]),
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

  let sendingMessage = false;
  const doSend = async () => {
    const body = input.value.trim();
    if (!body || sendingMessage || send.dataset.busy === 'true') return;
    sendingMessage = true;
    const optimistic = { id: 'pending-' + Date.now(), body, outgoing: true, at: new Date().toISOString() };
    input.value = '';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    renderMessagesIntoStream([...messages, optimistic]);
    try {
      await withButtonBusy(send, async () => {
        await api('POST', '/api/messages', { toUserId: other.id, body });
        await syncChat({ force: true });
      });
    } catch (e) {
      renderMessagesIntoStream(messages);
      input.value = input.value.trim() ? body + '\n' + input.value : body;
      toast(e.message, 'err');
    } finally {
      sendingMessage = false;
      input.focus();
    }
  };
  send.onclick = doSend;
  input.onkeydown = e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); } };
  setTimeout(() => { stream.scrollTop = stream.scrollHeight; input.focus(); }, 0);
  startViewPolling(async () => {
    if (state.view !== 'chat' || !state.chatUserId || sendingMessage) return;
    await syncChat();
  }, 6000);
  return wrap;
}

function demoFounderPreview(){return state.user?.demo&&state.user?.demoPreview?.type==='founder'?state.user.demoPreview:null;}
function demoFounderPreviewDismissKey(preview=demoFounderPreview()){return preview?`bre-demo-founder-welcome-dismissed:${preview.createdAt||preview.position||'active'}`:null;}
function demoFounderPreviewDismissed(){const key=demoFounderPreviewDismissKey();return !!(key&&sessionStorage.getItem(key)==='1');}
function founderDisplayPosition(){return Number(demoFounderPreview()?.position||state.user?.founderLaunchPosition||0)||null;}
function founderInviteMessage(){
  const link=`${location.origin}/s/join?ref=${encodeURIComponent(state.user?.referralCode||'')}`;
  return {link,text:`I’m one of the first 50 Founding Members on Better Real Estate. It’s a real estate network and workspace for deals, buyers, investors, deal analysis, pipelines and more. Join through my link: ${link}`};
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
    el('div',{class:'eyebrow'},preview?'DEMO PREVIEW · FIRST 50 FOUNDING MEMBER':'FIRST 50 FOUNDING MEMBER'),
    el('h2',{},'You helped start Better Real Estate.'),
    el('p',{class:'founder-welcome-copy'},preview?`This is a safe preview of Founder #${position}. A real qualifying member would receive Founding Member recognition and 14 days of complimentary Platinum access${expires?` through ${expires}`:''}. Nothing is being awarded to this demo account.`:`You’re one of the first 50 qualifying members. Your account has Founding Member recognition${expires?` and complimentary Platinum access through ${expires}`:''}.`),
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
    el('div',{class:'admin-access-stat'},[el('small',{},'FOUNDING BONUS'),el('b',{},u.founderAward?`Founder #${u.founderAward.position}`:'Not enrolled'),el('span',{},founderActive?`Platinum through ${new Date(founderUntil).toLocaleDateString()}`:u.founderAward?'Platinum bonus ended':'First 50 program only')]),
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
      el('button',{class:'dangerbtn',onclick:async()=>{if(!confirm(`Revoke ${u.name}’s complimentary access? Paid access and the First 50 bonus stay untouched.`))return;try{await api('POST','/api/admin/memberships/revoke',{userId:u.id});toast('Complimentary membership revoked','ok');close();await onDone();}catch(e){status.textContent=e.message;}}},'Revoke grant')
    );
  }else actions.append(el('button',{class:'btn-primary',onclick:()=>act('replace')},'Grant access'));
  card.appendChild(actions);shade.appendChild(card);document.body.appendChild(shade);
}

/* ================= PROFILES ================= */
async function renderMe() {
  const wrap = el('div', { class: 'page' });
  const [d,w] = await Promise.all([api('GET', '/api/users/' + state.user.id + '/listings'),api('GET', '/api/wallet')]);
  const mineHeader = el('div', { class: 'profilehero' }, [
    avatarNode(state.user, 'profile'),
    el('div', { class: 'profileherobody' }, [
      el('h2', {}, [state.user.name, state.user.verified ? el('span', { class: 'vbadge' }, '✓ Verified') : null, state.user.foundingMember ? el('span',{class:'founding-badge'},state.user.founderLaunchPosition?`Founding Member · #${state.user.founderLaunchPosition}`:'Founding Member') : null, state.user.settings?.showMembershipLevel !== false ? membershipBadge(state.access?.adminUnlimited ? 'Admin' : state.access?.wholesale ? 'Wholesale Teams' : state.access?.platinum ? 'Platinum' : state.access?.pro ? 'Plus' : state.access?.trial ? 'Trial' : 'Free') : null]),
      state.user.username ? el('div', { class: 'profileusername' }, '@' + state.user.username) : null,
      el('div', { class: 'sub' }, `${roleLabel(state.user)} · ${d.listings.length} listing(s) · ${d.followerCount} follower(s) · ${d.friendCount || 0} friend(s) · ${state.user.points} pts · ${state.access?.adminUnlimited ? 'Admin — Unlimited' : state.access?.wholesale ? 'Wholesale Teams' : state.access?.platinum ? 'Platinum' : state.access?.pro ? 'Plus' : state.access?.trial ? 'Trial' : 'Free'}`),
      state.user.location ? el('div', { class: 'profilelocation' }, state.user.location) : null,
      state.user.investmentMarkets?.length ? el('div',{class:'profile-markets'},state.user.investmentMarkets.map(x=>el('span',{},x))) : null,
      state.user.bio ? el('p', { class: 'profilebio' }, state.user.bio) : null,
      el('div',{class:'profile-actions'},[el('button', { class: 'btn-ghost profileeditbtn profile-action-equal', onclick: () => go('settings') }, state.user.avatarUrl ? 'Edit profile' : 'Add profile photo'),el('button',{class:'btn-ghost profile-action-equal',onclick:async()=>{const url=location.origin+'/s/profile/'+encodeURIComponent(state.user.username||state.user.id);try{await navigator.clipboard.writeText(url);toast('Public profile link copied','ok')}catch{prompt('Copy public profile link',url);}}},'Copy public profile')])
    ])
  ]);
  wrap.appendChild(mineHeader);

  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(cents(w.balance), 'Wallet'), stat(state.user.unlockCredits, 'Unlocks'), stat(d.listings.length, 'Listings')
  ]));

  if(state.user.founderLaunchPosition){
    const until=state.user.founderPlatinumUntil?new Date(state.user.founderPlatinumUntil):null;
    wrap.appendChild(el('div',{class:'card founder-program-card'},[
      el('div',{class:'founder-program-copy'},[el('div',{class:'eyebrow'},`FOUNDING MEMBER #${state.user.founderLaunchPosition}`),el('h3',{},'You’re part of the first 50.'),el('p',{class:'sub'},until&&until>new Date()?`Your complimentary Platinum access is active through ${until.toLocaleDateString()}. Invite your network with your personal referral link.`:'Your Founding Member recognition stays on your profile. Invite your network with your personal referral link.')]),
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
  groups.forEach(([title,items])=>{const g=el('section',{class:'profile-toolgroup'},[el('div',{class:'eyebrow'},title)]);items.forEach(([t,v])=>{const count=notificationCountFor(v);g.appendChild(el('button',{class:'profile-tool',onclick:()=>go(v)},[el('span',{},t),el('span',{class:'profile-tool-tail'},[notificationBadge(count,'msgbadge profile-row-badge'),el('b',{},'→')]) ]));});toolgroups.appendChild(g);});
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
  if (!d.listings.length) wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Your deal board is waiting.'), el('p', {}, 'Post a property and start building buyer momentum.'),el('button',{class:'btn-primary empty-action',onclick:()=>go('compose')},'Post your first property')]));
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
    el('div', { class: 'sub' }, `${roleLabel(owner)} · ${listings.length} listing(s) · ${followerCount} follower(s) · ${friendCount || 0} friend(s)` + (avg ? ` · ★ ${avg} (${reviews.length})` : '')),
    owner.location ? el('div', { class: 'profilelocation' }, owner.location) : null,
    owner.investmentMarkets?.length ? el('div',{class:'profile-markets'},owner.investmentMarkets.map(x=>el('span',{},x))) : null,
    owner.bio ? el('p', { class: 'profilebio' }, owner.bio) : null
  ]);
  const profileHero = el('div', { class: 'profilehero' }, [avatarNode(owner, 'profile'), profileBody]);
  wrap.appendChild(profileHero);
  if(credibility) wrap.appendChild(el('div',{class:'credibility-row'},[credibility.accountSince?el('span',{},'Member since '+new Date(credibility.accountSince).toLocaleDateString(undefined,{month:'short',year:'numeric'})):null,el('span',{},`${credibility.verifiedClosings||0} verified closing${credibility.verifiedClosings===1?'':'s'}`),credibility.responseRate!==null?el('span',{},`${credibility.responseRate}% response rate`):null].filter(Boolean)));
  wrap.appendChild(shareStrip({ kind: 'profile', targetId: owner.id, title: `${owner.name} on Better Real Estate`, text: `${roleLabel(owner)}${owner.location ? ' · ' + owner.location : ''}` }));

  if (state.user && state.user.id !== owner.id) {
    const actions = el('div', { class: 'profileactions' });
    const fb = el('button', { class: 'btn-ghost' }, 'Follow');
    api('GET', '/api/follow/status/' + owner.id).then(({ following }) => fb.textContent = following ? 'Following' : 'Follow').catch(() => {});
    fb.onclick = async () => { try { await withButtonBusy(fb, async () => { const { following } = await api('POST', '/api/follow', { userId: owner.id }); fb.textContent = following ? 'Following' : 'Follow'; }); } catch (e) { toast(e.message, 'err'); } };
    actions.appendChild(fb);
    const friendUser = { ...owner, friendStatus: friendship?.status || 'none', friendRequestId: friendship?.requestId || null };
    actions.appendChild(friendButton(friendUser, () => render()));
    actions.appendChild(el('button', { class: 'btn-primary', onclick: () => go('chat', { chatUserId: owner.id }) }, 'Message'));
    if (hasRole(owner, 'seller')) actions.appendChild(el('button', { class: 'btn-ghost', onclick: () => go('buyerportal', { buyerPortalType: 'user', buyerPortalId: owner.id }) }, 'Join buyer list'));
    wrap.appendChild(actions);
  }
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Listings'));
  const grid = el('div', { class: 'minigrid' });
  listings.forEach(l => grid.appendChild(el('div', { class: 'minicard', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [
    el('div', { class: 'mi' }, l.photos?.length ? el('img', { src: l.photos[0] }) : null),
    el('div', { class: 'mt' }, [el('b', {}, l.address), el('span', {}, money(l.asking))])
  ])));
  wrap.appendChild(listings.length ? grid : el('div', { class: 'empty' }, [el('h3',{},'Nothing posted yet.'),el('p',{},'This profile is ready for its first deal.') ]));

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

function renderSettings() {
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

  if (state.user.role !== 'admin') {
    wrap.appendChild(el('div', { class: 'sectiontitle' }, 'How you work'));
    let selectedRoles = userRoles(state.user);
    const roleBox = el('div', { class:'card role-settings' }, [
      el('div', { class:'settings-copy' }, [el('b', {}, 'Your account type and roles'), el('div', { class:'hint' }, 'Choose real estate roles to appear in Network, or Marketing / Affiliate only to stay separate. Changing your account type does not approve or remove affiliate access.')])
    ]);
    const rolePicker = buildRoleSelector(selectedRoles, next => { selectedRoles = next; });
    roleBox.appendChild(rolePicker.element);
    const roleStatus = el('div', { class:'okmsg', 'aria-live':'polite' });
    roleBox.appendChild(el('button', { class:'btn-primary', onclick:async e => {
      roleStatus.textContent=''; roleStatus.className='okmsg';
      if (!selectedRoles.length) { roleStatus.className='errmsg'; roleStatus.textContent='Choose at least one role.'; return; }
      try { await withButtonBusy(e.currentTarget, async () => { const { user } = await api('PATCH','/api/me',{roles:selectedRoles}); state.user=user; roleStatus.textContent='Roles saved.'; }); }
      catch(err) { roleStatus.className='errmsg'; roleStatus.textContent=err.message; }
    } }, 'Save roles'));
    roleBox.appendChild(roleStatus);
    wrap.appendChild(roleBox);
  }

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Investment markets'));
  let selectedMarkets=[...(state.user.investmentMarkets||[])];
  const marketBox=el('div',{class:'card market-settings'},[el('div',{class:'settings-copy'},[el('b',{},'Where do you work?'),el('div',{class:'hint'},'Choose one or more states. Better Real Estate uses these as a relevance signal in For You — it never locks you out of opportunities elsewhere.')])]);
  marketBox.appendChild(statePicker(selectedMarkets,x=>selectedMarkets=x));
  marketBox.appendChild(el('button',{class:'btn-primary',onclick:async()=>{const r=await api('PATCH','/api/me/markets',{states:selectedMarkets});state.user.investmentMarkets=r.states;toast('Investment markets saved','ok');}},'Save markets'));
  wrap.appendChild(marketBox);

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Appearance & alerts'));
  const s = state.user.settings || {};
  const sbox = el('div', { class: 'card' });
  const adRow=toggleRow('Advertising measurement', 'Meta Pixel measures public marketing page visits. Turn this off to opt out on your account and this browser. Browser privacy signals take priority; private pages are excluded.', s.adMeasurement!==false&&!window.BetterPixel?.disabled(),()=>{});
  const adSwitch=adRow.querySelector('.switch');adSwitch.setAttribute('role','switch');adSwitch.setAttribute('aria-label','Advertising measurement');adSwitch.setAttribute('aria-checked',String(adSwitch.classList.contains('on')));
  adSwitch.onclick=()=>withButtonBusy(adSwitch,async()=>{const on=!adSwitch.classList.contains('on');try{const {settings}=await api('PATCH','/api/me/settings',{adMeasurement:on});state.user.settings=settings;if(on)window.BetterPixel?.enable();else window.BetterPixel?.disable();const active=on&&!window.BetterPixel?.disabled();adSwitch.classList.toggle('on',active);adSwitch.setAttribute('aria-checked',String(active));toast(active?'Advertising measurement enabled':'Advertising measurement disabled','ok');}catch(e){toast(e.message,'err');}});sbox.appendChild(adRow);
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
  sbox.appendChild(toggleRow('Better Guide contextual tips', 'Lets the mascot tailor help to the Better page you are currently using. No fake activity or invented deal facts.', s.guideContextTips !== false, async on => { const { settings } = await api('PATCH','/api/me/settings',{guideContextTips:on}); state.user.settings=settings; }));
  sbox.appendChild(toggleRow('Better Guide animations', 'Keeps mascot movement subtle. Reduced-motion system settings are always respected.', s.guideAnimations !== false, async on => { const { settings } = await api('PATCH','/api/me/settings',{guideAnimations:on}); state.user.settings=settings; }));
  const guideActions=el('div',{class:'guide-settings-actions'},[el('button',{class:'btn-ghost',onclick:()=>startTutorial(true)},'Restart platform tutorial'),el('button',{class:'btn-ghost',onclick:()=>go('learn')},'Open free wholesaling course')]);
  sbox.appendChild(guideActions);
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
  const emailPrefsHost = el('div', { class:'card settings-async-card' }, el('div',{class:'settings-inline-loading'},'Loading email preference…'));
  wrap.appendChild(emailPrefsHost);
  api('GET', '/api/email-preferences').then(ep => {
    if (!emailPrefsHost.isConnected || state.view !== 'settings') return;
    emailPrefsHost.innerHTML = '';
    emailPrefsHost.appendChild(toggleRow('Product & activity emails', 'New listings, marketplace updates and occasional reminders. Never more than once every 48 hours. Transactional emails such as receipts and password resets are separate.', ep.marketingOptIn === true, async on => {
      const r = await api('PATCH', '/api/email-preferences', { marketingOptIn: on });
      ep.marketingOptIn = r.marketingOptIn;
      toast(on ? 'Marketing emails turned on' : 'Marketing emails turned off', 'ok');
    }));
    emailPrefsHost.appendChild(el('div', { class: 'hint', style: 'padding:0 16px 14px' }, 'You can also unsubscribe from the link in any marketing email.'));
  }).catch(() => { if (emailPrefsHost.isConnected) emailPrefsHost.replaceChildren(el('div',{class:'hint',style:'padding:14px 16px'},'Email preferences are temporarily unavailable. The rest of Settings is ready to use.')); });

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
      el('div', { class: 's' }, `${roleLabel(r)}${r.rating ? ' · ★ ' + r.rating : ''}${r.closedDeals ? ' · ' + r.closedDeals + ' closed' : ''}`)
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
  const audience = el('select', {'aria-label':'Email audience'}, [
    ['all','All opted-in users'],['selected','Select individual people'],['buyers','Buyers'],['sellers','Sellers / wholesalers'],['teams','Wholesale Team members']
  ].map(([v,l]) => el('option', { value:v }, l)));
  const sender = el('select', {}, [
    el('option',{value:'notifications'},'Better notifications — notifications@betterrealestate.org'),
    el('option',{value:'partners'},'Better partners — partners@betterrealestate.org')
  ]);
  const market = el('input', { placeholder: 'Optional market filter, e.g. Philadelphia' });
  const audienceSt = el('div', { class: 'hint',role:'status','aria-live':'polite' }, 'Recipient count will only include verified users who opted into product & activity email.');
  const selectedPeople=new Map(),recipientSearch=el('input',{type:'search',placeholder:'Search name, username or email','aria-label':'Search email recipients'}),recipientRows=el('div',{class:'email-recipient-results'}),selectedRows=el('div',{class:'email-selected-recipients'}),recipientPicker=el('section',{class:'email-recipient-picker',hidden:'hidden'},[el('label',{},'Choose people'),recipientSearch,selectedRows,recipientRows]);
  const audiencePayload=()=>({kind:audience.value,market:audience.value==='selected'?'':market.value.trim(),userIds:audience.value==='selected'?[...selectedPeople.keys()]:[]});
  let audienceRequest=0,searchRequest=0,searchTimer;
  const previewAudience=async()=>{const token=++audienceRequest;audienceSt.textContent=audience.value==='selected'?`${selectedPeople.size} selected. Checking eligibility…`:'Checking eligible recipients…';try{const r=await api('POST','/api/admin/email-center/preview-audience',{audience:audiencePayload()});if(token===audienceRequest)audienceSt.textContent=`${r.count} eligible recipient${r.count===1?'':'s'}${audience.value==='selected'?` of ${selectedPeople.size} selected`:''}.`;}catch(e){if(token===audienceRequest)audienceSt.textContent=e.message;}};
  const drawSelected=()=>{selectedRows.innerHTML='';selectedPeople.forEach(person=>selectedRows.appendChild(el('button',{type:'button',class:'btn-ghost','aria-label':`Remove ${person.email} from recipients`,onclick:()=>{selectedPeople.delete(person.id);drawSelected();searchRecipients();previewAudience();}},`${person.name||person.username||person.email} ×`)));if(!selectedPeople.size)selectedRows.appendChild(el('div',{class:'hint'},'No people selected. Choose one or more recipients below.'));};
  const searchRecipients=async()=>{const token=++searchRequest;recipientRows.textContent='Loading people…';try{const r=await api('GET','/api/admin/email-center/recipients?q='+encodeURIComponent(recipientSearch.value.trim()));if(token!==searchRequest||!recipientPicker.isConnected)return;recipientRows.innerHTML='';(r.users||[]).forEach(person=>{const check=el('input',{type:'checkbox','aria-label':`Select ${person.email}`,disabled:person.eligible?null:'disabled'});check.checked=selectedPeople.has(person.id);check.onchange=()=>{if(check.checked){if(selectedPeople.size>=200){check.checked=false;audienceSt.textContent='Select up to 200 people per email.';return;}selectedPeople.set(person.id,person);}else selectedPeople.delete(person.id);drawSelected();previewAudience();};recipientRows.appendChild(el('label',{class:'email-recipient-row'},[check,el('span',{},[el('b',{},person.name||person.username||'Member'),el('small',{},person.email),!person.eligible?el('small',{class:'hint'},person.reason):null].filter(Boolean))]));});if(!(r.users||[]).length)recipientRows.appendChild(el('div',{class:'hint'},'No matching people.'));if(r.hasMore)recipientRows.appendChild(el('div',{class:'hint'},'Showing the first 50 matches. Refine your search to find someone.'));}catch(e){if(token===searchRequest)recipientRows.textContent=e.message;}};
  recipientSearch.oninput=()=>{clearTimeout(searchTimer);searchRequest++;searchTimer=setTimeout(()=>{if(recipientPicker.isConnected&&audience.value==='selected')searchRecipients();},300);};
  audience.onchange=()=>{recipientPicker.hidden=audience.value!=='selected';market.disabled=audience.value==='selected';searchRequest++;if(audience.value==='selected'){drawSelected();searchRecipients();}previewAudience();};market.onchange=previewAudience;
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
  [['Sender',sender],['Audience',audience],['Market filter',market],['Subject',subject],['Headline',headline],['Message',body],['Button text',ctaLabel],['Button link',ctaUrl],['Delivery',timing]].forEach(([label,input]) => { box.appendChild(el('label',{},label)); box.appendChild(input);if(label==='Audience')box.appendChild(recipientPicker); });
  box.appendChild(when); box.appendChild(audienceSt);
  box.appendChild(el('label',{},'Preview')); box.appendChild(preview);
  box.appendChild(el('button', { class:'btn-ghost', style:'width:100%;margin-top:12px', onclick: async () => {
    try { await api('POST','/api/admin/email-center/broadcast-test',{ subject:subject.value, headline:headline.value, body:body.value, ctaLabel:ctaLabel.value, ctaUrl:ctaUrl.value, sender:sender.value, audience:audiencePayload() }); toast('Draft sent to ' + state.user.email, 'ok'); }
    catch(e) { toast(e.message,'err'); }
  } }, 'Send draft to myself'));
  box.appendChild(el('button', { class:'submitbtn', onclick: async e => {
    const sendButton=e.currentTarget;if(sendButton.disabled)return;
    if(audience.value==='selected'&&!selectedPeople.size){sendSt.className='errmsg';sendSt.textContent='Select at least one person.';return;}
    if (!subject.value.trim() || !headline.value.trim() || !body.value.trim()) { sendSt.className='errmsg'; sendSt.textContent='Subject, headline and message are required.'; return; }
    if (timing.value === 'later' && !when.value) { sendSt.className='errmsg'; sendSt.textContent='Choose a date and time.'; return; }
    const draft={subject:subject.value,headline:headline.value,body:body.value,ctaLabel:ctaLabel.value,ctaUrl:ctaUrl.value,sender:sender.value,audience:audiencePayload()};sendButton.disabled=true;sendButton.textContent='Checking recipients…';
    let eligibleCount;try{const r=await api('POST','/api/admin/email-center/preview-audience',{audience:draft.audience});eligibleCount=r.count;}catch(e){sendSt.className='errmsg';sendSt.textContent=e.message;sendButton.disabled=false;sendButton.textContent='Send / schedule broadcast';return;}if(!eligibleCount){sendSt.className='errmsg';sendSt.textContent='No eligible recipients selected.';sendButton.disabled=false;sendButton.textContent='Send / schedule broadcast';return;}
    const countText = `${eligibleCount} eligible recipient${eligibleCount===1?'':'s'}.`;
    if (!confirm(`${timing.value === 'later' ? 'Schedule' : 'Send'} this broadcast?\n\n${countText}\n\nOnly opted-in, verified users in this audience are eligible.`)){sendButton.disabled=false;sendButton.textContent='Send / schedule broadcast';return;}
    sendButton.disabled=true;sendButton.textContent='Queuing email…';
    try {
      const scheduledAt = timing.value === 'later' ? new Date(when.value).toISOString() : new Date().toISOString();
      const r = await api('POST','/api/admin/email-center/broadcasts',{...draft, scheduledAt});
      sendSt.className='okmsg'; sendSt.textContent = timing.value === 'later' ? 'Broadcast scheduled.' : `Broadcast queued/sent. ${r.result?.sent || 0} delivered in the first batch.`;
      setTimeout(() => render(), 600);
    } catch(e) { sendSt.className='errmsg'; sendSt.textContent=e.message; }finally{sendButton.disabled=false;sendButton.textContent='Send / schedule broadcast';}
  } }, 'Send / schedule broadcast'));
  box.appendChild(sendSt);
  wrap.appendChild(box);
  previewAudience();

  wrap.appendChild(el('div', { class:'sectiontitle' }, 'Broadcast history'));
  const hist = el('div', { class:'card' });
  if (!(data.broadcasts || []).length) hist.appendChild(el('div',{class:'listrow'},el('div',{class:'s'},'No broadcasts yet.')));
  (data.broadcasts || []).forEach(b => hist.appendChild(el('div',{class:'listrow'},[
    el('div',{class:'grow'},[el('div',{class:'t'},b.subject),el('div',{class:'s'},`${b.status} · ${b.sentCount} sent${b.failedCount ? ' · ' + b.failedCount + ' failed' : ''} · ${new Date(b.scheduledAt).toLocaleString()}`), b.audience?.market ? el('div',{class:'hint'},`${b.sender === 'partners' ? 'partners@betterrealestate.org' : 'notifications@betterrealestate.org'} · ${b.audience.kind} · ${b.audience.market}`) : el('div',{class:'hint'},`${b.sender === 'partners' ? 'partners@betterrealestate.org' : 'notifications@betterrealestate.org'} · ${b.audience?.kind || 'all'}`)]),
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
        el('div',{class:'founder-admin-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'FIRST 50 FOUNDERS'),el('h3',{},`${fp.claimed} of ${fp.limit} places awarded`),el('div',{class:'hint'},`${fp.remaining} remaining. Qualifying accounts receive Founding Member recognition and two weeks of complimentary Platinum without altering paid billing.`)]),el('span',{class:'founding-badge'},`${fp.claimed}/${fp.limit}`)]),
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
          el('div', { class: 's' }, `${u.email} · ${roleLabel(u)}${u.location ? ' · ' + u.location : ''}`),
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
  wrap.appendChild(el('div', { class:'sectiontitle' }, 'First 50 Founders'));
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
 const services=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},[el('div',{},[el('div',{class:'eyebrow'},'SERVICE NETWORK'),el('h3',{},'Professionals for the deal')]),el('button',{class:'btn-ghost',onclick:()=>go('settings')},'My service profile')])]);try{const sr=await api('GET','/api/service-providers');if(!sr.providers.length)services.appendChild(el('div',{class:'hub-empty'},'Title, lending, contractor and other service profiles will appear as professionals opt in.'));sr.providers.slice(0,8).forEach(u=>services.appendChild(el('button',{class:'hub-provider',onclick:()=>go('profile',{profileId:u.id})},[avatarNode(u),el('div',{},[el('b',{},u.name),el('span',{},(u.settings?.serviceTypes||[]).join(' · ')||roleLabel(u))])])));}catch{}grid.appendChild(services);
 wrap.appendChild(grid);wrap.appendChild(el('div',{class:'hub-exportbar'},[el('div',{},[el('b',{},'Your data stays portable.'),el('span',{},'Export serious business records whenever you need them.')]),el('button',{class:'btn-ghost',onclick:()=>downloadExport('pipeline')},'Export pipeline CSV')]));return wrap;
}
function renderAffiliateCalculator(d){
 const card=el('article',{class:'affiliate-tool-card affiliate-calculator'},[el('h4',{},'Commission calculator'),el('p',{class:'hint'},'Plan a membership sale using current prices. Scenario rates do not change earned commissions; milestone cash is separate. Discounts, credits and actual eligible payments can reduce earnings.')]);
 const plan=el('select',{'aria-label':'Membership plan and billing'}),rate=el('select',{'aria-label':'Commission scenario rate'}),count=el('input',{type:'number',min:'0',max:'100000',step:'1',value:'1','aria-label':'Qualifying new paying customers'}),result=el('strong',{'aria-live':'polite'});
 for(const key of ['platinum','wholesale','pro'])for(const period of ['monthly','annual']){const p=d.pricing[key];plan.appendChild(el('option',{value:String(p[period])},`${p.label} · ${period} · ${cents(p[period])}`));}
 for(let pct=30;pct<=40;pct++)rate.appendChild(el('option',{value:String(pct)},`${pct}%`));rate.value=String(d.leaderboard?.own?.currentRatePct||30);
 const calc=()=>{const n=Number(count.value);result.textContent=Number.isInteger(n)&&n>=0&&n<=100000?cents(n*Math.floor(Number(plan.value)*Number(rate.value)/100))+' estimated commission':'Enter a whole customer count from 0 to 100,000.';};
 plan.onchange=rate.onchange=count.oninput=calc;
 const field=(label,node)=>el('label',{class:'affiliate-calculator-field'},[el('span',{},label),node]);
 card.append(el('div',{class:'affiliate-calculator-grid'},[field('Membership & billing',plan),field('Scenario rate',rate),field('New paying customers',count)]),result);calc();return card;
}
function renderAffiliateContentEditor(content){
 const host=el('article',{class:'affiliate-tool-card affiliate-content-editor'}),fields={};
 const open=()=>{host.replaceChildren(el('h4',{},'Edit shared training'),el('p',{class:'hint'},'These fields are shared with affiliates. Financial terms, prices and commissions are managed separately. Use {link} in the share script to insert each approved affiliate’s own tracked link.'));
 for(const [key,label,max]of [['title','Workbench title',120],['guidance','Conversation guidance',4000],['sourcing','Where to find potential users',6000],['callScript','Call opener',4000],['shareScript','Message to share',4000]]){const input=el(key==='title'?'input':'textarea',{maxlength:String(max),value:content[key],'aria-label':label});input.value=content[key];fields[key]=input;host.appendChild(el('label',{class:'affiliate-editor-field'},[el('span',{},label),input]));}
 const feedback=el('p',{'aria-live':'polite',class:'hint'}),save=el('button',{class:'btn-primary'},'Save shared training');save.onclick=()=>withButtonBusy(save,async()=>{try{const body={revision:content.revision};for(const key of Object.keys(fields))body[key]=fields[key].value;await api('PATCH','/api/admin/affiliate-content',body);toast('Shared training updated','ok');render();}catch(e){feedback.textContent=e.message;}});
 host.append(el('div',{class:'affiliate-admin-actions'},[save,el('button',{class:'btn-ghost',onclick:closed},'Cancel')]),feedback);
 };
 const closed=()=>host.replaceChildren(el('h4',{},'Shared workbench content'),el('p',{class:'hint'},content.updatedAt?'Last updated '+new Date(content.updatedAt).toLocaleString():'Default training is active.'),el('button',{class:'btn-ghost',onclick:open},'Edit training & scripts'));
 closed();return host;
}
async function renderAdminAffiliateCenter(wrap){
 const d=await api('GET','/api/admin/affiliates');
 wrap.append(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'PROGRAM MANAGEMENT'),el('h2',{},'Affiliate administration'),el('p',{class:'sub'},'Review affiliates, performance, earnings and shared training.')])]),el('div',{class:'affiliate-metrics'},[miniMetric(d.applications.filter(a=>a.status==='approved').length,'Approved affiliates'),miniMetric(d.totals.sales,'Eligible sales'),miniMetric(cents(d.totals.pending),'Pending'),miniMetric(cents(d.totals.available),'Available'),miniMetric(cents(d.totals.paid),'Paid'),miniMetric(cents(d.totals.bonuses),'Milestone cash')]));
 const board=el('section',{class:'hub-panel affiliate-admin'},[el('h3',{},'Affiliates & applications')]);
 const filter=el('select',{'aria-label':'Filter affiliate status'},['all','pending','approved','suspended','denied','revoked'].map(v=>el('option',{value:v},v==='all'?'All statuses':v.charAt(0).toUpperCase()+v.slice(1)))),search=el('input',{placeholder:'Search affiliate name or email','aria-label':'Search affiliates'}),rows=el('div');
 const actions=a=>a.status==='pending'?[['approved','Approve'],['denied','Deny']]:a.status==='approved'?[['suspended','Suspend'],['revoked','Terminate']]:a.status==='suspended'?[['approved','Resume'],['revoked','Terminate']]:a.status==='denied'?[['approved','Approve']]:[];
 const draw=()=>{rows.replaceChildren();const q=search.value.trim().toLowerCase();const apps=d.applications.filter(a=>(filter.value==='all'||a.status===filter.value)&&`${a.name} ${a.email}`.toLowerCase().includes(q)).sort((a,b)=>(a.rank||Infinity)-(b.rank||Infinity)||String(b.createdAt).localeCompare(String(a.createdAt)));if(!apps.length)rows.appendChild(el('p',{class:'hub-empty'},'No matching affiliate applications.'));
 for(const a of apps){const line=el('div',{class:'affiliate-admin-row'},[el('div',{class:'grow'},[el('b',{},a.name+' · '+a.status),el('span',{},a.email),el('small',{},`${a.rank?'#'+a.rank+' · ':''}${a.metrics.sales} eligible sales · ${a.currentRatePct}% rate`),el('small',{},`${cents(a.metrics.pending)} pending · ${cents(a.metrics.available)} available · ${cents(a.metrics.paid)} paid`),el('small',{},a.channels||a.audience||'No channels supplied')]),el('div',{class:'affiliate-admin-actions'},actions(a).map(([status,label])=>{const btn=el('button',{class:status==='revoked'?'dangerbtn':'btn-ghost'},label);btn.onclick=()=>withButtonBusy(btn,async()=>{try{if(status==='revoked'&&!confirm('Terminate affiliate access for '+a.name+'?'))return;await api('POST','/api/admin/affiliates/'+a.id+'/status',{status});toast('Affiliate status updated','ok');render();}catch(e){toast(e.message,'err');}});return btn;}))]);rows.appendChild(line);}};
 filter.onchange=search.oninput=draw;board.append(el('div',{class:'affiliate-admin-filters'},[search,filter]),rows);draw();wrap.appendChild(board);
 const ledger=el('section',{class:'hub-panel affiliate-admin-ledger'},[el('h3',{},'Commission & bonus records'),el('p',{class:'hint'},'Read-only payment records. Status follows the existing payment, hold, withdrawal and reversal workflows.')]);
 const status=el('select',{'aria-label':'Filter earnings status'},['all','pending','available','paid','reversed'].map(v=>el('option',{value:v},v==='all'?'All payout states':v))),kind=el('select',{'aria-label':'Filter earnings type'},[['all','All earnings'],['membership_acquisition','Membership commissions'],['sales_milestone_bonus','Milestone bonuses']].map(([v,l])=>el('option',{value:v},l))),history=el('div');
 const historyDraw=()=>{history.replaceChildren();const records=d.commissions.filter(c=>(status.value==='all'||c.status===status.value)&&(kind.value==='all'||c.kind===kind.value));if(!records.length)history.appendChild(el('p',{class:'hub-empty'},'No earnings match these filters.'));for(const c of records.slice(0,100))history.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},c.affiliateName),el('span',{},c.kind==='sales_milestone_bonus'?c.threshold+'-sale milestone bonus':(c.tier||'Membership')+' · '+Number(c.rateBps||3000)/100+'%'),el('small',{},c.status+' · '+new Date(c.createdAt).toLocaleDateString())]),el('strong',{},cents(c.amountCents))]));if(records.length>100)history.appendChild(el('p',{class:'hint'},'Showing the latest 100 matching records. Refine the filters to review another payout state.'));};status.onchange=kind.onchange=historyDraw;ledger.append(el('div',{class:'affiliate-admin-filters'},[status,kind]),history);historyDraw();wrap.appendChild(ledger);
 wrap.appendChild(await renderAffiliateTools({...d,application:null}));return wrap;
}
function renderGrowthCharts(data){
 const wrap=el('section',{class:'growth-charts'},[el('div',{class:'eyebrow'},'RECORDED GROWTH'),el('h3',{},'Growth trends'),el('p',{class:'hint'},data.note),el('p',{class:'hint'},`${data.intervalDays}-day buckets · UTC · ${data.coverageStart?'Earliest retained activity: '+new Date(data.coverageStart).toLocaleDateString():'No retained activity events yet'}`)]);
 for(const [key,title]of [['signups','New signups'],['cumulative','Cumulative recorded signups'],['active','Unique active users']]){
 const card=el('article',{class:'growth-chart-card'},[el('h4',{},title)]),detail=el('p',{class:'growth-detail','aria-live':'polite'},'Select a point for its period and count.');const rows=data.buckets;
 if(!rows.length){card.appendChild(el('p',{},'No recorded data for this range.'));wrap.appendChild(card);continue;}
 const max=Math.max(1,...rows.map(r=>r[key])),ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 640 200');svg.setAttribute('role','img');svg.setAttribute('aria-label',title+' trend; point details available below');svg.classList.add('growth-svg');
 const node=(name,attrs)=>{const n=document.createElementNS(ns,name);for(const [k,v]of Object.entries(attrs))n.setAttribute(k,String(v));svg.appendChild(n);return n;};
 for(const fraction of [0,.5,1]){const y=170-fraction*140;node('line',{x1:40,y1:y,x2:625,y2:y,class:'growth-grid'});node('text',{x:4,y:y+4,class:'growth-axis'}).textContent=String(Math.round(max*fraction));}
 const coords=rows.map((r,i)=>[40+(rows.length===1?292:i/(rows.length-1)*585),170-r[key]/max*140]);node('polyline',{points:coords.map(p=>p.join(',')).join(' '),class:'growth-line',fill:'none'});
 rows.forEach((r,i)=>{const [x,y]=coords[i],dot=node('circle',{cx:x,cy:y,r:rows.length>100?2:4,class:'growth-point'});const text=`${new Date(r.at).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}: ${r[key]}${r.partial?' · partial period':''}`;const titleNode=document.createElementNS(ns,'title');titleNode.textContent=text;dot.appendChild(titleNode);dot.onpointerenter=dot.onclick=()=>{detail.textContent=text;select.value=String(i);};});
 const select=el('select',{'aria-label':title+' period detail'},rows.map((r,i)=>el('option',{value:String(i)},new Date(r.at).toLocaleDateString()+(r.partial?' · partial':''))));select.onchange=()=>{const r=rows[Number(select.value)];detail.textContent=`${new Date(r.at).toLocaleDateString()} – ${new Date(r.end).toLocaleDateString()}: ${r[key]}${r.partial?' · partial period':''}`;};select.value=String(rows.length-1);select.onchange();card.append(svg,el('div',{class:'growth-periods'},[el('span',{},new Date(rows[0].at).toLocaleDateString()),el('span',{},new Date(rows.at(-1).end).toLocaleDateString())]),el('label',{},['Inspect a period',select]),detail);wrap.appendChild(card);
 }return wrap;
}

async function renderAffiliateTools(d){
 const admin=!!state.access?.adminUnlimited;
 const content=d.content;
 const wrap=el('section',{class:'hub-panel affiliate-tools'},[el('div',{class:'eyebrow'},'AFFILIATE WORKBENCH'),el('h3',{},content.title)]);
 wrap.appendChild(el('p',{class:'affiliate-shared-guidance'},content.guidance));
 if(admin)wrap.appendChild(renderAffiliateContentEditor(content));
 const active=d.application?.status==='approved'&&d.application.termsAcceptedAt&&d.application.termsVersion===d.terms.version&&Number(d.application.rateBps)===Number(d.terms.rateBps);
 const link=active?d.link:null;
 const copyButton=(label,text)=>el('button',{class:'btn-ghost',onclick:async e=>{try{await withButtonBusy(e.currentTarget,()=>navigator.clipboard.writeText(text));toast('Copied','ok');}catch{prompt('Copy this text',text);}}},label);
 const script=content.callScript;
 const message=content.shareScript.replaceAll('{link}',link||'Ask me for my approved affiliate link.');
 const training=el('article',{class:'affiliate-tool-card affiliate-product-guide'},[
  el('div',{class:'eyebrow'},'KNOW WHAT YOU ARE INTRODUCING'),el('h4',{},'Sell the value of a real estate workspace'),
  el('p',{},'Better Real Estate is a free-to-join social marketplace for off-market real estate. Help a wholesaler, investor, buyer, seller or funder see how it fits their work before discussing a paid membership.'),
  el('div',{class:'affiliate-value-grid'},[
   el('div',{},[el('b',{},'Wholesalers and sellers'),el('p',{},'Post a property with photos, price and deal details. Give interested buyers one place to review the opportunity and start a conversation instead of repeating the same details across scattered posts.')]),
   el('div',{},[el('b',{},'Investors and buyers'),el('p',{},'Browse property posts, define buying criteria and connect with people in their market. Deal Intelligence helps research available property facts and sold comps; evidence can be limited and every deal still needs due diligence.')]),
   el('div',{},[el('b',{},'A business that needs organization'),el('p',{},'Keep conversations, buyer relationships, follow-ups and deal stages organized. Paid plans add access and allowances for advanced tools; Team adds a shared company workspace with separate member logins.')])
  ]),
  el('h4',{},'A useful first conversation'),
  el('ol',{class:'affiliate-conversation-steps'},[
   el('li',{},'Ask: “Are you mostly finding deals, looking for buyers, or buying properties?” Then ask what slows that process down.'),
   el('li',{},'Connect one relevant tool to that problem. For a wholesaler, start with a complete property post; for a buyer, start with their market and buying criteria.'),
   el('li',{},'Invite them to create a free account and try that first action. They do not need to purchase a membership to join.'),
   el('li',{},'Discuss paid access only when a specific tool or allowance fits their workflow. Check the current Plans page for pricing and included access; do not promise buyers, closings, profits or guaranteed valuations.')
  ]),
  el('p',{class:'hint'},'Commission starts at 30% one time on an eligible attributed first paid membership. Top 5 purchases build the rate toward 40%; leaving the top 5 resets it to 30%. Free signups and renewals do not earn a commission.'),
  el('button',{class:'btn-ghost',onclick:()=>go('upgrade')},'Review current plans')
 ]);wrap.appendChild(training);
 wrap.appendChild(el('article',{class:'affiliate-tool-card affiliate-sourcing'},[el('div',{class:'eyebrow'},'FIND THE RIGHT CONVERSATION'),el('h4',{},'Where to meet potential users'),el('p',{class:'affiliate-multiline'},content.sourcing)]));
 const scripts=el('div',{class:'affiliate-tool-grid'});
 for(const [title,text]of [['Call opener',script],['Message to share',message]])scripts.appendChild(el('article',{class:'affiliate-tool-card'},[el('h4',{},title),el('p',{},text),copyButton('Copy '+(title==='Call opener'?'script':'message'),text)]));
 wrap.append(scripts,el('p',{class:'hint'},'Start with contacts and guidance provided by Better. Ask permission before sending a link, respect requests to stop, and disclose your affiliate relationship. These tools do not place calls or send messages for you.'));
 wrap.appendChild(renderAffiliateCalculator(d));
 if(admin)return wrap;
 if(link){const qr=el('img',{src:'/api/affiliate/qr',alt:'QR code for your approved tracked affiliate signup link',class:'affiliate-qr'});qr.onerror=()=>{qr.remove();};wrap.appendChild(el('article',{class:'affiliate-tool-card affiliate-share-kit'},[el('h4',{},'Your sharing kit'),qr,el('p',{class:'affiliate-tracked-link'},link),copyButton('Copy tracked link',link),el('a',{class:'btn-ghost',href:'/api/affiliate/qr',download:'Better-Affiliate-QR.svg'},'Download QR code')]));}
 else wrap.appendChild(el('div',{class:'hub-empty'},'Scripts and planning tools are ready. Your personal tracked link and QR code unlock after approval and acceptance of current affiliate terms.'));
 const eligible=hasRole(state.user,'affiliate')||state.access?.adminUnlimited||['pending','approved'].includes(d.application?.status);
 if(!eligible)return wrap;
 const tracker=el('article',{class:'affiliate-tool-card affiliate-prospects'},[el('h4',{},'Private prospect tracker'),el('p',{class:'hint'},'Your list is visible only to your account. Stages are your own notes, not verified signups or paid conversions.')]);
 const fields=[{key:'name',label:'Name',placeholder:'Contact name'},{key:'phone',label:'Phone'},{key:'email',label:'Email'},{key:'notes',label:'Notes',type:'textarea'},{key:'nextFollowUp',label:'Next follow-up',type:'date'}];
 tracker.appendChild(el('button',{class:'btn-primary',onclick:()=>openFormModal('Add prospect',fields,'Save prospect',async values=>{await api('POST','/api/affiliate/prospects',values);toast('Prospect saved','ok');render();})},'Add prospect'));
 try{const {prospects}=await api('GET','/api/affiliate/prospects');if(!prospects.length)tracker.appendChild(el('div',{class:'hub-empty'},'Add the first person you plan to contact.'));
 for(const p of prospects){
  const stage=el('select',{'aria-label':'Stage for '+p.name});for(const [value,label]of [['new','New'],['contacted','Contacted'],['interested','Interested'],['joined','Joined (self-reported)'],['not_interested','Not interested']])stage.appendChild(el('option',{value},label));stage.value=p.stage;
  stage.onchange=async()=>{try{await withButtonBusy(stage,()=>api('PATCH','/api/affiliate/prospects/'+encodeURIComponent(p.id),{stage:stage.value}));p.stage=stage.value;toast('Stage saved','ok');}catch(e){stage.value=p.stage;toast(e.message,'err');}};
  const editFields=fields.map(f=>({...f,value:f.key==='nextFollowUp'?(p.nextFollowUp||'').slice(0,10):p[f.key]||''}));
  const remove=el('button',{class:'dangerbtn',onclick:async e=>{if(!confirm('Remove '+p.name+' from your private tracker?'))return;try{await withButtonBusy(e.currentTarget,()=>api('DELETE','/api/affiliate/prospects/'+encodeURIComponent(p.id)));toast('Prospect removed','ok');render();}catch(err){toast(err.message,'err');}}},'Remove');
  tracker.appendChild(el('div',{class:'affiliate-prospect-row'},[el('div',{class:'affiliate-prospect-copy'},[el('b',{},p.name),el('small',{},[p.phone,p.email].filter(Boolean).join(' · ')),p.notes?el('p',{},p.notes):null,p.nextFollowUp?el('small',{class:Date.parse(p.nextFollowUp)<Date.now()?'affiliate-followup-due':''},'Follow up '+new Date(p.nextFollowUp).toLocaleDateString()):null]),el('div',{class:'affiliate-prospect-actions'},[stage,el('button',{class:'btn-ghost',onclick:()=>openFormModal('Edit prospect',editFields,'Save changes',async values=>{await api('PATCH','/api/affiliate/prospects/'+encodeURIComponent(p.id),values);toast('Prospect updated','ok');render();})},'Edit'),remove])]));
 }
 }catch(e){tracker.appendChild(el('div',{class:'errmsg'},e.message));}wrap.appendChild(tracker);return wrap;
}

function renderAffiliateLeaderboard(data){
 const board=el('section',{class:'hub-panel affiliate-leaderboard'},[el('div',{class:'eyebrow'},'ALL-TIME PAID MEMBERSHIP PURCHASES'),el('h3',{},'Affiliate leaderboard')]);
 const own=data.own;
 board.appendChild(el('p',{class:'sub'},'Hold a top 5 place to build your commission: each eligible purchase adds 1 percentage point, up to 40%. Falling out resets your rate to 30%.'));
 board.appendChild(el('div',{class:'affiliate-bonus-status'},[miniMetric(own.rank?'#'+own.rank:'Not ranked','Your rank'),miniMetric(own.sales,'Eligible purchases'),miniMetric(own.currentRatePct+'%','Current rate'),miniMetric(own.topFive?own.nextTopFiveRatePct+'%':'30%','Next purchase at current rank')]));
 if(!data.rows.length)board.appendChild(el('div',{class:'hub-empty'},'No eligible paid membership purchases yet. The first qualifying purchase earns a place; free signups and clicks do not count.'));
 const list=el('ol',{class:'affiliate-rank-list'});
 for(const r of data.rows)list.appendChild(el('li',{class:'affiliate-rank-row'+(r.isYou?' is-you':'')},[el('strong',{class:'affiliate-rank-number'},'#'+r.rank),el('div',{class:'affiliate-rank-person'},[el('b',{},r.name+(r.isYou?' · You':'')),el('small',{},r.topFive?'Top 5 · bonus eligible':'Base rate')]),el('span',{class:'affiliate-rank-sales'},r.sales+' '+(r.sales===1?'purchase':'purchases'))]));
 board.append(list,el('p',{class:'hint'},'Only eligible first paid memberships count. Pending commissions count because payment was received; refunded or disputed purchases do not. Ties use earliest first eligible purchase, then account ID. No bonus increases are applied to past commissions.'));
 const bonus=data.milestones;
 if(bonus){
  const panel=el('section',{class:'affiliate-milestones'},[el('h3',{},'Sales milestones'),el('p',{class:'sub'},bonus.sales+' eligible purchases since this bonus program began. Past purchases still count for rank, but do not create milestone payouts.')]);
  const cards=el('div',{class:'affiliate-milestone-grid'});
  for(const m of bonus.milestones)cards.appendChild(el('div',{class:'card'},[el('b',{},m.sales+' sales'),el('strong',{},'Up to '+cents(m.amountCents)),el('small',{},m.earned?cents(m.awardedCents)+' · '+m.status:Math.min(bonus.sales,m.sales)+' / '+m.sales)]));
  panel.append(cards,el('p',{class:'hint'},'One cash bonus per milestone, with a 3-day hold. Total milestone bonuses cannot exceed 3% of membership revenue retained after commissions. Awards may be smaller under this cap and are not topped up later. Refunds or disputes can reverse unpaid bonuses.'));
  board.appendChild(panel);
 }
 return board;
}
async function renderAffiliateCenter(){
 const wrap=el('div',{class:'page affiliate-center'});
 if(!state.user){
  wrap.appendChild(el('section',{class:'affiliate-hero affiliate-public'},[
   el('div',{class:'eyebrow'},'BETTER AFFILIATES'),
   el('h2',{},'Earn 30–40% promoting Better Real Estate'),
   el('p',{},'Create a Better Real Estate account and request affiliate access. Every application is reviewed before an affiliate link is activated.'),
   el('div',{class:'terms-line'},[el('b',{},'30% base · up to 40%'),el('span',{},'Eligible attributed membership sales')]),
   el('div',{class:'affiliate-public-actions'},[
    el('button',{class:'btn-primary',onclick:()=>{state.postAuthTarget={view:'affiliate'};state.authMode='signup';go('auth');}},'Create account & apply'),
    el('button',{class:'btn-ghost',onclick:()=>{state.postAuthTarget={view:'affiliate'};state.authMode='login';go('auth');}},'Sign in')
   ])
  ]));
  return wrap;
 }
 if(state.access?.adminUnlimited)return await renderAdminAffiliateCenter(wrap);
 const d=await api('GET','/api/affiliate/me');if(hasRole(state.user,'affiliate'))wrap.appendChild(el('div',{class:'card affiliate-account-note'},[el('b',{},'Marketing / Affiliate-only account'),el('p',{},'Your account is separate from the real estate Network. Manage your application, tracked link and earnings here. Memberships and account history stay intact.')]));wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'BETTER AFFILIATES'),el('h2',{},'Affiliate center'),el('div',{class:'sub'},'Earn a 30% one-time cash commission as your base rate, with top 5 purchase bonuses up to 40%.')]),el('div',{class:'affiliate-rate'},[el('strong',{},(d.leaderboard?.own?.currentRatePct||30)+'%'),el('span',{},'one-time commission')]) ]));
 if(d.leaderboard)wrap.appendChild(renderAffiliateLeaderboard(d.leaderboard));
 const tools=await renderAffiliateTools(d);
 if(!d.application){const card=el('section',{class:'affiliate-hero'},[el('h3',{},'Apply to become a Better affiliate'),el('p',{},'Tell us how you plan to introduce Better Real Estate to your audience. Every application is reviewed before affiliate links are activated.'),el('button',{class:'btn-primary',onclick:()=>openFormModal('Affiliate application',[{key:'audience',label:'Your audience',type:'textarea',placeholder:'Who do you reach and approximately how?'},{key:'channels',label:'Channels',placeholder:'Instagram, YouTube, REIA, newsletter…'},{key:'why',label:'Why Better Real Estate?',type:'textarea',placeholder:'How would you promote the platform responsibly?'}],'Submit application',async v=>{await api('POST','/api/affiliate/apply',v);toast('Affiliate application submitted','ok');render();})},'Request affiliate access')]);wrap.appendChild(card);wrap.appendChild(tools);return wrap;}
 const a=d.application;wrap.appendChild(el('div',{class:'affiliate-status '+a.status},[el('div',{},[el('small',{},'APPLICATION STATUS'),el('b',{},a.status.charAt(0).toUpperCase()+a.status.slice(1))]),a.status==='approved'?el('span',{},'Admin approved'):el('span',{},a.status==='pending'?'Waiting for admin review':'Contact support if you have questions') ]));if(a.status!=='approved'){wrap.appendChild(tools);return wrap;}
 if(!a.termsAcceptedAt||a.termsVersion!==d.terms.version||Number(a.rateBps)!==Number(d.terms.rateBps)){wrap.appendChild(el('section',{class:'terms-card'},[el('div',{class:'eyebrow'},'ACTION REQUIRED'),el('h3',{},'Review your affiliate terms'),el('p',{},d.terms.summary),el('div',{class:'affiliate-terms-list'},['Commission is paid once per qualifying referred customer, on their first eligible paid membership transaction.','Renewals, later billing cycles, cancellations and later resubscriptions, upgrades and downgrades do not create another commission.','Commissions remain pending for 3 days before becoming available.','Refunds, disputes, chargebacks, fraud or ineligible transactions may reverse the related commission.','Self-referrals, duplicate or fake accounts, tracking manipulation and other artificial commission activity are prohibited.','Cash affiliate earnings are separate from Better Credits. Better Credits cannot be withdrawn.','Payouts require secure Stripe Connect onboarding. Better Real Estate never stores full bank or debit-card credentials.','Affiliates must make required affiliate disclosures and are responsible for applicable taxes and lawful promotion.','Future material commission changes require affirmative in-platform acceptance before they apply to future earnings; legitimately earned commissions are not silently rewritten.'].map(x=>el('div',{class:'affiliate-term-item'},[el('span',{class:'affiliate-term-check'},'✓'),el('span',{},x)]))),el('div',{class:'terms-line'},[el('b',{},d.terms.ratePct+'% one-time commission'),el('span',{},d.terms.holdDays+'-day hold · renewals do not earn another commission')]),el('button',{class:'btn-primary',onclick:async()=>{await api('POST','/api/affiliate/accept-terms',{version:d.terms.version});toast('Affiliate terms accepted','ok');render();}},'Agree & activate affiliate link') ]));wrap.appendChild(tools);return wrap;}
 wrap.appendChild(el('div',{class:'affiliate-metrics'},[miniMetric(d.metrics.clicks,'Link clicks'),miniMetric(d.metrics.sales,'Membership sales'),miniMetric(cents(d.metrics.pending),'Pending'),miniMetric(cents(d.metrics.available),'Available'),miniMetric(cents(d.metrics.paid),'Paid') ]));
 const link=el('section',{class:'affiliate-link-card'},[el('div',{},[el('small',{},'YOUR AFFILIATE LINK'),el('b',{},d.link)]),el('button',{class:'btn-ghost',onclick:async()=>{await navigator.clipboard.writeText(d.link);toast('Affiliate link copied','ok');}},'Copy link')]);wrap.appendChild(link);
 const payout=el('section',{class:'payout-card'},[el('div',{},[el('h3',{},'Affiliate Wallet'),el('p',{class:'sub'},d.payoutConfigured?'Your secure payout destination is connected through Stripe. Available affiliate cash can be withdrawn after the 3-day hold.':'Connect an eligible bank account or debit-card payout destination securely through Stripe. Better Real Estate never stores your bank/card credentials.')]),el('div',{class:'payout-actions'},[el('button',{class:'btn-ghost',onclick:async()=>{const r=await api('POST','/api/affiliate/payout-onboarding',{});location.href=r.url;}},d.payoutConfigured?'Manage payout setup':'Connect payout account'),el('button',{class:'btn-primary',disabled:d.metrics.available<100,onclick:async()=>{if(!confirm('Withdraw '+cents(d.metrics.available)+' of available affiliate earnings?'))return;await api('POST','/api/affiliate/withdraw',{amountCents:d.metrics.available});toast('Affiliate withdrawal sent','ok');render();}},d.metrics.available>=100?'Withdraw '+cents(d.metrics.available):'Nothing available yet')])]);wrap.appendChild(payout);
 if(d.commissions.length){const hist=el('section',{class:'hub-panel'},[el('div',{class:'hub-panel-head'},el('div',{},[el('div',{class:'eyebrow'},'EARNINGS'),el('h3',{},'Commission history')]))]);d.commissions.slice(0,25).forEach(c=>hist.appendChild(el('div',{class:'hub-row'},[el('div',{class:'grow'},[el('b',{},c.kind==='sales_milestone_bonus'?c.threshold+'-sale milestone bonus':c.tier+' membership'),el('small',{},new Date(c.createdAt).toLocaleDateString()+' · '+c.status+(c.kind==='sales_milestone_bonus'?'':' · '+Number(c.rateBps||3000)/100+'%')+(c.rankingReversedAt?' · excluded from ranking':''))]),el('strong',{},cents(c.amountCents))])));wrap.appendChild(hist);}wrap.appendChild(tools);return wrap;
}
async function renderDealIntake(){const wrap=el('div',{class:'panel intake-public'}),code=state.intakeCode||new URLSearchParams(location.search).get('code');if(!code){wrap.appendChild(el('div',{class:'empty'},'This deal intake link is incomplete.'));return wrap;}const d=await api('GET','/api/intake/'+encodeURIComponent(code));wrap.appendChild(el('div',{class:'eyebrow'},'DEAL INTAKE'));wrap.appendChild(el('h2',{},'Send a property to '+d.owner.name));wrap.appendChild(el('p',{class:'sub'},'Share the basic opportunity details. Your submission goes directly into their Better Real Estate workspace.'));const refs={};[['name','Your name'],['email','Email'],['phone','Phone'],['address','Property address'],['asking','Asking price']].forEach(([k,l])=>{wrap.appendChild(el('label',{},l));refs[k]=el('input',{type:k==='asking'?'number':'text'});wrap.appendChild(refs[k]);});wrap.appendChild(el('label',{},'Property notes'));refs.notes=el('textarea',{placeholder:'Condition, occupancy, timeline, access, anything important…'});wrap.appendChild(refs.notes);const st=el('div',{class:'errmsg'});wrap.append(st,el('button',{class:'submitbtn',onclick:async()=>{try{await api('POST','/api/intake/'+encodeURIComponent(code),Object.fromEntries(Object.entries(refs).map(([k,v])=>[k,v.value])));wrap.innerHTML='';wrap.appendChild(el('div',{class:'empty'},[el('h3',{},'Property sent'),el('p',{},'Your deal was delivered through Better Real Estate.') ]));}catch(e){st.textContent=e.message;}}},'Submit property'));return wrap;}

function openCommandPalette(){if(!state.user)return;const shade=el('div',{class:'command-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),box=el('div',{class:'command-palette'}),input=el('input',{placeholder:'Search tools and actions…'}),list=el('div',{class:'command-list'});const actions=[...quickOptionCatalog(),{id:'search',title:'Search properties & people',desc:'Universal search',view:'search'},{id:'messages',title:'Messages',desc:'Open conversations',view:'messages'},{id:'offers',title:'Offers',desc:'Review sent and received offers',view:'offers'},{id:'calendar',title:'Deal calendar',desc:'Deadlines and reminders',view:'dealcalendar'}];const draw=()=>{list.innerHTML='';const q=input.value.toLowerCase();actions.filter(x=>(x.title+' '+x.desc).toLowerCase().includes(q)).slice(0,12).forEach(x=>list.appendChild(el('button',{onclick:()=>{shade.remove();go(x.view);}},[el('b',{},x.title),el('span',{},x.desc)])));};input.oninput=draw;input.onkeydown=e=>{if(e.key==='Escape')shade.remove();};box.append(input,list);shade.appendChild(box);document.body.appendChild(shade);draw();setTimeout(()=>input.focus(),20);}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();openCommandPalette();}});

/* ================= v27 OPERATING NETWORK ================= */
const STATE_CODES=['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY','DC'];
function miniMetric(value,label){return el('div',{class:'mini-metric'},[el('b',{},String(value)),el('span',{},label)]);}
function quickOptionCatalog(){
 if(hasRole(state.user,'affiliate'))return [{id:'affiliate',title:'Affiliate center',desc:'Application, tracked link and earnings',view:'affiliate'},{id:'wallet',title:'Wallet & payouts',desc:'Manage your cash balance',view:'wallet'},{id:'settings',title:'Settings',desc:'Account type, profile and help',view:'settings'}];
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
function selectedQuickOptions(){const allowed=new Set(quickOptionCatalog().map(x=>x.id));const saved=state.user?.settings?.quickOptions;const defaults=hasRole(state.user,'affiliate')?['affiliate','wallet','settings']:state.access?.adminUnlimited?['admin','transactionhub','compose','dealbuilder','pipeline']:['transactionhub','compose','dealbuilder','pipeline','liked'];return (Array.isArray(saved)?saved:defaults).filter(x=>allowed.has(x)).slice(0,6);}
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

function openFormModal(title,fields,saveLabel,onSave){const shade=el('div',{class:'quick-shade',onclick:e=>{if(e.target===shade)shade.remove();}}),card=el('div',{class:'quick-card form-modal'});card.appendChild(el('div',{class:'quick-head'},[el('div',{},[el('div',{class:'eyebrow'},'BETTER REAL ESTATE'),el('h3',{},title)]),el('button',{class:'iconbtn',onclick:()=>shade.remove()},'×')]));const refs={};fields.forEach(f=>{card.appendChild(el('label',{},f.label));let input;if(f.type==='textarea'){input=el('textarea',{placeholder:f.placeholder||''});input.value=f.value||'';}else{input=el('input',{type:f.type||'text',placeholder:f.placeholder||'',value:f.value||''});}refs[f.key]=input;card.appendChild(input);});const st=el('div',{class:'errmsg'}),actions=el('div',{class:'form-modal-actions'},[el('button',{class:'btn-ghost',onclick:()=>shade.remove()},'Cancel'),el('button',{class:'btn-primary',onclick:async e=>{st.textContent='';try{await withButtonBusy(e.currentTarget,async()=>{await onSave(Object.fromEntries(Object.entries(refs).map(([k,v])=>[k,v.value])));shade.remove();});}catch(err){st.textContent=err.message;}}},saveLabel||'Save')]);card.append(st,actions);shade.appendChild(card);document.body.appendChild(shade);setTimeout(()=>Object.values(refs)[0]?.focus(),20);}
function statePicker(selected=[],onChange){const chosen=new Set(selected||[]),wrap=el('div',{class:'state-picker'});STATE_CODES.forEach(code=>{const b=el('button',{type:'button',class:chosen.has(code)?'on':''},code);b.onclick=()=>{chosen.has(code)?chosen.delete(code):chosen.add(code);b.classList.toggle('on',chosen.has(code));onChange?.([...chosen]);};wrap.appendChild(b);});return wrap;}
async function renderCommandCenter(){
 const wrap=el('div',{class:'page commandcenter'}),d=await api('GET','/api/dashboard');
 wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('div',{class:'eyebrow'},'OPERATING NETWORK'),el('h2',{},'Command center'),el('div',{class:'sub'},'The work that needs your attention, without hunting through the site.')]),el('button',{class:'btn-primary',onclick:openQuickCreate},'+ Quick create')]));
 wrap.appendChild(el('div',{class:'command-grid'},[miniMetric(d.matched,'Deals in your markets'),miniMetric(d.buyerMatches,'Buyer matches'),miniMetric(d.pendingOffers,'Offers waiting'),miniMetric(d.upcoming?new Date(d.upcoming.at).toLocaleDateString():'—','Next deadline')]));
 const actions=el('div',{class:'command-actions'});[['Deal pipeline','pipeline'],['Deal calendar','dealcalendar'],['Saved searches','savedsearches'],['Market Hubs','markethubs'],['Buyer CRM','buyercrm'],['Liked properties','saved']].forEach(([t,v])=>actions.appendChild(el('button',{onclick:()=>go(v)},t)));wrap.appendChild(actions);
 if(d.upcoming)wrap.appendChild(el('div',{class:'attention-card'},[el('span',{class:'eyebrow'},'NEXT UP'),el('b',{},d.upcoming.title),el('span',{},new Date(d.upcoming.at).toLocaleString())]));
 if(d.recentViewed?.length){wrap.appendChild(el('div',{class:'sectiontitle'},'Recently viewed'));const rv=el('div',{class:'recent-strip'});d.recentViewed.forEach(x=>rv.appendChild(el('button',{class:'recent-card',onclick:()=>go('detail',{detailId:x.id})},[x.photo?el('img',{src:x.photo}):el('div',{class:'recent-placeholder'},'BRE'),el('div',{},[el('b',{},x.address),el('span',{},x.city+' · '+money(x.asking))])])));wrap.appendChild(rv);}
 try{const n=await api('GET','/api/notifications');if(n.notifications.length){wrap.appendChild(el('div',{class:'sectiontitle'},`Property updates${n.unread?' · '+n.unread+' new':''}`));const box=el('div',{class:'notification-list'});n.notifications.slice(0,8).forEach(x=>box.appendChild(el('button',{class:'notification-row',onclick:()=>go('detail',{detailId:x.listingId})},[el('b',{},x.title),el('span',{},x.body),el('small',{},new Date(x.at).toLocaleString())])));wrap.appendChild(box);if(n.unread)api('POST','/api/notifications/read').then(()=>refreshUnread().then(()=>{renderTop();renderTabs();})).catch(()=>{});}}catch{}
 return wrap;
}
async function renderUniversalSearch(){
 const wrap=el('div',{class:'page universal-search'});wrap.appendChild(el('div',{class:'pageheadrow'},[el('div',{},[el('h2',{},'Search'),el('div',{class:'sub'},'Find properties and people. Filter deals, then save the criteria as an alert.')]),el('button',{class:'btn-ghost',onclick:()=>go('savedsearches')},'Saved searches')]));
 const q=el('input',{placeholder:'Address, city, property type, person…',value:state.searchQ||''}),st=el('select');st.appendChild(el('option',{value:''},'All states'));STATE_CODES.forEach(x=>st.appendChild(el('option',{value:x},x)));const max=el('input',{type:'number',placeholder:'Max price'}),type=el('select');['','Single Family','Multi Family','Condo','Townhouse','Land','Commercial'].forEach(x=>type.appendChild(el('option',{value:x},x||'All property types')));const goBtn=el('button',{class:'btn-primary'},'Search');
 wrap.appendChild(el('div',{class:'searchbar-pro'},[q,st,max,type,goBtn]));const host=el('div');wrap.appendChild(host);
 const load=async()=>{state.searchQ=q.value;host.innerHTML='<div class="networkloading">Searching…</div>';try{const r=await api('GET',`/api/search?q=${encodeURIComponent(q.value)}&state=${encodeURIComponent(st.value)}&maxPrice=${encodeURIComponent(max.value)}&type=${encodeURIComponent(type.value)}`);host.innerHTML='';host.appendChild(el('div',{class:'search-section-head'},[el('h3',{},`Properties · ${r.listings.length}`),el('button',{class:'btn-ghost',onclick:()=>openFormModal('Save this search',[{key:'name',label:'Alert name',value:'My deal alert',placeholder:'e.g. Philadelphia flips under $200k'}],'Save alert',async v=>{if(!v.name.trim())throw new Error('Name your alert.');await api('POST','/api/saved-searches',{name:v.name,query:q.value,states:st.value?[st.value]:[],propertyTypes:type.value?[type.value]:[],maxPrice:max.value,alerts:true});toast('Deal alert saved','ok');})},'Save search + alert')]));const grid=el('div',{class:'search-property-grid'});r.listings.forEach(l=>grid.appendChild(propertyCard(l)));if(!r.listings.length)grid.appendChild(el('div',{class:'empty'},[el('h3',{},'No exact match yet.'),el('p',{},'Broaden the search or save it as a Deal Alert so Better can keep watch.') ]));host.appendChild(grid);host.appendChild(el('h3',{class:'search-section-head'},`People · ${r.people.length}`));const people=el('div',{class:'peoplegrid'});r.people.forEach(u=>people.appendChild(personCard(u)));host.appendChild(people);if(r.companies?.length){host.appendChild(el('h3',{class:'search-section-head'},`Companies · ${r.companies.length}`));const cg=el('div',{class:'search-chip-grid'});r.companies.forEach(c=>cg.appendChild(el('button',{class:'search-entity-chip',onclick:()=>go('company',{companyId:c.id})},[el('b',{},c.name),el('span',{},(c.markets||[]).join(' · ')||'Company workspace')] )));host.appendChild(cg);}if(r.buyers?.length){host.appendChild(el('h3',{class:'search-section-head'},`Buyers · ${r.buyers.length}`));const bg=el('div',{class:'buyerdemandgrid'});r.buyers.forEach(x=>bg.appendChild(buyerDemandCard(x)));host.appendChild(bg);}if(r.markets?.length){host.appendChild(el('h3',{class:'search-section-head'},'Markets'));host.appendChild(el('div',{class:'search-chip-grid'},r.markets.map(m=>el('button',{class:'search-entity-chip',onclick:()=>{q.value=m;st.value=m;load();}},m))));}}catch(e){host.innerHTML='';host.appendChild(el('div',{class:'errmsg'},e.message));}};goBtn.onclick=load;q.onkeydown=e=>{if(e.key==='Enter')load();};load();return wrap;
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
  const customStart=el('input',{type:'datetime-local'}),customEnd=el('input',{type:'datetime-local'});let activityPreset='24h',showGrowth=false,activityRequest=0;
  const growthHost=el('div'),growthToggle=el('button',{class:'btn-ghost growth-toggle','aria-expanded':'false'},'View growth charts');
  const loadActivity=async()=>{const request=++activityRequest;let url='/api/admin/activity?preset='+activityPreset+(showGrowth?'&charts=1':'');if(activityPreset==='custom')url+=`&start=${encodeURIComponent(customStart.value)}&end=${encodeURIComponent(customEnd.value)}`;const d=await api('GET',url);if(request!==activityRequest)return;growthHost.replaceChildren();if(showGrowth&&d.growth)growthHost.appendChild(renderGrowthCharts(d.growth));activityHost.innerHTML='';if(d.historyNote)activityHost.appendChild(el('p',{class:'sub'},d.historyNote));activityHost.appendChild(el('div',{class:'statgrid'},[stat(d.metrics.activeNow,'Active now'),stat(d.metrics.uniqueActive,'Unique active'),stat(d.metrics.returning,'Returning'),stat(d.metrics.signups,'New signups'),stat(d.metrics.listings,'Listings'),stat(d.metrics.messages,'Messages'),stat(d.metrics.dealBuilderRuns,'Deal analyses'),stat(d.metrics.profilesCompleted,'Profiles set up'),stat(d.metrics.engaged,'Engaged users'),stat(d.metrics.paid,'Paid access')]));if(d.activeNow.length){activityHost.appendChild(el('div',{class:'admin-active-list'},[el('b',{},'On the site now'),...d.activeNow.map(u=>el('div',{class:'admin-active-user'},[el('span',{},u.name),el('small',{},[u.plan,...(u.markets||[])].filter(Boolean).join(' · '))]))]));}if(d.markets.length)activityHost.appendChild(el('div',{class:'market-mini'},d.markets.map(m=>el('span',{},`${m.state} · ${m.count}`))));if(d.plans)activityHost.appendChild(el('div',{class:'market-mini'},Object.entries(d.plans).map(([p,n])=>el('span',{},`${p} · ${n}`))));};
  [['24h','24 hours'],['7d','1 week'],['30d','1 month'],['all','All time'],['custom','Custom']].forEach(([v,l])=>activityControls.appendChild(el('button',{class:v==='24h'?'active':'',onclick:async e=>{activityPreset=v;[...activityControls.querySelectorAll('button')].forEach(b=>b.classList.remove('active'));e.currentTarget.classList.add('active');customStart.style.display=customEnd.style.display=v==='custom'?'block':'none';if(v!=='custom'||(customStart.value&&customEnd.value))await loadActivity();}},l)));
  customStart.style.display=customEnd.style.display='none';customStart.onchange=customEnd.onchange=()=>{if(customStart.value&&customEnd.value)loadActivity();};activityControls.append(customStart,customEnd);growthToggle.onclick=()=>withButtonBusy(growthToggle,async()=>{showGrowth=!showGrowth;growthToggle.textContent=showGrowth?'Hide growth charts':'View growth charts';growthToggle.setAttribute('aria-expanded',String(showGrowth));try{await loadActivity();}catch(e){toast(e.message,'err');}});activityCard.append(activityControls,activityHost,growthToggle,growthHost);wrap.appendChild(activityCard);await loadActivity();
  wrap.appendChild(el('div',{class:'sectiontitle'},'Demo accounts'));
  const demoCard=el('div',{class:'card demo-account-card'});
  const demoHead=el('div',{class:'demo-account-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'CONTROLLED TESTING'),el('h3',{},'Create demo account'),el('p',{class:'sub'},'Create a safe account for testing Better Real Estate. Demo activity never consumes Founder places, changes growth analytics, or creates real billing, referral rewards, affiliate commissions or payouts.')]),el('span',{class:'demo-admin-badge'},'DEMO')]);
  const demoGrid=el('div',{class:'demo-form-grid'});
  const field=(label,control,help='')=>{const f=el('label',{class:'demo-field'},[el('span',{class:'demo-field-label'},label),control]);if(help)f.appendChild(el('small',{},help));return f;};
  const dName=el('input',{placeholder:'Example: Better Demo'}),dEmail=el('input',{type:'email',placeholder:'demo@example.com'}),dPass=el('input',{type:'password',placeholder:'At least 6 characters'});
  const dRole=el('select',{},[['buyer','Buyer / Investor'],['seller','Seller / Wholesaler'],['lender','Lender / Funder']].map(([v,l])=>el('option',{value:v},l)));
  const dPlan=el('select',{},[['free','Free'],['pro','Better Plus'],['platinum','Platinum'],['wholesale','Wholesale Teams']].map(([v,l])=>el('option',{value:v},l)));
  const dStatus=el('div',{class:'demo-feedback','aria-live':'polite'});
  const createDemo=el('button',{class:'btn-primary demo-primary-action'},'Create Demo Account');
  const refreshDemoChoices=async()=>{const r=await api('GET','/api/admin/user-inspector?q=');pvUser.innerHTML='';const demos=r.users.filter(u=>u.demo);pvUser.appendChild(el('option',{value:''},demos.length?'Select a demo account':'No demo accounts yet'));demos.forEach(u=>pvUser.appendChild(el('option',{value:u.id},`${u.name} · ${adminPlanLabel(u.demoPlan||'free')}`)));updatePreviewControls();};
  createDemo.onclick=async()=>{dStatus.textContent='';createDemo.disabled=true;try{const r=await api('POST','/api/admin/demo-accounts',{name:dName.value.trim(),email:dEmail.value.trim(),password:dPass.value,role:dRole.value,demoPlan:dPlan.value});dName.value=dEmail.value=dPass.value='';dStatus.textContent=`Created ${r.user.name}. Choose it below to start a preview.`;dStatus.className='demo-feedback success';toast('Demo account created','ok');await loadInspector();await refreshDemoChoices();pvUser.value=r.user.id;updatePreviewControls();}catch(e){dStatus.textContent=e.message;dStatus.className='demo-feedback error';}finally{createDemo.disabled=false;}};
  demoGrid.append(field('Display name',dName),field('Demo email',dEmail),field('Password',dPass),field('Role',dRole),field('Simulated membership',dPlan));
  demoCard.append(demoHead,demoGrid,el('div',{class:'demo-action-row'},[createDemo]),dStatus);wrap.appendChild(demoCard);

  const previewCard=el('div',{class:'card demo-preview-card'});
  const previewHead=el('div',{class:'demo-account-head'},[el('div',{},[el('div',{class:'dispoeyebrow'},'SAFE EXPERIENCE PREVIEW'),el('h3',{},'Preview the real user experience'),el('p',{class:'sub'},'Choose a demo account and an experience. Start Preview immediately enters that demo experience. You can return to Admin from the top navigation.')]),el('span',{class:'demo-admin-badge'},'PREVIEW')]);
  const previewGrid=el('div',{class:'demo-preview-form'}),pvUser=el('select',{'aria-label':'Demo account'}),pvType=el('select',{'aria-label':'Experience'}),pvPosition=el('input',{type:'number',min:'1',max:'100',value:'7','aria-label':'Simulated Founder position'}),pvRun=el('button',{class:'btn-primary'},'Start Preview'),pvClear=el('button',{class:'btn-ghost'},'Reset Preview'),pvEnter=el('button',{class:'btn-ghost'},'Enter Demo'),pvStatus=el('div',{class:'demo-preview-summary','aria-live':'polite'});
  pvType.append(el('option',{value:'founder'},'First 50 Founder welcome'),el('option',{value:'onboarding'},'New-user onboarding'),el('option',{value:'whatsnew'},'What’s New tutorial'));
  const updatePreviewControls=()=>{const has=!!pvUser.value;pvRun.disabled=pvClear.disabled=pvEnter.disabled=!has;const founder=pvType.value==='founder';pvPosition.closest?.('.demo-field')?.classList.toggle('is-hidden',!founder);pvPosition.style.display=founder?'block':'none';};
  pvType.onchange=updatePreviewControls;pvUser.onchange=()=>{pvStatus.innerHTML='';updatePreviewControls();};
  pvRun.onclick=async()=>{if(!pvUser.value)return;await withButtonBusy(pvRun,async()=>{try{await api('POST',`/api/admin/demo-accounts/${pvUser.value}/preview`,{type:pvType.value,position:Number(pvPosition.value||7)});const entered=await api('POST',`/api/admin/demo-accounts/${pvUser.value}/enter`);state.user=entered.user;state.access=entered.access;state.demoAdminSession=true;state.launchTutorialAfterNav=false;state.launchProductUpdateTutorial=false;go('feed',{}, {replace:true});}catch(e){pvStatus.textContent=e.message;pvStatus.className='demo-feedback error';}});};
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
      if(u.founderAward)details.push(`First 50 · #${u.founderAward.position}`);
      const actions=el('div',{class:'inspector-actions'});
      if(u.role!=='admin')actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:()=>openAdminAccessModal(u,loadInspector)},'Manage access'));
      if(u.role!=='admin' && !u.demo)actions.appendChild(el('button',{class:'dangerbtn compactbtn',onclick:async()=>{const typed=prompt(`Permanently delete ${u.name} (${u.email})? This is intended for spam/abusive accounts. Type DELETE USER to confirm.`);if(typed!=='DELETE USER')return;try{await api('DELETE',`/api/admin/users/${u.id}`,{confirmation:'DELETE USER'});toast('Account permanently deleted','ok');await loadInspector();}catch(e){toast(e.message,'err')}}},'Delete account'));
      if(u.demo){
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{try{const r=await api('POST',`/api/admin/demo-accounts/${u.id}/enter`);state.user=r.user;state.access=r.access;state.demoAdminSession=true;go('feed',{}, {replace:true});}catch(e){toast(e.message,'err')}}},'Enter demo'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:()=>openFormModal('Reset demo password',[{key:'password',label:'New demo password',type:'password',placeholder:'At least 6 characters'}],'Reset password',async v=>{await api('POST',`/api/admin/demo-accounts/${u.id}/password`,{password:v.password});toast('Demo password reset','ok');})},'Reset password'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm(`Reset ${u.name} to a clean demo state?`))return;try{await api('POST',`/api/admin/demo-accounts/${u.id}/reset`);toast('Demo account reset','ok');await loadInspector();}catch(e){toast(e.message,'err')}}},'Reset demo'));
        actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{if(!confirm(`Convert ${u.name} into a real account? This cannot restore old rewards or Founder eligibility retroactively.`))return;try{await api('POST',`/api/admin/demo-accounts/${u.id}/convert`,{confirmation:'CONVERT'});toast('Converted to real account','ok');await loadInspector();}catch(e){toast(e.message,'err')}}},'Convert to real'));
        actions.appendChild(el('button',{class:'dangerbtn compactbtn',onclick:async()=>{const typed=prompt(`Permanently delete demo account ${u.name}? Type DELETE DEMO to confirm.`);if(typed!=='DELETE DEMO')return;try{await api('DELETE',`/api/admin/demo-accounts/${u.id}`,{confirmation:'DELETE DEMO'});toast('Demo account deleted','ok');await loadInspector();await refreshDemoChoices();}catch(e){toast(e.message,'err')}}},'Delete demo'));
      }
      if (!hasRole(u,'affiliate')) actions.appendChild(el('button',{class:'btn-ghost compactbtn',onclick:async()=>{const next=!u.foundingMember;if(!confirm(`${next?'Grant':'Remove'} Founding Member status for ${u.name}?`))return;try{await api('POST','/api/admin/set-founding-member',{userId:u.id,foundingMember:next});toast(next?'Founding Member granted':'Founding Member removed','ok');await loadInspector();}catch(e){toast(e.message,'err')} }},u.foundingMember?'Remove founding':'Grant founding'));
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
        verifyResults.appendChild(el('div',{class:'listrow adminverifyrow'},[el('div',{class:'grow'},[el('div',{class:'t'},[u.name,u.verified?el('span',{class:'vbadge'},'✓ Verified'):null]),el('div',{class:'s'},[u.username?'@'+u.username:null,u.email,roleLabel(u),accountAgeLabel(u.createdAt)].filter(Boolean).join(' · '))]),btn]));
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
  const links = [['about','About'],['faq','FAQ'],['affiliate','Affiliate'],['terms','Terms'],['privacy','Privacy'],['contact','Contact']];
  const row = el('div', { class: 'footlinks' });
  links.forEach(([v, l]) => row.appendChild(el('a', { onclick: () => go(v) }, l)));
  f.appendChild(el('div', { class: 'footinner' }, [
    row,
    socialLinksBlock(true),
    el('div', { class: 'footmeta' }, `© ${new Date().getFullYear()} Better Real Estate · partners@betterrealestate.org`),
    el('div', { class: 'footdisc' }, 'Better Real Estate is a listing and marketing platform. We are not a licensed real estate brokerage and do not provide brokerage, legal, tax, or investment advice. Verify every property independently and consult your own professionals before transacting.')
  ]));
}

const staticPage = (title, sub, blocks) => {
  const wrap = el('div', { class: 'page staticpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go(state.user ? (hasRole(state.user,'affiliate') ? 'affiliate' : 'feed') : 'home') }, '← Back'));
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
    ['What do I get with a new account?', `Your Better Real Estate account stays free. New accounts also include ${state.pricing?.signupTrialDays || 7} days of complimentary full access with no card required. After that, you still keep the Free plan and five free listing unlocks. Additional unlocks are ${cents(state.pricing.unlockCredit)} each or ${cents(state.pricing.unlockPack10)} for ten. Paid memberships are Better Plus (${cents(state.pricing.pro.monthly)}/mo), Platinum (${cents(state.pricing.platinum.monthly)}/mo), and Wholesale Teams (${cents(state.pricing.wholesale.monthly)}/mo), with annual options available on the Plans page.`],
    ['How does the ranking work?', 'Your buy box drives it. Set a price range, the markets you work, property types and a minimum spread, and matching listings rise to the top. Freshness, how many other buyers saved a listing, and whether you follow the seller all factor in. Promoted listings are pinned above organic ones and are labelled as promoted.'],
    ['What does promoting a listing do?', 'It pins your property above organic listings in every matching feed for the window you buy — 24 hours through a week, or a one-hour top slot with Super Boost. You can see exactly what it bought you in the analytics for that listing: views, saves, unlocks and offers.'],
    ['How does the marketplace fee work?', 'Listing an item is free. When it sells, Better Real Estate keeps 7% and the rest lands in your wallet. You can withdraw once your balance clears $20.'],
    ['Are listings verified?', 'Sellers can pay for verification, which puts a badge on their profile after an admin reviews them. That verifies the person, not the property. Nobody inspects the houses. Treat every listing as unverified information from a stranger until you have confirmed it yourself — pull the county record, check title, and walk the property.'],
    ['Can I sell appliances or electronics?', 'No. Users cannot list anything mains-powered or battery-powered — that means appliances, HVAC equipment, power tools, light fixtures, electrical parts and consumer electronics. Anything electrical needs a UL or ETL listing to be sold legally in the US, and there is no way to verify that on a private listing. Uncertified electrical goods are a genuine fire risk, not a paperwork technicality. Furniture, plumbing fixtures, cabinet and door hardware, flooring, doors, windows, countertops and hand tools are all welcome. Electrical goods sold through the Better Real Estate shop come from suppliers who have provided certification documents to us in writing.'],
    ['How do I delete my account?', 'You can permanently delete your own account from Settings. For security, Better asks for your password and a typed confirmation before deletion. Active marketplace obligations or a remaining seller-wallet balance may need to be resolved first.']
  ]);
}

function pageTerms() {
  return staticPage('Terms of Service', 'Last updated October 9, 2026. Plain-English summary, not a substitute for legal review.', [
    ['Advertising measurement', 'We use Meta Pixel for limited PageView measurement on public marketing pages. Meta may receive page URLs, browser/device information, IP addresses and cookie identifiers for advertising measurement. See Privacy for details and the Settings opt-out. This does not enroll you in texts or change your email settings.'],
    [null, 'By creating an account you agree to these terms. If you do not agree, do not use the site.'],
    ['1. What this service is', 'Better Real Estate is an online platform where users post property listings and items for sale, and communicate with each other. We are not a real estate brokerage, agent, escrow holder, lender, or party to any transaction between users. We do not verify property ownership, condition, title, valuation, or any statement a user makes.'],
    ['2. Your account', 'You must be 18 or older and provide accurate information. You are responsible for everything that happens under your account and for keeping your password secure. One account per person. Usernames may be changed subject to reasonable anti-abuse limits. You may permanently delete your account from Settings, subject to retention of records we reasonably need for completed transactions, accounting, fraud prevention or legal obligations.'],
    ['2b. Account emails', 'Creating an account enrolls you in Better Real Estate product and activity emails, including new listings, marketplace updates and occasional reminders. Marketing emails are sent no more than once every 48 hours. You can turn them off in Settings or use the unsubscribe link in any marketing email. Account confirmation, password resets, receipts and other service emails are separate. If your email remains unconfirmed, we may send a confirmation reminder every 48 hours until you verify it.'],
    ['2a. Company workspaces', 'Wholesale Teams workspaces are licensed for the number of seats shown on the plan. Each team member must use their own login; sharing passwords or creating duplicate identities to evade seat limits is not allowed. Company owners and admins may manage members and company content. Listing-related inquiries may be visible to authorized members of the company workspace, while personal direct messages that are not connected to company listings remain private to the individual account. The company owner is responsible for team access and billing.'],
    ['3. What you may not post', 'Do not post property you have no legal right to sell or market. Do not post false, misleading, or fabricated listings. Do not post items you do not have. Do not harass other users, scrape the site, or attempt to circumvent payment. We remove content and terminate accounts for any of the above, without refund.'],
    ['3a. No electronics or appliances', 'Users may not list any item that runs on mains power or a battery. This includes but is not limited to appliances, HVAC equipment, water heaters, power tools, light fixtures, lamps, bulbs, wiring, breakers, outlets, switches, smart-home devices, alarms, detectors, generators, batteries and consumer electronics. Listings that appear to be electrical may be rejected automatically and accounts that repeatedly attempt to evade this rule may be terminated.'],
    ['4. Transactions between users', 'Any deal you reach with another user is strictly between you and them. We do not guarantee that a listed property exists, is available, is priced accurately, or that any user will perform. You are solely responsible for your own due diligence, contracts, inspections, title work, and compliance with the laws of your jurisdiction.'],
    ['5. Payments, subscriptions, and promotions', 'Payments may be processed by Stripe or another disclosed payment provider. Promotions, unlocks, verification, subscriptions and marketplace purchases are charged when purchased. Promotions run for the stated window and are non-refundable once they begin. Subscriptions renew until cancelled and can be cancelled anytime, effective at the end of the current period. Marketplace sales are subject to the platform fee stated at listing.'],
    ['5b. Affiliate program', 'Affiliate participation requires approval. Under the current affiliate terms, approved affiliates earn a 30% base ONE-TIME commission on a qualifying referred customer’s first eligible paid membership transaction only. Affiliates in the all-time top 5 gain one percentage point per eligible purchase, including that purchase, capped at 40%. Rank includes the incoming purchase and counts eligible paid membership acquisitions; ties use earliest first eligible purchase and then account ID. Leaving the top 5 resets the rate to 30%; returning starts a new bonus run. Refunds, disputes and ineligible purchases do not build rank or bonus. Previously earned commission rates are not rewritten by rank changes. Membership renewals, later billing cycles, cancellation and later resubscription, upgrades and downgrades do not create another commission unless Better Real Estate expressly adopts different terms in a future agreement. One-time milestone cash bonuses offer up to $5 at 10, $10 at 25, $15 at 50 and $25 at 100 eligible purchases under the v29.47 bonus program. Past purchases do not create retroactive milestone payouts. Total milestone awards are capped at 3% of membership revenue retained after acquisition commissions; awards may be reduced by that cap and are not topped up later. Refunds or disputes can reverse pending or available milestone awards when eligibility or the revenue budget is reduced. Commissions and milestone bonuses are held for 3 days before becoming available and may be reversed for refunds, disputes, chargebacks, fraud or ineligible activity. Self-referrals, duplicate/fake accounts, tracking manipulation and other abusive activity are prohibited. Available cash earnings are paid through the disclosed Stripe Connect payout system after required payout onboarding. Better Real Estate does not store full bank or card credentials. Any future commission-rate or material compensation-term change requires affirmative in-platform acceptance before the new terms apply to future earnings, and does not silently rewrite legitimately earned commissions. Affiliates are responsible for required disclosures, taxes and lawful promotion. Better Credits are separate promotional credits and are not cash-withdrawable.'],
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
    ['10. Contact', 'Questions about these terms: partners@betterrealestate.org'],
    ['A necessary note', 'This document is a working template for a small platform. Before scaling real payments, marketplace payouts, or regulated transaction services, have a lawyer review these terms and the privacy policy for the states and countries where you operate.']
  ]);
}

function pagePrivacy() {
  return staticPage('Privacy Policy', 'Last updated October 10, 2026.', [
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
    ['Why we collect it', 'To run your account, rank your For You feed against your selected markets and buy boxes, power saved-search/deal alerts, liked-property change notifications, Buyers Looking and deal matching, operate buyer-list capture pages, generate Better Dispo distribution tools, power member search, friend connections and direct messaging, operate company workspaces and team permissions, connect buyers and sellers, quote shipping, fulfil marketplace orders, process payments and payouts, prevent fraud and abuse, provide support, send transactional messages such as confirmations, shipping notices, password resets and enabled unread-message reminders, provide AI-assisted listing/deal-import tools when you invoke them, and send product and activity emails enabled when you create an account, which you can disable in Settings or unsubscribe from at any time.'],
    ['What other users can see', 'Your name, username, role, bio, optional market/location, profile photo, listing count, follower count, friend count, points, verification status, company affiliation and reviews may be public and may appear in member search. Authorized members of the same Wholesale Teams workspace may see company listings, team analytics, shared acquisition criteria and messages tied to company property listings. Personal direct messages not tied to company listings are not included in the company inbox. Your email address and phone number are shown to another user only where the product requires it, such as after they unlock one of your property listings. Direct messaging does not by itself reveal your email address or phone number. Exact property addresses are hidden from users who have not unlocked that property listing. Shipping addresses entered for marketplace checkout are not displayed publicly.'],
    ['Who we share it with', "We share information only as needed to operate the service: the specific wholesaler/company when you intentionally submit that business's buyer-list form; Stripe and financial-service providers for payments, fraud prevention and payouts; Google Maps Platform for optional address suggestions; shipping, supplier and fulfilment providers for delivering marketplace orders; OpenAI for eligible AI-assisted listing or deal-import generation when you invoke those features; email providers for service emails and enabled marketing messages; hosting, database and storage providers that run the site; and authorities when disclosure is legally required. We do not sell your personal information for money. For advertising measurement, Meta receives the limited information described below to measure and support advertising. Depending on where you live, this may be treated as sharing for advertising; turn advertising measurement off in Settings."],
    ['Cookies and similar technology', 'We use a session cookie to keep you signed in. Payment providers such as Stripe may use cookies, browser/device information and similar signals for payment security and fraud prevention. Meta Pixel measures PageView events on selected public marketing pages for Facebook and Instagram advertising. Meta may receive the page URL, IP address, browser/device information and cookie identifiers. Advertising measurement is optional, disabled on signed-in/private pages, and can be disabled through Settings. We do not enable automatic form-data collection or advanced matching. Browser Global Privacy Control and Do Not Track keep this measurement disabled.'],
    ['Your choices', 'You can edit your profile, username and password, manage your marketplace listings, and permanently delete your account from Settings. Browser address autofill can be controlled in your browser settings, and you can always type your shipping address manually instead of selecting an autocomplete suggestion. Marketing email can be turned on or off in Settings or through the unsubscribe link in any marketing message. Unread-message email reminders can be turned off or delayed in Settings. AI writing features are optional and only send content when you choose to use them. To request a copy of your data or correction that is not available in the product, email partners@betterrealestate.org. Additional legal rights may apply depending on where you live.'],
    ['Retention and security', 'We keep account, order, payment and transaction records for as long as reasonably needed to provide the service, resolve disputes, prevent fraud, and meet tax, accounting or other legal obligations. When you delete an account, public profile content and ordinary social data are removed; transaction records we must retain are de-identified where practical. Shipping information may remain with the related order record only where reasonably needed for those purposes. Passwords are stored as bcrypt hashes and never in readable form. No system is perfectly secure, so avoid posting sensitive information that is not necessary for a transaction.'],
    ['Children', 'This service is not for anyone under 18 and we do not knowingly collect personal information from children.'],
    ['Contact', 'partners@betterrealestate.org']
  ]);

}

function pageContact() {
  const wrap = el('div', { class: 'page staticpage' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go(state.user ? (hasRole(state.user,'affiliate') ? 'affiliate' : 'feed') : 'home') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Contact'));
  wrap.appendChild(el('div', { class: 'sub' }, 'A real person reads these.'));
  wrap.appendChild(el('div', { class: 'card', style: 'padding:22px' }, [
    el('div', { class: 'stbody' }, 'Email us directly:'),
    el('a', { href: 'mailto:partners@betterrealestate.org', class: 'contactmail' }, 'partners@betterrealestate.org'),
    el('div', { class: 'stbody', style: 'margin-top:16px' }, 'Useful things to include: your account email, the listing or item involved, and a screenshot if something looks broken. Expect a reply within a business day or two.')
  ]));
  const subj = el('input', { placeholder: 'What is this about?' });
  const body = el('textarea', { placeholder: 'Tell us what you need.' });
  const btn = el('button', { class: 'submitbtn' }, 'Open in your email app');
  btn.onclick = () => {
    window.location.href = `mailto:partners@betterrealestate.org?subject=${encodeURIComponent(subj.value || 'Better Real Estate enquiry')}&body=${encodeURIComponent(body.value)}`;
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
        el('button', { onclick: async () => { await api('POST', `/api/admin/reports/${r.id}/resolve`, { status: 'resolved', note: noteInput.value }); await refreshUnread(); toast('Marked resolved', 'ok'); renderTop();renderTabs();render(); } }, 'Resolve'),
        el('button', { onclick: async () => { await api('POST', `/api/admin/reports/${r.id}/resolve`, { status: 'dismissed', note: noteInput.value }); await refreshUnread(); toast('Dismissed', 'ok'); renderTop();renderTabs();render(); } }, 'Dismiss')
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
