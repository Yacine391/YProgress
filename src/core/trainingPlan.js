/**
 * YProgress — programme de reprise du 27 octobre 2026.
 * Le volume est un point de départ, à ajuster avec le ressenti et le coach MMA.
 * Référence : ACSM Position Stand 2026, https://doi.org/10.1249/MSS.0000000000003897
 */
export const PROGRAM_START = '2026-10-27';
export const PROGRAM_END = '2027-04-27';
export const TRAINING_DAYS = [
  {dayIndex:0,key:'sun',label:'Dimanche',short:'DIM',type:'recovery',workoutId:'recovery',title:'Recharge'},
  {dayIndex:1,key:'mon',label:'Lundi',short:'LUN',type:'strength',workoutId:'a',title:'Full body A'},
  {dayIndex:2,key:'tue',label:'Mardi',short:'MAR',type:'mma',workoutId:'mma',title:'MMA au club'},
  {dayIndex:3,key:'wed',label:'Mercredi',short:'MER',type:'optional',workoutId:'optional',title:'Mobilité · option légère'},
  {dayIndex:4,key:'thu',label:'Jeudi',short:'JEU',type:'mma',workoutId:'mma',title:'MMA au club'},
  {dayIndex:5,key:'fri',label:'Vendredi',short:'VEN',type:'recovery',workoutId:'recovery',title:'Récupération'},
  {dayIndex:6,key:'sat',label:'Samedi',short:'SAM',type:'strength',workoutId:'b',title:'Full body B'},
];
export const MUSCLE_GROUPS = [
  {id:'chest',label:'Pectoraux',parts:['Faisceau claviculaire (haut)','Faisceau sternocostal'],partIds:['upper-chest','chest'],description:'Les développés sollicitent les pectoraux ensemble. L’inclinaison change l’accent, sans isoler une zone à 100 %.'},
  {id:'back',label:'Dos',parts:['Grand dorsal','Trapèzes et rhomboïdes','Érecteurs du rachis'],partIds:['lats','mid-back','spinal-erectors'],description:'Un tirage vertical pour les dorsaux, un rowing pour le milieu du dos. Les lombaires stabilisent les mouvements de hanche.'},
  {id:'shoulders',label:'Épaules',parts:['Deltoïde antérieur (avant)','Deltoïde latéral (côté)','Deltoïde postérieur (arrière)'],partIds:['front-delts','side-delts','rear-delts'],description:'Le deltoïde a 3 faisceaux. La coiffe des rotateurs est un ensemble distinct de 4 muscles qui stabilisent l’épaule.'},
  {id:'biceps',label:'Biceps & brachial',parts:['Biceps : chef long et chef court','Brachial','Brachioradial (avant-bras)'],partIds:['biceps','brachialis','forearms'],description:'Le curl sollicite le biceps ; la prise marteau ajoute un accent sur brachial et brachioradial. Les tirages les sollicitent aussi.'},
  {id:'triceps',label:'Triceps',parts:['Chef long','Chef latéral','Chef médial'],partIds:['triceps-long','triceps'],description:'Les 3 chefs participent à l’extension du coude. L’extension au-dessus de la tête met le chef long en position allongée.'},
  {id:'legs',label:'Cuisses & fessiers',parts:['Quadriceps','Ischio-jambiers','Fessiers'],partIds:['quads','hamstrings','glutes'],description:'Presse ou squat pour pousser, leg curl pour fléchir le genou, mouvement de hanche pour la chaîne postérieure.'},
  {id:'calves',label:'Mollets',parts:['Gastrocnémiens','Soléaire'],partIds:['calves'],description:'Les élévations debout travaillent les mollets. Monte et redescends sans rebond, dans une amplitude confortable.'},
  {id:'core',label:'Sangle abdominale',parts:['Grand droit','Obliques','Transverse et stabilisateurs'],partIds:['core'],description:'Le gainage consiste à résister au mouvement en continuant de respirer ; une durée plus longue n’est pas le seul signe de progrès.'},
];

