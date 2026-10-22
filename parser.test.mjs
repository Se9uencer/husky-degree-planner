// Run: node parser.test.mjs — checks parseDars in index.html against the ways browsers copy the DARS table.
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const src = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const parseDars = new Function(src.slice(src.indexOf("/*PARSER-START*/"), src.indexOf("/*PARSER-END*/")) + ";return parseDars;")();

const rows = [
  ["AU25", "CSE 121", "COMP PROGRAMMING I", "4", "3.8", ""],
  ["SP26", "", "FOUNDATIONS COMP I", "4", "PL", ">PL"],
  ["AU25", "POL S 202", "INTRO AMERICAN POL", "5", "AP", ""],
  ["WI26", "", "MATRIX ALGEBRA", "4", "IP", ""],
  ["SP25", "MATH 1XX", "TRANSFER COURSE", "5", "4.0", "DP"],
];
const header = "Catalog Year:\nAU 25\nThe University requires a minimum of 180 academic credits.\nEarned: 30 credits In-progress: 4 credits\nQtr\nCourse Name\nCredits\nGrade\nNotes\n";
const build = sep => header + rows.map(r => r.join(sep)).join("\n");
const expected = [
  "AU25|CSE 121|COMP PROGRAMMING I|4|3.8",
  "SP26|FOUNDATIONS COMP I||4|PL",
  "AU25|POL S 202|INTRO AMERICAN POL|5|AP",
  "WI26|MATRIX ALGEBRA||4|IP",
  "SP25|MATH 1XX|TRANSFER COURSE|5|4.0",
];

for (const [name, text] of Object.entries({
  "cell per line": build("\n"),
  "CRLF": build("\n").replace(/\n/g, "\r\n"),
  "CR only": build("\n").replace(/\n/g, "\r"),
  "tab rows": build("\t"),
  "space rows": build(" "),
  "zero-width": build("\n").replace(/^(AU|WI|SP|SU)(\d{2})$/gm, "​$1$2​"),
})) {
  const r = parseDars(text);
  assert.deepEqual(r.courses.map(c => [c.qtr, c.code, c.title, c.credits, c.grade].join("|")), expected, name);
  assert.equal(r.catalogYear, "AU 25", name);
  assert.equal(r.earned, 30, name);
  assert.equal(r.startYear, 2025, name);
}
console.log("parseDars: all copy formats OK");
