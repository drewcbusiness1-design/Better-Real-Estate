# v29.70 — External campaign tracking

Full source bundle based on the preserved v29.69 All Users ZIP. Not deployed.

- Admin → Acquisition campaigns creates separate campaign links. The default form is Kenley / Fiverr / 25 qualified users. Links are generated after an admin creates the real campaign, never fabricated in the release.
- New signups retain first campaign touch for 30 days in the same browser, with immutable account attribution. Signup explicitly suppresses regular referral/affiliate attribution when a campaign applies; campaign users cannot create ordinary affiliate commissions. Existing accounts are never reassigned. Paused campaign links reject attribution and the signup screen offers Remove campaign attribution so signup can continue without a campaign.
- Admin reviews email confirmation, profile role/market and a separate UTC-calendar-day return within seven days. Manual evidence and attestations establish real US real estate participation, no agents/duplicates/self-referrals/incentivized recruits, and a meaningful platform action. No signup is automatically qualified. Approved signup earnings are $1 each, capped at the agreed target.
- The existing verified Stripe membership webhook records a fixed 30% of the first eligible USD subscription-create payment, net of reported tax, within 30 days of signup. Renewals, zero payments, other currencies, duplicates and multiple first purchases do not generate additional commissions. The row is keyed by customer and stored under a campaign revision claim for concurrent webhook retries. Fourteen-day holding period; no wallet ledger entry, payout, bonus, rank increase or auto-payment exists.
- Refund/dispute webhook events reverse campaign commission, including a conservative full reversal on a partial refund. Reversed first purchases do not reopen eligibility. Already recorded external payments produce a visible reconciliation balance. Partial-refund commissions are withheld entirely; proportional reinstatement is not implemented.
- Record external payment saves a Fiverr/Upwork receipt and accounting amount only. It cannot transfer funds or access a bank, card, Stripe Connect or affiliate wallet. All Kenley compensation must be arranged and paid through Fiverr.
- Admin can pause/resume new attribution, paginate member review, inspect members and export a CSV. Participant text uses text nodes; CSV formula prefixes are escaped. Tutorial release 88 introduces campaign controls. Brand/mascot assets and prices are unchanged.

## Setup
1. Install, test, review, commit and push using INSTALL-v29.70.md.
2. After deployment, hard refresh. Open Admin → Acquisition campaigns → Create a campaign.
3. Keep Kenley — Fiverr trial, Fiverr, 25 approved signups. Create tracking link, expand the campaign and copy its real URL.
4. Send that URL to Kenley through Fiverr after agreeing on the 30-day purchase window and 14-day commission hold. No freelancer account, API key or payment connection is needed for tracking.
5. Ask recruits to use the link in the browser where they register. Kenley submits public professional evidence and Better usernames through Fiverr. Review each recruit; verify genuine buying criteria, a property post or a substantive conversation through authorized admin tools/user evidence. The campaign screen never reveals private conversation contents.
6. Pay approved amounts only through Fiverr. Record the resulting reference afterward; the UI does not make or initiate payment. A receipt entered by an admin is an accounting assertion, not independent confirmation from Fiverr.

## Validation and limits
All 99 npm test files, npm run build and changed JavaScript syntax checks pass. Integration tests execute signup, admin-only routes, qualification gates, duplicate approvals, parallel duplicate event processing, actual webhook wiring with a signature-verifier stub, tax exclusion, renewal and invalid event exclusion, refunds, payment bounds, paused links and zero affiliate wallet entries. DOM tests execute first-touch persistence/expiry/storage failures, lazy admin loading, default setup, inert participant markup, review payload and pause control. Existing tests were mechanically advanced to tutorial 88/package 2.9.70. One historical property replay test is pinned to its original October 20 reference date after reproducing the same age-related failure in the prior bundle. No property valuation production code changed.

No live production signup, payment, email, message, research-credit use, deployment or campaign creation was performed. PostgreSQL uses a single-row revision-guarded update; production database execution and concurrent cross-process behavior have not been live-tested. Local integration tests exercise serialized file-mode concurrency. New acquisitionCampaigns collection uses the existing auto-table initialization, without a new provider, dependency or environment variable.

Browser visual review remains pending: no local Chromium executable is available and the separate cloud browser cannot reach the local fixture server. Review 320px/390px/desktop in light/dark before production use. Fiverr is signed out in the available browser; Kenley's message was prepared, not sent.

## Pending requests deliberately separate from this tracking-only release
- 24-hour verification reminder cooldown with remaining wait.
- Customer-facing services browsing must not enter a provider management dashboard.
- Remove founder recognition/complimentary founder access from unconfirmed accounts, preserve paid/manual grants, and require email confirmation to claim an available spot within 50. No spot reserved at signup.

Those changes are not implemented in v29.70. Preserve them for the next requested bundle.
