let state = {
  view: 'home', user: null, authMode: 'signup', pricing: null, access: null,
  detailId: null, profileId: null, photoIdx: 0, composePhotos: [], shopPhotos: [],
  shopCat: 'All', shopQ: '', shopItemId: null
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

async function boot() {
  const params = new URLSearchParams(location.search);
  state.verifyToken = params.get('verify');
  state.resetToken = params.get('reset');
  const checkoutResult = params.get('checkout');
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
    history.replaceState({}, '', location.pathname);
    if (checkoutResult === 'success') {
      setTimeout(async () => { await refreshMe(); toast('Pro is active — thanks!', 'ok'); render(); }, 1800);
    }
  }
  if (state.verifyToken) state.view = 'verify';
  else if (state.resetToken) state.view = 'reset';
  else if (state.user) state.view = 'feed';
  render();
}
async function refreshMe() {
  try { const d = await api('GET', '/api/me'); state.user = d.user; state.access = d.access; } catch {}
}
function go(view, extra = {}) { Object.assign(state, { view }, extra); window.scrollTo(0, 0); render(); }
function render() { renderTop(); renderTabs(); renderApp(); renderFooter(); }

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
  }, document.documentElement.getAttribute('data-theme') === 'dark' ? '☀' : '☾'));
  if (!state.user) { nav.appendChild(el('button', { onclick: () => go('auth') }, 'Sign in')); return; }
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Inbox', onclick: () => go('messages') }, '✉'));
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Boost a listing', onclick: () => go('boostpicker') }, '⚡'));
  nav.appendChild(el('button', { class: 'iconbtn', title: 'Wallet', onclick: () => go('wallet') }, '▤'));
  nav.appendChild(el('button', { onclick: () => go('settings'), class: state.view === 'settings' ? 'active' : '' }, 'Settings'));
}

function renderTabs() {
  const tabs = document.getElementById('tabbar');
  tabs.innerHTML = '';
  if (!state.user) return;
  const items = [['feed','⌂','Feed'], ['shop','▦','Shop'], ['compose','＋','Post'], ['leaderboard','♦','Board'], ['me','◍','Profile']];
  items.forEach(([v, ic, label]) => {
    const active = state.view === v || (v === 'shop' && ['shopitem','sellitem'].includes(state.view));
    tabs.appendChild(el('button', {
      class: active ? 'active' : '', onclick: () => go(v)
    }, [el('span', { class: 'ic' }, ic), el('span', {}, label)]));
  });
}

async function renderApp() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const views = {
    home: renderHome, auth: renderAuth, feed: renderFeed, detail: renderDetail,
    compose: renderCompose, saved: renderSaved, messages: renderMessages,
    me: renderMe, profile: renderProfile, settings: renderSettings, buybox: renderBuyBox,
    promote: renderPromote, leaderboard: renderLeaderboard, admin: renderAdmin,
    wallet: renderWallet, shop: renderShop, shopitem: renderShopItem, sellitem: renderSellItem, offers: renderOffers,
    upgrade: renderUpgrade, analytics: renderAnalytics, orders: renderOrders, suppliers: renderSuppliers, fulfilment: renderFulfilment, reports: renderReports,
    boostpicker: renderBoostPicker, workspace: renderWorkspace,
    about: pageAbout, terms: pageTerms, privacy: pagePrivacy, contact: pageContact, faq: pageFaq,
    forgot: renderForgot, reset: renderReset, verify: renderVerify
  };
  try { app.appendChild(await (views[state.view] || renderHome)()); }
  catch (e) {
    if (placeholder) placeholder.remove();
    app.appendChild(el('div', { class: 'page' }, el('div', { class: 'empty' }, [
      el('h3', {}, 'Something went wrong'), el('p', {}, e.message),
      el('button', { class: 'btn-ghost', style: 'margin-top:18px', onclick: () => render() }, 'Try again')
    ])));
  }
}

