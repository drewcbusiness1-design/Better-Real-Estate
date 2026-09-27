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

## NON-NEGOTIABLE USER-AUTHORITY + RELEASE RULES (v26.3)
- This is the user's project: explicit user specifications and approved direction are authoritative. Do not silently substitute APIs, external services, paid dependencies, architecture, product behavior, UI direction, or feature interpretations. Propose first; implement only after explicit approval.
- When restoring a prior feature, retrieve and follow the actual prior project context/implementation. Do not replace it with a preferred alternative.
- Protect confirmed-good baselines and approved UI/functionality.
- Before ANY ZIP, proactively exhaust every QA check available: changed-feature integration traces; all route/render/auth/session wiring; membership values and quota boundaries; database/schema compatibility; undefined functions/DOM/event wiring; full diff review; responsive/UI/empty/error states; package/dependency consistency; regression/syntax/integrity checks; and runtime/browser/deployment testing whenever the environment permits.
- Run release checks against the extracted final ZIP, not only the working folder. If an important final verification cannot be performed, say so explicitly and do not describe it as production-verified.
- Signup tutorial remains optional and skippable step-by-step or entirely. Significant future features must be added to onboarding/What's New guidance.

## Permanent onboarding/tutorial rule (v26.4+)
- Onboarding is a guided tour of the real interface, not a generic transparent modal. It must navigate to and visually focus the feature being explained while dimming unrelated UI.
- Tutorial UI must remain highly readable and professionally presented in both light and dark modes.
- Tutorial content is access-aware: never teach ordinary users features they cannot use under their current membership/access.
- New signups may skip one step or the entire tour and may restart it later.
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
EVERY user-facing update that adds, changes, removes, renames, relocates, gates, or materially changes a feature MUST update and test onboarding in the same release. New users get a membership-aware tour of current accessible features. Existing users get a focused What's New tour for newly added/changed accessible features. Upgrades/grants/team access trigger focused tutorials only for newly unlocked tools. Tours must navigate the real UI, spotlight the correct live element, scroll/reposition safely, remain opaque/readable, support Next/Back/Skip step/Skip tour/replay, handle missing targets without random highlights, and never teach inaccessible/obsolete tools.

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
