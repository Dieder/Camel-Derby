import {
  ACTION_DIE_FACES,
  ALL_POWER_UPS,
  CHAMPIONSHIP_POINTS,
  DESERT_EVENTS,
  MODE_CONFIGS,
  POWER_UP_META,
  generateRandomizedTrack,
} from './constants';
import {
  ActionDieFace,
  BoardTile,
  DesertEventType,
  GameLogEntry,
  GameMode,
  GameState,
  MatchFormat,
  ObstacleOutcome,
  PlayerConfig,
  PlayerState,
  PowerUpType,
} from './types';

let logCounter = 1;
function makeLog(text: string, tone: GameLogEntry['tone'] = 'neutral'): GameLogEntry {
  return { id: `log-${logCounter++}`, text, tone };
}

export function isInFinalSprintZone(position: number, trackLength: number): boolean {
  return position >= Math.max(1, trackLength - 10);
}

export function createInitialGameState(
  mode: GameMode,
  format: MatchFormat,
  configs: PlayerConfig[]
): GameState {
  const trackLength = MODE_CONFIGS[mode].trackLength;
  const activeConfigs = configs.filter((c) => c.enabled);
  const tiles = generateRandomizedTrack(trackLength);

  const players: PlayerState[] = activeConfigs.map((cfg, idx) => ({
    id: cfg.id,
    name: cfg.name.trim() || `Camel ${idx + 1}`,
    color: cfg.color,
    isAI: cfg.isAI,
    position: 0,
    checkpoint: 0,
    stackOrder: idx,
    stamina: 3,
    staminaMoveBoostQueued: false,
    powerUps: [],
    hasShield: false,
    sprintActive: false,
    speedBoostQueued: false,
    stunnedTurns: 0,
    blockadeTurns: 0,
    finishedRank: null,
    points: 0,
  }));

  const totalRaces = format === 'championship' ? 3 : 1;

  return {
    mode,
    format,
    trackLength,
    totalRaces,
    currentRace: 1,
    round: 1,
    tiles,
    players,
    currentPlayerIndex: 0,
    phase: 'awaiting_roll',
    lastRoll: null,
    pendingPass: null,
    pendingKick: null,
    pendingObstacle: null,
    pendingEvent: null,
    raceFinishOrder: [],
    bannerText: `${MODE_CONFIGS[mode].title} · Race 1 of ${totalRaces}`,
    logs: [
      makeLog(
        `Race 1 begins on a ${trackLength}-tile round desert circuit!`,
        'event'
      ),
    ],
  };
}

export function startNextRaceInChampionship(prev: GameState): GameState {
  const nextRace = prev.currentRace + 1;
  const tiles = generateRandomizedTrack(prev.trackLength);
  const players: PlayerState[] = prev.players.map((p, idx) => ({
    ...p,
    position: 0,
    checkpoint: 0,
    stackOrder: idx,
    stamina: 3,
    staminaMoveBoostQueued: false,
    powerUps: [],
    hasShield: false,
    sprintActive: false,
    speedBoostQueued: false,
    stunnedTurns: 0,
    blockadeTurns: 0,
    finishedRank: null,
  }));

  return {
    ...prev,
    currentRace: nextRace,
    round: 1,
    tiles,
    players,
    currentPlayerIndex: 0,
    phase: 'awaiting_roll',
    lastRoll: null,
    pendingPass: null,
    pendingKick: null,
    pendingObstacle: null,
    pendingEvent: null,
    raceFinishOrder: [],
    bannerText: `Race ${nextRace} of ${prev.totalRaces} · New Desert Circuit!`,
    logs: [
      makeLog(`Race ${nextRace} begins! New desert circuit generated.`, 'event'),
      ...prev.logs.slice(0, 24),
    ],
  };
}

export function getStandingsSorted(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (a.finishedRank !== null && b.finishedRank !== null) {
      return a.finishedRank - b.finishedRank;
    }
    if (a.finishedRank !== null) return -1;
    if (b.finishedRank !== null) return 1;
    if (b.position !== a.position) return b.position - a.position;
    return b.stackOrder - a.stackOrder;
  });
}

export function getChampionshipStandings(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.position - a.position;
  });
}

function normalizeSpaceStack(players: PlayerState[], spacePos: number) {
  const onSpace = players
    .filter((p) => p.position === spacePos && p.finishedRank === null)
    .sort((a, b) => a.stackOrder - b.stackOrder);
  onSpace.forEach((p, idx) => {
    p.stackOrder = idx;
  });
}

function updateCheckpointForPlayer(p: PlayerState, trackLength: number) {
  if (p.position >= trackLength) return;
  const reachedCheckpoint = Math.floor(p.position / 10) * 10;
  if (reachedCheckpoint > p.checkpoint && reachedCheckpoint < trackLength) {
    p.checkpoint = reachedCheckpoint;
  }
}

