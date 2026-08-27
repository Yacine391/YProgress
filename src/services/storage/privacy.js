export const privacy={
  exportableCollections:["profile","meals","health","sleep","training","weights","progressPhotos","coachDecisions","events","preferences"],
  async exportAll(){return {status:"ready",collections:this.exportableCollections};},
  async deleteCollection(name){return {status:"pending_confirmation",name};},
  async reset(){return {status:"pending_confirmation"};}
};
