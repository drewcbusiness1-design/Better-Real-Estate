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
  'users','companies','companyInvites','listings','saves','follows','friendRequests','friendships','messages','ledger','unlocks',
  'shopItems','orders','offers','reviews','views','promotions','payouts',
  'alerts','tokens','suppliers','supplierOrders','reports','dealNotes','buyerLeads','emailBroadcasts','membershipGrants','shareEvents','buyerCrm','dealAnalyses',
  'activityEvents','savedSearches','pipelineDeals','dealDocuments','dealCalendarEvents','dealNotifications','feedFeedback','referralClicks',
  'relationshipContacts','dealTasks','dealActivity','fileRequests','buyerCredentials','compBoards','dealCollaborators','dealOutcomes','intakeSubmissions','affiliateApplications','affiliateClicks','affiliateCommissions','affiliateTerms','founderAwards','dealResearchCache','dealResearchJobs'
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
    // A cold Netlify function used to run 50+ sequential CREATE TABLE calls
    // before serving a request. Discover the existing schema once, create only
    // genuinely missing collections, and build the few hot indexes in parallel.
    const existingRows = await sql(`SELECT tablename FROM pg_tables WHERE schemaname = 'public'`);
    const existing = new Set((existingRows || []).map(r => r.tablename));
    const missing = COLLECTIONS.filter(c => !existing.has(tableFor(c)));
    if (missing.length) {
      await Promise.all(missing.map(c => {
        const t = tableFor(c);
        return sql(`CREATE TABLE IF NOT EXISTS ${t} (
          id text PRIMARY KEY,
          data jsonb NOT NULL,
          updated_at timestamptz NOT NULL DEFAULT now()
        )`);
      }));
    }
    const indexRows = await sql(`SELECT indexname FROM pg_indexes WHERE schemaname = 'public'`);
    const existingIndexes = new Set((indexRows || []).map(r => r.indexname));
    const indexSql = [];
    if(!existingIndexes.has('idx_users_email')) indexSql.push(sql(`CREATE INDEX IF NOT EXISTS idx_users_email ON ${tableFor('users')} ((data->>'email'))`));
    if(!existingIndexes.has('idx_listings_owner')) indexSql.push(sql(`CREATE INDEX IF NOT EXISTS idx_listings_owner ON ${tableFor('listings')} ((data->>'ownerId'))`));
    if(!existingIndexes.has('idx_tokens_token')) indexSql.push(sql(`CREATE INDEX IF NOT EXISTS idx_tokens_token ON ${tableFor('tokens')} ((data->>'token'))`));
    if(!existingIndexes.has('idx_saves_listing')) indexSql.push(sql(`CREATE INDEX IF NOT EXISTS idx_saves_listing ON ${tableFor('saves')} ((data->>'listingId'))`));
    if(indexSql.length) await Promise.all(indexSql);
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
  const db = {}; COLLECTIONS.forEach(c => { db[c] = []; });
  // One database round trip instead of one SELECT per collection. This is the
  // hot-path fix for intermittent multi-second page loads on serverless cold starts.
  const union = COLLECTIONS.map(c => `SELECT '${c}' AS collection, id, data FROM ${tableFor(c)}`).join(' UNION ALL ');
  const rows = await sql(union);
  for (const r of (rows || [])) {
    const o = r.data;
    Object.defineProperty(o, '__id', { value: r.id, enumerable: false, writable: true });
    db[r.collection].push(o);
  }
  db.__snapshot = {};
  db.__snapshotData = {};
  for (const c of COLLECTIONS) {
    db.__snapshot[c] = new Set();
    db.__snapshotData[c] = new Map();
    for (const o of db[c]) {
      db.__snapshot[c].add(o.__id);
      db.__snapshotData[c].set(o.__id, JSON.stringify(o));
    }
  }
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
    const beforeIds = db.__snapshot?.[c] || new Set();
    const beforeData = db.__snapshotData?.[c] || new Map();
    const writes = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const id = row.__id || idOf(row, c, i);
      row.__id = id;
      seen.add(id);
      const serialized = JSON.stringify(row);
      if (beforeData.get(id) === serialized) continue;
      writes.push(sql(
        `INSERT INTO ${t} (id, data, updated_at) VALUES ($1, $2, now())
         ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`,
        [id, serialized]
      ));
    }
    for (const oldId of beforeIds) {
      if (!seen.has(oldId)) writes.push(sql(`DELETE FROM ${t} WHERE id = $1`, [oldId]));
    }
    if (writes.length) await Promise.all(writes);

    // Refresh the in-memory snapshot so a second save in the same request only
    // persists changes made since the first save.
    db.__snapshot = db.__snapshot || {};
    db.__snapshotData = db.__snapshotData || {};
    db.__snapshot[c] = new Set();
    db.__snapshotData[c] = new Map();
    for (const row of rows) {
      const id = row.__id;
      if (!id) continue;
      db.__snapshot[c].add(id);
      db.__snapshotData[c].set(id, JSON.stringify(row));
    }
  }));
}


async function appendRecord(collection, row) {
  if (!COLLECTIONS.includes(collection)) throw new Error('Unknown collection.');
  if (FILE_MODE) {
    const db = await loadDB();
    db[collection].push(row);
    await saveDB(db);
    return row;
  }
  await init();
  const id = row.__id || idOf(row, collection, Date.now());
  row.__id = id;
  await sql(`INSERT INTO ${tableFor(collection)} (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [id, JSON.stringify(row)]);
  return row;
}

module.exports = { loadDB, saveDB, appendRecord, sql, init, COLLECTIONS, tableFor, FILE_MODE };