/**
 * Moves a camel AND everyone stacked on top of it to `dest`.
 * Backward movement never drops a camel below its own last checkpoint.
 */
export function moveCamelStackTo(
  players: PlayerState[],
  moverId: string,
  dest: number,
  trackLength: number,
  raceFinishOrder: string[],
  respectCheckpoint = true
): {
  movedIds: string[];
  stackedOntoName: string | null;
  newlyFinishedIds: string[];
} {
  const mover = players.find((p) => p.id === moverId);
  if (!mover) return { movedIds: [], stackedOntoName: null, newlyFinishedIds: [] };

  const oldPos = mover.position;
  const minFloor = respectCheckpoint && dest < oldPos ? mover.checkpoint : 0;
  const clampedDest = Math.max(minFloor, Math.min(trackLength, dest));

  const movingGroup =
    oldPos === 0
      ? [mover]
      : players
          .filter(
            (p) =>
              p.position === oldPos &&
              p.finishedRank === null &&
              p.stackOrder >= mover.stackOrder
          )
          .sort((a, b) => a.stackOrder - b.stackOrder);

  const movedIds = movingGroup.map((p) => p.id);

  if (clampedDest === oldPos) {
    return { movedIds, stackedOntoName: null, newlyFinishedIds: [] };
  }

  const newlyFinishedIds: string[] = [];

  if (clampedDest >= trackLength) {
    for (const p of movingGroup) {
      p.position = trackLength;
      if (!raceFinishOrder.includes(p.id)) {
        raceFinishOrder.push(p.id);
        p.finishedRank = raceFinishOrder.length;
        newlyFinishedIds.push(p.id);
      }
    }
    normalizeSpaceStack(players, oldPos);
    return { movedIds, stackedOntoName: null, newlyFinishedIds };
  }

  const existingOnDest = players
    .filter(
      (p) =>
        p.position === clampedDest &&
        p.finishedRank === null &&
        !movedIds.includes(p.id)
    )
    .sort((a, b) => a.stackOrder - b.stackOrder);

  const stackedOntoName =
    clampedDest > 0 && existingOnDest.length > 0
      ? existingOnDest[existingOnDest.length - 1].name
      : null;

  let baseOrder = existingOnDest.length;
  for (const p of movingGroup) {
    const pMinFloor =
      respectCheckpoint && clampedDest < oldPos ? p.checkpoint : 0;
    p.position = Math.max(pMinFloor, clampedDest);
    updateCheckpointForPlayer(p, trackLength);
    p.stackOrder = baseOrder++;
  }

  normalizeSpaceStack(players, oldPos);

  return { movedIds, stackedOntoName, newlyFinishedIds };
}

export function drawRandomPowerUp(): PowerUpType {
  return ALL_POWER_UPS[Math.floor(Math.random() * ALL_POWER_UPS.length)];
}

export function rollD6(): number {
  return 1 + Math.floor(Math.random() * 6);
}

export function rollObstacleOutcome(): { roll: number; outcome: ObstacleOutcome } {
  const roll = rollD6();
  if (roll === 1) return { roll, outcome: 'back_2' };
  if (roll === 2) return { roll, outcome: 'back_3' };
  if (roll === 3) return { roll, outcome: 'lose_1' };
  if (roll === 4) return { roll, outcome: 'lose_2' };
  if (roll === 5) return { roll, outcome: 'back_checkpoint' };
  return { roll, outcome: 'sandstorm_all' };
}

export function rollDesertEvent(): DesertEventType {
  const events: DesertEventType[] = [
    'sandstorm',
    'tailwind',
    'camel_stampede',
    'oasis_festival',
    'quicksand',
  ];
  return events[Math.floor(Math.random() * events.length)];
}

export function getAdjacentTargets(
  players: PlayerState[],
  moverId: string
): PlayerState[] {
  const mover = players.find((p) => p.id === moverId);
  if (!mover) return [];
  return players.filter(
    (p) =>
      p.id !== moverId &&
      p.finishedRank === null &&
      Math.abs(p.position - mover.position) <= 1
  );
}

export function isRaceComplete(state: GameState): boolean {
  const activeRemaining = state.players.filter((p) => p.finishedRank === null);
  if (state.format === 'single') {
    return state.raceFinishOrder.length >= 1;
  }
  const podiumSize = Math.min(3, state.players.length);
  if (state.players.length === 2) {
    return state.raceFinishOrder.length >= 1;
  }
  return state.raceFinishOrder.length >= podiumSize || activeRemaining.length === 0;
}

