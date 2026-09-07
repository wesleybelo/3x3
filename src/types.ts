/**
 * Tipos fundamentais da Súmula Digital Oficial FIBA 3x3
 * Separação estrita de domínio, sem dependência de React.
 */

export type GameStatus =
  | 'SETUP'
  | 'READY'
  | 'RUNNING'
  | 'PAUSED'
  | 'ENDED'
  | 'CLOSED';

export type GamePeriod = 'REGULAR' | 'OVERTIME';

export type TeamId = 'A' | 'B';

export type ScoringType = 'CAMPO_1P' | 'CAMPO_2P' | 'LANCE_LIVRE';

export type FoulType = 'P' | 'U' | 'D';

export type RunningScoreMark =
  | '1PT'
  | '2PT_CIRCLE'
  | 'FREE_THROW'
  | 'EMPTY'
  | 'SEALED';

export type TeamFoulSlotContent = 'P' | 'U' | 'D' | 'X' | 'SKIPPED' | 'CLOSED';

export interface TeamFoulSlot {
  position: number; // 1 a 10 (posições oficiais da súmula FIBA 3x3)
  content: TeamFoulSlotContent;
  isSkipped: boolean;
  isClosed: boolean;
}

export interface RunningScoreEntry {
  value: number; // 1 a 30
  team: TeamId;
  scoringType?: ScoringType;
  playerNumber?: number;
  mark: RunningScoreMark;
  position: number;
  isSkipped: boolean;
}

export interface Player {
  id: string;
  number: number;
  name: string;
  isStarter: boolean;
  isSubstitute: boolean;
  played: boolean; // Participação confirmada no jogo
  fouls: FoulType[];
  points: number;
  disqualified: boolean;
}

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  color: string;
  players: Player[];
  timeoutsRemaining: number; // FIBA 3x3: 1 timeout por equipe
  timeoutsUsed: number;
  timeoutGameTimeMs?: number; // Momento do relógio em que foi pedido
  foulsCount: number;
  score: number;
}

export interface GameClockState {
  gameTimeMs: number; // 10 minutos regulares = 600.000 ms
  shotClockMs: number; // 12 segundos = 12.000 ms
  isRunning: boolean;
  lastTickTimestamp?: number;
}

export interface ProtestState {
  hasProtest: boolean;
  protestCaptainNumber?: number;
  protestReason?: string;
  timestamp?: number;
}

export interface SignaturesState {
  scorerSignature?: string;
  scorerName?: string;
  timerSignature?: string;
  timerName?: string;
  operator12Name?: string;
  refereeSignature?: string;
  refereeName?: string;
  referee2Signature?: string;
  referee2Name?: string;
  supervisorName?: string;
  captainSignature?: string;
  captainName?: string;
  signedAt?: number;
}

export interface CoinToss {
  winnerTeamId: TeamId;
  choice: 'START_GAME' | 'START_OVERTIME'; // FIBA 3x3 Art. 8
  firstPossessionTeamId: TeamId;
  overtimePossessionTeamId: TeamId;
  tossedAt?: number;
}

export interface MatchInfo {
  id: string;
  competition: string;
  court: string;
  matchNumber: string;
  category: string; // Ex: 'Masculino Open', 'Feminino Elite', 'Sub-23'
  date: string;
  time: string;
  city: string;
  scorerName?: string;
  timerName?: string;
  operator12Name?: string;
  referee1Name?: string;
  referee2Name?: string;
  supervisorName?: string;
  coinToss?: CoinToss;
  logoLeft?: string; // Emblema Esquerdo (Federação/Organização)
  logoRight?: string; // Emblema Direito (Torneio/Campeonato FIBA 3x3)
}

/* =========================================================================
   EVENTOS DO SISTEMA (DISCRIMINATED UNIONS)
   Base para o Event Store e Reducer determinístico
   ========================================================================= */

export type GameEventType =
  | 'GAME_CREATED'
  | 'STATUS_CHANGED'
  | 'SCORE_1PT'
  | 'SCORE_2PT'
  | 'FREE_THROW_MADE'
  | 'FREE_THROW_MISSED'
  | 'FOUL_PERSONAL'
  | 'FOUL_UNSPORTSMANLIKE'
  | 'FOUL_DISQUALIFYING'
  | 'TIMEOUT_REQUESTED'
  | 'SUBSTITUTION_MADE'
  | 'PERIOD_CHANGED'
  | 'CLOCK_STARTED'
  | 'CLOCK_PAUSED'
  | 'CLOCK_RESET'
  | 'CLOCK_SYNC'
  | 'SHOT_CLOCK_RESET'
  | 'GAME_ENDED'
  | 'PROTEST_RECORDED'
  | 'SCORESHEET_SIGNED'
  | 'SCORESHEET_CLOSED'
  | 'EVENT_UNDONE';

export interface BaseGameEvent {
  id: string;
  timestamp: number;
  type: GameEventType;
  period: GamePeriod;
  gameTimeMs: number;
  teamId?: TeamId;
  playerNumber?: number;
}

export interface GameCreatedEvent extends BaseGameEvent {
  type: 'GAME_CREATED';
  matchInfo: MatchInfo;
  teamA: { name: string; shortName: string; color: string; players: Omit<Player, 'fouls' | 'points' | 'disqualified'>[] };
  teamB: { name: string; shortName: string; color: string; players: Omit<Player, 'fouls' | 'points' | 'disqualified'>[] };
}

