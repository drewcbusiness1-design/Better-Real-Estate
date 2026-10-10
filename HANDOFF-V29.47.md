# Current release v29.47 — Affiliate leaderboard and sales milestones

Read this FULL master handoff before doing or answering anything on every turn.
Candidate Better-Real-Estate-v29.47-Affiliate-Leaderboard; package 2.9.47; tutorial 68. User authorized leaderboard/rate reset/header/tutorial changes and modest sales bonuses. Assistant has not pushed, deployed, sent outreach or paid anyone.

## Delivered behavior
- All-time approved real-affiliate leaderboard counts qualifying first paid membership acquisitions. Free signups, clicks, renewals, partial payout rows, demos, self-referrals and refunded/disputed acquisitions do not increase rank. Ties use earliest first eligible sale, then account ID. Names/rank/count are visible to authorized affiliate participants; no other users’ emails, customer identities or cash balances are exposed.
- Top 5: each eligible purchase adds one percentage point to that purchase’s commission, starting at 31%, capped at 40%. Rank includes the incoming purchase. Leaving top 5 resets future rate to 30%; returning starts a new run. Approval lifecycle changes reset the run. Historical paid commissions are never repriced. Refunds remove bonus-building purchases; a rate stays at 40% when at least ten valid purchases remain in the run.
- One-time milestone cash bonuses: up to $5 at 10, $10 at 25, $15 at 50 and $25 at 100 eligible new program sales. Total awards capped at 3% of membership revenue retained after acquisition commissions. This revenue cap is not an accounting guarantee of profit after all business expenses. Awards may be reduced by the cap, never topped up. Old sales count for rank but not retroactive milestone payouts. Unpaid milestone awards can reverse after refunds/disputes reduce eligibility or budget. Paid transfer amounts are preserved. Cash remains separate from Better Credits. Three-day hold and existing Stripe Connect withdrawal flow apply.
- Affiliate-only header removes Messages and Boost a listing; other account headers remain. Product-focused tutorial 68 / What’s New explains leaderboard and milestones. Removed editorial tour step “A tour that stays out of your way.” Existing edge placement, light/dark and mobile scrolling remain.
- Material compensation terms version 2026-10-10-v4 requires affirmative acceptance before future commissions under the new rules. Existing payouts/history remain intact. Signup, free plans, paid plans, Founder exclusion and migrations remain.

## Integration and cost
New affiliateLeaderboard.js and affiliateLeaderboardState singleton collection use existing store/database. Atomic PostgreSQL revision claim commits acquisition, milestone awards and unpaid bonus reversals in one statement; concurrent purchases retry from fresh state, and duplicate events cannot create another acquisition or bonus. File mode recorder serializes its work for local QA. No new runtime dependencies, providers, AI calls, polling or scheduled jobs.
Verified invoice webhook retains existing signature verification. Eligible acquisition requires subscription_create; cycle/update/unknown reasons do not earn. Legacy and modern invoice subscription shapes supported. Refund/dispute matches exact invoice/payment intent, not every commission for a customer. Existing Stripe charge lookup resolves a dispute’s charge only when needed. Production Stripe API configuration unchanged.
Keep accountMigrations marker v29.44-current-approved-affiliates; do not rerun prior role conversion. Protected logo assets, v29.40 ARV/comps, provider files, First50, private prospect tools, reminders, sitemap/robots and membership data retained.

## Three rule gates and validation
Pre-build: full v29.46 master read; scope, 30% reset, one-time acquisition semantics, conservative bonus budget, protected brand/mobile/cost/tutorial rules reviewed.
Integration: eligibility/current terms, rank lifecycle, refund/paid-history separation, customer/event deduplication, private leaderboard response, atomic database persistence, existing payout kinds, no provider/dependency drift checked.
Pre-package: full npm suite passed, meaningful new rate/reset/cap/tie/refund/partial-payout/duplicate/privacy/milestone-budget tests passed; actual PostgreSQL engine executed simultaneous purchase claims, duplicate purchase, milestone insertion and unpaid refund reversal. Full running Express/browser tested webhook flow with QA verifier stub, current-term gate, rank reset/re-entry, cash history, invoice compatibility, exact refund/dispute, buyer/Admin headers and private access, tutorial Next/Finish and 1280/390/320 light/dark. Screenshots inspected; no page errors or horizontal overflow. Syntax, changed-line whitespace, protected assets/code, version/dependency and archive checks passed. No live Stripe payment, transfer or email sent; no production deployment verification claimed. QA dependencies and seeded data excluded from ZIP.

## Release workflow
Extract into ~/Downloads/Better Real Estate/Better-Real-Estate-v29.47-Affiliate-Leaderboard/. Live git remains ~/Downloads/Better-Real-Estate. RELEASE-v29.47.md has install/test/status and conditional commit/push. Review local status for unrelated changes before publishing. Commit: v29.47 affiliate leaderboard commission growth and sales bonuses. Wait for Netlify success, hard refresh, inspect terms acceptance, ranking/milestone cards and ordinary account headers. Earlier releases need no separate installation.

Current v29.47 compensation rules supersede older fixed-30% current-rule descriptions. Inherited permanent rules remain authoritative.

---
