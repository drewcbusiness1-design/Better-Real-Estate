/* =========================================================================
   mailer.js — transactional email.

   Set these in Netlify → Site settings → Environment variables:

     RESEND_API_KEY=re_xxxxxxxx
     MAIL_FROM=Better Real Estate <noreply@yourdomain.com>
     APP_URL=https://yourdomain.com

   With no RESEND_API_KEY set, emails print to the function log instead,
   so local development works with no mail account at all.

   The FROM address must be on a domain you have verified with Resend
   (add their DNS records at your registrar). You cannot send "from"
   a gmail.com address through any provider — Gmail's DMARC policy
   rejects it. Use noreply@yourdomain.com and set your Gmail as the
   reply-to.
   ========================================================================= */
/* On Netlify Functions we send over HTTPS rather than SMTP. Lambda
   containers are slow to open SMTP connections and many providers
   throttle or block them outright; an HTTP API call is fast, gives you a
   real status code, and works from a cold start. Resend is the default
   because its free tier covers 3,000 emails/month, which is well past
   what signup and reset mail needs. */

const APP_NAME = 'Better Real Estate';
const APP_URL = process.env.APP_URL || 'http://localhost:3000';
const FROM = process.env.MAIL_FROM || `${APP_NAME} <onboarding@resend.dev>`;

const RESEND_KEY = process.env.RESEND_API_KEY;
const REPLY_TO = process.env.MAIL_REPLY_TO || 'drewcbusiness1@gmail.com';

function shell(title, bodyHtml) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#FAF9F6;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #DBD7CD;border-radius:14px;overflow:hidden">
    <div style="background:#12222D;padding:20px 24px;color:#fff;font-size:18px;font-weight:600">${APP_NAME}</div>
    <div style="padding:26px 24px;color:#14181C;font-size:15px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:20px">${title}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #DBD7CD;color:#40474F;font-size:12px">
      ${APP_NAME} · <a href="mailto:drewcbusiness1@gmail.com" style="color:#1F3B4D">drewcbusiness1@gmail.com</a>
    </div>
  </div>
</div>`;
}

function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function marketingShell(title, bodyHtml, { unsubscribeUrl, preferencesUrl, postalAddress }) {
  return `<div style="font-family:-apple-system,Segoe UI,Helvetica,Arial,sans-serif;background:#FAF9F6;padding:32px 16px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border:1px solid #DBD7CD;border-radius:14px;overflow:hidden">
    <div style="background:#12222D;padding:20px 24px;color:#fff;font-size:18px;font-weight:600">${APP_NAME}</div>
    <div style="padding:26px 24px;color:#14181C;font-size:15px;line-height:1.6">
      <h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
      ${bodyHtml}
    </div>
    <div style="padding:16px 24px;border-top:1px solid #DBD7CD;color:#5A6168;font-size:11.5px;line-height:1.55;text-align:center">
      <div>${esc(APP_NAME)} · ${esc(postalAddress)}</div>
      <div style="margin-top:6px"><a href="${esc(preferencesUrl)}" style="color:#1F3B4D">Email preferences</a> · <a href="${esc(unsubscribeUrl)}" style="color:#1F3B4D">Unsubscribe</a></div>
    </div>
  </div>
</div>`;
}

const button = (url, label) =>
  `<p style="margin:22px 0"><a href="${url}" style="background:#12222D;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">${label}</a></p>
   <p style="font-size:12.5px;color:#40474F">Or paste this link into your browser:<br><span style="word-break:break-all">${url}</span></p>`;

async function send(to, subject, html, text, extra = {}) {
  if (!RESEND_KEY) {
    console.log('\n──────── EMAIL (not sent — RESEND_API_KEY not set) ────────');
    console.log('To:', to, '\nSubject:', subject);
    console.log(text || html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 500));
    console.log('──────────────────────────────────────────────────────────\n');
    return { simulated: true };
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM, to: [to], subject, html, text, reply_to: REPLY_TO, ...(extra.headers ? { headers: extra.headers } : {}) })
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email send failed (${res.status}): ${body.slice(0, 200)}`);
  }
  return res.json();
}

exports.sendVerification = (to, name, token) => {
  const url = `${APP_URL}/?verify=${token}`;
  return send(to, `Confirm your ${APP_NAME} account`,
    shell('Confirm your email',
      `<p>Hi ${name}, thanks for joining ${APP_NAME}. Confirm your email so you can post listings, make offers and reset your password if you ever need to.</p>${button(url, 'Confirm email')}
       <p style="font-size:12.5px;color:#40474F">If you didn't create this account, ignore this email.</p>`),
    `Confirm your email: ${url}`);
};

