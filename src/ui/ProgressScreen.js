import React, {useMemo, useState} from 'react';
import {View,Text,Image,Pressable,Platform,StyleSheet} from 'react-native';
import Svg, {Line,Polyline,Circle,Text as SvgText} from 'react-native-svg';
import * as ImagePicker from 'expo-image-picker';
import {C,ui,Card,Button,Field,Tag,SectionTitle,Empty,Notice,Icon} from './kit';
import {validDate} from '../core/backup';
import {EXERCISE_BY_ID} from '../core/trainingPlan';

const decimal = value => Number(String(value).replace(',', '.'));
const fr = value => Number(value).toLocaleString('fr-FR', {maximumFractionDigits:1});
const shortDate = date => { try { return new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short'}).format(new Date(`${date}T12:00:00Z`)); } catch { return date; } };
const longDate = date => new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'long',year:'numeric'}).format(new Date(`${date}T12:00:00Z`));
function sixMonthHorizon(start) { const date=new Date(`${start}T12:00:00Z`);const day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+6);const lastDay=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,lastDay));return date.toISOString().slice(0,10); }
const exerciseName = id => EXERCISE_BY_ID[id]?.name||String(id || '').replace(/-/g,' ').replace(/^./, c => c.toUpperCase());

function WeightChart({weights}) {
  const entries = weights.filter(p => validDate(p.date) && Number.isFinite(p.weight)).sort((a,b)=>a.date.localeCompare(b.date)).slice(-30);
  if (entries.length < 2) return <Empty title="Ta première mesure est posée." body="Ajoute une deuxième pesée pour voir apparaître une vraie tendance. Pèse-toi dans des conditions similaires, une à trois fois par semaine."/>;
  const W=540,H=180,left=40,right=15,top=18,bottom=30;
  const values=entries.map(p=>p.weight), low=Math.min(...values)-.25,high=Math.max(...values)+.25;
  const times=entries.map(p=>new Date(`${p.date}T12:00:00Z`).getTime()),span=Math.max(86400000,times[times.length-1]-times[0]);
  const x=i=>left+(times[i]-times[0])/span*(W-left-right),y=v=>top+(high-v)/(high-low)*(H-top-bottom);
  return <View accessibilityLabel={`Courbe de ${entries.length} pesées réelles, de ${fr(values[0])} à ${fr(values[values.length-1])} kilogrammes`}>
    <Svg width="100%" height={180} viewBox={`0 0 ${W} ${H}`}>
      {[0,.5,1].map(f=>{const v=low+(high-low)*f;return <React.Fragment key={f}><Line x1={left} x2={W-right} y1={y(v)} y2={y(v)} stroke={C.line} strokeDasharray="4 6"/><SvgText x={left-8} y={y(v)+4} fill={C.faint} fontSize="11" textAnchor="end">{fr(v)}</SvgText></React.Fragment>})}
      <Polyline points={entries.map((p,i)=>`${x(i)},${y(p.weight)}`).join(' ')} stroke={C.accent} strokeWidth="2.5" fill="none"/>
      {entries.map((p,i)=><Circle key={p.date} cx={x(i)} cy={y(p.weight)} r={i===entries.length-1?5:3} fill={C.accent} stroke={C.panel} strokeWidth="2"/>)}
      <SvgText x={left} y={H-6} fill={C.muted} fontSize="11">{shortDate(entries[0].date)}</SvgText><SvgText x={W-right} y={H-6} fill={C.muted} fontSize="11" textAnchor="end">{shortDate(entries[entries.length-1].date)}</SvgText>
    </Svg>
    <Text style={ui.small}>Poids en kg · échelle adaptée à tes mesures · {entries.length} pesées</Text>
  </View>;
}

