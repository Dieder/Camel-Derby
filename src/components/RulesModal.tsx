import React from 'react';
import { BookOpen, X } from 'lucide-react';

interface RulesModalProps {
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ onClose }) => {
  return (
    <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-stone-950/75 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-stone-950 border border-stone-700 p-6 shadow-2xl text-stone-200 max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <h2 className="font-display text-xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-400" />
            <span>Desert Derby Rules</span>
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-stone-400 hover:text-white cursor-pointer"
            aria-label="Close rules"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3 text-xs md:text-sm leading-relaxed mt-4">
          <p>
            <strong className="text-amber-300">Dual Dice:</strong> Each turn
            rolls the Movement Die (1–6) and the Action Die (1 Steady · 2
            Obstacle · 3 Power-Up · 4 Pass Player · 5 No Passing · 6 Kick
            Player). Press Spacebar to roll!
          </p>
          <p>
            <strong className="text-amber-300">Camel Stacking:</strong> Land on
            the exact space of another camel to stack on top! When a lower camel
            moves, all camels stacked above ride along with it.
          </p>
          <p>
            <strong className="text-amber-300">Passing & Kicking:</strong> Pass
            Player lets you leap ahead of an occupied tile. No Passing stops you
            behind the first camel in your path. Kick Player lets you push an
            adjacent rival back 3 spaces or stun them for 1 turn.
          </p>
          <p>
            <strong className="text-amber-300">Checkpoints (10, 20, 30, 40):</strong>{' '}
            Passing or landing on a Checkpoint locks in a safety floor — you can
            never be pushed back behind your last Checkpoint.
          </p>
          <p>
            <strong className="text-amber-300">Stamina (3 per race):</strong>{' '}
            Before rolling, spend 1 Stamina for +1 Movement on your turn.
          </p>
          <p>
            <strong className="text-amber-300">Final Sprint Zone (Last 10 tiles):</strong>{' '}
            Speed Boost grants +6 instead of +4, and -2 Obstacles hit for -4!
          </p>
          <p>
            <strong className="text-amber-300">Power-Ups (Tiles 4, 8, 12…):</strong>{' '}
            Speed Boost (+4/+6), Turbo Sprint (2× roll), Shield (blocks
            obstacle or kick), Sand Wall (forces rivals to stop there), Block
            (target loses 2 turns), and Swap (trade places with the camel
            ahead).
          </p>
          <p>
            <strong className="text-amber-300">Hidden Obstacles (Tiles 3, 7, 11…):</strong>{' '}
            -2 spaces (-4 in Final Sprint), -3 spaces, Lose 1 or 2 turns, Back
            to Checkpoint, or Sandstorm (-1 for everyone).
          </p>
          <p>
            <strong className="text-amber-300">Desert Events:</strong> After
            every full round: Sandstorm (-2 all), Tailwind (+2 all), Camel
            Stampede (last place +4), Oasis Festival (everyone gets a Power-Up),
            or Quicksand!
          </p>
        </div>
      </div>
    </div>
  );
};
