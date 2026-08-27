export const offlineQueue={
 queue:[],
 push(event){this.queue.push({...event,queuedAt:Date.now()});},
 drain(){const q=[...this.queue];this.queue=[];return q;}
};
