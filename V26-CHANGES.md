# Better Real Estate v26 — Property Intelligence & Guided Operations

## Major additions
- Address-based AI Deal Builder entry point.
- RentCast-backed property records, AVM/ARV range, sales comparables and long-term rent estimate when `RENTCAST_API_KEY` is configured.
- Smart Comps Workspace: include/exclude returned comps and recalculate a working ARV.
- Repair planning scenarios (light/moderate/heavy) based on size and age, explicitly labeled as planning allowances rather than inspection findings.
- Interactive Deal Analyzer with purchase price, repair scenario, assignment target, holding/closing allowance, working ARV, 70% MAO and projected flip spread.
- One-click handoff from Deal Builder into the existing property-post/Better Dispo flow.
- Private Buyer CRM with pipeline stages, markets, buy box, contact information and private notes.
- Optional signup tutorial with Next, Back, Skip this step and Skip tutorial. Tutorial can be restarted from Settings.
- Tutorial versioning is persisted per user so future releases can add significant new-feature guidance.

## Protected functionality
v26 is built on v25 Professional Operations and preserves the approved professional homepage, admin verification controls, membership-level display control, outline navigation icons, Better Dispo, Buyers Looking, AI deal-note import, AI listing copy, Deal Rooms, showings, Deal Rescue, Demand Insights, Team workspaces, social/network/chat, CJ marketplace, account controls, email/notification features and route persistence.

## Required production configuration
`RENTCAST_API_KEY` enables the address intelligence portion of the Deal Builder. Without it, the UI remains available but clearly reports that the property-data provider must be configured; it does not fabricate property values or comps.

## Product/data guardrails
- ARV is displayed as an AVM estimate/range, not an appraisal.
- Repair numbers are planning scenarios, not an inspection or contractor quote.
- Users can alter assumptions before using the analysis in a listing.
- Comparable selection is visible and editable.
