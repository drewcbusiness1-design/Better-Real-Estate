# Better Real Estate v29.62 — Platform Demo and Larger Logo

Package 2.9.62; tutorial release 81. Full package based on v29.61. NOT DEPLOYED.

## Actual platform demo
- Replaced the separate public walkthrough UI with the same renderers used by the real feed, property detail, member profile, chat, pipeline and Deal room. Homepage Try it out and signup remain available.
- Introduced an explicit renderer context: production screens default to the existing live API/navigation/state; the public demo supplies separate sample state, a local request adapter and restricted sample navigation. No monkey-patching of fetch or replacement of the real signed-in user/access. No demo accounts are created.
- Visitors can browse three illustrative properties, Save/unsave, review property facts, try the client-side calculator, Follow the sample profile, type/send a sample message and receive a labeled simulated reply, add the property to pipeline, change its stage, add/edit notes, open the actual Deal room and save its stage/next action/private notes. The sample room conversation also works locally.
- Guidance sits above the screens, with Show/Hide guidance and screen navigation for free exploration. Available signup/exit/restart controls remain out of the way of the screen content.
- Finishing requires an outgoing sample message, pipeline entry and a saved Closed sample room stage. Direct completion links without those prerequisites show the demo feed instead. The ending describes an illustrative workflow, not a real closing or promise of results.
- Sample state is stored in this browser tab through sessionStorage with an in-memory fallback. Screen URLs support refresh and browser history. Selection changes reset that property's sample conversation/deal state while retaining saves. Existing v29.61 sample state is intentionally replaced by the v2 sandbox.
- All properties, profiles, prices, messages and activity are labeled illustrative. Property tiles use the app's existing house icon and explicitly say there is no photograph. No fake verified badges, activity counts, returns or transaction proof are added.
- Demo sharing, advanced search/alerts, document uploads, extended transaction tools, friends and paid services are not connected to live services. Unsupported demo requests fail locally; they never fall through to the production API. The standard app boot may still read its existing session/pricing/payment configuration, and existing signed-in activity tracking is unchanged.
- Narrowly shared UI improvements: pipeline stage and Deal room stage selects now have descriptive accessible labels. Production screens retain their full transaction tools and existing default behavior.

## Header logo
Exact existing brand-logo-header.png asset retained byte-for-byte. CSS height increased from 52px to 62px on desktop and from 38px to 48px on small phones. Responsive width limits and internal header padding keep the logo in normal document flow; no transform or negative offset. Header padding remains 14px desktop and 12px on phones. Existing small-screen navigation wrapping remains intact.

## Retained work
All v29.61/v29.60 updates, including Email Center promo controls/history/previews and signed unsubscribe links, CRM search/duplicate prevention, Title Directory, custom chart dates and Deal room action styling. Video remains removed.

## Validation and limits
Full npm regression suite and project build command passed. JavaScript syntax checks passed. New executable DOM-level tests exercise actual shared renderers and control handlers through all three properties, message input clearing, stage changes, notes, optional signup, signed-in account isolation, unknown-request rejection, refresh routing and corrupt/blocked storage. Additional default-context tests confirm live feed API selection and retention of production Deal room transaction tools. Server/store/marketing/valuation source and PNG assets are unchanged from v29.61.

Browser rendering and visual layout were NOT checked in this environment. DOM-level tests do not prove logo fit, mobile geometry or theme appearance. Before deployment, run the browser smoke checklist below. No deployment, external messages, DNS changes, purchases or production data changes were performed.

## Browser smoke checklist
1. Signed out: homepage Try it out opens demo without login. At desktop, 390px and 320px in light/dark, check logo spacing, header navigation, all content and controls, and document overflow. Pipeline may scroll inside its board.
2. Open each sample property; test Save, Liked, Follow, calculator and sample profile. Send a typed sample message; verify cleared input and labeled reply.
3. Add pipeline opportunity, change stage, save notes, open Deal room, edit next action/notes, set Closed and Save. Finish workflow and confirm signup opens normally.
4. Test free exploration, hide/show guidance, Previous browser Back/Forward, refresh, restart and exit. Unsupported actions should explain their preview limit without sending requests to live services.
5. Repeat while signed in; verify real user/account/plan and live data are unchanged, then exit to the real workspace. Confirm normal property/profile/chat/pipeline/Deal room screens and full live transaction tools.

Use INSTALL-v29.62.md. Historical handoffs below are not instructions to restore video or the superseded v29.61 demo.
