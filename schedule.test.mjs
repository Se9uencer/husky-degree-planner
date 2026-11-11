// Run: node schedule.test.mjs — checks parsePage in scripts/build-schedule.mjs against real Time Schedule row formats.
import assert from "node:assert/strict";
import { parsePage } from "./scripts/build-schedule.mjs";

const head = (anchor, code, title) =>
  `<tr><td width="50%"><b><A NAME=${anchor}>${code}</A>&nbsp;<A HREF=/students/crscat/x.html#${anchor}>${title}</A></b></td></tr></table>\r\n<table width="100%" ><tr><td><pre>\r\n`;
const sln = n => `<A HREF=https://sdb.admin.washington.edu/timeschd/uwnetid/sln.asp?QTRYR=WIN+2027&SLN=${n}>${n}</A>`;

const html =
  head("cse121", "CSE&nbsp;&nbsp; 121 ", "COMP PROGRAMMING I") +
  `       ${sln(12737)} A  4       WF     1030-1120                                           Open      9/ 252                      \r\n` +
  `                        --                                                          <br/>                        SEE THE CSE 12X SELF-PLACEMENT                              <br/>                        --                                                          <br/></td></tr></table>\r\n` +
  `      >${sln(12769)} AF  QZ     TTh    130-220                                                      21/  21                      \r\n` +
  `                        ALLEN SCHOLARS ONLY                                         \r\n` +
  head("chem142", "CHEM&nbsp;&nbsp; 142 ", "GENERAL CHEMISTRY") +
  `       ${sln(12078)} AA  QZ     Th     830-920                                             Open      1/  24                      \r\n` +
  `                        T      930-1220                 \r\n` +
  `Restr  ${sln(12309)} A  4       T      830-920                                             Open      1/  20          $100  W     \r\n` +
  head("edc&i345", "EDC&I&nbsp;&nbsp; 345 ", "MTHDS TEACH MULTILNG") +
  ` IS   >${sln(12343)} A  VAR     to be arranged                                                       2/  15E CR/NC         R     \r\n` +
  `      >${sln(10065)} B  4       W      600-950P                                                      0/  10                O     \r\n`;

const c = parsePage(html);
assert.deepEqual(Object.keys(c), ["CSE 121", "CHEM 142", "EDC&I 345"]);
assert.equal(c["CSE 121"][0], "COMP PROGRAMMING I");

const [lec, quiz] = c["CSE 121"][1];
assert.deepEqual(lec, [12737, "A", "4", [["WF", 630, 680]], "Open", 9, 252, "", "", "SEE THE CSE 12X SELF-PLACEMENT"]);
assert.deepEqual(quiz, [12769, "AF", "QZ", [["TTh", 810, 860]], "", 21, 21, ">", "", "ALLEN SCHOLARS ONLY"], "1:30 is afternoon; > means add code");

const [lab, fee] = c["CHEM 142"][1];
assert.deepEqual(lab[3], [["Th", 510, 560], ["T", 570, 740]], "second meeting line joins the section above it");
assert.deepEqual([fee[7], fee[8]], ["Restr", "W"], "fee is dropped from the Other codes");

const [tba, evening] = c["EDC&I 345"][1];
assert.deepEqual([tba[3], tba[6], tba[7], tba[8]], [[], 15, "IS >", "R"], "TBA has no meetings; estimated limit E is stripped");
assert.deepEqual(evening[3], [["W", 1080, 1310]], "P marks evening");

console.log("schedule parser: all checks passed");

// Optimizer in index.html, between the SCHED markers.
import { readFileSync } from "node:fs";
const src = readFileSync(new URL("./index.html", import.meta.url), "utf8");
const bestSchedules = new Function(src.slice(src.indexOf("/*SCHED-START*/"), src.indexOf("/*SCHED-END*/")) + ";return bestSchedules;")();
const S = (sln, id, meetings, status = "Open", restr = "") => [sln, id, id.length > 1 ? "QZ" : "5", meetings, status, 0, 30, restr, "", ""];
const prefs = { start: 570, open: true, noAddCode: true };
const slns = r => r.best[0].picks.map(o => o.parts.map(s => s[0]));

