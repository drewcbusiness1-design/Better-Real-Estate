# Current release v29.55 — Optional credits and focused onboarding

October 15, 2026. Package 2.9.55; tutorial / What’s New 75. Built from v29.54. User authorized the three confirmed next-update items. This section supersedes the pending status of those items in older handoffs. No production deployment or live payment has been performed.

## Delivered scope
- Membership checkout opens a theme-matched review dialog. Better Credits default OFF. Member opts in and chooses whole cents up to available balance and the selected monthly/annual payment. Review shows available credits, applied credits, remaining payment and remaining credit balance. Zero, partial and full offsets supported. Unused credits remain untouched. Renewals remain at the regular plan price; no renewal-credit feature added.
- Server rejects invalid, fractional-cent, negative, excessive or nonnumeric values. Credit checkout reserves the selection without deducting it. One credit checkout per account can remain open; resume/cancel controls prevent spending the same credits twice. Cancellation expires the remote session before releasing the reservation. Expired sessions release on verified webhook or on-demand review; no polling/job. Completed paid/no-payment-required sessions debit exactly once with a matching ledger receipt. Async settlement/failure events handled. Uncertain checkout creation is recovered by idempotent retry and customer session lookup; no blind early release. If payment configuration is absent, credit redemption reports unavailable rather than consuming credits in a simulation.
- New membershipCredits.js uses existing users/ledger collections. PostgreSQL revision CAS and single-statement debit/receipt; file mode serial mutation. Generic user saves preserve the reservation and apply credit-balance deltas so unrelated stale snapshots cannot restore spent credits. File-mode credit receipts also survive stale saves. Stripe coupon/session/customer creation use reservation idempotency keys. Coupon applies once. Existing pre-update sessions keep their legacy settlement path. Existing affiliate acquisition/rank/bonus/payout policy remains unchanged. No new provider, runtime dependency, schema collection or scheduler.
- Default platform tutorial is exactly 10 steps for real estate members and Admin, with a separate 10-step affiliate-only introduction. Full platform walkthrough preserves every existing tier/role-eligible tutorial entry and adds this release’s guidance. It is available within the quick tutorial, the dog menu and Settings. Skip, replay, desktop edge docking, mobile bottom docking and touch scrolling retained. New-feature and What’s New tours remain focused subsets.
- Better Guide’s first successful AI reply in a saved conversation starts with exactly “I’m Better Guide, an AI assistant.” The application adds/persists this once; the model is instructed not to repeat identity introductions. Failed replies and discarded late replies do not consume the introduction. Existing conversations with AI history are treated as already introduced; reopening and Admin-to-AI handoff do not restart it. Visible AI status labels remain. Same model/provider/key and bounded usage retained.

## Boundaries and handoff
All three pending October 15 items are implemented here: optional credits, 10-page introduction plus full walkthrough, one-time AI introduction. Do not reopen them as pending. Pump.fun bounty discussion is marketing planning only; no bounty, crypto transfer or platform integration was authorized or created. LLC transition remains deferred until approved entity details. Preserve all inherited permanent rules below, especially exact official logo, mascot architecture, truthful activity/property evidence, source/provider rules, account/privacy boundaries, responsive themes and mandatory tutorial/QA.

## Three rule reviews
Pre-build: full current master, authorized three-item scope, baseline, branding, tutorial, financial separation and no-provider/dependency constraints reviewed.
Integration: selected amount/first-payment semantics, authoritative server validation, session reservation lifecycle, duplicate settlement, generic-save preservation, affiliate separation, preserved full tutorial and saved conversation identity reviewed. No new recurring calls/jobs or live provider spending.
Pre-package: full npm regression suite and all changed JavaScript syntax checks passed. Actual PostgreSQL engine tested reservation contention, atomic debit/receipt, duplicate settlement and stale generic saves with concurrent referral deltas. Real Express/Chromium tested opt-in/default/amount/summary, invalid values, cancel/resume, partial and full no-cash credit settlement, uncertain response recovery, duplicate webhooks and stale file snapshots. AI stub tested failed first answer, one-time disclosure, later answers and reopen. Member/Admin/affiliate quick tours each completed all 10 steps; preserved full walkthrough opened from dog and Settings. Changed layouts checked at 1280/390/320 light/dark with screenshots inspected and no page errors/overflow. Existing support/Admin takeover, Command Center/Quick Create, markets, homepage dialogs regressions passed. Protected provider/affiliate/research/mascot/logo files and runtime dependencies verified unchanged. ZIP integrity and excluded local data/dependencies checked; see RELEASE-v29.55.md for deployment gate. Local QA uses provider stubs; production payment, AI/email delivery and hosting remain unverified.

---

# Current release v29.54 - Support chat and workspace repair

October 13, 2026. Package 2.9.54, tutorial / What's New 74. User authorized the full four-item bundle. Built from v29.53; not pushed or deployed by assistant. This current section supersedes earlier pending notes for these four items only.

## Delivered scope
- Command Center: restore missing openQuickCreate function that previously threw while rendering. Both navigation paths reach the same repaired route. Quick Create opens a fresh property post or directly creates a validated pipeline lead/calendar reminder through existing authorized endpoints. Styled action buttons preserve gating and account ownership.
- Market Hubs: Explore market and Edit my markets use the live design system. Cards/counters/labels/buttons work in light/dark and 1280/390/320 layouts. Explore market now supplies a real state filter, not just text search; q/market route parameters preserve the search through reload and history.
- Public homepage: all four workspace capability rows are accessible buttons opening individual How it works dialogs for Better Dispo, Buyers Looking, Network & Messages and Wholesale Teams. Guest-readable explanations with practical steps and signup/plan CTA. Keyboard close/focus handling, mobile touch scrolling and theme support. No invented data or screenshot.
- Chat with Better: option inside existing dog Guide menu; existing course/tutorial/help options preserved. Private authenticated support route with visible sunglasses dog, saved conversation, AI/waiting/admin status, message sending, manual refresh and human escalation. Admin inbox is available on that route; protected email links retain the thread after admin sign-in.
- AI: existing OpenAI provider, OPENAI_API_KEY and OPENAI_MODEL reused; no new provider/model policy or runtime dependency. Concise platform-only reference, bounded recent context/output, store:false, 18-second timeout, 20 AI turns per member per UTC day; failures refund allowance and offer human help. No property valuation or account mutation through chat. User message is saved before AI; duplicate request IDs do not re-send or consume another AI call. Send clears after accepted delivery; failures retain draft. Enter sends, Shift+Enter newline, IME composition respected.
- Human support: sends all authorized admins notifications through existing Resend notifications sender. Email contains a protected thread link and requester name, not conversation contents. Waiting state pauses AI. Admin joins/replies/resumes AI explicitly; optimistic revisions reject stale replies. Late AI answers are discarded after takeover. Failed/simulated email is visibly marked and can be retried with cooldown. Notification timeout 8 seconds. No false online claim. No live email or AI request during QA.
- Storage: one new supportThreads collection, auto-created by existing store init; PostgreSQL writes use revision compare-and-swap and retry rather than whole-row stale replacement. File mode serializes support mutations. Generic site requests exclude support history from the full-dataset loader; support reads are targeted. PostgreSQL writes also require the owning user to still exist, blocking account-deletion races. Unrelated file-mode snapshots preserve the latest support rows. Thread history bounded at 200 messages (member sends stop at 190 to retain room for team replies); Contact remains the fallback. Account deletion removes owned support history. No tokens in email URLs; ownership plus admin allowlist enforced on every support read/write. Ordinary user cannot read admin inbox or another user's thread.
- Cost: no global support polling. Only mounted, visible waiting/human chat refreshes every 15 seconds. Pure AI chats use explicit refresh. No new scheduled job. Existing route/activity infrastructure retained.
- Privacy disclosure and tutorial74 updated for support, Quick Create, Market Hubs and public explanations. Existing tutorials are preserved; existing version assertions advanced, not removed.

## Three reviews and validation
Pre-build: approved v29.53/current handoff, user four-item scope, brand/privacy/gating/cost/tutorial boundaries reviewed. Missing function traced and exact logo/mascot retained.
Integration: support auth/ownership/admin predicates, save/retry/duplicate/race behavior, admin takeover, email failure visibility, search history, account cleanup, both themes and mobile scrolling reviewed. Support module included in Netlify packaging.
Pre-package: full regression suite through v29.54 passes; all changed JS syntax checked. Real local Express/Chromium exercised Command Center/Quick Create lead creation, Market filter/reload, all four guest dialogs, dog chat entry, saved history/reload, Enter/send clear, authenticated admin join/reply/resume, stale writes, duplicate/concurrent sends, AI failure and late-answer discard. AI and email were stubs: no credits or mail spent. All affected layouts tested at1280/390/320 in both themes (42 screenshots); screenshot review corrected chat mascot visibility and dark public CTA/head layout. Actual local PostgreSQL engine executed simultaneous thread creation/message CAS retries and stale administrator rejection. Existing admin/affiliate editor/calculator/rate agreement, phone/badge, Guide and growth browser regressions passed. Protected payments/affiliate calculations/research/reminders/phone/exact logo assets byte-identical to v29.53. QA seed DB/dependencies/screenshots excluded from ZIP.

## Configuration and deployment
Existing DATABASE_URL, SESSION_SECRET, APP_URL=https://betterrealestate.org, OPENAI_API_KEY/OPENAI_MODEL and RESEND_API_KEY/notification sender must be configured in deployment. No new key, package or external service is required. If AI/email is not configured, the chat reports unavailability rather than claiming delivery. Real provider delivery and production schema creation require post-deployment checks; not verified live by assistant.
Extract under ~/Downloads/Better Real Estate/. Copy to ~/Downloads/Better-Real-Estate while preserving .git/.env/node_modules/db.local.json. Use RELEASE-v29.54.md and commands supplied in chat. Run npm ci and npm test/syntax/diff/status; review actual user's Git status before staging/pushing. Do not force-push. No production deployment performed.

