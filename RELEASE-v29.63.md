# v29.63 — Service Provider Workspace

Full update from v29.62. Package 2.9.63; tutorial release 82. Not deployed.

- Signup includes Offer property services and a primary service category, including Landscaping. New providers start in their service workspace; profiles remain unpublished until saved with business name, category and service areas.
- Existing regular members can open Settings → Professional services profile → Open service workspace. No second account or paid membership is needed.
- Providers can publish or hide their profile, edit descriptions/categories/service areas/availability/price information/contact preference, and upload up to six portfolio photos.
- Providers choose Service dashboard or Main dashboard as their default. Service screens have relevant bottom navigation; the main feed and existing tools remain accessible.
- Find services supports business/service search, category filtering and city/state search. It is available from the service workspace, Network, Quick Options and Transaction hub.
- Quote requests include a title, general location, description and up to three reference photos. They create a job request and an ordinary Better conversation. Duplicate open inquiries and bursts of requests are blocked.
- Jobs support New inquiry, Quoting, Scheduled, In progress, Completed and Declined / canceled, agreed dates and private provider notes. Customers can see their own requests and shared stages/dates, but cannot edit jobs or read provider notes. Completion does not create a review, verify a transaction or move money.
- Service dashboard includes inquiry/open/completed counts, stage filtering, job editing and conversation links. Empty states and Getting started guidance are included.
- Affiliate-only accounts cannot publish services or request quotes. Existing account/affiliate/membership rules remain intact. No new prices, paid benefits, payment providers, integrations or dependencies.
- Privacy copy covers service data and image-link visibility. Images use the existing storage system and can be opened by anyone with the link; do not upload sensitive details. Jobs are removed when either participant deletes their account.
- New serviceJobs collection uses the existing automatic database table initialization. No manual SQL or DNS changes.
- The ZIP includes the restored credential-free .env.example reference omitted by the baseline archive. Preserve your actual environment variables and .env files.

Retains all prior updates, including the public platform demo, larger unchanged logo, Email Center promo configuration/history/unsubscribe flow, CRM and Title Directory. Homepage video stays removed.

See QA-v29.63.md and INSTALL-v29.63.md.
