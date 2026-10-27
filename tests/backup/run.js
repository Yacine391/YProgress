const assert=require('node:assert/strict');
const {validateBackup,serializeBackup,validDate}=require('../../src/core/backup.js');
let checks=0;
function check(name,fn){fn();checks++;process.stdout.write(`✓ ${name}\n`);}
function sample(){return {version:17,profile:{name:'Yacine',weight:57},startDate:'2026-10-27',weights:[{date:'2026-10-27',weight:57}],days:{'2026-10-27':{meals:[{name:'Repas',calories:300,protein:15}],water:500}},sessions:[{date:'2026-10-27',sets:[{exerciseId:'db-curl',load:7.5,reps:10}]}],supplements:{whey:{notes:'portion 30 g'},creatine:{notes:'3 g'}},photos:[],chat:[],measurements:[],extraFuture:{hello:'kept'}};}
function withDraft(draft){return {...sample(),drafts:{'2026-10-26:a:normal':draft}};}

check('Date impossible refusée',()=>assert.equal(validDate('2026-02-29'),false));
check('Date bissextile acceptée',()=>assert.equal(validDate('2028-02-29'),true));
check('Sauvegarde valide acceptée',()=>assert.equal(validateBackup(sample()).ok,true));
check('Aller-retour conserve les champs futurs et les compléments',()=>{const data=validateBackup(serializeBackup(sample())).data;assert.equal(data.extraFuture.hello,'kept');assert.equal(data.supplements.whey.notes,'portion 30 g');});
check('Prototype empoisonné refusé',()=>assert.equal(validateBackup('{"__proto__":{"polluted":true}}').ok,false));
check('Pesée datée du 30 février refusée',()=>assert.equal(validateBackup({...sample(),weights:[{date:'2026-02-30',weight:57}]}).ok,false));
check('Charge historique négative refusée',()=>assert.equal(validateBackup({...sample(),sessions:[{date:'2026-10-27',sets:[{exerciseId:'db-curl',load:-2}]}]}).ok,false));
check('Ancienne version refusée proprement',()=>assert.equal(validateBackup({...sample(),version:15}).ok,false));
check('Photo externe refusée',()=>assert.equal(validateBackup({...sample(),photos:[{date:'2026-10-27',uri:'https://evil.example/photo'}]}).ok,false));
check('Poids null refusé',()=>assert.equal(validateBackup({...sample(),weights:[{date:'2026-10-27',weight:null}]}).ok,false));
check('NaN refusé avant JSON.stringify',()=>assert.equal(validateBackup({...sample(),unknown:NaN}).ok,false));
check('Infini refusé',()=>assert.equal(validateBackup({...sample(),unknown:Infinity}).ok,false));
check('Profil adulte confirmé incohérent refusé',()=>assert.equal(validateBackup({...sample(),profile:{...sample().profile,confirmed:true,age:12}}).ok,false));
check('Mensuration négative refusée',()=>assert.equal(validateBackup({...sample(),measurements:[{date:'2026-10-27',arm:-10}]}).ok,false));
check('Brouillons absents normalisés',()=>assert.deepEqual(validateBackup(sample()).data.drafts,{}));
check('Brouillons null refusés',()=>assert.equal(validateBackup({...sample(),drafts:null}).ok,false));
check('Sets null refusés',()=>assert.equal(validateBackup(withDraft({sets:null,overrides:{}})).ok,false));
check('Overrides null refusés',()=>assert.equal(validateBackup(withDraft({sets:{},overrides:null})).ok,false));
check('Sets et overrides absents normalisés',()=>assert.deepEqual(validateBackup(withDraft({})).data.drafts['2026-10-26:a:normal'],{sets:{},overrides:{}}));
check('Brouillon primitif refusé',()=>assert.equal(validateBackup(withDraft('non')).ok,false));
check('Sets racine tableau refusé',()=>assert.equal(validateBackup(withDraft({sets:[]})).ok,false));
check('Liste de séries primitive refusée',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':'non'}})).ok,false));
check('Cases de séries non remplies conservées',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[null,{load:'7,5',reps:'10',rir:'3',done:true}]}})).data.drafts['2026-10-26:a:normal'].sets['db-curl'][0],null));
check('Chaînes numériques et virgules conservées',()=>{const result=validateBackup(withDraft({sets:{'db-curl':[{load:'7,5',reps:10,rir:'3',done:true}]},overrides:{'db-curl':'hammer-curl'}}));assert.equal(result.ok,true);assert.equal(result.data.drafts['2026-10-26:a:normal'].sets['db-curl'][0].load,'7,5');});
check('Brouillon partiel autorisé',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[{load:'',reps:'',rir:null,done:false}]}})).ok,true));
check('RIR supérieur à 10 refusé',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[{rir:'11'}]}})).ok,false));
check('Charge négative dans brouillon refusée',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[{load:'-2'}]}})).ok,false));
check('Case faite non booléenne refusée',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[{done:'oui'}]}})).ok,false));
check('Série validée vide refusée',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':[{done:true}]}})).ok,false));
check('Alternative inconnue refusée',()=>assert.equal(validateBackup(withDraft({overrides:{'db-curl':'exo-inconnu'}})).ok,false));
check('Tableau de plus de 50 séries refusé',()=>assert.equal(validateBackup(withDraft({sets:{'db-curl':Array.from({length:51},()=>({}))}})).ok,false));
check('Note de brouillon de mauvais type refusée',()=>assert.equal(validateBackup(withDraft({note:123})).ok,false));
check('Séries normalisées conservées à l’export',()=>{const out=validateBackup(serializeBackup(withDraft({})));assert.deepEqual(out.data.drafts['2026-10-26:a:normal'].sets,{});});
console.log(`\nBackup : ${checks} vérifications réussies.`);
