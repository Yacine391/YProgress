export const DEFAULT_PROFILE={
  heightCm:170, weightKg:55, goal:"lean_gain",
  trainingDays:5, jjbDays:2, dailySteps:10000,
  sleepMin:450, calories:2500, protein:110, fat:70
};

export const PHASES=[
 {id:"september",start:"2026-09-01",end:"2026-09-16",label:"Septembre",mode:"build"},
 {id:"tunisia",start:"2026-09-17",end:"2026-09-20",label:"Tunisie",mode:"travel"},
 {id:"post-travel",start:"2026-09-21",end:"2026-09-30",label:"Retour",mode:"build"},
 {id:"internship",start:"2026-10-01",end:"2026-12-31",label:"Stage + MMA/JJB",mode:"internship"},
 {id:"school-january",start:"2027-01-01",end:"2027-01-31",label:"École 9h–20h",mode:"school"},
 {id:"free",start:"2027-02-01",end:"2099-12-31",label:"Accès libre",mode:"free"}
];

export const DATA_SOURCES={
  health:["steps","sleep","weight","activeEnergy","workouts"],
  nutrition:["meals","calories","protein","carbs","fat","water","caffeine"],
  training:["workouts","sets","reps","load","rpe","jjb"],
  body:["weight","progressPhotos"],
  context:["phase","schedule","travel","school","internship"]
};

export const INTELLIGENCE_MODULES={
autopilot:true,memory:true,dataConfidence:true,uncertainty:true,habitLearning:true,
fridgeAI:true,pantryAI:true,groceryPlanner:true,budgetOptimization:true,receiptScanner:true,
restaurantAI:true,sleepAutoDetection:true,sleepCoach:true,cumulativeFatigue:true,recoveryScore:true,
plateauDetection:true,projections:true,calendarContext:true,offlineFirst:true,antiPerfectionism:true,
voiceInput:true,iphoneWidget:true,liveActivity:true,privacyCenter:true
};
export const CONFIDENCE_LEVELS=["confirmed","high","estimated","unknown"];
