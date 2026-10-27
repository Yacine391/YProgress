/** Local schematic exercise demonstrations. Geometry is independent of rendering. */
const rad=d=>d*Math.PI/180;
const point=(p,length,degrees)=>[p[0]+length*Math.cos(rad(degrees)),p[1]+length*Math.sin(rad(degrees))];
const mix=(a,b,t)=>a+(b-a)*t;
const shift=(p,x=0,y=0)=>[p[0]+x,p[1]+y];
const mirror=p=>[352-p[0],p[1]];
const limb=(start,joint,end,extra={})=>({start,joint,end,...extra});
const line=(a,b,width=4,layer='back')=>({type:'line',a,b,width,layer});
const rect=(x,y,width,height,extra={})=>({type:'rect',x,y,width,height,...extra});
const circle=(cx,cy,r,extra={})=>({type:'circle',cx,cy,r,...extra});
/** Two-bone inverse kinematics; lengths stay constant throughout each movement. */
function joint(start,end,upper,lower,bend=1){
  const dx=end[0]-start[0],dy=end[1]-start[1],distance=Math.max(.001,Math.hypot(dx,dy));
  const d=Math.min(upper+lower-.001,Math.max(Math.abs(upper-lower)+.001,distance));
  const a=(upper*upper-lower*lower+d*d)/(2*d),h=Math.sqrt(Math.max(0,upper*upper-a*a));
  return [start[0]+dx/distance*a-dy/distance*h*bend,start[1]+dy/distance*a+dx/distance*h*bend];
}
function arm(start,end,upper=32,lower=32,bend=1){return limb(start,joint(start,end,upper,lower,bend),end);}
function sideBody(shoulder=[173,92],hip=[176,148],head=[171,64]){
  const ankle=[184,220],knee=joint(hip,ankle,43,43,-1);
  return {view:'side',head,neck:shift(shoulder,-1,-11),shoulder,hip,arms:[],legs:[limb(shift(hip,3),shift(knee,4),shift(ankle,5),{toe:[203,223],far:true}),limb(hip,knee,ankle,{toe:[201,223]})],equipment:[],loads:[]};
}
function frontBody(seated=false){
  const shoulder=[176,seated?108:94],hip=[176,seated?164:151];
  return {view:'front',head:[176,seated?77:63],neck:[176,seated?96:82],shoulder,hip,arms:[],legs:seated?[limb([165,164],[146,187],[143,221],{toe:[128,223]}),limb([187,164],[206,187],[210,221],{toe:[225,223]})]:[limb([167,151],[162,184],[159,220],{toe:[145,223]}),limb([185,151],[191,184],[195,220],{toe:[209,223]})],equipment:[],loads:[]};
}
function sideArms(p,hand,upper=32,lower=32,bend=1){
  const near=arm(p.shoulder,hand,upper,lower,bend);
  p.arms=[{...near,start:shift(near.start,3),joint:shift(near.joint,3),end:shift(near.end,3),far:true},near];
}
function frontArms(p,leftStart,leftJoint,leftHand){
  p.arms=[limb(leftStart,leftJoint,leftHand),limb(mirror(leftStart),mirror(leftJoint),mirror(leftHand))];
}
function dumbbells(p,angle=0){p.loads=p.arms.filter(a=>!a.far).map(a=>({kind:'dumbbell',at:a.end,angle}));}
function seat(p,{back=true}={}){
  p.equipment.push(rect(143,167,67,8),line([151,175],[145,223],5),line([204,175],[215,223],5));
  if(back)p.equipment.push(line([145,104],[151,167],9));
}

