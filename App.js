import {initPWA} from "./src/pwa";
import React, {useEffect, useMemo, useState} from "react";
import {SafeAreaView,View,Text,StyleSheet,Pressable,ScrollView,TextInput,Alert,Switch,Image} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {StatusBar} from "expo-status-bar";

const BASE={calories:2500,protein:110,fat:70,steps:10000,sleepMin:450,weight:55};
const AI_BASE_URL=(process.env.EXPO_PUBLIC_AI_BASE_URL||"").replace(/\/$/,"");
const iso=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`};
const carbs=(k,p,f)=>Math.max(0,Math.round((k-p*4-f*9)/4));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));

function phaseFor(date=new Date()){
  const y=date.getFullYear(),m=date.getMonth()+1,d=date.getDate();
  if(y===2026&&m===9&&d>=17&&d<=20)return{key:"travel",icon:"🇹🇳",title:"Tunisie",sub:"17 → 20 septembre • maintien souple"};
  if(y===2026&&m===9)return{key:"september",icon:"🌱",title:"Septembre",sub:"Construction des habitudes"};
  if(y===2026&&m>=10&&m<=12)return{key:"internship",icon:"🥋",title:"Stage + MMA/JJB",sub:"Progression + récupération"};
  if(y===2027&&m===1)return{key:"school",icon:"🎓",title:"École 9h → 20h",sub:"Routine compacte"};
  if(y>=2027&&m>=2)return{key:"free",icon:"🏋️",title:"Accès libre",sub:"Optimisation"};
  return{key:"default",icon:"✨",title:"YProgress",sub:"Routine personnelle"};
}
function Card({children,style}){return <View style={[S.card,style]}>{children}</View>}
function Button({title,onPress,secondary}){return <Pressable onPress={onPress} style={[S.button,secondary&&S.button2]}><Text style={[S.buttonText,secondary&&S.buttonText2]}>{title}</Text></Pressable>}
function Field({label,value,onChange,keyboardType,style}){return <View style={[{marginBottom:10},style]}><Text style={S.label}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboardType||"default"} style={S.input} placeholderTextColor="#70768b"/></View>}
function Progress({value,target}){const p=clamp((Number(value)||0)/(Number(target)||1),0,1);return <View style={S.track}><View style={[S.fill,{width:`${p*100}%`}]}/></View>}
function Metric({emoji,label,value,target}){return <View style={S.metric}><Text>{emoji}</Text><Text style={S.metricValue}>{value}</Text><Text style={S.metricTarget}>/ {target}</Text><Text style={S.metricLabel}>{label}</Text><Progress value={value} target={parseFloat(target)||1}/></View>}
function Pill({children,active,onPress}){return <Pressable onPress={onPress} style={[S.pill,active&&S.pillActive]}><Text style={S.pillText}>{children}</Text></Pressable>}

export default function App(){
  if(typeof window!=='undefined'){try{initPWA()}catch(e){}}
  const [tab,setTab]=useState("home"),[logs,setLogs]=useState([]),[weights,setWeights]=useState([]);
  const [health,setHealth]=useState({steps:null,sleepMin:null,activeKcal:null,weight:null});
  const [targets,setTargets]=useState(BASE),[weight,setWeight]=useState("55"),[steps,setSteps]=useState("0");
  const [sleep,setSleep]=useState("23:30"),[wake,setWake]=useState("07:30"),[quality,setQuality]=useState("4");
  const [notifications,setNotifications]=useState(false),[gym,setGym]=useState(false),[jjb,setJjb]=useState(false);
  const [caffeine,setCaffeine]=useState(false),[hardDay,setHardDay]=useState(false),[restaurantMode,setRestaurantMode]=useState(false),[autopilot,setAutopilot]=useState(true);
  const [water,setWater]=useState(0),[waterTarget,setWaterTarget]=useState(3000),[weekPlan,setWeekPlan]=useState(null);
  const [selectedWorkout,setSelectedWorkout]=useState(null),[workoutLogs,setWorkoutLogs]=useState({});
  const [coach,setCoach]=useState("Appuie sur « Analyser ma journée » pour obtenir une décision claire.");
  const [coachLoading,setCoachLoading]=useState(false),[photo,setPhoto]=useState(null),[budget,setBudget]=useState("60");
  const [weekly,setWeekly]=useState({score:0,weightChange:0,avgCalories:0,avgProtein:0});

  useEffect(()=>{(async()=>{
    const all=JSON.parse(await AsyncStorage.getItem("logs")||"[]");
    setLogs(all.filter(x=>x.date===iso()));
    setWeights(JSON.parse(await AsyncStorage.getItem("weights")||"[]"));
    const t=JSON.parse(await AsyncStorage.getItem("targets")||"null");if(t)setTargets({...BASE,...t});
    const w=JSON.parse(await AsyncStorage.getItem("weekly")||"null");if(w)setWeekly(w);
    const wd=JSON.parse(await AsyncStorage.getItem("workoutLogs")||"{}");setWorkoutLogs(wd);
    const dayWater=JSON.parse(await AsyncStorage.getItem("water:"+iso())||"0");setWater(Number(dayWater)||0);
  })()},[]);

  const total=useMemo(()=>logs.reduce((a,x)=>({calories:a.calories+Number(x.calories||0),protein:a.protein+Number(x.protein||0),carbs:a.carbs+Number(x.carbs||0),fat:a.fat+Number(x.fat||0)}),{calories:0,protein:0,carbs:0,fat:0}),[logs]);
  const phase=phaseFor(),dynamicCarbs=carbs(targets.calories,targets.protein,targets.fat);
  const currentWeight=(health.weight ?? Number(weight)) || 55, stepValue=(health.steps ?? Number(steps)) || 0;
  const remaining=Math.max(0,Math.round(targets.calories-total.calories)), pRemain=Math.max(0,Math.round(targets.protein-total.protein));

  async function addLog(x){const all=JSON.parse(await AsyncStorage.getItem("logs")||"[]");const n=[...all,{...x,date:iso(),createdAt:Date.now()}];await AsyncStorage.setItem("logs",JSON.stringify(n));setLogs(n.filter(a=>a.date===iso()))}
  async function saveWeight(){const v=Number(weight);if(!v)return;const n=[...weights,{date:iso(),weight:v}];setWeights(n);setHealth(h=>({...h,weight:v}));await AsyncStorage.setItem("weights",JSON.stringify(n))}
  function sleepMin(){const[a,b]=sleep.split(":").map(Number),[c,d]=wake.split(":").map(Number);let n=c*60+d-(a*60+b);if(n<=0)n+=1440;return n}
  async function saveSleep(){const n=sleepMin();setHealth(h=>({...h,sleepMin:n}));await AsyncStorage.setItem("sleep:"+iso(),JSON.stringify({sleep,wake,quality,duration:n}));Alert.alert("Sommeil",`${Math.floor(n/60)}h${String(n%60).padStart(2,"0")} • ${quality}/5`)}
  async function photoMeal(){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)return Alert.alert("Caméra","Autorise la caméra dans Réglages.");const r=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.8});if(!r.canceled)setPhoto(r.assets[0].uri)}
  async function scheduleNotifications(v){setNotifications(v);await Notifications.requestPermissionsAsync();await Notifications.cancelAllScheduledNotificationsAsync();if(!v)return;for(const [h,m,t,b] of [[8,0,"🌅 YProgress","Petit-déjeuner + protéines"],[13,0,"🍽️ YProgress","Enregistre ton déjeuner"],[16,30,"🥛 YProgress","Vérifie tes protéines"],[19,0,"🏋️ YProgress","Prépare ton entraînement"],[22,30,"😴 YProgress","Protège ton sommeil"]])await Notifications.scheduleNotificationAsync({content:{title:t,body:b},trigger:{hour:h,minute:m,repeats:true}})}
  async function analyze(){setCoachLoading(true);const url=process.env.EXPO_PUBLIC_AI_BASE_URL;const recentWorkouts=Object.entries(workoutLogs).slice(-14).map(([date,day])=>({date,workouts:day}));const payload={profile:{weight:currentWeight,targets,phase:phase.key},today:{date:iso(),total,steps:stepValue,sleepMin:health.sleepMin,gym,jjb,water,waterTarget},recentWorkouts,coachContext:{autopilot,hardDay,caffeine,restaurantMode}};const endpoint=AI_BASE_URL||((typeof window!=="undefined"&&window.location?.origin)?window.location.origin+"/api":"");if(endpoint)try{const r=await fetch(endpoint+"/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(r.ok&&(d.message||d.coach)){setCoach(d.message||d.coach);setCoachLoading(false);return}}catch(e){}const msg=health.sleepMin!==null&&health.sleepMin<390?"😴 Récupération prioritaire : sommeil insuffisant. Fais une séance plus légère et évite le cardio supplémentaire.":jjb&&remaining>500?`🥋 JJB ce soir : il te manque ${remaining} kcal. Ajoute glucides + protéines avant le cours.`:pRemain>25?`🥩 Il te manque ${pRemain} g de protéines. Priorité à une vraie source protéinée.`:remaining>400?`🍚 Il te reste ${remaining} kcal. Ne termine pas la journée trop bas.`:"✅ Très bonne journée. Continue sans chercher la perfection.";setCoach(msg);setCoachLoading(false)}
  async function weeklyAnalysis(){const avg=total.calories,pr=total.protein;const score=Math.round(clamp((avg/targets.calories)*35+(pr/targets.protein)*25+(stepValue/targets.steps)*20+(health.sleepMin?Math.min(1,health.sleepMin/450)*20:10),0,100));const x={score,weightChange:weights.length>1?weights[weights.length-1].weight-weights[0].weight:0,avgCalories:avg,avgProtein:pr};setWeekly(x);await AsyncStorage.setItem("weekly",JSON.stringify(x));Alert.alert("Bilan","Score de régularité : "+score+"/100")}

  const autopilotActions=useMemo(()=>{
    const actions=[];
    if(health.sleepMin!==null && health.sleepMin<390) actions.push("😴 Priorité récupération : vise une soirée calme et pas de cardio supplémentaire.");
    if(pRemain>25) actions.push(`🥩 Ajoute environ ${pRemain} g de protéines aujourd'hui.`);
    if(remaining>500) actions.push(`🍚 Il te reste ${remaining} kcal : prévois un vrai repas plutôt que de compenser demain.`);
    if(stepValue<targets.steps*.8) actions.push(`🚶 Il te manque ${Math.max(0,Math.round(targets.steps-stepValue))} pas.`);
    if(water<waterTarget*.65) actions.push(`💧 Hydratation : ${Math.max(0,waterTarget-water)} ml restants.`);
    if(!actions.length) actions.push("✅ Journée bien maîtrisée. Garde la même régularité.");
    return actions.slice(0,3);
  },[health.sleepMin,pRemain,remaining,stepValue,water,waterTarget,targets.steps]);

  function generateWeek(){
    const p=phase.key;
    const plan=p==="travel"
      ? ["Lun • marche + mobilité","Mar • full body 30 min","Mer • repos actif","Jeu • marche + mobilité","Ven • full body 30 min","Sam • repos","Dim • récupération"]
      : p==="school"
      ? ["Lun • Push 45 min","Mar • repos","Mer • Pull 45 min","Jeu • repos","Ven • Legs 45 min","Sam • JJB / libre","Dim • récupération"]
      : ["Lun • Push","Mar • JJB / cardio léger","Mer • Pull","Jeu • repos","Ven • Legs","Sam • JJB / activité","Dim • récupération"];
    setWeekPlan(plan);
  }

  function applyAutopilot(){
    setHardDay(false);
    setRestaurantMode(false);
    Alert.alert("Autopilot activé","YProgress va privilégier 3 actions essentielles par jour et adapter entraînement, alimentation et récupération.");
  }

  function emergencyDay(){
    setHardDay(true);
    Alert.alert("Minimum Day","Aujourd'hui : protéines, hydratation, marche légère et sommeil. Pas besoin d'une journée parfaite.");
  }

  function restaurantChoice(){
    setRestaurantMode(true);
    Alert.alert("Mode restaurant","Choisis le plat qui te plaît. YProgress estimera les calories et ajustera le reste de ta journée sans culpabilisation.");
  }

  async function setWaterAmount(value){
    const n=clamp(Math.round(Number(value)||0),0,waterTarget);
    setWater(n);
    await AsyncStorage.setItem("water:"+iso(),JSON.stringify(n));
  }
  function addWater(amount){setWaterAmount(water+amount)}

  function Home(){return <ScrollView contentContainerStyle={S.content}>
    <View style={S.header}><View><Text style={S.eyebrow}>YPROGRESS • COACH OS</Text><Text style={S.title}>Salut Yacine 👋</Text><Text style={S.muted}>Ton coach décide avec toi.</Text></View><View style={S.avatar}><Text style={S.avatarText}>Y</Text></View></View>
    <View style={S.phase}><Text style={S.phaseIcon}>{phase.icon}</Text><View style={{flex:1}}><Text style={S.phaseTitle}>{phase.title}</Text><Text style={S.phaseSub}>{phase.sub}</Text></View><Text style={S.arrow}>›</Text></View>
    <Card style={S.hero}><View><Text style={S.eyebrow}>RESTE À MANGER</Text><Text style={S.heroNum}>{remaining}</Text><Text style={S.muted}>kcal • cible dynamique</Text></View><View style={S.glow}><Text style={{fontSize:32}}>🔥</Text></View></Card>
    <View style={S.metrics}><Metric emoji="🔥" label="Calories" value={Math.round(total.calories)} target={targets.calories}/><Metric emoji="🥩" label="Protéines" value={Math.round(total.protein)} target={targets.protein+"g"}/><Metric emoji="🚶" label="Pas" value={stepValue} target="10k"/></View>
    <Card><View style={S.cardHead}><Text style={S.section}>🧠 Décision du jour</Text><Text style={S.ai}>ADAPTATIF</Text></View><Text style={S.coach}>{coach}</Text><Text style={S.muted}>{coachLoading?"Analyse IA en cours…":(AI_BASE_URL||typeof window!=="undefined")?"Coach IA connecté • clé conservée côté serveur":"Mode local de secours"}</Text><Button title={coachLoading?"Analyse…":"Analyser ma journée"} onPress={analyze}/></Card>
    <Card style={S.autopilot}>
      <View style={S.cardHead}><Text style={S.section}>🧠 AUTOPILOT</Text><Text style={S.ai}>3 PRIORITÉS</Text></View>
      {autopilotActions.map((a,i)=><View key={i} style={S.actionRow}><Text style={S.actionNum}>{i+1}</Text><Text style={S.text}>{a}</Text></View>)}
      <Button title="Planifier ma semaine" onPress={()=>{generateWeek();setTab("program")}} secondary/>
    </Card>
    <Card><Text style={S.section}>😴 Récupération</Text><Text style={S.text}>{health.sleepMin?`${Math.floor(health.sleepMin/60)}h${String(health.sleepMin%60).padStart(2,"0")}`:"Pas encore synchronisé"} • qualité {quality}/5</Text><Text style={S.muted}>Sommeil + activité + entraînement alimentent le coach.</Text></Card>
    <Card style={S.workout}><Text style={S.section}>{jjb?"🥋 MMA / JJB":"🏋️ Séance du jour"}</Text><Text style={S.workoutTitle}>{jjb?"Technique + sparring":`${todayWorkout().emoji} ${todayWorkout().name}`}</Text><Text style={S.muted}>{todayWorkout().subtitle} • {gym?"Séance activée":"À planifier"}</Text><Button title="Voir le programme" onPress={()=>setTab("program")} secondary/></Card>
    <Card><Text style={S.section}>🎯 Mode « journée difficile »</Text><Text style={S.muted}>Si tu es KO, active le mode récupération dans Programme : volume réduit, objectifs essentiels conservés.</Text></Card>
    <Card><Text style={S.section}>💧 Hydratation</Text><Text style={S.text}>{water} / {waterTarget} ml</Text><Progress value={water} target={waterTarget}/><Field label="Quantité exacte (ml)" value={String(water)} onChange={setWaterAmount} keyboardType="numeric"/><View style={S.quickRow}><Button title="−250 ml" onPress={()=>setWaterAmount(water-250)} secondary/><Button title="+250 ml" onPress={()=>addWater(250)}/><Button title="+500 ml" onPress={()=>addWater(500)}/></View></Card>
    <Card><Text style={S.section}>☕ Caféine</Text><Text style={S.muted}>Le coach peut repérer si la caféine tardive coïncide avec un sommeil moins bon.</Text><View style={S.switchLine}><Text style={S.text}>Caféine après 16h</Text><Switch value={caffeine} onValueChange={setCaffeine}/></View></Card>
    <Text style={S.section}>📅 Calendrier</Text><View style={S.timeline}>{["1–16 Sep","17–20 🇹🇳","Oct–Déc 🥋","Jan 🎓","Fév+ 💪"].map((x,i)=><View key={x} style={[S.timelineItem,(phase.key==="travel"&&i===1)||(phase.key==="internship"&&i===2)||(phase.key==="school"&&i===3)||(phase.key==="free"&&i===4)||(phase.key==="september"&&i===0)?S.timelineActive:null]}><Text style={S.timelineText}>{x}</Text></View>)}</View>
  </ScrollView>}

  function Nutrition(){const[f,setF]=useState({name:"",calories:"",protein:"",carbs:"",fat:""});return <ScrollView contentContainerStyle={S.content}>
    <Text style={S.title}>🍽️ Nutrition</Text><Text style={S.muted}>Le coach te dit quoi manger maintenant.</Text><Button title="🍽️ Je mange au restaurant" onPress={restaurantChoice} secondary/>
    <Pressable style={S.photoBox} onPress={photoMeal}>{photo?<Image source={{uri:photo}} style={S.photo}/>:<><Text style={{fontSize:40}}>📸</Text><Text style={S.photoTitle}>Photographier mon repas</Text><Text style={S.muted}>Analyse IA • calories • macros • confiance</Text></>}</Pressable>
    {restaurantMode&&<Card><Text style={S.section}>🍔 Mode restaurant</Text><Text style={S.text}>Choisis ce que tu veux manger. L’objectif est d’estimer puis d’adapter le reste de la journée, pas de culpabiliser.</Text><Button title="Voir mes choix" onPress={()=>Alert.alert("Choix","Poulet + riz • Steak + pommes de terre • Burger : choisis selon tes envies et le budget restant.")}/></Card>}{photo&&<Card><Text style={S.section}>🤖 Analyse IA</Text><Text style={S.text}>Photo prête à envoyer au serveur sécurisé.</Text><Button title="Analyser le repas" onPress={()=>Alert.alert("IA","Connecte le serveur IA pour l'analyse vision réelle.")}/><Button title="Supprimer" secondary onPress={()=>setPhoto(null)}/></Card>}
    <Card><Text style={S.section}>🍴 Qu'est-ce que je mange maintenant ?</Text><Text style={S.text}>Tu as {remaining} kcal et {pRemain} g de protéines à couvrir.</Text><View style={S.option}><Text style={S.text}>🥣 Skyr + banane + avoine</Text><Text style={S.muted}>≈ 430 kcal • 28 P</Text></View><View style={S.option}><Text style={S.text}>🍗 Poulet + riz + légumes</Text><Text style={S.muted}>≈ 620 kcal • 48 P</Text></View><View style={S.option}><Text style={S.text}>🥛 Shake + banane</Text><Text style={S.muted}>≈ 390 kcal • 30 P</Text></View></Card>
    <Card><Text style={S.section}>🍕 J’ai fait un écart</Text><Text style={S.muted}>Aucune compensation extrême. On reprend simplement le plan normal au prochain repas.</Text><Button title="Revenir au plan" onPress={()=>Alert.alert("C’est bon","Pas besoin de compenser. Reprends simplement tes objectifs habituels.")} secondary/></Card><Card><Text style={S.section}>🛒 Budget courses</Text><Field label="Budget hebdomadaire (€)" value={budget} onChange={setBudget} keyboardType="decimal-pad"/><Text style={S.text}>Reste à définir tes dépenses pour générer une liste de courses optimisée.</Text><Button title="Générer mes courses" onPress={()=>Alert.alert("Courses","V2 suivante : liste de courses basée sur tes macros, ton budget et tes repas.")}/></Card>
    <Card><Text style={S.section}>🔥 Macros dynamiques</Text><Text style={S.text}>{remaining} kcal • {pRemain} g protéines • {Math.max(0,dynamicCarbs-total.carbs)} g glucides</Text></Card>
    <Card><Text style={S.section}>Ajouter manuellement</Text><Field label="Repas" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="Calories" value={f.calories} onChange={v=>setF({...f,calories:v})} keyboardType="numeric"/><Field label="Protéines" value={f.protein} onChange={v=>setF({...f,protein:v})} keyboardType="numeric"/><Field label="Glucides" value={f.carbs} onChange={v=>setF({...f,carbs:v})} keyboardType="numeric"/><Field label="Lipides" value={f.fat} onChange={v=>setF({...f,fat:v})} keyboardType="numeric"/><Button title="+ Ajouter" onPress={async()=>{if(!f.name||!f.calories)return;await addLog(f);setF({name:"",calories:"",protein:"",carbs:"",fat:""})}}/></Card>
  </ScrollView>}

  const WEEK_DAYS=[
    {key:"mon",label:"LUN",name:"Push",emoji:"🏋️",subtitle:"Pectoraux • épaules • triceps",color:"purple"},
    {key:"tue",label:"MAR",name:"JJB / Cardio",emoji:"🥋",subtitle:"Technique • cardio léger",color:"blue"},
    {key:"wed",label:"MER",name:"Pull",emoji:"💪",subtitle:"Dos • biceps • arrière d’épaules",color:"purple"},
    {key:"thu",label:"JEU",name:"Repos",emoji:"😴",subtitle:"Récupération active",color:"gray"},
    {key:"fri",label:"VEN",name:"Legs",emoji:"🦵",subtitle:"Quadriceps • ischios • mollets",color:"purple"},
    {key:"sat",label:"SAM",name:"JJB / Libre",emoji:"🥋",subtitle:"JJB ou activité au choix",color:"blue"},
    {key:"sun",label:"DIM",name:"Récupération",emoji:"🧘",subtitle:"Marche • mobilité • sommeil",color:"gray"}
  ];
  const WORKOUTS={
    Push:{emoji:"🏋️",focus:"Pectoraux • épaules • triceps",duration:"60–70 min",exercises:[
      ["Développé couché","4×6–10","2–3 min","Pectoraux / triceps"],["Développé incliné haltères","3×8–12","2 min","Haut des pectoraux"],["Élévations latérales","3×12–20","60–90 s","Deltoïdes moyens"],["Développé épaules","2×8–12","2 min","Épaules / triceps"],["Écartés poulie","2×12–15","60–90 s","Pectoraux"],["Extension triceps poulie","3×10–15","60–90 s","Triceps"]]},
    Pull:{emoji:"💪",focus:"Dos • biceps • arrière d’épaules",duration:"60–70 min",exercises:[
      ["Tractions / tirage vertical","4×6–10","2–3 min","Grand dorsal"],["Rowing poitrine supportée","3×8–12","2 min","Milieu du dos"],["Tirage poulie basse","2×10–15","90 s","Dos"],["Oiseau / reverse fly","3×12–20","60–90 s","Arrière d’épaules"],["Curl incliné haltères","3×8–12","90 s","Biceps"],["Curl marteau","2×10–15","60–90 s","Biceps / avant-bras"]]},
    Legs:{emoji:"🦵",focus:"Quadriceps • ischios • fessiers • mollets",duration:"60–75 min",exercises:[
      ["Squat / presse à cuisses","4×6–10","2–3 min","Quadriceps / fessiers"],["Soulevé de terre roumain","3×8–12","2–3 min","Ischios / fessiers"],["Fentes bulgares","3×8–12 / jambe","2 min","Jambes"],["Leg curl","3×10–15","90 s","Ischios"],["Leg extension","2×12–15","60–90 s","Quadriceps"],["Mollets debout","3×10–20","60–90 s","Mollets"]]},
    "JJB / Cardio":{emoji:"🥋",focus:"Technique • condition physique",duration:"60–90 min",exercises:[["Échauffement","10 min","—","Mobilité + cardio"],["Technique / drills","20–30 min","—","Travail technique"],["Rounds / sparring","4–6 rounds","2 min","Selon récupération"],["Retour au calme","5–10 min","—","Respiration + mobilité"]]},
    "JJB / Libre":{emoji:"🥋",focus:"JJB ou activité au choix",duration:"45–90 min",exercises:[["Échauffement","10 min","—","Préparation"],["JJB / activité","30–60 min","—","Selon envie et récupération"],["Mobilité","10 min","—","Récupération"]]},
    Repos:{emoji:"😴",focus:"Récupération active",duration:"20–40 min",exercises:[["Marche légère","20–30 min","—","Zone facile"],["Mobilité","10 min","—","Hanches / épaules / dos"]]},
    Récupération:{emoji:"🧘",focus:"Repos et récupération",duration:"20–30 min",exercises:[["Marche douce","15–20 min","—","Sans fatigue"],["Mobilité légère","5–10 min","—","Respiration + mobilité"]]}
  };
  function dayKeyForDate(d=new Date()){return ["sun","mon","tue","wed","thu","fri","sat"][d.getDay()]};
  function openWorkout(key){setSelectedWorkout(key);}
  function todayWorkout(){return WEEK_DAYS.find(d=>d.key===dayKeyForDate())||WEEK_DAYS[0]}
  async function saveSet(exerciseIndex,setIndex,field,value){
    const key=selectedWorkout||todayWorkout().name;
    const dateKey=iso();
    const day=workoutLogs[dateKey]||{};
    const workoutLog=day[key]||{};
    const exerciseLog=workoutLog[exerciseIndex]||{sets:[]};
    const sets=Array.isArray(exerciseLog.sets)?[...exerciseLog.sets]:[];
    sets[setIndex]={...(sets[setIndex]||{}),[field]:value};
    const next={...workoutLogs,[dateKey]:{...day,[key]:{...workoutLog,[exerciseIndex]:{...exerciseLog,sets}}}};
    setWorkoutLogs(next);await AsyncStorage.setItem("workoutLogs",JSON.stringify(next));
  }
  function Program(){
    const today=todayWorkout();
    const selected=selectedWorkout||today.name;
    const workout=WORKOUTS[selected]||WORKOUTS.Push;
    const logsForDay=(workoutLogs[iso()]||{})[selected]||{};
    return <ScrollView contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
      <Text style={S.title}>🏋️ Programme</Text>
      <Text style={S.muted}>Aujourd’hui : {today.emoji} {today.name} • basé sur le jour de ton téléphone.</Text>
      <View style={S.dayScroller}>{WEEK_DAYS.map(d=><Pressable key={d.key} onPress={()=>openWorkout(d.name)} style={[S.dayCard,selected===d.name&&S.dayCardActive]}>
        <Text style={S.dayLabel}>{d.label}</Text><Text style={S.dayEmoji}>{d.emoji}</Text><Text style={[S.dayName,selected===d.name&&S.dayNameActive]}>{d.name}</Text>
      </Pressable>)}</View>
      <Card style={S.workoutHero}><Text style={{fontSize:32}}>{workout.emoji}</Text><Text style={S.section}>{selected}</Text><Text style={S.text}>{workout.focus}</Text><Text style={S.muted}>{workout.duration} • récupération prise en compte</Text></Card>
      <Button title="😵 Aujourd’hui je suis KO" onPress={emergencyDay} secondary/>
      {hardDay&&<Card style={S.autopilot}><Text style={S.section}>🟣 MINIMUM DAY</Text><Text style={S.text}>🥩 protéines • 💧 hydratation • 🚶 marche légère • 😴 sommeil</Text><Text style={S.muted}>Le volume est volontairement réduit.</Text></Card>}
      {selected!=="Repos"&&selected!=="Récupération"&&<Card><Text style={S.section}>🎯 Comment progresser</Text><Text style={S.muted}>Choisis une charge qui te laisse environ 1–3 répétitions en réserve. Quand tu atteins le haut de la fourchette sur toutes les séries, augmente légèrement la charge.</Text></Card>}
      {workout.exercises.map((e,i)=>{const l=logsForDay[i]||{};const count=parseInt(String(e[1]).match(/\d+/)?.[0]||"1",10);const sets=Array.isArray(l.sets)?l.sets:[];return <Card key={e[0]} style={S.exerciseCard}>
        <View style={S.exerciseTop}><View style={S.exerciseNumber}><Text style={S.exerciseNumberText}>{String(i+1).padStart(2,"0")}</Text></View><View style={{flex:1}}><Text style={S.exerciseName}>{e[0]}</Text><Text style={S.muted}>{e[3]}</Text></View><Text style={S.setsBadge}>{e[1]}</Text></View>
        <Text style={S.rest}>⏱️ Repos : {e[2]}</Text>
        {Array.from({length:count},(_,si)=>{const set=sets[si]||{};return <View key={si} style={S.setRow}><Text style={S.setLabel}>S{si+1}</Text><Field style={{flex:1}} label="Charge (kg)" value={set.weight||""} onChange={v=>saveSet(i,si,"weight",v)} keyboardType="decimal-pad"/><Field style={{flex:1}} label="Reps" value={set.reps||""} onChange={v=>saveSet(i,si,"reps",v)} keyboardType="numeric"/></View>})}
        <Text style={S.saved}>{sets.some(x=>x&&((x.weight||"")||(x.reps||"")))?"✓ Séries enregistrées":"Renseigne chaque série après l'avoir réalisée"}</Text>
      </Card>})}
      <Card><Text style={S.section}>📈 Progression</Text><Text style={S.muted}>Tes charges et répétitions sont sauvegardées par jour. Le coach pourra s’appuyer dessus pour proposer la prochaine séance.</Text></Card>
    </ScrollView>
  }

  function ProgressPage(){return <ScrollView contentContainerStyle={S.content}><Text style={S.title}>📈 Progression</Text>
    <Card><Text style={S.section}>⚖️ Poids</Text><Text style={S.weight}>{currentWeight} <Text style={S.kg}>kg</Text></Text><Text style={S.good}>Objectif : +0,15 à +0,30 kg/semaine</Text><View style={S.chart}>{[30,42,38,54,49,67,82].map((h,i)=><View key={i} style={[S.bar,{height:h}]}/>)}</View><Field label="Poids actuel" value={weight} onChange={setWeight} keyboardType="decimal-pad"/><Button title="Enregistrer" onPress={saveWeight}/></Card>
    <Card><Text style={S.section}>😴 Sommeil</Text><Field label="Coucher" value={sleep} onChange={setSleep}/><Field label="Réveil" value={wake} onChange={setWake}/><Field label="Qualité 1–5" value={quality} onChange={setQuality} keyboardType="numeric"/><Button title="Enregistrer" onPress={saveSleep}/></Card>
    <Card><Text style={S.section}>🔮 Projection</Text><Text style={S.text}>Si ta tendance actuelle continue, YProgress estimera ta trajectoire sur 4, 12 et 24 semaines.</Text><Text style={S.muted}>Ce sont des projections indicatives, pas des garanties.</Text></Card>
    <Card><Text style={S.section}>⚠️ Détection de plateau</Text><Text style={S.text}>Si ta moyenne de poids stagne malgré une adhérence élevée, le coach pourra proposer une petite adaptation calorique.</Text></Card>
    <Card><Text style={S.section}>🏆 Score de la semaine</Text><Text style={S.score}>{weekly.score || "—"}<Text style={S.kg}>/100</Text></Text><Text style={S.text}>Calories moyennes : {weekly.avgCalories||"—"}</Text><Text style={S.text}>Protéines moyennes : {weekly.avgProtein||"—"} g</Text><Button title="Calculer mon bilan" onPress={weeklyAnalysis}/></Card>
    <Card><Text style={S.section}>📸 Timeline physique</Text><Text style={S.muted}>Semaine 1 → 4 → 8 → 12 → 16 → 20 → 24. Comparaison de photos dans la build native.</Text></Card>
  </ScrollView>}

  function Profile(){return <ScrollView contentContainerStyle={S.content}><Text style={S.title}>⚙️ Profil</Text>
    <Card><Text style={S.section}>Tes bases</Text><Text style={S.text}>1,70 m • 55 kg • prise de masse progressive</Text><Text style={S.muted}>{targets.calories} kcal • {targets.protein}g protéines • {targets.fat}g lipides • ~{dynamicCarbs}g glucides</Text></Card>
    <Card><View style={S.switchLine}><View><Text style={S.section}>🔔 Notifications intelligentes</Text><Text style={S.muted}>Repas • entraînement • sommeil</Text></View><Switch value={notifications} onValueChange={scheduleNotifications}/></View></Card>
    <Card><Text style={S.section}>❤️ Apple Santé</Text><Text style={S.text}>Pas • sommeil • poids • énergie active</Text><Text style={S.muted}>HealthKit réel à activer dans la development build iOS.</Text></Card>
    <Card><Text style={S.section}>🔐 Confidentialité</Text><Text style={S.muted}>La clé IA reste sur le serveur. L'application ne doit jamais embarquer OPENROUTER_API_KEY.</Text></Card>
    <Card><Text style={S.section}>🎙️ Entrée vocale</Text><Text style={S.muted}>Prévue : « J'ai mangé 200 g de poulet et 150 g de riz » → journal automatique.</Text></Card>
    <Card><Text style={S.section}>📱 Widget iPhone</Text><Text style={S.muted}>Prévu : calories, protéines, pas et sommeil directement sur l'écran d'accueil.</Text></Card>
  </ScrollView>}

  const pages={home:<Home/>,nutrition:<Nutrition/>,program:<Program/>,progress:<ProgressPage/>,profile:<Profile/>};
  return <SafeAreaView style={S.safe}><StatusBar style="light"/>{pages[tab]}<View style={S.bottom}>{[["home","⌂","Accueil"],["nutrition","◉","Nutrition"],["program","✦","Programme"],["progress","⌁","Progrès"],["profile","⚙","Profil"]].map(([id,ic,l])=><Pressable key={id} onPress={()=>setTab(id)} style={[S.nav,tab===id&&S.navActive]}><Text style={[S.navIcon,tab===id&&S.navIconActive]}>{ic}</Text><Text style={[S.navText,tab===id&&S.navTextActive]}>{l}</Text></Pressable>)}</View></SafeAreaView>
}

