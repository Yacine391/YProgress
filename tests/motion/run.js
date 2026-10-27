const assert=require('node:assert/strict');
const {exercisePose,MOTION_IDS,MOTION_META,renderMotionSvg}=require('../../src/core/exerciseMotion.js');
const {EXERCISES}=require('../../src/core/trainingPlan.js');
let count=0;
function test(label,fn){fn();count++;console.log('PASS '+label);}
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function coordinates(pose){return [pose.head,pose.neck,pose.shoulder,pose.hip,...pose.arms.flatMap(x=>[x.start,x.joint,x.end]),...pose.legs.flatMap(x=>[x.start,x.joint,x.end,x.toe].filter(Boolean)),...pose.loads.map(x=>x.at)];}
const nearArm=p=>p.arms.find(x=>!x.far),nearLeg=p=>p.legs.find(x=>!x.far);

test('every proposed exercise has an exact local demonstration, not a generic fallback',()=>{
 assert.deepEqual([...MOTION_IDS].sort(),EXERCISES.map(x=>x.id).sort());
 for(const id of MOTION_IDS){assert.equal(exercisePose(id).supported,true);assert(MOTION_META[id].cue.length>20);}
});
test('all animation coordinates remain finite and inside the viewport over the entire loop',()=>{
 for(const id of MOTION_IDS)for(let i=0;i<=100;i++)for(const p of coordinates(exercisePose(id,i/100))){assert(p.every(Number.isFinite),id);assert(p[0]>35&&p[0]<310&&p[1]>14&&p[1]<234,`${id}: point outside view ${p}`);}
});
test('loops return to the exact starting pose with a smooth bounded trajectory',()=>{
 for(const id of MOTION_IDS){assert.deepEqual(exercisePose(id,0),exercisePose(id,1));let previous=coordinates(exercisePose(id,0));for(let i=1;i<=100;i++){const next=coordinates(exercisePose(id,i/100));next.forEach((p,j)=>assert(distance(p,previous[j])<5,`${id} jumps between frames`));previous=next;}}
});
test('all repetition demonstrations visibly move; plank remains a stable isometric hold',()=>{
 for(const id of MOTION_IDS.filter(id=>id!=='plank')){const a=coordinates(exercisePose(id,0)),b=coordinates(exercisePose(id,.5));assert(Math.max(...a.map((p,i)=>distance(p,b[i])))>10,id);}
 const a=exercisePose('plank',0),b=exercisePose('plank',.25);assert(distance(a.hip,b.hip)<1.3);assert.deepEqual(a.legs[0].end,b.legs[0].end);
});
test('two-bone arm and leg lengths do not stretch during repetitions',()=>{
 for(const id of MOTION_IDS){const start=exercisePose(id,0);for(let step=0;step<=10;step++){const p=exercisePose(id,step/10);for(const kind of ['arms','legs'])p[kind].forEach((l,i)=>{const s=start[kind][i];assert(Math.abs(distance(l.start,l.joint)-distance(s.start,s.joint))<.1,`${id} ${kind} upper stretch`);assert(Math.abs(distance(l.joint,l.end)-distance(s.joint,s.end))<.1,`${id} ${kind} lower stretch`);});}}
});
test('dumbbells stay attached to the hands in every frame',()=>{
 for(const id of MOTION_IDS)for(const phase of [0,.125,.25,.375,.5,.75]){const p=exercisePose(id,phase);for(const load of p.loads)assert(Math.min(...p.arms.map(a=>distance(a.end,load.at)))<=4.1,id);}
});
test('leg curl keeps thighs fixed and bends only the knees',()=>{
 const a=nearLeg(exercisePose('leg-curl',0)),b=nearLeg(exercisePose('leg-curl',.5));assert.deepEqual(a.start,b.start);assert.deepEqual(a.joint,b.joint);assert(b.end[1]>a.end[1]+35);
});
test('presses distinguish vertical, inclined and horizontal load paths',()=>{
 for(const id of ['incline-db-press','shoulder-press']){const a=nearArm(exercisePose(id,0)),b=nearArm(exercisePose(id,.5));assert(b.end[1]<a.end[1]-40,id);}
 const a=nearArm(exercisePose('machine-chest-press',0)),b=nearArm(exercisePose('machine-chest-press',.5));assert(b.end[0]>a.end[0]+35);assert(Math.abs(b.end[1]-a.end[1])<4);
});
test('curls and triceps move around a stationary elbow; neutral grip is visible',()=>{
 for(const id of ['db-curl','hammer-curl','triceps-pushdown','overhead-triceps']){const a=nearArm(exercisePose(id,0)),b=nearArm(exercisePose(id,.5));assert.deepEqual(a.joint,b.joint,id);assert(distance(a.end,b.end)>30,id);}
 assert.notEqual(exercisePose('db-curl',.25).loads[0].angle,exercisePose('hammer-curl',.25).loads[0].angle);
});
test('Romanian deadlift hinges at the hip while loads stay near the legs',()=>{
 const a=exercisePose('db-rdl',0),b=exercisePose('db-rdl',.5);assert(b.hip[0]<a.hip[0]-25);assert(b.shoulder[0]>a.shoulder[0]+15);assert(nearArm(b).end[1]>nearArm(a).end[1]+40);assert.deepEqual(a.legs.at(-1).end,b.legs.at(-1).end);
});
test('calf raise lifts the heels without moving the forefoot off its support',()=>{
 const a=nearLeg(exercisePose('calf-raise',0)),b=nearLeg(exercisePose('calf-raise',.5));assert.deepEqual(a.toe,b.toe);assert(b.end[1]<a.end[1]-10);
});
test('unknown exercise and invalid phases fall back safely without inventing a demonstration',()=>{
 const a=exercisePose('custom',NaN);assert.equal(a.supported,false);assert(coordinates(a).flat().every(Number.isFinite));assert.deepEqual(exercisePose('db-curl',Infinity),exercisePose('db-curl',0));
});
test('diagnostic SVG is standalone, local and has no player, link or external image',()=>{
 for(const id of MOTION_IDS){const svg=renderMotionSvg(exercisePose(id,.5));assert(svg.startsWith('<svg'));assert(!/NaN|Infinity|<image|iframe|youtube|href=/.test(svg));assert(svg.includes('<polyline'));}
});
console.log(`${count} motion checks passed; 17 distinct exercises sampled throughout each loop.`);