export function finalizeRaceScoring(state: GameState): GameState {
  const nextPlayers = state.players.map((p) => ({ ...p }));
  const sortedRemaining = getStandingsSorted(
    nextPlayers.filter((p) => p.finishedRank === null)
  );
  const fullOrder = [
    ...state.raceFinishOrder,
    ...sortedRemaining.map((p) => p.id),
  ];

  fullOrder.forEach((pid, rankIdx) => {
    const p = nextPlayers.find((x) => x.id === pid);
    if (!p) return;
    if (p.finishedRank === null) {
      p.finishedRank = rankIdx + 1;
    }
    if (state.format === 'championship') {
      p.points += CHAMPIONSHIP_POINTS[rankIdx] ?? 0;
    } else if (rankIdx === 0) {
      p.points += 1;
    }
  });

  const winner = nextPlayers.find((p) => p.id === fullOrder[0]);
  const isFinalMatchOver = state.currentRace >= state.totalRaces;

  return {
    ...state,
    players: nextPlayers,
    raceFinishOrder: fullOrder,
    phase: isFinalMatchOver ? 'match_over' : 'race_over',
    bannerText: isFinalMatchOver
      ? `${winner?.name ?? 'Champion'} wins the Desert Derby!`
      : `${winner?.name ?? 'Leader'} wins Race ${state.currentRace}!`,
    logs: [
      makeLog(
        isFinalMatchOver
          ? `Derby complete! ${winner?.name} claims victory!`
          : `Race ${state.currentRace} finished! 1st: ${winner?.name}.`,
        'event'
      ),
      ...state.logs.slice(0, 24),
    ],
  };
}

/**
 * Computes movement destination considering Pass Player, No Passing, and Sand Walls.
 */
export function computeMovementPlan(
  state: GameState,
  mover: PlayerState,
  steps: number,
  actionFace: ActionDieFace
): {
  dest: number;
  stoppedBehindName: string | null;
  stoppedBySandWall: boolean;
  canOfferPassChoice: boolean;
  vaultDest: number;
  passedNames: string[];
} {
  const start = mover.position;
  const rawDest = Math.min(state.trackLength, start + steps);

  // Check if any Sand Wall sits on start+1..rawDest — Sand Wall forces an immediate stop there!
  let effectiveMaxDest = rawDest;
  let stoppedBySandWall = false;
  for (let s = start + 1; s <= rawDest; s++) {
    const tile = state.tiles[s];
    if (
      tile &&
      tile.hazardKind === 'sand_wall' &&
      tile.sandTrapOwnerId !== mover.id
    ) {
      effectiveMaxDest = s;
      stoppedBySandWall = true;
      break;
    }
  }

  if (actionFace === 'no_passing') {
    for (let s = start + 1; s <= effectiveMaxDest; s++) {
      if (s === state.trackLength) break;
      const blocker = state.players.find(
        (p) => p.id !== mover.id && p.finishedRank === null && p.position === s
      );
      if (blocker) {
        return {
          dest: Math.max(start, s - 1),
          stoppedBehindName: blocker.name,
          stoppedBySandWall: false,
          canOfferPassChoice: false,
          vaultDest: s - 1,
          passedNames: [],
        };
      }
    }
    return {
      dest: effectiveMaxDest,
      stoppedBehindName: null,
      stoppedBySandWall,
      canOfferPassChoice: false,
      vaultDest: effectiveMaxDest,
      passedNames: [],
    };
  }

  const passedNames: string[] = [];
  for (let s = start + 1; s <= effectiveMaxDest; s++) {
    const onTile = state.players.filter(
      (p) => p.id !== mover.id && p.finishedRank === null && p.position === s
    );
    for (const opp of onTile) {
      if (!passedNames.includes(opp.name)) passedNames.push(opp.name);
    }
  }

  if (
    actionFace === 'pass_player' &&
    !stoppedBySandWall &&
    effectiveMaxDest < state.trackLength
  ) {
    const occupiedAtRaw = state.players.some(
      (p) =>
        p.id !== mover.id &&
        p.finishedRank === null &&
        p.position === effectiveMaxDest
    );
    if (occupiedAtRaw) {
      let vault = Math.min(state.trackLength, effectiveMaxDest + 1);
      while (
        vault < state.trackLength &&
        state.players.some(
          (p) => p.id !== mover.id && p.finishedRank === null && p.position === vault
        )
      ) {
        vault++;
      }
      return {
        dest: effectiveMaxDest,
        stoppedBehindName: null,
        stoppedBySandWall: false,
        canOfferPassChoice: true,
        vaultDest: vault,
        passedNames,
      };
    }
  }

  return {
    dest: effectiveMaxDest,
    stoppedBehindName: null,
    stoppedBySandWall,
    canOfferPassChoice: false,
    vaultDest: effectiveMaxDest,
    passedNames,
  };
}

