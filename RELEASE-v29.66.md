# v29.66 — Workspace and analysis fixes

Full source bundle based on v29.65 Startup, including its signup/sign-in typo correction and loading screen. Not deployed.

## Changes
- Service workspace navigation remains active across Messages/chat, Network, Profile/settings and shared screens. A workspace URL parameter preserves context on refresh and Back/Forward. Main dashboard explicitly exits the workspace; service tools explicitly enter it. Service Profile opens the existing service-profile editor instead of the investor tools dashboard. Published provider profiles show service information and quote actions in service context through an authenticated public-profile allowlist endpoint.
- Admin title-company maintenance is removed from the long Admin page and replaced with a button opening the existing dedicated Title companies route. Added to Quick Options; Profile and Command center links retained.
- Admin User Inspector is independent of ancillary activity/demo/queue request failures, has inline Retry, and ignores stale search responses. New render generations reject stale same-route results and errors so older requests cannot overwrite newer pages. These corrections address observed failure mechanisms; no live reproduction or production verification occurred.
- Explore and compare growth is a native, keyboard-accessible details disclosure, initially collapsed. Existing chart controls/preferences remain inside; no chart data request is added on initial load.
- Manage my properties uses the shared padded form layout, with additional action spacing. Existing owner/admin Edit property controls remain near the top of listing details and in Manage my properties. Backend ownership rules are retained.
- Land mode is selected by resolved land evidence or an explicit choice when no resolved building type exists. A raw land claim cannot override a resolved house. Explicit land selection cannot replace resolved house evidence. Existing valuation gates still apply.
- AI land results show research facts, source evidence, source disagreements, rejected sales and explicit valuation limitations. Manual planning calculator, input fields and listing-creation action were removed from AI land results at user request. Land listing calculators elsewhere are retained. Automated land valuation is not newly implemented and remains withheld when unsupported.
- Tutorial release 84 describes service navigation continuity. Startup clears after the actual initial screen or error mounts, instead of merely after starting its asynchronous render.

No dependencies, prices, billing providers, environment variables, database migrations or external messages added. Existing exact logo and mascot assets retained.

## Verification
Full npm test suite passed, including new executable DOM-level workspace tests and the prior signup/login handler checks. New tests exercise shared-route service navigation, URL restoration, explicit main-dashboard exit, collapsed chart controls, land results without inputs, house/land classification, admin ancillary failures, inspector Retry and stale same-route render ordering. Service endpoint integration tests check authentication, published-only access and no email/password exposure. Syntax checks for server, app, release UI, service UI, service providers and land module passed. npm run build passed.

Browser visual QA is pending. This session has no Chromium executable; the browser-install attempt during v29.65 returned invalid archives. DOM tests do not establish visual fit. Before production, review 320px/390px and desktop in light/dark, service navigation and Back/Forward, provider profile/quote controls, repeated admin visits and inspector searches, Title companies editing, growth disclosure keyboard behavior, own-listing Edit, Manage my properties padding and startup behavior with slow requests. Test real house/land addresses using authorized research when available; no paid research or live payments were run here.

The handoff records implemented source changes, not deployment completion.
