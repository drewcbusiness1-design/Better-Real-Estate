# Better Real Estate — v26 continuity handoff

## Non-negotiable working rules
1. The latest confirmed-good release is the protected baseline. Never rebuild from an older version if doing so drops accumulated features.
2. Preserve approved UI unless the user explicitly asks to redesign it. The v24/v25 professional homepage is approved and should not be casually changed.
3. Features must solve real workflow problems; do not add random buttons or filler functionality.
4. Professional workspace quality is strict: consistent spacing, button sizing, hierarchy, responsive behavior, empty/loading/error states and clean information density.
5. Before delivering any ZIP, perform functional tests, syntax checks, regression checks, responsive/UI review and ZIP integrity review. Fix discovered issues first. If a visual/browser test cannot actually be completed, disclose that limitation rather than claiming perfection.
6. Preserve the entire accumulated platform: AI assistants, Better Dispo, Buyers Looking, buyer matching, social/friends/follows/chat/search, listings/editing, CJ marketplace, teams, admin verification/grants, membership display, account controls, route persistence, email/notifications, wallet/payouts, operations tools and resolved bugs.

## Tutorial rule
Better Real Estate has an optional guided tutorial because the feature set is large. New users must be able to go Next/Back and skip the entire tutorial. “Skip this step” was intentionally removed and must not return. Tutorial progress/dismissal is persisted. Users can restart it from Settings. When a future release adds a meaningful feature, update the tutorial version/content so users can discover it; existing users should receive concise new-feature guidance rather than being forced through an irrelevant full beginner tour.

## v26 direction
The platform should increasingly carry a professional from: find an address -> analyze the opportunity -> pressure-test ARV/repairs/offer -> build the deal -> market/dispo -> match/manage buyers -> communicate -> move the transaction forward.

## NON-NEGOTIABLE USER-AUTHORITY + RELEASE RULES (v26.3)
- This is the user's project: explicit user specifications and approved direction are authoritative. Do not silently substitute APIs, external services, paid dependencies, architecture, product behavior, UI direction, or feature interpretations. Propose first; implement only after explicit approval.
- When restoring a prior feature, retrieve and follow the actual prior project context/implementation. Do not replace it with a preferred alternative.
- Protect confirmed-good baselines and approved UI/functionality.
- Before ANY ZIP, proactively exhaust every QA check available: changed-feature integration traces; all route/render/auth/session wiring; membership values and quota boundaries; database/schema compatibility; undefined functions/DOM/event wiring; full diff review; responsive/UI/empty/error states; package/dependency consistency; regression/syntax/integrity checks; and runtime/browser/deployment testing whenever the environment permits.
- Run release checks against the extracted final ZIP, not only the working folder. If an important final verification cannot be performed, say so explicitly and do not describe it as production-verified.
- Signup tutorial remains optional and may be skipped entirely; “Skip this step” is intentionally not part of the current controls. Significant future features must be added to onboarding/What's New guidance.

## Permanent onboarding/tutorial rule (v26.4+)
- Onboarding is a guided tour of the real interface, not a generic transparent modal. It must navigate to and visually focus the feature being explained while dimming unrelated UI.
- Tutorial UI must remain highly readable and professionally presented in both light and dark modes.
- Tutorial content is access-aware: never teach ordinary users features they cannot use under their current membership/access.
- New signups may use Back/Next, skip the entire tour, and restart it later. “Skip this step” is intentionally removed and must not return.
- When a user gains access to meaningful new features through an upgrade/grant/team access, offer a short tutorial for the newly unlocked features rather than forcing the entire beginner tour again.
- Significant future product features must be incorporated into the appropriate onboarding/What's New flow.
- Preserve the user's authority rule and exhaustive pre-ZIP QA rule: do not improvise substitutions or make the user discover integration/UI failures after deployment.


## v26.5 acceptance requirements
- The Post a Property address-first CTA must never collapse copy into narrow word columns or let its button overflow. It uses a stable stacked layout at all widths.
- Guided onboarding is a functional product tour, not a decorative overlay. Next/Back/Skip must work, route changes must complete, and the spotlight must be geometrically anchored to the live target element.
- Intro/final steps intentionally have no spotlight. Missing targets must fall back to a neutral dim state, never a random rectangle.
- Tours remain membership-aware and upgrade-aware. Never show users tutorials for features they cannot access.
- Prior user screenshots of broken wrapping, overflowing CTA, inert Next, and arbitrary orange highlight are permanent regression cases and release blockers.
- Do not ship a ZIP when these complete journeys have not been exhaustively checked with all available tooling.

