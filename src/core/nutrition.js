/**
 * Repères pour un adulte en bonne santé qui débute la musculation.
 * Les quantités de poudre ne sont jamais confondues avec les protéines.
 * Sources primaires consultées le 27 octobre 2026, voir REFERENCES.
 * Le choix 1,6–2 g/kg se situe dans la plage ISSN 1,4–2 g/kg/j.
 */

export const REFERENCES = [
  { id: "protein", title: "ISSN — Protein and exercise", url: "https://link.springer.com/article/10.1186/s12970-017-0177-8" },
  { id: "creatine", title: "ISSN — Safety and efficacy of creatine", url: "https://link.springer.com/article/10.1186/s12970-017-0173-z" }
];

export const SUPPLEMENT_CAUTION = "Repères pour un adulte en bonne santé. Moins de 18 ans, maladie rénale, grossesse ou traitement : demande un avis médical avant les compléments. Une fatigue persistante mérite aussi un avis médical.";

export const DEFAULT_SUPPLEMENTS = {
  whey: {
    brand: "", servingGrams: "", proteinPer100g: "", caloriesPer100g: "",
    carbsPer100g: "", fatPer100g: "", notes: ""
  },
  creatine: { brand: "", servingGrams: "", creatinePerServing: "", notes: "" }
};

const FIELDS = ["calories", "protein", "carbs", "fat"];
const round1 = value => Math.round((value + Number.EPSILON) * 10) / 10;

/** Empty, null, booleans and malformed strings must not silently become zero. */
function number(value) {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string") {
    const text = value.trim().replace(",", ".");
    if (!/^(?:\d+(?:\.\d+)?|\.\d+)$/.test(text)) return null;
    value = Number(text);
  }
  return Number.isFinite(value) && value >= 0 ? value : null;
}

export function proteinTarget(weight = 57) {
  const kg = number(weight);
  if (kg === null || kg < 20 || kg > 300) {
    return { min: null, max: null, target: null, valid: false };
  }
  const min = Math.round(kg * 1.6);
  const max = Math.round(kg * 2);
  // A simple target, rounded to 5 g, without moving outside the range.
  const target = Math.max(min, Math.min(max, Math.round(kg * 1.9 / 5) * 5));
  return { min, max, target, valid: true };
}

export function creatinePlan() {
  return {
    gramsPerDay: 3,
    form: "monohydrate",
    loading: false,
    frequency: "Tous les jours, entraînement ou repos.",
    timing: "Avec un repas si cela facilite l'habitude. L'heure exacte importe peu.",
    instruction: "3 g de créatine monohydrate par jour. Pèse la poudre : une cuillère n'a pas de poids universel.",
    missedDose: "Si tu oublies une prise, reprends la dose normale le lendemain. Ne double pas.",
    note: "Sans phase de charge ; la saturation se fait progressivement sur environ 3 à 4 semaines. Une hausse initiale du poids peut aussi refléter de l'eau dans les muscles.",
    caution: SUPPLEMENT_CAUTION
  };
}

/**
 * Compute powder from the label concentration and a known total food intake.
 * maxPowderGrams is an app convenience cap per serving, not a medical limit.
 * If the intake is still incomplete, do not present this as a daily prescription.
 */
export function wheyDose({ weight = 57, consumedProtein, proteinPer100g, scoopGrams, maxPowderGrams = 40 } = {}) {
  const target = proteinTarget(weight);
  const base = {
    status: "invalid", proteinTarget: target.target, missingProtein: null,
    powderGrams: null, proteinGrams: null, scoops: null, capped: false,
    remainingProtein: null, message: "Vérifie les valeurs saisies."
  };
  if (!target.valid) return { ...base, message: "Renseigne un poids valide en kg." };
  const consumed = number(consumedProtein);
  if (consumed === null || consumed > 1000) {
    return { ...base, status: "intake_required", message: "Renseigne tes protéines alimentaires de la journée avant de calculer un complément." };
  }
  const missing = round1(Math.max(0, target.target - consumed));
  if (missing === 0) {
    return { ...base, status: "ready", missingProtein: 0, powderGrams: 0, proteinGrams: 0, remainingProtein: 0, message: "Objectif déjà couvert : aucune whey nécessaire." };
  }
  const density = number(proteinPer100g);
  if (density === null || density <= 0 || density > 100) {
    return { ...base, status: "label_required", missingProtein: missing, message: "Recopie les protéines pour 100 g de poudre sur ta boîte. Aucun scoop supposé." };
  }
  const cap = number(maxPowderGrams);
  if (cap === null || cap <= 0 || cap > 200) return base;
  const neededPowder = missing * 100 / density;
  const powder = round1(Math.min(cap, neededPowder));
  const supplied = round1(powder * density / 100);
  const scoop = number(scoopGrams);
  const remaining = round1(Math.max(0, missing - supplied));
  const capped = neededPowder > cap;
  return {
    ...base, status: "ready", missingProtein: missing, powderGrams: powder,
    proteinGrams: supplied, scoops: scoop && scoop <= 200 ? round1(powder / scoop) : null,
    capped, remainingProtein: remaining,
    message: capped
      ? `${powder} g de poudre apportent ${supplied} g de protéines. Il reste environ ${remaining} g à couvrir avec tes repas ; ne remplace pas la journée par des shakers.`
      : `${powder} g de poudre apportent environ ${supplied} g de protéines. À ajuster selon tes repas restants.`
  };
}

/** Accept partial data without manufacturing missing numbers. */
export function validateNutrition(input = {}, { per100g = false } = {}) {
  const values = {};
  const errors = [];
  for (const field of FIELDS) {
    const raw = input?.[field];
    const empty = raw === null || raw === undefined || raw === "";
    const parsed = empty ? null : number(raw);
    values[field] = parsed;
    if (!empty && parsed === null) errors.push(`${field}: nombre positif attendu`);
    if (parsed !== null && parsed > (field === "calories" ? (per100g ? 1000 : 10000) : (per100g ? 100 : 1000))) {
      errors.push(`${field}: unité ou valeur à vérifier`);
    }
  }
  if (per100g && [values.protein, values.carbs, values.fat].every(v => v !== null)
      && values.protein + values.carbs + values.fat > 105) {
    errors.push("Les macronutriments dépassent 100 g : vérifie la base de l'étiquette.");
  }
  return { valid: errors.length === 0, complete: FIELDS.every(field => values[field] !== null), values, errors };
}

/** Values on the label must be per 100 g, and the eaten portion is in grams. */
export function nutritionForPortion(per100g = {}, grams) {
  const portion = number(grams);
  const checked = validateNutrition(per100g, { per100g: true });
  if (portion === null || portion <= 0 || portion > 5000 || !checked.valid) return null;
  return Object.fromEntries(FIELDS.map(field => [field,
    checked.values[field] === null ? null : round1(checked.values[field] * portion / 100)
  ]));
}

/** Sum confirmed meals only; an unknown value is tracked, never silently known. */
export function sumMeals(meals = []) {
  const validMeals = Array.isArray(meals) ? meals.filter(Boolean) : [];
  const totals = { calories: 0, protein: 0, carbs: 0, fat: 0 };
  const unknownFields = [];
  for (const field of FIELDS) {
    let unknown = false;
    for (const meal of validMeals) {
      const value = number((meal.nutrition || meal)[field]);
      if (value === null) unknown = true;
      else totals[field] += value;
    }
    totals[field] = round1(totals[field]);
    if (unknown) unknownFields.push(field);
  }
  return { ...totals, incomplete: unknownFields.length > 0, unknownFields };
}
