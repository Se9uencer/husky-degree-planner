// Builds schedule/<QTR>.json from the public UW Time Schedule. Run: node scripts/build-schedule.mjs WIN2027 [AUT2026 ...]
// The public pages blank out building and instructor, so neither is captured.
// Output: { quarter, built, courses: { "CSE 121": [title, [section, ...]] } }
// section = [sln, id, type, meetings, status, enrolled, limit, restr, other, notes]
//   type      credits for a lecture ("4", "1-5"), or QZ/LB/SM... for secondary sections
//   meetings  [[days, startMin, endMin], ...] minutes since midnight; [] = to be arranged
//   status    "Open" | "Closed" | "" (blank when an add code is required)
//   restr     "Restr" (class/major limits), ">" (add code required), "IS" (independent study), "IS >", or ""
//   other     UW codes: A online async, B hybrid, O online, W writing, H honors, J joint...
//   notes     the section's free-text notes, "--" separators dropped
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";

const decode = s => s.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

// UW prints 12-hour times without am/pm. Hours 1-6 are afternoon; a trailing P marks evening.
// ponytail: P is applied to both ends, so a P range starting before noon would misread; none seen.
const mins = (t, pm) => { let h = +t.slice(0, -2); if (pm ? h < 12 : h < 7) h += 12; return h * 60 + +t.slice(-2); };
const meeting = s => {
  const m = s.match(/^(\*|[MTWFSuh]+)\s+(\d{3,4})-(\d{3,4})(P?)/);
  if (!m) return null;
  const start = mins(m[2], m[4]); let end = mins(m[3], m[4]);
  if (end <= start) end += 720;
  return [m[1], start, end];
};

const COURSE = /<A NAME=[^>]+>([^<]+)<\/A>\s*&nbsp;\s*(?:<A [^>]*>)?([^<]*)/gi;
const ROW = /^ *(Restr|IS)? *(>)?(\d{5}) +(\S+) +(\S+) +(.*?) {2,}(Open|Closed)? *(\d+)\/ *(\d+)E? *(.*)$/;

export function parsePage(html) {
  const courses = {};
  const heads = [...html.matchAll(COURSE)];
  heads.forEach((h, i) => {
    const code = decode(h[1]).replace(/\s+/g, " ").trim();
    const body = html.slice(h.index + h[0].length, heads[i + 1]?.index ?? html.length);
    const sections = [];
    for (const line of decode(body).split(/\r?\n/)) {
      const r = line.match(ROW);
      if (r) {
        const m = meeting(r[6].trim());
        // Trailing columns are Grades, Fee, Other; only Other holds the modality letters.
        const tail = r[10].trim().split(/ +/).filter(t => t && !/^(CR\/NC|\$\d+)$/.test(t));
        const restr = [r[1], r[2]].filter(Boolean).join(" ");
        sections.push([+r[3], r[4], r[5], m ? [m] : [], r[7] || "", +r[8], +r[9], restr, tail.join(" "), ""]);
        continue;
      }
      const s = sections.at(-1);
      if (!s) continue;
      const extra = line.match(/^ {20,}(\*|[MTWFSuh]+ +\d{3,4}-\d{3,4}P?)/) && meeting(line.trim());
      if (extra) { s[3].push(extra); continue; }
      const note = line.trim();
      if (note && note !== "--") s[9] = (s[9] ? s[9] + " " : "") + note.replace(/\s+/g, " ");
    }
    if (sections.length) courses[code] = [decode(h[2]).trim(), sections];
  });
  return courses;
}

const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${r.status} ${url}`); return r.text(); };

async function build(qtr) {
  const base = `https://www.washington.edu/students/timeschd/pub/${qtr}/`;
  const pages = [...new Set([...(await get(base)).matchAll(/href="([a-z0-9]+\.html)"/g)].map(m => m[1]))];
  const courses = {};
  let i = 0, empty = 0;
  const worker = async () => {
    while (i < pages.length) {
      const page = pages[i++];
      let html;
      // The index lists every department; ones with no classes this quarter 404.
      try { html = await get(base + page); } catch (e) { if (e.message.startsWith("404")) empty++; else console.warn("skip", page, e.message); continue; }
      const parsed = parsePage(html);
      const want = new Set(html.match(/SLN=\d{5}/g)).size, got = Object.values(parsed).reduce((a, c) => a + c[1].length, 0);
      if (got !== want) console.warn(`${page}: parsed ${got} of ${want} sections, check the row format`);
      Object.assign(courses, parsed);
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  const sorted = Object.fromEntries(Object.entries(courses).sort(([a], [b]) => a.localeCompare(b, "en", { numeric: true })));
  mkdirSync(new URL("../schedule/", import.meta.url), { recursive: true });
  writeFileSync(new URL(`../schedule/${qtr}.json`, import.meta.url), JSON.stringify({ quarter: qtr, built: new Date().toISOString().slice(0, 10), courses: sorted }));
  // index.json tells the app which quarters have sections, so it only offers the optimizer where it can work.
  const built = readdirSync(new URL("../schedule/", import.meta.url)).map(f => f.match(/^([A-Z]{3}\d{4})\.json$/)?.[1]).filter(Boolean);
  writeFileSync(new URL("../schedule/index.json", import.meta.url), JSON.stringify(built));
  const n = Object.values(sorted).reduce((a, c) => a + c[1].length, 0);
  console.log(`schedule/${qtr}.json: ${Object.keys(sorted).length} courses, ${n} sections from ${pages.length - empty} pages (${empty} departments not offered)`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const qtrs = process.argv.slice(2);
  if (!qtrs.length || qtrs.some(q => !/^(AUT|WIN|SPR|SUM)\d{4}$/.test(q))) { console.error("usage: node scripts/build-schedule.mjs WIN2027 [AUT2026 ...]"); process.exit(1); }
  for (const q of qtrs) await build(q);
}
