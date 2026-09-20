/* Communications center: unread-message reminders + admin broadcasts. */
const crypto = require('crypto');
const { loadDB, saveDB, sql, tableFor, FILE_MODE } = require('./store');
const mailer = require('./mailer');
const marketing = require('./marketing');

const APP_URL = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const POSTAL_ADDRESS = String(process.env.MARKETING_POSTAL_ADDRESS || '').trim();
const REMINDER_DELAYS = new Set([15, 30, 60, 180, 360, 720, 1440]);

function reminderDelayMinutes(user) {
  const settings = user?.settings || {};
  if (settings.notifyOnMessage === false) return 0;
  const raw = Number(settings.messageEmailDelayMinutes ?? 60);
  return REMINDER_DELAYS.has(raw) ? raw : 60;
}

function eligibleBroadcastUsers(db, audience = {}) {
  const kind = String(audience.kind || 'all');
  const market = String(audience.market || '').trim().toLowerCase();
  return (db.users || []).filter(u => {
    if (!u || u.role === 'admin' || !u.emailVerified || u.marketingOptIn !== true || u.marketingUnsubscribedAt) return false;
    if (kind === 'buyers' && u.role !== 'buyer') return false;
    if (kind === 'sellers' && u.role !== 'seller') return false;
    if (kind === 'teams' && !u.companyId) return false;
    if (market && !String(u.location || '').toLowerCase().includes(market)) return false;
    return true;
  });
}

async function markMessageReminders(messages, sentAt) {
  if (!messages.length) return;
  if (FILE_MODE || !sql) {
    const db = await loadDB();
    const ids = new Set(messages.map(m => m.id));
    for (const m of db.messages) if (ids.has(m.id)) m.unreadReminderSentAt = sentAt;
    await saveDB(db);
    return;
  }
  const t = tableFor('messages');
  for (const m of messages) {
    await sql(`UPDATE ${t} SET data = data || jsonb_build_object('unreadReminderSentAt', $2::text), updated_at = now() WHERE id = $1`, [String(m.__id || m.id), sentAt]);
  }
}

