# v29.51 — Meta Pixel loader in head

Extract this release into `~/Downloads/Better Real Estate/` so the release folder is `~/Downloads/Better Real Estate/Better-Real-Estate-v29.51-Meta-Pixel-Head/`. The live git checkout remains `~/Downloads/Better-Real-Estate`.

This release moves the single Meta Pixel loader into <head>, immediately before </head>. Public marketing PageView, Terms/Privacy disclosure and Settings opt-out from v29.50 remain. No signup checkbox, popup, advanced matching, signup conversion or purchase conversion is added. The full v29.48 app is retained.

Run the install and verification gate first:

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='db.local.json' \
  "Better Real Estate/Better-Real-Estate-v29.51-Meta-Pixel-Head/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateContent.js
node --check activityGrowth.js
node --check public/meta-pixel.js
git diff --check
git status --short
)
```

After all checks pass, inspect the status for unrelated work and review the new views. Then commit and push:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.51 move Meta Pixel loader into head"
fi
git push origin main
)
```

Wait for Netlify to finish, then hard-refresh with Cmd + Shift + R. Check Affiliate as Admin: no personal application/rank/milestone view, editable shared guidance/scripts, affiliates and earnings filters. Check Affiliate as an ordinary affiliate: personal earnings preserved, current plan/rate calculator and relevant help dog. In Admin User activity choose a date range then View growth charts; inspect chart points or the period dropdown on mobile. No assistant production push, deployment, emails or payouts were performed.

Meta Pixel 1783797429493375 measures public marketing PageView only. Settings contains the opt-out; no signup checkbox/popup. After Netlify succeeds, confirm PageView in Meta Events Manager > Test events from a signed-out browser without opt-out/browser privacy signals or ad blockers. Live Meta receipt was not verified by assistant. Phone requirements remain saved for later.
