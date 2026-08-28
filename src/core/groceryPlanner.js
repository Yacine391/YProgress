const CATALOG=[
  {id:"chicken",name:"Poulet",unit:"kg",price:11,protein:230,calories:1650,priority:1},
  {id:"eggs",name:"Œufs",unit:"boîte de 12",price:3.5,protein:84,calories:840,priority:1},
  {id:"skyr",name:"Skyr",unit:"kg",price:4,protein:100,calories:600,priority:1},
  {id:"rice",name:"Riz",unit:"kg",price:2.5,protein:70,calories:3600,priority:2},
  {id:"oats",name:"Flocons d’avoine",unit:"kg",price:2.2,protein:130,calories:3700,priority:2},
  {id:"lentils",name:"Lentilles",unit:"kg",price:3,protein:240,calories:3500,priority:2},
  {id:"vegetables",name:"Légumes variés",unit:"kg",price:4,protein:20,calories:400,priority:3},
  {id:"bananas",name:"Bananes",unit:"kg",price:2.2,protein:11,calories:890,priority:3},
  {id:"olive-oil",name:"Huile d’olive",unit:"50 cl",price:5,protein:0,calories:4050,priority:3}
];

export function buildGroceryList({budget=60,weeklyCalories=17500,weeklyProtein=770}={}){
  const limit=Math.max(10,Number(budget)||0),items=[];
  let spent=0,protein=0,calories=0;
  for(const product of CATALOG){
    if(spent+product.price>limit)continue;
    const proteinMissing=Math.max(0,weeklyProtein-protein),calorieMissing=Math.max(0,weeklyCalories-calories);
    const useful=product.priority===1&&proteinMissing>0||product.priority===2&&calorieMissing>0||product.priority===3;
    if(!useful)continue;
    const maxQty=product.priority===1?3:product.priority===2?2:1;
    const neededByProtein=product.protein?Math.ceil(proteinMissing/product.protein):0;
    const neededByCalories=product.calories?Math.ceil(calorieMissing/product.calories):0;
    const quantity=Math.max(1,Math.min(maxQty,product.priority===1?neededByProtein:neededByCalories));
    const affordable=Math.min(quantity,Math.floor((limit-spent)/product.price));
    if(!affordable)continue;
    items.push({...product,quantity:affordable,totalPrice:Number((affordable*product.price).toFixed(2))});
    spent+=affordable*product.price;protein+=affordable*product.protein;calories+=affordable*product.calories;
  }
  return {items,total:Number(spent.toFixed(2)),remaining:Number((limit-spent).toFixed(2)),estimatedProtein:protein,estimatedCalories:calories,budget:limit};
}
