# Better Real Estate v29.71 — Campaign partners

Read RELEASE-v29.71.md and INSTALL-v29.71.md first, followed by the retained v29.70 master handoff for inherited behavior. v29.71 supersedes v29.70's named default setup: new creation fields are blank. Preserve all stored campaigns and links; linking a partner account updates the existing campaign, without recreating it.

Authorization: user requested an Affiliate-only campaign partner section connected to Admin, archive control, all campaign data relevant to the partner, a signup-to-paid donut chart, generic creation defaults and consistent Admin dropdown sections. Campaign tracking and receipts do not move money. All Fiverr compensation stays through Fiverr. Standard affiliate wallet/rate/bonus features are separate. No live account linking, archive, deployment or message has been performed.

Implementation: campaignTracking.js owns admin partner linking, archive/restore and allowlisted partner endpoints. campaign-ui.js owns admin controls. campaign-partner-ui.js owns the partner section, chart, records and evidence submission. Campaigns use existing acquisitionCampaigns rows, with revision-guarded updates; linking/account isolation is enforced server-side on every request. A confirmed real Affiliate-only account is required. Partner data excludes recruit contact/financial/auth secrets and internal admin notes. Only the explicit partnerReason is shared from admin reviews.

Chart counts unique referred members with non-reversed recorded membership purchases, not subscriptions currently active. Renewals/late purchases can establish conversion but never additional first-purchase commissions. Historical v29.70 commissions are retained; no unsupported historical payment reconstruction. Read release for archive/reconciliation behavior.

Other pending items remain separate: 24-hour reminder cooldown, service browsing context, founder email confirmation and cleanup. Follow all inherited rules: protected baseline, exact brand assets, no invented data, full appropriate QA, honest browser/deployment limitations and both install/test plus commit/push commands with every ZIP delivery.
