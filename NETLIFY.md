# Going live on Netlify

Follow these in order. Most of it is copy-paste.

---

## What changed for Netlify

Netlify doesn't run an always-on server — it serves static files plus serverless functions, and **functions get a fresh filesystem on every invocation**. So the old flat-file setup couldn't survive there. Three things were rebuilt:

| Was | Now | Why |
|---|---|---|
| `db.json` on disk | **Netlify DB** (Neon Postgres) | A file written by a function vanishes on the next request |
| Photos in `public/uploads/` | **Netlify Blobs**, served via `/api/img/:key` | Same reason — plus Blobs sits behind Netlify's image CDN |
| Gmail SMTP | **Resend HTTP API** | Lambdas are slow to open SMTP connections and providers throttle them; HTTP gives you a real status code from a cold start |
| `app.listen()` | `netlify/functions/api.js` via `serverless-http` | Express still handles all routing; the wrapper adapts it |

`npm start` still runs a normal local server against any Postgres, so nothing about local development got worse.

---

## 1. Local first

```bash
npm install
netlify login
netlify link            # or `netlify init` for a new site
netlify db init         # provisions Netlify DB, sets NETLIFY_DATABASE_URL
npm run seed
netlify dev
```

`netlify dev` runs the functions and static site together the same way production does. Visit the local URL it prints.

Your login: `drewcbusiness1@gmail.com` / `changeme123` — **change this immediately**.

> Prefer plain `node server.js`? Set `DATABASE_URL` to any Postgres connection string. The store auto-detects which driver to use.

---

## 2. Environment variables

Netlify → **Site configuration → Environment variables**. Set for all deploy contexts:

```
SESSION_SECRET      = <run: openssl rand -base64 32>
APP_URL             = https://betterrealestate.org
RESEND_API_KEY      = re_xxxxxxxxxxxx
MAIL_FROM           = Better Real Estate <noreply@betterrealestate.org>
MAIL_REPLY_TO       = drewcbusiness1@gmail.com
CJ_API_KEY          = <CJdropshipping API key>
GOOGLE_MAPS_API_KEY = <Google Places API (New) key — optional>
```

`NETLIFY_DATABASE_URL` is injected automatically by `netlify db init` — don't set it by hand.

**On `SESSION_SECRET`:** without it, sessions are signed with the public default in the source, which means anyone who reads this repo can forge a login cookie as any user, including admin. `npm run preflight` fails the build if it's missing.

---

## 3. Real email

1. Sign up at **resend.com** (free tier: 3,000 emails/month — far more than confirmations and resets need).
2. Add your domain and paste the DNS records it gives you at your registrar. Wait for verification.
3. Create an API key → set `RESEND_API_KEY`.

**You cannot send "from" a gmail.com address.** Gmail publishes a DMARC policy that tells receiving servers to reject mail claiming to be from gmail.com that didn't originate at Google. Every provider will bounce it. Send from `noreply@betterrealestate.org` and set `MAIL_REPLY_TO` to your Gmail so replies still reach you.

Test it: sign up with a real address on the deployed site and confirm the email arrives. Then do a password reset. Both paths must work before launch — a locked-out user with no working reset email is a user you lose permanently.

---

## 4. Domain

Buy at Cloudflare or Namecheap (~$10/yr), then Netlify → **Domain management → Add a domain**. Netlify issues the TLS certificate automatically.

Add the Resend DNS records to the same domain while you're in there.

---

## 5. Stripe

Search `TODO(stripe)` in `server.js` — five places.

