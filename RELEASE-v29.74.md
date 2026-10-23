# v29.74 — Partner tools and reply inbox

Full source update from v29.73; deployment is not performed by this bundle.

- Public lead source now explains that it is a clickable website or professional profile page where the contact was found, separate from Recipient email and the affiliate signup link.
- A sole eligible campaign is selected automatically in the composer and inferred safely by the server. Multiple choices require a selection; stale or unauthorized explicit campaign IDs remain blocked.
- Received email conversations appear in Outreach email → Reply inbox and View email conversation. Admins see all incoming messages; confirmed active affiliates see only non-quarantined replies tied to their own original outgoing message. Campaign reassignment never transfers past conversations.
- Company sending still uses partners@betterrealestate.org. New email uses an opaque per-message Reply-To on a separately configured receiving domain. Signed email.received webhooks retrieve full content from Resend. Duplicate provider IDs are stored once; retrieval failures return errors for provider retry.
- Unmatched recipients, mismatched senders and explicit DMARC failures are admin-only. Inbox content is rendered as inert text. Attachment names/sizes are listed; provider URLs, remote images and raw headers are not exposed. Sender matching is a routing check, not a guarantee of identity.
- Affiliate-only Learn, Settings, guide and quick introduction teach affiliate tools rather than wholesaling. The wholesaling course remains for regular accounts. Tutorial version is 92.
- Campaign cards group Your agreement, Earnings and external payments, and Referral reviews into labeled metric grids.

## Receiving setup and limits

See INSTALL-v29.74.md. New sends require receiving configuration. The configured flag only checks environment settings; it does not verify live DNS, webhook delivery or provider permissions. Older emails with Reply-To partners@ remain in the existing company mailbox and are not backfilled. Replies are read in-platform; any new follow-up is a new draft requiring the existing exact-preview admin approval and explicit send.

The 20 per-partner / 100 overall rolling-day attempt limits and shared one-recipient-per-24-hours limit remain. No minimum interval between different recipients is added. These controls do not guarantee avoidance of spam filtering.

## Validation

All 108 test files pass, including signed raw-body verification using an official Svix test vector, stale/tampered signatures, concurrent duplicate callbacks, retrieval failure/retry, author/admin isolation, campaign reassignment, quarantine, source help and tool training. Build and JavaScript syntax checks pass. No real email, payment, DNS change or production deployment was used. Browser visual inspection, real PostgreSQL integration and live receiving remain unverified.

Official integration references: https://resend.com/docs/dashboard/receiving/introduction ; https://resend.com/docs/api-reference/emails/retrieve-received-email ; https://resend.com/docs/webhooks/verify-webhooks-requests ; https://docs.svix.com/receiving/verifying-payloads/how-manual .

Deletion confirmation update: Campaign, own-account, admin user-account and demo-account deletion now use a dialog with Cancel and Confirm delete buttons, with no typed name or phrase. Own-account password authentication and server authorization remain required. Existing server confirmation markers are sent only after confirmation; campaign name mismatches indicate stale data. Cancel, Escape and closing the dialog perform no deletion.
