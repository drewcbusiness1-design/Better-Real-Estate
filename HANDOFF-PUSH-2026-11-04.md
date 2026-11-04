# Better iPhone push delivery — November 4, 2026

## Current verified outcome — server delivery restored; physical-device acceptance pending

This section supersedes earlier investigation/deployment status below.

- Format-fix commit `ac1aad23a95223ce3545b3dd4900a0ce6a2c2a15` was verified Published in Netlify production at 9:45 AM America/New_York on November 4, 2026.
- At **9:46:11 AM**, the production function reported **sent 12, failed 0, devices 2, eligible 12, attempted 12**. In this implementation sent advances only on APNs HTTP 200. Apple accepted all 12 requests. This is real production delivery evidence, not a mock; visible iPhone delivery is not yet confirmed.
- At **9:47:05 AM**, the next scheduled dispatch reported **sent 0, failed 0, eligible 0, attempted 0**, with both devices retained. Previously accepted events were not sent again in that run. There is still no exactly-once guarantee under overlapping invocations/crash recovery.
- This cleanup removes temporary key-format flags and retains sanitized stage/code error reporting, normal dispatch counters, strict single-line PEM restoration and connection cleanup. It has passed all 113 npm test entry points, the 23-case push suite against source and bundled code, syntax checks, build and diff checks. Verify this cleanup commit's Published deployment and a fresh error-free dispatch before reporting final rollout complete.
- `npm audit --omit=dev --audit-level=moderate` reports **zero production vulnerabilities**. This is the current registry result, not a guarantee of security.
- The Build20 source archive `Better-iPhone-Build20-Message-Push-Previews.zip` was recovered and integrity-checked. Source inspection confirms build 20/version 1.0, app bundle ID `org.betterrealestate.ios`, separate development/production push entitlements and Debug/Release token routing, a foreground banner/sound delegate, internal notification-tap routing and the bundled bark (PCM WAV, 1.22 seconds). These checks do not compile Xcode or verify the installed/signed binary. No native source was changed.
- **Next user-only acceptance:** keep the regular account signed in on the iPhone, lock the phone, send a NEW message from the web/admin account, wait through the next one-minute scheduler cycle, confirm sender/actual preview (as allowed by iOS preview settings), bark and tap into Messages. Also test foreground delivery, sign-out/account switching and TestFlight production delivery before App Review.
- App Store release gates remain: successful current physical-device build/archive, signed provisioning/entitlements, real TestFlight StoreKit purchase and restore with approved tiers, device visual/navigation/account-isolation QA, and current App Store Connect metadata/submission status. Do not call the entire app release-certified based on this backend repair.
- No new native installation is required for this backend format correction. Keep the installed working app and unsynced notes. The backend is updated through GitHub/Netlify; the Mac checkout still requires the safe pull/test commands below if local synchronization is desired. Do not commit again merely to pull this deployed fix.

### Five review passes for this repair

1. **Cause/provenance:** fresh production key-parse failure plus synthetic reproduction isolated flattened PEM framing; the same key data signs after rewrapping.
2. **Security/privacy:** strict complete-block/canonical-Base64/P-256 checks; corrupt, quoted, appended and concatenated keys fail closed; raw keys/JWTs/tokens/messages absent from failure logs; temporary format telemetry removed.
3. **Behavior/regression:** full repository suite and 23 real-crypto/mocked-transport scenarios pass, both unbundled and bundled; production dependency audit has zero findings.
4. **Scope/native separation:** reviewed intended backend/test/package/handoff diff, unchanged website/UI/assets/pricing/native source; inspected Build20 push routing/resources without claiming Xcode or visual QA.
5. **Production acceptance:** published format-fix SHA matched GitHub; Apple accepted 12 requests without failure and next scheduled run did not replay them. Final cleanup publish and physical-device display must still be verified as stated above.

## Earlier follow-up record — cause isolated; prior to live verification

This section supersedes the initial investigation status below. Andrew explicitly approved all work needed to restore notifications and prepare a stable release, including production deployment.

