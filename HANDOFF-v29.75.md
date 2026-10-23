# Current handoff — v29.75 Affiliate Workflow (source delivery; not deployed)

Read RELEASE-v29.75.md and INSTALL-v29.75.md before acting. v29.74 is the previously delivered bundle. Current development folder is Better-Real-Estate-v29.75-Affiliate-Workflow. Source delivery is being packaged; v29.75 is not deployed.

Andrew requested: direct submit or draft; admin in-app and email submission notifications; compact affiliate lessons; approval sends automatically; ordered tutorial with correct highlights; composer gets its own expandable card like inbox. All implemented with 110 tests passing; see release details and compatibility note. Live receiving transport is verified; browser visual review of the new UI remains unverified.

IMPORTANT new preference: tell Andrew about infrastructure/setup dependencies BEFORE releasing updates. Do not put DNS, webhook, environment-variable or secret setup instructions on product screens. Keep availability status short. Receiving is now configured and live-tested; preserve those settings.

Receiving setup uses existing Resend, a separate reply.betterrealestate.org subdomain, signed email.received webhook and existing Netlify environment. Keep root domain MX and existing partners mailbox untouched. Do not expose credentials in chat. Configured flags are not proof of live receiving; perform a deliberate controlled end-to-end test. No unauthorized prospect mail. Resend and Netlify browser sessions are now signed in. No sign-in credential values were observed, printed or stored by the assistant. See current setup progress below.

Admin alerts are stored in the existing global campaignOutreach ledger under alerts, atomically with submissions. Instant delivery is limited to one queued admin email per request; the existing scheduled job retries additional/pending alerts. Provider keys stay fixed for 23-hour retries. Frontend header opens grouped Acquisition campaigns and its approvals queue. API /approve-send combines exact preview approval with send claim; historical /review approval-only behavior is retained for compatibility.

Do not edit the approved partner launch PDF or the 50-business/50-individual prospect PDF. Preserve official logo/mascot; no emojis. Keep older pending reminder/service work out of scope. Always include install/test and commit/push commands with source ZIP delivery. Preserve .env, database, private proof, uploads and .git.

## Receiving setup progress — configured and live test passed
Andrew approved activating reply routing, creating the incoming webhook and storing its signing secret in Netlify (“Yes thats cool.”). All those changes were completed through browser UI. No prospect email was sent and v29.75 has not been released or deployed.

- Resend reply.betterrealestate.org domain ID 9498f546-e483-4b90-8d4d-8c1a02f1e210 is VERIFIED and explicitly says ready to receive emails. Sending OFF, Receiving ON.
- Netlify DNS TXT resend._domainkey.reply was added using the public DKIM key supplied by this reply domain (not the root domain). MX reply points to receive.forge.rmta.net at priority 10. Root ImprovMX and website records were unchanged.
- Resend webhook ID 39e9abc6-45cf-4a5e-bb3f-8742b0a6a475 is ENABLED, listening only to email.received, endpoint https://betterrealestate.org/api/outreach/webhook. The controlled receiving test succeeded with HTTP 200 on its first attempt.
- OUTREACH_REPLY_DOMAIN=reply.betterrealestate.org is saved for production only. RESEND_WEBHOOK_SECRET is saved as a secret for production only, scoped by Netlify to Builds/Functions/Runtime. No local/preview value was added. Secret was transferred through the browser clipboard directly to the Netlify masked field without printing, saving to a file or exposing in chat. Temporary variable was nulled and clipboard cleared. Do not rotate or recreate it unnecessarily.
- Existing Resend keys “BRE” and “Gmail Partners” both show Full access; no new API key or permission change was required.
- Existing production v29.74 main commit 2a3ac3b was rebuilt without cache to load environment settings. New Netlify deploy 6adbaacf8279f1cc7d450beb completed successfully and is PUBLISHED. This did not deploy v29.75.

Browser handles (browser ID 1): resendTab ID 1 at https://resend.com/domains/9498f546-e483-4b90-8d4d-8c1a02f1e210 ; netlifyTab ID 3 last at production deploy details; webhookTab ID 4 at https://resend.com/webhooks/39e9abc6-45cf-4a5e-bb3f-8742b0a6a475 ; keyTab ID 5 at https://resend.com/emails/receiving ; betterTab ID 6 at https://betterrealestate.org/?view=auth (platform not signed in). Resend and Netlify sessions signed in. All useful tabs marked for continuation. Browser-side secure authentication docs already read; do not ask for passwords/codes in chat.

Live test completed: Andrew sent subject “Test” from his own email to connection-test@reply.betterrealestate.org. Resend received it as email ID ffb8474f-1108-4157-93b4-dde101ca8432. The email.received webhook event msg_3L6jRoHEDIe5WkX02vNI8h8A7nr succeeded on attempt 1, HTTP 200 - OK, response {"ok":true}. This confirms provider receipt, webhook signature verification, received-email retrieval and the persisted handler path in deployed v29.74. The standalone diagnostic address matches no outbound draft, so the server quarantines it for admin-only review. Do not claim a real affiliate conversation was live-tested or the inbox UI was viewed; platform is not signed in in this browser.

New v29.75 behavior remains locally tested (110 files), not deployed. Compact guide and tour have executable DOM/unit checks, but browser visual QA remains unverified: local browser installation failed and the cloud browser explicitly rejected file:// access. Do not circumvent that browser URL policy with indirect routes or raw CDP. Ask Andrew to review the updated UI locally before pushing if visual acceptance is needed. No new UI was published through Netlify.

Proof screenshot (not Library, no private contact/secret): /workspace/scratch/receiving-domain-verified-20261023.jpg . Source public UI says Verified and ready to receive emails. Sender remains partners@betterrealestate.org; only reply routing uses the subdomain.