export function applyPostMoveResolution(
  state: GameState,
  moverId: string,
  actionFace: ActionDieFace,
  logsToAdd: GameLogEntry[]
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const tiles = state.tiles.map((t) => ({ ...t }));
  const raceFinishOrder = [...state.raceFinishOrder];
  const mover = players.find((p) => p.id === moverId)!;

  if (isRaceComplete({ ...state, players, raceFinishOrder })) {
    return finalizeRaceScoring({
      ...state,
      players,
      tiles,
      raceFinishOrder,
      logs: [...logsToAdd, ...state.logs].slice(0, 30),
    });
  }

  // 1. Check Sand Wall or Quicksand hazard on landing tile
  const landedTile = tiles[mover.position];
  if (landedTile && landedTile.hazardKind === 'sand_wall') {
    landedTile.sandTrapOwnerId = null;
    landedTile.hazardKind = null;
    logsToAdd.unshift(
      makeLog(`${mover.name} hit a Sand Wall and had to stop!`, 'bad')
    );
  } else if (landedTile && landedTile.hazardKind === 'quicksand') {
    landedTile.sandTrapOwnerId = null;
    landedTile.hazardKind = null;
    if (mover.hasShield) {
      mover.hasShield = false;
      logsToAdd.unshift(
        makeLog(`${mover.name}'s Shield rescued them from Quicksand!`, 'good')
      );
    } else {
      mover.stunnedTurns += 1;
      logsToAdd.unshift(
        makeLog(`${mover.name} sank into Quicksand and loses 1 turn!`, 'bad')
      );
    }
  }

  // 2. Checkpoint announcement
  if (landedTile && landedTile.spaceType === 'checkpoint') {
    logsToAdd.unshift(
      makeLog(
        `${mover.name} reached Checkpoint ${landedTile.index}! Safe from falling behind it.`,
        'good'
      )
    );
  }

  // 3. Check Power-Up Space (4, 8, 12, ...)
  if (landedTile && landedTile.spaceType === 'powerup') {
    const drawn = drawRandomPowerUp();
    if (drawn === 'shield' && !mover.hasShield) {
      mover.hasShield = true;
      logsToAdd.unshift(
        makeLog(`${mover.name} landed on Power-Up and activated a Shield!`, 'good')
      );
    } else {
      mover.powerUps.push(drawn);
      logsToAdd.unshift(
        makeLog(
          `${mover.name} drew ${POWER_UP_META[drawn].name} from a Power-Up tile!`,
          'good'
        )
      );
    }
  }

  // 4. Action Die: Power-Up (3)
  if (actionFace === 'powerup') {
    const drawn = drawRandomPowerUp();
    if (drawn === 'shield' && !mover.hasShield) {
      mover.hasShield = true;
      logsToAdd.unshift(
        makeLog(`Action Die granted ${mover.name} an active Shield!`, 'good')
      );
    } else {
      mover.powerUps.push(drawn);
      logsToAdd.unshift(
        makeLog(`Action Die granted ${mover.name} a ${POWER_UP_META[drawn].name}!`, 'good')
      );
    }
  }

  // 5. Action Die: Kick Player (6)
  if (actionFace === 'kick_player') {
    const adjacent = getAdjacentTargets(players, mover.id);
    if (adjacent.length > 0) {
      if (!mover.isAI) {
        return {
          ...state,
          players,
          tiles,
          raceFinishOrder,
          phase: 'kick_choice',
          pendingKick: {
            playerId: mover.id,
            adjacentTargetIds: adjacent.map((a) => a.id),
          },
          bannerText: `${mover.name} rolled Kick Player! Choose a target.`,
          logs: [...logsToAdd, ...state.logs].slice(0, 30),
        };
      } else {
        const target = [...adjacent].sort((a, b) => b.position - a.position)[0];
        const kickMode: 'push' | 'stun' =
          target.position > target.checkpoint + 2 ? 'push' : 'stun';
        const kickedState = executeKick(
          {
            ...state,
            players,
            tiles,
            raceFinishOrder,
            logs: [...logsToAdd, ...state.logs].slice(0, 30),
          },
          mover.id,
          target.id,
          kickMode,
          false
        );
        return checkObstacleAfterAction(kickedState, mover.id, actionFace);
      }
    } else {
      logsToAdd.unshift(
        makeLog(`${mover.name} rolled Kick Player, but no camel was adjacent.`, 'neutral')
      );
    }
  }

  return checkObstacleAfterAction(
    {
      ...state,
      players,
      tiles,
      raceFinishOrder,
      logs: [...logsToAdd, ...state.logs].slice(0, 30),
    },
    mover.id,
    actionFace
  );
}

