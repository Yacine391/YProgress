/**
 * Liste de courses hebdomadaire.
 *
 * L'ancienne version plafonnait les quantités en dur : au-delà d'environ 57 €
 * le budget n'était plus utilisé, et elle achetait jusqu'à 164 % des protéines
 * nécessaires. Ici on remplit au plus utile : à chaque tour on sert le nutriment
 * le plus en retard, avec le meilleur rendement par euro, et on s'arrête dès que
 * les besoins sont couverts — même s'il reste du budget.
 */

const round2 = (v) => Math.round(v * 100) / 100;

// Valeurs pour une unité (kg, boîte…). Prix indicatifs en euros, ajustables.
export const CATALOG = [
  // `staple` = source à faire figurer dans la semaine, par ordre de préférence.
  { id: "chicken", name: "Poulet", unit: "kg", price: 11, protein: 230, calories: 1650, maxUnits: 3, staple: 1 },
  { id: "eggs", name: "Œufs", unit: "boîte de 12", price: 3.5, protein: 84, calories: 840, maxUnits: 4, staple: 2 },
  { id: "skyr", name: "Skyr", unit: "kg", price: 4, protein: 100, calories: 600, maxUnits: 4, staple: 3 },
  { id: "lentils", name: "Lentilles", unit: "kg", price: 3, protein: 240, calories: 3500, maxUnits: 2, staple: 4 },
  { id: "rice", name: "Riz", unit: "kg", price: 2.5, protein: 70, calories: 3600, maxUnits: 3 },
  { id: "oats", name: "Flocons d’avoine", unit: "kg", price: 2.2, protein: 130, calories: 3700, maxUnits: 3 },
  { id: "pasta", name: "Pâtes complètes", unit: "kg", price: 2, protein: 120, calories: 3500, maxUnits: 3 },
  { id: "vegetables", name: "Légumes variés", unit: "kg", price: 4, protein: 20, calories: 400, maxUnits: 3, essential: true },
  { id: "bananas", name: "Bananes", unit: "kg", price: 2.2, protein: 11, calories: 890, maxUnits: 2, essential: true },
  { id: "olive-oil", name: "Huile d’olive", unit: "50 cl", price: 5, protein: 0, calories: 4050, maxUnits: 1, essential: true }
];

export function buildGroceryList({ budget = 60, weeklyCalories = 17500, weeklyProtein = 770, exclude = [] } = {}) {
  const limit = Math.max(10, Number(budget) || 0);
  const calorieTarget = Math.max(1, Number(weeklyCalories) || 0);
  const proteinTarget = Math.max(1, Number(weeklyProtein) || 0);
  const skip = new Set(Array.isArray(exclude) ? exclude : []);
  const catalog = CATALOG.filter((p) => !skip.has(p.id));

  const picked = new Map();
  let spent = 0, protein = 0, calories = 0;

  const unitsOf = (id) => (picked.get(id)?.quantity || 0);
  const add = (product) => {
    if (round2(spent + product.price) > limit) return false;
    const current = picked.get(product.id) || { ...product, quantity: 0, totalPrice: 0 };
    current.quantity += 1;
    current.totalPrice = round2(current.quantity * product.price);
    picked.set(product.id, current);
    spent = round2(spent + product.price);
    protein += product.protein;
    calories += product.calories;
    return true;
  };

  // Les essentiels d'abord : une semaine sans légumes ni matière grasse n'est pas une semaine.
  for (const product of catalog.filter((p) => p.essential)) add(product);

  // Variété : au moins une unité de chaque source protéinée, par ordre de préférence.
  // Sans cette étape, le remplissage au meilleur rendement par euro produit une
  // semaine entière de lentilles — nutritionnellement correct, humainement non.
  const staples = catalog.filter((p) => p.staple).sort((a, b) => a.staple - b.staple);
  for (const product of staples) {
    if (protein >= proteinTarget) break;
    add(product);
  }

  // Remplissage glouton. La borne de boucle est un garde-fou, pas la condition d'arrêt.
  for (let i = 0; i < 200; i += 1) {
    const proteinGap = proteinTarget - protein;
    const calorieGap = calorieTarget - calories;
    if (proteinGap <= 0 && calorieGap <= 0) break;

    // On sert le nutriment proportionnellement le plus en retard.
    const servesProtein = proteinGap / proteinTarget >= calorieGap / calorieTarget;
    const candidates = catalog
      .filter((p) => round2(spent + p.price) <= limit)
      .filter((p) => unitsOf(p.id) < (p.maxUnits || 3))
      .filter((p) => (servesProtein ? p.protein > 0 : p.calories > 0));
    if (!candidates.length) break;

    // Le rendement par euro est pondéré par ce qu'on a déjà pris : à efficacité
    // voisine, on diversifie plutôt que d'empiler dix fois le même produit.
    const yieldPerEuro = (p) => ((servesProtein ? p.protein : p.calories) / p.price) / (1 + unitsOf(p.id) * 0.6);
    candidates.sort((a, b) => yieldPerEuro(b) - yieldPerEuro(a));
    if (!add(candidates[0])) break;
  }

  // Le budget saisi est une capacité, pas une contrainte à minimiser : s'il reste
  // de la marge une fois les besoins couverts, on améliore la semaine avec les
  // sources préférées — sans jamais dépasser des bornes nutritionnelles saines.
  const PROTEIN_CEILING = 1.45, CALORIE_CEILING = 1.2;
  for (let i = 0; i < 40; i += 1) {
    if (spent >= limit * 0.8) break;
    const upgrade = staples.find((p) =>
      round2(spent + p.price) <= limit &&
      unitsOf(p.id) < (p.maxUnits || 3) &&
      protein + p.protein <= proteinTarget * PROTEIN_CEILING &&
      calories + p.calories <= calorieTarget * CALORIE_CEILING
    );
    if (!upgrade || !add(upgrade)) break;
  }

  const items = [...picked.values()].sort((a, b) => b.totalPrice - a.totalPrice);
  return {
    items,
    total: round2(spent),
    remaining: round2(limit - spent),
    estimatedProtein: protein,
    estimatedCalories: calories,
    budget: limit,
    // Taux de couverture : l'app doit pouvoir dire honnêtement si la liste suffit.
    proteinCoverage: Math.round((protein / proteinTarget) * 100),
    calorieCoverage: Math.round((calories / calorieTarget) * 100)
  };
}

/** Bascule l'état « pris » d'un article, en conservant l'ordre de la liste. */
export function toggleGroceryItem(checked = [], id) {
  if (!id) return checked;
  const set = new Set(Array.isArray(checked) ? checked : []);
  if (set.has(id)) set.delete(id);
  else set.add(id);
  return [...set];
}

/** Montant déjà mis dans le panier, d'après les articles cochés. */
export function checkedTotal(list, checked = []) {
  const set = new Set(Array.isArray(checked) ? checked : []);
  const items = (list && Array.isArray(list.items) ? list.items : []).filter((i) => set.has(i.id));
  return round2(items.reduce((sum, i) => sum + i.totalPrice, 0));
}
