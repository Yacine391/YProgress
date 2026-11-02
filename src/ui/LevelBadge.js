import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,Modal,ScrollView,StyleSheet,Animated,Platform} from 'react-native';
import {C,ui,Card,Button,ProgressBar,Tag} from './kit';
import {XP_RULES} from '../core/xp';

const KINDS={sets:'Séries',session:'Séances',record:'Records',mma:'MMA',weighIn:'Pesées',goal:'Objectif poids'};
const fmt=n=>Math.round(n).toLocaleString('fr-FR');
const shortDate=d=>new Intl.DateTimeFormat('fr-FR',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(d+'T12:00:00Z'));

function LevelSheet({xp,open,onClose}){
  const recent=xp.events.slice(-10).reverse();
  return <Modal visible={open} transparent animationType="fade" onRequestClose={onClose}><View style={st.backdrop}><ScrollView style={st.modal} contentContainerStyle={{gap:18,padding:20}}>
    <View style={ui.spread}><View style={{flex:1,gap:6}}><Text style={ui.label}>TON NIVEAU</Text><Text style={ui.title}>Niveau {xp.level} · {xp.title}</Text></View><Button title="Fermer" secondary onPress={onClose}/></View>
    <View style={{gap:8}}><ProgressBar value={xp.current} max={xp.needed}/><Text style={ui.small}>{fmt(xp.current)} / {fmt(xp.needed)} XP · encore {fmt(xp.needed-xp.current)} XP pour le niveau {xp.level+1}. Total : {fmt(xp.total)} XP.</Text></View>
    <View style={ui.wrap}>{Object.entries(KINDS).map(([k,label])=><Tag key={k}>{label} · {fmt(xp.byKind[k]||0)} XP</Tag>)}</View>
    <Card><Text style={ui.heading}>Comment gagner de l’XP</Text>
      <Text style={ui.body}>• Chaque série cochée : {XP_RULES.setBase} XP + 1 XP par {XP_RULES.volumePerXp} kg soulevés (charge × répétitions), jusqu’à {XP_RULES.setCap} XP. Plus c’est lourd, plus ça rapporte.</Text>
      <Text style={ui.body}>• Séance terminée : +{XP_RULES.session} XP.</Text>
      <Text style={ui.body}>• Nouveau record de charge sur un exercice : +{XP_RULES.record} XP.</Text>
      <Text style={ui.body}>• Cours de MMA fait : +{XP_RULES.mma} XP.</Text>
      <Text style={ui.body}>• Pesée enregistrée : +{XP_RULES.weighIn} XP. Chaque tranche de {String(XP_RULES.goalStepKg).replace('.',',')} kg gagnée dans le sens de ton objectif : +{XP_RULES.goalStep} XP.</Text>
      <Text style={ui.small}>L’XP est recalculée à partir de ce que tu as vraiment enregistré : annuler ou corriger une séance met ton niveau à jour.</Text>
    </Card>
    <View style={{gap:10}}><Text style={ui.heading}>Derniers gains</Text>{recent.length?recent.map((e,i)=><View key={i} style={ui.spread}><Text style={[ui.body,{flex:1}]}>{shortDate(e.date)} · {e.label}</Text><Text style={{color:C.ink,fontWeight:'700'}}>+{fmt(e.xp)}</Text></View>):<Text style={ui.body}>Termine ta première séance pour gagner tes premiers points.</Text>}</View>
  </ScrollView></View></Modal>;
}

export default function LevelBadge({xp,ready}){
  const [open,setOpen]=useState(false),[gain,setGain]=useState(null);
  const prev=useRef(null),fade=useRef(new Animated.Value(0)).current,timer=useRef(null);
  useEffect(()=>{
    if(!ready)return;
    const before=prev.current;prev.current={total:xp.total,level:xp.level};
    if(!before||xp.total<=before.total)return;
    setGain({xp:xp.total-before.total,levelUp:xp.level>before.level?xp.level:null});
    Animated.timing(fade,{toValue:1,duration:180,useNativeDriver:Platform.OS!=='web'}).start();
    clearTimeout(timer.current);
    timer.current=setTimeout(()=>Animated.timing(fade,{toValue:0,duration:400,useNativeDriver:Platform.OS!=='web'}).start(()=>setGain(null)),3500);
  },[ready,xp.total,xp.level]);
  useEffect(()=>()=>clearTimeout(timer.current),[]);
  return <View>
    <Pressable accessibilityRole="button" accessibilityLabel={`Niveau ${xp.level}, ${xp.title}, ${xp.current} sur ${xp.needed} XP. Voir le détail.`} onPress={()=>setOpen(true)} style={({pressed})=>[st.badge,pressed&&{opacity:.7}]}>
      <View style={st.level}><Text style={st.levelText}>{xp.level}</Text></View>
      <View style={{gap:4,width:76}}><Text numberOfLines={1} style={[ui.small,{color:C.ink,fontWeight:'700',lineHeight:14}]}>{xp.title}</Text><ProgressBar value={xp.current} max={xp.needed}/><Text numberOfLines={1} style={[ui.small,{fontSize:10,lineHeight:12}]}>{fmt(xp.current)}/{fmt(xp.needed)} XP</Text></View>
    </Pressable>
    {gain?<Animated.View accessibilityRole="alert" pointerEvents="none" style={[st.gain,{opacity:fade}]}><Text style={st.gainText}>+{fmt(gain.xp)} XP</Text>{gain.levelUp?<Text style={[st.gainText,{fontSize:12}]}>Niveau {gain.levelUp} atteint !</Text>:null}</Animated.View>:null}
    <LevelSheet xp={xp} open={open} onClose={()=>setOpen(false)}/>
  </View>;
}

const st=StyleSheet.create({
  badge:{flexDirection:'row',alignItems:'center',gap:9,paddingVertical:5,paddingLeft:5,paddingRight:11,borderRadius:12,borderWidth:1,borderColor:C.line,backgroundColor:C.panel},
  level:{width:34,height:34,borderRadius:9,backgroundColor:C.accent,alignItems:'center',justifyContent:'center'},
  levelText:{color:C.accentInk,fontWeight:'900',fontSize:15,fontVariant:['tabular-nums']},
  gain:{position:'absolute',top:52,right:0,zIndex:10,paddingVertical:8,paddingHorizontal:12,borderRadius:10,backgroundColor:C.accent,alignItems:'flex-end',...(Platform.OS==='web'?{boxShadow:'0 4px 16px rgba(0,0,0,.12)'}:{})},
  gainText:{color:C.accentInk,fontWeight:'800',fontSize:15},
  backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.35)',padding:18,justifyContent:'center',alignItems:'center'},
  modal:{width:'100%',maxWidth:570,maxHeight:'92%',backgroundColor:C.panel,borderColor:C.line,borderWidth:1,borderRadius:14}
});