const demo = (slug,title) => ({provider:'musclewiki',url:`https://musclewiki.com/exercise/${slug}`,title,channel:'MuscleWiki',kind:'single-exercise',durationSeconds:null});
const ex = (id,name,group,primary,secondary,cues,alternatives=[],extra={}) => ({id,name,group,primary,secondary,primaryMuscles:primary,secondaryMuscles:secondary,muscles:MUSCLE_GROUPS.find(g=>g.id===group)?.label||group,sets:2,minReps:8,maxReps:12,restSeconds:90,rest:'90 s',loadUnit:'kg',loadHint:'Choisis léger : les dernières répétitions restent propres, avec 2–3 répétitions possibles en plus.',startLoad:null,cues,cue:cues[0],alternativeIds:alternatives,...extra});

export const EXERCISES = [
  ex('leg-press','Presse à cuisses','legs',['quads','glutes'],[],['Bassin et dos restent en appui contre le dossier.','Pieds stables ; genoux dans le sens des orteils.','Descends sans décoller le bassin puis pousse sans verrouiller brutalement.'],['goblet-squat'],{restSeconds:120,rest:'2 min',video:demo('machine-leg-press','Presse à cuisses')}),
  ex('incline-db-press','Développé incliné haltères','chest',['upper-chest','chest'],['front-delts','triceps'],['Banc légèrement incliné, environ 15–30°, pieds au sol.','Descends les haltères lentement, poignets au-dessus des coudes.','Pousse sans décoller les épaules du banc ni forcer une amplitude douloureuse.'],['machine-chest-press'],{restSeconds:120,rest:'2 min',loadHint:'Charge par haltère ; commence avec une paire facile à contrôler.',video:demo('dumbbell-incline-bench-press','Développé incliné haltères')}),
  ex('lat-pulldown','Tirage vertical','back',['lats'],['biceps','mid-back'],['Cuisses calées, buste stable et poitrine ouverte.','Amène les coudes vers les côtes et la barre devant toi, vers le haut du torse.','Remonte sous contrôle ; ne tire jamais derrière la nuque.'],['cable-row'],{restSeconds:120,rest:'2 min',video:demo('machine-pulldown','Tirage vertical')}),
  ex('leg-curl','Leg curl assis','legs',['hamstrings'],[],['Aligne le genou avec l’axe de la machine.','Garde le bassin en appui ; ramène les talons sans donner d’élan.','Redescends lentement, sans relâcher la charge d’un coup.'],[],{minReps:10,maxReps:15,video:demo('machine-seated-leg-curl','Leg curl assis')}),
  ex('lateral-raise','Élévations latérales','shoulders',['side-delts'],[],['Haltères légers, coudes souples, épaules loin des oreilles.','Monte les bras légèrement en avant du buste jusqu’à une hauteur confortable.','Redescends lentement sans balancer le dos.'],[],{minReps:12,maxReps:20,restSeconds:60,rest:'60 s',loadHint:'Charge par haltère ; privilégie le contrôle au poids.',video:demo('dumbbell-lateral-raise','Élévations latérales')}),
  ex('db-curl','Curl haltères','biceps',['biceps','brachialis'],['forearms'],['Coudes près du buste et poignets dans l’axe.','Fléchis les coudes sans faire partir les épaules vers l’avant.','Redescends lentement, sans balancer le bassin.'],['hammer-curl'],{minReps:10,maxReps:15,restSeconds:60,rest:'60 s',loadHint:'Charge par haltère.',video:demo('dumbbell-curl','Curl haltères')}),
  ex('triceps-pushdown','Extension triceps à la poulie','triceps',['triceps','triceps-long'],[],['Coudes stables près du corps, épaules basses.','Étends les coudes sans pousser avec tout le buste.','Reviens lentement sans laisser les coudes partir vers l’avant.'],['overhead-triceps'],{minReps:10,maxReps:15,restSeconds:60,rest:'60 s',video:demo('cable-rope-pushdown','Extension triceps corde')}),
  ex('plank','Gainage avant','core',['core'],[],['Coudes sous les épaules ; tête, bassin et talons alignés.','Rentre légèrement le bassin et respire sans bloquer.','Arrête avant de creuser le dos ; une variante sur les genoux est possible.'],[],{minReps:20,maxReps:40,restSeconds:60,rest:'60 s',loadUnit:'s',isTimed:true,loadHint:'Note les secondes tenues avec une bonne position, sans charge additionnelle.',video:demo('bodyweight-forearm-plank','Gainage avant')}),
  ex('goblet-squat','Goblet squat','legs',['quads','glutes'],['core'],['Tiens un haltère contre la poitrine, pieds stables.','Descends entre les hanches, genoux dans le sens des pieds.','Garde le dos confortable ; adapte la profondeur à ta mobilité.'],['leg-press'],{restSeconds:120,rest:'2 min',loadHint:'Poids total de l’haltère, pas par côté.',video:demo('dumbbell-goblet-squat','Goblet squat')}),
  ex('cable-row','Rowing assis à la poulie','back',['mid-back','lats'],['biceps','rear-delts'],['Buste stable, genoux légèrement fléchis.','Ramène la poignée vers le bas des côtes en guidant les coudes.','Laisse les bras repartir sous contrôle, sans arrondir exagérément le dos.'],['lat-pulldown'],{restSeconds:120,rest:'2 min',video:demo('machine-seated-cable-row','Rowing assis poulie')}),
  ex('db-rdl','Soulevé de terre roumain haltères','legs',['hamstrings','glutes'],['spinal-erectors','core'],['Genoux légèrement fléchis ; repousse les hanches vers l’arrière.','Haltères proches des jambes et dos dans une position confortable.','Arrête la descente quand les ischios limitent le mouvement, puis redresse les hanches.'],['leg-curl'],{restSeconds:120,rest:'2 min',loadHint:'Charge par haltère ; fais vérifier ce mouvement avant de charger.',video:demo('dumbbell-romanian-deadlift','Soulevé de terre roumain haltères')}),
  ex('reverse-fly','Oiseau haltères','shoulders',['rear-delts'],['mid-back'],['Penche le buste depuis les hanches, dos stable ; haltères légers.','Écarte les bras avec les coudes souples, sans hausser les épaules.','Reviens lentement sans élan.'],['cable-row'],{minReps:12,maxReps:20,restSeconds:60,rest:'60 s',loadHint:'Charge par haltère ; choisis très léger.',video:demo('dumbbell-rear-delt-fly','Oiseau haltères')}),
  ex('hammer-curl','Curl marteau','biceps',['brachialis','biceps'],['forearms'],['Paumes face à face et coudes près du corps.','Monte les haltères sans élan et garde les poignets neutres.','Redescends lentement sans laisser partir les épaules.'],['db-curl'],{minReps:10,maxReps:15,restSeconds:60,rest:'60 s',loadHint:'Charge par haltère.',video:demo('dumbbell-hammer-curl','Curl marteau')}),
  ex('overhead-triceps','Extension triceps au-dessus de la tête','triceps',['triceps-long','triceps'],[],['Assieds-toi ; tiens un haltère à deux mains, tronc stable et côtes non projetées.','Fléchis les coudes dans une amplitude confortable, sans forcer l’épaule.','Étends les coudes lentement ; remplace par la poulie si ce geste est inconfortable.'],['triceps-pushdown'],{minReps:10,maxReps:15,restSeconds:60,rest:'60 s',loadHint:'Poids total de l’haltère tenu à deux mains.',video:demo('dumbbell-overhead-tricep-extension','Extension triceps au-dessus de la tête')}),
  ex('calf-raise','Mollets debout à la machine','calves',['calves'],[],['Règle les appuis de la machine ; garde le tronc stable et les genoux souples.','Monte sur la pointe des pieds sans rebondir.','Marque un court arrêt en haut puis redescends lentement.'],[],{minReps:12,maxReps:20,restSeconds:60,rest:'60 s',loadHint:'Note la charge affichée sur ta machine ; à défaut, fais le geste au poids du corps avec un appui stable.',video:demo('machine-standing-calf-raises','Mollets debout à la machine')}),
  ex('shoulder-press','Développé épaules haltères','shoulders',['front-delts'],['side-delts','triceps'],['Assieds-toi avec le dos soutenu et les pieds stables.','Pousse dans une amplitude confortable sans cambrer exagérément.','Descends lentement ; garde plusieurs répétitions en réserve.'],['lateral-raise'],{restSeconds:120,rest:'2 min',loadHint:'Charge par haltère ; exercice de catalogue, pas un ajout obligatoire.',video:demo('dumbbell-shoulder-press','Développé épaules haltères')}),
  ex('machine-chest-press','Développé poitrine à la machine','chest',['chest'],['front-delts','triceps'],['Règle le siège pour placer les poignées à mi-poitrine.','Dos en appui, poignets alignés ; pousse sans décoller les épaules.','Reviens lentement, sans forcer les épaules en arrière.'],['incline-db-press'],{restSeconds:120,rest:'2 min',video:demo('machine-chest-press','Développé poitrine machine')}),
];
const VERIFIED_YOUTUBE = {
  'leg-press':'RaI6ofF2geQ','incline-db-press':'YzA3rsX3znQ','lat-pulldown':'wo_gGRjVrrw',
  'leg-curl':'ELOCsoDSmrg','lateral-raise':'TOKQbh6FPkU','db-curl':'Fci4s0CC0mE',
  'triceps-pushdown':'tHHeuZewjjs','plank':'pSHjTRCQxIw','goblet-squat':'FefW39U5FbY',
  'db-rdl':'PIt6QP_Dcf8','reverse-fly':'EA3q82Yds30','hammer-curl':'2VvIzDY4yVI',
  'overhead-triceps':'YbX7Wd8jQ-Q','calf-raise':'qVqTCzHFePk','shoulder-press':'qEwKCR5JCog',
};
for (const exercise of EXERCISES) {
  const id=VERIFIED_YOUTUBE[exercise.id];
  if(id) {
    const creator=['plank','shoulder-press','leg-curl','overhead-triceps'].includes(exercise.id)?'ScottHermanFitness':'MuscleWiki';
    const sourceUrl=['plank','shoulder-press'].includes(exercise.id)?`https://www.youtube.com/watch?v=${id}`:exercise.video.url;
    exercise.video={...exercise.video,provider:'youtube',id,url:`https://www.youtube.com/watch?v=${id}`,sourceUrl,channel:creator,exerciseId:exercise.id,verifiedAt:'2026-10-27',clipEnd:120};
  } else exercise.video={...exercise.video,exerciseId:exercise.id,sourceUrl:exercise.video.url,verifiedAt:'2026-10-27'};
}
export const EXERCISE_BY_ID = Object.fromEntries(EXERCISES.map(e=>[e.id,e]));