export const MOTION_IDS=['leg-press','incline-db-press','lat-pulldown','leg-curl','lateral-raise','db-curl','triceps-pushdown','plank','goblet-squat','cable-row','db-rdl','reverse-fly','hammer-curl','overhead-triceps','calf-raise','shoulder-press','machine-chest-press'];
export const MOTION_META={
  'leg-press':{view:'Profil',cue:'Pousse la plateforme, puis replie les genoux sous contrôle. Le bassin reste en appui.'},
  'incline-db-press':{view:'Profil · banc incliné',cue:'Descends près du haut du torse, puis pousse les haltères vers le haut.'},
  'lat-pulldown':{view:'Face',cue:'Tire la barre devant toi vers le haut du torse, puis laisse les bras remonter.'},
  'leg-curl':{view:'Profil · assis',cue:'Ramène les talons sous le siège. Les cuisses et le bassin restent calés.'},
  'lateral-raise':{view:'Face',cue:'Écarte les bras vers les côtés, coudes souples, puis redescends lentement.'},
  'db-curl':{view:'Face · paumes vers le haut',cue:'Fléchis les coudes, paumes vers le haut. Garde les bras près du corps.'},
  'triceps-pushdown':{view:'Profil · poulie haute',cue:'Déplie les coudes vers le bas sans déplacer le haut des bras.'},
  'plank':{view:'Profil · maintien',cue:'Tiens une ligne stable des épaules aux talons et continue de respirer.'},
  'goblet-squat':{view:'Profil',cue:'Descends entre les hanches avec l’haltère contre le torse, puis repousse le sol.'},
  'cable-row':{view:'Profil · poulie basse',cue:'Ramène la poignée vers le bas des côtes, puis laisse les bras repartir.'},
  'db-rdl':{view:'Profil · charnière de hanche',cue:'Recule les hanches. Les haltères descendent près des jambes ; le dos reste stable.'},
  'reverse-fly':{view:'Face · buste incliné',cue:'Buste incliné, ouvre les bras sur les côtés sans donner d’élan.'},
  'hammer-curl':{view:'Face · prise neutre',cue:'Monte les haltères avec les paumes face à face, comme pour tenir un marteau.'},
  'overhead-triceps':{view:'Profil · deux mains',cue:'Garde les coudes au-dessus des épaules et déplie-les pour monter l’haltère.'},
  'calf-raise':{view:'Profil · appui sur les pointes',cue:'Monte les talons en gardant l’avant des pieds en appui, puis redescends sans rebond.'},
  'shoulder-press':{view:'Face · assis',cue:'Pousse les haltères au-dessus des épaules et reviens lentement.'},
  'machine-chest-press':{view:'Profil · machine',cue:'Pousse les poignées devant la poitrine, puis reviens sans décoller le dos.'}
};