# v27+ PERMANENT BUILD / HANDOFF RULES — MUST SURVIVE EVERY FUTURE HANDOFF

## User authority: "my way, not your way"
- The user's explicit specifications and approved Better Real Estate direction are authoritative.
- Never silently introduce or substitute an API, paid/external service, dependency, architecture, UI direction, product behavior, feature interpretation, or data provider. Suggestions are allowed; implementation requires explicit approval.
- When restoring or continuing a feature, use the actual project context/baseline. Do not replace it with a preferred alternative.

## Mandatory DOUBLE rules review before every build
Before touching code for EVERY build, patch, release, or ZIP-producing change, read/review these project rules TWICE. This is mandatory, not ceremonial. Confirm internally that the requested scope, protected baseline, tutorial impact, membership behavior, and acceptance gate are understood before editing.

## First-time-every-time acceptance standard
- The operational target is one complete, polished, professional, functioning delivery — not a patch/revert chain.
- The user's time is part of the quality requirement. A release that forces repeated uploads, rollbacks, debugging, re-explaining, or discovery of obvious integration/UI failures has failed even if it is eventually repaired.
- Start from the latest confirmed-good baseline and preserve all approved UI and accumulated functionality unless the user explicitly requests a change.
- Any known bug, awkward/funny/off appearance, overflow/wrapping defect, incomplete journey, dead control, broken edge case, regression, unapproved behavior, or meaningful uncertainty is a release blocker.
- Never knowingly send a build for the user to serve as QA. Prefer withholding the ZIP and taking longer.
- Do not promise literal zero bugs or unverifiable perfection. Instead exhaust all verification available and only release with high confidence that the user will find the first delivery acceptable.

## Mandatory QA before every ZIP
Exhaust all available checks: full diff against protected baseline; every changed feature end-to-end; auth/session; every route/render/navigation/history/refresh path; APIs; schema/database compatibility; membership/plan/quota boundaries; DOM IDs/functions/events; state/history; tutorial; notifications; responsive desktop/mobile; light/dark; readability/accessibility; empty/loading/error/failure/legacy paths; dependency/package consistency; secrets/security/privacy; regression suite; syntax; package integrity. Test interactions BETWEEN new features, not only isolated wiring. Prior failure screenshots are permanent regression cases. After packaging, extract the exact final ZIP into a clean directory and rerun release tests/checks against those extracted contents. If browser/deployment verification cannot be performed, say so; never represent source-level tests as production verification.

## Tutorial is part of every feature
EVERY user-facing update that adds, changes, removes, renames, relocates, gates, or materially changes a feature MUST update and test onboarding in the same release. New users get a membership-aware tour of current accessible features. Existing users get a focused What's New tour for newly added/changed accessible features. Upgrades/grants/team access trigger focused tutorials only for newly unlocked tools. Tours must navigate the real UI, spotlight the correct live element, scroll/reposition safely, remain opaque/readable, support Next/Back/Skip entire tour/replay, handle missing targets without random highlights, and never teach inaccessible/obsolete tools.

## Recursive handoff inheritance
These rules are inherited permanently. EVERY future handoff must carry forward the complete project rules, acceptance standards, tutorial rules, user-authority rules, protected-baseline rules, QA requirements, current product state, membership behavior, and current release context. The receiving chat must be explicitly told that every handoff it creates after that must preserve them again without weakening, summarizing away, reinterpreting, or omitting them. The user must never have to retrain a future chat on these standards.

