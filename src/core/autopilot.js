export function buildAutopilotSnapshot(input){
  const {targets,total,health,phase,training={}}=input;
  const actions=[];
  const sleep=health?.sleepMin;
  const remaining=Math.max(0,Math.round(targets.calories-total.calories));
  const pRemain=Math.max(0,Math.round(targets.protein-total.protein));
  const steps=health?.steps||0;
  if(sleep!==null && sleep<390) actions.push({type:"recovery",priority:"high",text:"Réduire la charge et protéger le sommeil."});
  if(pRemain>25) actions.push({type:"nutrition",priority:"high",text:`Ajouter environ ${pRemain} g de protéines.`});
  if(remaining>500) actions.push({type:"nutrition",priority:"medium",text:`Prévoir un vrai repas (~${remaining} kcal restantes).`});
  if(steps<targets.steps*.8) actions.push({type:"movement",priority:"medium",text:`Ajouter ${Math.round(targets.steps-steps)} pas.`});
  if(training.jjb && remaining>400) actions.push({type:"fuel",priority:"high",text:"Ajouter glucides + protéines avant JJB."});
  if(!actions.length) actions.push({type:"maintain",priority:"low",text:"Continuer le plan sans changer inutilement."});
  return {date:new Date().toISOString(),phase,actions:actions.slice(0,3)};
}

export function minimumDay(){
  return ["Protéines","Hydratation","Marche légère","Sommeil"];
}

export function detectPlateau(history,goal="lean_gain"){
  if(!history || history.length<14) return {detected:false,reason:"insufficient_data"};
  const recent=history.slice(-7).map(x=>x.weight).filter(Number.isFinite);
  const previous=history.slice(-14,-7).map(x=>x.weight).filter(Number.isFinite);
  if(recent.length<4||previous.length<4)return {detected:false,reason:"insufficient_weight_data"};
  const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
  const delta=avg(recent)-avg(previous);
  const threshold=goal==="lean_gain"?0.05:0.08;
  return {detected:delta<threshold,deltaKgPerWeek:delta,suggestedCalories:delta<threshold?150:0};
}

export function calculateRecovery({sleepMin,daysSinceHardTraining=0,jjbRecent=false}){
  let score=100;
  if(Number.isFinite(sleepMin)) score-=Math.max(0,(450-sleepMin)*0.12);
  if(daysSinceHardTraining<1) score-=12;
  if(jjbRecent) score-=8;
  return Math.round(Math.max(0,Math.min(100,score)));
}
