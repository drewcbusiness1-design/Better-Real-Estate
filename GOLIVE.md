# Go live — the whole sequence

Work top to bottom. Nothing here is optional except step 8.

---

## 0. Run it locally first (20 min)

```bash
npm install
netlify login
netlify link              # or `netlify init` for a new site
netlify db init           # provisions Netlify DB, sets NETLIFY_DATABASE_URL
npm run seed
netlify dev
```

Login: `drewcbusiness1@gmail.com` / `changeme123`. **Change it in Settings now.**

---

## 1. Admin access — only you (5 min)

Admin is no longer a role anyone can pick. It's granted by an **email allowlist** in an environment variable, and it's enforced three ways:

1. `admin` isn't an option at signup — the API rejects it outright.
2. The role is re-derived from the allowlist **on every login**. If someone edits the database directly and sets their role to `admin`, the next login overwrites it back.
3. Every admin endpoint checks the stored role **and** the allowlist, so a tampered row alone gets nothing.

I tested exactly that attack: forced `role: "admin"` into the database with raw SQL, logged in, and the account came back as `buyer` with the admin endpoints still returning `Admin only`.

In Netlify → Site configuration → Environment variables:

```
ADMIN_EMAILS = drewcbusiness1@gmail.com
```

Comma-separate if you ever add someone. To revoke, remove the address — it takes effect on their next request. Keep this list as short as it can be.

---

## 2. Email — and why you can't send from Gmail (30 min)

### The DMARC thing, explained

When your server sends email, it writes two separate "from" values:

- The **envelope sender** — who the mail server says it is (your sending service).
- The **From: header** — what the recipient actually sees in their inbox.

Nothing stops a server from putting anything in the From: header. That's how phishing works — a scammer's server sends mail that *displays* as `security@yourbank.com`.

So Gmail publishes a rule at `gmail.com` called a **DMARC policy**. In plain terms it says: *"Mail claiming to be from a gmail.com address is only legitimate if it came from Google's servers. If it didn't, reject it."*

Gmail's policy is set to `p=reject` — the strictest setting.

Now picture the flow if you set `MAIL_FROM` to your Gmail:

1. Resend's server sends your signup confirmation.
2. The From: header says `drewcbusiness1@gmail.com`.
3. The receiving mail server looks up gmail.com's DMARC policy.
4. It sees the mail came from Resend, not Google.
5. Policy says reject. **The email is thrown away** — often silently, without a bounce.

Your user never gets their confirmation link. They can't verify. They email you asking why the site is broken.

This isn't a Resend limitation — it's every provider, because the rule lives at gmail.com, not at the sender. Same for Yahoo, Outlook and Hotmail addresses.

### The fix

Send from a domain **you** control, and set your Gmail as the reply-to:

```
MAIL_FROM     = Better Real Estate <noreply@betterrealestate.com>
MAIL_REPLY_TO = drewcbusiness1@gmail.com
```

Now the From: header says `betterrealestate.com`, you publish the DNS records proving Resend is authorised to send for that domain, DMARC passes, and it lands. When someone hits reply, it still goes to your Gmail inbox. You get the deliverability of a real domain and keep reading mail where you already read it.

### Setup

1. Sign up at **resend.com** (free tier: 3,000/month — well past what confirmations and resets need).
2. Add your domain. Resend gives you three DNS records:
   - **SPF** — lists which servers may send for your domain.
   - **DKIM** — a cryptographic signature proving mail wasn't altered in transit.
   - **DMARC** — tells receivers what to do when SPF or DKIM fail.
3. Paste them at your registrar. Wait for Resend to show "verified" (usually minutes, up to 48 hours).
4. Create an API key → set `RESEND_API_KEY` in Netlify.

**Test both paths on the live domain before launch:** sign up with a real address and confirm the email arrives, then run a password reset. A user locked out with no working reset email is a user you lose permanently.

---

## 3. Domain (15 min)

Buy at Cloudflare or Namecheap (~$10/yr). Netlify → Domain management → Add a domain. TLS certificate is automatic. Add the Resend DNS records to the same domain.

---

## 4. Stripe (2-3 hours)

The integration is written. `payments.js` handles PaymentIntents, saved cards, Connect payouts, Billing subscriptions and webhook verification.

1. Create a Stripe account. Get `sk_live_...` and `pk_live_...`.
2. Add the webhook endpoint in the Stripe dashboard: `https://yourdomain.com/api/payments/webhook`. Subscribe to `payment_intent.succeeded`, `checkout.session.completed`, `invoice.payment_succeeded`, `customer.subscription.deleted`, `charge.dispute.created`. Copy the signing secret.
3. Set `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`.
4. Swap the card form in `renderWallet()` for Stripe Elements using the publishable key from `/api/payments/config`.