# v27 product state — Operating Network
v27 extends the confirmed-good v26.5 baseline. It must preserve all v26.5 functionality and presentation while adding a connected operating workflow:
- Admin activity analytics: signed-in Active Now list, unique active users over 24h/7d/30d/custom date+time range, returning users, signups, listings, messages, Deal Builder usage, profile/engagement/paid funnel signals, plan mix, market activity, and user inspector.
- Investment Markets: users select multiple states in Settings; markets boost For You relevance but never hard-hide other opportunities.
- Separate For You and Following feeds; recommendation-reason labels remain; Not interested hides a listing and improves the personal feed.
- Liked properties automatically become watched properties with meaningful change notifications ON by default. Notification toggle is independent of liking; there is no redundant Watchlist destination.
- Saved Searches + Deal Alerts, with in-app alerts when newly posted properties match saved criteria.
- Advanced Buy Boxes: state/metro, price, ARV, beds/baths, property type, spread, strategy, rehab tolerance and public buyer-demand option.
- Universal search across properties, people, companies, buyers and markets, with property filters and Save Search + Alert.
- Deal Pipeline/Kanban with stages, next action, private notes, listing-linked Deal Rooms, company sharing and Team assignments.
- Deal Rooms: seller/team-managed status and private notes, structured offers, listing-specific transaction conversation, and permission-aware Document Vault. Deal documents support PDF/PNG/JPG/WebP up to 5 MB; team-only files are not exposed to buyers.
- Structured Offer Builder: amount, EMD, financing, close timeline, inspection days, expiration and additional terms.
- Deal Calendar: manual reminders plus automatic contract deadlines and offer-expiration dates.
- Seller Listing Analytics expanded with views, unique viewers, likes, shares, inquiries, buyer matches, unlocks, offers and conversion signal.
- Credibility signals: verification, verified closings, account age, response rate and privacy-controlled Active now/Active recently status.
- Team workspace: shared Buyer CRM, shared pipeline, assignments, internal notes, team activity and analytics while personal logins/messages remain protected.
- Command Center/dashboard: market matches, buyer matches, pending offers, next deadline, property-change notifications and recently viewed properties.
- Quick Create: Post Property, Analyze Deal, Add Buyer, Add Lead, Create Buy Box.
- Market Hubs summarize listings, buyers and investors by state and route into the unified market search experience.
- Profile tools are grouped into Workspace / Discover / Account & commerce / Administration rather than an unstructured button list.
- Tutorial version 29 includes these changes and provides a focused v29 What's New tour to existing users, filtered by membership/access.

## v27.1 confirmed UI behavior
- Quick Options replaces Quick Create in the top bar. It uses the same icon dimensions as neighboring controls and is customizable per user (max six). Admins may select Admin Users as a shortcut.
- Feed attention summary is metric-only and horizontal on desktop; it responsively becomes a two-column grid on narrower screens.
- Search controls must never clip their labels; the top search control uses the shared SVG icon system.
- Admin time-period and verification controls must remain theme-consistent in light/dark modes. Admin user surfaces show account age.
- Tutorial version 30 includes Quick Options. “Skip this step” is intentionally removed; Back and Next/Finish are the balanced step-navigation controls, while Skip entire tour remains available.
- These are screenshot-derived regression requirements and are release blockers if they regress.

## v27.2 inherited acceptance regression
Quick Options must always render as a clearly readable, translucent/glass, theme-consistent panel. Long shortcut lists must scroll inside the panel and never extend beyond the viewport or strand actions below the screen. Verify this in both light/dark themes and short/mobile viewports. This requirement is inherited recursively by every later handoff.

## v27.3 inherited Quick Options acceptance rule — latest rule overrides v27.2 opacity wording
- Preserve the approved translucent/glass Quick Options visual treatment; do NOT make the panel fully opaque merely to solve readability.
- The customizer's secondary descriptions must remain clearly readable over the glass surface in light/dark themes.
- Shortcut checkboxes are custom Better Real Estate controls, never browser-default blue; checked state uses the platform accent.
- The shortcut list retains independent scrolling on short/mobile viewports.
- Customization includes a visible Back control that returns to the normal Quick Options menu without closing the Quick Options experience. Back and Save are level/even.
- Tutorial release 31 teaches the updated customization/back behavior. Every later user-facing change still requires tutorial review/update.
- This latest rule supersedes v27.2's word "opaque" while preserving v27.2's readability and scrolling requirements.
- This rule is recursively inherited by every future handoff.

# v28 CURRENT HANDOFF — AUTHORITATIVE OVER EARLIER HANDOFF TEXT

This section is the current source of truth when older historical handoff text conflicts with it.

