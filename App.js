import {initPWA} from "./src/pwa";
import React, {useEffect, useMemo, useRef, useState} from "react";
import {SafeAreaView,View,Text,StyleSheet,Pressable,ScrollView,TextInput,Alert,Switch,Image,Modal,Platform,Linking} from "react-native";
import {store,KEYS,migrateLegacyKeys} from "./src/services/storage/store";
import * as ImagePicker from "expo-image-picker";
import * as Notifications from "expo-notifications";
import {StatusBar} from "expo-status-bar";
import {LinearGradient} from "expo-linear-gradient";
import {WEEK_DAYS,WORKOUTS,dayByKey,dayKeyForDate,jjbDrillFor,EXERCISE_ALTERNATIVES,customExercise} from "./src/features/training/program";
import {appendPerformance,historyForExercise,recommendNextLoad} from "./src/core/progression";
import {buildGroceryList,toggleGroceryItem,checkedTotal} from "./src/core/groceryPlanner";
import {upsertDay,weeklySummary,weightSeries,sleepDebt,lastNDays,streak,hasSleep} from "./src/core/history";
import {buildAutopilotSnapshot,detectPlateau} from "./src/core/autopilot";
import {buildSleepRecommendation} from "./src/core/intelligence";
import {recoveryScore} from "./src/core/progression";
import {sleepAutoDetection} from "./src/services/health/sleepAutoDetection";
import {FEATURES} from "./src/core/featureFlags";
import {SEXES,ACTIVITY_LEVELS,GOALS,computeTargets,isProfileComplete,maintenanceCalories,expectedWeeklyRange} from "./src/core/profile";
import {palette as P,glass as GL,gradient as GR,space as SP,radius as RD,type as T,font as F,shadow as SH,LAYOUT,metricColumns,typeScale} from "./src/design/theme";

const BASE={calories:2500,protein:110,fat:70,steps:10000,sleepMin:450};
// Application personnelle : le profil est pré-rempli, modifiable depuis l'onglet Profil.
const MY_PROFILE={name:"Yacine",sex:"male",age:21,heightCm:170,weight:55,activity:"moderate",goal:"lean_gain",sleepMin:450};
const AI_BASE_URL=(process.env.EXPO_PUBLIC_AI_BASE_URL||"").replace(/\/$/,"");
const fr=n=>String(n).replace(".",",");
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
function Button({title,onPress,secondary,tone="lime",style}){
  const fill=tone==="teal"?GR.teal:tone==="clay"?GR.clay:GR.lime;
  return <Pressable accessibilityRole="button" onPress={onPress} style={({pressed})=>[S.button,secondary&&S.button2,style,pressed&&S.buttonPressed]}>
    {!secondary&&<LinearGradient colors={fill} start={{x:0,y:0}} end={{x:1,y:1}} style={StyleSheet.absoluteFill} pointerEvents="none"/>}
    <LinearGradient colors={GR.sheen} locations={[0,.6,1]} start={{x:0,y:0}} end={{x:0,y:1}} style={S.buttonSheen} pointerEvents="none"/>
    <View style={S.buttonInner} pointerEvents="none"><Text style={[S.buttonText,secondary&&S.buttonText2]}>{title}</Text></View>
  </Pressable>
}
function Field({label,value,onChange,keyboardType,style,placeholder}){return <View style={[{marginBottom:SP.md},style]}><Text style={S.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChange} keyboardType={keyboardType||"default"} style={S.input} placeholder={placeholder} placeholderTextColor={P.inkFaint}/></View>}
function Progress({value,target}){const p=clamp((Number(value)||0)/(Number(target)||1),0,1);return <View style={S.track}><View style={[S.fill,{width:`${p*100}%`}]}/></View>}
function Metric({emoji,label,value,target,display}){return <View style={S.metric}>
  <Text style={S.metricLabel} numberOfLines={1}>{emoji} {label}</Text>
  <Text style={S.metricValue} numberOfLines={1} adjustsFontSizeToFit>{value}</Text>
  <Text style={S.metricTarget} numberOfLines={1}>/ {display??target}</Text>
  <Progress value={value} target={Number(target)||1}/>
</View>}
/** Courbe de poids réelle : normalisée entre min et max, avec état vide honnête. */
function WeightChart({series=[],max=14}){
  const points=series.slice(-max);
  if(points.length<2) return <View style={S.chartEmpty}><Text style={S.muted}>Enregistre ton poids au moins 2 jours pour voir la tendance.</Text></View>;
  const values=points.map(p=>p.weight);
  const lo=Math.min(...values),hi=Math.max(...values);
  // Domaine élargi à 0,6 kg minimum : un poids stable se lit comme une ligne médiane
  // au lieu d'être écrasé en bas, et une variation de 50 g n'est pas dramatisée.
  const MIN_SPAN=.6,mid=(lo+hi)/2,span=Math.max(hi-lo,MIN_SPAN),floor=mid-span/2;
  const flat=hi-lo<.15;
  return <View>
    <View style={S.chart}>{points.map((pt,i)=>{
      const ratio=(pt.weight-floor)/span;
      return <View key={pt.date} style={[S.bar,{height:Math.max(8,10+ratio*80)},i===points.length-1&&S.barLast]}/>;
    })}</View>
    <View style={S.chartAxis}>
      <Text style={S.chartAxisText}>{fr(lo.toFixed(1))} kg</Text>
      <Text style={S.chartAxisText}>{flat?"stable":`${points.length} pesées`}</Text>
      <Text style={S.chartAxisText}>{fr(hi.toFixed(1))} kg</Text>
    </View>
  </View>;
}

function Pill({children,active,onPress}){return <Pressable accessibilityRole="button" accessibilityState={{selected:!!active}} onPress={onPress} style={({pressed})=>[S.pill,active&&S.pillActive,pressed&&S.buttonPressed]}><Text style={[S.pillText,active&&{color:P.lime}]}>{children}</Text></Pressable>}

function ExerciseVideoModal({exercise,onClose}){
  const video=exercise?.video;
  const watchUrl=video?`https://www.youtube.com/watch?v=${video.id}${video.start?`&t=${video.start}s`:""}`:"";
  const embedUrl=video?`https://www.youtube-nocookie.com/embed/${video.id}?playsinline=1&rel=0${video.start?`&start=${video.start}`:""}`:"";
  return <Modal visible={Boolean(exercise)} transparent animationType="fade" onRequestClose={onClose}>
    <View style={S.modalBackdrop}><View style={S.videoModal}>
      <View style={S.modalHead}><View style={{flex:1}}><Text style={S.eyebrow}>DÉMONSTRATION</Text><Text style={S.exerciseName}>{exercise?.name}</Text></View><Pressable accessibilityLabel="Fermer la vidéo" onPress={onClose} style={S.closeButton}><Text style={S.closeText}>×</Text></Pressable></View>
      {Platform.OS==="web"&&video?React.createElement("iframe",{src:embedUrl,title:`Démonstration ${exercise?.name}`,style:{width:"100%",aspectRatio:"16 / 9",border:0,borderRadius:RD.lg,backgroundColor:P.void,marginBottom:SP.md},allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",allowFullScreen:true}):<Pressable style={[S.video,S.nativeVideoFallback]} onPress={()=>watchUrl&&Linking.openURL(watchUrl)}><Text style={S.videoButtonText}>▶ Ouvrir la démonstration YouTube</Text></Pressable>}
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
    <LinearGradient colors={workout.type==="REST"?GR.rest:workout.type==="ACTIVITY"?GR.activity:GR.strength} start={{x:0,y:0}} end={{x:1,y:1}} style={S.workoutHero}>
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
            <View style={S.setHead}><Text style={S.setLabel}> </Text>{["KG","REPS","RIR"].map(h=><Text key={h} style={S.setHeadCell}>{h}</Text>)}</View>
            {Array.from({length:shownExercise.sets},(_,setIndex)=>{const set=sets[setIndex]||{};return <View key={setIndex} style={S.setRow}>
              <Text style={S.setLabel}>S{setIndex+1}</Text>
              <TextInput style={S.setInput} value={String(set.load??"")} onChangeText={v=>onSaveSet(shownExercise,setIndex,"load",v)} keyboardType="decimal-pad" placeholder="—" placeholderTextColor={P.inkFaint} accessibilityLabel={`Série ${setIndex+1} charge`}/>
              <TextInput style={S.setInput} value={String(set.reps??"")} onChangeText={v=>onSaveSet(shownExercise,setIndex,"reps",v)} keyboardType="numeric" placeholder="—" placeholderTextColor={P.inkFaint} accessibilityLabel={`Série ${setIndex+1} répétitions`}/>
              <TextInput style={S.setInput} value={String(set.rir??"")} onChangeText={v=>onSaveSet(shownExercise,setIndex,"rir",v)} keyboardType="numeric" placeholder="—" placeholderTextColor={P.inkFaint} accessibilityLabel={`Série ${setIndex+1} RIR`}/>
            </View>})}
            <Button title="Valider la performance" onPress={()=>onComplete(shownExercise,recommendation)} secondary/>
            {exerciseHistory.length>0&&<View style={S.history}><Text style={S.historyTitle}>HISTORIQUE</Text>{exerciseHistory.slice(-3).map(item=><Text key={item.week} style={S.historyItem}>S{item.week}  •  {item.actualLoad} kg  •  {item.sets.map(s=>s.reps).join(" / ")} reps</Text>)}</View>}
          </>:<><Text style={S.rest}>Durée : {shownExercise.duration} • {shownExercise.rest}</Text><Text style={S.reason}>{shownExercise.isDrill?"Travaille lentement avec un partenaire coopératif avant d’ajouter de la résistance.":"Cette activité influence la récupération, jamais une charge arbitraire."}</Text></>}
        </Card>})}
      {strength&&<Button title={`Passer à la semaine ${week+1}`} onPress={()=>setWeek(week+1)}/>}</>}
    <ExerciseVideoModal exercise={videoExercise} onClose={()=>setVideoExercise(null)}/>
    <ExerciseSwapModal slot={swapSlot} onClose={()=>setSwapSlot(null)} onSelect={item=>{onReplaceExercise(swapSlot.id,item);setSwapSlot(null)}}/>
  </ScrollView>
}

