import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync(new URL('./index.html',import.meta.url),'utf8');
const block=n=>src.slice(src.indexOf(`/*${n}-START*/`),src.indexOf(`/*${n}-END*/`));
const section=(a,b)=>src.slice(src.indexOf(a),src.indexOf(b));
const helpers=section('function orderedKeys(', 'function fixTarget(');
const {planReqs,evalAll,creditCourses,singleAreaTags,coursesUpTo,projection}=new Function(
  block('CSETAGS')+block('MAJORS')+block('EVAL')+helpers+
  ';return {planReqs,evalAll,creditCourses,singleAreaTags,coursesUpTo,projection}')();
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
assert.equal(projection(p),'0-3','graduation may fall in a hidden summer');
assert.equal(coursesUpTo(p,'0-2').length,1,'future summers do not leak into earlier quarters');

// Exercise the real DARS conversion with lightweight non-UI dependencies.
const convert=new Function('basePlan','planTags','addAutoTags','C','sumCr',
  section('function planFromDars(', '/* ---------- render ---------- */')+';return planFromDars')(
  ()=>({prior:[],quarters:{}}),()=>[],x=>x,
  (code,credits,tags,status,title)=>c(code,credits,tags,{status,title}),
  list=>creditCourses(list).reduce((n,c)=>n+c.credits,0));
const imported=convert({courses:[{code:'MATH 124',credits:5,tags:[],grade:'TR',yy:26,q:1}],earned:null},2025);
assert.equal(imported.quarters['0-1'][0].origin,'external');
assert.equal(audit(['cs'],coursesUpTo({...imported,showSummer:false},null))('res').have,0);
console.log('audit regressions: area assignment, repeats, residency, summer and DARS origin OK');

// Mount the actual editor handlers against a small DOM stand-in, including a delayed catalog response.
const editorPlan={majors:['cs'],prior:[],quarters:{'0-0':[c('ENGL 131',5,['C'])]}};
const original=editorPlan.quarters['0-0'][0];
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
resolveCatalog({byCode:new Map([['MATH124',{title:'Calculus',credits:5,tags:['NSc']}]])});
await lookup;
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'true');
assert.equal(buttons.find(b=>b.dataset.t==='C').pressed,'false');
buttons.find(b=>b.dataset.t==='SSc').onclick();
assert.equal(buttons.find(b=>b.dataset.t==='NSc').pressed,'false','choosing another area clears the first');
console.log('editor regressions: code changes clear stale tags before catalog lookup and area choices are exclusive');