export const WORKOUT_PLANS = {
  a:{id:'a',title:'Full body A',type:'strength',durationMin:65,duration:'55–75 min',focus:'Jambes · pectoraux · dos · épaules · bras · gainage',exerciseIds:['leg-press','incline-db-press','lat-pulldown','leg-curl','lateral-raise','db-curl','triceps-pushdown','plank']},
  b:{id:'b',title:'Full body B',type:'strength',durationMin:70,duration:'60–80 min',focus:'Jambes · pectoraux · dos · arrière d’épaules · bras · mollets',exerciseIds:['goblet-squat','incline-db-press','cable-row','db-rdl','reverse-fly','hammer-curl','overhead-triceps','calf-raise']},
  expressA:{id:'expressA',title:'L’essentiel A · 20 min',type:'strength',durationMin:20,duration:'20–25 min',focus:'Pousser · tirer · jambes',exerciseIds:['leg-press','incline-db-press','lat-pulldown']},
  expressB:{id:'expressB',title:'L’essentiel B · 20 min',type:'strength',durationMin:20,duration:'20–25 min',focus:'Pousser · tirer · jambes',exerciseIds:['goblet-squat','incline-db-press','cable-row']},
  optional:{id:'optional',title:'Récupération entre les MMA',type:'optional',durationMin:20,duration:'10–20 min, facultatif',focus:'Marche douce · mobilité · sommeil',exerciseIds:[],notes:['Les 4 premières semaines : récupération uniquement.','Après 4 semaines, si tu récupères bien : 1–2 séries faciles d’élévations latérales et de mollets. Aucune obligation.','Ne rattrape pas une séance manquée entre deux entraînements MMA difficiles.']},
  mma:{id:'mma',title:'MMA au club',type:'mma',durationMin:null,duration:'Selon ton cours',focus:'Mardi & jeudi · séance encadrée',exerciseIds:[],notes:['Suis le contenu et l’intensité donnés par ton entraîneur.','Note la durée et la difficulté après le cours. Aucun sparring supplémentaire à rattraper.']},
  recovery:{id:'recovery',title:'Récupération',type:'recovery',durationMin:0,duration:'Repos · marche si tu en as envie',focus:'Récupérer fait partie du programme',exerciseIds:[],notes:['Sommeil régulier et repas suffisants.','Prépare ton sac et choisis ton prochain créneau.','Une journée de repos n’est pas un échec.']},
};

