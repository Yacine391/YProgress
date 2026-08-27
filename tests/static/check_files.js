const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const required=[
"App.js","package.json","app.json","src/core/autopilot.js","src/core/featureFlags.js",
"src/core/progression.js","src/features/training/program.js",
"src/domain/model.js","src/types/contracts.js","src/services/health/sleepAutoDetection.js",
"src/services/storage/store.js","src/services/storage/memory.js","src/services/storage/privacy.js",
"src/services/storage/offlineQueue.js","src/services/analytics/events.js",
"src/services/ai/foodInventory.js","server/index.js","docs/NEW_IDEAS_V9.md"
];
for(const f of required) assert(fs.existsSync(path.join(root,f)),`missing ${f}`);
const pkg=JSON.parse(fs.readFileSync(path.join(root,"package.json")));
const app=JSON.parse(fs.readFileSync(path.join(root,"app.json")));
assert.equal(pkg.version,app.expo.version,"version mismatch");
assert(pkg.dependencies.expo,"expo dependency missing");
const flags=fs.readFileSync(path.join(root,"src/core/featureFlags.js"),"utf8");
for(const k of ["healthKit:false","aiVision:false","aiCoach:false","voice:false","widget:false","liveActivity:false"]) assert(flags.includes(k),`flag ${k} not gated`);
const appSource=fs.readFileSync(path.join(root,"App.js"),"utf8");
for(const screen of ["Home","Nutrition","ProgressPage","Profile"]) assert(!appSource.includes(`<${screen}/>`),`${screen} must render without an unstable nested component identity`);
console.log("PASS static foundation checks");
