const PREFIX="yprogress.v8.";
export const store={
 async get(key, fallback=null){try{const AsyncStorage=require("@react-native-async-storage/async-storage").default;const v=await AsyncStorage.getItem(PREFIX+key);return v?JSON.parse(v):fallback}catch(e){return fallback}},
 async set(key,value){const AsyncStorage=require("@react-native-async-storage/async-storage").default;await AsyncStorage.setItem(PREFIX+key,JSON.stringify(value))},
 async remove(key){const AsyncStorage=require("@react-native-async-storage/async-storage").default;await AsyncStorage.removeItem(PREFIX+key)}
};
