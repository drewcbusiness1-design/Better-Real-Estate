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