export function exercisePose(id,phase=0){
  const t=Number.isFinite(Number(phase))?((Number(phase)%1)+1)%1:0;
  const u=(1-Math.cos(t*Math.PI*2))/2;
  let p;
  switch(id){
    case 'leg-press': {
      p=sideBody([106,113],[140,165],[93,87]);
      const ankle=[mix(194,225,u),mix(125,111,u)],knee=joint(p.hip,ankle,53,51,-1);
      p.legs=[limb(shift(p.hip,3),shift(knee,3),shift(ankle,3),{toe:shift(ankle,8,-10),far:true}),limb(p.hip,knee,ankle,{toe:shift(ankle,8,-10)})];
      sideArms(p,[135,173],34,33,-1);
      p.equipment.push(line([91,104],[126,177],11),line([126,177],[160,180],9),line([100,222],[286,222],5),line([164,211],[259,80],4),line(shift(ankle,-8,-22),shift(ankle,19,15),10,'front'),line([112,181],[104,220],6));
      break;
    }
    case 'incline-db-press': {
      p=sideBody([144,142],[202,175],[121,128]);p.neck=[134,138];
      p.legs=[limb([202,175],[242,190],[242,220],{toe:[259,222]}),limb([206,175],[248,190],[250,220],{toe:[268,222],far:true})];
      sideArms(p,[mix(161,146,u),mix(130,80,u)],34,34,1);dumbbells(p);
      p.equipment.push(line([127,148],[202,184],10),line([202,184],[227,184],9),line([151,161],[141,222],5),line([211,190],[219,222],5));
      break;
    }
    case 'lat-pulldown': {
      p=frontBody(true);const left=[158,108],hand=[121,mix(43,107,u)];frontArms(p,left,joint(left,hand,39,39,-1),hand);seat(p,{back:false});
      p.equipment.push(line([282,25],[282,222],6),line([176,25],[282,25],6),circle(176,29,6),line([176,34],[176,hand[1]],2),line([115,hand[1]],[237,hand[1]],5,'front'),rect(253,156,19,54),line([148,158],[204,158],7));
      break;
    }
    case 'leg-curl': {
      p=sideBody([136,96],[149,156],[132,69]);const knee=[201,158],ankle=point(knee,51,mix(-7,83,u));
      p.legs=[limb([153,157],shift(knee,3),shift(ankle,3),{toe:shift(ankle,17,3),far:true}),limb(p.hip,knee,ankle,{toe:shift(ankle,14,4)})];
      sideArms(p,[160,163],32,32,1);p.equipment.push(line([126,89],[139,167],10),rect(137,163,72,8),line([146,172],[135,222],6),line([208,173],[236,222],5),line([191,146],[210,146],9),line(knee,ankle,4),circle(ankle[0]+2,ankle[1]-2,8,{layer:'front'}));
      break;
    }
    case 'lateral-raise': {
      p=frontBody();const shoulder=[158,94],elbow=point(shoulder,30,mix(104,177,u)),hand=point(elbow,30,mix(100,162,u));frontArms(p,shoulder,elbow,hand);dumbbells(p);break;
    }
    case 'db-curl': case 'hammer-curl': {
      p=frontBody();const shoulder=[158,94],elbow=[151,125],hand=point(elbow,30,mix(104,-72,u));frontArms(p,shoulder,elbow,hand);dumbbells(p,id==='hammer-curl'?90:0);break;
    }
    case 'triceps-pushdown': {
      p=sideBody([171,94],[172,151],[170,66]);const elbow=[176,126],hand=point(elbow,34,mix(-12,82,u));
      p.arms=[limb(shift(p.shoulder,3),shift(elbow,3),shift(hand,3),{far:true}),limb(p.shoulder,elbow,hand)];
      p.equipment.push(line([255,24],[255,222],6),line([231,24],[255,24],5),circle(231,29,6),line([231,35],[hand[0],hand[1]-8],2),line([hand[0]-6,hand[1]],[hand[0]+7,hand[1]],5,'front'),rect(265,161,19,59));
      break;
    }
    case 'plank': {
      const breathe=Math.sin(t*Math.PI*2)*1.2;p=sideBody([123,164],[187,184],[96,154-breathe]);p.neck=[112,160];
      p.arms=[limb(p.shoulder,[125,215],[160,215])];p.legs=[limb(p.hip,[228,198],[270,214],{toe:[281,220]})];
      p.equipment.push(rect(67,222,230,5));break;
    }
    case 'goblet-squat': {
      const hip=[mix(177,143,u),mix(137,173,u)],shoulder=[hip[0]+mix(9,24,u),hip[1]-mix(57,49,u)];p=sideBody(shoulder,hip,point(shoulder,26,mix(-84,-62,u)));
      p.neck=point(shoulder,11,mix(-84,-62,u));const ankle=[192,220],knee=joint(hip,ankle,45,45,-1);
      p.legs=[limb(shift(hip,4),shift(knee,4),shift(ankle,4),{toe:[213,223],far:true}),limb(hip,knee,ankle,{toe:[207,223]})];
      sideArms(p,shift(shoulder,17,23),28,28,1);p.loads=[{kind:'goblet',at:p.arms[1].end,angle:90}];break;
    }
    case 'cable-row': {
      p=sideBody([161,95],[154,160],[157,68]);p.legs=[limb([157,160],[207,180],[238,216],{toe:[252,213]})];sideArms(p,[mix(224,173,u),mix(124,143,u)],36,36,1);
      p.equipment.push(rect(140,166,49,7),line([151,173],[145,222],5),line([282,113],[282,222],6),circle(282,136,6),line([282,136],p.arms[1].end,2),line(shift(p.arms[1].end,0,-9),shift(p.arms[1].end,0,9),5,'front'),line([240,198],[252,220],8));break;
    }
    case 'db-rdl': {
      const hip=[mix(177,143,u),mix(140,151,u)],shoulder=point(hip,60,mix(-90,-22,u));p=sideBody(shoulder,hip,point(shoulder,25,mix(-90,-22,u)));p.neck=point(shoulder,10,mix(-90,-22,u));
      const ankle=[184,220],knee=joint(hip,ankle,45,43,-1);p.legs=[limb(shift(hip,4),shift(knee,4),shift(ankle,4),{toe:[206,223],far:true}),limb(hip,knee,ankle,{toe:[200,223]})];
      sideArms(p,[shoulder[0],shoulder[1]+64],32,32,1);dumbbells(p);break;
    }
    case 'reverse-fly': {
      p=frontBody();p.shoulder=[176,119];p.hip=[176,166];p.neck=[176,108];p.head=[176,97];
      p.legs=[limb([167,166],[156,190],[154,220],{toe:[140,223]}),limb([185,166],[196,190],[199,220],{toe:[213,223]})];
      const shoulder=[158,119],elbow=point(shoulder,31,mix(85,190,u)),hand=point(elbow,30,mix(78,166,u));frontArms(p,shoulder,elbow,hand);dumbbells(p);break;
    }
    case 'overhead-triceps': {
      p=sideBody([174,108],[176,164],[170,78]);const elbow=[181,72],hand=point(elbow,36,mix(74,-90,u));
      p.arms=[limb(shift(p.shoulder,3),shift(elbow,4),shift(hand,4),{far:true}),limb(p.shoulder,elbow,hand)];p.loads=[{kind:'dumbbell',at:shift(hand,2),angle:90}];seat(p);break;
    }
    case 'calf-raise': {
      const lift=u*12;p=sideBody([172,92-lift],[175,151-lift],[170,64-lift]);const ankle=[184,218-lift],knee=[179,185-lift];
      p.legs=[limb(shift(p.hip,4),shift(knee,5),shift(ankle,6),{toe:[209,222],far:true}),limb(p.hip,knee,ankle,{toe:[203,222]})];
      sideArms(p,[163,139-lift],29,29,-1);p.equipment.push(rect(194,224,28,7),line([132,45],[132,222],5),line([130,92-lift],[170,92-lift],7),line([155,92-lift],[193,92-lift],9));break;
    }
    case 'shoulder-press': {
      p=frontBody(true);const shoulder=[158,108],hand=[mix(123,151,u),mix(102,44,u)];frontArms(p,shoulder,joint(shoulder,hand,35,35,-1),hand);dumbbells(p);seat(p);break;
    }
    case 'machine-chest-press': {
      p=sideBody([158,108],[163,165],[157,79]);sideArms(p,[mix(179,222,u),mix(113,111,u)],34,34,1);seat(p);
      const hand=p.arms[1].end;p.equipment.push(line([250,59],[250,222],6),line([250,59],[225,79],5),line([225,79],hand,4),line(shift(hand,0,-8),shift(hand,0,8),5,'front'),rect(264,161,19,59));break;
    }
    default:p=sideBody();sideArms(p,[172,154]);
  }
  return {...p,id,projection:p.view,supported:MOTION_IDS.includes(id),phase:t,effort:u,phaseLabel:id==='plank'?'Maintien · respiration':t<.5?'Aller contrôlé':'Retour contrôlé',...MOTION_META[id]};
}

