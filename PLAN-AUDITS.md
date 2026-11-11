# Testing majors with DARS plan audits

A real DARS degree audit only tests what one transcript has taken, so most requirements read "not met" and the planner's progress rules go unchecked. MyPlan's **Audit Your Plan** fixes that: DARS grades made-up *planned* courses with its real rules, and the planner already imports planned rows (`PL`). One made-up plan per family of majors tests every program in it.

The first run, on November 10, 2026, used 22 made-up courses for Public Health - Global Health: Nutritional Sciences (BS). DARS and the planner now agree on every requirement. It found three bugs a real audit never showed:

1. DARS splits one course's credits across requirements (NUTR 406 as 2 + 1 credits), and the planner gives each course to one requirement whole. Sub-minimums inside a credit total are now rules (`n9`, `n6` in `ph-bs-nutr`).
2. Plan audits title the gen-ed section "Diversity", not "Diversity Course".
3. All-caps status lines ("THE SUB-REQUIREMENT HAS BEEN SATISFIED.") were read as section headers and cleared the section's tag. This affected every major's Diversity courses.

## How to run one family

1. **Sign in** to MyPlan in Chrome. Only you can sign in; nothing here enters credentials.
2. **Pick an empty academic year** two or more years out (2028-29 was empty on November 10, 2026). Your real quarters stay untouched.
3. **Add the family's courses** with *Add to Plan → Course or course placeholder*. Spread them across the four quarters. Each add takes about 10 seconds to save. A scripted add works if the dialog is opened and filled by script but **submitted with a real click**; MyPlan ignores a scripted submit.
4. **Run Audit Your Plan** (`myplan.uw.edu/audit/#/plan`) for each program in the family, choosing it under *Choose Different Program*.
5. **Paste each audit** into the local planner (`Import from DARS`, same major) and compare every requirement:
   - DARS `PL` / `PL+` means it would be met; the planner should show a check.
   - DARS `NO` should be unmet in the planner, with the same missing piece.
   - Compare gen-ed too. DARS stops counting planned credits at 180, so its total won't match the planner's; that is expected.
6. **Fix mismatches** with a regression test that fails on the old code, then rerun the import to confirm.
7. **Save each audit** as a fixture (see below), then **delete the made-up courses** (*More actions → Delete*) and check your real quarters are unchanged.
8. **Update the family's status** in the table below and note what was found.

## What each plan should contain

- **Everything to finish each program** in the family, so DARS should report every major requirement as met.
- **One or two deliberate edge cases**, because finished plans test the easy path. Good ones:
  - a course on two lists (breadth and elective, core and elective)
  - a variable-credit course at its minimum (a 1-credit internship)
  - a course DARS might split across requirements
  - an alternative the catalog allows but DARS might not (CHEM 223/224 for organic chemistry)
  - a cross-listed course under its other prefix (GEOG 180 for G H 101)
  - a course in the "additional coursework in any area" bucket

Build the course list from the program's requirements in `index.html`, not from memory.

## Families

About 8 plans cover all 71 programs. Start with the large majors with complicated rules, where mistakes cost the most.

| Order | Family | Programs | Status |
|---|---|---|---|
| 1 | Public Health | `ph-bs-nutr`, `ph-ba`, `ph-ba-gh`, `ph-ba-ep`, `ph-bs`, `ph-bs-gh` | All six done (November 10, 2026) |
| 2 | Computing | `cs`, `info`, `info-bhi`, `info-ds`, `acms-ds`, `acms-dm`, `acms-me`, `acms-sc`, `stat-app`, `stat-math`, `stat-ds` | All eleven tested, full and reduced plans (November 10, 2026); Applied Statistics adviser approval remains unmet |
| 3 | Business | `bus`, `bus-acct`, `bus-abp`, `bus-entre`, `bus-fin`, `bus-hr`, `bus-is`, `bus-mktg`, `bus-ops` | |
| 4 | Biology | `biol-ba`, `biol-bs`, `biol-mcd`, `bioc-ba`, `bioc-bs`, `micro` | |
| 5 | Economics, Political Science, Philosophy | `econ-ba`, `econ-ba-intl`, `econ-bs`, `econ-bs-ds`, `econ-bs-fin`, `econ-bs-strat`, `pols`, `pols-sec`, `pols-econ`, `phil`, `phil-eth` | |
| 6 | Engineering | `ce`, `me`, `me-bio`, `me-mech`, `ece`, `civ`, `bioe`, `bioe-ds`, `bioe-nme` | |
| 7 | Social sciences and humanities | `psych-ba`, `psych-bs`, `com`, `com-jpic`, `soc`, `engl`, `engl-cw`, `hist` and its 4 options | |
| 8 | Math and Earth sciences | `math-ba`, `math-bs`, `math-phil`, `math-teach`, `ess-geo`, `ocean-ba`, `ocean-bs` | |

