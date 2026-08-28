export const WEEK_DAYS = [
  {key:"mon",label:"LUN",name:"Push",type:"STRENGTH",emoji:"🏋️",subtitle:"Pectoraux • épaules • triceps"},
  {key:"tue",label:"MAR",name:"JJB / Cardio",type:"ACTIVITY",emoji:"🥋",subtitle:"Technique • cardio léger"},
  {key:"wed",label:"MER",name:"Pull",type:"STRENGTH",emoji:"💪",subtitle:"Dos • biceps • arrière d’épaules"},
  {key:"thu",label:"JEU",name:"Repos",type:"REST",emoji:"😴",subtitle:"Récupération complète"},
  {key:"fri",label:"VEN",name:"Legs",type:"STRENGTH",emoji:"🦵",subtitle:"Quadriceps • ischios • mollets"},
  {key:"sat",label:"SAM",name:"JJB / Libre",type:"ACTIVITY",emoji:"🥋",subtitle:"JJB ou activité au choix"},
  {key:"sun",label:"DIM",name:"Récupération",type:"REST",emoji:"🧘",subtitle:"Marche • mobilité • sommeil"}
];

const youtube=(id,title,channel="ScottHermanFitness",start=0)=>({provider:"youtube",id,title,channel,start});
const exercise=(id,name,sets,minReps,maxReps,rest,muscles,startLoad,video)=>({id,name,sets,minReps,maxReps,rest,muscles,startLoad,video:{...video,exerciseId:id}});
const activity=(id,name,duration,rest,muscles,video)=>({id,name,duration,rest,muscles,video});

export const JJB_DRILLS=[
  {name:"Toreando pass",muscles:"Passage de garde ouverte",video:youtube("o4jrNmJvYB8","Toreando style pass","Knight Jiu-Jitsu",200)},
  {name:"Hip bump sweep",muscles:"Renversement depuis garde fermée",video:youtube("qp5AXBHxQec","Hip bump sweep","Knight Jiu-Jitsu",0)},
  {name:"Leg drag depuis toreando",muscles:"Enchaînement de passage",video:youtube("o4jrNmJvYB8","Toreando vers leg drag","Knight Jiu-Jitsu",260)},
  {name:"Triangle depuis garde fermée",muscles:"Soumission et contrôle de posture",video:youtube("9pjdpFCr4UI","Triangle choke from closed guard","Chewjitsu")},
  {name:"Headquarters pass",muscles:"Contrôle et passage debout",video:youtube("o4jrNmJvYB8","Headquarters passing options","Knight Jiu-Jitsu",314)},
  {name:"Échappements de mount",muscles:"Pont, cadrage et récupération de garde",video:youtube("Kcn78sJtPpo","Five mount escapes","Chewjitsu")},
  {name:"Double under pass",muscles:"Passage sous les jambes",video:youtube("o4jrNmJvYB8","Double under passing","Knight Jiu-Jitsu",430)},
  {name:"Soumissions fondamentales",muscles:"Armbar, triangle et étranglements",video:youtube("hY35pBOfSNk","First five submissions","Knight Jiu-Jitsu")}
];

export function jjbDrillFor(week=1,dayKey="tue"){
  const sessionOffset=dayKey==="sat"?1:0;
  const index=((Math.max(1,Number(week)||1)-1)*2+sessionOffset)%JJB_DRILLS.length;
  return {...JJB_DRILLS[index],id:`jjb-drill-${index}`,duration:"20–30 min",rest:"Répéter lentement",isDrill:true};
}

