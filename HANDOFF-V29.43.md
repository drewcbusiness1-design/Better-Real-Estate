# Release hold - October 9, 2026

User explicitly deferred All time in Admin User Activity until the next requested update. Do not install, push, deploy or present the standalone v29.43 candidate as the current deployed baseline. Preserve the completed implementation and tests for integration into the next authorized bundle. v29.42 remains the release baseline; v29.43 is saved, tested, undeployed work. No additional build is authorized by this deferral.

---
# Current release v29.43 - All-time Admin User Activity

Read this FULL master handoff before every action and reply.
Latest candidate: Better-Real-Estate-v29.43-All-Time-Activity; package2.9.43; tutorial64. Not deployed by assistant.
Adds All time to Admin > User activity, preset=all, all valid available timestamps through now. Demo exclusion and requireAuth/requireAdmin remain. Missing/invalid timestamps do not fabricate activity. Unique active uses retained events plus each current real user's lastActiveAt, so never-active signups are excluded. Deleted users are not reconstructed. Older events may be pruned under existing retention; history note explains this. Returning retains existing pre-window definition and is zero for all-time epoch window.
No new polling, provider, model, runtime dependency, retention change or database schema. Preserve v29.40 ARV, First50, sitemap and branding.
Three gates: pre-build reviewed scope/baseline/retention/truth/tutorial; integration checked date filtering, auth, demo exclusion, missing timestamps and all metrics; pre-package full regressions, targeted route execution test, syntax, changed-line whitespace, responsive browser activity fragment with real CSS at1280/390/320 in both themes, ZIP integrity and protected file byte comparisons.
RELEASE-v29.43.md has Mac install/test/commit/push. Extract into ~/Downloads/Better Real Estate/; sync livegit ~/Downloads/Better-Real-Estate. Commit v29.43 all-time admin user activity.

Inherited permanent rules below remain authoritative; this section defines current version.

---
