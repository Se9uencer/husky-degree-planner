import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const block=n=>src.slice(src.indexOf(`/*${n}-START*/`),src.indexOf(`/*${n}-END*/`));
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b));
const helpers=section('function orderedKeys(', 'function fixTarget(');
const {planReqs,evalAll,creditCourses,singleAreaTags,coursesUpTo,projection,canonCode}=new Function(
  block('CSETAGS')+block('MAJORS')+block('EVAL')+helpers+
  ';return {planReqs,evalAll,creditCourses,singleAreaTags,coursesUpTo,projection,canonCode}')();
let nextId=0;
const c=(code,credits,tags=[],extra={})=>({id:String(nextId++),code,credits,tags,status:'done',...extra});
const audit=(ids,courses)=>{
  const reqs=planReqs(ids), results=evalAll(reqs,courses);
  return id=>results.get(reqs.find(r=>r.id===id));
};
const dual=c('ESS 101',5,['SSc','NSc','DIV']);
let result=audit(['psych-ba'],[dual]);
assert.equal(result('ssc').have+result('nsc').have,5,'one course cannot earn two areas');
assert.equal(result('div').have,5,'diversity may still overlap');
assert.deepEqual(dual.tags,['SSc','NSc','DIV'],'evaluation does not mutate saved tags');
result=audit(['psych-ba'],[{...dual,tags:['NSc','SSc','DIV']}]);
assert.equal(result('nsc').have,5,'selected area is honored');
assert.equal(result('ssc').have,0);
const first=c('CSE 333',4,['CS Core']), repeat=c('CSE333',4,['CS Core'],{status:'plan'});
result=audit(['cs'],[repeat,first]);
assert.equal(result('total').have,4);
assert.equal(result('core').have,1);
assert.equal(creditCourses([repeat,first])[0].id,first.id,'completed credit takes priority');
const research=[c('CSE 499',3,[],{repeatable:true}),c('CSE 499',4,[],{repeatable:true})];
assert.equal(audit(['cs'],research)('total').have,7,'explicitly repeatable offerings retain credit');
assert.equal(creditCourses([c('TRANSFER CAP',-5),c('TRANSFER CAP',-3)]).length,2,'adjustments are not deduplicated');
const p={years:1,showSummer:false,prior:[c('ENGL 131',5,['C'],{origin:'uw'})],
  quarters:{'0-3':[c('MATH 124',5,['NSc'],{origin:'external'})]},
  reqs:[{id:'total',group:'gen',type:'total',need:10}],groupsOn:{gen:true}};
result=audit(['cs'],coursesUpTo(p,null));
assert.equal(result('total').have,10,'hidden summer credit remains in the audit');
assert.equal(result('res').have,5,'origin controls residency independently of placement');
assert.equal(projection(p),'0-3','graduation in the final hidden summer is still found');
assert.equal(coursesUpTo(p,'0-2').length,1,'future summers do not leak into earlier quarters');

// Exercise the real DARS conversion with lightweight non-UI dependencies.
const {fullYear}=new Function(block('PARSER')+';return {fullYear}')();
const convert=new Function('basePlan','planTags','addAutoTags','C','sumCr','canonCode','fullYear',
  section('function planFromDars(', '/* ---------- render ---------- */')+';return planFromDars')(
  ()=>({prior:[],quarters:{}}),()=>['CS Core'],x=>x,
  (code,credits,tags,status,title)=>c(code,credits,tags,{status,title}),
  list=>creditCourses(list).reduce((n,c)=>n+c.credits,0),canonCode,fullYear);
const imported=convert({courses:[{code:'MATH 124',credits:5,tags:[],grade:'TR',yy:26,q:1}],earned:null},2025);
assert.equal(imported.quarters['0-1'][0].origin,'external');
assert.equal(audit(['cs'],coursesUpTo({...imported,showSummer:false},null))('res').have,0);
const twice=(code,credits,earned)=>convert({courses:[{code,credits,tags:['CS Core'],grade:'4.0',yy:26,q:1},{code,credits,tags:['CS Core'],grade:'4.0',yy:26,q:2}],earned},2025,'cs',
  new Map([['CSE499',{cr:'1-24, max. 24'}],['CSE333',{cr:'4'}]]));
