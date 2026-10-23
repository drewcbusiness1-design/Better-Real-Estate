/* Company email is drafted by partners; only admins review and dispatch it. */
function outreachEmailPanel(isAdmin=false,expanded=false){
 const panel=el('details',{class:'outreach-email-panel card','data-tour':'outreach'}),body=el('div',{class:'service-form'}),output=el('div',{class:'service-form'}),create=el('div',{class:'service-form'});
 panel.append(el('summary',{},isAdmin?'Partner email approvals':'Outreach email'),body);
 body.append(el('p',{class:'hint'},'Send from partners@betterrealestate.org. Save a draft or submit for review. Admin approval sends the reviewed email automatically.'));
 if(!isAdmin)body.append(create);body.append(outreachInboxPanel(isAdmin));
 const log=el('details',{class:'card outreach-history','data-tour':'outreach-history'});log.append(el('summary',{},isAdmin?'Approval queue and sent emails':'Drafts, submissions and sent emails'),output);body.append(log);
 let loaded=false,page=1,ticket=0;const filter=el('select',{'aria-label':'Email log filter'},[['all','All emails'],['awaiting','Awaiting approval'],['draft','Drafts'],['sent','Sent'],['uncertain','Sending unconfirmed']].map(([v,t])=>el('option',{value:v},t)));filter.value=isAdmin?'awaiting':'all';filter.onchange=()=>{page=1;load();};const filterLabel=el('label',{},['Show',filter]);if(log.insertBefore)log.insertBefore(filterLabel,output);else log.append(filterLabel);
 if(isAdmin){body.append(outreachAlertsPanel());const stop=el('details',{class:'card'}),f=el('div',{class:'service-form'});stop.append(el('summary',{},'Stop outreach to a recipient'),f);const to=serviceField(f,'Email to suppress','','email');f.append(serviceAction('Block partner outreach',async()=>{if(!confirm('Stop all partner outreach to '+to.value+'?'))return;await api('POST','/api/outreach/suppress',{to:to.value});toast('Recipient suppressed','ok');await load();}));body.append(stop);}
 async function load(){const current=++ticket;output.replaceChildren(el('p',{role:'status'},'Loading emails…'));try{
  const data=await api('GET','/api/outreach?page='+page+'&status='+filter.value);if(current!==ticket)return;loaded=true;
  output.replaceChildren(serviceAction('Refresh email log',load));
  if(!data.sendingReady)output.append(outreachSetupNotice(data,isAdmin));
  if(!isAdmin){create.replaceChildren();if(data.contexts.length)create.append(outreachComposer(data.contexts,load));else create.append(el('p',{},'Confirm your email and ask the admin to link an active campaign before creating outreach.'));}
  if(!data.drafts.length)output.append(el('p',{},'No emails in this view.'));for(const d of data.drafts)output.append(outreachDraftCard(d,isAdmin,load));
  const prev=serviceAction('Previous emails',async()=>{page--;await load();}),next=serviceAction('Next emails',async()=>{page++;await load();});prev.disabled=data.page<=1;next.disabled=data.page>=data.totalPages;output.append(el('div',{class:'service-actions'},[prev,el('span',{},'Page '+data.page+' of '+data.totalPages+' · '+data.total+' emails'),next]));
 }catch(e){if(current===ticket)output.replaceChildren(el('p',{class:'errmsg'},e.message),serviceAction('Retry email log',load));}}
 panel.addEventListener('toggle',()=>{if(panel.open&&!loaded)load();});if(expanded){panel.open=true;log.open=isAdmin;load();}return panel;
}
function outreachSetupNotice(data,isAdmin){return el('p',{class:'hint'},isAdmin?'Email sending is not ready. You can review submissions while setup is completed.':'You can save drafts and submit for approval. Email sending will be available after setup is completed.');}
function outreachAlertsPanel(){const panel=el('details',{class:'card'}),body=el('div',{class:'service-form'});panel.append(el('summary',{},'Submission notifications'),body);
 async function load(){try{const data=await api('GET','/api/outreach/alerts');body.replaceChildren(serviceAction('Refresh notifications',load),serviceAction('Retry pending notification emails',async()=>{await api('POST','/api/outreach/alerts/retry',{});await load();}));for(const a of data.alerts)body.append(el('p',{},a.body+' · '+new Date(a.at).toLocaleString()+' · Email: '+a.emailStatus));if(!data.alerts.length)body.append(el('p',{},'No submission notifications yet.'));await api('POST','/api/outreach/alerts/read',{});if(typeof refreshUnread==='function')await refreshUnread();}catch(e){body.replaceChildren(el('p',{class:'errmsg'},e.message));}}
 panel.addEventListener('toggle',()=>{if(panel.open)load();});return panel;
}
function outreachFields(form,d={}){
 const to=serviceField(form,'Recipient email',d.to||'','email'),source=serviceField(form,'Public lead source — website or professional profile link',d.source||'','url'),subject=serviceField(form,'Email subject',d.subject||''),body=serviceField(form,'Personalized email message',d.body||'','textarea');to.maxLength=254;source.maxLength=1000;subject.maxLength=160;body.maxLength=6000;body.rows=9;
 source.setAttribute?.('data-tour','outreach-source');source.placeholder='https://example.com/team/contact-name';form.append(el('p',{class:'hint'},'The public lead source is a clickable link to the page where you found this person or business, such as their business website, team page or public professional profile. Paste the page URL here. Enter their email separately above. This is not your affiliate signup link.'));
 form.append(el('p',{class:'hint'},'Lead with free signup. Use a public business or professional contact route. The assigned referral link, your partner signature, company postal address and unsubscribe link are added automatically and appear in Preview. No attachments, CC or BCC.'));
 return ()=>({to:to.value,source:source.value,subject:subject.value,body:body.value});
}
function outreachComposer(contexts,reload){
 const box=el('details',{class:'card outreach-compose','data-tour':'outreach-compose'}),form=el('div',{class:'service-form'});box.append(el('summary',{},'Create an email draft'),form);
 const context=el('select',{'aria-label':'Outreach campaign or affiliate program'},[el('option',{value:''},'Choose campaign / program'),...contexts.map(c=>el('option',{value:c.id},c.name))]);form.append(el('label',{},['Attribution',context]));
 if(contexts.length===1)context.value=contexts[0].id;
 const fields=outreachFields(form);async function save(action){if(!context.value)throw Error('Choose the campaign or affiliate program for this draft.');await api('POST','/api/outreach',{contextId:context.value,...fields(),action});toast(action==='submit'?'Submitted for admin approval':'Draft saved; no email sent','ok');await reload();}
 form.append(el('div',{class:'service-actions','data-tour':'outreach-submit'},[serviceAction('Save email draft',()=>save('draft')),serviceAction('Submit for approval',()=>save('submit'),true)]));return box;
}
function outreachDraftCard(d,isAdmin,reload){
 const box=el('details',{class:'card'}),w=el('div',{class:'service-form'});box.append(el('summary',{},d.subject+' · '+(d.status==='sent'?'Sent - provider accepted':d.status)),w);
 w.append(el('p',{},'To: '+d.to+' · Partner: '+d.authorName+' · Version '+d.revision),el('p',{class:'hint'},'Attribution: '+(d.contextName||(d.contextId==='standard'?'Standard affiliate program':'Assigned campaign'))),el('a',{href:d.source,target:'_blank',rel:'noopener noreferrer'},'Open professional lead source'));
 if(d.feedback)w.append(el('p',{},'Review feedback: '+d.feedback));if(d.error)w.append(el('p',{class:'errmsg'},d.error));
 if(d.sentAt)w.append(el('p',{},'Provider accepted '+new Date(d.sentAt).toLocaleString()+' · Reference '+d.providerId+' · This is not confirmed inbox delivery.'));
 if(d.firstAttemptAt){const thread=el('div',{class:'service-form'});w.append(serviceAction('View email conversation',async()=>{const r=await api('GET','/api/outreach/'+d.id+'/thread');thread.replaceChildren();if(r.outbound)thread.append(el('h4',{},'Original outreach'),el('pre',{class:'outreach-preview'},r.outbound.text));for(const reply of r.replies)thread.append(outreachReplyCard(reply,isAdmin));if(!r.replies.length)thread.append(el('p',{},'No replies received in the platform yet.'));}),thread);}
 const preview=el('div',{class:'service-form'});let previewHash=null;
 w.append(serviceAction('Preview complete email',async()=>{const r=await api('GET','/api/outreach/'+d.id+'/preview');previewHash=r.previewHash;preview.replaceChildren(el('p',{},'From: '+r.preview.from+' · Reply-to: '+r.preview.replyTo),el('p',{},'Subject: '+r.preview.subject),el('pre',{class:'outreach-preview'},r.preview.text));}),preview);
 if(!['sent','sending','uncertain'].includes(d.status)){
  const edit=el('details'),f=el('div',{class:'service-form'});edit.append(el('summary',{},'Edit draft - clears approval'),f);const fields=outreachFields(f,d);async function saveEdit(action){await api('POST','/api/outreach/'+d.id+'/edit',{...fields(),expectedRevision:d.revision,action});toast(action==='submit'?'Submitted for admin approval':'Draft saved','ok');await reload();}f.append(el('div',{class:'service-actions'},[serviceAction('Save edited draft',()=>saveEdit('draft')),serviceAction('Submit edited email for approval',()=>saveEdit('submit'),true)]));w.append(edit);
 }
 if(!isAdmin&&['draft','rejected'].includes(d.status))w.append(serviceAction('Submit for admin review',async()=>{await api('POST','/api/outreach/'+d.id+'/submit',{expectedRevision:d.revision});toast('Submitted; waiting for review','ok');await reload();},true));
 if(isAdmin&&['submitted','approved'].includes(d.status)){
  w.append(serviceAction('Approve & send',async()=>{if(!previewHash)throw Error('Open Preview complete email and review it first.');try{const r=await api('POST','/api/outreach/'+d.id+'/approve-send',{expectedRevision:d.revision,previewHash});toast(r.alreadySent?'Already sent; no duplicate email':'Email sent — provider accepted','ok');}finally{await reload();}},true));
  const feedback=serviceField(w,'Changes requested / rejection reason','','textarea');feedback.maxLength=500;w.append(serviceAction('Request changes',async()=>{await api('POST','/api/outreach/'+d.id+'/review',{approved:false,feedback:feedback.value,expectedRevision:d.revision});await reload();}));
 }
 if(isAdmin&&['uncertain','sending'].includes(d.status))w.append(serviceAction(d.status==='approved'?'Send approved email':'Retry same approved email',async()=>{if(!confirm('Send the exact approved message to '+d.to+' with subject "'+d.subject+'"? Replies will appear in the platform inbox for you and this email’s sender once receiving is configured.'))return;await api('POST','/api/outreach/'+d.id+'/send',{expectedRevision:d.revision});await reload();},true));
 return box;
}

