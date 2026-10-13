# v29.54 install and verify

Not deployed by assistant. Save/extract in ~/Downloads/Better Real Estate/.

```bash
(
set -e
cd ~/Downloads
rsync -av --exclude='.git' --exclude='.env' --exclude='node_modules' --exclude='db.local.json' "Better Real Estate/Better-Real-Estate-v29.54-Support-Workspace/" Better-Real-Estate/
cd Better-Real-Estate
npm ci
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check supportChat.js
node --check mailer.js
node --check netlify/functions/api.js
git diff --check
git status --short
)
```

Review actual status before commit/push. After Netlify completes, check Command Center, Quick Create, market search, public arrows and Chat with Better. Request human help once to verify real admin email delivery and authenticated thread opening. Verify existing OpenAI/Resend/APP_URL configuration if unavailable. No live provider sends or deployment occurred during build.
