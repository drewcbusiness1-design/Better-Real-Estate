# Better Real Estate v29.57 — Connected Deals

Built from the confirmed-good v29.56 Mascot Motion baseline. Package 2.9.57; tutorial version 77. This package has been validated locally; it has not been pushed or deployed to production.

## What changed

- One deterministic buyer-criteria evaluator now drives confirmed matches, personalized buy-box scoring and alerts. Missing required facts produce “needs information”; paused buyers and inactive/expired listings do not receive matching alerts. Public match rows explain the criteria and show their last update. Private criteria and identities remain private.
- Publishing a property creates deduplicated in-app alerts for matching members by default. Buyers saving their criteria receive reverse matches to existing available properties. Seller automatic matching and buyer notifications can be turned off in Settings. Manual notification remains available for new, not-yet-alerted matches.
- The existing 15-minute communications job now processes eligible matching emails. It uses a separate persistent delivery collection, atomic PostgreSQL claims and provider idempotency keys. Internal alerts are counted separately from email delivery. A failed or interrupted email attempt is not blindly retried; its in-app alert remains available. No text blasting.
- Property details now include interested/question/walkthrough/conditional/pass responses, seller-visible feedback and a response board. Buyers can request a price threshold and/or additional photos. Each condition can trigger one relevant update alert per saved request. Counts describe recorded activity, not completed appointments or closings.
- Property-linked messages retain their attachment across navigation and refresh. Responding buyers can use the existing deal room; their request and conversation stay attached. Private team notes are withheld from buyers.
- Buyer CRM supports CSV column mapping, selection and duplicate preview, export including notes and structured criteria, explicit Better-member association, and correct teammate editing without duplicate contacts. Contacts are not auto-invited and no accounts are generated. Maximum import: 500 contacts / 1 MB.
- Deal pipeline now includes private outside opportunities, source links, notes, next actions, stages and private document uploads. Preparing a public listing requires a separate review/publish action and does not copy private notes.
- Compare up to three private/saved properties using common editable cost assumptions, known/missing input labels and ±10% ARV scenarios. Results are estimates from user/seller inputs, not verified profit or a “best deal” claim.
- Permission-based property introductions: select a member, send a request, then the recipient explicitly accepts and messages the seller. No private CRM information or implied commission is shared.
- Market Hubs includes a free, alphabetically ordered title-company contact directory. Entries for the property's service state appear in its details. Admin can add, edit and deactivate entries. Source and review dates are displayed; these are not partner or licensing-verification badges.
- Property details reuse fresh server-side comp evidence. Seller ARV is separate from supported ranges and source-linked sales. Unsupported, stale or conflicting data is clearly labeled. A nonblocking warning appears when the seller ARV is more than the configured percentage outside a supported range. Default: 15%; optional environment variable LISTING_ARV_WARNING_PERCENT (0–100). This is a review threshold, not an industry valuation standard.
- AI Deal Analysis can show permitted, accessible member-uploaded photos from an address-matched Better listing, with source/date and historical labels. It does not scrape third-party listing photos.
- Full walkthrough, What's New, Better Guide help and AI support reference updated. The short introduction remains exactly ten steps. All new controls use the existing light/dark palette and responsive layout.

## Limits and operational notes

1. The directory starts with SJS Title (NJ/PA) and Investors First Title Agency (NJ/FL), based on their public company sites reviewed October 17, 2026. It is not a nationwide completed directory. Other markets show an empty state. Confirm licensing, services, transaction type, price and availability directly with the company.
2. No paid title package, referral percentage, payment handling, expedited-service promise, title-company login or partnership contract was added. No outreach emails were sent during this build.
3. No external licensed property-photo feed is configured. Photos unavailable from permitted Better records are labeled unavailable. Public visibility alone is not treated as permission to copy photos.
4. Listings without suitable cached research show an unavailable state. Owners can open the prefilled AI Deal Analysis form and deliberately run research under existing allowances. Publishing does not silently spend AI/provider credits. Cached evidence expires after 24 hours; material property-fact/condition edits invalidate it. Seller price/ARV changes can be compared with still-valid evidence.
5. Matching emails depend on configured Resend and the existing Netlify scheduled function. Delivery is best effort, not a guaranteed instant email. API/browser validation used fixtures and no live paid provider calls.
6. New collections are additive and created through the existing store initialization: titleCompanies, buyerResponses, privateDeals, dealIntroductions, matchDeliveries. Production must retain its existing PostgreSQL configuration. No runtime dependencies or data providers were added.

## Validation performed

- Full existing regression suite plus v29.57 API/behavior tests: passed.
- Syntax checks for changed server, store, browser, mailer and new modules: passed. Static build: passed.
- Local HTTP tests: ownership boundaries, matching/missing data, paused buyers, reverse alerts, deduplication, settings, team CRM edit, CSV mapping/duplicates/export, private associations, response visibility, conditional alerts, room handoff/private notes, private opportunities/documents, comparison math, introduction acceptance, admin-only directory edits and nonblocking comp warnings.
- PostgreSQL engine (PGlite) verification: atomic JSONB delivery claim, concurrent cycle exclusion, failed-send status and no reset by stale store snapshots. This is not a production database/deploy test.
- Headless Chromium: private opportunity save/compare/public-draft review, CSV import, directory, property panels, buyer conditional response, attached chat send/refresh, admin directory addition and modal keyboard close. Desktop 1280px and mobile 390/320px, light/dark, with overflow checks and visual inspection.
- Original logo bytes, mascot rig, payments.js, membershipCredits.js, affiliateLeaderboard.js, dealSources.js and dealIntelligence.js preserved. Historical test edits update version/tutorial assertions and inject the new helper into isolated route fixtures; substantive assertions remain.

## Directory sources

- https://www.sjstitleco.com/team — public contacts, NJ/PA service claim and wholesale division.
- https://investorsfirsttitle.com/ — public contacts and NJ/FL service claim. The broader “46 states” claim was not converted into invented state-by-state coverage.

See INSTALL-v29.57.md for local installation and verification. The complete inherited handoff is retained in Better-Real-Estate-v29.57-MASTER-SEAMLESS-HANDOFF.md.
