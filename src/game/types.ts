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

export type TileSpaceType =
  | 'start'
  | 'standard'
  | 'obstacle'
  | 'powerup'
  | 'checkpoint'
  | 'finish';

export interface BoardTile {
  index: number;
  biome: TileBiome;
  spaceType: TileSpaceType;
  obstacleProp?: 'bandit' | 'blow_machine';
  x: number;
  z: number;
  yaw: number;
  sandTrapOwnerId: string | null; // Also used for Sand Wall / Quicksand hazards
  hazardKind?: 'sand_wall' | 'quicksand' | null;
}

export type PowerUpType =
  | 'speed_boost'
  | 'turbo_sprint'
  | 'shield'
  | 'sand_wall'
  | 'block'
  | 'swap';

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
  | 'lose_1'
  | 'lose_2'
  | 'back_checkpoint'
  | 'sandstorm_all';

export type DesertEventType =
  | 'sandstorm'
  | 'tailwind'
  | 'camel_stampede'
  | 'oasis_festival'
  | 'quicksand';

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
  checkpoint: number;
  stackOrder: number;
  stamina: number;
  staminaMoveBoostQueued: boolean;
  powerUps: PowerUpType[];
  hasShield: boolean;
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
  | 'animating_move'
  | 'pass_choice'
  | 'kick_choice'
  | 'sand_wall_target'
  | 'block_target'
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
  staminaBoostUsed: boolean;
  rollNonce: number;
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
  inFinalSprint: boolean;
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
  raceFinishOrder: string[];
  bannerText: string;
  logs: GameLogEntry[];
}
