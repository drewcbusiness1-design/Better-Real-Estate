/* =========================================================================
   storage.js — image storage on Netlify Blobs.

   Netlify Functions get a fresh, read-only-ish filesystem on every
   invocation, so anything written to disk disappears. Photos go to
   Netlify Blobs instead, which is durable and sits behind Netlify's
   Image CDN.

   Images are served back through /api/img/:key (see server.js).
   ========================================================================= */
const crypto = require('crypto');

let getStore = null;
try { ({ getStore } = require('@netlify/blobs')); } catch { /* optional locally */ }

const STORE_NAME = 'bre-uploads';
const MAX_BYTES = 8 * 1024 * 1024;

// Local fallback so `node server.js` still works without Netlify running.
const fs = require('fs');
const path = require('path');
const LOCAL_DIR = path.join(__dirname, 'public', 'uploads');

function store() {
  if (!getStore) return null;
  try { return getStore(STORE_NAME); } catch { return null; }
}

/** Accepts a data: URL, returns a public path or null. */
async function writeImage(dataUrl) {
  const m = /^data:image\/(png|jpeg|jpg|webp|gif);base64,(.+)$/.exec(dataUrl || '');
  if (!m) return null;
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
  const buf = Buffer.from(m[2], 'base64');
  if (buf.length > MAX_BYTES) return null;

  const key = crypto.randomUUID() + '.' + ext;
  const s = store();
  if (s) {
    await s.set(key, buf, { metadata: { contentType: `image/${m[1]}` } });
    return '/api/img/' + key;
  }
  // local dev fallback
  if (!fs.existsSync(LOCAL_DIR)) fs.mkdirSync(LOCAL_DIR, { recursive: true });
  fs.writeFileSync(path.join(LOCAL_DIR, key), buf);
  return '/uploads/' + key;
}

async function readImage(key) {
  if (!/^[\w.-]+$/.test(key)) return null;
  const s = store();
  if (s) {
    const res = await s.getWithMetadata(key, { type: 'arrayBuffer' });
    if (!res) return null;
    return { buffer: Buffer.from(res.data), contentType: res.metadata?.contentType || 'image/jpeg' };
  }
  const p = path.join(LOCAL_DIR, key);
  if (!fs.existsSync(p)) return null;
  const ext = path.extname(p).slice(1);
  return { buffer: fs.readFileSync(p), contentType: 'image/' + (ext === 'jpg' ? 'jpeg' : ext) };
}

module.exports = { writeImage, readImage };
