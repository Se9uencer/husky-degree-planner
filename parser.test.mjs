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
// The start year is the earlier of the catalog year and the first UW-graded quarter; two-digit years far in the future are last century.
assert.equal(parseDars(header.replace("AU 25", "AU 26") + "AU25\nCSE 121\nCOMP PROGRAMMING I\n4\n3.8").startYear, 2025, "UW course before the catalog year");
assert.equal(parseDars(header.replace("AU 25", "AU 99") + "AU99\nCSE 121\nCOMP PROGRAMMING I\n4\n3.8").startYear, 1999, "far-future yy is 19yy");

const physRows = [["MECHANICS", 4, "PHYS 114"], ["MECHANICS", 5, "PHYS 121"], ["HEAT FLUIDS E&M", 4, "PHYS 115"], ["HEAT & ELCTROMAG LAB", 1, "PHYS 118"], ["GEN LAB MODERN PHYS", 1, "PHYS 119"]];
assert.deepEqual(parseDars(header + physRows.map(([t, cr]) => ["AU25", t, cr, "AP"].join("\n")).join("\n")).courses.map(c => c.code), physRows.map(r => r[2]), "AP physics titles");
console.log("parseDars: AP physics titles OK");

// Section layout of a Computer Engineering audit, with made-up rows.
const ceAudit = parseDars(`Catalog Year:
WI 27
AREAS OF INQUIRY
Social Sciences
SP26
INTRO MACROECON
5
AP
DEPARTMENTAL REQUIREMENTS
ADMISSION REQUIREMENTS
3 ) Mathematics
SU26
TRANSFER COURSE
5
3.4
GRADUATION REQUIREMENTS
NATURAL SCIENCES
Computer Engr Requirement: Mathematics
1 ) First-quarter calculus
SP26
CALC ANALYT GEOM I
5
AP
3 ) Third-quarter calculus
SU26
TRANSFER COURSE
5
3.4
Computer Engr: Natural Science Electives
SP26
GENERAL CHEM I
5
AP
COMPUTER ENGINEERING: FUNDAMENTAL COURSES (32-33 Credits). Minimum 2.0 grade in each course.
1 )  or
AU26
COMP PROGRAMMING III
4
IP
COMPUTER ENGINEERING: COE CREDITS 36 College of Engineering prefix credits
AU26
SOFTWARE TOOLS
1
IP
OTHER COURSES
AU26
OTHER TRANSFER
5
3.0
`);
const ceRow = code => ceAudit.courses.find(c => c.code === code);
assert.deepEqual(ceRow("ECON 201").tags, ["SSc"]);
assert.deepEqual(ceRow("MATH 124").tags, ["NSc"], "stays in the science section across sub-requirements");
assert.deepEqual(ceRow("CHEM 142").tags, ["NSc"]);
assert.deepEqual(ceRow("CSE 123").tags, [], "all-caps major header ends the science section");
assert.deepEqual(ceRow("CSE 391").tags, [], "all-caps major header ends the science section");
assert.equal(ceRow("MATH 126").title, "Transfer credit", "transfer row takes the code of the calculus slot it fills");
assert.equal(ceAudit.courses.filter(c => c.credits === 5 && c.qtr === "SU26").length, 1, "a row repeated across sections is one course");
assert.ok(!ceAudit.courses.some(c => c.code === "TRANSFER COURSE"));
console.log("parseDars: Computer Engineering audit layout OK");

// Foster writes area headers with extra words and numbers its writing sections. Made-up rows.
const foster = parseDars(`FOSTER SCHOOL
GENERAL EDUCATION REQUIREMENTS
AREAS OF INQUIRY
Arts and Humanities
20 credits
SP26
ART H 201
ART HISTORY
5
3.0
Social Sciences 20 credits, including ECON 200 and :
2 ) Introduction to Macroeconomics:
SP26
INTRO MACROECON
5
AP
Natural Sciences 19 - 20 credits, including  or . (Note: one credit can be waived.)
SP26
CALC ANALYT GEOM I
5
AP
Other Foster School Requirements
1. English Composition Course
SP26
ENGL 131
COMPOSITION
5
3.0
2. Writing, Parts A and B
1 ) Part A Writing: One course from , , .
SP26
B CMU 301
BUSINESS WRITING
4
3.0
2 ) Part B Writing: One additional approved composition or "W" course.
SP26
HIST 200
HISTORY WRITING
5
3.0
BUSINESS ADMINISTRATION CORE COURSES
1 ) Business Finance () <4>
SP26
FIN 350
BUSINESS FINANCE
4
3.0
`);
const fosterTags = code => foster.courses.find(c => c.code === code).tags;
assert.deepEqual(fosterTags("ART H 201"), ["A&H"]);
assert.deepEqual(fosterTags("ECON 201"), ["SSc"], "header with extra words still starts Social Sciences");
assert.deepEqual(fosterTags("MATH 124"), ["NSc"], "header with extra words still starts Natural Sciences");
assert.deepEqual(fosterTags("ENGL 131"), ["C"], "numbered composition section");
assert.deepEqual(fosterTags("B CMU 301"), ["W"], "Part A writing");
assert.deepEqual(fosterTags("HIST 200"), ["W"], "Part B writing");
assert.deepEqual(fosterTags("FIN 350"), [], "major courses carry no gen-ed tag");