/* ================= HOME ================= */
function renderHome() {
  const p = state.pricing;
  const wrap = el('div');
  wrap.appendChild(el('div', { class: 'container' }, el('div', { class: 'hero herogrid2' }, [
    el('div', {}, [
      el('div', { class: 'herokicker' }, 'A social feed for off-market property'),
      el('h1', {}, ['Off-market property, ', el('em', {}, 'first.')]),
      el('p', {}, `Scroll properties like a social feed. Follow the people posting them, make offers, and buy the fixtures and materials to rehab what you close. Free for ${p?.signupTrialDays || 7} days, no card required.`),
      el('div', { class: 'herobtns' }, [
        el('button', { class: 'btn-primary', onclick: () => { state.authMode = 'signup'; go('auth'); } }, 'Start free trial'),
        el('button', { class: 'btn-ghost', onclick: () => { state.authMode = 'login'; go('auth'); } }, 'Sign in')
      ]),
      el('div', { class: 'trustline' }, [
        trustItem('◎', 'Real listings, real sellers'),
        trustItem('✓', 'Admin-verified closings'),
        trustItem('⊘', 'No electronics or appliances sold by users')
      ])
    ]),
    heroPreviewCard()
  ])));
  wrap.appendChild(el('div', { class: 'container' }, el('div', { class: 'featgrid' }, [
    feat('A real feed', 'Photo-first cards ranked against the buy box you set — price, market, property type, minimum spread.'),
    feat('Promote your listing', 'Boost for 24 hours to a week, or Super Boost for the top slot. Sellers pay for reach, buyers see fresh inventory.'),
    feat('Marketplace', 'Furniture, flooring, cabinet and door hardware — the stuff every rehab needs, from people who just finished one.'),
    feat('Wallet & payouts', 'Sales and referral credit land in your balance. Withdraw to your bank when it clears the minimum.')
  ])));
  return wrap;
}
function heroPreviewCard() {
  return el('div', { class: 'heropreview' }, el('div', { class: 'pcard nointeract' }, [
    el('div', { class: 'owner' }, [
      el('div', { class: 'av' }, 'MV'),
      el('div', { class: 'who' }, [el('div', { class: 'n' }, ['Marisol Vega', el('span', { class: 'vbadge' }, '✓')]), el('div', { class: 't' }, 'Probate · ASAP')]),
      el('div', { class: 'boostpill' }, 'PROMOTED')
    ]),
    el('div', { class: 'imgwrap' }, [
      el('div', { class: 'nophoto' }, ''),
      el('div', { class: 'pricebadge' }, '$268,000'),
      el('div', { class: 'spreadbadge' }, '+$117,000')
    ]),
    el('div', { class: 'info' }, [
      el('div', { class: 'addr' }, '4412 Cedar Bend Dr'),
      el('div', { class: 'cityline' }, 'Austin, TX'),
      el('div', { class: 'specs' }, [el('span', {}, '3 bd'), el('span', {}, '2 ba'), el('span', {}, '1,620 sqft')]),
      el('div', { class: 'matchrow' }, [el('span', { class: 'matchtag' }, 'In your price range'), el('span', { class: 'matchtag' }, 'New today')]),
      el('div', { class: 'actions' }, [el('button', {}, '♡ Save'), el('button', { class: 'primary' }, 'View details')])
    ])
  ]));
}
const feat = (h, p) => el('div', { class: 'featcard' }, [el('h3', {}, h), el('p', {}, p)]);
const trustItem = (ic, t) => el('div', { class: 'trustitem' }, [el('span', { class: 'ti-ic' }, ic), el('span', {}, t)]);

/* ================= AUTH ================= */
function renderAuth() {
  const wrap = el('div', { class: 'panel' });
  const isSignup = state.authMode === 'signup';
  wrap.appendChild(el('h2', {}, isSignup ? 'Create your account' : 'Welcome back'));
  wrap.appendChild(el('div', { class: 'sub' }, isSignup ? `${state.pricing?.signupTrialDays || 7} days of full access, no card required.` : 'Sign in to continue.'));

  let role = 'buyer';
  const name = el('input', { placeholder: 'Jordan Alvarez' });
  const email = el('input', { type: 'email', placeholder: 'you@email.com' });
  const pass = el('input', { type: 'password', placeholder: isSignup ? 'At least 6 characters' : 'Your password' });
  const ref = el('input', { placeholder: 'Optional' });
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
  if (isSignup) { wrap.appendChild(el('label', {}, 'Referral code')); wrap.appendChild(ref); }
  wrap.appendChild(err);

  const submit = el('button', { class: 'submitbtn' }, isSignup ? 'Create account' : 'Sign in');
  submit.onclick = async () => {
    err.textContent = '';
    try {
      const payload = isSignup
        ? { name: name.value.trim(), email: email.value.trim(), password: pass.value, role, referralCode: ref.value.trim() }
        : { email: email.value.trim(), password: pass.value };
      const d = await api('POST', isSignup ? '/api/signup' : '/api/login', payload);
      state.user = d.user; if (d.pricing) state.pricing = d.pricing;
      await refreshMe();
      applyTheme(state.user.settings?.theme || 'light');
      go('feed');
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
    el('div', {}, `${state.user.unlockCredits} free unlock${state.user.unlockCredits === 1 ? '' : 's'} left. Pro gives you unlimited.`),
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
    el('h2', {}, 'Your feed'),
    el('div', {}, [
      el('button', { class: 'filterbtn', onclick: () => go('saved') }, 'Saved'),
      el('button', { class: 'filterbtn', style: 'margin-left:6px', onclick: () => go('buybox') }, 'Buy box')
    ])
  ]));
  const { feed, access } = await api('GET', '/api/feed');
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
        el('button', { class: 'primary', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, l.locked ? '🔒 Unlock' : 'View details')
      ])
    ])
  ]);
}