async function compactPhoto(asset) {
  if (Platform.OS === 'web') {
    return new Promise((resolve,reject)=>{
      const img=new window.Image();
      img.onload=()=>{try { const ratio=Math.min(1,1000/Math.max(img.width,img.height));const canvas=document.createElement('canvas');canvas.width=Math.round(img.width*ratio);canvas.height=Math.round(img.height*ratio);const ctx=canvas.getContext('2d');ctx.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.65)); }catch { reject(new Error('Impossible de préparer cette photo.')); }};
      img.onerror=()=>reject(new Error('Cette photo ne peut pas être lue.'));
      img.src=asset.uri;
    });
  }
  if (!asset.base64) throw new Error('Photo illisible. Choisis un fichier JPEG plus petit.');
  const mime=asset.mimeType==='image/png'?'image/png':'image/jpeg';
  return `data:${mime};base64,${asset.base64}`;
}

export default function ProgressScreen({data,update,today,notify}) {
  const [weight,setWeight]=useState(''),[date,setDate]=useState(today),[measure,setMeasure]=useState({arm:'',chest:'',waist:'',thigh:''}),[exercise,setExercise]=useState('all'),[reference,setReference]=useState(false),[addingPhoto,setAddingPhoto]=useState(false);
  const weights=useMemo(()=>(data.weights||[]).slice().sort((a,b)=>a.date.localeCompare(b.date)),[data.weights]);
  const latest=weights.length?weights[weights.length-1].weight:data.profile.weight;
  const difference=latest-(data.baselineWeight||55);
  const sessions=useMemo(()=>(data.sessions||[]).slice().sort((a,b)=>b.date.localeCompare(a.date)),[data.sessions]);
  const ids=useMemo(()=>[...new Set(sessions.flatMap(s=>(s.sets||[]).map(t=>t.exerciseId)))],[sessions]);
  const visibleSessions=sessions.filter(s=>exercise==='all'||s.sets.some(t=>t.exerciseId===exercise)).slice(0,20);
  const photos=data.photos||[];
  function addWeight(){
    const kg=decimal(weight);
    if(!validDate(date)||date>today) return notify('Choisis une date réelle, au plus tard aujourd’hui.','error');
    if(!weight.trim()||!Number.isFinite(kg)||kg<25||kg>300) return notify('Entre un poids entre 25 et 300 kg.','error');
    update(prev=>{const nextWeights=[...(prev.weights||[]).filter(w=>w.date!==date),{date,weight:Math.round(kg*10)/10}].sort((a,b)=>a.date.localeCompare(b.date));return {...prev,weights:nextWeights,profile:{...prev.profile,weight:nextWeights[nextWeights.length-1].weight}};});setWeight('');notify('Pesée enregistrée. Une mesure à la fois.');
  }
  function addMeasure(){
    const filled=Object.entries(measure).filter(([,v])=>v.trim());
    if(!filled.length) return notify('Renseigne au moins une mesure.','error');
    if(!validDate(date)||date>today) return notify('Vérifie la date de tes mesures.','error');
    if(filled.some(([,v])=>!Number.isFinite(decimal(v))||decimal(v)<5||decimal(v)>250)) return notify('Mesures attendues en centimètres, entre 5 et 250.','error');
    const entry={date,...Object.fromEntries(filled.map(([k,v])=>[k,Math.round(decimal(v)*10)/10]))};
    update(prev=>({...prev,measurements:[...(prev.measurements||[]).filter(m=>m.date!==date),entry].sort((a,b)=>a.date.localeCompare(b.date))}));setMeasure({arm:'',chest:'',waist:'',thigh:''});notify('Mensurations enregistrées.');
  }
  async function addPhoto(){
    try {
      if(photos.length>=12) return notify('12 photos maximum : exporte ta sauvegarde puis retire une ancienne photo.','error');
      setAddingPhoto(true);
      if(Platform.OS!=='web'){const permission=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!permission.granted) return notify('Autorise l’accès à tes photos pour en ajouter une.','error');}
      const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:.35,base64:true,allowsMultipleSelection:false});
      if(result.canceled||!result.assets?.[0]) return;
      const uri=await compactPhoto(result.assets[0]);
      if(uri.length>800000) return notify('Cette image est trop grande. Choisis une photo plus légère (600 Ko environ).','error');
      if(photos.reduce((n,p)=>n+p.uri.length,0)+uri.length>3200000) return notify('Ton album local est plein. Exporte tes données avant de retirer une photo.','error');
      update(prev=>({...prev,photos:[...(prev.photos||[]),{id:`photo-${Date.now()}`,date:today,uri}]}));notify('Photo ajoutée à ton suivi privé.');
    } catch(error){notify(error.message||'Impossible d’ajouter cette photo.','error');}finally{setAddingPhoto(false);}
  }
  const lastMeasure=(data.measurements||[]).slice().sort((a,b)=>b.date.localeCompare(a.date))[0];
  return <View style={ui.page}>
    <View style={{gap:7}}><Text style={ui.label}>CE QUI COMPTE, C’EST LA TENDANCE</Text><Text style={ui.title}>Tes progrès deviennent visibles.</Text><Text style={ui.body}>Des mesures, des charges et des habitudes réelles. Aucun résultat inventé.</Text></View>
    <View style={ui.wrap}>
      <Card style={{flexGrow:1,flexBasis:220}}><Text style={ui.label}>POIDS ACTUEL</Text><View style={{flexDirection:'row',alignItems:'baseline',gap:6}}><Text style={ui.num}>{fr(latest)}</Text><Text style={ui.body}>kg</Text></View><Text style={[ui.small,{color:C.accent}]}>{difference>=0?'+':''}{fr(difference)} kg depuis les {fr(data.baselineWeight||55)} kg déclarés</Text><Text style={ui.small}>Le poids de départ est un repère déclaré, sans date inventée.</Text></Card>
      <Card style={{flexGrow:1,flexBasis:220}}><Text style={ui.label}>SÉANCES ENREGISTRÉES</Text><Text style={ui.num}>{sessions.length.toString().padStart(2,'0')}</Text><Text style={ui.small}>{sessions.length?'Chaque séance est un vote pour la personne que tu deviens.':'La première compte plus qu’une semaine parfaite imaginée.'}</Text></Card>
      <Card style={{flexGrow:1,flexBasis:220}}><Text style={ui.label}>HORIZON DE TRAVAIL</Text><Text style={[ui.num,{fontSize:32}]}>6 mois</Text><Text style={ui.small}>{longDate(data.startDate)} → {longDate(sixMonthHorizon(data.startDate))}</Text><Text style={ui.small}>On réévalue chaque mois selon ta récupération et tes résultats.</Text></Card>
    </View>
    <Card><SectionTitle title="La courbe raconte la suite" kicker="POIDS"/><WeightChart weights={weights}/><View style={[ui.wrap,{alignItems:'flex-end'}]}><Field label="Poids (kg)" value={weight} onChange={setWeight} numeric placeholder="57,0" style={{flexBasis:140}}/><Field label="Date · AAAA-MM-JJ" value={date} onChange={setDate} placeholder={today} style={{flexBasis:180}}/><Button title="Enregistrer la pesée" onPress={addWeight} icon="scale"/></View><Text style={ui.small}>Une pesée existe déjà à cette date ? Elle sera mise à jour.</Text></Card>
    <Card><SectionTitle title="Plus que le chiffre sur la balance" kicker="MENSURATIONS" subtitle="Tous les 15 à 30 jours, au même endroit et sans serrer le ruban."/><View style={ui.wrap}>{[['arm','Tour de bras'],['chest','Poitrine'],['waist','Taille'],['thigh','Cuisse']].map(([key,label])=><Field key={key} label={`${label} (cm)`} value={measure[key]} onChange={value=>setMeasure(prev=>({...prev,[key]:value}))} numeric style={{flexBasis:135}}/>)}</View><Button title="Enregistrer les mensurations" onPress={addMeasure} secondary/>{lastMeasure?<View style={{gap:9}}><Text style={ui.small}>Dernière mesure · {shortDate(lastMeasure.date)}</Text><View style={ui.wrap}>{[['arm','Bras'],['chest','Poitrine'],['waist','Taille'],['thigh','Cuisse']].map(([key,label])=>lastMeasure[key]?<Tag key={key}>{label} {fr(lastMeasure[key])} cm</Tag>:null)}</View></View>:null}</Card>
    <Card><SectionTitle title="Le carnet de tes séances" kicker="FORCE & TECHNIQUE" subtitle="Seules les séries enregistrées apparaissent ici."/><View style={ui.wrap}><Tag active={exercise==='all'} onPress={()=>setExercise('all')}>Tous les exercices</Tag>{ids.map(id=><Tag key={id} active={exercise===id} onPress={()=>setExercise(id)}>{exerciseName(id)}</Tag>)}</View>{!visibleSessions.length?<Empty title="Ton carnet attend sa première ligne." body="Ouvre ta séance, note tes répétitions et tes charges puis termine l’entraînement. Tu pourras comparer ici."/>:visibleSessions.map((session,index)=><View key={session.id||`${session.date}-${index}`} style={[s.session,index>0&&{borderTopWidth:1,borderColor:C.line}]}><View style={ui.spread}><View style={{flex:1,gap:5}}><Text style={[ui.heading,{fontSize:15}]}>{session.title||'Séance de musculation'}</Text><Text style={ui.small}>{shortDate(session.date)}{session.durationMin?` · ${session.durationMin} min`:''}{session.mode==='express'?' · version courte':''}</Text></View><Icon name="check" color={C.accent}/></View><View style={{gap:7}}>{(session.sets||[]).filter(set=>exercise==='all'||set.exerciseId===exercise).map((set,i)=><View key={i} style={ui.spread}><Text style={[ui.small,{flex:1}]}>{set.exerciseName||exerciseName(set.exerciseId)}</Text><Text style={[ui.small,{color:C.ink,fontWeight:'600'}]}>{EXERCISE_BY_ID[set.exerciseId]?.isTimed?`${set.reps} s`:`${fr(set.load||0)} kg × ${set.reps}`}{Number.isFinite(set.rir)?` · RIR ${set.rir}`:''}</Text></View>)}</View>{session.note?<Text style={ui.small}>{session.note}</Text>:null}</View>)}</Card>
    <Card><SectionTitle title="Tes photos, à ton rythme" kicker="JOURNAL VISUEL" subtitle="Même lumière, même pose, une photo par mois suffit." right={<Icon name="camera" color={C.accent}/>}/><Text style={ui.small}>Les photos de suivi restent dans les données locales de ton appareil. Elles ne sont pas envoyées au coach. Pense à exporter ta sauvegarde.</Text><Button title={addingPhoto?'Préparation…':'Ajouter une photo de suivi'} onPress={addPhoto} disabled={addingPhoto} secondary icon="camera"/>{photos.length?<View style={ui.wrap}>{photos.slice().reverse().map(photo=><View key={photo.id} style={{width:145,gap:7}}><Image source={{uri:photo.uri}} style={{width:145,height:190,borderRadius:12,backgroundColor:C.bg}} resizeMode="cover" accessibilityLabel={`Photo de suivi du ${shortDate(photo.date)}`}/><Text style={ui.small}>{shortDate(photo.date)}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Retirer la photo du ${photo.date}`} onPress={()=>{update(prev=>({...prev,photos:prev.photos.filter(p=>p.id!==photo.id)}));notify('Photo retirée du suivi.');}}><Text style={[ui.small,{color:C.red}]}>Retirer</Text></Pressable></View>)}</View>:null}<View style={ui.divider}/><Button title={reference?'Masquer mon image d’inspiration':'Voir mon image d’inspiration'} onPress={()=>setReference(v=>!v)} secondary/>{reference?<><Image source={require('../../assets/objectif-reference.png')} style={{width:'100%',height:400,borderRadius:12,backgroundColor:C.bg}} resizeMode="contain" accessibilityLabel="Simulation avant après générée par IA fournie comme inspiration"/><Notice tone="warn">Simulation générée par IA, fournie comme inspiration. Ce n’est ni une photo de résultat obtenu, ni une prédiction de ton apparence dans six mois. Le poids et le taux de graisse inscrits sur l’image ne sont pas des objectifs prescrits.</Notice></>:null}</Card>
  </View>;
}

const s=StyleSheet.create({session:{paddingVertical:17,gap:13}});
