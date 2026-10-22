'use strict';
const crypto=require('crypto'),fs=require('fs'),path=require('path'),store=require('./store');
let getStore;try{({getStore}=require('@netlify/blobs'));}catch{}
const local=path.join(__dirname,'private','campaign-proofs');let initialized;
function validate(dataUrl,name){
 const m=/^data:(application\/pdf|image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/]*={0,2})$/.exec(String(dataUrl||''));
 const bad=message=>{throw Object.assign(new Error(message),{status:400});};if(!m)bad('Choose a PDF, PNG, JPG or WebP file.');
 const buffer=Buffer.from(m[2],'base64');if(!buffer.length||buffer.length>2*1024*1024)bad('Each proof file must be no larger than 2 MB.');
 const valid=m[1]==='application/pdf'?buffer.subarray(0,5).toString()==='%PDF-':m[1]==='image/png'?buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):m[1]==='image/jpeg'?buffer[0]===255&&buffer[1]===216&&buffer[2]===255:buffer.subarray(0,4).toString()==='RIFF'&&buffer.subarray(8,12).toString()==='WEBP';
 if(!valid)bad('The file contents do not match its PDF or image type.');
 return {buffer,mime:m[1],name:String(name||'proof').replace(/[\r\n\x00-\x1f"\\/]/g,'_').slice(0,150),size:buffer.length};
}
async function table(){if(!initialized)initialized=(async()=>{await store.init();await store.sql('CREATE TABLE IF NOT EXISTS bre_campaign_proofs (key text PRIMARY KEY, bytes_base64 text NOT NULL)');})().catch(e=>{initialized=null;throw e;});await initialized;}
function blobs(){if(!getStore)return null;try{return getStore('bre-private-campaign-proofs');}catch{return null;}}
async function write(buffer){
 const key=crypto.randomUUID(),s=blobs();if(s){try{await s.set(key,buffer);return key;}catch{}}
 if(!store.FILE_MODE&&store.sql){await table();await store.sql('INSERT INTO bre_campaign_proofs (key,bytes_base64) VALUES ($1,$2)',[key,buffer.toString('base64')]);return key;}
 if(!store.FILE_MODE)throw new Error('Private proof storage is unavailable.');
 fs.mkdirSync(local,{recursive:true});fs.writeFileSync(path.join(local,key),buffer);return key;
}
async function read(key){
 if(!/^[a-f0-9-]{36}$/.test(key))return null;const s=blobs();if(s){try{const b=await s.get(key,{type:'arrayBuffer'});if(b)return Buffer.from(b);}catch{}}
 if(!store.FILE_MODE&&store.sql){await table();const rows=await store.sql('SELECT bytes_base64 FROM bre_campaign_proofs WHERE key=$1',[key]);return rows[0]?Buffer.from(rows[0].bytes_base64,'base64'):null;}
 if(!store.FILE_MODE)return null;const p=path.join(local,key);return fs.existsSync(p)?fs.readFileSync(p):null;
}
async function remove(key){
 if(!/^[a-f0-9-]{36}$/.test(key))return;const s=blobs();if(s)try{await s.delete(key);}catch{}
 if(!store.FILE_MODE&&store.sql){await table();await store.sql('DELETE FROM bre_campaign_proofs WHERE key=$1',[key]);}
 if(store.FILE_MODE)fs.rmSync(path.join(local,key),{force:true});
}
module.exports={validate,write,read,remove};
