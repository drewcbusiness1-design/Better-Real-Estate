# Better Real Estate — v26 continuity handoff

## Non-negotiable working rules
1. The latest confirmed-good release is the protected baseline. Never rebuild from an older version if doing so drops accumulated features.
2. Preserve approved UI unless the user explicitly asks to redesign it. The v24/v25 professional homepage is approved and should not be casually changed.
3. Features must solve real workflow problems; do not add random buttons or filler functionality.
4. Professional workspace quality is strict: consistent spacing, button sizing, hierarchy, responsive behavior, empty/loading/error states and clean information density.
5. Before delivering any ZIP, perform functional tests, syntax checks, regression checks, responsive/UI review and ZIP integrity review. Fix discovered issues first. If a visual/browser test cannot actually be completed, disclose that limitation rather than claiming perfection.
6. Preserve the entire accumulated platform: AI assistants, Better Dispo, Buyers Looking, buyer matching, social/friends/follows/chat/search, listings/editing, CJ marketplace, teams, admin verification/grants, membership display, account controls, route persistence, email/notifications, wallet/payouts, operations tools and resolved bugs.

## Tutorial rule
Better Real Estate has an optional guided tutorial because the feature set is large. New users must be able to go Next/Back, skip an individual step, or skip the entire tutorial. Tutorial progress/dismissal is persisted. Users can restart it from Settings. When a future release adds a meaningful feature, update the tutorial version/content so users can discover it; existing users should receive concise new-feature guidance rather than being forced through an irrelevant full beginner tour.

## v26 direction
The platform should increasingly carry a professional from: find an address -> analyze the opportunity -> pressure-test ARV/repairs/offer -> build the deal -> market/dispo -> match/manage buyers -> communicate -> move the transaction forward.

## v26.1 follow-up (critical)
The first v26 package omitted `dealbuilder` and `buyercrm` from the client renderer map even though their routes/functions existed. This made those navigation items fall back to the public homepage and appear to sign the user out. v26.1 explicitly registers both authenticated views. Do not remove authenticated feature views from the renderer map in future releases. v26.1 also adds server-enforced Deal Builder usage by membership (free trial: 1 successful analysis total; Pro: 5 successful analyses/day; Platinum/Wholesale/Admin: unlimited) and a redesigned leaderboard with consistent typography, right-aligned points, and an in-product explanation of the 100-point verified-closing system and badge thresholds.
