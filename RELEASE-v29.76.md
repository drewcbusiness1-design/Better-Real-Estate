# Better Real Estate v29.76 — website usability and app integration

This is a website source release based on v29.75. It does not contain an Xcode project and has not been deployed automatically.

## Included

- Authentication: Sign in explicitly opens login; login/signup mode survives refresh; existing intended destinations and role dashboards remain; Sign out has a focused Cancel/Sign out confirmation.
- Better Guide: one help search, a concise default introduction, free course access, and optional expandable full walkthrough and personalized guidance. Removed the duplicate platform-help search and tour-status block from the Guide panel. Detailed tours can reveal the property manager when teaching an owner tool.
- Profiles: a default official Better banner, 3:1 upload preview and saved account banners, reset control, avatar editing through Edit profile, real paginated follower/friend lists, closer social actions, grouped membership badges and searchable expandable tool groups with gray chevrons.
- Messaging: activity status in the conversation list and chat header follows the existing server privacy setting; hidden/unknown status is not reported as Offline. Mobile typing hides bottom navigation and keeps the composer accessible.
- Marketplace: account-saved grid/list preference; Buy now, Add to cart and View cart; account-scoped durable cart; unavailable-item handling; current server prices and shipping quotes remain authoritative. Each product is checked out separately, including shipping where relevant. A confirmed purchase removes that product from the cart. The cart has one entry per product; this release does not introduce a combined multi-seller payment.
- Product photos: deduplication, one main photo, thumbnails, counter, swipe navigation, full-screen viewer, two-pointer pinch zoom, panning, reset, previous/next and Close/Escape.
- Properties: main listing information renders without waiting for secondary tools; reads time out with a Retry path rather than an indefinite spinner. Buyer tools load automatically. A pencil beside the address reveals management, including existing editing/photo ordering, showing, deal-room and distribution tools. Only the listing poster and an admin can manage; same-company membership alone no longer grants management rights. Narrow-screen sizing, button spacing and long-text wrapping are constrained.
- Branding: the official header logo retains its complete emblem with padding; only transparent whitespace was trimmed. Website typography and orange colors are retained.
- Companion server support: shared banner/connection endpoints and native APNs/Live Activity integration are wired into the website server. Remote iPhone notifications and suspended-app progress still require Apple capabilities, credentials and deployment. See NATIVE-PUSH-SETUP.md; no credentials are included.

## Validation and limits

The full npm test suite, including new real HTTP route tests and UI action tests, passes. JavaScript syntax checks pass. Tests cover account cart isolation and pricing, confirmed fulfillment, owner/admin permissions, banner persistence/control, sanitized follower lists, presence privacy, photo viewer interactions, sign-out choices and auth-mode routing. The updater is tested on clean v29.75 and rejects unexpected edits before writing.

The payment tests exercise local wallet/fixture behavior, not a live card charge. No live Stripe, supplier shipping, production database, APNs or real-device visual test was performed here. Browser screenshots were not available in this environment. These are validation limits, not claims of live deployment. Preserve the existing production configuration and verify these integrations on your deployment before announcing the update.

## Install

Use install-update.py against the existing Better-Real-Estate folder. It validates all changed-file baselines, backs up existing changed files outside the repository and applies only the release changes. It preserves .env, uploads, database files and unrelated local files. It accepts the original v29.75 and the exact earlier preview files where known; unexpected local edits cause a stop before any files change.

Run npm ci, npm test, node --check server.js, node --check public/app.js and git diff --check. Then use stage-update.sh to stage only this release's changed files, commit and push through the project's existing deployment workflow. The deployment commands are in START-v29.76.md.
