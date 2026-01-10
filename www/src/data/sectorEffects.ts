/**
 * Sector effect definitions for different game formats.
 * Based on Doom Builder X configuration files.
 */

export interface SectorEffect {
  id: number;
  name: string;
  category: string;
}

export interface GeneralizedOption {
  name: string;
  bits: { value: number; name: string }[];
}

/**
 * Vanilla Doom sector effects (0-17)
 */
export const DOOM_SECTOR_EFFECTS: SectorEffect[] = [
  { id: 0, name: 'Normal', category: 'Normal' },
  { id: 1, name: 'Light Blinks (randomly)', category: 'Lighting' },
  { id: 2, name: 'Light Blinks (0.5 sec)', category: 'Lighting' },
  { id: 3, name: 'Light Blinks (1 sec)', category: 'Lighting' },
  { id: 4, name: 'Damage -10/20% + Light Blinks', category: 'Damage' },
  { id: 5, name: 'Damage -5/10%', category: 'Damage' },
  { id: 7, name: 'Damage -2/5%', category: 'Damage' },
  { id: 8, name: 'Light Glows (1+ sec)', category: 'Lighting' },
  { id: 9, name: 'Secret', category: 'Special' },
  { id: 10, name: 'Door Close (30 sec)', category: 'Special' },
  { id: 11, name: 'Damage -10/20% + End Level', category: 'Damage' },
  { id: 12, name: 'Light Blinks (0.5 sec sync)', category: 'Lighting' },
  { id: 13, name: 'Light Blinks (1 sec sync)', category: 'Lighting' },
  { id: 14, name: 'Door Open (5 min)', category: 'Special' },
  { id: 16, name: 'Damage -10/20%', category: 'Damage' },
  { id: 17, name: 'Light Flickers (randomly)', category: 'Lighting' },
];

/**
 * Boom generalized sector options
 */
export const BOOM_GENERALIZED_OPTIONS: GeneralizedOption[] = [
  {
    name: 'Lighting',
    bits: [
      { value: 0, name: 'Normal' },
      { value: 1, name: 'Blink Random' },
      { value: 2, name: 'Blink 0.5s' },
      { value: 3, name: 'Blink 1s' },
      { value: 8, name: 'Glow' },
      { value: 12, name: 'Blink 0.5s Sync' },
      { value: 13, name: 'Blink 1s Sync' },
      { value: 17, name: 'Flicker Random' },
    ],
  },
  {
    name: 'Damage',
    bits: [
      { value: 0, name: 'None' },
      { value: 32, name: '5/sec' },
      { value: 64, name: '10/sec' },
      { value: 96, name: '20/sec' },
    ],
  },
  {
    name: 'Secret',
    bits: [
      { value: 0, name: 'No' },
      { value: 128, name: 'Yes' },
    ],
  },
  {
    name: 'Friction',
    bits: [
      { value: 0, name: 'Disabled' },
      { value: 256, name: 'Enabled' },
    ],
  },
  {
    name: 'Wind/Current',
    bits: [
      { value: 0, name: 'Disabled' },
      { value: 512, name: 'Enabled' },
    ],
  },
];

/**
 * ZDoom/Hexen extended sector effects
 */
