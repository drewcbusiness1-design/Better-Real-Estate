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
    arv: { type:'object', additionalProperties:false, required:['estimate','low','high'], properties:{estimate:{type:'number'},low:{type:'number'},high:{type:'number'}}},
    rehab: { type:'array', minItems:3, maxItems:3, items:{type:'object',additionalProperties:false,required:['key','label','estimate','perSqFt','scope'],properties:{key:{type:'string'},label:{type:'string'},estimate:{type:'number'},perSqFt:{type:'number'},scope:{type:'string'}}}},
    description:{type:'string'}, confidence:{type:'string'}, assumptions:{type:'array',items:{type:'string'},maxItems:8}, warnings:{type:'array',items:{type:'string'},maxItems:8}
  }
};

async function generateAddressDealAnalysis(address) {
  if (!configured()) throw new Error('AI Deal Builder is not configured. Add OPENAI_API_KEY in Netlify.');
  const clean = String(address || '').trim().slice(0, 300);
  if (clean.length < 8) throw new Error('Enter a complete property address.');
  const body = {
    model: OPENAI_MODEL,
    instructions: [
      'You are the Better Real Estate investor Deal Builder. The user supplies only a property address.',
      'Create a preliminary investor analysis: normalized address/property details when reasonably known, an estimated after-repair value range, three rehab planning scenarios, and a concise professional property/deal description.',
      'This is decision-support, not an appraisal, inspection, MLS record, or verified property report. Never claim that you looked up a public record, MLS record, comparable sale, or live market source unless such data was actually supplied; none is supplied here.',
      'When an exact property fact is not reliably known from the address/context, use null or an empty string rather than inventing it.',
      'ARV and rehab ARE requested estimates. They may be reasoned estimates, but must be conservative, internally consistent, and accompanied by assumptions/warnings. Do not fabricate named comparable properties or exact sale records.',
      'Rehab scenarios must be light, moderate, and heavy. If square footage is unknown, estimate total rehab conservatively without pretending a precise per-square-foot basis is verified.',
      'The description must avoid protected-class/demographic language and must distinguish estimated condition/value statements from known facts.',
      'confidence must be one of: Low, Moderate, High. With address-only input, use High only in exceptional cases.',
      'Return only the requested structured fields.'
    ].join('\n'),
    input: [{ role:'user', content:[{type:'input_text', text:`Property address: ${clean}`}]}],
    text:{format:{type:'json_schema',name:'better_real_estate_address_deal_analysis',schema:addressDealSchema,strict:true}},
    max_output_tokens:1800
  };
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{'Authorization':`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload=await res.json().catch(()=>({}));
  if(!res.ok) throw new Error((payload?.error?.message||`OpenAI request failed (${res.status}).`).slice(0,300));
  const text=extractOutputText(payload); if(!text) throw new Error('AI returned no property analysis.');
  let parsed; try{parsed=JSON.parse(text)}catch{throw new Error('AI returned an unreadable property analysis.');}
  parsed.provider='Better Real Estate AI'; parsed.generatedAt=new Date().toISOString(); parsed.comparables=[]; parsed.rent=null;
  return parsed;
}

module.exports = { configured, model, generateListingCopy, generateDealImport, generateAddressDealAnalysis, _extractOutputText: extractOutputText, _safeImageUrl: safeImageUrl };
