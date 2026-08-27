const roundTo=(value,step=2.5)=>Math.round(value/step)*step;
const validNumber=value=>Number.isFinite(Number(value))&&Number(value)>=0;

export function recoveryScore(context={}){
  let score=100;
  const sleep=Number(context.sleepMin);
  if(Number.isFinite(sleep)) score-=Math.max(0,450-sleep)*0.12;
  else score-=10;
  score-=Math.max(0,Number(context.fatigue||0)-3)*10;
  if(Number(context.recoveryScore)>=0&&Number(context.recoveryScore)<=100) score=(score+Number(context.recoveryScore))/2;
  if(Number(context.proteinRatio)<.8) score-=10;
  if(Number(context.calorieRatio)<.8) score-=8;
  if(Number(context.hydrationRatio)<.65) score-=8;
  score-=Math.min(18,Number(context.jjbSessions||0)*6+Number(context.cardioSessions||0)*4);
  return Math.round(Math.max(0,Math.min(100,score)));
}

export function recommendNextLoad({exercise,history=[],context={}}={}){
  if(!exercise||exercise.type==="REST"||!validNumber(exercise.startLoad)) return {action:"none",recommendedLoad:null,reasons:["Aucune charge pour une journée de repos ou une activité libre."]};
  const sessions=history.filter(item=>item&&item.exerciseId===exercise.id&&Array.isArray(item.sets));
  if(!sessions.length) return {action:"start",recommendedLoad:Number(exercise.startLoad),reasons:["Charge de départ de la semaine 1."]};
  const last=sessions[sessions.length-1];
  const completedSets=last.sets.filter(set=>validNumber(set.load)&&validNumber(set.reps));
  if(completedSets.length<exercise.sets) return {action:"hold",recommendedLoad:Number(last.actualLoad||exercise.startLoad),reasons:["Historique insuffisant : toutes les séries doivent être renseignées."]};
  const load=Number(last.actualLoad||completedSets[0].load||exercise.startLoad);
  const score=recoveryScore(context);
  const allAtTop=completedSets.every(set=>Number(set.reps)>=exercise.maxReps);
  const belowRange=completedSets.filter(set=>Number(set.reps)<exercise.minReps).length>=Math.ceil(exercise.sets/2);
  const hard=completedSets.some(set=>Number(set.rpe)>=9.5||Number(set.rir)===0);
  if(score<45||belowRange){return {action:"decrease",recommendedLoad:Math.max(0,roundTo(load-2.5)),score,reasons:[belowRange?"Plusieurs séries sont sous la fourchette cible.":"Récupération insuffisante.","Réduction prudente de 2,5 kg."]};}
  if(allAtTop&&score>=70&&!hard){return {action:"increase",recommendedLoad:roundTo(load+2.5),score,reasons:["Toutes les séries atteignent le haut de la fourchette.","Récupération compatible avec une progression."]};}
  return {action:"hold",recommendedLoad:Math.max(0,roundTo(load)),score,reasons:[hard?"Effort déjà très élevé (RPE/RIR).":score<70?"Récupération moyenne : consolide cette charge.":"Fourchette de répétitions encore à consolider."]};
}

export function appendPerformance(history=[],performance){
  if(!performance?.exerciseId||!Number.isInteger(performance.week)||performance.week<1) return history;
  return [...history.filter(item=>!(item.exerciseId===performance.exerciseId&&item.week===performance.week)),performance].sort((a,b)=>a.week-b.week);
}

export function historyForExercise(history=[],exerciseId){return history.filter(item=>item.exerciseId===exerciseId).sort((a,b)=>a.week-b.week);}
export function nextWeek(history=[]){return Math.max(0,...history.map(item=>Number(item.week)||0))+1;}