export const EXERCISE_ALTERNATIVES=[
  {id:"ez-bar-curl",name:"Curl barre EZ",muscles:"Biceps",startLoad:20,video:youtube("kwG2ipFRgfo","Barbell Curl")},
  {id:"preacher-curl",name:"Curl pupitre",muscles:"Biceps",startLoad:15,video:youtube("fIWP-FRFNU0","Preacher Curl")},
  {id:"cable-curl",name:"Curl poulie",muscles:"Biceps",startLoad:15,video:youtube("NFzTWp2qpiE","Cable Curl")},
  {id:"skull-crusher",name:"Barre au front",muscles:"Triceps",startLoad:20,video:youtube("d_KZxkY_0cM","Skull Crushers")},
  {id:"overhead-triceps",name:"Extension triceps au-dessus de la tête",muscles:"Triceps",startLoad:12,video:youtube("YbX7Wd8jQ-Q","Overhead Triceps Extension")},
  {id:"machine-shoulder-press",name:"Développé épaules machine",muscles:"Épaules",startLoad:25,video:youtube("WvLMauqrnK8","Machine Shoulder Press")},
  {id:"cable-lateral-raise",name:"Élévations latérales poulie",muscles:"Épaules",startLoad:5,video:youtube("PPrzBWZDOhA","Cable Lateral Raise")},
  {id:"pec-deck",name:"Pec deck",muscles:"Pectoraux",startLoad:30,video:youtube("eGjt4lk6g34","Pec Deck Fly")},
  {id:"machine-row",name:"Rowing machine",muscles:"Dos",startLoad:30,video:youtube("FU6YQawma2Q","Chest Supported Row Machine","Renaissance Periodization")},
  {id:"leg-press",name:"Presse à cuisses",muscles:"Quadriceps / fessiers",startLoad:80,video:youtube("IZxyjW7MPJQ","Leg Press")}
].map(item=>({...item,sets:3,minReps:8,maxReps:12,rest:"90 s",video:{...item.video,exerciseId:item.id}}));

export function customExercise({name,muscles="Exercice personnalisé",startLoad=0}={}){
  const clean=String(name||"").trim();if(!clean)return null;
  const id=`custom-${clean.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")}`;
  return {id,name:clean,muscles,startLoad:Math.max(0,Number(startLoad)||0),sets:3,minReps:8,maxReps:12,rest:"90 s",custom:true,video:null};
}

