'use strict';

// Tax PDFs never use general uploads or the application's shared loadDB snapshot.
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const MAX_BYTES = 1024 * 1024;
function fail(message, status = 400) { return Object.assign(new Error(message), {status}); }
function encryptionKey() {
  const value = process.env.AFFILIATE_TAX_ENCRYPTION_KEY || '';
  if (!/^[a-f0-9]{64}$/i.test(value)) throw fail('Tax document submission is temporarily unavailable. Please try again later.', 503);
  return Buffer.from(value, 'hex');
}
function configured() { try { encryptionKey(); return true; } catch { return false; } }
function seal(bytes, owner, id) {
  const iv = crypto.randomBytes(12), cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  cipher.setAAD(Buffer.from(owner + ':' + id));
  const data=Buffer.concat([cipher.update(bytes),cipher.final()]).toString('base64');
  return {iv:iv.toString('base64'),data,tag:cipher.getAuthTag().toString('base64')};
}
function unseal(doc, owner) {
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(doc.encrypted.iv,'base64'));
    decipher.setAAD(Buffer.from(owner + ':' + doc.id));
    decipher.setAuthTag(Buffer.from(doc.encrypted.tag,'base64'));
    return Buffer.concat([decipher.update(Buffer.from(doc.encrypted.data,'base64')), decipher.final()]);
  } catch { throw fail('The tax document could not be opened. Contact the administrator.', 503); }
}
function summary(row) {
  const doc = row?.documents?.find(d => d.id === row.documentId);
  return {revision:row?.revision || 0, status:row?.status || 'missing', documentId:doc?.id || null,
    formType:doc?.formType || null, submittedAt:doc?.submittedAt || null, reviewedAt:row?.reviewedAt || null,
    reason:row?.reason || '', ready:configured() && row?.status === 'approved' && !!doc};
}
function createRepository(store) {
  const filename = path.join(__dirname,'private','affiliate-tax.local.json');
  let init;
  async function ensure() {
    if(store.FILE_MODE) return;
    await store.init();
    if(!init) init = store.sql('CREATE TABLE IF NOT EXISTS private_affiliate_tax (id text PRIMARY KEY, data jsonb NOT NULL)');
    await init;
  }
  function local() { return fs.existsSync(filename) ? JSON.parse(fs.readFileSync(filename,'utf8')) : {}; }
  return {
    async get(id) { await ensure(); if(store.FILE_MODE) return local()[id] || null; return (await store.sql('SELECT data FROM private_affiliate_tax WHERE id=$1',[id]))[0]?.data || null; },
    async list() { await ensure(); if(store.FILE_MODE) return Object.values(local()); return (await store.sql('SELECT data FROM private_affiliate_tax')).map(r=>r.data); },
    async put(row, previous) {
      await ensure();
      if(store.FILE_MODE) {
        const all=local(); if((all[row.userId]?.revision || 0)!==previous) return false;
        all[row.userId]=row; fs.mkdirSync(path.dirname(filename),{recursive:true,mode:0o700});
        const tmp=filename+'.'+crypto.randomUUID()+'.tmp'; fs.writeFileSync(tmp,JSON.stringify(all),{mode:0o600}); fs.renameSync(tmp,filename); return true;
      }
      const rows=await store.sql(`INSERT INTO private_affiliate_tax(id,data) VALUES($1,$2::jsonb)
        ON CONFLICT(id) DO UPDATE SET data=EXCLUDED.data WHERE (private_affiliate_tax.data->>'revision')::integer=$3 RETURNING id`,[row.userId,JSON.stringify(row),previous]);
      return rows.length===1;
    }
  };
}
function service(repository) {
  return {
    async status(userId) { const row=await repository.get(userId),out=summary(row); if(out.ready){try{unseal(row.documents.find(d=>d.id===row.documentId),userId);}catch{out.ready=false;}} return out; },
    async submit(userId, body) {
      encryptionKey();
      if(!['W-9','W-8'].includes(body?.formType)) throw fail('Choose the appropriate tax form.');
      if(body.confirmSigned!==true) throw fail('Confirm that your completed tax form is signed.');
      if(typeof body.pdfBase64!=='string' || body.pdfBase64.length>Math.ceil(MAX_BYTES/3)*4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(body.pdfBase64)) throw fail('Upload a PDF no larger than 1 MB.');
      const bytes=Buffer.from(body.pdfBase64,'base64');
      if(bytes.length>MAX_BYTES || !bytes.subarray(0,5).equals(Buffer.from('%PDF-')) || !bytes.subarray(-2048).includes(Buffer.from('%%EOF'))) throw fail('Upload a valid PDF no larger than 1 MB.');
      const old=await repository.get(userId), revision=old?.revision || 0;
      if((old?.documents?.length || 0)>=10) throw fail('Contact the administrator before submitting another replacement.');
      const id=crypto.randomUUID(), at=new Date().toISOString();
      const doc={id,formType:body.formType,submittedAt:at,encrypted:seal(bytes,userId,id)};
      const row={...old,userId,revision:revision+1,status:body.formType==='W-9'?'submitted':'foreign_review',documentId:id,reviewedAt:null,reason:'',documents:[...(old?.documents || []),doc],audit:[...(old?.audit || []),{action:'submitted',actorId:userId,documentId:id,at}]};
      if(!await repository.put(row,revision)) throw fail('Tax information changed elsewhere. Reload before submitting again.',409);
      return summary(row);
    },
    async review(userId, actorId, body) {
      const old=await repository.get(userId);
      if(!old || old.revision!==body?.revision || old.documentId!==body?.documentId) throw fail('Tax information changed. Reload before reviewing.',409);
      const doc=old.documents.find(d=>d.id===old.documentId);
      if(!['approved','rejected','needs_review'].includes(body.status)) throw fail('Choose a review decision.');
      if(body.status==='approved') {
        if(doc.formType!=='W-9') throw fail('Foreign tax documentation requires a separate withholding and reporting review before payout.');
        if(body.reviewConfirmed!==true || body.noBackupWithholding!==true) throw fail('Review the signed W-9 and confirm that backup withholding is not required.');
        unseal(doc,userId); // Never approve unreadable or damaged records.
      }
      const at=new Date().toISOString(), row={...old,revision:old.revision+1,status:body.status,reviewedAt:at,
        reason:body.status==='approved'?'':body.status==='rejected'?'Please submit a corrected, completed and signed tax form.':'Additional tax review is required before payout.',
        audit:[...old.audit,{action:body.status,actorId,documentId:doc.id,at,noBackupWithholding:body.status==='approved'}]};
      if(!await repository.put(row,old.revision)) throw fail('Tax information changed. Reload before reviewing.',409);
      return summary(row);
    },
    async download(userId, documentId, actorId) {
      const old=await repository.get(userId), doc=old?.documents?.find(d=>d.id===documentId);
      if(!doc) throw fail('Tax document not found.',404);
      const bytes=unseal(doc,userId), at=new Date().toISOString();
      if(!await repository.put({...old,revision:old.revision+1,audit:[...old.audit,{action:'downloaded',actorId,documentId,at}]},old.revision)) throw fail('Tax information changed. Try opening it again.',409);
      return bytes;
    },
    async list() { return (await repository.list()).map(r=>({userId:r.userId,...summary(r)})); }
  };
}
function csv(rows) {
  const escape=v=>'"'+String(v??'').replace(/^[=+@\-\t\r]/,"'$&").replace(/"/g,'""')+'"';
  return rows.map(row=>row.map(escape).join(',')).join('\r\n');
}
function report(db, year, statuses) {
  if(!/^20\d{2}$/.test(String(year))) throw fail('Choose a valid reporting year.');
  const rows=[['Review only - not a filed tax form','Email','User ID','Transfer ID','Paid date (America/New_York)','Amount USD','Tax review status','Record warning']];
  for(const c of db.affiliateCommissions || []) {
    if(!c.paidAt || !c.transferId) continue;
    const date=new Date(c.paidAt); if(!Number.isFinite(date.getTime())) continue;
    const local=new Intl.DateTimeFormat('en-CA',{timeZone:'America/New_York',year:'numeric',month:'2-digit',day:'2-digit'}).format(date);
    if(local.slice(0,4)!==String(year)) continue;
    const user=db.users.find(u=>u.id===c.affiliateUserId);
    rows.push([user?.name || 'Former account',user?.email || '',c.affiliateUserId,c.transferId,local,(Number(c.amountCents || 0)/100).toFixed(2),statuses.find(s=>s.userId===c.affiliateUserId)?.status || 'missing',c.status==='paid'?'Reconcile against Stripe transfers before filing':'Status changed after payment; reconcile original transfer and adjustments']);
  }
  return csv(rows);
}
function install(app,{store,requireAuth,requireAdmin,isDemoUser,affiliateForUser,repository}) {
  const tax=service(repository || createRepository(store));
  const headers=(req,res,next)=>{res.set({'Cache-Control':'no-store, private','Pragma':'no-cache','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});next();};
  const affiliate=(req,res,next)=>{if(isDemoUser(req.user)) return res.status(403).json({error:'Demo accounts cannot submit tax documents.'}); if(!affiliateForUser(req.db,req.user.id)) return res.status(403).json({error:'Approved affiliate access required.'}); next();};
  const sameOrigin=(req,res,next)=>{const origin=req.get('origin');if(origin && origin!==new URL(process.env.APP_URL || req.protocol+'://'+req.get('host')).origin)return res.status(403).json({error:'Open this action from Better Real Estate.'});next();};
  app.get('/api/affiliate/tax',requireAuth,headers,affiliate,async(req,res)=>res.json({tax:await tax.status(req.user.id),submissionAvailable:configured()}));
  app.post('/api/affiliate/tax',requireAuth,headers,sameOrigin,affiliate,async(req,res)=>{try{res.json({tax:await tax.submit(req.user.id,req.body)});}catch(e){res.status(e.status || 503).json({error:e.status?e.message:'Tax document submission is temporarily unavailable.'});}});
  app.get('/api/admin/affiliate-tax',requireAuth,requireAdmin,headers,async(req,res)=>res.json({records:await tax.list(),submissionAvailable:configured()}));
  app.post('/api/admin/affiliate-tax/:userId/review',requireAuth,requireAdmin,headers,sameOrigin,async(req,res)=>{try{res.json({tax:await tax.review(req.params.userId,req.user.id,req.body)});}catch(e){res.status(e.status || 503).json({error:e.status?e.message:'Tax review is temporarily unavailable.'});}});
  app.get('/api/affiliate/tax/:documentId/document',requireAuth,headers,affiliate,async(req,res)=>{try{res.type('application/pdf').set('Content-Disposition','attachment; filename="better-affiliate-tax-form.pdf"').send(await tax.download(req.user.id,req.params.documentId,req.user.id));}catch(e){res.status(e.status || 503).json({error:e.status?e.message:'Tax document is temporarily unavailable.'});}});
  app.get('/api/admin/affiliate-tax/:userId/:documentId/document',requireAuth,requireAdmin,headers,async(req,res)=>{try{res.type('application/pdf').set('Content-Disposition','attachment; filename="better-affiliate-tax-form.pdf"').send(await tax.download(req.params.userId,req.params.documentId,req.user.id));}catch(e){res.status(e.status || 503).json({error:e.status?e.message:'Tax document is temporarily unavailable.'});}});
  app.get('/api/admin/affiliate-tax-report',requireAuth,requireAdmin,headers,async(req,res)=>{try{const year=String(req.query.year || '');const out=report(req.db,year,await tax.list());res.type('text/csv').set('Content-Disposition',`attachment; filename="better-affiliate-payment-review-${year}.csv"`).send(out);}catch(e){res.status(e.status || 503).json({error:e.status?e.message:'Payment report is temporarily unavailable.'});}});
  return tax;
}
module.exports={install,service,createRepository,configured,summary,report,MAX_BYTES};