- Diagnostic commit `a16593121a58da99f13312d8b776b733d9e0a7a2` was fast-forwarded to main and verified Published in Netlify production, deploy `6aeb440ee4a487d6b31a8f3c`, at 9:42 AM America/New_York on November 4.
- Netlify authentication succeeded. Its production native-push-cron was directly inspected and run. At 9:42:51 AM it reported `stage:key-parse`, `ERR_OSSL_UNSUPPORTED`, header/footer true, realNewlines false, escapedNewlines false, surroundingQuotes false; sent 0, failed 2, devices 2, eligible 12. These are fresh observed results. No secret was revealed or changed.
- A generated synthetic P-256 PEM with every newline removed reproduces `ERR_OSSL_UNSUPPORTED`. Rewrapping its unchanged Base64 restores real parsing/signing. This supports the evidenced format correction without replacing the production key.
- The follow-up accepts only a complete single-line PKCS#8 PEM block whose body is canonical Base64. It restores framing with 64-character lines; invalid body characters, trailing material, concatenated keys and quoted JSON values are rejected. Existing real/escaped newlines and CRLF keep working. EC P-256 validation and signature verification remain.
- Full npm test passes (113 entry points), including 23 push scenarios. The same 23 pass against an esbuild bundle. Build, syntax and diff checks pass. Five review passes now additionally cover the observed runtime evidence, exact Base64 preservation, malformed-input rejection, both test forms, and the backend-only diff. No visual app or real APNs success is claimed yet.
- Next: deploy this follow-up, verify its Published SHA, run native-push-cron and inspect APNs delivery results. Then confirm actual iPhone alert, sender/preview, sound and notification tap with a NEW message. Remove temporary key-format telemetry after diagnosis; keep safe stage reporting. Keep the same installed app and do not uninstall unsynced notes.
- GitHub changes are deployed through the existing hosting integration. The Mac repository has not been updated by this cloud work; use the pull/test commands below after the final commit. A backend publish does not install/archive an iPhone build.

## Initial investigation record (historical)

Continue the native iPhone notification repair, then App Store release preparation. This is a backend investigation patch, not a completed notification repair or an iPhone release. Source: GitHub main `1f93339975b6aae48b3eeee709022b5dbc4f01fb`, “Add privacy-safe APNs delivery diagnostics.” The cloned checkout was clean. The proposed standalone runtime-key probe is absent from that commit.

The supplied Work Mode handoff reports Build 20 installed on the iPhone, registered devices and eligible messages, `sent:0`, and `ERR_OSSL_UNSUPPORTED` in production after replacing the configured key. It also reports that the original local Apple key parsed and signed successfully in Node. These are inherited observations, not fresh production tests here. Do not call the original key corrupt or rotate it speculatively.

GitHub main was read directly and cloned. Its existing newline normalization converts literal backslash-n to newline. That transformation is retained exactly. The failing production operation and secret representation are still unverified. Never request or print private key contents.

## Changes in this investigation patch

- Explicitly parse the existing normalized key, validate EC P-256, and sign a 64-byte ES256 signature before opening an HTTP/2 connection.
- Separate key-parse, key-validation, jwt-sign, http2-connect, http2-request and timeout failures. Log fixed stage names and sanitized error codes. Key-parse failures include only six format booleans, never PEM, JWTs, tokens, message text, addresses or raw exceptions.
- Close sessions and clear timers on synchronous request creation errors as well as asynchronous errors and timeout. The previous code opened a session before signing; signing failure rejected the Promise without immediate session cleanup.
- Preserve message previews, sound, environments, topic headers, registration, preferences, persistence and event watermarks.
- Add `tests/native-push-signing.test.cjs`, integrate it into `npm test`, and provide `npm run test:native-push`.
- Preserve all website UI/assets, Swift projects, pricing, memberships, accounts and unrelated source. No environment settings or credentials changed.

## Five local review passes and evidence

