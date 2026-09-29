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


## v29.9 rules / state
- Demo Admin must support Enter, Reset Password, Reset State, Convert, and Delete; action rows must never overflow.
- Dark mode is a full-site release-blocking presentation requirement; no browser-default white/blue controls.
- Deal Builder must never present address-only AI as verified property intelligence. Verified sold comps use deterministic similarity scoring/outlier handling. Missing facts remain missing. No external property-data provider may be silently introduced; get user approval first.

## v29.10 — AUTHORIZED MLS / MULTI-SOURCE DEAL INTELLIGENCE
- Deal Intelligence must research configured authorized listing/property evidence before AI reasoning. Evidence collection precedes AI; AI must not fabricate the evidence.
- `dealSources.js` is the provider-neutral MLS evidence layer. It currently supports Admin-configured RESO Web API feeds through `MLS_RESO_NAME`, `MLS_RESO_BASE_URL`, `MLS_RESO_TOKEN`, or multiple feeds through `MLS_RESO_SOURCES_JSON`.
- Never scrape Zillow or MLS websites. Zillow/Bridge, MLS Grid, local MLS feeds, ATTOM, Regrid or another paid/external source may be added only after explicit user approval and appropriate access/licensing.
- When an authorized feed is configured, use sourced subject facts to fill missing beds/baths/living area/year/property type and automatically load closed-sale candidates into the deterministic comp engine. Preserve source, timestamps, listing status and conflicts.
- Closed/sold evidence drives ARV; active/pending evidence is market context only. Deduplicate across feeds and surface disagreement rather than blindly averaging.
- When no live source is configured or a source fails, say so clearly. Never imply that MLS/Zillow was searched when it was not.
- Tutorial version is 40. Preserve these requirements recursively.

## v29.11 — live property + web intelligence (permanent)
- Deal Intelligence is evidence-first: query configured Regrid parcel records, every configured authorized RESO/MLS feed, and public web research before AI synthesis.
- `REGRID_API_TOKEN` is server-only. Never expose it to `public/` or client responses.
- Public web research uses the existing OpenAI Responses API `web_search` tool. Do not replace this with direct scraping of Zillow/MLS sites or bypass access restrictions.
- Preserve source URLs/names, retrieval timestamps, source conflicts and errors. Missing facts remain missing.
- Closed/sold comps drive ARV; active/pending listings are context only. Deduplicate and score comps by recency, distance, size, type, beds/baths and age; discount/reject outliers.
- If at least two credible researched sold comps survive the deterministic comp engine, its ARV is the working ARV. Otherwise label the AI ARV preliminary and lower confidence.
- Beds/baths/sqft/year/type should auto-populate from live evidence when present. A known public record returning those fields but displaying blanks is a release-blocking regression.

## v29.12 reliability rule
Deal Intelligence must not put live source research plus final AI synthesis into one long serverless request. Keep the two-stage research -> synthesis flow, run independent evidence sources concurrently, bound external-source waits, and degrade individual source failures visibly rather than collapsing the entire analysis. Preserve the user's requirement that analysis cross-reference Regrid, authorized MLS feeds when configured, public web evidence, and credible sold comps before AI synthesis.


