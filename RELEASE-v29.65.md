# v29.65 — Startup loading screen

Full source update based on v29.64 Platform Help Management. User reports v29.64 checks and push completed; deployment status was not independently checked. This release is not deployed.

Uses the existing exact logo, current theme colors and saved light/dark preference immediately. Hides the unfinished page shell while initial account/pricing/payment configuration loads. Reveals the app after the first render without an artificial minimum delay. A short fade respects reduced motion. After 20 seconds, displays a connection/reload message with a keyboard-accessible reload link; startup can still finish normally afterward. JavaScript-disabled guidance is included. Also fixes the v29.64 signup/sign-in redirect typo: go(defaultMemberDashboard()) replaces the undefined godefaultMemberDashboard(). Tests execute the actual handler across signup/login, regular members, affiliates, providers, company invites and intended-route precedence (18 combinations). No changes to Stripe loading, billing, providers, server logic or existing tutorials. No new tool requiring tutorial content.

Validation: complete inherited npm test suite passed; app syntax passed. Executed startup-script checks cover saved dark theme, blocked storage, timeout/reload state and ready cleanup/accessibility state. Browser visual QA was attempted but blocked because the runtime has no Chromium executable and the download returned invalid archives. Desktop/mobile, theme and reduced-motion visual review remains required before deployment.

Earlier release documentation is historical. Preserve environment files, uploads and local database when installing.
