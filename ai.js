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



const propertyAnalysisSchema = {
  type:'object', additionalProperties:false,
  required:['estimatedArv','arvRangeLow','arvRangeHigh','estimatedRehabLow','estimatedRehabHigh','estimatedRentLow','estimatedRentHigh','confidence','summary','risks','comps','sources','disclaimer'],
  properties:{
    estimatedArv:{anyOf:[{type:'number'},{type:'null'}]}, arvRangeLow:{anyOf:[{type:'number'},{type:'null'}]}, arvRangeHigh:{anyOf:[{type:'number'},{type:'null'}]},
    estimatedRehabLow:{anyOf:[{type:'number'},{type:'null'}]}, estimatedRehabHigh:{anyOf:[{type:'number'},{type:'null'}]}, estimatedRentLow:{anyOf:[{type:'number'},{type:'null'}]}, estimatedRentHigh:{anyOf:[{type:'number'},{type:'null'}]},
    confidence:{type:'string',enum:['low','medium','high']}, summary:{type:'string'},
    risks:{type:'array',items:{type:'string'},maxItems:8},
    comps:{type:'array',maxItems:6,items:{type:'object',additionalProperties:false,required:['address','salePrice','saleDate','reason'],properties:{address:{type:'string'},salePrice:{anyOf:[{type:'number'},{type:'null'}]},saleDate:{type:'string'},reason:{type:'string'}}}},
    sources:{type:'array',items:{type:'string'},maxItems:8}, disclaimer:{type:'string'}
  }
};
async function analyzeProperty(facts={}) {
  if (!configured()) throw new Error('AI property analysis is not configured. Add OPENAI_API_KEY in Netlify.');
  const body={model:OPENAI_MODEL,
    instructions:[
      'You are Better Real Estate property analysis. Research the exact US property using current public web information when available.',
      'Estimate ARV from recent comparable SOLD properties, not active asking prices. Prefer same neighborhood, similar property type, size, bed/bath and recent sales.',
      'Never fabricate a comparable sale, sale price, date, property fact or source. If evidence is insufficient, return null estimates and low confidence.',
      'Rehab and rent are preliminary ranges only. Use supplied condition facts when present and clearly state uncertainty.',
      'Do not provide legal, appraisal, inspection or investment guarantees. Keep the summary concise and useful to an investor.'
    ].join('\n'),
    tools:[{type:'web_search'}],
    input:[{role:'user',content:[{type:'input_text',text:'Property facts supplied by user/listing:\n'+JSON.stringify(facts,null,2).slice(0,12000)}]}],
    text:{format:{type:'json_schema',name:'better_real_estate_property_analysis',schema:propertyAnalysisSchema,strict:true}}, max_output_tokens:2200
  };
  const res=await fetch('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const payload=await res.json().catch(()=>({})); if(!res.ok) throw new Error((payload?.error?.message||`OpenAI request failed (${res.status}).`).slice(0,300));
  const text=extractOutputText(payload); if(!text) throw new Error('AI returned no property analysis.');
  try{return JSON.parse(text)}catch{throw new Error('AI returned an unreadable property analysis.');}
}

module.exports = { configured, model, generateListingCopy, generateDealImport, analyzeProperty, _extractOutputText: extractOutputText, _safeImageUrl: safeImageUrl };
