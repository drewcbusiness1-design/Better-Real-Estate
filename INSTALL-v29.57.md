# Install v29.57 locally

Download Better-Real-Estate-v29.57-Connected-Deals.zip into Downloads. The ZIP contains project files directly, without an extra enclosing folder.

These commands copy into the existing repository while preserving .git, .env, dependencies and local data. They do not push or deploy.

```bash
mkdir -p "$HOME/Downloads/Better Real Estate/v29.57-Connected-Deals"
unzip -o "$HOME/Downloads/Better-Real-Estate-v29.57-Connected-Deals.zip" -d "$HOME/Downloads/Better Real Estate/v29.57-Connected-Deals"
rsync -av --exclude='.git' --exclude='.env' --exclude='node_modules' --exclude='db.local.json' --exclude='public/uploads' "$HOME/Downloads/Better Real Estate/v29.57-Connected-Deals/" "$HOME/Downloads/Better-Real-Estate/"
cd "$HOME/Downloads/Better-Real-Estate"
npm test
node --check server.js
node --check public/app.js
node --check store.js
git diff --check
git status --short
```

If dependencies are absent, run `npm ci` before `npm test`. There are no new runtime dependencies in this update.

Review the resulting diff/status before committing or pushing. Keep existing production environment variables and PostgreSQL configuration. LISTING_ARV_WARNING_PERCENT is optional and defaults to 15; do not replace your .env with .env.example.

The source package was validated locally. Production deployment, live email delivery and licensed provider access have not been verified in this build session.