**The rule that matters most:** money is only ever credited in the webhook, after Stripe's signature is verified. The browser *asks* for a payment; Stripe *confirms* it; the webhook *grants* it. If you credit a wallet or activate a boost because the browser said "success", anyone can call that endpoint with curl and get everything for free.

The webhook is also **idempotent** — Stripe retries delivery, and the handler checks whether a payment intent has already been applied before crediting anything. Without that, a retry would credit someone twice.

I tested the webhook rejects unsigned requests: posting a fake `payment_intent.succeeded` with a $9,999 top-up returns `Invalid signature` and credits nothing.

---

## 5. Electronics ban

**Users cannot sell anything electrical.** Enforced server-side, not just hidden in the UI:

- The `Appliances`, `Electrical` and `HVAC` categories are unavailable to users.
- A keyword scan catches electrical items posted under other categories.
- The rule is in the Terms (§3a) and the FAQ, and shown on the sell form.

Tested: refrigerators, light fixtures, drills, TVs and anything in a banned category are rejected with an explanation. Furniture, sinks, doors, flooring, countertops and switch plates pass. "Six panel door" and "raised panel cabinet" pass; "electrical panel" is blocked.

**Only you can sell electrical goods**, through the admin dropship pipeline, because that's where certification gets collected. Before importing anything electrical, get **UL or ETL certification documents from the supplier in writing** and keep them. Selling uncertified electrical goods in the US isn't legal, and if one causes a fire, "my supplier said it was fine" is not a defense.

---

## 6. Dropshipping (admin only)

For CJdropshipping, set `CJ_API_KEY` in Netlify and redeploy. Then Profile → Admin — suppliers → add/select CJdropshipping → Import catalog. The CJ browser searches products/variants directly, imports the real IDs, quotes freight live at buyer checkout, and creates the CJ supplier order from the fulfilment queue. See `CJ-DROPSHIPPING.md`.

For other suppliers, Profile → Admin — suppliers. Register a supplier, paste a JSON catalog, markup and categories are applied automatically. Sales land in Profile → Admin — fulfilment queue with the customer's address, your cost and your profit. Place the order with the supplier, paste tracking back in.

Tested: a $22.50 landed-cost pendant priced to $36.99 at 65% markup, auto-categorized as Lighting, with $14.49 profit tracked on sale.

**Sell:** lighting, fixtures, cabinet and door hardware, smart home, faucets, bath accessories, switch plates, solar/exterior lighting. Light, boxable, parcel-shipped, 40-70% margins.

**Don't:** appliances, large furniture, vanities, tubs, bulk flooring. They ship freight, and one freight return on a dishwasher wipes out the profit from twenty fixture sales.

You'll need a **business entity and a resale certificate** before most real suppliers open an account.

---

## 7. Preflight

```bash
npm run preflight
```

Checks the database, session secret, email config, Stripe webhook pairing, `APP_URL`, admin allowlist and marketplace policy. Exits non-zero on anything blocking.

Then by hand:

- [ ] `npm run seed:clear` — removes every sample listing
- [ ] Changed your password
- [ ] `SESSION_SECRET` set (`openssl rand -base64 32`)
- [ ] Signup email and password reset tested **on the live domain**
- [ ] Posted 10+ real listings so the feed isn't empty
- [ ] `/api/health` returns `ok: true`, `db: connected`, `mail: configured`, `payments: live`
- [ ] Terms and Privacy reviewed by a lawyer
- [ ] Business entity formed

---

## 8. What still needs a human

**A lawyer, before you take real money.** Two specific questions: (1) does anything you're doing require a real estate license in the states you operate in — marketing property you don't own or have under contract is where wholesalers get in trouble, and several states have tightened this recently; (2) does taking a cut of marketplace sales and holding user wallet balances make you a payment facilitator or money transmitter. Stripe Connect is designed to keep you out of that category, which is why the code uses it.

**An accountant**, once revenue starts. Sales tax on marketplace sales varies by state and several have marketplace-facilitator laws that put the collection duty on the platform, not the seller.

**An LLC.** A few hundred dollars between you and platform liability.

---

## Scaling note

`loadDB()` reads all rows per request. Fine into the low thousands. When the feed slows, convert `GET /api/feed` and `GET /api/shop/items` to targeted SQL — the tables are ordinary Postgres with JSONB columns and indexes already on email, owner, token and listing lookups, so nothing needs migrating.
