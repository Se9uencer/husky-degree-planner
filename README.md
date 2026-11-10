# Husky Degree Planner

A quarter-by-quarter degree planner for University of Washington (Seattle) majors.

Pick your major, paste in your DARS audit, add the courses you plan to take, and the planner shows the first quarter in which you meet every requirement. You can keep several plans side by side, for example "graduate Spring 2029" and "graduate Spring 2030".

## Supported majors

| Area | Majors and options |
| --- | --- |
| Computing and data | Computer Science, Computer Engineering, Informatics (general, Biomedical & Health, Data Science), ACMS (4 options), Statistics (3 options) |
| Arts & Sciences | Psychology (BA, BS), Biology (BA, BS, Molecular Cellular & Developmental), Economics (BA, BS and 4 options), Communication (general, Journalism & Public Interest), Political Science (general, International Security, Political Economy), Philosophy (general, Ethics), Sociology, Biochemistry (BA, BS), Microbiology (BS), Mathematics (BA, BS, Philosophy, Teacher Preparation), English (general, Creative Writing), History (general and 4 options) |
| Business | Business Administration (general and 8 majors) |
| Engineering | Mechanical (general, Biomechanics, Mechatronics), Electrical & Computer, Civil, Bioengineering (general, Data Science, Nanoscience) |
| Environment | Earth & Space Sciences: Geology, Oceanography (BA, BS) |

That's 64 programs, and a plan can hold up to two. [MAJORS.md](MAJORS.md) lists every program in DARS and which ones are supported. Following [UW's rules](https://advising.uw.edu/degree-overview/majors/double-degree-and-double-major/), majors in different colleges need each college's general education, and majors with different degree names (a BA and a BS, for example) are a double degree, which needs 225 credits with 90 at UW.

**Live site:** https://husky-degree-planner.vercel.app

## Features

- **DARS import.** Copy your audit from MyPlan and paste it in, with a step-by-step guide on the welcome page. AP, transfer and in-progress courses go into the right quarters, with their gen-ed areas tagged. If UW caps your outside credit, the planner adds a matching adjustment so your total matches DARS.
- **Projected graduation.** The planner finds the first quarter where all requirements are met and compares it to your target quarter. It also tells you how many credits per quarter you need to reach your target.
- **Requirement audit.** Tracks:
  - General education: total credits, UW residency, composition, writing, diversity, and Areas of Inquiry, using the rules for your college
  - Your major: required courses, pick-from-a-list requirements, department credit totals, and electives. A course used for one requirement isn't counted again as an "additional" course.
  - Optional Ethics minor and one custom minor
- **Multiple plans.** Copy a plan, start a blank one, or open an example for your major. You can change the number of years shown and turn summer quarters on or off.
- **Browse by requirement.** Click a requirement in the audit to open course search already filtered to the courses that count toward it. Search results and course cards mark the major lists each course belongs to.
- **Drag and drop.** Move courses between quarters.
- **Accounts.** Sign in with Google (via Supabase Auth) to save your plans — nothing persists in the browser until you do. Once signed in, plans sync across devices. Use **Export plans** to back them up or move them to another device, and **Import file** to load them.

## Using it

1. Open the site, or serve this folder over http, for example `python3 -m http.server` and then `http://localhost:8000`. The course catalog and Google sign-in do not work from a `file://` page.
2. Choose your major, then click **Import from DARS**.
3. In MyPlan, open your audit, press Ctrl+A (Cmd+A on a Mac), copy, and paste the text into the planner.
4. Check the tags on your AP and transfer credit. DARS shows titles, not course numbers, for some AP credit.
5. Add future courses with **+ Add course**. Required courses such as `MATH 208` are matched by their code, and courses on a major's lists are tagged automatically. Tag anything else with what it counts toward.

## Deploying on GitHub Pages

1. Create a public repository and push these files.
2. In the repository, go to **Settings → Pages**.
3. Set the source to **Deploy from a branch**, then choose `main` and `/ (root)`.
4. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

The app is one static file, so there is no build step and nothing to install.

To check the DARS parser, major data and audit logic after changing them, run `node parser.test.mjs`.

**Find courses** searches `catalog.json`, built from the public [UW course catalog](https://www.washington.edu/students/crscat/) (code, title, credits and gen-ed areas only). Refresh it once a year with `node scripts/build-catalog.mjs`.

## Updating requirements

Majors live between the `MAJORS-START` and `MAJORS-END` markers in `index.html`. Each `major(...)` entry lists its college, its catalog page, its course lists, and its requirements, and the comment at the top of the block explains the format. To add a major, add an entry and run the tests, which check every course code against `catalog.json`. A department's list can name a course that isn't in the catalog, so those go in `NOT_IN_CATALOG` in the test file after you've checked them by hand.

Requirements follow the UW General Catalog and department websites for AY 2026-27. If the rules change, edit the entry and open a pull request. Users can also change the numbers for a single plan in the app with **Edit requirement numbers**.

The audit doesn't check GPA, minimum grades, the reasoning (RSN) requirement, or foreign language. Each major's notes in the app name anything else it can't check, such as the three-field rule in Political Science.

Sources:
- [UW General Catalog: degree programs](https://www.washington.edu/students/gencat/degree_programs.html) (each major links to its own page in the app)
- [UW advising: general education by college](https://advising.uw.edu/degree-overview/general-education/requirements-by-college-and-school/)
- [UW Philosophy: Ethics Minor](https://phil.washington.edu/ethics-minor)

## Disclaimer

This is an unofficial student project. It is not affiliated with or endorsed by the University of Washington or any of its departments. Always check your official DARS audit and talk to your adviser before you make decisions about your degree. If the planner disagrees with your audit, use **Report a mismatch** in the app.

## License

MIT. See [LICENSE](LICENSE).

### Credit accounting

Each course uses one selected Area of Inquiry (A&H, SSc, or NSc). When adding a course with multiple designations, the first is selected by default; use **Counts toward** in the course editor to choose another area for your plan. Diversity and writing may still overlap with the selected area.

Ordinary repeated course codes earn credit once, with completed entries taking priority over in-progress or planned entries. For offerings that permit repeat credit, enable **Course permits repeat credit** on each applicable entry. Equivalent courses with different codes are not automatically deduplicated.

**Credit earned at** controls UW residency independently of the quarter. New DARS imports preserve AP, IB, and TR credit as outside UW. Older saved plans did not retain these markers: check the credit origin of transfer courses already placed in UW quarters, and UW courses placed in Before UW. Reimporting DARS also restores the available origin markers.

Summer courses remain part of the audit when summers are hidden.

Run regression checks with `node parser.test.mjs` and `node audit-regressions.test.mjs`.

### DARS-applied general education

Full DARS imports preserve the general-education designations actually applied by the audit, including courses left in general electives. Catalog eligibility alone does not add gen-ed credit to those imported courses. Area summaries can apply fewer credits than a full course is worth; this changes only gen-ed progress, not total, major, or UW residency credit.

When an audit explicitly applies more than the standard per-area cap, that already-applied credit is preserved. Blank plans keep their normal caps. The importer does not infer or grant a new waiver. Editing an imported course's code, credits, status, or gen-ed tags clears its imported allocation so the edited course follows your selections.

`node microbiology-dars.test.mjs` checks an invented anonymous audit fixture. To compare a matching Microbiology audit locally, pass its text-file path as an argument; the transcript is not bundled with the tests.
