const assert = require("node:assert/strict");
const {
  proteinTarget, creatinePlan, wheyDose, validateNutrition,
  nutritionForPortion, sumMeals, DEFAULT_SUPPLEMENTS
} = require("../../src/core/nutrition.js");

let passed = 0;
function test(name, run) {
  try { run(); console.log("PASS", name); passed++; }
  catch (error) { console.error("FAIL", name, error); process.exitCode = 1; }
}

test("57 kg gives a food-plus-whey target of 110 g within 91–114 g", () => {
  assert.deepEqual(proteinTarget(57), { min: 91, max: 114, target: 110, valid: true });
  assert.equal(proteinTarget("57,5").valid, true);
  for (const weight of [null, "", -57, Infinity, true, {}, 0, 600]) assert.equal(proteinTarget(weight).valid, false);
});
test("creatine has no loading or catch-up dose", () => {
  assert.equal(creatinePlan().gramsPerDay, 3);
  assert.equal(creatinePlan().loading, false);
  assert.match(creatinePlan().missedDose, /Ne double pas/);
});
test("whey dose uses grams of powder, not grams of protein", () => {
  const dose = wheyDose({ consumedProtein: 86, proteinPer100g: 80, scoopGrams: 30 });
  assert.equal(dose.powderGrams, 30);
  assert.equal(dose.proteinGrams, 24);
  assert.equal(dose.scoops, 1);
  assert.equal(dose.remainingProtein, 0);
});
test("whey not prescribed from unknown intake or label", () => {
  assert.equal(wheyDose({ proteinPer100g: 80 }).status, "intake_required");
  assert.equal(wheyDose({ consumedProtein: "", proteinPer100g: 80 }).powderGrams, null);
  for (const density of [undefined, null, "", 0, 150, -3, "80g"]) {
    assert.equal(wheyDose({ consumedProtein: 86, proteinPer100g: density }).status, "label_required");
  }
  assert.equal(wheyDose({ consumedProtein: 86, proteinPer100g: "80,0" }).scoops, null);
});
test("no whey needed when the total target is already met", () => {
  const dose = wheyDose({ consumedProtein: 115 });
  assert.equal(dose.powderGrams, 0);
  assert.equal(dose.status, "ready");
});
test("a large deficit does not become a giant single shaker", () => {
  const dose = wheyDose({ consumedProtein: 10, proteinPer100g: 80, maxPowderGrams: 40 });
  assert.equal(dose.powderGrams, 40);
  assert.equal(dose.proteinGrams, 32);
  assert.equal(dose.remainingProtein, 68);
  assert.equal(dose.capped, true);
});
test("label conversion keeps unknown values unknown and respects 100 g basis", () => {
  assert.deepEqual(nutritionForPortion({ calories: 400, protein: 80, carbs: 8, fat: 5 }, 30), {
    calories: 120, protein: 24, carbs: 2.4, fat: 1.5
  });
  assert.deepEqual(nutritionForPortion({ protein: 20 }, "12,5"), { calories: null, protein: 2.5, carbs: null, fat: null });
  assert.equal(nutritionForPortion({ protein: 150 }, 100), null);
  assert.equal(nutritionForPortion({ protein: 20 }, ""), null);
  assert.equal(nutritionForPortion({ protein: 20 }, -20), null);
});
test("nutrition rejects negative or malformed values", () => {
  assert.equal(validateNutrition({ protein: -2 }).valid, false);
  assert.equal(validateNutrition({ protein: "15g" }).valid, false);
  assert.equal(validateNutrition({ protein: 80, carbs: 80, fat: 50 }, { per100g: true }).valid, false);
  assert.equal(validateNutrition({ protein: "0" }).values.protein, 0);
  assert.equal(validateNutrition({ protein: "" }).values.protein, null);
});
test("daily total flags partial food records instead of inventing nutrients", () => {
  const total = sumMeals([{ calories: 400, protein: 20, carbs: 50, fat: 10 }, { nutrition: { calories: 120, protein: 24, carbs: null, fat: 1.5 } }]);
  assert.equal(total.protein, 44);
  assert.equal(total.calories, 520);
  assert.equal(total.incomplete, true);
  assert.deepEqual(total.unknownFields, ["carbs"]);
  assert.equal(sumMeals([]).incomplete, false);
});
test("product labels start blank rather than fabricated", () => {
  assert.equal(DEFAULT_SUPPLEMENTS.whey.proteinPer100g, "");
  assert.equal(DEFAULT_SUPPLEMENTS.whey.servingGrams, "");
  assert.equal(DEFAULT_SUPPLEMENTS.creatine.creatinePerServing, "");
});
console.log(`${passed} nutrition tests passed`);
