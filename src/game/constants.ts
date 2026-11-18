import {
  ActionDieFace,
  BoardTile,
  CamelColor,
  DesertEventType,
  GameMode,
  PowerUpType,
  TileBiome,
  TileSpaceType,
} from './types';

export interface CamelPalette {
  id: CamelColor;
  label: string;
  primary: string;
  hex: number;
  saddleHex: number;
  accentHex: number;
  badgeBg: string;
  badgeText: string;
}

export const CAMEL_PALETTES: Record<CamelColor, CamelPalette> = {
  red: {
    id: 'red',
    label: 'Crimson',
    primary: '#EF4444',
    hex: 0xef4444,
    saddleHex: 0xfef08a,
    accentHex: 0x991b1b,
    badgeBg: 'bg-red-500',
    badgeText: 'text-white',
  },
  blue: {
    id: 'blue',
    label: 'Oasis Blue',
    primary: '#3B82F6',
    hex: 0x3b82f6,
    saddleHex: 0xfde047,
    accentHex: 0x1e40af,
    badgeBg: 'bg-blue-500',
    badgeText: 'text-white',
  },
  green: {
    id: 'green',
    label: 'Palm Green',
    primary: '#22C55E',
    hex: 0x22c55e,
    saddleHex: 0xfef08a,
    accentHex: 0x166534,
    badgeBg: 'bg-emerald-500',
    badgeText: 'text-stone-950',
  },
  yellow: {
    id: 'yellow',
    label: 'Sun Gold',
    primary: '#FACC15',
    hex: 0xfacc15,
    saddleHex: 0xf97316,
    accentHex: 0xa16207,
    badgeBg: 'bg-yellow-400',
    badgeText: 'text-stone-950',
  },
  purple: {
    id: 'purple',
    label: 'Mirage Violet',
    primary: '#A855F7',
    hex: 0xa855f7,
    saddleHex: 0x5eead4,
    accentHex: 0x6b21a8,
    badgeBg: 'bg-purple-500',
    badgeText: 'text-white',
  },
  orange: {
    id: 'orange',
    label: 'Dune Tangerine',
    primary: '#F97316',
    hex: 0xf97316,
    saddleHex: 0x38bdf8,
    accentHex: 0x9a3412,
    badgeBg: 'bg-orange-500',
    badgeText: 'text-white',
  },
};

export const CAMEL_ORDER: CamelColor[] = [
  'red',
  'blue',
  'green',
  'yellow',
  'purple',
  'orange',
];

export const DEFAULT_BOT_NAMES: Record<CamelColor, string> = {
  red: 'Habibi',
  blue: 'Mirage',
  green: 'Cactus Jack',
  yellow: 'Saffron',
  purple: 'Sultan',
  orange: 'Dune Runner',
};

export const MODE_CONFIGS: Record<
  GameMode,
  {
    title: string;
    subtitle: string;
    trackLength: number;
    duration: string;
    highlights: string[];
  }
> = {
  kleine: {
    title: 'Kleine Race',
    subtitle: '30 vakjes · Snel spel (10-15 min)',
    trackLength: 30,
    duration: '10-15 min',
    highlights: ['Goed voor kinderen', 'Veel directe actie', 'Snelle finishes'],
  },
  standaard: {
    title: 'Standaard Race (Aanrader)',
    subtitle: '50 vakjes · Tactisch spel (20-30 min)',
    trackLength: 50,
    duration: '20-30 min',
    highlights: [
      'Genoeg ruimte voor obstakels en power-ups',
      'Combacks mogelijk na pech',
      'Volledige kamelen-stapels',
    ],
  },
};

export interface PowerUpMeta {
  id: PowerUpType;
  name: string;
  shortDesc: string;
  timing: 'pre_roll' | 'passive_or_save' | 'instant_or_save';
  accentColor: string;
}

export const POWER_UP_META: Record<PowerUpType, PowerUpMeta> = {
  speed_boost: {
    id: 'speed_boost',
    name: 'Speed Boost',
    shortDesc: '+4 movement on your roll',
    timing: 'instant_or_save',
    accentColor: '#F97316',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    shortDesc: 'Blocks 1 Kick or Obstacle effect',
    timing: 'passive_or_save',
    accentColor: '#38BDF8',
  },
  sand_trap: {
    id: 'sand_trap',
    name: 'Sand Trap',
    shortDesc: 'Place on any space; next camel loses 1 turn',
    timing: 'pre_roll',
    accentColor: '#EAB308',
  },
  blockade: {
    id: 'blockade',
    name: 'Blockade',
    shortDesc: 'Target a rival; cannot move for 2 turns',
    timing: 'pre_roll',
    accentColor: '#EF4444',
  },
  sprint_potion: {
    id: 'sprint_potion',
    name: 'Sprint Potion',
    shortDesc: 'Double your next Movement Die roll',
    timing: 'pre_roll',
    accentColor: '#22C55E',
  },
  oasis_refresh: {
    id: 'oasis_refresh',
    name: 'Oasis Refresh',
    shortDesc: 'Take another turn immediately',
    timing: 'pre_roll',
    accentColor: '#14B8A6',
  },
};

export const ALL_POWER_UPS: PowerUpType[] = [
  'speed_boost',
  'shield',
  'sand_trap',
  'blockade',
  'sprint_potion',
  'oasis_refresh',
];

