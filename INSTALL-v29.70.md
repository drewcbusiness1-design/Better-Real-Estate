# Install v29.70

Full source update. Preserve unrelated work. No dependency or environment changes.

```bash
better_update_2970() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" -type f -name 'Better-Real-Estate-v29.70-Campaign-Tracking*.zip' -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.70 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || return 1
  better_source="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.70.md" || return 1
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
  node --check affiliateLeaderboard.js &&
  node --check campaignTracking.js &&
  node --check public/app.js &&
  node --check public/campaign-ui.js &&
  git diff --check &&
  git status --short
}
better_update_2970
```

After checks and visual review, with only intended files staged:

```bash
cd ~/Downloads/Better-Real-Estate
git add -A
git commit -m "v29.70 tracking-only freelancer acquisition campaigns"
git push origin main
```

After deployment, Cmd+Shift+R. Open Admin → Acquisition campaigns. Create the prefilled Kenley / Fiverr / 25-user campaign, copy the generated URL and use the message below. Confirm his agreement before starting work. All payments through Fiverr; Record external payment only records receipts.

## Prepared Fiverr message — not sent

Hi Kenley, I’m adding a dedicated tracking-only campaign link for this project. It will attribute new accounts and their first eligible paid membership purchase, without using Better’s affiliate wallet. All compensation will be paid through Fiverr.

The proposed trial is $1 per approved qualified user, up to 25 users, plus a flat 30% of their first eligible membership payment after discounts and excluding taxes, refunds and chargebacks. No renewals, leaderboard increases or bonuses. The proposed purchase window is 30 days after signup, with a 14-day commission hold.

Once the update is live, I’ll send your dedicated link. Please have prospects use it in the same browser where they create their accounts, and submit their Better usernames and public real estate qualification evidence through Fiverr. Email confirmation, profile completion, a meaningful action and a return on a separate day within seven days are required for the $1 signup payment.

Can you confirm these tracking/payment terms and your timeline for the initial 25 qualified users, including the return-visit verification period?

Do not append an invented link. Copy the real campaign URL after creating it in Admin.