// Engineering writing sub-requirements, ECE's whole-sequence calculus row, and AP statistics. Made-up rows.
const eceAudit = parseDars(`ENGINEERING GENERAL EDUCATION REQUIREMENTS
Written Communication
1 ) 5 credits in English composition at 2.0 or better.
SP26
ENGL 131
COMPOSITION
5
3.0
2 ) Additional Writing
SP26
HIST 200
HISTORY WRITING
3
3.0
3 ) 4 credits met by coursework in the major.
Diversity Course
DEPARTMENTAL REQUIREMENTS
ADMISSION NOTES
3 ) Mathematics
SU26
TRANSFER COURSE
5
3.4
1 ) Calculus with Analytical Geometry: MATH 124-126.  or ,  or .
SP26
CALC ANALYT GEOM I
5
AP
SP26
CALC ANALYT GEOM II
5
AP
SU26
TRANSFER COURSE
5
3.4
2 ) Statistics:  or
OTHER COURSES
SP26
AP STATISTICS
5
AP
`);
assert.deepEqual(eceAudit.courses.find(c => c.code === "ENGL 131").tags, ["C"]);
assert.deepEqual(eceAudit.courses.find(c => c.code === "HIST 200").tags, ["W"]);
assert.equal(eceAudit.courses.find(c => c.code === "MATH 126").title, "Transfer credit", "transfer fills the gap in the calculus sequence");
assert.ok(!eceAudit.courses.some(c => c.code === "TRANSFER COURSE"));
assert.equal(eceAudit.courses.find(c => c.code === "STAT 290").title, "AP STATISTICS");
const fixedMath = parseDars("3 ) Mathematics\nSP26\nTRANSFER COURSE\n5\n3.4\n").courses[0];
assert.equal(fixedMath.code, "TRANSFER COURSE", "an admission math row doesn't say which course it is");
console.log("parseDars: Foster and ECE audit layouts OK");

// CS audits copy as tab-separated rows with an empty code cell, and split credit carries a ">S" note. Made-up rows.
const csAudit = parseDars(["Catalog Year:", "AU 26", "The University requires a minimum of 180 academic credits for a Bachelors degree.", "Earned: 90 credits In-progress: 16 credits Needs: 74 credits",
  "Natural Sciences", "SP26\t\tHEAT FLUIDS E&M\t3\tAP\t>S",
  "DEPARTMENTAL REQUIREMENTS", "Computer Science Requirement: Natural Science", "SP26\t\tGENERAL CHEM I\t5\tAP\t",
  "Computer Science Requirement: Mathematics", "Calculus: MATH 124-126 plus ", "Qtr\tCourse Name\tCredits\tGrade\tNotes", "SP26\t\tCALC ANALYT GEOM I\t5\tAP\t", "SP26\t\tCALC ANALYT GEOM II\t5\tAP\t", "SU26\t\tTRANSFER COURSE\t5\t3.4\t",
  "OR ) ,  and ", "Computer Science Requirement: Fundamental Courses", "1 ) Introductory Programming", "AU26\t\tCOMP PROGRAMMING III\t4\tIP\t",
  "Computer Science Requirement: Core and Electives", "1 ) Four CSE courses from the CSE Core Course list numbered 400 or higher.", "AU26\tCSE 451\tOPERATING SYSTEMS\t4\tIP\t",
  "OTHER COURSES", "General Electives: The following courses count.", "SP26\t\tHEAT FLUIDS E&M\t1\tAP\t>S", "SP26\t\tOTHER TRANSFER\t5\tAP\t"].join("\n"));
const csRow = code => csAudit.courses.filter(c => c.code === code);
assert.equal(csAudit.earned, 90, "earned credits on a line with other totals");
assert.equal(csRow("MATH 126")[0].title, "Transfer credit", "CS lists calculus without a number");
assert.deepEqual(csRow("CHEM 142")[0].tags, ["CS Sci"]);
assert.deepEqual(csRow("CSE 451")[0].tags, ["CS Core"]);
assert.deepEqual(csRow("PHYS 115").map(c => c.credits), [3, 1], "split credit keeps both parts");
assert.deepEqual(csRow("CSE 123")[0].tags, [], "Fundamental Courses section carries no tag");
console.log("parseDars: CS audit layout OK");

