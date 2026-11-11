# Privacy policy: Husky Degree Planner MyPlan import

Last updated: November 10, 2026

This browser extension adds a **Send audit to Husky Planner** button to your MyPlan degree audit page and passes the audit to [Husky Degree Planner](https://husky-degree-planner.vercel.app). It is an unofficial student tool and is not affiliated with the University of Washington.

## What the extension does with your data
- When you click the button, it reads the text of the MyPlan audit page you are viewing. It does nothing until you click.
- It saves that text in the browser's local extension storage for up to 10 minutes, opens Husky Degree Planner in a new tab, and hands the text to that page. The planner then deletes the stored copy.
- The extension itself makes no network requests, has no servers, and sends your audit nowhere else. It does not read any other site, collect your NetID or password, or track your browsing.

## What the planner does with your data
- The planner parses the audit in your browser to build a plan. The plan stays in that tab unless you sign in.
- If you sign in with Google, your plan is saved to the planner's database (Supabase) so you can reopen it. You can delete a plan at any time.
- The planner counts anonymous usage events with Vercel Analytics (for example, that an import happened and how many courses it found). These events contain no audit text and no personal details.

## Permissions
- `storage`: holds the audit text for the few moments between the MyPlan tab and the planner tab.
- Access to `myplan.uw.edu/audit/` (to add the button and read the audit you choose to send) and to the planner's site (to hand it the audit).

## Contact
Questions or deletion requests: open an issue at https://github.com/Se9uencer/husky-degree-planner/issues.
