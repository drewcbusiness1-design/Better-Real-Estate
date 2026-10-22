# Install v29.71

This full update includes v29.70 and its prior baseline. Preserve unrelated local changes and production data.

```bash
better_update_2971() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -type f -name 'Better-Real-Estate-v29.71-Campaign-Partners*.zip' -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.71 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || return 1
  better_source="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.71.md" || return 1
  rsync -av \
    --exclude='.git' \
    --exclude='.env' \
    --include='.env.example' \
    --exclude='.env.*' \
    --exclude='node_modules' \
    --exclude='db.local.json' \
    --exclude='public/uploads' \
    "$better_source/" "$HOME/Downloads/Better-Real-Estate/" || return 1
  cd "$HOME/Downloads/Better-Real-Estate" || return 1
  npm test &&
  npm run build &&
  node --check server.js &&
  node --check campaignTracking.js &&
  node --check public/app.js &&
  node --check public/bundle-ui.js &&
  node --check public/campaign-ui.js &&
  node --check public/campaign-partner-ui.js &&
  git diff --check &&
  git status --short
}
better_update_2971
```

After successful checks and visual review, with only intended changes:

```bash
cd ~/Downloads/Better-Real-Estate
git add -A
git commit -m "v29.71 linked campaign partners, conversion chart and archive"
git push origin main
```

After deployment Cmd+Shift+R. Have the partner create a normal Marketing / Affiliate-only account and confirm their email. Link their exact username inside Admin → Acquisition campaigns → existing campaign → Campaign partner account. They open Affiliate Center → Campaign partnerships. The standard affiliate application is not required for campaign access. Archive the old campaign only if you want it retired; linking it preserves all its data and its URL.
