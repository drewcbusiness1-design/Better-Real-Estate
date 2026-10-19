# Better Real Estate v29.58 — Email Center and Site Preview

Built from v29.57. Package 2.9.58; tutorial release 78. Locally tested and browser-verified; NOT deployed. This supersedes the unfinished v29.58 working draft.

## Delivered
- Automatic promotions in Admin Email Center: current configuration readiness and eligible-member count, persisted pause/enabled control, 48–720-hour minimum interval, individual template enablement, subject/heading/body/button editing and rendered previews. Environment enablement, configured provider and mailing address remain required. Settings cannot override an unavailable provider.
- New automatic-email history stores actual content/HTML at attempt time, timestamp, recipient and provider ID/error. Displays latest 100 attempts; accepted is provider acceptance, NOT inbox delivery. Earlier emails were not archived and are not reconstructed as historical facts. Existing environment flags and live state were not changed.
- Production no-login signed unsubscribe GET/POST preserved. Admin broadcast tests now use the same signed unsubscribe route rather than a Settings-only link. Tests can unsubscribe the testing admin from marketing if clicked, which is intentional and reversible in Settings. Automated promotions and user-created broadcasts remain separate.
- Branded marketing email header uses the existing exact wide logo asset on a light background for contrast; no logo or mascot file was altered.
- Public homepage includes an actual 31-second screen recording, approximately 1.05 MB, H.264/yuv420p MP4 with fast-start metadata, poster, controls, inline mobile playback, seven English caption cues and preload=none. No autoplay or audio. Demo profiles, property and illustrative seller figures are clearly labeled. Shows actual property details, Network, member-to-CRM workflow, a pipeline-stage change and independent title contacts. No fabricated actual transactions or external photo feed.
- Buyer CRM has explicit Add from Better members, search by public name/username, public-name autofill and profile association. Existing private contact fields remain private. Server rejects a duplicate member association within the same personal/team CRM scope; another unrelated user can maintain their own relationship.
- Dedicated Title Directory under Quick Options and workspace tools; expandable alphabetical company rows and state filtering. Market Hubs links to it; listing-specific contacts remain. Existing admin company controls retained. Directory still has the initial two companies, not invented nationwide coverage.
- Existing custom growth periods are retained and corrected: local datetime inputs are serialized to ISO timestamps; invalid/reversed ranges are rejected. Charts use the same selected range as totals.
- Sparse legacy buying-criteria arrays no longer crash feed scoring; absent optional situation/timeline labels no longer render as undefined.
- Main introduction remains unchanged; full walkthrough/What’s New includes release 78 guidance.

## Verification
- Full npm test suite including v29.58 API and mocked-provider delivery tests: PASS.
- Browser at 1280px desktop, 390px and 320px; light and dark: Email Center, Title Directory, CRM, Admin checked. Title expansion/filter tested. No horizontal document overflow or uncaught browser errors.
- Browser saved pause/interval controls, reloaded and verified persistence; rendered email preview and exact logo verified.
- Custom chart inputs tested in America/New_York: local October 1 midnight sent as 04:00 UTC.
- Actual MP4 playback verified at 1280/390/320px: decoded 1280x800 video, duration 31.04 seconds, advancing playback, no media error, seven caption cues, controls/inline playback and no preload download.
- Unsubscribe valid/invalid token, GET and POST, stored opt-out and exclusion tested locally. No real mail, paid provider or production database call.
- Evidence logs: VALIDATION-v29.58.txt and BROWSER-VALIDATION-v29.58.txt. Optional browser reproduction script: tests/browser-v29-58.cjs (requires a separately installed Playwright browser; not a runtime dependency).

## Operational limits
- Live deployment variables, actual recipient consent records, provider delivery and live cron execution are NOT independently verified. Email Center reports deployment configuration at runtime.
- Automatic marketing remains on the existing daily Netlify job and Resend provider; no SES or mass cold-outreach integration is included.
- The new app-level controls apply to automatic member promotions. The existing broadcast composer remains its own reviewed send/schedule workflow.
- New collections promoSettings and promoDeliveries are additive through store initialization. Keep existing PostgreSQL, secrets and sender configuration.
- No runtime dependencies, API keys, DNS changes, billing changes or new scheduled jobs are required.

See INSTALL-v29.58.md for copy/check/push instructions. Do not install the older WORKING-DRAFT ZIP.
