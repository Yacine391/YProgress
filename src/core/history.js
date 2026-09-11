// Journal quotidien persistant : la mémoire longue de YProgress.
// Sans ce module, le moteur adaptatif ne voit que la journée en cours.

const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const isDate = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
// Attention : Number(null) === 0, donc Number.isFinite(Number(null)) est true.
// Sans ce garde, une nuit non renseignée compterait comme 0 minute de sommeil.
const hasValue = (value) => value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value));
export const hasSleep = (day) => hasValue(day?.sleepMin);

export const DAY_FIELDS = [
  "date", "calories", "protein", "carbs", "fat",
  "steps", "sleepMin", "sleepQuality", "water", "weight",
  "gym", "jjb", "hardDay"
];

export function emptyDay(date) {
  return {
    date, calories: 0, protein: 0, carbs: 0, fat: 0,
    steps: 0, sleepMin: null, sleepQuality: null, water: 0, weight: null,
    gym: false, jjb: false, hardDay: false
  };
}

/** Fusionne un patch dans la journée `date` sans écraser les champs non fournis. */
export function upsertDay(history = [], patch = {}) {
  if (!isDate(patch.date)) return Array.isArray(history) ? history : [];
  const safe = Array.isArray(history) ? history.filter((d) => isDate(d?.date)) : [];
  const existing = safe.find((d) => d.date === patch.date) || emptyDay(patch.date);
  const merged = { ...existing };
  for (const key of DAY_FIELDS) {
    if (key === "date") continue;
    if (patch[key] === undefined) continue;
    if (key === "sleepMin" || key === "sleepQuality" || key === "weight") {
      merged[key] = patch[key] === null ? null : num(patch[key], null);
    } else if (key === "gym" || key === "jjb" || key === "hardDay") {
      merged[key] = Boolean(patch[key]);
    } else {
      merged[key] = Math.max(0, num(patch[key], 0));
    }
  }
  return [...safe.filter((d) => d.date !== patch.date), merged].sort((a, b) => a.date.localeCompare(b.date));
}

/** Les `n` dernières journées enregistrées, de la plus ancienne à la plus récente. */
export function lastNDays(history = [], n = 7) {
  const safe = Array.isArray(history) ? history.filter((d) => isDate(d?.date)) : [];
  return safe.slice(-Math.max(1, Math.round(n)));
}

/** Série de poids exploitable par detectPlateau (une entrée par jour pesé). */
export function weightSeries(history = []) {
  return (Array.isArray(history) ? history : [])
    .filter((d) => isDate(d?.date) && hasValue(d.weight) && Number(d.weight) > 0)
    .map((d) => ({ date: d.date, weight: Number(d.weight) }));
}

/** Dette de sommeil cumulée sur la fenêtre, en minutes (0 si aucune donnée). */
export function sleepDebt(history = [], targetSleepMin = 450, days = 7) {
  const nights = lastNDays(history, days).filter(hasSleep);
  if (!nights.length) return 0;
  return Math.max(0, Math.round(nights.reduce((sum, d) => sum + Math.max(0, targetSleepMin - Number(d.sleepMin)), 0)));
}

const average = (values) => (values.length ? values.reduce((s, v) => s + v, 0) / values.length : 0);

/**
 * Bilan réel sur la fenêtre (7 jours par défaut).
 * Ne compte que les journées effectivement enregistrées : pas de moyenne faussée par des zéros.
 */
export function weeklySummary(history = [], targets = {}, days = 7) {
  const window = lastNDays(history, days);
  const logged = window.filter((d) => num(d.calories) > 0 || num(d.protein) > 0 || num(d.steps) > 0 || hasSleep(d));
  const calorieTarget = Math.max(1, num(targets.calories, 2500));
  const proteinTarget = Math.max(1, num(targets.protein, 110));
  const stepTarget = Math.max(1, num(targets.steps, 10000));
  const sleepTarget = Math.max(1, num(targets.sleepMin, 450));

  if (!logged.length) {
    return { sampleDays: 0, score: 0, avgCalories: 0, avgProtein: 0, avgSteps: 0, avgSleepMin: 0, weightChange: 0, sleepDebtMin: 0 };
  }

  const avgCalories = average(logged.map((d) => num(d.calories)));
  const avgProtein = average(logged.map((d) => num(d.protein)));
  const avgSteps = average(logged.map((d) => num(d.steps)));
  const nights = logged.filter(hasSleep).map((d) => Number(d.sleepMin));
  const avgSleepMin = average(nights);

  const ratio = (value, target) => Math.min(1, Math.max(0, value / target));
  const score = Math.round(
    ratio(avgCalories, calorieTarget) * 35 +
    ratio(avgProtein, proteinTarget) * 25 +
    ratio(avgSteps, stepTarget) * 20 +
    (nights.length ? ratio(avgSleepMin, sleepTarget) * 20 : 10)
  );

  const weights = weightSeries(window);
  const weightChange = weights.length > 1
    ? Math.round((weights[weights.length - 1].weight - weights[0].weight) * 100) / 100
    : 0;

  return {
    sampleDays: logged.length,
    score: Math.max(0, Math.min(100, score)),
    avgCalories: Math.round(avgCalories),
    avgProtein: Math.round(avgProtein),
    avgSteps: Math.round(avgSteps),
    avgSleepMin: Math.round(avgSleepMin),
    weightChange,
    sleepDebtMin: sleepDebt(history, sleepTarget, days)
  };
}

/** Journées consécutives avec au moins une donnée, en terminant aujourd'hui. */
export function streak(history = [], today) {
  const safe = Array.isArray(history) ? history.filter((d) => isDate(d?.date)) : [];
  if (!isDate(today) || !safe.length) return 0;
  const byDate = new Map(safe.map((d) => [d.date, d]));
  let count = 0;
  const cursor = new Date(`${today}T12:00:00`);
  for (let i = 0; i < 400; i += 1) {
    const key = cursor.toISOString().slice(0, 10);
    const day = byDate.get(key);
    if (!day || (!num(day.calories) && !num(day.steps) && !hasSleep(day))) break;
    count += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}
