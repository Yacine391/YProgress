import {calculateRecovery,detectPlateau,buildAutopilotSnapshot} from "./autopilot.js";

export function confidence(source,quality=1){
  if(source==="healthkit"&&quality>=.9)return "confirmed";
  if(quality>=.8)return "high";
  if(quality>=.5)return "estimated";
  return "unknown";
}

export function buildSleepRecommendation({nowMinutes,wakeMinutes,avgSleepMin=450,sleepDebtMin=0}){
  const desired=Math.round(Math.max(420,Math.min(540,avgSleepMin+Math.min(60,Math.max(0,sleepDebtMin*.35)))));
  const remaining=((wakeMinutes-nowMinutes)+1440)%1440;
  return {desiredSleepMin:desired,remainingUntilWakeMin:remaining,urgency:remaining<desired?"high":"normal",
    message:remaining<desired?"Priorité au temps de sommeil disponible : va dormir dès que possible.":`Vise environ ${Math.floor(desired/60)}h${String(desired%60).padStart(2,"0")} de sommeil.`};
}

export function buildWeeklyLearning(history=[]){
  const sleepGood=history.filter(x=>x.sleepMin>=450);
  const proteinGood=history.filter(x=>x.protein>=x.proteinTarget);
  return {sampleDays:history.length,sleepGoodDays:sleepGood.length,proteinGoodDays:proteinGood.length};
}

export function buildFullIntelligenceSnapshot(input){
  return {
    recovery:calculateRecovery(input.recovery||{}),
    plateau:detectPlateau(input.weightHistory||[],input.goal||"lean_gain"),
    autopilot:buildAutopilotSnapshot(input),
    learning:buildWeeklyLearning(input.history||[])
  };
}
