// Doom Thing Types - based on DoomBuilderX configuration

export interface ThingType {
  id: number;
  title: string;
  sprite?: string;
  width: number;
  height: number;
  color: string; // hex color for rendering
  category: string;
  blocking?: boolean;
  hangs?: boolean;
}

export interface ThingCategory {
  id: string;
  title: string;
  color: string;
}

export const THING_CATEGORIES: ThingCategory[] = [
  { id: 'players', title: 'Player Starts', color: '#00ff00' },
  { id: 'teleports', title: 'Teleports', color: '#00aa00' },
  { id: 'monsters', title: 'Monsters', color: '#ff4444' },
  { id: 'weapons', title: 'Weapons', color: '#ffff00' },
  { id: 'ammunition', title: 'Ammunition', color: '#aa6600' },
  { id: 'health', title: 'Health and Armor', color: '#4444ff' },
  { id: 'powerups', title: 'Powerups', color: '#44aaff' },
  { id: 'keys', title: 'Keys', color: '#ff44ff' },
  { id: 'obstacles', title: 'Obstacles', color: '#00ffff' },
  { id: 'lights', title: 'Light sources', color: '#44ffff' },
  { id: 'decoration', title: 'Decoration', color: '#ff0000' },
];

export const THING_TYPES: ThingType[] = [
  // Players
  { id: 1, title: 'Player 1 start', sprite: 'PLAYA2A8', width: 16, height: 56, color: '#00ff00', category: 'players', blocking: true },
  { id: 2, title: 'Player 2 start', sprite: 'PLAYA3A7', width: 16, height: 56, color: '#00ff00', category: 'players', blocking: true },
  { id: 3, title: 'Player 3 start', sprite: 'PLAYA4A6', width: 16, height: 56, color: '#00ff00', category: 'players', blocking: true },
  { id: 4, title: 'Player 4 start', sprite: 'PLAYA5', width: 16, height: 56, color: '#00ff00', category: 'players', blocking: true },
  { id: 11, title: 'Player Deathmatch start', sprite: 'PLAYF1', width: 16, height: 56, color: '#00ff00', category: 'players', blocking: true },

  // Teleports
  { id: 14, title: 'Teleport Destination', sprite: 'TFOGB0', width: 16, height: 56, color: '#00aa00', category: 'teleports' },

  // Monsters
  { id: 3004, title: 'Former Human', sprite: 'POSSA2A8', width: 20, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 9, title: 'Former Sergeant', sprite: 'SPOSA2A8', width: 20, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 3001, title: 'Imp', sprite: 'TROOA2A8', width: 20, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 3002, title: 'Demon', sprite: 'SARGA2A8', width: 30, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 58, title: 'Spectre', sprite: 'SARGF1', width: 30, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 3006, title: 'Lost Soul', sprite: 'SKULA8A2', width: 16, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 3005, title: 'Cacodemon', sprite: 'HEADA2A8', width: 31, height: 56, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 3003, title: 'Baron of Hell', sprite: 'BOSSA2A8', width: 24, height: 64, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 16, title: 'Cyberdemon', sprite: 'CYBRA2', width: 40, height: 110, color: '#ff4444', category: 'monsters', blocking: true },
  { id: 7, title: 'Spider Mastermind', sprite: 'SPIDG2G8', width: 128, height: 100, color: '#ff4444', category: 'monsters', blocking: true },

  // Weapons
  { id: 2005, title: 'Chainsaw', sprite: 'CSAWA0', width: 20, height: 25, color: '#ffff00', category: 'weapons' },
  { id: 2001, title: 'Shotgun', sprite: 'SHOTA0', width: 20, height: 25, color: '#ffff00', category: 'weapons' },
  { id: 2002, title: 'Chaingun', sprite: 'MGUNA0', width: 20, height: 25, color: '#ffff00', category: 'weapons' },
  { id: 2003, title: 'Rocket launcher', sprite: 'LAUNA0', width: 20, height: 25, color: '#ffff00', category: 'weapons' },
  { id: 2004, title: 'Plasma gun', sprite: 'PLASA0', width: 20, height: 25, color: '#ffff00', category: 'weapons' },
  { id: 2006, title: 'BFG9000', sprite: 'BFUGA0', width: 20, height: 30, color: '#ffff00', category: 'weapons' },

  // Ammunition
  { id: 2007, title: 'Ammo clip', sprite: 'CLIPA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },
  { id: 2008, title: 'Shotgun shells', sprite: 'SHELA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },
  { id: 2010, title: 'Rocket', sprite: 'ROCKA0', width: 20, height: 25, color: '#aa6600', category: 'ammunition' },
  { id: 2047, title: 'Cell charge', sprite: 'CELLA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },
  { id: 2048, title: 'Box of Ammo', sprite: 'AMMOA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },
  { id: 2049, title: 'Box of Shells', sprite: 'SBOXA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },
  { id: 2046, title: 'Box of Rockets', sprite: 'BROKA0', width: 20, height: 25, color: '#aa6600', category: 'ammunition' },
  { id: 17, title: 'Cell charge pack', sprite: 'CELPA0', width: 20, height: 25, color: '#aa6600', category: 'ammunition' },
  { id: 8, title: 'Backpack', sprite: 'BPAKA0', width: 20, height: 16, color: '#aa6600', category: 'ammunition' },

  // Health and Armor
  { id: 2011, title: 'Stimpack', sprite: 'STIMA0', width: 20, height: 16, color: '#4444ff', category: 'health' },
  { id: 2012, title: 'Medikit', sprite: 'MEDIA0', width: 20, height: 25, color: '#4444ff', category: 'health' },
  { id: 2014, title: 'Health bonus', sprite: 'BON1A0', width: 20, height: 16, color: '#4444ff', category: 'health' },
  { id: 2015, title: 'Armor bonus', sprite: 'BON2A0', width: 20, height: 16, color: '#4444ff', category: 'health' },
  { id: 2018, title: 'Green armor', sprite: 'ARM1A0', width: 20, height: 16, color: '#4444ff', category: 'health' },
  { id: 2019, title: 'Blue armor', sprite: 'ARM2A0', width: 20, height: 16, color: '#4444ff', category: 'health' },

  // Powerups
  { id: 2013, title: 'Soulsphere', sprite: 'SOULA0', width: 20, height: 45, color: '#44aaff', category: 'powerups' },
  { id: 2022, title: 'Invulnerability', sprite: 'PINVA0', width: 20, height: 30, color: '#44aaff', category: 'powerups' },
  { id: 2023, title: 'Berserk', sprite: 'PSTRA0', width: 20, height: 16, color: '#44aaff', category: 'powerups' },
  { id: 2024, title: 'Invisibility', sprite: 'PINSA0', width: 20, height: 45, color: '#44aaff', category: 'powerups' },
  { id: 2025, title: 'Radiation suit', sprite: 'SUITA0', width: 20, height: 60, color: '#44aaff', category: 'powerups' },
  { id: 2026, title: 'Computer map', sprite: 'PMAPA0', width: 20, height: 35, color: '#44aaff', category: 'powerups' },
  { id: 2045, title: 'Lite Amplification goggles', sprite: 'PVISA0', width: 20, height: 16, color: '#44aaff', category: 'powerups' },

  // Keys
  { id: 5, title: 'Blue keycard', sprite: 'BKEYA0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },
  { id: 40, title: 'Blue skullkey', sprite: 'BSKUB0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },
  { id: 13, title: 'Red keycard', sprite: 'RKEYA0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },
  { id: 38, title: 'Red skullkey', sprite: 'RSKUB0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },
  { id: 6, title: 'Yellow keycard', sprite: 'YKEYA0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },
  { id: 39, title: 'Yellow skullkey', sprite: 'YSKUB0', width: 20, height: 16, color: '#ff44ff', category: 'keys' },

  // Obstacles
  { id: 2035, title: 'Barrel', sprite: 'BAR1A0', width: 10, height: 32, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 48, title: 'Tall techno pillar', sprite: 'ELECA0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 30, title: 'Tall green pillar', sprite: 'COL1A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 32, title: 'Tall red pillar', sprite: 'COL3A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 31, title: 'Short green pillar', sprite: 'COL2A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 36, title: 'Short green pillar (heart)', sprite: 'COL5A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 33, title: 'Short red pillar', sprite: 'COL4A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 37, title: 'Short red pillar (skull)', sprite: 'COL6A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 47, title: 'Stalagmite', sprite: 'SMITA0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 43, title: 'Gray tree', sprite: 'TRE1A0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 54, title: 'Large brown tree', sprite: 'TRE2A0', width: 32, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 41, title: 'Evil Eye', sprite: 'CEYEA0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },
  { id: 42, title: 'Floating skull rock', sprite: 'FSKUA0', width: 16, height: 20, color: '#00ffff', category: 'obstacles', blocking: true },

  // Light sources
  { id: 2028, title: 'Floor lamp', sprite: 'COLUA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 34, title: 'Candle', sprite: 'CANDA0', width: 20, height: 16, color: '#44ffff', category: 'lights' },
  { id: 35, title: 'Candelabra', sprite: 'CBRAA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 44, title: 'Tall blue firestick', sprite: 'TBLUA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 45, title: 'Tall green firestick', sprite: 'TGRNA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 46, title: 'Tall red firestick', sprite: 'TREDA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 55, title: 'Short blue firestick', sprite: 'SMBTA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 56, title: 'Short green firestick', sprite: 'SMGTA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },
  { id: 57, title: 'Short red firestick', sprite: 'SMRTA0', width: 16, height: 16, color: '#44ffff', category: 'lights', blocking: true },

  // Decoration
  { id: 49, title: 'Hanging victim, twitching (blocking)', sprite: 'GOR1A0', width: 16, height: 68, color: '#ff0000', category: 'decoration', blocking: true, hangs: true },
  { id: 63, title: 'Hanging victim, twitching', sprite: 'GOR1C0', width: 20, height: 68, color: '#ff0000', category: 'decoration', hangs: true },
  { id: 50, title: 'Hanging victim, arms out (blocking)', sprite: 'GOR2A0', width: 16, height: 84, color: '#ff0000', category: 'decoration', blocking: true, hangs: true },
  { id: 59, title: 'Hanging victim, arms out', sprite: 'GOR2A0', width: 20, height: 84, color: '#ff0000', category: 'decoration', hangs: true },
  { id: 52, title: 'Hanging pair of legs (blocking)', sprite: 'GOR4A0', width: 16, height: 68, color: '#ff0000', category: 'decoration', blocking: true, hangs: true },
  { id: 60, title: 'Hanging pair of legs', sprite: 'GOR4A0', width: 20, height: 68, color: '#ff0000', category: 'decoration', hangs: true },
  { id: 51, title: 'Hanging victim, 1-legged (blocking)', sprite: 'GOR3A0', width: 16, height: 84, color: '#ff0000', category: 'decoration', blocking: true, hangs: true },
  { id: 61, title: 'Hanging victim, 1-legged', sprite: 'GOR3A0', width: 20, height: 52, color: '#ff0000', category: 'decoration', hangs: true },
  { id: 53, title: 'Hanging leg (blocking)', sprite: 'GOR5A0', width: 16, height: 52, color: '#ff0000', category: 'decoration', blocking: true, hangs: true },
  { id: 62, title: 'Hanging leg', sprite: 'GOR5A0', width: 20, height: 52, color: '#ff0000', category: 'decoration', hangs: true },
  { id: 25, title: 'Impaled human', sprite: 'POL1A0', width: 16, height: 16, color: '#ff0000', category: 'decoration', blocking: true },
  { id: 26, title: 'Twitching impaled human', sprite: 'POL6A0', width: 16, height: 16, color: '#ff0000', category: 'decoration', blocking: true },
  { id: 27, title: 'Skull on a pole', sprite: 'POL4A0', width: 16, height: 16, color: '#ff0000', category: 'decoration', blocking: true },
  { id: 28, title: '5 skulls shish kebob', sprite: 'POL2A0', width: 16, height: 16, color: '#ff0000', category: 'decoration', blocking: true },
  { id: 29, title: 'Pile of skulls and candles', sprite: 'POL3A0', width: 16, height: 16, color: '#ff0000', category: 'decoration', blocking: true },
  { id: 10, title: 'Bloody mess 1', sprite: 'PLAYW0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 12, title: 'Bloody mess 2', sprite: 'PLAYW0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 24, title: 'Pool of blood and bones', sprite: 'POL5A0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 15, title: 'Dead player', sprite: 'PLAYN0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 18, title: 'Dead former human', sprite: 'POSSL0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 19, title: 'Dead former sergeant', sprite: 'SPOSL0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 20, title: 'Dead imp', sprite: 'TROOM0', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 21, title: 'Dead demon', sprite: 'SARGN0', width: 30, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 22, title: 'Dead cacodemon', sprite: 'HEADL0', width: 31, height: 16, color: '#ff0000', category: 'decoration' },
  { id: 23, title: 'Dead lost soul', width: 20, height: 16, color: '#ff0000', category: 'decoration' },
];

// Helper to get thing type by ID
export function getThingType(id: number): ThingType | undefined {
  return THING_TYPES.find(t => t.id === id);
}

// Helper to get things by category
export function getThingsByCategory(categoryId: string): ThingType[] {
  return THING_TYPES.filter(t => t.category === categoryId);
}

// Default thing type (Player 1 start)
export const DEFAULT_THING_TYPE = 1;
