/**
 * Calcul des objectifs à partir du profil réel.
 *
 * Avant ce module, calories/protéines étaient des constantes (2500 / 110 g)
 * valables pour une seule personne. Ici tout est dérivé de la morphologie,
 * de l'activité et de l'objectif — avec des garde-fous qui interdisent
 * une recommandation dangereuse (voir SAFETY plus bas).
 */

const num = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const round5 = (v) => Math.round(v / 5) * 5;

export const SEXES = [
  { id: "male", label: "Homme" },
  { id: "female", label: "Femme" },
  { id: "unspecified", label: "Non précisé" }
];

export const ACTIVITY_LEVELS = [
  { id: "sedentary", factor: 1.2, label: "Sédentaire", hint: "Bureau, peu de marche" },
  { id: "light", factor: 1.375, label: "Peu actif", hint: "1 à 3 séances / semaine" },
  { id: "moderate", factor: 1.55, label: "Actif", hint: "3 à 5 séances / semaine" },
  { id: "high", factor: 1.725, label: "Très actif", hint: "6 séances ou plus, métier physique" }
];

export const GOALS = [
  { id: "lean_gain", label: "Prise de masse", adjust: 0.10, protein: 1.9, weeklyKg: 0.22 },
  { id: "recomp", label: "Recomposition", adjust: 0.0, protein: 2.1, weeklyKg: 0 },
  { id: "cut", label: "Sèche", adjust: -0.15, protein: 2.3, weeklyKg: -0.45 },
  { id: "maintain", label: "Maintien", adjust: 0.0, protein: 1.8, weeklyKg: 0 }
];

/**
 * SAFETY — bornes non négociables.
 * Elles priment toujours sur le résultat du calcul : l'app ne doit jamais
 * proposer un déficit agressif ni un apport protéique excessif.
 */
export const SAFETY = {
  minCalories: 1400,
  maxCalories: 6000,
  minDeficitFloorFactor: 1.1, // plancher = métabolisme de base × 1,1
  maxSurplusKcal: 400,
  maxDeficitKcal: 500,
  maxProteinPerKg: 2.6,
  minFatPerKg: 0.6,
  minFatGrams: 45
};

/** Le profil stocké utilise `weight`, l'équation parle en `weightKg` : on accepte les deux. */
function normalize(profile = {}) {
  return {
    ...profile,
    weightKg: num(profile.weightKg, num(profile.weight)),
    heightCm: num(profile.heightCm),
    age: num(profile.age)
  };
}

export function activityFactor(id) {
  return (ACTIVITY_LEVELS.find((a) => a.id === id) || ACTIVITY_LEVELS[1]).factor;
}

export function goalConfig(id) {
  return GOALS.find((g) => g.id === id) || GOALS[0];
}

/** Mifflin-St Jeor — l'équation de référence pour le métabolisme de base. */
export function basalMetabolicRate({ weightKg, heightCm, age, sex } = {}) {
  const w = num(weightKg), h = num(heightCm), a = num(age);
  if (w <= 0 || h <= 0 || a <= 0) return 0;
  const base = 10 * w + 6.25 * h - 5 * a;
  if (sex === "male") return Math.round(base + 5);
  if (sex === "female") return Math.round(base - 161);
  // Sexe non précisé : moyenne des deux, plutôt que d'imposer une valeur.
  return Math.round(base - 78);
}

export function maintenanceCalories(profile = {}) {
  const bmr = basalMetabolicRate(normalize(profile));
  if (!bmr) return 0;
  return Math.round(bmr * activityFactor(profile.activity));
}

export function isProfileComplete(profile = {}) {
  const p = normalize(profile);
  return (
    p.weightKg > 0 &&
    p.heightCm > 0 &&
    p.age > 0 &&
    typeof p.sex === "string" &&
    typeof p.activity === "string" &&
    typeof p.goal === "string"
  );
}

/**
 * Objectifs journaliers dérivés du profil.
 * Renvoie aussi `rationale` : l'app doit pouvoir expliquer d'où sort chaque chiffre.
 */