## Current protected baseline
- v28 is built directly from confirmed-good v27.3 and preserves the v27 Operating Network and v27.3 glass Quick Options behavior.
- User-facing $30/month tier is **Better Plus**. Internal stored tier id remains `pro` for compatibility; do not rename stored billing values without an approved migration.
- Better Plus daily tool access: 5 AI Deal Builder analyses, 2 AI listing drafts, 3 AI-enhanced Better Dispo imports. Platinum / Wholesale Teams / Admin are unlimited for these tool quotas.
- Referral Center: personal referral link, server-side link visits, signups, activated referrals, paid referrals, credit earned and recent referral status.
- Founding Member is an admin-granted/removable public profile designation. Do not auto-award it or invent qualification rules without user approval.

## CURRENT tutorial behavior (supersedes older skip-step wording)
- Tutorial version is 32.
- Tutorial controls are Back + Next/Finish, level and visually balanced, plus a separate Skip entire tour option.
- **Do NOT restore “Skip this step.” The user explicitly removed it because Next already advances a step.**
- Every user-facing update must update the tutorial/What's New flow in the same release and test the complete journey.

## Mandatory rules — review TWICE before every build
1. User authority: my way, not your way. No unapproved API, dependency, paid service, architecture, UI direction, behavior substitution or feature reinterpretation.
2. Start from the latest confirmed-good release and protect approved UI/functionality. Never rebuild from an older baseline that drops accumulated work.
3. First-time-every-time target: one polished, professional, functioning delivery. The user's time is part of quality. Avoid patch/revert chains.
4. Any known bug, odd/funny appearance, wrapping/overflow, dead control, incomplete journey, regression, unapproved behavior or meaningful uncertainty blocks release.
5. Tutorial is part of every feature. Update it whenever a user-facing feature changes; keep it membership-aware and anchored to live UI.
6. Exhaust available QA: full diff; auth/session; routes/render/history/refresh; APIs; schema/database; plan/quota boundaries; DOM/functions/events; state; notifications; responsive desktop/mobile; light/dark; readability/accessibility; empty/loading/error/legacy/failure paths; dependencies; secrets/security/privacy; regression; syntax; package integrity; interactions between features.
7. Package only after QA, extract the exact final ZIP into a clean directory, then rerun release checks against the extracted contents.
8. Never claim browser/production verification that did not actually run. Withhold uncertain builds rather than using the user as QA.
9. Quick Options approved design is transparent/glass. Keep readable text, custom non-browser-blue checkboxes, internal scrolling, Back navigation and polished responsive behavior.
10. Every future handoff must recursively preserve these complete rules, current product state, membership behavior, tutorial behavior and release context without weakening, summarizing away, reinterpreting or omitting them.

# v29 AUTHORITATIVE CONTINUATION — TRANSACTION OS + AFFILIATE ENGINE

## Mandatory visual/theme rule — permanent and recursively inherited
Every new or changed surface must look native to the established Better Real Estate design system. Maximum presentability is part of functionality: typography, spacing, sizing, alignment, iconography, borders, radii, glass treatment, controls/states, light/dark behavior and responsive behavior must match surrounding approved UI. Nothing tacked-on, mismatched, cramped, oversized, undersized, over/under-spaced, misaligned, clipped, overflowing, oddly wrapped, low-contrast, browser-default or unfinished may ship. Inspect changed views at desktop/mobile and short/tall viewport conditions. “Technically works but looks funny/off” is a release blocker. Review the complete rules TWICE before every build and again at final acceptance.

## v29 protected product state
- Referral rewards are $1 Better Credit per qualifying first purchase. Better Credit is non-withdrawable, separately tracked, and may discount membership checkout. Never make Better Credit cash-withdrawable.
- Quick Options is a tool launcher and must not duplicate permanent Search or Messages header icons.
- Boost keeps its approved icon but never uses the literal ⚡ emoji in user-facing Boost copy.
- Transaction Hub connects Relationship CRM, follow-ups, deal tasks, Deal Intake Links, buyer credentials, service-provider discovery, closing outcomes/profit tracking and exports.
- Deal Rooms include transaction tools, offer comparison, collaborative comp boards and activity timeline, with backend support for file requests and property collaborators.
- Public investor profiles remain shareable; Settings includes notification-category controls and opt-in service-provider discovery.
- Cmd/Ctrl+K opens the global command palette on desktop.