## v29.13 — PROPERTY TRUTH + RESOURCE-EFFICIENCY RULES (AUTHORITATIVE)
- Current protected baseline is v29.13, built directly over v29.12. Preserve all prior functionality/rules.
- Property truth precedes valuation. For bedrooms, bathrooms, living area, year built and property type, a single source is evidence only — including a single exact MLS row. Do not promote it as verified until an independent source corroborates it.
- Wrong-property/wrong-parcel matches are release blockers. Exact-address match scoring must run before Regrid/MLS records can become the subject.
- If credible sources disagree (for example 4/4 vs 3/2), preserve every source/value in the evidence panel and withhold the disputed field unless a stronger independent consensus exists. AI must NEVER pick a disputed raw value itself. Blank / Needs confirmation / Conflicting is better than wrong.
- Server-side verified subject facts overwrite any model-supplied core property facts. Missing/disputed facts remain null.
- A precise ARV requires BOTH sufficient verified subject identity and at least two credible researched SOLD comps surviving deterministic comp selection. Active/pending listings remain context only. If the gate fails, ARV is withheld rather than displaying fake precision.
- If the property-truth + comp gate is not satisfied, skip final AI synthesis instead of spending another OpenAI/Netlify call on an analysis that cannot responsibly ship. Withheld/insufficient analyses do not consume the user’s successful Free/Plus Deal Builder allowance.
- Research caching is mandatory for cost control: normalized-address cache TTL is 24 hours, forced-refresh protection is 10 minutes, in-flight duplicate requests must coalesce, and UI must show the last researched timestamp/cache reuse. Expensive external research must never rerun on ordinary page refresh/navigation while still fresh.
- Cost/resource efficiency is a permanent pre-build/release criterion. Review Netlify compute/invocations/bandwidth and third-party/API usage before implementing AI, external data, polling, background work, scheduled jobs or other expensive features. Obvious avoidable credit/API consumption is a release-blocking bug. No hidden paid dependency or materially expensive architecture without explicit user approval.
- Current tutorial version is 42 and explains verified property facts/source disagreement. Every later user-facing Deal Intelligence change must update tutorial/What's New in the same release.
- Preserve these rules recursively in every future handoff.

## v29.14 property discovery reliability rule
Regrid address-search responses may keep the canonical address in `properties.headline`; preserve that value during normalization before exact-address scoring. Public-web research must be exact-address-first, bounded for Netlify cost/runtime, and source-specific. Do not claim direct Zillow retrieval or scrape Zillow without approved API/licensing; Zillow pages surfaced by public search can be shown only as discovery/navigation evidence. Preserve the Property Truth Gate: one source is evidence, conflicting facts are withheld, and ARV must not outrun verified identity plus credible sold comps. Cache reusable evidence and skip unnecessary AI/API work.

