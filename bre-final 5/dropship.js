/* =========================================================================
   dropship.js — supplier catalog, pricing and order routing.

   HOW THIS WORKS
   1. You register a supplier (admin panel) with a default markup.
   2. You import their product rows. priceItem() applies markup and lands
      them in the shop, flagged `dropship: true`.
   3. When a customer buys one, routeOrder() creates a supplierOrder — a
      row in your fulfilment queue with the customer's shipping details
      and your cost. You place that order with the supplier and paste the
      tracking number back in.

   Step 3 is deliberately manual. Every supplier's API is different and
   several have none at all; a manual queue that always works beats an
   integration that silently drops orders. When you settle on one supplier
   and the volume justifies it, add an adapter under ADAPTERS below.

   WHAT ACTUALLY SELLS TO YOUR AUDIENCE
   Your users are rehabbers and landlords, which makes some categories
   great and others a trap:

   GOOD — light, boxable, parcel-shippable, predictable:
     lighting and fixtures, cabinet hardware, door hardware, smart-home
     (locks, thermostats, sensors), bath accessories, faucets, outlets and
     switch plates, LED strip, exterior/solar lighting.
     Margins here typically run 40-70% and shipping is a flat parcel rate.

   BAD — heavy, freight-class, high return cost:
     appliances, large furniture, vanities, tubs, flooring in quantity.
     A single freight return on a dishwasher can wipe out the profit from
     twenty fixture sales. Sell those from your own on-hand stock (the
     items you already have listed), not dropshipped.

   NEVER DROPSHIP without checking compliance first:
     anything electrical needs a UL/ETL listing to be legal to sell in the
     US, and importing uncertified electrical goods creates real liability
     if something burns. Ask every supplier for certification documents in
     writing and keep them. The same goes for anything gas, anything that
     touches potable water (needs NSF/ANSI 61 and lead-free certification
     under the Safe Drinking Water Act), and smoke/CO alarms.
   ========================================================================= */

const KINDS = [
  { id: 'manual',   label: 'Manual / spreadsheet', note: 'You paste a CSV or JSON of their catalog. Works with any supplier.' },
  { id: 'cj',       label: 'CJdropshipping',       note: 'Large catalog, no monthly fee, ships from China and some US warehouses. Best for small fixtures and smart home.' },
  { id: 'syncee',   label: 'Syncee',               note: 'Verified supplier marketplace with location filters. Good for finding US-stocked items.' },
  { id: 'dropcom',  label: 'DropCommerce',         note: 'North American suppliers, 2-7 day shipping. Higher cost, far fewer delivery complaints.' },
  { id: 'faire',    label: 'Faire',                note: 'Wholesale rather than dropship — you buy stock. Good margins on home goods if you can hold inventory.' },
  { id: 'local',    label: 'Local distributor',    note: 'A regional plumbing/electrical supply house. Often beats online dropship on price and lead time if you open a trade account.' }
];

const STATUSES = ['pending', 'ordered', 'shipped', 'delivered', 'cancelled', 'refunded'];

const CATEGORY_MAP = {
  light: 'Lighting', lamp: 'Lighting', bulb: 'Lighting', sconce: 'Lighting', chandelier: 'Lighting', pendant: 'Lighting',
  faucet: 'Plumbing', sink: 'Plumbing', shower: 'Plumbing', valve: 'Plumbing', drain: 'Plumbing',
  outlet: 'Electrical', switch: 'Electrical', breaker: 'Electrical', wire: 'Electrical',
  thermostat: 'HVAC', vent: 'HVAC', filter: 'HVAC',
  knob: 'Fixtures', pull: 'Fixtures', hinge: 'Fixtures', handle: 'Fixtures', lock: 'Fixtures',
  door: 'Doors & Windows', window: 'Doors & Windows',
  floor: 'Flooring', tile: 'Flooring', plank: 'Flooring',
  cabinet: 'Cabinets & Counters', counter: 'Cabinets & Counters',
  roof: 'Roofing', shingle: 'Roofing',
  drill: 'Tools', saw: 'Tools', tool: 'Tools'
};
const VALID_CATEGORIES = ['Appliances','HVAC','Plumbing','Electrical','Flooring','Doors & Windows','Lighting','Cabinets & Counters','Roofing','Tools','Fixtures','Other'];

function guessCategory(title = '') {
  const t = title.toLowerCase();
  for (const k in CATEGORY_MAP) if (t.includes(k)) return CATEGORY_MAP[k];
  return 'Other';
}

/** Round to a price that looks deliberate: .99 under $100, .00 above. */
function prettyPrice(cents) {
  if (cents < 10000) return Math.max(99, Math.round(cents / 100) * 100 - 1);
  return Math.round(cents / 500) * 500;
}

/**
 * Turn one supplier catalog row into a shop item.
 * Accepts loose field names because every supplier export is different.
 */
function priceItem(row, supplier) {
  const title = String(row.title || row.name || row.product_name || '').trim();
  if (!title) return null;

  const rawCost = row.cost ?? row.price ?? row.wholesale ?? row.wholesale_price;
  const costCents = Math.round(Number(rawCost) * 100);
  if (!costCents || costCents < 0) return null;

  const markup = Number(row.markupPercent ?? supplier.markupPercent ?? 60);
  const shipCents = Math.round(Number(row.shipping ?? row.ship_cost ?? 0) * 100);

  const base = (costCents + shipCents) * (1 + markup / 100);
  const retailCents = prettyPrice(Math.round(base));

  const category = VALID_CATEGORIES.includes(row.category) ? row.category : guessCategory(title);

  return {
    title: title.slice(0, 120),
    sku: String(row.sku || row.id || '').slice(0, 60),
    category,
    costCents: costCents + shipCents,
    retailCents,
    marginCents: retailCents - (costCents + shipCents),
    stock: Number(row.stock ?? row.quantity ?? 25),
    shipsFrom: row.shipsFrom || row.warehouse || row.country || null,
    description: String(row.description || '').slice(0, 1000)
  };
}

/**
 * Called when a dropship item is purchased. Creates the fulfilment record
 * you work from. Returns the supplierOrder object to push into the db.
 */
function routeOrder({ order, item, supplier, buyer, shipping, crypto }) {
  return {
    id: crypto.randomUUID(),
    orderId: order.id,
    supplierId: supplier ? supplier.id : null,
    supplierName: supplier ? supplier.name : 'Unassigned',
    supplierSku: item.supplierSku || null,
    title: item.title,
    qty: 1,
    costCents: item.cost || 0,
    chargedCents: item.price,
    buyerName: buyer.name,
    buyerEmail: buyer.email,
    shipping: shipping || null,
    status: 'pending',
    tracking: null,
    at: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

/* Adapters go here when you're ready to automate a specific supplier.
   Each should expose: fetchCatalog(credentials) and placeOrder(order).  */
const ADAPTERS = {};

module.exports = { KINDS, STATUSES, VALID_CATEGORIES, priceItem, guessCategory, routeOrder, prettyPrice, ADAPTERS };
