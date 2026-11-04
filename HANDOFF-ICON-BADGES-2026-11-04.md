# Better iPhone icon badges — November 4, 2026

## Scope and source

Andrew requested that the existing in-app notification counts appear on the iPhone app icon, then continuation of the Apple release. Backend baseline is verified GitHub main `b2cd2167280d4432d5ab49d9b3ea97c7485a5dde`. Read HANDOFF-PUSH-2026-11-04.md for the earlier signing repair and release gates. The production signing fix and message previews are preserved.

This is a backend update used by the native iPhone app. **No Swift, Xcode, website UI, branding, plan, payment, account or upload changes are included.** The recovered Build20 source already requests badge authorization and its foreground notification delegate includes `.badge`. This source observation does not verify the installed signed binary or device settings. No Xcode rebuild is needed to add APNs badge payloads to that existing app. Do not uninstall it or discard unsynced notes.

## Behavior

- `notificationCounts.cjs` contains the existing notification-summary logic. The API and native push dispatcher use this same source, preserving exact categories and admin allowlist/affiliate exclusions. The icon uses `total`; it does not add the Profile aggregate again.
- Normal message/deal pushes carry `aps.badge` alongside the preserved sender, preview, bark and link.
- The once-per-minute existing dispatcher sends a badge-only update when the account's total changes, including existing unread items, network/admin count changes, reads on another device and a return to zero. These updates have no banner or sound. They use the `alert` APNs push type (badges are a user-visible effect), priority 5 and a badge-specific collapse identifier.
- A successful APNs response persists the installation's last badge count. Unchanged counts are not pushed every minute. Failed updates remain retryable, do not mark events read/seen, and do not advance alert watermarks. Invalid tokens retain the existing removal behavior. Totals are calculated only for users with registered devices, once per user per run.
- Authenticated device unregister/sign-out removes only that user's matching installation, then makes a best-effort zero-badge push. An APNs outage does not block sign-out or retain a token for retries. This means clearing cannot be guaranteed while the device/provider is unreachable.
- No background execution, service extension, Firebase, extra bell or new settings UI was added. iOS notification/badge settings remain authoritative. Cron updates can take a scheduling cycle plus Apple's delivery time; this is not an instantaneous cross-device sync guarantee.

## Five review passes

1. **Source/count semantics:** inspected the deployed baseline, the exact existing server summary and Build20's notification authorization/delegate. Preserved categories, no Profile double count, same admin allowlist, affiliate exclusions and ownership.
2. **Behavior/security:** badge tests exercise old unread items, real counts, read/decrease/zero, stable-count suppression, normal alert payloads, multiple installations, unrelated accounts, APNs rejection/retry, invalid-token removal and authenticated sign-out clearing. Signing/privacy protections from the prior fix remain. No real secrets are used locally or logged.
3. **Regression:** full npm test passed with 114 entry points after adapting two older tests to the shared count module. The first run correctly caught a source-location assertion in the legacy notification test; it now checks actual shared destinations and API wiring. There are 24 passing real-crypto/mocked-transport scenarios plus the badge behavior suite. Syntax, build and diff checks pass.
4. **Packaging/scope:** added the shared module to Netlify included_files for the raw server runtime. The signing suite also passed against an esbuild bundle containing the badge implementation. Reviewed only intended backend/test/config/handoff changes; public/ and native source remain unchanged. A later optimization only avoids calculating totals for users with no registered device; the targeted suite was rerun after it.
5. **Production/device:** this commit must be verified Published, then native-push-cron inspected for successful badge updates and a later unchanged-count run. No visible icon badge or fresh Xcode/TestFlight test is claimed by these local checks. Record actual production results in the current conversation before marking rollout complete.

## Next: production acceptance, then App Store Connect

Verify the Published SHA, APNs acceptance (`badgeUpdates`, `sent`, `failed`) and no repeated badge-only sends for unchanged totals. Ask Andrew to inspect the Home Screen icon and read notifications to confirm decrease/clear on the actual iPhone. If the count is hidden, inspect the actual iOS badge permission rather than guessing.

Continue App Store Connect from its current page/state. Do not restart enrollment or assume which build is selected. Outstanding release gates include the actual current archive/signed entitlements, TestFlight push acceptance, real StoreKit purchase/restore with approved tiers, native device visual/navigation/account isolation QA, and current metadata/review submission. Preserve Wholesale Teams Annual as website-only at its approved price; do not invent App Store products/prices or change entitlements.

## Mac sync and checks

The cloud commit/push through GitHub triggers Netlify production. That does not update Andrew's Mac checkout or install an app. Once this update is published, sync only with a clean tracked working tree; preserve the unrelated untracked `websiteBanner.js`.

```bash
cd "$HOME/Downloads/Better-Real-Estate" || exit 1
git status --short
git diff --quiet && git diff --cached --quiet || exit 1
git pull --ff-only origin main || exit 1
npm ci && npm test && npm run build &&
node --check server.js &&
node --check nativePush.cjs &&
node --check notificationCounts.cjs &&
git diff --check
```

No additional commit/push is required after pulling a change already committed and deployed here. For a future local amendment to this badge implementation, after backup, review and passing tests, stage only the intended files:

```bash
git add -- nativePush.cjs notificationCounts.cjs server.js netlify.toml package.json tests/native-push-signing.test.cjs tests/native-push-badges.test.cjs tests/v29-25-performance-notifications-stability.test.js tests/v29-44-affiliate-accounts.test.js HANDOFF-ICON-BADGES-2026-11-04.md
git diff --cached --check && git diff --cached --stat
git commit -m "Keep iPhone icon badge synced with unread notifications"
git push origin main
```

No release ZIP is needed for a directly deployed backend-only change. Include an updated handoff in every future release ZIP and preserve all inherited standing rules and explicitly pending work.