async function runUnreadReminderCycle({ limit = 50 } = {}) {
  if (!mailer.configured()) return { sent: 0, skipped: true, reason: 'mail-not-configured' };
  const db = await loadDB();
  const now = Date.now();
  const groups = new Map();

  for (const m of db.messages || []) {
    if (!m || m.read || !m.toUserId || !m.fromUserId) continue;
    const key = `${m.toUserId}:${m.fromUserId}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(m);
  }

  const due = [];
  for (const messages of groups.values()) {
    messages.sort((a, b) => new Date(a.at) - new Date(b.at));
    // One reminder per unread conversation. Once any unread message in the
    // conversation has triggered a reminder, wait until the user opens it.
    if (messages.some(m => m.unreadReminderSentAt)) continue;
    const first = messages[0];
    const recipient = db.users.find(u => u.id === first.toUserId);
    const sender = db.users.find(u => u.id === first.fromUserId);
    if (!recipient || !sender || !recipient.emailVerified) continue;
    const delay = reminderDelayMinutes(recipient);
    if (!delay) continue;
    const age = now - new Date(first.at).getTime();
    if (age < delay * 60_000) continue;
    due.push({ messages, recipient, sender, delay });
  }

  due.sort((a, b) => new Date(a.messages[0].at) - new Date(b.messages[0].at));
  let sent = 0;
  for (const item of due.slice(0, Math.max(1, Math.min(100, Number(limit) || 50)))) {
    try {
      const listingIds = [...new Set(item.messages.map(m => m.listingId).filter(Boolean))];
      const listing = listingIds.length === 1 ? db.listings.find(l => l.id === listingIds[0]) : null;
      const url = `${APP_URL}/?view=chat&user=${encodeURIComponent(item.sender.id)}`;
      await mailer.sendUnreadMessageReminder(item.recipient.email, item.recipient.name, {
        senderName: item.sender.name,
        count: item.messages.length,
        listingLabel: listing ? (listing.city || listing.address || 'a property') : null,
        conversationUrl: url
      });
      await markMessageReminders(item.messages, new Date().toISOString());
      sent += 1;
    } catch (e) {
      console.error('[unread-reminder]', item.recipient.email, e.message);
    }
  }
  return { sent, due: due.length };
}

async function persistBroadcast(broadcast) {
  if (FILE_MODE || !sql) {
    const db = await loadDB();
    const i = db.emailBroadcasts.findIndex(x => x.id === broadcast.id);
    if (i >= 0) db.emailBroadcasts[i] = broadcast; else db.emailBroadcasts.push(broadcast);
    await saveDB(db);
    return;
  }
  const t = tableFor('emailBroadcasts');
  await sql(`INSERT INTO ${t} (id, data, updated_at) VALUES ($1, $2, now()) ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()`, [broadcast.id, JSON.stringify(broadcast)]);
}

function normalizeBroadcastInput(input = {}, createdBy = null) {
  const subject = String(input.subject || '').trim().slice(0, 140);
  const headline = String(input.headline || '').trim().slice(0, 160);
  const body = String(input.body || '').trim().slice(0, 8000);
  const ctaLabel = String(input.ctaLabel || 'Open Better Real Estate').trim().slice(0, 80);
  const ctaUrl = String(input.ctaUrl || APP_URL).trim().slice(0, 1000);
  const audience = { kind: ['all','buyers','sellers','teams'].includes(input.audience?.kind) ? input.audience.kind : 'all', market: String(input.audience?.market || '').trim().slice(0, 100) };
  if (!subject || !headline || !body) throw new Error('Subject, headline and message are required.');
  let scheduledAt = input.scheduledAt ? new Date(input.scheduledAt) : new Date();
  if (!Number.isFinite(scheduledAt.getTime())) scheduledAt = new Date();
  return {
    id: crypto.randomUUID(), subject, headline, body, ctaLabel, ctaUrl, audience,
    status: 'queued', scheduledAt: scheduledAt.toISOString(), createdAt: new Date().toISOString(), createdBy,
    sentUserIds: [], failedUserIds: [], sentCount: 0, failedCount: 0, finishedAt: null
  };
}

async function runBroadcastCycle({ broadcastId = null, limit = 40 } = {}) {
  if (!marketing.configured()) return { sent: 0, skipped: true, reason: 'marketing-not-configured' };
  const db = await loadDB();
  const now = Date.now();
  const queue = (db.emailBroadcasts || [])
    .filter(b => (!broadcastId || b.id === broadcastId) && ['queued','sending'].includes(b.status) && new Date(b.scheduledAt || 0).getTime() <= now)
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt));
  let sent = 0;

  for (const b of queue) {
    b.status = 'sending';
    const users = eligibleBroadcastUsers(db, b.audience);
    const done = new Set([...(b.sentUserIds || []), ...(b.failedUserIds || [])]);
    const pending = users.filter(u => !done.has(u.id)).slice(0, Math.max(1, Math.min(100, Number(limit) || 40)));
    for (const user of pending) {
      try {
        await mailer.sendAdminBroadcast(user.email, user.name, {
          subject: b.subject, headline: b.headline, body: b.body, ctaLabel: b.ctaLabel, ctaUrl: b.ctaUrl,
          unsubscribeUrl: marketing.unsubscribeUrl(user), preferencesUrl: `${APP_URL}/?view=settings`, postalAddress: POSTAL_ADDRESS
        });
        b.sentUserIds = [...(b.sentUserIds || []), user.id];
        b.sentCount = Number(b.sentCount || 0) + 1;
        sent += 1;
      } catch (e) {
        console.error('[broadcast]', user.email, e.message);
        b.failedUserIds = [...(b.failedUserIds || []), user.id];
        b.failedCount = Number(b.failedCount || 0) + 1;
      }
      await persistBroadcast(b);
    }
    const processed = new Set([...(b.sentUserIds || []), ...(b.failedUserIds || [])]);
    const remaining = users.filter(u => !processed.has(u.id)).length;
    if (!remaining) {
      b.status = 'sent';
      b.finishedAt = new Date().toISOString();
      await persistBroadcast(b);
    } else {
      b.status = 'sending';
      await persistBroadcast(b);
    }
  }
  return { sent, broadcasts: queue.length };
}

module.exports = {
  REMINDER_DELAYS,
  reminderDelayMinutes,
  eligibleBroadcastUsers,
  normalizeBroadcastInput,
  persistBroadcast,
  runUnreadReminderCycle,
  runBroadcastCycle
};