export const WORKOUTS = {
  Push:{type:"STRENGTH",emoji:"🏋️",focus:"Pectoraux • épaules • triceps",duration:"60–70 min",exercises:[
    exercise("bench-press","Développé couché",4,6,10,"2–3 min","Pectoraux / triceps",60,youtube("rT7DgCr-3pg","Barbell Bench Press")),
    exercise("incline-db-press","Développé incliné haltères",3,8,12,"2 min","Haut des pectoraux",20,youtube("hChjZQhX1Ls","Incline Dumbbell Press")),
    exercise("lateral-raise","Élévations latérales",3,12,20,"60–90 s","Deltoïdes moyens",8,youtube("3VcKaXpzqRo","Dumbbell Side Lateral Raise")),
    exercise("shoulder-press","Développé épaules haltères",2,8,12,"2 min","Épaules / triceps",18,youtube("qEwKCR5JCog","Dumbbell Shoulder Press")),
    exercise("cable-fly","Écartés poulie haute",2,12,15,"60–90 s","Pectoraux",12.5,youtube("Iwe6AmxVf7o","High Cable Chest Fly")),
    exercise("triceps-pushdown","Extension triceps poulie",3,10,15,"60–90 s","Triceps",20,youtube("2-LAMcpzODU","Tricep Pushdown"))]},
  Pull:{type:"STRENGTH",emoji:"💪",focus:"Dos • biceps • arrière d’épaules",duration:"60–70 min",exercises:[
    exercise("lat-pulldown","Tirage vertical",4,6,10,"2–3 min","Grand dorsal",45,youtube("CAwf7n6Luuc","Lat Pulldown")),exercise("chest-row","Rowing poitrine supportée",3,8,12,"2 min","Milieu du dos",30,youtube("lthUc2I9NNo","Chest Supported Row","Sean Nalewanyj")),exercise("cable-row","Tirage poulie basse",2,10,15,"90 s","Dos",35,youtube("GZbfZ033f74","Seated Low Row")),exercise("reverse-fly","Oiseau haltères",3,12,20,"60–90 s","Arrière d’épaules",7.5,youtube("ttvfGg9d76c","Dumbbell Bent-Over Raise")),exercise("incline-curl","Curl incliné haltères",3,8,12,"90 s","Biceps",10,youtube("soxrZlIl35U","Seated Incline Dumbbell Curl")),exercise("hammer-curl","Curl marteau",2,10,15,"60–90 s","Biceps / avant-bras",12,youtube("zC3nLlEvin4","Dumbbell Hammer Curl"))]},
  Legs:{type:"STRENGTH",emoji:"🦵",focus:"Quadriceps • ischios • fessiers • mollets",duration:"60–75 min",exercises:[
    exercise("squat","Squat barre",4,6,10,"2–3 min","Quadriceps / fessiers",60,youtube("SW_C1A-rejs","Deep Barbell Back Squat")),exercise("romanian-deadlift","Soulevé de terre roumain",3,8,12,"2–3 min","Ischios / fessiers",50,youtube("2SHsk9AzdjA","Romanian Deadlift","LivestrongWoman")),exercise("bulgarian-split-squat","Fentes bulgares",3,8,12,"2 min","Jambes",14,youtube("2C-uNgKwPLE","Bulgarian Split Squat")),exercise("leg-curl","Leg curl allongé",3,10,15,"90 s","Ischios",25,youtube("ELOCsoDSmrg","Lying Leg Curl")),exercise("leg-extension","Leg extension",2,12,15,"60–90 s","Quadriceps",25,youtube("YyvSfVjQeL0","Leg Extension")),exercise("calf-raise","Mollets assis",3,10,20,"60–90 s","Mollets",30,youtube("JbyjNymZOt0","Seated Calf Raise","Howcast"))]},
  "JJB / Cardio":{type:"ACTIVITY",emoji:"🥋",focus:"Technique • condition physique",duration:"60–90 min",exercises:[activity("warmup","Échauffement JJB","10 min","—","Mobilité + mouvements fondamentaux",youtube("kd6tg6wS1_A","BJJ Warm-ups and Solo Drills","Dominion BJJ")),activity("drills","Technique du jour","20–30 min","—","Rotation hebdomadaire"),activity("sparring","Rounds / sparring","4–6 rounds","2 min","Application progressive",youtube("hY35pBOfSNk","Fundamental submissions to recognize","Knight Jiu-Jitsu")),activity("cooldown","Retour au calme","5–10 min","—","Respiration + mobilité",youtube("kd6tg6wS1_A","BJJ mobility and solo movements","Dominion BJJ"))]},
  "JJB / Libre":{type:"ACTIVITY",emoji:"🥋",focus:"JJB ou activité au choix",duration:"45–90 min",exercises:[activity("warmup-free","Échauffement JJB","10 min","—","Préparation",youtube("kd6tg6wS1_A","BJJ Warm-ups and Solo Drills","Dominion BJJ")),activity("free-activity","Technique du jour","20–30 min","—","Rotation hebdomadaire"),activity("mobility-free","Mobilité","10 min","—","Récupération",youtube("kd6tg6wS1_A","BJJ mobility and solo movements","Dominion BJJ"))]},
  Repos:{type:"REST",emoji:"😴",focus:"Récupération complète",duration:"Aucune séance",priorities:["Sommeil 7 h 30 minimum","Hydratation régulière","Protéines et calories suffisantes","Marche légère si tu en as envie"]},
  Récupération:{type:"REST",emoji:"🧘",focus:"Recharge pour la semaine suivante",duration:"20–30 min optionnelles",priorities:["Marche douce sans objectif de performance","Mobilité légère","Préparer les repas de la semaine","Coucher régulier"]}
};

export function dayKeyForDate(date=new Date()){return ["sun","mon","tue","wed","thu","fri","sat"][date.getDay()];}
export function dayByKey(key){return WEEK_DAYS.find(day=>day.key===key)||WEEK_DAYS[0];}