/* ================= DETAIL ================= */
async function renderDetail() {
  const d = await api('GET', '/api/listings/' + state.detailId);
  const { listing, owner, otherListings, reviews } = d;
  state.access = d.access || state.access;
  const wrap = el('div', { class: 'detail' });
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
    el('div', {}, [el('h2', {}, listing.address), el('div', { class: 'c' }, listing.city)]),
    el('div', { class: 'dprice' }, money(listing.asking))
  ]));

  const cells = [
    ['Situation', listing.situation], ['Timeline', listing.timeline], ['Type', listing.propertyType],
    listing.arv ? ['Est. ARV', money(listing.arv)] : null,
    spread ? ['Spread', money(spread)] : null,
    listing.beds ? ['Beds', listing.beds] : null,
    listing.baths ? ['Baths', listing.baths] : null,
    listing.sqft ? ['Sq ft', listing.sqft.toLocaleString()] : null,
    listing.year ? ['Year built', listing.year] : null
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
          el('a', { onclick: () => go('upgrade') }, 'or go Pro for unlimited')
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
        el('div', { class: 'n' }, [owner.name, owner.verified ? el('span', { class: 'vbadge' }, '✓') : null]),
        el('div', { class: 's' }, [owner.phone, owner.email, avg ? `★ ${avg} (${reviews.length})` : null].filter(Boolean).join(' · '))
      ]),
      state.user && state.user.id !== owner.id ? followBtn : null
    ])
  ]));

  // offer + message
  if (state.user && state.user.id !== owner.id) {
    const amt = el('input', { type: 'number', placeholder: String(Math.round(listing.asking * 0.9)) });
    const days = el('input', { type: 'number', placeholder: '14' });
    const terms = el('textarea', { placeholder: 'Cash, no inspection contingency, close on your timeline…' });
    const ost = el('div', { class: 'okmsg' });
    const ob = el('button', { class: 'submitbtn' }, 'Submit offer');
    ob.onclick = async () => {
      try {
        await api('POST', '/api/offers', { listingId: listing.id, amount: amt.value, terms: terms.value, closeDays: days.value });
        ost.textContent = 'Offer sent. Track it under Profile → Offers.'; amt.value = ''; terms.value = '';
      } catch (e) { ost.className = 'errmsg'; ost.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'dsection' }, [
      el('h3', {}, 'Make an offer'),
      twoUp('Offer amount ($)', amt, 'Days to close', days),
      el('label', {}, 'Terms'), terms, ob, ost
    ]));

    const msg = el('textarea', { placeholder: 'Ask about access, condition, or title…' });
    const mst = el('div', { class: 'okmsg' });
    const mb = el('button', { class: 'submitbtn' }, 'Send message');
    mb.onclick = async () => {
      if (!msg.value.trim()) return;
      try { await api('POST', '/api/messages', { toUserId: owner.id, listingId: listing.id, body: msg.value.trim() }); msg.value = ''; mst.textContent = 'Sent.'; }
      catch (e) { mst.className = 'errmsg'; mst.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'dsection' }, [el('h3', {}, 'Message the seller'), msg, mb, mst]));
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
    wrap.appendChild(el('div', { class: 'dsection' }, [
      el('h3', {}, 'Your listing'),
      el('button', { class: 'submitbtn', onclick: () => go('promote', { detailId: listing.id }) }, 'Promote this listing'),
      el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:10px', onclick: () => go('analytics', { detailId: listing.id }) }, 'View analytics')
    ]));
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
  const currentTier = state.access?.platinum ? 'platinum' : state.access?.pro ? 'pro' : 'free';

  wrap.appendChild(el('div', { class: 'tiergrid3' }, [
    tierCard({
      key: 'free', name: 'Free', tagline: '7-day trial, then pay as you browse',
      priceLine: 'Free',
      perks: ['Browse the whole feed, always', '5 free listing unlocks', `${cents(p.unlockCredit)} per unlock after that`],
      current: currentTier === 'free'
    }),
    tierCard({
      key: 'pro', name: p.pro.label, tagline: 'For anyone unlocking regularly',
      priceLine: cents(p.pro.monthly) + '/mo or ' + cents(p.pro.annual) + '/yr',
      perks: ['Unlimited listing unlocks', 'Analytics on your own listings', 'Pro badge on your profile'],
      current: currentTier === 'pro',
      onMonthly: () => subscribeTo('pro', 'monthly', st),
      onAnnual: () => subscribeTo('pro', 'annual', st)
    }),
    tierCard({
      key: 'platinum', name: p.platinum.label, tagline: 'The full toolkit for active investors',
      priceLine: cents(p.platinum.monthly) + '/mo or ' + cents(p.platinum.annual) + '/yr',
      featured: true,
      perks: [
        'Everything in Pro, plus:',
        'First-look alerts — emailed the instant a match posts, before anyone else sees it',
        'Up to 5 buy boxes running at once',
        'Seller verification included free (normally ' + cents(p.verificationFee) + ')',
        'One free Super Boost every month (normally ' + cents(p.promotions.superboost.price) + ')',
        'Marketplace fee cut to ' + (p.platinumFeeBps / 100) + '% (from ' + (p.marketplaceFeeBps / 100) + '%)',
        'Investor workspace — compare saved properties, keep deal notes'
      ],
      current: currentTier === 'platinum',
      onMonthly: () => subscribeTo('platinum', 'monthly', st),
      onAnnual: () => subscribeTo('platinum', 'annual', st)
    })
  ]));
  wrap.appendChild(st);

  if (currentTier !== 'free') {
    const cst = el('div', { class: 'okmsg' });
    const cancelBtn = el('button', { class: 'btn-ghost' }, 'Cancel auto-renewal');
    cancelBtn.onclick = async () => {
      if (!confirm(`Stop future automatic charges? You keep ${currentTier === 'platinum' ? 'Platinum' : 'Pro'} until ${new Date(state.user.planUntil).toLocaleDateString()}, then it won't renew.`)) return;
      try {
        const r = await api('POST', '/api/billing/cancel');
        await refreshMe();
        cst.textContent = r.cancelsAtPeriodEnd ? `Won't renew — stays active until ${new Date(state.user.planUntil).toLocaleDateString()}.` : 'Cancelled.';
        render();
      } catch (e) { cst.className = 'errmsg'; cst.textContent = e.message; }
    };
    wrap.appendChild(el('div', { class: 'card', style: 'padding:16px;margin:18px 0' }, [
      el('div', { class: 'hint', style: 'margin-bottom:10px' }, `You're on ${currentTier === 'platinum' ? 'Platinum' : 'Pro'}, renewing automatically until ${new Date(state.user.planUntil).toLocaleDateString()}.`),
      cancelBtn, cst
    ]));
  }

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
  return wrap;
}