export const ZDOOM_SECTOR_EFFECTS: SectorEffect[] = [
  // Normal
  { id: 0, name: 'Normal', category: 'Normal' },

  // Lighting
  { id: 1, name: 'Light Phased', category: 'Lighting' },
  { id: 2, name: 'Light Sequence Start', category: 'Lighting' },
  { id: 3, name: 'Light Sequence Special 1', category: 'Lighting' },
  { id: 4, name: 'Light Sequence Special 2', category: 'Lighting' },
  { id: 65, name: 'Light Flicker', category: 'Lighting' },
  { id: 66, name: 'Light Strobe Fast', category: 'Lighting' },
  { id: 67, name: 'Light Strobe Slow', category: 'Lighting' },
  { id: 68, name: 'Light Strobe Hurt', category: 'Lighting' },
  { id: 72, name: 'Light Glow', category: 'Lighting' },
  { id: 76, name: 'Light Strobe Slow Sync', category: 'Lighting' },
  { id: 77, name: 'Light Strobe Fast Sync', category: 'Lighting' },
  { id: 81, name: 'Light Fire Flicker', category: 'Lighting' },
  { id: 197, name: 'Lightning Outdoor', category: 'Lighting' },
  { id: 198, name: 'Lightning Indoor 2', category: 'Lighting' },
  { id: 199, name: 'Lightning Indoor 1', category: 'Lighting' },

  // Damage
  { id: 69, name: 'Damage Hellslime', category: 'Damage' },
  { id: 71, name: 'Damage Nukage', category: 'Damage' },
  { id: 75, name: 'Damage End Level', category: 'Damage' },
  { id: 80, name: 'Damage Super Hellslime', category: 'Damage' },
  { id: 82, name: 'Damage -2/5% (no protection)', category: 'Damage' },
  { id: 83, name: 'Damage -4/8% (no protection)', category: 'Damage' },
  { id: 84, name: 'Scroll East + Damage', category: 'Damage' },
  { id: 105, name: 'Delayed Damage Weak', category: 'Damage' },
  { id: 115, name: 'Instant Death', category: 'Damage' },
  { id: 116, name: 'Delayed Damage Strong', category: 'Damage' },
  { id: 196, name: 'Healing Sector', category: 'Damage' },

  // Special
  { id: 74, name: 'Door Close (30 sec)', category: 'Special' },
  { id: 78, name: 'Door Raise (5 min)', category: 'Special' },
  { id: 79, name: 'Low Friction', category: 'Special' },
  { id: 87, name: 'Sector Uses Outside Fog', category: 'Special' },
  { id: 118, name: 'Carry Player by Tag', category: 'Special' },
  { id: 200, name: 'Sky 2 (MAPINFO)', category: 'Special' },

  // Stairs
  { id: 26, name: 'Stairs Special 1', category: 'Stairs' },
  { id: 27, name: 'Stairs Special 2', category: 'Stairs' },

  // Wind
  { id: 40, name: 'Wind East Weak', category: 'Wind' },
  { id: 41, name: 'Wind East Medium', category: 'Wind' },
  { id: 42, name: 'Wind East Strong', category: 'Wind' },
  { id: 43, name: 'Wind North Weak', category: 'Wind' },
  { id: 44, name: 'Wind North Medium', category: 'Wind' },
  { id: 45, name: 'Wind North Strong', category: 'Wind' },
  { id: 46, name: 'Wind South Weak', category: 'Wind' },
  { id: 47, name: 'Wind South Medium', category: 'Wind' },
  { id: 48, name: 'Wind South Strong', category: 'Wind' },
  { id: 49, name: 'Wind West Weak', category: 'Wind' },
  { id: 50, name: 'Wind West Medium', category: 'Wind' },
  { id: 51, name: 'Wind West Strong', category: 'Wind' },

  // Scroll
  { id: 201, name: 'Scroll North (slow)', category: 'Scroll' },
  { id: 202, name: 'Scroll North (medium)', category: 'Scroll' },
  { id: 203, name: 'Scroll North (fast)', category: 'Scroll' },
  { id: 204, name: 'Scroll East (slow)', category: 'Scroll' },
  { id: 205, name: 'Scroll East (medium)', category: 'Scroll' },
  { id: 206, name: 'Scroll East (fast)', category: 'Scroll' },
  { id: 207, name: 'Scroll South (slow)', category: 'Scroll' },
  { id: 208, name: 'Scroll South (medium)', category: 'Scroll' },
  { id: 209, name: 'Scroll South (fast)', category: 'Scroll' },
  { id: 210, name: 'Scroll West (slow)', category: 'Scroll' },
  { id: 211, name: 'Scroll West (medium)', category: 'Scroll' },
  { id: 212, name: 'Scroll West (fast)', category: 'Scroll' },
  { id: 213, name: 'Scroll NorthWest (slow)', category: 'Scroll' },
  { id: 214, name: 'Scroll NorthWest (medium)', category: 'Scroll' },
  { id: 215, name: 'Scroll NorthWest (fast)', category: 'Scroll' },
  { id: 216, name: 'Scroll NorthEast (slow)', category: 'Scroll' },
  { id: 217, name: 'Scroll NorthEast (medium)', category: 'Scroll' },
  { id: 218, name: 'Scroll NorthEast (fast)', category: 'Scroll' },
  { id: 219, name: 'Scroll SouthEast (slow)', category: 'Scroll' },
  { id: 220, name: 'Scroll SouthEast (medium)', category: 'Scroll' },
  { id: 221, name: 'Scroll SouthEast (fast)', category: 'Scroll' },
  { id: 222, name: 'Scroll SouthWest (slow)', category: 'Scroll' },
  { id: 223, name: 'Scroll SouthWest (medium)', category: 'Scroll' },
  { id: 224, name: 'Scroll SouthWest (fast)', category: 'Scroll' },

  // Carry
  { id: 225, name: 'Carry East Slow', category: 'Carry' },
  { id: 226, name: 'Carry East Med.Slow', category: 'Carry' },
  { id: 227, name: 'Carry East Medium', category: 'Carry' },
  { id: 228, name: 'Carry East Med.Fast', category: 'Carry' },
  { id: 229, name: 'Carry East Fast', category: 'Carry' },
  { id: 230, name: 'Carry North Slow', category: 'Carry' },
  { id: 231, name: 'Carry North Med.Slow', category: 'Carry' },
  { id: 232, name: 'Carry North Medium', category: 'Carry' },
  { id: 233, name: 'Carry North Med.Fast', category: 'Carry' },
  { id: 234, name: 'Carry North Fast', category: 'Carry' },
  { id: 235, name: 'Carry South Slow', category: 'Carry' },
  { id: 236, name: 'Carry South Med.Slow', category: 'Carry' },
  { id: 237, name: 'Carry South Medium', category: 'Carry' },
  { id: 238, name: 'Carry South Med.Fast', category: 'Carry' },
  { id: 239, name: 'Carry South Fast', category: 'Carry' },
  { id: 240, name: 'Carry West Slow', category: 'Carry' },
  { id: 241, name: 'Carry West Med.Slow', category: 'Carry' },
  { id: 242, name: 'Carry West Medium', category: 'Carry' },
  { id: 243, name: 'Carry West Med.Fast', category: 'Carry' },
  { id: 244, name: 'Carry West Fast', category: 'Carry' },
];

