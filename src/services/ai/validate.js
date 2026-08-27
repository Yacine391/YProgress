export function requireKeys(obj,keys,name="response"){
  if(!obj||typeof obj!=="object")throw new Error(`${name}:not_object`);
  const missing=keys.filter(k=>obj[k]===undefined||obj[k]===null);
  if(missing.length)throw new Error(`${name}:missing:${missing.join(",")}`);
  return obj;
}
export function clampConfidence(v){
  const n=Number(v); return Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
}
