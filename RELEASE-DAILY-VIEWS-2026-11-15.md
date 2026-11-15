# Website daily browsing and free AI analyses

Candidate build, November 15, 2026. Not pushed or deployed. Production release remains blocked on rendered-browser visual review.

Source: every one of the 453 files in GitHub main at `836f313b17adb78acbb0679a36b539c783380909` was verified before making an isolated source copy. This preserves the confirmed earlier presentation and the November 11 upload-size correction. The original working directory was not overwritten. Package metadata remains the baseline 2.9.76; the release is identified by this date and filename rather than an invented higher source baseline. Tutorial is now 94.

## Final approved behavior

- Free: 30 distinct property views each day. A view includes full property details, exact address, seller notes, phone and email. Vertical scrolling remains; the new feed snaps between properties. Opening details, going Back, refreshing or revisiting a property that day does not charge another view. Search, saved and profile previews require admission before exposing an unseen property's data. Previously viewed details remain available for that day; unseen properties are blocked after 30. The feed then offers membership upgrades or a daily reset check.
- Free: two successful new-property AI Deal Builder analyses daily, as Andrew's latest correction. A running job reserves a slot; failures release it. Completed-property reopens reuse the established result. The Free allowance resets at midnight America/New_York, including daylight-saving transitions.
- Plus keeps five daily analyses and its other existing quotas. Platinum, Wholesale Teams and authorized Admin keep their unlimited analyses and browsing. Active paid entitlements, company access, founder awards and manual grants continue to determine effective membership; a complimentary paid tier retains its paid-tier benefits.
- AI listing drafts, AI-enhanced imports and AI support chat retain their paid-plan restrictions. Human support and deterministic tools remain available on Free.
- Website access no longer uses the old listing-unlock credits or seven-day all-access trial. Shared account fields keep their legacy initialization for native compatibility, but neither grants extra website access. New website unlock and pack purchases are disabled, including the generic payment-intent entry point. Existing balances, ledger entries and previously recorded listing entitlements are preserved; no conversion, refund or financial mutation was performed. The old native unlock contract remains available to the native client.
- Plans, FAQ, account/contact copy, free AI allowance display and the skippable What's New walkthrough match the new rules. Prices, logo, mascot, homepage, affiliate/referral policies and unrelated features are preserved.

## Engineering and resource behavior

Browsing and Free AI use two dedicated, bounded, per-account records, initialized through the existing store. PostgreSQL admission uses conditional revision writes, including retries. Ordinary stale saves cannot overwrite those collections. Deleted-account cleanup removes quota records. No provider, dependency, environment variable, recurring job or integration was added.

Only a visible card requests admission. There is no offscreen property prefetch or feed polling. Account usage reads reuse the already loaded database snapshot; admission and free analysis reservations use targeted writes. AI uses the existing evidence, cache, failure cooldown, provider budgets and property-truth gates. Reservations prevent multiple simultaneous free jobs from spending beyond two available slots and prevent duplicate worker execution. A reservation abandoned before a terminal result expires after 30 minutes; an old token cannot settle a new reservation. Native requests with the existing `BetterRealEstate-iOS/` User-Agent and no browser fetch metadata retain the observed native API contract. This is compatibility routing, not a new native authentication mechanism.

## Five completed review passes

1. Source and instruction review: pinned all baseline file hashes; incorporated the latest two-analysis correction; kept website and native source separate; preserved approved assets and upload correction.
2. Browsing and entitlement review: actual local API routes exercised concurrent admission, exact 30 limit, contact access, repeat views, sign-in, account isolation, hidden search previews, paid/Admin/team exemptions and legacy native responses.
3. AI and persistence review: actual local entry points and background worker with stubbed providers exercised two slots, duplicate-job reuse, one worker per reservation, failed-job release, cached reopening, stale evidence, private tokens and denied third jobs. Dedicated-service conflict tests exercised independent conditional writers. Actual file-store tests verified stale-save protection and account cleanup. Eastern midnight and both DST transitions were checked.
4. Regression and client review: all 122 test programs passed; build script, changed JavaScript syntax and whitespace checks passed. The actual frontend functions were executed in a DOM harness covering visible-only admission, next/previous navigation, route restoration, network failure, retry, cap gate and current copy. Twenty-three historical tests had their current tutorial assertion advanced from 93 to 94; two older behavior assertions were updated for the new Free/feed contract. Tests that depended only on formatting retained their original checks through equivalent formatting in the implementation.
5. Release integrity review: intended file list, source diff, asset hashes, runtime/secret exclusion and final archive hashes were checked. The extracted bundle was rechecked as described in the final verification record.

## Unperformed checks and concrete blockers

Actual rendered-browser review is **not completed**. Local Chromium failed at startup with a denied socket operation. The remote browser could not reach the local test server, then its security policy rejected a shared-file preview URL. No alternate surface was used to bypass that rejection. DOM tests are not visual review. No every-page, responsive, actual touch-device or TestFlight verification is claimed.

No live PostgreSQL, Netlify deployment, real provider research, email, payment or production account action was executed. SQL conflict tests use the actual service SQL interface with a deterministic conditional-writer double, not a live PostgreSQL database. Free AI route/worker tests stub providers; they do not demonstrate fresh live property-data coverage or model quality. No native Swift file, archive or App Store submission changed.

The included `npm run preview:browsing` fixture is for the remaining local visual review. Review 320, 390 and 1440 widths in light/dark across Free, Plus, Platinum and Admin: feed, 29-to-30 transition, limit gate, detail/contact access, Back/refresh, plans and checkout dialog, AI allowance, FAQ and human support. Existing full-product every-page visual review is also still required under Andrew's standing acceptance rule. Do not describe this candidate as production-ready before those checks pass.

See `INSTALL-DAILY-VIEWS-2026-11-15.md` for installation, testing, preview and exact intended-file commit/push commands.
