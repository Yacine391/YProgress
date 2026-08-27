export const WEEK_DAYS = [
  {key:"mon",label:"LUN",name:"Push",type:"STRENGTH",emoji:"🏋️",subtitle:"Pectoraux • épaules • triceps"},
  {key:"tue",label:"MAR",name:"JJB / Cardio",type:"ACTIVITY",emoji:"🥋",subtitle:"Technique • cardio léger"},
  {key:"wed",label:"MER",name:"Pull",type:"STRENGTH",emoji:"💪",subtitle:"Dos • biceps • arrière d’épaules"},
  {key:"thu",label:"JEU",name:"Repos",type:"REST",emoji:"😴",subtitle:"Récupération complète"},
  {key:"fri",label:"VEN",name:"Legs",type:"STRENGTH",emoji:"🦵",subtitle:"Quadriceps • ischios • mollets"},
  {key:"sat",label:"SAM",name:"JJB / Libre",type:"ACTIVITY",emoji:"🥋",subtitle:"JJB ou activité au choix"},
  {key:"sun",label:"DIM",name:"Récupération",type:"REST",emoji:"🧘",subtitle:"Marche • mobilité • sommeil"}
];

const exercise=(id,name,sets,minReps,maxReps,rest,muscles,startLoad,video)=>({id,name,sets,minReps,maxReps,rest,muscles,startLoad,video});
const activity=(id,name,duration,rest,muscles)=>({id,name,duration,rest,muscles});

export const WORKOUTS = {
  Push:{type:"STRENGTH",emoji:"🏋️",focus:"Pectoraux • épaules • triceps",duration:"60–70 min",exercises:[
    exercise("bench-press","Développé couché",4,6,10,"2–3 min","Pectoraux / triceps",60,"https://videos.pexels.com/video-files/4761426/4761426-hd_1920_1080_25fps.mp4"),
    exercise("incline-db-press","Développé incliné haltères",3,8,12,"2 min","Haut des pectoraux",20,"https://videos.pexels.com/video-files/5319759/5319759-hd_1920_1080_25fps.mp4"),
    exercise("lateral-raise","Élévations latérales",3,12,20,"60–90 s","Deltoïdes moyens",8,"https://videos.pexels.com/video-files/5319099/5319099-hd_1920_1080_25fps.mp4"),
    exercise("shoulder-press","Développé épaules",2,8,12,"2 min","Épaules / triceps",18,null),
    exercise("cable-fly","Écartés poulie",2,12,15,"60–90 s","Pectoraux",12.5,null),
    exercise("triceps-pushdown","Extension triceps poulie",3,10,15,"60–90 s","Triceps",20,null)]},
  Pull:{type:"STRENGTH",emoji:"💪",focus:"Dos • biceps • arrière d’épaules",duration:"60–70 min",exercises:[
    exercise("lat-pulldown","Tractions / tirage vertical",4,6,10,"2–3 min","Grand dorsal",45,null),exercise("chest-row","Rowing poitrine supportée",3,8,12,"2 min","Milieu du dos",30,null),exercise("cable-row","Tirage poulie basse",2,10,15,"90 s","Dos",35,null),exercise("reverse-fly","Oiseau / reverse fly",3,12,20,"60–90 s","Arrière d’épaules",7.5,null),exercise("incline-curl","Curl incliné haltères",3,8,12,"90 s","Biceps",10,null),exercise("hammer-curl","Curl marteau",2,10,15,"60–90 s","Biceps / avant-bras",12,null)]},
  Legs:{type:"STRENGTH",emoji:"🦵",focus:"Quadriceps • ischios • fessiers • mollets",duration:"60–75 min",exercises:[
    exercise("squat","Squat / presse à cuisses",4,6,10,"2–3 min","Quadriceps / fessiers",60,null),exercise("romanian-deadlift","Soulevé de terre roumain",3,8,12,"2–3 min","Ischios / fessiers",50,null),exercise("bulgarian-split-squat","Fentes bulgares",3,8,12,"2 min","Jambes",14,null),exercise("leg-curl","Leg curl",3,10,15,"90 s","Ischios",25,null),exercise("leg-extension","Leg extension",2,12,15,"60–90 s","Quadriceps",25,null),exercise("calf-raise","Mollets debout",3,10,20,"60–90 s","Mollets",30,null)]},
  "JJB / Cardio":{type:"ACTIVITY",emoji:"🥋",focus:"Technique • condition physique",duration:"60–90 min",exercises:[activity("warmup","Échauffement","10 min","—","Mobilité + cardio"),activity("drills","Technique / drills","20–30 min","—","Travail technique"),activity("sparring","Rounds / sparring","4–6 rounds","2 min","Selon récupération"),activity("cooldown","Retour au calme","5–10 min","—","Respiration + mobilité")]},
  "JJB / Libre":{type:"ACTIVITY",emoji:"🥋",focus:"JJB ou activité au choix",duration:"45–90 min",exercises:[activity("warmup-free","Échauffement","10 min","—","Préparation"),activity("free-activity","JJB / activité","30–60 min","—","Selon récupération"),activity("mobility-free","Mobilité","10 min","—","Récupération")]},
  Repos:{type:"REST",emoji:"😴",focus:"Récupération complète",duration:"Aucune séance",priorities:["Sommeil 7 h 30 minimum","Hydratation régulière","Protéines et calories suffisantes","Marche légère si tu en as envie"]},
  Récupération:{type:"REST",emoji:"🧘",focus:"Recharge pour la semaine suivante",duration:"20–30 min optionnelles",priorities:["Marche douce sans objectif de performance","Mobilité légère","Préparer les repas de la semaine","Coucher régulier"]}
};

export function dayKeyForDate(date=new Date()){return ["sun","mon","tue","wed","thu","fri","sat"][date.getDay()];}
export function dayByKey(key){return WEEK_DAYS.find(day=>day.key===key)||WEEK_DAYS[0];}
