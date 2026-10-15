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



## Pending next update — optional Better Credits at membership checkout (October 15, 2026)

User-approved requirement; queued only, not implemented:
- Replace automatic maximum-credit application with an explicit opt-in. Default: no credits applied.
- Let the member choose the amount of Better Credits to apply, capped at available credit balance and membership payment total.
- Show available balance, chosen credit amount, and remaining amount due before redirecting to Stripe checkout.
- Preserve unused credits; deduct only the selected amount on successful checkout. Validate amounts on the server and prevent duplicate or concurrent spending.
- Match existing design, light/dark modes and mobile layouts; update tutorial/onboarding in the same release.
- Current v29.54 applies available credits automatically to the first membership checkout payment. Existing subscription renewals do not automatically redeem credits; this request does not authorize changing renewal behavior.
- Carry this requirement into every subsequent handoff until implemented and verified.
