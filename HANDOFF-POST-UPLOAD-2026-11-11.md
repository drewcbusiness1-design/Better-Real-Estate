# Website listing upload correction

Confirmed production cause: November 10, 2026, 10:29:42 PM EST, POST /api/listings returned 413 Content Too Large. Netlify request 01M74AEZ66QBYXKF5C9QQY4XVY; no API invocation for this post. Admin showed the Brandon Israel account has confirmed email, seller/buyer roles, Platinum, zero saved listings. The reported return through registration remains unproven; this patch does not claim to resolve a separate authentication defect.

Baseline main 79ec567133871d43cec1ee00f31bf139b096701e, independently confirmed published in Netlify. Changed public/app.js only for runtime behavior: cap selected listing photos to 250,000 data-URL characters each (up to 12); cap the complete JSON submission to 3,500,000 UTF-8 bytes; recompress oversized existing in-memory photo selections if needed; retain form/photos on failure; prevent duplicate posts and posting before image preparation completes; reject unreadable images; make non-JSON HTTP 413 errors readable. Added regression test. Updated the existing photo instructions in place. No layout, theme, pricing, accounts, uploads, database or native source changes. No new dependency, external service or additional server request per photo.

Five review passes performed:
1. Production diagnosis: Netlify request details confirm 413, deployed commit checked, account eligibility checked.
2. Scope/diff: only upload/error behavior and in-place help copy changed; backend, styling and memberships preserved. Backup of original app.js retained in scratch.
3. Focused runtime tests: aggregate 12-photo budget, UTF-8 fields, oversized text rejection, original payload preservation, text/plain 413, duplicate/wait guards, failed form preservation and success navigation passed.
4. Existing npm test suite finished without failures; JavaScript syntax, build and diff whitespace checks passed.
5. Release integrity: current GitHub app.js blob checked against baseline before write. Only intended files included. Real-browser image testing was attempted but blocked by environment: cloud browser cannot reach local QA host; local Chromium socket creation is denied. Safari/device testing and Brandon's successful retry remain required. No every-page visual or real-device verification is claimed.

Commands for an existing clean Mac website checkout:

```bash
cd "$HOME/Downloads/Better-Real-Estate"
git status --short
git pull --ff-only origin main
npm ci
npm test
node tests/listing-upload-size.test.cjs
node --check public/app.js
npm run build
git diff --check
```

Equivalent intended commit/push commands for a checkout containing the reviewed changes (do not recreate if already pulled):

```bash
git add -- public/app.js tests/listing-upload-size.test.cjs HANDOFF-POST-UPLOAD-2026-11-11.md
git commit -m "Bound listing photo uploads to prevent production 413 failures"
git push origin HEAD:main
```

Verify Netlify publication separately. The submitted iPhone Build 21 and pending native Guide Build 22 remain separate. This website correction cannot recover the rejected request's unsaved contents; Brandon will need to retry his post after refreshing the site.