## v29.15 — PRODUCTION DEAL INTELLIGENCE (AUTHORITATIVE; SUPERSEDES THE v29.10–v29.14 IMPLEMENTATION DETAILS WHERE THEY CONFLICT)
- This is the production Deal Intelligence workflow. Do not regress it into address-only AI, one giant research+synthesis request, unconditional web research, client-trusted evidence, or brittle property matching.
- Full-address identity is deterministic first. Default Regrid identity uses the ranked `/api/v2/parcels/address` endpoint because it returns full parcel records and Regrid relevance scores in one request. Normalize suffixes, cardinal directions (`West`/`W`, etc.), units, locality, state and ZIP, including common no-comma full-address pastes; require exact house/street protection plus a strong local or Regrid relevance score before accepting the parcel.
- Regrid Typeahead is an Enterprise product and is NOT called by default. It may be enabled only with `REGRID_USE_TYPEAHEAD=true` as an optional rescue path, then bound to the returned `ll_uuid`. Do not waste a failed Enterprise request on every property for accounts without that access.
- Core subject fields are bedrooms, bathrooms, living area, year built, and property type. Every field preserves per-source evidence. One strong source is `recorded`: keep its raw value inspectable in source evidence, while the primary fact reads Needs confirmation; do not promote it as independently verified or use it to unlock a precise valuation. Independent agreement promotes a field only when at least one corroborating source is stronger than a syndicated portal; multiple portal pages alone are not independent proof. Conflicts remain visible and disputed fields are withheld.
- A precise valuation requires exact subject identity plus meaningful independent core-fact corroboration, no critical living-area/property-type conflict, and a defensible closed-sale comp set.
- Source hierarchy for valuation: configured authorized MLS/RESO closed sales first; Regrid county-recorded nearby sales next; bounded public-web sold-comp discovery only when deterministic closed-sale evidence fails the comp gate. Active/pending/list prices are context only.
- Comp engine screens closed sales by recency, distance, living area, property type, beds/baths/year, duplicates and outliers, with a bounded partial living-area adjustment. Normally require 3 usable closed sales with at least 2 distance-verified nearby candidates, or 2 unusually strong recent/nearby comps with independently established distance, before exposing a precise ARV. Web-only comps with unknown distance may be displayed as evidence but cannot unlock a precise ARV.
- Public-web research is corroboration/fallback, not the source of record. Use the existing OpenAI Responses API `web_search`, request `web_search_call.action.sources`, and accept only claims whose URLs were actually surfaced by the tool and whose address/provenance checks pass. Never scrape Zillow/MLS/restricted sites or bypass controls.
- Web research is quality-first but bounded: the research model defaults to `gpt-5.6-luna` (override with `OPENAI_RESEARCH_MODEL`), independent of the main synthesis model. Current background research uses staged subject-fact and sold-comp passes with high search context and medium reasoning; the sold-comp pass runs only when deterministic evidence still fails the comp gate. This supersedes the earlier one-combined-call optimization because the short combined request proved unreliable in production.
- AI is last. It synthesizes verified evidence and rehab scenarios only after deterministic property + comp gates pass. It must not invent named comps, sale prices/dates/distances/source citations, or disputed core property values. If gates fail, skip final AI and withhold precise ARV. If the gates pass but synthesis fails, preserve/show the deterministic verified evidence + comp valuation, do not consume a successful-analysis quota use, and cache the synthesis failure for 30 minutes so repeated clicks do not immediately retry/burn credits.
- Server integrity: production final analysis uses server-cached evidence only. Never trust a browser-supplied evidence object for valuation/synthesis.
- Cost is a release criterion. Research cache TTL is 24 hours; forced-refresh protection is 30 minutes; identical in-flight requests coalesce; normal Regrid identity is one ranked-address request; public-web research runs only where needed; final AI synthesis is cached by evidence fingerprint and reused when evidence is unchanged.
- Deal Builder quota means NEW successful properties, not clicks. Reopening/reanalyzing the same property does not consume another Free/Plus allowance. Failed/withheld analyses do not consume it. Preserve Free = 1 successful new property during trial, Plus = 5 new properties/day, Platinum/Team/Admin unlimited.
- Admin Research Diagnostics is permanent and cached: show identity, Regrid candidate match data, field evidence, configured MLS, nearby-sale, web and comp-gate status/timing without issuing another provider request.
- Historical v29.15 production baseline used tutorial version 43. Current tutorial version is 45 under the deep-background reliability addendum below. Every future user-facing change must update onboarding/What's New and test it in the same release.
- v29.15 increases the inherited forced-refresh protection from 10 minutes to 30 minutes.
- No new paid provider/dependency was introduced. Regrid and the existing OpenAI integration are the approved live sources; authorized MLS remains optional/configured through existing `MLS_RESO_*` variables.
- Preserve every earlier unrelated product/UI/membership/demo/affiliate/Founder rule. Before every future build, review the complete inherited rules twice, protect the latest confirmed-good baseline, perform exhaustive QA, extract and retest the exact final ZIP, and carry this rule recursively into the next handoff.


## v29.15 retrieval correction — 2026-09-29
- Keep the approved Regrid + authorized MLS/RESO + OpenAI hosted web-search architecture; no new provider/dependency.
- Public-web fallback must use a small targeted, location-aware search plan (exact address, major real-estate portals/broker pages, county/public-record terms, and sold/closed evidence as needed) rather than a one-shot low-context lookup.
- Superseded by the 2026-09-29 background-research addendum below: hosted web research now runs in staged background passes with high search context, medium reasoning, and longer bounded provider budgets.
- A valid single-source property value is visibly shown as Recorded in the evidence UI, but remains excluded from verified subject facts and cannot unlock precise valuation without corroboration.
- Cache namespace is now `v29.15-async-research-r2` so old failed/empty evidence is invalidated on deploy.
- Current tutorial version is 45.