## Continuing rules
Exact official logo never redrawn/generated. Maintain approved theme/responsive/touch behavior. No unauthorized providers/dependencies, invented activity or unsupported property facts. Keep existing memberships, balances, earned affiliate amounts and source evidence protected. LinkedIn copy is natural/professional; no emojis in marketing. Ads need a distinct, outrageous narrative concept tied to truthful platform value; approved alien/open-house benchmark. No rollout of deferred LLC/legal changes without approved details. Search account submissions remain external pending work.

---

# Current release v29.53 — Phone numbers, individual affiliate commissions and search discovery

Read this FULL master before every action/reply. User authorized this complete bundle October 11, 2026. Folder Better-Real-Estate-v29.53-Phone-Affiliate-Control; package 2.9.53; tutorial / What's New 73. This current section supersedes the held/deferred status of search discovery and phone collection below. No production deployment by assistant.

## Delivered scope
- Optional, encouraged phone field at signup; existing Settings phone field gains type/autocomplete/format guidance and server validation. Blank ordinary signup remains valid. US 10-digit numbers normalize to +1; international numbers require +country code, 8–15 digits. Formatting does not prove ownership. No SMS provider, OTP, text enrollment or public directory contact disclosure added.
- New verification badge requests require a valid phone before waived/paid request or direct verification PaymentIntent creation. Email confirmation remains independent. Duplicate pending badge requests are rejected; pending users cannot remove their phone. New admin verification grants/approvals require a phone; already verified legacy accounts are retained. Existing payments created before rollout remain honored through the webhook; admin cannot approve a new badge without a valid number. Admin memberships/inspector and pending reviews show phone to authorized admins. Existing property-contact-after-unlock behavior stays intact.
- Found service-provider endpoint used the full account serializer, leaking contact/account fields. It now uses the established public-profile serializer; phone/email/payment/settings stay absent from this directory. No new public visibility.
- Admin Affiliate Center > approved affiliate > Manage commission: propose custom 0–100% with up to two decimal places (supports 50%), or propose automatic leaderboard rates. Reason required, optimistic revision and recorded actor/time/rate history. Affiliate explicitly accepts in their own Affiliate Center. Current rate remains until acceptance; custom rate replaces (does not add to) standard top-five rate and remains regardless of rank. Automatic return also requires acceptance. No individual custom rate is assigned in this release and no creator agreement is accepted on anyone's behalf.
- Actual acquisition recording, effective-rate card/leaderboard, admin view, earnings history and calculator use accepted custom rate including 0%/fractional rates. Default users retain 30–40% automatic policy. First eligible membership only, not renewals; existing eligibility, three-day hold, minimum withdrawal, fraud/refund/bonus budget and earned amounts protected. Custom-period sales still count in eligible leaderboard history; returning to automatic uses its existing cycle logic.
- File-mode rate/status/terms/payment operations share the existing serial recorder queue. PostgreSQL commission commits lock current application rate data and compare rate revision/custom value plus existing leaderboard revision; conflicting events retry fresh state. Commission/status/base-term writes use field patches with CAS instead of stale whole-row replacement. Existing affiliateTerms audit and per-application history retained. No runtime dependency or new collection.
- Full held Search Discovery v29.52 is included: static guides hub and three guides, five-entry sitemap, metadata/footer links, branded /s share route dispatch, canonical property previews and missing-asking/archived/escaping protection. No search/AI ranking guarantee or external account setup claimed. Guide pages intentionally do not load Meta Pixel.
- Tutorial 73 teaches phone/badge requirements, individual-rate agreement and bundled search guides. Privacy phone wording updated. Exact logo, mascot, property photo ordering, ARV/comps, reminder cadence, Founder 50 rules, Pixel/settings preferences and LLC roadmap retained. No feature build beyond this bundle.

## Three rule reviews and validation
Pre-build: full master/user scope and approved baseline/brand read; badge flow traced, email verification and SMS boundaries protected; custom precedence/acceptance/past earnings defined.
Integration: server authorization/validation/CAS, database field-only persistence, payment and rate paths, private contact serializers, theme/responsive/touch/modal and tutorial updates reviewed. No new polling, providers, runtime dependencies, scraping or fabricated activity.
Pre-package: full npm suite through v29.53 passed, meaningful phone/rate acceptance/reset/history/duplicate/concurrent mutation tests passed; syntax checks and changed-line whitespace passed. Actual local PostgreSQL engine (existing QA-only PGlite) executed custom 50% and 20% payments, proposal/acceptance/CAS, stale payment rejection, duplicate events, suspension/resumption, base acceptance audit and preserved old amounts. Real running Express/Chromium tested admin propose/affiliate accept/reload/automatic reset, non-admin rejection, optional/invalid/supplied signup phone, Settings save, missing phone/new admin grant denial, Platinum badge request and duplicate/clear prevention, service-provider privacy, shared scripts/Guide/calculator/growth/Pixel regression at 1280/390/320 light/dark. Modal and signup screenshots inspected after theme transitions settle; no overflow or page errors. All 24 static guide width/theme/page combinations plus real serverless active/archived/escaped share checks passed. No actual Meta receipt, Stripe payment/transfer, email, external account setup or production verification. QA fixtures/dependencies/local DB excluded from archive.

## Release workflow
Extract under ~/Downloads/Better Real Estate/; livegit ~/Downloads/Better-Real-Estate. RELEASE-v29.53.md contains install/test/status and separate commit/push commands. Always provide commands in chat. Review changed git status before staging; do not force-push or include unrelated local edits. After Netlify success, verify live signup/Settings phone, badge flow, admin/affiliate custom agreement and guides. Search Console/Bing submission remains an external action after deploy; GROWTH-SETUP-v29.53.md has next steps.

LLC conversion remains deferred until formation details supplied. SMS ownership verification is not built. Directory numeric cookie question remains unresolved: browser local-storage referral retention has no fixed expiry, do not invent a cookie window. Outreach tone rejects invented budget/inferiority claims; maintain mutual respect. Canonical exact logo rules inherited below remain authoritative.

---

# Saved next-update requests — October 11, 2026

- Search Discovery v29.52 is ON HOLD. User wants it bundled with the deferred phone-number update; do not instruct deployment of the existing ZIP now.
- Add Admin-only per-affiliate commission editing. Support a negotiated 50% rate for an individual without raising everyone’s default. User requested this for next update, not an immediate build.
- Implementation must define custom-rate precedence over top-five automatic rates, show actual effective rates in admin/affiliate views and calculator, validate server-side, record who changed what and when, and preserve rates on already-earned commissions. Keep first eligible purchase only, existing hold/payout/refund/eligibility safeguards. Include tutorial and full desktop/mobile light/dark QA.
- No custom rate has been activated. No agreement or payment has been made. Creator outreach offer may propose 50% on the first eligible paid membership, with no upfront fee; implementation must be ready before that offer is activated.
- Outreach tone: user rejects invented budget limitations or language suggesting inferior status. Be direct and professional; assert mutual respect without pleading.

---

# Current release v29.52 — Search discovery and property sharing

Read this full master before every action/reply. User authorized setup of public search discovery, property-sharing growth loop and affiliate/creator materials October10,2026. Candidate Better-Real-Estate-v29.52-Search-Discovery; package2.9.52; tutorial72. Assistant has not pushed/deployed or configured external accounts.