1. Source/provenance: directly inspected GitHub main and matching clean clone, cron, Live Activity module, Netlify configuration and relevant latest handoffs. The original files were backed up outside the checkout before editing.
2. Secret handling: tested malformed/quoted synthetic keys and injected error messages. Captured logs contain only stage/code/format flags, with no synthetic private values, sender/message content or device tokens. No real credential was used.
3. Signing/transport behavior: 18 scenarios pass, using generated ephemeral P-256 keys and mocked APNs. Real crypto verification checks JWT signatures; cases include real/escaped/CRLF newlines, invalid keys, wrong curve, forced signing error, connection/request exceptions and events, timeout, APNs rejection, invalid-device removal, successful watermark advancement and repeat suppression. Invalid signing opens no connection.
4. Regression/build: full `npm test` passes with 113 sequential test entry points, including the new suite. `npm run build`, syntax checks and `git diff --check` pass. The same 18 scenarios pass against an esbuild bundle targeting Node 20, run locally under Node v24.22.1. This is local bundling evidence, not a Netlify runtime test.
5. Scope/rollout: reviewed the intended diff and file list; no frontend, assets, native app, lockfile, database, upload or secret file is included. No browser UI or real iPhone test is claimed. Production delivery remains blocked on authenticated runtime access and deployment of this patch.

The first bundling command used a nonexistent root-level esbuild executable. The verified Netlify CLI dependency executable was then used successfully; its bundled tests passed.

## Required next steps

1. Authenticate to Netlify. The browser opened during this session showed its sign-in page; no live logs were accessible.
2. Deploy the reviewed patch through the existing GitHub/Netlify workflow and verify the published commit. A branch/PR is not a production deployment.
3. Inspect `[native-push] delivery error` and `[native-push] dispatch` from the published function. `key-parse` isolates decoding of the value actually configured in Netlify. Format booleans alone do not prove why a secret is wrong; do not infer a replacement value. `jwt-sign` isolates signing; other stages isolate transport. Never paste secrets into logs or chat.
4. Correct only the evidenced cause. If updating a credential value is required, the owner must provide it through the provider's secret interface; do not put it in source. Rebuild and verify the published commit.
5. Send a NEW message from the web/admin account to the regular account signed into the iPhone, with the phone locked. Confirm APNs acceptance, then actual lock-screen/banner, sender, preview, bark and notification tap. Check Focus/preview settings and signed token environment only if delivery evidence warrants it. APNs acceptance alone does not prove a visible alert.
6. Remove temporary format telemetry after diagnosis; retain safe stage/error reporting if useful. Re-run checks and verify the final deployment. App Store/TestFlight push testing and final release submission remain separate work.

## Commands after the reviewed change is merged to main

No ZIP is delivered for this investigative step. Preserve local unrelated work, especially the previously reported untracked `websiteBanner.js`; never use `git add .` or reset/overwrite local changes. Pull only when the working tree has no tracked changes; if there are any, stop and reconcile them first.

```bash
cd "$HOME/Downloads/Better-Real-Estate" || exit 1
git status --short
git diff --quiet && git diff --cached --quiet || exit 1
git pull --ff-only origin main || exit 1
npm ci && npm test && npm run build &&
node --check nativePush.cjs &&
node --check netlify/functions/native-push-cron.js &&
git diff --check
```

If applying these four reviewed files manually instead of merging the PR, first confirm the baseline matches and back up each affected file. After the checks pass, stage only this patch:

```bash
git add -- nativePush.cjs package.json tests/native-push-signing.test.cjs HANDOFF-PUSH-2026-11-04.md
git diff --cached --check && git diff --cached --stat
git commit -m "Isolate APNs signing failures and close failed sessions"
git push origin main
```

Native iPhone: this patch changes no Xcode files and cannot install or upload an app. Keep the currently installed Build 20 and existing app data while investigating the backend. A new native build is not part of this patch. Never uninstall unsynced notes. Verify actual archive/build and App Store Connect state before release; do not inherit historical build claims as fresh checks.

Every future release ZIP must contain an updated handoff with current source, changes, actual checks, deployment status, remaining blockers and complete installation/test/commit/push instructions. Keep website and iPhone changes separate and preserve approved branding, entitlements and billing decisions.
