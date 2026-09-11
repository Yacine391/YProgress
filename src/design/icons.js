/**
 * Jeu d'icônes vectorielles.
 *
 * Les emoji ne sont pas des icônes d'interface : leur rendu change d'un système
 * à l'autre, ils imposent leur propre couleur et cassent l'alignement optique.
 * Tracés à 24×24, épaisseur uniforme, hérités de la couleur passée en prop.
 */
import React from "react";
import Svg, { Path, Circle, Line, Polyline, Rect } from "react-native-svg";

const PATHS = {
  // Navigation
  home: (c, w) => [
    <Path key="a" d="M3 10.5 12 3l9 7.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Path key="b" d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Path key="c" d="M9.5 21v-6h5v6" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  nutrition: (c, w) => [
    <Path key="a" d="M7 3v8a2.5 2.5 0 0 0 5 0V3" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Line key="b" x1="9.5" y1="11" x2="9.5" y2="21" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Path key="c" d="M17 3c-1.5 1.5-2 3.5-2 5.5S15.5 12 17 13v8" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  program: (c, w) => [
    <Line key="a" x1="3" y1="12" x2="5" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Line key="b" x1="19" y1="12" x2="21" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Rect key="c" x="5" y="8.5" width="3" height="7" rx="1.2" stroke={c} strokeWidth={w} fill="none" />,
    <Rect key="d" x="16" y="8.5" width="3" height="7" rx="1.2" stroke={c} strokeWidth={w} fill="none" />,
    <Line key="e" x1="8" y1="12" x2="16" y2="12" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ],
  progress: (c, w) => [
    <Polyline key="a" points="3,16 9,10 13,14 21,6" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Polyline key="b" points="15,6 21,6 21,12" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  // Silhouette : plus lisible qu'un engrenage à 21 px, et c'est bien un profil.
  profile: (c, w) => [
    <Circle key="a" cx="12" cy="8" r="3.6" stroke={c} strokeWidth={w} fill="none" />,
    <Path key="b" d="M4.8 20.2a7.2 7.2 0 0 1 14.4 0" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
  ],

  // Métriques
  flame: (c, w) => [
    <Path key="a" d="M12 3c.5 3-1.5 4-3 6a5.5 5.5 0 1 0 9.2 4.1C18.2 9 15 7 12 3Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Path key="b" d="M12 20a2.6 2.6 0 0 1-1.6-4.6c.9-.7 1.4-1.4 1.6-2.4.9 1 2.6 2.3 2.6 4.4A2.6 2.6 0 0 1 12 20Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  // Pilon : masse arrondie + os. Volontairement peu de détails, c'est rendu à 17 px.
  protein: (c, w) => [
    <Path key="a" d="M15.6 4.4a4.8 4.8 0 0 1 4 7.9c-1.2 1.4-3 1.8-4.6 1.4l-3.9 3.9" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Path key="b" d="M15.6 4.4a4.8 4.8 0 0 0-7.9 4c.4 1.6 0 3.4-1.4 4.6" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Circle key="c" cx="6.4" cy="17.6" r="2.6" stroke={c} strokeWidth={w} fill="none" />
  ],
  steps: (c, w) => [
    <Path key="a" d="M7.5 4.5c1.8 0 2.8 1.6 2.5 3.8-.2 1.6-.8 2.4-.8 3.7 0 1.4-1 2-2 2s-2-.7-2.2-2.2c-.2-1.5.3-2.6.4-4C5.6 6 6.1 4.5 7.5 4.5Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Path key="b" d="M5.2 16.4c.4-.7 3-.7 3.6 0 .5.6.4 2.4-.4 3-.9.7-2.4.5-3-.3-.5-.7-.6-2-.2-2.7Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Path key="c" d="M16.5 7.5c1.4 0 1.9 1.5 2.1 3.3.1 1.4.6 2.5.4 4-.2 1.5-1.2 2.2-2.2 2.2s-2-.6-2-2c0-1.3-.6-2.1-.8-3.7-.3-2.2.7-3.8 2.5-3.8Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  sleep: (c, w) => [
    <Path key="a" d="M20 14.5A8 8 0 0 1 9.5 4 8.2 8.2 0 1 0 20 14.5Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  water: (c, w) => [
    <Path key="a" d="M12 3.2c3 3.6 5.2 6.3 5.2 9.1A5.2 5.2 0 1 1 6.8 12.3c0-2.8 2.2-5.5 5.2-9.1Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  brain: (c, w) => [
    <Path key="a" d="M12 2.8a6.2 6.2 0 0 0-3.6 11.3c.6.4 1 1.1 1 1.9v.5h5.2v-.5c0-.8.4-1.5 1-1.9A6.2 6.2 0 0 0 12 2.8Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Line key="b" x1="9.6" y1="18.6" x2="14.4" y2="18.6" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Line key="c" x1="10.4" y1="21" x2="13.6" y2="21" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ],
  battery: (c, w) => [
    <Rect key="a" x="2.5" y="8" width="16" height="8.5" rx="2.4" stroke={c} strokeWidth={w} fill="none" />,
    <Path key="b" d="M21 11v2.5" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Rect key="c" x="5" y="10.4" width="7" height="3.7" rx="1.2" fill={c} />
  ],
  scale: (c, w) => [
    <Rect key="a" x="3.5" y="3.5" width="17" height="17" rx="4" stroke={c} strokeWidth={w} fill="none" />,
    <Path key="b" d="M8.5 9.5 12 7l3.5 2.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />,
    <Line key="c" x1="12" y1="7" x2="12" y2="11.5" stroke={c} strokeWidth={w} strokeLinecap="round" />
  ],
  cart: (c, w) => [
    <Circle key="a" cx="9.5" cy="19" r="1.4" stroke={c} strokeWidth={w} fill="none" />,
    <Circle key="b" cx="17" cy="19" r="1.4" stroke={c} strokeWidth={w} fill="none" />,
    <Path key="c" d="M2.5 3.5h2.2l2.4 11.2h11L20 7H6" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  play: (c, w) => [
    <Path key="a" d="M8.5 5.8 18 12l-9.5 6.2V5.8Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  swap: (c, w) => [
    <Path key="a" d="M4 8h13l-3-3M20 16H7l3 3" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  bell: (c, w) => [
    <Path key="a" d="M6.5 9.5a5.5 5.5 0 0 1 11 0c0 4 1.5 5.5 1.5 5.5H5s1.5-1.5 1.5-5.5Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Path key="b" d="M10 18.5a2.2 2.2 0 0 0 4 0" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
  ],
  alert: (c, w) => [
    <Path key="a" d="M12 4 2.8 19.5h18.4L12 4Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Line key="b" x1="12" y1="10" x2="12" y2="14" stroke={c} strokeWidth={w} strokeLinecap="round" />,
    <Circle key="c" cx="12" cy="16.8" r=".9" fill={c} />
  ],
  check: (c, w) => [
    <Polyline key="a" points="4.5,12.5 9.5,17.5 19.5,6.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ],
  camera: (c, w) => [
    <Path key="a" d="M3.5 8.5h3l1.5-2.2h8L17.5 8.5h3a1 1 0 0 1 1 1v8.5a1 1 0 0 1-1 1h-17a1 1 0 0 1-1-1V9.5a1 1 0 0 1 1-1Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Circle key="b" cx="12" cy="13.5" r="3.4" stroke={c} strokeWidth={w} fill="none" />
  ],
  heart: (c, w) => [
    <Path key="a" d="M12 20s-7.5-4.6-7.5-9.4A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7.5 2.4C19.5 15.4 12 20 12 20Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  lock: (c, w) => [
    <Rect key="a" x="4.5" y="10.5" width="15" height="9.5" rx="2.4" stroke={c} strokeWidth={w} fill="none" />,
    <Path key="b" d="M8 10.5V8a4 4 0 0 1 8 0v2.5" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" />
  ],
  calculator: (c, w) => [
    <Rect key="a" x="5" y="3" width="14" height="18" rx="2.6" stroke={c} strokeWidth={w} fill="none" />,
    <Rect key="b" x="8" y="6" width="8" height="3.4" rx="1" stroke={c} strokeWidth={w} fill="none" />,
    <Circle key="c" cx="9" cy="13.5" r=".9" fill={c} />,
    <Circle key="d" cx="15" cy="13.5" r=".9" fill={c} />,
    <Circle key="e" cx="9" cy="17.5" r=".9" fill={c} />,
    <Circle key="f" cx="15" cy="17.5" r=".9" fill={c} />
  ],
  sparkle: (c, w) => [
    <Path key="a" d="M12 3.5 13.7 9l5.5 1.7L13.7 12.4 12 18l-1.7-5.6L4.8 10.7 10.3 9 12 3.5Z" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />,
    <Path key="b" d="M18.5 17.5 19.2 19.6l2.1.7-2.1.7-.7 2.1" stroke={c} strokeWidth={w} fill="none" strokeLinejoin="round" />
  ],
  clock: (c, w) => [
    <Circle key="a" cx="12" cy="12" r="8.5" stroke={c} strokeWidth={w} fill="none" />,
    <Polyline key="b" points="12,7 12,12 15.5,14" stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
  ]
};

export const ICON_NAMES = Object.keys(PATHS);

export function Icon({ name, size = 22, color = "#FFFFFF", weight = 1.7, style }) {
  const draw = PATHS[name];
  if (!draw) return null;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style} fill="none">
      {draw(color, weight)}
    </Svg>
  );
}

export default Icon;
