# Better Real Estate v29.59 — Commercial Preview

Built from completed v29.58, which is included in full. Package 2.9.59; tutorial release 79. NOT DEPLOYED. Use this release instead of v29.58 if neither has been installed yet.

## Changes
- Rebuilt public preview as a 23-second commercial using high-resolution captures of actual app screens, large branded typography, controlled camera motion, short transitions and an original instrumental score. This is an edited commercial made from real UI captures, not a claim of a continuous live screen recording. All illustrated property facts/profiles are labeled demo data. No invented live transactions, licensed stock music or external property photography.
- Main export: 1920x1080 H.264/yuv420p, 60 fps, AAC stereo, fast-start. Automatic phone source: 1280x720 at 60 fps. Both are included. Six selectable caption cues plus an expandable on-page transcript. No forced sound or autoplay; preload remains none. Exact existing logo asset used without edits.
- Preview sits in the homepage hero. On narrow screens it appears before the headline so it is visible immediately, rather than far down the page. Header, signup and login remain available.
- Pipeline Deal room action was missing a styling class. It now uses the normal btn-primary styling in light and dark, a descriptive accessible name and a minimum 44px target. Existing permissions/navigation are retained. Button was clicked successfully into the linked property's actual room.
- Full walkthrough/What's New guidance updated for the linked room action. Main introduction unchanged.

## Validation
- Full npm regression suite and build passed after final UI changes.
- Browser: styled Deal room button tested and clicked at desktop 1440px, 390px and 320px in both light/dark themes. Target height 44px or larger; no document overflow and correct room route.
- Browser: commercial plays at 1440/390/320px, selects desktop/mobile sources appropriately, advances normally and reports no media error. Six caption cues loaded. Final local playback samples reported 0/135 dropped frames at desktop and 390px, and 1/135 at 320px; this is not a guarantee for every device/network.
- Final MP4 decoded in full; frame rate, dimensions, duration, frame count and audio levels checked. Audio has headroom, without clipping. Screens and key commercial frames visually inspected.
- Protected logo, mascot assets, billing, credit, affiliate and valuation source files preserved. No DNS, provider, production, paid-service or email-sending changes.

## Retained v29.58 bundle
Automatic promo editing/pause/frequency/previews and content history in Email Center; real signed unsubscribe links in marketing and admin tests; CRM member search and team-scoped duplicate prevention; separate expandable Title Directory; custom chart timezone/range fixes. Existing deployment environment gates remain in place. Live provider configuration and inbox delivery are not independently verified by local tests.

## Notes
Video is intentionally higher quality and larger than v29.58. The mobile-specific source and preload=none limit initial-page transfer. Clicking play loads the relevant video. A real-browser production smoke check is still appropriate after deployment.

See INSTALL-v29.59.md. The previous completed v29.58 and unfinished draft archives are superseded for installation by this full package.
