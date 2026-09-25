# Better Real Estate v24 — Trust + Presentation Refresh

## Public homepage
- Rebuilt the sparse public landing page into a full product-focused homepage.
- New positioning: off-market real estate network rather than generic brokerage/agency presentation.
- Added a stronger hero, product preview, trust cues, platform overview, feature bento, workflow section, audience section, and final CTA.
- Better Dispo, Buyers Looking, deal discovery, networking, messaging, and Wholesale Teams now receive clearer prominence.
- Preserved the Better Real Estate charcoal/orange visual system and responsive dark/light theme behavior.

## UI polish
- Added a more predictable button/control sizing system to prevent squeezed or wrapped action labels.
- Reworked Membership Grants admin actions so Grant/Replace and Revoke actions sit in a dedicated action row.
- Improved desktop/tablet/mobile layouts for admin grant controls.
- Added responsive rules for the new homepage down to narrow mobile widths.

## Verification
- Full automated test suite passes.
- `npm run preflight` was also run locally. Its failures are expected environment/deployment configuration checks (DATABASE_URL, SESSION_SECRET, RESEND_API_KEY, MAIL_FROM, APP_URL, ADMIN_EMAILS), not code-test failures. Configure those in Netlify production as documented by the project.
