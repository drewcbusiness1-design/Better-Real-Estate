# Current release v29.42 — Sitemap

Read this entire master handoff before every action and reply. Latest candidate folder Better-Real-Estate-v29.42-Sitemap; package 2.9.42; tutorial 63 unchanged because this release has no app UI feature. RELEASE-v29.42.md includes sitemap/Search Console onboarding and complete Mac copy/test/commit/push commands. Last user-confirmed ARV baseline remains v29.40; v29.41 First50 carried forward without behavioral changes. No newer deployment hash supplied.

Adds public/sitemap.xml containing https://betterrealestate.org/ only and public/robots.txt advertising https://betterrealestate.org/sitemap.xml. Netlify explicit XML/plain-text headers; existing non-forced SPA fallback serves physical files. No database/API calls, no dependency changes, no private URLs or fabricated lastmod dates. User asked for help after learning no sitemap was configured. After deployment submit sitemap.xml in the site's Search Console Sitemaps panel. Do not claim it is live or submitted yet.

Three rule gates: pre-build checked scope/canonical public route, static serving, protected code/assets, and tutorial consideration; integration confirmed static files bypass API/function routes and excluded private/dynamic routes; pre-package full regressions/syntax, XML, actual static HTTP status/type, Netlify configuration, protected byte comparisons, changed whitespace and archive checks. No visual changes, so inherited UI files byte-identical rather than new browser QA claims.

All permanent rules and protected history below remain authoritative except latest version/status above.

---

