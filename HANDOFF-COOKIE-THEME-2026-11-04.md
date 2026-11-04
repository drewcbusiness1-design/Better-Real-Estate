# Cookie prompt — match the existing UI

November 4, 2026. Supersedes the fixed charcoal/gold colors described in HANDOFF-LEGAL-COOKIES-2026-11-04.md. Baseline 60847bb5c544369a1b9886eeb816fc5e77174c78; CSS change bfc5f392549d3031fe035349f603e7a5aafb1d62.

The website cookie card now uses the site's existing --surface, --ink, --ink-2, --line-strong, --bg-elev, --surface-2, --navy and --shadow-lg variables. Removed the separate gold stripe and fixed palette. Body/button text inherits Inter; headings retain the shared Bricolage Grotesque rule. No new font or theme palette. Light/dark mode follows the current site. Native-app styling, consent logic, compact dimensions, responsive layout, policies, branding and other UI remain unchanged.

Five review passes: (1) actual light/dark theme definitions and type rules inspected; (2) fixed website-card colors removed and shared token references checked; (3) diff confirms website-scoped CSS only and native/consent behavior preserved; (4) all 115 npm test entrypoints, build and diff whitespace checks passed; (5) live light/dark visual and computed-style verification recorded in the delivery response, with production CSS compared byte-for-byte. No on-device iPhone testing or every-page audit claimed.

Standing UI requirement: all future UI updates must use the current product's actual colors and fonts. Brand colors alone are not a substitute for matching the current interface.

Installation/tests (existing dependencies were reused in this session):
```bash
cd "$HOME/Downloads/Better-Real-Estate"
git pull --ff-only origin main
npm ci
npm test
npm run test:legal-cookie
npm run build
git diff --check
```
Equivalent commit/push commands (agent writes used the authenticated GitHub connector):
```bash
git add -- public/cookie-notice.css
git commit -m "Use existing UI theme tokens for website cookie consent"
git push origin HEAD:main
git add -- HANDOFF-COOKIE-THEME-2026-11-04.md
git commit -m "Record cookie theme correction and review results"
git push origin HEAD:main
git fetch origin main
git log -1 --format='%H %s' origin/main
```
Do not recreate commits in an already updated checkout. Preserve unrelated work and runtime files. No native installation/archive needed for this website-only correction. Existing Apple release blockers remain in the prior handoff.
