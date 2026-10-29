/* First-party cookie choices. Advertising remains off until explicitly allowed. */
(function(w,d){
 'use strict';
 const KEY='bre-ad-measurement-v1',DATE='bre-cookie-choice-date-v1';
 let priorFocus=null, priorOverflow='';
 const native=/BetterRealEstate-iOS\//i.test(w.navigator.userAgent||'');
 function saved(){try{const date=Number(w.localStorage.getItem(DATE));return date>0&&Date.now()-date<180*86400000&&['allow','decline'].includes(w.localStorage.getItem(KEY));}catch{return false;}}
 function choose(allow){
  const hadPixel=!!w.fbq;
  if(allow&&!native)w.BetterPixel?.enable();else w.BetterPixel?.disable();
  try{w.localStorage.setItem(DATE,String(Date.now()));}catch{}
  const panel=d.getElementById('better-cookie-notice');
  if(panel){panel.close();panel.remove();d.documentElement.style.overflow=priorOverflow;if(priorFocus?.isConnected)priorFocus.focus();}
  if(!allow&&hadPixel)w.location.reload();
 }
 function show(){
  if(d.getElementById('better-cookie-notice'))return;
  priorFocus=d.activeElement;priorOverflow=d.documentElement.style.overflow;
  const panel=d.createElement('dialog');panel.id='better-cookie-notice';panel.className='better-cookie-notice';panel.setAttribute('aria-labelledby','better-cookie-title');panel.setAttribute('aria-describedby','better-cookie-description');panel.addEventListener('cancel',e=>e.preventDefault());
  const title=d.createElement('h2');title.id='better-cookie-title';title.textContent='Cookies & device storage';
  const copy=d.createElement('p');copy.id='better-cookie-description';copy.textContent=native?'Better uses cookies and device storage for sign-in, preferences and app tools. Advertising measurement is disabled inside the iPhone app.':'Better uses cookies and device storage for sign-in and preferences. If you allow advertising measurement, Meta receives limited public-page visit and device information. You can use Better with essential storage only and change your choice anytime.';
  const actions=d.createElement('div');actions.className='better-cookie-actions';
  function button(label,fn){const b=d.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',fn);actions.appendChild(b);}
  button(native?'Continue with essential storage':'Essential only',()=>choose(false));
  if(!native)button('Allow advertising measurement',()=>choose(true));
  const privacy=d.createElement('a');privacy.href='/?view=privacy';privacy.textContent='Privacy policy';privacy.target='_blank';privacy.rel='noopener noreferrer';actions.appendChild(privacy);
  panel.append(title,copy,actions);
  d.body.appendChild(panel);panel.showModal();d.documentElement.style.overflow='hidden';panel.querySelector('button')?.focus();
 }
 const footer=d.getElementById('sitefooter')||d.body;
 const link=d.createElement('button');link.type='button';link.className='better-cookie-settings';link.textContent='Cookie settings';link.addEventListener('click',()=>{show();d.getElementById('better-cookie-notice')?.scrollIntoView?.({block:'nearest'});});footer.appendChild(link);
 w.BetterCookieNotice={show};
 const legalPage=['privacy','terms'].includes(new URLSearchParams(w.location.search).get('view'));
 if(!saved()&&!legalPage)show();
})(window,document);
