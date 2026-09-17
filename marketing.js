/* Opt-in marketing email scheduler. Transactional email stays separate. */
const crypto = require('crypto');
const { loadDB, saveDB, sql, tableFor, FILE_MODE } = require('./store');
const mailer = require('./mailer');

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const POSTAL_ADDRESS = String(process.env.MARKETING_POSTAL_ADDRESS || '').trim();
const ENABLED = /^true$/i.test(String(process.env.MARKETING_EMAILS_ENABLED || ''));
const SECRET = process.env.SESSION_SECRET || 'keyline-dev-secret-change-me';
const MIN_GAP_MS = 48 * 60 * 60 * 1000;

function configured() { return ENABLED && !!POSTAL_ADDRESS && mailer.configured(); }
function signUser(user) {
  const id = String(user?.id || '');
  const sig = crypto.createHmac('sha256', SECRET).update(id).digest('base64url');
  return Buffer.from(`${id}.${sig}`).toString('base64url');
}
function verifyToken(token) {
  try {
    const raw = Buffer.from(String(token || ''), 'base64url').toString('utf8');
    const dot = raw.lastIndexOf('.');
    if (dot < 1) return null;
    const id = raw.slice(0, dot), sig = raw.slice(dot + 1);
    const expected = crypto.createHmac('sha256', SECRET).update(id).digest('base64url');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    return id;
  } catch { return null; }
}
function unsubscribeUrl(user) { return `${APP_URL}/api/marketing/unsubscribe?token=${encodeURIComponent(signUser(user))}`; }
function preferencesUrl() { return `${APP_URL}/?view=settings`; }

function recent(arr, days = 4) {
  const cutoff = Date.now() - days * 86400000;
  return (arr || []).filter(x => new Date(x.createdAt || x.freshAt || x.at || 0).getTime() >= cutoff);
}

function buildEmail(db, user) {
  const freshListings = recent(db.listings, 4).filter(l => l.ownerId !== user.id).slice(0, 3);
  const freshShop = recent(db.shopItems, 4).filter(i => i.active && Number(i.stock) > 0 && i.sellerId !== user.id).slice(0, 3);
  const profileIncomplete = !user.bio || !user.avatarUrl;
  const rotation = Number(user.marketingSequence || 0) % 3;

  if (rotation === 0 && freshListings.length) {
    return {
      subject: 'Fresh property opportunities on Better Real Estate',
      headline: 'New deals are waiting',
      body: `There ${freshListings.length === 1 ? 'is' : 'are'} ${freshListings.length} fresh propert${freshListings.length === 1 ? 'y' : 'ies'} worth a look. Open your feed to see what fits your buy box and save anything you want to revisit.`,
      ctaLabel: 'Open your feed', ctaUrl: APP_URL
    };
  }
  if (rotation === 1 && freshShop.length) {
    return {
      subject: 'New marketplace inventory just landed',
      headline: 'See what is new in the Shop',
      body: `${freshShop.length} newer marketplace item${freshShop.length === 1 ? '' : 's'} are live. Browse materials, fixtures and other inventory before it moves.`,
      ctaLabel: 'Browse the Shop', ctaUrl: `${APP_URL}/?view=shop`
    };
  }
  if (profileIncomplete) {
    return {
      subject: 'Finish your Better Real Estate profile',
      headline: 'Make your account work harder',
      body: 'A complete profile helps other buyers and sellers understand who they are dealing with. Add a photo, a short bio and make sure your buy box reflects what you actually want.',
      ctaLabel: 'Finish your profile', ctaUrl: `${APP_URL}/?view=settings`
    };
  }
  return {
    subject: 'Your Better Real Estate feed is ready',
    headline: 'See what changed since your last visit',
    body: 'New listings and marketplace inventory move quickly. Check your feed, update your buy box if your criteria changed, and save anything you want to track.',
    ctaLabel: 'Open Better Real Estate', ctaUrl: APP_URL
  };
}

async function runMarketingCycle({ limit = 60 } = {}) {
  if (!configured()) {
    console.log('[marketing] skipped — set RESEND_API_KEY, MARKETING_EMAILS_ENABLED=true and MARKETING_POSTAL_ADDRESS');
    return { sent: 0, skipped: true };
  }
  const db = await loadDB();
  const now = Date.now();
  const due = db.users.filter(u =>
    u.role !== 'admin' && u.emailVerified && u.marketingOptIn === true && !u.marketingUnsubscribedAt &&
    (!u.marketingLastSentAt || now - new Date(u.marketingLastSentAt).getTime() >= MIN_GAP_MS)
  ).slice(0, Math.max(1, Math.min(100, Number(limit) || 60)));

  let sent = 0;
  // Send in small parallel batches so the scheduled function comfortably
  // stays inside Netlify's execution limit without hammering the mail API.
  for (let i = 0; i < due.length; i += 4) {
    const batch = due.slice(i, i + 4);
    const results = await Promise.all(batch.map(async user => {
      try {
        const content = buildEmail(db, user);
        await mailer.sendMarketing(user.email, user.name, {
          ...content,
          unsubscribeUrl: unsubscribeUrl(user),
          preferencesUrl: preferencesUrl(),
          postalAddress: POSTAL_ADDRESS
        });
        user.marketingLastSentAt = new Date().toISOString();
        user.marketingSequence = Number(user.marketingSequence || 0) + 1;
        // In production update only these two JSON fields so a scheduled
        // email can never overwrite a profile/listing change happening at
        // the same time. The app's full saveDB path is kept only for local
        // file-mode development.
        if (!FILE_MODE && sql) {
          await sql(`UPDATE ${tableFor('users')} SET data = data || jsonb_build_object('marketingLastSentAt', $2::text, 'marketingSequence', $3::int), updated_at = now() WHERE id = $1`, [String(user.__id || user.id), user.marketingLastSentAt, user.marketingSequence]);
        }
        return true;
      } catch (e) {
        console.error('[marketing]', user.email, e.message);
        return false;
      }
    }));
    sent += results.filter(Boolean).length;
    if (i + 4 < due.length) await new Promise(resolve => setTimeout(resolve, 1100));
  }
  if (sent && FILE_MODE) await saveDB(db);
  return { sent, due: due.length };
}

module.exports = { configured, signUser, verifyToken, unsubscribeUrl, runMarketingCycle, _buildEmail: buildEmail };
