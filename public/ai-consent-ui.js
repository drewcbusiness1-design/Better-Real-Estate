(function(w,d){
 'use strict';
 let pending=null;
 function ask(){if(pending)return pending;pending=new Promise(resolve=>{
  const panel=d.createElement('dialog');panel.className='better-cookie-notice';panel.setAttribute('aria-labelledby','better-ai-title');
  const title=d.createElement('h2');title.id='better-ai-title';title.textContent='Allow sharing with OpenAI?';
  const copy=d.createElement('p');copy.textContent='AI tools send the content needed for your request to OpenAI: property addresses and research facts, listing/import text and selected photos, or recent support messages. Property research may also send the requested address to configured MLS, Regrid and property-data sources. OpenAI processes that content to provide results. Do not include passwords, payment details or information you lack permission to share. This is optional. You can withdraw permission below; non-AI tools and human support remain available.';
  const actions=d.createElement('div');actions.className='better-cookie-actions';
  function finish(value){panel.close();panel.remove();pending=null;resolve(value);}
  for(const [label,value]of [['Not now',false],['Allow OpenAI sharing',true]]){const b=d.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>finish(value);actions.append(b);}
  const link=d.createElement('a');link.href='/?view=privacy';link.target='_blank';link.rel='noopener noreferrer';link.textContent='Privacy policy';actions.append(link);
  panel.addEventListener('cancel',e=>{e.preventDefault();finish(false)});panel.append(title,copy,actions);d.body.append(panel);panel.showModal();
 });return pending;}
 async function set(allow){const response=await fetch('/api/me/ai-consent',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:'2026-10-28-v1',allow})});if(!response.ok)throw new Error('Could not save AI sharing preference.');return response.json();}
 w.BetterAIConsent={async request(){if(!await ask())throw new Error('AI sharing was not allowed. You can use non-AI tools or request human support.');await set(true);}};
 const button=d.createElement('button');button.type='button';button.className='better-cookie-settings';button.textContent='Turn off AI sharing';button.onclick=async()=>{try{await set(false);button.textContent='AI sharing is off';}catch(e){button.textContent='Sign in to manage AI sharing';}};(d.getElementById('sitefooter')||d.body).append(button);
})(window,document);