export function checkObstacleAfterAction(
  state: GameState,
  moverId: string,
  actionFace: ActionDieFace
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const mover = players.find((p) => p.id === moverId)!;
  const landedTile = state.tiles[mover.position];

  const triggeredByAction = actionFace === 'obstacle';
  const triggeredByTile = landedTile && landedTile.spaceType === 'obstacle';

  if (
    (triggeredByAction || triggeredByTile) &&
    mover.finishedRank === null &&
    mover.position < state.trackLength
  ) {
    const source = triggeredByAction ? 'action_die' : 'obstacle_tile';
    if (mover.hasShield) {
      mover.hasShield = false;
      return advanceTurnOrRound({
        ...state,
        players,
        logs: [
          makeLog(
            `${mover.name}'s Shield blocked the hidden Obstacle Card!`,
            'good'
          ),
          ...state.logs,
        ].slice(0, 30),
      });
    }

    const { roll, outcome } = rollObstacleOutcome();
    const inFinalSprint = isInFinalSprintZone(mover.position, state.trackLength);

    if (!mover.isAI) {
      return {
        ...state,
        players,
        phase: 'obstacle_modal',
        pendingObstacle: {
          playerId: mover.id,
          roll,
          outcome,
          inFinalSprint,
          source,
        },
        bannerText: `${mover.name} drew a Hidden Obstacle Card!`,
      };
    } else {
      return resolveObstacleEffect(
        {
          ...state,
          players,
          pendingObstacle: {
            playerId: mover.id,
            roll,
            outcome,
            inFinalSprint,
            source,
          },
        },
        true
      );
    }
  }

  return advanceTurnOrRound({ ...state, players });
}

export function resolveObstacleEffect(
  state: GameState,
  autoAdvance = true
): GameState {
  const obs = state.pendingObstacle;
  if (!obs) return state;

  const players = state.players.map((p) => ({ ...p }));
  const raceFinishOrder = [...state.raceFinishOrder];
  const mover = players.find((p) => p.id === obs.playerId)!;
  const logs = [...state.logs];

  if (obs.outcome === 'back_2') {
    const penalty = obs.inFinalSprint ? 4 : 2;
    const dest = Math.max(mover.checkpoint, mover.position - penalty);
    moveCamelStackTo(players, mover.id, dest, state.trackLength, raceFinishOrder, true);
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} pushed back ${penalty} spaces to tile ${mover.position}!`,
        'bad'
      )
    );
  } else if (obs.outcome === 'back_3') {
    const dest = Math.max(mover.checkpoint, mover.position - 3);
    moveCamelStackTo(players, mover.id, dest, state.trackLength, raceFinishOrder, true);
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} stumbled back 3 spaces to tile ${mover.position}!`,
        'bad'
      )
    );
  } else if (obs.outcome === 'lose_1') {
    mover.stunnedTurns += 1;
    logs.unshift(
      makeLog(`Obstacle (${obs.roll}): ${mover.name} loses 1 turn!`, 'bad')
    );
  } else if (obs.outcome === 'lose_2') {
    mover.stunnedTurns += 2;
    logs.unshift(
      makeLog(`Obstacle (${obs.roll}): ${mover.name} loses 2 turns!`, 'bad')
    );
  } else if (obs.outcome === 'back_checkpoint') {
    moveCamelStackTo(
      players,
      mover.id,
      mover.checkpoint,
      state.trackLength,
      raceFinishOrder,
      true
    );
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} sent back to Checkpoint ${mover.checkpoint}!`,
        'bad'
      )
    );
  } else {
    // Zandstorm (-1 for everyone, clamped at checkpoint)
    for (const p of players) {
      if (p.finishedRank === null && p.position > p.checkpoint) {
        p.position = Math.max(p.checkpoint, p.position - 1);
      }
    }
    for (let s = 0; s < state.trackLength; s++) {
      normalizeSpaceStack(players, s);
    }
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}) — Sandstorm! Every camel drops 1 space (safe at checkpoints).`,
        'event'
      )
    );
  }

  const updated: GameState = {
    ...state,
    players,
    raceFinishOrder,
    pendingObstacle: null,
    logs: logs.slice(0, 30),
  };

  return autoAdvance ? advanceTurnOrRound(updated) : updated;
}