## v29.15 Deep Background Deal Intelligence — 2026-09-29 authoritative reliability addendum
- Fresh Deal Intelligence research is asynchronous/background work rather than a single short browser-bound serverless request. Netlify Background Functions may spend the time necessary to resolve identity, deterministic records, web corroboration, closed-sale evidence and validation before the browser proceeds to synthesis.
- Existing `@netlify/blobs` stores job/progress state. This is an existing approved project dependency; no new data provider was added.
- Regrid identity first uses the documented street-address query constrained by the parsed state path (for example `/us/il`), then performs one bounded full-address fallback only if needed. Exact house/street/locality gates remain mandatory.
- If Regrid/MLS do not establish subject identity, public-web evidence may establish identity only under strict exact-address rules: one strong county/public-record source, or at least two distinct exact-address web sources. This does not independently verify any core field; beds/baths/living area/year/type still use Recorded/Verified/Conflicting evidence rules.
- Public web research is quality-first and staged: exact-subject fact corroboration first when facts are unresolved, then a separate sold-comp research pass only if the deterministic comp gate still needs help. Longer background time budgets replace the failed 18-second race.
- Regrid nearby recorded-sale research uses a filtered parcel query (`saleprice > 0`, recent `saledate`, subject-centered geometry/radius, bounded result limit) instead of returning up to 100 arbitrary nearby parcels. This is both higher-signal and materially less wasteful of Regrid parcel credits.
- Web-discovered sold comps are ranked before any distance verification. Better may use bounded Regrid exact-address lookups for only the strongest six candidates to establish coordinates/distance; unknown-distance web comps may be displayed but cannot unlock precise ARV.
- Research progress is persisted and shown to the user. The browser checks lightweight status only; it never restarts paid research merely to obtain progress.
- Server-owned evidence is written to the same 24-hour research cache. 30-minute force-refresh protection, in-flight/job deduplication, quota-on-success behavior, evidence-fingerprint synthesis caching, and no automatic page-load research remain mandatory.
- Tutorial version is 45. Future handoffs must preserve the background quality-first architecture and must not regress Deal Intelligence into a short synchronous request.


## v29.15 deep-background research status reliability repair — authoritative
- The first deep-background production deploy reached the background workflow but the browser failed with `Unable to read the property research status`.
- Do not restore the standalone `deal-research-status` Netlify function. Research progress/status now reads through the authenticated main API route `/api/deal-builder/research/status`.
- `dealResearchJobs` is a durable collection in the existing Better Real Estate Postgres/Neon store so the API request and Netlify background worker share the same job state.
- Status polling is read-only and must never trigger provider calls or consume a Deal Builder allowance.
- Background research itself remains the approved long-running architecture; accuracy is prioritized over arbitrary short request deadlines.
- Tutorial remains v45 because the visible deep-background workflow did not change. Preserve all prior source, truth-gate, comp-gate, cost, quota, UI and QA rules.

## v29.15 Investor-grade Deal Intelligence + presentation upgrade — authoritative continuation
- Tutorial / What's New version is **46**.
- Public-web property facts must be **grounded to surfaced page evidence text**. A model-extracted number/text value is rejected unless the supplied evidence snippet visibly supports that same value; exact-address provenance still applies. This specifically prevents a surfaced Zillow/Realtor/Redfin/Trulia URL from being paired with an unsupported hallucinated bed/bath/sqft value.
- A strong single source remains **Recorded**. Agreement across at least three distinct grounded exact-address public portal domains may be shown as **Corroborated** rather than mislabeled independently Verified. Stronger record/feed/broker evidence can still produce Verified according to the existing truth hierarchy. Conflicts remain visible and disputed facts stay out of trusted valuation inputs.
- Web sold comps may carry a distance only when the surfaced source explicitly displays that comparable distance and the distance grounding text supports it. Such source-reported distances can satisfy the distance gate; Regrid is used only where distance still needs establishment. This avoids blocking ARV solely because Regrid is unavailable while a credible comp source already publishes distance.
- Explicitly distressed/as-is/foreclosure/auction/fixer sales are excluded from normal ARV comp selection rather than being allowed to distort a retail after-repair valuation.
- Repair planning is deterministic and available even before ARV/AI synthesis. It produces Light / Moderate / Heavy planning ranges from established sqft, age/type, and grounded condition evidence. A sourced full-cleanout/full-rehab/gut/major-rehab indication recommends Heavy. Repair figures are planning estimates, never inspection findings or contractor bids.
- AI remains last and may not invent repair numbers; synthesis receives the deterministic repair plan and evidence packet.
- Regrid server requests now send the configured token through both the documented query parameter and the existing server-only header for compatibility with production authorization. The token is never exposed to client code/log output.
- Research cache namespace is `v29.15-investor-grade-r3`, invalidating previously cached bad/empty subject evidence after deployment while preserving normal 24h reuse thereafter.
- Deal Intelligence presentation is rebuilt as a centered premium workspace: clean evidence header, concise status chips, deduplicated source chips, collapsible provenance/conflicts, compact source limitations, a four-card investor snapshot (ARV / repair planning / property summary / confidence), responsive comp/repair cards, and theme-matched mobile/dark behavior. Raw provenance remains available without dominating the page.
- Deal Analyzer uses the researched asking price when available, defaults to the recommended deterministic repair scenario, and displays ARV, repair estimate, 70% MAO, projected flip spread, and project cost when the required inputs exist.
- No new data provider, paid dependency, Zillow scraper, or client-trusted evidence path was introduced. Preserve every prior cache/quota/security/demo/affiliate/Founder/UI rule recursively.