The Public Health plan from November 10 was SPH 380, 381, 389, 391, 392, 480, 481, 493; EPI 320; NUTR 200, 302, 310, 405, 406, 412; BIOL 180, 200, 220; CHEM 237, 238; BIOC 405; ANTH 302. To cover the other five programs, add G H 101, 305, 401, 402 and one more G H elective; HSERV 100, 204, 343, 344, 345; SPH 495; and two BA selectives.

### Public Health, the other five programs

The second run used 32 made-up courses in 2028-29 (the course list above, plus BIOST 310, GEOG 180, PSYCH 101, SOC 110, ECON 200, MGMT 200 and G H 306), audited for all six programs, then a reduced plan (SPH 392, HSERV 343 and HSERV 100 removed, G H 401 at 1 credit) for three of them. Edge cases that held: GEOG 180 in place of G H 101 (DARS matches it too), SPH 495 at 1 and 3 credits, a course on two lists (ANTH 302 in breadth or electives), and a G H total one credit short. It found two bugs:

1. **A description read as a requirement.** The BA Selectives description ends "...social justice and writing.", and the parser tagged every course under it as Writing (W). That gave the GH and E&P BAs 20 to 24 W credits where DARS had none. Sub-requirement tags now match the label's heading only.
2. **A 3-credit minimum.** DARS wants "G H 305, 401 (3cr) and 402 (3cr)", and G H 401 and 402 can be taken for 1 credit. The planner counted a 1-credit G H 401. Requirements can now carry `minCr`.

Two differences are not bugs. DARS stops listing electives once 20 credits are filled, so its elective credits are lower than the planner's total; both call the requirement met. A planned course that duplicates a 0-credit AP row (PSYCH 101) counts in DARS but not in the planner; real plans rarely have that. DARS lists G H 101 only for admission, while the planner also requires it for the GH BA; its source wasn't rechecked, so it was left alone.

### Computing, all eleven programs

Tested on November 10, 2026, using ChatGPT's Chrome controls. MyPlan limits each quarter to **eight planned items**, so one year cannot hold this entire family. Four successive course sets used only 2028-29: CS; Informatics and its two options; ACMS Data Science plus all three Statistics options; and the other three ACMS options. There are **24 Computing fixtures** in the ignored `audits/` directory: a full and reduced audit for each program, plus ACMS Data Science's grouped-alternative case and Mathematical Economics' eight-credit elective case. All preparation times were checked; cached reports were not used as new results.

Every program was imported through the local planner's actual Import from DARS dialog. All 33 saved fixtures (including the nine Public Health audits) were also re-imported through the same parser, conversion, catalog, title-repair and evaluation pipeline after shared changes. Public Health results stayed unchanged. A final comparison checked 341 tracked requirement and gen-ed results across the 24 Computing fixtures with zero differences. All three `*.test.mjs` files pass. The Computing changes branch from PR #22 because that PR was still open when this run started.

Found and fixed:

1. **Lost gen-ed credit on a split course.** DARS puts three credits of PHYS 116 under Natural Sciences and the whole four-credit course under the CS major. Dropping the fragment also dropped its NSc tag, leaving 33 rather than 36 NSc credits and an incorrect Areas of Inquiry total. Tags now survive on the whole course, while the audit's applied-credit budget preserves the partial allocation.
2. **Statistics needs both course and credit minimums.** Three electives totaling eight credits (STAT 498 at one credit, STAT 425 at three, MATH 318 at four) were marked complete. DARS says one more credit is needed in all three Statistics options. Their elective requirements now check both three courses and nine credits. Applied Statistics' adviser-approved application requirement also checks three courses as well as nine credits; two five-credit courses are insufficient. The evaluator reserves every course needed to meet both minima.
3. **ACMS electives were much too broad.** A blanket upper-level AMATH/CSE/MATH/STAT list incorrectly gave Mathematical Economics 68 elective credits where DARS applied eight and required one more. Replaced it with the option-specific post-Spring-2024 lists, including unused option courses. The corrected Discrete Math full plan has 16 elective credits; Mathematical Economics has eight before adding ECON 301 and 13 afterward. Scientific Computing now accepts unused CHEM 152, and Data Science accepts STAT 311 when AP STAT 290 fills introductory statistics. Sources: [Data Science](https://acms.washington.edu/data-sciences-and-statistics-0), [Discrete Math](https://acms.washington.edu/discrete-math-and-algorithms-0), [Mathematical Economics](https://acms.washington.edu/mathematical-economics-and-quantitative-finance-0), [Scientific Computing](https://acms.washington.edu/scientific-computing-and-numerical-algorithms-0). The department also has older, similarly named pages without the `-0` suffix; use the links under the post-Spring-2024 heading on its program-requirements page.
4. **Alternatives counted as separate groups in ACMS Data Science.** AMATH 481 and 482 fill one scientific-computing group, not two. STAT 403 and 425 (including their cross-listed prefixes) fill one statistics group, not two. A live plan containing both pairs produced unmet DARS subrequirements that the planner incorrectly checked off. These now count distinct groups.

Other edge cases: CSE 301 at one credit; CSE 123 satisfying both Statistics programming slots; INFO 492 capstone; surplus INFO 442/443 after CSE 373 fills the core slot; INFO 351 and INFO 330 as ACMS/Statistics alternatives; MATH 395 for STAT 395; MATH 381 for AMATH 383; and the MATH 408/409 sequence. Reduced plans tested missing core courses, a missing capstone, a missing society course, each Informatics option one course short, Statistics at eight elective credits, Discrete Math at 8/10 breadth courses and 12/15 elective credits, and the ACMS grouping cases.

Expected differences: DARS stops assigning electives once a requirement is filled, so the planner can show more eligible credits with the same met state. The 180-credit degree-total cap is also expected. ACMS admission checks require completed courses, so planned courses do not satisfy admission even when they satisfy degree requirements. Applied Statistics' application-area courses need actual adviser approval; that requirement was deliberately left unmet. GPA, reasoning and foreign-language checks remain outside the planner's modeled requirements.

Cleanup verified at 7:33 PM on November 10, 2026: all four quarters of 2028-29 are empty again. The print view contains only the original real courses: Autumn 2026 has 16 credits and Winter 2027 has 14; every other quarter is empty. All made-up courses were deleted.

## Picking up: what the next agent needs

**Next:** family 3 (Business). Build its course list from `bus` and the `bus-*` options in `index.html`, then follow "How to run one family". One branch and PR per family, from `main` once preceding fixes have merged.

**Mechanics that worked in the Public Health run** (MyPlan's markup can change; recheck if something fails):
- **State:** 2028-29 was empty and is empty again. Check the plan view (`myplan.uw.edu/plan/#/print`) before and after; real quarters were Autumn 2026 (16 credits) and Winter 2027 (14).
- **Adding courses:** open the quarter's *Add to Plan* by script, wait about 1 second, then use real clicks to focus the code field, type, and press *Add to plan* (dialog buttons sit at fixed spots on a 1200x697 viewport). Wait about 6 seconds per save, and confirm the saved list in the plan view.
- **Variable-credit courses** (G H 401, SPH 495) prompt for a credit amount at every audit run. Set the selects by script, then really click *Submit*. A stale cached audit appears first; press *Refresh Audit* and check its "Date Prepared" time.
- **Switching programs:** *Choose Different Program*, set `#programSelector` by script, really click *Audit Your Plan*, then wait 25 to 30 seconds. `main.innerText` is the audit text.
- **Moving text to localhost:** put the audit JSON in `window.name`, navigate the same tab to `http://localhost:8743/`, and read it there. Download it as JSON from that page into `~/Downloads`, then split it into `audits/plan-<id>.txt` (git-ignored).
- **Comparing:** the planner's script is one closure, so fetch `/index.html`, append `window.__x={parseDars,planFromDars,evalAll,planReqs,coursesUpTo,loadCatalog,addCatalogGen,titleOnly,resolveShortTitle,addAutoTags,allCourses}` before its final `})();`, and `eval` it. Then run the same steps as the Import dialog and print each requirement's met state next to DARS's `PL`, `PL+`, `PL-` or `NO`. Saved audits can be fetched from `/audits/` on the dev server.
- **Deleting:** *More actions* on the first card, *Delete*, confirm, then *Done* (all real clicks, about 12 seconds each). The first card's menu opens upward; take a screenshot before batching, and leave about 1 second after each click.

**Still open:** `scripts/check-dars.mjs` (see below) is not written. This machine has nine Public Health fixtures plus 24 Computing fixtures in `audits/`; they must remain ignored. Re-import saved audits if the shared parser or evaluator changes. MyPlan allows eight planned items per quarter, so larger families need successive course sets. Wait for each add dialog to initialize before filling it; an early fill can be reset. Real clicks work for save, credit-prompt submission and deletion confirmation, followed by about six seconds and verification (occasionally a little longer).

## Fixtures and the check script

Each saved plan audit becomes a test case, so the next catalog year can be checked with one command instead of repeating the MyPlan work.

- Save audits as text under `audits/`, which must stay out of git: they include your name and your AP and transfer history, and DARS marks them not for third parties.
- Planned next step: `scripts/check-dars.mjs` imports every saved audit through `parseDars` → `planFromDars` → title repair → `evalAll`, compares each requirement with DARS's status, compares the course lists DARS prints after "From:" with the planner's lists, and prints only the differences.
- Rerun it after shared parser or evaluator changes, and each autumn with fresh audits.

## Costs

- **Time:** about 15 minutes of MyPlan work per family, plus whatever fixes it turns up. The fixes are most of the real work.
- **Your account:** this adds and then deletes made-up courses in your own MyPlan. Use an empty year and check your real quarters afterwards.