function Home({app}){
const {phase,remaining,total,targets,stepValue,coach,coachLoading,analyze,autopilotActions,generateWeek,setTab,health,quality,jjb,gym,todayWorkout,water,waterTarget,setWaterAmount,addWater,caffeine,setCaffeine,recovery,dayStreak,setStepCount,profile,coachStatus,coachSource}=app;
// On dit la vérité sur l'origine du conseil : IA réelle ou repli local.
const coachStatusLabel=
  coachSource==="ai" ? `Réponse du coach IA • ${coachStatus.model||"modèle gratuit"}`
  : coachSource==="rate_limited" ? "Trop de demandes : patiente un instant."
  : coachSource==="provider_down" ? "Coach IA indisponible : conseil calculé localement."
  : coachSource ? "Serveur injoignable : conseil calculé localement."
  : coachStatus.state==="ready" ? "Coach IA prêt • clé conservée côté serveur"
  : coachStatus.state==="misconfigured" ? `⚠️ ${coachStatus.detail||"Configuration IA incomplète."}`
  : coachStatus.state==="offline" ? "Serveur IA injoignable : mode local."
  : "Vérification de la configuration…";
return <ScrollView key="home" contentContainerStyle={S.content}>
  <View style={S.header}><View><Text style={S.eyebrow}>YPROGRESS • COACH OS</Text><Text style={S.title}>{profile?.name?`Salut ${profile.name} 👋`:"Salut 👋"}</Text><Text style={S.muted}>Ton coach décide avec toi.</Text></View><View style={S.avatar}><Text style={S.avatarText}>{(profile?.name||"Y").trim().charAt(0).toUpperCase()}</Text></View></View>
  <View style={S.phase}><Text style={S.phaseIcon}>{phase.icon}</Text><View style={{flex:1}}><Text style={S.phaseTitle}>{phase.title}</Text><Text style={S.phaseSub}>{phase.sub}</Text></View>{dayStreak>0?<View style={S.streakBadge}><Text style={S.streakValue}>{dayStreak}</Text><Text style={S.streakLabel}>JOURS</Text></View>:<Text style={S.arrow}>›</Text>}</View>
  <Card style={S.hero}><View><Text style={S.eyebrow}>RESTE À MANGER</Text><Text style={S.heroNum}>{remaining}</Text><Text style={S.muted}>kcal • cible dynamique</Text></View><View style={S.glow}><Text style={{fontSize:32}}>🔥</Text></View></Card>
  <View style={S.metrics}><Metric emoji="🔥" label="Calories" value={Math.round(total.calories)} target={targets.calories}/><Metric emoji="🥩" label="Protéines" value={Math.round(total.protein)} target={targets.protein} display={targets.protein+" g"}/><Metric emoji="🚶" label="Pas" value={stepValue} target={targets.steps} display={targets.steps>=1000?`${Math.round(targets.steps/100)/10}k`:targets.steps}/></View>
  <Card><View style={S.cardHead}><Text style={S.section}>🧠 Décision du jour</Text><Text style={[S.ai,coachSource&&coachSource!=="ai"&&S.aiWarn]}>{coachSource==="ai"?"COACH IA":coachSource?"HORS LIGNE":"ADAPTATIF"}</Text></View>
      <Text style={S.coach}>{coach}</Text>
      <Text style={S.muted}>{coachLoading?"Analyse en cours…":coachStatusLabel}</Text>
      <Button title={coachLoading?"Analyse…":"Analyser ma journée"} onPress={analyze}/></Card>
  <Card style={S.autopilot}>
    <View style={S.cardHead}><Text style={S.section}>🧠 AUTOPILOT</Text><Text style={S.ai}>3 PRIORITÉS</Text></View>
    {autopilotActions.map((a,i)=><View key={i} style={S.actionRow}><Text style={S.actionNum}>{i+1}</Text><Text style={S.text}>{a}</Text></View>)}
    <Button title="Planifier ma semaine" onPress={()=>{generateWeek();setTab("program")}} secondary/>
  </Card>
  <Card><View style={S.cardHead}><Text style={S.section}>😴 Récupération</Text><Text style={S.ai}>{recovery}/100</Text></View><Progress value={recovery} target={100}/><Text style={S.text}>{health.sleepMin?`${Math.floor(health.sleepMin/60)}h${String(health.sleepMin%60).padStart(2,"0")}`:"Sommeil non renseigné"} • qualité {quality}/5</Text><Text style={S.muted}>{recovery>=70?"Récupération compatible avec une progression de charge.":recovery>=45?"Récupération moyenne : consolide plutôt que d'augmenter.":"Récupération basse : réduis le volume aujourd'hui."}</Text></Card>
    <Card><Text style={S.section}>🚶 Pas du jour</Text><Field label="Nombre de pas" value={String(stepValue||"")} onChange={setStepCount} keyboardType="numeric"/><Progress value={stepValue} target={targets.steps}/><Text style={S.muted}>Saisis tes pas (ou connecte Apple Santé dans une build native) pour que l'Autopilot arrête de les réclamer.</Text></Card>
  <Card style={S.workout}><Text style={S.section}>{jjb?"🥋 MMA / JJB":"🏋️ Séance du jour"}</Text><Text style={S.workoutTitle}>{jjb?"Technique + sparring":`${todayWorkout().emoji} ${todayWorkout().name}`}</Text><Text style={S.muted}>{todayWorkout().subtitle} • {gym?"Séance activée":"À planifier"}</Text><Button title="Voir le programme" onPress={()=>setTab("program")} secondary/></Card>
  <Card><Text style={S.section}>🎯 Mode « journée difficile »</Text><Text style={S.muted}>Si tu es KO, active le mode récupération dans Programme : volume réduit, objectifs essentiels conservés.</Text></Card>
  <Card><Text style={S.section}>💧 Hydratation</Text><Text style={S.text}>{water} / {waterTarget} ml</Text><Progress value={water} target={waterTarget}/><Field label="Quantité exacte (ml)" value={String(water)} onChange={setWaterAmount} keyboardType="numeric"/><View style={S.quickRow}><Button title="−250 ml" onPress={()=>setWaterAmount(water-250)} secondary/><Button title="+250 ml" onPress={()=>addWater(250)}/><Button title="+500 ml" onPress={()=>addWater(500)}/></View></Card>
  <Card><Text style={S.section}>☕ Caféine</Text><Text style={S.muted}>Le coach peut repérer si la caféine tardive coïncide avec un sommeil moins bon.</Text><View style={S.switchLine}><Text style={S.text}>Caféine après 16h</Text><Switch value={caffeine} onValueChange={setCaffeine} trackColor={{false:P.surfaceHigh,true:P.limeDeep}} thumbColor={caffeine?P.lime:P.inkMuted} ios_backgroundColor={P.surfaceHigh}/></View></Card>
  <Text style={S.section}>📅 Calendrier</Text><View style={S.timeline}>{["1–16 Sep","17–20 🇹🇳","Oct–Déc 🥋","Jan 🎓","Fév+ 💪"].map((x,i)=><View key={x} style={[S.timelineItem,(phase.key==="travel"&&i===1)||(phase.key==="internship"&&i===2)||(phase.key==="school"&&i===3)||(phase.key==="free"&&i===4)||(phase.key==="september"&&i===0)?S.timelineActive:null]}><Text style={S.timelineText}>{x}</Text></View>)}</View>
</ScrollView>}