/**
 * Get sector effects for a given map format
 */
export function getSectorEffectsForFormat(format: string): {
  effects: SectorEffect[];
  generalized: GeneralizedOption[] | null;
} {
  switch (format) {
    case 'doom':
      return { effects: DOOM_SECTOR_EFFECTS, generalized: null };

    case 'boom_doom':
    case 'boom_doom2':
      return { effects: DOOM_SECTOR_EFFECTS, generalized: BOOM_GENERALIZED_OPTIONS };

    case 'hexen':
    case 'zdoom_hexen':
    case 'zdaemon':
      return { effects: ZDOOM_SECTOR_EFFECTS, generalized: null };

    default:
      return { effects: DOOM_SECTOR_EFFECTS, generalized: null };
  }
}

/**
 * Get effect name by ID for display
 */
export function getEffectName(effectId: number, format: string): string {
  const { effects, generalized } = getSectorEffectsForFormat(format);

  // Check predefined effects first
  const effect = effects.find((e) => e.id === effectId);
  if (effect) {
    return effect.name;
  }

  // For Boom formats, try to decode generalized effect
  if (generalized && effectId > 0) {
    const parts: string[] = [];

    for (const option of generalized) {
      for (const bit of option.bits) {
        if (bit.value > 0 && (effectId & bit.value) === bit.value) {
          parts.push(bit.name);
        }
      }
    }

    if (parts.length > 0) {
      return `Generalized: ${parts.join(' + ')}`;
    }
  }

  return `Unknown (${effectId})`;
}

/**
 * Get unique categories from effects list
 */
export function getEffectCategories(effects: SectorEffect[]): string[] {
  const categories = new Set<string>();
  for (const effect of effects) {
    categories.add(effect.category);
  }
  return Array.from(categories);
}
