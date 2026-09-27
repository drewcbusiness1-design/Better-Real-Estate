# Better Real Estate v28 — Growth Engine

Built from the confirmed-good v27.3 baseline.

## Referral Center
- Personal referral link remains tied to the existing referral code system.
- Referral landing-link visits are tracked server-side.
- Profile Referral Center shows link visits, signups, activated referrals, paid referrals and earned referral credit.
- Existing $10/$10 wallet-credit behavior remains tied to the referred user's first completed purchase.
- Recent referrals show Joined / Activated / Paid status.

## Founding Member
- Added a visible Founding Member designation on profiles.
- Admin can grant or remove Founding Member status from User Inspector.
- No automatic or fake scarcity logic was added; admin controls qualification.

## Better Plus — $30/month
The existing internal `pro` tier is now presented to users as **Better Plus** without a destructive billing/data migration.
- Unlimited listing unlocks.
- Listing analytics.
- Plus profile badge.
- AI Deal Builder: 5 analyses/day.
- AI listing assistant: 2 drafts/day.
- Better Dispo AI enhancement: 3 imports/day.
- Platinum / Wholesale Teams / Admin remain unlimited for these AI tool quotas.
- Plans page lists the allowances clearly.
- Better Dispo shows remaining AI-enhanced imports where relevant.

## Tutorial
- Tutorial version 32.
- Added membership-aware What's New steps for Referral Center and Better Plus access.
- Current tutorial controls remain Back / Next (or Finish) + Skip entire tour. **There is no Skip this step control.**

## Data
- Added `referralClicks` persistence collection.
- Added private `plusToolUsage` daily counters on user records.
- Added `foundingMember` / `foundingMemberAt` user fields.
