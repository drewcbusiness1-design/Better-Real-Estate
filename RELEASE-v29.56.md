# v29.56 — Connected mascot gestures and tutorial controls

Includes all v29.55 functionality. No separate earlier release installation required.

- Move left / Move right matches Better’s buttons in light/dark.
- Connected, smooth greeting wave; clean thumbs-up and celebration.
- New purposeful gestures for saving a property, sending a message and advancing a deal.
- Gesture continuity across header refreshes; motion preferences respected.
- Tutorial / What’s New 76; default tutorial remains 10 steps with optional full walkthrough.

No new dependencies, provider, keys, billing behavior, database schema or background job. Exact logo and backend retained. Full local regression, animation geometry, browser cycles and responsive visual QA passed; live production not verified.

## Install and verify

Extract so this folder exists:
`~/Downloads/Better Real Estate/Better-Real-Estate-v29.56-Mascot-Motion/`

```bash
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='db.local.json' \
  "Better Real Estate/Better-Real-Estate-v29.56-Mascot-Motion/" \
  Better-Real-Estate/
cd Better-Real-Estate
npm test
node --check server.js
node --check public/app.js
node --check store.js
git diff --check
git status --short
```

Review the actual Git status for unrelated changes before staging or pushing. Commit message after the gate passes: `v29.56 connected mascot gestures and tutorial styling`. Do not force-push. After Netlify success, hard-refresh with Cmd + Shift + R, replay the tutorial and switch its side, greet the dog, save a real property, send a message and check the motion preference. Check full preparation/action/settle sequences on desktop/mobile.

The full handoff is Better-Real-Estate-v29.56-MASTER-SEAMLESS-HANDOFF.md. Earlier pending notes for the wave and tutorial controls are historical and superseded by this release.
