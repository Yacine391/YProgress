export const EVENTS={
  HEALTH_SYNC:"health.sync",
  MEAL_ADDED:"meal.added",
  MEAL_ANALYZED:"meal.analyzed",
  WEIGHT_ADDED:"weight.added",
  SLEEP_SYNC:"sleep.sync",
  WORKOUT_COMPLETED:"workout.completed",
  JJB_COMPLETED:"jjb.completed",
  WATER_ADDED:"water.added",
  COACH_REQUESTED:"coach.requested",
  COACH_RESPONSE:"coach.response",
  PLAN_GENERATED:"plan.generated",
  NOTIFICATION_ACTION:"notification.action"
};

export const AI_CONTRACTS={
  mealAnalysis:{input:["image","optional_context"],output:["foods","estimatedCalories","protein","carbs","fat","confidence","questions"]},
  coach:{input:["profile","targets","health7d","nutrition7d","training7d","phase","today"],output:["summary","priorities","nutrition","training","recovery","why","confidence"]},
  weekly:{input:["history14d","profile","goal"],output:["score","wins","problems","changes","nextWeek"]},
  projection:{input:["weightHistory","calorieHistory","activityHistory","goal"],output:["4w","12w","24w","assumptions"]},
  restaurant:{input:["menuPhoto","remainingMacros","budget"],output:["choices","estimates","tradeoffs"]}
};

export const AI_EXTENDED_CONTRACTS={
fridgeInventory:{input:["fridgePhoto","pantryPhoto?","freezerPhoto?"],output:["inventory","uncertainties","missingEssentials"]},
groceryPlan:{input:["inventory","remainingMacros","weeklyPlan","budget","preferences"],output:["priorityItems","optionalItems","estimatedCost","coverage"]},
habitLearning:{input:["history30d","coachEvents"],output:["correlations","confidence","experiments"]},
sleepCoach:{input:["currentTime","plannedWake","sleepHistory","fatigue","tomorrowTraining"],output:["bedWindow","targetSleep","urgency","why"]},
dataConfidence:{input:["dataSources","conflicts"],output:["confidence","preferredSource","explanation"]}
};
