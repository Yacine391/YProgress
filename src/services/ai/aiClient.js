export function createAIClient({baseUrl}){
  async function post(path,body){
    if(!baseUrl) throw new Error("AI_SERVER_NOT_CONFIGURED");
    const r=await fetch(baseUrl.replace(/\/$/,"")+path,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
    if(!r.ok) throw new Error("AI_HTTP_"+r.status);
    return r.json();
  }
  return {
    analyzeMeal:(body)=>post("/meal-analysis",body),
    coach:(body)=>post("/coach",body),
    weekly:(body)=>post("/weekly-insights",body),
    projection:(body)=>post("/projection",body),
    restaurant:(body)=>post("/restaurant",body)
  };
}
