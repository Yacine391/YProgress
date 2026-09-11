/**
 * YProgress — système de design « liquid glass ».
 *
 * Palette échantillonnée directement sur la maquette de référence
 * (DesignYPROGRESS.png) : fond noir bleuté, halos ambiants violets,
 * surfaces en verre translucide, dégradés bleu → violet → rose.
 *
 * Aucune couleur en dur ailleurs dans l'application : tout passe par ici.
 */

export const palette = {
  // Fonds : noir bleuté, jamais du gris neutre.
  void: "#020A1A",
  deep: "#050D22",
  night: "#0A0F26",
  navBar: "#0A0A1D",

  // Halos ambiants (blobs de fond)
  auraViolet: "#3C126F",
  auraBlue: "#0B2A6B",
  auraPink: "#5B1147",

  // Encre
  ink: "#FFFFFF",
  inkSoft: "#D8DEF2",
  inkMuted: "#8E96B8",
  inkFaint: "#5A6084",
  inkInverse: "#03071A",

  // Accents
  blue: "#2550FC",
  blueSoft: "#4B8DE1",
  cyan: "#55D0FC",
  cyanDeep: "#2BC4EC",
  violet: "#7A49E3",
  violetSoft: "#A77BF0",
  pink: "#D43FA1",
  pinkSoft: "#DA73C1",
  rose: "#FBA0BC",
  crimson: "#C93B52",

  // Teintes de carte par métrique (relevées sur la maquette)
  tintCalories: "#5B1A4E",
  tintProtein: "#572864",
  tintSteps: "#0C3465",
  tintSleep: "#3B2A77",
  tintWater: "#2B4777",

  // Sémantique
  ok: "#3CE0B0",
  warn: "#FFB443",
  danger: "#F2704A"
};

/**
 * Matière « verre ». Le rendu tient sur trois couches :
 * un fond translucide, une bordure claire, et un reflet plus vif
 * sur l'arête haute — c'est ce reflet qui donne l'impression d'épaisseur.
 */
export const glass = {
  fill: "rgba(255,255,255,0.055)",
  fillStrong: "rgba(255,255,255,0.09)",
  fillSoft: "rgba(255,255,255,0.03)",
  border: "rgba(255,255,255,0.13)",
  borderBright: "rgba(255,255,255,0.30)",
  specular: "rgba(255,255,255,0.22)",
  shade: "rgba(2,6,24,0.55)",
  scrim: "rgba(2,6,20,0.88)",
  blur: 18
};

export const gradient = {
  // Sweep du hero : crimson → prune → indigo → bleu profond.
  hero: ["#C93B52", "#7C1E54", "#3A1450", "#1D1467", "#241D98"],
  // Bouton principal : bleu → violet → rose.
  cta: ["#2550FC", "#7A49E3", "#D43FA1"],
  ctaPressed: ["#1C3CC4", "#6338BC", "#AE2F81"],
  // Cartes métriques
  calories: ["rgba(201,59,82,0.32)", "rgba(36,29,152,0.30)"],
  protein: ["rgba(87,40,100,0.55)", "rgba(87,40,100,0.18)"],
  steps: ["rgba(12,52,101,0.62)", "rgba(12,52,101,0.20)"],
  sleep: ["rgba(59,42,119,0.58)", "rgba(59,42,119,0.18)"],
  water: ["rgba(43,71,119,0.60)", "rgba(43,71,119,0.18)"],
  // Surfaces neutres en verre
  glass: ["rgba(255,255,255,0.085)", "rgba(255,255,255,0.022)"],
  glassSoft: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.012)"],
  // Barres de progression
  barWarm: ["#FBA0BC", "#55D0FC"],
  barPink: ["#DA73C1", "#F0A8DE"],
  barCyan: ["#2BC4EC", "#7FE3FF"],
  barViolet: ["#7A49E3", "#A77BF0"],
  // Reflet appliqué sur la moitié haute des éléments en verre
  sheen: ["rgba(255,255,255,0.26)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"],
  // Sphères décoratives
  blob: ["#4C8BFF", "#1D24AB"],
  blobViolet: ["#A77BF0", "#3C126F"],
  // Journées d'entraînement
  strength: ["rgba(122,73,227,0.38)", "rgba(37,80,252,0.14)"],
  activity: ["rgba(212,63,161,0.32)", "rgba(91,17,71,0.14)"],
  rest: ["rgba(43,196,236,0.24)", "rgba(11,42,107,0.16)"]
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, xxxl: 44 };

