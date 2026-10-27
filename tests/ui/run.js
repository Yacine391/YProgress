/*
 * Real React server rendering of the six application screens.
 * Native primitives are substituted by minimal DOM hosts. This detects render/data
 * errors and responsive branches, not browser layout, animation effects, camera or live AI.
 */
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const Module=require('node:module');
const React=require('react');
const {renderToStaticMarkup}=require('react-dom/server');
const babel=require('@babel/core');
const root=path.resolve(__dirname,'../..');
const previousLoad=Module._load,previousJs=require.extensions['.js'],previousPng=require.extensions['.png'];
let screenWidth=390;
let renders=0;
const warnings=[];
const originalError=console.error;

function checkFinite(value,label='style'){
  if(typeof value==='number')assert(Number.isFinite(value),`${label} has a non-finite number`);
  else if(Array.isArray(value))for(const part of value)checkFinite(part,label);
  else if(value&&typeof value==='object')for(const [key,part]of Object.entries(value))checkFinite(part,`${label}.${key}`);
}
function plainStyle(style){
  if(typeof style==='function')style=style({pressed:false,hovered:false,focused:false});
  const value=Array.isArray(style)?Object.assign({},...style.filter(Boolean).map(plainStyle)):style||{};
  checkFinite(value);return value;
}
function host(tag,name){
  function Host({children,style,accessibilityLabel,accessibilityRole,accessibilityState,...props}){
    plainStyle(style);
    const safe={'data-native':name};
    if(accessibilityLabel)safe['aria-label']=accessibilityLabel;
    if(accessibilityRole)safe.role=accessibilityRole;
    if(accessibilityState?.selected!==undefined)safe['aria-selected']=accessibilityState.selected;
    return React.createElement(tag,safe,children);
  }
  Host.displayName=`Mock${name}`;return Host;
}
const rn={
  View:host('div','View'),Text:host('span','Text'),SafeAreaView:host('div','SafeAreaView'),ScrollView:host('div','ScrollView'),Pressable:host('button','Pressable'),ActivityIndicator:host('span','ActivityIndicator'),
  TextInput:({style,value,accessibilityLabel,placeholder,editable,multiline})=>{plainStyle(style);return React.createElement(multiline?'textarea':'input',{'aria-label':accessibilityLabel,value:value??'',placeholder,disabled:editable===false,readOnly:true});},
  Image:({source,style,accessibilityLabel})=>{plainStyle(style);return React.createElement('img',{src:typeof source==='string'?source:source?.uri||'/asset-placeholder',alt:accessibilityLabel||''});},
  Modal:({visible,children})=>visible?React.createElement('div',{role:'dialog'},children):null,
  Platform:{OS:'web',select:value=>value.web??value.default},
  StyleSheet:{create:styles=>{checkFinite(styles);return styles;},flatten:plainStyle,absoluteFill:{position:'absolute',top:0,left:0,right:0,bottom:0},hairlineWidth:1},
  useWindowDimensions:()=>({width:screenWidth,height:844,scale:1,fontScale:1}),
  Linking:{openURL:async()=>{}},Share:{share:async()=>({action:'sharedAction'})},Alert:{alert:()=>{}},
  AccessibilityInfo:{isReduceMotionEnabled:async()=>false,addEventListener:()=>({remove:()=>{}})},
  AppState:{addEventListener:()=>({remove:()=>{}})},Dimensions:{get:()=>({width:screenWidth,height:844})}
};
function svgHost(tag){return function SvgHost({children,style,accessibilityLabel,accessibilityRole,accessible,testID,...props}){plainStyle(style);for(const [key,value]of Object.entries(props))if(typeof value==='number'||typeof value==='string')assert(!/NaN|Infinity/.test(String(value)),`SVG ${tag}.${key} contains an invalid coordinate`);return React.createElement(tag,{...props,...(accessibilityLabel?{'aria-label':accessibilityLabel}:{}),...(accessibilityRole?{role:accessibilityRole}:{}),...(testID?{'data-testid':testID}:{})},children)}}
const svg={__esModule:true,default:svgHost('svg')};
for(const tag of ['Path','Circle','Line','Polyline','Rect','Ellipse','Text','Polygon','G','Defs','LinearGradient','Stop','ClipPath'])svg[tag]=svgHost(tag==='Text'?'text':tag[0].toLowerCase()+tag.slice(1));
const picker={requestMediaLibraryPermissionsAsync:async()=>({granted:true}),requestCameraPermissionsAsync:async()=>({granted:true}),launchImageLibraryAsync:async()=>({canceled:true}),launchCameraAsync:async()=>({canceled:true})};