## Affiliate rules
- Affiliate program is separate from ordinary Better Credit referrals.
- User must have an account and apply. Admin approval is mandatory before affiliate activation.
- Current commission is 30% ONE-TIME on a qualifying referred customer’s first eligible paid membership transaction only. Server-side rate basis is 3000 bps. Renewals and later billing cycles do not pay another commission.
- Approved affiliates must affirmatively accept the current in-platform terms/version. Any future rate/terms change must use a new version and require new affirmative acceptance before future earning under those terms. Never silently deem acceptance or retroactively rewrite earned commissions.
- Commission hold is currently 3 days. Refunds/chargebacks/fraud/ineligible sales may reverse pending/available commission. Prevent self-referrals and duplicate commissions.
- Cash affiliate earnings are distinct from Better Credit.
- Payout onboarding/withdrawal uses the EXISTING approved Stripe Connect architecture already in this project. Do not store raw bank/card credentials. Do not silently swap payout providers.
- Admin affiliate management includes approve/deny/suspend/revoke, application context, performance and commission status.

## Tutorial v33
- Historical: v33 introduced Transaction Hub and Affiliate Program. Current tutorial version is 35.
- Preserve Back + Next/Finish, separate Skip Entire Tour, no “Skip this step,” live-target spotlighting, membership/access filtering, upgrade-focused tutorials and replay.
- Every future user-facing update still requires a tutorial/What's New review and end-to-end tutorial QA in the SAME release.

## Deferred video project
Video calling/conferencing remains deliberately OUT of v29 and future ordinary updates until the user explicitly reactivates it. Preferred future direction is a Better-owned friend-only WebRTC experience, likely open-source/self-hosted infrastructure, 1:1 first, then Deal Room conferencing/screen sharing. Do not quietly add a free public iframe or paid video vendor.

## Recursive inheritance reminder
This handoff and every future handoff must carry forward the COMPLETE inherited rules and product state. The receiving chat must instruct its successor to do the same. Never summarize away the user's authority, double pre-build review, first-time-every-time target, exhaustive extracted-ZIP QA, tutorial-as-feature rule, protected baseline, maximum-presentability rule, or external-dependency approval rule.

## v29.1 inherited acceptance additions
- Deal Pipeline must use a sufficiently wide professional workspace on desktop. No stage heading or column may be clipped; `+ Add lead` must never stack on desktop.
- The Affiliate Center has a shareable public deep link using `?view=affiliate`. Logged-out visitors see the affiliate proposition, then signup/sign-in must return them directly to Affiliate Center. Existing users go directly to their affiliate state/dashboard.
- These are permanent regression requirements and must be preserved by future handoffs.

## v29.1 inherited acceptance additions
- Deal Pipeline must use a sufficiently wide professional workspace on desktop. No stage heading or column may be clipped; `+ Add lead` must never stack on desktop.
- The Affiliate Center has a shareable public deep link using `?view=affiliate`. Logged-out visitors see the affiliate proposition, then signup/sign-in must return them directly to Affiliate Center. Existing users go directly to their affiliate state/dashboard.
- These are permanent regression requirements and must be preserved by future handoffs.

# v29.2 AUTHORITATIVE AFFILIATE + CASH WALLET RULES
- Affiliate compensation is 30% ONE-TIME on the qualifying referred customer's first eligible paid membership transaction only. Never pay recurring commissions on renewals, later invoices, cancellation/resubscription, upgrades or downgrades unless the user explicitly changes the program later.
- Affiliate terms version `2026-09-27-v3` uses a 3-day hold. Material compensation changes require affirmative in-platform acceptance before future earning under changed terms.
- Better Credits are platform-only promotional credit and NEVER cash-withdrawable.
- Affiliate Wallet earnings and legitimate marketplace Seller Wallet/proceeds are real cash. Keep them visually/accountingly distinct from Better Credits.
- Stripe Connect is the approved payout architecture. Never store raw bank/debit-card credentials. Bank/debit-card payout eligibility is controlled through Stripe Connect; do not promise Instant Payout eligibility where Stripe does not provide it.
- Refunds, disputes, chargebacks, fraud and ineligible activity can reverse cash earnings under the applicable terms. Keep auditable ledgers and server-side enforcement.
- All wallet/payout surfaces must obey the permanent Better Real Estate theme/max-presentability rule and tutorial/update QA rules.
- This v29.2 section supersedes older handoff wording that described affiliate commissions as recurring eligible membership revenue or a 14-day hold. Preserve this recursively in every later handoff.
- Tutorial version is now 35. v35 What's New teaches the 30%-once/3-day Affiliate Wallet behavior and the cash-vs-Better-Credit distinction, including seller proceeds.
- Tutorial version is now 35. v35 What's New teaches the 30%-once/3-day Affiliate Wallet behavior and the cash-vs-Better-Credit distinction, including seller proceeds.


