export const memoryKeys=["preferences","favoriteMeals","usualSleep","usualTraining","coachCorrections","successfulStrategies","ignoredRecommendations"];
export function createMemoryEvent(type,payload){return {id:`${Date.now()}-${Math.random().toString(36).slice(2)}`,type,payload,createdAt:new Date().toISOString(),schemaVersion:1};}