export function executeKick(
  state: GameState,
  kickerId: string,
  targetId: string,
  mode: 'push' | 'stun',
  continueToObstacleCheck = true
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const raceFinishOrder = [...state.raceFinishOrder];
  const kicker = players.find((p) => p.id === kickerId)!;
  const target = players.find((p) => p.id === targetId)!;
  const logs = [...state.logs];

  if (target.hasShield) {
    target.hasShield = false;
    logs.unshift(
      makeLog(
        `${kicker.name} tried to kick ${target.name}, but Shield blocked it!`,
        'good'
      )
    );
  } else if (mode === 'push') {
    const dest = Math.max(target.checkpoint, target.position - 3);
    moveCamelStackTo(players, target.id, dest, state.trackLength, raceFinishOrder, true);
    logs.unshift(
      makeLog(
        `${kicker.name} kicked ${target.name} back 3 spaces to tile ${target.position}!`,
        'bad'
      )
    );
  } else {
    target.stunnedTurns += 1;
    logs.unshift(
      makeLog(`${kicker.name} stunned ${target.name} for 1 turn!`, 'bad')
    );
  }

  const next: GameState = {
    ...state,
    players,
    raceFinishOrder,
    pendingKick: null,
    logs: logs.slice(0, 30),
  };

  if (continueToObstacleCheck && state.lastRoll) {
    return checkObstacleAfterAction(next, kickerId, state.lastRoll.actionDie);
  }
  return next;
}

export function advanceTurnOrRound(state: GameState): GameState {
  if (isRaceComplete(state)) {
    return finalizeRaceScoring(state);
  }

  const players = state.players.map((p) => ({ ...p }));
  let nextIdx = state.currentPlayerIndex + 1;
  let wrappedRound = false;

  while (true) {
    if (nextIdx >= players.length) {
      nextIdx = 0;
      wrappedRound = true;
      break;
    }
    if (players[nextIdx].finishedRank === null) {
      break;
    }
    nextIdx++;
  }

  if (wrappedRound) {
    const event = rollDesertEvent();
    return applyDesertEvent(
      {
        ...state,
        players,
        currentPlayerIndex: 0,
      },
      event
    );
  }

  return preparePlayerTurn({
    ...state,
    players,
    currentPlayerIndex: nextIdx,
    phase: 'awaiting_roll',
  });
}

function preparePlayerTurn(state: GameState): GameState {
  let current = state;
  let safety = 0;
  while (safety < current.players.length + 2) {
    safety++;
    const idx = current.currentPlayerIndex;
    const player = current.players[idx];

    if (!player || player.finishedRank !== null) {
      const nextIdx = idx + 1;
      if (nextIdx >= current.players.length) {
        const event = rollDesertEvent();
        return applyDesertEvent({ ...current, currentPlayerIndex: 0 }, event);
      }
      current = { ...current, currentPlayerIndex: nextIdx };
      continue;
    }

    if (player.blockadeTurns > 0) {
      const players = current.players.map((p, i) =>
        i === idx ? { ...p, blockadeTurns: p.blockadeTurns - 1 } : p
      );
      const logs = [
        makeLog(
          `${player.name} is Blocked and skips this turn (${player.blockadeTurns - 1} left).`,
          'bad'
        ),
        ...current.logs,
      ].slice(0, 30);

      const nextIdx = idx + 1;
      if (nextIdx >= players.length) {
        const event = rollDesertEvent();
        return applyDesertEvent(
          { ...current, players, logs, currentPlayerIndex: 0 },
          event
        );
      }
      current = { ...current, players, logs, currentPlayerIndex: nextIdx };
      continue;
    }

    if (player.stunnedTurns > 0) {
      const players = current.players.map((p, i) =>
        i === idx ? { ...p, stunnedTurns: p.stunnedTurns - 1 } : p
      );
      const logs = [
        makeLog(`${player.name} skips this turn (${player.stunnedTurns - 1} left).`, 'bad'),
        ...current.logs,
      ].slice(0, 30);

      const nextIdx = idx + 1;
      if (nextIdx >= players.length) {
        const event = rollDesertEvent();
        return applyDesertEvent(
          { ...current, players, logs, currentPlayerIndex: 0 },
          event
        );
      }
      current = { ...current, players, logs, currentPlayerIndex: nextIdx };
      continue;
    }

    return {
      ...current,
      phase: 'awaiting_roll',
      bannerText: `${player.name}'s Turn · Round ${current.round}`,
    };
  }

  return current;
}

