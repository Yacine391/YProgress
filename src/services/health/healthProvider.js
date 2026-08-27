export const healthProvider={
  async requestPermissions(){throw new Error("HEALTHKIT_NOT_CONNECTED");},
  async getToday(){throw new Error("HEALTHKIT_NOT_CONNECTED");},
  async getRange(start,end){throw new Error("HEALTHKIT_NOT_CONNECTED");},
  async observe(){throw new Error("HEALTHKIT_NOT_CONNECTED");}
};
