/* Company email is drafted by partners; only admins review and dispatch it. */
function outreachEmailPanel(isAdmin=false,expanded=false){
 const panel=el('details',{class:'outreach-email-panel card'}),body=el('div',{class:'service-form'}),output=el('div',{class:'service-form'});
 panel.append(el('summary',{},isAdmin?'Partner email approvals':'Outreach email drafts'),body);
 body.append(el('p',{},'Company sender: partners@betterrealestate.org. Open Reply inbox below to read responses after receiving is configured. You see replies to emails you sent; the admin sees all replies.'),el('p',{class:'hint'},'Saving, submitting and approving do not send email. Every message needs admin review of its exact recipient and full content, followed by an admin send. Editing removes approval. Follow-ups also require review.'),serviceAction('Refresh outreach queue',load),outreachInboxPanel(isAdmin));
 let loaded=false,page=1,ticket=0;const create=el('div',{class:'service-form'});if(!isAdmin)body.append(create);body.append(output);
 if(isAdmin){const stop=el('details'),f=el('div',{class:'service-form'});stop.append(el('summary',{},'Stop outreach to a recipient'),f);const to=serviceField(f,'Email to suppress','','email');f.append(serviceAction('Block partner outreach',async()=>{if(!confirm('Stop all partner outreach to '+to.value+'?'))return;await api('POST','/api/outreach/suppress',{to:to.value});toast('Recipient suppressed across partner outreach','ok');await load();}));body.append(stop);}
 async function load(){const current=++ticket;output.replaceChildren(el('p',{role:'status'},'Loading outreach…'));try{
  const data=await api('GET','/api/outreach?page='+page);if(current!==ticket)return;loaded=true;
  output.replaceChildren();if(!data.sendingReady)output.append(el('p',{class:'hint'},isAdmin?'Complete company email delivery, postal address, unsubscribe and reply receiving setup before sending. Set OUTREACH_REPLY_DOMAIN and RESEND_WEBHOOK_SECRET; connect the email.received webhook to /api/outreach/webhook. Drafting can continue.':'The admin needs to finish company email setup. You can still save drafts.'));
  if(!isAdmin){create.replaceChildren();if(data.contexts.length)create.append(outreachComposer(data.contexts,load));else create.append(el('p',{},'Link an active campaign or obtain standard affiliate approval before creating outreach drafts.'));}
  if(!data.drafts.length)output.append(el('p',{},'No email drafts yet.'));for(const d of data.drafts)output.append(outreachDraftCard(d,isAdmin,load));
  const prev=serviceAction('Previous email drafts',async()=>{page--;await load();}),next=serviceAction('Next email drafts',async()=>{page++;await load();});prev.disabled=data.page<=1;next.disabled=data.page>=data.totalPages;output.append(el('div',{class:'service-actions'},[prev,el('span',{},'Page '+data.page+' of '+data.totalPages+' · '+data.total+' drafts'),next]));
 }catch(e){if(current===ticket)output.replaceChildren(el('p',{class:'errmsg'},e.message),serviceAction('Retry outreach queue',load));}}
 panel.addEventListener('toggle',()=>{if(panel.open&&!loaded)load();});if(expanded){panel.open=true;load();}return panel;
}
function outreachFields(form,d={}){
 const to=serviceField(form,'Recipient email',d.to||'','email'),source=serviceField(form,'Public lead source — website or professional profile link',d.source||'','url'),subject=serviceField(form,'Email subject',d.subject||''),body=serviceField(form,'Personalized email message',d.body||'','textarea');to.maxLength=254;source.maxLength=1000;subject.maxLength=160;body.maxLength=6000;body.rows=9;
 source.placeholder='https://example.com/team/contact-name';form.append(el('p',{class:'hint'},'The public lead source is a clickable link to the page where you found this person or business, such as their business website, team page or public professional profile. Paste the page URL here. Enter their email separately above. This is not your affiliate signup link.'));
 form.append(el('p',{class:'hint'},'Lead with free signup. Use a public business or professional contact route. The assigned referral link, your partner signature, company postal address and unsubscribe link are added automatically and appear in Preview. No attachments, CC or BCC.'));
 return ()=>({to:to.value,source:source.value,subject:subject.value,body:body.value});
}
function outreachComposer(contexts,reload){
 const box=el('details'),form=el('div',{class:'service-form'});box.append(el('summary',{},'Create an email draft'),form);
 const context=el('select',{'aria-label':'Outreach campaign or affiliate program'},[el('option',{value:''},'Choose campaign / program'),...contexts.map(c=>el('option',{value:c.id},c.name))]);form.append(el('label',{},['Attribution',context]));
 if(contexts.length===1)context.value=contexts[0].id;
 const fields=outreachFields(form);form.append(serviceAction('Save email draft',async()=>{if(!context.value)throw Error('Choose the campaign or affiliate program for this draft.');await api('POST','/api/outreach',{contextId:context.value,...fields()});toast('Draft saved; no email sent','ok');await reload();},true));return box;
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
  const edit=el('details'),f=el('div',{class:'service-form'});edit.append(el('summary',{},'Edit draft - clears approval'),f);const fields=outreachFields(f,d);f.append(serviceAction('Save edited draft',async()=>{await api('POST','/api/outreach/'+d.id+'/edit',{...fields(),expectedRevision:d.revision});await reload();}));w.append(edit);
 }
 if(!isAdmin&&['draft','rejected'].includes(d.status))w.append(serviceAction('Submit for admin review',async()=>{await api('POST','/api/outreach/'+d.id+'/submit',{expectedRevision:d.revision});toast('Submitted; waiting for review','ok');await reload();},true));
 if(isAdmin&&['submitted','approved'].includes(d.status)){
  w.append(serviceAction('Approve reviewed version',async()=>{if(!previewHash)throw Error('Open Preview complete email and review it first.');await api('POST','/api/outreach/'+d.id+'/review',{approved:true,expectedRevision:d.revision,previewHash});await reload();},true));
  const feedback=serviceField(w,'Changes requested / rejection reason','','textarea');feedback.maxLength=500;w.append(serviceAction('Request changes',async()=>{await api('POST','/api/outreach/'+d.id+'/review',{approved:false,feedback:feedback.value,expectedRevision:d.revision});await reload();}));
 }
 if(isAdmin&&['approved','uncertain','sending'].includes(d.status))w.append(serviceAction(d.status==='approved'?'Send approved email':'Retry same approved email',async()=>{if(!confirm('Send the exact approved message to '+d.to+' with subject "'+d.subject+'"? Replies will appear in the platform inbox for you and this email’s sender once receiving is configured.'))return;await api('POST','/api/outreach/'+d.id+'/send',{expectedRevision:d.revision});await reload();},true));
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
 const panel=el('details',{class:'card'}),body=el('div',{class:'service-form'});panel.append(el('summary',{},'Reply inbox'),body);let page=1;
 async function load(){body.replaceChildren(el('p',{},'Loading replies…'));try{const r=await api('GET','/api/outreach/inbox?page='+page);body.replaceChildren(serviceAction('Refresh reply inbox',load),el('p',{class:'hint'},isAdmin?'All partners’ received replies appear here. Flagged replies are visible only to admins.':'Only replies to emails you sent appear here. New outbound messages and follow-ups still require admin approval.'));
 if(!r.configured)body.append(el('p',{class:'hint'},'Receiving is not configured yet. Replies to older messages sent to partners@ remain in the company mailbox.'));
 for(const reply of r.replies)body.append(outreachReplyCard(reply,isAdmin));if(!r.replies.length)body.append(el('p',{},'No replies received in the platform yet.'));
 const prev=serviceAction('Previous replies',async()=>{page--;await load();}),next=serviceAction('Next replies',async()=>{page++;await load();});prev.disabled=page<=1;next.disabled=page>=r.totalPages;body.append(el('div',{class:'service-actions'},[prev,el('span',{},'Page '+page+' of '+r.totalPages),next]));
 }catch(e){body.replaceChildren(el('p',{class:'errmsg'},e.message));}}
 body.append(serviceAction('Refresh reply inbox',load));panel.addEventListener('toggle',()=>{if(panel.open)load();});return panel;
}
