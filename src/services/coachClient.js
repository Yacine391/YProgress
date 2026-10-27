import {Platform} from 'react-native';
import {sumMeals} from '../core/nutrition';

const BASE_URL=(process.env.EXPO_PUBLIC_AI_BASE_URL||'').replace(/\/$/,'');
export const MAX_IMAGE_BYTES=2*1024*1024;
export function numeric(value){if(value===null||value===undefined||String(value).trim()==='')return null;const n=Number(String(value).replace(',','.'));return Number.isFinite(n)?n:null;}
function endpoint(path){if(Platform.OS!=='web'&&!BASE_URL)throw new Error('Pour l’application native, indique EXPO_PUBLIC_AI_BASE_URL avec l’adresse de ton serveur IA. Sur le web, lance le serveur inclus.');return BASE_URL+path;}
async function request(path,options={},timeoutMs=45000){
  const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
    const response=await fetch(endpoint(path),{...options,signal:controller.signal});
    const contentType=response.headers.get('content-type')||'';
    if(!contentType.includes('application/json'))throw new Error('Le serveur IA n’est pas accessible à cette adresse. Lance le serveur inclus ou vérifie la configuration du déploiement.');
    const result=await response.json();
    if(!response.ok||result.ok===false){const err=new Error(result.error?.message||result.message||result.hint||result.error||'La demande n’a pas abouti. Réessaie dans un instant.');err.code=result.code;throw err;}
    return result;
  }catch(error){if(error.name==='AbortError')throw new Error('Le coach met trop de temps à répondre. Réessaie avec une photo plus petite ou une question plus courte.');throw error;}
  finally{clearTimeout(timer);}
}
export function coachHealth(){return request('/api/health',{},10000);}
export function sendCoach(payload){return request('/api/coach',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});}
export function buildCoachContext(data,today){
  const day=data.days?.[today]||{};
  const meals=(day.meals||[]).slice(-20).map(m=>({name:String(m.name||'').slice(0,200),calories:m.calories??null,protein:m.protein??null,carbs:m.carbs??null,fat:m.fat??null}));
  const total=meals.length?sumMeals(meals):null;
  const recentMessages=(data.chat||[]).slice(-8).map(m=>({role:m.role==='assistant'?'assistant':'user',text:String(m.text||m.content||'').slice(0,1200)}));
  const lastNutritionMessage=[...(data.chat||[])].reverse().find(m=>m.role==='assistant'&&m.nutrition);
  const supplements=Object.fromEntries(Object.entries(data.supplements||{}).map(([kind,value])=>[kind,{...value,brand:String(value?.brand||'').slice(0,150),notes:String(value?.notes||'').slice(0,1500)}]));
  const recentSessions=(data.sessions||[]).slice(-4).map(s=>({date:s.date,title:s.title,workoutId:s.workoutId,sets:(s.sets||[]).slice(-24).map(set=>({exerciseId:set.exerciseId,load:set.load,reps:set.reps}))}));
  const sleepHours=numeric(day.sleepHours);
  return {date:today,profile:{name:data.profile?.name,weight:data.profile?.weight,goal:'Prise de muscle progressive',confirmed:!!data.profile?.confirmed},today:{total,water:day.water??null,sleepMin:sleepHours===null?null:Math.round(sleepHours*60)},schedule:'MMA mardi et jeudi ; upper/lower alterné lundi, mercredi et vendredi ; récupération samedi et dimanche.',trainingStartDate:data.startDate,energy:day.energy??null,habitPlan:data.preferences||{},sleepHours,meals,supplements,recentSessions,recentMessages,lastNutritionAnalysis:lastNutritionMessage?.nutrition||null};
}
export async function preparePickedImage(asset){
  if(!asset)throw new Error('Aucune photo sélectionnée.');
  let mime=(asset.mimeType||'image/jpeg').toLowerCase();
  let dataUrl=asset.base64?`data:${mime};base64,${asset.base64}`:asset.uri;
  if(Platform.OS==='web'){
    dataUrl=await new Promise((resolve,reject)=>{
      const photo=new window.Image();
      photo.onload=()=>{try{const scale=Math.min(1,1500/Math.max(photo.width,photo.height));const canvas=document.createElement('canvas');canvas.width=Math.round(photo.width*scale);canvas.height=Math.round(photo.height*scale);const ctx=canvas.getContext('2d');ctx.drawImage(photo,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL('image/jpeg',.78));}catch(e){reject(new Error('Cette photo ne peut pas être préparée. Essaie une image JPG ou PNG.'));}};
      photo.onerror=()=>reject(new Error('Impossible de lire la photo. Essaie une autre image.'));photo.src=dataUrl;
    });
    mime='image/jpeg';
  }
  if(!['image/jpeg','image/png','image/webp'].includes(mime))throw new Error('Choisis une photo JPG, PNG ou WebP. Convertis les photos HEIC en JPG avant de les envoyer.');
  if(!/^data:image\/(jpeg|png|webp);base64,/.test(dataUrl||''))throw new Error('La photo n’a pas pu être chargée. Sélectionne-la à nouveau.');
  const payload=dataUrl.split(',')[1]||'';
  const size=Math.floor(payload.length*3/4)-(payload.endsWith('==')?2:payload.endsWith('=')?1:0);
  if(size>MAX_IMAGE_BYTES)throw new Error('La photo dépasse 2 Mo. Recadre-la ou sélectionne une photo moins volumineuse.');
  return {dataUrl,uri:dataUrl,width:asset.width,height:asset.height,size};
}
