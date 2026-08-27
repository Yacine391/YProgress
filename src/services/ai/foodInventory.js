export const foodInventory={
  async analyzeImage(image){return {status:"not_configured",items:[],uncertainties:["Vision provider à connecter."]};},
  planFromInventory({inventory,remainingMacros,budget}){return {inventory,remainingMacros,budget,recipes:[],shoppingList:[]};}
};