const research499=twice('CSE 499',3,6);
assert.equal(audit(['cs'],coursesUpTo(research499,null))('total').have,6,'catalog-permitted repeats keep their credit');
assert.ok(!research499.prior.length,'no cap needed when DARS earned matches');
result=audit(['cs'],coursesUpTo(twice('CSE 333',4,4),null));
assert.equal(result('total').have,4,'an ordinary retake earns credit once');
assert.equal(result('core').have,1,'an ordinary retake counts as one core course');
assert.equal(result('res').have,4,'an ordinary retake earns residency credit once');
console.log('audit regressions: area assignment, repeats, residency, summer and DARS origin OK');

// Mount the actual editor handlers against a small DOM stand-in, including a delayed catalog response.
const editorPlan={majors:['cs'],prior:[],quarters:{'0-0':[c('ENGL 131',5,['C'])]}};
const original=editorPlan.quarters['0-0'][0];
original.darsGen=true; original.darsAreaCredits={'NSc':3};
const elements=new Map();
const element=(id,value='')=>{
  const e={value,checked:false,handlers:{},addEventListener(name,fn){this.handlers[name]=fn;},focus(){}};
  elements.set(id,e); return e;
};
for(const [id,value] of Object.entries({'e-code':'ENGL 131','e-cr':'5','e-title':'','e-st':'done','e-origin':'uw','e-q':'0-0','e-repeat':'','e-cancel':'','e-save':'','e-del':''})) element(id,value);
const tags=['C','W','A&H','SSc','NSc','DIV'];
const buttons=tags.map(t=>({dataset:{t},pressed:t==='C'?'true':'false',setAttribute(k,v){this.pressed=v;},getAttribute(){return this.pressed;}}));
const ov={querySelectorAll(q){return q==='[data-t]'?buttons:q==='[data-t][aria-pressed=true]'?buttons.filter(b=>b.pressed==='true'):[];},
  querySelector(q){return buttons.find(b=>q===`[data-t="${b.dataset.t}"]`);}};
let resolveCatalog;
const pending=new Promise(resolve=>{resolveCatalog=resolve;});
const editor=new Function('plan','listOf','clone','uid','allKeys','qLabel','esc','planTags','dialog','document','setTimeout','AOI_TAGS','singleAreaTags','canonCode','autoTags','GEN_TAGS','loadCatalog','CSS','persist','render','moveCourse',
  section('function openEditor(', 'function openTutorial(')+';return openEditor')(
  ()=>editorPlan,(p,k)=>p.quarters[k],x=>structuredClone(x),()=>String(nextId++),()=>['0-0'],()=>'',String,()=>tags,
  (html,mount)=>mount(ov,()=>{}),{getElementById:id=>elements.get(id)},()=>0,['A&H','SSc','NSc'],singleAreaTags,
  code=>code.toUpperCase(),()=>[],tags,()=>pending,{escape:String},()=>{},()=>{},()=>{});
editor(original.id,'0-0');
elements.get('e-code').value='MATH 124';
elements.get('e-code').handlers.input();
const lookup=elements.get('e-code').handlers.change();
elements.get('e-save').onclick();
assert.ok(!original.tags.includes('C'),'saving before lookup resolves cannot preserve old composition credit');
assert.ok(!original.darsGen&&!original.darsAreaCredits,'editing the imported course clears its old DARS allocation');
resolveCatalog({byCode:new Map([['MATH124',{title:'Calculus',credits:5,tags:['NSc']}],['CSE499',{title:'Research',credits:3,tags:[],rep:true}]])});
await lookup;
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'true');
assert.equal(buttons.find(b=>b.dataset.t==='C').pressed,'false');
buttons.find(b=>b.dataset.t==='SSc').onclick();
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'false','choosing another area clears the first');
// A new course: a tag picked by hand survives typing a code and the catalog fill.
buttons.forEach(b=>b.pressed='false'); elements.get('e-code').value='';
editor(undefined,'0-0');
buttons.find(b=>b.dataset.t==='W').onclick();
elements.get('e-code').value='MATH 124'; elements.get('e-code').handlers.input();
await elements.get('e-code').handlers.change();
assert.equal(buttons.find(b=>b.dataset.t==='W').pressed,'true','manual tag survives a code change');
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'true','catalog tag is filled in');
elements.get('e-code').value='MATH 125'; elements.get('e-code').handlers.input();
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'false','catalog tag clears when the code changes again');
assert.equal(buttons.find(b=>b.dataset.t==='W').pressed,'true');
console.log('editor regressions: code changes clear stale tags before catalog lookup and area choices are exclusive');

