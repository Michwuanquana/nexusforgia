// src/core/preview/types.ts

export interface PreviewOptions {
  /** Output dimensions in pixels */
  width: number;
  height: number;

  /** Padding around map bounds (in pixels) */
  padding: number;

  /** Background color (hex) */
  backgroundColor: number;

  /** Color scheme for map elements */
  colors: PreviewColorScheme;

  /** Which layers to render */
  layers: PreviewLayers;

  /** Line width multiplier (1.0 = default) */
  lineScale: number;

  /** Anti-aliasing */
  antialias: boolean;
}

export interface PreviewColorScheme {
  /** One-sided walls (solid) */
  oneSided: number;

  /** Two-sided walls (passable) */
  twoSided: number;

  /** Lines with action specials */
  actionSpecial: number;

  /** Secret walls */
  secret: number;

  /** Player start positions */
  playerStart: number;

  /** Monster things */
  monsters: number;

  /** Item pickups */
  items: number;

  /** Sector floor fill (optional) */
  sectorFill?: number;
}

export interface PreviewLayers {
  /** Render sector fills */
  sectors: boolean;

  /** Render linedefs */
  linedefs: boolean;

  /** Render vertices */
  vertices: boolean;

  /** Render things */
  things: boolean;

  /** Render player starts only */
  playerStartsOnly: boolean;
}

export const DEFAULT_PREVIEW_OPTIONS: PreviewOptions = {
  width: 256,
  height: 256,
  padding: 10,
  backgroundColor: 0x000000,
  colors: {
    oneSided: 0xffffff,
    twoSided: 0x808080,
    actionSpecial: 0xffff00,
    secret: 0xff00ff,
    playerStart: 0x00ff00,
    monsters: 0xff0000,
    items: 0x00ffff,
  },
  layers: {
    sectors: false,
    linedefs: true,
    vertices: false,
    things: false,
    playerStartsOnly: true,
  },
  lineScale: 1.0,
  antialias: true,
};

/** Classic Doom automap colors */
export const DOOM_AUTOMAP_COLORS: PreviewColorScheme = {
  oneSided: 0xfc0000,     // Red - solid walls
  twoSided: 0xfcfc00,     // Yellow - doors/passable
  actionSpecial: 0xfcfc00,
  secret: 0xfc0000,
  playerStart: 0x00fc00,  // Green
  monsters: 0xfc0000,
  items: 0x00fcfc,
};

/** Modern editor style */
export const EDITOR_COLORS: PreviewColorScheme = {
  oneSided: 0xffffff,
  twoSided: 0x808080,
  actionSpecial: 0xffff00,
  secret: 0xff00ff,
  playerStart: 0x00ff00,
  monsters: 0xff4444,
  items: 0x44ffff,
  sectorFill: 0x1a1a2e,
};
