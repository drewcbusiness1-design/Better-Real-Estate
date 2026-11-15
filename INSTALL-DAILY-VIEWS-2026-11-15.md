# Install and review the website candidate

This changes the website and its backend. It does not install or archive an iPhone app. No push or deployment has occurred. Complete the visual review before committing/pushing for production.

## Install and test

Save `Better-Website-Daily-Views-2026-11-15.zip` anywhere under Downloads, including Downloads/Better Real Estate. These commands stop on a dirty checkout or a different source baseline. Preserve unknown changes instead of resetting or overwriting them.

```bash
better_install_daily_views() {
  local better_repo better_zip better_stage
  better_repo="$HOME/Downloads/Better-Real-Estate"
  test -d "$better_repo/.git" || { echo "Website repository not found."; return 1; }
  cd "$better_repo" || return 1
  test -z "$(git status --porcelain)" || { echo "Uncommitted changes found. Stop and preserve them first."; return 1; }
  test "$(git branch --show-current)" = main || { echo "Review the current branch before proceeding."; return 1; }
  git pull --ff-only origin main || return 1
  test "$(git rev-parse HEAD)" = 836f313b17adb78acbb0679a36b539c783380909 || {
    echo "The repository differs from this candidate's verified baseline. Stop and reconcile the newer source."
    return 1
  }
  better_zip="$(find "$HOME/Downloads" -type f -name 'Better-Website-Daily-Views-2026-11-15*.zip' -print -quit 2>/dev/null)"
  test -n "$better_zip" || { echo "Download the candidate ZIP first."; return 1; }
  better_stage="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_stage" || return 1
  test -f "$better_stage/RELEASE-DAILY-VIEWS-2026-11-15.md" || return 1
  python3 "$better_stage/verify-daily-release.py" "$better_stage" || return 1
  git branch "backup/before-daily-views-$(date +%Y%m%d-%H%M%S)" || return 1
  rsync -av --exclude='.git' --exclude='node_modules' --exclude='.netlify' \
    --exclude='.env' --include='.env.example' --exclude='.env.*' \
    --exclude='db.json' --exclude='db.local.json' --exclude='public/uploads' --exclude='private' \
    "$better_stage/" "$better_repo/" || return 1
  npm ci || return 1
  npm test || return 1
  npm run build || return 1
  node --check server.js && node --check store.js && node --check dailyBrowsing.js && \
  node --check websiteAiUsage.js && node --check dealResearchJobs.js && node --check supportChat.js && \
  node --check netlify/functions/deal-research-background.js && node --check public/app.js || return 1
  git diff --check || return 1
  git status --short
  git diff --stat
}
better_install_daily_views
```

No `--delete`, reset, force push, data copy or secret copy is used. The original source is recoverable through the backup branch. Existing runtime files remain in place.

## Remaining visual review

```bash
cd "$HOME/Downloads/Better-Real-Estate"
npm run preview:browsing
```

Open `http://127.0.0.1:3159/__preview` in your own browser. This uses disposable fixture accounts and data and clears provider keys. It does not connect to production accounts or persistence. Keep it local. Use the width, theme, account, page and Used controls to review the states listed in the release handoff. Open details from a feed card. Set Used to 29 to test the last view, then scroll to the next card for the upgrade gate; Used 30 opens the gate immediately. The AI screen shows the correct allowance, but this fixture is not a live AI-provider test. Stop with Control+C when finished.

Targeted recheck after any changes:

```bash
cd "$HOME/Downloads/Better-Real-Estate"
npm run test:browsing
```

## Commit and push after visual acceptance

Do not run this section while required visual checks remain incomplete. Review every intended diff first. The file list stages only this candidate's source, tests and handoff files, not unrelated data or secrets.

```bash
better_commit_daily_views() {
  local better_path
  cd "$HOME/Downloads/Better-Real-Estate" || return 1
  git diff --check || return 1
  git diff --stat
  git status --short
  while IFS= read -r better_path; do
    test -n "$better_path" || continue
    git add -- "$better_path" || return 1
  done < RELEASE-DAILY-VIEWS-CHANGED-FILES.txt
  git diff --cached --check || return 1
  git diff --cached --stat
  git diff --cached
  git commit -m "Website daily browsing and two free AI analyses" || return 1
  git push origin HEAD:main
}
better_commit_daily_views
```

A push does not by itself prove Netlify deployed successfully. After the deploy completes, verify its commit and function packaging, then use authorized test accounts to check Free and paid access. Inspect `kv_browsingusage` and `kv_websiteaiusage` initialization and real concurrent admission in PostgreSQL. Confirm both quotas across two browser sessions. Verify exact contact access, the limit gate, successful-only AI accounting, daily reset, current pricing and native compatibility. No environment variable is required by this change. Keep existing database/provider/session settings unchanged. Do not run real billing or exhaust research credits just to smoke-test unrelated features.
