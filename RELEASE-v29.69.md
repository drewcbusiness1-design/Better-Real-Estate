# v29.69 — Complete User Inspector inventory

Full replacement source based on v29.68. Not deployed.

- User Inspector defaults to All accounts and includes every retained user account regardless of affiliate status, service role, paid/free status, demo flag, email confirmation or admin role. It does not reconstruct permanently deleted accounts.
- Replaced the server's newest-40 cutoff and UI's newest-20 cutoff with a 25-account paginated view. Server page size is bounded at 100; account count, matching count and page metadata are returned. Newest-first order has an ID tie-breaker and invalid-date fallback. Name, username, email, phone and account ID are searchable.
- Optional filters: All accounts, Affiliate accounts, Service providers, Regular members (non-affiliate/non-admin/non-demo), Admins, Demo accounts and Unconfirmed email. Search/filter changes reset to page one, stale requests are ignored and out-of-range pages clamp to the last valid page. Empty/error/retry states remain.
- Demo preview selection requests the demo-only inventory and traverses all pages, instead of filtering only the first general-user page.
- User Inspector profile details now distinguish affiliate account type from the current recorded affiliate application status: Not submitted, Pending, Approved and other recorded statuses. Choosing Marketing / Affiliate only at signup does not submit the separate Affiliate Center application. No auto-application or auto-approval is added. No live Elsa account was inspected; this release provides a direct way to diagnose its state.
- Commission calculator fields share aligned label/control rows and control heights; wrapped New paying customers label no longer changes the input alignment. Narrow layout remains stacked.
- Tutorial release 87 explains all-account search and pagination. Prior grants/profile contact/history/admin/land/service/startup updates retained.

## Validation and limits
Full npm test suite, build and server/app/shared-UI syntax checks passed. New integration fixtures exceed the previous 40-account cutoff and verify that traversing pages returns every retained ID exactly once, with affiliates/providers/admins/demos/unconfirmed accounts included, newest-first order, filtered/search inventory, page-size bounds, empty results and admin-only access. Executed DOM tests cover 25 displayed rows, counts, Previous/Next through the final page, affiliate filtering and search reset. A real local signup/apply flow confirms the distinction between affiliate signup, Not submitted inspector status and a submitted Pending application appearing in admin requests. No real customer account was used.

Browser visual QA remains pending because Chromium is unavailable in this runtime. The supplied screenshot was inspected to identify the label-wrapping cause, but no new screenshot review is claimed. Check calculator alignment on desktop and phone in light/dark; inspect list counts, filters, paging and older demo selection. Local tests use fixtures and no live mail, research credits, payments, account changes or deployments.

No providers, dependencies, prices, environment variables or migrations added. Existing exact logo/mascot assets retained. Always provide both install/test and commit/push commands with this update.
