const assert=require('assert');const fs=require('fs');
const ds=require('../dealSources');
const r=ds._norm({ListingKey:'1',UnparsedAddress:'10 Main St',StandardStatus:'Closed',ClosePrice:250000,BedroomsTotal:3,BathroomsTotalInteger:2,LivingArea:1500,YearBuilt:1990,PropertyType:'Residential',Latitude:40,Longitude:-74,ModificationTimestamp:'2026-09-01T00:00:00Z'},'Test MLS');
assert.equal(r.source,'Test MLS');assert.equal(r.sourceType,'MLS / RESO');assert.equal(r.bedrooms,3);assert.equal(r.bathrooms,2);assert.equal(r.squareFootage,1500);assert.equal(r.salePrice,250000);assert.equal(r.status,'Closed');
assert.equal(ds.configuredSources().length,0);
const app=fs.readFileSync(require.resolve('../public/app.js'),'utf8');const server=fs.readFileSync(require.resolve('../server.js'),'utf8');const ai=fs.readFileSync(require.resolve('../ai.js'),'utf8');const env=fs.readFileSync(require.resolve('../.env.example'),'utf8');
assert.ok(app.includes('const TUTORIAL_VERSION = 69'));assert.ok(app.includes('Property evidence'));assert.ok(app.includes('Automatic property evidence'));assert.ok(server.includes("dealSources.research(address)"));assert.ok(server.includes('generateAddressDealAnalysis(address,evidence)'));assert.ok(ai.includes('Server-verified evidence packet'));assert.ok(env.includes('MLS_RESO_SOURCES_JSON='));
console.log('v29.10 authorized MLS intelligence regression passed');
