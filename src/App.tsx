import { useCallback, useEffect, useRef, useState } from 'react';
import { GameHUD } from './components/GameHUD';
import { LobbyOverlay } from './components/LobbyOverlay';
import { sound } from './game/audio';
import {
  ACTION_DIE_FACES,
  CAMEL_ORDER,
  DEFAULT_BOT_NAMES,
} from './game/constants';
import {
  applyPostMoveResolution,
  computeMovementPlan,
  createInitialGameState,
  dismissEventAndPrepareTurn,
  executeKick,
  getChampionshipStandings,
  isInFinalSprintZone,
  moveCamelStackTo,
  pickAIPreRollPowerUp,
  resolveObstacleEffect,
  rollD6,
  spendStaminaForPlusOne,
  startNextRaceInChampionship,
  usePowerUpPreRoll,
} from './game/engine';
import {
  CameraMode,
  GameMode,
  GameState,
  MatchFormat,
  PlayerConfig,
  PowerUpType,
  TimeOfDay,
} from './game/types';
import { BoardSceneHandle, mountBoardScene } from './scene/boardScene';

const INITIAL_PLAYER_CONFIGS: PlayerConfig[] = CAMEL_ORDER.map((color, idx) => ({
  id: `camel-${color}`,
  name: idx === 0 ? 'You' : DEFAULT_BOT_NAMES[color],
  color,
  isAI: idx > 0,
  enabled: idx < 4,
}));