function Nutrition({app}){
const {foodDraft,setFoodDraft,restaurantChoice,photoMeal,photo,setPhoto,restaurantMode,remaining,pRemain,budget,changeBudget,targets,generateGroceries,groceryList,groceryChecked,toggleGrocery,clearGroceries,dynamicCarbs,total,addLog}=app;
const f=foodDraft,setF=setFoodDraft;return <ScrollView key="nutrition" contentContainerStyle={S.content}>
  <Text style={S.title}>🍽️ Nutrition</Text><Text style={S.muted}>Le coach te dit quoi manger maintenant.</Text><Button title="🍽️ Je mange au restaurant" onPress={restaurantChoice} secondary/>
  <Pressable style={S.photoBox} onPress={photoMeal}>{photo?<Image source={{uri:photo}} style={S.photo}/>:<><Text style={{fontSize:40}}>📸</Text><Text style={S.photoTitle}>Photographier mon repas</Text><Text style={S.muted}>Analyse IA • calories • macros • confiance</Text></>}</Pressable>
  {restaurantMode&&<Card><Text style={S.section}>🍔 Mode restaurant</Text><Text style={S.text}>Choisis ce que tu veux manger. L’objectif est d’estimer puis d’adapter le reste de la journée, pas de culpabiliser.</Text><Button title="Voir mes choix" onPress={()=>Alert.alert("Choix","Poulet + riz • Steak + pommes de terre • Burger : choisis selon tes envies et le budget restant.")}/></Card>}{photo&&<Card><Text style={S.section}>🤖 Analyse IA</Text><Text style={S.text}>Photo prête à envoyer au serveur sécurisé.</Text><Button title="Analyser le repas" onPress={()=>Alert.alert("IA","Connecte le serveur IA pour l'analyse vision réelle.")}/><Button title="Supprimer" secondary onPress={()=>setPhoto(null)}/></Card>}
  <Card><Text style={S.section}>🍴 Qu'est-ce que je mange maintenant ?</Text><Text style={S.text}>Tu as {remaining} kcal et {pRemain} g de protéines à couvrir.</Text><View style={S.option}><Text style={S.text}>🥣 Skyr + banane + avoine</Text><Text style={S.muted}>≈ 430 kcal • 28 P</Text></View><View style={S.option}><Text style={S.text}>🍗 Poulet + riz + légumes</Text><Text style={S.muted}>≈ 620 kcal • 48 P</Text></View><View style={S.option}><Text style={S.text}>🥛 Shake + banane</Text><Text style={S.muted}>≈ 390 kcal • 30 P</Text></View></Card>
  <Card><Text style={S.section}>🍕 J’ai fait un écart</Text><Text style={S.muted}>Aucune compensation extrême. On reprend simplement le plan normal au prochain repas.</Text><Button title="Revenir au plan" onPress={()=>Alert.alert("C’est bon","Pas besoin de compenser. Reprends simplement tes objectifs habituels.")} secondary/></Card><Card><View style={S.cardHead}><Text style={S.section}>🛒 Liste de courses</Text>{groceryList&&<Text style={S.ai}>{groceryChecked.length}/{groceryList.items.length}</Text>}</View>
      <Field label="Budget hebdomadaire (€)" value={budget} onChange={changeBudget} keyboardType="decimal-pad"/>
      <Text style={S.muted}>Calculée pour 7 jours à partir de {targets.calories} kcal et {targets.protein} g de protéines par jour.</Text>
      <Button title={groceryList?"Recalculer ma liste":"Calculer ma liste de courses"} onPress={generateGroceries}/>
      {groceryList&&<View style={S.groceryList}>
        {groceryList.items.map(item=>{const done=groceryChecked.includes(item.id);return (
          <Pressable key={item.id} accessibilityRole="checkbox" accessibilityState={{checked:done}} onPress={()=>toggleGrocery(item.id)} style={({pressed})=>[S.groceryRow,pressed&&S.buttonPressed]}>
            <View style={[S.checkbox,done&&S.checkboxOn]}>{done&&<Text style={S.checkboxMark}>✓</Text>}</View>
            <View style={{flex:1}}>
              <Text style={[S.text,done&&S.groceryDone]}>{item.quantity} × {item.name}</Text>
              <Text style={S.muted}>{item.unit}</Text>
            </View>
            <Text style={[S.groceryPrice,done&&S.groceryDone]}>{fr(item.totalPrice.toFixed(2))} €</Text>
          </Pressable>);})}
        <View style={S.groceryTotal}><View style={{flex:1}}><Text style={S.section}>Panier</Text><Text style={S.muted}>{fr(checkedTotal(groceryList,groceryChecked).toFixed(2))} € pris sur {fr(groceryList.total.toFixed(2))} €</Text></View><Text style={S.groceryTotalValue}>{fr(groceryList.total.toFixed(2))} €</Text></View>
        <Progress value={checkedTotal(groceryList,groceryChecked)} target={groceryList.total||1}/>
        <Text style={S.reason}>Cette liste couvre {groceryList.calorieCoverage} % de tes calories et {groceryList.proteinCoverage} % de tes protéines pour la semaine.</Text>
        <Text style={S.muted}>{groceryList.remaining>2?`Il te reste ${fr(groceryList.remaining.toFixed(2))} € : acheter davantage reviendrait à manger au-delà de tes besoins.`:"Budget utilisé au maximum utile."} Prix indicatifs, à ajuster selon ton magasin.</Text>
        <Button title="Vider la liste" onPress={clearGroceries} secondary/>
      </View>}</Card>
  <Card><Text style={S.section}>🔥 Macros dynamiques</Text><Text style={S.text}>{remaining} kcal • {pRemain} g protéines • {Math.max(0,dynamicCarbs-total.carbs)} g glucides</Text></Card>
  <Card><Text style={S.section}>Ajouter manuellement</Text><Field label="Repas" value={f.name} onChange={v=>setF({...f,name:v})}/><Field label="Calories" value={f.calories} onChange={v=>setF({...f,calories:v})} keyboardType="numeric"/><Field label="Protéines" value={f.protein} onChange={v=>setF({...f,protein:v})} keyboardType="numeric"/><Field label="Glucides" value={f.carbs} onChange={v=>setF({...f,carbs:v})} keyboardType="numeric"/><Field label="Lipides" value={f.fat} onChange={v=>setF({...f,fat:v})} keyboardType="numeric"/><Button title="+ Ajouter" onPress={async()=>{if(!f.name||!f.calories)return;await addLog(f);setF({name:"",calories:"",protein:"",carbs:"",fat:""})}}/></Card>
</ScrollView>}

function ProgressPage({app}){
const {currentWeight,weight,setWeight,saveWeight,sleep,setSleep,wake,setWake,quality,setQuality,saveSleep,weekly,weeklyAnalysis,plateau,sleepAdvice,dayStreak,journal}=app;
return <ScrollView key="progress" contentContainerStyle={S.content}><Text style={S.title}>📈 Progression</Text>
  <Card><Text style={S.section}>⚖️ Poids</Text><Text style={S.weight}>{currentWeight} <Text style={S.kg}>kg</Text></Text><Text style={S.good}>Objectif : +0,15 à +0,30 kg/semaine</Text><WeightChart series={weightSeries(journal)}/><Field label="Poids actuel" value={weight} onChange={setWeight} keyboardType="decimal-pad"/><Button title="Enregistrer" onPress={saveWeight}/></Card>
  <Card><Text style={S.section}>😴 Sommeil</Text><Field label="Coucher" value={sleep} onChange={setSleep}/><Field label="Réveil" value={wake} onChange={setWake}/><Field label="Qualité 1–5" value={quality} onChange={setQuality} keyboardType="numeric"/><Button title="Enregistrer" onPress={saveSleep}/></Card>
  <Card style={plateau.detected?S.alertCard:null}><View style={S.cardHead}><Text style={S.section}>⚠️ Détection de plateau</Text><Text style={S.ai}>{plateau.reason?"EN ATTENTE":plateau.detected?"PLATEAU":"OK"}</Text></View>
    {plateau.reason?<Text style={S.text}>Il faut au moins 14 jours de pesées pour conclure. Tu en as {weightSeries(journal).length}.</Text>
      :plateau.detected?<><Text style={S.text}>Ton poids moyen stagne ({plateau.deltaKgPerWeek>=0?"+":""}{fr(plateau.deltaKgPerWeek.toFixed(2))} kg/semaine).</Text><Text style={S.reason}>Adaptation proposée : +{plateau.suggestedCalories} kcal par jour, à tenir une semaine avant de réévaluer.</Text></>
      :<Text style={S.text}>Progression normale : {plateau.deltaKgPerWeek>=0?"+":""}{fr(plateau.deltaKgPerWeek.toFixed(2))} kg/semaine. Aucune adaptation nécessaire.</Text>}
  </Card>
  <Card><View style={S.cardHead}><Text style={S.section}>😴 Dette de sommeil</Text><Text style={S.ai}>{sleepAdvice.urgency==="high"?"URGENT":"OK"}</Text></View><Text style={S.text}>{sleepAdvice.message}</Text><Text style={S.muted}>Objectif calculé : {Math.floor(sleepAdvice.desiredSleepMin/60)}h{String(sleepAdvice.desiredSleepMin%60).padStart(2,"0")} • {journal.filter(hasSleep).length} nuit(s) enregistrée(s).</Text></Card>
  <Card><View style={S.cardHead}><Text style={S.section}>🏆 Score de la semaine</Text><Text style={S.ai}>{weekly.sampleDays?`${weekly.sampleDays} J`:"—"}</Text></View><Text style={S.score}>{weekly.score || "—"}<Text style={S.kg}>/100</Text></Text>
    <Text style={S.text}>Calories moyennes : {weekly.avgCalories||"—"} kcal</Text>
    <Text style={S.text}>Protéines moyennes : {weekly.avgProtein||"—"} g</Text>
    <Text style={S.text}>Pas moyens : {weekly.avgSteps||"—"}</Text>
    <Text style={S.text}>Sommeil moyen : {weekly.avgSleepMin?`${Math.floor(weekly.avgSleepMin/60)}h${String(weekly.avgSleepMin%60).padStart(2,"0")}`:"—"}</Text>
    <Text style={S.text}>Variation de poids : {weekly.weightChange>0?"+":""}{fr(weekly.weightChange||0)} kg</Text>
    <Text style={S.muted}>Moyenne réelle sur les 7 dernières journées enregistrées.</Text>
    <Button title="Calculer mon bilan" onPress={weeklyAnalysis}/></Card>
</ScrollView>}