export function computeTargets(input = {}) {
  const profile = normalize(input);
  const bmr = basalMetabolicRate(profile);
  const maintenance = maintenanceCalories(profile);
  const goal = goalConfig(profile.goal);
  const weight = profile.weightKg;
  const rationale = [];

  if (!bmr || !weight) {
    return {
      calories: 2200, protein: 110, fat: 70, steps: 8000, sleepMin: 450,
      bmr: 0, maintenance: 0, weeklyKg: 0, capped: false,
      rationale: ["Profil incomplet : objectifs génériques en attendant tes mesures."]
    };
  }

  // --- Calories ---
  let delta = maintenance * goal.adjust;
  let capped = false;
  if (delta > SAFETY.maxSurplusKcal) { delta = SAFETY.maxSurplusKcal; capped = true; }
  if (delta < -SAFETY.maxDeficitKcal) { delta = -SAFETY.maxDeficitKcal; capped = true; }

  // L'arrondi à 5 kcal se fait AVANT les bornes : sinon il peut repousser
  // le résultat d'une ou deux calories au-delà du plafond de déficit.
  let calories = round5(maintenance + delta);
  const ceil5 = (v) => Math.ceil(v / 5) * 5;
  const floor5 = (v) => Math.floor(v / 5) * 5;
  calories = clamp(calories, ceil5(maintenance - SAFETY.maxDeficitKcal), floor5(maintenance + SAFETY.maxSurplusKcal));

  // Le plancher métabolique prime sur le plafond de déficit : il ne fait que remonter les calories.
  const floor = Math.max(SAFETY.minCalories, Math.round(bmr * SAFETY.minDeficitFloorFactor));
  if (calories < floor) { calories = ceil5(floor); capped = true; }
  calories = clamp(calories, ceil5(SAFETY.minCalories), floor5(SAFETY.maxCalories));

  rationale.push(`Métabolisme de base ${bmr} kcal, maintenance estimée ${maintenance} kcal.`);
  rationale.push(
    goal.adjust > 0 ? `Objectif ${goal.label.toLowerCase()} : +${Math.round(delta)} kcal.`
      : goal.adjust < 0 ? `Objectif ${goal.label.toLowerCase()} : ${Math.round(delta)} kcal.`
        : `Objectif ${goal.label.toLowerCase()} : calories au niveau de maintenance.`
  );
  if (capped) rationale.push("Ajustement volontairement limité : progression durable plutôt que rapide.");

  // --- Protéines ---
  const proteinPerKg = Math.min(goal.protein, SAFETY.maxProteinPerKg);
  const protein = Math.round(weight * proteinPerKg);
  rationale.push(`${String(proteinPerKg).replace(".", ",")} g de protéines par kilo, soit ${protein} g par jour.`);

  // --- Lipides : jamais sous le seuil hormonal ---
  let fat = Math.max(SAFETY.minFatGrams, Math.round(weight * 0.9));
  const fromProtein = protein * 4;
  const maxFatKcal = calories - fromProtein - 80 * 4; // on garde au moins 80 g de glucides
  if (fat * 9 > maxFatKcal) {
    fat = Math.max(SAFETY.minFatGrams, Math.round(Math.max(weight * SAFETY.minFatPerKg, maxFatKcal / 9)));
  }

  // --- Pas & sommeil ---
  const steps = { sedentary: 7000, light: 8500, moderate: 10000, high: 12000 }[profile.activity] || 9000;
  const sleepMin = num(profile.sleepMin) >= 300 ? num(profile.sleepMin) : 450;

  return {
    calories, protein, fat, steps, sleepMin,
    bmr, maintenance,
    weeklyKg: goal.weeklyKg,
    capped,
    rationale
  };
}

/** Bornes d'affichage de la variation de poids attendue, en kg/semaine. */
export function expectedWeeklyRange(goalId) {
  const goal = goalConfig(goalId);
  if (!goal.weeklyKg) return { low: -0.15, high: 0.15 };
  const low = goal.weeklyKg > 0 ? goal.weeklyKg * 0.6 : goal.weeklyKg * 1.3;
  const high = goal.weeklyKg > 0 ? goal.weeklyKg * 1.4 : goal.weeklyKg * 0.6;
  return { low: Math.round(low * 100) / 100, high: Math.round(high * 100) / 100 };
}