1. Replace the card form with **Stripe Elements** (you get a `pm_xxx` ID instead of the placeholder token).
2. In `charge()`, create a PaymentIntent.
3. **Credit the ledger in your Stripe webhook** on `payment_intent.succeeded`, never from the browser's response. Skip this and anyone can POST to `/api/promotions/buy` directly and boost for free. Add the webhook as another Netlify function.
4. **Stripe Connect** for seller payouts — sellers onboard through Stripe's hosted flow so you never handle bank details.
5. **Stripe Billing** for Pro, so renewals and cancellations are handled for you.

Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`. Preflight fails if you set the first without the second.

---

## 6. Dropshipping

**CJdropshipping API 2.0 is integrated.** Add `CJ_API_KEY`, redeploy, then use Profile → Admin — suppliers → CJdropshipping → Import catalog. See `CJ-DROPSHIPPING.md` for the exact flow.

**Address autocomplete is optional.** Browser saved-address autofill works without any extra service. For typed address suggestions, enable **Places API (New)** in Google Cloud, create an API key restricted to that API, and set `GOOGLE_MAPS_API_KEY` in Netlify before deploying. The key stays server-side; the checkout displays the required Google Maps attribution with suggestions.

The supplier system is built and tested. Flow: register a supplier → import their catalog with a markup → items appear in the shop flagged as dropship → a purchase creates a row in your fulfilment queue with the customer's address and your cost → you place the order and paste the tracking number back.

### Sell these
Lighting, fixtures, cabinet and door hardware, smart home (thermostats, locks, sensors), faucets, bath accessories, switch plates, LED strip, solar/exterior lighting. Light, boxable, flat parcel shipping, 40-70% margins. The tested import priced a $22.50 landed-cost pendant light at $36.99 — $14.49 profit on one small box.

### Don't dropship these
Appliances, large furniture, vanities, tubs, flooring in quantity. They ship freight, and **one freight return on a dishwasher wipes out the profit from twenty fixture sales**. You already hold real furniture and appliance stock — sell those as your own inventory, where you control the margin and there's no freight surprise.

### Before you list anything electrical
Get **UL or ETL certification documents in writing** from the supplier and keep them. Selling uncertified electrical goods in the US is not legal, and if an uncertified fixture causes a fire, "my supplier said it was fine" is not a defense. The same applies to anything gas-fired, anything touching drinking water (NSF/ANSI 61 and lead-free compliance under the Safe Drinking Water Act), and smoke/CO alarms.

### Suppliers worth opening accounts with
- **CJdropshipping** — no monthly fee, some US warehouses. Best starting point for small fixtures and smart home.
- **DropCommerce** — North American suppliers, 2-7 day shipping. Costs more, generates far fewer delivery complaints.
- **Syncee** — verified supplier marketplace with location filters for finding US-stocked goods.
- **A local plumbing/electrical supply house** — often beats all of the above on price and lead time if you open a trade account. You'll need your EIN and a resale certificate.

You need a **business entity and a resale certificate** before most real suppliers will open an account, and the resale certificate is what lets you buy without paying sales tax on inventory. Worth doing first.

---

## 7. Before you flip it on

```bash
npm run preflight
```

It checks the database connection, session secret, email config, Stripe webhook pairing, `APP_URL`, and whether admin signup is still open. It exits non-zero on anything blocking.

Then, by hand:

- [ ] `npm run seed:clear` — removes every sample listing
- [ ] Changed the password on your account
- [ ] Close admin signup: remove `'admin'` from the allowed roles in `/api/signup`
- [ ] Posted 10+ real listings so the feed isn't empty
- [ ] Signup email and password reset both tested on the live domain
- [ ] Terms and Privacy reviewed by a lawyer — specifically ask about taking a cut of marketplace sales and holding user wallet balances, which can trigger money-transmitter rules
- [ ] Business entity formed (an LLC between you and platform liability is worth a few hundred dollars)
- [ ] `/api/health` returns `ok: true` on the live URL

---

## Scaling notes

`loadDB()` reads all rows per request. That's fine into the low thousands and is a huge improvement over a rewritten JSON file, but it's not the end state. When the feed slows down, convert the hot paths (`GET /api/feed`, `GET /api/shop/items`) to targeted SQL. The tables are ordinary Postgres with JSONB columns and indexes already on email, owner, token and listing lookups — you can query them directly without migrating anything.

## v11 optional environment variables

```text
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5.6-luna
MARKETING_EMAILS_ENABLED=true
MARKETING_POSTAL_ADDRESS=Your valid business mailing address
```

`marketing-cron` is configured in `netlify.toml` for `0 15 * * *` UTC. It runs daily but the application enforces a minimum 48-hour gap per opted-in user. Scheduled Functions only run automatically on published deploys.

## Admin unlimited access

Any account whose email is present in `ADMIN_EMAILS` is treated as a permanent admin super-account. Admin access does not expire and does not require Pro or Platinum billing. Admins receive all Pro/Platinum feature gates, unlimited AI listing assistance, unlimited buy boxes, unlimited included listing promotions, and unlimited listing unlock access. This bypass is enforced on the server and remains active as long as the email stays in `ADMIN_EMAILS`. Normal marketplace purchases and other real-world transaction charges are not made free by admin status.
