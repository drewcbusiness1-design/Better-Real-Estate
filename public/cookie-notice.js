/* First-party cookie choices. Advertising remains off until explicitly allowed. */
(function(w,d){
 'use strict';
 const KEY='bre-ad-measurement-v1',DATE='bre-cookie-choice-date-v1';
 const native=/BetterRealEstate-iOS\//i.test(w.navigator.userAgent||'');
 function saved(){try{const date=Number(w.localStorage.getItem(DATE));return date>0&&Date.now()-date<180*86400000&&['allow','decline'].includes(w.localStorage.getItem(KEY));}catch{return false;}}
 function choose(allow){
  const hadPixel=!!w.fbq;
  if(allow&&!native)w.BetterPixel?.enable();else w.BetterPixel?.disable();
  try{w.localStorage.setItem(DATE,String(Date.now()));}catch{}
  d.getElementById('better-cookie-notice')?.remove();
  if(!allow&&hadPixel)w.location.reload();
 }
 function show(){
  if(d.getElementById('better-cookie-notice'))return;
  const panel=d.createElement('section');panel.id='better-cookie-notice';panel.className='better-cookie-notice';panel.setAttribute('aria-labelledby','better-cookie-title');
  const title=d.createElement('h2');title.id='better-cookie-title';title.textContent='Cookies & device storage';
  const copy=d.createElement('p');copy.textContent=native?'Better uses cookies and device storage for sign-in, preferences and app tools. Advertising measurement is disabled inside the iPhone app.':'Better uses cookies and device storage for sign-in and preferences. If you allow advertising measurement, Meta receives limited public-page visit and device information. You can use Better with essential storage only and change your choice anytime.';
  const actions=d.createElement('div');actions.className='better-cookie-actions';
  function button(label,fn){const b=d.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.appendChild(b);}
  button(native?'Continue with essential storage':'Essential only',()=>choose(false));
  if(!native)button('Allow advertising measurement',()=>choose(true));
  const privacy=d.createElement('a');privacy.href='/?view=privacy';privacy.textContent='Privacy policy';actions.appendChild(privacy);
  panel.append(title,copy,actions);
  const main=d.getElementById('app');if(main)main.before(panel);else d.body.appendChild(panel);
 }
 const footer=d.getElementById('sitefooter')||d.body;
 const link=d.createElement('button');link.type='button';link.className='better-cookie-settings';link.textContent='Cookie settings';link.addEventListener('click',()=>{show();d.getElementById('better-cookie-notice')?.scrollIntoView?.({block:'nearest'});});footer.appendChild(link);
 w.BetterCookieNotice={show};
 if(!saved())show();
})(window,document);
