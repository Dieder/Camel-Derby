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
    stackOrder: idx, // neatly stacked or lined up at start
    powerUps: [],
    hasShield: false,
    mirageShield: false,
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
    extraTurnQueued: false,
    raceFinishOrder: [],
    bannerText: `${MODE_CONFIGS[mode].title} · Race 1 of ${totalRaces}`,
    logs: [
      makeLog(
        `Race 1 begins on a randomized ${trackLength}-tile desert track!`,
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
    stackOrder: idx,
    powerUps: [],
    hasShield: false,
    mirageShield: false,
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
    extraTurnQueued: false,
    raceFinishOrder: [],
    bannerText: `Race ${nextRace} of ${prev.totalRaces} · New Desert Course!`,
    logs: [
      makeLog(`Race ${nextRace} begins! New desert course generated.`, 'event'),
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
    return b.stackOrder - a.stackOrder; // higher in stack leads ties
  });
}

export function getChampionshipStandings(players: PlayerState[]): PlayerState[] {
  return [...players].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    return b.position - a.position;
  });
}

/**
 * Re-normalizes stackOrder (0..k-1) on a given space after camels join or leave.
 */
function normalizeSpaceStack(players: PlayerState[], spacePos: number) {
  if (spacePos === 0) {
    // On Start tile (0), camels stand side-by-side cleanly by index order, unless stacked mid-race
    const atZero = players
      .filter((p) => p.position === 0 && p.finishedRank === null)
      .sort((a, b) => a.stackOrder - b.stackOrder);
    atZero.forEach((p, idx) => {
      p.stackOrder = idx;
    });
    return;
  }
  const onSpace = players
    .filter((p) => p.position === spacePos && p.finishedRank === null)
    .sort((a, b) => a.stackOrder - b.stackOrder);
  onSpace.forEach((p, idx) => {
    p.stackOrder = idx;
  });
}

/**
 * Moves a camel AND everyone stacked on top of it to `dest`.
 * Returns the list of moved player IDs and whether anyone finished.
 */
export function moveCamelStackTo(
  players: PlayerState[],
  moverId: string,
  dest: number,
  trackLength: number,
  raceFinishOrder: string[]
): {
  movedIds: string[];
  stackedOntoName: string | null;
  newlyFinishedIds: string[];
} {
  const mover = players.find((p) => p.id === moverId);
  if (!mover) return { movedIds: [], stackedOntoName: null, newlyFinishedIds: [] };

  const oldPos = mover.position;
  const clampedDest = Math.max(0, Math.min(trackLength, dest));

  // If moving from start space 0, only move the mover alone (start line isn't a riding stack!)
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
    // Crossed finish line! Mover finishes first, riders finish immediately behind in order
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

  // Find existing stack on destination (excluding moving group)
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
    p.position = clampedDest;
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
  if (roll <= 2) return { roll, outcome: 'back_2' };
  if (roll <= 4) return { roll, outcome: 'back_3' };
  if (roll === 5) return { roll, outcome: 'lose_turn' };
  return { roll, outcome: 'back_start' };
}

