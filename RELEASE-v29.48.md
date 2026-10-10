# v29.48 — Admin Affiliate Management & Growth

Extract this release into `~/Downloads/Better Real Estate/` so the release folder is `~/Downloads/Better Real Estate/Better-Real-Estate-v29.48-Admin-Affiliate-Growth/`. The live git checkout remains `~/Downloads/Better-Real-Estate`.

This release adds Admin program management and shared workbench editing, plan/rate calculator scenarios, affiliate-only Guide help, prospect sourcing training and on-demand recorded growth charts. Current financial terms, prices and payout workflows are unchanged. Charts report recorded history, not reconstructed lifetime activity.

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
  "Better Real Estate/Better-Real-Estate-v29.48-Admin-Affiliate-Growth/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateContent.js
node --check activityGrowth.js
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
  git commit -m "v29.48 admin affiliate management and growth charts"
fi
git push origin main
)
```

Wait for Netlify to finish, then hard-refresh with Cmd + Shift + R. Check Affiliate as Admin: no personal application/rank/milestone view, editable shared guidance/scripts, affiliates and earnings filters. Check Affiliate as an ordinary affiliate: personal earnings preserved, current plan/rate calculator and relevant help dog. In Admin User activity choose a date range then View growth charts; inspect chart points or the period dropdown on mobile. No assistant production push, deployment, emails or payouts were performed.
