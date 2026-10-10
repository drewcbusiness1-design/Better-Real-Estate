# v29.47 release

Extract the ZIP under `~/Downloads/Better Real Estate/`. Install and check:

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.47-Affiliate-Leaderboard/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check affiliateLeaderboard.js
git diff --check
git status --short
)
```

Expected version: 2.9.47. Inspect affiliate terms, leaderboard/milestones and tutorial on desktop/mobile in light/dark. Affiliate-only header omits Messages and Boost; ordinary headers retain them. Current terms must be accepted before new commissions. Bonuses are new-program-only, capped, with no retroactive payments.

After checks pass and status contains only intended release changes:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.47 affiliate leaderboard commission growth and sales bonuses"
fi
git push origin main
)
```

Wait for Netlify success, then Cmd + Shift + R. No new environment variables or runtime dependencies. Existing production database and Stripe/email configuration remain. Do not reset the prior affiliate migration marker. No assistant deployment or live transfer occurred.
