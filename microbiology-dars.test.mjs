// Optional: node microbiology-dars.test.mjs /path/to/audit.txt (the audit stays outside the repository).
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const block=n=>source.slice(source.indexOf(`/*${n}-START*/`),source.indexOf(`/*${n}-END*/`));
const section=(a,b)=>source.slice(source.indexOf(a),source.indexOf(b));
const app=new Function('const MAX_MAJORS=2;'+block('PARSER')+block('CSETAGS')+block('ETHICSTAGS')+block('MAJORS')+block('EVAL')+block('MATCH')+
  section('const GEN_TAGS =','// Switches a plan')+section('function basePlan(','// Other majors')+
  section('function orderedKeys(','function fixTarget(')+section('function planFromDars(','/* ---------- render ---------- */')+
  section('function normalizePlan(','/* ---------- storage ---------- */')+
  ';return {parseDars,planFromDars,addCatalogGen,resolveShortTitle,evalAll,coursesUpTo,planReqs,normalizePlan};')();
const catalog=JSON.parse(readFileSync(new URL('./catalog.json',import.meta.url),'utf8')).courses.map(([code,title,cr,gen])=>({code,title,cr,tags:(gen||'').split(' ')}));
const byCode=new Map(catalog.map(c=>[c.code.replace(/ /g,''),c]));
const row=(code,credits,grade='AP',qtr='SP26')=>`${qtr}\t${code}\t${credits}\t${grade}\n`;
// Invented, anonymous audit fixture: the totals/edge cases mirror the supplied audit without committing a transcript.
const synthetic=`Catalog Year:\nWI 27\nThe University requires a minimum of 180 academic credits.\nEarned: 90 credits In-progress: 16 credits\nGENERAL EDUCATION REQUIREMENTS\nAREAS OF INQUIRY\nSocial Sciences\nEarned: 25 credits In-progress: 5 credits\n`+
  ['SOC 101','SOC 102','SOC 103','SOC 104','SOC 105'].map(c=>row(c,5)).join('')+row('SOC 106',5,'IP','AU26')+
  `Natural Sciences\nEarned: 36 credits\n`+
  ['CHEM 142','CHEM 152','CHEM 162','MATH 124','MATH 125'].map(c=>row(c,5)).join('')+row('CSE 121',4)+row('PHYS 114',4)+row('PHYS 115',4)+
  `OTHER COURSES\nGeneral Electives\n`+row('ELECTIVE CREDIT',28)+row('CSE 123',4,'IP','AU26')+row('FUTURE ELECTIVES',7,'IP','AU26');
const text=process.argv[2]?readFileSync(process.argv[2],'utf8'):synthetic;
const parsed=app.parseDars(text);
const plan=app.planFromDars(parsed,2026,'micro',byCode);
const courses=()=>[...plan.prior,...Object.values(plan.quarters).flat()];
for(const c of courses()){
  if(c.shortTitle){const code=app.resolveShortTitle(catalog,c.code);if(code)c.code=code;}
  app.addCatalogGen(c,byCode);
}
function results(p=plan){const cs=app.coursesUpTo(p,null),out=app.evalAll(p.reqs,cs);return id=>out.get(p.reqs.find(r=>r.id===id));}
let result=results();
assert.deepEqual(result('total').st,{done:90,now:16,plan:0});
assert.equal(result('res').have,16);
assert.equal(result('comp').have,0);assert.equal(result('w').have,0);assert.equal(result('div').have,0);assert.equal(result('ah').have,0);
assert.deepEqual(result('ssc').st,{done:25,now:5,plan:0});
assert.deepEqual(result('nsc').st,{done:36,now:0,plan:0});
assert.deepEqual(result('aoi').st,{done:61,now:5,plan:0});
assert.equal(result('micro.gchem').met,true);assert.equal(result('micro.phys').met,true);
assert.equal(result('micro.quant').have,1,'AP statistics is not an approved statistics course');
for(const id of ['intro','ochem','core','dist','med','div','gene','lab','bioc','res']) assert.equal(result('micro.'+id).met,false,id);
const restored=app.normalizePlan(structuredClone(plan));
assert.equal(results(restored)('aoi').have,66,'saved-plan normalization preserves the applied allocations');
// New coursework earns its full area credit; the default cap is not globally raised to 36.
const future={id:'new-ah',code:'ART 100',credits:20,tags:['A&H'],status:'plan',origin:'uw'};
plan.quarters['0-1']=[future];
assert.equal(results()('aoi').have,86);
plan.quarters['0-1'].push({...future,id:'extra-nsc',code:'PHYS 123',credits:5,tags:['NSc']});
assert.deepEqual(results()('aoi').st,{done:61,now:5,plan:20},'new courses cannot reclassify completed credit as planned credit');
const blankReqs=app.planReqs(['micro']),blankCourses=[{...future,code:'SCI 100',credits:40,tags:['NSc']}];
assert.equal(app.evalAll(blankReqs,blankCourses).get(blankReqs.find(r=>r.id==='aoi')).have,35);
const cr=(code,credits,origin='uw')=>({id:code+origin,code,credits,origin,status:'done',tags:[]});
const residency=blankReqs.find(r=>r.id==='micro.res');
assert.equal(app.evalAll(blankReqs,[cr('MICROM 410',3),cr('MICROM 450',3),cr('IMMUN 441',4),cr('MICROM 499',10),cr('MICROM 301',5),cr('MICROM 443',3,'external')]).get(residency).have,20,'only approved UW microbiology courses count');
console.log('Microbiology DARS: credits, residency, gen-ed allocations, major progress, reload and future planning OK');