const cseTag = new Function(src.slice(src.indexOf("/*CSETAGS-START*/"), src.indexOf("/*CSETAGS-END*/")) + ";return cseTag;")();
for (const [code, tag] of Object.entries({
  "CSE 333": "CS Core", "cse 446": "CS Core", "CSE493G": "CS Core", "EE 371": "CS Core", "E E 469": "CS Core", "STAT 391": "CS Core",
  "CSE 481": "Capstone", "CSE 481 S": "Capstone", "CSE 428": "Capstone",
  "CSE 490": "CSE Elective", "CSE 498": "CSE Elective", "CSE 480": "CSE Elective", "MATH 407": "CSE Elective", "E E 433": "CSE Elective", "GEN ST 350": "CSE Elective",
  "CSE 331": null, "CSE 311": null, "CSE 414": null, "CSE 499": null, "E E 471": null, "MATH 126": null, "PHIL 118": null, "": null,
})) assert.equal(cseTag(code), tag, code);
console.log("cseTag: Allen School lists OK");

const ethicsTag = new Function(src.slice(src.indexOf("/*ETHICSTAGS-START*/"), src.indexOf("/*ETHICSTAGS-END*/")) + ";return ethicsTag;")();
for (const [code, tag] of Object.entries({
  "PHIL 240": "Ethics A", "phil240": "Ethics A", "B H 402": "Ethics A", "ENVIR 416": "Ethics A", "ETHICS 291": "Ethics A", "POL S 217": "Ethics A",
  "ANTH 211": "Ethics B", "AES 211": "Ethics B", "ENVIR 211": "Ethics B", "HSERV 415": "Ethics B", "LSJ 320": "Ethics B", "JSIS B 350": "Ethics B",
  "ETHICS 495": null, "PHIL 100": null, "SERV 415": null, "CSE 311": null, "": null,
})) assert.equal(ethicsTag(code), tag, code);
console.log("ethicsTag: UW Ethics minor lists OK");

const resolveShortTitle = new Function(src.slice(src.indexOf("/*MATCH-START*/"), src.indexOf("/*MATCH-END*/")) + ";return resolveShortTitle;")();
const list = JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8")).courses.map(([code, title]) => ({ code, title }));
for (const [short, code] of Object.entries({
  "CALC ANYL GEOM III": "MATH 126", "MATRIX ALGEBRA": "MATH 208", "FOUNDATIONS COMP I": "CSE 311", "FOUNDATIONS COMP II": "CSE 312",
  "SW DESIGN & IMPL": "CSE 331", "DATA STRUC & PRLLEL": "CSE 332", "HW SW INTERFACE": "CSE 351", "SYSTEMS PROGRAMMING": "CSE 333",
  "NAT LANG PROCESSING": "CSE 447", "ARTIFICIAL INTEL": "CSE 473",
  "MECHANICS": null, "INTERMEDIATE FRENCH": null, "TRANSFER COURSE": null, "AP ENGLISH": null,
})) assert.equal(resolveShortTitle(list, short), code, short);
console.log("resolveShortTitle: DARS abbreviations OK");

const addCatalogGen = new Function(src.slice(src.indexOf("/*MATCH-START*/"), src.indexOf("/*MATCH-END*/")) + ";return addCatalogGen;")();
const byCode = new Map([["PHIL118", { tags: ["SSc"] }], ["PSYCH357", { tags: ["NSc", "DIV"] }], ["HCDE411", { tags: ["SSc", "A&H"] }]]);
const gen = (code, ...tags) => { const c = { code, tags }; addCatalogGen(c, byCode); return c.tags; };
assert.deepEqual(gen("PHIL 118", "Ethics A"), ["Ethics A", "SSc"], "fills a missing area");
assert.deepEqual(gen("PSYCH 357", "SSc"), ["SSc", "DIV"], "keeps the DARS area but still adds DIV");
assert.deepEqual(gen("HCDE 411", "A&H"), ["A&H"], "doesn't add a second area");
assert.deepEqual(gen("UW 115"), [], "leaves courses outside the catalog alone");
console.log("addCatalogGen: catalog designations OK");

const block = name => src.slice(src.indexOf(`/*${name}-START*/`), src.indexOf(`/*${name}-END*/`));
const { MAJORS, COLLEGES, planReqs, canonCode, evalAll, isDoubleDegree } = new Function(
  block("CSETAGS") + block("MAJORS") + block("EVAL") + ";return {MAJORS,COLLEGES,planReqs,canonCode,evalAll,isDoubleDegree};")();

