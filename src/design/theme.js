/**
 * YProgress — système de design « laboratoire de performance ».
 *
 * Direction : graphite chaud (base), lime (signature / progression),
 * teal (récupération), ambre (maintien), terracotta (alerte).
 * Aucune couleur en dur ailleurs dans l'app : tout passe par ces tokens.
 */

export const palette = {
  // Fonds : gris chauds légèrement verts, jamais du noir pur ni du bleu nuit.
  void: "#0B0D09",
  bg: "#101309",
  surface: "#171B12",
  surfaceRaised: "#1E2318",
  surfaceHigh: "#262C1E",
  line: "#2E3626",
  lineStrong: "#414C35",

  // Encre
  ink: "#F3F6EA",
  inkMuted: "#A7B197",
  inkFaint: "#717C62",
  inkInverse: "#0B0D09",

  // Signature
  lime: "#C9F53F",
  limeDeep: "#9ED515",
  limeDark: "#2F3D0B",

  // Sémantique
  teal: "#3FD9C0",
  tealDark: "#0D3A34",
  amber: "#FFB443",
  amberDark: "#3E2B0C",
  clay: "#F2704A",
  clayDark: "#41190F",

  white: "#FFFFFF"
};

// Transparences réutilisables (effet verre / liquide)
export const glass = {
  hi: "rgba(255,255,255,0.14)",
  hiSoft: "rgba(255,255,255,0.07)",
  hiFaint: "rgba(255,255,255,0.035)",
  edge: "rgba(255,255,255,0.10)",
  edgeStrong: "rgba(255,255,255,0.22)",
  shade: "rgba(0,0,0,0.30)",
  scrim: "rgba(8,10,6,0.86)",
  limeGlow: "rgba(201,245,63,0.16)",
  tealGlow: "rgba(63,217,192,0.14)"
};

// Dégradés (expo-linear-gradient) — toujours 2 à 3 arrêts, jamais plus.
export const gradient = {
  lime: ["#D8FF5C", "#A8DE1E"],
  limeSoft: ["rgba(201,245,63,0.22)", "rgba(158,213,21,0.04)"],
  teal: ["#5FE6D0", "#22A896"],
  clay: ["#FF8A63", "#D9532E"],
  surface: ["#1F2618", "#151A10"],
  rest: ["#12312C", "#0F1A17"],
  strength: ["#2B3A12", "#141A0D"],
  activity: ["#33280E", "#191408"],
  // Reflet appliqué sur la moitié haute des boutons « liquid ».
  sheen: ["rgba(255,255,255,0.30)", "rgba(255,255,255,0.05)", "rgba(255,255,255,0)"]
};

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 22, xxl: 30, xxxl: 42 };

export const radius = { sm: 10, md: 14, lg: 20, xl: 26, xxl: 32, pill: 999 };

/**
 * Polices : chargées côté web via public/index.html (fonts.googleapis.com).
 * En build native sans expo-font, la pile de secours système prend le relais.
 * Saira Condensed sert aux grands nombres : plus lisible sur un écran étroit.
 */
const SANS = '"Saira", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const COND = '"Saira Condensed", "Saira", -apple-system, BlinkMacSystemFont, sans-serif';

export const font = { sans: SANS, cond: COND };

export const type = {
  // Libellés en capitales espacées : l'identité « instrument de mesure ».
  eyebrow: { fontFamily: SANS, fontSize: 10, fontWeight: "700", letterSpacing: 1.6, textTransform: "uppercase" },
  label: { fontFamily: SANS, fontSize: 10, fontWeight: "700", letterSpacing: 1.1, textTransform: "uppercase" },
  title: { fontFamily: COND, fontSize: 30, fontWeight: "700", letterSpacing: -0.3 },
  section: { fontFamily: SANS, fontSize: 14, fontWeight: "700", letterSpacing: 0.1 },
  body: { fontFamily: SANS, fontSize: 14, fontWeight: "400", lineHeight: 21 },
  muted: { fontFamily: SANS, fontSize: 12, fontWeight: "400", lineHeight: 18 },
  data: { fontFamily: COND, fontSize: 34, fontWeight: "700", letterSpacing: -0.5 },
  dataXl: { fontFamily: COND, fontSize: 56, fontWeight: "700", letterSpacing: -1.2 },
  button: { fontFamily: SANS, fontSize: 14, fontWeight: "700", letterSpacing: 0.3 }
};

export const shadow = {
  card: { shadowColor: "#000", shadowOpacity: 0.32, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 4 },
  lift: { shadowColor: "#000", shadowOpacity: 0.45, shadowRadius: 26, shadowOffset: { width: 0, height: 14 }, elevation: 10 },
  limeGlow: { shadowColor: palette.lime, shadowOpacity: 0.45, shadowRadius: 20, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  none: { shadowOpacity: 0, elevation: 0 }
};

/** Largeur max du contenu : l'app reste une colonne lisible même sur grand écran. */
export const LAYOUT = { maxContentWidth: 720, navHeight: 66, tapTarget: 46 };

/** Seuils responsive. `xs` = petits iPhone (SE, 320–374 pt). */
export function breakpoint(width) {
  if (width < 375) return "xs";
  if (width < 600) return "sm";
  if (width < 900) return "md";
  return "lg";
}

/** Nombre de colonnes pour la grille d'indicateurs selon la largeur réelle. */
export function metricColumns(width) {
  if (width < 340) return 1;
  if (width < 720) return 3;
  return 3;
}

/** Échelle typographique fluide : -1 pt sur très petit écran, +2 pt sur grand. */
export function typeScale(width) {
  const bp = breakpoint(width);
  if (bp === "xs") return -1;
  if (bp === "lg") return 2;
  return 0;
}

export const theme = { palette, glass, gradient, space, radius, type, font, shadow, LAYOUT };
export default theme;
