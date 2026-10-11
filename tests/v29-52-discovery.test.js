const assert=require('assert'),fs=require('fs'),path=require('path');
const root=path.join(__dirname,'..');
const wrapper=require('../netlify/functions/api');
assert.equal(wrapper._normalise('/.netlify/functions/api/s/property/abc'),'/s/property/abc');
assert.equal(wrapper._normalise('/s/join'),'/s/join');
assert.equal(wrapper._normalise('/.netlify/functions/api/login'),'/api/login');
assert.equal(wrapper._normalise('/api/api/login'),'/api/login');
const xml=fs.readFileSync(path.join(root,'public/sitemap.xml'),'utf8');
const urls=[...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
assert.equal(new Set(urls).size,5);
for(const u of urls.filter(u=>u.includes('/guides/'))){
 const url=new URL(u);const html=fs.readFileSync(path.join(root,'public',url.pathname,'index.html'),'utf8');
 assert(html.includes(`rel="canonical" href="${u}"`));
 assert(!html.includes('meta-pixel.js'),'new public guides do not change tracking policy');
 const schema=JSON.parse(html.match(/<script type="application\/ld\+json">([^<]+)<\/script>/)[1]);
 assert.equal(schema.url,u);assert.equal(schema.publisher.name,'Better Real Estate');
 for(const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)"/g)){
  if(m[1]==='/')continue;
  const target=path.join(root,'public',m[1]);
  assert(fs.existsSync(target),`broken local guide link ${m[1]}`);
 }
}
assert(fs.readFileSync(path.join(root,'assets/BRE- Logo.png')).equals(fs.readFileSync(path.join(root,'public/guides/official-logo.png'))),'exact supplied logo preserved');
// Exercise the real serverless handler, not just the normalization helper.
wrapper.handler({httpMethod:'GET',path:'/.netlify/functions/api/s/property/does-not-exist-qa',headers:{host:'localhost'},queryStringParameters:{},body:null,isBase64Encoded:false},{})
.then(r=>{assert.equal(r.statusCode,404,'share route must reach Express, not the SPA shell');assert(r.body.includes('Property not found'));console.log('v29.52 real serverless share dispatch, canonical guide graph, structured data and exact logo: PASS');})
.catch(e=>{console.error(e);process.exitCode=1;});
