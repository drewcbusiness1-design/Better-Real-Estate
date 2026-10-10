# v29.44 — Affiliate-only accounts + All time activity

This bundle includes the deferred All time Admin User Activity feature and Marketing / Affiliate-only accounts. No separate v29.43 installation is needed. Approved existing affiliates move once on the first deployed database load; future approvals do not change account types. Admin/demo accounts and pending/denied/suspended/revoked applications are protected. Existing plans, founder benefits, cash, tracking and payout details remain intact. Affiliate-only signup does not bypass approval.

Extract the ZIP inside ~/Downloads/Better Real Estate/, then copy and test:

```bash
(
set -e
cd ~/Downloads
rsync -av --exclude='.git' --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.44-Affiliate-Accounts/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateAccounts.js
git diff --check
git status --short
)
```

Expected package version: 2.9.44. Review signup, Affiliate Center/footer, Network exclusion and Admin > User activity > All time on desktop/mobile. Review git status for unrelated files. Once checks pass:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.44 affiliate-only accounts and all-time admin activity"
fi
git push origin main
)
```

Wait for Netlify deploy completion, hard-refresh Cmd + Shift + R, and open the app. The one-time migration runs automatically on first database load. In Admin user inspector check approved existing affiliates show role affiliate and Admin remains Admin. New Marketing / Affiliate only accounts start in Affiliate Center; new buyer/seller/lender affiliates keep those roles unless explicitly changed in Settings. The database marker must remain in future versions.

Assistant has not deployed this release. Development-only "No database configured" messages during local tests are expected; keep the existing production DATABASE_URL and .env configuration.