/** Standalone diagnostic render, also used to visually inspect both extremes. */
export function renderMotionSvg(pose){
  const e=shape=>shape.type==='line'?`<line x1="${shape.a[0]}" y1="${shape.a[1]}" x2="${shape.b[0]}" y2="${shape.b[1]}" stroke="#b2b2b2" stroke-width="${shape.width||4}" stroke-linecap="round"/>`:shape.type==='rect'?`<rect x="${shape.x}" y="${shape.y}" width="${shape.width}" height="${shape.height}" rx="3" fill="#d2d2d2"/>`:`<circle cx="${shape.cx}" cy="${shape.cy}" r="${shape.r}" fill="#ddd" stroke="#aaa" stroke-width="2"/>`;
  const limbSvg=(l,width)=>`<polyline points="${[l.start,l.joint,l.end,...(l.toe?[l.toe]:[])].map(p=>p.join(',')).join(' ')}" fill="none" stroke="${l.far?'#a0a0a0':'#393939'}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const loadSvg=l=>`<g transform="translate(${l.at[0]} ${l.at[1]}) rotate(${l.angle||0})"><line x1="-11" y1="0" x2="11" y2="0" stroke="#242424" stroke-width="4"/><rect x="-12" y="-6" width="5" height="12" rx="1" fill="#242424"/><rect x="7" y="-6" width="5" height="12" rx="1" fill="#242424"/></g>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 352 244" width="352" height="244"><rect width="352" height="244" fill="#fafafa"/><line x1="57" y1="229" x2="299" y2="229" stroke="#e1e1e1"/>${pose.equipment.filter(x=>x.layer!=='front').map(e).join('')}${pose.legs.filter(x=>x.far).map(x=>limbSvg(x,8)).join('')}${pose.arms.filter(x=>x.far).map(x=>limbSvg(x,7)).join('')}<line x1="${pose.neck[0]}" y1="${pose.neck[1]}" x2="${pose.shoulder[0]}" y2="${pose.shoulder[1]}" stroke="#393939" stroke-width="9"/><line x1="${pose.shoulder[0]}" y1="${pose.shoulder[1]}" x2="${pose.hip[0]}" y2="${pose.hip[1]}" stroke="#393939" stroke-width="18" stroke-linecap="round"/>${pose.projection==='front'?`<line x1="158" y1="${pose.shoulder[1]}" x2="194" y2="${pose.shoulder[1]}" stroke="#393939" stroke-width="12" stroke-linecap="round"/>`:''}${pose.legs.filter(x=>!x.far).map(x=>limbSvg(x,10)).join('')}${pose.arms.filter(x=>!x.far).map(x=>limbSvg(x,8)).join('')}<circle cx="${pose.head[0]}" cy="${pose.head[1]}" r="11" fill="#565656"/>${pose.loads.map(loadSvg).join('')}${pose.equipment.filter(x=>x.layer==='front').map(e).join('')}</svg>`;
}
