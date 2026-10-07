# Better Real Estate v29.36 continuation

Start from this v29.36 release (2.9.36), based on supplied v29.35. Preserve all permanent rules in the supplied v29.35 MASTER SEAMLESS HANDOFF, including three separate rule reviews before every release, exact logo, local SVG mascot, source/provider policy, tutorials, mobile scrolling, existing membership/auth and listing behavior.

Approved scope: more mascot page interaction; enough contained space for moving arms with no control overlap; reorder property photos when editing. See V29.36-CHANGES.md for implementation and verification.

New regression tests: v29-36-page-interaction.test.js and v29-36-photo-order.test.js. Tutorial version is 58. Older regression tests were advanced to the current tutorial/package version; their feature assertions remain.

The earlier Founder demo preview screenshot was reported stuck. No permanent Founder-preview fix is claimed in this release; current changes do not alter demo/founder behavior. The user subsequently navigated to Network/Better Guide. Follow up if that preview regression recurs.

Production is not deployed or verified by this release. User repo remains ~/Downloads/Better-Real-Estate; preserve .git and .env; inspect status before push. Netlify deploys from GitHub.