// Every code a major names must exist in the catalog, so a typo can't slip in. Ranges like COM:201-299 cover numbers that don't exist, so only single numbers are checked.
const catalog = new Set(list.map(c => c.code));
// On a department's published list but not in the course catalog, checked by hand against the catalog pages. Kept so students who took them still get credit.
const NOT_IN_CATALOG = new Set("CHEM 399,CHEM 410,ENGL 391,ENGL 411,ESRM 457,AMATH 424,ANTH 497,ATMOS 460,BIOEN 447,BIOL 305,BIOL 325,BIOL 333,BIOL 409,BIOL 415,BIOL 419,BIOL 422,BIOL 437,BIOL 455,BIOL 472,CEE 402,CEE 403,CEE 495,CHEM 144,COM 325,COM 332,COM 426,COM 434,COM 463,CSE 466,CSE 467,CSE 471,E E 235,E E 341,E E 401,E E 414,E E 485,ESS 211,ESS 213,ESS 403,ESS 413,ESS 415,ESS 424,ESS 437,ESS 458,ESS 464,ESS 466,ESS 471,GEOG 349,LSJ 425,M E 406,M E 442,NEAR E 285,PGH 301,PHIL 408,PHYS 315,PHYS 424,PHYS 425,PHYS 426,PHYS 460,POL S 285,POL S 473,PSYCH 494,SCAND 402,CHEM 335,FISH 404,GENOME 414,NUTR 446,FISH 330,ENVIR 330,FHL 445,ANTH 374,BIO A 468,BIOL 380,COM 201,EPI 325,EPI 494,G H 308,GEOG 371,GWSS 283,INFO 100,INFO 101,MELC 315".split(","));
const RANGE_CODE = /^(INFO 35\d|COM 2\d\d|ACCTG [34]\d\d|MGMT 40\d|POL S 20\d)$/;
const missing = new Map();
const flag = (code, id) => { if (!catalog.has(code) && !NOT_IN_CATALOG.has(code)) missing.set(code, id); };
for (const m of Object.values(MAJORS)) {
  assert.ok(COLLEGES[m.college], m.id + " college");
  assert.ok(m.reqs.length, m.id + " has requirements");
  const reqs = planReqs([m.id]);
  assert.equal(new Set(reqs.map(r => r.id)).size, reqs.length, m.id + " requirement ids are unique");
  assert.ok(reqs.some(r => r.id === "total" && r.need === (m.gen?.total || 180)), m.id + " total");
  for (const r of reqs) {
    if (r.group !== m.id && r.id !== "nsc") continue;
    for (const code of [...(r.options || []).flat(2), ...(r.codes || [])]) if (!RANGE_CODE.test(code)) flag(code, m.id);
    for (const t of r.tags || []) if (t !== "NSc") assert.ok(m.tags.includes(t), `${m.id}: ${r.id} uses unknown tag ${t}`);
    assert.ok(r.type === "courses" || typeof r.need === "number", `${m.id}: ${r.id} need`);
  }
  for (const s of Object.values(m.lists || {})) for (const g of s.split(";").filter(Boolean)) {
    const [d, ns] = g.split(":");
    for (const n of ns.split(",")) if (!n.includes("-")) flag(d + " " + n, m.id);
  }
}
assert.deepEqual([...missing].map(([code, id]) => `${code} (${id})`).sort(), [], "codes not in the catalog");
console.log(`majors: ${Object.keys(MAJORS).length} majors and options, course codes checked against the catalog`);
const listed = readFileSync(new URL("./MAJORS.md", import.meta.url), "utf8");
assert.equal((listed.match(/^- \[x\] /gm) || []).length, Object.keys(MAJORS).length, "MAJORS.md marks every program the app supports");

for (const [code, want] of Object.entries({ "me323": "M E 323", "EE 215": "E E 215", "pols 203": "POL S 203", "M E 323": "M E 323", "CSE493G": "CSE 493G", "TRANSFER CAP": "TRANSFER CAP" })) assert.equal(canonCode(code), want, code);

const course0 = (code, credits, ...tags) => ({ id: code, code, credits, tags, status: "plan" });

// Plans saved before this change must keep their CS requirements and ids.
assert.deepEqual(planReqs(["cs"]).map(r => r.id), ["total","res","comp","w","div","ah","ssc","nsc","aoi","math","sci","fund","core","core7","elec","ethA","ethB","eth495","ethTot","ethUD","minor"]);
const needOf = (ids, id) => planReqs(ids).find(r => r.id === id).need;
assert.equal(needOf(["cs"], "aoi"), 75); assert.equal(needOf(["me"], "nsc"), 49); assert.equal(needOf(["ce"], "aoi"), 30); assert.equal(needOf(["info"], "ah"), 20);
assert.ok(!planReqs(["info"]).some(r => r.id === "aoi"), "iSchool has no Areas of Inquiry total");
assert.ok(!planReqs(["bioe"]).some(r => r.id === "w"), "Bioengineering writing is met by the major");
assert.ok(planReqs(["psych-bs", "econ-ba"]).some(r => r.group === "econ-ba"), "double major keeps both");

