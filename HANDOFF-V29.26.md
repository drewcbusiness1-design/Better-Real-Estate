# Better Real Estate v29.26 Handoff

Baseline: v29.25 Performance + Notifications + Stability.

## Added in v29.26
- Public/contact-facing email is `partners@betterrealestate.org`; personal Gmail is no longer exposed in the public runtime/contact/legal surfaces.
- Admin Email Center has a Sender selector for `notifications@betterrealestate.org` (default) or `partners@betterrealestate.org` on manual broadcasts and broadcast tests.
- Automated/system mail remains on the notifications sender.
- `partners@` mail replies to `partners@betterrealestate.org`.
- Transactional and marketing email shells display the exact canonical Better Real Estate logo. The shipped `BRE- Logo.png` and `public/bre-email-logo.png` are byte-identical copies of the user-supplied canonical asset; never recreate or AI-generate this logo.
- No database migration and no new dependency.

## Production email configuration
- `RESEND_API_KEY`: existing production Resend key.
- `APP_URL=https://betterrealestate.org`.
- Optional: `MAIL_NOTIFICATIONS_FROM=Better Real Estate <notifications@betterrealestate.org>`. The code defaults to this exact sender.
- Optional: `MAIL_PARTNERS_FROM=Better Real Estate <partners@betterrealestate.org>`. The code defaults to this exact sender.
- `MAIL_REPLY_TO=partners@betterrealestate.org` is recommended.
- Both senders use the already-verified `betterrealestate.org` Resend domain.

## QA
- Full historical `npm test` suite plus v29.26 regression passes.
- `node --check`: server.js, public/app.js, mailer.js, communications.js pass.
- Canonical logo byte-identity checked with `cmp`.
- Public runtime audited for personal Gmail exposure.
