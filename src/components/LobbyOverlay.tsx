import React, { useState } from 'react';
import { BookOpen, Bot, Play, Trophy, User, Users, Zap } from 'lucide-react';
import { CAMEL_PALETTES, MODE_CONFIGS } from '../game/constants';
import { GameMode, MatchFormat, PlayerConfig } from '../game/types';
import { RulesModal } from './RulesModal';

interface LobbyOverlayProps {
  mode: GameMode;
  format: MatchFormat;
  players: PlayerConfig[];
  onChangeMode: (m: GameMode) => void;
  onChangeFormat: (f: MatchFormat) => void;
  onChangePlayers: (next: PlayerConfig[]) => void;
  onStart: () => void;
}

export const LobbyOverlay: React.FC<LobbyOverlayProps> = ({
  mode,
  format,
  players,
  onChangeMode,
  onChangeFormat,
  onChangePlayers,
  onStart,
}) => {
  const [showRules, setShowRules] = useState(false);
  const enabledCount = players.filter((p) => p.enabled).length;

  const setSeatMode = (idx: number, kind: 'human' | 'ai' | 'off') => {
    const next = players.map((p, i) => {
      if (i !== idx) return p;
      if (kind === 'off') return { ...p, enabled: false };
      return { ...p, enabled: true, isAI: kind === 'ai' };
    });
    onChangePlayers(next);
  };

  const setSeatName = (idx: number, name: string) => {
    onChangePlayers(
      players.map((p, i) => (i === idx ? { ...p, name } : p))
    );
  };

  const applyPreset = (preset: 'solo4' | 'local2' | 'chaos6') => {
    const next = players.map((p, idx) => {
      if (preset === 'solo4') {
        return { ...p, enabled: idx < 4, isAI: idx > 0 };
      }
      if (preset === 'local2') {
        return { ...p, enabled: idx < 2, isAI: false };
      }
      return { ...p, enabled: true, isAI: idx > 0 };
    });
    onChangePlayers(next);
  };

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 md:p-8 bg-stone-950/65 overflow-y-auto">
      <div className="w-full max-w-5xl rounded-2xl bg-stone-950/95 border border-amber-300/20 shadow-2xl p-6 md:p-8 text-stone-100">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-6 border-b border-stone-800">
          <div>
            <p className="text-xs font-medium tracking-wide text-amber-400">
              3D Desert Board Game · 2–6 Players
            </p>
            <h1 className="font-display text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-1">
              Camel Dash: Desert Derby
            </h1>
            <p className="text-sm text-stone-300 mt-1.5 max-w-2xl">
              Race across randomized hex tracks, stack camels to hitch rides, trigger desert events, and outsmart rivals with tactical dice and power-ups.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowRules(true)}
              className="px-3 py-2 rounded-lg text-xs font-semibold bg-amber-500/15 hover:bg-amber-500/25 border border-amber-400/50 text-amber-300 flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Rules</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset('solo4')}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              Solo vs 3 Bots
            </button>
            <button
              type="button"
              onClick={() => applyPreset('local2')}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              2-Player Local
            </button>
            <button
              type="button"
              onClick={() => applyPreset('chaos6')}
              className="px-3 py-2 rounded-lg text-xs font-medium bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-200 whitespace-nowrap shrink-0 transition-colors cursor-pointer"
            >
              6-Camel Derby
            </button>
          </div>
        </div>

        {/* Main 2-column configuration */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
          {/* Left: Game Modes & Format */}
          <div className="lg:col-span-5 flex flex-col gap-5">
            <div>
              <h2 className="text-sm font-semibold text-stone-200 mb-2.5">
                Track Mode
              </h2>
              <div className="flex flex-col gap-2.5">
                {(['kleine', 'standaard'] as GameMode[]).map((mKey) => {
                  const cfg = MODE_CONFIGS[mKey];
                  const active = mode === mKey;
                  return (
                    <button
                      key={mKey}
                      type="button"
                      onClick={() => onChangeMode(mKey)}
                      className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                        active
                          ? 'bg-amber-500/15 border-amber-400 text-white'
                          : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-display font-bold text-base">
                          {cfg.title}
                        </span>
                        <span className="font-mono text-xs tabular-nums text-amber-300">
                          {cfg.trackLength} vakjes
                        </span>
                      </div>
                      <p className="text-xs text-stone-400 mt-1">{cfg.subtitle}</p>
                      <p className="text-xs text-stone-300 mt-2">
                        {cfg.highlights.join(' · ')}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h2 className="text-sm font-semibold text-stone-200 mb-2.5">
                Scoring Format
              </h2>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => onChangeFormat('championship')}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    format === 'championship'
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>3-Race Cup</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    1st 10 · 2nd 6 · 3rd 3 pts
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeFormat('single')}
                  className={`p-3.5 rounded-xl border text-left transition-colors cursor-pointer ${
                    format === 'single'
                      ? 'bg-amber-500/15 border-amber-400 text-white'
                      : 'bg-stone-900/80 border-stone-800 text-stone-300 hover:border-stone-700'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-sm">
                    <Zap className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>Single Race</span>
                  </div>
                  <p className="text-xs text-stone-400 mt-1">
                    First across finish wins
                  </p>
                </button>
              </div>
            </div>
          </div>

          {/* Right: 2-6 Camel Roster */}
          <div className="lg:col-span-7 flex flex-col">
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-semibold text-stone-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <span>Racers ({enabledCount} active · min 2)</span>
              </h2>
              <span className="text-xs text-stone-400">
                Mix local friends & computer bots
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {players.map((p, idx) => {
                const pal = CAMEL_PALETTES[p.color];
                const seatType = !p.enabled
                  ? 'off'
                  : p.isAI
                  ? 'ai'
                  : 'human';
                return (
                  <div
                    key={p.id}
                    className={`p-3 rounded-xl border transition-opacity ${
                      p.enabled
                        ? 'bg-stone-900/90 border-stone-700/80'
                        : 'bg-stone-900/40 border-stone-800/70 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <span
                        className="w-4 h-4 rounded-full shrink-0 border border-white/30"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <input
                        type="text"
                        value={p.name}
                        disabled={!p.enabled}
                        maxLength={16}
                        onChange={(e) => setSeatName(idx, e.target.value)}
                        aria-label={`${pal.label} camel name`}
                        className="w-full bg-stone-950/70 border border-stone-800 rounded-lg px-2.5 py-1.5 text-sm font-medium text-white focus:outline-none focus:border-amber-400 disabled:opacity-50"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-1 bg-stone-950/80 p-1 rounded-lg">
                      <button
                        type="button"
                        onClick={() => setSeatMode(idx, 'human')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          seatType === 'human'
                            ? 'bg-amber-500 text-stone-950'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <User className="w-3.5 h-3.5" />
                        <span>Human</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setSeatMode(idx, 'ai')}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap ${
                          seatType === 'ai'
                            ? 'bg-sky-500 text-stone-950'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        <Bot className="w-3.5 h-3.5" />
                        <span>Bot</span>
                      </button>
                      <button
                        type="button"
                        disabled={p.enabled && enabledCount <= 2}
                        onClick={() => setSeatMode(idx, 'off')}
                        className={`py-1.5 px-2 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap disabled:opacity-35 disabled:cursor-not-allowed ${
                          seatType === 'off'
                            ? 'bg-stone-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-between gap-4 pt-4 border-t border-stone-800">
              <p className="text-xs text-stone-400">
                Spaces 3, 7, 11… are Obstacles · Spaces 4, 8, 12… are Power-Ups · Land exact to Stack!
              </p>
              <button
                type="button"
                disabled={enabledCount < 2}
                onClick={onStart}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-display font-bold text-base bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-lg transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Derby</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
};
