import React from 'react';
import {
  AlertTriangle,
  Ban,
  FastForward,
  Footprints,
  Sparkles,
  Zap,
} from 'lucide-react';
import { ACTION_DIE_FACES } from '../game/constants';
import { ActionDieFace } from '../game/types';

interface VisualDiceProps {
  movementDie: number;
  actionDieNumber: number;
  actionDie: ActionDieFace;
  rollNonce: number;
  compact?: boolean;
}

const PIP_LAYOUTS: Record<number, number[]> = {
  1: [4],
  2: [2, 6],
  3: [2, 4, 6],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

function renderActionFaceIcon(face: ActionDieFace, sizeClass: string) {
  switch (face) {
    case 'none':
      return <Footprints className={`${sizeClass} text-stone-300`} />;
    case 'obstacle':
      return <AlertTriangle className={`${sizeClass} text-red-400`} />;
    case 'powerup':
      return <Sparkles className={`${sizeClass} text-teal-300`} />;
    case 'pass_player':
      return <FastForward className={`${sizeClass} text-amber-300`} />;
    case 'no_passing':
      return <Ban className={`${sizeClass} text-orange-400`} />;
    case 'kick_player':
      return <Zap className={`${sizeClass} text-rose-400`} />;
  }
}

export const VisualDice: React.FC<VisualDiceProps> = ({
  movementDie,
  actionDieNumber,
  actionDie,
  rollNonce,
  compact = false,
}) => {
  const pips = PIP_LAYOUTS[movementDie] ?? PIP_LAYOUTS[1];
  const actionMeta = ACTION_DIE_FACES[actionDieNumber];
  const cubeSize = compact ? 'w-11 h-11' : 'w-14 h-14';
  const pipSize = compact ? 'w-1.5 h-1.5' : 'w-2 h-2';

  return (
    <div key={rollNonce} className="flex items-center gap-2.5">
      {/* Movement D6 Cube */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`${cubeSize} animate-dice-tumble rounded-xl bg-gradient-to-br from-amber-50 via-stone-100 to-amber-200 border-2 border-amber-400/80 shadow-[0_5px_0_0_rgba(180,83,9,0.85),0_10px_18px_rgba(0,0,0,0.45)] p-1.5 grid grid-cols-3 grid-rows-3 place-items-center`}
          title={`Movement Die: ${movementDie}`}
        >
          {Array.from({ length: 9 }).map((_, idx) => {
            const active = pips.includes(idx);
            return (
              <span
                key={idx}
                className={`${pipSize} rounded-full transition-opacity ${
                  active
                    ? movementDie === 1
                      ? 'bg-red-600'
                      : 'bg-stone-900'
                    : 'opacity-0'
                }`}
              />
            );
          })}
        </div>
        {!compact && (
          <span className="text-[10px] font-semibold text-stone-400 uppercase tracking-wide">
            Move {movementDie}
          </span>
        )}
      </div>

      {/* Action D6 Cube */}
      <div className="flex flex-col items-center gap-1">
        <div
          className={`${cubeSize} animate-dice-tumble rounded-xl bg-gradient-to-br from-stone-800 via-stone-900 to-stone-950 border-2 border-amber-400/80 shadow-[0_5px_0_0_rgba(120,53,15,0.9),0_10px_18px_rgba(0,0,0,0.45)] flex flex-col items-center justify-center relative px-1`}
          title={`Action Die (${actionDieNumber}): ${actionMeta?.label ?? ''}`}
        >
          <span className="absolute top-0.5 right-1 font-mono text-[9px] font-bold text-amber-400/80">
            {actionDieNumber}
          </span>
          {renderActionFaceIcon(actionDie, compact ? 'w-4 h-4' : 'w-5 h-5')}
          <span className="text-[9px] font-bold text-stone-100 leading-none mt-0.5 truncate max-w-full">
            {actionDie === 'none'
              ? 'Steady'
              : actionDie === 'obstacle'
              ? 'Obstacle'
              : actionDie === 'powerup'
              ? 'Power'
              : actionDie === 'pass_player'
              ? 'Pass'
              : actionDie === 'no_passing'
              ? 'No Pass'
              : 'Kick'}
          </span>
        </div>
        {!compact && (
          <span className="text-[10px] font-semibold text-amber-300 uppercase tracking-wide whitespace-nowrap">
            {actionMeta?.label}
          </span>
        )}
      </div>
    </div>
  );
};
