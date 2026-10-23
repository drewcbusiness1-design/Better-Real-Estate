# Current handoff - v29.73 Partner Outreach

Read RELEASE-v29.73.md and INSTALL-v29.73.md before acting. Full baseline is v29.72 Campaign Proof, with all its founder verification, private proof and campaign lifecycle work retained. v29.73 is packaged source, not a verified production deployment.

Implemented: partner email drafts and exact-preview admin review/send through existing Resend with partners@ sender/reply address; owned-draft access; global opt-out/deduplication; PostgreSQL/local-file concurrency handling; bounded idempotent retry; five-to-35 campaign target editing; effective-dated 30%/35% campaign commissions without repricing prior sales; UI and tutorial 91. Standard approved Affiliate-only programs can also use their own standard attribution context, chosen explicitly; campaign contexts keep their external-payment isolation.

Do not send real emails, edit DNS or set credentials just because the queue exists. Authorized live sending happens through the explicit reviewed admin Send action. No live email or payment was used in local QA. Mail-provider acceptance is not inbox delivery, and receiving replies requires the existing partners mailbox.

All 105 test files, build and syntax checks pass. Browser visual review and live PostgreSQL/mail integration remain unverified. Follow rollout checks in INSTALL-v29.73.md. The mail audit/suppression ledger intentionally survives campaign deletion; the deleted campaign can no longer send. Preserve private proof bytes and database during install.

The partner launch guide PDF is already approved as partner-facing. The prospect PDF is a separate 50-business/50-individual research list with clickable-link instructions on its first page. Do not re-edit either PDF as part of installing this source update.

Other pending requests (including the older verification-reminder cooldown and service-browsing issue recorded in Better-Real-Estate-Pending-Update.md) are outside this update. Do not silently bundle them. Preserve the exact existing official logo and mascot. No emojis in captions. Always include both install/test and commit/push commands with each source ZIP delivery.
