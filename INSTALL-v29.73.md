# Install v29.73

Download Better-Real-Estate-v29.73-Partner-Outreach.zip. This is the full source bundle; preserve the existing database, uploads, private proof storage and environment files. Do not share or copy production secrets into the bundle.

```bash
better_update_2973() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" \
    -type f -name 'Better-Real-Estate-v29.73-Partner-Outreach*.zip' \
    -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.73 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || return 1
  better_source="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.73.md" || return 1
  rsync -av --exclude='.git' --exclude='.env' \
    --include='.env.example' --exclude='.env.*' \
    --exclude='node_modules' --exclude='db.local.json' \
    --exclude='public/uploads' --exclude='private' \
    "$better_source/" "$HOME/Downloads/Better-Real-Estate/" || return 1
  cd "$HOME/Downloads/Better-Real-Estate" || return 1
  npm test && npm run build &&
  node --check server.js && node --check store.js &&
  node --check mailer.js && node --check campaignTracking.js &&
  node --check campaignOutreach.js && node --check public/app.js &&
  node --check public/campaign-ui.js && node --check public/campaign-partner-ui.js &&
  node --check public/outreach-ui.js && git diff --check && git status --short
}
better_update_2973
```

After checks and review, with only intended changes:

```bash
cd ~/Downloads/Better-Real-Estate
git add -A
git commit -m "v29.73 approved partner email and campaign agreements"
git push origin main
```

After deployment, hard-refresh:

1. Have the partner create a free Marketing / Affiliate-only account and verify email. In Admin > Acquisition campaigns, link the account to the existing Upwork campaign. Keep the five-user campaign for the pre-test; change the target to 35 only after written continuation is agreed.
2. In the same campaign, Edit target and commission agreement updates the target and rate without replacing its link. Keep 30% during the trial. Use 35% only after the long-term terms are agreed. Each change needs a note/reference and applies from now by actual payment date. It never changes existing recorded commissions.
3. Confirm existing APP_URL=https://betterrealestate.org, RESEND_API_KEY and SESSION_SECRET are set. Set MARKETING_POSTAL_ADDRESS to the actual valid business postal address if it is missing. No new payment credential is needed. Never paste any secret into chat or a partner draft.
4. Verify betterrealestate.org is an approved sending domain in Resend and partners@betterrealestate.org is a working company-controlled receiving inbox. The app uses that exact sender/reply address; no personal affiliate mailbox is created.
5. The partner opens Affiliate Center > Outreach email, chooses the campaign, fills the recipient/source/subject/message and saves. Open Preview complete email, check the free signup link and signature, then Submit for admin review.
6. You open Admin > Acquisition campaigns > Partner email approvals. Open the draft and Preview complete email. Approve reviewed version does not send it. Send approved email dispatches that exact approved version. Request changes returns it to the partner. Any edit requires resubmission and approval.
7. Deliberately test delivery to an inbox you control. Confirm the actual From and Reply-to, link attribution, postal address, unsubscribe, provider acceptance record and receipt in the partners inbox. Test partner isolation with another account. Review desktop and phone in light/dark before normal use.
8. The $1 approval workflow and all compensation remain external through the selected freelance platform. Recording an external payment never sends money. The company email queue does not change these payment rules.

Retries: an unconfirmed send can retry the identical saved payload/key for 23 hours. After that, check Resend's record; do not assume an unconfirmed request was never sent. Daily limits are 20 attempts per partner, 100 overall, and one attempt per recipient per 24 hours across partners. Replies remain in the company inbox; this release records provider acceptance rather than delivery/open events.
