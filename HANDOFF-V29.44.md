# Current release v29.44 — Affiliate-only accounts + All time activity

Read this FULL master handoff before every action and reply.
User authorized this bundle October 10, 2026. This supersedes the v29.43 release hold and both saved affiliate-account notes. v29.43 was never required to be installed separately. Current candidate: Better-Real-Estate-v29.44-Affiliate-Accounts; package 2.9.44; tutorial 65. Assistant has not pushed or deployed it.

## Delivered behavior
- Admin > User activity includes All time. It means all available recorded activity, not a reconstructed lifetime log. Demo exclusion, valid timestamps and existing retention note remain.
- Signup and Settings offer Marketing / Affiliate only. It is exclusive with buyer/seller/lender roles, both in UI and server normalization. Existing real estate accounts can apply for affiliate access while keeping their roles.
- Affiliate-only users are hidden from Network discovery, ordinary people search, public profiles/share pages, public company member cards, friend lists/requests, buyer demand/matching, match email candidates, service provider discovery, market investor/buyer counts and leaderboard. Account owners/Admin can inspect the private profile API. Existing messages, listings and relationship records remain intact; no data deletion. Existing property listings can remain visible as property records. Admin user activity/inspector retain these users.
- Affiliate-only account default destination is Affiliate Center, with Affiliate/Wallet/Settings tabs and matching shortcuts/tutorial. Footer Affiliate sits beside FAQ and the other information/contact links for guests and signed-in users.
- Application review, terms acceptance, 30% one-time first eligible paid membership commission, three-day pending hold, tracking and Stripe payout setup remain unchanged. Choosing this role does not approve the program.

## One-time existing affiliate migration
User requested the people in the program now, not an ongoing conversion policy. Approved participants at the first database load after this release are the snapshot. Pending, denied, suspended and revoked applications are not active approved participants and are not moved. Admin role, allowlisted admin emails and demo accounts are excluded.
New accountMigrations collection stores marker v29.44-current-approved-affiliates. PostgreSQL migration executes as one atomic CTE statement during store init: marker insert ON CONFLICT gates the user update. The same statement snapshot selects approved applications. Subsequent requests/cold starts do not convert anyone, including future approvals. Local development stores the same marker on disk. Keep this marker through future releases; do not delete/reset it.
Migration saves affiliatePreviousRoles and affiliateAccountMigratedAt on moved users; changes only primary/public roles. Plans, founder benefits, balances, Stripe account IDs, referral codes, tracking, application status, terms, commissions and user identity remain. No production migration has been executed by assistant. Existing participants move when the release first loads the deployed database. Settings can explicitly change account type later; that does not change approval.

## Validation and gates
Pre-build: full current master read; authorized scope, approved-participant interpretation, protected baseline, no external outreach/deployment.
Integration: exclusive roles, one-time durable marker, database atomicity, Admin/demo protection, existing memberships/payout preservation, public visibility and future approvals, tutorial/footer/default route consistency.
Pre-package: full npm suite passed; meaningful v29.44 tests execute migration and profile/buyer functions; actual PostgreSQL engine (PGlite, QA-only outside project) executed the migration statement and restart/future-approval checks. Full running Express/browser app checked signup, affiliate login/default center/tracked link, Network/profile exclusion, Admin inspector/access and All time at 1280/390/320 pixels in light/dark; no page errors or horizontal overflow. Theme transition was allowed to settle before final screenshots. Syntax checks server/app/store/policy/social/affiliateAccounts, changed-line whitespace, dependency/version checks, protected asset/provider comparisons and ZIP integrity passed.
No new runtime dependencies, models or providers. Only database addition is accountMigrations. Preserve v29.40 ARV/comps, First 50, sitemap/robots, exact official BRE logo, mascot/drag photo behavior and all inherited permanent rules.

## Release workflow
Extract ZIP into ~/Downloads/Better Real Estate/. Live git checkout stays ~/Downloads/Better-Real-Estate. RELEASE-v29.44.md has full copy/test/conditional commit/push commands; excludes .git and .env, no deletion flags. Commit: v29.44 affiliate-only accounts and all-time admin activity. Wait for Netlify success before claiming live. Verify approved existing accounts moved once, future real estate approvals remain their chosen role, and Admin is unchanged.

The historical release sections below are retained for context. Current v29.44 scope/status overrides older candidate-version and deferred-build notes; permanent rules remain authoritative.

---
