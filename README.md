# Better Real Estate

A social feed for off-market property, with a marketplace, wallet, promotions and subscriptions.

**Launching? `GOLIVE.md` is the full sequence. Netlify specifics: `NETLIFY.md`. First users: `MARKETING.md`.**

Checkout shipping forms support browser saved-address autofill by default. Optional typed address suggestions use Google Places API (New) through the server; set `GOOGLE_MAPS_API_KEY` to enable them. The API key is never sent to the browser.

## Quick start

```
npm install
netlify link && netlify db init   # provisions Netlify DB (Neon Postgres)
npm run seed                      # sample listings + your shop items
netlify dev
```
Login `drewcbusiness1@gmail.com` / `changeme123` — change it immediately.

Runs on Netlify: static site + serverless function, Netlify DB for data, Netlify Blobs for photos, Resend for email. `npm run preflight` checks you are ready to launch.

`npm run seed:clear` removes demo listings before launch.


## CJdropshipping

This build includes a server-side CJdropshipping API 2.0 integration: admin catalog search, variant import, live freight quotes at checkout, CJ order creation, payment-link handoff, and tracking/status sync. Set only `CJ_API_KEY` in Netlify; the credential is never exposed to the browser. Full setup: `CJ-DROPSHIPPING.md`.

## What's new in this build

- **Email verification** on signup, with resend. Unverified accounts can't post listings.
- **Password reset** by emailed token, single-use, one-hour expiry. Unknown addresses get the same response as known ones so the endpoint can't be used to discover who has an account.
- **Transactional email** via `mailer.js` — real SMTP when configured, prints to console otherwise so you can develop without a mail account.
- **Footer pages**: About, FAQ, Terms, Privacy, Contact (→ drewcbusiness1@gmail.com).
- **Seed script** with eight sample listings and ten real shop items.

---

## Run it

```
npm install
npm start
```
Open **http://localhost:3000**. Data in `db.json`, photos in `public/uploads/`.

---

## The monetization model

### Why the paywall gates *detail*, not *browsing*

Two options were on the table: cap how many houses someone can see, or let
them see unlimited houses but charge to open one. **Gating detail is the
better model**, for three reasons:

1. **A view cap kills the habit before it forms.** The feed is only
   valuable if people open it daily. Hitting a wall at house #20 teaches
   them to stop opening the app. Infinite scroll teaches the opposite.
2. **The paywall should land at peak intent.** Someone who scrolled past
   200 houses and stopped on *this one* has already decided they want it.
   That is the moment with the highest willingness to pay — not an
   arbitrary counter.
3. **Browsing is your growth engine.** Free scrollers generate saves,
   which is the social-proof signal that ranks listings, which is what
   makes sellers pay to promote. Capping views starves the thing sellers
   are actually buying.

So: unlimited feed, always. Price, photos, beds/baths, ARV, spread, city
— all free. **Hidden until unlock: exact address, seller notes, phone,
email, and the ability to make an offer.**

New accounts get a **7-day full-access trial** (no card), then **5 free
unlocks**. The trial builds the habit; the free unlocks let them feel the
value before the wall.

### Price ladder

| What | Price | Why |
|---|---|---|
| Single unlock | $1.99 | Low-friction impulse buy |
| 10-unlock pack | $14.99 | $1.49 each — makes Pro look reasonable |
| **Better Pro** | **$29/mo** | Unlimited unlocks + analytics. Pays for itself at 15 unlocks |
| Boost 24h / 3d / 7d | $9 / $19 / $39 | Tinder-style timed push |
| Super Boost (1 hr top slot) | $15 | Urgency buy — highest weight in the algorithm |
| Spotlight badge (7d) | $12 | Cosmetic, high margin |
| Bump to fresh | $3 | Cheapest possible "do something" button |
| Seller verification | $25 one-time | Trust + ranking boost |
| Marketplace fee | 7% of sale | Scales with GMV, zero marginal cost |
| Referral | $10 each side | Paid on referee's *first purchase*, not signup |

Every number lives in the `PRICING` object at the top of `server.js`.
Change it there and the whole app follows.

### Why this mix works
- **Sellers** pay for reach (promotions) — recurring, because every new listing needs it again.
- **Buyers** pay for access (unlocks/Pro) — recurring, because they look at many houses.
- **Everyone** pays the 7% shop fee — and rehabbers buy appliances constantly.

Three independent revenue lines means no single one has to carry the business.

---

## The 10 features added beyond the basics

