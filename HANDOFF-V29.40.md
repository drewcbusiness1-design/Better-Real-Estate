# v29.40 handoff

Read Better-Real-Estate-v29.40-MASTER-SEAMLESS-HANDOFF.md in full before every turn.

## 1. Resume point — read this first

Read this FULL master handoff before doing or answering anything on EVERY turn.

Latest candidate **v29.40 — ARV / Comps**, package **2.9.40**, tutorial **62**, folder **Better-Real-Estate-v29.40-ARV-Comps**. User reported v29.39 much better on production, but ARV/comps not showing. Last explicitly supplied git hash remains v29.36 af0dafb. Do not claim assistant deployed v29.40.

User's v29.39 Bennington diagnostics (20:58:48 UTC): all four research passes completed; selected three sold comps scored 67,61,57, with no verified distance. Gate required three scores >=60, so usableWorkingCount=2 withheld ARV despite each sale having two source families. Subject address matched 100; bathrooms2.5 and sqft1796 corroborated; beds4/year1970/typeTownhouse recorded. sufficientForValuation=false. Full raw diagnostics supplied in Pasted markdown(3).md. The bundled public fixture retains selected comp/subject evidence, not secrets.

v29.40 changes:
- Keep precise comp gates unchanged. Additional LOW-confidence working-range path requires >=3 selected comps, >=2 recent and >=2 scores >=60; every selected row must score >=55, have sqft/type and >=2 corroborating source families. Existing stronger working path retained. This does NOT establish physical distance or renovated condition. Never present this as precise ARV.
- One identical tested dealValuationPrecision helper used in server and browser. Require exact subject match and no disputed bed/bath/size/type. Precise additionally requires sufficientForValuation AND precise comp gate. Working permits independently established subject living area and non-conflicting recorded/established type; recorded facts remain recorded. Missing/conflicting identity/size still withholds. Manual comp recalculation uses same eligibility.
- Selected sale cards include original price, date, similarity, size, adjusted sale and source link. Excluded rows retain reasons and source links in expandable list. Withheld summary explains selection counts and warnings.
- Removing comps updates snapshot/calculator/summary; fewer usable sales can return ARV to withheld. Existing purchase-dependent spread/project cost math, MAO and repair planning retained.
- Tutorial62 explains working range versus precise and comp screening. Final response diagnostics comp summary recalculated to match displayed precision.
- NO provider/model/dependency/DB/schema change; no extra research pass, automatic retry, geocoding or polling. Cache namespace intentionally remains **v29.39-complete-facts-r7** so saved evidence can be rescored without paid research. Diagnostics GET still reads cached research compGate; final address response updates screening summary. TTL/refresh/quota/auth and server-owned research remain.

QA: full npm test PASS including production-shaped fixture and negative cases (uncorroborated borderline, only2 comps, wrong match, conflicting baths, recorded-only size, weak subject preventing precise). Syntax server/app/store/intelligence PASS; diff whitespace PASS; exact logos/store/runtime deps unchanged. Actual renderDealBuilder tested with mocked APIs:24 light/dark cases at1280/1024/800/620/390/320 with working/withheld and currency overflow checks;6 additional supplied fixture cases at1280/390/320 boththemes, selected source links and removing comp returning valuation/calculator to withheld. No initial redundant comp-analysis request. Visual screenshots inspected desktop/mobile. Three rule reviews completed (scope/protected rules, midintegration/precision/cost, finaltests/visuals/tutorial/package). No live provider request or real email sent; this is NOT proof of new production valuation correctness. Subject location and after-repair condition still need confirmation.

Deploy extract under **~/Downloads/Better Real Estate/Better-Real-Estate-v29.40-ARV-Comps/**, git repo **~/Downloads/Better-Real-Estate**. RELEASE-v29.40.md includes tests and git commit/push. Commit **v29.40 working ARV and transparent sold comp calculations**. After Netlify completes, hard refresh and analyze Bennington using cached research (no need force refresh solely to rescore). Preserve fresh Post, selected email recipients, photo dragging, mascot gestures and all inherited rules.

The inherited sections below remain permanent; section1 is authoritative current resume point.