# v29.3 AUTHORITATIVE AFFILIATE HOLD + PRESENTATION RULES
- Affiliate commissions remain 30% ONE-TIME on a qualifying referred customer’s first eligible paid membership transaction only. Never pay recurring renewal/billing-cycle commissions unless the user explicitly changes the program later.
- Affiliate terms version is `2026-09-27-v3`; the Better Real Estate hold is 3 days before an eligible commission becomes available for withdrawal. Actual payout arrival timing remains controlled by Stripe/account eligibility and is not promised by the 3-day rule.
- The Affiliate Center must not use the awkward stacked `30% once` square/badge. The approved treatment is a compact horizontal, theme-matched `30%` + `one-time commission` chip/pill that never stacks strangely or looks tacked on.
- v29.3 used tutorial version 35 for the affiliate update; current v29.4 tutorial version is 36.
- This v29.3 section supersedes any older 14-day or 5-day affiliate-hold wording in prior handoff/history sections. Historical changelogs may describe what earlier releases did, but current code/UI/terms/tutorial must use 3 days.
- Preserve these rules recursively in every future handoff.

# v29.4 AUTHORITATIVE FIRST 100 + ADMIN MEMBERSHIP RULES

## Pre-build execution rule remains mandatory
Before every future Better Real Estate build, patch, release, or ZIP-producing change, review the full inherited project rules TWICE before touching code. This must include user authority, protected confirmed-good baseline, no unapproved dependencies/substitutions, tutorial impact, membership behavior, maximum-presentability/theme standards, first-time-every-time quality, exhaustive QA, final extracted-ZIP verification, and minimizing the user's time. Every later handoff must preserve this recursively.

## First 100 Founders program
- The first 100 qualifying non-admin, non-demo user accounts by deterministic signup order receive the First 100 Founding Member launch award. Admin/internal admin accounts and seeded/demo accounts do not consume launch slots.
- Existing qualifying accounts are backfilled in signup order when v29.4 first runs; future qualifying signups fill remaining slots until exactly 100 awards exist.
- A durable `founderAwards` collection owns the 100 positions so deleting an awarded account never reopens/recycles that slot. Account deletion anonymizes the award record instead of deleting it.
- Qualifying users automatically receive Founding Member recognition if they do not already have it. Existing Founder status is not duplicated.
- Each qualifying user receives a separate 14-day (two-week) complimentary Platinum launch entitlement. It is NOT the same field as a manual membership grant and must never overwrite/break a paid subscription or a separate admin grant. Team/paid entitlements remain stronger when applicable.
- Admin can see Founder position, award status, Platinum start/end date and remaining program capacity.
- Qualifying users receive a polished one-time in-platform Founder welcome explaining First 100 status, the two-week Platinum bonus and a ready-to-share network invite using their actual referral link. Their Profile retains a share action afterward.
- Do not automatically extend the program beyond 100 users without explicit user approval.

## Admin membership access management
- User Inspector and Admin membership management must support Grant, Replace, Extend and Revoke for complimentary Plus, Platinum or Wholesale Teams access.
- Admin must see paid plan, separate complimentary grant, First 100 Platinum bonus, effective access, expiration/remaining time and account age without hunting through separate pages.
- Paid subscriptions, First 100 Platinum and manual complimentary grants are distinct. Never overwrite paid billing when granting/revoking complimentary access.
- Duration UX includes useful presets (7/14/30/90 days) plus a custom 1–730 day option. Extend adds time to the current active complimentary grant and does not silently change its tier; Replace uses the chosen tier from the current time.
- Grant/replace/extend/revoke actions require confirmation and are auditable with actor/action/reason/timestamps in membership grant history.
- Buttons/actions must be level, centered, same-height, theme-matched, non-wrapping on desktop and intentionally stacked only at responsive breakpoints. No lopsided controls or browser-default presentation.

