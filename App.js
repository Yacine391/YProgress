import {initPWA} from "./src/pwa";
import React, {useEffect, useMemo, useState} from "react";
import {SafeAreaView,View,Text,StyleSheet,Pressable,ScrollView,TextInput,Alert,Switch,Image,Modal,Platform,Linking} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {StatusBar} from "expo-status-bar";
import {LinearGradient} from "expo-linear-gradient";
import {WEEK_DAYS,WORKOUTS,dayByKey,dayKeyForDate,jjbDrillFor,EXERCISE_ALTERNATIVES,customExercise} from "./src/features/training/program";
import {appendPerformance,historyForExercise,recommendNextLoad} from "./src/core/progression";
import {buildGroceryList} from "./src/core/groceryPlanner";

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

function ExerciseVideoModal({exercise,onClose}){
  const video=exercise?.video;
  const watchUrl=video?`https://www.youtube.com/watch?v=${video.id}${video.start?`&t=${video.start}s`:""}`:"";
  const embedUrl=video?`https://www.youtube-nocookie.com/embed/${video.id}?playsinline=1&rel=0${video.start?`&start=${video.start}`:""}`:"";
  return <Modal visible={Boolean(exercise)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.modalBackdrop}><View style={S.videoModal}>
      <View style={S.modalHead}><View style={{flex:1}}><Text style={S.eyebrow}>DÉMONSTRATION</Text><Text style={S.exerciseName}>{exercise?.name}</Text></View><Pressable accessibilityLabel="Fermer la vidéo" onPress={onClose} style={S.closeButton}><Text style={S.closeText}>×</Text></Pressable></View>
      {Platform.OS==="web"&&video?React.createElement("iframe",{src:embedUrl,title:`Démonstration ${exercise?.name}`,style:{width:"100%",aspectRatio:"16 / 9",border:0,borderRadius:18,backgroundColor:"#02050c",marginBottom:12},allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowFullScreen:true}):<Pressable style={[S.video,S.nativeVideoFallback]} onPress={()=>watchUrl&&Linking.openURL(watchUrl)}><Text style={S.videoButtonText}>▶ Ouvrir la démonstration YouTube</Text></Pressable>}
      <Text style={S.videoSource}>{video?.title} • {video?.channel}</Text>
      <Text style={S.text}>Contrôle le mouvement, garde une amplitude confortable et arrête la série si la technique se dégrade.</Text>
    </View></View>
  </Modal>
}

function ExerciseSwapModal({slot,onClose,onSelect}){
  const [name,setName]=useState(""),[load,setLoad]=useState(""),[videoId,setVideoId]=useState("");
  function saveCustom(){const exercise=customExercise({name,startLoad:load});if(!exercise)return;onSelect({...exercise,video:videoId.trim()?{provider:"youtube",id:videoId.trim(),title:name.trim(),channel:"Vidéo personnalisée",exerciseId:exercise.id}:null})}
  return <Modal visible={Boolean(slot)} transparent animationType="slide" onRequestClose={onClose}><View style={S.modalBackdrop}><ScrollView style={S.swapModal} contentContainerStyle={S.swapContent}>
    <View style={S.modalHead}><View style={{flex:1}}><Text style={S.eyebrow}>REMPLACER L’EXERCICE</Text><Text style={S.exerciseName}>{slot?.name}</Text></View><Pressable onPress={onClose} style={S.closeButton}><Text style={S.closeText}>×</Text></Pressable></View>
    <Text style={S.muted}>Choisis un exercice que tu aimes. Tes charges seront conservées séparément pour ce mouvement.</Text>
    <Button title="Revenir à l’exercice proposé" onPress={()=>onSelect(null)} secondary/>
    <Text style={S.swapTitle}>ALTERNATIVES AVEC VIDÉO VÉRIFIÉE</Text>
    {EXERCISE_ALTERNATIVES.map(item=><Pressable key={item.id} onPress={()=>onSelect(item)} style={S.swapOption}><View style={{flex:1}}><Text style={S.exerciseName}>{item.name}</Text><Text style={S.muted}>{item.muscles} • départ {item.startLoad} kg</Text></View><Text style={S.swapArrow}>›</Text></Pressable>)}
    <Text style={S.swapTitle}>MON EXERCICE PERSONNALISÉ</Text><Field label="Nom de l’exercice" value={name} onChange={setName}/><Field label="Charge de départ (kg)" value={load} onChange={setLoad} keyboardType="decimal-pad"/><Field label="ID YouTube facultatif" value={videoId} onChange={setVideoId}/><Button title="Ajouter à mes exercices" onPress={saveCustom}/>
    <Button title="Annuler" onPress={onClose} secondary/>
  </ScrollView></View></Modal>
}

