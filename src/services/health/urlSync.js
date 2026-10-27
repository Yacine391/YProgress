/**
 * Pont avec l'app Raccourcis d'iOS.
 *
 * HealthKit est inaccessible depuis une PWA. En revanche, un raccourci iOS
 * sait lire les données Santé et ouvrir une URL : il suffit qu'il passe les
 * valeurs en paramètres, et l'application les importe dans son journal.
 *
 * Exemple d'URL produite par le raccourci :
 *   https://y-progress.vercel.app/?steps=8942&sleepMin=452&weight=55.2
 *
 * Aucune donnée ne transite par un serveur : tout reste sur l'appareil.
 */

// Bornes de vraisemblance : un raccourci mal configuré ne doit pas polluer le journal.
export const BOUNDS = {
  steps: [0, 100000],
  sleepMin: [0, 1080],      // 18 h maximum
  sleepQuality: [1, 5],
  weight: [25, 300],
  water: [0, 10000],
  calories: [0, 10000],
  protein: [0, 500]
};

const FIELDS = Object.keys(BOUNDS);

function parseValue(key, raw) {
  if (raw === null || raw === undefined || raw === "") return null;
  // Les raccourcis produisent parfois « 8 942 » ou « 55,2 » selon la locale.
  const cleaned = String(raw).replace(/\s| /g, "").replace(",", ".");
  const value = Number(cleaned);
  if (!Number.isFinite(value)) return null;
  const [lo, hi] = BOUNDS[key];
  if (value < lo || value > hi) return null;
  return key === "weight" ? Math.round(value * 10) / 10 : Math.round(value);
}

/**
 * Extrait les mesures d'une chaîne de recherche (`?steps=…`) ou d'un fragment.
 * @returns {{values:Object, rejected:string[], hasData:boolean}}
 */
export function parseHealthParams(search = "") {
  const raw = String(search || "").replace(/^[?#]/, "");
  const values = {};
  const rejected = [];
  if (!raw) return { values, rejected, hasData: false };

  let params;
  try {
    params = new URLSearchParams(raw);
  } catch (error) {
    return { values, rejected, hasData: false };
  }

  for (const key of FIELDS) {
    if (!params.has(key)) continue;
    const parsed = parseValue(key, params.get(key));
    if (parsed === null) rejected.push(key);
    else values[key] = parsed;
  }
  return { values, rejected, hasData: Object.keys(values).length > 0 };
}

/** Résumé lisible de ce qui vient d'être importé. */
export function describeSync(values = {}) {
  const parts = [];
  if (values.steps !== undefined) parts.push(`${values.steps.toLocaleString("fr-FR")} pas`);
  if (values.sleepMin !== undefined) {
    parts.push(`${Math.floor(values.sleepMin / 60)}h${String(values.sleepMin % 60).padStart(2, "0")} de sommeil`);
  }
  if (values.weight !== undefined) parts.push(`${String(values.weight).replace(".", ",")} kg`);
  if (values.water !== undefined) parts.push(`${values.water} ml`);
  if (values.calories !== undefined) parts.push(`${values.calories} kcal`);
  if (values.protein !== undefined) parts.push(`${values.protein} g de protéines`);
  return parts.join(" • ");
}

/**
 * Lit les paramètres de l'URL courante puis les efface de la barre d'adresse,
 * pour qu'un rechargement ne réimporte pas les mêmes valeurs.
 */
export function consumeHealthParams(win) {
  const target = win || (typeof window !== "undefined" ? window : null);
  if (!target || !target.location) return { values: {}, rejected: [], hasData: false };

  const fromSearch = parseHealthParams(target.location.search);
  const fromHash = fromSearch.hasData ? null : parseHealthParams(target.location.hash);
  // Le repli sur le fragment ne doit pas effacer les rejets détectés dans la
  // chaîne de recherche : sans ça, un raccourci mal réglé échouait en silence.
  const result = fromSearch.hasData
    ? fromSearch
    : fromHash && fromHash.hasData
      ? fromHash
      : {
        values: {},
        rejected: [...new Set([...fromSearch.rejected, ...((fromHash && fromHash.rejected) || [])])],
        hasData: false
      };

  if (result.hasData && target.history && target.history.replaceState) {
    try {
      target.history.replaceState(null, "", target.location.pathname);
    } catch (error) {
      /* la barre d'adresse n'est pas critique */
    }
  }
  return result;
}
