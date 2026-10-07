# v29.40 — ARV / Comps

Package2.9.40 · tutorial62. Three comp corroboration can support a clearly labeled low-confidence working range without relaxing precise ARV requirements. Subject disputes still withhold. Source links and excluded sale reasons are visible. Server and calculator use consistent subject eligibility. Existing cached evidence is reused; no provider or model change.

The supplied Bennington fixture supports a working estimate under this policy; location and renovation condition still need confirmation. This is not a new live provider result.

Extract the ZIP under Downloads/Better Real Estate so the source folder below exists.

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.40-ARV-Comps/" \
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

Expected2.9.40. Inspect status for unrelated work; after checks pass:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.40 working ARV and transparent sold comp calculations"
fi
git push origin main
)
```

After Netlify completes, Cmd+Shift+R and analyze 4 Bennington Drive, East Windsor, NJ08520. Review selected sales/source links, working range, price inputs and math. Cached evidence is rescored automatically; refresh research is not required solely for this update.
