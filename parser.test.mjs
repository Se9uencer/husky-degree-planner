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

const block = name => src.slice(src.indexOf(`/*${name}-START*/`), src.indexOf(`/*${name}-END*/`));
const { MAJORS, COLLEGES, planReqs, canonCode, evalAll } = new Function(
  block("CSETAGS") + block("MAJORS") + block("EVAL") + ";return {MAJORS,COLLEGES,planReqs,canonCode,evalAll};")();

// Every code a major names must exist in the catalog, so a typo can't slip in. Ranges like COM:201-299 cover numbers that don't exist, so only single numbers are checked.
const catalog = new Set(list.map(c => c.code));
// On a department's published list but not in the course catalog, checked by hand against the catalog pages. Kept so students who took them still get credit.
const NOT_IN_CATALOG = new Set("AMATH 424,ANTH 497,ATMOS 460,BIOEN 447,BIOL 305,BIOL 325,BIOL 333,BIOL 409,BIOL 415,BIOL 419,BIOL 422,BIOL 437,BIOL 455,BIOL 472,CEE 402,CEE 403,CEE 495,CHEM 144,COM 325,COM 332,COM 426,COM 434,COM 463,CSE 466,CSE 467,CSE 471,E E 235,E E 341,E E 401,E E 414,E E 485,ESS 403,ESS 413,ESS 415,ESS 424,ESS 437,ESS 458,ESS 464,ESS 466,ESS 471,GEOG 349,LSJ 425,M E 406,M E 442,NEAR E 285,PGH 301,PHYS 315,PHYS 424,PHYS 425,PHYS 426,PHYS 460,POL S 285,POL S 473,PSYCH 494,SCAND 402".split(","));
const RANGE_CODE = /^(INFO 35\d|COM 2\d\d|ACCTG [34]\d\d|MGMT 40\d|POL S 20\d)$/;
const missing = new Map();
const flag = (code, id) => { if (!catalog.has(code) && !NOT_IN_CATALOG.has(code)) missing.set(code, id); };
for (const m of Object.values(MAJORS)) {
  assert.ok(COLLEGES[m.college], m.id + " college");
  assert.ok(m.reqs.length, m.id + " has requirements");
  const reqs = planReqs([m.id]);
  assert.equal(new Set(reqs.map(r => r.id)).size, reqs.length, m.id + " requirement ids are unique");
  assert.ok(reqs.some(r => r.id === "total" && r.need === 180), m.id + " total");
  for (const r of reqs) {
    if (r.group !== m.id) continue;
    for (const code of [...(r.options || []).flat(2), ...(r.codes || [])]) if (!RANGE_CODE.test(code)) flag(code, m.id);
    for (const t of r.tags || []) assert.ok(m.tags.includes(t), `${m.id}: ${r.id} uses unknown tag ${t}`);
    assert.ok(r.type === "courses" || typeof r.need === "number", `${m.id}: ${r.id} need`);
  }
  for (const s of Object.values(m.lists || {})) for (const g of s.split(";").filter(Boolean)) {
    const [d, ns] = g.split(":");
    for (const n of ns.split(",")) if (!n.includes("-")) flag(d + " " + n, m.id);
  }
}
assert.deepEqual([...missing].map(([code, id]) => `${code} (${id})`).sort(), [], "codes not in the catalog");
console.log(`majors: ${Object.keys(MAJORS).length} majors and options, course codes checked against the catalog`);

for (const [code, want] of Object.entries({ "me323": "M E 323", "EE 215": "E E 215", "pols 203": "POL S 203", "M E 323": "M E 323", "CSE493G": "CSE 493G", "TRANSFER CAP": "TRANSFER CAP" })) assert.equal(canonCode(code), want, code);

// Plans saved before this change must keep their CS requirements and ids.
assert.deepEqual(planReqs(["cs"]).map(r => r.id), ["total","res","comp","w","div","ah","ssc","nsc","aoi","math","sci","fund","core","core7","elec","ethA","ethB","eth495","ethTot","ethUD","minor"]);
const needOf = (ids, id) => planReqs(ids).find(r => r.id === id).need;
assert.equal(needOf(["cs"], "aoi"), 75); assert.equal(needOf(["me"], "nsc"), 49); assert.equal(needOf(["ce"], "aoi"), 30); assert.equal(needOf(["info"], "ah"), 20);
assert.ok(!planReqs(["info"]).some(r => r.id === "aoi"), "iSchool has no Areas of Inquiry total");
assert.ok(!planReqs(["bioe"]).some(r => r.id === "w"), "Bioengineering writing is met by the major");
assert.equal(needOf(["me", "cs"], "nsc"), 49, "gen-eds follow the first major");
assert.ok(planReqs(["psych-bs", "econ-ba"]).some(r => r.group === "econ-ba"), "double major keeps both");

for (const [id, code, tag] of [["biol-bs","BIOL 472","Bio Ecology"],["biol-bs","BIOL 472","Bio Lab"],["econ-ba","ECON 482","ECON 400-level"],["com","COM 373","COM Methods"],["com","COM 373","COM Theory"],["pols","POL S 321","POL S 210+"],["ce","CSE 451","CE Systems"],["ce","CSE 331","CS Core"],["me","ME 402","ME Option"],["bioe","BIOEN 485","BioE Senior"],["cs","CSE 333","CS Core"]])
  assert.ok(MAJORS[id].tagsFor(code).includes(tag), `${id}: ${code} should be ${tag}`);
for (const [id, code, tag] of [["econ-ba","ECON 499","ECON 400-level"],["pols","POL S 499","POL S 210+"],["ce","CSE 369","CS Core"],["acms-ds","STAT 311","ACMS Elective"]])
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
const cs = planReqs(["cs"]), csE = evalAll(cs, [course("CSE 333", 4, "CS Core")]);
assert.equal(csE.get(cs.find(r => r.id === "core")).have, 1); assert.equal(csE.get(cs.find(r => r.id === "elec")).have, 4, "CS electives still include core");
console.log("evalAll: additional requirements don't double-count");
