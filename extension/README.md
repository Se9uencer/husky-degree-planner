# MyPlan import extension (proof of concept)

Adds a **Send audit to Husky Planner** button on `myplan.uw.edu/audit/`. It reads the audit text the page already shows, in your own signed-in session, and opens the planner's Import from DARS dialog with it filled in. Nothing is sent to any server; the text moves through `chrome.storage.local` to the planner tab.

Try it: `chrome://extensions` → Developer mode → **Load unpacked** → pick this folder. For a local planner, change `PLANNER` in `myplan.js` to your local address (for example `http://localhost:8000/`).

Not done: Chrome Web Store listing, icons, Firefox/Safari, and asking UW whether they are fine with it.