function outreachReplyCard(r,isAdmin){
 const card=el('article',{class:'card service-form'});card.append(el('h4',{},r.subject||'(No subject)'),el('p',{},'From: '+r.from+' · Received '+new Date(r.at).toLocaleString()));
 if(isAdmin)card.append(el('p',{class:'hint'},'Original sender: '+(r.authorName||r.authorId||'Unmatched')));
 if(r.quarantined)card.append(el('p',{class:'errmsg'},'Admin review only: '+r.reason));
 card.append(el('pre',{class:'outreach-preview'},r.text||'(No text content)'));
 if(r.attachments?.length)card.append(el('p',{class:'hint'},'Attachments listed only: '+r.attachments.map(a=>a.filename+' ('+Math.ceil(a.size/1024)+' KB)').join(', ')+'. Open the provider inbox to inspect attachments.'));
 return card;
}
function outreachInboxPanel(isAdmin){
 const panel=el('details',{class:'card outreach-inbox','data-tour':'outreach-inbox'}),body=el('div',{class:'service-form'});panel.append(el('summary',{},'Reply inbox'),body);let page=1;
 async function load(){body.replaceChildren(el('p',{},'Loading replies…'));try{const r=await api('GET','/api/outreach/inbox?page='+page);body.replaceChildren(serviceAction('Refresh reply inbox',load),el('p',{class:'hint'},isAdmin?'All partners’ received replies appear here. Flagged replies are visible only to admins.':'Only replies to emails you sent appear here. New outbound messages and follow-ups still require admin approval.'));
 if(!r.configured)body.append(el('p',{class:'hint'},'Your reply inbox is not available yet.'));
 for(const reply of r.replies)body.append(outreachReplyCard(reply,isAdmin));if(!r.replies.length)body.append(el('p',{},'No replies received in the platform yet.'));
 const prev=serviceAction('Previous replies',async()=>{page--;await load();}),next=serviceAction('Next replies',async()=>{page++;await load();});prev.disabled=page<=1;next.disabled=page>=r.totalPages;body.append(el('div',{class:'service-actions'},[prev,el('span',{},'Page '+page+' of '+r.totalPages),next]));
 }catch(e){body.replaceChildren(el('p',{class:'errmsg'},e.message));}}
 body.append(serviceAction('Refresh reply inbox',load));panel.addEventListener('toggle',()=>{if(panel.open)load();});return panel;
}