// Majors in different colleges need both gen-ed sets. Totals follow the degree names.
assert.equal(needOf(["me", "cs"], "nsc"), 49); assert.equal(needOf(["me", "cs"], "gen-as.nsc"), 20); assert.equal(needOf(["me", "cs"], "gen-as.aoi"), 75);
assert.equal(planReqs(["me", "cs"]).filter(r => /(^|\.)total$/.test(r.id)).length, 1, "only one total-credit requirement");
assert.equal(planReqs(["me", "cs"]).filter(r => /(^|\.)res$/.test(r.id)).length, 1, "only one residency requirement");
assert.ok(!planReqs(["psych-bs", "biol-bs"]).some(r => r.group.startsWith("gen-")), "same college needs one set");
assert.equal(planReqs(["cs", "info", "me"]).filter(r => r.group.startsWith("gen")).map(r => r.group).filter((g, i, a) => a.indexOf(g) === i).length, 3, "three colleges, three sets");
for (const [ids, double] of [[["psych-bs", "biol-bs"], false], [["psych-ba", "com"], false], [["psych-ba", "biol-bs"], true], [["cs", "psych-bs"], false], [["cs", "ce"], true], [["bus-fin", "econ-ba"], true], [["bus-fin", "bus-mktg"], false], [["me", "me-mech"], false], [["cs"], false]]) {
  assert.equal(isDoubleDegree(ids), double, ids.join(" + "));
  assert.equal(needOf(ids, "total"), double ? 225 : 180, ids.join(" + ") + " total");
  assert.equal(needOf(ids, "res"), double ? 90 : 45, ids.join(" + ") + " residency");
}
const both = planReqs(["me", "cs"]), bothE = evalAll(both, [course0("HUM 100", 5, "A&H")]);
assert.equal(bothE.get(both.find(r => r.id === "ah")).have, 5); assert.equal(bothE.get(both.find(r => r.id === "gen-as.ah")).have, 5, "one course counts toward both colleges' sets");

for (const [id, code, tag] of [["cs","CHEM 142","CS Sci"],["phil","PHIL 450","PHIL 400-level"],["phil-eth","PHIL 498","PHIL 400-level"],["phil-eth","PHIL 412","PHIL Ethics"],["cs","PHYS 121","CS Sci"],["biol-bs","BIOL 472","Bio Ecology"],["biol-bs","BIOL 472","Bio Lab"],["econ-ba","ECON 482","ECON 400-level"],["com","COM 373","COM Methods"],["com","COM 373","COM Theory"],["pols","POL S 321","POL S 210+"],["ce","CSE 451","CE Systems"],["ce","CSE 331","CS Core"],["me","ME 402","ME Option"],["bioe","BIOEN 485","BioE Senior"],["cs","CSE 333","CS Core"]])
  assert.ok(MAJORS[id].tagsFor(code).includes(tag), `${id}: ${code} should be ${tag}`);
for (const [id, code, tag] of [["phil","PHIL 484","PHIL 400-level"],["phil","PHIL 498","PHIL 400-level"],["phil-eth","PHIL 450","PHIL Ethics"],["econ-ba","ECON 499","ECON 400-level"],["pols","POL S 499","POL S 210+"],["ce","CSE 369","CS Core"],["acms-ds","STAT 311","ACMS Elective"]])
  assert.ok(!MAJORS[id].tagsFor(code).includes(tag), `${id}: ${code} should not be ${tag}`);
console.log("majors: tags and college gen-eds OK");

