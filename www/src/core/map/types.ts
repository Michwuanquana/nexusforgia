export interface Vec2 {
  x: number;
  y: number;
}

export interface BBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Vertex {
  id: number;
  x: number;
  y: number;
  linedefs: Set<number>;
}

export interface Linedef {
  id: number;
  v1: number;
  v2: number;
  flags: number;
  special: number;
  args: [number, number, number, number, number];
  frontSidedef: number | null;
  backSidedef: number | null;
  frontSector: number | null;
  backSector: number | null;
}

export interface Sidedef {
  id: number;
  offsetX: number;
  offsetY: number;
  upperTexture: string;
  lowerTexture: string;
  middleTexture: string;
  sector: number;
}

export interface Sector {
  id: number;
  floorHeight: number;
  ceilingHeight: number;
  floorTexture: string;
  ceilingTexture: string;
  lightLevel: number;
  special: number;
  tag: number;
  linedefs: Set<number>;
  boundingBox: BBox | null;
  triangles: number[] | null;
}

export interface Thing {
  id: number;
  tid: number;
  x: number;
  y: number;
  z: number;
  angle: number;
  type: number;
  flags: number;
  special: number;
  args: [number, number, number, number, number];
}

// Hexen linedef flags
export const LinedefFlags = {
  BLOCKING: 0x0001,
  BLOCKMONSTERS: 0x0002,
  TWOSIDED: 0x0004,
  UPPERUNPEGGED: 0x0008,
  LOWERUNPEGGED: 0x0010,
  SECRET: 0x0020,
  BLOCKSOUND: 0x0040,
  NOTONMAP: 0x0080,
  ALREADYONMAP: 0x0100,
  REPEATABLE: 0x0200,
  ACTIVATION_MASK: 0x1c00,
} as const;

export const ActivationType = {
  PLAYER_CROSSES: 0,
  PLAYER_USES: 1,
  MONSTER_CROSSES: 2,
  PROJECTILE_HITS: 3,
  PLAYER_BUMPS: 4,
  PROJECTILE_CROSSES: 5,
  PLAYER_USES_PASSTHROUGH: 6,
} as const;

export const ThingFlags = {
  SKILL_1_2: 0x0001,
  SKILL_3: 0x0002,
  SKILL_4_5: 0x0004,
  AMBUSH: 0x0008,
  DORMANT: 0x0010,
  FIGHTER: 0x0020,
  CLERIC: 0x0040,
  MAGE: 0x0080,
  SINGLEPLAYER: 0x0100,
  COOP: 0x0200,
  DEATHMATCH: 0x0400,
} as const;
