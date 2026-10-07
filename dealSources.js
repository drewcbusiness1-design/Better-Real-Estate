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
const PRIMARY_PROPERTY_DOMAINS = ['zillow.com','realtor.com','redfin.com','homes.com','movoto.com','compass.com','remax.com','coldwellbanker.com','century21.com'];
const SECONDARY_PROPERTY_DOMAINS = ['trulia.com','realtor.com','redfin.com','homes.com','movoto.com','compass.com','remax.com','coldwellbanker.com','century21.com'];
const MAX_WEB_PASSES = 4;

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
function mlsBathroomTotal(r){const decimal=num(r.BathroomsTotalDecimal);if(decimal!==null)return decimal;const full=num(r.BathroomsFull),half=num(r.BathroomsHalf);if(full!==null&&half!==null)return full+half*.5;return num(r.BathroomsTotalInteger??r.BathroomsFull)}
function normMls(r,source){return {source,sourceKey:`mls:${normText(source)}`,sourceType:'MLS / RESO',sourceKind:'authorized_mls',verification:'authorized-listing-feed',listingKey:clean(r.ListingKey||r.ListingId||'',120)||null,address:clean(r.UnparsedAddress||[r.StreetNumber,r.StreetDirPrefix,r.StreetName,r.StreetSuffix,r.StreetDirSuffix].filter(Boolean).join(' '),250)||null,city:clean(r.City,100)||null,state:clean(r.StateOrProvince,40)||null,postalCode:clean(r.PostalCode,20)||null,status:clean(r.StandardStatus||r.MlsStatus,60)||null,listPrice:num(r.ListPrice),salePrice:num(r.ClosePrice),saleDate:r.CloseDate||null,bedrooms:num(r.BedroomsTotal),bathrooms:mlsBathroomTotal(r),squareFootage:num(r.LivingArea),lotSize:num(r.LotSizeSquareFeet),yearBuilt:num(r.YearBuilt),propertyType:clean(r.PropertyType||r.PropertySubType,100)||null,daysOnMarket:num(r.DaysOnMarket),remarks:clean(r.PublicRemarks,1200)||null,latitude:num(r.Latitude),longitude:num(r.Longitude),sourceUpdatedAt:r.ModificationTimestamp||null,retrievedAt:nowIso()}}
async function queryMls(cfg,filter,top=100){
  const base=cfg.base.replace(/\/$/,''),fields=['ListingKey','ListingId','UnparsedAddress','StreetNumber','StreetDirPrefix','StreetName','StreetSuffix','StreetDirSuffix','City','StateOrProvince','PostalCode','StandardStatus','MlsStatus','ListPrice','ClosePrice','CloseDate','BedroomsTotal','BathroomsTotalInteger','BathroomsFull','BathroomsHalf','LivingArea','LotSizeSquareFeet','YearBuilt','PropertyType','PropertySubType','DaysOnMarket','PublicRemarks','Latitude','Longitude','ModificationTimestamp'].join(','),u=new URL(base+'/Property');
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
async function regridFetch(url,token){
  // Regrid documents both token query authentication and x-regrid-token header authentication.
  // Send both server-side so account/proxy differences do not turn a valid token into a false 403.
  const u=url instanceof URL?new URL(url.toString()):new URL(String(url));
  if(token&&!u.searchParams.has('token'))u.searchParams.set('token',token);
  const r=await fetch(u,{headers:{Accept:'application/json','x-regrid-token':token},signal:AbortSignal.timeout(REGRID_TIMEOUT_MS)});
  if(!r.ok){let detail='';try{const j=await r.json();detail=clean(j?.message||j?.error||j?.detail||'',120)}catch{};const err=new Error(`Regrid returned ${r.status}${detail?`: ${detail}`:''}`);err.status=r.status;throw err}
  return r.json()
}
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
function webSources(payload){const urls=[];for(const item of payload?.output||[]){if(item?.type==='web_search_call')for(const s of item?.action?.sources||[])if(s?.url)urls.push(s.url);for(const c of item?.content||[])for(const a of c?.annotations||[])if(a?.url)urls.push(a.url)}return [...new Set(urls)]}
function canonicalUrl(v){try{const u=new URL(v);for(const k of [...u.searchParams.keys()])if(/^utm_|^(gclid|fbclid)$/i.test(k))u.searchParams.delete(k);u.searchParams.sort();return `${u.hostname.toLowerCase().replace(/^www\./,'')}${decodeURIComponent(u.pathname).replace(/\/$/,'')}${u.searchParams.size?'?'+u.searchParams.toString():''}`}catch{return ''}}
function urlWasActuallySearched(url,sources){const c=canonicalUrl(url);if(!c)return false;return (sources||[]).some(s=>canonicalUrl(s)===c)}
function evidenceSourceFamily(e){const k=String(e?.sourceKey||e?.source||'').toLowerCase();if(/zillow\.com|trulia\.com/.test(k))return 'portal:zillow-group';if(/realtor\.com/.test(k))return 'portal:realtor';if(/redfin\.com/.test(k))return 'portal:redfin';if(/homes\.com/.test(k))return 'portal:homes';return k||'unknown'}
function sourceFamilyForDomain(domain){return evidenceSourceFamily({sourceKey:`web:${String(domain||'').replace(/^www\./,'').toLowerCase()}`})}
function independentFactDomains(web){const seen=new Set((web?.factEvidence||[]).map(evidenceSourceFamily));const preferred=SECONDARY_PROPERTY_DOMAINS.filter(d=>!seen.has(sourceFamilyForDomain(d)));return preferred.length?preferred:SECONDARY_PROPERTY_DOMAINS}
function independentCompDomains(web){const seen=new Set((web?.comps||[]).map(x=>x.sourceFamily||evidenceSourceFamily(x)));const preferred=SECONDARY_PROPERTY_DOMAINS.filter(d=>!seen.has(sourceFamilyForDomain(d)));return preferred.length?preferred:SECONDARY_PROPERTY_DOMAINS}
function comparisonSubject(resolved){const subject={...(resolved?.subject||{})};for(const field of ['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType']){if(subject[field]!==null&&subject[field]!==undefined&&subject[field]!=='')continue;const fe=resolved?.fieldEvidence?.[field];if(fe?.status==='recorded'&&fe.recordedValue!==null&&fe.recordedValue!==undefined&&fe.recordedValue!=='')subject[field]=fe.recordedValue;}return subject}
function evidenceMoneyGrounded(value,text){const n=Number(value),raw=clean(text,420).replace(/,/g,'');if(!Number.isFinite(n)||!raw)return false;return [...raw.matchAll(/\b\d+(?:\.\d{1,2})?\b/g)].some(m=>Math.abs(Number(m[0])-n)<=Math.max(1,Math.abs(n)*.00001))}
function evidenceDateGrounded(value,text){
  const d=new Date(value),raw=normText(text);if(!Number.isFinite(d.getTime())||!raw)return false;
  const year=d.getUTCFullYear(),yy=String(year).slice(-2),month=d.getUTCMonth()+1,day=d.getUTCDate(),months=['january','february','march','april','may','june','july','august','september','october','november','december'],abbr=months[month-1].slice(0,3);
  const yearOk=raw.includes(String(year))||new RegExp(`(?:^|\\D)${yy}(?:\\D|$)`).test(raw);if(!yearOk)return false;
  const numericMdy=new RegExp(`\\b0?${month}[-/ .]0?${day}[-/ .](?:${year}|${yy})\\b`),numericDmy=new RegExp(`\\b0?${day}[-/ .]0?${month}[-/ .](?:${year}|${yy})\\b`),wordy=new RegExp(`\\b(?:${months[month-1]}|${abbr})\\s+0?${day}(?:st|nd|rd|th)?(?:\\s+|,\\s*)(?:${year}|${yy})\\b`),wordyReverse=new RegExp(`\\b0?${day}(?:st|nd|rd|th)?\\s+(?:${months[month-1]}|${abbr})(?:\\s+|,\\s*)(?:${year}|${yy})\\b`);
  return numericMdy.test(raw)||numericDmy.test(raw)||wordy.test(raw)||wordyReverse.test(raw);
}
function webReliability(kind){return ({county_assessor:98,public_record:92,broker_listing:86,real_estate_portal:72,other:55})[kind]||55}
function sourceTier(kind){return ({authorized_mls:4,county_assessor:4,public_record:3,broker_listing:3,real_estate_portal:2,other:1})[kind]||1}
function evidenceNumberGrounded(field,value,text){
  const raw=clean(text,320);if(!raw)return false;const n=Number(value);if(!Number.isFinite(n))return false;
  const nums=[...raw.replace(/,/g,'').matchAll(/\b\d+(?:\.\d+)?\b/g)].map(m=>Number(m[0])).filter(Number.isFinite);
  if(field==='squareFootage')return nums.some(x=>Math.abs(x-n)<=Math.max(2,n*.002));
  if(field==='yearBuilt')return nums.some(x=>Math.round(x)===Math.round(n));
  return nums.some(x=>Math.abs(x-n)<.01);
}
function bathroomEvidenceTotal(text){
  const raw=String(text||'').toLowerCase();
  const full=raw.match(/\bfull\s+(?:bathrooms?|baths?)\s*[:=]?\s*(\d+)\b/)||raw.match(/\b(\d+)\s+full\s+(?:bathrooms?|baths?)\b/)||raw.match(/\b(?:bathrooms?|baths?)\s+full\s*[:=]?\s*(\d+)\b/);
  const half=raw.match(/\b(?:half|1\/2)\s+(?:bathrooms?|baths?)\s*[:=]?\s*(\d+)\b/)||raw.match(/\b(\d+)\s+(?:half|1\/2)\s+(?:bathrooms?|baths?)\b/)||raw.match(/\b(?:bathrooms?|baths?)\s+(?:half|1\/2)\s*[:=]?\s*(\d+)\b/);
  if(full&&half)return Number(full[1])+Number(half[1])*.5;
  return null;
}
function evidenceTextGrounded(field,value,text){
  if(field==='bathrooms'&&bathroomEvidenceTotal(text)!==null)return Math.abs(Number(value)-bathroomEvidenceTotal(text))<.01;
  if(['lastSalePrice','annualTaxes','assessedValue','rentEstimate','currentListPrice'].includes(field))return evidenceMoneyGrounded(value,text);
  if(field==='lastSaleDate')return evidenceDateGrounded(value,text);
  if(field==='propertyType'){const a=normPropertyType(value),b=normPropertyType(text);return !!a&&!!b&&(b.includes(a)||a.includes(b)||(/single family/.test(a)&&/single.*family|detached|sfr/.test(normText(text))))}
  if(field==='parcelNumber')return normText(text).replace(/\s/g,'').includes(normText(value).replace(/\s/g,''));
  return evidenceNumberGrounded(field,value,text);
}
function compEvidenceGrounded(comp){
  const text=clean(comp?.evidenceText,420),p=parseAddress(comp?.address||'');if(!text||!p.houseNumber||!p.streetTokens.length)return false;
  const n=normText(text),streetHits=p.streetTokens.filter(t=>n.split(' ').includes(t)).length;
  const addressOk=n.includes(p.houseNumber)&&streetHits>=Math.min(2,p.streetTokens.length);
  const priceOk=evidenceMoneyGrounded(Number(comp.salePrice),text),dateOk=evidenceDateGrounded(comp.saleDate,text);
  return addressOk&&priceOk&&dateOk;
}
function distanceEvidenceGrounded(distance,text){if(distance===null||distance===undefined||distance==='')return false;const n=Number(distance);if(!Number.isFinite(n)||n<0||n>100)return false;const raw=clean(text,220).replace(/,/g,'');return [...raw.matchAll(/\b\d+(?:\.\d+)?\b/g)].some(m=>Math.abs(Number(m[0])-n)<.011)}
async function researchWeb(address,{needFacts=true,needComps=true,subject=null,allowedDomains=null,avoidDomains=[],passLabel='general',compSeeds=[]}={}){
  const key=clean(process.env.OPENAI_API_KEY,3000);if(!key||(!needFacts&&!needComps))return {configured:!!key,skipped:true,facts:null,factEvidence:[],conditionEvidence:[],comps:[],sources:[],marketContext:[],diagnostic:{status:key?'not_needed':'not_configured'}};
  const started=Date.now();
  const fieldEnum=['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType','lastSalePrice','lastSaleDate','lotSizeSqFt','annualTaxes','assessedValue','rentEstimate','currentListPrice','parcelNumber'];
  const schema={type:'object',additionalProperties:false,required:['factEvidence','conditionEvidence','soldComps','marketContext','notes'],properties:{
    factEvidence:{type:'array',maxItems:24,items:{type:'object',additionalProperties:false,required:['field','numberValue','textValue','subjectAddress','sourceUrl','sourceName','sourceKind','pageTitle','evidenceText'],properties:{field:{type:'string',enum:fieldEnum},numberValue:{anyOf:[{type:'number'},{type:'null'}]},textValue:{anyOf:[{type:'string'},{type:'null'}]},subjectAddress:{type:'string'},sourceUrl:{type:'string'},sourceName:{type:'string'},sourceKind:{type:'string',enum:['county_assessor','public_record','broker_listing','real_estate_portal','other']},pageTitle:{type:'string'},evidenceText:{type:'string'}}}},
    conditionEvidence:{type:'array',maxItems:8,items:{type:'object',additionalProperties:false,required:['subjectAddress','summary','sourceUrl','sourceName','sourceKind','evidenceText'],properties:{subjectAddress:{type:'string'},summary:{type:'string'},sourceUrl:{type:'string'},sourceName:{type:'string'},sourceKind:{type:'string',enum:['county_assessor','public_record','broker_listing','real_estate_portal','other']},evidenceText:{type:'string'}}}},
    soldComps:{type:'array',maxItems:16,items:{type:'object',additionalProperties:false,required:['address','salePrice','saleDate','bedrooms','bathrooms','squareFootage','yearBuilt','propertyType','distanceMiles','distressed','sourceUrl','sourceName','sourceKind','pageTitle','evidenceText','distanceEvidenceText'],properties:{address:{type:'string'},salePrice:{type:'number'},saleDate:{type:'string'},bedrooms:{anyOf:[{type:'number'},{type:'null'}]},bathrooms:{anyOf:[{type:'number'},{type:'null'}]},squareFootage:{anyOf:[{type:'number'},{type:'null'}]},yearBuilt:{anyOf:[{type:'number'},{type:'null'}]},propertyType:{anyOf:[{type:'string'},{type:'null'}]},distanceMiles:{anyOf:[{type:'number'},{type:'null'}]},distressed:{type:'boolean'},sourceUrl:{type:'string'},sourceName:{type:'string'},sourceKind:{type:'string',enum:['county_assessor','public_record','broker_listing','real_estate_portal','other']},pageTitle:{type:'string'},evidenceText:{type:'string'},distanceEvidenceText:{type:'string'}}}},
    marketContext:{type:'array',maxItems:10,items:{type:'object',additionalProperties:false,required:['address','status','price','sourceUrl'],properties:{address:{type:'string'},status:{type:'string'},price:{anyOf:[{type:'number'},{type:'null'}]},sourceUrl:{type:'string'}}}},notes:{type:'array',maxItems:8,items:{type:'string'}}}};
  const requested=[];if(needFacts)requested.push('Verify subject property facts and investor-relevant financial facts');if(needComps)requested.push('Find recent nearby CLOSED/SOLD comparable sales suitable for after-repair valuation');
  const parsedAddress=parseAddress(address),webTool={type:'web_search',search_context_size:'high',external_web_access:true};
  if(Array.isArray(allowedDomains)&&allowedDomains.length)webTool.filters={allowed_domains:[...new Set(allowedDomains)].slice(0,100)};
  if(parsedAddress.city||parsedAddress.state)webTool.user_location={type:'approximate',country:'US',...(parsedAddress.city?{city:parsedAddress.city}:{}),...(parsedAddress.state?{region:parsedAddress.state}:{})};
  const body={model:process.env.OPENAI_RESEARCH_MODEL||'gpt-5.6-luna',tools:[webTool],tool_choice:'required',reasoning:{effort:'medium'},include:['web_search_call.action.sources'],instructions:[
    'You are the production property-evidence researcher for Better Real Estate. Research ONLY the exact full address supplied. Accuracy, cross-source corroboration, and provenance matter more than speed.',
    `Research pass: ${passLabel}. Do not stop after the first usable page. Deliberately seek multiple independent exact-address sources when they exist.`,
    Array.isArray(avoidDomains)&&avoidDomains.length?`INDEPENDENCE TARGET: Prefer sources outside these already-seen domains/source families when credible alternatives exist: ${avoidDomains.slice(0,12).join(', ')}. Do not force a weaker source merely to be different.`:'',
    'Use the hosted public web-search tool only; do not scrape websites or bypass access controls. Run multiple targeted searches when needed and inspect the exact-address result, not only generic snippets.',
    needFacts?'SUBJECT SEARCH PLAN: search the exact quoted address repeatedly with targeted variants for beds baths sqft year built property type, tax/assessor/public record, current or recent listing, and last sale. Inspect exact-address pages from major real-estate portals, brokerage/listing pages, county/assessor/tax/public-record sources, and other credible surfaced pages. Seek at least two independent exact-address sources for each core fact when available and actively look for disagreement.':'Subject facts are already sufficiently established; do not spend search effort collecting them.',
    needComps?'COMP SEARCH PLAN: run multiple targeted searches for recent SOLD/CLOSED comparable properties near the subject, including exact-address sold pages and nearby sold/comparable tables on major real-estate portals and brokerage sites. Prefer the same property type, similar living area, nearby location, and sales within 18 months. Return several credible candidates rather than stopping at the first few. Exclude active/pending/list prices from ARV evidence. If candidate comp addresses are supplied below, deliberately search those exact addresses on independent sources to corroborate close price/date while also finding additional strong candidates.':'This is a subject-facts-only pass: return soldComps as an empty array. Do not search sold comps in this pass.',
    'Exact-property guard: every subject fact must clearly describe the exact house number + street and compatible city/state/ZIP. Never borrow facts from a neighbor, nearby comp, similarly named street, or generic market page.',
    needFacts?'PRIORITY: establish bedrooms, bathrooms, living area, year built and property type first. Use dedicated exact-address bedroom and bathroom searches. Finish core facts before optional taxes/rent/financial facts. Read the full and half bathroom breakdown in Facts & Features, not just the rounded headline. When a page says Bathrooms: 3, Full bathrooms: 2 and Half bathrooms: 1, return 2.5 and include both component counts in evidenceText. If a detailed breakdown is unavailable, preserve the reported count; never assume rounding.':'',
    'For every subject fact return ONE row per source per field. evidenceText must be a short source-grounding phrase that visibly contains the returned value (for example “4 beds”, “1,132 sqft”, “SingleFamily”, “$1,103 annual tax”). If the displayed evidence does not contain the value, omit the row.',
    'Keep the output compact: at most 24 fact rows; prioritize the five core fields across independent sources. Use short evidence phrases and omit optional financial fields until the core fields are covered.',
    'Return conflicts exactly as found. Never harmonize 3 beds into 4 beds, estimate square footage, infer year built, or silently choose one source over another.',
    'Condition evidence is separate from property facts. Return conditionEvidence only when an exact-address source explicitly describes condition/repairs such as full rehab, fixer, cleanout, cosmetic updates, roof/HVAC, fire/water damage, or renovated condition. Do not infer condition from price alone.',
    needComps?'For each sold comp, evidenceText must visibly contain the comp address plus closed/sold price AND the closed/sold date. Return distanceMiles ONLY if the consulted source explicitly displays that distance from the subject and put the matching phrase in distanceEvidenceText; otherwise return null. Mark distressed=true only when the source explicitly identifies foreclosure, auction, fixer/as-is, distressed, teardown or equivalent.':'',
    'Every sourceUrl must be a URL actually surfaced by web search. Prefer exact property pages over search/category pages.',
    'Do not invent coordinates, distances, values, repair scope, close prices, close dates, source URLs or citations. Return fewer rows rather than uncertain rows.'
  ].filter(Boolean).join('\n'),input:`Exact subject property: "${address}"\nRequested evidence: ${requested.join('; ')}${subject?`\nKnown subject context (search targeting only, not proof): ${JSON.stringify({bedrooms:subject.bedrooms,bathrooms:subject.bathrooms,squareFootage:subject.squareFootage,yearBuilt:subject.yearBuilt,propertyType:subject.propertyType})}`:''}${Array.isArray(compSeeds)&&compSeeds.length?`\nCandidate sold-comp addresses to corroborate on independent sources: ${compSeeds.slice(0,8).join(' | ')}`:''}\nReturn only evidence tied to URLs actually consulted by web search.`,text:{format:{type:'json_schema',name:'better_property_web_research',schema,strict:true}},max_output_tokens:needFacts?7000:6000};
  const r=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${key}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(needComps&&!needFacts?WEB_COMP_TIMEOUT_MS:WEB_FACT_TIMEOUT_MS)});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(`Web research failed (${r.status}): ${clean(j?.error?.message||'unknown error',180)}`);let parsed=null;try{parsed=JSON.parse(extractText(j))}catch{};const sources=webSources(j);if(!parsed)return {configured:true,facts:null,factEvidence:[],conditionEvidence:[],comps:[],sources,error:j.status==='incomplete'?`Property research output was incomplete (${j.incomplete_details?.reason||'unknown reason'}); earlier accepted facts are preserved.`:'Web research returned no structured evidence.',diagnostic:{status:j.status==='incomplete'?'incomplete_output':'no_structured_output',responseStatus:j.status||null,incompleteReason:j.incomplete_details?.reason||null,durationMs:elapsed(started),sourceCount:sources.length}};
  const factEvidence=(parsed.factEvidence||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources)).map(x=>{const match=addressMatchDetails(address,{address:x.subjectAddress});const value=x.field==='bathrooms'&&bathroomEvidenceTotal(x.evidenceText)!==null?bathroomEvidenceTotal(x.evidenceText):['propertyType','lastSaleDate','parcelNumber'].includes(x.field)?clean(x.textValue,120):num(x.numberValue);return {field:x.field,value,subjectAddress:clean(x.subjectAddress,250),source:`Web · ${clean(x.sourceName,80)||'source'}`,sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return clean(x.sourceName,80).toLowerCase()}})()}`,sourceType:'Public web',sourceKind:x.sourceKind,reliability:webReliability(x.sourceKind),tier:sourceTier(x.sourceKind),sourceUrl:x.sourceUrl,pageTitle:clean(x.pageTitle,180),evidenceText:clean(x.evidenceText,320),verification:'web-source-specific',addressMatchScore:match.score,retrievedAt:nowIso()}}).filter(x=>x.value!==null&&x.value!==undefined&&x.value!==''&&x.addressMatchScore>=60&&evidenceTextGrounded(x.field,x.value,x.evidenceText));
  const facts={};for(const f of factEvidence){if(facts[f.field]===undefined)facts[f.field]=f.value}
  const conditionEvidence=(parsed.conditionEvidence||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources)).map(x=>{const match=addressMatchDetails(address,{address:x.subjectAddress});return {summary:clean(x.summary,240),subjectAddress:clean(x.subjectAddress,250),source:`Web · ${clean(x.sourceName,80)||'source'}`,sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return 'unknown'}})()}`,sourceKind:x.sourceKind,sourceUrl:x.sourceUrl,evidenceText:clean(x.evidenceText,360),reliability:webReliability(x.sourceKind),addressMatchScore:match.score,retrievedAt:nowIso()}}).filter(x=>x.summary&&x.evidenceText&&x.addressMatchScore>=60);
  const comps=(parsed.soldComps||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources)&&compEvidenceGrounded(x)).map(x=>{const d=distanceEvidenceGrounded(x.distanceMiles,x.distanceEvidenceText)?Number(x.distanceMiles):null;return {...x,distanceMiles:d,distanceVerification:d!==null?'Source-reported exact comparable distance':null,source:`Web · ${clean(x.sourceName,80)||'source'}`,sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return 'unknown'}})()}`,sourceType:'Public web',sourceKind:x.sourceKind,sourceFamily:evidenceSourceFamily({sourceKey:`web:${(()=>{try{return new URL(x.sourceUrl).hostname.replace(/^www\./,'').toLowerCase()}catch{return 'unknown'}})()}`}),reliability:webReliability(x.sourceKind),verification:'web-corroborated',evidenceText:clean(x.evidenceText,420),distanceEvidenceText:clean(x.distanceEvidenceText,220),retrievedAt:nowIso()}});
  const marketContext=(parsed.marketContext||[]).filter(x=>urlWasActuallySearched(x.sourceUrl,sources));
  return {configured:true,facts,factEvidence,conditionEvidence,comps,marketContext,notes:parsed.notes||[],sources,error:null,diagnostic:{status:'complete',durationMs:elapsed(started),sourceCount:sources.length,factRows:factEvidence.length,returnedFactRows:(parsed.factEvidence||[]).length,rejectedFactRows:(parsed.factEvidence||[]).length-factEvidence.length,conditionRows:conditionEvidence.length,soldComps:comps.length,sourceReportedDistances:comps.filter(x=>x.distanceMiles!==null).length,mode:{needFacts,needComps},passLabel,domainFiltered:Boolean(allowedDomains&&allowedDomains.length)}};
}
function validFieldValue(field,value){if(value===null||value===undefined||value==='')return false;if(field==='bedrooms')return Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=20;if(field==='bathrooms')return Number.isFinite(Number(value))&&Number(value)>=0&&Number(value)<=20;if(field==='squareFootage')return Number.isFinite(Number(value))&&Number(value)>=200&&Number(value)<=50000;if(field==='yearBuilt')return Number.isFinite(Number(value))&&Number(value)>=1700&&Number(value)<=new Date().getFullYear()+1;if(field==='propertyType')return clean(value,100).length>1;return true}
function normPropertyType(v){const s=normText(v);if(/single.*family|detached|sfr/.test(s))return 'single family';if(/multi.*family|duplex|triplex|fourplex/.test(s))return 'multi family';if(/condo/.test(s))return 'condo';if(/town/.test(s))return 'townhouse';if(/mobile|manufactured/.test(s))return 'mobile home';if(/land|vacant/.test(s))return 'land';if(/commercial/.test(s))return 'commercial';return s}
function sameValue(field,a,b){if(field==='squareFootage'){const x=Number(a),y=Number(b);return Math.abs(x-y)<=Math.max(60,Math.max(x,y)*.04)}if(field==='bathrooms')return Math.abs(Number(a)-Number(b))<.26;if(field==='bedrooms'||field==='yearBuilt')return Number(a)===Number(b);if(field==='propertyType')return normPropertyType(a)===normPropertyType(b);return String(a)===String(b)}
function evidenceTier(e){if(Number(e?.tier)>0)return Number(e.tier);if(e?.sourceKind)return sourceTier(e.sourceKind);const r=Number(e?.reliability||0);return r>=95?4:r>=85?3:r>=70?2:1}
function evidenceLabel(e){return {source:e.source,sourceType:e.sourceType,sourceKind:e.sourceKind||null,sourceUrl:e.sourceUrl||e.sourceRecordUrl||null,value:e.value,reliability:e.reliability,tier:evidenceTier(e)}}
function resolveField(field,evidence){
  const items=evidence.filter(e=>validFieldValue(field,e.value));if(!items.length)return {field,value:null,recordedValue:null,status:'missing',confidence:'Low',sources:[],alternatives:[],raw:[]};
  const groups=[];for(const item of items){let g=groups.find(x=>sameValue(field,x.value,item.value));if(!g){g={value:item.value,items:[],weight:0,sourceKeys:new Set(),maxTier:0};groups.push(g)}g.items.push(item);g.weight+=item.reliability||50;g.sourceKeys.add(evidenceSourceFamily(item));g.maxTier=Math.max(g.maxTier,evidenceTier(item))}
  groups.sort((a,b)=>b.weight-a.weight||b.sourceKeys.size-a.sourceKeys.size||b.maxTier-a.maxTier);const win=groups[0],runner=groups[1],independent=win.sourceKeys.size;
  let verified=false,corroborated=false;
  // Strong record/feed/broker agreement is Verified. Three or more grounded exact-address portal
  // sources may establish a Corroborated value without pretending that syndicated portal data is a public record.
  if(!runner)verified=independent>=2&&win.maxTier>=3;
  else if(independent>=2&&win.maxTier>=3&&win.weight>=runner.weight*1.30)verified=true;
  else if(independent>=3&&win.maxTier>=3&&win.weight>=runner.weight*1.45)verified=true;
  if(!verified){if(!runner)corroborated=independent>=2&&win.maxTier>=2;else corroborated=independent>=3&&win.maxTier>=2&&win.weight>=runner.weight*1.50}
  const established=verified||corroborated,value=established?win.value:null,recordedValue=win.value;
  const status=verified?(runner?'verified_with_conflict':'verified'):corroborated?(runner?'corroborated_with_conflict':'corroborated'):(runner?'conflicting':'recorded');
  const confidence=verified?(independent>=3&&win.maxTier>=3?'High':'Moderate'):corroborated?'Moderate':'Low';
  return {field,value,recordedValue,status,confidence,sources:win.items.map(evidenceLabel),alternatives:groups.slice(1).map(g=>({value:g.value,sources:g.items.map(evidenceLabel)})),raw:items.map(evidenceLabel),independentSources:independent,winningTier:win.maxTier,verified,corroborated};
}

function resolveAuxiliaryFacts(web){
  const fields=['lastSalePrice','lastSaleDate','lotSizeSqFt','annualTaxes','assessedValue','rentEstimate','currentListPrice','parcelNumber'],out={};
  for(const field of fields){
    const rows=(web?.factEvidence||[]).filter(x=>x.field===field).map(x=>({value:x.value,source:x.source,sourceKey:x.sourceKey,sourceType:x.sourceType,sourceKind:x.sourceKind,sourceUrl:x.sourceUrl,reliability:x.reliability,tier:evidenceTier(x)}));
    if(!rows.length){out[field]={field,value:null,status:'missing',sources:[]};continue}
    const r=resolveField(field,rows);out[field]=r;
    // Auxiliary investor context may be shown as Recorded from one grounded exact-address source;
    // it is never promoted into core verified property truth unless corroborated by resolveField.
    if(r.value===null&&r.recordedValue!==null&&r.recordedValue!==undefined)out[field]={...r,value:r.recordedValue,status:r.status==='conflicting'?'conflicting':'recorded'};
  }
  return out;
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
  const token=regridToken(),rows=rankWebCompsForVerification(subject,comps).slice(0,8),already=rows.filter(x=>Number.isFinite(Number(x.distanceMiles))).length;if(!token)return {comps:rows,diagnostic:{status:already?'source_reported_only':'not_configured',checked:0,verified:already,sourceReported:already}};
  if(!Number.isFinite(Number(subject?.latitude))||!Number.isFinite(Number(subject?.longitude)))return {comps:rows,diagnostic:{status:'no_subject_coordinates',checked:0,verified:0}};
  let checked=0,verified=already;for(const row of rows){
    if(Number.isFinite(Number(row.distanceMiles)))continue;
    try{const p=parseAddress(row.address);if(!p.houseNumber||!p.street)continue;const u=new URL('https://app.regrid.com/api/v2/parcels/address');u.searchParams.set('query',p.street);if(p.state)u.searchParams.set('path',`/us/${p.state.toLowerCase()}`);u.searchParams.set('limit','1');u.searchParams.set('return_geometry','false');u.searchParams.set('return_custom','false');u.searchParams.set('return_matched_buildings','false');u.searchParams.set('return_matched_addresses','false');u.searchParams.set('return_enhanced_ownership','false');u.searchParams.set('return_zoning','false');checked++;const j=await regridFetch(u,token),features=j?.parcels?.features||j?.features||[],pick=selectRegridFeature(features,row.address);if(pick.subject&&Number.isFinite(Number(pick.subject.latitude))&&Number.isFinite(Number(pick.subject.longitude))){row.distanceMiles=hav(subject.latitude,subject.longitude,pick.subject.latitude,pick.subject.longitude);row.distanceVerification='Regrid exact-address parcel coordinate';verified++;}}
    catch(e){row.distanceVerificationError=clean(e.message,120)}
  }
  return {comps:rows.map(({_verifyRank,_originalIndex,...x})=>x),diagnostic:{status:verified?'complete':'no_verified_distances',checked,verified,sourceReported:already,candidatesConsidered:Math.min(8,(comps||[]).length)}};
}
function resolveSubjectEvidence({mlsSubject=null,mlsSubjects=[],regridSubject=null,web=null,address}){
  const normalizedMls=[...(mlsSubjects||[])];if(mlsSubject&&!normalizedMls.includes(mlsSubject))normalizedMls.unshift(mlsSubject);
  const fields=['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType'],fieldEvidence={},webIdentity=webIdentitySources(web,address),identitySources=[...normalizedMls,regridSubject,...webIdentity].filter(Boolean).sort((a,b)=>(b.addressMatchScore||0)-(a.addressMatchScore||0)||evidenceTier(b)-evidenceTier(a)),identitySource=identitySources[0]||null;
  const subject={address,source:'Cross-checked evidence',sourceType:'Verified consensus',retrievedAt:nowIso()};
  if(identitySource){subject.address=identitySource.address||address;subject.city=identitySource.city||null;subject.state=identitySource.state||null;subject.postalCode=identitySource.postalCode||null;subject.parcelId=identitySource.parcelId||null;subject.llUuid=identitySource.llUuid||null;subject.latitude=identitySource.latitude??null;subject.longitude=identitySource.longitude??null;subject.sourceUpdatedAt=identitySource.sourceUpdatedAt||null}
  for(const field of fields){const resolved=resolveField(field,sourceEvidenceForField(field,normalizedMls,regridSubject,web));fieldEvidence[field]=resolved;subject[field]=resolved.value}
  const conflicts=Object.values(fieldEvidence).filter(x=>['conflicting','verified_with_conflict','corroborated_with_conflict'].includes(x.status)).map(x=>({field:x.field,status:x.status,selected:x.value,values:[...new Set((x.raw||[]).map(y=>y.value))],evidence:x.raw||[]}));
  const resolvedCore=fields.filter(f=>subject[f]!==null&&subject[f]!==undefined&&subject[f]!=='').length,verifiedCore=fields.filter(f=>fieldEvidence[f]?.verified).length,corroboratedCore=fields.filter(f=>fieldEvidence[f]?.corroborated).length;
  const addressScore=Math.max(...identitySources.map(x=>Number(x.addressMatchScore)).filter(Number.isFinite),-Infinity),matched=Number.isFinite(addressScore)&&addressScore>=55&&identitySources.some(x=>addressMatchDetails(address,x).houseExact&&addressMatchDetails(address,x).streetRatio>=.8&&!addressMatchDetails(address,x).hardMismatch);
  const valuationCore=Boolean(subject.squareFootage&&subject.propertyType&&(subject.bedrooms!==null||subject.bathrooms!==null||subject.yearBuilt!==null));
  const confidence=matched&&verifiedCore>=4?'High':matched&&resolvedCore>=3?'Moderate':'Low';
  return {subject,fieldEvidence,auxiliaryFacts:resolveAuxiliaryFacts(web),conflicts,identity:{addressMatched:matched,addressMatchScore:Number.isFinite(addressScore)?addressScore:null,resolvedCoreFields:resolvedCore,verifiedCoreFields:verifiedCore,corroboratedCoreFields:corroboratedCore,confidence,sufficientForValuation:matched&&resolvedCore>=3&&valuationCore,sourceCount:identitySources.length,webIdentitySources:webIdentity.length}};
}

function dedupeComps(rows,subject){
  const seen=new Map();
  for(const x0 of rows||[]){
    const x={...x0};if(!x.salePrice||!x.address)continue;
    if(subject?.address){const m=addressMatchDetails(subject.address,{address:x.address});if(m.houseExact&&m.streetRatio>=.8&&!m.hardMismatch)continue;}
    if(subject?.latitude&&subject?.longitude&&x.latitude&&x.longitude)x.distanceMiles=hav(subject.latitude,subject.longitude,x.latitude,x.longitude);
    const k=`${normText(x.address)}|${Math.round(Number(x.salePrice))}|${String(x.saleDate||'').slice(0,10)}`;
    if(!seen.has(k)){
      x.corroboratingSources=[...new Set([x.source].filter(Boolean))];
      x.corroboratingSourceKeys=[...new Set([x.sourceKey].filter(Boolean))];
      x.corroboratingSourceFamilies=[...new Set([x.sourceFamily||evidenceSourceFamily(x)].filter(Boolean))];
      seen.set(k,x);
    }else{
      const prior=seen.get(k);
      prior.corroboratingSources=[...new Set([...(prior.corroboratingSources||[prior.source]),x.source].filter(Boolean))];
      prior.corroboratingSourceKeys=[...new Set([...(prior.corroboratingSourceKeys||[prior.sourceKey]),x.sourceKey].filter(Boolean))];
      prior.corroboratingSourceFamilies=[...new Set([...(prior.corroboratingSourceFamilies||[prior.sourceFamily||evidenceSourceFamily(prior)]),x.sourceFamily||evidenceSourceFamily(x)].filter(Boolean))];
      for(const f of ['distanceMiles','distanceVerification','squareFootage','bedrooms','bathrooms','yearBuilt','propertyType','latitude','longitude','evidenceText','sourceUrl'])if((prior[f]===null||prior[f]===undefined||prior[f]==='')&&(x[f]!==null&&x[f]!==undefined&&x[f]!==''))prior[f]=x[f];
      prior.distressed=Boolean(prior.distressed||x.distressed);
    }
  }
  return [...seen.values()];
}
async function researchMlsSource(cfg,address,parsed){
  const started=Date.now();try{
    const clauses=[];if(parsed.street)clauses.push(`contains(tolower(UnparsedAddress),'${esc(parsed.street.toLowerCase())}')`);if(parsed.city)clauses.push(`tolower(City) eq '${esc(parsed.city.toLowerCase())}'`);if(parsed.state)clauses.push(`StateOrProvince eq '${esc(parsed.state.toUpperCase())}'`);
    const rows=await queryMls(cfg,clauses.join(' and '),20),subject=bestSubject(rows,address),comps=[];
    if(subject){const c=[];if(subject.city)c.push(`tolower(City) eq '${esc(subject.city.toLowerCase())}'`);if(subject.state)c.push(`StateOrProvince eq '${esc(subject.state.toUpperCase())}'`);c.push(`StandardStatus eq 'Closed'`);for(const x of await queryMls(cfg,c.join(' and '),100)){if(x.listingKey&&x.listingKey===subject.listingKey)continue;x.distanceMiles=hav(subject.latitude,subject.longitude,x.latitude,x.longitude);if(x.salePrice)comps.push(x)}}
    return {subject,comps,diagnostic:{status:subject?'matched':'no_subject_match',durationMs:elapsed(started),subjectRows:rows.length,closedSales:comps.length}};
  }catch(e){return {subject:null,comps:[],error:clean(e.name==='TimeoutError'?`Timed out after ${Math.round(MLS_TIMEOUT_MS/1000)} seconds.`:e.message,180),diagnostic:{status:'error',durationMs:elapsed(started),error:clean(e.message,140)}}}
}

function combineWebResults(...passes){
  const valid=passes.filter(Boolean),seenFacts=new Set(),seenConditions=new Set(),seenComps=new Set();
  const facts=[],conditions=[],comps=[],marketContext=[];
  for(const w of valid){
    for(const x of w.factEvidence||[]){const k=`${x.field}|${x.sourceKey}|${String(x.value)}`;if(!seenFacts.has(k)){seenFacts.add(k);facts.push(x)}}
    for(const x of w.conditionEvidence||[]){const k=`${x.sourceKey}|${normText(x.summary)}|${canonicalUrl(x.sourceUrl)}`;if(!seenConditions.has(k)){seenConditions.add(k);conditions.push(x)}}
    for(const x of w.comps||[]){const k=`${normText(x.address)}|${Number(x.salePrice)||0}|${String(x.saleDate||'').slice(0,10)}|${x.sourceKey}`;if(!seenComps.has(k)){seenComps.add(k);comps.push(x)}}
    for(const x of w.marketContext||[])marketContext.push(x);
  }
  return {configured:valid.some(x=>x.configured),skipped:!valid.length,factEvidence:facts,conditionEvidence:conditions,comps,sources:[...new Set(valid.flatMap(x=>x.sources||[]))],marketContext,notes:valid.flatMap(x=>x.notes||[]),passes:valid.map(x=>x.diagnostic||{})};
}
function establishedCoreCount(resolved){return ['bedrooms','bathrooms','squareFootage','yearBuilt','propertyType'].filter(f=>['verified','verified_with_conflict','corroborated','corroborated_with_conflict'].includes(resolved?.fieldEvidence?.[f]?.status)).length}
function regridCoverageError(e){return Number(e?.status)===403&&/trial|coverage|included|area|plan/i.test(String(e?.message||''))}

async function researchFresh(address,{onProgress=null}={}){
  const intelligence=require('./dealIntelligence'),parsed=parseAddress(address),errors=[],limitations=[],sources=[],diagnostics={startedAt:nowIso(),stages:{},webPasses:0};
  const progress=async(phase,percent,message,detail=null)=>{if(typeof onProgress==='function')try{await onProgress({phase,progress:percent,message,detail})}catch{}};
  await progress('identity',6,'Searching the exact address across public property sources and authorized records.');
  const mlsCfgs=configs();for(const cfg of mlsCfgs)sources.push({name:cfg.name,type:'Authorized MLS / RESO Web API'});if(regridToken())sources.push({name:'Regrid',type:'Optional county / parcel records'});if(process.env.OPENAI_API_KEY)sources.push({name:'Better Web Research',type:'Multi-source public property research'});
  const deterministicStart=Date.now();
  const regridPromise=(async()=>{try{return await researchRegrid(address)}catch(e){if(regridCoverageError(e)){const note='Regrid coverage is unavailable for this address/account area; Better continued with public-web and authorized MLS evidence.';limitations.push({source:'Regrid',error:note});return {configured:true,subject:null,candidates:[],coverageUnavailable:true,diagnostic:{status:'coverage_unavailable',error:clean(e.message,160)}}}const error=clean(e.name==='TimeoutError'?`Timed out after ${Math.round(REGRID_TIMEOUT_MS/1000)} seconds.`:e.message,180);errors.push({source:'Regrid',error});return {configured:!!regridToken(),subject:null,candidates:[],error,diagnostic:{status:'error',error}}}})();
  const mlsPromise=Promise.all(mlsCfgs.map(cfg=>researchMlsSource(cfg,address,parsed)));
  const webPrimaryPromise=process.env.OPENAI_API_KEY?researchWeb(address,{needFacts:true,needComps:false,allowedDomains:PRIMARY_PROPERTY_DOMAINS,passLabel:'subject-core-property-facts-major-property-sites'}).catch(e=>({configured:true,skipped:false,factEvidence:[],conditionEvidence:[],comps:[],sources:[],marketContext:[],notes:[],diagnostic:{status:'error',error:clean(e.message,180)}})):Promise.resolve(null);
  const [regrid,mlsResults,webPrimary]=await Promise.all([regridPromise,mlsPromise,webPrimaryPromise]);
  if(webPrimary){diagnostics.webPasses++;if(webPrimary.error||webPrimary.diagnostic?.status==='error')errors.push({source:'Better Web Research · subject facts',error:clean(webPrimary.error||webPrimary.diagnostic.error,180)});}
  diagnostics.stages.identity={durationMs:elapsed(deterministicStart),regrid:regrid.diagnostic||{status:'unknown'},mls:mlsResults.map((x,i)=>({name:mlsCfgs[i]?.name,status:x.diagnostic?.status||'unknown',durationMs:x.diagnostic?.durationMs||null,error:x.error||null})),publicWeb:webPrimary?.diagnostic||{status:process.env.OPENAI_API_KEY?'not_run':'not_configured'}};
  for(let i=0;i<mlsResults.length;i++)if(mlsResults[i].error)errors.push({source:mlsCfgs[i].name,error:mlsResults[i].error});
  const mlsSubjects=mlsResults.map(x=>x.subject).filter(Boolean),deterministicComps=mlsResults.flatMap(x=>x.comps||[]);
  let combinedWeb=combineWebResults(webPrimary),resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:combinedWeb,address});
  await progress('facts',26,'Cross-checking beds, baths, living area, year built and property type across independent exact-address sources.',{establishedCore:establishedCoreCount(resolved),webSources:combinedWeb.sources.length,regridStatus:regrid.diagnostic?.status||'unknown'});
  let webSecondary=null;
  if(process.env.OPENAI_API_KEY&&(establishedCoreCount(resolved)<5||!resolved.identity?.addressMatched)&&diagnostics.webPasses<MAX_WEB_PASSES){
    const seenFactDomains=[...new Set((combinedWeb.factEvidence||[]).map(x=>String(x.sourceKey||'').replace(/^web:/,'')).filter(Boolean))];
    try{webSecondary=await researchWeb(address,{needFacts:true,needComps:false,allowedDomains:null,avoidDomains:seenFactDomains,passLabel:'subject-independent-property-and-public-record-sources'});diagnostics.webPasses++;}
    catch(e){errors.push({source:'Better Web Research · independent subject pass',error:clean(e.message,180)});}
    if(webSecondary?.error)errors.push({source:'Better Web Research · independent subject facts',error:clean(webSecondary.error,180)});
    combinedWeb=combineWebResults(webPrimary,webSecondary);resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:combinedWeb,address});
  }
  await progress('facts_resolved',40,'Property facts reconciled. Validating researched closed sales for valuation.',{establishedCore:establishedCoreCount(resolved),identityMatched:resolved.identity?.addressMatched,webSources:combinedWeb.sources.length});
  let nearby={configured:false,comps:[],diagnostic:{status:'not_run'}};
  if(regrid.subject){try{nearby=await researchRegridNearby(regrid.subject)}catch(e){if(regridCoverageError(e)){limitations.push({source:'Regrid nearby sales',error:'Regrid nearby-sale coverage is unavailable here; Better continued with public sold-comparable research.'});nearby={configured:true,comps:[],diagnostic:{status:'coverage_unavailable'}}}else{const error=clean(e.name==='TimeoutError'?`Timed out after ${Math.round(REGRID_TIMEOUT_MS/1000)} seconds.`:e.message,180);errors.push({source:'Regrid nearby sales',error});nearby={configured:true,comps:[],diagnostic:{status:'error',error}}}}}
  diagnostics.stages.nearbySales=nearby.diagnostic;deterministicComps.push(...(nearby.comps||[]));
  const subjectLocated=Boolean(resolved.identity?.addressMatched||Object.values(resolved.fieldEvidence||{}).some(x=>x.status==='recorded'||x.status==='verified'||x.status==='corroborated'));
  if(!subjectLocated)limitations.push({source:'Subject property search',error:'The exact address returned no property facts. Sold-comp expansion was skipped until the subject can be located. Confirm the full address or provide an exact-property source.'});
  let compSubject=comparisonSubject(resolved),comps=dedupeComps([...deterministicComps,...combinedWeb.comps],compSubject),compAnalysis=intelligence.analyzeComps(compSubject,comps),webCompDeep=null,webCompCorroborate=null;
  if(subjectLocated&&process.env.OPENAI_API_KEY&&!compAnalysis.valuationReady&&diagnostics.webPasses<MAX_WEB_PASSES){
    await progress('web_comps',58,'Expanding sold-comp research across brokerage, portal and public-record sources.');
    const seeds=rankWebCompsForVerification(compSubject,combinedWeb.comps).slice(0,8).map(x=>x.address).filter(Boolean);
    try{webCompDeep=await researchWeb(address,{needFacts:false,needComps:true,subject:compSubject,allowedDomains:null,passLabel:'sold-comps-local-brokers-public-records-secondary',compSeeds:seeds});diagnostics.webPasses++;}
    catch(e){errors.push({source:'Better Web Research · expanded sold-comps pass',error:clean(e.message,180)});}
    combinedWeb=combineWebResults(webPrimary,webSecondary,webCompDeep);resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:combinedWeb,address});compSubject=comparisonSubject(resolved);
    comps=dedupeComps([...deterministicComps,...combinedWeb.comps],compSubject);compAnalysis=intelligence.analyzeComps(compSubject,comps);
  }
  if(subjectLocated&&process.env.OPENAI_API_KEY&&!compAnalysis.valuationReady&&diagnostics.webPasses<MAX_WEB_PASSES&&combinedWeb.comps.length&&(!compAnalysis.indicativeReady||Number(compAnalysis.sourceDiversity||0)<2)){
    await progress('web_comps_corroborate',72,'Cross-checking the strongest sold comps on independent real-estate sources.');
    const seeds=rankWebCompsForVerification(compSubject,combinedWeb.comps).slice(0,8).map(x=>x.address).filter(Boolean),domains=independentCompDomains(combinedWeb);
    try{webCompCorroborate=await researchWeb(address,{needFacts:false,needComps:true,subject:compSubject,allowedDomains:domains,passLabel:'sold-comps-independent-corroboration',compSeeds:seeds});diagnostics.webPasses++;}
    catch(e){errors.push({source:'Better Web Research · independent comp corroboration',error:clean(e.message,180)});}
    combinedWeb=combineWebResults(webPrimary,webSecondary,webCompDeep,webCompCorroborate);resolved=resolveSubjectEvidence({mlsSubjects,regridSubject:regrid.subject,web:combinedWeb,address});compSubject=comparisonSubject(resolved);
    comps=dedupeComps([...deterministicComps,...combinedWeb.comps],compSubject);compAnalysis=intelligence.analyzeComps(compSubject,comps);
  }
  // Regrid distance verification is strictly optional. Never spend extra Regrid calls after a coverage failure.
  if(combinedWeb.comps.length&&regridToken()&&!regrid.coverageUnavailable&&regrid.diagnostic?.status!=='coverage_unavailable'&&Number.isFinite(Number(compSubject?.latitude))&&Number.isFinite(Number(compSubject?.longitude))){
    try{const dv=await verifyWebCompDistances(compSubject,combinedWeb.comps);combinedWeb.comps=dv.comps;diagnostics.stages.distanceVerification=dv.diagnostic;comps=dedupeComps([...deterministicComps,...combinedWeb.comps],compSubject);compAnalysis=intelligence.analyzeComps(compSubject,comps);}catch(e){limitations.push({source:'Comp distance verification',error:'Optional parcel-based distance verification was unavailable; source-reported distances and non-precise ARV rules were preserved.'})}
  }else diagnostics.stages.distanceVerification={status:'not_needed_or_unavailable'};
  await progress('validation',88,'Scoring sold comps, screening distressed/outlier sales, and building the investor-grade valuation.',{establishedCore:establishedCoreCount(resolved),compCount:comps.length,preciseArv:Boolean(compAnalysis.valuationReady),indicativeArv:Boolean(compAnalysis.indicativeReady)});
  diagnostics.stages.web={status:combinedWeb.passes.some(x=>x.status==='complete')?'complete':diagnostics.webPasses?'failed':'not_configured',passes:combinedWeb.passes,sourceCount:combinedWeb.sources.length};
  diagnostics.stages.compGate={status:compAnalysis.valuationReady?'precise_ready':compAnalysis.indicativeReady?'indicative_ready':'withheld',reviewed:compAnalysis.reviewed,selected:compAnalysis.selected.length,distanceVerified:compAnalysis.distanceVerifiedCount||0,sourceDiversity:compAnalysis.sourceDiversity||0,confidence:compAnalysis.confidence,warnings:compAnalysis.warnings};
  diagnostics.finishedAt=nowIso();diagnostics.durationMs=new Date(diagnostics.finishedAt).getTime()-new Date(diagnostics.startedAt).getTime();
  const notice=[
    regrid.coverageUnavailable?'Regrid is unavailable for this area, so it was treated as optional and did not block analysis.':regrid.subject?'Regrid contributed optional parcel evidence.':regrid.configured?'Regrid did not contribute a safe parcel match; public/MLS research continued normally.':'Regrid is not configured.',
    mlsCfgs.length?`${mlsCfgs.length} authorized MLS / RESO source${mlsCfgs.length===1?' was':'s were'} queried.`:'No authorized direct MLS feed is configured.',
    combinedWeb.sources.length?`${combinedWeb.sources.length} public-web source URL${combinedWeb.sources.length===1?' was':'s were'} consulted across ${diagnostics.webPasses} bounded research pass${diagnostics.webPasses===1?'':'es'}.`:'No usable public-web source was returned.',
    compAnalysis.valuationReady?'The precise sold-comp gate passed.':compAnalysis.indicativeReady?'A defensible working ARV range is available, but distance support is not strong enough to call it precise.':'Closed-sale evidence is still insufficient for a defensible ARV.'
  ].join(' ');
  const subjectMarket=(combinedWeb.marketContext||[]).filter(x=>addressMatchScore(address,{address:x.address})>=60).sort((a,b)=>Number(b.price||0)-Number(a.price||0))[0]||null;
  return {configured:sources.length>0,sourceCount:sources.length,sources,subject:resolved.subject,comparisonSubject:compSubject,fieldEvidence:resolved.fieldEvidence,auxiliaryFacts:resolved.auxiliaryFacts||{},identity:resolved.identity,rawSubjects:{mls:mlsSubjects,regrid:regrid.subject||null,regridCandidates:regrid.candidates||[]},comps,compAnalysis,conditionEvidence:combinedWeb.conditionEvidence||[],marketContext:combinedWeb.marketContext||[],marketSnapshot:subjectMarket?{status:subjectMarket.status||null,askingPrice:num(subjectMarket.price),sourceUrl:subjectMarket.sourceUrl||null}:null,webSources:combinedWeb.sources||[],conflicts:resolved.conflicts,errors,limitations,retrievedAt:nowIso(),notice,diagnostics};
}
async function research(address,opts={}){const key=cacheKey(address);if(inFlightResearch.has(key))return inFlightResearch.get(key);const p=researchFresh(address,opts).finally(()=>inFlightResearch.delete(key));inFlightResearch.set(key,p);return p}

module.exports={
  research,
  configuredSources:()=>{const a=configs().map(x=>({name:x.name,type:'Authorized MLS / RESO Web API'}));if(regridToken())a.push({name:'Regrid',type:'Optional county / parcel records'});if(process.env.OPENAI_API_KEY)a.push({name:'Better Web Research',type:'Multi-source public property research'});return a},
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
  _bathroomEvidenceTotal:bathroomEvidenceTotal,
  _evidenceTextGrounded:evidenceTextGrounded,
  _compEvidenceGrounded:compEvidenceGrounded,
  _evidenceDateGrounded:evidenceDateGrounded,
  _urlWasActuallySearched:urlWasActuallySearched,
  _dedupeComps:dedupeComps,
  _comparisonSubject:comparisonSubject,
  _independentFactDomains:independentFactDomains,
  _independentCompDomains:independentCompDomains
};
