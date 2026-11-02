const assert=require('node:assert/strict');
const x=require('../../src/core/xp.js');
const tests=[];
function test(name,fn){try{fn();console.log('PASS',name);tests.push(true)}catch(e){console.error('FAIL',name,e);tests.push(false)}}
const set=(exerciseId,load,reps,done=true)=>({exerciseId,load,reps,done});
const session=(date,sets,title='Upper A')=>({id:`${date}:s`,date,title,type:'strength',sets});
test('no data gives level 1 with zero XP',()=>{const r=x.computeXp({});assert.equal(r.total,0);assert.equal(r.level,1);assert.equal(r.title,'Recrue');assert.equal(r.events.length,0)});
test('heavier sets earn more XP, capped per set',()=>{assert(x.setXp(set('leg-press',60,10))>x.setXp(set('leg-press',30,10)));assert.equal(x.setXp(set('leg-press',1000,100)),x.XP_RULES.setCap);assert.equal(x.setXp(set('leg-press',40,0)),0);assert.equal(x.setXp(set('leg-press','40','abc')),0)});
test('timed exercises earn XP from seconds held',()=>{assert(x.setXp(set('plank',0,40))>x.setXp(set('plank',0,20)))});
test('a recorded session awards sets plus completion bonus',()=>{const r=x.computeXp({sessions:[session('2026-11-02',[set('leg-press',35,10),set('leg-press',35,10)])]});assert.equal(r.byKind.session,x.XP_RULES.session);assert.equal(r.byKind.sets,2*x.setXp(set('leg-press',35,10)))});
test('unvalidated sets and empty sessions earn nothing',()=>{assert.equal(x.computeXp({sessions:[session('2026-11-02',[set('leg-press',35,10,false)])]}).total,0)});
test('a new heaviest load on an exercise is a record, the first time is not',()=>{const r=x.computeXp({sessions:[session('2026-11-02',[set('leg-press',35,10)]),session('2026-11-04',[set('leg-press',35,10)]),session('2026-11-06',[set('leg-press',40,8)])]});assert.equal(r.byKind.record,x.XP_RULES.record)});
test('cancelling a session removes its XP',()=>{const a={sessions:[session('2026-11-02',[set('leg-press',35,10)])]};assert(x.computeXp(a).total>0);assert.equal(x.computeXp({sessions:[]}).total,0)});
test('body weight XP follows the goal and is never awarded twice',()=>{const weights=[{date:'2026-10-27',weight:57},{date:'2026-11-03',weight:57.6},{date:'2026-11-10',weight:57.2},{date:'2026-11-17',weight:58.1}];const gain=x.computeXp({profile:{goal:'lean_gain'},weights});assert.equal(gain.byKind.goal,2*x.XP_RULES.goalStep);assert.equal(gain.byKind.weighIn,4*x.XP_RULES.weighIn);const cut=x.computeXp({profile:{goal:'cut'},weights});assert.equal(cut.byKind.goal||0,0);const keep=x.computeXp({profile:{goal:'maintain'},weights});assert.equal(keep.byKind.goal||0,0)});
test('MMA classes count',()=>{assert.equal(x.computeXp({days:{'2026-11-03':{mma:true},'2026-11-05':{mma:false}}}).byKind.mma,x.XP_RULES.mma)});
test('levels consume XP progressively',()=>{assert.deepEqual([x.levelFromXp(0).level,x.levelFromXp(199).level,x.levelFromXp(200).level,x.levelFromXp(500).level],[1,1,2,3]);const l=x.levelFromXp(250);assert.equal(l.current,50);assert.equal(l.needed,x.xpToNext(2));assert.equal(x.titleFor(30),'Légende')});
test('malformed entries are ignored safely',()=>{const r=x.computeXp({sessions:[null,{date:'bad',sets:[]},{date:'2026-11-02'}],weights:[null,{date:'2026-11-02',weight:'x'}],days:{nope:{mma:true}}});assert.equal(r.total,0)});
if(tests.some(t=>!t))process.exit(1);
console.log(`${tests.length} XP checks passed`);
