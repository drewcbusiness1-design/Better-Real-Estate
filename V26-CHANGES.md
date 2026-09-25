# Better Real Estate v26 — Property Intelligence & Guided Operations

## Major additions
- Address-based AI Deal Builder entry point.
- Address-first Better Real Estate AI analysis using the already-configured OpenAI integration: preliminary property details, ARV range, repair scenarios and professional description, all clearly marked for review.
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
The address Deal Builder uses the existing `OPENAI_API_KEY`. It does not require Better Real Estate AI or another property-data subscription, and it does not fabricate named comparable sales.

## Product/data guardrails
- ARV is displayed as an AVM estimate/range, not an appraisal.
- Repair numbers are planning scenarios, not an inspection or contractor quote.
- Users can alter assumptions before using the analysis in a listing.
- Comparable selection is visible and editable.
