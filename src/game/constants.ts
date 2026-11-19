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
    highlights: ['Goed voor kinderen', 'Veel directe actie', 'Checkpoints 10 & 20'],
  },
  standaard: {
    title: 'Standaard Race (Aanrader)',
    subtitle: '50 vakjes · Tactisch spel (20-30 min)',
    trackLength: 50,
    duration: '20-30 min',
    highlights: [
      'Checkpoints 10, 20, 30, 40',
      'Final Sprint vanaf vakje 40',
      'Kamelen stapelen & Stamina',
    ],
  },
};

export interface PowerUpMeta {
  id: PowerUpType;
  name: string;
  shortDesc: string;
  accentColor: string;
}

export const POWER_UP_META: Record<PowerUpType, PowerUpMeta> = {
  speed_boost: {
    id: 'speed_boost',
    name: 'Speed Boost',
    shortDesc: '+4 steps (+6 in Final Sprint Zone!)',
    accentColor: '#F97316',
  },
  turbo_sprint: {
    id: 'turbo_sprint',
    name: 'Turbo Sprint',
    shortDesc: 'Double your next Movement Die roll',
    accentColor: '#22C55E',
  },
  shield: {
    id: 'shield',
    name: 'Shield',
    shortDesc: 'Blocks 1 Obstacle or Kick effect',
    accentColor: '#38BDF8',
  },
  sand_wall: {
    id: 'sand_wall',
    name: 'Sand Wall',
    shortDesc: 'Place on an empty space; rivals must stop there!',
    accentColor: '#EAB308',
  },
  block: {
    id: 'block',
    name: 'Block',
    shortDesc: 'Target a rival; they lose 2 turns',
    accentColor: '#EF4444',
  },
  swap: {
    id: 'swap',
    name: 'Swap',
    shortDesc: 'Swap positions with the camel directly ahead of you!',
    accentColor: '#A855F7',
  },
};

export const ALL_POWER_UPS: PowerUpType[] = [
  'speed_boost',
  'turbo_sprint',
  'shield',
  'sand_wall',
  'block',
  'swap',
];

export const ACTION_DIE_FACES: Record<
  number,
  { face: ActionDieFace; label: string; desc: string }
> = {
  1: { face: 'none', label: 'Steady Trot', desc: 'No special action this turn.' },
  2: { face: 'obstacle', label: 'Obstacle!', desc: 'Draw a hidden Obstacle Card!' },
  3: { face: 'powerup', label: 'Power-Up!', desc: 'Draw a random Power-Up Card!' },
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
    desc: 'Everyone is blown back 2 spaces (never past your Checkpoint).',
    color: '#F59E0B',
  },
  tailwind: {
    title: 'Tailwind!',
    desc: 'Strong desert winds push every camel forward 2 spaces!',
    color: '#38BDF8',
  },
  camel_stampede: {
    title: 'Camel Stampede!',
    desc: 'The last-place camel charges forward +4 spaces!',
    color: '#22C55E',
  },
  oasis_festival: {
    title: 'Oasis Festival!',
    desc: 'Celebration at the oasis — every camel receives a Power-Up!',
    color: '#A855F7',
  },
  quicksand: {
    title: 'Quicksand!',
    desc: 'The mid-track space turns into dangerous quicksand!',
    color: '#EF4444',
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
 * Checkpoints at 10, 20, 30, 40...
 * Obstacles at 3, 7, 11, 15, ...
 * Power-Ups at 4, 8, 12, 16, ...
 */
export function generateRandomizedTrack(trackLength: number): BoardTile[] {
  const tiles: BoardTile[] = [];
  const totalCount = trackLength + 1;
  const arcSpacing = 3.08;
  const baseRadius = (totalCount * arcSpacing) / (Math.PI * 2);

  const ovalAspect = 1.16 + Math.random() * 0.14;
  const wobbleAmp = baseRadius * (0.045 + Math.random() * 0.04);
  const wobbleFreq = Math.random() > 0.5 ? 3 : 4;
  const wobblePhase = Math.random() * Math.PI * 2;

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
    else if (i % 10 === 0) spaceType = 'checkpoint';
    else if (i % 4 === 3) {
      spaceType = 'obstacle';
      obstacleProp = i % 8 === 3 ? 'bandit' : 'blow_machine';
    } else if (i % 4 === 0) {
      spaceType = 'powerup';
    }

    tiles.push({
      index: i,
      biome: biomes[i],
      spaceType,
      obstacleProp,
      x: p.x,
      z: p.z,
      yaw,
      sandTrapOwnerId: null,
      hazardKind: null,
    });
  }

  return tiles;
}
