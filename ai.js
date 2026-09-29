/* Server-side AI listing assistant. The API key never reaches the browser. */
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.6-luna';
const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');

function configured() { return !!OPENAI_API_KEY; }
function model() { return OPENAI_MODEL; }

function safeImageUrl(src) {
  const s = String(src || '').trim();
  if (!s) return null;
  if (/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(s)) return s;
  if (/^https:\/\//i.test(s)) return s;
  if (/^\//.test(s) && /^https?:\/\//i.test(APP_URL)) return APP_URL + s;
  return null;
}

function extractOutputText(payload) {
  for (const item of payload?.output || []) {
    for (const part of item?.content || []) {
      if (part?.type === 'output_text' && typeof part.text === 'string') return part.text;
    }
  }
  return '';
}

const schema = {
  type: 'object',
  additionalProperties: false,
  required: ['title','description','sellingPoints','categorySuggestion','warnings'],
  properties: {
    title: { type: 'string' },
    description: { type: 'string' },
    sellingPoints: { type: 'array', items: { type: 'string' }, maxItems: 6 },
    categorySuggestion: { type: 'string' },
    warnings: { type: 'array', items: { type: 'string' }, maxItems: 5 }
  }
};

async function generateListingCopy({ kind = 'shop', facts = {}, images = [], allowedCategories = [] }) {
  if (!configured()) throw new Error('AI listing assistant is not configured. Add OPENAI_API_KEY in Netlify.');

  const imageParts = (images || []).map(safeImageUrl).filter(Boolean).slice(0, 3)
    .map(image_url => ({ type: 'input_image', image_url, detail: 'low' }));

  const isProperty = kind === 'property';
  const isSupplier = kind === 'cj';
  const instructions = [
    'You are the listing-copy assistant for Better Real Estate.',
    'Write polished, concise marketplace copy using ONLY facts supported by the supplied structured data and visible images.',
    'Never invent dimensions, materials, brand, model, condition, warranty, certifications, compatibility, location, shipping speed, inventory, price, renovation details, or other specifications.',
    'If a fact is uncertain, omit it and optionally mention the uncertainty in warnings.',
    'Do not mention AI or that the copy was generated.',
    isSupplier ? 'Never mention CJ, CJdropshipping, dropshipping, supplier, wholesale source, warehouse platform, PID, VID, SKU, or internal sourcing.' : '',
    isProperty ? 'For real-estate copy, follow fair-housing-safe language: never mention or imply race, religion, sex, disability, familial status, national origin, protected classes, demographic makeup, "ideal" types of people, or steering language. Describe only the property and transaction facts.' : '',
    'The description should be useful, professional, and easy to scan. Do not use hype that cannot be substantiated.',
    `categorySuggestion must be one of these exact values when a list is provided: ${JSON.stringify(allowedCategories || [])}`,
    'Return only the requested structured fields.'
  ].filter(Boolean).join('\n');

  const body = {
    model: OPENAI_MODEL,
    instructions,
    input: [{
      role: 'user',
      content: [
        { type: 'input_text', text: `Listing type: ${kind}\nVerified facts:\n${JSON.stringify(facts, null, 2).slice(0, 12000)}` },
        ...imageParts
      ]
    }],
    text: {
      format: {
        type: 'json_schema',
        name: 'better_real_estate_listing_copy',
        schema,
        strict: true
      }
    },
    max_output_tokens: 1100
  };

  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = payload?.error?.message || `OpenAI request failed (${res.status}).`;
    throw new Error(msg.slice(0, 300));
  }
  const text = extractOutputText(payload);
  if (!text) throw new Error('AI returned no listing copy.');
  let parsed;
  try { parsed = JSON.parse(text); } catch { throw new Error('AI returned an unreadable listing draft.'); }
  parsed.title = String(parsed.title || '').trim().slice(0, 140);
  parsed.description = String(parsed.description || '').trim().slice(0, 2200);
  parsed.sellingPoints = Array.isArray(parsed.sellingPoints) ? parsed.sellingPoints.map(x => String(x).trim()).filter(Boolean).slice(0, 6) : [];
  parsed.warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(x => String(x).trim()).filter(Boolean).slice(0, 5) : [];
  parsed.categorySuggestion = String(parsed.categorySuggestion || '').trim();
  return parsed;
}


const dealImportSchema = {
  type: 'object', additionalProperties: false,
  required: ['address','city','propertyType','situation','asking','arv','rehab','beds','baths','sqft','year','timeline','notes','contractDeadline','warnings'],
  properties: {
    address: { type: 'string' }, city: { type: 'string' }, propertyType: { type: 'string' }, situation: { type: 'string' },
    asking: { anyOf: [{ type: 'number' }, { type: 'null' }] }, arv: { anyOf: [{ type: 'number' }, { type: 'null' }] }, rehab: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    beds: { anyOf: [{ type: 'number' }, { type: 'null' }] }, baths: { anyOf: [{ type: 'number' }, { type: 'null' }] }, sqft: { anyOf: [{ type: 'number' }, { type: 'null' }] }, year: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    timeline: { type: 'string' }, notes: { type: 'string' }, contractDeadline: { type: 'string' }, warnings: { type: 'array', items: { type: 'string' }, maxItems: 6 }
  }
};

async function generateDealImport(rawText) {
  if (!configured()) throw new Error('AI deal import is not configured.');
  const body = {
    model: OPENAI_MODEL,
    instructions: [
      'You extract a real-estate investment/wholesale listing from messy deal-marketing text for Better Real Estate.',
      'Use ONLY facts explicitly present in the text. Never invent numbers, condition, address, dates, occupancy, repairs or property characteristics.',
      'Normalize money into plain numeric dollar values. Normalize city into City, ST when the state is present.',
      'propertyType must be one of: Single family, Multi-family, Condo, Townhouse, Land, Mobile home, Commercial. Use Single family only if the text clearly indicates a house/SFR; otherwise leave propertyType as an empty string.',
      'For fields that are not provided, use empty string or null as appropriate.',
      'notes should preserve useful deal facts that do not have a dedicated field, but omit phone numbers, email addresses and marketing hype.',
      'contractDeadline should be YYYY-MM-DD only when an explicit deadline/date is present and unambiguous; otherwise empty string.',
      'Do not infer protected-class information or neighborhood demographics.'
    ].join('\n'),
    input: [{ role: 'user', content: [{ type: 'input_text', text: String(rawText || '').slice(0, 16000) }] }],
    text: { format: { type: 'json_schema', name: 'better_real_estate_deal_import', schema: dealImportSchema, strict: true } },
    max_output_tokens: 1200
  };
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST', headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body)
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((payload?.error?.message || `OpenAI request failed (${res.status}).`).slice(0, 300));
  const text = extractOutputText(payload);
  if (!text) throw new Error('AI returned no deal import.');
  let parsed; try { parsed = JSON.parse(text); } catch { throw new Error('AI returned an unreadable deal import.'); }
  parsed.warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(x => String(x).trim()).filter(Boolean).slice(0, 6) : [];
  return parsed;
}


const addressDealSchema = {
  type: 'object', additionalProperties: false,
  required: ['subject','arv','rehab','description','confidence','assumptions','warnings'],
  properties: {
    subject: { type:'object', additionalProperties:false, required:['formattedAddress','addressLine1','city','state','propertyType','bedrooms','bathrooms','squareFootage','yearBuilt'], properties:{
      formattedAddress:{type:'string'}, addressLine1:{type:'string'}, city:{type:'string'}, state:{type:'string'}, propertyType:{type:'string'},
      bedrooms:{anyOf:[{type:'number'},{type:'null'}]}, bathrooms:{anyOf:[{type:'number'},{type:'null'}]}, squareFootage:{anyOf:[{type:'number'},{type:'null'}]}, yearBuilt:{anyOf:[{type:'number'},{type:'null'}]}
    }},
    arv: { type:'object', additionalProperties:false, required:['estimate','low','high','precision'], properties:{estimate:{type:'number'},low:{type:'number'},high:{type:'number'},precision:{type:'string'}}},
    rehab: { type:'array', minItems:3, maxItems:3, items:{type:'object',additionalProperties:false,required:['key','label','estimate','perSqFt','scope'],properties:{key:{type:'string'},label:{type:'string'},estimate:{type:'number'},perSqFt:{type:'number'},scope:{type:'string'}}}},
    description:{type:'string'}, confidence:{type:'string'}, assumptions:{type:'array',items:{type:'string'},maxItems:8}, warnings:{type:'array',items:{type:'string'},maxItems:8}
  }
};

async function generateAddressDealAnalysis(address, evidence = null) {
  if (!configured()) throw new Error('AI Deal Builder is not configured. Add OPENAI_API_KEY in Netlify.');
  const cleanAddress = String(address || '').trim().slice(0, 300);
  if (cleanAddress.length < 8) throw new Error('Enter a complete property address.');
  const compAnalysis=evidence?.compAnalysis||{};
  const evidencePacket={
    subject:evidence?.subject||{},
    identity:evidence?.identity||{},
    fieldEvidence:evidence?.fieldEvidence||{},
    conflicts:evidence?.conflicts||[],
    selectedClosedComps:(compAnalysis.selected||[]).slice(0,8).map(c=>({address:c.address,salePrice:c.salePrice,adjustedSalePrice:c.adjustedSalePrice,saleDate:c.saleDate,distanceMiles:c.distanceMiles,squareFootage:c.squareFootage,bedrooms:c.bedrooms,bathrooms:c.bathrooms,yearBuilt:c.yearBuilt,propertyType:c.propertyType,similarity:c.similarity,source:c.source,reasons:c.reasons})),
    compResult:{estimate:compAnalysis.valuationReady?compAnalysis.estimate:compAnalysis.workingEstimate,low:compAnalysis.valuationReady?compAnalysis.low:compAnalysis.workingLow,high:compAnalysis.valuationReady?compAnalysis.high:compAnalysis.workingHigh,precision:compAnalysis.precision,confidence:compAnalysis.confidence,valuationReady:compAnalysis.valuationReady,indicativeReady:compAnalysis.indicativeReady,method:compAnalysis.method,warnings:compAnalysis.warnings||[]},
    rehabPlanning:evidence?.rehabAnalysis||null,
    conditionEvidence:(evidence?.conditionEvidence||[]).slice(0,6).map(x=>({summary:x.summary,source:x.source,sourceUrl:x.sourceUrl}))
  };
  const body = {
    model: OPENAI_MODEL,
    instructions: [
      'You are Better Real Estate’s final investor-analysis synthesis layer. The evidence engine has already completed source retrieval, property truth resolution, conflict handling, and closed-sale comp selection. Do not redo or override those steps.',
      'Treat ONLY evidencePacket.subject fields as verified subject-property facts. fieldEvidence/conflicts are audit context. Never select a disputed raw value yourself and never fill a null subject field from memory, assumptions, or general web knowledge.',
      'The selectedClosedComps list is the complete allowed comparable-sale set for this analysis. Never invent another comp, address, sale price, sale date, distance, source, or citation.',
      'Use evidencePacket.compResult as the valuation result. Do not independently change the ARV. If precision is working_range, describe it explicitly as a working evidence-backed ARV range rather than a precise valuation. Preserve the uncertainty.',
      'Use evidencePacket.rehabPlanning as the authoritative repair-planning scenarios. Do not replace its estimates with invented numbers. repair scenarios remain estimates, not inspection findings. Explain the recommended scenario and its evidence basis, and clearly state that actual condition can materially change repair cost.',
      'Write a concise professional property/deal description separating verified facts from estimates. Avoid protected-class/demographic language and unsupported neighborhood claims.',
      'confidence must be Low, Moderate, or High and should not exceed the compResult confidence.',
      'Return only the requested structured fields.'
    ].join('\n'),
    input: [{ role:'user', content:[{type:'input_text', text:`Property address: ${cleanAddress}\nServer-verified evidence packet: ${JSON.stringify(evidencePacket).slice(0,18000)}`}]}],
    text:{format:{type:'json_schema',name:'better_real_estate_address_deal_analysis',schema:addressDealSchema,strict:true}},
    max_output_tokens:1500
  };
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(60000)});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error((payload?.error?.message||`OpenAI request failed (${res.status}).`).slice(0,300));
  const text=extractOutputText(payload); if(!text) throw new Error('AI returned no property analysis.');
  let parsed; try{parsed=JSON.parse(text)}catch{throw new Error('AI returned an unreadable property analysis.');}
  parsed.provider='Better Real Estate AI'; parsed.generatedAt=new Date().toISOString(); parsed.comparables=[]; parsed.rent=null;
  return parsed;
}

module.exports = { configured, model, generateListingCopy, generateDealImport, generateAddressDealAnalysis, _extractOutputText: extractOutputText, _safeImageUrl: safeImageUrl };
