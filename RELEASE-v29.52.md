# v29.52 Search discovery and property sharing

New public guides and linked hub, homepage metadata, expanded sitemap, deployed /s routing, branded property preview and tutorial72. GROWTH-SETUP-v29.52.md contains external account/indexing and affiliate/creator steps. Static guides make no API, AI, tracking or database calls.

## Install and check
Download ZIP into ~/Downloads. ZIP contains its named top-level folder, so extract into Better Real Estate as below. These commands preserve .git and .env and do not delete live files. Review git status for unrelated changes before committing.

```bash
(
set -e
cd ~/Downloads
mkdir -p "Better Real Estate"
unzip -q -o Better-Real-Estate-v29.52-Search-Discovery.zip -d "Better Real Estate"
rsync -av --exclude='.git' --exclude='.env' --exclude='node_modules' "Better Real Estate/Better-Real-Estate-v29.52-Search-Discovery/" Better-Real-Estate/
cd Better-Real-Estate
node -p "require('./package.json').version"
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check netlify/functions/api.js
git diff --check
git status --short
)
```

After tests pass and status contains only intended work:

```bash
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
if ! git diff --cached --quiet; then
  git commit -m "v29.52 search discovery guides and property sharing"
fi
git push origin main
```

Wait for successful Netlify deploy. Open /guides/ and a real property share link; then submit sitemap.xml in your verified Google and Bing accounts. No deployment, external submission, outreach or ranking guarantee has been performed by assistant.

Validation: full npm suite through52; syntax; all changed-file whitespace; actual serverless dispatch;24 Express guide page theme/width combinations at1280/390/320; FAQ and CTA links; active/archived/property escaping; existing authenticated Admin/affiliate/editor/calculator/charts/Guide/Pixel opt-out browser regression; screenshot inspection; protected file byte comparisons; ZIP integrity and exclusions. Tests/browser ran sequentially because of shared QA local DB.