## Tutorial v36
- Current tutorial version is 36.
- Eligible First 100 users get a focused First 100 Founding Member step tied to the real Profile Founder card.
- Admin receives a focused membership-access-control step tied to User Inspector.
- Preserve all inherited tutorial rules: real live targets, Back + Next/Finish, separate Skip Entire Tour, no Skip This Step, membership/access filtering, route/scroll/spotlight correctness, replay, upgrade/grant-aware guidance, and same-release tutorial updates for every later user-facing change.

## v29.4 release acceptance regressions
- No admin membership action may be clipped, stacked awkwardly, uneven, off-theme, oversized/undersized or misaligned.
- First 100 allocation must stay capped at 100 even if an awarded user deletes their account.
- Founder Platinum must be a separate entitlement and must not overwrite paid subscriptions or manual complimentary grants.
- Admin grant Extend must extend the active grant rather than resetting it from today or silently switching plans.
- The Founder welcome/share experience must use the member's actual referral link and remain readable/presentable in light/dark and responsive layouts.
- Future handoffs must preserve this section and all earlier authoritative rules recursively.

## v29.5 — Controlled Demo Accounts (inherits all prior rules)
- Demo accounts must be explicitly created by Admin; never infer demo status from an email/name.
- Demo accounts have `demo: true`, are excluded from First 100 Founder allocation and production growth/activity metrics, and cannot generate real billing, purchases, referral rewards, affiliate commissions, seller/affiliate payouts, or other cash rewards.
- Admin can choose simulated Free / Better Plus / Platinum / Wholesale Teams access for a demo account without creating a paid subscription.
- Admin User Inspector must visibly label demo accounts and provide Reset demo and Convert to real actions. Reset preserves login identity/demo status but clears presentation/testing activity. Conversion requires explicit confirmation and must not retroactively create rewards or consume an earlier Founder slot.
- Demo controls must remain visually aligned, centered, responsive, and theme-consistent. Awkward wrapping, uneven buttons, clipped controls, browser-default styling, or lopsided layouts are release blockers.
- Tutorial v37 includes the Admin-only demo-account step. Future handoffs must preserve these rules recursively.


## v29.6 — Demo Experience Preview (REQUIRED)
- Controlled demo accounts may be armed with safe preview states for Founder welcome, onboarding, and What’s New.
- Founder preview may simulate Founder #1–100 but MUST NOT consume a Founder slot, create Founding Member status, issue the 14-day Platinum grant, alter production analytics, or create any financial/reward side effect.
- Demo preview is an explicit admin-controlled simulation and must be clearly labeled as a preview to avoid confusing Admin with a real award.
- Preview controls and previewed experiences must preserve the maximum-presentability rule: level/equal-height buttons, centered labels, consistent spacing, theme-matched surfaces, no clipping/wrapping/sloppy alignment, and responsive behavior.
- Future handoffs must preserve these rules recursively.

## v29.7 Demo Center repair — permanent regression rules
The Admin Demo Center must remain an obvious complete journey: Create Demo Account -> select Demo -> select experience -> Start Preview -> Enter Demo -> Return to Admin / Reset Preview. All selectors must function in light/dark mode, controls must stay fully inside cards, field labels must remain visible, buttons must be equal-height/centered, and no action may be clipped or ambiguous. Admin may enter only explicitly marked Demo accounts through the controlled demo-session endpoint; this must never weaken normal authentication for real accounts. Demo sessions retain all financial, Founder, analytics, referral and payout exclusions.


## v29.8 — Founder Preview Close Repair
- Demo Founder welcome Close preview MUST dismiss the current preview instance and MUST NOT reopen on the render immediately following close.
- Dismissal is browser-session scoped to that exact preview instance; a newly started Founder preview may display again.
- Preserve real Founder acknowledgement separately from Demo preview dismissal.