export function getSession(dayIndex, {mode='normal',week=1}={}) {
  const day=TRAINING_DAYS.find(d=>d.dayIndex===Number(dayIndex)) || TRAINING_DAYS[0];
  let plan=WORKOUT_PLANS[day.workoutId];
  if(day.type==='strength' && mode==='express') plan=WORKOUT_PLANS[day.workoutId==='a'?'expressA':'expressB'];
  const gentle=mode==='gentle';
  const beginner=Math.max(1,Number(week)||1)<=2;
  const exercises=plan.exerciseIds.map(id=>({...EXERCISE_BY_ID[id],sets:gentle?1:((!beginner && !mode.startsWith('express') && ['leg-press','incline-db-press','lat-pulldown','goblet-squat','cable-row'].includes(id))?3:2),rir:gentle?4:(beginner?3:2)}));
  return {...plan,dayIndex:day.dayIndex,dayKey:day.key,exercises,mode,week:Math.max(1,Number(week)||1),warmup:'5–8 min faciles, puis 1–2 séries d’échauffement légères sur les premiers mouvements. Elles ne comptent pas comme séries de travail.',effort:gentle?'Technique facile : garde au moins 4 répétitions en réserve.':beginner?'Pendant 2 semaines : apprends les gestes et garde environ 3 répétitions en réserve.':'Garde environ 2 répétitions en réserve, sans échec forcé.',progression:'Quand toutes tes séries atteignent le haut de la fourchette avec une technique stable et au moins 2 répétitions en réserve sur 2 séances : augmente du plus petit palier disponible, puis repars en bas de la fourchette.',recovery:'Si tu récupères mal, choisis la version allégée ou le repos. Si la fatigue s’accumule sur plusieurs séances, réduis les séries de moitié pendant une semaine et parle-en à ton entraîneur.',stopRule:'Une douleur vive, articulaire, un malaise ou une technique qui se dégrade : arrête la série. Une fatigue persistante mérite un avis médical.'};
}

