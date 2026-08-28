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

const drillGroup=(names,muscles,video)=>names.map(name=>({name,muscles,video}));
const PASS_VIDEO=youtube("o4jrNmJvYB8","Open Guard Passing Styles, Techniques & Concepts","Knight Jiu-Jitsu");
const SWEEP_VIDEO=youtube("qp5AXBHxQec","The First 4 Sweeps You Need To Know","Knight Jiu-Jitsu");
const SUB_VIDEO=youtube("hY35pBOfSNk","The First 5 Submissions You Need To Know","Knight Jiu-Jitsu");
const MOUNT_VIDEO=youtube("Kcn78sJtPpo","The First 5 Mount Escapes You Need to Know","Chewjitsu");
const SOLO_VIDEO=youtube("kd6tg6wS1_A","BJJ Warm-ups and Solo Drills","Dominion BJJ");
const TRIANGLE_VIDEO=youtube("9pjdpFCr4UI","Triangle Choke From Closed Guard","Chewjitsu");

// 30 semaines × 2 séances : aucune technique répétée avant mars 2027.
export const JJB_DRILLS=[
  ...drillGroup(["Toreando : contrôle des chevilles","Toreando : déplacement latéral","Toreando : stabilisation side control","Toreando vers leg drag","Leg drag : contrôle de hanche","Leg drag : passage et stabilisation","Headquarters : entrée","Headquarters : knee cut","Headquarters : smash pass","Double under : entrée sous les jambes","Double under : stack et passage","Passage assis : contrôle des poignets","Passage assis : changement d’angle","Kimura trap pour passer","Chaîne toreando → leg drag","Chaîne headquarters → knee cut"],"Passage de garde ouverte",PASS_VIDEO),
  ...drillGroup(["Elevator sweep : placement des crochets","Elevator sweep : déséquilibre et montée","Hip bump sweep : contrôle de posture","Hip bump sweep : montée de hanche","Scissor sweep : cadrage et angle","Scissor sweep : coupe et finition","Pendulum sweep : contrôle du bras","Pendulum sweep : balancier et montée","Chaîne hip bump → kimura","Chaîne hip bump → guillotine","Chaîne scissor → technical stand-up","Choisir le sweep selon la base"],"Renversements depuis la garde fermée",SWEEP_VIDEO),
  ...drillGroup(["Armbar : isolation du bras","Armbar : angle et finition","Triangle : casser la posture","Triangle : verrouillage et angle","Rear naked choke : contrôle du dos","Rear naked choke : finition propre","Guillotine : contrôle de tête","Guillotine : fermeture et garde","Americana : contrôle du coude","Americana : finition progressive"],"Soumissions fondamentales",SUB_VIDEO),
  ...drillGroup(["Mount escape : trap and roll","Mount escape : pont et retournement","Mount escape : elbow escape","Mount escape : récupération du genou","Mount escape : kipping frames","Mount escape : connexion des genoux","Mount escape : heel drag","Mount escape : sortie vers demi-garde","Mount escape : protéger les bras","Chaîne upa → elbow escape"],"Défense et sorties de mount",MOUNT_VIDEO),
  ...drillGroup(["Triangle : entrée poignet-biceps","Triangle : contrôle de posture","Triangle : couper l’angle","Triangle : finition sans tirer la tête"],"Triangle depuis garde fermée",TRIANGLE_VIDEO),
  ...drillGroup(["Shrimp et reverse shrimp","Bridge et déplacement des hanches","Leg fencing pour récupérer la garde","Hip scoot et entrée assise","Sit-through et retour en base","Granby roll contrôlé","Breakfall arrière sécurisé","Technical stand-up"],"Mouvements fondamentaux et mobilité JJB",SOLO_VIDEO)
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
