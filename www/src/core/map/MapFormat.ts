/**
 * Map format definitions and detection
 */

export type MapFormatId =
  | 'doom'           // Vanilla Doom / Ultimate Doom
  | 'boom_doom'      // Boom: Ultimate Doom
  | 'boom_doom2'     // Boom: Doom 2
  | 'hexen'          // Hexen format
  | 'zdoom_hexen'    // ZDoom in Hexen format
  | 'zdaemon';       // ZDaemon (ZDoom in Hexen variant)

export interface MapFormat {
  id: MapFormatId;
  name: string;
  description: string;
  linedefSize: number;  // bytes per linedef
  thingSize: number;    // bytes per thing
  hasArgs: boolean;     // has linedef/thing args (Hexen-style)
  hasTid: boolean;      // things have TID
  hasThingZ: boolean;   // things have Z height
}

export const MAP_FORMATS: Record<MapFormatId, MapFormat> = {
  doom: {
    id: 'doom',
    name: 'Doom',
    description: 'Vanilla Doom / Ultimate Doom format',
    linedefSize: 14,
    thingSize: 10,
    hasArgs: false,
    hasTid: false,
    hasThingZ: false,
  },
  boom_doom: {
    id: 'boom_doom',
    name: 'Boom (Ultimate Doom)',
    description: 'Boom compatible - Ultimate Doom',
    linedefSize: 14,
    thingSize: 10,
    hasArgs: false,
    hasTid: false,
    hasThingZ: false,
  },
  boom_doom2: {
    id: 'boom_doom2',
    name: 'Boom (Doom 2)',
    description: 'Boom compatible - Doom 2',
    linedefSize: 14,
    thingSize: 10,
    hasArgs: false,
    hasTid: false,
    hasThingZ: false,
  },
  hexen: {
    id: 'hexen',
    name: 'Hexen',
    description: 'Hexen format with ACS support',
    linedefSize: 16,
    thingSize: 20,
    hasArgs: true,
    hasTid: true,
    hasThingZ: true,
  },
  zdoom_hexen: {
    id: 'zdoom_hexen',
    name: 'ZDoom (Hexen)',
    description: 'ZDoom in Hexen format',
    linedefSize: 16,
    thingSize: 20,
    hasArgs: true,
    hasTid: true,
    hasThingZ: true,
  },
  zdaemon: {
    id: 'zdaemon',
    name: 'ZDaemon',
    description: 'ZDaemon (ZDoom in Hexen variant)',
    linedefSize: 16,
    thingSize: 20,
    hasArgs: true,
    hasTid: true,
    hasThingZ: true,
  },
};

/**
 * Detect map format based on WAD lumps
 */
export function detectMapFormat(lumps: Map<string, { size: number }>): MapFormatId {
  const hasBehavior = lumps.has('BEHAVIOR');
  const hasScripts = lumps.has('SCRIPTS');

  // Check linedef size to distinguish Doom (14) from Hexen (16)
  const linedefLump = lumps.get('LINEDEFS');
  const thingLump = lumps.get('THINGS');

  if (hasBehavior) {
    // Hexen-style format
    // Could potentially distinguish ZDoom vs Hexen vs ZDaemon
    // by checking BEHAVIOR lump contents, but for now default to zdoom_hexen
    if (hasScripts) {
      return 'zdoom_hexen';
    }
    return 'hexen';
  }

  // Doom-style format
  // Try to detect Boom extensions by checking for generalized linedefs
  // For now, default to boom_doom2 as it's most common
  if (linedefLump && thingLump) {
    // Check if linedef size matches Doom format
    const linedefCount = linedefLump.size / 14;
    if (Number.isInteger(linedefCount) && linedefCount > 0) {
      // Assume Boom: Doom 2 as default for Doom-format maps
      return 'boom_doom2';
    }
  }

  return 'doom';
}

/**
 * Get format options for dropdown, with detected format first
 */
export function getFormatOptions(detectedFormat: MapFormatId): { id: MapFormatId; label: string; detected: boolean }[] {
  const formats: MapFormatId[] = ['boom_doom2', 'boom_doom', 'doom', 'zdoom_hexen', 'zdaemon', 'hexen'];

  return formats.map(id => ({
    id,
    label: MAP_FORMATS[id].name,
    detected: id === detectedFormat,
  }));
}

/**
 * Check if format uses Hexen-style structures
 */
export function isHexenFormat(format: MapFormatId): boolean {
  return format === 'hexen' || format === 'zdoom_hexen' || format === 'zdaemon';
}
