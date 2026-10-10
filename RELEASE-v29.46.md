# v29.46 — Affiliate product training and side tutorial

Includes the full v29.45 baseline plus affiliate business-value training, the revised copyable message and edge-docked tutorials. No separate earlier install is needed.

Extract the ZIP inside ~/Downloads/Better Real Estate/, then copy and test:

```bash
(
set -e
cd ~/Downloads
rsync -av --exclude='.git' --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.46-Affiliate-Training/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateAccounts.js
node --check affiliateProspects.js
node --check affiliateQR.js
node --check verificationReminders.js
node --check netlify/functions/communications-cron.js
git diff --check
git status --short
)
```

Expected package version: 2.9.46. Review the Affiliate Center product guide, copyable message and current Plans button. Replay the tutorial on desktop/mobile in both themes; check Move left/right, Next, Back and Skip. Review git status for unrelated files. Once checks pass:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.46 affiliate product training and side tutorial"
fi
git push origin main
)
```

Wait for Netlify deploy completion, then hard-refresh Cmd + Shift + R. Check that affiliate-only users have no Founder badge/slot/automatic bonus but retain paid memberships and separate Admin grants. Test signup Terms/email preferences and Affiliate Center tools, including QR and private prospect stages. Unconfirmed-email reminders use the existing communications schedule and configured mail service; their first reminder is due after 48 hours, and verification stops them. Existing unsubscribes remain respected.

Assistant has not deployed or sent emails for this release. No new runtime dependencies/providers. Keep your existing production database, mail and .env configuration. Local "No database configured" messages during tests are development-only.
