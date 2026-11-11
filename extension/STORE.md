# Chrome Web Store listing

**Name:** Husky Degree Planner: MyPlan import
**Category:** Education
**Summary (132 chars max):** Send your UW MyPlan degree audit to Husky Degree Planner in one click. No copy and paste.

**Description:**
Husky Degree Planner builds a quarter-by-quarter plan from your DARS audit. This extension removes the copy and paste.

How it works:
1. Open your degree audit in MyPlan.
2. Click the "Send audit to Husky Planner" button in the bottom right.
3. The planner opens with your audit already filled in. Pick your major and create your plan.

Your audit goes straight from the MyPlan page you are viewing to the planner tab in your own browser. The extension has no server, never asks for your NetID or password, and does nothing until you click the button.

Unofficial student tool, not affiliated with the University of Washington.

**Single purpose:** Send the user's MyPlan degree audit text to Husky Degree Planner.

**Permission justifications**
- `storage`: briefly holds the audit text between the MyPlan tab and the planner tab (deleted on read, expires after 10 minutes).
- Host access to `https://myplan.uw.edu/audit/*`: adds the button and reads the audit page the user chooses to send.
- Host access to `https://husky-degree-planner.vercel.app/*`: receives the stored audit and passes it to the planner page.

**Remote code:** none. **Data use:** the audit text is not sold, transferred to third parties or used for anything but building the user's plan.

**Privacy policy URL:** https://github.com/Se9uencer/husky-degree-planner/blob/main/extension/PRIVACY.md

**Screenshots needed (1280x800):** the MyPlan audit page with the purple button; the planner's Import from DARS dialog filled in; the finished plan.

**Before submitting**
- Zip the contents of `extension/` (not the folder itself), leaving out `README.md`, `STORE.md` and `PRIVACY.md` if you like.
- Remove `"http://localhost/*"` from the `planner.js` matches in `manifest.json`; the store build does not need it.
- Developer account: https://chrome.google.com/webstore/devconsole ($5 one-time fee).