export function rollDesertEvent(): DesertEventType {
  const events: DesertEventType[] = [
    'sandstorm',
    'tailwind',
    'mirage',
    'water_stop',
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
  // Championship race ends as soon as 3 players finish OR all but 1 (or all for 2 players) finish
  const podiumSize = Math.min(3, state.players.length);
  if (state.players.length === 2) {
    return state.raceFinishOrder.length >= 1;
  }
  return state.raceFinishOrder.length >= podiumSize || activeRemaining.length === 0;
}

export function finalizeRaceScoring(state: GameState): GameState {
  const nextPlayers = state.players.map((p) => ({ ...p }));
  // Assign remaining players by track position for display, and award championship points for top 3
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
 * Computes movement destination considering Pass Player / No Passing rules.
 */
export function computeMovementPlan(
  state: GameState,
  mover: PlayerState,
  steps: number,
  actionFace: ActionDieFace
): {
  dest: number;
  stoppedBehindName: string | null;
  canOfferPassChoice: boolean;
  vaultDest: number;
  passedNames: string[];
} {
  const start = mover.position;
  const rawDest = Math.min(state.trackLength, start + steps);

  if (actionFace === 'no_passing') {
    for (let s = start + 1; s <= rawDest; s++) {
      if (s === state.trackLength) break;
      const blocker = state.players.find(
        (p) => p.id !== mover.id && p.finishedRank === null && p.position === s
      );
      if (blocker) {
        return {
          dest: Math.max(start, s - 1),
          stoppedBehindName: blocker.name,
          canOfferPassChoice: false,
          vaultDest: s - 1,
          passedNames: [],
        };
      }
    }
    return {
      dest: rawDest,
      stoppedBehindName: null,
      canOfferPassChoice: false,
      vaultDest: rawDest,
      passedNames: [],
    };
  }

  // Identify camels passed or on rawDest
  const passedNames: string[] = [];
  for (let s = start + 1; s <= rawDest; s++) {
    const onTile = state.players.filter(
      (p) => p.id !== mover.id && p.finishedRank === null && p.position === s
    );
    for (const opp of onTile) {
      if (!passedNames.includes(opp.name)) passedNames.push(opp.name);
    }
  }

  if (actionFace === 'pass_player' && rawDest < state.trackLength) {
    // If landing directly on another camel, offer choice: vault 1 space ahead (skipping consecutive occupied if needed) vs stack!
    const occupiedAtRaw = state.players.some(
      (p) => p.id !== mover.id && p.finishedRank === null && p.position === rawDest
    );
    if (occupiedAtRaw) {
      let vault = Math.min(state.trackLength, rawDest + 1);
      while (
        vault < state.trackLength &&
        state.players.some(
          (p) => p.id !== mover.id && p.finishedRank === null && p.position === vault
        )
      ) {
        vault++;
      }
      return {
        dest: rawDest,
        stoppedBehindName: null,
        canOfferPassChoice: true,
        vaultDest: vault,
        passedNames,
      };
    }
  }

  return {
    dest: rawDest,
    stoppedBehindName: null,
    canOfferPassChoice: false,
    vaultDest: rawDest,
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
  let extraTurnQueued = state.extraTurnQueued;

  // Check if race already finished during movement
  if (isRaceComplete({ ...state, players, raceFinishOrder })) {
    return finalizeRaceScoring({
      ...state,
      players,
      tiles,
      raceFinishOrder,
      logs: [...logsToAdd, ...state.logs].slice(0, 30),
    });
  }

  // 1. Check Sand Trap on landing space
  const landedTile = tiles[mover.position];
  if (
    landedTile &&
    landedTile.sandTrapOwnerId &&
    landedTile.sandTrapOwnerId !== mover.id &&
    mover.position > 0 &&
    mover.position < state.trackLength
  ) {
    landedTile.sandTrapOwnerId = null;
    if (mover.hasShield) {
      mover.hasShield = false;
      logsToAdd.unshift(
        makeLog(`${mover.name}'s Shield shattered a Sand Trap!`, 'good')
      );
    } else {
      mover.stunnedTurns += 1;
      logsToAdd.unshift(
        makeLog(`${mover.name} stepped into a Sand Trap and loses 1 turn!`, 'bad')
      );
    }
  }

  // 2. Check Power-Up Space (4, 8, 12, ...)
  if (landedTile && landedTile.spaceType === 'powerup') {
    const drawn = drawRandomPowerUp();
    if (drawn === 'shield' && !mover.hasShield) {
      mover.hasShield = true;
      logsToAdd.unshift(
        makeLog(`${mover.name} landed on a Power-Up tile and activated a Shield!`, 'good')
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

  // 3. Check Action Die: Power-Up (3)
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

  // 4. Check Action Die: Kick Player (6)
  if (actionFace === 'kick_player') {
    const adjacent = getAdjacentTargets(players, mover.id);
    if (adjacent.length > 0) {
      if (!mover.isAI) {
        return {
          ...state,
          players,
          tiles,
          raceFinishOrder,
          extraTurnQueued,
          phase: 'kick_choice',
          pendingKick: {
            playerId: mover.id,
            adjacentTargetIds: adjacent.map((a) => a.id),
          },
          bannerText: `${mover.name} rolled Kick Player! Choose a target.`,
          logs: [...logsToAdd, ...state.logs].slice(0, 30),
        };
      } else {
        // AI picks highest-positioned adjacent opponent
        const target = [...adjacent].sort((a, b) => b.position - a.position)[0];
        const kickMode: 'push' | 'stun' =
          target.position >= 3 ? 'push' : 'stun';
        const kickedState = executeKick(
          {
            ...state,
            players,
            tiles,
            raceFinishOrder,
            extraTurnQueued,
            logs: [...logsToAdd, ...state.logs].slice(0, 30),
          },
          mover.id,
          target.id,
          kickMode,
          false
        );
        // After AI kick, still check obstacle on tile if landed on obstacle space!
        return checkObstacleAfterAction(kickedState, mover.id, actionFace);
      }
    } else {
      logsToAdd.unshift(
        makeLog(`${mover.name} rolled Kick Player, but no camel was adjacent.`, 'neutral')
      );
    }
  }

  // 5. Check Obstacle (Action Die = 2 OR Obstacle Space 3, 7, 11...)
  const nextBase: GameState = {
    ...state,
    players,
    tiles,
    raceFinishOrder,
    extraTurnQueued,
    logs: [...logsToAdd, ...state.logs].slice(0, 30),
  };

  return checkObstacleAfterAction(nextBase, mover.id, actionFace);
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
    if (mover.mirageShield) {
      mover.mirageShield = false;
      return advanceTurnOrRound({
        ...state,
        players,
        logs: [
          makeLog(
            `${mover.name} ignored the Obstacle thanks to Mirage!`,
            'good'
          ),
          ...state.logs,
        ].slice(0, 30),
      });
    }
    if (mover.hasShield) {
      mover.hasShield = false;
      return advanceTurnOrRound({
        ...state,
        players,
        logs: [
          makeLog(
            `${mover.name}'s Shield blocked the Obstacle effect!`,
            'good'
          ),
          ...state.logs,
        ].slice(0, 30),
      });
    }

    const { roll, outcome } = rollObstacleOutcome();
    if (!mover.isAI) {
      return {
        ...state,
        players,
        phase: 'obstacle_modal',
        pendingObstacle: {
          playerId: mover.id,
          roll,
          outcome,
          blockedBy: null,
          source,
        },
        bannerText: `${mover.name} hit an Obstacle!`,
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
            blockedBy: null,
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
    const dest = Math.max(0, mover.position - 2);
    moveCamelStackTo(players, mover.id, dest, state.trackLength, raceFinishOrder);
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} slid back 2 spaces to tile ${dest}!`,
        'bad'
      )
    );
  } else if (obs.outcome === 'back_3') {
    const dest = Math.max(0, mover.position - 3);
    moveCamelStackTo(players, mover.id, dest, state.trackLength, raceFinishOrder);
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} stumbled back 3 spaces to tile ${dest}!`,
        'bad'
      )
    );
  } else if (obs.outcome === 'lose_turn') {
    mover.stunnedTurns += 1;
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): ${mover.name} got stuck in quicksand and loses next turn!`,
        'bad'
      )
    );
  } else {
    moveCamelStackTo(players, mover.id, 0, state.trackLength, raceFinishOrder);
    logs.unshift(
      makeLog(
        `Obstacle (${obs.roll}): Brutal! ${mover.name} was sent all the way back to Start!`,
        'bad'
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
        `${kicker.name} tried to kick ${target.name}, but ${target.name}'s Shield blocked it!`,
        'good'
      )
    );
  } else if (mode === 'push') {
    const dest = Math.max(0, target.position - 3);
    moveCamelStackTo(players, target.id, dest, state.trackLength, raceFinishOrder);
    logs.unshift(
      makeLog(
        `${kicker.name} kicked ${target.name} back 3 spaces to tile ${dest}!`,
        'bad'
      )
    );
  } else {
    target.stunnedTurns += 1;
    logs.unshift(
      makeLog(`${kicker.name} kicked and stunned ${target.name} for 1 turn!`, 'bad')
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

/**
 * Advances to the next active player, or triggers the end-of-round Desert Event Die!
 */
export function advanceTurnOrRound(state: GameState): GameState {
  if (isRaceComplete(state)) {
    return finalizeRaceScoring(state);
  }

  const players = state.players.map((p) => ({ ...p }));

  // Check if Oasis Refresh queued an immediate extra turn for current player
  if (state.extraTurnQueued) {
    const cur = players[state.currentPlayerIndex];
    if (cur && cur.finishedRank === null) {
      return {
        ...state,
        players,
        extraTurnQueued: false,
        phase: 'awaiting_roll',
        bannerText: `${cur.name}'s Oasis Refresh bonus turn!`,
      };
    }
  }

  // Find next unfinished player
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
    // All players have had a turn this round -> Roll Desert Event Die!
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

  // Skip turns if next player is blockaded or stunned, logging cleanly and keeping round wrapping accurate
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
      // Find next unfinished
      let nextIdx = idx + 1;
      if (nextIdx >= current.players.length) {
        const event = rollDesertEvent();
        return applyDesertEvent(
          { ...current, currentPlayerIndex: 0 },
          event
        );
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
          `${player.name} is Blockaded and skips this turn (${player.blockadeTurns - 1} left).`,
          'bad'
        ),
        ...current.logs,
      ].slice(0, 30);

      let nextIdx = idx + 1;
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
        makeLog(`${player.name} is recovering from a stun and skips this turn.`, 'bad'),
        ...current.logs,
      ].slice(0, 30);

      let nextIdx = idx + 1;
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
  const raceFinishOrder = [...state.raceFinishOrder];
  const logs = [...state.logs];

  if (event === 'sandstorm') {
    for (const p of players) {
      if (p.finishedRank === null && p.position > 0) {
        p.position = Math.max(0, p.position - 2);
      }
    }
    // Re-normalize stacks
    for (let s = 0; s < state.trackLength; s++) {
      normalizeSpaceStack(players, s);
    }
    logs.unshift(
      makeLog(`Desert Event — Sandstorm! All camels blown back 2 spaces.`, 'event')
    );
  } else if (event === 'tailwind') {
    // Move leaders first so finishing order respects existing lead
    const ordered = getStandingsSorted(players);
    for (const ref of ordered) {
      const p = players.find((x) => x.id === ref.id)!;
      if (p.finishedRank === null) {
        p.position = Math.min(state.trackLength, p.position + 1);
        if (p.position >= state.trackLength) {
          raceFinishOrder.push(p.id);
          p.finishedRank = raceFinishOrder.length;
        }
      }
    }
    logs.unshift(
      makeLog(`Desert Event — Tailwind! Every camel surges forward 1 space.`, 'event')
    );
  } else if (event === 'mirage') {
    for (const p of players) {
      if (p.finishedRank === null) p.mirageShield = true;
    }
    logs.unshift(
      makeLog(`Desert Event — Mirage! Everyone ignores their next obstacle.`, 'event')
    );
  } else if (event === 'water_stop') {
    for (const p of players) {
      if (p.finishedRank === null) p.hasShield = true;
    }
    logs.unshift(
      makeLog(`Desert Event — Water Stop! Every camel gains a Shield.`, 'event')
    );
  }

  const nextRound = state.round + 1;
  // Find first unfinished player for new round
  const firstActiveIdx = Math.max(
    0,
    players.findIndex((p) => p.finishedRank === null)
  );

  const afterEventState: GameState = {
    ...state,
    round: nextRound,
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
    logs.unshift(makeLog(`${user.name} activated Speed Boost (+4 movement)!`, 'good'));
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'shield') {
    if (user.hasShield) return state;
    user.powerUps.splice(idx, 1);
    user.hasShield = true;
    logs.unshift(makeLog(`${user.name} equipped a protective Shield!`, 'good'));
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'sprint_potion') {
    user.powerUps.splice(idx, 1);
    user.sprintActive = true;
    logs.unshift(
      makeLog(`${user.name} drank a Sprint Potion (2x next movement roll)!`, 'good')
    );
    return { ...state, players, logs: logs.slice(0, 30) };
  }

  if (powerUp === 'oasis_refresh') {
    user.powerUps.splice(idx, 1);
    logs.unshift(
      makeLog(`${user.name} used Oasis Refresh — bonus turn queued!`, 'good')
    );
    return {
      ...state,
      players,
      extraTurnQueued: true,
      logs: logs.slice(0, 30),
    };
  }

  if (powerUp === 'blockade' && targetPlayerId) {
    const target = players.find((p) => p.id === targetPlayerId);
    if (!target) return state;
    user.powerUps.splice(idx, 1);
    target.blockadeTurns += 2;
    logs.unshift(
      makeLog(`${user.name} placed a Blockade on ${target.name} (2 turns)!`, 'bad')
    );
    return {
      ...state,
      players,
      phase: 'awaiting_roll',
      logs: logs.slice(0, 30),
    };
  }

  if (
    powerUp === 'sand_trap' &&
    typeof targetTileIndex === 'number' &&
    targetTileIndex > 0 &&
    targetTileIndex < state.trackLength
  ) {
    user.powerUps.splice(idx, 1);
    tiles[targetTileIndex].sandTrapOwnerId = user.id;
    logs.unshift(
      makeLog(`${user.name} buried a Sand Trap on tile ${targetTileIndex}!`, 'bad')
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
  // Use speed_boost or sprint_potion if available
  if (ai.powerUps.includes('sprint_potion') && !ai.sprintActive) {
    cur = usePowerUpPreRoll(cur, ai.id, 'sprint_potion');
  } else if (ai.powerUps.includes('speed_boost') && !ai.speedBoostQueued) {
    cur = usePowerUpPreRoll(cur, ai.id, 'speed_boost');
  }

  // Use shield if not already shielded
  const updatedAi = cur.players.find((p) => p.id === ai.id)!;
  if (updatedAi.powerUps.includes('shield') && !updatedAi.hasShield) {
    cur = usePowerUpPreRoll(cur, ai.id, 'shield');
  }

  // Use blockade on the leading rival
  const aiAfter = cur.players.find((p) => p.id === ai.id)!;
  if (aiAfter.powerUps.includes('blockade')) {
    const rivals = cur.players.filter(
      (p) => p.id !== ai.id && p.finishedRank === null
    );
    if (rivals.length > 0) {
      const leader = [...rivals].sort((a, b) => b.position - a.position)[0];
      cur = usePowerUpPreRoll(cur, ai.id, 'blockade', leader.id);
    }
  }

  // Use sand_trap ahead of the nearest rival
  const aiAfter2 = cur.players.find((p) => p.id === ai.id)!;
  if (aiAfter2.powerUps.includes('sand_trap')) {
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
        cur = usePowerUpPreRoll(cur, ai.id, 'sand_trap', undefined, desiredTile);
      }
    }
  }

  // Use oasis_refresh right away
  const aiAfter3 = cur.players.find((p) => p.id === ai.id)!;
  if (aiAfter3.powerUps.includes('oasis_refresh') && !cur.extraTurnQueued) {
    cur = usePowerUpPreRoll(cur, ai.id, 'oasis_refresh');
  }

  return cur;
}

export type TileWithMeta = BoardTile;
