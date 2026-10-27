import React, {useState} from 'react';
import {View,Text,Platform,Share,Pressable,StyleSheet} from 'react-native';
import {C,ui,Card,Button,Field,Tag,SectionTitle,Notice,Icon} from './kit';
import {SEXES,ACTIVITY_LEVELS,GOALS,computeTargets} from '../core/profile';
import {proteinTarget} from '../core/nutrition';
import {serializeBackup,validateBackup,validDate} from '../core/backup';

const decimal=value=>Number(String(value).replace(',','.'));
const validNumber=(value,min,max)=>String(value).trim()!==''&&Number.isFinite(decimal(value))&&decimal(value)>=min&&decimal(value)<=max;

function OptionGroup({label,options,value,onChange}) {
  return <View style={{gap:9}}><Text style={ui.small}>{label}</Text><View style={ui.wrap}>{options.map(option=><Tag key={option.id} active={option.id===value} onPress={()=>onChange(option.id)}>{option.label}</Tag>)}</View></View>;
}

export default function ProfileScreen({data,update,today,notify}) {
  const [draft,setDraft]=useState(()=>({...data.profile,age:String(data.profile.age||''),heightCm:String(data.profile.heightCm||''),weight:String(data.profile.weight||57)}));
  const [startDate,setStartDate]=useState(data.startDate||'2026-10-27');
  const day=data.days[today]||{};
  const [sleepHours,setSleepHours]=useState(String(day.sleepHours||'')),[energy,setEnergy]=useState(day.energy||''),[note,setNote]=useState(day.note||'');
  const [preferences,setPreferences]=useState({trainingTime:data.preferences?.trainingTime||'Après le stage',barrier:data.preferences?.barrier||'',anchor:data.preferences?.anchor||'Préparer le sac la veille'});
  const [importOpen,setImportOpen]=useState(false),[importText,setImportText]=useState(''),[pending,setPending]=useState(null),[backupName,setBackupName]=useState('');
  const [restoring,setRestoring]=useState(false);
  const targets=data.profile.confirmed?{...computeTargets(data.profile),protein:proteinTarget(data.profile.weight).target}:null;
  const setField=(key,value)=>setDraft(prev=>({...prev,[key]:value}));
  function saveProfile(){
    if(!draft.name.trim()||draft.name.trim().length>80) return notify('Entre un prénom de 1 à 80 caractères.','error');
    if(!validNumber(draft.age,18,90)||!Number.isInteger(decimal(draft.age))) return notify('Le calcul est prévu pour un adulte : âge entier de 18 à 90 ans.','error');
    if(!validNumber(draft.heightCm,120,230)) return notify('Vérifie ta taille en centimètres (120 à 230).','error');
    if(!validNumber(draft.weight,25,300)) return notify('Vérifie ton poids en kilogrammes (25 à 300).','error');
    if(!validDate(startDate)||startDate>today) return notify('La date de départ doit être une date réelle, au plus tard aujourd’hui.','error');
    const profile={...draft,name:draft.name.trim(),age:decimal(draft.age),heightCm:decimal(draft.heightCm),weight:Math.round(decimal(draft.weight)*10)/10,confirmed:true};
    update(prev=>{
      const weights=profile.weight!==prev.profile.weight?[...(prev.weights||[]).filter(entry=>entry.date!==today),{date:today,weight:profile.weight}].sort((a,b)=>a.date.localeCompare(b.date)):prev.weights;
      return {...prev,profile,startDate,weights};
    });
    notify('Profil confirmé. Tes repères nutritionnels sont recalculés.');
  }
  function saveDay(){
    if(sleepHours.trim()&&!validNumber(sleepHours,0,24)) return notify('Indique une durée de sommeil entre 0 et 24 heures.','error');
    update(prev=>({...prev,days:{...prev.days,[today]:{...(prev.days[today]||{}),sleepHours:sleepHours.trim()?decimal(sleepHours):'',energy:energy?Number(energy):'',note:note.slice(0,4000)}},preferences:{...prev.preferences,...preferences}}));
    notify('Ton bilan et tes repères sont enregistrés.');
  }
  async function exportData(){
    try {
      const json=serializeBackup(data),filename=`YProgress-sauvegarde-${today}.json`;
      if(Platform.OS==='web'){
        const url=URL.createObjectURL(new Blob([json],{type:'application/json'}));
        const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }else await Share.share({title:filename,message:json});
      notify('Sauvegarde exportée. Conserve-la dans un endroit privé.');
    }catch(error){notify(error.message||'Impossible d’exporter les données.','error');}
  }
  function inspectBackup(text,name='Texte collé'){
    const result=validateBackup(text);
    if(!result.ok){setPending(null);return notify(result.error,'error');}
    setPending(result);setBackupName(name);setImportText('');
  }
  function chooseBackup(){
    if(Platform.OS!=='web') return;
    const input=document.createElement('input');input.type='file';input.accept='.json,application/json';
    input.onchange=async()=>{const file=input.files?.[0];if(!file)return;if(file.size>8*1024*1024)return notify('Le fichier dépasse 8 Mo.','error');try {inspectBackup(await file.text(),file.name);}catch{notify('Le fichier ne peut pas être lu.','error');}};
    input.click();
  }
  function restoreData(){
    if(!pending?.ok||restoring)return;
    setRestoring(true);
    try {
      // Une copie JSON indépendante évite que le brouillon d’aperçu soit modifié après restauration.
      const restored=JSON.parse(JSON.stringify(pending.data));
      update(()=>restored);
      setDraft({...restored.profile,age:String(restored.profile.age||''),heightCm:String(restored.profile.heightCm||''),weight:String(restored.profile.weight)});setStartDate(restored.startDate);
      const restoredDay=restored.days[today]||{};setSleepHours(String(restoredDay.sleepHours||''));setEnergy(restoredDay.energy||'');setNote(restoredDay.note||'');
      setPreferences({trainingTime:restored.preferences?.trainingTime||'Après le stage',barrier:restored.preferences?.barrier||'',anchor:restored.preferences?.anchor||'Préparer le sac la veille'});
      setPending(null);setImportOpen(false);notify('Sauvegarde restaurée. Tes données sont à jour.');
    }catch{notify('La restauration a échoué. Tes données actuelles sont conservées.','error');}finally{setRestoring(false);}
  }
  return <View style={ui.page}>
    <View style={{gap:7}}><Text style={ui.label}>PERSONNEL, PAS PARFAIT</Text><Text style={ui.title}>Une routine à ta mesure.</Text><Text style={ui.body}>Un programme qui tient compte de ton stage, de ta fatigue et de tes deux entraînements de MMA.</Text></View>
    <Card><SectionTitle title="Tes repères de départ" kicker="PROFIL" right={<Icon name="profile" color={C.accent}/>}/>{!data.profile.confirmed?<Notice tone="warn">Ton poids de 57 kg est à jour. L’âge et la taille viennent de l’ancienne application : vérifie-les avant d’activer un objectif calorique personnalisé.</Notice>:<Tag active>Profil confirmé · objectifs estimatifs</Tag>}<View style={ui.wrap}><Field label="Prénom" value={draft.name} onChange={value=>setField('name',value)} style={{flexBasis:220}} maxLength={80}/><Field label="Poids actuel (kg)" value={draft.weight} onChange={value=>setField('weight',value)} numeric style={{flexBasis:140}}/></View><View style={ui.wrap}><Field label="Âge (ans)" value={draft.age} onChange={value=>setField('age',value)} numeric style={{flexBasis:140}}/><Field label="Taille (cm)" value={draft.heightCm} onChange={value=>setField('heightCm',value)} numeric style={{flexBasis:140}}/><Field label="Départ · AAAA-MM-JJ" value={startDate} onChange={setStartDate} style={{flexBasis:180}}/></View><OptionGroup label="Repère utilisé dans l’équation énergétique" options={SEXES} value={draft.sex} onChange={value=>setField('sex',value)}/><OptionGroup label="Ton activité habituelle, MMA compris" options={ACTIVITY_LEVELS} value={draft.activity} onChange={value=>setField('activity',value)}/><OptionGroup label="Ton objectif" options={GOALS} value={draft.goal} onChange={value=>setField('goal',value)}/><Button title="Confirmer mon profil" onPress={saveProfile}/>{targets?<View style={{gap:12}}><View style={ui.divider}/><Text style={ui.label}>POINT DE DÉPART, À AJUSTER</Text><View style={ui.wrap}><View style={s.target}><Text style={[ui.num,{fontSize:28}]}>{targets.calories}</Text><Text style={ui.small}>kcal / jour estimées</Text></View><View style={s.target}><Text style={[ui.num,{fontSize:28}]}>{targets.protein} g</Text><Text style={ui.small}>de protéines / jour</Text></View></View><Text style={ui.small}>Le besoin réel varie. Observe ta moyenne de poids, ton appétit et ta récupération pendant deux à trois semaines avant d’ajuster les portions.</Text></View>:null}</Card>
    <Card><SectionTitle title="Comment tu te sens aujourd’hui" kicker="RÉCUPÉRATION" subtitle="La fatigue est une information. Elle sert à adapter la séance."/><Field label="Sommeil de la nuit passée (heures)" value={sleepHours} onChange={setSleepHours} numeric placeholder="7,5"/><Text style={ui.small}>Énergie du jour</Text><View style={ui.wrap}>{[[1,'À plat'],[2,'Fatigué'],[3,'Correct'],[4,'En forme'],[5,'Très bien']].map(([value,label])=><Tag key={value} active={Number(energy)===value} onPress={()=>setEnergy(value)}>{value} · {label}</Tag>)}</View><Field label="À retenir aujourd’hui" value={note} onChange={setNote} multiline placeholder="Ex. grosse journée de stage, mais j’ai préparé mon sac et fait 20 minutes." maxLength={4000}/><View style={ui.divider}/><SectionTitle title="Rends le départ plus facile" subtitle="Un petit déclencheur concret vaut mieux que d’attendre la motivation."/><Field label="Mon créneau habituel" value={preferences.trainingTime} onChange={value=>setPreferences(prev=>({...prev,trainingTime:value}))} placeholder="Ex. lundi, mercredi et vendredi après le stage" maxLength={300}/><Field label="Ce qui me bloque le plus" value={preferences.barrier} onChange={value=>setPreferences(prev=>({...prev,barrier:value}))} placeholder="Ex. rentrer chez moi avant la salle" maxLength={500}/><Field label="Mon premier geste facile" value={preferences.anchor} onChange={value=>setPreferences(prev=>({...prev,anchor:value}))} placeholder="Ex. mettre mes affaires de sport dès la sortie du stage" maxLength={500}/><Button title="Enregistrer mon bilan" onPress={saveDay} secondary/><Notice>Si tu es trop fatigué, choisis la version courte ou récupère. Une séance manquée n’efface pas tes efforts : reprends au prochain créneau, sans doubler le volume.</Notice></Card>
    <Card><SectionTitle title="Garde une copie de tes progrès" kicker="DONNÉES & CONFIDENTIALITÉ" right={<Icon name="lock" color={C.accent}/>}/><Text style={ui.body}>Ton journal est enregistré sur cet appareil. Changer de navigateur ou effacer ses données peut le supprimer. Exporte une copie régulièrement pour pouvoir le retrouver.</Text><Text style={ui.small}>La sauvegarde contient ton profil, tes séances, tes repas, tes notes de compléments, ton journal et tes photos de suivi. Elle est personnelle : conserve-la dans un espace privé. Aucune clé d’IA n’est enregistrée dans ce fichier.</Text><Button title="Exporter ma sauvegarde (.json)" onPress={exportData}/><Button title={importOpen?'Fermer l’import':'Importer une sauvegarde'} onPress={()=>{setImportOpen(v=>!v);setPending(null);}} secondary/>{importOpen?<View style={{gap:14}}><View style={ui.divider}/>{Platform.OS==='web'?<Button title="Choisir un fichier JSON" onPress={chooseBackup} secondary/>:null}<Field label={Platform.OS==='web'?'Ou coller le contenu d’une sauvegarde':'Coller le contenu de ta sauvegarde JSON'} value={importText} onChange={setImportText} multiline placeholder={'{"app":"YProgress", …}'} maxLength={8*1024*1024}/><Button title="Vérifier le contenu" onPress={()=>inspectBackup(importText)} disabled={!importText.trim()} secondary/>{pending?.ok?<View style={{gap:12,padding:18,backgroundColor:C.bg,borderRadius:13,borderWidth:1,borderColor:C.line}}><Text style={ui.heading}>Sauvegarde prête à restaurer</Text><Text style={ui.small}>{backupName}</Text><View style={ui.wrap}><Tag>{pending.summary.weights} pesées</Tag><Tag>{pending.summary.sessions} séances</Tag><Tag>{pending.summary.days} jours</Tag><Tag>{pending.summary.photos} photos</Tag></View><Notice tone="warn">Restaurer remplace les données actuelles de l’application. Exporte d’abord la version actuelle si tu veux la conserver.</Notice><Button title="Exporter les données actuelles" onPress={exportData} secondary/><Button title={restoring?'Restauration…':'Restaurer cette sauvegarde'} onPress={restoreData} disabled={restoring}/><Pressable accessibilityRole="button" onPress={()=>setPending(null)}><Text style={[ui.small,{textAlign:'center'}]}>Annuler la restauration</Text></Pressable></View>:null}</View>:null}</Card>
    <View style={{alignItems:'center',gap:5,padding:15}}><Text style={[ui.label,{color:C.faint}]}>YPROGRESS · VERSION 18</Text><Text style={[ui.small,{textAlign:'center'}]}>Ta progression mérite d’être mesurée. Ta valeur n’a pas à l’être.</Text></View>
  </View>;
}

const s=StyleSheet.create({target:{backgroundColor:C.bg,padding:16,borderRadius:12,gap:5,flexBasis:180,flexGrow:1}});
