import {store,KEYS,migrateLegacyKeys} from '../services/storage/store';
import {DEFAULT_SUPPLEMENTS} from './nutrition';

export const APP_STATE_KEY='transformationV17';
export function parisDate(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Paris',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
  const p=Object.fromEntries(parts.map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;
}
export function dayIndex(key){return new Date(`${key}T12:00:00Z`).getUTCDay();}
export function datePlus(key,n){const d=new Date(`${key}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
export function weekDates(key){const offset=(dayIndex(key)+6)%7;return Array.from({length:7},(_,i)=>datePlus(key,i-offset));}
export function defaultData(){return {version:17,profile:{name:'Yacine',weight:57,heightCm:170,age:21,sex:'male',activity:'moderate',goal:'lean_gain',sleepMin:480,confirmed:false},startDate:'2026-10-27',baselineWeight:55,weights:[{date:'2026-10-27',weight:57}],days:{},sessions:[],drafts:{},supplements:JSON.parse(JSON.stringify(DEFAULT_SUPPLEMENTS)),measurements:[],photos:[],chat:[]};}
export async function loadData(){
  await migrateLegacyKeys();const current=await store.get(APP_STATE_KEY,null);
  if(current?.version===17){const base=defaultData();return {...base,...current,profile:{...base.profile,...current.profile},supplements:{whey:{...base.supplements.whey,...current.supplements?.whey},creatine:{...base.supplements.creatine,...current.supplements?.creatine}}};}
  const keys=Object.values(KEYS);const values=await Promise.all(keys.map(k=>store.get(k,null)));const legacy=Object.fromEntries(keys.map((k,i)=>[k,values[i]]));
  const base=defaultData();base.legacy=legacy; // Original data retained in exports; never erased by this update.
  if(legacy.profile)base.profile={...base.profile,...legacy.profile,weight:57,confirmed:false};
  if(Array.isArray(legacy.weights))base.weights=[...legacy.weights.filter(x=>x?.date&&Number(x.weight)>0&&x.date!=='2026-10-27'),{date:'2026-10-27',weight:57}].sort((a,b)=>a.date.localeCompare(b.date));
  for(const entry of (Array.isArray(legacy.journal)?legacy.journal:[]))if(entry?.date)base.days[entry.date]={...entry,meals:[],sleepHours:entry.sleepMin?String(Math.round(entry.sleepMin/6)/10):'',water:entry.water||0};
  for(const entry of (Array.isArray(legacy.logs)?legacy.logs:[]))if(entry?.date){const day=base.days[entry.date]||{meals:[]};base.days[entry.date]={...day,meals:[...(day.meals||[]),{...entry,id:entry.id||`legacy-${entry.date}-${(day.meals||[]).length}`,name:entry.name||entry.label||'Repas importé'}]};}
  return base;
}
let saving=Promise.resolve();
export function saveData(data){saving=saving.catch(()=>{}).then(()=>store.set(APP_STATE_KEY,data));return saving;}