function Profile({app}){
const {targets,dynamicCarbs,notifications,scheduleNotifications,saveTargets,saveProfile,recovery,profile}=app;
const [measures,setMeasures]=useState(null);
const editingMeasures=measures!==null;
const computed=profile?computeTargets(measures||profile):null;
const goalLabelFor=id=>(GOALS.find(g=>g.id===id)||GOALS[0]).label;
const activityLabel=profile?(ACTIVITY_LEVELS.find(a=>a.id===profile.activity)||ACTIVITY_LEVELS[1]).label:"";
const [draft,setDraft]=useState(null);
const editing=draft!==null;
const field=key=>String(draft?.[key]??"");
function openEditor(){setDraft({...targets})}
async function saveManualTargets(){await saveTargets(draft);setDraft(null);Alert.alert("Objectifs enregistrés","Tes chiffres remplacent le calcul automatique jusqu'à ta prochaine mise à jour de mesures.")}
const goalLabel=profile?goalLabelFor(profile.goal):"Objectifs manuels";
return <ScrollView key="profile" contentContainerStyle={S.content} keyboardShouldPersistTaps="handled"><Text style={S.title}>⚙️ Profil</Text>
  <Card><View style={S.cardHead}><Text style={S.section}>Tes bases</Text><Text style={S.ai}>{goalLabel.toUpperCase()}</Text></View>
    {profile
      ? <><Text style={S.text}>{(profile.heightCm/100).toFixed(2).replace(".",",")} m • {profile.weight} kg • {profile.age} ans</Text>
          <Text style={S.muted}>{activityLabel} • objectif {goalLabel.toLowerCase()}</Text></>
      : <Text style={S.muted}>Profil non renseigné : tes objectifs ne sont pas encore calculés à partir de tes mesures.</Text>}
    <Text style={S.muted}>{targets.calories} kcal • {targets.protein} g protéines • {targets.fat} g lipides • ~{dynamicCarbs} g glucides</Text>
    <Text style={S.muted}>{targets.steps} pas • {Math.floor(targets.sleepMin/60)}h{String(targets.sleepMin%60).padStart(2,"0")} de sommeil visés</Text>
    {!editing&&!editingMeasures&&<Button title="Mettre à jour mes mesures" onPress={()=>setMeasures({...profile})}/>}
    {!editing&&!editingMeasures&&<Button title="Ajuster les objectifs à la main" onPress={openEditor} secondary/>}
    {editingMeasures&&<View style={S.editBlock}>
      <Field label="Prénom" value={String(measures.name||"")} onChange={v=>setMeasures({...measures,name:v})}/>
      <Field label="Âge" value={String(measures.age||"")} onChange={v=>setMeasures({...measures,age:v})} keyboardType="numeric"/>
      <Field label="Taille (cm)" value={String(measures.heightCm||"")} onChange={v=>setMeasures({...measures,heightCm:v})} keyboardType="numeric"/>
      <Field label="Poids de référence (kg)" value={String(measures.weight||"")} onChange={v=>setMeasures({...measures,weight:v})} keyboardType="decimal-pad"/>
      <Text style={S.swapTitle}>SEXE BIOLOGIQUE</Text>
      <View style={S.toggle}>{SEXES.map(o=><Pill key={o.id} active={measures.sex===o.id} onPress={()=>setMeasures({...measures,sex:o.id})}>{o.label}</Pill>)}</View>
      <Text style={S.swapTitle}>ACTIVITÉ HORS MUSCULATION</Text>
      <View style={{gap:SP.sm}}>{ACTIVITY_LEVELS.map(o=><Pressable key={o.id} onPress={()=>setMeasures({...measures,activity:o.id})} style={({pressed})=>[S.choice,measures.activity===o.id&&S.choiceActive,pressed&&S.buttonPressed]}>
        <View style={{flex:1}}><Text style={S.choiceTitle}>{o.label}</Text><Text style={S.muted}>{o.hint}</Text></View>
        <View style={[S.radio,measures.activity===o.id&&S.radioOn]}/>
      </Pressable>)}</View>
      <Text style={S.swapTitle}>OBJECTIF</Text>
      <View style={{gap:SP.sm}}>{GOALS.map(o=><Pressable key={o.id} onPress={()=>setMeasures({...measures,goal:o.id})} style={({pressed})=>[S.choice,measures.goal===o.id&&S.choiceActive,pressed&&S.buttonPressed]}>
        <View style={{flex:1}}><Text style={S.choiceTitle}>{o.label}</Text><Text style={S.muted}>{o.adjust>0?"Surplus contrôlé":o.adjust<0?"Déficit modéré":"Calories de maintenance"}</Text></View>
        <View style={[S.radio,measures.goal===o.id&&S.radioOn]}/>
      </Pressable>)}</View>
      {computed&&computed.bmr>0&&<Text style={S.reason}>Ces mesures donnent {computed.calories} kcal et {computed.protein} g de protéines par jour.</Text>}
      <Button title="Recalculer mes objectifs" onPress={async()=>{const c=await saveProfile(measures);setMeasures(null);Alert.alert("Mesures enregistrées",`Nouveaux objectifs : ${c.calories} kcal et ${c.protein} g de protéines.`)}}/>
      <Button title="Annuler" onPress={()=>setMeasures(null)} secondary/>
    </View>}
    {editing&&<View style={S.editBlock}>
      <Text style={S.muted}>Ces valeurs remplacent le calcul automatique jusqu'à ta prochaine mise à jour de mesures.</Text>
      <Field label="Calories par jour" value={field("calories")} onChange={v=>setDraft({...draft,calories:v})} keyboardType="numeric"/>
      <Field label="Protéines par jour (g)" value={field("protein")} onChange={v=>setDraft({...draft,protein:v})} keyboardType="numeric"/>
      <Field label="Lipides par jour (g)" value={field("fat")} onChange={v=>setDraft({...draft,fat:v})} keyboardType="numeric"/>
      <Field label="Pas par jour" value={field("steps")} onChange={v=>setDraft({...draft,steps:v})} keyboardType="numeric"/>
      <Field label="Sommeil visé (minutes)" value={field("sleepMin")} onChange={v=>setDraft({...draft,sleepMin:v})} keyboardType="numeric"/>
      <Button title="Enregistrer mes objectifs" onPress={saveManualTargets}/>
      <Button title="Annuler" onPress={()=>setDraft(null)} secondary/>
    </View>}
  </Card>
  {computed&&computed.bmr>0&&<Card><Text style={S.section}>🧮 D'où viennent tes objectifs</Text>
    <View style={S.recapRow}><Text style={S.recapLabel}>Métabolisme de base</Text><Text style={S.recapValue}>{computed.bmr} kcal</Text></View>
    <View style={S.recapRow}><Text style={S.recapLabel}>Maintenance estimée</Text><Text style={S.recapValue}>{computed.maintenance} kcal</Text></View>
    {computed.rationale.map((r,i)=><View key={i} style={S.priorityRow}><Text style={S.check}>·</Text><Text style={S.muted}>{r}</Text></View>)}
    {targets.calories!==computed.calories&&<Text style={S.restFoot}>Tes objectifs sont ajustés à la main ({targets.calories} kcal au lieu de {computed.calories} kcal calculées).</Text>}
  </Card>}
  <Card><View style={S.cardHead}><Text style={S.section}>🔋 Récupération actuelle</Text><Text style={S.ai}>{recovery}/100</Text></View><Progress value={recovery} target={100}/><Text style={S.muted}>Calculée à partir du sommeil, de la nutrition, de l'hydratation et des séances.</Text></Card>
  <Card><View style={S.switchLine}><View><Text style={S.section}>🔔 Notifications intelligentes</Text><Text style={S.muted}>Repas • entraînement • sommeil</Text></View><Switch value={notifications} onValueChange={scheduleNotifications} trackColor={{false:P.surfaceHigh,true:P.limeDeep}} thumbColor={notifications?P.lime:P.inkMuted} ios_backgroundColor={P.surfaceHigh}/></View></Card>
  <Card><View style={S.cardHead}><Text style={S.section}>❤️ Apple Santé</Text><Text style={S.ai}>{FEATURES.healthKit?"ACTIF":"HORS LIGNE"}</Text></View><Text style={S.text}>Pas • sommeil • poids • énergie active</Text><Text style={S.muted}>{FEATURES.healthKit?"Les données confirmées par HealthKit sont prioritaires sur les estimations.":"HealthKit s'active dans une development build iOS. En attendant, saisis tes pas et ton sommeil à la main : rien n'est inventé."}</Text></Card>
  <Card><Text style={S.section}>🔐 Confidentialité</Text><Text style={S.muted}>La clé IA reste sur le serveur. L'application ne doit jamais embarquer OPENROUTER_API_KEY.</Text></Card>
</ScrollView>}

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
  const [coachStatus,setCoachStatus]=useState({state:"checking"}),[coachSource,setCoachSource]=useState(null);
  const [weekly,setWeekly]=useState({score:0,weightChange:0,avgCalories:0,avgProtein:0});
  const [foodDraft,setFoodDraft]=useState({name:"",calories:"",protein:"",carbs:"",fat:""});
  const [groceryList,setGroceryList]=useState(null),[groceryChecked,setGroceryChecked]=useState([]),[exerciseOverrides,setExerciseOverrides]=useState({});
  const [journal,setJournal]=useState([]),[ready,setReady]=useState(false);
  const [profile,setProfile]=useState(MY_PROFILE);
  const journalRef=useRef([]);

  useEffect(()=>{(async()=>{
    await migrateLegacyKeys();
    const all=await store.get(KEYS.logs,[]);
    setLogs((Array.isArray(all)?all:[]).filter(x=>x.date===iso()));
    const savedWeights=await store.get(KEYS.weights,[]);setWeights(Array.isArray(savedWeights)?savedWeights:[]);
    const t=await store.get(KEYS.targets,null);if(t&&typeof t==="object")setTargets({...BASE,...t});
    const savedProfile=await store.get(KEYS.profile,null);
    if(savedProfile&&typeof savedProfile==="object") setProfile({...MY_PROFILE,...savedProfile});
    else if(!t) await saveProfile(MY_PROFILE); // premier lancement : objectifs calculés d'office
    const w=await store.get(KEYS.weekly,null);if(w&&typeof w==="object")setWeekly(w);
    const wd=await store.get(KEYS.workoutLogs,{});setWorkoutLogs(wd&&typeof wd==="object"?wd:{});
    const th=await store.get(KEYS.trainingHistory,[]);setTrainingHistory(Array.isArray(th)?th:[]);
    const tw=Number(await store.get(KEYS.trainingWeek,1));setTrainingWeek(Number.isInteger(tw)&&tw>0?tw:1);
    const eo=await store.get(KEYS.exerciseOverrides,{});setExerciseOverrides(eo&&typeof eo==="object"?eo:{});
    // La liste de courses doit survivre au rechargement : sinon elle est inutilisable en magasin.
    const savedGroceries=await store.get(KEYS.groceries,null);
    if(savedGroceries&&typeof savedGroceries==="object"){
      if(savedGroceries.list)setGroceryList(savedGroceries.list);
      if(Array.isArray(savedGroceries.checked))setGroceryChecked(savedGroceries.checked);
      if(savedGroceries.budget)setBudget(String(savedGroceries.budget));
    }

    // Journal quotidien : c'est lui qui rend le sommeil, l'eau et le poids persistants.
    const saved=await store.get(KEYS.journal,[]);
    let book=Array.isArray(saved)?saved:[];
    // Reprise des anciennes clés water:<date> / sleep:<date> qui n'étaient jamais relues.
    for(const legacyDate of new Set((Array.isArray(all)?all:[]).map(x=>x.date).concat([iso()]))){
      const legacyWater=await store.get("water:"+legacyDate,null);
      const legacySleep=await store.get("sleep:"+legacyDate,null);
      if(legacyWater!==null) book=upsertDay(book,{date:legacyDate,water:Number(legacyWater)||0});
      if(legacySleep&&typeof legacySleep==="object") book=upsertDay(book,{date:legacyDate,sleepMin:legacySleep.duration,sleepQuality:legacySleep.quality});
    }
    for(const entry of (Array.isArray(savedWeights)?savedWeights:[])) book=upsertDay(book,{date:entry.date,weight:entry.weight});
    commitJournal(book);

    const today=book.find(d=>d.date===iso());
    if(today){
      setWater(Number(today.water)||0);
      if(Number.isFinite(Number(today.sleepMin))) setHealth(h=>({...h,sleepMin:Number(today.sleepMin)}));
      if(Number.isFinite(Number(today.sleepQuality))) setQuality(String(today.sleepQuality));
      if(Number.isFinite(Number(today.weight))) setWeight(String(today.weight));
      if(Number(today.steps)>0) setSteps(String(today.steps));
    }
    setReady(true);
  })()},[]);

  // Diagnostic de configuration : sans ça, un repli local silencieux passe
  // pour une réponse du coach IA.
  useEffect(()=>{(async()=>{
    const endpoint=AI_BASE_URL||((typeof window!=="undefined"&&window.location?.origin)?window.location.origin+"/api":"");
    if(!endpoint){setCoachStatus({state:"offline"});return}
    try{
      const r=await fetch(endpoint+"/health");
      if(!r.ok)throw new Error("HTTP_"+r.status);
      const d=await r.json();
      setCoachStatus({state:d?.coach?.status==="READY"?"ready":"misconfigured",detail:d?.coach?.hint,model:d?.model});
    }catch(e){setCoachStatus({state:"offline"})}
  })()},[]);

  /**
   * Point d'entrée unique pour écrire dans le journal : mémorise ET persiste.
   * La ref évite de perdre une écriture quand deux actions se suivent dans le même rendu.
   */
  function commitJournal(next){journalRef.current=next;setJournal(next);return store.set(KEYS.journal,next);}
  async function recordToday(patch){return commitJournal(upsertDay(journalRef.current,{date:iso(),...patch}));}

  const total=useMemo(()=>logs.reduce((a,x)=>({calories:a.calories+Number(x.calories||0),protein:a.protein+Number(x.protein||0),carbs:a.carbs+Number(x.carbs||0),fat:a.fat+Number(x.fat||0)}),{calories:0,protein:0,carbs:0,fat:0}),[logs]);
  const phase=phaseFor(),dynamicCarbs=carbs(targets.calories,targets.protein,targets.fat);
  const currentWeight=(health.weight ?? Number(weight)) || 55, stepValue=(health.steps ?? Number(steps)) || 0;
  const remaining=Math.max(0,Math.round(targets.calories-total.calories)), pRemain=Math.max(0,Math.round(targets.protein-total.protein));
  function todayWorkout(){return dayByKey(dayKeyForDate())}
  const progressionContext={sleepMin:health.sleepMin,fatigue:hardDay?5:2,proteinRatio:targets.protein?total.protein/targets.protein:0,calorieRatio:targets.calories?total.calories/targets.calories:0,hydrationRatio:waterTarget?water/waterTarget:0,jjbSessions:jjb?1:0,cardioSessions:jjb?1:0};

  async function addLog(x){
    const all=await store.get(KEYS.logs,[]);
    const n=[...(Array.isArray(all)?all:[]),{...x,date:iso(),createdAt:Date.now()}];
    await store.set(KEYS.logs,n);
    const todayLogs=n.filter(a=>a.date===iso());setLogs(todayLogs);
    const sum=todayLogs.reduce((a,m)=>({calories:a.calories+Number(m.calories||0),protein:a.protein+Number(m.protein||0),carbs:a.carbs+Number(m.carbs||0),fat:a.fat+Number(m.fat||0)}),{calories:0,protein:0,carbs:0,fat:0});
    await recordToday(sum);
  }
  async function saveWeight(){
    const v=Number(weight);if(!v)return;
    const n=[...weights.filter(w=>w.date!==iso()),{date:iso(),weight:v}].sort((a,b)=>a.date.localeCompare(b.date));
    setWeights(n);setHealth(h=>({...h,weight:v}));
    await store.set(KEYS.weights,n);
    await recordToday({weight:v});
  }
  function sleepMin(){const[a,b]=sleep.split(":").map(Number),[c,d]=wake.split(":").map(Number);let n=c*60+d-(a*60+b);if(n<=0)n+=1440;return n}
  async function saveSleep(){
    const n=sleepMin();setHealth(h=>({...h,sleepMin:n}));
    // Écrit dans le journal : c'est ce qui rend la dette de sommeil et la récupération calculables.
    await recordToday({sleepMin:n,sleepQuality:Number(quality)||null});
    Alert.alert("Sommeil",`${Math.floor(n/60)}h${String(n%60).padStart(2,"0")} • ${quality}/5 enregistré`);
  }
  async function photoMeal(){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)return Alert.alert("Caméra","Autorise la caméra dans Réglages.");const r=await ImagePicker.launchCameraAsync({mediaTypes:["images"],quality:.8});if(!r.canceled)setPhoto(r.assets[0].uri)}
  async function scheduleNotifications(v){setNotifications(v);await Notifications.requestPermissionsAsync();await Notifications.cancelAllScheduledNotificationsAsync();if(!v)return;for(const [h,m,t,b] of [[8,0,"🌅 YProgress","Petit-déjeuner + protéines"],[13,0,"🍽️ YProgress","Enregistre ton déjeuner"],[16,30,"🥛 YProgress","Vérifie tes protéines"],[19,0,"🏋️ YProgress","Prépare ton entraînement"],[22,30,"😴 YProgress","Protège ton sommeil"]])await Notifications.scheduleNotificationAsync({content:{title:t,body:b},trigger:{hour:h,minute:m,repeats:true}})}
  /** Ce que l'app sait déjà : le coach doit le recevoir, sinon il ne peut rien justifier. */
  function buildCoachPayload(){
    const day=dayByKey(dayKeyForDate()),workout=WORKOUTS[day.name];
    const planned=(workout.type==="STRENGTH"?workout.exercises:[]).map(ex=>{
      const shown=exerciseOverrides[ex.id]||ex;
      const hist=historyForExercise(trainingHistory,shown.id);
      const rec=recommendNextLoad({exercise:shown,history:hist,context:progressionContext});
      const last=hist.length?hist[hist.length-1]:null;
      return {name:shown.name,sets:shown.sets,reps:`${shown.minReps}-${shown.maxReps}`,
        recommendedLoad:rec.recommendedLoad,lastLoad:last?last.actualLoad:null,
        action:rec.action,reason:rec.reasons&&rec.reasons[0]};
    });
    return {
      profile:{weight:currentWeight,age:profile?.age,heightCm:profile?.heightCm,sex:profile?.sex,
        goal:profile?.goal,targets,phase:phase.key,maintenance:profile?maintenanceCalories(profile):null},
      today:{date:iso(),total,steps:stepValue,sleepMin:health.sleepMin,gym,jjb,water,waterTarget},
      week:weeklySummary(journalRef.current,targets,7),
      plateau,
      recovery,
      planned,
      recentWorkouts:trainingHistory.slice(-30),
      coachContext:{autopilot,hardDay,caffeine,restaurantMode,dayStreak}
    };
  }

  function localCoachAdvice(){
    if(health.sleepMin!==null&&health.sleepMin<390) return "😴 Récupération prioritaire : sommeil insuffisant. Fais une séance plus légère et évite le cardio supplémentaire.";
    if(jjb&&remaining>500) return `🥋 JJB ce soir : il te manque ${remaining} kcal. Ajoute glucides + protéines avant le cours.`;
    if(pRemain>25) return `🥩 Il te manque ${pRemain} g de protéines. Priorité à une vraie source protéinée.`;
    if(remaining>400) return `🍚 Il te reste ${remaining} kcal. Ne termine pas la journée trop bas.`;
    return "✅ Très bonne journée. Continue sans chercher la perfection.";
  }

  async function analyze(){
    setCoachLoading(true);
    const endpoint=AI_BASE_URL||((typeof window!=="undefined"&&window.location?.origin)?window.location.origin+"/api":"");
    if(endpoint)try{
      const r=await fetch(endpoint+"/coach",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(buildCoachPayload())});
      const d=await r.json().catch(()=>({}));
      if(r.status===429){setCoach(`⏳ ${d.message||"Trop de demandes coup sur coup."} (réessaie dans ${d.retryAfter||60} s)`);setCoachSource("rate_limited");setCoachLoading(false);return}
      if(r.ok&&(d.message||d.coach)){setCoach(d.message||d.coach);setCoachSource("ai");setCoachLoading(false);return}
      setCoachSource(d?.error==="COACH_UNAVAILABLE"?"provider_down":"error");
    }catch(e){setCoachSource("offline")}
    setCoach(localCoachAdvice());
    setCoachLoading(false);
  }
  async function weeklyAnalysis(){
    // Vraie moyenne sur les 7 dernières journées enregistrées, plus les totaux du jour seuls.
    const summary=weeklySummary(journalRef.current,targets,7);
    setWeekly(summary);
    await store.set(KEYS.weekly,summary);
    Alert.alert("Bilan hebdomadaire",summary.sampleDays?`Score de régularité : ${summary.score}/100\nCalculé sur ${summary.sampleDays} jour(s) enregistré(s).`:"Pas encore assez de données : enregistre tes repas, ton sommeil et ton poids pendant quelques jours.");
  }

  // Le moteur vit dans src/core/autopilot.js : App.js ne réimplémente plus la logique.
  const autopilotSnapshot=useMemo(()=>buildAutopilotSnapshot({
    targets,total,phase:phase.key,
    health:{sleepMin:health.sleepMin,steps:stepValue},
    training:{gym,jjb}
  }),[targets,total,phase.key,health.sleepMin,stepValue,gym,jjb]);

  const autopilotActions=useMemo(()=>{
    const icons={recovery:"😴",nutrition:"🥩",movement:"🚶",fuel:"⚡",maintain:"✅"};
    const actions=autopilotSnapshot.actions.map(a=>`${a.text.includes("kcal")?"🍚":icons[a.type]||"•"} ${a.text}`);
    if(water<waterTarget*.65&&actions.length<3) actions.push(`💧 Hydratation : ${Math.max(0,waterTarget-water)} ml restants.`);
    return actions.slice(0,3);
  },[autopilotSnapshot,water,waterTarget]);

  // Plateau réel : detectPlateau() était testé mais jamais appelé.
  const plateau=useMemo(()=>detectPlateau(weightSeries(journal),"lean_gain"),[journal]);
  const recovery=useMemo(()=>recoveryScore({
    sleepMin:health.sleepMin,fatigue:hardDay?5:2,
    proteinRatio:targets.protein?total.protein/targets.protein:0,
    calorieRatio:targets.calories?total.calories/targets.calories:0,
    hydrationRatio:waterTarget?water/waterTarget:0,
    jjbSessions:jjb?1:0,cardioSessions:jjb?1:0
  }),[health.sleepMin,hardDay,total,targets,water,waterTarget,jjb]);
  const sleepStatus=useMemo(()=>sleepAutoDetection.inferWindow({lastActivityAt:sleep,plannedWake:wake,healthKitSleep:null}),[sleep,wake]);
  const sleepAdvice=useMemo(()=>{
    const now=new Date();
    const [wh,wm]=wake.split(":").map(Number);
    const nights=lastNDays(journal,7).filter(hasSleep).map(d=>Number(d.sleepMin));
    const avg=nights.length?Math.round(nights.reduce((a,b)=>a+b,0)/nights.length):450;
    return buildSleepRecommendation({nowMinutes:now.getHours()*60+now.getMinutes(),wakeMinutes:(wh||7)*60+(wm||30),avgSleepMin:avg,sleepDebtMin:sleepDebt(journal,targets.sleepMin||450,7)});
  },[journal,wake,targets.sleepMin]);
  const dayStreak=useMemo(()=>streak(journal,iso()),[journal]);

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
    await recordToday({water:n});
  }
  async function setStepCount(value){
    const n=Math.max(0,Math.round(Number(value)||0));
    setSteps(String(value));
    await recordToday({steps:n});
  }
  function addWater(amount){setWaterAmount(water+amount)}

  async function saveTrainingSet(exercise,setIndex,field,value){
    const draftKey=`${trainingWeek}:${exercise.id}`,draft=workoutLogs[draftKey]||{sets:[]},sets=[...(draft.sets||[])];
    sets[setIndex]={...(sets[setIndex]||{}),[field]:value};
    const next={...workoutLogs,[draftKey]:{...draft,exerciseId:exercise.id,week:trainingWeek,sets}};
    setWorkoutLogs(next);await store.set(KEYS.workoutLogs,next);
  }
  async function completeExercise(exercise,recommendation){
    const draft=workoutLogs[`${trainingWeek}:${exercise.id}`];
    if(!draft||draft.sets.length<exercise.sets||draft.sets.some(set=>!set?.load||!set?.reps))return Alert.alert("Performance incomplète","Renseigne la charge et les répétitions de chaque série.");
    const sets=draft.sets.map(set=>({load:Number(set.load),reps:Number(set.reps),rir:set.rir===""||set.rir==null?null:Number(set.rir)}));
    const performance={exerciseId:exercise.id,exerciseName:exercise.name,week:trainingWeek,plannedLoad:recommendation.recommendedLoad,actualLoad:sets[0].load,sets,completed:true,createdAt:new Date().toISOString()};
    const next=appendPerformance(trainingHistory,performance);setTrainingHistory(next);await store.set(KEYS.trainingHistory,next);
    await recordToday({gym:true});
    Alert.alert("Performance enregistrée",`Semaine ${trainingWeek} sauvegardée pour ${exercise.name}.`);
  }
  async function changeTrainingWeek(week){const value=Math.max(1,Math.round(Number(week)||1));setTrainingWeek(value);await store.set(KEYS.trainingWeek,value);}
  async function replaceExercise(slotId,exercise){const next={...exerciseOverrides};if(exercise)next[slotId]=exercise;else delete next[slotId];setExerciseOverrides(next);await store.set(KEYS.exerciseOverrides,next);}
  /** Enregistre le profil et en dérive les objectifs journaliers. */
  async function saveProfile(next){
    const clean={
      name:String(next.name||"").trim().slice(0,40),
      sex:SEXES.some(o=>o.id===next.sex)?next.sex:"unspecified",
      age:clamp(Math.round(Number(next.age)||0),14,99),
      heightCm:clamp(Math.round(Number(next.heightCm)||0),120,230),
      weight:clamp(Number(next.weight)||0,30,250),
      activity:ACTIVITY_LEVELS.some(o=>o.id===next.activity)?next.activity:"moderate",
      goal:GOALS.some(o=>o.id===next.goal)?next.goal:"lean_gain",
      sleepMin:clamp(Math.round(Number(next.sleepMin)||450),300,660)
    };
    setProfile(clean);
    await store.set(KEYS.profile,clean);
    const computed=computeTargets(clean);
    const derived={calories:computed.calories,protein:computed.protein,fat:computed.fat,steps:computed.steps,sleepMin:computed.sleepMin};
    setTargets(derived);
    await store.set(KEYS.targets,derived);
    if(clean.weight>0) setWeight(String(clean.weight));
    return computed;
  }

  async function saveTargets(patch){
    const next={...targets,...patch};
    const clean={
      calories:clamp(Math.round(Number(next.calories)||BASE.calories),1200,6000),
      protein:clamp(Math.round(Number(next.protein)||BASE.protein),40,300),
      fat:clamp(Math.round(Number(next.fat)||BASE.fat),30,200),
      steps:clamp(Math.round(Number(next.steps)||BASE.steps),2000,40000),
      sleepMin:clamp(Math.round(Number(next.sleepMin)||BASE.sleepMin),300,660)
    };
    setTargets(clean);
    await store.set(KEYS.targets,clean);
  }

  async function persistGroceries(list,checked,budgetValue){
    await store.set(KEYS.groceries,{list,checked,budget:budgetValue,updatedAt:Date.now()});
  }
  async function generateGroceries(){
    const list=buildGroceryList({budget,weeklyCalories:targets.calories*7,weeklyProtein:targets.protein*7});
    setGroceryList(list);setGroceryChecked([]);
    await persistGroceries(list,[],budget);
  }
  async function toggleGrocery(id){
    const next=toggleGroceryItem(groceryChecked,id);
    setGroceryChecked(next);
    await persistGroceries(groceryList,next,budget);
  }
  async function clearGroceries(){
    setGroceryList(null);setGroceryChecked([]);
    await store.remove(KEYS.groceries);
  }
  async function changeBudget(value){
    setBudget(value);
    if(groceryList)await persistGroceries(groceryList,groceryChecked,value);
  }

  // Les écrans sont des composants de module : identité stable entre deux rendus,
  // donc plus de remontage ni de perte de scroll, et seul l'écran actif est construit.
  const app={phase,remaining,total,targets,stepValue,coach,coachLoading,analyze,autopilotActions,generateWeek,setTab,health,quality,jjb,gym,todayWorkout,water,waterTarget,setWaterAmount,addWater,caffeine,setCaffeine,recovery,dayStreak,
    foodDraft,setFoodDraft,restaurantChoice,photoMeal,photo,setPhoto,restaurantMode,pRemain,budget,changeBudget,generateGroceries,groceryList,groceryChecked,toggleGrocery,clearGroceries,dynamicCarbs,addLog,
    currentWeight,weight,setWeight,saveWeight,sleep,setSleep,wake,setWake,setQuality,saveSleep,weekly,weeklyAnalysis,plateau,sleepAdvice,journal,
    notifications,scheduleNotifications,saveTargets,setStepCount,ready,
    profile,saveProfile,coachStatus,coachSource};
  const pages={
    home:<Home app={app}/>,
    nutrition:<Nutrition app={app}/>,
    program:<ProgramPage selectedDayKey={selectedDayKey} setSelectedDayKey={setSelectedDayKey} week={trainingWeek} setWeek={changeTrainingWeek} drafts={workoutLogs} onSaveSet={saveTrainingSet} history={trainingHistory} onComplete={completeExercise} hardDay={hardDay} onEmergency={emergencyDay} progressionContext={progressionContext} exerciseOverrides={exerciseOverrides} onReplaceExercise={replaceExercise}/>,
    progress:<ProgressPage app={app}/>,
    profile:<Profile app={app}/>
  };
  return <SafeAreaView style={S.safe}><StatusBar style="light"/>{pages[tab]}<View style={S.navWrap} pointerEvents="box-none"><View style={S.bottom}>{[["home","🏠","Accueil"],["nutrition","🍽️","Nutrition"],["program","🏋️","Programme"],["progress","📈","Progrès"],["profile","⚙️","Profil"]].map(([id,ic,l])=><Pressable accessibilityRole="tab" accessibilityState={{selected:tab===id}} key={id} onPress={()=>setTab(id)} style={({pressed})=>[S.nav,tab===id&&S.navActive,pressed&&S.buttonPressed]}><Text style={[S.navIcon,tab===id&&S.navIconActive]}>{ic}</Text><Text style={[S.navText,tab===id&&S.navTextActive]} numberOfLines={1}>{l}</Text></Pressable>)}</View></View></SafeAreaView>
}

