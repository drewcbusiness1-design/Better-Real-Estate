# v29.55 — Optional credits and focused onboarding

Includes the full v29.54 baseline. No separate earlier release installation required.

- Optional Better Credits with a custom amount and checkout total review. First payment only; renewals unchanged.
- 10-step main tutorial, with the preserved full walkthrough available from the tour, dog menu and Settings.
- Better Guide’s exact AI introduction once per saved conversation.

Existing environment variables and dependencies remain; no new key or service required. Real credit redemption requires configured Stripe. Existing paid memberships, balances, affiliate terms and exact assets are retained. No production deployment or live provider call performed.

## Installation gate

Extract the ZIP so this folder exists:
`~/Downloads/Better Real Estate/Better-Real-Estate-v29.55-Credits-Onboarding/`

```bash
cd ~/Downloads
rsync -av \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='node_modules' \
  --exclude='db.local.json' \
  "Better Real Estate/Better-Real-Estate-v29.55-Credits-Onboarding/" \
  Better-Real-Estate/
cd Better-Real-Estate
npm ci
npm test
node --check server.js
node --check public/app.js
node --check store.js
node --check payments.js
node --check membershipCredits.js
node --check supportChat.js
git diff --check
git status --short
```

Review actual Git status for unrelated edits before staging/pushing. No force push. Once that gate passes, commit message: `v29.55 optional credits and focused onboarding`. Netlify deploys on the normal main push; wait for successful deployment and hard-refresh.

## Post-deployment review

Review a membership with credits off, partial credit, full credit, cancel/resume and selected amount. Confirm actual Stripe first invoice/credit ledger and regular renewal price, including verified session expiration events. Replay the 10-step tutorial and full walkthrough; check new and reopened support chat. Do not infer live payment/AI delivery from local stubs.

## Completed local validation

Full npm regression suite; changed JavaScript syntax and diff whitespace; actual PostgreSQL CAS/debit/receipt/stale-save checks; real Express/Chromium credit checkout and settlement workflows; three account-type 10-step tours and full walkthrough; support introduction/failure/reopen; inherited support, Command Center, markets and homepage regression. Changed layouts at 1280/390/320 in light/dark were inspected. Provider requests were stubbed, with no actual Stripe, OpenAI, email or Meta spending/delivery. Exact brand assets and protected analysis/affiliate policy modules remain byte-identical. ZIP integrity and local-data/dependency exclusions checked.
