// Les extensions du schéma restent incluses dans l'export.
import {EXERCISE_BY_ID} from './trainingPlan.js';
const MAX_BYTES = 8 * 1024 * 1024;
const FORBIDDEN = new Set(['__proto__', 'prototype', 'constructor']);
const datePattern = /^\d{4}-\d{2}-\d{2}$/;
export function validDate(value) {
  if (typeof value !== 'string' || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function walk(value, depth = 0, count = { value: 0 }) {
  if (depth > 18 || ++count.value > 120000) throw new Error('Sauvegarde trop complexe.');
  if (value === null || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) throw new Error('Une valeur numérique est invalide.');
    return;
  }
  if (typeof value === 'string') {
    if (value.length > 1100000) throw new Error('Une image ou un texte dépasse la limite.');
    return;
  }
  if (typeof value !== 'object') throw new Error('Format de sauvegarde non pris en charge.');
  if (Array.isArray(value)) {
    if (value.length > 30000) throw new Error('Liste trop volumineuse.');
    value.forEach(item => walk(item, depth + 1, count));
    return;
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Objet de sauvegarde non pris en charge.');
  for (const key of Object.keys(value)) {
    if (FORBIDDEN.has(key)) throw new Error('Clé de sauvegarde interdite.');
    walk(value[key], depth + 1, count);
  }
}

function assert(condition, message) { if (!condition) throw new Error(message); }
const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteRange = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const draftNumber = (value,min,max) => {
  if (value === undefined || value === null || value === '') return true;
  if (typeof value === 'number') return finiteRange(value,min,max);
  return typeof value === 'string' && value.length <= 16 && /^\d*(?:[.,]\d*)?$/.test(value.trim()) && finiteRange(Number(value.replace(',','.')),min,max);
};
const draftValue = value => value === null || value === undefined || String(value).trim() === '' ? null : Number(String(value).replace(',','.'));

function normalizeDrafts(value) {
  if (value === undefined) return {};
  assert(record(value) && Object.keys(value).length <= 5000, 'Brouillons d’entraînement invalides.');
  const drafts = {};
  for (const [key, original] of Object.entries(value)) {
    assert(key.length <= 180 && record(original), 'Un brouillon d’entraînement est invalide.');
    const sourceSets=original.sets === undefined ? {} : original.sets,overrides=original.overrides === undefined ? {} : original.overrides;
    assert(record(sourceSets) && Object.keys(sourceSets).length <= 100, 'Les séries d’un brouillon sont invalides.');
    assert(record(overrides) && Object.keys(overrides).length <= 100, 'Les alternatives d’un brouillon sont invalides.');
    const sets={};
    for (const [exerciseId, entries] of Object.entries(sourceSets)) {
      assert(exerciseId.length > 0 && exerciseId.length <= 120 && Array.isArray(entries) && entries.length <= 50, 'Une liste de séries est invalide.');
      sets[exerciseId]=entries.map(entry=>{
        // Un tableau saisi à partir de la deuxième série contient des cases nulles après JSON.
        if (entry === null) return null;
        assert(record(entry), 'Une série du brouillon est invalide.');
        assert(draftNumber(entry.load,0,1000) && draftNumber(entry.reps,0,1000) && draftNumber(entry.rir,0,10), 'Les valeurs d’une série du brouillon sont invalides.');
        if (entry.done !== undefined) assert(typeof entry.done === 'boolean', 'La validation d’une série doit être un booléen.');
        if (entry.done) {
          assert(draftValue(entry.reps) > 0, 'Une série validée doit contenir des répétitions.');
          if (!EXERCISE_BY_ID[exerciseId]?.isTimed) assert(draftValue(entry.load) !== null, 'Une série validée doit contenir une charge.');
        }
        return entry;
      });
    }
    for (const [sourceId, targetId] of Object.entries(overrides)) assert(sourceId.length <= 120 && typeof targetId === 'string' && Object.hasOwn(EXERCISE_BY_ID,targetId), 'Une alternative d’exercice est inconnue.');
    if (original.startedAt !== undefined && original.startedAt !== null) assert(finiteRange(original.startedAt,0,8640000000000000), 'Le début du brouillon est invalide.');
    if (original.note !== undefined) assert(typeof original.note === 'string' && original.note.length <= 20000, 'La note du brouillon est invalide.');
    drafts[key]={...original,sets,overrides:{...overrides}};
  }
  return drafts;
}

export function validateBackup(input) {
  try {
    if (typeof input !== 'string') walk(input);
    const text = typeof input === 'string' ? input : JSON.stringify(input);
    assert(typeof text === 'string' && text.length <= MAX_BYTES, 'Sauvegarde trop volumineuse (8 Mo maximum).');
    const parsed = JSON.parse(text);
    walk(parsed);
    const sourceData = parsed.app === 'YProgress' && record(parsed.data) ? parsed.data : parsed;
    assert(record(sourceData), 'Format de sauvegarde invalide.');
    const data={...sourceData,drafts:normalizeDrafts(sourceData.drafts)};
    assert(record(data) && Number(data.version) === 17, 'Choisis une sauvegarde YProgress version 17. Les anciennes données locales restent conservées par l’application.');
    assert(record(data.profile), 'Profil absent de la sauvegarde.');
    assert(typeof data.profile.name === 'string' && data.profile.name.trim().length > 0 && data.profile.name.length <= 80, 'Prénom invalide.');
    assert(finiteRange(data.profile.weight, 25, 300), 'Poids du profil invalide.');
    if (data.profile.confirmed) {
      assert(finiteRange(data.profile.age,18,90) && Number.isInteger(data.profile.age), 'Âge du profil invalide.');
      assert(finiteRange(data.profile.heightCm,120,230), 'Taille du profil invalide.');
      assert(['male','female','unspecified'].includes(data.profile.sex), 'Repère du profil invalide.');
      assert(['sedentary','light','moderate','high'].includes(data.profile.activity), 'Niveau d’activité invalide.');
      assert(['lean_gain','recomp','cut','maintain'].includes(data.profile.goal), 'Objectif du profil invalide.');
    }
    assert(validDate(data.startDate), 'Date de démarrage invalide.');
    assert(Array.isArray(data.weights), 'Historique du poids absent.');
    for (const entry of data.weights) assert(record(entry) && validDate(entry.date) && finiteRange(entry.weight, 25, 300), 'Une pesée est invalide.');
    assert(record(data.days), 'Journal quotidien absent.');
    for (const [date, entry] of Object.entries(data.days)) {
      assert(validDate(date) && record(entry), 'Une date du journal est invalide.');
      if (entry.meals !== undefined) {
        assert(Array.isArray(entry.meals), 'Liste de repas invalide.');
        for (const meal of entry.meals) {
          assert(record(meal), 'Repas invalide.');
          if (meal.name !== undefined) assert(typeof meal.name === 'string' && meal.name.length <= 500, 'Nom de repas invalide.');
          for (const key of ['calories', 'protein', 'carbs', 'fat']) {
            if (meal[key] !== undefined && meal[key] !== null) assert(finiteRange(meal[key], 0, 20000), 'Valeur nutritionnelle invalide.');
          }
        }
      }
      if (entry.water !== undefined) assert(finiteRange(entry.water, 0, 20000), 'Quantité d’eau invalide.');
      if (entry.note !== undefined) assert(typeof entry.note === 'string', 'Note du journal invalide.');
    }
    assert(Array.isArray(data.sessions), 'Historique d’entraînement absent.');
    for (const session of data.sessions) {
      assert(record(session) && validDate(session.date) && Array.isArray(session.sets), 'Séance invalide.');
      for (const set of session.sets) {
        assert(record(set) && typeof set.exerciseId === 'string', 'Série invalide.');
        if (set.load !== undefined) assert(finiteRange(set.load, 0, 1000), 'Charge invalide.');
        if (set.reps !== undefined) assert(finiteRange(set.reps, 0, 1000), 'Répétitions invalides.');
      }
    }
    assert(record(data.supplements), 'Informations des compléments absentes.');
    for (const key of ['photos', 'measurements', 'chat']) if (data[key] !== undefined) assert(Array.isArray(data[key]), `Liste ${key} invalide.`);
    for (const entry of data.measurements || []) {
      assert(record(entry) && validDate(entry.date), 'Date de mensurations invalide.');
      for (const key of ['arm','chest','waist','thigh']) if (entry[key] !== undefined) assert(finiteRange(entry[key],5,250), 'Mensuration invalide.');
    }
    for (const photo of data.photos || []) assert(record(photo) && validDate(photo.date) && typeof photo.uri === 'string' && /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(photo.uri), 'Photo de suivi invalide.');
    return { ok: true, data, summary: { weights: data.weights.length, sessions: data.sessions.length, days: Object.keys(data.days).length, photos: (data.photos || []).length } };
  } catch (error) { return { ok: false, error: error.message || 'Le fichier ne peut pas être lu.' }; }
}

export function serializeBackup(data, now = new Date()) {
  const result = validateBackup(data);
  if (!result.ok) throw new Error(result.error);
  return JSON.stringify({ app: 'YProgress', version: 17, exportedAt: now.toISOString(), data: result.data }, null, 2);
}
