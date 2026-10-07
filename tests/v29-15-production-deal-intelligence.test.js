const assert=require('assert');
const fs=require('fs');
const ds=require('../dealSources');
const di=require('../dealIntelligence');
const pkg=require('../package.json');

assert.equal(pkg.version,'2.9.27');

// Production regression: directional words/abbreviations and Regrid context must not reject the real parcel.
const palestine={properties:{headline:'503 West Grand Prairie Street',context:{headline:'Palestine, IL',path:'/us/il/crawford/palestine'},score:96,ll_uuid:'parcel-503',fields:{
  ll_uuid:'parcel-503',address:'503 West Grand Prairie Street',scity:'Palestine',state2:'IL',szip:'62451',lat:38.999,lon:-87.612,
  num_bedrooms:4,num_bath:1,recrdareano:1132,yearbuilt:1900,usedesc:'Single Family'
}}};
const match=ds._addressMatchDetails('503 W Grand Prairie St, Palestine, IL 62451',ds._normRegrid(palestine));
assert(match.houseExact,'house number must match');
assert(match.streetRatio>=.95,'West/W and Street/St must normalize');
const pick=ds._selectRegridFeature([palestine],'503 W Grand Prairie St, Palestine, IL 62451');
assert(pick.subject,'Palestine regression property must pass exact-property identity');
assert.equal(pick.subject.llUuid,'parcel-503');
// Common paste formats without commas must resolve the same street/state/ZIP rather than treating city tokens as street tokens.
const noComma=ds._parseAddress('503 W Grand Prairie St Palestine IL 62451');
assert.equal(noComma.state,'IL');assert.equal(noComma.zip,'62451');assert.equal(noComma.street,'503 W Grand Prairie St');
assert(ds._addressMatchDetails('503 W Grand Prairie St Palestine IL 62451',ds._normRegrid(palestine)).streetRatio>=.95);
const saintLouis=ds._parseAddress('4242 Harris Ave Saint Louis MO 63115');
assert.equal(saintLouis.state,'MO');assert.equal(saintLouis.street,'4242 Harris Ave');

// Wrong property still loses even if returned first.
const wrong={properties:{headline:'503 W Grand Ave',context:{headline:'Palestine, IL'},score:99,fields:{address:'503 W Grand Ave',scity:'Palestine',state2:'IL',szip:'62451'}}};
const safe=ds._selectRegridFeature([wrong,palestine],'503 W Grand Prairie St, Palestine, IL 62451');
assert.equal(safe.subject.llUuid,'parcel-503');

