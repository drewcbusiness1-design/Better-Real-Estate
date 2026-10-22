# Better Real Estate v29.72

Includes the full v29.71 baseline. This package has not been deployed and has not changed live accounts.

## Campaign proof and approval

Linked, email-confirmed Affiliate-only partners can attach PDF, PNG, JPG or WebP proof to each referred member (2 MB per file, five files per referral), or submit written qualification evidence. Files are private, authenticated downloads restricted to the linked partner and allowlisted admins. They are not served from public/uploads. Stored filenames and signatures are checked; downloads force attachment with no-sniff and no-store headers. File bytes use Netlify Blobs, Postgres fallback or the private/campaign-proofs local development directory.

Uploads never approve a referral or add qualified earnings. Admin → Acquisition campaigns → Review referred members shows submitted proof and written evidence. Each referral still requires explicit admin review, the existing automated qualification gates, and the two manual real estate/activity confirmations. The $1 amount and qualified totals use approved referrals only. A stale review is rejected if proof changed while the admin was reviewing it. Approved referrals must be reopened before editing proof; rejected referrals return to pending when resubmitted. Partner counts distinguish awaiting proof, pending review, approved and rejected. The conversion chart continues to distinguish total attributed signups from unique recorded paid purchasers.

## Search and campaign lifecycle

Campaign partner linking searches all site members by name, username or email, with paginated results and eligibility hints. Select an eligible confirmed Affiliate-only member and explicitly link the selected ID. Server authorization and account eligibility remain authoritative. No default person is preselected.

Archive retains records and allows restoration. Delete appears alongside the campaign lifecycle controls, including archived campaigns, and requires typing the exact campaign name. Deletion irreversibly removes the link, partner assignment, proof references, qualification results, sales and external-payment records from the campaign. Existing member accounts and actual Fiverr/Upwork payments are unaffected. Proof file cleanup is attempted after deletion; cleanup failures are logged and any remaining bytes are inaccessible through the deleted campaign. Only a minimal deletion marker remains to prevent stale concurrent requests from reviving the campaign. Historical member attribution IDs are retained on their accounts, so existing accounts cannot be reassigned as new referrals. Download the CSV report before deleting if needed. Billing events after deletion safely skip campaign tracking.

All freelancer money continues through Fiverr/Upwork; no campaign amount enters the standard affiliate wallet, leaderboard or bonus program.

## Verified Founding Members

Unconfirmed accounts cannot receive or retain Founding Member recognition or the complimentary founder Platinum benefit. On the first authenticated request after deployment, reconciliation cleans all existing unconfirmed accounts, retires their active founder awards and returns automatic program spots to eligible confirmed accounts. Original award dates remain for audit and prevent a repeated bonus. Paid memberships, independent admin grants and other access sources remain intact. Public profile badges also suppress unconfirmed founding status.

Successful email confirmation immediately checks the available first-50 program slots. Existing claimed slots are preserved; late verification cannot displace a confirmed founder. New claims use verification date; legacy confirmed accounts without that date fall back to signup date. Signup and confirmation prompts explain that verification is required to claim an available spot and registration does not reserve one. Admin cannot grant founding recognition to an unconfirmed account.

## Validation and rollout

Run the full npm test suite, npm run build, syntax checks and git diff --check using INSTALL-v29.72.md. New behavioral coverage exercises private image/PDF proof access, malformed/oversized uploads, no automatic approval, stale review rejection, resubmission, searched ID linking, deletion authorization/confirmation, billing after deletion, founder cleanup/entitlement preservation/cap/no displacement, and actual signup→email confirmation→founder assignment. UI handler checks cover upload, member selection and delete cancellation/confirmation.

No visual browser review, live database/Blobs verification, real email delivery or deployment was performed in this workspace. Local API tests stub private proof persistence; production storage must be checked after deployment with a real attachment and both authorized/unauthorized accounts. Refresh the browser and open Admin once to run the founder cleanup. Use a confirmed Affiliate-only partner to check attachment submission and an admin to verify download/approval.

Tutorial version: 90. Package version: 2.9.72. No new dependency or environment variable.