export interface StatusChangedEvent extends BaseGameEvent {
  type: 'STATUS_CHANGED';
  from: GameStatus;
  to: GameStatus;
  reason?: string;
}

export interface Score1PtEvent extends BaseGameEvent {
  type: 'SCORE_1PT';
  teamId: TeamId;
  playerNumber: number;
  newScore: number;
}

export interface Score2PtEvent extends BaseGameEvent {
  type: 'SCORE_2PT';
  teamId: TeamId;
  playerNumber: number;
  newScore: number;
  skippedScore: number;
}

export interface FreeThrowMadeEvent extends BaseGameEvent {
  type: 'FREE_THROW_MADE';
  teamId: TeamId;
  playerNumber: number;
  newScore: number;
}

export interface FreeThrowMissedEvent extends BaseGameEvent {
  type: 'FREE_THROW_MISSED';
  teamId: TeamId;
  playerNumber: number;
}

export interface FoulPersonalEvent extends BaseGameEvent {
  type: 'FOUL_PERSONAL';
  teamId: TeamId;
  playerNumber: number;
  foulIndex: number; // Posição ocupada no contador coletivo
}

export interface FoulUnsportsmanlikeEvent extends BaseGameEvent {
  type: 'FOUL_UNSPORTSMANLIKE';
  teamId: TeamId;
  playerNumber: number;
  skippedIndex: number;
  foulIndex: number;
}

export interface FoulDisqualifyingEvent extends BaseGameEvent {
  type: 'FOUL_DISQUALIFYING';
  teamId: TeamId;
  playerNumber: number;
  skippedIndex: number;
  foulIndex: number;
}

export interface TimeoutRequestedEvent extends BaseGameEvent {
  type: 'TIMEOUT_REQUESTED';
  teamId: TeamId;
}

export interface SubstitutionMadeEvent extends BaseGameEvent {
  type: 'SUBSTITUTION_MADE';
  teamId: TeamId;
  playerOutNumber: number;
  playerInNumber: number;
}

export interface PeriodChangedEvent extends BaseGameEvent {
  type: 'PERIOD_CHANGED';
  period: GamePeriod;
  targetScoreOvertime?: number;
}

export interface ClockStartedEvent extends BaseGameEvent {
  type: 'CLOCK_STARTED';
}

export interface ClockPausedEvent extends BaseGameEvent {
  type: 'CLOCK_PAUSED';
}

export interface ClockResetEvent extends BaseGameEvent {
  type: 'CLOCK_RESET';
  gameTimeMs: number;
  shotClockMs: number;
}

export interface ClockSyncEvent extends BaseGameEvent {
  type: 'CLOCK_SYNC';
  gameTimeMs: number;
  shotClockMs: number;
}

export interface ShotClockResetEvent extends BaseGameEvent {
  type: 'SHOT_CLOCK_RESET';
  seconds: number;
}

export interface GameEndedEvent extends BaseGameEvent {
  type: 'GAME_ENDED';
  winner: TeamId;
  finalScoreA: number;
  finalScoreB: number;
  reason: 'SCORE_LIMIT' | 'TIME_EXPIRED' | 'OVERTIME_TARGET' | 'DISQUALIFICATION' | 'DEFAULT';
}

export interface ProtestRecordedEvent extends BaseGameEvent {
  type: 'PROTEST_RECORDED';
  hasProtest: boolean;
  protestReason?: string;
  protestCaptainNumber?: number;
}

export interface ScoresheetSignedEvent extends BaseGameEvent {
  type: 'SCORESHEET_SIGNED';
  role: 'SCORER' | 'TIMER' | 'REFEREE' | 'REFEREE_1' | 'REFEREE_2' | 'CAPTAIN';
  signature: string;
  signerName: string;
}

export interface ScoresheetClosedEvent extends BaseGameEvent {
  type: 'SCORESHEET_CLOSED';
  closedAt: number;
}

export interface EventUndoneEvent extends BaseGameEvent {
  type: 'EVENT_UNDONE';
  undoneEventId: string;
}

export type GameEvent =
  | GameCreatedEvent
  | StatusChangedEvent
  | Score1PtEvent
  | Score2PtEvent
  | FreeThrowMadeEvent
  | FreeThrowMissedEvent
  | FoulPersonalEvent
  | FoulUnsportsmanlikeEvent
  | FoulDisqualifyingEvent
  | TimeoutRequestedEvent
  | SubstitutionMadeEvent
  | PeriodChangedEvent
  | ClockStartedEvent
  | ClockPausedEvent
  | ClockResetEvent
  | ClockSyncEvent
  | ShotClockResetEvent
  | GameEndedEvent
  | ProtestRecordedEvent
  | ScoresheetSignedEvent
  | ScoresheetClosedEvent
  | EventUndoneEvent;

/* =========================================================================
   ESTADO CENTRAL DO JOGO (GAME STATE)
   ========================================================================= */

export interface GameState {
  matchInfo: MatchInfo;
  status: GameStatus;
  period: GamePeriod;
  scoreA: number;
  scoreB: number;
  teamA: Team;
  teamB: Team;
  clock: GameClockState;
  coinToss?: CoinToss;
  overtimeTargetA?: number;
  overtimeTargetB?: number;
  winner?: TeamId;
  endReason?: string;
  protest: ProtestState;
  signatures: SignaturesState;
  isClosed: boolean;
  closedAt?: number;
  events: GameEvent[];
  undoneEventIds: string[];
}
