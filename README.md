# Husky Degree Planner

A quarter-by-quarter degree planner for Computer Science majors at the University of Washington (Paul G. Allen School).

Paste in your DARS audit, add the courses you plan to take, and the planner shows the first quarter in which you meet every requirement. You can keep several plans side by side, for example "graduate Spring 2029" and "graduate Spring 2030".

**Live site:** https://husky-degree-planner.vercel.app

## Features

- **DARS import.** Copy your audit from MyPlan and paste it in. AP, transfer and in-progress courses go into the right quarters, with their gen-ed areas tagged. If UW caps your outside credit, the planner adds a matching adjustment so your total matches DARS.
- **Projected graduation.** The planner finds the first quarter where all requirements are met and compares it to your target quarter. It also tells you how many credits per quarter you need to reach your target.
- **Requirement audit.** Tracks:
  - General education: total credits, UW residency, composition, writing, diversity, and Areas of Inquiry (A&H, SSc, NSc, with the 35-credit-per-area cap)
  - CS major: math, science, fundamentals, core, capstone, and electives
  - Optional Ethics minor and one custom minor
- **Multiple plans.** Copy a plan, start a blank one, or open an example. You can change the number of years shown and turn summer quarters on or off.
- **Drag and drop.** Move courses between quarters.
- **Accounts.** Sign in with Google (via Supabase Auth) to save your plans — nothing persists in the browser until you do. Once signed in, plans sync across devices. Use **Export plans** to back them up or move them to another device, and **Import file** to load them.

## Using it

1. Open the site, or open `index.html` directly in a browser.
2. Click **Import from DARS**.
3. In MyPlan, open your audit, press Ctrl+A (Cmd+A on a Mac), copy, and paste the text into the planner.
4. Check the tags on your AP and transfer credit. DARS shows titles, not course numbers, for some AP credit.
5. Add future courses with **+ Add course**. Tag each one with what it counts toward. Course codes such as `MATH 208` and `CSE 311` are matched automatically for math and fundamentals.

## Deploying on GitHub Pages

1. Create a public repository and push these files.
2. In the repository, go to **Settings → Pages**.
3. Set the source to **Deploy from a branch**, then choose `main` and `/ (root)`.
4. The site appears at `https://<your-username>.github.io/<repo-name>/` after a minute or two.

The app is one static file, so there is no build step and nothing to install.

To check the DARS parser after changing it, run `node parser.test.mjs`.

## Updating requirements

Default requirement numbers live in the `DEFAULT_REQS` array in `index.html`. They follow the UW General Catalog for the BS in Computer Science and the College of Arts & Sciences gen-ed rules for catalog year AU 26. If the rules change, edit that array and open a pull request. Users can also change the numbers for a single plan in the app with **Edit requirement numbers**.

Sources:
- [UW General Catalog: Computer Science](https://washington.edu/students/gencat/program/S/ComputerScience-210.html)
- [UW Philosophy: Ethics Minor](https://phil.washington.edu/ethics-minor)
- [Allen School degree requirements](https://www.cs.washington.edu/academics/undergraduate/degree-requirements/)

## Disclaimer

This is an unofficial student project. It is not affiliated with or endorsed by the University of Washington or the Allen School. Always check your official DARS audit and talk to your adviser before you make decisions about your degree.

## License

MIT. See [LICENSE](LICENSE).
