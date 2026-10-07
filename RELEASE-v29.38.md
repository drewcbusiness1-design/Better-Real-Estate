# v29.38 — Post + Property Facts + Individual Email

Package 2.9.38. Extract the release into ~/Downloads/Better Real Estate/.

## Install and verify

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.38-Post-Property-Email/" \
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

Check Post after leaving a property edit: address, fields and photos must start blank. Edit property still preloads the existing property. In Email Center, choose Select individual people, search/check recipients and review the eligible count before sending. Marketing eligibility and unsubscribe rules remain in effect.

The analyzer now focuses on subject facts before comps, retains complete consulted sources, handles partial bathrooms and invalidates old cached research. Missing/conflicting facts stay labeled. The screenshot's exact Faxon property's beds/baths are not verified; confirm the full address and inspect real Admin Research diagnostics if it still returns no facts after deployment.

## Release after verification passes

Review git status for unrelated work before adding it.

```bash
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
git commit -m "v29.38 fresh Post, property facts and individual email selection"
git push origin main
```

If there is nothing to commit and a local release commit is already ahead, run git push origin main. A remote Internal Server Error may need a retry; never force-push for it.

Wait for Netlify deploy completion, then Cmd + Shift + R. This package has been checked locally; production has not been checked.

## Local verification

Full npm regression suite, Node syntax checks and whitespace review pass. Actual Chromium component harnesses run at 1280, 390 and 320px in light/dark: fresh Post/edit/explicit AI draft, selected-recipient search/retention/removal/eligibility and exact mocked send payload, recorded beds/partial baths display, missing facts and per-pass error diagnostics. Screenshots reviewed and narrow diagnostic wrapping corrected. Browser/API replies are mocked; no emails sent and no production property research verified. The workspace lacks OPENAI_API_KEY. Test fixtures do not assert real property facts. Server/property identity/auth regressions remain passing. Original logos and runtime dependencies are unchanged. ZIP integrity/version checked before delivery.