async function subscribeTo(tier, period, st) {
  try {
    const r = await api('POST', '/api/billing/subscribe', { period, tier });
    if (r.checkoutUrl) { window.location.href = r.checkoutUrl; return; }
    await handlePurchaseResponse(r, `${tier === 'platinum' ? 'Platinum' : 'Pro'} active — billed ${period}.`, async () => { await refreshMe(); render(); });
  } catch (e) { st.className = 'errmsg'; st.textContent = e.message; }
}

function tierCard({ name, tagline, priceLine, perks, current, featured, onMonthly, onAnnual }) {
  const card = el('div', { class: 'tiercard' + (featured ? ' featured' : '') });
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
    card.appendChild(el('div', { class: 'row2', style: 'margin-top:14px' }, [
      el('button', { class: featured ? 'submitbtn' : 'btn-ghost', style: 'width:100%', onclick: onMonthly }, 'Monthly'),
      el('button', { class: featured ? 'submitbtn' : 'btn-ghost', style: 'width:100%', onclick: onAnnual }, 'Annual')
    ]));
  }
  return card;
}

/* ================= WALLET ================= */
async function renderWallet() {
  const w = await api('GET', '/api/wallet');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, 'Wallet'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Sales, referrals and credits land here. Withdraw once you clear ' + cents(w.minWithdrawal) + '.'));

  const st = el('div', { class: 'okmsg' });
  wrap.appendChild(el('div', { class: 'balancecard' }, [
    el('div', { class: 'l' }, 'Available balance'),
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

  wrap.appendChild(el('button', { class: 'btn-primary', style: 'width:100%;margin-bottom:18px', onclick: () => go('sellitem') }, '＋ Sell an item'));

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
    checkout.appendChild(el('div', { class: 'checkoutnote' }, 'Enter the delivery address to get the live CJ shipping price before payment.'));
    const line1 = el('input', { placeholder: 'Street address', autocomplete: 'street-address' });
    const line2 = el('input', { placeholder: 'Apartment, suite, unit (optional)', autocomplete: 'address-line2' });
    const city = el('input', { placeholder: 'City', autocomplete: 'address-level2' });
    const stateCode = el('input', { placeholder: 'State (e.g. NJ)', autocomplete: 'address-level1', maxlength: '30' });
    const zip = el('input', { placeholder: 'ZIP code', autocomplete: 'postal-code' });
    const phone = el('input', { placeholder: 'Phone (optional)', autocomplete: 'tel' });
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

    checkout.appendChild(el('label', {}, 'Street address')); checkout.appendChild(line1);
    checkout.appendChild(el('label', {}, 'Apartment, suite, unit (optional)')); checkout.appendChild(line2);
    checkout.appendChild(el('div', { class: 'checkoutgrid' }, [
      el('div', {}, [el('label', {}, 'City'), city]),
      el('div', {}, [el('label', {}, 'State'), stateCode]),
      el('div', {}, [el('label', {}, 'ZIP code'), zip]),
      el('div', {}, [el('label', {}, 'Country'), el('input', { value: 'United States', disabled: 'disabled' })])
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
      quoteBtn.disabled = true; quoteBtn.textContent = 'Checking CJ shipping…';
      try {
        quote = await api('POST', '/api/shop/shipping-quote', { itemId: item.id, shipping });
        quoteBox.className = 'quotesummary';
        quoteBox.innerHTML = '';
        quoteBox.appendChild(el('div', {}, [el('span', {}, 'Item'), el('b', {}, cents(item.price))]));
        quoteBox.appendChild(el('div', {}, [el('span', {}, quote.logisticName || 'Shipping'), el('b', {}, cents(quote.shippingCostCents || 0))]));
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
  const { sellableCategories, bannedCategories, feeBps } = await api('GET', '/api/shop/categories');
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

async function renderOrders() {
  const { bought, sold } = await api('GET', '/api/shop/orders');
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('me') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Orders'));

  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Purchases'));
  const b = el('div', { class: 'card' });
  if (!bought.length) b.appendChild(el('div', { class: 'ledrow' }, el('div', { class: 'dt' }, 'Nothing bought yet.')));
  bought.forEach(o => {
    const statusPill = o.dropship
      ? el('span', { class: 'pill warn' }, 'ships direct')
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
    if (!o.dropship && o.shipStatus !== 'shipped') {
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
      o.dropship ? el('span', { class: 'pill warn' }, 'dropship') : el('span', { class: 'pill ' + (o.shipStatus === 'shipped' ? 'good' : 'warn') }, o.shipStatus === 'shipped' ? 'shipped' : 'pending'),
      el('div', { class: 'amt pos' }, '+' + cents(o.net))
    ]));
    if (!o.dropship && o.shipStatus !== 'shipped') {
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
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('detail', { detailId: state.detailId }) }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Listing analytics'));
  wrap.appendChild(el('div', { class: 'sub' }, 'What your promotion spend is actually buying.'));
  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(a.views, 'Views'), stat(a.uniqueViewers, 'Unique'), stat(a.saves, 'Saves'),
    stat(a.unlocks, 'Unlocks'), stat(a.offers, 'Offers'), stat(a.saveRate + '%', 'Save rate')
  ]));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Promotion spend'));
  wrap.appendChild(el('div', { class: 'card' }, el('div', { class: 'ledrow' }, [
    el('div', { class: 'grow' }, el('div', { class: 'd' }, 'Total spent promoting this listing')),
    el('div', { class: 'amt neg' }, cents(a.promoSpend))
  ])));
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
    el('span', { class: 'pill ' + (o.status === 'accepted' ? 'good' : o.status === 'pending' ? 'warn' : 'bad') }, o.status)
  ])));
  wrap.appendChild(s);
  return wrap;
}

/* ================= COMPOSE ================= */
function renderCompose() {
  const wrap = el('div', { class: 'panel' });
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
    videoUrl: el('input', { placeholder: 'https://youtube.com/… (optional walkthrough)' }),
    notes: el('textarea', { placeholder: 'Condition, access, why they\'re selling.' })
  };
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
  wrap.appendChild(el('label', {}, 'Video walkthrough')); wrap.appendChild(f.videoUrl);
  wrap.appendChild(el('label', {}, 'Notes')); wrap.appendChild(f.notes);
  const err = el('div', { class: 'errmsg' });
  const submit = el('button', { class: 'submitbtn' }, 'Post to feed');
  submit.onclick = async () => {
    err.textContent = ''; submit.disabled = true; submit.textContent = 'Posting…';
    try {
      const payload = { photos: state.composePhotos };
      for (const k in f) payload[k] = f[k].value;
      await api('POST', '/api/listings', payload);
      state.composePhotos = []; go('feed');
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
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Saved properties'));
  const { listings } = await api('GET', '/api/saves/mine');
  wrap.appendChild(el('div', { class: 'sub' }, listings.length + ' saved.'));
  if (!listings.length) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'Nothing saved'), el('p', {}, 'Tap ♡ on anything in the feed.')])); return wrap; }
  const grid = el('div', { class: 'minigrid' });
  listings.forEach(l => grid.appendChild(el('div', { class: 'minicard', onclick: () => go('detail', { detailId: l.id, photoIdx: 0 }) }, [
    el('div', { class: 'mi' }, l.photos?.length ? el('img', { src: l.photos[0] }) : null),
    el('div', { class: 'mt' }, [el('b', {}, l.address), el('span', {}, l.city + ' · ' + money(l.asking))])
  ])));
  wrap.appendChild(grid);
  return wrap;
}

