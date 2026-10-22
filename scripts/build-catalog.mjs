// Rebuilds catalog.json from the public UW course catalog. Run: node scripts/build-catalog.mjs
// Keeps only code, title, credits and gen-ed areas (no descriptions).
import { writeFileSync } from "node:fs";

const BASE = "https://www.washington.edu/students/crscat/";
const decode = s => s.replace(/&amp;/g, "&").replace(/&#39;|&rsquo;|&lsquo;/g, "'").replace(/&quot;|&ldquo;|&rdquo;/g, '"')
  .replace(/&nbsp;/g, " ").replace(/&ndash;|&mdash;/g, "-").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/\s+/g, " ").trim();
// Title is greedy so a parenthesis inside it, e.g. "(AP)", isn't mistaken for the credits.
const HEAD = /<a name="[^"]+">\s*<p>\s*<b>([A-Z][A-Z& ]*?)\s+(\d{3}[A-Z]?)\s+(.+)\s+\(([^()]*)\)\s*([^()<]*)<\/b>/g;

const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };
const pages = [...new Set([...(await get(BASE)).matchAll(/href="([a-z_]+\.html)"/g)].map(m => m[1]))];

const seen = new Map();
let i = 0;
const worker = async () => {
  while (i < pages.length) {
    const page = pages[i++];
    let html;
    try { html = await get(BASE + page); } catch (e) { console.warn("skip", page, e.message); continue; }
    for (const m of html.matchAll(HEAD)) {
      const code = decode(m[1]) + " " + m[2];
      const tags = decode(m[5]).split(/[,/]\s*|\s+/).filter(t => ["A&H", "SSc", "NSc", "DIV", "C", "W", "RSN"].includes(t));
      if (!seen.has(code)) seen.set(code, [code, decode(m[3]), decode(m[4]), tags.join(" ")]);
    }
  }
};
await Promise.all(Array.from({ length: 6 }, worker));

const courses = [...seen.values()].sort((a, b) => a[0].localeCompare(b[0], "en", { numeric: true }));
writeFileSync(new URL("../catalog.json", import.meta.url), JSON.stringify({ built: new Date().toISOString().slice(0, 10), courses }));
console.log(`catalog.json: ${courses.length} courses from ${pages.length} pages`);
