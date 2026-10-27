import React,{useEffect,useState} from 'react';
import {View,Text,Image,StyleSheet,Pressable,ActivityIndicator,Platform} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import {Card,Button,Field,Tag,SectionTitle,Notice,C,ui,Icon} from './kit';
import {coachHealth,sendCoach,preparePickedImage,buildCoachContext,numeric} from '../services/coachClient';
import {nutritionForPortion,validateNutrition} from '../core/nutrition';

const MACROS=[['calories','Calories (kcal)'],['protein','Protéines (g)'],['carbs','Glucides (g)'],['fat','Lipides (g)']];
const fr=n=>Number(n||0).toLocaleString('fr-FR',{maximumFractionDigits:1});
function statusText(health){if(!health)return 'Vérification…';if(health.error)return 'Serveur inaccessible';const c=health.coach||{};if(c.status==='MISSING_KEY')return 'Clé IA à configurer';if(c.status==='MALFORMED_KEY')return 'Clé IA à vérifier';return 'Serveur prêt · IA à tester';}
function NutritionReview({analysis,portion,setPortion,onSave,onSaveLabel,mode}){
 const [name,setName]=useState(mode==='label'?'Produit photographié':'Repas photographié');
 const originalValues=mode==='label'&&analysis.per100g?analysis.per100g:analysis;
 const [values,setValues]=useState(()=>Object.fromEntries(MACROS.map(([key])=>[key,originalValues[key]===null||originalValues[key]===undefined?'':String(originalValues[key])])));
 const [saved,setSaved]=useState(false),[error,setError]=useState('');
 const parsed=Object.fromEntries(MACROS.map(([key])=>[key,numeric(values[key])]));
 const per100g=analysis.basis==='per100g'||(mode==='label'&&Boolean(analysis.per100g));
 const checked=validateNutrition(parsed,{per100g});
 const valid=checked.valid&&checked.complete;
 const grams=numeric(portion);const portionValid=grams!==null&&grams>0&&grams<=5000;
 const result=per100g?(portionValid?nutritionForPortion(parsed,grams):null):parsed;
 const ready=valid&&Boolean(result)&&analysis.basis!=='unknown'&&(!per100g||portionValid);
 function save(){if(!name.trim()){setError('Donne un nom au produit ou au repas.');return;}if(!ready){setError('Complète les valeurs et la quantité réellement consommée.');return;}onSave({...result,name:name.trim(),portionGrams:per100g?grams:analysis.portionGrams,source:mode==='label'?'label-confirmed':'photo-estimate',confidence:analysis.confidence});setSaved(true);}
 return <Card style={{borderColor:C.olive}}><SectionTitle kicker="À VÉRIFIER AVANT ENREGISTREMENT" title={per100g?'Étiquette · valeurs pour 100 g':analysis.basis==='portion'?'Estimation de ta portion':'Quantités à préciser'} right={<Tag color={C.orange}>Confiance {({low:'faible',medium:'moyenne',high:'élevée'})[analysis.confidence]||'inconnue'}</Tag>}/>
 <Text style={ui.body}>{analysis.notes||'Vérifie les aliments et les quantités : une photo ne permet pas de mesurer exactement une portion.'}</Text>
 {analysis.basis==='unknown'?<Notice tone="warn">Le coach n’a pas pu établir la base de calcul. Ne l’ajoute pas directement au journal : précise la quantité au coach ou saisis les valeurs connues dans Nutrition.</Notice>:null}
 <Field label="Nom dans mon journal" value={name} onChange={setName}/>
 <Text style={ui.label}>{per100g?'VALEURS POUR 100 G DE PRODUIT':'VALEURS POUR LA PORTION DÉCRITE'}</Text>
 <View style={ui.wrap}>{MACROS.map(([key,label])=><Field key={key} style={{flexBasis:110}} numeric label={label} value={values[key]} onChange={v=>setValues(p=>({...p,[key]:v}))}/>)}</View>
 {per100g?<Field label="Quantité réellement consommée (g)" value={portion} numeric onChange={setPortion} placeholder="Ex. 125"/>:analysis.portionGrams?<Text style={ui.small}>Portion estimée : {fr(analysis.portionGrams)} g. Si elle est incorrecte, demande un recalcul au coach.</Text>:null}
 {result&&ready?<View style={s.portionSummary}><Text style={[ui.small,{color:C.accent,fontWeight:'700'}]}>Ta portion confirmée</Text><Text style={ui.body}>{fr(result.calories)} kcal · P {fr(result.protein)} g · G {fr(result.carbs)} g · L {fr(result.fat)} g</Text></View>:null}
 {checked.errors.length?<Text style={{color:C.red,fontSize:12}}>Vérifie les unités : les valeurs de l’étiquette doivent correspondre à 100 g, pas à plusieurs portions.</Text>:null}
 {error?<Text style={{color:C.red,fontSize:12}}>{error}</Text>:null}
 <Button title={saved?'✓ Portion ajoutée au journal':'Je confirme et j’ajoute ma portion'} disabled={!ready||saved} onPress={save}/>
 {mode==='label'&&per100g?<Button secondary disabled={!valid} title="Copier ces valeurs dans ma fiche whey" onPress={()=>{if(valid){onSaveLabel(parsed);setError('');}}}/>:null}
 <Text style={ui.small}>L’ajout reste manuel. Les huiles, sauces et ingrédients cachés peuvent modifier fortement l’estimation d’un plat.</Text>
 </Card>
}
export default function CoachScreen({data,update,today,notify,navigate}){
 const [health,setHealth]=useState(null),[checking,setChecking]=useState(false),[message,setMessage]=useState(''),[mode,setMode]=useState('chat'),[photo,setPhoto]=useState(null),[portion,setPortion]=useState(''),[busy,setBusy]=useState(false),[picking,setPicking]=useState(false),[error,setError]=useState(''),[analysis,setAnalysis]=useState(null),[lastMode,setLastMode]=useState('meal'),[tested,setTested]=useState(false);
 const messages=(data.chat||[]).slice(-16);
 const hasPreviousAnalysis=(data.chat||[]).some(m=>m.role==='assistant'&&m.nutrition);
 const canFollowUp=mode!=='chat'&&!photo&&hasPreviousAnalysis;
 async function check(){setChecking(true);try{setHealth(await coachHealth());}catch(e){setHealth({error:e.message});}finally{setChecking(false);}}
 useEffect(()=>{let active=true;coachHealth().then(result=>{if(active)setHealth(result);}).catch(e=>{if(active)setHealth({error:e.message});});return ()=>{active=false;};},[]);
 async function selectPhoto(camera=false){if(busy||picking)return;setPicking(true);setError('');try{
   if(camera){const p=await ImagePicker.requestCameraPermissionsAsync();if(!p.granted)throw new Error('Autorise l’appareil photo pour prendre une photo, ou utilise la galerie.');}else if(Platform.OS!=='web'){const p=await ImagePicker.requestMediaLibraryPermissionsAsync();if(!p.granted)throw new Error('Autorise l’accès aux photos pour sélectionner une image.');}
   const options={mediaTypes:['images'],quality:.5,base64:true,allowsEditing:false};
   const result=camera?await ImagePicker.launchCameraAsync(options):await ImagePicker.launchImageLibraryAsync(options);
   if(!result.canceled&&result.assets?.[0]){setPhoto(await preparePickedImage(result.assets[0]));if(mode==='chat')setMode('meal');}
  }catch(e){setError(e.message||'La photo n’a pas pu être chargée.');}finally{setPicking(false);}}
 async function send(override){if(busy)return;const text=typeof override==='string'?override:message.trim();if(!text&&!photo){setError('Écris une question ou sélectionne une photo.');return;}if(mode!=='chat'&&!photo&&!hasPreviousAnalysis){setError('Ajoute la photo du plat ou de l’étiquette à analyser.');return;}const grams=numeric(portion);if(portion.trim()&&(grams===null||grams<=0||grams>5000)){setError('Indique une quantité entre 1 et 5 000 g, ou laisse ce champ vide.');return;}
   const sentMode=photo?mode:'chat';const prompt=text||(mode==='label'?'Lis cette étiquette. Distingue les valeurs pour 100 g, la portion du fabricant et la portion consommée. Ne devine pas les chiffres illisibles.':'Estime ce plat, en précisant les ingrédients et les quantités incertaines. Demande les informations manquantes.');
   setBusy(true);setError('');setAnalysis(null);
   update(prev=>({...prev,chat:[...(prev.chat||[]),{id:`user-${Date.now()}`,role:'user',text:prompt,hasImage:!!photo,mode:sentMode,at:new Date().toISOString()}].slice(-40)}));
   try{const result=await sendCoach({message:prompt,context:buildCoachContext(data,today),mode:sentMode,...(photo?{imageDataUrl:photo.dataUrl}:{}),...(grams?{portionGrams:grams}:{})});const reply=result.reply||result.message;if(!reply||typeof reply!=='string')throw new Error('Le serveur a répondu sans texte utilisable. Réessaie.');
     update(prev=>({...prev,chat:[...(prev.chat||[]),{id:`assistant-${Date.now()}`,role:'assistant',text:reply,at:new Date().toISOString(),model:result.model,...(result.nutrition?{nutrition:result.nutrition}:{})}].slice(-40)}));setTested(true);setMessage('');setPhoto(null);if(result.nutrition){setAnalysis(result.nutrition);setLastMode(sentMode);}
   }catch(e){setError(e.message||'Le coach est momentanément indisponible. Tes données n’ont pas été ajoutées au journal.');}
   finally{setBusy(false);}
 }
 function addNutrition(values){const meal={...values,id:`photo-${Date.now()}`,createdAt:new Date().toISOString()};update(prev=>({...prev,days:{...prev.days,[today]:{...prev.days?.[today],meals:[...(prev.days?.[today]?.meals||[]),meal]}}}));notify('Portion confirmée ajoutée à ton journal.');}
 function saveLabel(values){update(prev=>({...prev,supplements:{...prev.supplements,whey:{...prev.supplements?.whey,proteinPer100g:String(values.protein),caloriesPer100g:String(values.calories),carbsPer100g:String(values.carbs),fatPer100g:String(values.fat)}}}));notify('Valeurs copiées dans ta fiche whey. Vérifie aussi la marque et la dosette.');}
 return <View style={ui.page}>
 <View style={{gap:8}}><Text style={ui.label}>UNE QUESTION, UN PROCHAIN PAS</Text><Text style={ui.title}>Ton coach, à portée de main.</Text><Text style={ui.body}>Entraînement, fatigue, repas ou étiquettes : pars de ta situation réelle.</Text></View>
 <Card><View style={ui.spread}><View style={[ui.row,{flex:1}]}><View style={[s.statusDot,{backgroundColor:tested?C.accent:health?.coach?.keyConfigured?C.orange:C.faint}]}/><View style={{gap:3,flex:1}}><Text style={[ui.small,{color:C.ink,fontWeight:'700'}]}>{tested?'Dernière réponse IA reçue':statusText(health)}</Text><Text style={ui.small}>{tested?'Le dernier échange a bien atteint le fournisseur IA.':'Un diagnostic de configuration ne garantit pas une réponse du modèle.'}</Text></View></View><Button secondary title={checking?'…':'Vérifier'} disabled={checking} onPress={check}/></View>{health?.error?<Notice tone="warn">{health.error}</Notice>:health?.coach?.status==='MISSING_KEY'||health?.coach?.status==='MALFORMED_KEY'?<Notice tone="warn">{health.coach.hint||'Ajoute une clé IA valide dans la configuration serveur, puis redémarre le serveur. Aucune clé ne doit être placée dans le navigateur.'}</Notice>:null}</Card>
 <View style={ui.wrap}>{[['chat','Question au coach'],['meal','Photo de mon plat'],['label','Étiquette / emballage']].map(([id,label])=><Tag key={id} active={mode===id} onPress={()=>{setMode(id);setAnalysis(null);}}>{label}</Tag>)}</View>
 <Card style={{gap:20}}>
 {messages.length?<View style={{gap:14}}>{messages.map(item=><View key={item.id} style={[s.bubble,item.role==='user'?s.userBubble:s.assistantBubble]}><View style={ui.spread}><Text style={[ui.label,{color:item.role==='user'?C.accent:C.muted}]}>{item.role==='user'?'TOI':'COACH IA'}</Text>{item.hasImage?<Icon name="camera" size={14}/>:null}</View><Text selectable style={[ui.body,{color:C.ink}]}>{item.text||item.content}</Text></View>)}</View>:<View style={s.intro}><View style={s.coachIcon}><Icon name="brain" size={29} color={C.accent}/></View><Text style={ui.heading}>On commence par quoi ?</Text><Text style={[ui.body,{textAlign:'center',maxWidth:420}]}>Pas besoin d’avoir la journée parfaite. Dis-moi ce qui te bloque aujourd’hui.</Text><View style={[ui.wrap,{justifyContent:'center'}]}>{['Je suis KO après le stage','Que manger avant le MMA ?'].map(q=><Tag key={q} onPress={()=>{setMode('chat');setMessage(q);}}>{q}</Tag>)}</View></View>}
 {busy?<View accessibilityRole="alert" style={ui.row}><ActivityIndicator color={C.accent}/><Text style={ui.small}>Le coach prépare sa réponse…</Text></View>:null}
 <View style={ui.divider}/>
 {canFollowUp?<Notice>Tu peux poser une question sur la dernière analyse. Pour relire une étiquette ou un nouveau plat, joins une nouvelle photo. Pour changer la portion d’une étiquette, modifie directement les grammes dans la fiche de confirmation.</Notice>:null}
 {mode!=='chat'?<Notice>{mode==='meal'?'Photographie le plat entier. Si possible, indique le poids et les ingrédients : la photo donne une estimation, pas une mesure exacte.':'Photographie nettement le tableau nutritionnel et la portion indiquée. Pour la créatine, cadre aussi la quantité de créatine active par dose.'}</Notice>:null}
 {photo?<View style={ui.row}><Image accessibilityLabel="Photo sélectionnée avant envoi" source={{uri:photo.uri}} style={s.preview}/><View style={{flex:1,gap:8}}><Text style={ui.small}>Photo prête · {Math.round(photo.size/1024)} Ko</Text><Button secondary title="Retirer la photo" disabled={busy} onPress={()=>setPhoto(null)}/></View></View>:null}
 <Field label={mode==='chat'?'Ta question':'Informations utiles sur la photo'} value={message} onChange={setMessage} multiline placeholder={mode==='chat'?'Ex. je suis fatigué, adapte ma séance à 20 minutes…':'Ex. 125 g consommés, sauce à part, valeurs pour 100 g…'}/>
 {mode!=='chat'?<Field label="Quantité consommée si connue (g, facultatif)" value={portion} onChange={setPortion} numeric placeholder="Ex. 125"/>:null}
 <View style={ui.wrap}><Button icon="camera" secondary disabled={busy||picking} title={picking?'Préparation…':'Choisir une photo'} onPress={()=>selectPhoto(false)} style={{flexGrow:1}}/><Button secondary icon="camera" disabled={busy||picking} title="Prendre une photo" onPress={()=>selectPhoto(true)} style={{flexGrow:1}}/><Button title={busy?'Analyse en cours…':mode==='chat'||canFollowUp?'Envoyer au coach':'Analyser la photo'} disabled={busy||picking} onPress={()=>send()} style={{flexGrow:2}}/></View>
 {photo?<Text style={ui.small}>En appuyant sur « {mode==='chat'?'Envoyer au coach':'Analyser la photo'} », tu transmets cette photo au fournisseur IA configuré. La photo n’est pas enregistrée dans ton journal.</Text>:null}
 {error?<Notice tone="warn">{error}</Notice>:null}
 </Card>
 {analysis?<NutritionReview key={`${messages[messages.length-1]?.id||''}-${lastMode}`} analysis={analysis} portion={portion} setPortion={setPortion} onSave={addNutrition} onSaveLabel={saveLabel} mode={lastMode}/>:null}
 <Text style={ui.small}>Le coach peut se tromper. Vérifie les chiffres lisibles sur tes produits ; les estimations de repas restent approximatives. Les fiches whey et créatine se complètent dans Nutrition.</Text>
 </View>
}
const s=StyleSheet.create({statusDot:{height:8,width:8,borderRadius:4},intro:{paddingVertical:24,gap:15,alignItems:'center'},coachIcon:{height:64,width:64,borderRadius:20,backgroundColor:C.olive,alignItems:'center',justifyContent:'center',marginBottom:4},bubble:{padding:18,borderRadius:16,gap:10,width:'100%'},userBubble:{backgroundColor:C.olive,borderBottomRightRadius:4},assistantBubble:{backgroundColor:C.raised,borderBottomLeftRadius:4},preview:{width:92,height:100,borderRadius:12,backgroundColor:C.bg},portionSummary:{padding:15,borderRadius:12,backgroundColor:C.olive,gap:4}});
