export const sleepAutoDetection={
  inferWindow({lastActivityAt,plannedWake,healthKitSleep=null}){
    if(healthKitSleep)return {status:"confirmed",source:"healthkit",window:healthKitSleep,confidence:1};
    if(!lastActivityAt)return {status:"unknown",source:"none",window:null,confidence:0};
    return {status:"estimated",source:"device_activity+history",window:{start:lastActivityAt,plannedWake},confidence:.55};
  },
  morningReconcile({estimated,healthKitSleep}){
    return healthKitSleep?{status:"confirmed",window:healthKitSleep}:{status:"estimated",window:estimated};
  }
};