// Mount the real DARS import dialog with a delayed catalog: edits and cancels during loading must not leak into the result.
const importDialog=()=>{
  const els={}, mk=(id,v='')=>els[id]={id,value:v,disabled:false,isConnected:true,hidden:true,innerHTML:'',handlers:{},addEventListener(n,f){this.handlers[n]=f;}};
  ['d-text','d-prev','d-go','d-cancel','d-tutorial'].forEach(id=>mk(id)); mk('d-major','cs'); mk('d-start','2025');
  let release; const catalog=new Promise(r=>{release=r;});
  const calls={built:[],added:0};
  const close=()=>Object.values(els).forEach(e=>e.isConnected=false);
  new Function('dialog','majorOptions','document','parseDars','track','esc','openTutorial','loadCatalog','planFromDars','addCatalogGen','addPlan','toast','setTimeout',
    section('function openDars(', '/* ---------- export / import ---------- */')+';return openDars')(
    (html,mount)=>mount({},close),()=>'',{getElementById:id=>els[id]},v=>({courses:[{grade:'4.0'}],earned:null,startYear:2025,src:v}),()=>{},String,()=>{},
    ()=>catalog,(audit,sy,major)=>{calls.built.push(audit.src);return {prior:[],quarters:{}};},()=>{},()=>{calls.added++;},()=>{},()=>0)();
  const paste=v=>{els['d-text'].value=v;els['d-text'].handlers.input();};
  return {els,calls,paste,release};
};
let imp=importDialog();
imp.paste('audit A');
let importing=imp.els['d-go'].onclick();
assert.ok(imp.els['d-text'].disabled,'the audit is locked while the catalog loads');
imp.paste('audit B');
imp.release({byCode:new Map()}); await importing;
assert.deepEqual(imp.calls.built,['audit A'],'the plan uses the audit that was imported, not a later edit');
assert.equal(imp.calls.added,1);
imp=importDialog();
imp.paste('audit A');
importing=imp.els['d-go'].onclick();
imp.els['d-cancel'].onclick();
imp.release({byCode:new Map()}); await importing;
assert.equal(imp.calls.added,0,'cancelling during loading creates no plan');
console.log('import regressions: edits and cancels while the catalog loads are ignored');