export function applyDesertEvent(
  state: GameState,
  event: DesertEventType
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const tiles = state.tiles.map((t) => ({ ...t }));
  const raceFinishOrder = [...state.raceFinishOrder];
  const logs = [...state.logs];

  if (event === 'sandstorm') {
    for (const p of players) {
      if (p.finishedRank === null && p.position > p.checkpoint) {
        p.position = Math.max(p.checkpoint, p.position - 2);
      }
    }
    for (let s = 0; s < state.trackLength; s++) {
      normalizeSpaceStack(players, s);
    }
    logs.unshift(
      makeLog(`Desert Event — Sandstorm! Everyone blown back 2 spaces (safe at checkpoints).`, 'event')
    );
  } else if (event === 'tailwind') {
    const ordered = getStandingsSorted(players);
    for (const ref of ordered) {
      const p = players.find((x) => x.id === ref.id)!;
      if (p.finishedRank === null) {
        p.position = Math.min(state.trackLength, p.position + 2);
        updateCheckpointForPlayer(p, state.trackLength);
        if (p.position >= state.trackLength) {
          raceFinishOrder.push(p.id);
          p.finishedRank = raceFinishOrder.length;
        }
      }
    }
    logs.unshift(
      makeLog(`Desert Event — Tailwind! Every camel surges forward +2 spaces!`, 'event')
    );
  } else if (event === 'camel_stampede') {
    const ordered = getStandingsSorted(players.filter((p) => p.finishedRank === null));
    const lastPlace = ordered[ordered.length - 1];
    if (lastPlace) {
      const p = players.find((x) => x.id === lastPlace.id)!;
      moveCamelStackTo(
        players,
        p.id,
        p.position + 4,
        state.trackLength,
        raceFinishOrder,
        true
      );
      logs.unshift(
        makeLog(`Desert Event — Camel Stampede! ${p.name} charges +4 spaces!`, 'event')
      );
    }
  } else if (event === 'oasis_festival') {
    for (const p of players) {
      if (p.finishedRank === null) {
        const card = drawRandomPowerUp();
        if (card === 'shield' && !p.hasShield) p.hasShield = true;
        else p.powerUps.push(card);
      }
    }
    logs.unshift(
      makeLog(`Desert Event — Oasis Festival! Every camel receives a Power-Up!`, 'event')
    );
  } else if (event === 'quicksand') {
    const qTileIdx = Math.min(state.trackLength - 2, Math.floor(state.trackLength / 2));
    if (tiles[qTileIdx]) {
      tiles[qTileIdx].sandTrapOwnerId = 'event';
      tiles[qTileIdx].hazardKind = 'quicksand';
    }
    logs.unshift(
      makeLog(`Desert Event — Quicksand! Tile ${qTileIdx} turned into dangerous quicksand!`, 'event')
    );
  }

  const nextRound = state.round + 1;
  const firstActiveIdx = Math.max(
    0,
    players.findIndex((p) => p.finishedRank === null)
  );

  const afterEventState: GameState = {
    ...state,
    round: nextRound,
    tiles,
    players,
    raceFinishOrder,
    currentPlayerIndex: firstActiveIdx,
    pendingEvent: { round: nextRound, event },
    phase: 'event_banner',
    bannerText: `Round ${state.round} Event: ${DESERT_EVENTS[event].title}`,
    logs: logs.slice(0, 30),
  };

  if (isRaceComplete(afterEventState)) {
    return finalizeRaceScoring(afterEventState);
  }

  return afterEventState;
}

export function dismissEventAndPrepareTurn(state: GameState): GameState {
  return preparePlayerTurn({
    ...state,
    pendingEvent: null,
    phase: 'awaiting_roll',
  });
}

export function spendStaminaForPlusOne(
  state: GameState,
  playerId: string
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const user = players.find((p) => p.id === playerId);
  if (!user || user.stamina <= 0 || user.staminaMoveBoostQueued) return state;

  user.stamina -= 1;
  user.staminaMoveBoostQueued = true;
  const logs = [
    makeLog(`${user.name} spent 1 Stamina for +1 Movement!`, 'good'),
    ...state.logs,
  ].slice(0, 30);

  return { ...state, players, logs };
}

