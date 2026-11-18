import React, { useState } from 'react';
import {
  BookOpen,
  ChevronDown,
  ChevronUp,
  Dices,
  Eye,
  Moon,
  RotateCcw,
  Shield,
  Sparkles,
  Sun,
  Sunset,
  Trophy,
  Volume2,
  VolumeX,
  Wind,
  X,
  Zap,
} from 'lucide-react';
import {
  ACTION_DIE_FACES,
  CAMEL_PALETTES,
  DESERT_EVENTS,
  POWER_UP_META,
} from '../game/constants';
import {
  getChampionshipStandings,
  getStandingsSorted,
} from '../game/engine';
import {
  CamelColor,
  CameraMode,
  GameState,
  PowerUpType,
  TimeOfDay,
} from '../game/types';

export interface RollMessageData {
  id: number;
  playerName: string;
  playerColor: CamelColor;
  headline: string;
  detail: string;
}

interface GameHUDProps {
  state: GameState;
  cameraMode: CameraMode;
  timeOfDay: TimeOfDay;
  muted: boolean;
  dockHidden: boolean;
  rollMessage: RollMessageData | null;
  onToggleDock: () => void;
  onChangeCamera: (mode: CameraMode) => void;
  onChangeTimeOfDay: (tod: TimeOfDay) => void;
  onToggleMute: () => void;
  onRollDice: () => void;
  onUsePowerUp: (p: PowerUpType) => void;
  onResolvePassChoice: (choice: 'vault' | 'stack') => void;
  onResolveKick: (targetId: string, mode: 'push' | 'stun') => void;
  onSelectBlockadeTarget: (targetId: string) => void;
  onCancelTargetMode: () => void;
  onResolveObstacle: () => void;
  onDismissEvent: () => void;
  onNextRace: () => void;
  onReturnToLobby: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  state,
  cameraMode,
  timeOfDay,
  muted,
  dockHidden,
  rollMessage,
  onToggleDock,
  onChangeCamera,
  onChangeTimeOfDay,
  onToggleMute,
  onRollDice,
  onUsePowerUp,
  onResolvePassChoice,
  onResolveKick,
  onSelectBlockadeTarget,
  onCancelTargetMode,
  onResolveObstacle,
  onDismissEvent,
  onNextRace,
  onReturnToLobby,
}) => {
  const [showRules, setShowRules] = useState(false);
  const [kickTargetId, setKickTargetId] = useState<string | null>(null);

  const currentPlayer = state.players[state.currentPlayerIndex];
  const standings = getStandingsSorted(state.players);
  const isHumanTurn =
    currentPlayer && !currentPlayer.isAI && state.phase === 'awaiting_roll';

  const nextTimeOfDay = (): TimeOfDay => {
    if (timeOfDay === 'day') return 'sunset';
    if (timeOfDay === 'sunset') return 'night';
    return 'day';
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-10 flex flex-col justify-between p-4">
      {/* Top-Center Post-Roll Action & Outcome Message */}
      {rollMessage && (
        <div className="pointer-events-none fixed top-4 left-1/2 -translate-x-1/2 z-20 w-[min(460px,90vw)] rounded-xl bg-stone-950/95 border border-amber-400/70 px-4 py-2.5 shadow-2xl">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0 border border-white/40"
              style={{
                backgroundColor: CAMEL_PALETTES[rollMessage.playerColor].primary,
              }}
            />
            <span className="font-display font-bold text-sm text-white">
              {rollMessage.playerName}
            </span>
            <span className="text-xs font-semibold text-amber-300">
              · {rollMessage.headline}
            </span>
          </div>
          <p className="text-xs text-stone-200 mt-0.5">{rollMessage.detail}</p>
        </div>
      )}

      {/* Top Row: Left Minimal Header & Right Standings */}
      <div className="flex items-start justify-between gap-4">
        {/* Top-Left Title & Race Info */}
        <div className="pointer-events-auto rounded-xl bg-stone-950/90 border border-stone-800 px-4 py-3 shadow-lg max-w-md">
          <div className="flex items-center justify-between gap-4">
            <h1 className="font-display font-bold text-base text-white whitespace-nowrap">
              Camel Dash: Desert Derby
            </h1>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowRules(true)}
                className="text-xs font-medium text-amber-300 hover:text-amber-200 flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Rules</span>
              </button>
              <button
                type="button"
                onClick={onReturnToLobby}
                className="text-xs font-medium text-stone-400 hover:text-white flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Lobby</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-stone-300 mt-1 tabular-nums">
            <span>
              Race {state.currentRace}/{state.totalRaces}
            </span>
            <span aria-hidden="true">·</span>
            <span>Round {state.round}</span>
            <span aria-hidden="true">·</span>
            <span>{state.trackLength} Tiles</span>
          </div>

          {state.logs[0] && (
            <p className="text-xs text-amber-200/90 mt-1.5 truncate max-w-sm">
              {state.logs[0].text}
            </p>
          )}
        </div>

        {/* Top-Right Compact Standings */}
        <div className="pointer-events-auto rounded-xl bg-stone-950/90 border border-stone-800 px-3.5 py-2.5 shadow-lg min-w-[230px] max-w-xs hidden sm:block">
          <div className="flex items-center justify-between text-xs font-semibold text-stone-400 mb-1.5">
            <span>Race Order</span>
            {state.format === 'championship' && <span>Cup Pts</span>}
          </div>
          <div className="flex flex-col gap-1">
            {standings.map((p, idx) => {
              const pal = CAMEL_PALETTES[p.color];
              const isTurn = currentPlayer?.id === p.id;
              const stackCount = state.players.filter(
                (other) =>
                  other.position > 0 &&
                  other.position === p.position &&
                  other.finishedRank === null
              ).length;
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between gap-2 px-2 py-1 rounded-lg text-xs ${
                    isTurn ? 'bg-amber-500/20 text-white' : 'text-stone-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-mono text-stone-400 w-3 tabular-nums">
                      {idx + 1}
                    </span>
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: pal.primary }}
                    />
                    <span className="truncate font-medium">{p.name}</span>
                    {p.hasShield && (
                      <Shield className="w-3 h-3 text-sky-400 shrink-0" />
                    )}
                    {stackCount > 1 && p.stackOrder > 0 && (
                      <span className="text-[11px] text-amber-300 shrink-0">
                        ↑{p.stackOrder + 1}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 font-mono tabular-nums shrink-0">
                    <span className="text-stone-400">
                      {p.finishedRank
                        ? `#${p.finishedRank}`
                        : `${p.position}/${state.trackLength}`}
                    </span>
                    {state.format === 'championship' && (
                      <span className="text-amber-300 w-6 text-right">
                        {p.points}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Sand Trap Placement Helper Banner */}
      {state.phase === 'sand_trap_target' && (
        <div className="pointer-events-auto self-center rounded-xl bg-stone-950/95 border border-amber-400 px-5 py-3 shadow-xl flex items-center gap-4">
          <span className="text-sm font-medium text-amber-200">
            Click any 3D board tile (1–{state.trackLength - 1}) to bury your Sand Trap!
          </span>
          <button
            type="button"
            onClick={onCancelTargetMode}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-stone-800 hover:bg-stone-700 text-white cursor-pointer"
          >
            Cancel
          </button>
        </div>
      )}

      {/* Center Modals for Tactical Decisions, Obstacles, Events, Race Finish */}
      {state.phase === 'pass_choice' && state.pendingPass && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-950 border border-amber-400/50 p-6 shadow-2xl text-stone-100">
            <h2 className="font-display text-xl font-bold text-white">
              Pass Player Perk!
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              You landed on an occupied space (Tile {state.pendingPass.normalDest}). Choose your tactical move:
            </p>
            <div className="grid grid-cols-1 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => onResolvePassChoice('vault')}
                className="p-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-sm text-left cursor-pointer transition-colors"
              >
                End In Front (Tile {state.pendingPass.vaultDest}) — Leap ahead of rival!
              </button>
              <button
                type="button"
                onClick={() => onResolvePassChoice('stack')}
                className="p-3.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-stone-100 font-semibold text-sm text-left cursor-pointer transition-colors"
              >
                Stack On Top (Tile {state.pendingPass.normalDest}) — Hitch a ride!
              </button>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'kick_choice' && state.pendingKick && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-950 border border-red-400/50 p-6 shadow-2xl text-stone-100">
            <h2 className="font-display text-xl font-bold text-white">
              Kick Adjacent Camel!
            </h2>
            <p className="text-sm text-stone-300 mt-1.5">
              Choose an adjacent camel and decide whether to push them back 3 spaces or stun them for 1 turn.
            </p>

            <div className="flex flex-col gap-2 mt-4">
              {state.pendingKick.adjacentTargetIds.map((tid) => {
                const target = state.players.find((p) => p.id === tid);
                if (!target) return null;
                const pal = CAMEL_PALETTES[target.color];
                const chosen =
                  (kickTargetId ?? state.pendingKick!.adjacentTargetIds[0]) ===
                  tid;
                return (
                  <button
                    key={tid}
                    type="button"
                    onClick={() => setKickTargetId(tid)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-sm cursor-pointer ${
                      chosen
                        ? 'bg-red-500/20 border-red-400 text-white'
                        : 'bg-stone-900 border-stone-800 text-stone-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <span className="font-semibold">{target.name}</span>
                    </div>
                    <span className="font-mono text-xs text-stone-400">
                      Tile {target.position} {target.hasShield ? '· Shielded' : ''}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mt-5">
              <button
                type="button"
                onClick={() => {
                  const tid =
                    kickTargetId ?? state.pendingKick!.adjacentTargetIds[0];
                  setKickTargetId(null);
                  onResolveKick(tid, 'push');
                }}
                className="py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm cursor-pointer"
              >
                Push Back 3
              </button>
              <button
                type="button"
                onClick={() => {
                  const tid =
                    kickTargetId ?? state.pendingKick!.adjacentTargetIds[0];
                  setKickTargetId(null);
                  onResolveKick(tid, 'stun');
                }}
                className="py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-semibold text-sm cursor-pointer"
              >
                Stun 1 Turn
              </button>
            </div>
          </div>
        </div>
      )}

      {state.phase === 'blockade_target' && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-950 border border-amber-400/50 p-6 shadow-2xl text-stone-100">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-white">
                Deploy Blockade
              </h2>
              <button
                type="button"
                onClick={onCancelTargetMode}
                className="text-stone-400 hover:text-white cursor-pointer"
                aria-label="Cancel blockade"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-stone-300 mt-1.5">
              Select a rival camel — they cannot move for 2 turns!
            </p>
            <div className="flex flex-col gap-2 mt-4">
              {state.players
                .filter(
                  (p) => p.id !== currentPlayer?.id && p.finishedRank === null
                )
                .map((rival) => {
                  const pal = CAMEL_PALETTES[rival.color];
                  return (
                    <button
                      key={rival.id}
                      type="button"
                      onClick={() => onSelectBlockadeTarget(rival.id)}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-sm cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className="w-3.5 h-3.5 rounded-full"
                          style={{ backgroundColor: pal.primary }}
                        />
                        <span className="font-semibold text-white">
                          {rival.name}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-stone-400">
                        Tile {rival.position}
                      </span>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {state.phase === 'obstacle_modal' && state.pendingObstacle && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-stone-950 border border-red-400/60 p-6 shadow-2xl text-center text-stone-100">
            <p className="text-xs font-medium text-red-400">
              {state.pendingObstacle.source === 'action_die'
                ? 'Action Die Triggered Obstacle'
                : 'Landed on Obstacle Space'}
            </p>
            <h2 className="font-display text-2xl font-extrabold text-white mt-1">
              Obstacle Die: {state.pendingObstacle.roll}
            </h2>
            <p className="text-base font-semibold text-amber-300 mt-3">
              {state.pendingObstacle.outcome === 'back_2' &&
                'Return 2 spaces back!'}
              {state.pendingObstacle.outcome === 'back_3' &&
                'Return 3 spaces back!'}
              {state.pendingObstacle.outcome === 'lose_turn' &&
                'Stuck in quicksand — Lose next turn!'}
              {state.pendingObstacle.outcome === 'back_start' &&
                'Sandslide! Return all the way to Start!'}
            </p>
            <button
              type="button"
              onClick={onResolveObstacle}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm cursor-pointer"
            >
              Accept Fate
            </button>
          </div>
        </div>
      )}

      {state.phase === 'event_banner' && state.pendingEvent && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-stone-950 border border-amber-400/60 p-6 shadow-2xl text-center text-stone-100">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/20 text-amber-300 mb-3">
              <Wind className="w-6 h-6" />
            </div>
            <p className="text-xs font-medium text-amber-400">
              End of Round {state.pendingEvent.round - 1} · Desert Event Die
            </p>
            <h2 className="font-display text-2xl font-extrabold text-white mt-1">
              {DESERT_EVENTS[state.pendingEvent.event].title}
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              {DESERT_EVENTS[state.pendingEvent.event].desc}
            </p>
            <button
              type="button"
              onClick={onDismissEvent}
              className="mt-5 w-full py-2.5 px-4 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm cursor-pointer"
            >
              Continue to Round {state.round}
            </button>
          </div>
        </div>
      )}

      {(state.phase === 'race_over' || state.phase === 'match_over') && (
        <div className="pointer-events-auto fixed inset-0 z-30 flex items-center justify-center bg-stone-950/75 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-stone-950 border border-amber-400/50 p-6 md:p-7 shadow-2xl text-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-300 shrink-0">
                <Trophy className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs text-amber-400 font-medium">
                  {state.phase === 'match_over'
                    ? 'Final Championship Podium'
                    : `Race ${state.currentRace} of ${state.totalRaces} Complete`}
                </p>
                <h2 className="font-display text-2xl font-extrabold text-white">
                  {state.bannerText}
                </h2>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-2">
              {(state.phase === 'match_over'
                ? getChampionshipStandings(state.players)
                : getStandingsSorted(state.players)
              ).map((p, idx) => {
                const pal = CAMEL_PALETTES[p.color];
                return (
                  <div
                    key={p.id}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl border ${
                      idx === 0
                        ? 'bg-amber-500/15 border-amber-400 text-white'
                        : 'bg-stone-900/90 border-stone-800 text-stone-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-sm w-5 tabular-nums">
                        #{idx + 1}
                      </span>
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <span className="font-semibold text-sm">{p.name}</span>
                    </div>
                    <span className="font-mono text-sm font-bold text-amber-300 tabular-nums">
                      {state.format === 'championship'
                        ? `${p.points} pts`
                        : idx === 0
                        ? 'Winner'
                        : `Tile ${p.position}`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onReturnToLobby}
                className="px-4 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-sm font-medium text-stone-200 cursor-pointer"
              >
                New Setup
              </button>
              {state.phase === 'race_over' ? (
                <button
                  type="button"
                  onClick={onNextRace}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm cursor-pointer"
                >
                  Start Race {state.currentRace + 1}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onReturnToLobby}
                  className="px-5 py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-stone-950 font-bold text-sm cursor-pointer"
                >
                  Play Again
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="pointer-events-auto fixed inset-0 z-40 flex items-center justify-center bg-stone-950/75 p-4">
          <div className="w-full max-w-xl rounded-2xl bg-stone-950 border border-stone-700 p-6 shadow-2xl text-stone-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h2 className="font-display text-xl font-bold text-white">
                Desert Derby Rules
              </h2>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                className="text-stone-400 hover:text-white cursor-pointer"
                aria-label="Close rules"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-xs md:text-sm leading-relaxed mt-4">
              <p>
                <strong className="text-amber-300">Camel Stacking:</strong> Land
                on the exact space of another camel to stack on top! Whenever a
                lower camel moves, all camels riding on top move along with it.
              </p>
              <p>
                <strong className="text-amber-300">Dual Dice:</strong> Roll the
                Movement Die (1–6) and the Action Die (1 Steady · 2 Obstacle · 3
                Power-Up · 4 Pass Player · 5 No Passing · 6 Kick Player).
              </p>
              <p>
                <strong className="text-amber-300">Special Spaces:</strong>{' '}
                Tiles 3, 7, 11… trigger the Obstacle Die. Tiles 4, 8, 12… grant
                a Power-Up token.
              </p>
              <p>
                <strong className="text-amber-300">Passing & Kicking:</strong>{' '}
                Pass Player lets you move through occupied spaces and jump ahead
                of a rival. No Passing forces you to stop behind the first camel
                in your way. Kick Player lets you push an adjacent rival back 3
                spaces or stun them for 1 turn.
              </p>
              <p>
                <strong className="text-amber-300">Desert Events:</strong> After
                every full round, the Event Die rolls Sandstorm (-2 all),
                Tailwind (+1 all), Mirage (ignore next obstacle), or Water Stop
                (all gain Shield).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (Zero Viewport Occlusion) */}
      <div className="flex flex-col items-center w-full">
        <button
          type="button"
          onClick={onToggleDock}
          className="pointer-events-auto mb-1.5 px-3 py-1 rounded-t-lg bg-stone-950/90 border border-b-0 border-stone-800 text-xs font-medium text-stone-300 hover:text-white flex items-center gap-1.5 cursor-pointer"
        >
          {dockHidden ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Show Controls (H)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Hide Controls (H)</span>
            </>
          )}
        </button>

        {!dockHidden && (
          <div className="pointer-events-auto w-full max-w-4xl rounded-2xl bg-stone-950/92 border border-stone-800 px-4 py-3 shadow-2xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3">
              {/* Left: Active Camel Identity & Status */}
              {currentPlayer && (
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 border border-white/40"
                    style={{
                      backgroundColor: CAMEL_PALETTES[currentPlayer.color].primary,
                    }}
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-sm text-white truncate">
                        {currentPlayer.name}
                      </span>
                      <span className="text-xs text-stone-400 whitespace-nowrap">
                        {currentPlayer.isAI ? 'Bot' : 'Local'} · Tile{' '}
                        {currentPlayer.position}/{state.trackLength}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-amber-300 mt-0.5">
                      {currentPlayer.hasShield && <span>Shielded</span>}
                      {currentPlayer.mirageShield && <span>Mirage</span>}
                      {currentPlayer.sprintActive && <span>2x Sprint</span>}
                      {currentPlayer.speedBoostQueued && <span>+4 Boost</span>}
                      {state.extraTurnQueued && <span>Bonus Turn</span>}
                      {!currentPlayer.hasShield &&
                        !currentPlayer.mirageShield &&
                        !currentPlayer.sprintActive &&
                        !currentPlayer.speedBoostQueued && (
                          <span className="text-stone-400">
                            {state.bannerText}
                          </span>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Center: Dice Result Readout + Roll Action */}
              <div className="flex items-center gap-3 shrink-0">
                {state.lastRoll && (
                  <div className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-stone-900 border border-stone-800 text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400">Move</span>
                      <span className="font-mono font-bold text-base text-amber-300 tabular-nums">
                        {state.lastRoll.movementDie}
                      </span>
                    </div>
                    <span className="text-stone-700">|</span>
                    <div className="flex items-center gap-1.5">
                      <span className="text-stone-400">Action</span>
                      <span className="font-semibold text-white whitespace-nowrap">
                        {ACTION_DIE_FACES[state.lastRoll.actionDieNumber]?.label}
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  disabled={!isHumanTurn}
                  onClick={onRollDice}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-display font-bold text-sm bg-amber-400 hover:bg-amber-300 text-stone-950 shadow-md transition-colors cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Dices className="w-4 h-4" />
                  <span>
                    {currentPlayer?.isAI
                      ? 'Bot Thinking…'
                      : state.phase === 'awaiting_roll'
                      ? 'Roll Dice (Space)'
                      : 'Resolving…'}
                  </span>
                </button>
              </div>

              {/* Right: Camera, Day/Night & Sound Controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                <div className="flex items-center bg-stone-900 p-1 rounded-lg border border-stone-800">
                  {(['overview', 'follow', 'leader'] as CameraMode[]).map(
                    (cm) => (
                      <button
                        key={cm}
                        type="button"
                        onClick={() => onChangeCamera(cm)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium capitalize transition-colors cursor-pointer whitespace-nowrap ${
                          cameraMode === cm
                            ? 'bg-stone-700 text-white'
                            : 'text-stone-400 hover:text-stone-200'
                        }`}
                      >
                        {cm}
                      </button>
                    )
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => onChangeTimeOfDay(nextTimeOfDay())}
                  title={`Sky: ${timeOfDay}`}
                  className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-amber-300 cursor-pointer"
                  aria-label="Cycle day and night"
                >
                  {timeOfDay === 'day' && <Sun className="w-4 h-4" />}
                  {timeOfDay === 'sunset' && <Sunset className="w-4 h-4" />}
                  {timeOfDay === 'night' && <Moon className="w-4 h-4" />}
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  className="p-2 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-white cursor-pointer"
                  aria-label={muted ? 'Unmute sound' : 'Mute sound'}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Near Boxes Ahead (+1 to +6 D6 Range) */}
            {currentPlayer && currentPlayer.finishedRank === null && (
              <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                {[1, 2, 3, 4, 5, 6].map((offset) => {
                  const targetIdx = currentPlayer.position + offset;
                  const tile = state.tiles[targetIdx];
                  if (!tile) {
                    return (
                      <div
                        key={offset}
                        className="px-2 py-1.5 rounded-lg bg-stone-900/40 border border-stone-800/50 text-[11px] text-stone-600 flex items-center justify-between"
                      >
                        <span className="font-mono">+{offset}</span>
                        <span>—</span>
                      </div>
                    );
                  }
                  const occupants = state.players.filter(
                    (p) =>
                      p.id !== currentPlayer.id &&
                      p.finishedRank === null &&
                      p.position === tile.index
                  );
                  const isTrap = Boolean(tile.sandTrapOwnerId);
                  let effectText = 'Safe';
                  let toneClass =
                    'bg-stone-900/80 border-stone-800 text-stone-300';
                  if (tile.spaceType === 'finish') {
                    effectText = 'Finish Line';
                    toneClass =
                      'bg-emerald-500/15 border-emerald-500/50 text-emerald-300';
                  } else if (isTrap) {
                    effectText = 'Sand Trap';
                    toneClass =
                      'bg-red-500/20 border-red-500/60 text-red-200';
                  } else if (tile.spaceType === 'obstacle') {
                    effectText =
                      tile.obstacleProp === 'bandit'
                        ? 'Bandit (!)'
                        : 'Blower (!)';
                    toneClass =
                      'bg-red-500/15 border-red-500/45 text-red-300';
                  } else if (tile.spaceType === 'powerup') {
                    effectText = 'Power-Up';
                    toneClass =
                      'bg-teal-500/15 border-teal-500/45 text-teal-300';
                  }

                  return (
                    <div
                      key={offset}
                      className={`px-2 py-1.5 rounded-lg border text-[11px] flex flex-col gap-0.5 ${toneClass}`}
                    >
                      <div className="flex items-center justify-between font-mono tabular-nums">
                        <span className="font-bold">+{offset}</span>
                        <span className="opacity-75">#{tile.index}</span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-medium truncate">
                          {effectText}
                        </span>
                        {occupants.length > 0 && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                CAMEL_PALETTES[occupants[0].color].primary,
                            }}
                            title={`Stack onto ${occupants[0].name}`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Active Player Power-Ups Strip (only when active human player holds tokens) */}
            {currentPlayer && !currentPlayer.isAI && currentPlayer.powerUps.length > 0 && (
              <div className="mt-2.5 pt-2.5 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto">
                <span className="text-xs text-stone-400 flex items-center gap-1 shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-teal-400" />
                  <span>Power-Ups:</span>
                </span>
                {currentPlayer.powerUps.map((pu, idx) => {
                  const meta = POWER_UP_META[pu];
                  return (
                    <button
                      key={`${pu}-${idx}`}
                      type="button"
                      disabled={state.phase !== 'awaiting_roll'}
                      onClick={() => onUsePowerUp(pu)}
                      title={meta.shortDesc}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 border border-stone-700 text-xs font-medium text-white cursor-pointer whitespace-nowrap shrink-0 disabled:opacity-40"
                    >
                      <Zap
                        className="w-3.5 h-3.5"
                        style={{ color: meta.accentColor }}
                      />
                      <span>{meta.name}</span>
                    </button>
                  );
                })}
                <span className="text-[11px] text-stone-500 ml-auto hidden lg:inline whitespace-nowrap">
                  <Eye className="w-3 h-3 inline mr-1" />
                  Drag to orbit · Scroll to zoom
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