async function renderMessages() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  wrap.appendChild(el('h2', {}, 'Inbox'));
  const { messages } = await api('GET', '/api/messages');
  wrap.appendChild(el('div', { class: 'sub' }, messages.length + ' message(s).'));
  if (!messages.length) { wrap.appendChild(el('div', { class: 'empty' }, [el('h3', {}, 'No messages'), el('p', {}, 'Message a seller from any listing.')])); return wrap; }
  const card = el('div', { class: 'card' });
  messages.forEach(m => card.appendChild(el('div', { class: 'listrow' }, [
    el('div', { class: 'grow' }, [
      el('div', { class: 't' }, (m.outgoing ? 'To ' : 'From ') + m.otherName + (m.listingAddress ? ' · ' + m.listingAddress : '')),
      el('div', { class: 's' }, m.body)
    ]),
    el('span', { class: 'pill ' + (m.outgoing ? 'warn' : 'good') }, m.outgoing ? 'Sent' : 'New')
  ])));
  wrap.appendChild(card);
  return wrap;
}

/* ================= PROFILES ================= */
async function renderMe() {
  const wrap = el('div', { class: 'page' });
  const d = await api('GET', '/api/users/' + state.user.id + '/listings');
  const w = await api('GET', '/api/wallet');
  wrap.appendChild(el('h2', {}, [state.user.name, state.user.verified ? el('span', { class: 'vbadge' }, '✓ Verified') : null]));
  wrap.appendChild(el('div', { class: 'sub' }, `${state.user.role} · ${d.listings.length} listing(s) · ${d.followerCount} follower(s) · ${state.user.points} pts · ${state.access?.platinum ? 'Platinum' : state.access?.pro ? 'Pro' : state.access?.trial ? 'Trial' : 'Free'}`));

  wrap.appendChild(el('div', { class: 'statgrid' }, [
    stat(cents(w.balance), 'Wallet'), stat(state.user.unlockCredits, 'Unlocks'), stat(d.listings.length, 'Listings')
  ]));

  const nav = el('div', { class: 'card' });
  [['Wallet & payouts', () => go('wallet')], ['Offers', () => go('offers')], ['Orders', () => go('orders')],
   ['Saved properties', () => go('saved')], ['Buy box', () => go('buybox')],
   ['Investor workspace' + (state.access?.platinum ? '' : ' 🔒'), () => go('workspace')],
   ['Plans & billing', () => go('upgrade')],
   ...(state.user.role === 'admin' ? [
     ['Admin — verify deals', () => go('admin')],
     ['Admin — suppliers', () => go('suppliers')],
     ['Admin — fulfilment queue', () => go('fulfilment')],
     ['Admin — reports', () => go('reports')]
   ] : [])]
    .forEach(([t, fn]) => nav.appendChild(el('div', { class: 'listrow' }, [
      el('div', { class: 'grow' }, el('div', { class: 't' }, t)),
      el('button', { onclick: fn }, 'Open')
    ])));
  wrap.appendChild(nav);

  // referral
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Refer a friend'));
  wrap.appendChild(el('div', { class: 'card', style: 'padding:16px' }, [
    el('div', { class: 'dnotes' }, `Share your code — you both get ${cents(state.pricing.referralBonus)} in wallet credit when they make their first purchase.`),
    el('div', { style: "font-family:'Bricolage Grotesque',sans-serif;font-size:28px;font-weight:700;margin-top:10px;letter-spacing:.08em" }, state.user.referralCode)
  ]));

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
          el('div', { class: 's' }, l.city + ' · ' + money(l.asking) + (boosted ? ' · promoted' : ''))
        ]),
        el('button', { onclick: () => go('analytics', { detailId: l.id }) }, 'Stats'),
        el('button', { onclick: () => go('promote', { detailId: l.id }) }, 'Promote')
      ]));
    });
    wrap.appendChild(card);
  }
  return wrap;
}

