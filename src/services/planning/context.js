export function resolveContext({date,calendar=[]}){
 const events=calendar.filter(e=>e.start<=date&&e.end>=date);
 return {events,constrained:events.some(e=>["school","internship"].includes(e.type)),travel:events.some(e=>e.type==="travel"),training:events.filter(e=>["gym","jjb"].includes(e.type))};
}