// Review fixes: import sanitising, requirement edits, repeats, quarters, DARS filters.
const norm5=new Function('uid',block('CSETAGS')+block('MAJORS')+block('EVAL')+'const MAX_MAJORS=2, addAutoTags=x=>x;'+section('function normalizePlan(','/* ---------- storage ---------- */')+';return normalizePlan')(()=>'fresh1');
const bad=norm5({id:'"><img src=x onerror=alert(1)>',name:'n',years:'<b>',startYear:'x"',prior:[{id:'a"b',code:7,title:null,credits:'<i>',tags:'NSc'}],quarters:{'0-0':[{id:'ok_1',code:'MATH 124',credits:'5'}],'0-1':'junk'}});
assert.match(bad.id,/^[A-Za-z0-9_-]+$/,'unsafe plan id is replaced');
assert.ok(bad.years>=1&&bad.years<=12&&bad.startYear===2026,'years and start year are coerced');
assert.deepEqual([bad.prior[0].id,bad.prior[0].code,bad.prior[0].credits,bad.prior[0].tags],['fresh1','7',0,[]],'course fields are coerced');
assert.ok(bad.quarters['0-0'][0].credits===5&&!('0-1' in bad.quarters),'non-array quarters are dropped');
assert.equal(norm5({prior:[],quarters:null}),null,'null quarters are rejected');
const oldTotal=planReqs(['cs']).find(r=>r.id==='total').need;
const mk=(schema,reqs)=>norm5({schema,prior:[],quarters:{},majors:['cs'],reqs}).reqs.find(r=>r.id==='total');
assert.equal(mk(4,[{id:'total',need:oldTotal}]).need,oldTotal);
assert.equal(mk(4,[{id:'total',need:oldTotal+7}]).need,oldTotal+7,'pre-flag plan: a differing number counts as edited');
assert.equal(mk(5,[{id:'total',need:oldTotal+7}]).need,oldTotal,'current plan: an unflagged number follows the new default');
assert.equal(mk(5,[{id:'total',need:oldTotal+7,edited:true}]).need,oldTotal+7,'edited numbers are kept');
const dupe=[c('MATH 124',3,[],{status:'plan'}),c('MATH 124',5,[],{status:'plan',origin:'external'}),c('MATH 124',5,[],{status:'plan',origin:'uw'})];
assert.equal(creditCourses(dupe)[0].id,dupe[2].id,'equal status: higher credit, then UW, wins');
const titleOnly=new Function(section('const titleOnly=','function repairPlans(')+';return titleOnly')();
assert.ok(!titleOnly({code:'Gen ed'})&&titleOnly({code:'CALC ANYL GEOM III',shortTitle:true}),'only flagged DARS rows are repaired');
const kept=convert({courses:[{code:'CALC ANYL',credits:5,tags:[],grade:'4.0',yy:25,q:0},{code:'MATH 124',credits:5,tags:[],grade:'W',yy:25,q:0},{code:'MATH 125',credits:0,tags:[],grade:'0.0',yy:25,q:0},{code:'MATH 126',credits:5,tags:[],grade:'4.0',yy:99,q:0}],earned:null},2025);
assert.equal(Object.values(kept.quarters).flat().length,1,'W and 0.0 rows are skipped');
assert.ok(kept.quarters['0-0'][0].shortTitle,'title-only DARS rows are flagged');
assert.equal(convert({courses:[{code:'MATH 124',credits:5,tags:[],grade:'4.0',yy:30,q:0}],earned:null},1995).years,12,'years cap at 12');
assert.equal(fullYear(99),1999,'a far-future two-digit year is last century');
assert.equal(fullYear(30),2030);
const {nextQuarterKey}=new Function(helpers+section('function nowIdx(','function renderYears(')+section('function nextQuarterKey(','const titleOnly=')+';return {nextQuarterKey}')();
const qp={startYear:2025,years:2,showSummer:false};
assert.equal(nextQuarterKey(qp,new Date(2026,7,1)),'1-0','hidden summer: next visible quarter');
assert.equal(nextQuarterKey(qp,new Date(2020,0,1)),'0-0','before the plan: first quarter');
assert.equal(nextQuarterKey(qp,new Date(2030,0,1)),'1-2','after the plan: last quarter');
const cat=await new Function('fetch','singleAreaTags','GEN_TAGS','ethicsTag',section('let catalogP=null;','// Areas must all match')+';return loadCatalog()')(
  async()=>({ok:true,json:async()=>({built:'x',courses:[['BIOL 499','Research','1-20, max. 20','']]})}),singleAreaTags,[],()=>null);
assert.deepEqual([cat.list[0].credits,cat.list[0].rep],[1,true],'variable credit starts at the low end and max. marks repeatable');
let asked=0;
const {switchMajors}=new Function('showConfirm','persist','render','clone',block('CSETAGS')+block('ETHICSTAGS')+block('MAJORS')+'const MAX_MAJORS=2;'+section('const addAutoTags','function majorOptions(')+';return {switchMajors}')(
  ()=>{asked++;},()=>{},()=>{},x=>JSON.parse(JSON.stringify(x)));
