import * as THREE from 'three';
import { TileBiome, TileSpaceType } from '../game/types';

export function createContactShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  grad.addColorStop(0, 'rgba(38, 22, 8, 0.55)');
  grad.addColorStop(0.55, 'rgba(38, 22, 8, 0.22)');
  grad.addColorStop(1, 'rgba(38, 22, 8, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createDesertTerrainTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, '#f3c16d');
  grad.addColorStop(0.5, '#eab054');
  grad.addColorStop(1, '#e09a43');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Hand-drawn stylized sand ripple bands
  ctx.strokeStyle = 'rgba(255, 232, 179, 0.35)';
  ctx.lineWidth = 4;
  for (let y = 16; y < 512; y += 32) {
    ctx.beginPath();
    for (let x = 0; x <= 512; x += 16) {
      const wave = Math.sin((x / 512) * Math.PI * 4 + y * 0.1) * 7;
      if (x === 0) ctx.moveTo(x, y + wave);
      else ctx.lineTo(x, y + wave);
    }
    ctx.stroke();
  }

  // Subtle warm sand speckles
  for (let i = 0; i < 650; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    ctx.fillStyle = i % 2 === 0 ? 'rgba(180, 102, 28, 0.14)' : 'rgba(255, 244, 214, 0.22)';
    ctx.fillRect(x, y, 2, 2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createSaddleTexture(primaryHex: string, accentHex: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = primaryHex;
  ctx.fillRect(0, 0, 128, 128);

  // Decorative woven stripes & zigzags
  ctx.fillStyle = accentHex;
  ctx.fillRect(0, 14, 128, 12);
  ctx.fillRect(0, 102, 128, 12);

  ctx.strokeStyle = '#FFFBEB';
  ctx.lineWidth = 5;
  ctx.beginPath();
  for (let x = 0; x <= 128; x += 16) {
    const y = x % 32 === 0 ? 52 : 76;
    if (x === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const BIOME_PALETTE: Record<
  TileBiome,
  { fill: string; rim: string; pattern: string }
> = {
  start: { fill: '#FEF08A', rim: '#CA8A04', pattern: '#F59E0B' },
  desert: { fill: '#FDE68A', rim: '#D97706', pattern: '#F59E0B' },
  dune: { fill: '#FCD34D', rim: '#B45309', pattern: '#EA580C' },
  oasis: { fill: '#67E8F9', rim: '#0E7490', pattern: '#10B981' },
  canyon: { fill: '#FDBA74', rim: '#C2410C', pattern: '#9A3412' },
  sandstorm: { fill: '#FBBF24', rim: '#92400E', pattern: '#78350F' },
  ruins: { fill: '#E7E5E4', rim: '#78716C', pattern: '#A8A29E' },
  finish: { fill: '#FFFBEB', rim: '#15803D', pattern: '#1C1917' },
};

export function createTileTopTexture(
  index: number,
  biome: TileBiome,
  spaceType: TileSpaceType,
  maxAnisotropy: number,
  obstacleProp?: 'bandit' | 'blow_machine',
  isFinalSprint = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;
  const pal = BIOME_PALETTE[biome];

  // Base fill
  ctx.fillStyle = pal.fill;
  ctx.fillRect(0, 0, 256, 256);

  // Checkered finish pattern
  if (spaceType === 'finish') {
    const cell = 32;
    for (let y = 0; y < 256; y += cell) {
      for (let x = 0; x < 256; x += cell) {
        if ((x / cell + y / cell) % 2 === 0) {
          ctx.fillStyle = '#1C1917';
          ctx.fillRect(x, y, cell, cell);
        } else {
          ctx.fillStyle = '#FEF9C3';
          ctx.fillRect(x, y, cell, cell);
        }
      }
    }
    ctx.fillStyle = 'rgba(22, 163, 74, 0.94)';
    ctx.beginPath();
    ctx.arc(128, 128, 74, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 34px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('FINISH', 128, 128);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = maxAnisotropy;
    return tex;
  }

  // Stylized cartoon border ring (gold/crimson accent in Final Sprint Zone)
  ctx.strokeStyle = isFinalSprint ? '#EA580C' : pal.rim;
  ctx.lineWidth = isFinalSprint ? 18 : 16;
  ctx.beginPath();
  ctx.arc(128, 128, 104, 0, Math.PI * 2);
  ctx.stroke();

  if (isFinalSprint) {
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 5;
    ctx.setLineDash([14, 10]);
    ctx.beginPath();
    ctx.arc(128, 128, 92, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Biome subtle motif
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = pal.pattern;
  ctx.lineWidth = 6;
  if (biome === 'oasis') {
    ctx.beginPath();
    ctx.arc(128, 128, 76, 0, Math.PI * 2);
    ctx.stroke();
  } else if (biome === 'sandstorm') {
    ctx.beginPath();
    ctx.arc(128, 128, 70, 0.2, Math.PI * 1.4);
    ctx.stroke();
  } else if (biome === 'ruins') {
    ctx.strokeRect(68, 68, 120, 120);
  }
  ctx.restore();

  // Special Space Type highlight (Checkpoint vs Obstacle vs Power-Up vs Start)
  if (spaceType === 'checkpoint') {
    ctx.fillStyle = '#1E3A8A';
    ctx.beginPath();
    ctx.arc(128, 128, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 9;
    ctx.stroke();

    ctx.fillStyle = '#FEF08A';
    ctx.font = '800 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 128, 102);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 19px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('CHECKPOINT', 128, 152);
    ctx.fillStyle = '#93C5FD';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('SAFE ZONE', 128, 176);
  } else if (spaceType === 'obstacle') {
    ctx.fillStyle = '#B91C1C';
    ctx.beginPath();
    ctx.arc(128, 128, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FACC15';
    ctx.lineWidth = 8;
    ctx.setLineDash([16, 12]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = '#FEF2F2';
    ctx.font = '800 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 128, 102);

    ctx.fillStyle = '#FDE047';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(
      obstacleProp === 'bandit' ? '! BANDIT' : '! BLOWER',
      128,
      152
    );
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 17px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(isFinalSprint ? 'SPRINT HAZARD' : 'OBSTACLE', 128, 178);
  } else if (spaceType === 'powerup') {
    ctx.fillStyle = '#0F766E';
    ctx.beginPath();
    ctx.arc(128, 128, 82, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 128, 104);

    ctx.fillStyle = '#FDE047';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('★ POWER UP', 128, 154);
    ctx.fillStyle = '#CCFBF1';
    ctx.font = '700 16px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(isFinalSprint ? 'FINAL BOOST' : 'DRAW CARD', 128, 178);
  } else if (spaceType === 'start') {
    ctx.fillStyle = '#15803D';
    ctx.beginPath();
    ctx.arc(128, 128, 76, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#FEF08A';
    ctx.lineWidth = 8;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 36px "Bricolage Grotesque", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('START', 128, 128);
  } else {
    ctx.fillStyle = isFinalSprint ? '#7C2D12' : '#451A03';
    ctx.font = '800 56px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(index), 128, isFinalSprint ? 114 : 128);
    if (isFinalSprint) {
      ctx.fillStyle = '#EA580C';
      ctx.font = '800 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('FINAL SPRINT', 128, 164);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

