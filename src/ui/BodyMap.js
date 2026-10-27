import React from 'react';
import {View,Text,Pressable} from 'react-native';
import Svg,{Path,Circle,Ellipse} from 'react-native-svg';
import {C,ui} from './kit';

// Schematic navigation aid, deliberately not a diagnostic anatomical illustration.
export default function BodyMap({active='chest',onSelect,compact=false}){
  const tint=id=>active===id?C.accent:C.line;
  const areas=[['chest','Pectoraux'],['shoulders','Épaules'],['arms','Bras'],['back','Dos'],['legs','Jambes'],['core','Sangle abdominale']];
  return <View style={{flexDirection:'row',alignItems:'center',gap:compact?12:25}}>
    <Svg width={compact?116:155} height={compact?195:260} viewBox="0 0 150 250" accessibilityLabel="Silhouette musculaire schématique, repères de face et du dos">
      <Circle cx="75" cy="22" r="16" fill={C.line}/><Path d="M65 39h20l5 15 22 7 12 57-13 5-15-43-3 54 9 89-15 4-12-66-12 66-15-4 9-89-3-54-15 43-13-5 12-57 22-7Z" fill={C.raised} stroke={C.faint} strokeWidth="1"/>
      <Path d="M59 61q9-7 14 0v29q-18 3-20-10Zm32 0q-9-7-14 0v29q18 3 20-10Z" fill={tint('chest')}/>
      <Ellipse cx="47" cy="69" rx="8" ry="13" fill={tint('shoulders')}/><Ellipse cx="103" cy="69" rx="8" ry="13" fill={tint('shoulders')}/>
      <Path d="m39 83 10 3-8 26-9-2Zm72 0-10 3 8 26 9-2Z" fill={tint('arms')}/>
      {active==='back'?<Path d="M57 62 75 56 93 62 91 96 83 118 75 129 67 118 59 96Z" fill={C.accent}/>:<><Path d="M62 96h26l-4 36H66Z" fill={tint('core')}/><Path d="M75 97v34M63 108h24M65 120h20" stroke={C.bg} strokeWidth="2"/></>}
      <Path d="m58 140 13 3-9 49-10-1Zm34 0-13 3 9 49 10-1Z" fill={tint('legs')}/><Path d="M52 199h10l-3 20-8-2Zm46 0H88l3 20 8-2Z" fill={active==='calves'?C.accent:tint('legs')}/>
    </Svg>
    {!compact?<View style={{flex:1,gap:9}}>{areas.map(([id,label])=><Pressable key={id} onPress={()=>onSelect?.(id)} accessibilityRole="button" accessibilityState={{selected:active===id}} style={{paddingVertical:9,borderBottomWidth:1,borderBottomColor:C.line,flexDirection:'row',gap:9,alignItems:'center'}}><View style={{height:6,width:6,borderRadius:3,backgroundColor:active===id?C.accent:C.faint}}/><Text style={[ui.small,{color:active===id?C.accent:C.muted}]}>{label}</Text></Pressable>)}</View>:null}
  </View>;
}
