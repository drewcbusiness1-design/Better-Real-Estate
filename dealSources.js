/* Better Real Estate property evidence adapters.
   v29.15: production evidence-first property intelligence.
   Approved live sources only: Regrid, configured authorized RESO/MLS feeds,
   and the existing OpenAI Responses web-search tool. No direct website scraping.
*/

const inFlightResearch = new Map();

const REGRID_TIMEOUT_MS = 6500;
const MLS_TIMEOUT_MS = 8000;
const WEB_FACT_TIMEOUT_MS = 90000;
const WEB_COMP_TIMEOUT_MS = 150000;
const REGRID_NEARBY_RADIUS_METERS = 3219; // ~2 miles
const REGRID_NEARBY_LIMIT = 40;

function clean(v,n=500){return String(v??'').trim().slice(0,n)}
function num(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function esc(v){return String(v).replace(/'/g,"''")}
function first(...v){return v.find(x=>x!==undefined&&x!==null&&x!=='')??null}
function nowIso(){return new Date().toISOString()}
function elapsed(start){return Date.now()-start}
function hav(a,b,c,d){if([a,b,c,d].some(x=>!Number.isFinite(Number(x))))return null;const R=3958.8,rad=x=>Number(x)*Math.PI/180,dLat=rad(c-a),dLon=rad(d-b),q=Math.sin(dLat/2)**2+Math.cos(rad(a))*Math.cos(rad(c))*Math.sin(dLon/2)**2;return 2*R*Math.asin(Math.sqrt(q))}

const STREET_SUFFIX = new Map(Object.entries({
  street:'st',st:'st',avenue:'ave',ave:'ave',road:'rd',rd:'rd',drive:'dr',dr:'dr',lane:'ln',ln:'ln',court:'ct',ct:'ct',
  boulevard:'blvd',blvd:'blvd',place:'pl',pl:'pl',terrace:'ter',ter:'ter',parkway:'pkwy',pkwy:'pkwy',highway:'hwy',hwy:'hwy',
  circle:'cir',cir:'cir',trail:'trl',trl:'trl',way:'way',route:'rte',rte:'rte',turnpike:'tpke',tpke:'tpke',square:'sq',sq:'sq',
  expressway:'expy',expy:'expy',freeway:'fwy',fwy:'fwy',crossing:'xing',xing:'xing',crescent:'cres',cres:'cres'
}));
const DIRECTIONS = new Map(Object.entries({north:'n',n:'n',south:'s',s:'s',east:'e',e:'e',west:'w',w:'w',northeast:'ne',ne:'ne',northwest:'nw',nw:'nw',southeast:'se',se:'se',southwest:'sw',sw:'sw'}));
const ORDINALS = new Map(Object.entries({first:'1st',second:'2nd',third:'3rd',fourth:'4th',fifth:'5th',sixth:'6th',seventh:'7th',eighth:'8th',ninth:'9th',tenth:'10th'}));
function normText(v){return clean(v,500).toLowerCase().normalize('NFKD').replace(/[’']/g,'').replace(/[^a-z0-9\s#-]/g,' ').replace(/\s+/g,' ').trim()}
function stripUnit(v){return clean(v,350).replace(/(?:\s|,)+(?:apt|apartment|unit|suite|ste|#)\s*[a-z0-9-]+.*$/i,'').trim()}
function tokenNorm(x){return DIRECTIONS.get(x)||STREET_SUFFIX.get(x)||ORDINALS.get(x)||x}
function streetTokens(v){return normText(stripUnit(v)).split(' ').filter(Boolean).map(tokenNorm).filter(x=>!['unit','apt','apartment','suite','ste','#'].includes(x))}
function parseAddress(address){
  const raw=clean(address,350),parts=raw.split(',').map(x=>x.trim()).filter(Boolean);
  const zip=(raw.match(/\b\d{5}(?:-\d{4})?\b/)||[])[0]||'';
  let state='',stateIx=-1;
  for(let i=parts.length-1;i>=1;i--){const m=parts[i].match(/^([A-Za-z]{2})(?:\s+\d{5}(?:-\d{4})?)?$/);if(m){state=m[1].toUpperCase();stateIx=i;break}}
  if(!state){const m=raw.match(/,\s*([A-Za-z]{2})\s+(?:\d{5}(?:-\d{4})?)\b/);if(m)state=m[1].toUpperCase()}
  // Users often paste a full address without commas. Resolve the trailing state/ZIP and, when
  // possible, stop the street at a recognized suffix so city tokens do not poison street matching/cache keys.
  if(!state){const m=raw.match(/\b([A-Za-z]{2})\s+\d{5}(?:-\d{4})?\s*$/);if(m)state=m[1].toUpperCase()}
  let street=stripUnit(parts[0]||raw),city='';
  if(parts.length>=2)city=stateIx>0?parts[stateIx-1]:parts[1];
  if(parts.length===1&&state&&zip){
    const tail=new RegExp(`\\s+${state}\\s+${zip.replace('-', '\\-')}\\s*$`,'i'),prefix=stripUnit(raw.replace(tail,'').trim()),words=prefix.split(/\s+/);
    const suffixIx=words.findIndex((w,i)=>i>0&&STREET_SUFFIX.has(normText(w)));
    if(suffixIx>=1)street=words.slice(0,suffixIx+1).join(' ');else street=prefix;
  }
  const toks=streetTokens(street),houseNumber=(toks.find(x=>/^\d+[a-z]?(?:-\d+)?$/.test(x))||'').toLowerCase();
  return {raw,street,city,state,zip,houseNumber,streetTokens:toks.filter(x=>x!==houseNumber)};
}
function cacheKey(address){const p=parseAddress(address);return [p.houseNumber,...p.streetTokens,normText(p.city),p.state,p.zip.slice(0,5)].filter(Boolean).join('|')}
function recordAddress(rec={}){const base=clean(rec.address,300);const hasLocality=base.includes(',');return hasLocality?base:[base,rec.city,rec.state,rec.postalCode].filter(Boolean).join(', ')}
function addressMatchDetails(inputAddress,record={}){
  const a=typeof inputAddress==='string'?parseAddress(inputAddress):inputAddress;
  const b=parseAddress(recordAddress(record));
  if(a.houseNumber&&b.houseNumber&&a.houseNumber!==b.houseNumber)return {score:-100,houseExact:false,streetRatio:0,hardMismatch:'house_number'};
  const A=new Set(a.streetTokens),B=new Set(b.streetTokens),hit=[...A].filter(x=>B.has(x)).length,streetRatio=A.size&&B.size?hit/Math.max(1,Math.min(A.size,B.size)):0;
  const houseExact=!!a.houseNumber&&b.houseNumber===a.houseNumber;
  let score=houseExact?40:0;
  if(A.size)score+=streetRatio>=.95?35:streetRatio>=.8?30:streetRatio>=.6?20:streetRatio>=.4?8:-25;
  const cityA=normText(a.city),cityB=normText(b.city);if(cityA&&cityB)score+=cityA===cityB?10:-14;
  if(a.state&&b.state)score+=a.state===b.state?8:-30;
  if(a.zip&&b.zip)score+=a.zip.slice(0,5)===b.zip.slice(0,5)?7:-25;
  const hardMismatch=(a.state&&b.state&&a.state!==b.state)||(a.zip&&b.zip&&a.zip.slice(0,5)!==b.zip.slice(0,5));
  return {score:hardMismatch?-90:score,houseExact,streetRatio,hardMismatch:hardMismatch?'locality':null,parsedInput:a,parsedRecord:b};
}
function addressMatchScore(inputAddress,record={}){return addressMatchDetails(inputAddress,record).score}

function configs(){
  const out=[];
  if(process.env.MLS_RESO_BASE_URL&&process.env.MLS_RESO_TOKEN)out.push({name:clean(process.env.MLS_RESO_NAME||'Authorized MLS',80),base:clean(process.env.MLS_RESO_BASE_URL,600),token:clean(process.env.MLS_RESO_TOKEN,2000)});
  if(process.env.MLS_RESO_SOURCES_JSON){try{for(const x of JSON.parse(process.env.MLS_RESO_SOURCES_JSON)||[]){if(x?.name&&x?.baseUrl&&x?.token)out.push({name:clean(x.name,80),base:clean(x.baseUrl,600),token:clean(x.token,2000)})}}catch{}}
  return out.filter((x,i,a)=>a.findIndex(y=>y.base===x.base)===i);
}
function normMls(r,source){return {source,sourceKey:`mls:${normText(source)}`,sourceType:'MLS / RESO',sourceKind:'authorized_mls',verification:'authorized-listing-feed',listingKey:clean(r.ListingKey||r.ListingId||'',120)||null,address:clean(r.UnparsedAddress||[r.StreetNumber,r.StreetDirPrefix,r.StreetName,r.StreetSuffix,r.StreetDirSuffix].filter(Boolean).join(' '),250)||null,city:clean(r.City,100)||null,state:clean(r.StateOrProvince,40)||null,postalCode:clean(r.PostalCode,20)||null,status:clean(r.StandardStatus||r.MlsStatus,60)||null,listPrice:num(r.ListPrice),salePrice:num(r.ClosePrice),saleDate:r.CloseDate||null,bedrooms:num(r.BedroomsTotal),bathrooms:num(r.BathroomsTotalInteger??r.BathroomsFull),squareFootage:num(r.LivingArea),lotSize:num(r.LotSizeSquareFeet),yearBuilt:num(r.YearBuilt),propertyType:clean(r.PropertyType||r.PropertySubType,100)||null,daysOnMarket:num(r.DaysOnMarket),remarks:clean(r.PublicRemarks,1200)||null,latitude:num(r.Latitude),longitude:num(r.Longitude),sourceUpdatedAt:r.ModificationTimestamp||null,retrievedAt:nowIso()}}
async function queryMls(cfg,filter,top=100){
  const base=cfg.base.replace(/\/$/,''),fields=['ListingKey','ListingId','UnparsedAddress','StreetNumber','StreetDirPrefix','StreetName','StreetSuffix','StreetDirSuffix','City','StateOrProvince','PostalCode','StandardStatus','MlsStatus','ListPrice','ClosePrice','CloseDate','BedroomsTotal','BathroomsTotalInteger','BathroomsFull','LivingArea','LotSizeSquareFeet','YearBuilt','PropertyType','PropertySubType','DaysOnMarket','PublicRemarks','Latitude','Longitude','ModificationTimestamp'].join(','),u=new URL(base+'/Property');
  u.searchParams.set('$filter',filter);u.searchParams.set('$select',fields);u.searchParams.set('$top',String(top));
  const r=await fetch(u,{headers:{Authorization:`Bearer ${cfg.token}`,Accept:'application/json'},signal:AbortSignal.timeout(MLS_TIMEOUT_MS)});if(!r.ok)throw new Error(`${cfg.name} returned ${r.status}`);const j=await r.json();return (Array.isArray(j.value)?j.value:[]).map(x=>normMls(x,cfg.name));
}
function bestSubject(rows,address){const scored=(rows||[]).map(x=>{const m=addressMatchDetails(address,x);return {...x,addressMatchScore:m.score,_match:m}}).sort((a,b)=>b.addressMatchScore-a.addressMatchScore);const best=scored[0]||null;return best&&best._match.houseExact&&best._match.streetRatio>=.8&&best.addressMatchScore>=60?best:null}

function contextParts(context){
  const headline=clean(context?.headline||'',180),parts=headline.split(',').map(x=>x.trim()).filter(Boolean);let city=null,state=null;
  if(parts.length>=2){city=parts[0]||null;const st=(parts[1].match(/\b[A-Z]{2}\b/i)||[])[0];state=st?st.toUpperCase():null}
  return {city,state,path:clean(context?.path||'',240)||null};
}
function regridFields(feature){const p=feature?.properties||{},f=p.fields||p,c=contextParts(p.context);return {...f,headline:first(f.headline,p.headline),address:first(f.address,p.address,p.headline),ll_uuid:first(f.ll_uuid,p.ll_uuid),path:first(f.path,p.path,c.path),score:num(first(f.score,p.score)),_contextCity:c.city,_contextState:c.state}}
function normRegrid(feature){
  const f=regridFields(feature);return {source:'Regrid',sourceKey:'regrid',sourceType:'County / parcel records',sourceKind:'public_record',verification:'public-record-aggregator',parcelId:first(f.parcelnumb,f.state_parcelnumb,f.ll_uuid),llUuid:first(f.ll_uuid),path:first(f.path),regridScore:num(f.score),address:first(f.address,f.situs_address,f.headline),city:first(f.scity,f.city,f._contextCity),state:first(f.state2,f.state,f._contextState),postalCode:first(f.szip,f.zip,f.postcode),bedrooms:num(first(f.num_bedrooms,f.bedrooms,f.beds)),bathrooms:num(first(f.num_bath,f.bathrooms,f.baths,f.total_baths)),squareFootage:num(first(f.recrdareano,f.area_building,f.building_sqft,f.living_area)),lotSize:num(first(f.sqft,f.ll_gissqft,f.lot_sqft)),yearBuilt:num(first(f.yearbuilt,f.year_built)),propertyType:first(f.usedesc,f.usecode,f.structstyle,f.property_type),salePrice:num(first(f.saleprice,f.sale_price,f.last_sale_price)),saleDate:first(f.saledate,f.sale_date,f.last_sale_date),assessedValue:num(first(f.parval,f.assessedval,f.assessed_value)),landValue:num(first(f.landval,f.land_value)),improvementValue:num(first(f.improvval,f.improvement_value)),taxAmount:num(first(f.taxamt,f.tax_amount)),zoning:first(f.zoning_description,f.zoning),owner:first(f.owner),latitude:num(first(f.lat,f.latitude)),longitude:num(first(f.lon,f.longitude)),sourceRecordUrl:first(f.sourceurl,f.source_url),sourceUpdatedAt:first(f.ll_last_refresh,f.ll_updated_at),retrievedAt:nowIso(),rawFieldCount:Object.keys(f).length};
}
function selectRegridFeature(features,address){
  const ranked=(features||[]).map((feature,index)=>{const subject=normRegrid(feature),match=addressMatchDetails(address,subject),providerScore=num(feature?.properties?.score??subject.regridScore),combined=match.score+(providerScore!=null?Math.max(0,Math.min(10,(providerScore-70)/3)):0);return {feature,subject,match,providerScore,combined,index}}).sort((a,b)=>b.combined-a.combined||a.index-b.index);
  const best=ranked[0]||null;
  const acceptable=!!best&&best.match.houseExact&&best.match.streetRatio>=.8&&!best.match.hardMismatch&&(best.match.score>=60||(best.index===0&&best.match.score>=55)||(best.providerScore>=85&&best.match.score>=50));
  return {subject:acceptable?{...best.subject,addressMatchScore:best.match.score,regridScore:best.providerScore,regridRank:best.index+1}:null,matchScore:best?.match.score??null,providerScore:best?.providerScore??null,candidates:ranked.slice(0,5).map(x=>({address:recordAddress(x.subject),parcelId:x.subject.parcelId||null,llUuid:x.subject.llUuid||null,localScore:x.match.score,regridScore:x.providerScore,rank:x.index+1,houseExact:x.match.houseExact,streetRatio:Number(x.match.streetRatio.toFixed(2))}))};
}
function regridToken(){return clean(process.env.REGRID_API_TOKEN||process.env.REGRID_TOKEN,3000)}
async function regridFetch(url,token){const r=await fetch(url,{headers:{Accept:'application/json','x-regrid-token':token},signal:AbortSignal.timeout(REGRID_TIMEOUT_MS)});if(!r.ok)throw new Error(`Regrid returned ${r.status}`);return r.json()}
async function researchRegrid(address){
  const token=regridToken();if(!token)return {configured:false,subject:null,error:null,candidates:[],diagnostic:{status:'not_configured'}};
  const started=Date.now(),parsed=parseAddress(address);
  const makeUrl=(query,useStatePath=true)=>{const u=new URL('https://app.regrid.com/api/v2/parcels/address');u.searchParams.set('query',query);if(useStatePath&&parsed.state)u.searchParams.set('path',`/us/${parsed.state.toLowerCase()}`);u.searchParams.set('limit','5');u.searchParams.set('return_custom','false');u.searchParams.set('return_field_labels','false');u.searchParams.set('return_geometry','false');u.searchParams.set('return_matched_buildings','false');u.searchParams.set('return_matched_addresses','false');u.searchParams.set('return_enhanced_ownership','false');u.searchParams.set('return_zoning','false');return u};
  // Regrid documents address search as a street-address query with path used to restrict geography.
  // Prefer that form first; only fall back to the pasted full address if the ranked results are empty/unsafe.
  let j=await regridFetch(makeUrl(parsed.street||address,true),token),features=j?.parcels?.features||j?.features||[],picked=selectRegridFeature(features,address),queryMode='street_plus_state_path';
  if(!picked.subject){
    const j2=await regridFetch(makeUrl(address,false),token),features2=j2?.parcels?.features||j2?.features||[],picked2=selectRegridFeature(features2,address);
    if(picked2.subject||(!features.length&&features2.length)){j=j2;features=features2;picked=picked2;queryMode='full_address_fallback'}
  }
  if(picked.subject)return {configured:true,subject:picked.subject,error:null,count:features.length,matchScore:picked.matchScore,providerScore:picked.providerScore,candidates:picked.candidates,diagnostic:{status:'matched',durationMs:elapsed(started),count:features.length,matchScore:picked.matchScore,regridScore:picked.providerScore,rank:picked.subject.regridRank||null,queryMode}};
  // Typeahead is an Enterprise product. It is an optional rescue path only.
  if(String(process.env.REGRID_USE_TYPEAHEAD||'').toLowerCase()==='true'){
    try{
      const t=new URL('https://app.regrid.com/api/v2/parcels/typeahead');t.searchParams.set('query',address);const tj=await regridFetch(t,token),centroids=tj?.parcel_centroids?.features||tj?.features||[];
      const tr=centroids.map((x,i)=>({x,i,score:num(x?.properties?.score),address:x?.properties?.address,llUuid:x?.properties?.ll_uuid})).filter(x=>x.llUuid).sort((a,b)=>(b.score??0)-(a.score??0));
      const cand=tr.find(x=>{const m=addressMatchDetails(address,{address:x.address});return m.houseExact&&m.streetRatio>=.8&&!m.hardMismatch&&(x.score==null||x.score>=75)});
      if(cand){const d=new URL(`https://app.regrid.com/api/v2/parcels/${encodeURIComponent(cand.llUuid)}`);d.searchParams.set('return_custom','false');d.searchParams.set('return_geometry','false');d.searchParams.set('return_matched_buildings','false');d.searchParams.set('return_matched_addresses','false');d.searchParams.set('return_enhanced_ownership','false');d.searchParams.set('return_zoning','false');const dj=await regridFetch(d,token),df=(dj?.parcels?.features||dj?.features||[])[0];if(df){const subject=normRegrid(df),m=addressMatchDetails(address,subject);if(m.houseExact&&m.streetRatio>=.8&&!m.hardMismatch)return {configured:true,subject:{...subject,addressMatchScore:m.score,regridScore:cand.score,regridRank:1},error:null,count:features.length,matchScore:m.score,providerScore:cand.score,candidates:picked.candidates,diagnostic:{status:'matched_typeahead_rescue',durationMs:elapsed(started),matchScore:m.score,regridScore:cand.score}};}}
    }catch(e){return {configured:true,subject:null,error:`Regrid address results did not pass exact-property checks; optional Typeahead rescue also failed: ${clean(e.message,140)}`,count:features.length,matchScore:picked.matchScore,providerScore:picked.providerScore,candidates:picked.candidates,diagnostic:{status:'no_safe_match',durationMs:elapsed(started),count:features.length,matchScore:picked.matchScore,regridScore:picked.providerScore,typeaheadError:clean(e.message,120)}}}
  }
  return {configured:true,subject:null,error:features.length?'Regrid returned parcels, but none passed Better’s exact house/street and locality checks.':'No Regrid parcel matched this address.',count:features.length,matchScore:picked.matchScore,providerScore:picked.providerScore,candidates:picked.candidates,diagnostic:{status:'no_safe_match',durationMs:elapsed(started),count:features.length,matchScore:picked.matchScore,regridScore:picked.providerScore,queryMode}};
}
async function researchRegridNearby(subject){
  const token=regridToken();if(!token||!Number.isFinite(Number(subject?.latitude))||!Number.isFinite(Number(subject?.longitude)))return {configured:!!token,comps:[],diagnostic:{status:token?'no_coordinates':'not_configured'}};
  const started=Date.now(),u=new URL('https://app.regrid.com/api/v2/parcels/query'),cutoff=new Date(Date.now()-3*365*24*60*60*1000).toISOString().slice(0,10);u.searchParams.set('geojson',JSON.stringify({type:'Point',coordinates:[Number(subject.longitude),Number(subject.latitude)]}));u.searchParams.set('radius',String(REGRID_NEARBY_RADIUS_METERS));u.searchParams.set('fields[saleprice][gt]','0');u.searchParams.set('fields[saledate][gte]',cutoff);u.searchParams.set('limit',String(REGRID_NEARBY_LIMIT));u.searchParams.set('return_geometry','false');u.searchParams.set('return_custom','false');u.searchParams.set('return_matched_buildings','false');u.searchParams.set('return_matched_addresses','false');u.searchParams.set('return_enhanced_ownership','false');u.searchParams.set('return_zoning','false');
  const j=await regridFetch(u,token),features=j?.parcels?.features||j?.features||[],seen=new Set(),comps=[];
  for(const f of features){const r=normRegrid(f);if(!r.salePrice||!r.saleDate||!r.address)continue;if(subject.llUuid&&r.llUuid===subject.llUuid)continue;const key=`${normText(r.address)}|${r.salePrice}|${String(r.saleDate).slice(0,10)}`;if(seen.has(key))continue;seen.add(key);r.distanceMiles=hav(subject.latitude,subject.longitude,r.latitude,r.longitude);r.source='Regrid recorded sale';r.sourceKey='regrid';r.sourceType='County / parcel records';r.verification='recorded-sale';comps.push(r)}
  return {configured:true,comps:comps.sort((a,b)=>(a.distanceMiles??99)-(b.distanceMiles??99)).slice(0,40),diagnostic:{status:'complete',durationMs:elapsed(started),returned:features.length,recordedSales:comps.length,radiusMiles:Number((REGRID_NEARBY_RADIUS_METERS/1609.344).toFixed(1))}};
}

function extractText(payload){for(const item of payload?.output||[])for(const c of item?.content||[])if(c?.type==='output_text'&&c.text)return c.text;return ''}
function webSources(payload){const urls=[];for(const item of payload?.output||[]){if(item?.type==='web_search_call')for(const s of item?.action?.sources||[])if(s?.url)urls.push(s.url);for(const c of item?.content||[])for(const a of c?.annotations||[])if(a?.url)urls.push(a.url)}return [...new Set(urls)].slice(0,50)}
function canonicalUrl(v){try{const u=new URL(v);return `${u.protocol}//${u.hostname.toLowerCase()}${u.pathname.replace(/\/$/,'')}`}catch{return ''}}
function urlWasActuallySearched(url,sources){const c=canonicalUrl(url);return !!c&&(sources||[]).some(s=>{const x=canonicalUrl(s);return x===c||x.startsWith(c)||c.startsWith(x)})}
function webReliability(kind){return ({county_assessor:98,public_record:92,broker_listing:86,real_estate_portal:72,other:55})[kind]||55}
function sourceTier(kind){return ({authorized_mls:4,county_assessor:4,public_record:3,broker_listing:3,real_estate_portal:2,other:1})[kind]||1}
async function researchWeb(address,{needFacts=true,needComps=true,subject=null}={}){
  const key=clean(process.env.OPENAI_API_KEY,3000);if(!key||(!needFacts&&!needComps))return {configured:!!key,skipped:true,facts:null,factEvidence:[],comps:[],sources:[],marketContext:[],diagnostic:{status:key?'not_needed':'not_configured'}};
  const started=Date.now();
  const schema={type:'object',additionalProperties:false,required:['factEvidence','soldComps','marketContext','notes'],properties:{factEvidence:{type:'array',maxItems:30,items:{type:'object',additionalProperties:false,required:['field','numberValue','textValue','subjectAddress','sourceUrl','sourceName','sourceKind'],properties:{field:{type:'string',enum:['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType','lastSalePrice','lastSaleDate']},numberValue:{anyOf:[{type:'number'},{type:'null'}]},textValue:{anyOf:[{type:'string'},{type:'null'}]},subjectAddress:{type:'string'},sourceUrl:{type:'string'},sourceName:{type:'string'},sourceKind:{type:'string',enum:['county_assessor','public_record','broker_listing','real_estate_portal','other']}}}},soldComps:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,required:['address','salePrice','saleDate','bedrooms','bathrooms','squareFootage','yearBuilt','propertyType','sourceUrl','sourceName','sourceKind'],properties:{address:{type:'string'},salePrice:{type:'number'},saleDate:{type:'string'},bedrooms:{anyOf:[{type:'number'},{type:'null'}]},bathrooms:{anyOf:[{type:'number'},{type:'null'}]},squareFootage:{anyOf:[{type:'number'},{type:'null'}]},yearBuilt:{anyOf:[{type:'number'},{type:'null'}]},propertyType:{anyOf:[{type:'string'},{type:'null'}]},sourceUrl:{type:'string'},sourceName:{type:'string'},sourceKind:{type:'string',enum:['county_assessor','public_record','broker_listing','real_estate_portal','other']}}}},marketContext:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['address','status','price','sourceUrl'],properties:{address:{type:'string'},status:{type:'string'},price:{anyOf:[{type:'number'},{type:'null'}]},sourceUrl:{type:'string'}}}},notes:{type:'array',maxItems:8,items:{type:'string'}}}};
  const requested=[];if(needFacts)requested.push('Verify subject bedrooms, bathrooms, living area, year built, property type');if(needComps)requested.push('Find recent nearby CLOSED/SOLD comparable sales');
  const parsedAddress=parseAddress(address),webTool={type:'web_search',search_context_size:'high',external_web_access:true};
  if(parsedAddress.city||parsedAddress.state)webTool.user_location={type:'approximate',country:'US',...(parsedAddress.city?{city:parsedAddress.city}:{}),...(parsedAddress.state?{region:parsedAddress.state}:{})};
  const body={model:process.env.OPENAI_RESEARCH_MODEL||'gpt-5.6-luna',tools:[webTool],tool_choice:'required',reasoning:{effort:'medium'},include:['web_search_call.action.sources'],instructions:[
    'You are the production property-evidence researcher for Better Real Estate. Research ONLY the exact full address supplied. Accuracy and provenance matter more than completeness.',
    'Use the hosted public web-search tool only; do not scrape websites or bypass access controls. Run a small targeted search plan instead of one broad query. Keep the total search effort bounded.',
    needFacts?'SUBJECT SEARCH PLAN: (1) search the exact quoted address by itself; (2) search the exact quoted address with major real-estate sources such as Zillow, Realtor.com, Redfin, Trulia, Homes.com and broker/FSBO pages; (3) search the exact quoted address with county assessor, county tax, parcel, property record, or recorder terms. Stop early when strong evidence is found.':'Subject facts are already sufficiently corroborated; do not spend search effort collecting them.',
    needComps?'COMP SEARCH PLAN: search for recent SOLD/CLOSED properties near the subject using the city/state/ZIP plus sold/closed terms, then inspect exact-address result pages for close price and close date. Prefer county/MLS/broker/major-portal evidence. Do not treat asking prices or active/pending listings as sold comps.':'Deterministic closed-sale evidence is already sufficient; do not spend search effort collecting additional sold comps.',
    'Priority order for subject facts: county assessor/tax/public records first when available; then broker/listing pages and reputable real-estate portals. Portal evidence is useful but may be syndicated, so preserve each source separately.',
    'Exact-property guard: every subject fact must clearly describe the exact house number + street and compatible city/state/ZIP. Never borrow facts from a neighbor or similarly named street.',
    needFacts?'For subject facts, return one evidence row per source per field. Seek independent corroboration. Do not merge conflicting values. Do not infer beds, baths, living area, year built, or property type.':'',
    needComps?'For sold comps, return only CLOSED sales with an exact comp address, closed price, closed date and source URL. Prefer recent nearby properties similar in type/size/bed-bath.':'',
    'Every sourceUrl must be a URL actually surfaced by the web-search tool. If a fact or sold sale cannot be tied to a surfaced source, omit it.',
    'Do not invent coordinates, distances, close prices, close dates, source URLs or citations. Return fewer results rather than uncertain results.'
  ].filter(Boolean).join('\n'),input:`Exact subject property: "${address}"\nRequested evidence: ${requested.join('; ')}${subject?`\nKnown subject context (use only as search targeting, not as proof): ${JSON.stringify({bedrooms:subject.bedrooms,bathrooms:subject.bathrooms,squareFootage:subject.squareFootage,yearBuilt:subject.yearBuilt,propertyType:subject.propertyType})}`:''}\nReturn only evidence tied to URLs actually consulted by web search.`,text:{format:{type:'json_schema',name:'better_property_web_research',schema,strict:true}},max_output_tokens:2600};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(needComps&&!needFacts?WEB_COMP_TIMEOUT_MS:WEB_FACT_TIMEOUT_MS)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Web research failed (${r.status}): ${clean(j?.error?.message||'unknown error',180)}`);let parsed=null;try{parsed=JSON.parse(extractText(j))}catch{};const sources=webSources(j);if(!parsed)return {configured:true,facts:null,factEvidence:[],comps:[],sources,error:'Web research returned no structured evidence.',diagnostic:{status:'no_structured_output',durationMs:elapsed(started),sourceCount:sources.length}};
  const factEvidence=(parsed.factEvidence||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources)).map(x=>{const match=addressMatchDetails(address,{address:x.subjectAddress});const value=x.field==='propertyType'||x.field==='lastSaleDate'?clean(x.textValue,120):num(x.numberValue);return {field:x.field,value,subjectAddress:clean(x.subjectAddress,250),source:`Web · ${clean(x.sourceName,80)||'source'}`,sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return clean(x.sourceName,80).toLowerCase()}})()}`,sourceType:'Public web',sourceKind:x.sourceKind,reliability:webReliability(x.sourceKind),tier:sourceTier(x.sourceKind),sourceUrl:x.sourceUrl,verification:'web-source-specific',addressMatchScore:match.score,retrievedAt:nowIso()}}).filter(x=>x.value!==null&&x.value!==undefined&&x.value!==''&&x.addressMatchScore>=60);
  const facts={};for(const f of factEvidence){if(facts[f.field]===undefined)facts[f.field]=f.value}
  const comps=(parsed.soldComps||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources)).map(x=>({...x,source:`Web · ${clean(x.sourceName,80)||'source'}`,sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return 'unknown'}})()}`,sourceType:'Public web',sourceKind:x.sourceKind,reliability:webReliability(x.sourceKind),verification:'web-corroborated',distanceMiles:null,retrievedAt:nowIso()}));
  const marketContext=(parsed.marketContext||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources));
  return {configured:true,facts,factEvidence,comps,marketContext,notes:parsed.notes||[],sources,error:null,diagnostic:{status:'complete',durationMs:elapsed(started),sourceCount:sources.length,factRows:factEvidence.length,soldComps:comps.length,mode:{needFacts,needComps}}};
}

function validFieldValue(field,value){if(value===null||value===undefined||value==='')return false;if(field==='bedrooms')return Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=20;if(field==='bathrooms')return Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=20;if(field==='squareFootage')return Number.isFinite(Number(value))&&Number(value)>=200&&Number(value)<=50000;if(field==='yearBuilt')return Number.isFinite(Number(value))&&Number(value)>=1700&&Number(value)<=new Date().getFullYear()+1;if(field==='propertyType')return clean(value,100).length>1;return true}
function normPropertyType(v){const s=normText(v);if(/single.*family|detached|sfr/.test(s))return 'single family';if(/multi.*family|duplex|triplex|fourplex/.test(s))return 'multi family';if(/condo/.test(s))return 'condo';if(/town/.test(s))return 'townhouse';if(/mobile|manufactured/.test(s))return 'mobile home';if(/land|vacant/.test(s))return 'land';if(/commercial/.test(s))return 'commercial';return s}
function sameValue(field,a,b){if(field==='squareFootage'){const x=Number(a),y=Number(b);return Math.abs(x-y)<=Math.max(60,Math.max(x,y)*.04)}if(field==='bathrooms')return Math.abs(Number(a)-Number(b))<.26;if(field==='bedrooms'||field==='yearBuilt')return Number(a)===Number(b);if(field==='propertyType')return normPropertyType(a)===normPropertyType(b);return String(a)===String(b)}
function evidenceTier(e){if(Number(e?.tier)>0)return Number(e.tier);if(e?.sourceKind)return sourceTier(e.sourceKind);const r=Number(e?.reliability||0);return r>=95?4:r>=85?3:r>=70?2:1}
function evidenceLabel(e){return {source:e.source,sourceType:e.sourceType,sourceKind:e.sourceKind||null,sourceUrl:e.sourceUrl||e.sourceRecordUrl||null,value:e.value,reliability:e.reliability,tier:evidenceTier(e)}}
function resolveField(field,evidence){
  const items=evidence.filter(e=>validFieldValue(field,e.value));if(!items.length)return {field,value:null,recordedValue:null,status:'missing',confidence:'Low',sources:[],alternatives:[],raw:[]};
  const groups=[];for(const item of items){let g=groups.find(x=>sameValue(field,x.value,item.value));if(!g){g={value:item.value,items:[],weight:0,sourceKeys:new Set(),maxTier:0};groups.push(g)}g.items.push(item);g.weight+=item.reliability||50;g.sourceKeys.add(item.sourceKey||item.source);g.maxTier=Math.max(g.maxTier,evidenceTier(item))}
  groups.sort((a,b)=>b.weight-a.weight||b.sourceKeys.size-a.sourceKeys.size||b.maxTier-a.maxTier);const win=groups[0],runner=groups[1],independent=win.sourceKeys.size;
  let verified=false;
  // Syndicated portal pages are useful corroboration, but several portals can repeat the same
  // upstream listing error. A portal-only consensus therefore never becomes a verified fact.
  // Verification needs at least one stronger independent record/feed/broker source.
  if(!runner)verified=independent>=2&&win.maxTier>=3;
  else if(independent>=2&&win.maxTier>=3&&win.weight>=runner.weight*1.30)verified=true;
  else if(independent>=3&&win.maxTier>=3&&win.weight>=runner.weight*1.45)verified=true;
  const value=verified?win.value:null,recordedValue=win.value;
  const status=value!==null?(runner?'verified_with_conflict':'verified'):(runner?'conflicting':'recorded');
  const confidence=value!==null?(independent>=3&&win.maxTier>=3?'High':'Moderate'):'Low';
  return {field,value,recordedValue,status,confidence,sources:win.items.map(evidenceLabel),alternatives:groups.slice(1).map(g=>({value:g.value,sources:g.items.map(evidenceLabel)})),raw:items.map(evidenceLabel),independentSources:independent,winningTier:win.maxTier};
}
function sourceEvidenceForField(field,normalizedMls,regridSubject,web){const out=[];for(const mlsSubject of normalizedMls||[])if(mlsSubject&&validFieldValue(field,mlsSubject[field]))out.push({value:mlsSubject[field],source:mlsSubject.source,sourceKey:mlsSubject.sourceKey||`mls:${mlsSubject.source}`,sourceType:'MLS / RESO',sourceKind:'authorized_mls',reliability:100,tier:4});if(regridSubject&&validFieldValue(field,regridSubject[field]))out.push({value:regridSubject[field],source:'Regrid',sourceKey:'regrid',sourceType:'County / parcel records',sourceKind:'public_record',sourceUrl:regridSubject.sourceRecordUrl||null,reliability:90,tier:3});for(const x of web?.factEvidence||[])if(x.field===field)out.push(x);return out}
function webIdentitySources(web,address){
  const bySource=new Map();for(const x of web?.factEvidence||[]){if(!x?.sourceKey||!x.subjectAddress||Number(x.addressMatchScore)<60)continue;const prior=bySource.get(x.sourceKey),parsed=parseAddress(x.subjectAddress),cand={source:x.source,sourceKey:x.sourceKey,sourceType:'Public web',sourceKind:x.sourceKind,reliability:Number(x.reliability||0),tier:evidenceTier(x),address:x.subjectAddress,city:parsed.city||null,state:parsed.state||null,postalCode:parsed.zip||null,addressMatchScore:Number(x.addressMatchScore)};if(!prior||cand.addressMatchScore>prior.addressMatchScore)bySource.set(x.sourceKey,cand)}
  const rows=[...bySource.values()].sort((a,b)=>b.tier-a.tier||b.reliability-a.reliability||b.addressMatchScore-a.addressMatchScore);
  const strong=rows.filter(x=>x.tier>=3);if(strong.some(x=>x.tier>=4))return strong;return rows.length>=2?rows:[];
}
function rankWebCompsForVerification(subject,comps){
  const st=normPropertyType(subject?.propertyType),ss=Number(subject?.squareFootage)||null,sb=Number(subject?.bedrooms)||null,sba=Number(subject?.bathrooms)||null,now=Date.now();
  return (comps||[]).filter(x=>x?.address&&Number(x.salePrice)>0&&x.saleDate).map((x,i)=>{let score=0;const ct=normPropertyType(x.propertyType);if(st&&ct&&st===ct)score+=30;if(ss&&Number(x.squareFootage)){const d=Math.abs(Number(x.squareFootage)-ss)/ss;score+=d<=.15?25:d<=.30?15:d<=.50?5:0}if(sb&&Number(x.bedrooms))score+=Math.max(0,10-Math.abs(Number(x.bedrooms)-sb)*5);if(sba&&Number(x.bathrooms))score+=Math.max(0,10-Math.abs(Number(x.bathrooms)-sba)*4);const age=(now-new Date(x.saleDate).getTime())/86400000;if(Number.isFinite(age))score+=age<=180?20:age<=365?15:age<=548?8:0;return {...x,_verifyRank:score,_originalIndex:i}}).sort((a,b)=>b._verifyRank-a._verifyRank||a._originalIndex-b._originalIndex);
}
async function verifyWebCompDistances(subject,comps){
  const token=regridToken(),rows=rankWebCompsForVerification(subject,comps).slice(0,6);if(!token)return {comps:rows,diagnostic:{status:'not_configured',checked:0,verified:0}};
  if(!Number.isFinite(Number(subject?.latitude))||!Number.isFinite(Number(subject?.longitude)))return {comps:rows,diagnostic:{status:'no_subject_coordinates',checked:0,verified:0}};
  let checked=0,verified=0;for(const row of rows){
    try{const p=parseAddress(row.address);if(!p.houseNumber||!p.street)continue;const u=new URL('https://app.regrid.com/api/v2/parcels/address');u.searchParams.set('query',p.street);if(p.state)u.searchParams.set('path',`/us/${p.state.toLowerCase()}`);u.searchParams.set('limit','1');u.searchParams.set('return_geometry','false');u.searchParams.set('return_custom','false');u.searchParams.set('return_matched_buildings','false');u.searchParams.set('return_matched_addresses','false');u.searchParams.set('return_enhanced_ownership','false');u.searchParams.set('return_zoning','false');checked++;const j=await regridFetch(u,token),features=j?.parcels?.features||j?.features||[],pick=selectRegridFeature(features,row.address);if(pick.subject&&Number.isFinite(Number(pick.subject.latitude))&&Number.isFinite(Number(pick.subject.longitude))){row.distanceMiles=hav(subject.latitude,subject.longitude,pick.subject.latitude,pick.subject.longitude);row.distanceVerification='Regrid exact-address parcel coordinate';verified++;}}
    catch(e){row.distanceVerificationError=clean(e.message,120)}
  }
  return {comps:rows.map(({_verifyRank,_originalIndex,...x})=>x),diagnostic:{status:verified?'complete':'no_verified_distances',checked,verified,candidatesConsidered:Math.min(6,(comps||[]).length)}};
}
function resolveSubjectEvidence({mlsSubject=null,mlsSubjects=[],regridSubject=null,web=null,address}){
  const normalizedMls=[...(mlsSubjects||[])];if(mlsSubject&&!normalizedMls.includes(mlsSubject))normalizedMls.unshift(mlsSubject);
  const fields=['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType'],fieldEvidence={},webIdentity=webIdentitySources(web,address),identitySources=[...normalizedMls,regridSubject,...webIdentity].filter(Boolean).sort((a,b)=>(b.addressMatchScore||0)-(a.addressMatchScore||0)||evidenceTier(b)-evidenceTier(a)),identitySource=identitySources[0]||null;
  const subject={address,source:'Cross-checked evidence',sourceType:'Verified consensus',retrievedAt:nowIso()};
  if(identitySource){subject.address=identitySource.address||address;subject.city=identitySource.city||null;subject.state=identitySource.state||null;subject.postalCode=identitySource.postalCode||null;subject.parcelId=identitySource.parcelId||null;subject.llUuid=identitySource.llUuid||null;subject.latitude=identitySource.latitude??null;subject.longitude=identitySource.longitude??null;subject.sourceUpdatedAt=identitySource.sourceUpdatedAt||null}
  for(const field of fields){const resolved=resolveField(field,sourceEvidenceForField(field,normalizedMls,regridSubject,web));fieldEvidence[field]=resolved;subject[field]=resolved.value}
  const conflicts=Object.values(fieldEvidence).filter(x=>x.status==='conflicting'||x.status==='verified_with_conflict').map(x=>({field:x.field,status:x.status,selected:x.value,values:[...new Set((x.raw||[]).map(y=>y.value))],evidence:x.raw||[]}));
  const resolvedCore=fields.filter(f=>subject[f]!==null&&subject[f]!==undefined&&subject[f]!=='').length;
  const addressScore=Math.max(...identitySources.map(x=>Number(x.addressMatchScore)).filter(Number.isFinite),-Infinity),matched=Number.isFinite(addressScore)&&addressScore>=55&&identitySources.some(x=>addressMatchDetails(address,x).houseExact&&addressMatchDetails(address,x).streetRatio>=.8&&!addressMatchDetails(address,x).hardMismatch);
  const valuationCore=Boolean(subject.squareFootage&&subject.propertyType&&(subject.bedrooms!==null||subject.bathrooms!==null||subject.yearBuilt!==null));
  const confidence=matched&&resolvedCore>=4?'High':matched&&resolvedCore>=3?'Moderate':'Low';
  return {subject,fieldEvidence,conflicts,identity:{addressMatched:matched,addressMatchScore:Number.isFinite(addressScore)?addressScore:null,resolvedCoreFields:resolvedCore,confidence,sufficientForValuation:matched&&resolvedCore>=3&&valuationCore,sourceCount:identitySources.length,webIdentitySources:webIdentity.length}};
}

function dedupeComps(rows,subject){const seen=new Map();for(const x0 of rows||[]){const x={...x0};if(!x.salePrice||!x.address)continue;if(subject?.latitude&&subject?.longitude&&x.latitude&&x.longitude)x.distanceMiles=hav(subject.latitude,subject.longitude,x.latitude,x.longitude);const k=`${normText(x.address)}|${Math.round(Number(x.salePrice))}|${String(x.saleDate||'').slice(0,10)}`;if(!seen.has(k))seen.set(k,x);else{const prior=seen.get(k);prior.corroboratingSources=[...new Set([...(prior.corroboratingSources||[prior.source]),x.source].filter(Boolean))]}}return [...seen.values()]}
async function researchMlsSource(cfg,address,parsed){
  const started=Date.now();try{
    const clauses=[];if(parsed.street)clauses.push(`contains(tolower(UnparsedAddress),'${esc(parsed.street.toLowerCase())}')`);if(parsed.city)clauses.push(`tolower(City) eq '${esc(parsed.city.toLowerCase())}'`);if(parsed.state)clauses.push(`StateOrProvince eq '${esc(parsed.state.toUpperCase())}'`);
    const rows=await queryMls(cfg,clauses.join(' and '),20),subject=bestSubject(rows,address),comps=[];
    if(subject){const c=[];if(subject.city)c.push(`tolower(City) eq '${esc(subject.city.toLowerCase())}'`);if(subject.state)c.push(`StateOrProvince eq '${esc(subject.state.toUpperCase())}'`);c.push(`StandardStatus eq 'Closed'`);for(const x of await queryMls(cfg,c.join(' and '),100)){if(x.listingKey&&x.listingKey===subject.listingKey)continue;x.distanceMiles=hav(subject.latitude,subject.longitude,x.latitude,x.longitude);if(x.salePrice)comps.push(x)}}
    return {subject,comps,diagnostic:{status:subject?'matched':'no_subject_match',durationMs:elapsed(started),subjectRows:rows.length,closedSales:comps.length}};
  }catch(e){return {subject:null,comps:[],error:clean(e.name==='TimeoutError'?`Timed out after ${Math.round(MLS_TIMEOUT_MS/1000)} seconds.`:e.message,180),diagnostic:{status:'error',durationMs:elapsed(started),error:clean(e.message,140)}}}
}

async function researchFresh(address,{onProgress=null}={}){
  const intelligence=require('./dealIntelligence'),parsed=parseAddress(address),errors=[],sources=[],diagnostics={startedAt:nowIso(),stages:{}};
  const progress=async(phase,percent,message,detail=null)=>{if(typeof onProgress==='function')try{await onProgress({phase,progress:percent,message,detail})}catch{}};
  await progress('identity',8,'Resolving the exact property and checking deterministic records.');
  const mlsCfgs=configs();for(const cfg of mlsCfgs)sources.push({name:cfg.name,type:'Authorized MLS / RESO Web API'});if(regridToken())sources.push({name:'Regrid',type:'County / parcel records'});
  const deterministicStart=Date.now();
  const [regrid,mlsResults]=await Promise.all([
    (async()=>{try{return await researchRegrid(address)}catch(e){const error=clean(e.name==='TimeoutError'?`Timed out after ${Math.round(REGRID_TIMEOUT_MS/1000)} seconds.`:e.message,180);errors.push({source:'Regrid',error});return {configured:!!regridToken(),subject:null,candidates:[],error,diagnostic:{status:'error',error}}}})(),
    Promise.all(mlsCfgs.map(cfg=>researchMlsSource(cfg,address,parsed)))
  ]);
  diagnostics.stages.identity={durationMs:elapsed(deterministicStart),regrid:regrid.diagnostic||{status:'unknown'},mls:mlsResults.map((x,i)=>({name:mlsCfgs[i]?.name,status:x.diagnostic?.status||'unknown',durationMs:x.diagnostic?.durationMs||null,error:x.error||null}))};
  if(regrid.error)errors.push({source:'Regrid',error:regrid.error});for(let i=0;i<mlsResults.length;i++)if(mlsResults[i].error)errors.push({source:mlsCfgs[i].name,error:mlsResults[i].error});
  await progress('records',24,'Property identity checked. Collecting parcel and authorized listing evidence.',{regridStatus:regrid.diagnostic?.status||'unknown',regridCandidates:regrid.count||0});
  const mlsSubjects=mlsResults.map(x=>x.subject).filter(Boolean),deterministicComps=mlsResults.flatMap(x=>x.comps||[]);
  let nearby={configured:false,comps:[],diagnostic:{status:'not_run'}};
  if(regrid.subject){try{nearby=await researchRegridNearby(regrid.subject)}catch(e){const error=clean(e.name==='TimeoutError'?`Timed out after ${Math.round(REGRID_TIMEOUT_MS/1000)} seconds.`:e.message,180);errors.push({source:'Regrid nearby sales',error});nearby={configured:true,comps:[],diagnostic:{status:'error',error}}}}
  diagnostics.stages.nearbySales=nearby.diagnostic;
  await progress('nearby_sales',36,'Checking recorded nearby sales before spending on public-web research.',{recordedSales:nearby.comps?.length||0});
  deterministicComps.push(...(nearby.comps||[]));
  let resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:null,address}),comps=dedupeComps(deterministicComps,resolved.subject),compAnalysis=intelligence.analyzeComps(resolved.subject,comps);
  let needFacts=Object.values(resolved.fieldEvidence).some(x=>x.status!=='verified'&&x.status!=='verified_with_conflict');
  let needComps=!compAnalysis.valuationReady;
  let web={configured:!!process.env.OPENAI_API_KEY,skipped:true,facts:null,factEvidence:[],comps:[],sources:[],marketContext:[],diagnostic:{status:'not_needed'}},webFactPass=null,webCompPass=null;
  if(needFacts&&process.env.OPENAI_API_KEY){
    sources.push({name:'Better Web Research',type:'Public web search'});
    await progress('web_facts',48,'Cross-checking the exact address across public property and assessor sources.');
    try{webFactPass=await researchWeb(address,{needFacts:true,needComps:false,subject:resolved.subject});}
    catch(e){const timeout=e.name==='TimeoutError';const error=clean(timeout?`Subject web research exceeded ${Math.round(WEB_FACT_TIMEOUT_MS/1000)} seconds; deterministic evidence was preserved.`:e.message,180);errors.push({source:'Better Web Research · subject facts',error});webFactPass={configured:true,skipped:false,facts:null,factEvidence:[],comps:[],sources:[],marketContext:[],diagnostic:{status:'error',durationMs:null,error}}}
    web={...web,...webFactPass,skipped:false};
    resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:webFactPass,address});
    comps=dedupeComps(deterministicComps,resolved.subject);compAnalysis=intelligence.analyzeComps(resolved.subject,comps);needComps=!compAnalysis.valuationReady;
  }
  if(needComps&&process.env.OPENAI_API_KEY){
    if(!sources.some(x=>x.name==='Better Web Research'))sources.push({name:'Better Web Research',type:'Public web search'});
    await progress('web_comps',68,'Researching recent closed sales and validating comp details.');
    try{webCompPass=await researchWeb(address,{needFacts:false,needComps:true,subject:resolved.subject});const dv=await verifyWebCompDistances(resolved.subject,webCompPass.comps||[]);webCompPass.comps=dv.comps;webCompPass.diagnostic={...(webCompPass.diagnostic||{}),distanceVerification:dv.diagnostic};}
    catch(e){const timeout=e.name==='TimeoutError';const error=clean(timeout?`Sold-comp web research exceeded ${Math.round(WEB_COMP_TIMEOUT_MS/1000)} seconds; verified evidence was preserved.`:e.message,180);errors.push({source:'Better Web Research · sold comps',error});webCompPass={configured:true,skipped:false,facts:null,factEvidence:[],comps:[],sources:[],marketContext:[],diagnostic:{status:'error',durationMs:null,error}}}
  }
  const combinedWeb={configured:!!process.env.OPENAI_API_KEY,skipped:!webFactPass&&!webCompPass,factEvidence:[...(webFactPass?.factEvidence||[]),...(webCompPass?.factEvidence||[])],comps:[...(webFactPass?.comps||[]),...(webCompPass?.comps||[])],sources:[...new Set([...(webFactPass?.sources||[]),...(webCompPass?.sources||[])])],marketContext:[...(webFactPass?.marketContext||[]),...(webCompPass?.marketContext||[])],notes:[...(webFactPass?.notes||[]),...(webCompPass?.notes||[])]};
  diagnostics.stages.web={status:combinedWeb.skipped?'not_needed':((webFactPass?.diagnostic?.status==='error'||webCompPass?.diagnostic?.status==='error')?'partial':'complete'),subject: webFactPass?.diagnostic||{status:needFacts?'not_run':'not_needed'},comps:webCompPass?.diagnostic||{status:needComps?'not_run':'not_needed'},sourceCount:combinedWeb.sources.length};
  resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:combinedWeb,address});
  comps=dedupeComps([...deterministicComps,...combinedWeb.comps],resolved.subject);compAnalysis=intelligence.analyzeComps(resolved.subject,comps);
  await progress('validation',86,'Cross-checking conflicts, duplicates, recency, similarity, and the sold-comp gate.',{resolvedCoreFields:resolved.identity?.resolvedCoreFields||0,compCount:comps.length});
  diagnostics.stages.compGate={status:compAnalysis.valuationReady?'ready':'withheld',reviewed:compAnalysis.reviewed,selected:compAnalysis.selected.length,distanceVerified:compAnalysis.distanceVerifiedCount||0,confidence:compAnalysis.confidence,warnings:compAnalysis.warnings};
  diagnostics.finishedAt=nowIso();diagnostics.durationMs=new Date(diagnostics.finishedAt).getTime()-new Date(diagnostics.startedAt).getTime();
  const notice=[
    regrid.configured?(regrid.subject?'Regrid matched the exact property.':'Regrid was queried but no parcel passed Better’s exact-property checks.'):'Regrid is not configured.',
    mlsCfgs.length?`${mlsCfgs.length} authorized MLS / RESO source${mlsCfgs.length===1?' was':'s were'} queried.`:'No authorized MLS feed is configured.',
    nearby.comps?.length?`${nearby.comps.length} nearby Regrid recorded sale${nearby.comps.length===1?' was':'s were'} found.`:'No usable nearby Regrid recorded sales were found.',
    combinedWeb.skipped?'Public-web research was not needed.':diagnostics.stages.web.status==='complete'?'Public-web subject/comp research completed for the unresolved evidence.':'Public-web research completed only partially; verified deterministic evidence was preserved.',
    compAnalysis.valuationReady?'The sold-comp gate passed.':'The sold-comp gate did not pass, so Better will withhold a precise ARV.'
  ].join(' ');
  return {configured:sources.length>0,sourceCount:sources.length,sources,subject:resolved.subject,fieldEvidence:resolved.fieldEvidence,identity:resolved.identity,rawSubjects:{mls:mlsSubjects,regrid:regrid.subject||null,regridCandidates:regrid.candidates||[]},comps,compAnalysis,marketContext:combinedWeb.marketContext||[],webSources:combinedWeb.sources||[],conflicts:resolved.conflicts,errors,retrievedAt:nowIso(),notice,diagnostics};
}
async function research(address,opts={}){const key=cacheKey(address);if(inFlightResearch.has(key))return inFlightResearch.get(key);const p=researchFresh(address,opts).finally(()=>inFlightResearch.delete(key));inFlightResearch.set(key,p);return p}

module.exports={
  research,
  configuredSources:()=>{const a=configs().map(x=>({name:x.name,type:'Authorized MLS / RESO Web API'}));if(regridToken())a.push({name:'Regrid',type:'County / parcel records'});if(process.env.OPENAI_API_KEY)a.push({name:'Better Web Research',type:'Public web search'});return a},
  cacheKey,
  _norm:normMls,
  _parseAddress:parseAddress,
  _normRegrid:normRegrid,
  _researchRegrid:researchRegrid,
  _researchRegridNearby:researchRegridNearby,
  _verifyWebCompDistances:verifyWebCompDistances,
  _rankWebCompsForVerification:rankWebCompsForVerification,
  _selectRegridFeature:selectRegridFeature,
  _addressMatchScore:addressMatchScore,
  _addressMatchDetails:addressMatchDetails,
  _resolveField:resolveField,
  _resolveSubjectEvidence:resolveSubjectEvidence,
  _researchWeb:researchWeb,
  _dedupeComps:dedupeComps
};
