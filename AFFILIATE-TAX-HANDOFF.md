# Affiliate tax safeguards — draft, not deployed

Prepared November 6, 2026. Based on existing main commit `79ec567133871d43cec1ee00f31bf139b096701e`. Preserves the current source, v29.75 presentation lineage and subsequent website fixes. This is a website/shared-backend change; no native iPhone source or App Store build was changed. Do not treat this branch as a released or fully compliance-certified package.

## Implemented in this draft

- Affiliate Center: submit a completed, signed PDF (up to 1 MB), view status, download one's own submitted form and replace it. Replacement pauses cash withdrawals until reviewed. W-9 and foreign W-8 paths are distinguished; foreign forms remain blocked for professional withholding/reporting review.
- Admin Affiliate Center: private document download, revision-checked W-9 review, request replacement, hold for review, and payment-review CSV by calendar year in America/New_York. Review includes confirming that backup withholding is not required; this release does not implement withholding or IRS TIN matching.
- Signed PDFs are encrypted using AES-256-GCM with random nonces and owner/document-bound authenticated data. They are stored in the separate `private_affiliate_tax` table, outside the general database snapshot, public uploads and user/profile records. Local development uses the ignored `private/affiliate-tax.local.json` file with restricted permissions. Never commit that directory or any actual form.
- Documents and submission/access/review events are retained through replacements; optimistic revision guards reject concurrent/stale tax writes. Tax response/download routes require authentication, owner/admin authorization and no-cache headers. User-origin writes check Origin. No SSN/TIN is returned as a normal profile field, logged intentionally, exported in the payment CSV or sent through email.
- The affiliate withdrawal API independently checks tax approval and document decryptability before its existing Stripe transfer path. Missing configuration, missing/rejected/replaced documents and foreign-review cases fail closed. Invalid numeric amounts are rejected.
- The existing Netlify wrapper now encodes PDF responses as binary, tested byte-for-byte. Existing seller withdrawals, non-withdrawable Better Credits, affiliate rates/holds/bonuses and payout balances are not rewritten.
- Privacy disclosure updated November 6. The export is a review worksheet, not a tax form, filing or complete accounting reconciliation. Paid rows may need corrections against Stripe; changed statuses are flagged.

## Activation dependencies and unresolved checks

1. Before deploying, create a dedicated cryptographically random 32-byte key, encoded as 64 hexadecimal characters, in the existing hosting provider's secret environment setting `AFFILIATE_TAX_ENCRYPTION_KEY`. Keep it out of chat, git, downloads and product screens. Securely back it up separately from database backups. Do not reuse the session/Stripe secret, rotate casually or lose it: previously stored forms require the original key. There is no automated key-rotation migration in this draft.
2. Review the actual affiliate and admin screens on desktop/narrow browser widths and in both existing themes. Local Chromium was blocked by process/socket permissions; the cloud browser could not reach the local fixture (`ERR_CONNECTION_REFUSED`). DOM execution tests are not visual verification. No every-page visual review is claimed. Until this check is complete, keep the PR a draft.
3. Validate dedicated-table persistence, access and encrypted backup/restore in a non-production deployment with synthetic documents only, then verify the production environment before accepting actual tax forms. Live PostgreSQL and live Stripe configuration were not accessed in this run; SQL revision guards were exercised with a driver stub.
4. Confirm actual entity/payer tax identity, worker classification (including applicable NJ rules), retention policy, payment method reporting responsibility, state requirements and annual filing process with a qualified professional. Code does not classify workers, approve foreign withholding, remit backup withholding or file/deliver 1099s. Stripe Express does not itself remove the platform's filing responsibility.
5. The existing transfer-before-save affiliate payout workflow still needs a separate reliability review for ambiguous provider responses, concurrent withdrawals and persistence failures. This draft adds a tax gate; it does not redesign or certify that pre-existing money-movement flow. Do not retry an uncertain actual payout without reconciling Stripe transfer state.

