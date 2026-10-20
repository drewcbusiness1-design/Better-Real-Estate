# Install v29.64

Download Better-Real-Estate-v29.64-Platform-Help-Management.zip. This is a full update including the unapplied v29.63 release, not a deployment. Preserve existing environment configuration and user uploads. Review unrelated local changes before copying or committing.

```bash
better_update_2964() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -type f -name 'Better-Real-Estate-v29.64-Platform-Help-Management*.zip' -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.64 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || {
    echo "Repository not found at Downloads/Better-Real-Estate."
    return 1
  }
  better_source="$(mktemp -d "${TMPDIR:-/tmp}/better-v2964.XXXXXX")" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.64.md" || return 1
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
  node --check store.js &&
  node --check public/app.js &&
  node --check public/service-provider-ui.js &&
  node --check serviceProviders.js &&
  node --check public/bundle-ui.js &&
  node --check releaseRoutes.js &&
  node --check landAnalysis.js &&
  node --check chartRanges.js &&
  git diff --check &&
  git status --short
}
better_update_2964
```

Preview with `npm start`. Check signup → Offer property services → service category. Existing accounts: Settings → Professional services profile → Open service workspace. Publish a profile, search it from another local account, send a quote request and verify Messages and job updates. Check preferred starting dashboard, both themes and phone width. Keep production emails disabled during local tests.

The release does not change environment variables, purchase services, send customer campaigns or deploy. Review changed files and your existing deployment workflow before committing/pushing.

Check Profile → Manage my properties, own listing Edit/Delete/Mark sold, dog → help/report, report reply privacy, land analysis → posting, and Admin → chart comparisons. Date-only searches must work; times remain optional. The prior v29.63 ZIP is not needed.
