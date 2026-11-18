export type CamelColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

export type GameMode = 'kleine' | 'standaard';

export type MatchFormat = 'championship' | 'single';

export type TileBiome =
  | 'start'
  | 'desert'
  | 'oasis'
  | 'canyon'
  | 'dune'
  | 'sandstorm'
  | 'ruins'
  | 'finish';

export type TileSpaceType = 'start' | 'standard' | 'obstacle' | 'powerup' | 'finish';

export interface BoardTile {
  index: number;
  biome: TileBiome;
  spaceType: TileSpaceType;
  obstacleProp?: 'bandit' | 'blow_machine';
  x: number;
  z: number;
  yaw: number;
  sandTrapOwnerId: string | null;
}

export type PowerUpType =
  | 'speed_boost'
  | 'shield'
  | 'sand_trap'
  | 'blockade'
  | 'sprint_potion'
  | 'oasis_refresh';

export type ActionDieFace =
  | 'none'
  | 'obstacle'
  | 'powerup'
  | 'pass_player'
  | 'no_passing'
  | 'kick_player';

export type ObstacleOutcome =
  | 'back_2'
  | 'back_3'
  | 'lose_turn'
  | 'back_start';

export type DesertEventType =
  | 'sandstorm'
  | 'tailwind'
  | 'mirage'
  | 'water_stop';

export type TimeOfDay = 'day' | 'sunset' | 'night';

export type CameraMode = 'overview' | 'follow' | 'leader';

export interface PlayerConfig {
  id: string;
  name: string;
  color: CamelColor;
  isAI: boolean;
  enabled: boolean;
}

export interface PlayerState {
  id: string;
  name: string;
  color: CamelColor;
  isAI: boolean;
  position: number;
  stackOrder: number;
  powerUps: PowerUpType[];
  hasShield: boolean;
  mirageShield: boolean;
  sprintActive: boolean;
  speedBoostQueued: boolean;
  stunnedTurns: number;
  blockadeTurns: number;
  finishedRank: number | null;
  points: number;
}

export type TurnPhase =
  | 'lobby'
  | 'awaiting_roll'
  | 'rolling_dice'
  | 'animating_move'
  | 'pass_choice'
  | 'kick_choice'
  | 'sand_trap_target'
  | 'blockade_target'
  | 'speed_boost_choice'
  | 'obstacle_modal'
  | 'event_banner'
  | 'race_over'
  | 'match_over';

export interface TurnRollSummary {
  movementDie: number;
  actionDie: ActionDieFace;
  actionDieNumber: number;
  totalSteps: number;
  sprintUsed: boolean;
  speedBoostUsed: boolean;
}

export interface PendingPassChoice {
  playerId: string;
  currentPos: number;
  normalDest: number;
  vaultDest: number;
  passedNames: string[];
}

export interface PendingKickChoice {
  playerId: string;
  adjacentTargetIds: string[];
}

export interface PendingObstacleResult {
  playerId: string;
  roll: number;
  outcome: ObstacleOutcome;
  blockedBy: 'shield' | 'mirage' | null;
  source: 'action_die' | 'obstacle_tile';
}

export interface PendingEventResult {
  round: number;
  event: DesertEventType;
}

export interface GameLogEntry {
  id: string;
  text: string;
  tone: 'neutral' | 'good' | 'bad' | 'event';
}

export interface GameState {
  mode: GameMode;
  format: MatchFormat;
  trackLength: number;
  totalRaces: number;
  currentRace: number;
  round: number;
  tiles: BoardTile[];
  players: PlayerState[];
  currentPlayerIndex: number;
  phase: TurnPhase;
  lastRoll: TurnRollSummary | null;
  pendingPass: PendingPassChoice | null;
  pendingKick: PendingKickChoice | null;
  pendingObstacle: PendingObstacleResult | null;
  pendingEvent: PendingEventResult | null;
  extraTurnQueued: boolean;
  raceFinishOrder: string[];
  bannerText: string;
  logs: GameLogEntry[];
}
