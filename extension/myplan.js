// On the MyPlan audit page: add a button that hands the visible audit text to the planner.
const PLANNER = "https://husky-degree-planner.vercel.app/"; // ponytail: use http://localhost:8000/ (or your port) when testing a local planner
const b = document.createElement("button");
b.textContent = "Send audit to Husky Planner";
b.style.cssText = "position:fixed;right:16px;bottom:16px;z-index:2147483647;padding:10px 14px;border:0;border-radius:8px;background:#4b2e83;color:#fff;font:600 14px system-ui;cursor:pointer;box-shadow:0 2px 8px #0005";
b.onclick = async () => {
  await chrome.storage.local.set({ huskyAudit: { text: document.body.innerText, ts: Date.now() } });
  window.open(PLANNER, "_blank");
};
document.body.appendChild(b);