async function renderProfile() {
  const { owner, listings, followerCount, reviews } = await api('GET', '/api/users/' + state.profileId);
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('button', { class: 'backbtn', onclick: () => go('feed') }, '← Back'));
  wrap.appendChild(el('h2', {}, [owner.name, owner.verified ? el('span', { class: 'vbadge' }, '✓ Verified') : null]));
  const avg = reviews?.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;
  wrap.appendChild(el('div', { class: 'sub' }, `${owner.role} · ${listings.length} listing(s) · ${followerCount} follower(s)` + (avg ? ` · ★ ${avg} (${reviews.length})` : '')));
  if (owner.bio) wrap.appendChild(el('p', { class: 'dnotes' }, owner.bio));

  if (state.user && state.user.id !== owner.id) {
    const fb = el('button', { class: 'btn-ghost' }, 'Follow');
    api('GET', '/api/follow/status/' + owner.id).then(({ following }) => fb.textContent = following ? 'Following' : 'Follow').catch(() => {});
    fb.onclick = async () => { const { following } = await api('POST', '/api/follow', { userId: owner.id }); fb.textContent = following ? 'Following' : 'Follow'; };
    wrap.appendChild(fb);
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
function renderBuyBox() {
  const boxes = state.user.buyBoxes || (state.user.buyBox ? [state.user.buyBox] : [{ minPrice: 0, maxPrice: 2000000, cities: [], propertyTypes: [], minSpread: 0, active: true }]);
  if (state.buyBoxIndex === undefined || state.buyBoxIndex >= boxes.length) state.buyBoxIndex = 0;
  const idx = state.buyBoxIndex;
  const bb = boxes[idx] || {};
  const maxBoxes = state.access?.platinum ? 5 : 1;

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
      wrap.appendChild(el('div', { class: 'hint', style: 'margin-bottom:14px' }, 'Free and Pro get one buy box. Platinum runs up to 5 at once.'));
    }
  }

  const label = el('input', { placeholder: 'e.g. Flips under 200k', value: bb.label || '' });
  const minPrice = el('input', { type: 'number', value: bb.minPrice ?? 0 });
  const maxPrice = el('input', { type: 'number', value: bb.maxPrice ?? 2000000 });
  const cities = el('input', { placeholder: 'Austin, San Antonio', value: (bb.cities || []).join(', ') });
  const minSpread = el('input', { type: 'number', value: bb.minSpread ?? 0 });
  const typeWrap = el('div', { class: 'card', style: 'margin-top:8px' });
  const sel = new Set(bb.propertyTypes || []);
  ['Single family','Multi-family','Condo','Townhouse','Land','Mobile home','Commercial'].forEach(t => {
    const sw = el('button', { class: 'switch' + (sel.has(t) ? ' on' : '') }, el('div', { class: 'knob' }));
    sw.onclick = () => { sel.has(t) ? (sel.delete(t), sw.classList.remove('on')) : (sel.add(t), sw.classList.add('on')); };
    typeWrap.appendChild(el('div', { class: 'togglerow' }, [el('div', { class: 'grow' }, el('div', { class: 'tl' }, t)), sw]));
  });
  if (boxes.length > 1) { wrap.appendChild(el('label', {}, 'Name this buy box')); wrap.appendChild(label); }
  wrap.appendChild(twoUp('Min price ($)', minPrice, 'Max price ($)', maxPrice));
  wrap.appendChild(el('label', {}, 'Markets (comma separated)')); wrap.appendChild(cities);
  wrap.appendChild(el('label', {}, 'Minimum spread ($)')); wrap.appendChild(minSpread);
  wrap.appendChild(el('label', {}, 'Property types')); wrap.appendChild(typeWrap);
  const st = el('div', { class: 'okmsg' });
  const btnRow = el('div', { class: 'row2' });
  const save = el('button', { class: 'submitbtn' }, 'Save buy box');
  save.onclick = async () => {
    try {
      const { buyBoxes } = await api('PATCH', '/api/me/buybox', {
        index: idx, label: label.value, minPrice: minPrice.value, maxPrice: maxPrice.value, cities: cities.value,
        minSpread: minSpread.value, propertyTypes: [...sel], active: true
      });
      state.user.buyBoxes = buyBoxes; st.textContent = 'Saved — feed re-ranked.';
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
  return wrap;
}

function renderSettings() {
  const wrap = el('div', { class: 'page' });
  wrap.appendChild(el('h2', {}, 'Settings'));
  wrap.appendChild(el('div', { class: 'sectiontitle' }, 'Profile'));
  const pbox = el('div', { class: 'card', style: 'padding:16px' });
  const nameI = el('input', { value: state.user.name });
  const bioI = el('textarea', {}); bioI.value = state.user.bio || '';
  const phoneI = el('input', { value: state.user.phone || '' });
  const avFile = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  let avData = null;
  const avPrev = el('div', { class: 'picker', onclick: () => avFile.click() }, state.user.avatarUrl ? 'Change profile photo' : 'Add a profile photo');
  avFile.onchange = async () => { if (avFile.files[0]) { avData = await downscale(avFile.files[0], 400); avPrev.textContent = 'Photo ready — save to apply'; } };
  pbox.appendChild(el('label', {}, 'Display name')); pbox.appendChild(nameI);
  pbox.appendChild(el('label', {}, 'Phone (shown after unlock)')); pbox.appendChild(phoneI);
  pbox.appendChild(el('label', {}, 'Bio')); pbox.appendChild(bioI);
  pbox.appendChild(el('label', {}, 'Profile photo')); pbox.appendChild(avPrev); pbox.appendChild(avFile);
  const pst = el('div', { class: 'okmsg' });
  pbox.appendChild(el('button', { class: 'submitbtn', onclick: async () => {
    try { const { user } = await api('PATCH', '/api/me', { name: nameI.value, bio: bioI.value, phone: phoneI.value, avatarData: avData }); state.user = user; pst.textContent = 'Saved.'; }
    catch (e) { pst.className = 'errmsg'; pst.textContent = e.message; }
  } }, 'Save profile'));
  pbox.appendChild(pst);
  wrap.appendChild(pbox);

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
  sbox.appendChild(toggleRow('Alert me on new messages', '', s.notifyOnMessage !== false, async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { notifyOnMessage: on }); state.user.settings = settings;
  }));
  sbox.appendChild(toggleRow('Alert me on buy box matches', 'When a new listing fits your criteria.', s.notifyOnMatch !== false, async on => {
    const { settings } = await api('PATCH', '/api/me/settings', { notifyOnMatch: on }); state.user.settings = settings;
  }));
  wrap.appendChild(sbox);

  wrap.appendChild(el('button', { class: 'btn-ghost', style: 'width:100%;margin-top:20px', onclick: async () => {
    await api('POST', '/api/logout'); state.user = null; go('home');
  } }, 'Log out'));
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
  wrap.appendChild(el('h2', {}, 'Leaderboard'));
  wrap.appendChild(el('div', { class: 'sub' }, 'Points come only from deals an admin verified as closed — not self-reported.'));
  const { leaderboard } = await api('GET', '/api/leaderboard');
  const card = el('div', { class: 'card' });
  if (!leaderboard.length) card.appendChild(el('div', { class: 'lbrow' }, el('div', {}, 'No verified deals yet.')));
  leaderboard.forEach((r, i) => card.appendChild(el('div', { class: 'lbrow' }, [
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
  return staticPage('Terms of Service', 'Last updated ' + new Date().toLocaleDateString() + '. Plain-English summary, not a substitute for legal review.', [
    [null, 'By creating an account you agree to these terms. If you do not agree, do not use the site.'],
    ['1. What this service is', 'Better Real Estate is an online platform where users post property listings and items for sale, and communicate with each other. We are not a real estate brokerage, agent, escrow holder, lender, or party to any transaction between users. We do not verify property ownership, condition, title, valuation, or any statement a user makes.'],
    ['2. Your account', 'You must be 18 or older and provide accurate information. You are responsible for everything that happens under your account and for keeping your password secure. One account per person.'],
    ['3. What you may not post', 'Do not post property you have no legal right to sell or market. Do not post false, misleading, or fabricated listings. Do not post items you do not have. Do not harass other users, scrape the site, or attempt to circumvent payment. We remove content and terminate accounts for any of the above, without refund.'],
    ['3a. No electronics or appliances', 'Users may not list any item that runs on mains power or a battery. This includes but is not limited to appliances, HVAC equipment, water heaters, power tools, light fixtures, lamps, bulbs, wiring, breakers, outlets, switches, smart-home devices, alarms, detectors, generators, batteries and consumer electronics. This is not a formality: electrical goods sold in the United States require a UL or ETL listing, we have no way to verify certification on a private listing, and an uncertified item that causes a fire or shock injury exposes both the seller and this platform. Listings that appear to be electrical are rejected automatically and accounts that repeatedly attempt to evade this are terminated. Any electrical goods offered in the Better Real Estate shop are supplied by Better Real Estate from vendors who have provided certification documents in writing.'],
    ['4. Transactions between users', 'Any deal you reach with another user is strictly between you and them. We do not guarantee that a listed property exists, is available, is priced accurately, or that any user will perform. You are solely responsible for your own due diligence, contracts, inspections, title work, and compliance with the laws of your jurisdiction.'],
    ['5. Payments, subscriptions, and promotions', 'Promotions, unlocks, verification, and subscription fees are charged when purchased. Promotions run for the stated window and are non-refundable once they begin. Subscriptions renew until cancelled and can be cancelled anytime, effective at the end of the current period. Marketplace sales are subject to the platform fee stated at listing.'],
    ['6. Wallet and payouts', 'Wallet balances are a record of amounts owed to you from platform activity. They are not a bank deposit, are not insured, and earn no interest. Payouts are sent to the account you connect, subject to the stated minimum and to identity verification where required by law.'],
    ['7. No warranty', 'The service is provided as-is. We do not promise it will be uninterrupted, error-free, or that any listing or user is legitimate.'],
    ['8. Limitation of liability', 'To the maximum extent the law allows, our total liability to you for any claim relating to the service is limited to the amount you paid us in the twelve months before the claim arose.'],
    ['9. Changes and termination', 'We may update these terms; continued use after an update means you accept it. We may suspend or terminate accounts that violate these terms.'],
    ['10. Contact', 'Questions about these terms: drewcbusiness1@gmail.com'],
    ['A necessary note', 'This document is a working template written for a small platform. Before you take real payments from real users, have a lawyer in your state review it alongside your privacy policy. Taking a cut of marketplace sales and holding user balances can trigger money-transmission and payment-facilitator rules that vary considerably by state.']
  ]);
}

function pagePrivacy() {
  return staticPage('Privacy Policy', 'Last updated ' + new Date().toLocaleDateString() + '.', [
    [null, 'This explains what we collect, why, and what you can do about it.'],
    ['What we collect', 'Account information you give us: name, email address, phone number if you add one, profile photo and bio. Content you post: listings including property addresses, photos, notes, and marketplace items. Activity: what you view, save, unlock, and offer on, and messages you send through the site. Payment information: the brand, last four digits and expiry of a card, plus a token from our payment processor. We never receive or store your full card number.'],
    ['Why we collect it', 'To run your account, rank your feed against your buy box, connect buyers and sellers, process payments and payouts, prevent fraud and abuse, and send you transactional email such as confirmations and password resets.'],
    ['What other users can see', 'Your name, role, bio, profile photo, listing count, follower count, points, verification status and reviews are public. Your email address and phone number are shown to a user only after they unlock one of your listings, or if you message them. Exact property addresses are hidden from users who have not unlocked that listing.'],
    ['Who we share it with', 'Our payment processor, to take payments and send payouts. Our email provider, to deliver transactional messages. Hosting and storage providers that run the site. Law enforcement where we are legally required. We do not sell your personal information.'],
    ['Cookies', 'We use a single session cookie to keep you signed in. We do not run third-party advertising trackers.'],
    ['Your choices', 'Edit or remove your profile information and listings at any time from Settings. Turn off non-essential notifications in Settings. To request a copy of your data or deletion of your account, email drewcbusiness1@gmail.com. Depending on where you live you may have additional rights under laws such as the GDPR or CCPA — write to the same address and we will honour them.'],
    ['Retention and security', 'We keep account and transaction records while your account is open and for as long as tax and anti-fraud rules require afterwards. Passwords are stored as bcrypt hashes and never in readable form. No system is perfectly secure; do not post information you could not tolerate becoming public.'],
    ['Children', 'This service is not for anyone under 18 and we do not knowingly collect their information.'],
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
  const email = el('input', { type: 'email', placeholder: 'you@email.com' });
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
    el('div', {}, ['Confirm your email to post listings. Check your inbox for the link. ', st]),
    el('button', {
      style: 'background:var(--clay)',
      onclick: async () => {
        try { const r = await api('POST', '/api/resend-verification'); st.textContent = r.mailConfigured ? 'Sent.' : 'Sent — check the server console (no SMTP configured yet).'; }
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
    const status = await api('GET', '/api/admin/cj/status');
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

          const photos = [...new Set([v.image, product.image, ...(product.images || [])].filter(Boolean))].slice(0, 6);
          const photoRow = el('div', { class: 'previewrow', style: 'margin:8px 0 14px' });
          photos.forEach(src => photoRow.appendChild(el('div', { class: 'pv' }, el('img', { src }))));

          const costCents = Math.round(v.price * 100);
          const profitCents = Math.max(0, v.autoRetailCents - costCents);
          const details = el('div', { class: 'policybox', style: 'margin-bottom:12px' }, [
            el('b', {}, 'Auto-filled from CJ'),
            el('div', {}, `CJ cost: ${cents(costCents)} · Suggested retail: ${cents(v.autoRetailCents)} · Gross product spread: ${cents(profitCents)}`),
            el('div', {}, `SKU: ${v.sku || '—'} · Stock: ${v.stock.toLocaleString()} · Ships from: ${v.fromCountryCode || 'CJ warehouse'}`),
            el('div', {}, `${v.weight ? `Weight: ${v.weight} g` : 'Weight unavailable'}${v.lengthMm && v.widthMm && v.heightMm ? ` · Dimensions: ${v.lengthMm} × ${v.widthMm} × ${v.heightMm} mm` : ''}`),
            el('div', { class: 'hint', style: 'margin-top:6px' }, 'Shipping is still quoted live from CJ at customer checkout. It is not included in this retail price.')
          ]);

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
                description: desc.value.trim()
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
          if (photos.length) { results.appendChild(el('label', {}, 'Photos from CJ')); results.appendChild(photoRow); }
          results.appendChild(el('label', {}, 'Title')); results.appendChild(title);
          results.appendChild(el('div', { style: 'display:grid;grid-template-columns:1fr 1fr;gap:10px' }, [
            el('div', {}, [el('label', {}, 'Marketplace category'), categorySel]),
            el('div', {}, [el('label', {}, 'Retail price ($)'), retail])
          ]));
          results.appendChild(el('label', {}, 'Description')); results.appendChild(desc);
          results.appendChild(publish);
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
            } }, '⚡ Create on CJ')
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
  wrap.appendChild(el('h2', {}, '⚡ Boost a listing'));
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
      el('button', { class: boosted ? '' : 'btn-primary', style: boosted ? '' : 'border:none', onclick: () => go('promote', { detailId: l.id }) }, boosted ? 'Extend' : '⚡ Boost')
    ]));
  });
  wrap.appendChild(box);
  return wrap;
}

/* ================= INVESTOR WORKSPACE (Platinum) ================= */
async function renderWorkspace() {
  const wrap = el('div', { class: 'page' });
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