// A required course can't also count as an "additional" one.
let n = 0;
const course = (code, credits, ...tags) => ({ id: "c" + n++, code, credits, tags, status: "plan" });
const results = (id, courses) => { const reqs = planReqs([id]); const e = evalAll(reqs, courses); return k => e.get(reqs.find(r => r.id === id + "." + k)); };
const psych = results("psych-bs", ["PSYCH 300","PSYCH 303","PSYCH 302"].map(c => course(c, 5, "PSYCH Upper")).concat(course("PSYCH 440", 5, "PSYCH Upper"), course("PSYCH 441", 5, "PSYCH Upper")));
assert.ok(psych("a").met && psych("b").met && psych("ab").met, "group picks");
assert.equal(psych("ud").have, 2, "only courses the groups didn't use count as more upper-division");
assert.equal(psych("ud").extra, "2/2 at 400-level");
const econ = results("econ-bs-strat", [course("ECON 404", 5), course("ECON 411", 5), course("ECON 400", 5), course("ECON 482", 5)]);
assert.ok(econ("str").met, "strategy core takes ECON 404");
assert.equal(econ("two").have, 1, "ECON 404 can't also be one of the two picks");
const ece = results("ece", [course("E E 475", 4, "ECE Elective"), course("E E 416", 4, "ECE Elective")]);
assert.ok(ece("cap").met, "capstone");
assert.equal(ece("elec").have, 4, "the capstone doesn't count toward electives");
assert.equal(ece("up4").have, 4, "the 400-level rule ignores the capstone too");
const bio = results("biol-ba", [course("BIOL 401", 4, "Bio Molecular"), course("BIOL 411", 4, "Bio Molecular"), course("BIOL 416", 3, "Bio Molecular")]);
assert.equal(bio("mol").have, 11, "molecular shows all its credits");
assert.equal(bio("elec").have, 3, "only the course molecular didn't need spills into electives");
const dept = results("psych-ba", [course("PSYCH 101", 5), course("SOC 110", 5), course("ANTH 100", 5)]);
assert.equal(dept("tot").have, 5, "department total counts only that department");
assert.equal(dept("soc").have, 2);
const pols = results("pols-sec", [course("POL S 349", 5, "POL S 210+", "Intl Security")]);
assert.equal(pols("up").have, 1); assert.equal(pols("elec").have, 5, "option credits may overlap the major");
const ph = results("ph-bs-gh", [course("G H 101", 5), ...["G H 305","G H 401","G H 402"].map(c => course(c, 3, "PH Elective")), course("G H 410", 5, "PH Elective"),
  course("PSYCH 101", 5, "PH Breadth"), course("PSYCH 202", 5, "PH Breadth"), course("SOC 300", 5, "PH Breadth", "PH Elective")]);
assert.ok(ph("gh").met, "Global Health takes G H 305, 401 and 402");
assert.equal(ph("elec").have, 14, "those courses still count toward electives, but breadth courses don't");
assert.equal(ph("ghcr").have, 14); assert.equal(ph("sbs").have, 15);
assert.ok(!ph("sbs").met, "breadth needs three different prefixes"); assert.equal(ph("sbs").extra, "2/3 prefixes");
const phBreadth = results("ph-ba", [course("PSYCH 101", 5, "PH Breadth"), course("PSYCH 202", 5, "PH Breadth"), course("SOC 110", 5, "PH Breadth"), course("ANTH 302", 5, "PH Breadth", "PH Elective")]);
assert.ok(phBreadth("sbs").met, "the third prefix is claimed for breadth");
assert.equal(phBreadth("elec").have, 0, "so it can't also be an elective");
const phEP = results("ph-ba-ep", [...["HSERV 343","HSERV 344","HSERV 345"].map(c => course(c, 5, "PH Elective")), course("SPH 495", 1)]);
assert.ok(phEP("ereq").met); assert.equal(phEP("elec").have, 16); assert.ok(!phEP("elec").met, "a short internship leaves electives under 20 credits");
for (const id of ["ph-bs", "ph-bs-gh"]) {
  const bs = results(id, [course("CHEM 223", 4, ...MAJORS[id].tagsFor("CHEM 223")), course("CHEM 224", 4, ...MAJORS[id].tagsFor("CHEM 224")), course("BIOC 405", 3, ...MAJORS[id].tagsFor("BIOC 405"))]);
  assert.equal(bs("bsmore").have, 11, id + ": CHEM 223 and 224 count as BS selectives");
}
assert.ok(MAJORS["ph-ba"].tagsFor("CHSTU 101").includes("PH Breadth"));
const ceReqs = planReqs(["ce"]), ceNsc = ceReqs.find(r => r.id === "nsc");
const ceE = evalAll(ceReqs, [course("MATH 124", 5, "NSc"), course("CHEM 142", 5, "NSc", "CE Sci"), course("CSE 121", 4, "NSc"), course("PHYS 114", 4, "NSc")]);
assert.equal(ceE.get(ceNsc).have, 10, "Computer Engineering NSc counts math and approved science, not CSE 121 or PHYS 114");
const phil = results("phil-eth", [course("PHIL 120", 5), course("PHIL 340", 5, "PHIL Ethics"), course("PHIL 342", 5, "PHIL Ethics"), course("PHIL 412", 5, "PHIL 400-level", "PHIL Ethics"), course("PHIL 450", 5, "PHIL 400-level")]);
assert.ok(phil("logic").met && phil("ancient").met && phil("modern").met, "Philosophy history and logic");
assert.equal(phil("four").have, 2); assert.equal(phil("tot").have, 25);
assert.equal(phil("eth").have, 15, "required ethics courses also count toward the ethics list");
assert.equal(phil("eth4").have, 1, "only 400-level courses count toward the two");
const hist = results("hist-war", [course("HSTAA 101", 5, "Modern"), course("HSTAA 202", 5, "Modern", "War & Society"), course("HSTEU 301", 5, "Pre-Modern", "War & Society"), course("HSTAM 111", 5, "Pre-Modern", "War & Society"), course("HSTRY 100", 5)]);
assert.equal(hist("fields").have, 2, "one course per field, Europe counts once, and HSTRY isn't a field");
assert.equal(hist("tot").have, 25); assert.equal(hist("pre").have, 10); assert.equal(hist("opt").have, 15); assert.equal(hist("optud").have, 5);
const soc = results("soc", [course("STAT 290", 5), course("SOC 110", 5, "SOC Elective"), course("SOC 350", 5, "SOC Upper", "SOC Elective")]);
assert.equal(soc("tot").have, 15, "statistics counts toward the 50 major credits"); assert.equal(soc("ud").have, 5); assert.equal(soc("intro").have, 5);
assert.deepEqual(MAJORS["bioc-ba"].tagsFor("PHYS 117"), ["Biochem Elective"]); assert.deepEqual(MAJORS["bioc-bs"].tagsFor("PHYS 117"), []);
for (const ids of [["bioc-bs"], ["cs", "bioc-bs"]]) assert.equal(planReqs(ids).find(r => r.id === "total").need, 193, "Biochemistry BS needs 193 credits, first or second");
assert.equal(planReqs(["bioc-bs", "hist"]).find(r => r.id === "total").need, 225, "a double degree still needs 225");
const asReqs = planReqs(["psych-ba"]), asE = evalAll(asReqs, [course("CSE 121", 4, "NSc")]);
assert.equal(asE.get(asReqs.find(r => r.id === "nsc")).have, 4, "Arts & Sciences still counts any NSc course");

