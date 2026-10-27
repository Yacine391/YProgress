/* Cross-module contracts used by the real screens; no browser or provider calls. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const nutrition = require('../../src/core/nutrition.js');
const training = require('../../src/core/trainingPlan.js');
const backup = require('../../src/core/backup.js');

function appStateWithMemory(seed = {}) {
  const memory = new Map(Object.entries(seed));
  const writes = [];
  const store = {
    async get(key, fallback) { return memory.has(key) ? JSON.parse(JSON.stringify(memory.get(key))) : fallback; },
    async set(key, data) { writes.push(data.testSequence); await Promise.resolve(); memory.set(key, JSON.parse(JSON.stringify(data))); return true; }
  };
  const code = babel.transformSync(fs.readFileSync(path.resolve(__dirname, '../../src/core/appState.js'), 'utf8'), {
    configFile: false, babelrc: false,
    plugins: [require.resolve('@babel/plugin-transform-modules-commonjs')]
  }).code;
  const module = { exports: {} };
  const imports = name => {
    if (name === '../services/storage/store') return { store, KEYS: { profile:'profile', weights:'weights', journal:'journal', logs:'logs', trainingHistory:'trainingHistory' }, async migrateLegacyKeys() {} };
    if (name === './nutrition') return nutrition;
    throw new Error(`Unexpected test import: ${name}`);
  };
  new Function('require', 'module', 'exports', code)(imports, module, module.exports);
  return { ...module.exports, memory, writes };
}

const cases = [];
function test(name, fn) { cases.push({ name, fn }); }

test('initial state has the real October date, 57 kg, no fabricated workouts and exportable data', () => {
  const app = appStateWithMemory();
  const state = app.defaultData();
  assert.equal(state.startDate, '2026-10-27');
  assert.equal(state.profile.weight, 57);
  assert.equal(state.profile.confirmed, false);
  assert.equal(state.weights[0].weight, 57);
  assert.deepEqual(state.sessions, []);
  assert.deepEqual(state.days, {});
  const restored = backup.validateBackup(backup.serializeBackup(state));
  assert.equal(restored.ok, true, restored.error);
  assert.deepEqual(restored.data, state);
});

test('Paris midnight and weekly calendar agree with the MMA programme through DST', () => {
  const app = appStateWithMemory();
  for (const time of ['2026-10-26T23:30:00Z', '2026-10-24T22:30:00Z', '2027-03-28T22:30:00Z']) {
    assert.equal(app.parisDate(new Date(time)), training.localDateKey(new Date(time)));
  }
  assert.equal(app.parisDate(new Date('2026-10-26T23:30:00Z')), '2026-10-27');
  const week = app.weekDates('2026-10-27');
  assert.deepEqual(week, ['2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
  assert.deepEqual(week.filter(date => training.getSession(app.dayIndex(date)).type === 'mma'), ['2026-10-27','2026-10-29']);
  assert.deepEqual(week.filter(date => training.getSession(app.dayIndex(date)).type === 'strength'), ['2026-10-26','2026-10-28','2026-10-30']);
  assert.deepEqual(week.filter(date => training.getSession(app.dayIndex(date)).type === 'recovery'), ['2026-10-31','2026-11-01']);
});

test('legacy migration keeps the raw historical record and imports meals without deleting old weights', async () => {
  const legacy = {
    profile: { name:'Yacine', weight:55, heightCm:170, age:21 },
    weights: [{ date:'2026-09-01', weight:55 }],
    journal: [{ date:'2026-10-25', sleepMin:450, water:750 }],
    logs: [{ date:'2026-10-25', label:'Repas ancien', calories:600, protein:30 }],
    trainingHistory: [{ exerciseId:'bench', actualLoad:30 }]
  };
  const app = appStateWithMemory(legacy);
  const state = await app.loadData();
  assert.deepEqual(state.legacy, legacy);
  assert.equal(state.profile.weight, 57);
  assert.equal(state.profile.confirmed, false);
  assert.equal(state.weights[0].weight, 55);
  assert.equal(state.weights.at(-1).weight, 57);
  assert.equal(state.days['2026-10-25'].sleepHours, '7.5');
  assert.equal(state.days['2026-10-25'].meals[0].name, 'Repas ancien');
  assert.equal(backup.validateBackup(backup.serializeBackup(state)).ok, true);
});

test('stored v17 state restores label fields with defaults and independent starting objects', async () => {
  const app = appStateWithMemory();
  const first = app.defaultData(), second = app.defaultData();
  first.supplements.whey.notes = 'Mon allergène';
  assert.equal(second.supplements.whey.notes, '');
  first.supplements = { whey:{ proteinPer100g:'80' } };
  app.memory.set(app.APP_STATE_KEY, first);
  const loaded = await app.loadData();
  assert.equal(loaded.supplements.whey.proteinPer100g, '80');
  assert.equal(loaded.supplements.whey.servingGrams, '');
  assert.equal(loaded.supplements.creatine.notes, '');
});

test('rapid edits are persisted in order so the last state wins', async () => {
  const app = appStateWithMemory();
  const results = await Promise.all([1,2,3].map(testSequence => app.saveData({ ...app.defaultData(), testSequence })));
  assert.deepEqual(results, [true,true,true]);
  assert.deepEqual(app.writes, [1,2,3]);
  assert.equal(app.memory.get(app.APP_STATE_KEY).testSequence, 3);
});

test('a real checked-series record and draft survive export with RIR and alternatives', () => {
  const app = appStateWithMemory(), state = app.defaultData();
  const session = training.getSession(1, { week:1 });
  const exercise = session.exercises.find(e => e.id === 'incline-db-press');
  const sets = [{ exerciseId:exercise.id, index:0, load:6, reps:12, rir:3, done:true }];
  const key = '2026-11-02:a:normal';
  state.drafts[key] = { sets:{ [exercise.id]:[{ load:'6', reps:'12', rir:'3', done:true }, null] }, overrides:{}, note:'Banc 20°' };
  state.sessions.push({ id:key, date:'2026-11-02', workoutId:'a', title:session.title, type:'strength', mode:'normal', durationMin:60, sets, note:'Banc 20°' });
  const read = backup.validateBackup(backup.serializeBackup(state));
  assert.equal(read.ok, true, read.error);
  assert.deepEqual(read.data.sessions[0].sets, sets);
  assert.equal(read.data.drafts[key].sets[exercise.id][1], null);
  const coverage = training.summarizeCoverage(read.data.sessions.map(s => ({ ...s, exercises:[{ exerciseId:exercise.id, sets:s.sets }] })));
  assert.equal(coverage.chest.sets, 1);
  assert.equal(coverage.triceps.indirectSets, 1);
});

test('confirmed label portion feeds the journal and reduces the whey requirement exactly', () => {
  const food = nutrition.nutritionForPortion({ calories:400, protein:20, carbs:45, fat:12 }, 150);
  const total = nutrition.sumMeals([{ ...food, name:'Repas pesé' }, { calories:120, protein:24, carbs:3, fat:1 }]);
  assert.equal(total.protein, 54);
  assert.equal(total.incomplete, false);
  const dose = nutrition.wheyDose({ weight:57, consumedProtein:total.protein, proteinPer100g:80 });
  assert.equal(dose.powderGrams, 40);
  assert.equal(dose.proteinGrams, 32);
  assert.equal(dose.remainingProtein, 24);
  const partial = nutrition.sumMeals([{ calories:200, protein:null, carbs:30, fat:8 }]);
  assert(partial.unknownFields.includes('protein'));
  assert.equal(nutrition.wheyDose({ consumedProtein:partial.unknownFields.includes('protein') ? null : partial.protein, proteinPer100g:80 }).status, 'intake_required');
});

test('malformed drafts are rejected before restoring a state that would crash training', () => {
  const app = appStateWithMemory();
  for (const drafts of [null, [], { '2026-11-02:a:normal':{ sets:null, overrides:{} } }, { '2026-11-02:a:normal':{ sets:{'incline-db-press':'not-an-array'}, overrides:{} } }]) {
    const state = { ...app.defaultData(), drafts };
    assert.equal(backup.validateBackup(state).ok, false, `Unsafe drafts accepted: ${JSON.stringify(drafts)}`);
  }
});

(async () => {
  let failed = 0;
  for (const { name, fn } of cases) {
    try { await fn(); console.log('PASS', name); }
    catch (error) { failed++; console.error('FAIL', name, '-', error.message); }
  }
  console.log(`${cases.length - failed}/${cases.length} integration contracts passed`);
  if (failed) process.exitCode = 1;
})();
