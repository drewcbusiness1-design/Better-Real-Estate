# v29.37 — Gestures + Photo Drag

Package 2.9.37. Extract the release into ~/Downloads/Better Real Estate/.

## Install and verify

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.37-Gestures-Photo-Drag/" \
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

Inspect the mascot waves/thumbs-up/celebration and photo dragging on desktop/mobile. Drag using the label/grip under each image; Save keeps the order. Escape/outside drop/cancel leave it unchanged. The first photo is the cover. Arrow buttons remain available.

## Release after verification passes

Review git status for unrelated work before adding it.

```bash
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
git commit -m "v29.37 mascot gestures and property photo drag ordering"
git push origin main
```

If there is nothing to commit and a local release commit is already ahead, run git push origin main. A remote Internal Server Error may need a retry; never force-push for it.

Wait for Netlify deploy completion, then Cmd + Shift + R. This package has been checked locally; production has not been checked.

## Local verification

Full npm regression suite, all three syntax checks and whitespace check passed. Real Chromium component harnesses used the actual app functions and stylesheet at 1280, 390 and 320px in light/dark themes. Mouse and actual touch pointer drags changed the cover and save payload; Escape/touch cancellation preserved order. Header/Guide arm bounds and control overlap checks passed for wave, thumbs-up, celebration and tutorial pointing, with visual screenshot review. Animation-disabled behavior and stale gesture timers are covered. Server listing identity/owner/admin authorization persistence regressions remain passing. Logo/server/dependency comparison passed. These component tests use mocked accounts/API replies and do not claim authenticated production verification.