exports.sendPasswordReset = (to, name, token) => {
  const url = `${APP_URL}/?reset=${token}`;
  return send(to, `Reset your ${APP_NAME} password`,
    shell('Reset your password',
      `<p>Hi ${name} — use the button below to set a new password. This link expires in one hour.</p>${button(url, 'Set a new password')}
       <p style="font-size:12.5px;color:#40474F">If you didn't ask for this, you can ignore it. Your password won't change.</p>`),
    `Reset your password: ${url}`);
};

exports.sendWelcome = (to, name) =>
  send(to, `Welcome to ${APP_NAME}`,
    shell('You\'re in',
      `<p>Hi ${name} — your email is confirmed. Here's where to start:</p>
       <ul style="padding-left:18px">
         <li>Set your <b>buy box</b> so the feed ranks around what you actually buy</li>
         <li><b>Post a property</b> to get it in front of cash buyers</li>
         <li>Browse the <b>marketplace</b> for appliances and materials</li>
       </ul>${button(APP_URL, 'Open the feed')}`),
    `Welcome to ${APP_NAME}. Open ${APP_URL}`);

exports.sendOfferNotice = (to, name, amount, address) =>
  send(to, `New offer on ${address}`,
    shell('You have a new offer',
      `<p>Hi ${name}, someone offered <b>$${Number(amount).toLocaleString()}</b> on ${address}.</p>${button(APP_URL, 'Review the offer')}`),
    `New offer of $${amount} on ${address}. ${APP_URL}`);

exports.sendShippedNotice = (to, name, itemTitle, tracking) =>
  send(to, `Your order has shipped — ${itemTitle}`,
    shell('On its way',
      `<p>Hi ${name}, "${itemTitle}" has been marked shipped.</p>
       ${tracking ? `<p style="font-size:15px"><b>Tracking number:</b> ${tracking}</p>` : '<p style="font-size:13.5px;color:#40474F">No tracking number was provided.</p>'}
       ${button(APP_URL, 'View your orders')}`),
    `${itemTitle} has shipped.${tracking ? ' Tracking: ' + tracking : ''} ${APP_URL}`);

exports.sendMatchAlert = (to, name, listing) =>
  send(to, `First look: ${listing.address} matches your buy box`,
    shell('A new listing just matched — Platinum first look',
      `<p>Hi ${name}, this just went up and fits what you're looking for:</p>
       <p style="font-size:17px;font-weight:600;margin:14px 0 2px">${listing.address}</p>
       <p style="font-size:13.5px;color:#40474F;margin:0 0 12px">${listing.city} · $${Number(listing.asking).toLocaleString()}${listing.arv ? ' · Est. ARV $' + Number(listing.arv).toLocaleString() : ''}</p>
       ${button(APP_URL, 'View it now')}
       <p style="font-size:12px;color:#40474F">You're seeing this before it's visible to anyone else — that's the Platinum first-look alert.</p>`),
    `New match: ${listing.address}, ${listing.city}, $${listing.asking}. ${APP_URL}`);

exports.configured = () => !!RESEND_KEY;



exports.sendCompanyInvite = (to, companyName, inviterName, inviteUrl) =>
  send(to, `You're invited to join ${companyName} on ${APP_NAME}`,
    shell('Join your company workspace',
      `<p>${esc(inviterName || 'A teammate')} invited you to join <b>${esc(companyName || 'their company')}</b> on ${APP_NAME}.</p>
       <p>Use your own secure login while sharing the company workspace, listings and team tools.</p>${button(inviteUrl, 'Join company workspace')}
       <p style="font-size:12.5px;color:#40474F">This invitation expires in 7 days.</p>`),
    `${inviterName || 'A teammate'} invited you to join ${companyName} on ${APP_NAME}. Join here: ${inviteUrl}`);

exports.sendMarketing = (to, name, { subject, headline, body, ctaLabel, ctaUrl, unsubscribeUrl, preferencesUrl, postalAddress }) => {
  const safeName = esc(name || 'there');
  const safeBody = esc(body || '');
  const safeCta = esc(ctaLabel || 'Open Better Real Estate');
  const safeUrl = esc(ctaUrl || APP_URL);
  const html = marketingShell(headline || 'See what is new',
    `<p>Hi ${safeName},</p><p>${safeBody}</p><p style="margin:22px 0"><a href="${safeUrl}" style="background:#12222D;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;display:inline-block;font-weight:600">${safeCta}</a></p>`,
    { unsubscribeUrl, preferencesUrl, postalAddress });
  const text = `${headline || 'See what is new'}\n\nHi ${name || 'there'},\n\n${body || ''}\n\n${ctaLabel || 'Open Better Real Estate'}: ${ctaUrl || APP_URL}\n\nEmail preferences: ${preferencesUrl}\nUnsubscribe: ${unsubscribeUrl}\n${APP_NAME} · ${postalAddress}`;
  return send(to, subject || `What is new on ${APP_NAME}`, html, text, { headers: { 'List-Unsubscribe': `<${unsubscribeUrl}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' } });
};
