# Better Real Estate v29.73 - Partner outreach and campaign agreements

Full source update from v29.72 Campaign Proof. This bundle has not been deployed and does not send any email by being installed.

## Company email with review

Confirmed Affiliate-only users with an active linked acquisition campaign or an approved standard affiliate program can open Affiliate Center > Outreach email. They choose the exact attribution context, supply a single recipient, a public professional source URL, a subject and a personalized plain-text message. The server appends the appropriate campaign/affiliate link, free-signup wording, partner signature, promotional identification, company postal address and an unsubscribe link. Campaign links remain separate from standard affiliate links. No campaign payout/wallet/leaderboard behavior changes.

Admin > Acquisition campaigns > Partner email approvals contains the review queue. Saving, submitting and approving never send mail. The admin opens the complete preview, approves that exact recipient/content version, then explicitly sends it. Edit clears approval, including edits made by an admin. Preview hashes also detect changed sender details, postal address or attribution. Each partner can read only their own drafts. Paused, archived, deleted or unlinked campaigns and suspended/ineligible partners cannot dispatch pending mail. Standard affiliate suspension blocks outreach too.

All outreach uses a partner-named display address at partners@betterrealestate.org and replies go to that company address. There is no mailbox password/API-key sharing and no new provider. Replies are handled in the existing company inbox; this release does not build an inbound inbox or display delivery/open/reply events. Sent means accepted by Resend, not guaranteed inbox delivery. The source supports plain-text composition only, with escaped HTML rendering and no attachments, CC or BCC.

One revision-checked shared ledger atomically claims sends across campaigns. A recipient cannot receive another partner email within 24 hours; caps are 20 attempts per partner and 100 total within a rolling 24 hours. Repeated dispatch of a sent draft is a no-op. Unconfirmed/abandoned attempts can retry the identical frozen snapshot and idempotency key within 23 hours; after that the admin must inspect the provider before taking further action. In-flight messages cannot be edited. Concurrent admin clicks are tested. Provider acceptance records, timestamps and review history are retained. Deleting a campaign disables sending but retains the separate outreach audit/suppression ledger so opt-outs and duplicate prevention survive.

Recipients can confirm an unsubscribe without signing in; GET displays a confirmation and POST performs the stop. One-click POST is supported. Suppression applies across all partners/campaigns. For existing member email addresses, this opt-out also disables existing member marketing preferences; transactional account messages are unaffected. Existing member marketing opt-outs are respected by outreach. Admins can manually suppress an address from the queue. No suppression removal control is added.

## Continue the same campaign

Edit target and commission agreement appears inside each non-archived campaign. Admins can raise a five-user pre-test target to 35 without changing its code, partner, attribution or results. Targets must be 5-1,000 and cannot fall below the approved total. Save requires a current campaign revision and a written agreement note/reference. The existing freelance-platform payment route is unchanged.

The default rate stays 30%. Admins can explicitly apply an agreed 35% long-term rate from the current server time; switching back to 30% is supported. Rate history is evaluated against the original payment date, so a delayed webhook for an earlier payment retains the previous rate. Each newly tracked sale retains its applied rate and calculated cents. Already recorded sales, external receipts and earnings are never recalculated. Legacy campaign sales use 30%. Renewals, the 30-day purchase window, 14-day hold and refund/dispute rules are unchanged.

## Setup and storage

Uses existing RESEND_API_KEY, SESSION_SECRET, APP_URL and MARKETING_POSTAL_ADDRESS. The postal address and secure unsubscribe configuration are required before approval; configured delivery is required before dispatch. The actual sending domain must already be verified in Resend. Verify that partners@ receives replies in your business mail service; a sending API does not configure that mailbox. No DNS, environment settings, real mailbox, live payment, external contract, production account or deployment was changed here.

A new campaignOutreach collection/table is created through the existing store initialization. Its singleton ledger is updated by its own optimistic-concurrency writer; generic saves preserve it. Local-file mode uses a serialized writer and opt-in preservation; production uses PostgreSQL revision checks. No manual migration command or dependency is added. Package version 2.9.73, tutorial version 91.

## Validation and limits

All 105 npm test files pass, including new API/concurrency/effective-rate tests and executable UI tests. Build and syntax checks pass. Tests use invalid example addresses, local fixtures and a stub mail transport; no real email or payment was sent. Production writer collision/retry behavior is exercised with a SQL adapter fixture, not a live database.

Chromium is unavailable here. Desktop/mobile and light/dark visual review remain pending. After deployment deliberately test one approved email, reply routing, unsubscribe and permissions with real accounts. Check 320px, 390px and desktop widths, long recipients/subjects, preview wrapping, the partner email tab and admin disclosures. Do not infer live sender-domain verification or inbox delivery from the local tests.

Relevant provider documentation: https://resend.com/docs/dashboard/emails/idempotency-keys (24-hour provider retention; app retry window is conservatively 23 hours); https://resend.com/docs/api-reference/emails/send-email ; https://www.ftc.gov/business-guidance/resources/can-spam-act-compliance-guide-business .
