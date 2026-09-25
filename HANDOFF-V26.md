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