function ProgramPage({selectedDayKey,setSelectedDayKey,week,setWeek,drafts,onSaveSet,history,onComplete,hardDay,onEmergency,progressionContext,exerciseOverrides,onReplaceExercise}){
  const day=dayByKey(selectedDayKey),workout=WORKOUTS[day.name];
  const [videoExercise,setVideoExercise]=useState(null);
  const [swapSlot,setSwapSlot]=useState(null);
  const strength=workout.type==="STRENGTH";
  return <ScrollView style={S.pageScroll} contentContainerStyle={S.content} keyboardShouldPersistTaps="handled">
    <View style={S.programHeader}><View><Text style={S.eyebrow}>PROGRAMME ADAPTATIF</Text><Text style={S.title}>Ta semaine</Text></View><View style={S.weekBadge}><Text style={S.weekBadgeLabel}>SEMAINE</Text><Text style={S.weekBadgeValue}>{week}</Text></View></View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.dayScroller} keyboardShouldPersistTaps="always">
      {WEEK_DAYS.map(d=><Pressable accessibilityRole="button" accessibilityState={{selected:selectedDayKey===d.key}} key={d.key} onPress={()=>setSelectedDayKey(d.key)} style={[S.dayCard,selectedDayKey===d.key&&S.dayCardActive]}>
        <Text style={[S.dayLabel,selectedDayKey===d.key&&S.dayLabelActive]}>{d.label}</Text><Text style={S.dayEmoji}>{d.emoji}</Text><View style={[S.dayDot,selectedDayKey===d.key&&S.dayDotActive]}/>
      </Pressable>)}
    </ScrollView>
    <LinearGradient colors={workout.type==="REST"?["#14243c","#11162c"]:["#39205f","#102d66"]} start={{x:0,y:0}} end={{x:1,y:1}} style={S.workoutHero}>
      <View style={S.heroIcon}><Text style={{fontSize:30}}>{workout.emoji}</Text></View><View style={{flex:1}}><Text style={S.workoutType}>{workout.type}</Text><Text style={S.workoutTitle}>{day.name}</Text><Text style={S.heroSubtitle}>{workout.focus} • {workout.duration}</Text></View>
    </LinearGradient>
    {Object.keys(exerciseOverrides).length>0&&workout.type!=="REST"&&<Card style={S.favoritesCard}><Text style={S.drillBadge}>⭐ MES EXERCICES FAVORIS</Text><View style={S.favoriteWrap}>{Object.entries(exerciseOverrides).map(([slot,item])=><View key={slot} style={S.favoritePill}><Text style={S.favoriteText}>{item.name}</Text></View>)}</View></Card>}
    {workout.type==="REST"?<Card style={S.restDay}><Text style={S.restTitle}>RÉCUPÉRATION</Text><Text style={S.coach}>Pas de séance prévue aujourd’hui.</Text>{workout.priorities.map(item=><View key={item} style={S.priorityRow}><Text style={S.check}>✓</Text><Text style={S.text}>{item}</Text></View>)}<Text style={S.restFoot}>Aucune charge n’est calculée pendant un jour REST.</Text></Card>:<>
      <Button title="😵 Adapter si je suis KO" onPress={onEmergency} secondary/>
      {hardDay&&<Card style={S.autopilot}><Text style={S.section}>MINIMUM DAY</Text><Text style={S.text}>Protéines • hydratation • marche légère • sommeil</Text></Card>}
      {workout.exercises.map((exercise,index)=>{
        const shownExercise=!strength&&(exercise.id==="drills"||exercise.id==="free-activity")?jjbDrillFor(week,day.key):(exerciseOverrides[exercise.id]||exercise);
        const draftKey=`${week}:${shownExercise.id}`,sets=drafts[draftKey]?.sets||[];
        const exerciseHistory=historyForExercise(history,shownExercise.id);
        const recommendation=strength?recommendNextLoad({exercise:shownExercise,history:exerciseHistory,context:progressionContext}):null;
        return <Card key={shownExercise.id} style={[S.exerciseCard,shownExercise.isDrill&&S.drillCard]}>
          {shownExercise.isDrill&&<Text style={S.drillBadge}>NOUVELLE TECHNIQUE • SEMAINE {week}</Text>}
          <View style={S.exerciseTop}><View style={S.exerciseNumber}><Text style={S.exerciseNumberText}>{index+1}</Text></View><View style={{flex:1}}><Text style={S.exerciseName}>{shownExercise.name}</Text><Text style={S.muted}>{shownExercise.muscles}</Text></View>{shownExercise.video?<Pressable onPress={()=>setVideoExercise(shownExercise)} style={S.videoButton}><Text style={S.videoButtonText}>▶ {strength?"Voir exo":"Voir technique"}</Text></Pressable>:<Text style={S.noVideo}>Vidéo à renseigner</Text>}</View>
          {strength&&<Pressable onPress={()=>setSwapSlot(exercise)} style={S.changeButton}><Text style={S.changeButtonText}>⇄ Changer l’exercice</Text></Pressable>}
          {strength?<><View style={S.prescriptionRow}><Text style={S.prescription}>{shownExercise.sets} × {shownExercise.minReps}–{shownExercise.maxReps}</Text><View style={S.loadChip}><Text style={S.loadChipLabel}>{recommendation.action==="start"?"DÉPART":recommendation.action==="increase"?"↑ PROGRESSION":recommendation.action==="decrease"?"↓ ADAPTÉE":"→ MAINTIEN"}</Text><Text style={S.loadChipValue}>{recommendation.recommendedLoad} kg</Text></View></View><Text style={S.reason}>{recommendation.reasons[0]}</Text>
            {Array.from({length:shownExercise.sets},(_,setIndex)=>{const set=sets[setIndex]||{};return <View key={setIndex} style={S.setRow}><Text style={S.setLabel}>S{setIndex+1}</Text><Field style={S.setField} label="KG" value={String(set.load??"")} onChange={v=>onSaveSet(shownExercise,setIndex,"load",v)} keyboardType="decimal-pad"/><Field style={S.setField} label="REPS" value={String(set.reps??"")} onChange={v=>onSaveSet(shownExercise,setIndex,"reps",v)} keyboardType="numeric"/><Field style={S.setField} label="RIR" value={String(set.rir??"")} onChange={v=>onSaveSet(shownExercise,setIndex,"rir",v)} keyboardType="numeric"/></View>})}
            <Button title="Valider la performance" onPress={()=>onComplete(shownExercise,recommendation)} secondary/>
            {exerciseHistory.length>0&&<View style={S.history}><Text style={S.historyTitle}>HISTORIQUE</Text>{exerciseHistory.slice(-3).map(item=><Text key={item.week} style={S.historyItem}>S{item.week}  •  {item.actualLoad} kg  •  {item.sets.map(s=>s.reps).join(" / ")} reps</Text>)}</View>}
          </>:<><Text style={S.rest}>Durée : {shownExercise.duration} • {shownExercise.rest}</Text><Text style={S.reason}>{shownExercise.isDrill?"Travaille lentement avec un partenaire coopératif avant d’ajouter de la résistance.":"Cette activité influence la récupération, jamais une charge arbitraire."}</Text></>}
        </Card>})}
      {strength&&<Button title={`Passer à la semaine ${week+1}`} onPress={()=>setWeek(week+1)}/>}</>}
    <ExerciseVideoModal exercise={videoExercise} onClose={()=>setVideoExercise(null)}/>
    <ExerciseSwapModal slot={swapSlot} onClose={()=>setSwapSlot(null)} onSelect={item=>{onReplaceExercise(swapSlot.id,item);setSwapSlot(null)}}/>
  </ScrollView>
}

