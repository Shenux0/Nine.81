export const WORLDS = {
  Earth: 9.81,
  Moon: 1.62,
  Jupiter: 24.79,
};

export const WORLD_COLORS = {
  Earth: "#3B6EA5",
  Moon: "#8B93A3",
  Jupiter: "#E8632D",
};

// Series colours for charts on the dark backdrop. Same hues as WORLD_COLORS, but the
// Moon gets a lavender tint — plain gray reads as "no data" in a chart. Validated
// (lightness, chroma, colour-blind separation, contrast) against #0B0F1A.
export const CHART_COLORS = {
  Earth: "#3B6EA5",
  Moon: "#9C86D2",
  Jupiter: "#E8632D",
};

export const COLORS = {
  background: "#10192E",
  // Space is black — no air to scatter light, and nebulae are too faint for the naked eye.
  spaceBackground: "#000000",
  panel: "#1C2B4A",
  heading: "#1B2436",
  accent: "#E8632D",
  textOnDark: "#C9D3E0",
  textOnLight: "#2A3142",
  selectorActive: "#4C6C99",
  success: "#5FBF7A",
};