// Default Regrid identity must be ONE ranked address call. Typeahead is Enterprise rescue only.
(async()=>{
  const oldFetch=global.fetch,oldToken=process.env.REGRID_API_TOKEN,oldTypeahead=process.env.REGRID_USE_TYPEAHEAD;
  process.env.REGRID_API_TOKEN='test-token';delete process.env.REGRID_USE_TYPEAHEAD;
  const calls=[];
  global.fetch=async (url)=>{calls.push(String(url));return {ok:true,status:200,json:async()=>({parcels:{features:[palestine]}})}};
  const r=await ds._researchRegrid('503 W Grand Prairie St, Palestine, IL 62451');
  assert(r.subject,'Regrid exact subject should resolve');
  assert.equal(calls.length,1,'normal identity must not spend Typeahead + UUID calls');
  assert(calls[0].includes('/api/v2/parcels/address'),'ranked address endpoint must be the default');
  assert(!calls[0].includes('typeahead'),'Typeahead must not run by default');
  global.fetch=oldFetch;if(oldToken===undefined)delete process.env.REGRID_API_TOKEN;else process.env.REGRID_API_TOKEN=oldToken;if(oldTypeahead===undefined)delete process.env.REGRID_USE_TYPEAHEAD;else process.env.REGRID_USE_TYPEAHEAD=oldTypeahead;

  // Hosted web-search evidence must be tied to an actually surfaced URL and the exact subject address.
  const oldApiKey=process.env.OPENAI_API_KEY,oldResearchModel=process.env.OPENAI_RESEARCH_MODEL;
  process.env.OPENAI_API_KEY='test-openai';delete process.env.OPENAI_RESEARCH_MODEL;
  let webRequestBody=null;
  global.fetch=async (_url,opts)=>{
    webRequestBody=JSON.parse(opts.body);
    const structured={factEvidence:[
      {field:'bedrooms',numberValue:3,textValue:null,subjectAddress:'503 West Grand Prairie Street, Palestine, IL 62451',sourceUrl:'https://county.example/property/503',sourceName:'County Assessor',sourceKind:'county_assessor',pageTitle:'503 W Grand Prairie St',evidenceText:'503 W Grand Prairie St — 3 bedrooms'},
      {field:'bathrooms',numberValue:2,textValue:null,subjectAddress:'999 Other St, Palestine, IL 62451',sourceUrl:'https://county.example/property/999',sourceName:'County Assessor',sourceKind:'county_assessor',pageTitle:'999 Other St',evidenceText:'999 Other St — 2 bathrooms'},
      {field:'yearBuilt',numberValue:1900,textValue:null,subjectAddress:'503 W Grand Prairie St, Palestine, IL 62451',sourceUrl:'https://invented.example/property/503',sourceName:'Invented',sourceKind:'other',pageTitle:'503 W Grand Prairie St',evidenceText:'Year built 1900'}
    ],conditionEvidence:[],soldComps:[],marketContext:[],notes:[]};
    return {ok:true,status:200,json:async()=>({output:[
      {type:'web_search_call',action:{type:'search',sources:[{type:'url',url:'https://county.example/property/503'}]}},
      {type:'message',content:[{type:'output_text',text:JSON.stringify(structured)}]}
    ]})};
  };
  const webEvidence=await ds._researchWeb('503 W Grand Prairie St, Palestine, IL 62451',{needFacts:true,needComps:false});
  assert.equal(webEvidence.factEvidence.length,1,'only surfaced-URL + exact-address web facts may survive');
  assert.equal(webEvidence.factEvidence[0].field,'bedrooms');
  assert.equal(webRequestBody.model,'gpt-5.6-luna','web research should default to Luna regardless of synthesis model');
  assert.equal(webRequestBody.reasoning.effort,'medium','background research may spend more reasoning effort to improve evidence quality');
  assert.equal(webRequestBody.tools[0].search_context_size,'high','background property research should use high search context for source inspection');
  assert.equal(webRequestBody.tools[0].external_web_access,true,'property research must use live web access');
  assert.equal(webRequestBody.tools[0].user_location.city,'Palestine');
  assert.equal(webRequestBody.tools[0].user_location.region,'IL');
  global.fetch=oldFetch;if(oldApiKey===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=oldApiKey;if(oldResearchModel===undefined)delete process.env.OPENAI_RESEARCH_MODEL;else process.env.OPENAI_RESEARCH_MODEL=oldResearchModel;

  // Single source is displayed as Recorded, never promoted as verified truth.
  let resolved=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:{...pick.subject,addressMatchScore:93},web:{factEvidence:[]}});
  assert.equal(resolved.subject.bedrooms,null);
  assert.equal(resolved.fieldEvidence.bedrooms.status,'recorded');
  assert.equal(resolved.fieldEvidence.bedrooms.recordedValue,4);

  // Multiple exact-address portals can establish Corroborated property truth, but never Verified truth by themselves.
  const portalOnly={factEvidence:[
    {field:'bedrooms',value:4,source:'Web · Portal A',sourceKey:'web:portal-a.example',sourceType:'Public web',sourceKind:'real_estate_portal',reliability:72,tier:2},
    {field:'bedrooms',value:4,source:'Web · Portal B',sourceKey:'web:portal-b.example',sourceType:'Public web',sourceKind:'real_estate_portal',reliability:72,tier:2}
  ]};
  const portalConsensus=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:null,web:portalOnly});
  assert.equal(portalConsensus.subject.bedrooms,4,'two independent exact-address portal sources should establish a corroborated value');
  assert.equal(portalConsensus.fieldEvidence.bedrooms.status,'corroborated');
  assert.equal(portalConsensus.fieldEvidence.bedrooms.verified,false);

  // Independent high-quality agreement verifies; a conflict is preserved/withheld unless consensus is strong enough.
  const countyWeb={factEvidence:[
    {field:'bedrooms',value:3,source:'Web · County Assessor',sourceKey:'web:county.example',sourceType:'Public web',sourceKind:'county_assessor',reliability:98,tier:4},
    {field:'bathrooms',value:2,source:'Web · County Assessor',sourceKey:'web:county.example',sourceType:'Public web',sourceKind:'county_assessor',reliability:98,tier:4}
  ]};
  resolved=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:{...pick.subject,addressMatchScore:93},web:countyWeb});
  assert.equal(resolved.subject.bedrooms,null,'one county source conflicting with Regrid must not be guessed');
  assert.equal(resolved.fieldEvidence.bedrooms.status,'conflicting');

  const corroborated={factEvidence:[
    ...countyWeb.factEvidence,
    {field:'bedrooms',value:3,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',sourceKind:'broker_listing',reliability:86,tier:3},
    {field:'bathrooms',value:2,source:'Web · Broker',sourceKey:'web:broker.example',sourceType:'Public web',sourceKind:'broker_listing',reliability:86,tier:3}
  ]};
  resolved=ds._resolveSubjectEvidence({address:'503 W Grand Prairie St, Palestine, IL 62451',regridSubject:{...pick.subject,addressMatchScore:93},web:corroborated});
  assert.equal(resolved.subject.bedrooms,3);
  assert.equal(resolved.subject.bathrooms,2);
  assert.equal(resolved.fieldEvidence.bedrooms.status,'verified_with_conflict');

  // Precise ARV requires usable CLOSED sales with real distance/recency evidence.
  const subject={squareFootage:1132,propertyType:'Single family',bedrooms:3,bathrooms:2,yearBuilt:1900};
  const today=new Date();const iso=d=>new Date(today.getTime()-d*86400000).toISOString().slice(0,10);
  let ca=di.analyzeComps(subject,[
    {address:'1 Comp St',salePrice:150000,saleDate:iso(90),distanceMiles:.4,squareFootage:1100,propertyType:'Single family',bedrooms:3,bathrooms:2,yearBuilt:1905},
    {address:'2 Comp St',salePrice:158000,saleDate:iso(150),distanceMiles:.7,squareFootage:1180,propertyType:'Single family',bedrooms:3,bathrooms:2,yearBuilt:1898},
    {address:'3 Comp St',salePrice:154000,saleDate:iso(210),distanceMiles:1.0,squareFootage:1150,propertyType:'Single family',bedrooms:3,bathrooms:2,yearBuilt:1910}
  ]);
  assert(ca.valuationReady,'three strong nearby recent closed sales should pass the gate');
  assert(ca.estimate>0);
  ca=di.analyzeComps(subject,[
    {address:'A Web Comp',salePrice:150000,saleDate:iso(90),distanceMiles:null,squareFootage:1100,propertyType:'Single family'},
    {address:'B Web Comp',salePrice:155000,saleDate:iso(120),distanceMiles:null,squareFootage:1150,propertyType:'Single family'},
    {address:'C Web Comp',salePrice:160000,saleDate:iso(160),distanceMiles:null,squareFootage:1200,propertyType:'Single family'}
  ]);
  assert.equal(ca.valuationReady,false,'unknown-distance web comps must not unlock precise ARV');
  assert.equal(ca.estimate,null);

  const server=fs.readFileSync('server.js','utf8'),app=fs.readFileSync('public/app.js','utf8'),sources=fs.readFileSync('dealSources.js','utf8'),ai=fs.readFileSync('ai.js','utf8'),netlify=fs.readFileSync('netlify.toml','utf8'),env=fs.readFileSync('.env.example','utf8');
  assert(server.includes('DEAL_RESEARCH_CACHE_VERSION = dealResearchCache.VERSION'),'fresh shared cache namespace required');
  const sharedCache=fs.readFileSync('dealResearchCache.js','utf8');assert(server.includes('DEAL_RESEARCH_MIN_REFRESH_MS = dealResearchCache.MIN_REFRESH_MS')&&sharedCache.includes('MIN_REFRESH_MS=30*60*1000'),'30-minute refresh protection required');
  assert(server.includes('Browser-supplied evidence is intentionally ignored'),'final valuation must be server-owned');
  assert(!server.includes("const evidence=(req.body?.evidence"),'final analysis must not trust browser evidence');
  assert(server.includes('cached.synthesis?.fingerprint===fp'),'unchanged evidence must reuse AI synthesis');
  assert(server.includes('newQualified=successfulAnalysis&&!wasQualified'),'same successful property must not consume another quota slot');
  assert(server.includes("'/api/deal-builder/diagnostics'"),'cached admin diagnostics endpoint required');
  assert(server.includes('regridCandidates:ev.rawSubjects?.regridCandidates||[]'),'diagnostics must expose cached Regrid match candidates without another provider call');
  assert(server.includes('if(newQualified){')&&server.includes('successfulAnalysis=Boolean(compAnalysis.valuationReady&&readyForAnalysis&&!synthesisDeferred)'),'reopening the same qualified property must not create duplicate analytics/quota events');
  assert(server.includes('DEAL_SYNTHESIS_FAILURE_COOLDOWN_MS = 30 * 60 * 1000')&&server.includes('evidenceOnlyDealAnalysis'),'AI synthesis failure must degrade to verified evidence instead of failing the whole request or burning retries');
  assert(server.includes('synthesisFailureRecorded'),'synthesis failures must be cached for a retry cooldown without consuming quota');
  assert(app.includes('const TUTORIAL_VERSION = 52;')&&app.includes("release:44,title:'Property research reliability'"),'tutorial v44 required for the retrieval correction');
  assert(app.includes("const r=await api('POST','/api/deal-builder/address',{address:address.value.trim()})"),'browser must not resend evidence');
  assert(app.includes("fe.status==='recorded'?['Recorded','recorded']")&&app.includes("fe.status==='corroborated'||fe.status==='corroborated_with_conflict'?['Corroborated','corroborated']"),'Recorded / Corroborated / Verified UX required');
  assert(app.includes("fe.status==='recorded'&&fe.recordedValue"),'single-source values must be visibly shown as Recorded while remaining excluded from verified valuation facts');
  assert(app.includes('AI synthesis unavailable — verified evidence/comp result preserved without consuming an analysis use'),'UI must surface graceful synthesis degradation');
  assert(app.includes("const calcArv=()=>workingArv"),'browser must not replace server ARV with naive average');
  assert(sources.includes("include:['web_search_call.action.sources']"),'web provenance list must be explicitly requested');
  assert(sources.includes("search_context_size:'high'"),'background property research needs high search context while remaining bounded');
  assert(sources.includes("process.env.OPENAI_RESEARCH_MODEL||'gpt-5.6-luna'"),'web extraction should default to the cost-sensitive research model independent of synthesis model');
  assert(sources.includes("reasoning:{effort:'medium'}"),'background property web research should use medium reasoning for better source discovery');
  assert(sources.includes('PRIMARY_PROPERTY_DOMAINS')&&sources.includes('subject-and-sold-comps-major-property-sites')&&sources.includes('subject-independent-property-and-public-record-sources'),'multi-source web research must deliberately target multiple property portals before expanding');
  assert(ai.includes('Server-verified evidence packet'),'AI must receive curated server evidence only');
  assert(netlify.includes('dealSources.js')&&netlify.includes('dealIntelligence.js'),'Deal Intelligence modules must ship with Netlify function');
  assert(env.includes('OPENAI_RESEARCH_MODEL=')&&env.includes('REGRID_USE_TYPEAHEAD=false'),'optional research controls must be documented');
  console.log('v29.15 production Deal Intelligence regression passed');
})().catch(e=>{console.error(e);process.exit(1)});