const swPlan=tags=>({majors:['cs'],groupsOn:{gen:true,cs:true},reqs:planReqs(['cs']),prior:[],quarters:{'0-0':[c('CSE 333',4,tags)]}});
switchMajors(swPlan(['CS Core']),['psych-ba']); assert.equal(asked,0,'auto-applied tags switch without asking');
switchMajors(swPlan(['CS Sci']),['psych-ba']); assert.equal(asked,1,'a hand-applied tag asks first');
const editedPlan=swPlan([]); editedPlan.reqs.find(r=>r.id==='core').edited=true;
switchMajors(editedPlan,['psych-ba']); assert.equal(asked,2,'edited requirement numbers ask first');
const micro=audit(['micro'],[c('MICROM 443',3,['Micro Dist']),c('IMMUN 441',4,['Micro Dist']),c('MICROM 412',3,['Micro Dist']),c('ENV H 409',3,['Micro Dist']),c('MICROM 411',4,['Micro Dist'])]);
assert.deepEqual([micro('micro.med').have,micro('micro.div').have,micro('micro.lab').have,micro('micro.dist').have,micro('micro.gene').met],[2,2,2,17,true],'Microbiology distribution groups, labs and credit total');
console.log('review fixes: import sanitising, requirement edits, repeat ranking, quarter lookup, DARS filters OK');

// Repeat permission belongs to the current code, including while its lookup is pending.
elements.get('e-code').value=''; elements.get('e-repeat').checked=false;
editor(undefined,'0-0');
elements.get('e-code').value='CSE 499'; elements.get('e-code').handlers.input();
await elements.get('e-code').handlers.change();
assert.equal(elements.get('e-repeat').checked,true);
elements.get('e-code').value='MATH 124'; elements.get('e-code').handlers.input();
assert.equal(elements.get('e-repeat').checked,false,'the old permission clears synchronously');
const ordinaryLookup=elements.get('e-code').handlers.change();
elements.get('e-save').onclick();
assert.equal(editorPlan.quarters['0-0'].at(-1).repeatable,false,'saving during lookup cannot grant repeat credit');
await ordinaryLookup;
assert.equal(elements.get('e-repeat').checked,false,'ordinary catalog course stays nonrepeatable');
elements.get('e-code').value='CSE 499'; elements.get('e-code').handlers.input();
await elements.get('e-code').handlers.change();
elements.get('e-code').value='UNKNOWN 123'; elements.get('e-code').handlers.input();
await elements.get('e-code').handlers.change();
assert.equal(elements.get('e-repeat').checked,false,'unknown codes do not inherit permission');
elements.get('e-code').value='MATH 124'; elements.get('e-code').handlers.input();
elements.get('e-repeat').checked=true; elements.get('e-repeat').onchange();
await elements.get('e-code').handlers.change();
assert.equal(elements.get('e-repeat').checked,true,'a deliberate override for the new code survives lookup');
console.log('repeat permission regressions: code changes, immediate saves, unknown codes and manual overrides OK');

