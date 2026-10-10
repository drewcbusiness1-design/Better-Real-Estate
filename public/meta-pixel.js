/* Meta PageView: public marketing routes only, with a Settings opt-out. */
(function(w,d){
 'use strict';
 const ID='1783797429493375',KEY='bre-ad-measurement-v1';
 let context={view:'',signedIn:true},loaded=false,last=null;
 function choice(){try{return w.localStorage.getItem(KEY)==='decline'?'decline':'allow';}catch{return 'allow';}}
 function blocked(){return w.navigator.globalPrivacyControl===true||w.navigator.doNotTrack==='1';}
 function eligible(){
  if(context.signedIn||!['home','about','faq','upgrade','affiliate'].includes(context.view)||w.location.pathname!=='/')return false;
  const q=new URLSearchParams(w.location.search);for(const [k,v]of q){if(k==='view'&&v===context.view)continue;if(k==='fbclid'&&/^[A-Za-z0-9_-]{1,512}$/.test(v))continue;return false;}return true;
 }
 function pause(){if(w.fbq)w.fbq('consent','revoke');last=null;}
 function track(){if(blocked()||choice()!=='allow'||!eligible()){pause();return;}
  if(!loaded){
   // The supplied Meta bootstrap; optional auto-events and advanced matching are off.
   !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
   w.fbq('consent','revoke');w.fbq('set','autoConfig',false,ID);w.fbq('init',ID);loaded=true;
  }
  w.fbq('consent','grant');const key=w.location.href;if(last!==key){w.fbq('trackSingle',ID,'PageView');last=key;}
 }
 w.BetterPixel={update(next){context=next;if(next.adMeasurement===false){try{w.localStorage.setItem(KEY,'decline');}catch{}}track();},pause,disable(){try{w.localStorage.setItem(KEY,'decline');}catch{}pause();},enable(){try{w.localStorage.removeItem(KEY);}catch{}track();},disabled(){return blocked()||choice()==='decline';}};
 w.addEventListener('storage',e=>{if(e.key===KEY){track();}});
})(window,document);
