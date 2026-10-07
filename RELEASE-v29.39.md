# v29.39 — Deal Analysis

Fixes adaptive number cards, coherent withheld/manual comp valuation, blank-purchase assumptions, full/half bathroom evidence and bounded research output. Keeps fresh Post, selected emails, mascot gestures and photo dragging.

Extract the ZIP under ~/Downloads/Better Real Estate/, then:

```bash
(
set -e
cd ~/Downloads
rsync -av --exclude='.git' --exclude='.env' "Better Real Estate/Better-Real-Estate-v29.39-Deal-Analysis/" Better-Real-Estate/
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

Expected version 2.9.39. Inspect status for intended release changes; after all checks pass:

```bash
(
set -e
cd ~/Downloads/Better-Real-Estate
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.39 deal analysis layout and property evidence reliability"
fi
git push origin main
)
```

After Netlify deploy completes, Cmd + Shift + R. Re-test 4 Bennington Drive, East Windsor, NJ 08520. Cache namespace changed once to avoid old incomplete evidence.

QA includes full regressions, syntax, responsive actual-render UI with mocked API in both themes, diff/ZIP/logo checks. Live provider execution was not available in the dev environment. No guarantee of complete facts at an address with no accessible source. Full/half normalization only uses explicit source evidence. Provider/model, quotas, refresh guards and four-pass cap unchanged. Output ceiling increased to avoid the observed max_output_tokens truncation; there is no automatic retry loop.
