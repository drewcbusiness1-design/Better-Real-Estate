# v29.71 — Campaign partner dashboard

Full source update based on v29.70. No deployment or live account changes performed.

## What changed
- Affiliate-only accounts have Campaign partnerships and Standard affiliate program sections. Campaign partnerships is the default section for this account type and has no wallet, withdrawal, Stripe Connect or payout controls. Existing standard affiliate tools remain in their own section. No ordinary affiliate application or terms acceptance is required to view an admin-linked external campaign.
- Admin links an existing campaign to a real, email-confirmed Affiliate-only account by exact Better username. The confirmation names the account receiving campaign access. The existing campaign URL, referrals, reviews and receipts remain. Unlinking or reassigning immediately changes server-side access. Partner accounts do not gain admin rights or access to other campaigns.
- Partner dashboard shows campaign terms, status, link, targets, signup qualification status, review explanation intended for the partner, submitted evidence, individual conversions/commissions/hold dates/reversals, external payment receipts and balances. Each referred-member list is paginated. Partners can submit public qualification evidence but cannot approve signups, edit rates, record external payments, archive or link campaigns.
- Server uses an explicit partner projection: no recruited-member emails, phone numbers, password/auth data, payment identifiers, private conversations, admin internal notes or admin audit history are returned. Review explanations shared with partners have a separate admin field. No identity-document uploads are introduced.
- Donut chart displays total attributed signups and the subset with a recorded paid membership purchase, counted once per user. The other segment is signups without a recorded non-reversed purchase. Numeric counts, percent and accessible text accompany the ring; zero users has an explicit empty state. The chart measures purchase conversion, not current subscription retention. Refund/dispute reversal removes a purchase from the count; another legitimate non-reversed payment can still establish conversion.
- Recorded membership payments outside the commission window and renewals appear as purchase history and may establish conversion, but do not create an additional commission. Legacy v29.70 first-sale rows seed the chart without rewriting them. Broader payment history begins with received webhook events after this update; old events are not fabricated or silently reconstructed from incomplete refund evidence.
- Archive stops new attribution and partner evidence/review edits while retaining the full existing history and read access. Previously attributed purchases and refund/receipt reconciliation continue. Restore returns the campaign to paused status, requiring a separate explicit resume. Archived campaigns are hidden by default in Admin and can be shown with Show archived campaigns. No permanent-delete control exists for campaigns.
- New campaign name, payment platform and signup-target fields are blank. No personal campaign is the default. Fixed existing campaign compensation remains $1 per approved signup and 30% of the first eligible purchase; no change to previously stored campaign terms.
- Acquisition campaigns and Manage title companies use the same grouped Admin accordion system, with Expand all / Collapse all and existing saved section preferences. Tutorial release 89 covers partner dashboards. Brand assets, subscription prices, dependencies and environment variables remain unchanged.

## Set up the existing campaign
1. Deploy this full bundle, then hard refresh.
2. The freelancer creates an account through the ordinary signup page, chooses Marketing / Affiliate only and confirms their email. They should not use their own customer acquisition link to create the partner account.
3. Ask for their exact Better username through Fiverr.
4. Admin → Acquisition campaigns → Refresh campaigns → expand the EXISTING campaign → Campaign partner account. Enter the username and Link partner account after checking the confirmation. No replacement campaign is needed.
5. The freelancer signs in and opens Affiliate Center → Campaign partnerships. They see the same link, referrals and accounting records that you manage in Admin.
6. If the original campaign was only a test, use Archive campaign. Otherwise keep it and link the account to preserve continuity. No live campaign was archived by this build.
7. Pay all Fiverr campaign compensation through Fiverr. Record external payment only stores a reference after payment; it cannot initiate a payment. Partner receipts are admin-entered records, not a live Fiverr reconciliation.

## Verification and limits
Run npm test, build, changed JavaScript syntax checks and installation diff checks. New integration tests cover unauthenticated/non-affiliate/unconfirmed restrictions, exact eligible-account linking, cross-partner isolation, safe response projection, evidence without approval permissions, archive/restore/reassignment/unlink, retained attribution, refunds and late paid conversions without new commissions. New DOM tests execute the separate campaign/standard sections, zero/nonzero donut counts, evidence submission, link/archive controls, archived read-only display and grouped destinations. Prior campaign tests now verify blank creation fields.

Browser visual and live PostgreSQL/Stripe validation remain pending. This runtime has no local Chromium; the separate cloud browser could not reach the local fixture during v29.70. Do not equate DOM tests with phone/desktop/light/dark geometry. All tests use fixtures; no real messages, mail, payments, accounts, campaign updates or deployments.

## Separate pending items
24-hour email-reminder cooldown; customer-facing service-directory navigation; email-confirmation requirement for founder status and removal of unconfirmed automatic founding awards. These are still not implemented by this campaign-focused release. Preserve paid/manual grants when the founder change is built.
