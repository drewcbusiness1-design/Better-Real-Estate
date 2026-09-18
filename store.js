/* =========================================================================
   store.js — data layer.

   Replaces the old db.json flat file with Postgres (Netlify DB / Neon).

   Each collection is a table of (id text primary key, data jsonb).
   loadDB() reads every collection; saveDB() upserts changed rows and
   deletes removed ones. That keeps the original handler code almost
   unchanged while getting real durability and safe concurrent access.

   Scaling note: loadDB() pulls the whole dataset on each request. That's
   fine into the low thousands of rows and is a massive improvement on a
   rewritten JSON file, but it is not the end state. When the feed gets
   slow, replace the hot paths (GET /api/feed, GET /api/shop/items) with
   targeted SQL queries — the tables are already normal Postgres tables,
   so you can query them directly without migrating anything.
   ========================================================================= */
/* Two drivers, chosen automatically:
   - Neon's HTTP driver in production (works from a Lambda cold start,
     no connection pool to exhaust)
   - node-postgres locally, so `npm start` works against any plain
     Postgres without needing Neon
   Both expose the same sql(text, params) call used below. */
let neon = null, Pool = null;
try { ({ neon } = require('@neondatabase/serverless')); } catch {}
try { ({ Pool } = require('pg')); } catch {}

const COLLECTIONS = [
  'users','listings','saves','follows','friendRequests','friendships','messages','ledger','unlocks',
  'shopItems','orders','offers','reviews','views','promotions','payouts',
  'alerts','tokens','suppliers','supplierOrders','reports','dealNotes'
];

const CONN = process.env.NETLIFY_DATABASE_URL || process.env.DATABASE_URL;

// Detect a live serverless deploy (Netlify Functions / AWS Lambda). In that
// environment the app's own folder is read-only — only /tmp is writable,
// and /tmp doesn't survive between requests anyway — so the local-file
// fallback below must never be used there. If it were, every signup would
// either crash outright or silently vanish a moment later.
const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

/* ---------------------------------------------------------------------
   LOCAL FALLBACK

   With no database configured, fall back to a JSON file on disk so the
   app runs immediately with `npm start` and you can click through every
   screen. This is development only, and only runs when IS_SERVERLESS is
   false. `npm run preflight` also fails the launch if you are still on
   it, as a second line of defense.
   --------------------------------------------------------------------- */
const FILE_MODE = !CONN && !IS_SERVERLESS;
const fsMod = require('fs');
const pathMod = require('path');
const FILE_PATH = pathMod.join(__dirname, 'db.local.json');

if (FILE_MODE) {
  console.warn('\n\x1b[33m[store] No database configured — using db.local.json for local development.\x1b[0m');
  console.warn('[store] This is fine for testing. Before deploying, set DATABASE_URL to a real Postgres connection string.\n');
}
if (!CONN && IS_SERVERLESS) {
  console.error('\n[store] FATAL: running on Netlify with no DATABASE_URL set.');
  console.error('[store] Site configuration → Environment variables → add DATABASE_URL');
  console.error('[store] with your Neon (or other Postgres) connection string, then redeploy.\n');
}
const isNeon = CONN && /neon\.tech|neon\.build/.test(CONN);
let sql = null;
if (CONN) {
  // Log which driver was picked and a masked version of the host only —
  // never the password — so a Functions log check can confirm the
  // connection string actually arrived and looks like it should,
  // without ever printing a credential anywhere.
  const masked = CONN.replace(/:\/\/([^:]+):[^@]+@/, '://$1:***@');
  console.log('[store] DATABASE_URL detected, using', isNeon ? 'Neon HTTP driver' : 'standard Postgres driver', '—', masked.split('@')[1] || '(host hidden)');
  if (isNeon && neon) {
    const q = neon(CONN);
    sql = (text, params) => (params ? q(text, params) : q(text));
  } else if (Pool) {
    const pool = new Pool({
      connectionString: CONN,
      ssl: /sslmode=require/.test(CONN) ? { rejectUnauthorized: false } : false,
      max: 3
    });
    sql = async (text, params) => (await pool.query(text, params)).rows;
  } else if (neon) {
    const q = neon(CONN);
    sql = (text, params) => (params ? q(text, params) : q(text));
  }
}

