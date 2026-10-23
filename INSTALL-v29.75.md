# Install v29.75

Download Better-Real-Estate-v29.75-Affiliate-Workflow.zip. This is the full source bundle; preserve the existing database, uploads, private proof storage and environment files. Do not share or copy production secrets into the bundle.

```bash
better_update_2975() {
  local better_zip better_source
  better_zip="$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/Documents" \
    -type f -name 'Better-Real-Estate-v29.75-Affiliate-Workflow*.zip' \
    -print -quit 2>/dev/null)"
  if [ -z "$better_zip" ]; then
    echo "Download the v29.75 ZIP first."
    return 1
  fi
  test -d "$HOME/Downloads/Better-Real-Estate/.git" || return 1
  better_source="$(mktemp -d)" || return 1
  unzip -q "$better_zip" -d "$better_source" || return 1
  test -f "$better_source/RELEASE-v29.75.md" || return 1
  rsync -av --exclude='.git' --exclude='.env' \
    --include='.env.example' --exclude='.env.*' \
    --exclude='node_modules' --exclude='db.local.json' \
    --exclude='public/uploads' --exclude='private' \
    "$better_source/" "$HOME/Downloads/Better-Real-Estate/" || return 1
  cd "$HOME/Downloads/Better-Real-Estate" || return 1
  npm test && npm run build &&
  node --check server.js && node --check store.js &&
  node --check mailer.js && node --check campaignTracking.js &&
  node --check campaignOutreach.js && node --check outreachInbox.js && node --check public/app.js &&
  node --check public/campaign-ui.js && node --check public/campaign-partner-ui.js &&
  node --check public/outreach-ui.js && node --check public/delete-confirm-ui.js && git diff --check && git status --short
}
better_update_2975
```

After checks and review, with only intended changes:

```bash
cd ~/Downloads/Better-Real-Estate
git add -A
git commit -m "v29.75 direct submissions, alerts and approve-and-send"
git push origin main
```

After deployment, hard-refresh. Preserve all prior campaign/payment/proof settings. The PDFs are unchanged.

1. Keep APP_URL=https://betterrealestate.org, SESSION_SECRET, MARKETING_POSTAL_ADDRESS and existing sender-domain configuration. Keep SESSION_SECRET stable. Never paste secrets into chat or a draft.
2. In Resend, add a separate receiving subdomain, for example reply.betterrealestate.org. Add only the DNS records Resend supplies for that subdomain. Do not replace the root domain's MX records or disrupt the existing partners mailbox. Verify receiving before sending.
3. Set OUTREACH_REPLY_DOMAIN to that lowercase domain only, without an @ or URL. Set up a Resend email.received webhook to https://betterrealestate.org/api/outreach/webhook and set its signing secret as RESEND_WEBHOOK_SECRET in the deployment environment. Confirm RESEND_API_KEY can retrieve received emails, in addition to sending. Redeploy after updating environment settings.
4. Existing unsent approvals may need Edit → Save → Submit → Preview → Approve again after Reply-To configuration changes. Do not recreate uncertain sends: check the provider first and preserve the prior idempotency key. Their exact payload must remain unchanged to retry safely.
5. In Admin → Acquisition campaigns → Partner email approvals, check configuration, review a deliberate test draft addressed to an inbox you control, review its exact preview, then use Approve & send. Saving and submitting never send to the prospect. Approve & send immediately dispatches the reviewed message.
6. Reply from that recipient to the received email. Confirm the signed webhook succeeds and the response appears in the admin Reply inbox and in the original partner's Reply inbox/thread. Use a second affiliate account to verify it cannot see that conversation. Also test an admin-only flagged reply and provider retry. Configuration presence alone is not a successful live test.
7. Replies to previously sent emails using partners@betterrealestate.org remain in the existing company mailbox; they do not import automatically. Attachment metadata is shown in the app, with actual attachments reviewed through the provider. Follow-up email is a new reviewed draft; there is no direct reply-send bypass.
8. Confirm the partner's sole campaign is selected automatically when saving; with several eligible programs, choose one explicitly. The lead-source field expects a public webpage/profile link. In Learn affiliate tools, review the new guide. Check the metric grids and inbox on desktop/phone in light/dark before normal use.

Campaign compensation remains external through the selected freelance platform. Standard affiliate terms remain separate. Daily limits remain 20 per partner, 100 overall and one attempted contact per recipient per 24 hours across partners. No minimum inter-send delay is added. Unconfirmed sends retain the original bounded 23-hour retry rule; investigate the provider before any new action after that window.

Check deletion: open Delete campaign (and account/demo deletion where appropriate), verify the named target and warning, then Cancel or press Escape; nothing should be deleted. Confirm delete is the only action that proceeds. No name/DELETE phrase is required. Your own account still requires its password.

Before release: configure the receiving subdomain and webhook, verify retrieval permission and deployment environment, then test one email to an inbox controlled by Andrew. Confirm admin notification email, header badge, direct submit, exact-preview Approve & send, received reply and second-affiliate isolation. Have Andrew review compact lessons and all tutorial highlights in light/dark desktop and mobile. Do not distribute this candidate as a completed release before these setup/verification dependencies are disclosed and resolved.

Receiving status at source delivery: already configured and live-tested. Do not recreate the reply domain, webhook or secret. Resend verified reply.betterrealestate.org; Netlify has production-only OUTREACH_REPLY_DOMAIN and secret RESEND_WEBHOOK_SECRET; v29.74 was rebuilt to load them. A controlled incoming email was accepted by the live webhook on attempt 1 with HTTP 200. After deploying v29.75, test the new direct-submit/admin-alert/Approve & send path with a controlled recipient, reply to that actual outbound message, and check author-only visibility. The earlier standalone connection test is intentionally admin-only because it matches no affiliate draft. Review new UI/tour visually before normal use; local browser visual verification was unavailable.