- New static /guides/ hub and three substantial public guides: /guides/post-wholesale-properties/, /guides/find-cash-buyers/, /guides/analyze-off-market-properties/. Readable without JavaScript/signup. Public exact logo, canonical URLs, descriptions, OpenGraph and WebPage/Organization structured data. No invented reviews, transactions, market stats, buyer demand or ranking claims.
- Homepage metadata and crawlable guide link; visible app footer link. sitemap.xml lists homepage+four guide URLs. Existing robots wildcard allowance includes search crawlers; actual hosting/firewall access and indexing still need live confirmation.
- Found deployment /s share routes were not explicitly dispatched through Netlify. New /s/* redirect goes to existing API function /s/:splat; normalizer preserves /s/ namespace without altering API normalization. Actual function handler verified. All four existing share types use exact branded header. Property pages canonicalize to /s/property/id (not referral URL), missing asking never shows $0, archived property returns404, escaped user-supplied copy remains safe. No database schema or new job.
- Tutorial72 teaches public guides/property sharing. Old tutorials retained. Static guides intentionally do NOT load Meta Pixel; existing private/token/opt-out rules stay authoritative.
- GROWTH-SETUP-v29.52.md: concrete Google/Bing submissions afterdeploy, actual share preview check, profile consistency, weekly real demo loop, approved affiliate own tracked link, creator/founder/outreach copy. No messages sent or actual new demo footage generated. Paid promotion disclosures stay necessary, no guaranteed commissions beyond authoritative program terms.
- No universal real-estate ranking/AI recommendation guarantee. No automatic forced endorsements, bought links, fake authority, hidden AI instructions, scraping or fabricated activity. No paid-ad budget, provider/dependency/model changes.

Three reviews: pre-build authorized scope/current full master/brand/private data/source/cost/tutorial; integration static public routes share dispatch/canonical/privacy and truthful copy; pre-package full npm suite/syntax/changed whitespace/protected byte comparisons/actual serverless+Express browser QA and screenshots/archive.24 guide width/theme combinations passed, no overflow/page errors; existing real authenticated browser Admin/affiliate shared editor/calc/Guide/charts and Pixel Settings persistence at1280/390/320 light/dark passed. Active/archived and escaped previews executed through real function wrapper. QA seed DB/dependencies excluded.

RELEASE-v29.52.md provides install/test/status then conditional commit/push. Extract under ~/Downloads/Better Real Estate/;livegit ~/Downloads/Better-Real-Estate. Always put commands directly in chat. External Search Console/Bing ownership/session actions remain to perform with user after successful deploy, not already submitted. After launch measure actual search clicks and signups separately; no conversion attribution feature was added.

Phone optional encouraged/required for requested verification remains deferred. LLC future transition deferred. Exact logo rule remains authoritative. Marketing feedback after approved-branding note: user rejected giant dog-in-clouds takeover as meme, wants subtler genuinely dystopian mood; latest experiment normal-sized sunglasses dog in empty repeated dark street, Every address leads to Better. Approval of final experiment not yet received. Do not infer all concepts approved.

---

# Permanent approved branding — October 10, 2026

User reaffirmed the attached BRE- Logo(4).png as the official logo. Do not ask for repeat approval or propose a replacement. This reference supersedes any conflicting logo interpretation.

- Exact approved uploaded asset: BRE- Logo(4).png.
- Persistent Library reference: libfile_fe3cdf1280d88191bcee77f80f043b57.
- SHA-256: b5bcb06562541a21bde475d120831d7144f3a95f40e125e4b35bfb1b9921739b.
- Preserve the supplied B/house mark, BetterRealEstate wordmark, Make better your standard. tagline, colors and proportions. Never redraw, retype, recolor, stretch, approximate or AI-generate it.
- Carry the exact original logo file and these rules into every future handoff/release. Retrieve the saved asset when local bytes are missing; request reattachment only if the approved asset truly cannot be retrieved, not for repeated design approval.
- Advertising must visibly connect to Better: exact logo and BetterRealEstate.org. Headlines and other writing use charcoal/black, amber/gold and off-white. Current approved ad typography is bold distressed block lettering, rather than unrelated elegant serif styling.
- Mascot remains the golden retriever with black sunglasses. User wants surprising, out-of-the-box narrative scenes, not familiar sales metaphors or generic Your deal isn't... headlines. Approved concepts: giant dog peeling up a neighborhood; ominous fictional neighborhood takeover. Never imply invented actual platform adoption, buyers or results.
- Generated scenes must leave space for deterministic compositing of the exact logo afterward. Do not ask an image model to recreate it.

This is a rules/handoff update only; no application release, deployment or ZIP change.

---

# Current release v29.51 — Meta Pixel loader in head

Read this full master before every turn/action/reply. User explicitly requested fixing head placement October 10, 2026. Candidate Better-Real-Estate-v29.51-Meta-Pixel-Head; package 2.9.51. Assistant has not pushed or deployed it.

Single /meta-pixel.js loader is now inside public/index.html head immediately before </head>, removed from body. Conditional supplied Meta bootstrap remains in public/meta-pixel.js, executed only after eligible public route/account/browser preference checks. This does not make an unconditional inline paste or prove live Meta receipt. Existing PageView, initialization, Settings opt-out, private exclusions, Privacy and Terms unchanged. No duplicate loader, dependency, provider, backend, database or UI change. Tutorial 71 reviewed and retained because user-facing behavior/preferences did not change; v29.50 preference tutorial still applies.

Three gates: pre-build scope/current master and privacy/Settings preservation reviewed; integration single head loader/order/unchanged app and policy/backend/assets checked; pre-package full npm and syntax passed, head-placement assertion and existing Pixel behavior tests passed, protected file byte comparisons passed. Actual Express/Chromium browser passed single head script assertion, SDK-stub PageView, private/auth/token exclusion, Settings save/reload/logout persistence and Admin/affiliate regression at1280/390/320 in light/dark without overflow/page errors. Screenshots inspected. QA Settings check waits for completed toggle state rather than racing its asynchronous save. ZIP integrity and seed/dependency exclusions passed. Local browser SDK is a stub and sends no actual Meta event; production receipt remains unverified.

Extract under ~/Downloads/Better Real Estate/. Livegit ~/Downloads/Better-Real-Estate. RELEASE-v29.51.md contains tests/status and conditional commit/push. Put commands directly in chat. Commit v29.51 move Meta Pixel loader into head. After successful Netlify deploy, check Test events using signed-out eligible homepage without opt-out/blockers; Overview date must include today. No guarantees that placement alone clears Meta setup message.

All deferred phone/LLC work, exact logo, financial/ARV/migration/reminder/mascot/photo rules remain in inherited full handoff below. Current version/status overrides history.

---
# Current release v29.50 — Standard Meta Pixel PageView

Read this FULL master before every action and reply. User requested replacing the old Meta setup with the supplied standard snippet and reviewing Privacy and Terms. Folder Better-Real-Estate-v29.50-Meta-Pixel-Refresh; package 2.9.50; tutorial / What's New 71. Not pushed or deployed by assistant.

## Scope
- Same supplied bootstrap and Pixel ID 1783797429493375; standard fbq('track','PageView') replaces trackSingle. Removed initial revoke before initialization; initialization occurs only after route, account, browser preference and privacy signal gates pass. Existing navigation revoke remains.
- One loader/one initialized Pixel and deduplicated eligible URL renders. No signup/purchase events or server conversions. Signed-in/private/auth/token URLs remain excluded.
- Settings > Appearance & alerts > Advertising measurement remains authoritative, including reload/logout persistence and browser privacy signals. No signup checkbox or popup.
- Reviewed Terms and Privacy; clarified exact opt-out path, browser persistence and no-JavaScript exclusion. No ungated noscript image: it would bypass the requested off switch. This is a conditional implementation of the supplied snippet, not a verbatim unrestricted paste.
- Same ID and bootstrap were already in v29.49. No evidence establishes that trackSingle caused Meta's missing setup status; do not promise this change clears that message. Live receipt must be checked after deploy. Screenshot showed Overview range ending October 9 although testing October 10 and a possible blocker extension; inspect Test events with an eligible signed-out public homepage visit.

## Gates and validation
Pre-build: current full master read, user scope and retained Settings/privacy controls reviewed.
Integration: standard event call, single initialization, private boundaries, policy accuracy, no dependency/provider/backend changes and tutorial 71 reviewed.
Pre-package: full npm suite and syntax passed; protected backend/style byte comparison and changed-line whitespace passed. Running Express/Chromium checks passed: actual Settings persistence/reload/logout, public PageView queue using SDK stub, private/auth/token exclusion, Admin/affiliate editor/calculator/Guide/chart regression, desktop 1280/mobile390/320 light/dark without overflow or page errors. Tests and browser must run sequentially because both use the local QA store. No live Meta events, payment, email or deployment performed. Archive excludes local QA DB, dependencies, credentials and git.

## Release workflow
Extract under ~/Downloads/Better Real Estate/. Livegit ~/Downloads/Better-Real-Estate. RELEASE-v29.50.md includes installation/tests/status and conditional commit/push. Always provide release commands directly in chat as well. Never claim live Meta receipt based on local queue/stub tests.

Deferred phone and LLC notes and all protected product rules remain in the historical full master below. Current version overrides historical candidate labels.

---
# Current release v29.49 — Meta Pixel and Settings opt-out

Read this FULL master before every action/reply. User explicitly authorized Meta Pixel ID 1783797429493375 on October 10, 2026, then directed no signup checkbox, signup steps or popup: disclosure in Terms/Privacy, opt-out in Settings. Candidate Better-Real-Estate-v29.49-Meta-Pixel; package 2.9.49; tutorial / What's New 70. No production push/deployment or live Meta Events Manager verification performed.

## Delivered behavior
- Meta base bootstrap loads asynchronously from connect.facebook.net for selected public marketing pages: home, about, FAQ, plans and unsigned Affiliate Center. PageView uses trackSingle with the supplied ID; duplicate renders of the same URL do not add a view. No signup, purchase or other conversion events are added.
- Automatic event/form collection is disabled through autoConfig=false; no advanced matching/contact payload is initialized. Signed-in pages, auth/signup, messages, payments/wallet, deal tools and token/unknown-query URLs are excluded. Only marketing view and valid fbclid query values are allowed. Browser Global Privacy Control and Do Not Track disable loading/tracking. SPA navigation revokes SDK consent before changing the route; eligible marketing pages grant it again. The global SDK may remain present after leaving a marketing route, but our code revokes tracking and sends no private-route events.
- Settings > Appearance & alerts > Advertising measurement is an accessible switch with busy/error feedback. Saves boolean adMeasurement to the authenticated account and browser opt-out key bre-ad-measurement-v1. Account off copies to the current browser; browser off survives logout. Turning on does not override browser privacy signals. No signup field or popup added.
- Terms and Privacy disclose actual Pixel metadata (page URLs, IP/device/browser and cookie identifiers) and Settings opt-out. Prior claims of no advertising trackers/unrelated-ad sharing revised. Policy date October 10, 2026. Do not describe a Terms disclosure as universally satisfying all jurisdiction-specific consent requirements; no legal-compliance certification was performed.
- No ungated noscript tracking image, since that would bypass JavaScript route/account/privacy controls. Thus JavaScript-disabled visitors are not measured. Ad blockers/privacy controls and excluded routes can reduce Meta traffic counts.
- No runtime npm dependency, new database collection, AI call, recurring job or server-side conversion integration. Existing server settings setter accepts only boolean adMeasurement. Full v29.48 features retained; phone-number and LLC changes below remain deferred.

## Three rule reviews and validation
Pre-build: full current master and user-authorized Pixel reviewed; silent Terms/Privacy disclosure plus Settings control supersedes the initial consent-banner proposal.
Integration: supplied ID, public/private route boundaries, browser/account settings, current privacy wording, automatic-data exclusion, no signup changes, cost and tutorial rules reviewed.
Pre-package: full npm regression suite through v29.49 passed; meaningful Pixel queue/ID/duplicate/private/token/opt-out/account/GPC/DNT fixtures passed. Syntax server/app/store/Pixel passed; whitespace and protected byte comparisons checked. Actual running Express + Chromium verified public SDK load with QA network stub (no real Meta event sent), auth/token exclusion, no popup, Settings save/browser persistence/reload/logout, plus v29.48 program/editor/calculator/Guide/chart flows. Desktop 1280 and mobile390/320, light/dark screenshots and overflow/page-error checks passed. No actual Meta ad spend, email, transfer or production action. ZIP integrity/version and seed/dependency exclusions checked.

## Deployment and live verification
RELEASE-v29.49.md contains Mac copy/test/status and conditional commit/push. Extract under ~/Downloads/Better Real Estate/Better-Real-Estate-v29.49-Meta-Pixel/; livegit ~/Downloads/Better-Real-Estate. Commit v29.49 Meta Pixel and Settings opt-out. After Netlify succeeds, open Meta Events Manager > the supplied Pixel > Test events. In a signed-out browser without opt-out/GPC/DNT or ad blockers, visit the public home page and confirm PageView. Then turn measurement off in Settings, sign out and confirm no subsequent PageView. Do not claim Meta receiving events until observed. Public PageView alone is not signup/payment conversion measurement.

This current section supersedes prior version/status claims. Exact branding, financial/ARV/migration/reminder/mascot/photo behavior remain protected. Deferred phone and LLC notes are retained below.

---
# Saved future update — Optional phone numbers; required for verification (October 10, 2026)

User requests this later, not a build now:
- Encourage users to add a phone number, while keeping it optional for ordinary signup/account use.
- Require a phone number when a user requests verification. This is a verification-flow requirement, not a mandatory phone field for everyone.
- During the eventual build, trace existing phone/profile and verification flows and reuse them where possible. Clarify which verification flow is intended if still ambiguous; do not silently block email verification or revoke existing verified accounts.
- Supplying a number does not prove number ownership. SMS/OTP verification, a new SMS provider, marketing texts/calls and public phone visibility are not yet authorized by this request; confirm any additional scope before implementation.
- Preserve privacy, account access and existing paid/verified status; include validation, tutorial consideration and desktop/mobile light/dark QA when built. Carry this saved request into subsequent master handoffs until completed.

No application code or release ZIP changed for this note.

---
# Current release v29.48 — Admin Affiliate Management & Growth

Read this FULL master handoff before every turn, action and reply. User authorized the complete saved bundle on October 10, 2026 and requested that all layouts look proper. Current candidate: Better-Real-Estate-v29.48-Admin-Affiliate-Growth; package 2.9.48; tutorial / What’s New 69. Assistant has not pushed or deployed this release, sent outreach or paid anyone.

## Delivered scope
- Admin Affiliate Center is program management, not personal participation. No Apply prompt, personal rank/rate cards, Sales milestones coaching, private personal tracker or tracked-link activation prompt. Actual affiliates are ordered by their program rank with eligible sales, current rate and cash payout states. Search/status filters and existing contextual approve/deny/suspend/resume/terminate controls remain. Commission and milestone records have type/state filters. Financial records are read-only; payment/hold/withdrawal/reversal workflows remain authoritative.
- Admin can edit shared workbench title, conversation guidance, prospect sourcing, call opener and share script. Save persists shared plain text in affiliateContent singleton; Cancel leaves the saved copy. Authenticated Admin-only PATCH route, field bounds, revision conflict handling and atomic PostgreSQL compare-and-swap prevent stale concurrent saves. Normal affiliates see the saved updates. {link} inserts the approved affiliate’s own tracked link into the share script; existing approval/current-terms QR and link gates remain.
- Commission calculator uses actual server PRICING labels and monthly/annual amounts for Platinum, Team and Better Plus. Quantity and 30–40% scenario selector; normal affiliate defaults to current eligible rate. Estimate rounds commission per payment to cents and multiplies quantity. Calculator never changes actual rates, ranks, prices, invoices or cash. Milestone bonuses remain separate; actual eligible amounts may be reduced by discounts/credits.
- Affiliate-only Better Guide search, context, next-step and paid/free guidance exclude property/deal/pipeline actions. Affiliate training, prospects, tracked links, earnings, Settings and support remain. Real estate users who participate in the program retain ordinary real estate Guide workflows.
- Shared prospect sourcing training includes public Zillow business listing contacts, Investor Base (user-supplied name, no invented URL/integration), Facebook groups, local REIA/meetups, LinkedIn and directories. Introductions focus on audience fit, permission, free signup and real business value. No scraping, lead list, provider, actual outreach or guaranteed outcome.
- Admin User Activity includes View growth charts / Hide growth charts. Existing presets, Custom and All time apply. On-demand three charts: recorded new signups, cumulative recorded signups and unique active from retained timestamped activity events. UTC daily/weekly buckets, bounded longer-range granularity, demo exclusion, valid dates, unique-user dedup, partial-period labels, coverage/retention/deleted-account limitations. No past activity fabricated from lastActiveAt. Hover/tap points and keyboard/touch period dropdown expose exact values. Latest activity request wins during rapid range changes; no new polling.
- Tutorial 69 / What’s New covers Admin management/shared editor/growth charts plus plan/rate scenarios and prospect sourcing. Existing docked tutorial and mobile scrolling behavior remain.

## Protection and integration
New modules affiliateContent.js and activityGrowth.js use existing store/dependencies; affiliateContent is the only new database collection. Included in Netlify packaging. Financial recorder affiliateLeaderboard.js and payments.js remain byte-identical to v29.47. Preserve accountMigrations marker, legacy balances/subscriptions, paid/Admin access, First 50 rules, verification reminders, private prospect ownership, v29.40 ARV/comps, logo/domain, mascot and drag photo ordering. No new runtime packages, providers, AI calls or jobs.

## Rule reviews and QA
Pre-build: full current master and saved authorized scope reviewed, protected baseline and exact branding checked, no external changes.
Integration: role boundaries, shared text safety/validation, PostgreSQL atomic revision guard, current pricing/financial separation, recorded-history aggregation, tutorials and mobile/theme presentation reviewed.
Pre-package: full npm suite passed through v29.48; meaningful growth/date/demo/dedup/partial-period/content validation and concurrent-edit tests passed. Syntax and changed whitespace passed. Actual PostgreSQL engine (PGlite, QA-only outside project) executed content insert/update/concurrent CAS/stale revision tests. Running Express + Chromium verified Admin/affiliate auth, shared save/cancel/plain-text safety, stale edits, calculator, role-specific Guide and on-demand chart interaction. Actual desktop 1280px and mobile 390/320px pages in light/dark had no horizontal overflow or page errors; screenshots inspected. Protected financial/analysis/migration/reminder modules and exact logo assets remained byte-identical. ZIP integrity, exclusion and version checks passed. QA seed data and QA dependencies are excluded from the release.

## Release workflow
RELEASE-v29.48.md contains copy/test/status then conditional commit/push commands. Extract under ~/Downloads/Better Real Estate/; live git ~/Downloads/Better-Real-Estate. Commit: v29.48 admin affiliate management and growth charts. Wait for successful Netlify deployment before claiming live. Production was not verified by assistant.

The five saved next-update items at the top of v29.47’s master are completed by this release. Do not reopen them as pending. LLC transition below remains deferred until user supplies approved entity/name/licensing details; do not append LLC or change brand/accounts now. Inherited historical release sections are retained below; this current section overrides their release version and deferred-build status. Permanent rules remain authoritative.

---
# Saved follow-up — LLC transition (October 10, 2026)

User explicitly requests reminders and assistance transitioning Better Real Estate across all business-facing services once LLC formation is approved and required licenses are in place, including in future chats. Carry this note into every subsequent master handoff until completed. This is saved future work, not authorization to rename the site or change external accounts now.

Proposed name: Better Real Estate Network LLC. NOT confirmed available, formed, licensed or trademark-cleared. Confirm exact approved legal name, state, formation date and relevant licenses before implementation. LLC formation, tax registration, professional licensing and trademark clearance are separate. Existing Better.com use of Better Real Estate requires review; adding Network does not itself establish clearance. Never append LLC before formation.

A weekly Monday-morning reminder in America/New_York was created, beginning October 12, 2026. Reminders check in with the user; no automatic approval detection is available. Once finished, stop the reminder.

Transition checklist once the user supplies approval details:
- Confirm legal entity and name/brand clearance, business address, EIN and required registrations/licenses. Keep secrets out of chat logs and handoffs.
- Website legal operator identification: Terms, Privacy, affiliate agreements, payout rules, footer, Contact/About and business correspondence. Confirm approved public brand and alternate-name requirements before changing public name. Domain and exact logo need not change solely because legal entity name changes; preserve them unless user authorizes otherwise.
- Stripe business identity, billing descriptors, tax/business details and payout setup: follow provider procedure, preserve existing subscriptions/customers/commissions, confirm how ownership transfers affect the account. Do not replace accounts or destroy billing history.
- Bank/tax/accounting records, invoices, contracts and affiliate/contractor arrangements: align with the approved entity and review transfer requirements.
- Business email sender identities/signatures, LinkedIn Company Page and social profiles: update appropriate business details, retain verified domains/senders and existing audience.
- Review other business services and registrations, then update the project master handoff with what actually changed and what remains pending.

Before any site patch, read the full current handoff, perform all three rule gates, preserve approved product behavior and assets, include tutorial consideration, and run appropriate release QA. Prepare concrete changes before requesting any required final approval. No deployment, outreach or external account changes were made for this note.

---
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
# Current release v29.46 — Affiliate product training and tutorial positioning

Read this FULL master handoff before doing or answering anything on every turn.
User authorized October 10, 2026 (America/New_York). Candidate Better-Real-Estate-v29.46-Affiliate-Training; package 2.9.46; tutorial 67. Assistant has not pushed, deployed or sent outreach. No v29.45 deployment hash supplied.

## Requested changes
- Remove the exact “Disclosure: I’m an affiliate and may earn a commission on your first eligible paid membership.” sentence from the copyable share message. The call introduction identifies the caller as an affiliate; existing program terms and general relationship guidance remain.
- Teach affiliates what they introduce and why it helps a real estate business. Workbench training explains free-to-join off-market social marketplace, wholesaler/seller posting value, buyer criteria/connections, conversations and follow-ups, paid tool access and Team workspace. Practical discovery questions, relevant first action, free signup and current Plans review. No guaranteed buyers, profits, closings or valuations; no invented pricing/usage. Free signup and renewals do not generate the one-time eligible paid commission.
- Tutorial cards stay at a screen edge. At 900px and above, dock right or left, with Move left / Move right controls and automatic left choice for a narrow right-side target. At smaller widths, compact bottom panel capped at 44% of viewport height. No centered fallback. Cards stay touch-scrollable, in bounds and theme matched. Lighter page dimming keeps the product visible; target highlighting and Next/Back/Skip stay.
- Tutorial 67 / What’s New covers positioning and affiliate business value. Duplicate historical affiliate tutorial entries removed.

## Scope and three rule gates
Pre-build: full v29.45 master reviewed; authorized copy/training/tour scope; preserve exact logo, approved UI, mobile access, tutorial coverage and cost rules.
Integration: only frontend copy/layout/placement, tutorial/version metadata and existing test version expectations change. Backend, authorization, Founder reconciliation, private tracker ownership, QR/approval gates, 48-hour reminders, ARV/comps, provider configuration, sitemap and brand assets remain byte-identical. No new dependencies, providers, polling or database changes.
Pre-package: full npm regression suite; syntax server/app/store; changed-line whitespace; actual running-app browser training/tour navigation and responsive light/dark checks; version/dependency/protected assets and ZIP integrity. All checks passed. Actual running Express app tested product training, exact message removal, Plans navigation, Next/Back/Skip and side switching at 1280/900/768/390/320px in both themes; tutorial rectangles stayed inside viewport and off the viewport center. Small-phone max-height override corrected and rechecked. Screenshots inspected. Existing signup/Founder/private tracker/QR/Admin/All time regression checks also passed. No browser page errors or horizontal overflow. No actual outreach sent.

## Release workflow
Extract into ~/Downloads/Better Real Estate/Better-Real-Estate-v29.46-Affiliate-Training/. Live git repo ~/Downloads/Better-Real-Estate. RELEASE-v29.46.md includes copy/test/status and conditional commit/push. Commit: v29.46 affiliate product training and side tutorial. Wait for Netlify success before live claims. Review affiliate product guide and copyable message; replay tours on desktop/mobile in both themes, switch sides and check Next/Back/Skip. No separate v29.45 installation needed.

Current v29.46 scope/status supersedes older current-release headers; inherited permanent rules remain authoritative.

---
# Current release v29.45 — Affiliate tools, Founder eligibility and account emails

Read this FULL master handoff before doing or answering anything on every turn.
User authorized these changes October 9, 2026 (America/New_York). Current candidate Better-Real-Estate-v29.45-Affiliate-Tools; package 2.9.45; tutorial 66. Assistant has not pushed, deployed, or sent actual emails/outreach. v29.44 remains the preceding candidate; no user-confirmed deployment hash supplied.

## Requested and delivered
1. Marketing / Affiliate-only accounts do not consume Founding Member recognition, automatic bonus dates or First 50 slots. Existing affiliate-only awards are retired with original award dates retained for audit. Remove their badge/position/automatic Founder Platinum benefit; paid plans, separate Admin grants, cash/commissions, referrals and identity remain. Refill and compact the first 50 eligible real estate members by signup order. If an account later explicitly changes back to a real estate role, a prior award can be restored using original bonus dates, never renewed. Admin cannot grant Founder recognition to affiliate-only users; the corresponding inspector button is hidden. Ordinary real estate accounts participating in the affiliate program keep Founder eligibility: this exclusion applies to affiliate-only account type, not all affiliates.
2. New signup product/activity emails default on. User specifically rejected a separate adjacent notice: remove the checkbox and place enrollment/48-hour marketing cadence/Settings opt-out/unsubscribe details in Terms of Service only. Existing Terms/Privacy links remain at signup. Terms and Privacy updated consistently. Record marketingEnrollmentSource=signup-terms-v29.45; no existing unsubscribed/declined users are re-enrolled. Explicit false from an older/API client remains honored. Marketing still requires confirmed email, configured sending, and unsubscribe/cadence safeguards.
3. Affiliate workbench: copyable call opener and message with affiliate disclosure; approved tracked-link sharing kit and downloadable local SVG QR; one-time commission estimate calculator; private prospect CRUD, stages, notes, contact fields and follow-up dates. Prospect stages are self-reported and never counted as actual platform signups or sales. Tools place no calls and send no messages. Approved/current-terms acceptance gates actual personal QR/link sharing. Applicants/affiliate-only users can plan with scripts, calculator and private tracker; no personal tracked URL is shared before approval/terms. Existing application status, earnings and payout controls stay above the workbench.
4. Unconfirmed email accounts receive confirmation reminders at most once every 48 hours until verification. Uses the existing communications-cron (15-minute checks) and existing configured notifications sender. No separate scheduled job/provider or runtime dependency. Transactional confirmation reminders are separate from optional marketing emails. Demo, Admin/allowlisted Admin, already-confirmed/deleted users and invalid dates are excluded. Latest signup/manual send/reminder attempt sets the 48-hour boundary. Failures are held for 48 hours, avoiding a retry on every cron tick. PostgreSQL user-row claim suppresses concurrent duplicate sends. Recheck confirmation and recent manual delivery before sending; persist a valid seven-day confirmation token before mail delivery, reusing one with sufficient remaining lifetime. Every send updates existing delivery diagnostics.

## Persistence / compatibility
- New collection affiliateProspects, private by userId; never shared with company/team or another account. Validated status/date/name, bounded fields and 500 records per user. CRUD rejects cross-account access and demo accounts. Account deletion/demo cleanup includes these records.
- Existing v29.44 one-time approved-affiliate migration and accountMigrations marker remain unchanged. Do not rerun or delete that marker. Future approval never auto-converts accounts. Founder exclusion is now an ongoing eligibility rule for the affiliate-only role and runs in normal existing Founder reconciliation, including role changes.
- Existing approved program/commission/terms/payment/wallet behavior remains. No subscriptions or Admin grants revoked by Founder exclusion.
- QR encoder is deterministic local Version 5-L byte mode, no runtime dependency/API, no fake logo or unverified URL. Link length limit is explicit; normal Better production link is within it.
- Netlify included_files explicitly lists new modules. No credentials/client secrets or production configuration changed.

## Three gates and validation
Pre-build: full v29.44 master read; authorized affiliate-only exclusion, Terms-only signup enrollment and 48-hour email confirmation reminders; retain baseline/data-source/brand/cost/mobile rules.
Integration: deterministic first50 reconciliation/re-entry original dates, paid/Admin-grant protection, private CRUD authorization, signup-only enrollment with existing opt-outs preserved, approval/terms QR gate, local QR decoding, email token persistence, scheduler wiring and atomic send claim.
Pre-package: full npm suite passed including v29.45 behavior tests for Founder exclusion/refill/bonus preservation, prospect CRUD/privacy/auth and 48-hour boundary/dedup/verification stop/failure cooldown. PostgreSQL engine executed concurrent reminder cycles: one send, unchanged paid plan, no send before 48 hours or after verification. Browser exercised full Express app signup (email default/no checkbox), affiliate tools/prospect/calculator/QR, paid membership preservation, Network/profile exclusion, Admin and All time at 1280/390/320px in light/dark. Screenshots inspected; no page errors/horizontal overflow. QR decoded to exact tracked URL using an independent decoder. Syntax checks all changed modules and cron; changed-line whitespace; protected logo/ARV/provider/sitemap comparisons; version/dependencies and ZIP integrity passed. QA-only tools remain outside package.

## Release workflow
Extract into ~/Downloads/Better Real Estate/Better-Real-Estate-v29.45-Affiliate-Tools/. Live git repo ~/Downloads/Better-Real-Estate. RELEASE-v29.45.md contains full copy/test/conditional commit/push. Commit v29.45 affiliate tools founder eligibility and account emails. Never claim deployed until Netlify succeeds and live behavior is checked. Reminders require the site's existing configured email service and production scheduled function; no emails were sent by assistant. Validate automatic Founder slot reclaim and paid/Admin-grant protection, signup Terms and email preferences, QR/prospect privacy, and Email Center delivery diagnostics after deploy.

Current v29.45 behavior overrides v29.44 preservation of automatic Founder benefits for affiliate-only accounts and the old signup-checkbox rule. All permanent rules and protected behavior below remain authoritative.

---
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
# Current release v29.43 - All-time Admin User Activity

Read this FULL master handoff before every action and reply.
Latest candidate: Better-Real-Estate-v29.43-All-Time-Activity; package2.9.43; tutorial64. Not deployed by assistant.
Adds All time to Admin > User activity, preset=all, all valid available timestamps through now. Demo exclusion and requireAuth/requireAdmin remain. Missing/invalid timestamps do not fabricate activity. Unique active uses retained events plus each current real user's lastActiveAt, so never-active signups are excluded. Deleted users are not reconstructed. Older events may be pruned under existing retention; history note explains this. Returning retains existing pre-window definition and is zero for all-time epoch window.
No new polling, provider, model, runtime dependency, retention change or database schema. Preserve v29.40 ARV, First50, sitemap and branding.
Three gates: pre-build reviewed scope/baseline/retention/truth/tutorial; integration checked date filtering, auth, demo exclusion, missing timestamps and all metrics; pre-package full regressions, targeted route execution test, syntax, changed-line whitespace, responsive browser activity fragment with real CSS at1280/390/320 in both themes, ZIP integrity and protected file byte comparisons.
RELEASE-v29.43.md has Mac install/test/commit/push. Extract into ~/Downloads/Better Real Estate/; sync livegit ~/Downloads/Better-Real-Estate. Commit v29.43 all-time admin user activity.

Inherited permanent rules below remain authoritative; this section defines current version.

---
# Current release v29.42 — Sitemap

Read this entire master handoff before every action and reply. Latest candidate folder Better-Real-Estate-v29.42-Sitemap; package 2.9.42; tutorial 63 unchanged because this release has no app UI feature. RELEASE-v29.42.md includes sitemap/Search Console onboarding and complete Mac copy/test/commit/push commands. Last user-confirmed ARV baseline remains v29.40; v29.41 First50 carried forward without behavioral changes. No newer deployment hash supplied.

Adds public/sitemap.xml containing https://betterrealestate.org/ only and public/robots.txt advertising https://betterrealestate.org/sitemap.xml. Netlify explicit XML/plain-text headers; existing non-forced SPA fallback serves physical files. No database/API calls, no dependency changes, no private URLs or fabricated lastmod dates. User asked for help after learning no sitemap was configured. After deployment submit sitemap.xml in the site's Search Console Sitemaps panel. Do not claim it is live or submitted yet.

Three rule gates: pre-build checked scope/canonical public route, static serving, protected code/assets, and tutorial consideration; integration confirmed static files bypass API/function routes and excluded private/dynamic routes; pre-package full regressions/syntax, XML, actual static HTTP status/type, Netlify configuration, protected byte comparisons, changed whitespace and archive checks. No visual changes, so inherited UI files byte-identical rather than new browser QA claims.

All permanent rules and protected history below remain authoritative except latest version/status above.

---

# Better Real Estate --- Master Seamless Handoff

**Handoff date:** October 7, 2026\
**Purpose:** Continue Better Real Estate in a new chat without making
the user reconstruct product history, release rules, current mascot
behavior, property editing, Deal Intelligence rules, deployment
workflow, or saved future work.

## 1. Resume point — read this first

Read this FULL master handoff before doing or answering anything on EVERY turn.

Latest candidate **v29.41 — First 50 Founders**, package **2.9.41**, tutorial **63**, folder **Better-Real-Estate-v29.41-First-50**. User accepted v29.40 live behavior as “Works beautifully” and will test another property later. Keep v29.40 ARV/calculator/comps as protected confirmed-good baseline. No later git hash supplied than v29.36 af0dafb. v29.41 is not deployed by assistant.

User explicitly requested reducing both Founder users and attached privileges from100 to50 for scarcity. Authorized interpretation stated to user: first50 qualifying signup ranks retain program recognition and14-day automatic Platinum; automatic ranks beyond50 retire, paid plans and separate admin grants untouched. Do not shorten the bonus duration.

v29.41:
- FOUNDER_PROGRAM_LIMIT50; server, admin counts, preview bound, profile/welcome/invite/admin/public copy and tutorial63 say First50.
- Existing automatic awards beyond50 marked limitExcludedAt/limitExclusionReason, originals retained for audit. Remove founderLaunchPosition/bonus dates; clear foundingMember only for automatic first100/first50 source. Preserve manual Founder designation, paid plan fields, unrelated grants and allbilling/wallet/referral data.
- Retired awards excluded from inspector and active program/count lists. Internal ensureFirst100FounderProgram and founder100 award IDs deliberately retained for compatibility; names do not define public cap.
- On earlier deletion, restore next eligible retired award using original bonus dates. Never create duplicate award or restart expired bonus. New never-awarded qualifying recipients receive normal14days. Rank collapse, deletion tombstones, admin/demo exclusions remain.
- No provider/model/dependency/DB schema change. Normal existing request migration/save flow applies; no new polling or background task.

QA: fullnpm tests passed, including migration100→50, idempotence, paid/manual protection, original dates, deletion/refill with no renewal and no duplicate award. Syntaxserver/app/store and diff whitespace passed; desktop/mobile both themes checked for Founder welcome/preview, copy and dismissal; package integrity/version checked. Three rule gates cover scope/baseline, migration integration/access protection and final QA/tutorial/package. No live account changed by assistant and no actual invitations sent.

Preserve v29.40 source/evidence policy: same approved provider/model; cache **v29.39-complete-facts-r7** intentionally reused; precise ARV requires sufficient subject facts; corroborated borderline comp fallback only a Low-confidence working range. Subject/comp sources and disagreements retained. FreshPost, selectedemailrecipients, mascotgestures/dragphotos protected.

User communication rules added Oct7: **NO EMOJIS in replies, captions or marketing copy**. Reel captions should be short, provocative callouts rather than polished ads when requested; neverinventfactualclaims/activity. User’s own reel calls out weak deals/platforms.

Deploy extract **~/Downloads/Better Real Estate/Better-Real-Estate-v29.41-First-50/**; livegit **~/Downloads/Better-Real-Estate**. RELEASE-v29.41.md includes test/status plus commit/push. Commit **v29.41 first 50 founders and privilege limit**. AfterNetlifydeploy hardrefresh, inspectadmin claimed/remaining cap50. Actual existing user count remains unknown; never invent scarcity numbers.

Inherited sections remain permanent; section1 defines current state.

## 2. What Better Real Estate is

Better Real Estate is a real-estate-only social marketplace/network for
wholesalers, investors, buyers, sellers and funders. The product
combines off-market property posting/distribution, a social feed,
networking, buyer criteria/matching, messaging, Deal Intelligence,
company/team workspaces, pipeline/CRM concepts, referrals/affiliates,
marketplace/shop functionality, admin operations and education.

Core positioning: - real-estate network/ecosystem rather than a generic
SaaS dashboard; - help a user **join → post a property → connect with
buyers → move the deal forward**; - answer "why join now?" and "what
happens after I post?" in launch/growth work; - differentiate from
generic Facebook groups through structured deal distribution,
buyer/network tools and workflow; - never fabricate liquidity, buyer
matches, user counts, listings, closings, testimonials or transaction
volume.

Domain: `BetterRealEstate.org`.

## 3. Brand and visual continuity --- absolute

Core visual language is charcoal/black + warm orange/amber/gold, with
warm off-white/light surfaces. Blue is not the general brand color; it
is specifically appropriate for the Team plan accent. The product should
remain clean, premium, restrained, modern and real-estate oriented
rather than looking like a fishing site, generic blue SaaS product, or
childish game.

The official Better Real Estate logo is the exact supplied asset
**`BRE- Logo.png`**. It contains the stylized B/house mark,
BetterRealEstate wordmark and "Make better your standard." tagline.

Permanent logo rule: - never redraw, approximate, stylize, recolor,
recreate, retype, stretch or AI-generate the logo; - if the logo is
needed, use the exact supplied asset; - keep the canonical logo in every
future Better Real Estate release/handoff package; - never put a
fake/AI-generated Better mark on the mascot; - if an image background is
generated, generate the background first and overlay the exact logo
separately; - if the exact asset cannot be located, ask rather than
recreating it.

For advertising/marketing, use actual product UI/screenshots when
showing the product. Do not invent fake dashboards, fake listing data,
fake URLs or fake platform activity.

## 4. Permanent build/release rules --- highest priority

The user has now made this permanent:

**Review/check the Better Real Estate rules at least THREE separate
times on every future build, patch or release before sending a ZIP.**

Three is the minimum. More checks are appropriate for risky or visual
changes. The three reviews should be meaningful gates, not three copies
of the same statement:

1.  **Pre-build rule review:** confirm requested scope, protected
    baseline, user-authority constraints, branding, tutorial
    requirements, provider/API rules and acceptance criteria before
    editing.
2.  **Mid-build/integration rule review:** inspect whether
    implementation is drifting from the request, breaking protected
    behavior, adding unapproved providers/dependencies, creating UI
    regressions or violating mobile/performance rules.
3.  **Pre-package release rule review:** verify the finished
    implementation, regression suite, visual behavior,
    tutorial/onboarding, integration, ZIP contents and all protected
    rules before packaging/delivery.

Do not send a ZIP under any circumstances if the requested behavior,
visual result, integration or QA is not good.

Other permanent release rules: - start from the latest confirmed-good
baseline; - preserve approved UI and all existing functionality unless
the user explicitly asks to replace it; - "my way, not your way": never
silently substitute APIs, data providers, dependencies, architecture or
product behavior; - assistant owns integration quality; do not make the
user debug/revert avoidable mistakes; - new/changed UI must match the
existing design system exactly across light/dark, desktop/mobile,
spacing, typography, icons, borders, radii, glass/transparency and
states; - every added/changed feature requires tutorial/onboarding
consideration in the same release, plus "What's New" where
appropriate; - never claim a test, visual check, production check or
verification passed unless it was actually performed; - minimize Netlify
compute/bandwidth/function calls and external/API cost; cache, debounce
and batch where appropriate; avoid unnecessary polling/background
jobs; - no fabricated trust/activity data; - no unapproved API/provider
introduction.

### Mandatory pre-ZIP QA

Before any future ZIP, perform the applicable full gate: - full
`npm test`; - `node --check server.js`; -
`node --check public/app.js`; - `node --check store.js`; -
`git diff --check`; - ZIP integrity test; - version/package
verification; - regression/static integration tracing; - authenticated
routes and session/auth checks; - API authorization; - membership
gating/quotas; - DB/schema compatibility; - undefined/mismatched
functions, IDs and listeners; - loading/error/empty states; -
duplicate-action prevention; - desktop/mobile responsive behavior; -
light/dark behavior; - edge cases; - visual inspection for changed UI; -
tutorial/onboarding/What's New coverage; - exact logo preservation when
branding is involved.

A green syntax check alone is not release QA.

## 5. Permanent mobile and interaction rules

Every scrollable surface --- modal, drawer, panel, form, list, table,
picker, tutorial, admin sheet or similar --- must be intentionally
touch-scrollable on mobile, respect safe areas, use appropriate viewport
sizing, and never trap or clip content.

Every meaningful action must provide immediate visible/tactile state: -
pressed/active state; - loading/progress where appropriate; - temporary
duplicate prevention; - success/error feedback; - consistent
desktop/mobile behavior.

Messaging regression rule: - successful send clears the composer
immediately; - failed send preserves the draft; - Enter/send must work
correctly; - duplicate sends must be prevented; - stale composer text
must not survive navigation incorrectly.

## 6. Current Better mascot --- v29.35 authoritative behavior

The accepted mascot architecture began in v29.33 and must not regress.

### Physical/visual architecture

The mascot is a single coherent articulated inline SVG character
permanently contained in his header home beside Settings. He is not: - a
photographic cut-part puppet; - a slideshow of pose images; - a static
image being bounced/transformed; - a floating character under the
header; - a speech-bubble assistant; - a collection of visibly detached
body parts.

He remains clipped/contained by the intended header stage and must not
cover Settings or other controls.

The accepted character has a golden-retriever identity, black sunglasses
and restrained black/gold styling. Do not put a fake Better logo on him.

### Continuous life system

The dog is an event-driven character with a continuous local life loop.
Normal idle behavior includes: - subtle breathing; - head/gaze
orientation; - ear motion; - tail motion; - small weight/posture
shifts; - randomized quiet idle variation; - occasional paw/body
motion; - natural return/settle behavior.

Movement should be smooth and spring/easing based rather than twitching
or teleporting. Pointer/cursor attention is deliberately weaker than
meaningful product events and should not cause frantic pixel-for-pixel
chasing.

### Physical behavior vocabulary

The current vocabulary includes: - neutral/rest; - look/watch; - perk; -
lean; - paw; - tutorial point; - stand; - settle; - tail/ear
reactions; - breathing/posture motion.

Active behaviors should transition back through settle rather than
snapping instantly to neutral.

### Facial/emotional states from v29.34

Current expression states include: - **neutral/content** --- normal
browsing/rest; - **curious** --- something has his attention; -
**focused** --- directing attention toward meaningful work/tutorial
targets; - **alert** --- stronger perk/attention; - **happy** ---
positive acknowledgement; - **joy** --- stronger celebration; -
**concerned** --- failure/error/negative event; - **sleepy** --- genuine
quiet/inactivity state.

Expression is intended to work together with head, ears, posture, tail
and body behavior rather than merely changing a mouth shape.

### Contextual/event behavior

Meaningful site state can temporarily override autonomous idle: -
successes can trigger happy/positive reactions; - larger milestones can
trigger joy/celebration; - errors/failures can trigger concerned
behavior; - tutorial targets can cause focus/look/point behavior; -
Better Guide interaction can produce acknowledgement/attention; -
property publication/update can trigger appropriate success behavior; -
notifications can draw attention; - idle behavior resumes after the
event and settle transition.

### v29.35 situational awareness

v29.35 advances the dog from isolated reactions to local situational
awareness **without adding API calls, endpoints, AI calls, dependencies
or network polling**.

Current situational awareness includes: - reuse of notification
summary/heartbeat state that Better already fetches; - occasional
attention toward unread Messages/profile activity rather than creating a
new polling system; - genuine inactivity can move him into a
sleepy/settled state; - returning from inactivity wakes/perks him up; -
while the user is actively working, he can occasionally focus toward the
current work surface without constantly chasing the pointer; - pipeline
progression can trigger positive reactions; - **Closed** is treated as a
stronger milestone celebration; - **Dead** is treated as a
concerned/negative reaction; - existing v29.34 expressions, property
editing, Guide/course behavior, reduced-motion behavior and fixed header
home remain protected.

### Mascot priority model

Future mascot work should preserve this priority concept: 1. meaningful
product/site event; 2. tutorial/Guide direction; 3. situational
awareness such as unread activity/current work; 4. user/pointer
attention; 5. autonomous idle.

Higher-value events temporarily override lower-value idle/pointer
behavior. After the event, the dog returns smoothly to normal life.

### Reduced motion

Reduced-motion preferences must remain respected. Do not force
continuous expressive animation on users requesting reduced motion.

### Mascot cost/resource rule

Basic mascot life must remain deterministic/local. Do not add runtime AI
calls merely to decide how the dog should look, react or idle. Do not
add wasteful network polling for awareness when existing local/app state
can drive it.

## 7. Property post editing --- v29.34 protected feature

Property owners have **Edit property** on their property detail page.
Editing reuses the property form, preloads the existing post and updates
that post rather than creating a duplicate.

Current edit coverage includes: - photos; - price; - ARV; - rehab; -
beds; - baths; - square footage; - year; - property type; - situation; -
timeline; - deadline; - video; - notes; - JV setting.

The server has authenticated update handling with owner/admin
authorization and validation. Preserve the existing listing identity and
browser-history behavior. Editing must remain smooth on desktop/mobile
with correct scrolling, immediate save feedback, duplicate prevention
and clear errors.

Do not regress back to "edit" creating a second listing.

## 8. Better Guide + free wholesaling course --- protected

Preserve the Guide/course system introduced in v29.27: - Better Guide
control/panel; - contextual deterministic help; - searchable help; -
platform tutorial replay; - free wholesaling course shortcut; -
support/contact routing; - next-step guidance based on course/account
state; - progress center; - paid advanced contextual workflow card; -
free `learn` route; - knowledge checks; - account-saved progress; -
completion milestone wording **"Wholesaling Foundations --- Completed"**
rather than certification/license; - education disclaimer; - tutorial
integration; - mobile/accessibility; - no runtime AI call for basic
Guide/course/tutorial behavior.

Course modules: 1. Wholesaling Foundations 2. Choose a Market 3. Find
Real Opportunities 4. Seller Discovery 5. Analyze the Property 6. Build
the Offer 7. Contracts & Due Diligence 8. Build Your Buyer Network 9.
Dispositions in Better 10. Manage Buyer Interest 11. From Contract to
Closing 12. Build a Repeatable Business

Relevant persisted settings historically include: -
`guideContextTips: true` - `guideAnimations: true` -
`guideCourseCompleted: []` - `guideCourseQuizPassed: []` -
`guideCourseLastModule: 'foundations'`

v29.35 advanced the tutorial version to **57**. Future feature releases
must continue the tutorial/onboarding rule rather than silently adding
functionality with no education path.

## 9. Deal Intelligence --- permanent accuracy and source policy

Correctness is more important than speed or completeness.

### Property truth before valuation

Before a precise valuation, establish that Better has the correct
subject property/parcel. Bedrooms, bathrooms, living area, year built,
property type and parcel identity must not be promoted as verified from
a single weak/conflicting source.

Required behavior: - exact-address/property-match scoring; - preserve
per-field provenance; - cross-check independent sources; - keep
source-specific raw evidence; - identify duplicate/outlier/conflicting
evidence; - if credible sources disagree, mark the field
conflicting/unresolved; - withhold disputed facts from verified subject
facts and valuation/AI inputs; - blank/conflicting is better than
confidently wrong; - valuation confidence must fall when
identity/facts/comps are weak; - do not let a precise ARV outrun
uncertain property identity.

### Valuation/comps

Prefer transparent, recent, nearby **sold** comps with visible
reasoning: - distance; - recency; - similarity; - price per square foot
where appropriate; - bed/bath/property-type similarity; - comp list and
why each was selected; - evidence strength/confidence; - explicit
insufficient-data state.

Repairs should remain available where possible even if valuation is
incomplete.

Investor-grade output should clearly distinguish: - subject facts; -
confidence; - comps; - ARV; - repair estimate; - asking price; -
MAO/all-in/spread where supported; - risks; - limitations; -
provenance; - deterministic reasoning.

AI may explain supported deterministic facts/math. It must not invent
missing property facts, comps or precision.

### Data-source policy

Allowed/preferred direction: - existing approved Regrid integration as
optional corroboration, not unquestioned truth; - authorized MLS feeds
where licensed/configured; - RESO Web API/Data Dictionary standards; -
MLS Grid where authorized; - Zillow Group Bridge/authorized Zillow
relationship only; - local MLS where licensed; - public record/property
APIs and legally/technically accessible assessor/public sources.

Do **not** scrape Zillow or protected MLS sites. Do not silently
introduce a new provider such as RentCast. Multiple sources are
preferred over making one weak source primary.

One provider failure should not kill the entire analysis if other valid
evidence is available.

Cost matters: avoid burning credits through redundant calls. Cache/reuse
evidence, batch intelligently and only invoke expensive research when it
adds value.

## 10. Product state that must not regress

Important existing product behavior: - plans ordered **Platinum → Team →
Pro → Free**; - Team plan uses blue accent; Platinum uses gold; - Team
is a company workspace with limited seats and separate member logins; -
account controls include username change, password change and permanent
account deletion with confirmation; - browser Back/Forward/refresh
preserves route/view/state; - Follow is separate from Friends; - friend
requests/friends/chat/user search/profile pictures remain; - real-estate
listings, shop/CJ products, admin/user listing flows, detail pages and
post editing remain; - admin account retains unlimited access; -
homepage wording is **"Free to join · No card required."** - multi-role
identity supports Buyer/Investor, Seller/Wholesaler and Lender/Funder;
roles are multi-select; Admin is never a public signup role; - Network
filters/public role display should use the full role set while legacy
role compatibility is preserved; - notification bubbles/aggregation
remain consistent across profile-related areas; - Founder
deletion/rank-collapse behavior remains: deleted accounts relinquish
Founder slots/ranks and later ranks collapse as if the deleted account
never existed; - duplicate-looking signups do not automatically require
phone verification; admin can remove Founder designation from a
duplicate without harming the primary account; - affiliate admin actions
remain contextual: pending → Deny; approved → Suspend; Terminate where
appropriate; do not display nonsensical "Denied" or "Suspended" action
buttons.

## 11. Plans, credits, wallets, affiliate and Founder rules

Preserve separation between different value systems: - Better Credits
are non-withdrawable platform credit; - affiliate earnings are
cash/affiliate wallet; - marketplace seller proceeds are withdrawable
seller cash; - do not merge these ledgers conceptually or technically.

Saved referral direction: - \$1 non-withdrawable Better Credit per
qualifying referral reward; - usable for memberships/eligible
purchases; - no cash-out/transfer/negative totals; - credits can offset
membership cost according to approved product rules.

Affiliate program direction: - application + admin
approve/deny/suspend; - dashboard for
performance/earnings/payouts/fraud/audit; - unique link + cookie
attribution; - **one-time 30% commission on the first eligible paid
membership transaction only**; - no recurring commission; - 3-day
Pending → Available hold; - affiliate wallet is cash and separate from
Better Credits.

Seller proceeds: - seller proceeds are withdrawable cash; - Seller
Wallet states include Pending/Available/Paid/Refund/Chargeback/Fees; -
separate from Better Credits.

Admin membership grants: - grant/replace/extend/revoke complimentary
access from User Inspector; - show paid plan, complimentary plan,
reason, start/expiration and remaining time; - complimentary access must
remain separate from paid subscription truth.

First 50 Founders: - first 50 by signup order can receive Founding
Member status if not already; - complimentary Platinum period is **2
weeks**; - tracked separately; - auto-expires; - must not overwrite paid
subscription; - admin can see signup position, Founder status and grant
dates; - no duplicate awards.

## 12. Admin/demo protected behavior

Preserve controlled Demo/Preview behavior and Admin User Inspector
work: - Demo/Preview layouts must not overflow/cut off; - consistent
widths/spacing/hierarchy; - working selects; - clear Create Demo Account
/ Preview Experience states; - clear start/enter/exit preview; - demo
account deletion requires confirmation; - delete only demo-specific
data; - block deletion while impersonating; - never affect real users,
analytics, referrals, affiliates, seller proceeds or billing; - User
Inspector actions must remain responsive and not overflow on
desktop/mobile.

Relevant row actions historically include: - Manage access - Reset
demo - Convert to real - Grant founding - Delete Demo - Reset Demo
Password - Enter Demo

## 13. Dark-mode/UI audit rule

Future UI work must consider the whole product, not just the edited
card. Protect readable contrast and correct surfaces across
routes/components including: - tutorials/toasts/cards/tables/forms/empty
states; - Admin/Demo/Inspector; - affiliate/referral/wallet/payout; -
shop/product/feed/search/network/messages/profile/settings/plans; - Deal
Intelligence/deal tools; - pipeline/CRM/buy boxes/deal alerts/deal
rooms/market hubs.

No clipped labels, awkward wrapping, invisible borders, broken
glass/transparency, low-contrast icons or light-mode-only assumptions.

## 14. CJ/shop integration constraints

Preserve the existing CJ integration direction: - hide CJ
branding/labels from user-facing product experience; - internal product
detail experience; - import title/price/images; - correct image-removal
behavior; - shipping/in-stock handling should not expose ugly
supplier/internal wording; - supplier references should not leak into
polished customer-facing copy; - edit after posting remains supported; -
do not break existing CJ routing/integration while working on unrelated
features.

## 15. Email/notifications

Preserve: - transactional vs marketing separation; - marketing
opt-in/unsubscribe; - marketing cadence safeguards; - unread-message
reminder default historically 1 hour and user-adjustable; - admin signup
alert toggle; - business email branding from v29.26; - production email
configuration/secrets remain server-side.

Known production email direction: - `partners@betterrealestate.org` for
appropriate business communication; - automated notifications use the
configured notifications sender; - Resend outbound and ImprovMX inbound
were part of the operational setup; - domain/DNS/MAIL_FROM must be
verified in production rather than assumed.

Never expose secrets in client JS, logs, screenshots or handoff files.

## 16. Launch/growth rules

Future marketing must answer: - why join now? - what happens after I
post? - why use Better instead of only a Facebook group?

Show the real path: **join → list property → connect with buyers → move
deal forward.**

Use truthful product activity only. No inflated user counts, fake buyer
demand, fake transactions, fake testimonials or invented urgency.

The user prefers short, attention-grabbing, non-spammy outreach. For
wholesaler acquisition, "free to use" and a clear first-property action
can be useful when accurate.

## 17. Saved future roadmap --- not automatically approved for immediate build

These are saved product directions/ideas. Do not implement them merely
because they appear here; use them when the user asks for the next
relevant bundle.

-   AI property-analysis quotas: Pro 5/day; Platinum/Premium unlimited;
    Team unlimited.
-   Admin verification controls inside Membership Grants.
-   User setting to show/hide membership level publicly.
-   Shop/Profile bottom-nav icon refresh with clean minimal outlines
    matching stroke/size.
-   Plus-plan limited daily allowances for premium tools, remaining
    usage/reset display and pricing copy.
-   Quick Options center expansion: AI Deal Builder, Buyer CRM,
    Pipeline, Buy Boxes, Saved Searches/Deal Alerts, Referral Center,
    Deal Rooms, Market Hubs, liked/watched, Profile edit, Plans, Verify
    ID; remove redundant Messages/Search.
-   Saved Searches + Deal Alerts.
-   expanded Buy Boxes + automatic matching.
-   Private Deal Rooms.
-   Deal Pipeline + buyer CRM.
-   Market Hubs.
-   multi-state/market profile preferences.
-   Admin Activity/Analytics: Active Now, unique active users
    24h/7d/30d/custom, funnel/feature/market analytics, user inspector.
-   further Deal Intelligence accuracy/evidence improvements using
    authorized sources.
-   continue improving mascot situational awareness only if it remains
    useful, restrained and local/resource-efficient.

## 18. Completed items --- do not re-open as "pending"

Treat these as already completed unless a regression is reported: -
browser Back/Forward/refresh route persistence; -
username/password/delete-account controls; - Wholesale Team plan and
plan order/accent; - multi-role signup/profile identity; - property
detail navigation fixes; - false buyer-match count fix; -
performance/slowness work through v29.25; - business email branding
v29.26; - Better Guide/free course v29.27; - accepted coherent header
mascot architecture v29.33; - mascot expressions/contextual reactions
v29.34; - property post editing v29.34; - mascot situational awareness
v29.35.

Do not treat old failed mascot architectures as viable baselines.

## 19. Release history relevant to continuation

High-level recent sequence: - v29.15 --- major Deal Intelligence
production/multi-source/property-truth work; - v29.16 --- multi-role
identity; - v29.17+ --- Better moments/polish; - v29.20 ---
buyer-truth/details fixes; - v29.21 --- instant details; - v29.22 ---
performance/cost regression protection; - v29.23 ---
detail/network/admin polish; - v29.24 --- conservative cleanup/property
sharing; - v29.25 --- performance/notifications/stability; - v29.26 ---
business email branding; - v29.27 --- Better Guide + learning; -
v29.28--v29.32 --- mascot iterations; several were not visually
acceptable as final architecture; - v29.33 --- accepted coherent
inline-SVG header living character; - v29.34 --- contextual facial
expressions + property post editing; - v29.35 --- situational awareness
using existing state/local interaction without new polling/API/AI.

The user explicitly said v29.33 was "much better." Preserve that
architectural direction.

## 20. Deployment and local workflow

The user opens/extracts releases under:

`~/Downloads/Better Real Estate/`

The live Git repo is:

`~/Downloads/Better-Real-Estate`

GitHub origin:

`https://github.com/drewcbusiness1-design/Better-Real-Estate.git`

Netlify deploys from GitHub push.

### Standard future install/test gate

``` bash
cd ~/Downloads

rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  "Better Real Estate/<release-folder>/" \
  Better-Real-Estate/

cd Better-Real-Estate

echo "=== VERSION ==="
node -p "require('./package.json').version"

echo "=== TESTS ==="
npm test

echo "=== SYNTAX ==="
node --check server.js
node --check public/app.js
node --check store.js

echo "=== DIFF CHECK ==="
git diff --check

echo "=== STATUS ==="
git status --short
```

Do not push until this gate passes and changed visuals/behaviors have
been inspected.

Before giving commit/push instructions, inspect/ask for
`git status --short` if there is any possibility of unrelated or
unsynced work. Do not casually recommend force-push.

Normal deployment after the local gate:

``` bash
cd ~/Downloads/Better-Real-Estate
git status --short
git add -A
git commit -m "<release-specific message>"
git push origin main
```

After Netlify reports deploy complete, hard-refresh with:

`Cmd + Shift + R`

Do not claim production verification until the live result has actually
been checked.

## 21. Technical continuity

Current app is Node/Express with Netlify/serverless deployment and a
static frontend under `public/`. Major project areas/files include: -
`server.js` - `store.js` - `storage.js` - `mailer.js` -
`communications.js` - `marketing.js` - `ai.js` - `payments.js` -
`social.js` - `dealIntelligence.js` - `dealSources.js` -
`dealResearchCache.js` - `dealResearchJobs.js` - `public/app.js` -
`public/style.css` - `netlify.toml` - `tests/`

Production uses a real database configuration; local test warnings may
fall back to local development storage. Do not confuse a local fallback
warning with production database truth.

Preserve existing environment-variable guidance. Do not invent or expose
secrets.

## 22. Working style for the next chat

The user wants direct, practical execution: - completed work rather than
repeated planning; - precise commands; - meaningful bundled releases
rather than tiny deployments; - professional, clean copy; - no emojis in replies, captions or marketing copy; - no patronizing language; - no defensive
explanation when a visual/build is wrong; - best solution upfront; - no
false claims of verification.

If a build is visually wrong, treat it as failed and fix it from the
latest confirmed-good baseline rather than arguing that it technically
works.

## 23. Immediate next-chat instruction

Read the full handoff before doing or answering anything. Use section 1 for the current baseline and release status. Perform all three rule reviews for every build. Keep inherited product behavior, exact branding, local mascot architecture, mobile interaction, tutorial coverage and mandatory QA. Do not silently build deferred roadmap ideas. Do not claim production verification without checking it.

# End of handoff

This file is intended to carry the project forward without losing the
accepted baseline, current mascot system, property editing, Deal
Intelligence standards, branding, QA rules, deployment workflow, product
state, saved roadmap or the user's working preferences.


## Pending next update — optional Better Credits at membership checkout (October 15, 2026)

User-approved requirement; queued only, not implemented:
- Replace automatic maximum-credit application with an explicit opt-in. Default: no credits applied.
- Let the member choose the amount of Better Credits to apply, capped at available credit balance and membership payment total.
- Show available balance, chosen credit amount, and remaining amount due before redirecting to Stripe checkout.
- Preserve unused credits; deduct only the selected amount on successful checkout. Validate amounts on the server and prevent duplicate or concurrent spending.
- Match existing design, light/dark modes and mobile layouts; update tutorial/onboarding in the same release.
- Current v29.54 applies available credits automatically to the first membership checkout payment. Existing subscription renewals do not automatically redeem credits; this request does not authorize changing renewal behavior.
- Carry this requirement into every subsequent handoff until implemented and verified.