// Exercise the real sync functions, including the conditional-write conflict path.
function syncHarness(initial,{dirty=true,guest=false,stamp='old',response}={}){
  let id=0, saved;
  const cloud={data:{plans:[{id:'p1',name:'Cloud copy',quarters:{}}],current:'p1'},updated_at:'new'};
  const remote={select(){return this;},eq(){return this;},maybeSingle:()=>response||Promise.resolve({data:cloud,error:null}),update(){return {eq(){return this;},select:async()=>({data:[],error:null})};}};
  const storage=section('let plans=[], cur=null','/* ---------- plan helpers ---------- */');
  const api=new Function('document','window','localStorage','session','supa','normalizePlan','render','repairPlans','toast','STORE','guestDirty','clone','uid','setTimeout','clearTimeout',
    storage+`;return {init:(p,d,s)=>{plans=p;cur=p[0]?.id;dirty=d;cloudStamp=s;pullOk=true;},pull:()=>cloudPull(true),flush,state:()=>({plans,cur,dirty,cloudStamp}),edit:()=>{plans[0].name='Edited during pull';dirty=true;}};`)(
    {getElementById:()=>({}),addEventListener(){}},{addEventListener(){}},
    {setItem:(key,value)=>{saved=JSON.parse(value);}}, {user:{id:'u1',email:'test'}},{from:()=>remote},x=>structuredClone(x),()=>{},()=>{},()=>{},'test',guest,
    x=>structuredClone(x),()=>String(++id),()=>0,()=>{});
  api.init(structuredClone(initial),dirty,stamp);
  return {...api,saved:()=>saved};
}
let sync=syncHarness([{id:'p1',name:'Local work',quarters:{'0-0':[{code:'MATH 124'}]}},{id:'local-only',name:'New plan'}]);
await sync.flush();
let synced=sync.state();
assert.equal(synced.plans.find(p=>p.id==='p1').name,'Cloud copy');
const conflictCopy=synced.plans.find(p=>p.name==='Local work (conflict copy)');
assert.ok(conflictCopy&&conflictCopy.id!=='p1','a conditional-write conflict preserves unsent work under a fresh ID');
assert.equal(conflictCopy.quarters['0-0'][0].code,'MATH 124');
assert.equal(synced.cur,conflictCopy.id,'the user remains on their preserved version');
assert.ok(synced.plans.some(p=>p.id==='local-only'));
assert.equal(synced.dirty,true,'preserved copies are queued for upload');
assert.deepEqual(sync.saved().plans,synced.plans,'both versions are saved locally');
sync=syncHarness([{id:'p1',name:'Cloud copy',quarters:{}}]);
await sync.pull();
assert.equal(sync.state().plans.length,1,'identical versions do not need conflict copies');
let finishPull;
sync=syncHarness([{id:'p1',name:'Before pull',quarters:{}}],{dirty:false,response:new Promise(resolve=>{finishPull=resolve;})});
const pull=sync.pull(); sync.edit();
finishPull({data:{data:{plans:[{id:'p1',name:'Remote edit',quarters:{}}],current:'p1'},updated_at:'new'},error:null});
await pull;
assert.ok(sync.state().plans.some(p=>p.name==='Edited during pull (conflict copy)'),'edits made while pulling are preserved too');
console.log('sync regressions: conflicting edits, unique plans, identical copies and edits during pull OK');

// JSON storage may reorder every object's keys, while array order remains meaningful.
const localPlan={id:'p1',name:'Same plan',quarters:{'0-0':[
  {code:'MATH 124',credits:5,tags:['NSc','DIV']},
  {code:'CSE 121',credits:4,tags:['NSc']}
]}};
const reorderedPlan={quarters:{'0-0':[
  {tags:['NSc','DIV'],credits:5,code:'MATH 124'},
  {tags:['NSc'],credits:4,code:'CSE 121'}
]},name:'Same plan',id:'p1'};
const cloudResponse=p=>Promise.resolve({data:{updated_at:'new',data:{plans:[p],current:'p1'}},error:null});
sync=syncHarness([localPlan],{response:cloudResponse(reorderedPlan)});
await sync.pull();
assert.equal(sync.state().plans.length,1,'reordered top-level and nested object keys do not create conflicts');
assert.equal(sync.state().dirty,false,'key-order-only changes are not queued for upload');
for(const change of [p=>{p.quarters['0-0'][0].credits=3;},p=>p.quarters['0-0'].reverse(),p=>p.quarters['0-0'][0].tags.reverse()]){
  const changed=structuredClone(reorderedPlan); change(changed);
  sync=syncHarness([localPlan],{response:cloudResponse(changed)});
  await sync.pull();
  const copy=sync.state().plans.find(p=>p.name==='Same plan (conflict copy)');
  assert.ok(copy,'changed values and array order must still preserve a conflict copy');
  assert.deepEqual(copy.quarters,localPlan.quarters,'the local version remains intact');
}
console.log('sync equality regressions: object-key order ignored; nested values and array order preserved');