export function usePowerUpPreRoll(
  state: GameState,
  playerId: string,
  powerUp: PowerUpType,
  targetPlayerId?: string,
  targetTileIndex?: number
): GameState {
  const players = state.players.map((p) => ({ ...p }));
  const tiles = state.tiles.map((t) => ({ ...t }));
  const user = players.find((p) => p.id === playerId);
  if (!user) return state;

  const idx = user.powerUps.indexOf(powerUp);
  if (idx === -1) return state;

  const logs = [...state.logs];

  if (powerUp === 'speed_boost') {
    user.powerUps.splice(idx, 1);
    user.speedBoostQueued = true;
    const bonus = isInFinalSprintZone(user.position, state.trackLength) ? 6 : 4;
    logs.unshift(makeLog(`${user.name} activated Speed Boost (+${bonus} steps)!`, 'good'));
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'shield') {
    if (user.hasShield) return state;
    user.powerUps.splice(idx, 1);
    user.hasShield = true;
    logs.unshift(makeLog(`${user.name} equipped a protective Shield!`, 'good'));
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'turbo_sprint') {
    user.powerUps.splice(idx, 1);
    user.sprintActive = true;
    logs.unshift(
      makeLog(`${user.name} activated Turbo Sprint (2x next movement roll)!`, 'good')
    );
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'swap') {
    // Swap positions with the nearest rival strictly ahead of user
    const ahead = players
      .filter(
        (p) =>
          p.id !== user.id &&
          p.finishedRank === null &&
          p.position > user.position
      )
      .sort((a, b) => a.position - b.position);
    if (ahead.length === 0) return state;
    const rival = ahead[0];
    user.powerUps.splice(idx, 1);

    const userOldPos = user.position;
    const userOldStack = user.stackOrder;
    user.position = rival.position;
    user.stackOrder = rival.stackOrder;
    rival.position = userOldPos;
    rival.stackOrder = userOldStack;
    updateCheckpointForPlayer(user, state.trackLength);

    logs.unshift(
      makeLog(`${user.name} used Swap and traded places with ${rival.name} (Tile ${user.position})!`, 'good')
    );
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'block' && targetPlayerId) {
    const target = players.find((p) => p.id === targetPlayerId);
    if (!target) return state;
    user.powerUps.splice(idx, 1);
    target.blockadeTurns += 2;
    logs.unshift(
      makeLog(`${user.name} played Block on ${target.name} (loses 2 turns)!`, 'bad')
    );
    return {
      ...state,
      players,
      phase: 'awaiting_roll',
      logs: logs.slice(0, 30),
    };
  }

  if (
    powerUp === 'sand_wall' &&
    typeof targetTileIndex === 'number' &&
    targetTileIndex > 0 &&
    targetTileIndex < state.trackLength
  ) {
    user.powerUps.splice(idx, 1);
    tiles[targetTileIndex].sandTrapOwnerId = user.id;
    tiles[targetTileIndex].hazardKind = 'sand_wall';
    logs.unshift(
      makeLog(`${user.name} built a Sand Wall on tile ${targetTileIndex}!`, 'bad')
    );
    return {
      ...state,
      players,
      tiles,
      phase: 'awaiting_roll',
      logs: logs.slice(0, 30),
    };
  }

  return state;
}

export function getActionDieLabel(num: number): string {
  return ACTION_DIE_FACES[num]?.label ?? 'Steady Trot';
}

export function pickAIPreRollPowerUp(state: GameState, ai: PlayerState): GameState {
  let cur = state;
  if (ai.powerUps.includes('swap')) {
    const ahead = cur.players.some(
      (p) => p.id !== ai.id && p.finishedRank === null && p.position > ai.position
    );
    if (ahead) {
      cur = usePowerUpPreRoll(cur, ai.id, 'swap');
    }
  }

  const ai1 = cur.players.find((p) => p.id === ai.id)!;
  if (ai1.powerUps.includes('turbo_sprint') && !ai1.sprintActive) {
    cur = usePowerUpPreRoll(cur, ai.id, 'turbo_sprint');
  } else if (ai1.powerUps.includes('speed_boost') && !ai1.speedBoostQueued) {
    cur = usePowerUpPreRoll(cur, ai.id, 'speed_boost');
  }

  const ai2 = cur.players.find((p) => p.id === ai.id)!;
  if (ai2.powerUps.includes('shield') && !ai2.hasShield) {
    cur = usePowerUpPreRoll(cur, ai.id, 'shield');
  }

  const ai3 = cur.players.find((p) => p.id === ai.id)!;
  if (ai3.powerUps.includes('block')) {
    const rivals = cur.players.filter(
      (p) => p.id !== ai.id && p.finishedRank === null
    );
    if (rivals.length > 0) {
      const leader = [...rivals].sort((a, b) => b.position - a.position)[0];
      cur = usePowerUpPreRoll(cur, ai.id, 'block', leader.id);
    }
  }

  const ai4 = cur.players.find((p) => p.id === ai.id)!;
  if (ai4.powerUps.includes('sand_wall')) {
    const rivals = cur.players.filter(
      (p) => p.id !== ai.id && p.finishedRank === null
    );
    if (rivals.length > 0) {
      const targetRival = [...rivals].sort((a, b) => b.position - a.position)[0];
      const desiredTile = Math.min(
        cur.trackLength - 1,
        Math.max(1, targetRival.position + 3)
      );
      if (!cur.tiles[desiredTile].sandTrapOwnerId) {
        cur = usePowerUpPreRoll(cur, ai.id, 'sand_wall', undefined, desiredTile);
      }
    }
  }

  // AI occasionally spends 1 stamina when close to finish
  const ai5 = cur.players.find((p) => p.id === ai.id)!;
  if (ai5.stamina > 0 && cur.trackLength - ai5.position <= 7) {
    cur = spendStaminaForPlusOne(cur, ai.id);
  }

  return cur;
}

export type TileWithMeta = BoardTile;