export const ACTION_DIE_FACES: Record<
  number,
  { face: ActionDieFace; label: string; desc: string }
> = {
  1: { face: 'none', label: 'Steady Trot', desc: 'No special action this turn.' },
  2: { face: 'obstacle', label: 'Obstacle!', desc: 'Roll the Obstacle Die!' },
  3: { face: 'powerup', label: 'Power-Up!', desc: 'Draw a random Power-Up token!' },
  4: {
    face: 'pass_player',
    label: 'Pass Player',
    desc: 'Move through rivals & end ahead of a camel.',
  },
  5: {
    face: 'no_passing',
    label: 'No Passing',
    desc: 'Must stop behind the first camel encountered.',
  },
  6: {
    face: 'kick_player',
    label: 'Kick Player',
    desc: 'Push an adjacent camel back 3 or stun 1 turn!',
  },
};

export const DESERT_EVENTS: Record<
  DesertEventType,
  { title: string; desc: string; color: string }
> = {
  sandstorm: {
    title: 'Sandstorm!',
    desc: 'Fierce desert gusts blow all camels back 2 spaces.',
    color: '#F59E0B',
  },
  tailwind: {
    title: 'Tailwind!',
    desc: 'Warm desert breeze pushes every camel forward 1 space.',
    color: '#38BDF8',
  },
  mirage: {
    title: 'Mirage!',
    desc: 'Shimmering oasis illusion — everyone ignores their next obstacle!',
    color: '#A855F7',
  },
  water_stop: {
    title: 'Water Stop!',
    desc: 'Refreshing desert spring — every camel gains a Shield!',
    color: '#22C55E',
  },
};

export const CHAMPIONSHIP_POINTS = [10, 6, 3, 1, 0, 0];

const BIOME_POOL: TileBiome[] = [
  'desert',
  'dune',
  'oasis',
  'canyon',
  'sandstorm',
  'ruins',
];

/**
 * Generates a randomized round/oval 3D hexagonal race circuit around a central oasis lagoon.
 * Start (0) and Finish (trackLength) meet near the front Finish Gate.
 * Obstacle spaces are strictly at 3, 7, 11, 15, ... alternating between Bandit & Blow Machine props.
 * Power-up spaces are strictly at 4, 8, 12, 16, ...
 */
export function generateRandomizedTrack(trackLength: number): BoardTile[] {
  const tiles: BoardTile[] = [];
  const totalCount = trackLength + 1;
  const arcSpacing = 3.08;
  const baseRadius = (totalCount * arcSpacing) / (Math.PI * 2);

  // Randomized organic oval harmonics so every race circuit feels unique yet stays round
  const ovalAspect = 1.16 + Math.random() * 0.14;
  const wobbleAmp = baseRadius * (0.045 + Math.random() * 0.04);
  const wobbleFreq = Math.random() > 0.5 ? 3 : 4;
  const wobblePhase = Math.random() * Math.PI * 2;

  // Create random biome segments of 3-6 tiles around the circuit
  const biomes: TileBiome[] = [];
  let currentBiome: TileBiome = 'desert';
  let remainingInBiome = 3;
  for (let i = 0; i <= trackLength; i++) {
    if (i === 0) {
      biomes.push('start');
      continue;
    }
    if (i === trackLength) {
      biomes.push('finish');
      continue;
    }
    if (remainingInBiome <= 0) {
      const candidates = BIOME_POOL.filter((b) => b !== currentBiome);
      currentBiome = candidates[Math.floor(Math.random() * candidates.length)];
      remainingInBiome = 3 + Math.floor(Math.random() * 4);
    }
    biomes.push(currentBiome);
    remainingInBiome--;
  }

  // Place tiles around the closed loop starting at bottom-front (theta = PI / 2), moving clockwise
  const rawPoints: Array<{ x: number; z: number }> = [];
  const arcSpan = Math.PI * 2 * (trackLength / (trackLength + 1.1));
  for (let i = 0; i <= trackLength; i++) {
    const t = i / trackLength;
    const theta = Math.PI * 0.5 + 0.12 + t * arcSpan;
    const r =
      baseRadius + Math.sin(theta * wobbleFreq + wobblePhase) * wobbleAmp;
    const x = Math.cos(theta) * r * ovalAspect;
    const z = Math.sin(theta) * r * 0.9;
    rawPoints.push({ x, z });
  }

  for (let i = 0; i <= trackLength; i++) {
    const p = rawPoints[i];
    const next = rawPoints[Math.min(trackLength, i + 1)];
    const prev = rawPoints[Math.max(0, i - 1)];
    const yaw = Math.atan2(next.x - prev.x, next.z - prev.z);

    let spaceType: TileSpaceType = 'standard';
    let obstacleProp: 'bandit' | 'blow_machine' | undefined;
    if (i === 0) spaceType = 'start';
    else if (i === trackLength) spaceType = 'finish';
    else if (i % 4 === 3) {
      spaceType = 'obstacle';
      obstacleProp = i % 8 === 3 ? 'bandit' : 'blow_machine';
    } else if (i % 4 === 0) spaceType = 'powerup';

    tiles.push({
      index: i,
      biome: biomes[i],
      spaceType,
      obstacleProp,
      x: p.x,
      z: p.z,
      yaw,
      sandTrapOwnerId: null,
    });
  }

  return tiles;
}
