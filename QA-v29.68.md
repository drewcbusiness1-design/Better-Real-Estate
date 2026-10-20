## Validation
Full npm test suite, build and syntax checks passed. New integration tests cover authorization, missing mail config, existing token preservation, cooldown, idempotency options, provider failure recording, confirmed/demo guards, token non-disclosure and broadcast-content authorization. New executable DOM tests exercise reminder controls, menu eligibility, the message target, selected-only composer behavior through repeated renders, selection cleanup, lazy broadcast contents and text-only handling of script-like input. Existing land/admin/signup/service regressions passed.

Browser visual review remains pending because Chromium is unavailable in this runtime; no claim of screenshot or desktop/mobile visual QA is made. Before production, review 320px/390px/desktop and light/dark: mail icon menu, email-eligibility explanation, reminder button, all account-action dimensions and expanded long/multiline broadcast content. Test a real confirmation reminder only when intentionally sending it; local tests used mail stubs.

Permanent delivery rule: include both install/test and commit/push commands with every update file.
