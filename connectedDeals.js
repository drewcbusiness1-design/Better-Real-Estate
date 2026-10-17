'use strict';
// Shared, deterministic rules: no provider calls and no inferred missing facts.
const crypto = require('crypto');
const finite = value => value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
const norm = value => String(value || '').trim().toLowerCase();
function match(box, listing, state = '') {
  const reasons=[], missing=[], failures=[];
  if (!box || box.active === false) return {status:'no_match',reasons:[],missing:[],failures:['Buy box inactive']};
  function number(field,label,min,max){
    if(min===undefined&&max===undefined)return;
    if(!finite(listing[field])){missing.push(label);return;}
    const n=Number(listing[field]);
    if((min!==undefined&&n<min)||(max!==undefined&&n>max))failures.push(`${label} outside criteria`);
    else reasons.push(`${label} within criteria`);
  }
  number('asking','Asking price',Number(box.minPrice||0),Number(box.maxPrice||2000000));
  number('arv','Seller ARV',Number(box.minArv)>0?Number(box.minArv):undefined,Number(box.maxArv)>0?Number(box.maxArv):undefined);
  number('beds','Bedrooms',Number(box.minBeds)>0?Number(box.minBeds):undefined);
  number('baths','Bathrooms',Number(box.minBaths)>0?Number(box.minBaths):undefined);
  if(['light','moderate'].includes(box.rehabTolerance))number('rehab','Seller repair estimate',0,box.rehabTolerance==='light'?30000:75000);
  function text(field,label,values,actual){
    const wanted=(Array.isArray(values)?values:[]).map(norm).filter(Boolean);if(!wanted.length)return;
    if(!norm(actual)){missing.push(label);return;}
    if(!wanted.includes(norm(actual)))failures.push(`${label} outside criteria`);else reasons.push(`${label} matches`);
  }
  text('state','State',box.states,state);
  text('city','City',(box.cities||[]).map(c=>String(c).split(',')[0]),String(listing.city||'').split(',')[0]);
  const cityStates=(box.cities||[]).map(c=>String(c).match(/,\s*([A-Za-z]{2})(?:\s|$)/)?.[1]).filter(Boolean);if(cityStates.length===box.cities?.length&&cityStates.length)text('state','City state',cityStates,state);
  text('propertyType','Property type',box.propertyTypes,listing.propertyType);
  if(Number(box.minSpread)>0){if(!finite(listing.arv)||!finite(listing.asking))missing.push('ARV and asking price for spread');else if(Number(listing.arv)-Number(listing.asking)<Number(box.minSpread))failures.push('Spread below criteria');else reasons.push('Seller-estimated spread meets criteria');}
  return {status:failures.length?'no_match':missing.length?'needs_info':'match',reasons,missing,failures,criteriaUpdatedAt:box.updatedAt||null};
}
function available(l){return !l.archivedAt&&!['archived','closed','sold','inactive'].includes(l.availabilityStatus)&&(!l.expiresAt||new Date(l.expiresAt).getTime()>Date.now());}
function fingerprint(l){return crypto.createHash('sha256').update(JSON.stringify(['address','city','propertyType','beds','baths','sqft','year','rehab','notes'].map(k=>l[k]??null))).digest('hex');}
function comparison(l,assumptions={}){
  const values={asking:finite(l.asking)?Number(l.asking):null,arv:finite(l.arv)?Number(l.arv):null,rehab:finite(l.rehab)?Number(l.rehab):null};
  const costRate=finite(assumptions.costRate)?Math.min(30,Math.max(0,Number(assumptions.costRate))):8;
  const holding=finite(assumptions.holding)?Math.max(0,Number(assumptions.holding)):0;
  const missing=Object.keys(values).filter(k=>values[k]===null);
  const margin=arv=>arv-values.asking-values.rehab-arv*costRate/100-holding;
  return {...values,missing,assumptions:{costRate,holding},estimatedMargin:missing.length?null:margin(values.arv),downsideMargin:missing.length?null:margin(values.arv*.9),upsideMargin:missing.length?null:margin(values.arv*1.1)};
}
function csvParse(text){
  if(typeof text!=='string'||text.length>1000000)throw new Error('CSV must be smaller than 1 MB.');
  const rows=[];let row=[],cell='',quote=false;
  for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}else if(!quote&&(c===','||c==='\n')){row.push(cell.replace(/\r$/,''));cell='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}else cell+=c;}
  if(quote)throw new Error('Unclosed CSV quote.');row.push(cell.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);if(rows.length>501)throw new Error('Import at most 500 contacts at a time.');return rows;
}
function csvCell(value){let s=String(value??'');if(/^[\s]*[=+@-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}
module.exports={match,available,fingerprint,comparison,csvParse,csvCell,finite};
