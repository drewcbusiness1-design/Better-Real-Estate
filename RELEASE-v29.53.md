# v29.53 — Phone and affiliate commission controls + search discovery

Complete bundle; expected package version 2.9.53. No deployment by assistant.

Install and test first:

```bash
(
set -e
cd ~/Downloads
mkdir -p "Better Real Estate"
unzip -oq Better-Real-Estate-v29.53-Phone-Affiliate-Control.zip -d "Better Real Estate"
rsync -av --exclude='.git' --exclude='.env' --exclude='node_modules' --exclude='db.local.json' \
  "Better Real Estate/Better-Real-Estate-v29.53-Phone-Affiliate-Control/" Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateLeaderboard.js
node --check accountPhone.js
git diff --check
git status --short
)
```

Review git status for unrelated local edits before staging. Only after all checks pass and changes are reviewed:

```bash
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.53 phone numbers affiliate commission controls and search discovery"
fi
git push origin main
```

After Netlify succeeds, hard-refresh Cmd+Shift+R. Admin Affiliate > Manage commission proposes individual agreements; each affiliate accepts before future payments use the rate. No account was preset to 50%. Phone is optional at signup, mandatory for a new badge request; no SMS ownership verification. Existing earned commission amounts and legacy verification remain intact. Public guides at /guides/ and updated sitemap.xml. Follow GROWTH-SETUP-v29.53.md after deployment for external search setup; rankings are not guaranteed.

Full npm/syntax/whitespace, actual local PostgreSQL commission/CAS, real app browser 1280/390/320 light/dark and 24 guide page combinations passed. Live Stripe/Meta/email/production not verified. No credentials, seed DB or QA dependencies included.