const data = {
  "MATH 125": ["CALC II", [S(1, "A", [["MWF", 510, 560]]), S(2, "B", [["MWF", 630, 680]])]],
  "CSE 121": ["PROG I", [S(10, "A", [["MWF", 630, 680]]), S(11, "AA", [["TTh", 570, 620]]), S(12, "AB", [["TTh", 570, 620]]),
                         S(20, "B", [["MWF", 750, 800]]), S(21, "BA", [["TTh", 630, 680]], "Closed"), S(22, "BB", [["TTh", 690, 740]])]],
};
let r = bestSchedules(["MATH 125", "CSE 121"], data, prefs);
assert.deepEqual(slns(r), [[2], [20, 22]], "late math forces the B lecture, which pairs only with its own open quiz");
assert.deepEqual(r.best[0].picks[1].alts, [[], []], "a quiz from another lecture is never offered");
r = bestSchedules(["CSE 121"], data, prefs);
assert.deepEqual(slns(r), [[10, 11]], "same-time quizzes collapse into one option");
assert.deepEqual(r.best[0].picks[0].alts[1].map(s => s[0]), [12], "the twin quiz is kept as a backup");
r = bestSchedules(["MATH 125"], data, { ...prefs, start: 0 });
assert.equal(r.best.length, 2, "both math lectures rank when nothing is early");
r = bestSchedules(["MATH 125", "CSE 121", "PHYS 999"], { "MATH 125": data["MATH 125"], "CSE 121": ["X", [S(30, "A", [["MWF", 630, 680]])]] }, prefs);
assert.deepEqual(r.missing, ["PHYS 999"]);
assert.deepEqual(slns(r), [[1], [30]], "an 8:30 is picked when it's the only way to avoid a conflict");
r = bestSchedules(["A 1", "B 1"], { "A 1": ["", [S(40, "A", [["TTh", 600, 680]])]], "B 1": ["", [S(41, "A", [["Th", 650, 700]])]] }, prefs);
assert.deepEqual(r.best, [], "an unavoidable conflict returns no schedule");
r = bestSchedules(["A 1"], { "A 1": ["", [S(50, "A", [["MWF", 600, 650]], "Closed"), S(51, "B", [["MWF", 600, 650]], "", ">")]] }, { ...prefs, open: false });
assert.deepEqual(slns(r), [[50]], "with open-only off, a closed section beats an add-code one");

// Review fixes: the type column, not the ID, tells primaries from components; every component type is required.
const T = (sln, id, type, meetings, status = "Open") => [sln, id, type, meetings, status, 0, 30, "", "", ""];
const phys = ["", [T(60, "A", "5", [["MWF", 630, 680]]), T(61, "AA", "QZ", [["T", 570, 620]]), T(62, "AB", "QZ", [["Th", 570, 620]]),
                   T(63, "AM", "LB", [["T", 600, 710]]), T(64, "AN", "LB", [["W", 750, 860]])]];
r = bestSchedules(["PHYS 1"], { "PHYS 1": phys }, { ...prefs, start: 0 }, 10);
assert.ok(r.best.every(b => b.picks[0].parts.map(s => s[2]).join() === "5,QZ,LB"), "lecture + tutorial + lab, never one secondary alone");
assert.equal(r.best.length, 3, "AA clashes with the Tuesday lab AM, so that pair is dropped");
r = bestSchedules(["ENGL 1"], { "ENGL 1": ["", [T(70, "A", "5", [["MWF", 630, 680]]), T(71, "A1", "5", [["MWF", 750, 800]])]] }, prefs, 10);
assert.deepEqual(r.best.map(b => b.picks[0].parts.map(s => s[0])), [[70], [71]], "A1 with credits is its own section, not part of A");
r = bestSchedules(["BIOL 1"], { "BIOL 1": ["", [T(80, "A", "5", [["MWF", 630, 680]]), T(81, "A1", "LB", [["T", 750, 860]])]] }, prefs);
assert.deepEqual(slns(r), [[80, 81]], "A1 typed LB is A's lab");
r = bestSchedules(["X 1"], { "X 1": ["", [T(90, "A", "5", [["MWF", 630, 680]], "Closed")]] }, prefs);
assert.deepEqual([r.full, r.best], [["X 1"], []], "open-only drops closed sections and says which course has none left");
r = bestSchedules(["X 1"], { "X 1": ["", [T(91, "A", "5", [["MWF", 630, 680]]), T(92, "AA", "QZ", [["T", 630, 680]], "Closed"), T(93, "AB", "QZ", [["T", 480, 530]])]] }, prefs);
assert.deepEqual(slns(r), [[91, 93]], "an open 8:00 quiz beats a closed 10:30 one when open-only is on");
assert.deepEqual(bestSchedules(["X 1"], { "X 1": ["", [T(90, "A", "5", [["MWF", 630, 680]], "Closed")]] }, { ...prefs, open: false }).best.length, 1, "open-only off keeps closed sections");

console.log("section optimizer: all checks passed");