Without the encryption key this code blocks affiliate cash withdrawals, including existing affiliates, while preserving links, earning records and balances. Plan rollout and affiliate communication before deployment. No live payouts were attempted and no tax forms were collected in this run.

## Five review passes

1. Requirements/data flow: inspected the actual affiliate endpoints, Stripe Express setup, existing terms and public-profile handling; checked current IRS W-9/2026 reporting guidance and Stripe filing responsibility. This does not settle worker classification or all tax obligations.
2. Security/access: executable encryption/authentication, missing/wrong-key, input size, owner/admin isolation, no-store, cross-origin, replacement, revocation, foreign hold and stale/concurrent-write checks passed. Not an independent penetration test.
3. Payout/reporting: real local HTTP routes with stubbed Stripe verified tax-gate enforcement, valid/invalid amount behavior, paid-only reporting, year boundary, CSV formula escaping and post-payment adjustment warnings. Actual Netlify wrapper returned identical PDF bytes. No real funds moved.
4. Interface: actual affiliate/admin rendering functions were executed for missing, submitted, approved, rejected, foreign, unavailable and error states; upload payload, approval identity/revision and withdrawal enablement passed. Browser visual verification remains BLOCKED as described above.
5. Regression/source/build: full npm suite passed; targeted tax and updated privacy tests passed after final changes. JavaScript syntax, npm static build, Netlify local function build and whitespace checks passed. Built API archive contained the exact tax module. All six local function archives were inspected for environment/runtime/private tax files; none were included. Current branding, native source, seller-wallet logic and unrelated tracked files are unchanged. These are local results, not deployment claims.

## Review/install and test commands

Preserve local modifications first. These commands are for a clean checkout and the draft branch, not production activation:

```bash
cd "$HOME/Downloads/Better-Real-Estate"
git status --short
git fetch origin
git switch --track origin/feat/affiliate-tax-safeguards
npm ci
npm run test:affiliate-tax
npm test
npm run build
node --check affiliateTax.js
node --check server.js
node --check public/app.js
node --check netlify/functions/api.js
git diff --check
./node_modules/.bin/netlify functions:build --src netlify/functions --functions /tmp/better-affiliate-tax-functions
npm start
```

If that local branch already exists, switch to it without recreating it. Use synthetic tax PDFs only during review. Do not add live tax documents, runtime databases or secrets to a release archive.

Equivalent intended-file commit/push commands (the agent may use the authenticated GitHub connector instead):

```bash
git add -- affiliateTax.js server.js public/app.js public/style.css netlify.toml netlify/functions/api.js package.json tests/affiliate-tax.test.cjs tests/affiliate-tax-routes.test.cjs tests/affiliate-tax-ui.test.cjs tests/legal-cookie.test.cjs AFFILIATE-TAX-HANDOFF.md
git diff --cached --check
git diff --cached --stat
git commit -m "Add draft affiliate tax documentation and withdrawal safeguards"
git push -u origin feat/affiliate-tax-safeguards
```

No main-branch push, merge or production deployment was performed. Complete blockers before proposing activation; do not install an unreviewed ZIP. No iPhone installation/archive commands apply because no native release was made.

## Sources checked November 6, 2026

- https://www.irs.gov/forms-pubs/about-form-w-9
- https://www.irs.gov/businesses/small-businesses-self-employed/forms-and-associated-taxes-for-independent-contractors
- https://www.irs.gov/businesses/small-businesses-self-employed/a-guide-to-information-returns (2026 federal 1099-NEC threshold $2,000; exceptions/state rules require review)
- https://www.nj.gov/labor/myworkrights/worker-protections/independent_contractors/
- https://support.stripe.com/questions/1099-tax-reporting-and-filing-for-platforms-and-marketplaces

The provider's tax-reporting products were researched, not enabled or purchased. This draft adds no external integration or dependency.