const S=StyleSheet.create({
safe:{flex:1,backgroundColor:"#070810"},content:{padding:18,paddingBottom:120},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},
eyebrow:{color:"#9583ff",fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{fontSize:30,fontWeight:"900",color:"#fff",marginTop:4},muted:{color:"#8f94a8",fontSize:13,lineHeight:19},
avatar:{width:46,height:46,borderRadius:23,backgroundColor:"#7045ff",alignItems:"center",justifyContent:"center"},avatarText:{color:"#fff",fontWeight:"900",fontSize:18},
phase:{flexDirection:"row",alignItems:"center",padding:15,borderRadius:20,backgroundColor:"#111423",borderWidth:1,borderColor:"#292d44",marginBottom:13},phaseIcon:{fontSize:25,marginRight:12},phaseTitle:{color:"#fff",fontWeight:"900"},phaseSub:{color:"#8f94a8",fontSize:12,marginTop:2},arrow:{color:"#7e8396",fontSize:25},
card:{backgroundColor:"#10121b",borderRadius:22,padding:16,borderWidth:1,borderColor:"#222637",marginBottom:12},hero:{backgroundColor:"#17132d",borderColor:"#3b2a73",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},heroNum:{fontSize:44,fontWeight:"900",color:"#fff",marginTop:3},glow:{width:78,height:78,borderRadius:39,backgroundColor:"#362078",alignItems:"center",justifyContent:"center"},
metrics:{flexDirection:"row",gap:8,marginBottom:12},metric:{flex:1,backgroundColor:"#10121b",borderRadius:18,padding:11,borderWidth:1,borderColor:"#202433"},metricValue:{color:"#fff",fontSize:17,fontWeight:"900",marginTop:5},metricTarget:{color:"#777c8f",fontSize:10},metricLabel:{color:"#aeb2c0",fontSize:11,marginVertical:6},track:{height:6,backgroundColor:"#252938",borderRadius:9,overflow:"hidden"},fill:{height:"100%",backgroundColor:"#7859ff",borderRadius:9},
cardHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},section:{color:"#fff",fontSize:17,fontWeight:"900",marginBottom:8},ai:{color:"#c1b4ff",fontSize:9,fontWeight:"900",backgroundColor:"#2a1c58",paddingHorizontal:8,paddingVertical:5,borderRadius:9},coach:{color:"#eeeef6",fontSize:15,lineHeight:23},workout:{backgroundColor:"#12192a",borderColor:"#263f67"},autopilot:{backgroundColor:"#17132d",borderColor:"#49377e"},actionRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:8},actionNum:{width:24,height:24,borderRadius:12,backgroundColor:"#33205f",color:"#c6b8ff",textAlign:"center",paddingTop:3,fontWeight:"900"},quickRow:{flexDirection:"row",gap:8},workoutTitle:{color:"#fff",fontSize:19,fontWeight:"900",marginVertical:5},
button:{backgroundColor:"#7454ff",padding:14,borderRadius:14,alignItems:"center",marginTop:10},button2:{backgroundColor:"#1a1d29"},buttonText:{color:"#fff",fontWeight:"900"},buttonText2:{color:"#dfe2eb"},
timeline:{flexDirection:"row",gap:6,marginBottom:14},timelineItem:{flex:1,paddingVertical:12,paddingHorizontal:3,borderRadius:13,backgroundColor:"#11131c",borderWidth:1,borderColor:"#222638",alignItems:"center"},timelineActive:{backgroundColor:"#28165e",borderColor:"#6f4cff"},timelineText:{color:"#d6d8e1",fontSize:9,fontWeight:"900",textAlign:"center"},
photoBox:{height:190,borderRadius:24,backgroundColor:"#15132a",borderWidth:1,borderColor:"#49347f",alignItems:"center",justifyContent:"center",marginVertical:15,overflow:"hidden"},photo:{width:"100%",height:"100%"},photoTitle:{color:"#fff",fontSize:18,fontWeight:"900",marginTop:7},option:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#232638"},label:{color:"#8d92a5",fontSize:11,marginBottom:5},input:{backgroundColor:"#0a0c12",borderWidth:1,borderColor:"#2a2e3d",borderRadius:13,color:"#fff",padding:12},
toggle:{flexDirection:"row",gap:8,marginVertical:12},pill:{backgroundColor:"#171a25",paddingHorizontal:13,paddingVertical:9,borderRadius:99},pillActive:{backgroundColor:"#392070"},pillText:{color:"#d9dce7",fontSize:12,fontWeight:"800"},switchLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},exercise:{flexDirection:"row",alignItems:"center",gap:12},num:{width:30,color:"#8061ff",fontWeight:"900"},
dayScroller:{flexDirection:"row",gap:8,marginVertical:14,paddingBottom:4},dayCard:{width:78,minHeight:88,borderRadius:17,backgroundColor:"#10121b",borderWidth:1,borderColor:"#24283a",alignItems:"center",justifyContent:"center",padding:8},dayCardActive:{backgroundColor:"#2a2050",borderColor:"#7454ff",transform:[{scale:1.02}]},dayLabel:{color:"#777c8f",fontSize:9,fontWeight:"900"},dayEmoji:{fontSize:21,marginVertical:4},dayName:{color:"#d5d8e2",fontSize:10,fontWeight:"900",textAlign:"center"},dayNameActive:{color:"#fff"},workoutHero:{backgroundColor:"#17132d",borderColor:"#49347f"},exerciseCard:{backgroundColor:"#10121b"},exerciseTop:{flexDirection:"row",alignItems:"center",gap:10},exerciseNumber:{width:34,height:34,borderRadius:17,backgroundColor:"#2b2051",alignItems:"center",justifyContent:"center"},exerciseNumberText:{color:"#b9a8ff",fontWeight:"900",fontSize:11},exerciseName:{color:"#fff",fontSize:16,fontWeight:"900",marginBottom:3},setsBadge:{color:"#c8bcff",backgroundColor:"#2a1c58",paddingHorizontal:9,paddingVertical:7,borderRadius:10,fontSize:11,fontWeight:"900"},rest:{color:"#8f94a8",fontSize:11,marginTop:12},setRow:{flexDirection:"row",gap:10,marginTop:6,alignItems:"flex-end"},setLabel:{color:"#a890ff",fontWeight:"900",fontSize:12,width:24,paddingBottom:14},saved:{color:"#8f94a8",fontSize:10,marginTop:-3},
weight:{fontSize:48,color:"#fff",fontWeight:"900"},kg:{fontSize:18,color:"#8d92a4"},good:{color:"#6ee8b4",fontSize:12,fontWeight:"800"},chart:{height:100,flexDirection:"row",alignItems:"flex-end",gap:9,paddingVertical:10},bar:{flex:1,backgroundColor:"#704df2",borderRadius:5},score:{fontSize:52,fontWeight:"900",color:"#fff"},bottom:{position:"absolute",left:12,right:12,bottom:10,height:72,borderRadius:25,backgroundColor:"#171923",borderWidth:1,borderColor:"#2a2e3d",flexDirection:"row",justifyContent:"space-around",alignItems:"center",shadowColor:"#000",shadowOpacity:.5,shadowRadius:18},nav:{alignItems:"center",justifyContent:"center",paddingHorizontal:8,paddingVertical:6,borderRadius:16},navActive:{backgroundColor:"#2a2050"},navIcon:{fontSize:20,color:"#777b8e"},navIconActive:{color:"#a890ff"},navText:{fontSize:10,color:"#777b8e",marginTop:3},navTextActive:{color:"#fff",fontWeight:"800"}
});