export default function App(){
  if(typeof window!=='undefined'){try{initPWA()}catch(e){}}
  const [tab,setTab]=useState("home"),[logs,setLogs]=useState([]),[weights,setWeights]=useState([]);
  const [health,setHealth]=useState({steps:null,sleepMin:null,activeKcal:null,weight:null});
  const [targets,setTargets]=useState(BASE),[weight,setWeight]=useState("55"),[steps,setSteps]=useState("0");
  const [sleep,setSleep]=useState("23:30"),[wake,setWake]=useState("07:30"),[quality,setQuality]=useState("4");
  const [notifications,setNotifications]=useState(false),[gym,setGym]=useState(false),[jjb,setJjb]=useState(false);
  const [caffeine,setCaffeine]=useState(false),[hardDay,setHardDay]=useState(false),[restaurantMode,setRestaurantMode]=useState(false),[autopilot,setAutopilot]=useState(true);
  const [water,setWater]=useState(0),[waterTarget,setWaterTarget]=useState(3000),[weekPlan,setWeekPlan]=useState(null);
  const [selectedDayKey,setSelectedDayKey]=useState(dayKeyForDate()),[workoutLogs,setWorkoutLogs]=useState({});
  const [trainingHistory,setTrainingHistory]=useState([]),[trainingWeek,setTrainingWeek]=useState(1);
  const [coach,setCoach]=useState("Appuie sur « Analyser ma journée » pour obtenir une décision claire.");
  const [coachLoading,setCoachLoading]=useState(false),[photo,setPhoto]=useState(null),[budget,setBudget]=useState("60");
  const [weekly,setWeekly]=useState({score:0,weightChange:0,avgCalories:0,avgProtein:0});
  const [foodDraft,setFoodDraft]=useState({name:"",calories:"",protein:"",carbs:"",fat:""});
  const [groceryList,setGroceryList]=useState(null),[exerciseOverrides,setExerciseOverrides]=useState({});

  useEffect(()=>{(async()=>{
    const all=JSON.parse(await AsyncStorage.getItem("logs")||"[]");
    setLogs(all.filter(x=>x.date===iso()));
    setWeights(JSON.parse(await AsyncStorage.getItem("weights")||"[]"));
    const t=JSON.parse(await AsyncStorage.getItem("targets")||"null");if(t)setTargets({...BASE,...t});
    const w=JSON.parse(await AsyncStorage.getItem("weekly")||"null");if(w)setWeekly(w);
    const wd=JSON.parse(await AsyncStorage.getItem("workoutLogs")||"{}");setWorkoutLogs(wd);
    const th=JSON.parse(await AsyncStorage.getItem("trainingHistory")||"[]");setTrainingHistory(Array.isArray(th)?th:[]);
    const tw=Number(await AsyncStorage.getItem("trainingWeek"));setTrainingWeek(Number.isInteger(tw)&&tw>0?tw:1);
    const eo=JSON.parse(await AsyncStorage.getItem("exerciseOverrides")||"{}");setExerciseOverrides(eo&&typeof eo==="object"?eo:{});
    const dayWater=JSON.parse(await AsyncStorage.getItem("water:"+iso())||"0");setWater(Number(dayWater)||0);
  })()},[]);

  const total=useMemo(()=>logs.reduce((a,x)=>({calories:a.calories+Number(x.calories||0),protein:a.protein+Number(x.protein||0),carbs:a.carbs+Number(x.carbs||0),fat:a.fat+Number(x.fat||0)}),{calories:0,protein:0,carbs:0,fat:0}),[logs]);
  const phase=phaseFor(),dynamicCarbs=carbs(targets.calories,targets.protein,targets.fat);
  const currentWeight=(health.weight ?? Number(weight)) || 55, stepValue=(health.steps ?? Number(steps)) || 0;
  const remaining=Math.max(0,Math.round(targets.calories-total.calories)), pRemain=Math.max(0,Math.round(targets.protein-total.protein));
  function todayWorkout(){return dayByKey(dayKeyForDate())}

  async function addLog(x){const all=JSON.parse(await AsyncStorage.getItem("logs")||"[]");const n=[...all,{...x,date:iso(),createdAt:Date.now()}];await AsyncStorage.setItem("logs",JSON.stringify(n));setLogs(n.filter(a=>a.date===iso()))}
  async function saveWeight(){const v=Number(weight);if(!v)return;const n=[...weights,{date:iso(),weight:v}];setWeights(n);setHealth(h=>({...h,weight:v}));await AsyncStorage.setItem("weights",JSON.stringify(n))}
  function sleepMin(){const[a,b]=sleep.split(":").map(Number),[c,d]=wake.split(":").map(Number);let n=c*60+d-(a*60+b);if(n<=0)n+=1440;return n}
  async function saveSleep(){const n=sleepMin();setHealth(h=>({...h,sleepMin:n}));await AsyncStorage.setItem("sleep:"+iso(),JSON.stringify({sleep,wake,quality,duration:n}));Alert.alert("Sommeil",`${Math.floor(n/60)}h${String(n%60).padStart(2,"0")} • ${quality}/5`)}
  async function photoMeal(){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)return Alert.alert("Caméra","Autorise la caméra dans Réglages.");const r=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.8});if(!r.canceled)setPhoto(r.assets[0].uri)}
  async function scheduleNotifications(v){setNotifications(v);await Notifications.requestPermissionsAsync();await Notifications.cancelAllScheduledNotificationsAsync();if(!v)return;for(const [h,m,t,b] of [[8,0,"🌅 YProgress","Petit-déjeuner + protéines"],[13,0,"🍽️ YProgress","Enregistre ton déjeuner"],[16,30,"🥛 YProgress","Vérifie tes protéines"],[19,0,"🏋️ YProgress","Prépare ton entraînement"],[22,30,"😴 YProgress","Protège ton sommeil"]])await Notifications.scheduleNotificationAsync({content:{title:t,body:b},trigger:{hour:h,minute:m,repeats:true}})}
  async function analyze(){setCoachLoading(true);const recentWorkouts=trainingHistory.slice(-30);const payload={profile:{weight:currentWeight,targets,phase:phase.key},today:{date:iso(),total,steps:stepValue,sleepMin:health.sleepMin,gym,jjb,water,waterTarget},recentWorkouts,coachContext:{autopilot,hardDay,caffeine,restaurantMode}};const endpoint=AI_BASE_URL||((typeof window!=="undefined"&&window.location?.origin)?window.location.origin+"/api":"");if(endpoint)try{const r=await fetch(endpoint+"/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});const d=await r.json().catch(()=>({}));if(r.ok&&(d.message||d.coach)){setCoach(d.message||d.coach);setCoachLoading(false);return}}catch(e){}const msg=health.sleepMin!==null&&health.sleepMin<390?"😴 Récupération prioritaire : sommeil insuffisant. Fais une séance plus légère et évite le cardio supplémentaire.":jjb&&remaining>500?`🥋 JJB ce soir : il te manque ${remaining} kcal. Ajoute glucides + protéines avant le cours.`:pRemain>25?`🥩 Il te manque ${pRemain} g de protéines. Priorité à une vraie source protéinée.`:remaining>400?`🍚 Il te reste ${remaining} kcal. Ne termine pas la journée trop bas.`:"✅ Très bonne journée. Continue sans chercher la perfection.";setCoach(msg);setCoachLoading(false)}
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

  async function saveTrainingSet(exercise,setIndex,field,value){
    const draftKey=`${trainingWeek}:${exercise.id}`,draft=workoutLogs[draftKey]||{sets:[]},sets=[...(draft.sets||[])];
    sets[setIndex]={...(sets[setIndex]||{}),[field]:value};
    const next={...workoutLogs,[draftKey]:{...draft,exerciseId:exercise.id,week:trainingWeek,sets}};
    setWorkoutLogs(next);await AsyncStorage.setItem("workoutLogs",JSON.stringify(next));
  }
  async function completeExercise(exercise,recommendation){
    const draft=workoutLogs[`${trainingWeek}:${exercise.id}`];
    if(!draft||draft.sets.length<exercise.sets||draft.sets.some(set=>!set?.load||!set?.reps))return Alert.alert("Performance incomplète","Renseigne la charge et les répétitions de chaque série.");
    const sets=draft.sets.map(set=>({load:Number(set.load),reps:Number(set.reps),rir:set.rir===""||set.rir==null?null:Number(set.rir)}));
    const performance={exerciseId:exercise.id,exerciseName:exercise.name,week:trainingWeek,plannedLoad:recommendation.recommendedLoad,actualLoad:sets[0].load,sets,completed:true,createdAt:new Date().toISOString()};
    const next=appendPerformance(trainingHistory,performance);setTrainingHistory(next);await AsyncStorage.setItem("trainingHistory",JSON.stringify(next));Alert.alert("Performance enregistrée",`Semaine ${trainingWeek} sauvegardée pour ${exercise.name}.`);
  }
  async function changeTrainingWeek(week){const value=Math.max(1,Math.round(Number(week)||1));setTrainingWeek(value);await AsyncStorage.setItem("trainingWeek",String(value));}
  async function replaceExercise(slotId,exercise){const next={...exerciseOverrides};if(exercise)next[slotId]=exercise;else delete next[slotId];setExerciseOverrides(next);await AsyncStorage.setItem("exerciseOverrides",JSON.stringify(next));}
  function generateGroceries(){setGroceryList(buildGroceryList({budget,weeklyCalories:targets.calories*7,weeklyProtein:targets.protein*7}))}

  function Home(){return <ScrollView key="home" contentContainerStyle={S.content}>
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

  function Nutrition(){const f=foodDraft,setF=setFoodDraft;return <ScrollView key="nutrition" contentContainerStyle={S.content}>
    <Text style={S.title}>🍽️ Nutrition</Text><Text style={S.muted}>Le coach te dit quoi manger maintenant.</Text><Button title="🍽️ Je mange au restaurant" onPress={restaurantChoice} secondary/>
    <Pressable style={S.photoBox} onPress={photoMeal}>{photo?<Image source={{uri:photo}} style={S.photo}/>:<><Text style={{fontSize:40}}>📸</Text><Text style={S.photoTitle}>Photographier mon repas</Text><Text style={S.muted}>Analyse IA • calories • macros • confiance</Text></>}</Pressable>
    {restaurantMode&&<Card><Text style={S.section}>🍔 Mode restaurant</Text><Text style={S.text}>Choisis ce que tu veux manger. L’objectif est d’estimer puis d’adapter le reste de la journée, pas de culpabiliser.</Text><Button title="Voir mes choix" onPress={()=>Alert.alert("Choix","Poulet + riz • Steak + pommes de terre • Burger : choisis selon tes envies et le budget restant.")}/></Card>}{photo&&<Card><Text style={S.section}>🤖 Analyse IA</Text><Text style={S.text}>Photo prête à envoyer au serveur sécurisé.</Text><Button title="Analyser le repas" onPress={()=>Alert.alert("IA","Connecte le serveur IA pour l'analyse vision réelle.")}/><Button title="Supprimer" secondary onPress={()=>setPhoto(null)}/></Card>}
    <Card><Text style={S.section}>🍴 Qu'est-ce que je mange maintenant ?</Text><Text style={S.text}>Tu as {remaining} kcal et {pRemain} g de protéines à couvrir.</Text><View style={S.option}><Text style={S.text}>🥣 Skyr + banane + avoine</Text><Text style={S.muted}>≈ 430 kcal • 28 P</Text></View><View style={S.option}><Text style={S.text}>🍗 Poulet + riz + légumes</Text><Text style={S.muted}>≈ 620 kcal • 48 P</Text></View><View style={S.option}><Text style={S.text}>🥛 Shake + banane</Text><Text style={S.muted}>≈ 390 kcal • 30 P</Text></View></Card>
    <Card><Text style={S.section}>🍕 J’ai fait un écart</Text><Text style={S.muted}>Aucune compensation extrême. On reprend simplement le plan normal au prochain repas.</Text><Button title="Revenir au plan" onPress={()=>Alert.alert("C’est bon","Pas besoin de compenser. Reprends simplement tes objectifs habituels.")} secondary/></Card><Card><Text style={S.section}>🛒 Mes premières courses</Text><Field label="Budget hebdomadaire (€)" value={budget} onChange={setBudget} keyboardType="decimal-pad"/><Text style={S.text}>Liste calculée pour 7 jours à partir de tes objectifs de {targets.calories} kcal et {targets.protein} g de protéines.</Text><Button title="Calculer ma liste de courses" onPress={generateGroceries}/>{groceryList&&<View style={S.groceryList}>{groceryList.items.map(item=><View key={item.id} style={S.groceryRow}><View style={{flex:1}}><Text style={S.text}>{item.quantity} × {item.name}</Text><Text style={S.muted}>{item.unit}</Text></View><Text style={S.groceryPrice}>{item.totalPrice.toFixed(2)} €</Text></View>)}<View style={S.groceryTotal}><Text style={S.section}>Total estimé</Text><Text style={S.groceryTotalValue}>{groceryList.total.toFixed(2)} €</Text></View><Text style={S.muted}>Reste sur le budget : {groceryList.remaining.toFixed(2)} €. Prix indicatifs à ajuster selon ton magasin.</Text></View>}</Card>
    <Card><Text style={S.section}>🔥 Macros dynamiques</Text><Text style={S.text}>{remaining} kcal • {pRemain} g protéines • {Math.max(0,dynamicCarbs-total.carbs)} g glucides</Text></Card>
    <Card><Text style={S.section}>Ajouter manuellement</Text><Field label="Repas" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="Calories" value={f.calories} onChange={v=>setF({...f,calories:v})} keyboardType="numeric"/><Field label="Protéines" value={f.protein} onChange={v=>setF({...f,protein:v})} keyboardType="numeric"/><Field label="Glucides" value={f.carbs} onChange={v=>setF({...f,carbs:v})} keyboardType="numeric"/><Field label="Lipides" value={f.fat} onChange={v=>setF({...f,fat:v})} keyboardType="numeric"/><Button title="+ Ajouter" onPress={async()=>{if(!f.name||!f.calories)return;await addLog(f);setF({name:"",calories:"",protein:"",carbs:"",fat:""})}}/></Card>
  </ScrollView>}

  function ProgressPage(){return <ScrollView key="progress" contentContainerStyle={S.content}><Text style={S.title}>📈 Progression</Text>
    <Card><Text style={S.section}>⚖️ Poids</Text><Text style={S.weight}>{currentWeight} <Text style={S.kg}>kg</Text></Text><Text style={S.good}>Objectif : +0,15 à +0,30 kg/semaine</Text><View style={S.chart}>{[30,42,38,54,49,67,82].map((h,i)=><View key={i} style={[S.bar,{height:h}]}/>)}</View><Field label="Poids actuel" value={weight} onChange={setWeight} keyboardType="decimal-pad"/><Button title="Enregistrer" onPress={saveWeight}/></Card>
    <Card><Text style={S.section}>😴 Sommeil</Text><Field label="Coucher" value={sleep} onChange={setSleep}/><Field label="Réveil" value={wake} onChange={setWake}/><Field label="Qualité 1–5" value={quality} onChange={setQuality} keyboardType="numeric"/><Button title="Enregistrer" onPress={saveSleep}/></Card>
    <Card><Text style={S.section}>🔮 Projection</Text><Text style={S.text}>Si ta tendance actuelle continue, YProgress estimera ta trajectoire sur 4, 12 et 24 semaines.</Text><Text style={S.muted}>Ce sont des projections indicatives, pas des garanties.</Text></Card>
    <Card><Text style={S.section}>⚠️ Détection de plateau</Text><Text style={S.text}>Si ta moyenne de poids stagne malgré une adhérence élevée, le coach pourra proposer une petite adaptation calorique.</Text></Card>
    <Card><Text style={S.section}>🏆 Score de la semaine</Text><Text style={S.score}>{weekly.score || "—"}<Text style={S.kg}>/100</Text></Text><Text style={S.text}>Calories moyennes : {weekly.avgCalories||"—"}</Text><Text style={S.text}>Protéines moyennes : {weekly.avgProtein||"—"} g</Text><Button title="Calculer mon bilan" onPress={weeklyAnalysis}/></Card>
    <Card><Text style={S.section}>📸 Timeline physique</Text><Text style={S.muted}>Semaine 1 → 4 → 8 → 12 → 16 → 20 → 24. Comparaison de photos dans la build native.</Text></Card>
  </ScrollView>}

  function Profile(){return <ScrollView key="profile" contentContainerStyle={S.content}><Text style={S.title}>⚙️ Profil</Text>
    <Card><Text style={S.section}>Tes bases</Text><Text style={S.text}>1,70 m • 55 kg • prise de masse progressive</Text><Text style={S.muted}>{targets.calories} kcal • {targets.protein}g protéines • {targets.fat}g lipides • ~{dynamicCarbs}g glucides</Text></Card>
    <Card><View style={S.switchLine}><View><Text style={S.section}>🔔 Notifications intelligentes</Text><Text style={S.muted}>Repas • entraînement • sommeil</Text></View><Switch value={notifications} onValueChange={scheduleNotifications}/></View></Card>
    <Card><Text style={S.section}>❤️ Apple Santé</Text><Text style={S.text}>Pas • sommeil • poids • énergie active</Text><Text style={S.muted}>HealthKit réel à activer dans la development build iOS.</Text></Card>
    <Card><Text style={S.section}>🔐 Confidentialité</Text><Text style={S.muted}>La clé IA reste sur le serveur. L'application ne doit jamais embarquer OPENROUTER_API_KEY.</Text></Card>
    <Card><Text style={S.section}>🎙️ Entrée vocale</Text><Text style={S.muted}>Prévue : « J'ai mangé 200 g de poulet et 150 g de riz » → journal automatique.</Text></Card>
    <Card><Text style={S.section}>📱 Widget iPhone</Text><Text style={S.muted}>Prévu : calories, protéines, pas et sommeil directement sur l'écran d'accueil.</Text></Card>
  </ScrollView>}

  const progressionContext={sleepMin:health.sleepMin,fatigue:hardDay?5:2,proteinRatio:total.protein/targets.protein,calorieRatio:total.calories/targets.calories,hydrationRatio:water/waterTarget,jjbSessions:jjb?1:0,cardioSessions:jjb?1:0};
  const pages={home:Home(),nutrition:Nutrition(),program:<ProgramPage key="program" selectedDayKey={selectedDayKey} setSelectedDayKey={setSelectedDayKey} week={trainingWeek} setWeek={changeTrainingWeek} drafts={workoutLogs} onSaveSet={saveTrainingSet} history={trainingHistory} onComplete={completeExercise} hardDay={hardDay} onEmergency={emergencyDay} progressionContext={progressionContext} exerciseOverrides={exerciseOverrides} onReplaceExercise={replaceExercise}/>,progress:ProgressPage(),profile:Profile()};
  return <SafeAreaView style={S.safe}><StatusBar style="light"/>{pages[tab]}<View style={S.bottom}>{[["home","⌂","Accueil"],["nutrition","◉","Nutrition"],["program","✦","Programme"],["progress","⌁","Progrès"],["profile","⚙","Profil"]].map(([id,ic,l])=><Pressable key={id} onPress={()=>setTab(id)} style={[S.nav,tab===id&&S.navActive]}><Text style={[S.navIcon,tab===id&&S.navIconActive]}>{ic}</Text><Text style={[S.navText,tab===id&&S.navTextActive]}>{l}</Text></Pressable>)}</View></SafeAreaView>
}

const S=StyleSheet.create({
safe:{flex:1,backgroundColor:"#040814"},pageScroll:{flex:1},content:{width:"100%",maxWidth:760,alignSelf:"center",padding:18,paddingBottom:120},header:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginBottom:18},
eyebrow:{color:"#aa8cff",fontSize:10,fontWeight:"900",letterSpacing:1.5},title:{fontSize:30,fontWeight:"900",color:"#f8f9ff",marginTop:4},text:{color:"#e9edff",fontSize:13,lineHeight:20,flexShrink:1},muted:{color:"#a8b1ca",fontSize:13,lineHeight:19},
avatar:{width:46,height:46,borderRadius:23,backgroundColor:"#7045ff",alignItems:"center",justifyContent:"center"},avatarText:{color:"#fff",fontWeight:"900",fontSize:18},phase:{flexDirection:"row",alignItems:"center",padding:15,borderRadius:20,backgroundColor:"#0d182b",borderWidth:1,borderColor:"#263d64",marginBottom:13},phaseIcon:{fontSize:25,marginRight:12},phaseTitle:{color:"#fff",fontWeight:"900"},phaseSub:{color:"#a8b1ca",fontSize:12,marginTop:2},arrow:{color:"#91a0bf",fontSize:25},
card:{backgroundColor:"rgba(12,22,43,0.96)",borderRadius:22,padding:16,borderWidth:1,borderColor:"#21365d",marginBottom:12,shadowColor:"#4d28ff",shadowOpacity:.14,shadowRadius:16},hero:{backgroundColor:"#17132d",borderColor:"#553594",flexDirection:"row",justifyContent:"space-between",alignItems:"center"},heroNum:{fontSize:44,fontWeight:"900",color:"#fff",marginTop:3},glow:{width:78,height:78,borderRadius:39,backgroundColor:"#362078",alignItems:"center",justifyContent:"center"},
metrics:{flexDirection:"row",gap:8,marginBottom:12},metric:{flex:1,backgroundColor:"#0c172a",borderRadius:18,padding:11,borderWidth:1,borderColor:"#203555"},metricValue:{color:"#fff",fontSize:17,fontWeight:"900",marginTop:5},metricTarget:{color:"#96a2ba",fontSize:10},metricLabel:{color:"#c1c9da",fontSize:11,marginVertical:6},track:{height:6,backgroundColor:"#253653",borderRadius:9,overflow:"hidden"},fill:{height:"100%",backgroundColor:"#5bdcff",borderRadius:9},
cardHead:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},section:{color:"#fff",fontSize:17,fontWeight:"900",marginBottom:8},ai:{color:"#d2c6ff",fontSize:9,fontWeight:"900",backgroundColor:"#35206e",paddingHorizontal:8,paddingVertical:5,borderRadius:9},coach:{color:"#f1f3ff",fontSize:15,lineHeight:23},workout:{backgroundColor:"#0f2039",borderColor:"#275282"},autopilot:{backgroundColor:"#171638",borderColor:"#6149a5"},actionRow:{flexDirection:"row",alignItems:"center",gap:10,paddingVertical:8},actionNum:{width:24,height:24,borderRadius:12,backgroundColor:"#3d2674",color:"#d3c7ff",textAlign:"center",paddingTop:3,fontWeight:"900"},quickRow:{flexDirection:"row",gap:8},workoutTitle:{color:"#fff",fontSize:19,fontWeight:"900",marginVertical:5},
button:{backgroundColor:"#6848ef",padding:14,borderRadius:16,alignItems:"center",marginTop:10,borderWidth:1,borderColor:"#a273ff",shadowColor:"#ed45d4",shadowOpacity:.28,shadowRadius:12},button2:{backgroundColor:"#14213a",borderColor:"#29436e"},buttonText:{color:"#fff",fontWeight:"900"},buttonText2:{color:"#e9eeff"},
timeline:{flexDirection:"row",gap:6,marginBottom:14},timelineItem:{flex:1,paddingVertical:12,paddingHorizontal:3,borderRadius:13,backgroundColor:"#0c1728",borderWidth:1,borderColor:"#223756",alignItems:"center"},timelineActive:{backgroundColor:"#28165e",borderColor:"#6f4cff"},timelineText:{color:"#d6ddec",fontSize:9,fontWeight:"900",textAlign:"center"},
photoBox:{height:190,borderRadius:24,backgroundColor:"#15132a",borderWidth:1,borderColor:"#49347f",alignItems:"center",justifyContent:"center",marginVertical:15,overflow:"hidden"},photo:{width:"100%",height:"100%"},photoTitle:{color:"#fff",fontSize:18,fontWeight:"900",marginTop:7},option:{paddingVertical:12,borderBottomWidth:1,borderBottomColor:"#263b5b"},label:{color:"#aeb9d2",fontSize:10,fontWeight:"800",marginBottom:5},input:{backgroundColor:"#07101f",borderWidth:1,borderColor:"#294163",borderRadius:13,color:"#fff",padding:12},toggle:{flexDirection:"row",gap:8,marginVertical:12},pill:{backgroundColor:"#17243a",paddingHorizontal:13,paddingVertical:9,borderRadius:99},pillActive:{backgroundColor:"#392070"},pillText:{color:"#e2e7f4",fontSize:12,fontWeight:"800"},switchLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"center"},exercise:{flexDirection:"row",alignItems:"center",gap:12},num:{width:30,color:"#9175ff",fontWeight:"900"},
programHeader:{flexDirection:"row",alignItems:"center",justifyContent:"space-between"},weekBadge:{backgroundColor:"#152344",borderColor:"#405d99",borderWidth:1,borderRadius:16,paddingHorizontal:14,paddingVertical:8,alignItems:"center"},weekBadgeLabel:{color:"#8fa7d8",fontSize:8,fontWeight:"900",letterSpacing:1},weekBadgeValue:{color:"#fff",fontSize:19,fontWeight:"900"},dayScroller:{gap:9,marginVertical:16,paddingHorizontal:1,paddingBottom:4},dayCard:{width:58,height:72,borderRadius:19,backgroundColor:"#0c172a",borderWidth:1,borderColor:"#203555",alignItems:"center",justifyContent:"center"},dayCardActive:{backgroundColor:"#3e28a8",borderColor:"#b77cff",shadowColor:"#b431ff",shadowOpacity:.7,shadowRadius:12,transform:[{translateY:-2}]},dayLabel:{color:"#8391ad",fontSize:10,fontWeight:"900"},dayLabelActive:{color:"#fff"},dayEmoji:{fontSize:19,marginVertical:4},dayDot:{width:4,height:4,borderRadius:2,backgroundColor:"#30415f"},dayDotActive:{width:17,backgroundColor:"#4fe8ff"},
workoutHero:{borderRadius:24,padding:18,flexDirection:"row",alignItems:"center",gap:14,marginBottom:12,borderWidth:1,borderColor:"#734dd3"},heroIcon:{width:54,height:54,borderRadius:18,backgroundColor:"rgba(9,12,31,.45)",alignItems:"center",justifyContent:"center"},workoutType:{color:"#6de9ff",fontSize:9,fontWeight:"900",letterSpacing:1.3},heroSubtitle:{color:"#d3dcf4",fontSize:12,lineHeight:18},exerciseCard:{backgroundColor:"#0b172b",borderColor:"#213e68"},exerciseTop:{flexDirection:"row",alignItems:"center",gap:10},exerciseNumber:{width:34,height:34,borderRadius:12,backgroundColor:"#2f2369",alignItems:"center",justifyContent:"center"},exerciseNumberText:{color:"#cabdff",fontWeight:"900",fontSize:12},exerciseName:{color:"#fff",fontSize:15,fontWeight:"900",marginBottom:3},videoButton:{paddingHorizontal:11,paddingVertical:9,borderRadius:13,backgroundColor:"#542ed0",borderWidth:1,borderColor:"#e24bd7"},videoButtonText:{color:"#fff",fontSize:11,fontWeight:"900"},prescriptionRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",marginTop:14,gap:10},prescription:{color:"#fff",fontSize:18,fontWeight:"900"},loadChip:{backgroundColor:"#112746",borderRadius:14,paddingHorizontal:12,paddingVertical:8,alignItems:"flex-end"},loadChipLabel:{color:"#5ee8cd",fontSize:8,fontWeight:"900"},loadChipValue:{color:"#fff",fontSize:16,fontWeight:"900"},reason:{color:"#b9c6e2",fontSize:11,lineHeight:17,marginTop:8},rest:{color:"#b2bdd4",fontSize:12,marginTop:12},setRow:{flexDirection:"row",gap:7,marginTop:8,alignItems:"flex-end"},setLabel:{color:"#b5a4ff",fontWeight:"900",fontSize:11,width:22,paddingBottom:15},setField:{flex:1,minWidth:0},history:{marginTop:14,paddingTop:12,borderTopWidth:1,borderTopColor:"#203a60"},historyTitle:{color:"#6de9ff",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginBottom:6},historyItem:{color:"#cbd5ea",fontSize:11,marginTop:4},restDay:{backgroundColor:"#0d2035",borderColor:"#285b79"},restTitle:{color:"#60e2ff",fontSize:11,fontWeight:"900",letterSpacing:1.4,marginBottom:9},priorityRow:{flexDirection:"row",gap:10,alignItems:"center",paddingVertical:7},check:{color:"#50e39d",fontWeight:"900"},restFoot:{color:"#8ea9c3",fontSize:11,marginTop:10},
modalBackdrop:{flex:1,backgroundColor:"rgba(1,4,13,.88)",padding:18,justifyContent:"center"},videoModal:{width:"100%",maxWidth:680,alignSelf:"center",backgroundColor:"#09162a",borderRadius:26,padding:16,borderWidth:1,borderColor:"#5a3bb1"},modalHead:{flexDirection:"row",alignItems:"center",marginBottom:12},closeButton:{width:38,height:38,borderRadius:19,backgroundColor:"#1b2940",alignItems:"center",justifyContent:"center"},closeText:{color:"#fff",fontSize:26,lineHeight:28},video:{width:"100%",aspectRatio:16/9,borderRadius:18,backgroundColor:"#02050c",marginBottom:12},nativeVideoFallback:{alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:"#6946c5"},videoSource:{color:"#74dff5",fontSize:10,fontWeight:"800",marginBottom:9},drillCard:{borderColor:"#6449c8",backgroundColor:"#11183a"},drillBadge:{color:"#67eddd",fontSize:9,fontWeight:"900",letterSpacing:1.1,marginBottom:12},noVideo:{color:"#9aa8c3",fontSize:9,maxWidth:60,textAlign:"center"},changeButton:{alignSelf:"flex-start",marginTop:12,paddingHorizontal:11,paddingVertical:8,borderRadius:12,backgroundColor:"#14243d",borderWidth:1,borderColor:"#31517d"},changeButtonText:{color:"#a8dff8",fontSize:10,fontWeight:"900"},swapModal:{width:"100%",maxWidth:680,maxHeight:"92%",alignSelf:"center",backgroundColor:"#09162a",borderRadius:26,borderWidth:1,borderColor:"#5a3bb1"},swapContent:{padding:16},swapTitle:{color:"#67eddd",fontSize:9,fontWeight:"900",letterSpacing:1.2,marginTop:20,marginBottom:10},swapOption:{flexDirection:"row",alignItems:"center",padding:13,borderRadius:15,backgroundColor:"#10213a",borderWidth:1,borderColor:"#27456c",marginBottom:8},swapArrow:{color:"#a98cff",fontSize:27},favoritesCard:{paddingVertical:13},favoriteWrap:{flexDirection:"row",flexWrap:"wrap",gap:7},favoritePill:{backgroundColor:"#2c2362",borderRadius:99,paddingHorizontal:10,paddingVertical:7},favoriteText:{color:"#ede9ff",fontSize:10,fontWeight:"800"},groceryList:{marginTop:15,paddingTop:8,borderTopWidth:1,borderTopColor:"#274267"},groceryRow:{flexDirection:"row",alignItems:"center",paddingVertical:10,borderBottomWidth:1,borderBottomColor:"#1b3352"},groceryPrice:{color:"#67eddd",fontWeight:"900"},groceryTotal:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",paddingTop:14},groceryTotalValue:{color:"#fff",fontSize:20,fontWeight:"900"},
weight:{fontSize:48,color:"#fff",fontWeight:"900"},kg:{fontSize:18,color:"#9da9c0"},good:{color:"#6ee8b4",fontSize:12,fontWeight:"800"},chart:{height:100,flexDirection:"row",alignItems:"flex-end",gap:9,paddingVertical:10},bar:{flex:1,backgroundColor:"#704df2",borderRadius:5},score:{fontSize:52,fontWeight:"900",color:"#fff"},bottom:{position:"absolute",left:12,right:12,bottom:10,height:72,borderRadius:25,backgroundColor:"#0c1728",borderWidth:1,borderColor:"#2e456b",flexDirection:"row",justifyContent:"space-around",alignItems:"center",shadowColor:"#000",shadowOpacity:.5,shadowRadius:18},nav:{alignItems:"center",justifyContent:"center",paddingHorizontal:8,paddingVertical:6,borderRadius:16},navActive:{backgroundColor:"#35227b"},navIcon:{fontSize:20,color:"#8c98b0"},navIconActive:{color:"#64e5ff"},navText:{fontSize:10,color:"#8c98b0",marginTop:3},navTextActive:{color:"#fff",fontWeight:"800"}
});
