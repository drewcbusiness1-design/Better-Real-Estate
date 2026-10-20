# v29.68 — Inspector contact and broadcast history

Full update based on v29.67. Not deployed.

- Expanded User Inspector profiles show Remind to confirm email for unconfirmed members, disabled for demo users. The admin-only endpoint rejects already confirmed/demo/missing accounts, checks configured mail, preserves valid existing confirmation tokens, applies a one-minute reminder cooldown and passes a provider idempotency key. Success/failure feeds existing verification mail-health fields. This sends the existing confirmation template, not a marketing blast. A sent response records provider acceptance, not inbox delivery.
- A compact mail disclosure offers In-platform message or Email. Message opens the selected member's conversation. Email opens the existing Email Center with Selected individual people and that member selected. Recipient context survives repeated renders and clears on leaving Email Center, avoiding a silent all-member default. Existing broadcast eligibility still applies: verified, opted-in, non-demo, not unsubscribed. Email is disabled with a reason when ineligible; the separate confirmation reminder remains available for unconfirmed real members.
- Grant verification, Delete account, Founding controls and other inspector action buttons share compact height/padding/type and equal responsive grid widths. Destructive actions retain their distinct colors and confirmation flows.
- Broadcast history rows expand to lazily load saved headline, body, sender and button details through an admin-only allowlist endpoint. Text is rendered through DOM text nodes with preserved line breaks. Older records without retained body explicitly say so. Loading/error/Retry states are included; expanding repeatedly does not refetch successful content.
- Tutorial release 86 describes inspector contact actions and expandable email history. Previous grants/profile editing/admin accordion/land intelligence/service navigation/startup fixes remain included.

No dependency, provider, pricing, environment or migration changes. Exact logo/mascot assets retained. No live email, platform message, payment, deployment or push was performed during implementation.

## Validation
Full npm test suite, build and syntax checks passed. New integration tests cover authorization, missing mail config, existing token preservation, cooldown, idempotency options, provider failure recording, confirmed/demo guards, token non-disclosure and broadcast-content authorization. New executable DOM tests exercise reminder controls, menu eligibility, the message target, selected-only composer behavior through repeated renders, selection cleanup, lazy broadcast contents and text-only handling of script-like input. Existing land/admin/signup/service regressions passed.

Browser visual review remains pending because Chromium is unavailable in this runtime; no claim of screenshot or desktop/mobile visual QA is made. Before production, review 320px/390px/desktop and light/dark: mail icon menu, email-eligibility explanation, reminder button, all account-action dimensions and expanded long/multiline broadcast content. Test a real confirmation reminder only when intentionally sending it; local tests used mail stubs.

Permanent delivery rule: include both install/test and commit/push commands with every update file.