// Engineering natural sciences count only what the department names.
const credits = new Map(JSON.parse(readFileSync(new URL("./catalog.json", import.meta.url), "utf8")).courses.map(([code, , cr]) => [code, parseFloat(cr)]));
const nscHave = (id, codes) => {
  const reqs = planReqs([id]), r = reqs.find(x => x.id === "nsc");
  const courses = codes.map(c => course(c, credits.get(c) || 5, "NSc", ...MAJORS[id].tagsFor(c)));
  return { ...evalAll(reqs, courses).get(r) };
};
for (const m of Object.values(MAJORS).filter(m => m.college === "eng")) assert.equal(nscHave(m.id, ["CSE 121", "M E 123", "PHYS 114"]).have, 0, m.id + " ignores other NSc courses");
const CALC = ["MATH 124", "MATH 125", "MATH 126"], ENG_ALG = ["MATH 207", "MATH 208"], CH2 = ["CHEM 142", "CHEM 152"], PH3 = ["PHYS 121", "PHYS 122", "PHYS 123"];
assert.ok(nscHave("me", [...CALC, ...ENG_ALG, "MATH 224", "IND E 315", ...CH2, ...PH3]).met, "Mechanical's required courses reach its total");
assert.ok(nscHave("civ", [...CALC, ...ENG_ALG, "STAT 390", ...CH2, ...PH3, "ESS 101"]).met, "Civil's required courses and science elective reach its total");
assert.ok(nscHave("bioe", [...CALC, ...ENG_ALG, "STAT 390", ...CH2, "CHEM 162", "CHEM 223", "PHYS 121", "PHYS 122", "BIOL 180", "BIOL 200", "BIOL 220"]).met, "Bioengineering's required courses reach its total");
const ECE_BASE = ["MATH 134", "MATH 135", "MATH 136", "PHYS 121", "PHYS 122", "CHEM 142", "BIOL 220", "IND E 315"];
assert.ok(!nscHave("ece", ECE_BASE).met, "ECE's accelerated math path needs more from its approved list");
assert.equal(nscHave("ece", [...ECE_BASE, "CSE 121"]).have, nscHave("ece", ECE_BASE).have, "a course off the ECE list adds nothing");
assert.ok(nscHave("ece", [...ECE_BASE, "MATH 224", "BIOL 180"]).met, "approved ECE courses close the gap");
for (const [c, want] of [["MATH 124", true], ["MATH 111", false], ["PHYS 200", true], ["PHYS 114", false], ["CHEM 152", true], ["CHEM 162", false], ["BIOL 180", true], ["BIOL 162", false], ["NEUSCI 301", true], ["STAT 395", true], ["STAT 311", false]])
  assert.equal(MAJORS.ece.tagsFor(c).includes("ECE Science"), want, c + " on the ECE science list");