Module._load=function(request,parent,isMain){
  if(request==='react-native')return rn;
  if(request==='react-native-svg')return svg;
  if(request==='expo-image-picker')return picker;
  return previousLoad.apply(this,arguments);
};
require.extensions['.png']=(module,filename)=>{module.exports=filename};
require.extensions['.js']=function(module,filename){
  if(filename.startsWith(root+path.sep)&&!filename.includes(path.sep+'node_modules'+path.sep)&&!filename.includes(path.sep+'tests'+path.sep)){
    const result=babel.transformSync(fs.readFileSync(filename,'utf8'),{filename,babelrc:false,configFile:false,plugins:[require('@babel/plugin-transform-react-jsx'),require('@babel/plugin-transform-modules-commonjs')]});
    return module._compile(result.code,filename);
  }
  return previousJs(module,filename);
};
console.error=(...args)=>{warnings.push(args.map(String).join(' '));};
function deepFreeze(value){if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;}
const noAction=()=>{};
function render(Screen,data,{width=390,today='2026-10-27',routeDate}={}){
  screenWidth=width;
  const markup=renderToStaticMarkup(React.createElement(Screen,{data,update:noAction,today,notify:noAction,navigate:noAction,routeDate}));
  assert(markup.length>200,'Screen produced no meaningful markup');assert(!/(?:>NaN<|>Infinity<|undefined kg)/.test(markup),'Screen rendered malformed data');renders++;return markup;
}
try{
  const {defaultData}=require('../../src/core/appState.js');
  const screens=Object.fromEntries(['Home','Training','Nutrition','Progress','Coach','Profile'].map(name=>[name,require(`../../src/ui/${name}Screen.js`).default]));
  const empty=deepFreeze(defaultData());
  const rich=defaultData();
  rich.profile={...rich.profile,confirmed:true,weight:57.8};
  rich.weights=[{date:'2026-10-27',weight:57},{date:'2026-11-02',weight:57.2},{date:'2026-11-09',weight:57.5},{date:'2026-11-16',weight:57.8}];
  rich.days={'2026-11-16':{energy:'2',bag:true,mealBreak:true,water:1500,sleepHours:'7.5',meals:[{id:'meal-a',name:'Poulet et riz',calories:620,protein:38,carbs:75,fat:18},{id:'meal-b',name:'Yaourt',calories:140,protein:14,carbs:12,fat:4}]},'2026-11-17':{mma:true,mmaNote:'Technique et mobilité'},'2026-11-19':{mma:true}};
  rich.sessions=[{id:'lower-real',date:'2026-11-16',type:'strength',title:'Lower A · bas du corps',mode:'normal',durationMin:64,note:'Bonne technique',sets:[{exerciseId:'leg-press',load:35,reps:10,rir:3,done:true},{exerciseId:'leg-press',load:35,reps:10,rir:2,done:true}]},{id:'upper-short',date:'2026-11-13',type:'strength',title:'Upper B · essentiel',mode:'express',durationMin:22,sets:[{exerciseId:'cable-row',load:15,reps:10,rir:3,done:true}]},{id:'first-real',date:'2026-10-26',type:'strength',title:'Upper A · haut du corps',mode:'normal',durationMin:50,sets:[{exerciseId:'db-curl',load:5,reps:12,rir:3,done:true}]}];
  rich.supplements.whey={brand:'Produit test',servingGrams:'30',proteinPer100g:'80',caloriesPer100g:'390',carbsPer100g:'6',fatPer100g:'6',notes:'Dosette pesée'};
  rich.supplements.creatine={brand:'Monohydrate test',servingGrams:'3',creatinePerServing:'3',notes:'Poudre pure'};
  rich.measurements=[{date:'2026-11-16',arm:29,chest:87,waist:73,thigh:48}];
  rich.photos=[{id:'progress-1',date:'2026-11-16',uri:'data:image/png;base64,iVBORw0KGgo='}];
  rich.chat=[{id:'u1',role:'user',text:'Je suis fatigué après le stage',at:'2026-11-16T18:00:00Z'},{id:'a1',role:'assistant',text:'Choisis une séance courte si tu récupères bien, ou du repos.',at:'2026-11-16T18:00:01Z'}];
  rich.drafts={'2026-11-16:lowerA:normal':{startedAt:Date.now()-20*60000,sets:{'leg-press':[{load:'35',reps:'10',rir:'3',done:true},{load:'35',reps:'10',rir:'2',done:false}]},overrides:{},note:'Réglage siège 3'}};
  deepFreeze(rich);
  for(const width of [390,1440])for(const [fixture,data,today]of [['empty',empty,'2026-10-27'],['recorded',rich,'2026-11-16']])for(const [name,Screen]of Object.entries(screens)){
    render(Screen,data,{width,today});console.log(`PASS render ${name}, ${fixture}, ${width}px`);
  }
  const cycleFixture=defaultData();cycleFixture.sessions=[rich.sessions.find(s=>s.id==='first-real')];deepFreeze(cycleFixture);
  const calendar=[['2026-10-26','Upper A'],['2026-10-27','MMA au club'],['2026-10-28','Lower A'],['2026-10-29','MMA au club'],['2026-10-30','Upper B'],['2026-10-31','Récupération'],['2026-11-01','Récupération'],['2026-11-02','Lower A'],['2026-11-03','MMA au club'],['2026-11-04','Upper A'],['2026-11-05','MMA au club'],['2026-11-06','Lower B'],['2026-11-07','Récupération'],['2026-11-08','Récupération']];
  for(const width of [390,1440])for(const [routeDate,expected] of calendar){
    const html=render(screens.Training,cycleFixture,{width,today:'2026-11-08',routeDate});
    assert(html.includes(expected),`Wrong training branch for ${routeDate}`);console.log(`PASS training calendar branch ${routeDate}, ${width}px`);
    if(expected==='Récupération')assert(!html.includes('Démarrer la séance'),'Weekend recovery must not offer a strength workout');
  }
  for(const width of [390,1440]){
    const html=render(screens.Training,empty,{width,today:'2027-01-19',routeDate:'2027-01-20'});
    assert(html.includes('Lower A'),'An unstarted programme must begin with cycle week 1 even months after October');
    const home=render(screens.Home,empty,{width,today:'2027-01-19'});
    assert(home.includes('2027-01-18: Upper')&&home.includes('2027-01-20: Lower')&&home.includes('2027-01-22: Upper'),'Home calendar must agree with the unstarted programme cycle');
  }
  const mobile=render(screens.Home,empty,{width:390}),desktop=render(screens.Home,empty,{width:1440});
  assert(!mobile.includes('6 mois, un jour à la fois')&&desktop.includes('6 mois, un jour à la fois'),'Window width must actually select responsive content');
  const progress=render(screens.Progress,rich,{width:390,today:'2026-11-16'});
  assert(progress.includes('Bonne technique')&&progress.includes('64 min'),'Progress journal must render recorded session fields');
  assert(progress.includes('Courbe de 4 pesées réelles'),'Weight chart must use real recorded points');
  const nutrition=render(screens.Nutrition,rich,{width:390,today:'2026-11-16'});
  assert(nutrition.includes('Poulet et riz')&&nutrition.includes('760'),'Nutrition screen must render the real meal journal and total');
  const {EXERCISES}=require('../../src/core/trainingPlan.js');
  const ExerciseDemo=require('../../src/ui/ExerciseDemo.js').default;
  for(const width of [390,1440])for(const exercise of EXERCISES){
    screenWidth=width;
    const html=renderToStaticMarkup(React.createElement(ExerciseDemo,{exercise,playing:false,onToggle:noAction}));renders++;
    assert(html.includes('<svg')&&/<(?:path|line|polyline|circle|ellipse|rect)\b/.test(html),'Every exercise must render a local SVG demonstration');
    assert(!/<(?:iframe|video)\b|youtube|musclewiki\.com|(?:href|src)="https?:\/\//i.test(html),'A demonstration must render locally without an external player or asset');
    assert(!/NaN|Infinity/.test(html),'Animation geometry must stay finite');
    console.log(`PASS local exercise illustration ${exercise.id}, ${width}px`);
  }
  assert.equal(warnings.length,0,`React warnings during render:\n${warnings.join('\n')}`);
  console.log(`${renders} real React renders passed (390/1440px; six screens; empty/recorded data; two-week Upper/Lower/MMA/weekend calendar; local exercise SVGs).`);
  console.log('Scope: render/data validation only. Browser layout, animation timing, effects, interactions, camera and live AI are not exercised.');
}finally{
  Module._load=previousLoad;require.extensions['.js']=previousJs;
  if(previousPng)require.extensions['.png']=previousPng;else delete require.extensions['.png'];
  console.error=originalError;
}
