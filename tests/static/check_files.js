/* Architecture and boundary checks. Visual choices and legacy screen names are not contracts. */
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const exists=file=>fs.existsSync(path.join(root,file));
let checks=0;
function pass(label){checks++;console.log('PASS',label)}
function filesUnder(directory){return fs.readdirSync(path.join(root,directory),{withFileTypes:true}).flatMap(e=>e.isDirectory()?filesUnder(`${directory}/${e.name}`):/\.[cm]?jsx?$/.test(e.name)?[`${directory}/${e.name}`]:[])}
const required=['App.js','package.json','app.json','src/core/appState.js','src/core/trainingPlan.js','src/core/exerciseMotion.js','src/core/nutrition.js','src/ui/ExerciseDemo.js','src/services/storage/store.js','src/services/coachClient.js','server/coach.js','server/health.js','server/rateLimit.js','api/coach.js','api/health.js','public/index.html','public/sw.js','public/manifest.webmanifest'];
for(const file of required)assert(exists(file),`Missing required application boundary: ${file}`);
const pkg=JSON.parse(read('package.json')),app=JSON.parse(read('app.json'));
assert.equal(pkg.version,app.expo.version,'Package and Expo version must agree');
assert(pkg.dependencies.react&&pkg.dependencies.expo,'React/Expo runtime missing');
pass('application and runtime files exist; release versions agree');

const clientFiles=['App.js',...filesUnder('src')];
const sources=new Map(clientFiles.map(file=>[file,read(file)]));
let parser,traverse;
try{parser=require('@babel/parser');traverse=require('@babel/traverse').default;}catch(error){throw new Error('Install project dependencies before running syntax and component checks: @babel/parser and @babel/traverse are supplied by Expo.');}
const asts=new Map();
for(const [file,source] of sources)asts.set(file,parser.parse(source,{sourceType:'unambiguous',plugins:['jsx']}));
for(const file of [...filesUnder('server'),...filesUnder('api')])parser.parse(read(file),{sourceType:'unambiguous'});
pass('all client JSX and API JavaScript parse successfully');

function functionName(p){return p.node.id?.name||(p.parentPath?.isVariableDeclarator()?p.parentPath.node.id?.name:null)||'';}
for(const [file,ast] of asts){
  traverse(ast,{
    ImportDeclaration(p){const target=p.node.source.value;
      if(target.startsWith('.')){const abs=path.resolve(root,path.dirname(file),target);assert(['','.js','.jsx','/index.js','/index.jsx'].some(suffix=>fs.existsSync(abs+suffix)),`${file}: missing imported file ${target}`);}
      if(file!=='src/services/storage/store.js')assert.notEqual(target,'@react-native-async-storage/async-storage',`${file}: storage must go through the namespaced store`);
    },
    StringLiteral(p){
      assert(!/\bsk-(?:or-v1-)?[A-Za-z0-9_-]{20,}/.test(p.node.value),`${file}: possible API key literal in client source`);
      assert(!/^https:\/\/(?:openrouter\.ai\/api|api\.openai\.com)/.test(p.node.value),`${file}: client must use its server proxy`);
    },
    MemberExpression(p){
      const n=p.node;
      if(n.object?.type==='MemberExpression'&&n.object.object?.name==='process'&&n.object.property?.name==='env'){
        const key=n.computed?n.property.value:n.property.name;
        assert(typeof key==='string'&&key.startsWith('EXPO_PUBLIC_'),`${file}: server environment variable accessed from the client`);
        assert(!/(API_KEY|SECRET|TOKEN)$/.test(key),`${file}: secrets must not use a public environment variable`);
      }
      if(file!=='src/services/storage/store.js'){
        const owner=n.object?.name,method=n.computed?n.property.value:n.property.name;
        assert(!(owner==='AsyncStorage'&&/^(getItem|setItem|removeItem|clear|multiSet|multiRemove)$/.test(method)),`${file}: direct AsyncStorage access bypasses the store`);
        assert(!(['localStorage','sessionStorage'].includes(owner)&&/^(setItem|removeItem|clear)$/.test(method)),`${file}: direct browser writes bypass the store`);
      }
    },
    CallExpression(p){
      const callee=p.node.callee;
      if(callee.type==='Identifier'&&/^use[A-Z]/.test(callee.name)){
        const fn=p.getFunctionParent();assert(fn,`${file}: hook ${callee.name} called outside a component/hook`);
        const name=functionName(fn);assert(/^[A-Z]|^use[A-Z]/.test(name),`${file}: hook called in ordinary/nested callback ${name||'<anonymous>'}`);
        for(let owner=p.parentPath;owner&&owner!==fn;owner=owner.parentPath)assert(!/^(IfStatement|ConditionalExpression|ForStatement|ForOfStatement|ForInStatement|WhileStatement|DoWhileStatement|SwitchCase|TryStatement)$/.test(owner.type),`${file}: conditional or looped hook ${callee.name}`);
      }
      if(callee.name==='require'&&p.node.arguments[0]?.value==='@react-native-async-storage/async-storage')assert.equal(file,'src/services/storage/store.js',`${file}: direct storage dependency bypasses store`);
    },
    Function(p){
      if(!/^[A-Z]/.test(functionName(p))||!p.getFunctionParent())return;
      let returnsJSX=false;
      p.traverse({JSXElement(q){returnsJSX=true;q.stop();},JSXFragment(q){returnsJSX=true;q.stop();}});
      assert(!returnsJSX,`${file}: component ${functionName(p)} must be declared at module level to preserve its state`);
    }
  });
}
const stateSource=read('src/core/appState.js');
assert(/from\s+['"][^'"]*services\/storage\/store['"]/.test(stateSource),'State persistence must use the storage service');
pass('module-level React components, hook ordering, relative imports and storage boundaries');
pass('no provider secret or direct provider endpoint in client source');