const tableFor = c => 'kv_' + c.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

let initPromise = null;
async function init() {
  if (!CONN && IS_SERVERLESS) {
    throw new Error("This site isn't fully set up yet — no database is connected. If you're the site owner: add a DATABASE_URL environment variable in Netlify (Site configuration → Environment variables) with a Postgres connection string, then redeploy.");
  }
  if (FILE_MODE) return;
  if (!sql) throw new Error('Database not configured. See store.js.');
  if (initPromise) return initPromise;
  initPromise = (async () => {
    for (const c of COLLECTIONS) {
      const t = tableFor(c);
      await sql(`CREATE TABLE IF NOT EXISTS ${t} (
        id text PRIMARY KEY,
        data jsonb NOT NULL,
        updated_at timestamptz NOT NULL DEFAULT now()
      )`);
    }
    // Indexes on the lookups that actually run on every request.
    await sql(`CREATE INDEX IF NOT EXISTS idx_users_email ON ${tableFor('users')} ((data->>'email'))`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_listings_owner ON ${tableFor('listings')} ((data->>'ownerId'))`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_tokens_token ON ${tableFor('tokens')} ((data->>'token'))`);
    await sql(`CREATE INDEX IF NOT EXISTS idx_saves_listing ON ${tableFor('saves')} ((data->>'listingId'))`);
  })();
  return initPromise;
}

// Rows without their own id get a stable synthetic one so upserts work.
let synthetic = 0;
function idOf(row, collection, index) {
  if (row.id) return String(row.id);
  if (collection === 'follows') return `${row.followerId}:${row.followingId}`;
  if (collection === 'tokens') return String(row.token);
  if (row.token) return String(row.token);
  return `${collection}_${index}_${++synthetic}`;
}

function fileLoad() {
  if (!fsMod.existsSync(FILE_PATH)) {
    const fresh = {}; COLLECTIONS.forEach(c => fresh[c] = []);
    fsMod.writeFileSync(FILE_PATH, JSON.stringify(fresh, null, 2));
    return fresh;
  }
  const db = JSON.parse(fsMod.readFileSync(FILE_PATH, 'utf8'));
  COLLECTIONS.forEach(c => { if (!db[c]) db[c] = []; });
  return db;
}

async function loadDB() {
  if (FILE_MODE) return fileLoad();
  await init();
  const db = {};
  await Promise.all(COLLECTIONS.map(async c => {
    const rows = await sql(`SELECT id, data FROM ${tableFor(c)}`);
    db[c] = rows.map(r => {
      const o = r.data;
      Object.defineProperty(o, '__id', { value: r.id, enumerable: false, writable: true });
      return o;
    });
  }));
  db.__snapshot = {};
  for (const c of COLLECTIONS) db.__snapshot[c] = new Set(db[c].map(o => o.__id));
  return db;
}

async function saveDB(db) {
  if (FILE_MODE) {
    const out = {};
    COLLECTIONS.forEach(c => out[c] = db[c] || []);
    fsMod.writeFileSync(FILE_PATH, JSON.stringify(out, null, 2));
    return;
  }
  await init();
  await Promise.all(COLLECTIONS.map(async c => {
    const rows = db[c] || [];
    const t = tableFor(c);
    const seen = new Set();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.__id || idOf(row, c, i);
      row.__id = id;
      seen.add(id);
      await sql(
        `INSERT INTO ${t} (id, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [id, JSON.stringify(row)]
      );
    }
    // Delete anything that was loaded but is no longer present.
    const before = db.__snapshot?.[c];
    if (before) {
      for (const oldId of before) {
        if (!seen.has(oldId)) await sql(`DELETE FROM ${t} WHERE id = $1`, [oldId]);
      }
    }
  }));
}

module.exports = { loadDB, saveDB, sql, init, COLLECTIONS, tableFor, FILE_MODE };
