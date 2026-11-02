/**
 * Expérience et niveaux.
 *
 * L'XP n'est jamais stockée : elle est recalculée à partir des séances
 * enregistrées, des cours de MMA et des pesées. Annuler ou corriger une
 * séance corrige donc l'XP, et une sauvegarde restaurée retrouve son niveau.
 */
import {EXERCISE_BY_ID} from './trainingPlan.js';
import {GOALS} from './profile.js';

export const XP_RULES={
  setBase:10,         // chaque série validée
  volumePerXp:10,     // + 1 XP par tranche de 10 kg soulevés (charge × répétitions)
  setCap:80,          // plafond par série
  timedSecondsPerXp:3,// exercices chronométrés : + 1 XP toutes les 3 s
  session:50,         // séance enregistrée
  record:40,          // nouvelle charge maximale sur un exercice
  mma:40,             // cours de MMA marqué comme fait
  weighIn:10,         // une pesée par jour
  goalStepKg:0.5,     // tous les 0,5 kg dans le sens de l'objectif…
  goalStep:75         // … rapportent 75 XP (une seule fois)
};

export const TITLES=[[1,'Recrue'],[3,'Apprenti'],[5,'Régulier'],[8,'Costaud'],[12,'Athlète'],[17,'Machine'],[25,'Légende']];

const num=v=>{const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:NaN;};
const validDate=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d);

/** XP nécessaire pour passer du niveau n au niveau n+1. */
export function xpToNext(level){return 200+(Math.max(1,level)-1)*100;}

export function levelFromXp(total){
  let level=1,rest=Math.max(0,Math.floor(total||0));
  while(rest>=xpToNext(level)){rest-=xpToNext(level);level++;}
  return {level,current:rest,needed:xpToNext(level),title:titleFor(level)};
}

export function titleFor(level){let t=TITLES[0][1];for(const [min,name] of TITLES)if(level>=min)t=name;return t;}

export function setXp(set){
  const reps=num(set?.reps);
  if(!(reps>0))return 0;
  if(EXERCISE_BY_ID[set.exerciseId]?.isTimed)return Math.min(XP_RULES.setCap,XP_RULES.setBase+Math.floor(Math.min(reps,300)/XP_RULES.timedSecondsPerXp));
  const load=num(set.load);
  const volume=load>0?Math.min(load,1000)*Math.min(reps,100):0;
  return Math.min(XP_RULES.setCap,XP_RULES.setBase+Math.floor(volume/XP_RULES.volumePerXp));
}

/** Liste chronologique de tous les gains d'XP. */
export function xpEvents(data={}){
  const events=[];
  const sessions=(Array.isArray(data.sessions)?data.sessions:[]).filter(s=>validDate(s?.date)&&Array.isArray(s.sets)).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const best={};
  for(const s of sessions){
    const sets=s.sets.filter(x=>x&&x.done!==false);
    if(!sets.length)continue;
    const setTotal=sets.reduce((n,x)=>n+setXp(x),0);
    events.push({date:s.date,kind:'sets',label:`${sets.length} série${sets.length>1?'s':''} · ${s.title||'Séance'}`,xp:setTotal});
    events.push({date:s.date,kind:'session',label:`Séance terminée · ${s.title||'Séance'}`,xp:XP_RULES.session});
    const top={};
    for(const x of sets){const load=num(x.load);if(load>0&&!EXERCISE_BY_ID[x.exerciseId]?.isTimed)top[x.exerciseId]=Math.max(top[x.exerciseId]||0,load);}
    for(const [id,load] of Object.entries(top)){
      if(best[id]!=null&&load>best[id])events.push({date:s.date,kind:'record',label:`Record · ${EXERCISE_BY_ID[id]?.name||id} ${load} kg`,xp:XP_RULES.record});
      best[id]=Math.max(best[id]||0,load);
    }
  }
  for(const [date,day] of Object.entries(data.days||{}))if(validDate(date)&&day?.mma)events.push({date,kind:'mma',label:'Cours de MMA',xp:XP_RULES.mma});
  const weights=(Array.isArray(data.weights)?data.weights:[]).filter(w=>validDate(w?.date)&&num(w.weight)>0).slice().sort((a,b)=>a.date.localeCompare(b.date));
  const direction=Math.sign(GOALS.find(g=>g.id===data.profile?.goal)?.weeklyKg||0);
  let steps=0;
  weights.forEach((w,i)=>{
    events.push({date:w.date,kind:'weighIn',label:'Pesée enregistrée',xp:XP_RULES.weighIn});
    if(!direction||i===0)return;
    const reached=Math.floor(Math.round(direction*(num(w.weight)-num(weights[0].weight))*100)/100/XP_RULES.goalStepKg);
    if(reached>steps){events.push({date:w.date,kind:'goal',label:`Objectif poids · ${direction>0?'+':'−'}${(reached*XP_RULES.goalStepKg).toLocaleString('fr-FR')} kg`,xp:(reached-steps)*XP_RULES.goalStep});steps=reached;}
  });
  return events.sort((a,b)=>a.date.localeCompare(b.date));
}

export function computeXp(data){
  const events=xpEvents(data);
  const total=events.reduce((n,e)=>n+e.xp,0);
  const byKind=events.reduce((acc,e)=>({...acc,[e.kind]:(acc[e.kind]||0)+e.xp}),{});
  return {total,byKind,events,...levelFromXp(total)};
}