const S=StyleSheet.create({
  // ---------- Charpente ----------
  safe:{flex:1,backgroundColor:P.bg},
  pageScroll:{flex:1},
  content:{width:"100%",maxWidth:LAYOUT.maxContentWidth,alignSelf:"center",paddingHorizontal:SP.lg,paddingTop:SP.lg,paddingBottom:LAYOUT.navHeight+SP.xxxl},

  // ---------- En-tête ----------
  header:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:SP.md,marginBottom:SP.lg},
  eyebrow:{...T.eyebrow,color:P.lime,marginBottom:SP.xs},
  title:{...T.title,color:P.ink,marginBottom:SP.xs},
  avatar:{width:46,height:46,borderRadius:RD.md,backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep,alignItems:"center",justifyContent:"center"},
  avatarText:{fontFamily:F.cond,fontSize:22,fontWeight:"700",color:P.lime},

  // ---------- Bandeau de phase ----------
  phase:{flexDirection:"row",alignItems:"center",gap:SP.md,backgroundColor:P.surface,borderWidth:1,borderColor:P.line,borderRadius:RD.lg,padding:SP.md,marginBottom:SP.lg},
  phaseIcon:{fontSize:24},
  phaseTitle:{...T.section,color:P.ink},
  phaseSub:{...T.muted,color:P.inkMuted},
  arrow:{fontSize:24,color:P.inkFaint},
  streakBadge:{alignItems:"center",justifyContent:"center",minWidth:52,paddingHorizontal:SP.sm,paddingVertical:SP.xs+2,borderRadius:RD.md,backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep},
  streakValue:{fontFamily:F.cond,fontSize:20,fontWeight:"700",color:P.lime,lineHeight:22},
  streakLabel:{...T.label,fontSize:8,color:P.limeDeep},

  // ---------- Cartes ----------
  card:{backgroundColor:P.surface,borderWidth:1,borderColor:P.line,borderRadius:RD.xl,padding:SP.lg,marginBottom:SP.md,...SH.card},
  cardHead:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:SP.sm,marginBottom:SP.sm},
  section:{...T.section,color:P.ink,flexShrink:1},
  text:{...T.body,color:P.ink},
  muted:{...T.muted,color:P.inkMuted},
  coach:{...T.body,fontSize:15,lineHeight:23,color:P.ink,marginBottom:SP.sm},
  reason:{...T.muted,color:P.inkMuted,marginTop:SP.sm},
  ai:{...T.label,color:P.lime,backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep,paddingHorizontal:SP.sm,paddingVertical:3,borderRadius:RD.pill,overflow:"hidden"},
  alertCard:{borderColor:P.clay,backgroundColor:P.clayDark},
  aiWarn:{color:P.amber,backgroundColor:P.amberDark,borderColor:P.amber},

  // ---------- Hero « reste à manger » ----------
  hero:{flexDirection:"row",alignItems:"center",justifyContent:"space-between",gap:SP.md,borderColor:P.lineStrong,backgroundColor:P.surfaceRaised,overflow:"hidden"},
  heroNum:{...T.dataXl,color:P.lime,lineHeight:58},
  glow:{width:64,height:64,borderRadius:RD.lg,alignItems:"center",justifyContent:"center",backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep},

  // ---------- Indicateurs ----------
  metrics:{flexDirection:"row",flexWrap:"wrap",gap:SP.sm,marginBottom:SP.md},
  metric:{flexGrow:1,flexBasis:0,minWidth:84,backgroundColor:P.surface,borderWidth:1,borderColor:P.line,borderRadius:RD.lg,paddingHorizontal:SP.sm,paddingVertical:SP.md,gap:2},
  metricValue:{fontFamily:F.cond,fontSize:26,fontWeight:"700",color:P.ink,lineHeight:30},
  metricTarget:{...T.muted,fontSize:11,color:P.inkFaint},
  metricLabel:{...T.label,fontSize:9,letterSpacing:.4,color:P.inkMuted,marginBottom:SP.xs},
  track:{height:5,borderRadius:RD.pill,backgroundColor:P.surfaceHigh,overflow:"hidden",marginTop:SP.xs},
  fill:{height:"100%",borderRadius:RD.pill,backgroundColor:P.lime},

  // ---------- Boutons ----------
  button:{minHeight:LAYOUT.tapTarget,borderRadius:RD.lg,overflow:"hidden",marginTop:SP.md,borderWidth:1,borderColor:GL.edgeStrong,...SH.limeGlow},
  buttonInner:{minHeight:LAYOUT.tapTarget,alignItems:"center",justifyContent:"center",paddingHorizontal:SP.lg,paddingVertical:SP.md},
  buttonSheen:{position:"absolute",left:0,right:0,top:0,height:"56%"},
  buttonText:{...T.button,color:P.inkInverse,textAlign:"center"},
  button2:{backgroundColor:P.surfaceRaised,borderColor:P.lineStrong,...SH.none},
  buttonText2:{...T.button,color:P.ink,textAlign:"center"},
  buttonPressed:{transform:[{scale:.975}],opacity:.92},
  quickRow:{flexDirection:"row",flexWrap:"wrap",gap:SP.sm,alignItems:"stretch"},

  // ---------- Autopilot ----------
  autopilot:{borderColor:P.lineStrong,backgroundColor:P.surfaceRaised},
  actionRow:{flexDirection:"row",gap:SP.md,alignItems:"flex-start",paddingVertical:SP.sm,borderTopWidth:1,borderTopColor:P.line},
  actionNum:{fontFamily:F.cond,fontSize:16,fontWeight:"700",color:P.lime,minWidth:18},

  // ---------- Séance du jour ----------
  workout:{borderColor:P.lineStrong},
  workoutTitle:{fontFamily:F.cond,fontSize:24,fontWeight:"700",color:P.ink,lineHeight:28},

  // ---------- Frise ----------
  timeline:{flexDirection:"row",flexWrap:"wrap",gap:SP.xs,marginBottom:SP.md},
  timelineItem:{paddingHorizontal:SP.md,paddingVertical:SP.sm,borderRadius:RD.pill,backgroundColor:P.surface,borderWidth:1,borderColor:P.line},
  timelineActive:{backgroundColor:P.limeDark,borderColor:P.limeDeep},
  timelineText:{...T.label,fontSize:9,color:P.inkMuted},

  // ---------- Formulaires ----------
  label:{...T.label,color:P.inkMuted,marginBottom:SP.xs},
  input:{minHeight:LAYOUT.tapTarget,backgroundColor:P.void,borderWidth:1,borderColor:P.lineStrong,borderRadius:RD.md,color:P.ink,paddingHorizontal:SP.md,paddingVertical:SP.md,fontFamily:F.sans,fontSize:15},
  toggle:{flexDirection:"row",flexWrap:"wrap",gap:SP.sm,marginVertical:SP.md},
  pill:{minHeight:38,justifyContent:"center",backgroundColor:P.surfaceHigh,borderWidth:1,borderColor:P.line,paddingHorizontal:SP.md,paddingVertical:SP.sm,borderRadius:RD.pill},
  pillActive:{backgroundColor:P.limeDark,borderColor:P.lime},
  pillText:{...T.label,fontSize:11,letterSpacing:.4,textTransform:"none",color:P.ink},
  switchLine:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:SP.md},
  option:{paddingVertical:SP.md,borderBottomWidth:1,borderBottomColor:P.line},
  editBlock:{marginTop:SP.lg,paddingTop:SP.md,borderTopWidth:1,borderTopColor:P.line},

  // ---------- Programme ----------
  programHeader:{flexDirection:"row",alignItems:"flex-start",justifyContent:"space-between",gap:SP.md},
  weekBadge:{alignItems:"center",justifyContent:"center",minWidth:64,paddingHorizontal:SP.md,paddingVertical:SP.sm,borderRadius:RD.md,backgroundColor:P.surfaceRaised,borderWidth:1,borderColor:P.lineStrong},
  weekBadgeLabel:{...T.label,fontSize:8,color:P.inkFaint},
  weekBadgeValue:{fontFamily:F.cond,fontSize:22,fontWeight:"700",color:P.ink,lineHeight:24},
  // paddingRight : garantit que DIM reste atteignable au bout du défilement.
  dayScroller:{gap:SP.sm,paddingVertical:SP.lg,paddingRight:SP.xxl,paddingLeft:2},
  dayCard:{width:60,minHeight:LAYOUT.tapTarget+30,paddingVertical:SP.md,borderRadius:RD.lg,backgroundColor:P.surface,borderWidth:1,borderColor:P.line,alignItems:"center",justifyContent:"center",gap:SP.xs},
  dayCardActive:{backgroundColor:P.limeDark,borderColor:P.lime,...SH.limeGlow},
  dayLabel:{...T.label,fontSize:10,color:P.inkMuted},
  dayLabelActive:{color:P.lime},
  dayEmoji:{fontSize:18},
  dayDot:{width:5,height:5,borderRadius:RD.pill,backgroundColor:P.lineStrong},
  dayDotActive:{width:18,backgroundColor:P.lime},

  workoutHero:{borderRadius:RD.xl,padding:SP.lg,flexDirection:"row",alignItems:"center",gap:SP.md,marginBottom:SP.md,borderWidth:1,borderColor:P.lineStrong,...SH.card},
  heroIcon:{width:54,height:54,borderRadius:RD.md,backgroundColor:GL.shade,borderWidth:1,borderColor:GL.edge,alignItems:"center",justifyContent:"center"},
  workoutType:{...T.label,fontSize:9,color:P.lime},
  heroSubtitle:{...T.muted,color:P.inkMuted},

  // ---------- Exercices ----------
  exerciseCard:{backgroundColor:P.surface,borderColor:P.line},
  exerciseTop:{flexDirection:"row",alignItems:"flex-start",gap:SP.md},
  exerciseNumber:{width:34,height:34,borderRadius:RD.sm,backgroundColor:P.surfaceHigh,borderWidth:1,borderColor:P.lineStrong,alignItems:"center",justifyContent:"center"},
  exerciseNumberText:{fontFamily:F.cond,fontSize:15,fontWeight:"700",color:P.lime},
  exerciseName:{...T.section,fontSize:16,color:P.ink,marginBottom:2},
  videoButton:{minHeight:38,justifyContent:"center",paddingHorizontal:SP.md,paddingVertical:SP.sm,borderRadius:RD.md,backgroundColor:P.tealDark,borderWidth:1,borderColor:P.teal},
  videoButtonText:{...T.label,fontSize:10,letterSpacing:.6,textTransform:"none",color:P.teal},
  noVideo:{...T.muted,fontSize:9,color:P.inkFaint,maxWidth:64,textAlign:"center"},
  changeButton:{alignSelf:"flex-start",minHeight:36,justifyContent:"center",marginTop:SP.md,paddingHorizontal:SP.md,paddingVertical:SP.sm,borderRadius:RD.md,backgroundColor:P.surfaceHigh,borderWidth:1,borderColor:P.lineStrong},
  changeButtonText:{...T.label,fontSize:10,letterSpacing:.4,textTransform:"none",color:P.inkMuted},

  prescriptionRow:{flexDirection:"row",flexWrap:"wrap",justifyContent:"space-between",alignItems:"center",gap:SP.sm,marginTop:SP.lg},
  prescription:{fontFamily:F.cond,fontSize:22,fontWeight:"700",color:P.ink},
  loadChip:{backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep,borderRadius:RD.md,paddingHorizontal:SP.md,paddingVertical:SP.sm,alignItems:"flex-end"},
  loadChipLabel:{...T.label,fontSize:8,color:P.limeDeep},
  loadChipValue:{fontFamily:F.cond,fontSize:20,fontWeight:"700",color:P.lime,lineHeight:22},
  rest:{...T.muted,color:P.inkMuted,marginTop:SP.md},
  setHead:{flexDirection:"row",gap:SP.sm,marginTop:SP.lg,alignItems:"center"},
  setHeadCell:{...T.label,fontSize:9,color:P.inkFaint,flex:1,minWidth:0,textAlign:"center"},
  setRow:{flexDirection:"row",gap:SP.sm,marginTop:SP.sm,alignItems:"center"},
  setLabel:{...T.label,fontSize:11,color:P.lime,width:24},
  setInput:{flex:1,minWidth:0,height:44,backgroundColor:P.void,borderWidth:1,borderColor:P.lineStrong,borderRadius:RD.md,color:P.ink,paddingHorizontal:SP.sm,textAlign:"center",fontFamily:F.cond,fontSize:17,fontWeight:"700"},
  setField:{flex:1,minWidth:0},
  history:{marginTop:SP.lg,paddingTop:SP.md,borderTopWidth:1,borderTopColor:P.line},
  historyTitle:{...T.label,fontSize:9,color:P.teal,marginBottom:SP.sm},
  historyItem:{...T.muted,fontFamily:F.cond,fontSize:13,color:P.inkMuted,marginTop:SP.xs},

  drillCard:{borderColor:P.amber,backgroundColor:P.amberDark},
  drillBadge:{...T.label,fontSize:9,color:P.amber,marginBottom:SP.md},
  restDay:{borderColor:P.teal,backgroundColor:P.tealDark},
  restTitle:{...T.label,fontSize:11,color:P.teal,marginBottom:SP.md},
  priorityRow:{flexDirection:"row",gap:SP.md,alignItems:"flex-start",paddingVertical:SP.sm},
  check:{color:P.teal,fontWeight:"700",fontFamily:F.sans},
  restFoot:{...T.muted,color:P.inkFaint,marginTop:SP.md},

  favoritesCard:{paddingVertical:SP.md},
  favoriteWrap:{flexDirection:"row",flexWrap:"wrap",gap:SP.sm},
  favoritePill:{backgroundColor:P.surfaceHigh,borderWidth:1,borderColor:P.lineStrong,borderRadius:RD.pill,paddingHorizontal:SP.md,paddingVertical:SP.sm},
  favoriteText:{...T.label,fontSize:10,letterSpacing:.3,textTransform:"none",color:P.ink},

  // ---------- Modales ----------
  modalBackdrop:{flex:1,backgroundColor:GL.scrim,padding:SP.lg,justifyContent:"center"},
  videoModal:{width:"100%",maxWidth:LAYOUT.maxContentWidth,alignSelf:"center",backgroundColor:P.surface,borderRadius:RD.xxl,padding:SP.lg,borderWidth:1,borderColor:P.lineStrong,...SH.lift},
  modalHead:{flexDirection:"row",alignItems:"flex-start",gap:SP.md,marginBottom:SP.md},
  closeButton:{width:LAYOUT.tapTarget,height:LAYOUT.tapTarget,borderRadius:RD.pill,backgroundColor:P.surfaceHigh,borderWidth:1,borderColor:P.lineStrong,alignItems:"center",justifyContent:"center"},
  closeText:{color:P.ink,fontSize:24,lineHeight:26,fontFamily:F.sans},
  video:{width:"100%",aspectRatio:16/9,borderRadius:RD.lg,backgroundColor:P.void,marginBottom:SP.md},
  nativeVideoFallback:{alignItems:"center",justifyContent:"center",borderWidth:1,borderColor:P.teal},
  videoSource:{...T.label,fontSize:10,letterSpacing:.4,textTransform:"none",color:P.teal,marginBottom:SP.sm},
  swapModal:{width:"100%",maxWidth:LAYOUT.maxContentWidth,maxHeight:"92%",alignSelf:"center",backgroundColor:P.surface,borderRadius:RD.xxl,borderWidth:1,borderColor:P.lineStrong,...SH.lift},
  swapContent:{padding:SP.lg,paddingBottom:SP.xxl},
  swapTitle:{...T.label,fontSize:9,color:P.lime,marginTop:SP.xl,marginBottom:SP.md},
  swapOption:{flexDirection:"row",alignItems:"center",gap:SP.md,minHeight:LAYOUT.tapTarget+10,padding:SP.md,borderRadius:RD.md,backgroundColor:P.surfaceRaised,borderWidth:1,borderColor:P.line,marginBottom:SP.sm},
  swapArrow:{color:P.lime,fontSize:24,fontFamily:F.sans},

  // ---------- Nutrition ----------
  photoBox:{minHeight:180,borderRadius:RD.xl,backgroundColor:P.surface,borderWidth:1,borderStyle:"dashed",borderColor:P.lineStrong,alignItems:"center",justifyContent:"center",marginVertical:SP.md,overflow:"hidden",padding:SP.lg},
  photo:{width:"100%",height:"100%"},
  photoTitle:{...T.section,fontSize:16,color:P.ink,marginTop:SP.sm},
  groceryList:{marginTop:SP.lg,paddingTop:SP.sm,borderTopWidth:1,borderTopColor:P.line},
  groceryRow:{flexDirection:"row",alignItems:"center",gap:SP.md,minHeight:LAYOUT.tapTarget,paddingVertical:SP.md,borderBottomWidth:1,borderBottomColor:P.line},
  checkbox:{width:26,height:26,borderRadius:RD.sm,borderWidth:2,borderColor:P.lineStrong,alignItems:"center",justifyContent:"center"},
  checkboxOn:{borderColor:P.lime,backgroundColor:P.lime},
  checkboxMark:{color:P.inkInverse,fontSize:15,fontWeight:"900",fontFamily:F.sans,lineHeight:17},
  groceryDone:{color:P.inkFaint,textDecorationLine:"line-through"},
  groceryPrice:{fontFamily:F.cond,fontSize:16,fontWeight:"700",color:P.lime},
  groceryTotal:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:SP.md,paddingTop:SP.lg},
  groceryTotalValue:{fontFamily:F.cond,fontSize:24,fontWeight:"700",color:P.ink},

  // ---------- Progression ----------
  weight:{...T.dataXl,fontSize:50,color:P.ink,lineHeight:54},
  kg:{fontFamily:F.sans,fontSize:16,fontWeight:"400",color:P.inkMuted},
  good:{...T.muted,color:P.lime,fontWeight:"700"},
  chart:{height:104,flexDirection:"row",alignItems:"flex-end",gap:3,paddingVertical:SP.md},
  bar:{flex:1,minWidth:3,backgroundColor:P.limeDark,borderWidth:1,borderColor:P.limeDeep,borderRadius:RD.sm,minHeight:6},
  barLast:{backgroundColor:P.lime,borderColor:P.lime},
  chartEmpty:{minHeight:72,justifyContent:"center",alignItems:"center",paddingVertical:SP.md,borderWidth:1,borderStyle:"dashed",borderColor:P.line,borderRadius:RD.md,marginVertical:SP.md,paddingHorizontal:SP.md},
  chartAxis:{flexDirection:"row",justifyContent:"space-between",gap:SP.sm,marginBottom:SP.sm},
  chartAxisText:{...T.label,fontSize:9,color:P.inkFaint,textTransform:"none",letterSpacing:.3},
  score:{...T.dataXl,color:P.lime,lineHeight:58},

  // ---------- Première utilisation ----------
  onbContent:{width:"100%",maxWidth:LAYOUT.maxContentWidth,alignSelf:"center",paddingHorizontal:SP.lg,paddingTop:SP.xxl,paddingBottom:SP.xxxl,minHeight:"100%"},
  onbProgress:{flexDirection:"row",gap:SP.xs,marginBottom:SP.xl},
  onbDot:{flex:1,height:4,borderRadius:RD.pill,backgroundColor:P.surfaceHigh},
  onbDotOn:{backgroundColor:P.lime},
  onbBody:{marginTop:SP.xl,marginBottom:SP.lg},
  choice:{flexDirection:"row",alignItems:"center",gap:SP.md,minHeight:LAYOUT.tapTarget+14,padding:SP.md,borderRadius:RD.lg,backgroundColor:P.surface,borderWidth:1,borderColor:P.line},
  choiceActive:{backgroundColor:P.limeDark,borderColor:P.lime},
  choiceTitle:{...T.section,fontSize:15,color:P.ink},
  radio:{width:22,height:22,borderRadius:RD.pill,borderWidth:2,borderColor:P.lineStrong},
  radioOn:{borderColor:P.lime,backgroundColor:P.lime},
  recapRow:{flexDirection:"row",justifyContent:"space-between",alignItems:"center",gap:SP.md,paddingVertical:SP.md,borderBottomWidth:1,borderBottomColor:P.line},
  recapLabel:{...T.label,fontSize:10,color:P.inkMuted},
  recapValue:{fontFamily:F.cond,fontSize:21,fontWeight:"700",color:P.lime},

  // ---------- Navigation ----------
  // navWrap porte le positionnement absolu ; la barre reste centrée et bornée sur grand écran.
  navWrap:{position:"absolute",left:0,right:0,bottom:0,alignItems:"center",paddingHorizontal:SP.md,paddingBottom:SP.md},
  bottom:{width:"100%",maxWidth:LAYOUT.maxContentWidth,height:LAYOUT.navHeight,borderRadius:RD.xl,backgroundColor:P.surfaceRaised,borderWidth:1,borderColor:P.lineStrong,flexDirection:"row",justifyContent:"space-around",alignItems:"center",paddingHorizontal:SP.xs,...SH.lift},
  nav:{flex:1,minHeight:LAYOUT.tapTarget,alignItems:"center",justifyContent:"center",paddingHorizontal:2,paddingVertical:SP.xs,borderRadius:RD.md,gap:1},
  navActive:{backgroundColor:P.limeDark},
  navIcon:{fontSize:17,color:P.inkFaint,fontFamily:F.sans},
  navIconActive:{color:P.lime},
  navText:{...T.label,fontSize:8,color:P.inkFaint},
  navTextActive:{color:P.lime}
});
