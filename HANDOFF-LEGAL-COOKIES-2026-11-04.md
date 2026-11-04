# Better Real Estate — Terms, Privacy and website cookie choices

Date: November 4, 2026. Baseline: b420dbdddd4b1afdcf32c92b00e3410e2a2cd6d2.
Code deployment: f336f61e65069596ea599793b7b795659f1b6b8b. Follow-up commit adds this handoff and aligns the restored footer control with neighboring links.

## Delivered

- Terms sections 3b–3e: upload ownership/permissions, limited operating license covering website and iPhone app, access controls/private-content boundaries, removal/retention limits, external provider restrictions and reporting contact.
- Privacy: uploaded content processing and visibility explained without treating a content license as advertising or AI consent.
- Both policies dated November 4, 2026. Removed the obsolete working-template note. Reconciled contradictory marketing copy with the existing signup behavior; email settings and paused sending jobs were not changed.
- Website-only compact charcoal/gold cookie card, equal choices, stacked narrow-screen buttons, safe-area padding and internal scrolling. Existing native-app notice presentation and advertising block preserved.
- Fixed a real SPA bug: asynchronous footer rendering removed Cookie settings. The footer now remounts exactly one working control; the control matches neighboring links while retaining a 44px hit area.
- Pricing, affiliate compensation, logos, mascot, overall page layouts, accounts, data, secrets and backend delivery behavior unchanged.

## Five review passes

1. **Policy and factual coverage:** compared the actual Terms/Privacy, signup notice, upload/content features and deletion controls; checked primary Apple Content Rights/App Review guidance and US Copyright Office permission guidance. A limited user license does not establish rights in pre-existing or externally licensed content.
2. **Scope and preservation:** reviewed the intended diff against the verified badge release; backed up the three affected website files before editing. No unknown changes overwritten; native push and badge files preserved byte-for-byte.
3. **Behavior and accessibility:** new runtime tests execute actual cookie + Pixel scripts: initial blocking, essential/allow choices, expiry/persistence, reopening, duplicate prevention, focus/scroll restoration, revocation reload, legal-page access, native exclusion and GPC/DNT. Tests execute real legal-page render functions. SPA footer-remount regression included.
4. **Regression/build:** all 115 npm test entrypoints passed, including 24 APNs signing/transport scenarios and native badge regression coverage. Both edited JavaScript files passed syntax checks; npm run build and git diff --check passed. This project serves static assets and has no frontend compilation step.
5. **Live browser/delivery:** visually reviewed the published cookie card and both changed legal pages. Verified stacked controls and no horizontal overflow at effective CSS widths 454px and 340px using browser zoom; keyboard focus scrolls the privacy link into view at 340×234. This is desktop-browser responsive QA, not an on-device iPhone test. Verified footer settings reopen after page render, Terms/Privacy navigation, Back/Forward and refresh. Production app.js, cookie-notice.js and cookie-notice.css returned HTTP 200 and matched reviewed local bytes for the code deployment. Netlify dashboard remained at its loading screen; its literal Published label could not be inspected in this session. Production publication was independently established by live UI and exact asset-byte comparison.

## Remaining release limits

- This does not retrospectively clear uploaded photos or third-party property/map/provider content. New acceptance records or a rights audit may still be needed for existing content; no versioned reacceptance flow was added. Apple Content Rights was not attested merely because these policies changed.
- App Store release still needs the current working native Version 1.0/Build 20 uploaded from Xcode, a truthful Content Rights declaration and the previously identified subscription/DSA steps. Do not select old 0.11.1 builds as substitutes.
- No purchase, legal agreement acceptance, new provider integration, public-contact change or App Store submission was performed in this update.
- This focused change is not a complete jurisdiction-by-jurisdiction legal review or an every-page/every-role visual audit.

## Installation and verification commands

For a clean local checkout or after safely reconciling local work:

```bash
cd "$HOME/Downloads/Better-Real-Estate"
git pull --ff-only origin main
npm ci
npm run test:legal-cookie
npm test
node --check public/app.js
node --check public/cookie-notice.js
npm run build
git diff --check
```

`npm ci` is the reproducible installation command; existing dependencies were reused for this update's tests. Preserve local runtime/environment files and uploads. If the Downloads path differs, use the actual existing checkout; do not replace the separate iPhone project.

Equivalent explicit commit/push commands for the release changes (the agent published through the authenticated GitHub connector, not shell git push):

```bash
git add -- package.json public/app.js public/cookie-notice.js public/cookie-notice.css tests/legal-cookie.test.cjs
git commit -m "Clarify content rights and privacy; polish website cookie choices"
git push origin HEAD:main
git add -- public/cookie-notice.css HANDOFF-LEGAL-COOKIES-2026-11-04.md
git commit -m "Align cookie settings footer control and record release verification"
git push origin HEAD:main
git fetch origin main
git log -1 --format='%H %s' origin/main
```

Do not rerun commit commands against an already updated checkout or stage unrelated files. No release ZIP created. Sources: https://developer.apple.com/help/app-store-connect/reference/app-information/app-information and https://developer.apple.com/app-store/review/guidelines/#intellectual-property and https://www.copyright.gov/circs/m10.pdf.