export function localDateKey(input=new Date()) {
  if(typeof input==='string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) return input;
  const date=input instanceof Date?input:new Date(input);
  if(!Number.isFinite(date.getTime())) return '';
  const parts=new Intl.DateTimeFormat('fr-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const find=key=>parts.find(p=>p.type===key)?.value;
  return `${find('year')}-${find('month')}-${find('day')}`;
}
const dayNumber=value=>{
  const key=localDateKey(value); if(!/^\d{4}-\d{2}-\d{2}$/.test(key)) return NaN;
  const date=new Date(`${key}T12:00:00Z`); return Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===key ? Math.floor(date.getTime()/86400000):NaN;
};
export function weekFromStart(start=PROGRAM_START,current=new Date()) {
  const elapsed=dayNumber(current)-dayNumber(start);
  return Number.isFinite(elapsed)?Math.max(1,Math.floor(elapsed/7)+1):1;
}
export function dayIndexForDate(input=new Date()) {
  const key=localDateKey(input);
  return key ? new Date(`${key}T12:00:00Z`).getUTCDay():0;
}

/** Count only actual validated working sets. Never turn a planned workout into progress. */
export function summarizeCoverage(logs=[]) {
  const output=Object.fromEntries(MUSCLE_GROUPS.map(g=>[g.id,{sets:0,indirectSets:0,exercises:[],lastDate:null}]));
  for(const log of (Array.isArray(logs)?logs:[])) {
    const entries=Array.isArray(log.exercises)?log.exercises:[log];
    for(const entry of entries) {
      const exercise=EXERCISE_BY_ID[entry.exerciseId||entry.id]; if(!exercise) continue;
      const count=(entry.sets||[]).filter(s=>s && (s.done===true||s.completed===true) && Number(s.reps||s.seconds)>0).length;
      if(!count) continue;
      const direct=output[exercise.group]; direct.sets+=count;
      if(!direct.exercises.includes(exercise.id)) direct.exercises.push(exercise.id);
      const date=log.date||entry.date||null; if(date && (!direct.lastDate||date>direct.lastDate))direct.lastDate=date;
      for(const g of MUSCLE_GROUPS) if(g.id!==exercise.group && g.partIds.some(p=>exercise.secondary.includes(p))) output[g.id].indirectSets+=count;
    }
  }
  return output;
}

/** A suggestion, never a mandatory starting load. Uses two complete, actual sessions. */
export function suggestNextLoad(exerciseId,logs=[]) {
  const exercise=EXERCISE_BY_ID[exerciseId];
  if(!exercise || exercise.isTimed) return {action:'learn',load:null,message:'Priorité à la position et au contrôle.'};
  const entries=[];
  for(const log of logs) for(const entry of (Array.isArray(log.exercises)?log.exercises:[log])) if((entry.exerciseId||entry.id)===exerciseId) {
    const sets=(entry.sets||[]).filter(s=>(s.done===true||s.completed===true)&&Number(s.reps)>0&&Number.isFinite(Number(s.load)));
    if(sets.length) entries.push({...entry,date:log.date||entry.date||'',sets});
  }
  entries.sort((a,b)=>a.date.localeCompare(b.date));
  const distinctDates=[...new Map(entries.map(entry=>[entry.date,entry])).values()];
  const last=distinctDates.at(-1);
  if(!last) return {action:'learn',load:null,message:'Première séance : choisis une charge légère et garde 3 répétitions en réserve.'};
  const load=Number(last.sets.at(-1).load);
  const two=distinctDates.slice(-2);
  const ready=two.length===2 && two.every(e=>e.sets.length>=(Number(e.plannedSets)||exercise.sets) && e.sets.every(s=>Number(s.load)===load&&Number(s.reps)>=exercise.maxReps&&Number(s.rir)>=2));
  return {action:ready?'increase':'hold',load,message:ready?'Deux séances maîtrisées : essaie le plus petit palier disponible, puis repars en bas de la fourchette.':'Garde cette charge et cherche une répétition propre de plus. Fatigué ? Réduis sans culpabiliser.'};
}

export const TRAINING_SOURCES = [
  {title:'ACSM · recommandations de musculation 2026',url:'https://acsm.org/resistance-training-guidelines-update-2026/'},
  {title:'Position Stand ACSM 2026 · texte scientifique',url:'https://pmc.ncbi.nlm.nih.gov/articles/PMC12965823/'},
  {title:'Cleveland Clinic · 3 faisceaux du deltoïde',url:'https://my.clevelandclinic.org/health/body/21875-deltoid-muscles'},
  {title:'Cleveland Clinic · coiffe des rotateurs',url:'https://my.clevelandclinic.org/health/diseases/rotator-cuff'},
];