// Rayons généreux : la maquette est franchement arrondie, façon iOS.
export const radius = { sm: 12, md: 16, lg: 22, xl: 28, xxl: 34, pill: 999 };

/**
 * Manrope : grotesque humaniste légèrement arrondi, proche de SF Pro,
 * avec d'excellents chiffres — l'application en affiche partout.
 * Chargée côté web dans public/index.html.
 */
const SANS = '"Manrope", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
export const font = { sans: SANS, cond: SANS };

export const type = {
  eyebrow: { fontFamily: SANS, fontSize: 10, fontWeight: "700", letterSpacing: 1.4, textTransform: "uppercase" },
  label: { fontFamily: SANS, fontSize: 11, fontWeight: "600", letterSpacing: .8, textTransform: "uppercase" },
  title: { fontFamily: SANS, fontSize: 28, fontWeight: "800", letterSpacing: -.6 },
  section: { fontFamily: SANS, fontSize: 15, fontWeight: "700", letterSpacing: -.1 },
  body: { fontFamily: SANS, fontSize: 14, fontWeight: "500", lineHeight: 21 },
  muted: { fontFamily: SANS, fontSize: 12.5, fontWeight: "500", lineHeight: 18 },
  data: { fontFamily: SANS, fontSize: 28, fontWeight: "800", letterSpacing: -.8 },
  dataXl: { fontFamily: SANS, fontSize: 46, fontWeight: "800", letterSpacing: -1.6 },
  button: { fontFamily: SANS, fontSize: 15, fontWeight: "700", letterSpacing: -.1 }
};

export const shadow = {
  card: { shadowColor: "#000", shadowOpacity: .38, shadowRadius: 22, shadowOffset: { width: 0, height: 10 }, elevation: 5 },
  lift: { shadowColor: "#000", shadowOpacity: .5, shadowRadius: 32, shadowOffset: { width: 0, height: 18 }, elevation: 12 },
  glowBlue: { shadowColor: "#2550FC", shadowOpacity: .55, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 10 },
  glowPink: { shadowColor: "#D43FA1", shadowOpacity: .45, shadowRadius: 22, shadowOffset: { width: 0, height: 8 }, elevation: 9 },
  none: { shadowOpacity: 0, elevation: 0 }
};

export const LAYOUT = { maxContentWidth: 720, navHeight: 68, tapTarget: 46 };

/**
 * Flou : react-native-web traduit `filter` et `backdropFilter` en CSS
 * (avec le préfixe -webkit-). Sur une build native ces propriétés n'existent
 * pas, on ne les émet donc que sur le web — le reste du style tient sans elles.
 */
const isWeb = typeof document !== "undefined";
export const blurStyle = (px) => (isWeb ? { filter: `blur(${px}px)` } : {});
export const glassStyle = (px = glass.blur) =>
  (isWeb ? { backdropFilter: `blur(${px}px)`, WebkitBackdropFilter: `blur(${px}px)` } : {});

export function breakpoint(width) {
  if (width < 375) return "xs";
  if (width < 600) return "sm";
  if (width < 900) return "md";
  return "lg";
}

/** La maquette pose les métriques en grille 2×2 ; une seule colonne sous 340 px. */
export function metricColumns(width) {
  return width < 340 ? 1 : 2;
}

export function typeScale(width) {
  const bp = breakpoint(width);
  if (bp === "xs") return -1;
  if (bp === "lg") return 2;
  return 0;
}

export const theme = { palette, glass, gradient, space, radius, type, font, shadow, LAYOUT, blurStyle, glassStyle };
export default theme;