export default function App() {
  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const sceneRef = useRef<BoardSceneHandle | null>(null);

  // Lobby Setup State
  const [lobbyMode, setLobbyMode] = useState<GameMode>('standaard');
  const [lobbyFormat, setLobbyFormat] = useState<MatchFormat>('championship');
  const [playerConfigs, setPlayerConfigs] = useState<PlayerConfig[]>(
    INITIAL_PLAYER_CONFIGS
  );

  // Active Match State
  const [gameState, setGameState] = useState<GameState>(() => ({
    ...createInitialGameState('standaard', 'championship', INITIAL_PLAYER_CONFIGS),
    phase: 'lobby',
  }));
  const stateRef = useRef<GameState>(gameState);
  stateRef.current = gameState;

  // Viewport & Controls State
  const [cameraMode, setCameraMode] = useState<CameraMode>('overview');
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('day');
  const [manualTimeLock, setManualTimeLock] = useState(false);
  const [muted, setMuted] = useState(false);
  const [dockHidden, setDockHidden] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [rollMessage, setRollMessage] = useState<{
    id: number;
    playerName: string;
    playerColor: GameState['players'][0]['color'];
    headline: string;
    detail: string;
  } | null>(null);
  const rollMsgTimerRef = useRef<number | null>(null);
  const rollNonceRef = useRef<number>(1);

  const showRollMessage = useCallback(
    (
      playerName: string,
      playerColor: GameState['players'][0]['color'],
      headline: string,
      detail: string,
      durationMs = 4600
    ) => {
      if (rollMsgTimerRef.current !== null) {
        window.clearTimeout(rollMsgTimerRef.current);
      }
      setRollMessage({
        id: Date.now(),
        playerName,
        playerColor,
        headline,
        detail,
      });
      rollMsgTimerRef.current = window.setTimeout(() => {
        setRollMessage(null);
      }, durationMs);
    },
    []
  );

  const timersRef = useRef<number[]>([]);
  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const scheduleTimer = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    timersRef.current.push(id);
    return id;
  }, []);

  // Mount Three.js WebGL Scene ONCE
  useEffect(() => {
    const el = canvasMountRef.current;
    if (!el) return;

    const handle = mountBoardScene(el, {
      onTileClick: (tileIdx) => {
        const cur = stateRef.current;
        if (cur.phase !== 'sand_wall_target') return;
        const active = cur.players[cur.currentPlayerIndex];
        if (!active) return;
        sound.playPowerUp();
        const next = usePowerUpPreRoll(
          cur,
          active.id,
          'sand_wall',
          undefined,
          tileIdx
        );
        setGameState(next);
        handle.setTileSelectionMode(false);
        handle.syncSandTraps(next.tiles);
      },
      onContextLost: () => setContextLost(true),
      onContextRestored: () => setContextLost(false),
    });

    sceneRef.current = handle;
    handle.syncBoard(stateRef.current.tiles);
    handle.syncPlayers(stateRef.current.players, null);

    return () => {
      clearAllTimers();
      handle.dispose();
      sceneRef.current = null;
    };
  }, [clearAllTimers]);

  // Keep 3D Camels & Hazards synced whenever gameState updates
  useEffect(() => {
    const handle = sceneRef.current;
    if (!handle) return;
    const activeId =
      gameState.phase === 'lobby'
        ? null
        : gameState.players[gameState.currentPlayerIndex]?.id ?? null;
    handle.syncPlayers(gameState.players, activeId);
    handle.syncSandTraps(gameState.tiles);
    handle.setTileSelectionMode(gameState.phase === 'sand_wall_target');
  }, [gameState]);

  // Day/Sunset/Night automatic progression per round (unless user manually chose a time)
  useEffect(() => {
    if (manualTimeLock || gameState.phase === 'lobby') return;
    const cycle: TimeOfDay[] = ['day', 'sunset', 'night'];
    const nextTod = cycle[(gameState.round - 1) % cycle.length];
    setTimeOfDay(nextTod);
    sceneRef.current?.setTimeOfDay(nextTod);
  }, [gameState.round, gameState.phase, manualTimeLock]);

  // Trigger sandstorm burst visual, event sound, or 3D Winner Celebration + Confetti
  useEffect(() => {
    if (
      gameState.phase === 'event_banner' &&
      gameState.pendingEvent?.event === 'sandstorm'
    ) {
      sceneRef.current?.triggerSandstormVisual();
      sound.playObstacle();
    } else if (
      gameState.phase === 'event_banner' &&
      gameState.pendingEvent
    ) {
      sound.playPowerUp();
    } else if (
      gameState.phase === 'race_over' ||
      gameState.phase === 'match_over'
    ) {
      sound.playFanfare();
      const winnerId =
        gameState.phase === 'match_over'
          ? getChampionshipStandings(gameState.players)[0]?.id ??
            gameState.raceFinishOrder[0]
          : gameState.raceFinishOrder[0];
      sceneRef.current?.setVictoryCelebration(winnerId ?? null);
    } else {
      sceneRef.current?.setVictoryCelebration(null);
    }
  }, [
    gameState.phase,
    gameState.pendingEvent,
    gameState.players,
    gameState.raceFinishOrder,
  ]);

  // Slow, readable hop-by-hop movement runner after dice are confirmed
  const commitRollMovement = useCallback(
    (rolledState: GameState) => {
      const mover = rolledState.players[rolledState.currentPlayerIndex];
      const lastRoll = rolledState.lastRoll;
      if (!mover || !lastRoll) return;

      const actionMeta = ACTION_DIE_FACES[lastRoll.actionDieNumber];
      const actionFace = lastRoll.actionDie;
      const rollHeadline = `Rolled ${lastRoll.movementDie}${
        lastRoll.sprintUsed ? ' ×2' : ''
      }${lastRoll.speedBoostUsed ? ` +${isInFinalSprintZone(mover.position, rolledState.trackLength) ? 6 : 4}` : ''}${
        lastRoll.staminaBoostUsed ? ' +1' : ''
      } (${lastRoll.totalSteps} steps) · ${actionMeta.label}`;

      // Consume queued pre-roll boosts upon committing movement
      const preparedPlayers = rolledState.players.map((p) =>
        p.id === mover.id
          ? {
              ...p,
              sprintActive: false,
              speedBoostQueued: false,
              staminaMoveBoostQueued: false,
            }
          : { ...p }
      );
      const preparedMover = preparedPlayers.find((p) => p.id === mover.id)!;

      const movingState: GameState = {
        ...rolledState,
        players: preparedPlayers,
        phase: 'animating_move',
      };
      setGameState(movingState);

      const plan = computeMovementPlan(
        movingState,
        preparedMover,
        lastRoll.totalSteps,
        actionFace
      );

      const startPos = preparedMover.position;
      const targetStepDest = plan.dest;
      const totalHops = Math.max(0, targetStepDest - startPos);

      const finalizeAtDest = (
        cur: GameState,
        finalDest: number,
        extraLog?: string
      ) => {
        const players = cur.players.map((p) => ({ ...p }));
        const raceFinishOrder = [...cur.raceFinishOrder];
        const res = moveCamelStackTo(
          players,
          mover.id,
          finalDest,
          cur.trackLength,
          raceFinishOrder
        );

        const logs = [...cur.logs];
        if (extraLog) {
          logs.unshift({
            id: `move-${Date.now()}-${Math.random()}`,
            text: extraLog,
            tone: 'neutral',
          });
        } else if (res.stackedOntoName) {
          sound.playStackLand();
          logs.unshift({
            id: `stack-${Date.now()}-${Math.random()}`,
            text: `${mover.name} stacked onto ${res.stackedOntoName}!`,
            tone: 'good',
          });
        } else {
          logs.unshift({
            id: `hop-${Date.now()}-${Math.random()}`,
            text: `${mover.name} moved to tile ${finalDest} (${actionMeta.label}).`,
            tone: 'neutral',
          });
        }

        const next = applyPostMoveResolution(
          { ...cur, players, raceFinishOrder, logs: logs.slice(0, 30) },
          mover.id,
          actionFace,
          []
        );
        if (next.logs[0]) {
          showRollMessage(
            mover.name,
            mover.color,
            rollHeadline,
            next.logs[0].text
          );
        }
        setGameState(next);
      };

      const runHop = (hopIdx: number, cur: GameState) => {
        if (hopIdx > totalHops) {
          if (plan.canOfferPassChoice) {
            if (!mover.isAI) {
              setGameState({
                ...cur,
                phase: 'pass_choice',
                pendingPass: {
                  playerId: mover.id,
                  currentPos: startPos,
                  normalDest: plan.dest,
                  vaultDest: plan.vaultDest,
                  passedNames: plan.passedNames,
                },
                bannerText: `Pass Player! Vault to tile ${plan.vaultDest} or Stack?`,
              });
              return;
            } else {
              finalizeAtDest(
                cur,
                plan.vaultDest,
                `${mover.name} used Pass Player to leap ahead to tile ${plan.vaultDest}!`
              );
              return;
            }
          }

          if (plan.stoppedBehindName) {
            finalizeAtDest(
              cur,
              plan.dest,
              `No Passing! ${mover.name} had to stop behind ${plan.stoppedBehindName} at tile ${plan.dest}.`
            );
            return;
          }

          const existingMover = cur.players.find((p) => p.id === mover.id)!;
          const stackedBelow = cur.players.find(
            (p) =>
              p.id !== mover.id &&
              p.position === existingMover.position &&
              p.position > 0 &&
              p.stackOrder < existingMover.stackOrder
          );
          const logs = [...cur.logs];
          if (stackedBelow && totalHops > 0) {
            sound.playStackLand();
            logs.unshift({
              id: `stk-${Date.now()}-${Math.random()}`,
              text: `${mover.name} landed on ${stackedBelow.name}'s back!`,
              tone: 'good',
            });
          } else {
            logs.unshift({
              id: `mv-${Date.now()}-${Math.random()}`,
              text: `${mover.name} moved to tile ${existingMover.position} (${actionMeta.label}).`,
              tone: 'neutral',
            });
          }

          const next = applyPostMoveResolution(
            { ...cur, logs: logs.slice(0, 30) },
            mover.id,
            actionFace,
            []
          );
          if (next.logs[0]) {
            showRollMessage(
              mover.name,
              mover.color,
              rollHeadline,
              next.logs[0].text
            );
          }
          setGameState(next);
          return;
        }

        const nextPlayers = cur.players.map((p) => ({ ...p }));
        const nextFinish = [...cur.raceFinishOrder];
        moveCamelStackTo(
          nextPlayers,
          mover.id,
          startPos + hopIdx,
          cur.trackLength,
          nextFinish
        );
        sound.playHop(hopIdx);
        const hoppedState: GameState = {
          ...cur,
          players: nextPlayers,
          raceFinishOrder: nextFinish,
        };
        setGameState(hoppedState);

        // Slower, clearly readable camel step cadence (420ms per hop)
        scheduleTimer(() => runHop(hopIdx + 1, hoppedState), 420);
      };

      if (totalHops === 0) {
        scheduleTimer(() => {
          finalizeAtDest(
            movingState,
            startPos,
            plan.stoppedBehindName
              ? `No Passing! ${mover.name} remained stuck behind ${plan.stoppedBehindName}.`
              : undefined
          );
        }, 420);
      } else {
        scheduleTimer(() => runHop(1, movingState), 340);
      }
    },
    [scheduleTimer, showRollMessage]
  );

  // Roll dice and immediately move after brief dice-tumble beat (no reroll pause)
  const rollDiceForActive = useCallback(
    (startingState: GameState) => {
      const mover = startingState.players[startingState.currentPlayerIndex];
      if (!mover) return;

      sound.playDiceRoll();

      setCameraMode('follow');
      sceneRef.current?.setCameraMode('follow');

      const movementDie = rollD6();
      const actionDieNumber = rollD6();
      const actionMeta = ACTION_DIE_FACES[actionDieNumber];
      const actionFace = actionMeta.face;

      const sprintUsed = mover.sprintActive;
      const speedBoostUsed = mover.speedBoostQueued;
      const staminaBoostUsed = mover.staminaMoveBoostQueued;
      const speedBonus = isInFinalSprintZone(
        mover.position,
        startingState.trackLength
      )
        ? 6
        : 4;
      const totalSteps =
        movementDie * (sprintUsed ? 2 : 1) +
        (speedBoostUsed ? speedBonus : 0) +
        (staminaBoostUsed ? 1 : 0);

      const rollNonce = ++rollNonceRef.current;

      const rollHeadline = `Rolled ${movementDie}${
        sprintUsed ? ' ×2' : ''
      }${speedBoostUsed ? ` +${speedBonus}` : ''}${
        staminaBoostUsed ? ' +1' : ''
      } (${totalSteps} steps) · ${actionMeta.label}`;
      showRollMessage(mover.name, mover.color, rollHeadline, actionMeta.desc);

      const rolledState: GameState = {
        ...startingState,
        phase: 'animating_move',
        lastRoll: {
          movementDie,
          actionDie: actionFace,
          actionDieNumber,
          totalSteps,
          sprintUsed,
          speedBoostUsed,
          staminaBoostUsed,
          rollNonce,
        },
        bannerText: `${mover.name} rolled ${totalSteps} · ${actionMeta.label}`,
      };
      setGameState(rolledState);

      scheduleTimer(() => {
        commitRollMovement(rolledState);
      }, 480);
    },
    [commitRollMovement, scheduleTimer, showRollMessage]
  );

  const rollDiceRef = useRef(rollDiceForActive);
  rollDiceRef.current = rollDiceForActive;

  // Keyboard shortcuts: 'H' for Hide/Show Controls, 'Space' to Roll Dice for active human player
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === 'h' || e.key === 'H') {
        setDockHidden((prev) => !prev);
        return;
      }
      if (e.code === 'Space' || e.key === ' ') {
        const cur = stateRef.current;
        const active = cur.players[cur.currentPlayerIndex];
        if (!active || active.isAI) return;
        if (cur.phase === 'awaiting_roll') {
          e.preventDefault();
          rollDiceRef.current(cur);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Automatic AI Turn Pacing
  useEffect(() => {
    const cur = stateRef.current;
    if (cur.phase === 'awaiting_roll') {
      const active = cur.players[cur.currentPlayerIndex];
      if (active && active.isAI) {
        const t = window.setTimeout(() => {
          const latest = stateRef.current;
          if (latest.phase !== 'awaiting_roll') return;
          const aiNow = latest.players[latest.currentPlayerIndex];
          if (!aiNow || !aiNow.isAI) return;
          const afterPowerUps = pickAIPreRollPowerUp(latest, aiNow);
          setGameState(afterPowerUps);
          scheduleTimer(() => rollDiceForActive(afterPowerUps), 380);
        }, 700);
        return () => window.clearTimeout(t);
      }
    } else if (cur.phase === 'event_banner') {
      const hasHuman = cur.players.some((p) => !p.isAI);
      if (!hasHuman) {
        const t = window.setTimeout(() => {
          setGameState((prev) => dismissEventAndPrepareTurn(prev));
        }, 1600);
        return () => window.clearTimeout(t);
      }
    }
  }, [gameState.phase, gameState.currentPlayerIndex, rollDiceForActive, scheduleTimer]);

  // Handlers
  const handleStartDerby = () => {
    clearAllTimers();
    const fresh = createInitialGameState(lobbyMode, lobbyFormat, playerConfigs);
    setGameState(fresh);
    setManualTimeLock(false);
    setTimeOfDay('day');
    sceneRef.current?.setVictoryCelebration(null);
    sceneRef.current?.setTimeOfDay('day');
    sceneRef.current?.syncBoard(fresh.tiles);
    sceneRef.current?.syncPlayers(fresh.players, fresh.players[0]?.id ?? null);
    sceneRef.current?.setCameraMode('overview');
    setCameraMode('overview');
  };

  const handleReturnToLobby = () => {
    clearAllTimers();
    const preview = createInitialGameState(lobbyMode, lobbyFormat, playerConfigs);
    preview.phase = 'lobby';
    setGameState(preview);
    sceneRef.current?.setVictoryCelebration(null);
    sceneRef.current?.syncBoard(preview.tiles);
    sceneRef.current?.syncPlayers(preview.players, null);
    sceneRef.current?.setCameraMode('overview');
  };

  const handleUsePowerUp = (pu: PowerUpType) => {
    const cur = stateRef.current;
    const active = cur.players[cur.currentPlayerIndex];
    if (!active || cur.phase !== 'awaiting_roll') return;

    if (pu === 'sand_wall') {
      setGameState({
        ...cur,
        phase: 'sand_wall_target',
        bannerText: 'Click any board tile to place your Sand Wall!',
      });
      return;
    }
    if (pu === 'block') {
      setGameState({
        ...cur,
        phase: 'block_target',
        bannerText: 'Choose a rival camel to Block for 2 turns.',
      });
      return;
    }
    if (pu === 'swap') {
      const ahead = cur.players.some(
        (p) =>
          p.id !== active.id &&
          p.finishedRank === null &&
          p.position > active.position
      );
      if (!ahead) {
        showRollMessage(
          active.name,
          active.color,
          'Swap Unavailable',
          'You are already ahead — no rival in front to swap with!'
        );
        return;
      }
    }
    sound.playPowerUp();
    setGameState(usePowerUpPreRoll(cur, active.id, pu));
  };

  const handleResolvePassChoice = (choice: 'vault' | 'stack') => {
    const cur = stateRef.current;
    if (!cur.pendingPass) return;
    const { playerId, normalDest, vaultDest } = cur.pendingPass;
    const players = cur.players.map((p) => ({ ...p }));
    const raceFinishOrder = [...cur.raceFinishOrder];
    const logs = [...cur.logs];

    if (choice === 'vault') {
      sound.playHop(1);
      moveCamelStackTo(
        players,
        playerId,
        vaultDest,
        cur.trackLength,
        raceFinishOrder
      );
      logs.unshift({
        id: `vault-${Date.now()}`,
        text: `Pass Player! Vaulted ahead to tile ${vaultDest}!`,
        tone: 'good',
      });
    } else {
      sound.playStackLand();
      logs.unshift({
        id: `stk-${Date.now()}`,
        text: `Chose to stay stacked on tile ${normalDest}!`,
        tone: 'good',
      });
    }

    const actionFace = cur.lastRoll?.actionDie ?? 'pass_player';
    const next = applyPostMoveResolution(
      {
        ...cur,
        players,
        raceFinishOrder,
        pendingPass: null,
        logs: logs.slice(0, 30),
      },
      playerId,
      actionFace,
      []
    );
    setGameState(next);
  };

  const handleResolveKick = (targetId: string, mode: 'push' | 'stun') => {
    const cur = stateRef.current;
    if (!cur.pendingKick) return;
    sound.playKick();
    setGameState(executeKick(cur, cur.pendingKick.playerId, targetId, mode, true));
  };

  const handleNextRace = () => {
    clearAllTimers();
    const next = startNextRaceInChampionship(stateRef.current);
    setGameState(next);
    sceneRef.current?.setVictoryCelebration(null);
    sceneRef.current?.syncBoard(next.tiles);
    sceneRef.current?.syncPlayers(next.players, next.players[0]?.id ?? null);
    sceneRef.current?.setCameraMode('overview');
    setCameraMode('overview');
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-stone-950 select-none">
      {/* Dedicated Isolated WebGL Viewport Container */}
      <div
        ref={canvasMountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="3D Desert Derby Game Board"
      />

      {/* WebGL Context Lost Fallback */}
      {contextLost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/95 text-center p-6">
          <div className="max-w-md rounded-2xl border border-amber-400/40 bg-stone-900 p-6">
            <h2 className="font-display text-xl font-bold text-white">
              3D Graphics Paused
            </h2>
            <p className="text-sm text-stone-300 mt-2">
              The WebGL graphics context was interrupted. Waiting for automatic restoration, or reload the page to resume your race.
            </p>
          </div>
        </div>
      )}

      {/* Lobby or Active Game HUD */}
      {gameState.phase === 'lobby' ? (
        <LobbyOverlay
          mode={lobbyMode}
          format={lobbyFormat}
          players={playerConfigs}
          onChangeMode={(m) => {
            setLobbyMode(m);
            const preview = createInitialGameState(m, lobbyFormat, playerConfigs);
            preview.phase = 'lobby';
            setGameState(preview);
            sceneRef.current?.syncBoard(preview.tiles);
            sceneRef.current?.syncPlayers(preview.players, null);
          }}
          onChangeFormat={setLobbyFormat}
          onChangePlayers={(nextCfg) => {
            setPlayerConfigs(nextCfg);
            const preview = createInitialGameState(lobbyMode, lobbyFormat, nextCfg);
            preview.phase = 'lobby';
            setGameState(preview);
            sceneRef.current?.syncPlayers(preview.players, null);
          }}
          onStart={handleStartDerby}
        />
      ) : (
        <GameHUD
          state={gameState}
          cameraMode={cameraMode}
          timeOfDay={timeOfDay}
          muted={muted}
          dockHidden={dockHidden}
          rollMessage={rollMessage}
          onToggleDock={() => setDockHidden((d) => !d)}
          onChangeCamera={(cm) => {
            setCameraMode(cm);
            sceneRef.current?.setCameraMode(cm);
          }}
          onChangeTimeOfDay={(tod) => {
            setManualTimeLock(true);
            setTimeOfDay(tod);
            sceneRef.current?.setTimeOfDay(tod);
          }}
          onToggleMute={() => {
            sound.muted = !muted;
            setMuted(!muted);
          }}
          onRollDice={() => rollDiceForActive(stateRef.current)}
          onSpendStaminaPlusOne={() => {
            const cur = stateRef.current;
            const active = cur.players[cur.currentPlayerIndex];
            if (!active || cur.phase !== 'awaiting_roll') return;
            sound.playPowerUp();
            setGameState(spendStaminaForPlusOne(cur, active.id));
          }}
          onUsePowerUp={handleUsePowerUp}
          onResolvePassChoice={handleResolvePassChoice}
          onResolveKick={handleResolveKick}
          onSelectBlockTarget={(targetId) => {
            const cur = stateRef.current;
            const active = cur.players[cur.currentPlayerIndex];
            if (!active) return;
            sound.playKick();
            setGameState(
              usePowerUpPreRoll(cur, active.id, 'block', targetId)
            );
          }}
          onCancelTargetMode={() => {
            setGameState((prev) => ({ ...prev, phase: 'awaiting_roll' }));
          }}
          onResolveObstacle={() => {
            sound.playObstacle();
            setGameState((prev) => resolveObstacleEffect(prev, true));
          }}
          onDismissEvent={() => {
            setGameState((prev) => dismissEventAndPrepareTurn(prev));
          }}
          onNextRace={handleNextRace}
          onReturnToLobby={handleReturnToLobby}
        />
      )}
    </main>
  );
}
