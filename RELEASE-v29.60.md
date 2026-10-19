# Better Real Estate v29.60 — Email Center Updates

Package 2.9.60; tutorial release 79. NOT DEPLOYED. Full replacement package for v29.58/v29.59.

## Changes
- Removed homepage video, player, captions, transcript, poster, video styling and production scripts. Restored the original homepage feature panel and responsive ordering from v29.57.
- Kept the corrected Pipeline Deal room button styling, accessible label and 44px minimum target.
- Retained Email Center promo controls, previews, frequency/pause/template editing, eligibility and delivery history; signed unsubscribe links; CRM member search and duplicate prevention; Title Directory; custom chart range/timezone fixes; feed fixes. No email sends or production changes performed.

## Validation
Full npm regression suite and build passed. Browser checked restored homepage at 1440px, 390px and 320px: no video elements or horizontal overflow. Deal room button styled and navigated successfully at all three widths in light/dark themes. No uncaught browser errors. Live provider readiness and inbox delivery require production verification.

## Installation
Use INSTALL-v29.60.md. It includes removal of obsolete preview assets for installations that already contain them. Older release documents are historical; this release supersedes their video instructions. Existing logo and mascot assets are unchanged.
