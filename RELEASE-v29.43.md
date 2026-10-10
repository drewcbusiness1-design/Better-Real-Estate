# v29.43 - All-time Admin User Activity

All time includes all available recorded activity, not a reconstructed lifetime event log. Older event detail can be pruned. Demo accounts and users with no recorded activity do not count as active.

Extract the ZIP inside ~/Downloads/Better Real Estate/ then run:

```bash
(
set -e
cd ~/Downloads
rsync -av --exclude='.git' --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.43-All-Time-Activity/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
git diff --check
git status --short
)
```

Review Admin > User activity on desktop/mobile. Choose All time then switch back to 24 hours and Custom. After checks pass, inspect git status for unrelated changes, then:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.43 all-time admin user activity"
fi
git push origin main
)
```

Wait for Netlify deploy to complete and hard-refresh Cmd + Shift + R. Assistant has not deployed this release.
