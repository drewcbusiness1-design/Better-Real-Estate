# Current handoff — v29.74 Partner Inbox

Read RELEASE-v29.74.md and INSTALL-v29.74.md before acting. Based on v29.73, with all prior campaign attribution, external compensation, founder verification, proof privacy, exact-preview admin send and effective-dated agreement behavior retained.

Implemented this update: clarified lead-source link field; sole campaign default and backend inference; owner/admin received email inbox with immutable original author ownership; raw signed webhook and fixed Resend content retrieval; admin-only quarantine; inert text and attachment metadata; affiliate tools learning instead of wholesaling; grouped campaign metrics; tutorial 92.

Receiving requires a separate verified subdomain, OUTREACH_REPLY_DOMAIN, RESEND_WEBHOOK_SECRET, provider retrieval permission and a working email.received webhook. No live DNS/credential/email/deployment operation was performed. The configured flag is not a live health check. Past messages using the root partners inbox do not backfill. Follow-ups still require a new approved draft. No unsolicited sends or direct-reply bypass. Campaign reassignment does not transfer inbox ownership.

All 108 test files, build and syntax checks pass. Browser visual QA, live PostgreSQL and live provider receiving remain unverified. New replies share the existing global campaignOutreach revision ledger and writer, preserving PostgreSQL CAS and local-file serialization. The ledger survives campaign deletion for audit/ownership; generic saves must keep preserving it.

The previously approved partner launch PDF and 50-business/50-individual prospect PDF are unchanged. Older pending reminder-cooldown/service-browsing work remains outside scope. Preserve exact official logo/mascot assets. No emojis. Always provide install/test and commit/push commands when delivering a source ZIP. Source installation must preserve .env, database, private proof, uploads and .git.

Deletion confirmation update: Campaign, own-account, admin user-account and demo-account deletion now use a dialog with Cancel and Confirm delete buttons, with no typed name or phrase. Own-account password authentication and server authorization remain required. Existing server confirmation markers are sent only after confirmation; campaign name mismatches indicate stale data. Cancel, Escape and closing the dialog perform no deletion.
