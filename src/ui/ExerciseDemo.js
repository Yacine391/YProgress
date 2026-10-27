import React,{useEffect,useRef,useState} from 'react';
import {View,Text,Pressable,AccessibilityInfo,StyleSheet} from 'react-native';
import Svg,{G,Line,Polyline,Rect,Circle} from 'react-native-svg';
import {exercisePose} from '../core/exerciseMotion';

const INK='#393939',FAR='#A3A3A3',MATERIAL='#B7B7B7';
function Equipment({shape,index}){
  if(shape.type==='line')return <Line key={index} x1={shape.a[0]} y1={shape.a[1]} x2={shape.b[0]} y2={shape.b[1]} stroke={MATERIAL} strokeWidth={shape.width||4} strokeLinecap="round"/>;
  if(shape.type==='rect')return <Rect key={index} x={shape.x} y={shape.y} width={shape.width} height={shape.height} rx={3} fill="#D3D3D3"/>;
  return <Circle key={index} cx={shape.cx} cy={shape.cy} r={shape.r} fill="#DFDFDF" stroke="#A8A8A8" strokeWidth={2}/>;
}
function Limb({value,width}){return <Polyline points={[value.start,value.joint,value.end,...(value.toe?[value.toe]:[])].map(p=>p.join(',')).join(' ')} fill="none" stroke={value.far?FAR:INK} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round"/>;}
function Load({value}){return <G transform={`translate(${value.at[0]} ${value.at[1]}) rotate(${value.angle||0})`}><Line x1={-11} y1={0} x2={11} y2={0} stroke="#242424" strokeWidth={4}/><Rect x={-12} y={-6} width={5} height={12} rx={1.5} fill="#242424"/><Rect x={7} y={-6} width={5} height={12} rx={1.5} fill="#242424"/></G>;}
function Control({title,onPress,active=false,disabled=false}){return <Pressable accessibilityRole="button" accessibilityState={{selected:active,disabled}} accessibilityLabel={title} onPress={onPress} disabled={disabled} style={({pressed})=>[s.control,active&&s.active,pressed&&{opacity:.65},disabled&&{opacity:.4}]}><Text style={[s.controlText,active&&{color:'#FFFFFF'}]}>{title}</Text></Pressable>;}

/** One compact local loop. No external player, advertising or network request. */
export default function ExerciseDemo({exercise,playing=true,onToggle}){
  const id=exercise?.id||'';
  const [phase,setPhase]=useState(0),[running,setRunning]=useState(false),[slow,setSlow]=useState(false),[reduced,setReduced]=useState(false);
  const last=useRef(0),cursor=useRef(0);
  useEffect(()=>{
    let active=true;cursor.current=0;setPhase(0);setRunning(false);
    Promise.resolve(AccessibilityInfo?.isReduceMotionEnabled?.()||false).then(value=>{if(active){setReduced(!!value);setRunning(!!playing&&!value);}}).catch(()=>{if(active)setRunning(!!playing);});
    const subscription=AccessibilityInfo?.addEventListener?.('reduceMotionChanged',value=>{setReduced(!!value);if(value)setRunning(false);});
    return()=>{active=false;subscription?.remove?.();};
  },[id,playing]);
  useEffect(()=>{
    if(!running)return;
    last.current=Date.now();
    const timer=setInterval(()=>{const now=Date.now(),delta=Math.min(now-last.current,150);last.current=now;cursor.current=(cursor.current+delta/(slow?10400:5200))%1;setPhase(cursor.current);},50);
    return()=>clearInterval(timer);
  },[running,slow]);
  function toggle(){const next=!running;setRunning(next);onToggle?.(next);}
  function position(value){cursor.current=value;setPhase(value);setRunning(false);onToggle?.(false);}
  const pose=exercisePose(id,phase);
  if(!pose.supported)return <View style={s.box}><Text style={s.caption}>Aucune démonstration locale pour cet exercice personnalisé. Consulte les consignes de ton entraîneur.</Text></View>;
  return <View style={s.box}>
    <View style={s.header}><Text style={s.small}>{pose.view}</Text><Text style={s.small}>{exercise?.isTimed?'Posture tenue':'1 répétition · environ 5 s'}</Text></View>
    <Svg width="100%" height={244} viewBox="0 0 352 244" accessibilityRole="image" accessibilityLabel={`Personnage montrant ${exercise?.name||'le mouvement'}. ${pose.cue}`}>
      <Line x1={57} y1={229} x2={299} y2={229} stroke="#E2E2E2" strokeWidth={1}/>
      {pose.equipment.filter(x=>x.layer!=='front').map((shape,index)=><Equipment key={`back-${index}`} shape={shape}/>)}
      {pose.legs.filter(x=>x.far).map((value,index)=><Limb key={`leg-far-${index}`} value={value} width={8}/>)}
      {pose.arms.filter(x=>x.far).map((value,index)=><Limb key={`arm-far-${index}`} value={value} width={7}/>)}
      <Line x1={pose.neck[0]} y1={pose.neck[1]} x2={pose.shoulder[0]} y2={pose.shoulder[1]} stroke={INK} strokeWidth={9}/>
      <Line x1={pose.shoulder[0]} y1={pose.shoulder[1]} x2={pose.hip[0]} y2={pose.hip[1]} stroke={INK} strokeWidth={18} strokeLinecap="round"/>
      {pose.projection==='front'?<Line x1={158} y1={pose.shoulder[1]} x2={194} y2={pose.shoulder[1]} stroke={INK} strokeWidth={12} strokeLinecap="round"/>:null}
      {pose.legs.filter(x=>!x.far).map((value,index)=><Limb key={`leg-${index}`} value={value} width={10}/>)}
      {pose.arms.filter(x=>!x.far).map((value,index)=><Limb key={`arm-${index}`} value={value} width={8}/>)}
      <Circle cx={pose.head[0]} cy={pose.head[1]} r={11} fill="#565656"/>
      {pose.loads.map((value,index)=><Load key={`load-${index}`} value={value}/>)}
      {pose.equipment.filter(x=>x.layer==='front').map((shape,index)=><Equipment key={`front-${index}`} shape={shape}/>)}
    </Svg>
    <Text style={s.phase}>{exercise?.isTimed?'Garde la position, respire.':pose.phaseLabel}</Text>
    <Text style={s.caption}>{pose.cue}</Text>
    <View style={s.controls}><Control title={running?'Pause':'Lire le mouvement'} active={running} onPress={toggle}/><Control title={slow?'Vitesse × 0,5':'Ralenti × 0,5'} active={slow} onPress={()=>setSlow(v=>!v)}/></View>
    <View style={s.controls}><Control title="Position de départ" onPress={()=>position(0)}/><Control title={exercise?.isTimed?'Respiration':'Position d’arrivée'} onPress={()=>position(exercise?.isTimed ? .25 : .5)}/></View>
    {reduced&&!running?<Text style={s.small}>Animation en pause selon ta préférence de mouvement réduit. Tu peux utiliser les deux positions ou lancer la lecture.</Text>:null}
    <Text style={s.foot}>Schéma simplifié du geste. Garde les consignes de l’exercice comme repère.</Text>
  </View>;
}
const s=StyleSheet.create({box:{backgroundColor:'#FAFAFA',borderWidth:1,borderColor:'#E5E5E5',borderRadius:14,padding:16,gap:12},header:{flexDirection:'row',justifyContent:'space-between',gap:12,flexWrap:'wrap'},small:{fontSize:11,color:'#777777',lineHeight:17},phase:{fontSize:13,fontWeight:'700',color:'#444444',textAlign:'center'},caption:{fontSize:13,lineHeight:20,color:'#555555'},controls:{flexDirection:'row',flexWrap:'wrap',gap:8},control:{borderWidth:1,borderColor:'#D7D7D7',backgroundColor:'#FFFFFF',borderRadius:9,paddingHorizontal:12,paddingVertical:10,minHeight:40,flexGrow:1,alignItems:'center',justifyContent:'center'},active:{backgroundColor:'#333333',borderColor:'#333333'},controlText:{fontSize:12,fontWeight:'600',color:'#444444'},foot:{fontSize:10,lineHeight:16,color:'#8A8A8A'}});
