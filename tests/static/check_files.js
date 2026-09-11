const fs=require("fs"),path=require("path"),assert=require("assert");
const root=path.resolve(__dirname,"../..");
const required=[
"App.js","package.json","app.json","src/core/autopilot.js","src/core/featureFlags.js",
"src/core/progression.js","src/core/groceryPlanner.js","src/core/history.js","src/features/training/program.js",
"src/core/intelligence.js","src/design/theme.js","src/pwa.js","public/index.html","public/sw.js","public/manifest.webmanifest",
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
// Les écrans doivent être déclarés au niveau module : une fonction imbriquée dans App()
// crée une identité de composant neuve à chaque rendu (remontage + perte de scroll).
for(const screen of ["Home","Nutrition","ProgressPage","Profile","ProgramPage"]){
  assert(new RegExp(`^function ${screen}\\(`,"m").test(appSource),`${screen} must be declared at module level`);
  assert(!new RegExp(`^[ \\t]+function ${screen}\\(`,"m").test(appSource),`${screen} must not be nested inside App()`);
}
// La persistance passe par src/services/storage/store.js (namespace versionné + migration).
assert(!appSource.includes("@react-native-async-storage/async-storage"),"App.js must not use AsyncStorage directly");
assert(appSource.includes('from "./src/services/storage/store"'),"App.js must persist through the store service");
// Les modules du moteur doivent être réellement branchés, pas seulement testés.
for(const wired of ["buildAutopilotSnapshot","detectPlateau","weeklySummary","recoveryScore","upsertDay"]) assert(appSource.includes(wired),`${wired} is tested but never wired into App.js`);
assert(!appSource.includes("le coach pourra proposer"),"plateau card must report a real result");

// Design system : aucune couleur en dur dans App.js, tout vient de src/design/theme.js.
const hardcoded=appSource.match(/#[0-9a-fA-F]{3,8}\b/g)||[];
assert.equal(hardcoded.length,0,`App.js must use design tokens, found hardcoded colors: ${hardcoded.join(", ")}`);
assert(appSource.includes('from "./src/design/theme"'),"App.js must import the design tokens");
const themeSource=fs.readFileSync(path.join(root,"src/design/theme.js"),"utf8");
// La direction artistique abandonne le violet : garde-fou explicite.
for(const banned of ["#39205f","#102d66","#392070","#9175ff","#b77cff"]) assert(!themeSource.includes(banned)&&!appSource.includes(banned),`legacy purple ${banned} must be gone`);
assert(/minHeight:\s*LAYOUT\.tapTarget/.test(appSource),"interactive rows must respect the 46px tap target");

// PWA : sans le lien manifest, l'app n'est pas installable sur iPhone.
const indexHtml=fs.readFileSync(path.join(root,"public/index.html"),"utf8");
for(const tag of ['rel="manifest"','apple-mobile-web-app-capable','apple-touch-icon','%WEB_TITLE%']) assert(indexHtml.includes(tag),`public/index.html must contain ${tag}`);
// Le service worker doit servir la navigation en network-first, sinon l'app ne se met jamais à jour.
const sw=fs.readFileSync(path.join(root,"public/sw.js"),"utf8");
assert(sw.includes("networkFirst")&&sw.includes('request.mode === "navigate"'),"sw.js must serve navigation network-first");
assert(sw.includes("caches.delete"),"sw.js must clean up outdated caches");
console.log("PASS static foundation checks");
