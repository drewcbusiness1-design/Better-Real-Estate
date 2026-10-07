# Better Real Estate v29.30 Handoff

Built from v29.29 Living Mascot.

## Delivered
- New live mascot character system with multi-pose state switching.
- Header Better Guide trigger now uses the new live mascot instead of only the layered pose rig.
- Contextual help bubble for the mascot.
- Better Guide panel, tutorial card, and free course hero now use the live mascot component.
- Added compressed mascot pose assets under `public/mascot-poses/`.
- Added regression coverage in `tests/v29-30-live-character.test.js`.

## Notes
- Existing v29.28/v29.29 mascot code remains in the bundle for backward regression coverage.
- No logo redesigns were introduced.
- Uses only local assets in the project.
