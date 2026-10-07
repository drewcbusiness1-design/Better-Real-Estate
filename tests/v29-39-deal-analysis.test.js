const assert=require('assert'),fs=require('fs'),ds=require('../dealSources'),di=require('../dealIntelligence');
assert.equal(ds._bathroomEvidenceTotal('Bathrooms: 3; Full bathrooms: 2; Half bathrooms: 1'),2.5);
assert.equal(ds._bathroomEvidenceTotal('2 full baths and 1 half bath'),2.5);
assert.equal(ds._bathroomEvidenceTotal('3 bathrooms'),null);
assert(ds._evidenceTextGrounded('bathrooms',2.5,'2 full baths and 1 half bath'));
assert(!ds._evidenceTextGrounded('bathrooms',3,'2 full baths and 1 half bath'));
const recent=new Date(Date.now()-60*86400000).toISOString().slice(0,10),other=new Date(Date.now()-55*86400000).toISOString().slice(0,10);
const row={address:'857 Jamestown Rd, East Windsor, NJ 08520',salePrice:407000,saleDate:recent,sourceUrl:'https://example.com/a',sourceKey:'a',squareFootage:1620,propertyType:'Townhouse'};
const disputed=di.analyzeComps({squareFootage:1796,propertyType:'Townhouse'},[row,{...row,saleDate:other,sourceUrl:'https://different.example/a',sourceKey:'b'}]);assert(disputed.selected.length===0);assert.equal(disputed.rejected,2);
(async()=>{const old=global.fetch,key=process.env.OPENAI_API_KEY;process.env.OPENAI_API_KEY='test-only';let bodies=[];try{
 const url='https://example.com/4-bennington';global.fetch=async(_,args)=>{bodies.push(JSON.parse(args.body));return {ok:true,json:async()=>({status:'completed',output:[{type:'web_search_call',action:{sources:[{url}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({factEvidence:[{field:'bathrooms',numberValue:3,textValue:null,subjectAddress:'4 Bennington Drive, East Windsor, NJ 08520',sourceUrl:url,sourceName:'Fixture',sourceKind:'real_estate_portal',pageTitle:'Fixture',evidenceText:'2 full baths and 1 half bath'}],soldComps:[],conditionEvidence:[],marketContext:[],notes:[]})}]}]})}};
 const r=await ds._researchWeb('4 Bennington Drive, East Windsor, NJ 08520',{needFacts:true,needComps:false});assert.equal(r.factEvidence[0].value,2.5);assert(bodies[0].max_output_tokens>=7000);assert.equal(bodies[0].text.format.schema.properties.factEvidence.maxItems,24);
 bodies=[];global.fetch=async(_,args)=>{bodies.push(JSON.parse(args.body));return {ok:true,json:async()=>({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({factEvidence:[],soldComps:[],conditionEvidence:[],marketContext:[],notes:[]})}]}]})}};
 const empty=await ds.research('100000 Unknown Road, Test City, ZZ 99999');assert.equal(bodies.length,2);assert(bodies.every(x=>x.instructions.includes('subject-facts-only pass')));assert(empty.limitations.some(x=>/Sold-comp expansion was skipped/.test(x.error)));
 }finally{global.fetch=old;if(key===undefined)delete process.env.OPENAI_API_KEY;else process.env.OPENAI_API_KEY=key;}console.log('v29.39 bathroom components, bounded complete output, disputed dates and unresolved-address cost guard: PASS');})().catch(e=>{console.error(e);process.exitCode=1});