## v29.15 MULTI-SOURCE INVESTOR INTELLIGENCE — 2026-09-29 (LATEST AUTHORITATIVE; SUPERSEDES PRIOR v29.15 SOURCE-ORDER DETAILS)
- The user explicitly rejected Regrid as the primary/required source. Regrid is now OPTIONAL corroboration only. A Regrid 403 / trial-area / coverage limitation must never block property facts, comp research, ARV research, repair planning, or final investor analysis.
- Default property research is MULTI-SOURCE PUBLIC REAL-ESTATE RESEARCH plus any configured authorized MLS/RESO feed. Better deliberately searches major public property/listing sources (including Zillow, Realtor.com, Redfin, Trulia, Homes.com, Movoto, Compass, RE/MAX, Coldwell Banker and Century 21 when surfaced/available through hosted web search), then expands to public-record, assessor, brokerage and secondary sources when needed. No direct scraping or access-control bypassing is allowed.
- Hosted web search uses Responses API `web_search` with explicit allowed-domain filtering for the primary portal pass, followed by a bounded unfiltered secondary pass only when facts remain unresolved. This is intentional multi-source research, not a one-shot general search.
- Two independent grounded exact-address public real-estate sources agreeing on a core fact may establish it as **Corroborated**. Portal-only agreement must NEVER be called **Verified**. A single source remains **Recorded**. Credible conflicts stay visible and unresolved unless a stronger evidence consensus legitimately wins.
- Core facts remain: bedrooms, bathrooms, living area, year built and property type. Investor context may additionally show current list price, last sale price/date, lot size, annual taxes, assessed value, rent estimate and parcel/APN when grounded exact-address evidence exists.
- Sold-comp research is independent of Regrid. Better performs a major-property-site sold-comp pass and, when necessary, expands to local brokerage/public-record/secondary sources. Active/pending/list prices never drive ARV.
- Precise ARV still requires the strong distance/recency comp gate. When multiple credible recent closed sales across multiple sources support a defensible range but comp distance is not strong enough for precision, Better may show a clearly labeled **Working ARV** / working ARV range. It must not label that result precise. Unsupported ARV remains withheld.
- Repair planning remains deterministic and available even when precise ARV is not. Light / Moderate / Heavy scenarios use established or recorded sqft, age/type and grounded condition evidence. These are planning estimates, not contractor bids or inspection findings.
- Final AI synthesis now runs inside the long-running background research job when property identity and either precise or working-range comp support are sufficient. This avoids another short synchronous AI race and avoids duplicate synthesis calls after research finishes. Evidence/valuation remains usable if synthesis degrades.
- Research remains cost-protected: 24-hour evidence cache, 30-minute forced-refresh guard, duplicate in-flight job reuse, bounded maximum of four web research passes, lightweight status polling, server-owned evidence, synthesis reuse/failure cooldown, and no repeated quota charge for the same successful property.
- New cache namespace is `v29.15-perfect-multisource-r4`; older failed/incorrect cached evidence must not survive deployment.
- UI is centered and theme-native with the investor snapshot before deep evidence, five equal core fact cards on wide desktop, compact auxiliary facts, collapsible provenance, neutral source limitations, clean comp/repair sections and responsive mobile/tablet behavior. Presentation defects remain release blockers.
- Tutorial / What's New version is **47**. Release 46 remains preserved historically; release 47 teaches the multi-source default, optional Regrid role, working-vs-precise ARV, repair planning and complete investor decision surface.
- Preserve all unrelated membership, quota, Founder, Demo, affiliate, wallet, social, marketplace, Quick Options, dark-mode, route-persistence, tutorial, QA, user-authority and recursive handoff rules.
