'use strict';
const assert=require('assert/strict'),crypto=require('crypto');
const {service,report,createRepository}=require('../affiliateTax');
function memory(){const rows=new Map();return {rows,async get(id){return structuredClone(rows.get(id)||null);},async list(){return [...rows.values()].map(structuredClone);},async put(row,revision){if((rows.get(row.userId)?.revision||0)!==revision)return false;rows.set(row.userId,structuredClone(row));return true;}};}
const pdf=Buffer.from('%PDF-1.4\nFICTIONAL TAX QA DOCUMENT - NOT A REAL FORM\n%%EOF');
const body={formType:'W-9',confirmSigned:true,pdfBase64:pdf.toString('base64')};
(async()=>{
 const repository=memory(),tax=service(repository);delete process.env.AFFILIATE_TAX_ENCRYPTION_KEY;
 await assert.rejects(()=>tax.submit('one',body),e=>e.status===503);assert.equal((await tax.status('one')).ready,false);
 process.env.AFFILIATE_TAX_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
 await assert.rejects(()=>tax.submit('one',{...body,pdfBase64:Buffer.from('not a PDF').toString('base64')}));
 await assert.rejects(()=>tax.submit('one',{...body,confirmSigned:false}));
 await assert.rejects(()=>tax.submit('one',{...body,pdfBase64:'A'.repeat(1400000)}));
 let result=await tax.submit('one',body);assert.equal(result.status,'submitted');assert(!result.ready);
 const stored=repository.rows.get('one');assert(!JSON.stringify(stored).includes('FICTIONAL'));assert(!JSON.stringify(result).includes('encrypted'));
 assert.equal((await tax.status('two')).status,'missing');await assert.rejects(()=>tax.download('two',result.documentId,'two'),e=>e.status===404);
 assert((await tax.download('one',result.documentId,'admin')).equals(pdf));
 await assert.rejects(()=>tax.review('one','admin',{...result,status:'approved',reviewConfirmed:true,noBackupWithholding:true}),e=>e.status===409);
 result=await tax.status('one');await assert.rejects(()=>tax.review('one','admin',{...result,status:'approved',reviewConfirmed:true}));
 result=await tax.review('one','admin',{...result,status:'approved',reviewConfirmed:true,noBackupWithholding:true});assert(result.ready);
 const key=process.env.AFFILIATE_TAX_ENCRYPTION_KEY;process.env.AFFILIATE_TAX_ENCRYPTION_KEY=crypto.randomBytes(32).toString('hex');
 assert.equal((await tax.status('one')).ready,false);await assert.rejects(()=>tax.download('one',result.documentId,'admin'),e=>e.status===503);process.env.AFFILIATE_TAX_ENCRYPTION_KEY=key;
 result=await tax.submit('one',body);assert(!result.ready);assert.equal(repository.rows.get('one').documents.length,2);
 const tampered=repository.rows.get('one');tampered.documents.at(-1).encrypted.data='AAAA';
 await assert.rejects(()=>tax.review('one','admin',{...result,status:'approved',reviewConfirmed:true,noBackupWithholding:true}),e=>e.status===503);
 const foreign=await tax.submit('foreign',{...body,formType:'W-8'});assert.equal(foreign.status,'foreign_review');
 await assert.rejects(()=>tax.review('foreign','admin',{...foreign,status:'approved',reviewConfirmed:true,noBackupWithholding:true}));
 result=await tax.review('foreign','admin',{...foreign,status:'needs_review'});assert(!result.ready);
 const concurrent=await Promise.allSettled([tax.submit('race',body),tax.submit('race',body)]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);assert.equal(concurrent.find(r=>r.status==='rejected').reason.status,409);
 const output=report({users:[{id:'one',name:'=CSVFORMULA',email:'one@example.test'}],affiliateCommissions:[{affiliateUserId:'one',amountCents:12345,status:'paid',paidAt:'2027-01-01T02:00:00Z',transferId:'tr_one'},{affiliateUserId:'one',amountCents:200,status:'pending',createdAt:'2026-05-01'},{affiliateUserId:'one',amountCents:500,status:'reversed',paidAt:'2026-06-01',transferId:'tr_two'}]},2026,[]);
 assert(output.includes("'=CSVFORMULA"));assert(output.includes('123.45'));assert(output.includes('2026-12-31'));assert(output.includes('Status changed after payment'));assert(!output.includes('2.00'));assert(!output.includes('encrypted'));
 assert.throws(()=>report({users:[]},'2026,formula',[]));
 // Exercise the production repository's dedicated table and optimistic revision guard.
 const calls=[],fake={FILE_MODE:false,init:async()=>{},sql:async(sql,args)=>{calls.push({sql,args});return sql.startsWith('SELECT')?[{data:{userId:'one',revision:2}}]:[{id:'one'}];}};
 const sqlRepo=createRepository(fake);assert.equal((await sqlRepo.get('one')).revision,2);await sqlRepo.put({userId:'one',revision:3},2);assert(calls.some(c=>c.sql.includes("data->>'revision'")&&c.args[2]===2));assert(calls.every(c=>!c.sql.includes('kv_users')));
 console.log('PASS affiliate tax: encryption/authentication, input limits, no-key fail closed, owner isolation, access audit, review attestations, stale/concurrent writes, replacement/revocation, foreign hold and payment-report safety.');
})().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={memory,pdf,body};
