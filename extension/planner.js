// On the planner: if an audit was just sent from MyPlan, pass it to the page (once, within 10 minutes).
chrome.storage.local.get("huskyAudit").then(({ huskyAudit }) => {
  if (!huskyAudit) return;
  chrome.storage.local.remove("huskyAudit");
  if (Date.now() - huskyAudit.ts < 10 * 60 * 1000)
    window.postMessage({ type: "husky-dars-audit", text: huskyAudit.text }, location.origin);
});
