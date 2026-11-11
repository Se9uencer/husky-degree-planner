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
| 1 | Public Health | `ph-bs-nutr`, `ph-ba`, `ph-ba-gh`, `ph-ba-ep`, `ph-bs`, `ph-bs-gh` | `ph-bs-nutr` done |
| 2 | Computing | `cs`, `info`, `info-bhi`, `info-ds`, `acms-ds`, `acms-dm`, `acms-me`, `acms-sc`, `stat-app`, `stat-math`, `stat-ds` | |
| 3 | Business | `bus`, `bus-acct`, `bus-abp`, `bus-entre`, `bus-fin`, `bus-hr`, `bus-is`, `bus-mktg`, `bus-ops` | |
| 4 | Biology | `biol-ba`, `biol-bs`, `biol-mcd`, `bioc-ba`, `bioc-bs`, `micro` | |
| 5 | Economics, Political Science, Philosophy | `econ-ba`, `econ-ba-intl`, `econ-bs`, `econ-bs-ds`, `econ-bs-fin`, `econ-bs-strat`, `pols`, `pols-sec`, `pols-econ`, `phil`, `phil-eth` | |
| 6 | Engineering | `ce`, `me`, `me-bio`, `me-mech`, `ece`, `civ`, `bioe`, `bioe-ds`, `bioe-nme` | |
| 7 | Social sciences and humanities | `psych-ba`, `psych-bs`, `com`, `com-jpic`, `soc`, `engl`, `engl-cw`, `hist` and its 4 options | |
| 8 | Math and Earth sciences | `math-ba`, `math-bs`, `math-phil`, `math-teach`, `ess-geo`, `ocean-ba`, `ocean-bs` | |

The Public Health plan from November 10 was SPH 380, 381, 389, 391, 392, 480, 481, 493; EPI 320; NUTR 200, 302, 310, 405, 406, 412; BIOL 180, 200, 220; CHEM 237, 238; BIOC 405; ANTH 302. To cover the other five programs, add G H 101, 305, 401, 402 and one more G H elective; HSERV 100, 204, 343, 344, 345; SPH 495; and two BA selectives.

## Fixtures and the check script

Each saved plan audit becomes a test case, so the next catalog year can be checked with one command instead of repeating the MyPlan work.

- Save audits as text under `audits/`, which must stay out of git: they include your name and your AP and transfer history, and DARS marks them not for third parties.
- Planned next step: `scripts/check-dars.mjs` imports every saved audit through `parseDars` → `planFromDars` → title repair → `evalAll`, compares each requirement with DARS's status, compares the course lists DARS prints after "From:" with the planner's lists, and prints only the differences.
- Rerun it after shared parser or evaluator changes, and each autumn with fresh audits.

## Costs

- **Time:** about 15 minutes of MyPlan work per family, plus whatever fixes it turns up. The fixes are most of the real work.
- **Your account:** this adds and then deletes made-up courses in your own MyPlan. Use an empty year and check your real quarters afterwards.
