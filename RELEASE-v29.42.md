# v29.42 Sitemap and search discovery

Extract this folder under ~/Downloads/Better Real Estate/. Run the following commands to copy, test, commit and push. Expected package version: 2.9.42.

```bash
(
set -e
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/Better-Real-Estate-v29.42-Sitemap/" \
  Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
git diff --check
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.42 sitemap and search discovery"
fi
git push origin main
)
```

After Netlify finishes deploying, open https://betterrealestate.org/sitemap.xml and https://betterrealestate.org/robots.txt. The first must show XML, not the app. In Google Search Console, choose the betterrealestate.org property, open Sitemaps, enter sitemap.xml (or the full URL if requested), then Submit. Submission is a discovery hint, not a promise of indexing.

The sitemap currently lists only the canonical public homepage. No account, admin, private property, or guessed SPA routes are included. No invented modification dates. Static files use no function, database, or research API calls. The existing non-forced Netlify SPA fallback preserves these physical files; explicit response content types are configured.

Full regression suite and syntax checks passed. XML structure, static HTTP 200 responses/content types, Netlify routing configuration, unchanged protected code/assets and changed-line whitespace checked. No UI changes: tutorial remains 63; this release guide provides setup onboarding. Production deployment and Search Console submission are not performed by the assistant.
