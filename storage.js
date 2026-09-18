/* =========================================================================
   storage.js — durable image storage.

   Primary storage: Netlify Blobs when available.
   Production fallback: the existing Postgres database, in a dedicated
   bre_image_blobs table. This matters because Netlify Functions run from
   /var/task, which is not a durable writable filesystem. We never fall back
   to public/uploads on a serverless deploy.

   Local development still uses public/uploads when running plain Node.
   Images are served through /api/img/:key (see server.js).
   ========================================================================= */
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { sql, init, FILE_MODE } = require('./store');

let getStore = null;
try { ({ getStore } = require('@netlify/blobs')); } catch (e) {
  console.warn('[storage] Netlify Blobs package unavailable:', e.message);
}

const STORE_NAME = 'bre-uploads';
const MAX_BYTES = 8 * 1024 * 1024;
const LOCAL_DIR = path.join(__dirname, 'public', 'uploads');
const IS_SERVERLESS = !!(process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
const IMAGE_TABLE = 'bre_image_blobs';
let imageTablePromise = null;

function blobStore() {
  if (!getStore) return null;
  try { return getStore(STORE_NAME); }
  catch (e) {
    console.warn('[storage] Netlify Blobs not available for this invocation:', e.message);
    return null;
  }
}

async function ensureImageTable() {
  if (FILE_MODE || !sql) return false;
  if (!imageTablePromise) {
    imageTablePromise = (async () => {
      await init();
      await sql(`CREATE TABLE IF NOT EXISTS ${IMAGE_TABLE} (
        key text PRIMARY KEY,
        content_type text NOT NULL,
        data_base64 text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )`);
    })().catch(err => { imageTablePromise = null; throw err; });
  }
  await imageTablePromise;
  return true;
}

async function writeDatabaseImage(key, buf, contentType) {
  if (!await ensureImageTable()) return false;
  await sql(
    `INSERT INTO ${IMAGE_TABLE} (key, content_type, data_base64, created_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (key) DO UPDATE SET
       content_type = EXCLUDED.content_type,
       data_base64 = EXCLUDED.data_base64,
       created_at = now()`,
    [key, contentType, buf.toString('base64')]
  );
  return true;
}

async function readDatabaseImage(key) {
  if (!await ensureImageTable()) return null;
  const rows = await sql(`SELECT content_type, data_base64 FROM ${IMAGE_TABLE} WHERE key = $1 LIMIT 1`, [key]);
  const row = rows && rows[0];
  if (!row) return null;
  return { buffer: Buffer.from(row.data_base64, 'base64'), contentType: row.content_type || 'image/jpeg' };
}

/** Accepts a data: URL, returns a public path or null. */
async function writeImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (!buf.length || buf.length > MAX_BYTES) return null;

  const contentType = `image/${m[1] === 'jpg' ? 'jpeg' : m[1]}`;
  const key = crypto.randomUUID() + '.' + ext;

  // Prefer Netlify Blobs. If the runtime has not injected a Blobs context,
  // fall through to Postgres instead of touching /var/task.
  const s = blobStore();
  if (s) {
    try {
      await s.set(key, buf, { metadata: { contentType } });
      return '/api/img/' + key;
    } catch (e) {
      console.warn('[storage] Netlify Blobs write failed; using database fallback:', e.message);
    }
  }

  // Durable production fallback using the database that already powers the app.
  if (!FILE_MODE && sql) {
    await writeDatabaseImage(key, buf, contentType);
    return '/api/img/' + key;
  }

  // Plain `node server.js` local-development fallback only.
  if (!IS_SERVERLESS) {
    if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
    fs.writeFileSync(path.join(LOCAL_DIR, key), buf);
    return '/uploads/' + key;
  }

  throw new Error('Image storage is unavailable. Check the site database configuration.');
}

async function readImage(key) {
  if (!/^[\w.-]+$/.test(key)) return null;

  const s = blobStore();
  if (s) {
    try {
      const res = await s.getWithMetadata(key, { type: 'arrayBuffer' });
      if (res) return { buffer: Buffer.from(res.data), contentType: res.metadata?.contentType || 'image/jpeg' };
    } catch (e) {
      console.warn('[storage] Netlify Blobs read failed; checking database fallback:', e.message);
    }
  }

  if (!FILE_MODE && sql) {
    const stored = await readDatabaseImage(key);
    if (stored) return stored;
  }

  if (!IS_SERVERLESS) {
    const p = path.join(LOCAL_DIR, key);
    if (!fs.existsSync(p)) return null;
    const ext = path.extname(p).slice(1);
    return { buffer: fs.readFileSync(p), contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) };
  }
  return null;
}

module.exports = { writeImage, readImage };