1. **Deal calculator** on every listing — ARV, rehab, the 70% rule max offer, closing/holding estimate, projected profit and ROI. Runs in the browser.
2. **Formal offer flow** — submit amount, terms, days to close. Sellers accept/decline. Tracked separately from chat.
3. **Seller analytics** — views, unique viewers, saves, unlocks, offers, save rate, and total promotion spend per listing. This is what makes promotions re-purchasable: sellers can see what they bought.
4. **Verified seller badges** — paid, admin-approved, and worth +80 in the ranking algorithm.
5. **Ratings & reviews** — only unlockable after an *accepted offer* between the two parties, so reviews can't be farmed.
6. **Referral program** — unique code per user, credit pays out on first purchase (not signup) so it can't be farmed with throwaway accounts.
7. **Wallet + ledger** — every credit and debit is an immutable ledger row; balance is computed by summing them, never stored as a mutable number. This is how real financial systems avoid drift.
8. **Payouts** — connect an account, withdraw above a $20 minimum.
9. **Marketplace** — 12 categories of rehab supplies, condition grades, stock counts, search and category filters, automatic fee split on sale.
10. **Admin revenue dashboard** — promotions, shop fees, unlocks and subscriptions broken out with a running total.

Plus: video walkthrough field, spotlight badges, follower feed weighting, and rehab-cost field feeding the calculator.

---

## Payments: what's real and what isn't

**Real:** the wallet, the double-entry ledger, balance computation, the 7%
fee split, promotion timing and weights, the paywall gating, subscription
expiry, payout minimums.

**Not real:** the connection to a payment processor. Charges either draw
down wallet balance or record a simulated card charge.

**Card security — read this before you change anything.** The app never
receives a full card number. The browser derives the brand and last four
digits and sends only those plus a placeholder token. The server actively
rejects anything that looks like a raw card number. Keep it that way:
handling full card numbers yourself puts you in PCI-DSS scope, which means
annual audits, and a leaked `db.json` full of card numbers is a
business-ending event. Stripe exists so you never touch them.

### Wiring up Stripe
Every integration point is marked `TODO(stripe)` in `server.js`:

1. **Collecting cards** — replace the card form with Stripe Elements. It returns a `pm_xxx` payment method ID; store that instead of the placeholder token.
2. **Charging** — in `charge()`, create a PaymentIntent against the stored payment method.
3. **Crediting** — never credit the ledger from the browser's response. Credit it in your Stripe **webhook** handler on `payment_intent.succeeded`. Otherwise anyone can call your endpoint directly and boost for free.
4. **Payouts** — use Stripe Connect. Sellers onboard through Stripe's hosted flow; you never collect bank numbers.
5. **Subscriptions** — use Stripe Billing for `Pro` so renewals, dunning and cancellation are handled for you.

---

## Before launch

- **Admin signup is open.** Remove `'admin'` from the allowed roles in `/api/signup`.
- **Change the session secret** — set `SESSION_SECRET` in the environment.
- **`db.json` is a flat file.** Move to Postgres before real traffic. Concurrent writes will corrupt it.
- **Photos are on local disk.** Move to S3/R2 before deploying anywhere ephemeral.
- **HTTPS is mandatory** once this is public — sessions and payment tokens must never cross plain HTTP.
- **You'll need terms of service and a privacy policy** before collecting payments and personal data, and taking a cut of marketplace sales may make you a payment facilitator in some jurisdictions. Worth 30 minutes with a lawyer before you flip on real payments.
- **Seller-posted addresses are personal data.** Decide what's public pre-unlock (currently: city only) and document it.

## Shop listing management

Signed-in marketplace sellers can open **Shop → My shop listings** (or Profile → My shop listings) to edit their own items after publishing. They can update title, category, condition, price, quantity, location, description, photos, publish/unpublish, or remove a listing. Photo order can be changed from the edit screen.

Admins see **Manage shop listings** and can manage every marketplace item. Admin dropship/CJ rows additionally show private supplier cost and product spread; those internal values are not returned by the public marketplace API. Deleted items are soft-deleted so completed order and payout history keeps a stable item reference.

## v11: AI listing assistant + opt-in engagement email

Two optional systems are included and stay disabled until their server-side keys/settings are present.

**AI listing assistant**
- Set `OPENAI_API_KEY` in Netlify. `OPENAI_MODEL` defaults to `gpt-5.6-luna`.
- Admin CJ reviews automatically request a cleaned title/description when AI is configured. Supplier identifiers are explicitly excluded from the prompt/output rules.
- Platinum users get AI drafting on Shop listings, Shop edits, and property-post notes. The server re-checks Platinum/admin access and applies a daily request cap.
- Up to three listing photos can be sent for context. AI drafts are never automatically published for regular users.

**Engagement email**
- Marketing consent is opt-in at signup and can be changed in Settings at any time.
- The Netlify scheduled function `marketing-cron` runs daily and only emails a user if at least 48 hours have passed since the last marketing message.
- Set `MARKETING_EMAILS_ENABLED=true` and `MARKETING_POSTAL_ADDRESS` before enabling sends. The postal address is included in every marketing footer.
- Every marketing message has unsubscribe and email-preferences links. Transactional email remains separate.
