/* =========================================================================
   policy.js — marketplace rules enforced server-side.

   Two things live here:
     1. The electronics ban.
     2. Who is allowed to be an admin.

   Both are enforced in the API, not just the UI. A rule that only exists
   in the browser is not a rule — anyone can POST directly to the endpoint.
   ========================================================================= */

/* ------------------------------------------------------------------ *
   ELECTRONICS BAN

   Users may not sell electronics on Better Real Estate. Only admins can
   list electrical goods, and only through the dropship pipeline where
   certification documents have been collected from the supplier.

   Why this rule exists, so future-you doesn't quietly relax it:

   - Anything that plugs into mains power or runs on a battery needs a
     UL or ETL listing to be sold legally in the US. A private seller
     offloading a used dishwasher almost never has that paperwork.
   - If an uncertified item causes a fire or a shock injury, the platform
     that listed it gets named in the suit alongside the seller. "A user
     posted it" is a weaker defense than people assume, and it gets
     weaker the more the platform curates and promotes listings — which
     this one does, via the ranking algorithm and paid boosts.
   - Used electronics are the single highest category for returns,
     disputes and chargebacks in resale marketplaces. Each one costs
     money and support time.
   - Lithium batteries are a restricted hazardous material for shipping.
     Mis-declared battery shipments are a real fine, not a theoretical one.

   Admin dropship listings are exempt because they come from suppliers who
   have provided certification in writing, which is a documented condition
   of opening the supplier account.
 * ------------------------------------------------------------------ */

// Categories no ordinary user may list into.
const USER_BANNED_CATEGORIES = ['Appliances', 'Electrical', 'HVAC'];

// Words that indicate an electrical/electronic item regardless of category.
const ELECTRONICS_TERMS = [
  'refrigerator','fridge','freezer','dishwasher','washer','dryer','microwave',
  'oven','range','stove','cooktop','disposal','water heater','furnace',
  'air conditioner','ac unit','condenser','heat pump','mini split','hvac',
  'television','tv','monitor','laptop','computer','tablet','phone','speaker',
  'amplifier','receiver','camera','router','modem','console','playstation','xbox',
  'thermostat','smart lock','doorbell','alarm','detector','generator',
  'power tool','drill','saw','compressor','vacuum',
  'breaker','electrical panel','breaker panel','service panel','load center',
  'wiring','outlet','gfci','light fixture',
  'chandelier','sconce','lamp','led','bulb','ballast','transformer',
  'battery','lithium','charger','extension cord','surge protector','ups',
  'motor','pump','fan','exhaust fan','garbage disposal','electronic','electric','electrical'
];

// Phrases that are fine even though they contain a flagged word.
// Phrases that are fine even though they contain a flagged word. Checked
// before the ban list, so "six panel door" and "switch plate" pass.
const ALLOWED_EXCEPTIONS = [
  'light switch plate','switch plate','outlet cover','outlet plate','cover plate',
  'lamp shade','lampshade','non-electric','manual','hand tool',
  'wire shelf','wire basket','wire rack',
  'panel door','panel doors','raised panel','flat panel door','wainscot',
  'panel molding','shaker panel','six panel','6 panel','two panel','4 panel'
];

function scanForElectronics(text = '') {
  const t = ' ' + String(text).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ') + ' ';
  for (const ok of ALLOWED_EXCEPTIONS) if (t.includes(ok)) return null;
  for (const term of ELECTRONICS_TERMS) {
    if (t.includes(' ' + term + ' ') || t.includes(' ' + term + 's ')) return term;
  }
  return null;
}

/**
 * Returns an error string if this listing isn't allowed, or null if it is.
 * `isAdminDropship` bypasses the ban for certified supplier inventory.
 */
function checkShopItem({ title, description, category }, isAdminDropship = false) {
  if (isAdminDropship) return null;

  if (USER_BANNED_CATEGORIES.includes(category)) {
    return `Electronics and appliances can't be sold by users on Better Real Estate. The ${category} category is restricted because anything mains-powered needs UL/ETL certification to be sold legally, and we can't verify that on a private listing. Furniture, fixtures, hardware, flooring, doors, cabinets and hand tools are all welcome.`;
  }
  const hit = scanForElectronics(title) || scanForElectronics(description);
  if (hit) {
    return `This looks like an electrical or electronic item ("${hit}"), which users can't sell here. Anything mains-powered or battery-powered needs UL/ETL certification we have no way to verify on a private listing, and uncertified electrical goods are both illegal to sell and a genuine fire risk. If that's wrong, reword the listing so it's clear what the item actually is.`;
  }
  return null;
}

/* ------------------------------------------------------------------ *
   ADMIN ALLOWLIST

   Admin is granted only to email addresses in the ADMIN_EMAILS
   environment variable. Nobody can select "admin" at signup, and there
   is no in-app way to promote an account — so a database compromise or
   a bug in the signup route still can't mint an admin.

   Set in Netlify → Environment variables:
       ADMIN_EMAILS=drewcbusiness1@gmail.com

   Comma-separate for more than one. Changing it takes effect on the next
   request; no migration needed.
 * ------------------------------------------------------------------ */
function adminEmails() {
  return String(process.env.ADMIN_EMAILS || '')
    .split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function isAdminEmail(email) {
  const list = adminEmails();
  if (!list.length) return false;
  return list.includes(String(email || '').trim().toLowerCase());
}

/** Roles a person may actually choose when signing up. Note: no 'admin'. */
const SIGNUP_ROLES = ['buyer', 'seller'];

/** Resolve the role an account should have, ignoring anything user-supplied. */
function resolveRole(email, requestedRole) {
  if (isAdminEmail(email)) return 'admin';
  return SIGNUP_ROLES.includes(requestedRole) ? requestedRole : 'buyer';
}

module.exports = {
  checkShopItem, scanForElectronics, isAdminEmail, resolveRole,
  SIGNUP_ROLES, USER_BANNED_CATEGORIES, adminEmails
};