// The requested interface is light and neutral. Validate the active design tokens,
// rather than imposing legacy layouts, screen titles or decorative card counts.
let palette;
traverse(asts.get('src/ui/kit.js'),{VariableDeclarator(p){if(p.node.id?.name==='C'&&p.node.init?.type==='ObjectExpression')palette=Object.fromEntries(p.node.init.properties.filter(x=>x.type==='ObjectProperty'&&x.value.type==='StringLiteral').map(x=>[x.key.name||x.key.value,x.value.value]));}});
assert(palette,'Active interface colour tokens are missing');
function rgb(hex){assert(/^#[0-9a-f]{6}$/i.test(hex),`Expected a six-digit colour, received ${hex}`);return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));}
const brightness=hex=>rgb(hex).reduce((sum,value)=>sum+value,0)/(3*255);
for(const key of ['bg','panel','raised']){const channels=rgb(palette[key]);assert(brightness(palette[key])>.88,`${key} must be a light background`);assert(Math.max(...channels)-Math.min(...channels)<25,`${key} must remain neutral`);}
assert(brightness(palette.ink)<.3,'Primary text must remain dark on the light interface');
assert.equal(app.expo.userInterfaceStyle,'light','Native app chrome must follow the light design');
const demonstrationSources=['src/ui/TrainingScreen.js','src/ui/ExerciseDemo.js','src/core/exerciseMotion.js'];
for(const file of demonstrationSources)traverse(asts.get(file),{
  StringLiteral(p){assert(!/^https?:\/\//i.test(p.node.value),`${file}: the demonstration must not depend on a remote player or asset`);},
  JSXIdentifier(p){assert(!['iframe','video'].includes(p.node.name),`${file}: demonstration must render locally`);},
  CallExpression(p){const callee=p.node.callee;const name=callee?.type==='MemberExpression'?callee.property?.name:callee?.name;if(name==='createElement')assert(!['iframe','video'].includes(p.node.arguments[0]?.value),`${file}: demonstration must not create an external player`);if(callee?.type==='MemberExpression'&&callee.object?.name==='Linking')assert.notEqual(name,'openURL',`${file}: demonstration must not navigate to an external player`);}
});
assert(/from\s+['"]\.\/ExerciseDemo(?:\.js)?['"]/.test(read('src/ui/TrainingScreen.js')),'Training must use the local exercise demonstration component');
pass('light neutral interface tokens and local exercise demonstrations without external players');

const indexHtml=read('public/index.html');
for(const tag of ['rel="manifest"','apple-mobile-web-app-capable','apple-touch-icon'])assert(indexHtml.includes(tag),`Installable PWA metadata missing: ${tag}`);
const manifest=JSON.parse(read('public/manifest.webmanifest'));
assert(manifest.name&&manifest.start_url,'Manifest must identify the application');
assert(brightness(manifest.background_color)>.88&&brightness(manifest.theme_color)>.88,'Installed PWA chrome must remain light');
pass('PWA manifest and mobile installation metadata');

async function run(){
  // Exercise the real service-worker route, rather than matching its implementation text.
  const listeners={},cacheCalls=[];
  const swContext={URL,Response,Promise,console,self:{location:{origin:'https://app.test'},addEventListener:(name,fn)=>{listeners[name]=fn},skipWaiting:()=>Promise.resolve(),clients:{claim:()=>Promise.resolve()}},caches:{match:async()=>{cacheCalls.push('match');return null},open:async()=>({addAll:async()=>{},put:async()=>{cacheCalls.push('put')}}),keys:async()=>['stale-release'],delete:async name=>{cacheCalls.push(`delete:${name}`);return true}},fetch:async()=>new Response('online',{status:200})};
  vm.runInNewContext(read('public/sw.js'),swContext,{filename:'public/sw.js'});
  assert.equal(typeof listeners.fetch,'function','Service worker fetch handler missing');
  for(const endpoint of ['/api/health','/api/coach']){
    let intercepted=false;
    listeners.fetch({request:{url:`https://app.test${endpoint}`,method:'GET',mode:'cors'},respondWith:()=>{intercepted=true}});
    assert.equal(intercepted,false,`${endpoint} must bypass service-worker caching`);
  }
  let navigation;
  listeners.fetch({request:{url:'https://app.test/',method:'GET',mode:'navigate'},respondWith:p=>{navigation=p}});
  assert(navigation,'PWA navigation must have an offline strategy');
  assert.equal(await(await navigation).text(),'online','Navigation must prefer a current network response');
  let activation;
  listeners.activate({waitUntil:p=>{activation=p}});await activation;
  assert(cacheCalls.includes('delete:stale-release'),'Outdated PWA caches must be removed');
  pass('API requests bypass PWA cache; navigation refreshes online and old releases are removed');

  // Run the actual client request helper with a controlled transport, without a live provider.
  const babel=require('@babel/core');
  const code=babel.transformSync(read('src/services/coachClient.js'),{babelrc:false,configFile:false,plugins:[require('@babel/plugin-transform-modules-commonjs')]}).code;
  const sent=[],module={exports:{}};
  const clientContext={module,exports:module.exports,require:name=>{if(name==='../core/nutrition')return require('../../src/core/nutrition.js');assert.equal(name,'react-native');return {Platform:{OS:'web'}}},process:{env:{}},setTimeout,clearTimeout,AbortController,fetch:async(url,options)=>{sent.push({url,options});return {ok:true,headers:{get:()=> 'application/json'},json:async()=>({ok:true,reply:'Réponse de test'})}}};
  vm.runInNewContext(code,clientContext,{filename:'coachClient.js'});
  const image='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jwl8AAAAASUVORK5CYII=';
  await module.exports.sendCoach({message:'Lis cette étiquette',mode:'label',imageDataUrl:image,portionGrams:125,context:{profile:{weight:57}}});
  assert.equal(sent[0].url,'/api/coach');assert.equal(sent[0].options.method,'POST');
  const payload=JSON.parse(sent[0].options.body);
  assert.equal(payload.imageDataUrl,image,'Selected image bytes must reach the server, not just a local URI');
  assert.equal(payload.mode,'label');assert.equal(payload.portionGrams,125);
  const coach=require('../../server/coach.js');
  assert.equal(coach.validatePayload(payload).imageDataUrl,image,'Server must accept the client image contract');
  assert.throws(()=>coach.validatePayload({...payload,imageDataUrl:'file:///local/photo.jpg'}),/INVALID_IMAGE/,'A device-local image URI cannot be read by the provider');
  pass('real client/server photo contract transports image bytes and consumed quantity');

  const originalKey=process.env.OPENROUTER_API_KEY,originalFetch=global.fetch;
  let providerCalls=0;process.env.OPENROUTER_API_KEY='';global.fetch=async()=>{providerCalls++;throw new Error('No live provider calls allowed in boundary test')};
  function response(){return {code:200,headers:{},setHeader(name,value){this.headers[name]=value},status(value){this.code=value;return this},json(value){this.body=value;return this}}}
  try{
    let throttled=false;
    for(let i=0;i<30;i++){
      const res=response();await coach.coachHandler({method:'POST',headers:{'x-forwarded-for':'198.51.100.201'},body:{}},res);
      assert.equal(res.headers['Cache-Control'],'no-store','AI responses must not be cached');
      if(res.code===429){throttled=true;assert(Number(res.headers['Retry-After'])>0);break;}
      assert.equal(res.code,503,'Missing key must produce an actionable unavailable status');
    }
    assert(throttled,'Actual API handler must enforce its request limiter');assert.equal(providerCalls,0,'Requests without a configured key must never reach the provider');
  }finally{global.fetch=originalFetch;if(originalKey===undefined)delete process.env.OPENROUTER_API_KEY;else process.env.OPENROUTER_API_KEY=originalKey;}
  pass('real API route rate limit, no-store responses and no-provider behavior without a key');
  console.log(`${checks} architecture and boundary checks passed`);
}
run().catch(error=>{console.error(error);process.exitCode=1});
