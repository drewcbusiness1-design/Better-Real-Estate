/* Deletion always requires an explicit button click, never a typed phrase. */
let deleteConfirmationOpen=false;
function confirmDelete(message){
 if(deleteConfirmationOpen)return Promise.resolve(false);
 deleteConfirmationOpen=true;
 return new Promise(resolve=>{
  const previous=document.activeElement,dialog=el('dialog',{class:'delete-confirm-dialog','aria-labelledby':'delete-confirm-title','aria-describedby':'delete-confirm-description'}),cancel=el('button',{type:'button',class:'btn-ghost'},'Cancel'),approve=el('button',{type:'button',class:'dangerbtn'},'Confirm delete');let finished=false;
  function finish(value){if(finished)return;finished=true;deleteConfirmationOpen=false;dialog.close();dialog.remove();if(previous?.isConnected)previous.focus();resolve(value);}
  cancel.onclick=()=>finish(false);approve.onclick=()=>finish(true);
  dialog.addEventListener('cancel',event=>{event.preventDefault();finish(false);});
  dialog.addEventListener('close',()=>finish(false));
  dialog.append(el('h2',{id:'delete-confirm-title'},'Confirm deletion'),el('p',{id:'delete-confirm-description'},message),el('div',{class:'service-actions'},[cancel,approve]));
  document.body.appendChild(dialog);dialog.showModal();cancel.focus();
 });
}
