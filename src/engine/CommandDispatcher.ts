import {
  FoulType,
  GameEvent,
  GamePeriod,
  GameStatus,
  MatchInfo,
  Team,
  TeamId,
} from '../types';
import { GameEngine } from './GameEngine';
import { canCloseScoresheet, canPerformInGameAction, isValidStatusTransition } from '../domain/validators';
import { SHOT_CLOCK_DURATION_MS } from '../domain/clock';

export class CommandDispatcher {
  constructor(private engine: GameEngine) {}

  private generateId(prefix: string): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  }

  public setStatus(newStatus: GameStatus, reason?: string): boolean {
    const current = this.engine.getState();
    if (current.status === newStatus) {
      return true;
    }
    if (!isValidStatusTransition(current.status, newStatus)) {
      console.warn(`Transição de estado inválida: ${current.status} -> ${newStatus}`);
      return false;
    }

    const event: GameEvent = {
      id: this.generateId('status'),
      timestamp: Date.now(),
      type: 'STATUS_CHANGED',
      period: current.period,
      gameTimeMs: current.clock.gameTimeMs,
      from: current.status,
      to: newStatus,
      reason,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public score1Pt(teamId: TeamId, playerNumber: number): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    const currentScore = teamId === 'A' ? state.scoreA : state.scoreB;
    const newScore = currentScore + 1;

    const event: GameEvent = {
      id: this.generateId('score1p'),
      timestamp: Date.now(),
      type: 'SCORE_1PT',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      teamId,
      playerNumber,
      newScore,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public score2Pt(teamId: TeamId, playerNumber: number): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    const currentScore = teamId === 'A' ? state.scoreA : state.scoreB;
    const skippedScore = currentScore + 1;
    const newScore = currentScore + 2;

    const event: GameEvent = {
      id: this.generateId('score2p'),
      timestamp: Date.now(),
      type: 'SCORE_2PT',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      teamId,
      playerNumber,
      newScore,
      skippedScore,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public freeThrow(teamId: TeamId, playerNumber: number, made: boolean): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    if (made) {
      const currentScore = teamId === 'A' ? state.scoreA : state.scoreB;
      const newScore = currentScore + 1;

      const event: GameEvent = {
        id: this.generateId('ft-made'),
        timestamp: Date.now(),
        type: 'FREE_THROW_MADE',
        period: state.period,
        gameTimeMs: state.clock.gameTimeMs,
        teamId,
        playerNumber,
        newScore,
      };

      this.engine.dispatchEvent(event);
    } else {
      const event: GameEvent = {
        id: this.generateId('ft-miss'),
        timestamp: Date.now(),
        type: 'FREE_THROW_MISSED',
        period: state.period,
        gameTimeMs: state.clock.gameTimeMs,
        teamId,
        playerNumber,
      };

      this.engine.dispatchEvent(event);
    }
    return true;
  }

  public foul(teamId: TeamId, playerNumber: number, foulType: FoulType): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    const currentFouls = teamId === 'A' ? state.teamA.foulsCount : state.teamB.foulsCount;

    if (foulType === 'P') {
      const event: GameEvent = {
        id: this.generateId('foul-p'),
        timestamp: Date.now(),
        type: 'FOUL_PERSONAL',
        period: state.period,
        gameTimeMs: state.clock.gameTimeMs,
        teamId,
        playerNumber,
        foulIndex: currentFouls + 1,
      };
      this.engine.dispatchEvent(event);
    } else if (foulType === 'U') {
      const event: GameEvent = {
        id: this.generateId('foul-u'),
        timestamp: Date.now(),
        type: 'FOUL_UNSPORTSMANLIKE',
        period: state.period,
        gameTimeMs: state.clock.gameTimeMs,
        teamId,
        playerNumber,
        skippedIndex: currentFouls + 1,
        foulIndex: currentFouls + 2,
      };
      this.engine.dispatchEvent(event);
    } else if (foulType === 'D') {
      const event: GameEvent = {
        id: this.generateId('foul-d'),
        timestamp: Date.now(),
        type: 'FOUL_DISQUALIFYING',
        period: state.period,
        gameTimeMs: state.clock.gameTimeMs,
        teamId,
        playerNumber,
        skippedIndex: currentFouls + 1,
        foulIndex: currentFouls + 2,
      };
      this.engine.dispatchEvent(event);
    }

    return true;
  }

  public timeout(teamId: TeamId): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    const team = teamId === 'A' ? state.teamA : state.teamB;
    if (team.timeoutsRemaining <= 0) {
      console.warn('Equipe já utilizou seu tempo debitado permitido.');
      return false;
    }

    const event: GameEvent = {
      id: this.generateId('timeout'),
      timestamp: Date.now(),
      type: 'TIMEOUT_REQUESTED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      teamId,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public substitute(teamId: TeamId, playerOutNumber: number, playerInNumber: number): boolean {
    const state = this.engine.getState();
    const check = canPerformInGameAction(state);
    if (!check.allowed) return false;

    const event: GameEvent = {
      id: this.generateId('sub'),
      timestamp: Date.now(),
      type: 'SUBSTITUTION_MADE',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      teamId,
      playerOutNumber,
      playerInNumber,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public startClock(): void {
    const state = this.engine.getState();
    if (state.isClosed || state.status === 'ENDED') return;
    if (state.clock.isRunning && state.status === 'RUNNING') return;

    if (state.status === 'SETUP') {
      this.setStatus('READY');
    }
    if (this.engine.getState().status !== 'RUNNING') {
      this.setStatus('RUNNING');
    }

    this.engine.dispatchEvent({
      id: this.generateId('clock-start'),
      timestamp: Date.now(),
      type: 'CLOCK_STARTED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
    });
  }

  public pauseClock(): void {
    const state = this.engine.getState();
    if (state.isClosed) return;
    if (!state.clock.isRunning && state.status === 'PAUSED') return;

    this.engine.dispatchEvent({
      id: this.generateId('clock-pause'),
      timestamp: Date.now(),
      type: 'CLOCK_PAUSED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
    });
  }

  public resetMatch(matchInfo?: MatchInfo, teamA?: Team, teamB?: Team): void {
    this.engine.resetMatch(matchInfo, teamA, teamB);
  }

  public startGame(): void {
    this.startClock();
  }

  public resetMatchClock(minutes = 10): void {
    const state = this.engine.getState();
    if (state.isClosed) return;
    this.engine.dispatchEvent({
      id: this.generateId('clock-reset'),
      timestamp: Date.now(),
      type: 'CLOCK_RESET',
      period: state.period,
      gameTimeMs: minutes * 60 * 1000,
      shotClockMs: 12000,
    });
  }

  public toggleClock(): void {
    const state = this.engine.getState();
    if (state.isClosed || state.status === 'ENDED') return;
    if (state.clock.isRunning) {
      this.pauseClock();
    } else {
      this.startClock();
    }
  }

  public startOvertime(): boolean {
    return this.enterOvertime();
  }

  public updateMatchInfo(info: Partial<MatchInfo>): void {
    this.engine.updateMatchInfo(info);
  }

  public resetShotClock(seconds = 12): void {
    const state = this.engine.getState();
    this.engine.dispatchEvent({
      id: this.generateId('shot-reset'),
      timestamp: Date.now(),
      type: 'SHOT_CLOCK_RESET',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      seconds,
    });
  }

  public syncClock(gameTimeMs: number, shotClockMs: number): void {
    const state = this.engine.getState();
    this.engine.dispatchEvent({
      id: this.generateId('clock-sync'),
      timestamp: Date.now(),
      type: 'CLOCK_SYNC',
      period: state.period,
      gameTimeMs,
      shotClockMs,
    });
  }

  public enterOvertime(): boolean {
    const state = this.engine.getState();
    if (state.scoreA !== state.scoreB) {
      console.warn('Prorrogação só é permitida em caso de empate.');
      return false;
    }

    const event: GameEvent = {
      id: this.generateId('period-ot'),
      timestamp: Date.now(),
      type: 'PERIOD_CHANGED',
      period: 'OVERTIME',
      gameTimeMs: 0,
      targetScoreOvertime: Math.max(state.scoreA, state.scoreB) + 2,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public endGame(
    reason: 'SCORE_LIMIT' | 'TIME_EXPIRED' | 'OVERTIME_TARGET' | 'DISQUALIFICATION' | 'DEFAULT' = 'TIME_EXPIRED',
    manualWinner?: TeamId,
    overrideScoreA?: number,
    overrideScoreB?: number
  ): boolean {
    const state = this.engine.getState();
    if (state.isClosed) return false;

    let winner = manualWinner;
    if (!winner) {
      if (state.scoreA > state.scoreB) winner = 'A';
      else if (state.scoreB > state.scoreA) winner = 'B';
      else winner = 'A'; // Em caso de empate deve jogar overtime, mas fallback manual se necessário
    }

    const finalScoreA =
      overrideScoreA !== undefined
        ? overrideScoreA
        : reason === 'DEFAULT'
        ? winner === 'A'
          ? 21
          : 0
        : state.scoreA;

    const finalScoreB =
      overrideScoreB !== undefined
        ? overrideScoreB
        : reason === 'DEFAULT'
        ? winner === 'B'
          ? 21
          : 0
        : state.scoreB;

    const event: GameEvent = {
      id: this.generateId('end-game'),
      timestamp: Date.now(),
      type: 'GAME_ENDED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      winner,
      finalScoreA,
      finalScoreB,
      reason,
    };

    this.engine.dispatchEvent(event);
    return true;
  }

  public recordProtest(hasProtest: boolean, reason?: string, captainNumber?: number): void {
    const state = this.engine.getState();
    this.engine.dispatchEvent({
      id: this.generateId('protest'),
      timestamp: Date.now(),
      type: 'PROTEST_RECORDED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      hasProtest,
      protestReason: reason,
      protestCaptainNumber: captainNumber,
    });
  }

  public signScoresheet(
    role: 'SCORER' | 'TIMER' | 'REFEREE' | 'REFEREE_1' | 'REFEREE_2' | 'CAPTAIN',
    signature: string,
    signerName: string
  ): void {
    const state = this.engine.getState();
    this.engine.dispatchEvent({
      id: this.generateId('sign'),
      timestamp: Date.now(),
      type: 'SCORESHEET_SIGNED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      role,
      signature,
      signerName,
    });
  }

  public closeScoresheet(): boolean {
    const state = this.engine.getState();
    const check = canCloseScoresheet(state);
    if (!check.allowed) {
      console.warn(check.reason);
      return false;
    }

    this.engine.dispatchEvent({
      id: this.generateId('close'),
      timestamp: Date.now(),
      type: 'SCORESHEET_CLOSED',
      period: state.period,
      gameTimeMs: state.clock.gameTimeMs,
      closedAt: Date.now(),
    });

    return true;
  }

  public undo(): GameEvent | null {
    return this.engine.undo();
  }
}
