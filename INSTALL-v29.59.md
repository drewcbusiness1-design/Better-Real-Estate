# Install v29.59

Download Better-Real-Estate-v29.59-Commercial-Preview.zip. This completed package includes all v29.58 changes and replaces the previous video. ZIP files are directly at its root.

Paste this complete block into Mac Terminal. It finds the ZIP in Downloads, Desktop or Documents, extracts it to a fresh temporary folder, checks the expected release marker, copies while preserving .git/.env/dependencies/local data/uploads, and runs the checks. It does not deploy.

```bash
better_update_2959() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -type f -name 'Better-Real-Estate-v29.59-Commercial-Preview*.zip' -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the completed v29.59 ZIP first."
    return 1
  fi
  better_source="$(mktemp -d "${TMPDIR:-/tmp}/better-v2959.XXXXXX")" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.59.md" || return 1
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || { echo "Existing repository not found at Downloads/Better-Real-Estate. Stop here."; return 1; }
  rsync -av --exclude='.git' --exclude='.env' --exclude='.env.*' --exclude='node_modules' --exclude='db.local.json' --exclude='public/uploads' "$better_source/" "$HOME/Downloads/Better-Real-Estate/" &&
  cd "$HOME/Downloads/Better-Real-Estate" &&
  npm test &&
  node --check server.js &&
  node --check public/app.js &&
  node --check store.js &&
  node --check marketing.js &&
  git diff --check &&
  git status --short
}
better_update_2959
```

Only after these checks pass and you review the changed files, commit and push:

```bash
cd "$HOME/Downloads/Better-Real-Estate" &&
git add -A &&
git commit -m "Release v29.59: commercial preview and styled deal room action" &&
git push
```

If dependencies are absent, run npm ci first. No new production dependencies or API keys. Do not replace existing DATABASE_URL, Resend keys, APP_URL, mail sender or marketing configuration.

After deployment: open homepage signed out and play the commercial, then open a linked pipeline Deal room; open Admin > Email Center to inspect actual readiness and promo settings; test unsubscribe using your own account only. Provider acceptance is not proof of inbox delivery. No cold leads are imported or emailed by this release.
