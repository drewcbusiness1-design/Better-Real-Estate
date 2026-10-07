# v29.41 — First 50 Founders

Package2.9.41, tutorial63. First50 qualifying signup ranks receive Founder recognition and14days complimentary Platinum. Automatic awards beyond50 retire while paid memberships and separate admin grants are preserved. Historical awards/dates retained; deletion refill never restarts prior bonuses.

Extract under Downloads/Better Real Estate. Install/check:

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.41-First-50/" \
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

Expect2.9.41. After checks pass and status contains only intended release changes:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.41 first 50 founders and privilege limit"
fi
git push origin main
)
```

AfterNetlifycompletes, Cmd+Shift+R. CheckAdminMemberships shows cap50 with accurate claimed/remaining count. Normal request migration reconciles existing automatic awards. Userpreview/invite says First50. No forced research refresh or newproviderconfiguration needed.
