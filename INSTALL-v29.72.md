# Install v29.72

This full update includes v29.71 and its prior baseline. Preserve unrelated local changes and production data.

```bash
better_update_2972() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -type f -name 'Better-Real-Estate-v29.72-Campaign-Proof*.zip' -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.72 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || return 1
  better_source="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.72.md" || return 1
  rsync -av \
    --exclude='.git' \
    --exclude='.env' \
    --include='.env.example' \
    --exclude='.env.*' \
    --exclude='node_modules' \
    --exclude='db.local.json' \
    --exclude='public/uploads' \
    --exclude='private' \
    "$better_source/" "$HOME/Downloads/Better-Real-Estate/" || return 1
  cd "$HOME/Downloads/Better-Real-Estate" || return 1
  npm test &&
  npm run build &&
  node --check server.js &&
  node --check campaignTracking.js &&
  node --check campaignProofStorage.js &&
  node --check public/app.js &&
  node --check public/bundle-ui.js &&
  node --check public/campaign-ui.js &&
  node --check public/campaign-partner-ui.js &&
  git diff --check &&
  git status --short
}
better_update_2972
```

After successful checks and visual review, with only intended changes:

```bash
cd ~/Downloads/Better-Real-Estate
git add -A
git commit -m "v29.72 campaign proof review, member search, verified founders and delete"
git push origin main
```

After deployment Cmd+Shift+R. Open Admin → Acquisition campaigns → Campaign partner account. Search all site members and select the partner's confirmed Affiliate-only account. The partner opens Affiliate Center → Campaign partnerships to upload proof (PDF/PNG/JPG/WebP, 2 MB per file, up to five per referral). You review and approve every referral before it earns $1 or enters approved numbers. A changed submission requires a fresh review.

Archive preserves campaign history. Delete permanently removes the campaign link, partner access, results, proof references and external-payment records after you type its name. Download the report first if needed. Existing member accounts and actual Fiverr/Upwork payments remain. Proof files are privately stored, never in public/uploads; preserve private/ for local file-mode installs.

Founder cleanup runs across existing accounts on the first authenticated request after deployment. Open your admin account to trigger it. Unconfirmed accounts lose recognition and founder-only complimentary access; paid plans and independent grants remain. Successful email verification immediately checks availability among the first 50 eligible confirmed members. Existing claimed spots are preserved; signup alone does not reserve a spot.