const cs = planReqs(["cs"]), csE = evalAll(cs, [course("CSE 333", 4, "CS Core")]);
assert.equal(csE.get(cs.find(r => r.id === "core")).have, 1); assert.equal(csE.get(cs.find(r => r.id === "elec")).have, 4, "CS electives still include core");
const oc = planReqs(["ocean-ba"]), ocOut = cs => evalAll(oc, cs).get(oc.find(r => r.id === "nscOut")).have;
assert.equal(ocOut([course0("MATH 124", 5, "NSc"), course0("MATH 125", 5, "NSc"), course0("CHEM 162", 5, "NSc")]), 5, "College of the Environment: courses the major used don't count as NSc outside the major");
const geo = planReqs(["ess-geo"]), geoOut = evalAll(geo, [course0("ESS 101", 5, "NSc"), course0("ESS 102", 5, "NSc")]).get(geo.find(r => r.id === "nscOut"));
assert.equal(geoOut.have, 0, "College of the Environment: unused courses with the major's prefix don't count as NSc outside the major"); assert.equal(geoOut.met, false);
for (const m of Object.values(MAJORS)) if (COLLEGES[m.college].out) assert.ok(m.prefix, m.id + " needs a prefix for its out-of-major rule");
assert.equal(isDoubleDegree(["ocean-ba", "ocean-bs"]), true); assert.equal(isDoubleDegree(["ocean-bs", "biol-bs"]), false);
console.log("evalAll: additional requirements don't double-count");

// DARS repeats a course's credits as ">S" fragments in other requirements; the whole row is kept and the fragments dropped (real audit: CHEM 152 as 5, 2 and 3).
{
  const split = "Catalog Year:\nAU 26\nSP26\nGENERAL CHEM II\n5\nAP\nSP26\nGENERAL CHEM II\n2\nAP\n>S\nSP26\nGENERAL CHEM II\n3\nAP\n>S\nSP26\nMECHANICS\n1\nAP\n>S\nSP26\nMECHANICS\n3\nAP\n>S\n";
  assert.deepEqual(parseDars(split).courses.map(c => c.code + "|" + c.credits), ["CHEM 152|5", "MECHANICS|1", "MECHANICS|3"], "fragments of a course listed in full are dropped; ones with no full row are kept");
  console.log("parser: >S split rows OK");
}

// Biology: Molecular, Cellular & Developmental: surplus natural history earns elective credit, Marine Botany counts as a lab, and approved research (4+ credits, tagged by the student) stands in for the MCD lab.
{
  const m = MAJORS["biol-mcd"];
  const mk = (code, credits, extra = []) => ({ id: code, code, credits, status: "done", origin: "uw", tags: [...m.tagsFor(code), ...extra] });
  const run = courses => { const out = evalAll(planReqs(["biol-mcd"]).filter(r => r.group === "biol-mcd"), courses); return id => out.get([...out.keys()].find(r => r.id === "biol-mcd." + id)); };
  let r = run([mk("BIOL 280", 4), mk("BIOL 311", 5)]);
  assert.ok(r("nh").met && r("adv").have === 5, "one natural-history course is claimed, the surplus one counts toward the 31 advanced credits");
  for (const code of ["BIOL 445", "FHL 445"]) {
    assert.ok(m.tagsFor(code).includes("MCD Any Lab") && m.tagsFor(code).includes("MCD NatHist"), code + " is a natural-history lab");
    assert.equal(run([mk(code, 5)])("labs").have, 1, code + " counts toward the two labs");
  }
  assert.ok(run([mk("BIOL 499", 4, ["MCD Research"])])("mlab").met, "approved 4-credit research satisfies the MCD lab");
  assert.ok(!run([mk("BIOL 499", 3, ["MCD Research"])])("mlab").met, "3 research credits are not enough");
  assert.equal(run([mk("BIOL 499", 3, ["MCD Research"])])("labs").have, 0, "3 research credits do not count as a lab either");
  assert.ok(!run([mk("BIOL 499", 4)])("mlab").met, "untagged research does not count");
  r = run([mk("BIOL 499", 4, ["MCD Research"]), mk("MICROM 499", 4, ["MCD Research"])]);
  assert.equal(r("labs").have, 1, "two research projects substitute for only one lab");
  assert.ok(!r("labs").met, "two research projects do not satisfy both labs");
  r = run([mk("BIOL 499", 4, ["MCD Research"]), mk("BIOL 402", 4)]);
  assert.ok(r("labs").met && r("mlab").met, "one research project plus one taught lab satisfies both labs");
  r = run([mk("BIOL 499", 4, ["MCD Research"])]);
  assert.ok(r("mlab").met && r("labs").have === 1 && r("adv").have === 4, "approved research counts as the MCD lab, one lab and 4 advanced credits together");
  assert.equal(run([mk("BIOL 499", 3, ["MCD Research"])])("adv").have, 0, "research under 4 credits earns no advanced credit");
  console.log("biol-mcd: surplus natural history, Marine Botany labs and research substitution OK");
}
