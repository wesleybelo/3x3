import {
  GameClockState,
  GameEvent,
  GameState,
  GameStatus,
  MatchInfo,
  Team,
} from '../types';
import {
  createInitialState,
  getEffectiveEvents,
  reduceEvents,
} from './EventReducer';
import {
  buildScoresheetModel,
  OfficialScoresheetModel,
} from '../scoresheet/ScoresheetModel';
import { clearGameState, saveGameState, saveMatchToHistory } from './GameStorage';

export type StateListener = (
  state: GameState,
  model: OfficialScoresheetModel
) => void;

export class GameEngine {
  private state: GameState;
  private listeners: Set<StateListener> = new Set();
  private clockInterval: any = null;
  private cachedScoresheetModel: OfficialScoresheetModel | null = null;
  private lastStorageSaveTimestamp: number = 0;

  constructor(initialState?: GameState) {
    this.state = initialState ?? createInitialState();
    this.startClockLoop();
  }

  public getState(): GameState {
    return this.state;
  }

  public getEffectiveEvents(): GameEvent[] {
    return getEffectiveEvents(this.state.events);
  }

  public getScoresheetModel(): OfficialScoresheetModel {
    if (!this.cachedScoresheetModel) {
      const effectiveEvents = getEffectiveEvents(this.state.events);
      this.cachedScoresheetModel = buildScoresheetModel(this.state, effectiveEvents);
    }
    return this.cachedScoresheetModel;
  }

  public subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    // Notifica imediatamente com estado atual
    listener(this.state, this.getScoresheetModel());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const model = this.getScoresheetModel();
    for (const listener of this.listeners) {
      listener(this.state, model);
    }
  }

  public dispatchEvent(event: GameEvent): GameState {
    // Se a súmula estiver fechada, rejeita qualquer alteração exceto consulta
    if (this.state.isClosed && event.type !== 'EVENT_UNDONE') {
      console.warn('Operação bloqueada: a súmula está SELADA e fechada.');
      return this.state;
    }

    const cleanTeamA = {
      ...this.state.teamA,
      score: 0,
      foulsCount: 0,
      timeoutsRemaining: 1,
      timeoutsUsed: 0,
      timeoutGameTimeMs: undefined,
      players: this.state.teamA.players.map((p, idx) => ({
        ...p,
        points: 0,
        fouls: [],
        disqualified: false,
        played: idx < 3 || p.isStarter,
      })),
    };
    const cleanTeamB = {
      ...this.state.teamB,
      score: 0,
      foulsCount: 0,
      timeoutsRemaining: 1,
      timeoutsUsed: 0,
      timeoutGameTimeMs: undefined,
      players: this.state.teamB.players.map((p, idx) => ({
        ...p,
        points: 0,
        fouls: [],
        disqualified: false,
        played: idx < 3 || p.isStarter,
      })),
    };

    const currentClock = { ...this.state.clock };

    const newEvents = [...this.state.events, event];
    const reduced = reduceEvents(createInitialState(this.state.matchInfo, cleanTeamA, cleanTeamB), newEvents);

    // O relógio é persistente e desacoplado: NUNCA reseta para 10:00 por ações de jogo
    // Apenas eventos explícitos de relógio alteram gameTimeMs
    const isClockReset = event.type === 'CLOCK_RESET';
    const isClockSync = event.type === 'CLOCK_SYNC';
    const isOvertimePeriod = event.type === 'PERIOD_CHANGED' && event.period === 'OVERTIME';

    let preservedGameTimeMs = currentClock.gameTimeMs;
    if (isClockReset || isClockSync || isOvertimePeriod) {
      preservedGameTimeMs = reduced.clock.gameTimeMs;
    }

    // Gerenciamento de status do relógio (isRunning) e timestamp do último tick
    let isRunning = currentClock.isRunning;
    let nextLastTickTimestamp = currentClock.lastTickTimestamp;

    if (event.type === 'CLOCK_STARTED') {
      isRunning = true;
      nextLastTickTimestamp = Date.now();
    } else if (
      event.type === 'CLOCK_PAUSED' ||
      event.type === 'CLOCK_RESET' ||
      event.type === 'SCORESHEET_CLOSED' ||
      event.type === 'GAME_ENDED'
    ) {
      isRunning = false;
      nextLastTickTimestamp = undefined;
    } else if (event.type === 'STATUS_CHANGED') {
      isRunning = event.to === 'RUNNING';
      nextLastTickTimestamp = isRunning ? Date.now() : undefined;
    }

    this.state = {
      ...reduced,
      clock: {
        ...reduced.clock,
        gameTimeMs: preservedGameTimeMs,
        isRunning,
        lastTickTimestamp: isRunning ? (nextLastTickTimestamp || Date.now()) : undefined,
      },
    };

    // Invalida o modelo da súmula para forçar recálculo na próxima leitura
    this.cachedScoresheetModel = null;
    saveGameState(this.state);

    if (
      event.type === 'GAME_ENDED' ||
      event.type === 'SCORESHEET_CLOSED' ||
      this.state.status === 'ENDED' ||
      this.state.status === 'CLOSED' ||
      this.state.isClosed
    ) {
      saveMatchToHistory(this.state);
    }

    this.notify();
    return this.state;
  }

  /**
   * Desfaz a última ação elegível registrando um evento do tipo EVENT_UNDONE.
   * Conforme item 19: reconstrução determinística via getEffectiveEvents().
   */
  public undo(): GameEvent | null {
    if (this.state.isClosed) {
      console.warn('Não é possível desfazer em uma súmula SELADA e fechada.');
      return null;
    }

    const effective = getEffectiveEvents(this.state.events);
    // Procura o último evento efetivo que pode ser desfeito (ex: pontuação, falta, timeout, etc.)
    const undoableTypes = new Set([
      'SCORE_1PT',
      'SCORE_2PT',
      'FREE_THROW_MADE',
      'FREE_THROW_MISSED',
      'FOUL_PERSONAL',
      'FOUL_UNSPORTSMANLIKE',
      'FOUL_DISQUALIFYING',
      'TIMEOUT_REQUESTED',
      'SUBSTITUTION_MADE',
      'PERIOD_CHANGED',
      'PROTEST_RECORDED',
    ]);

    const targetEvent = [...effective].reverse().find(ev => undoableTypes.has(ev.type));
    if (!targetEvent) {
      return null;
    }

    const undoEvent: GameEvent = {
      id: `undo-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
      type: 'EVENT_UNDONE',
      period: this.state.period,
      gameTimeMs: this.state.clock.gameTimeMs,
      undoneEventId: targetEvent.id,
    };

    this.dispatchEvent(undoEvent);
    return targetEvent;
  }

  public resetMatch(matchInfo?: MatchInfo, teamA?: Team, teamB?: Team) {
    this.state = createInitialState(matchInfo, teamA, teamB);
    this.cachedScoresheetModel = null;
    saveGameState(this.state);
    this.notify();
  }

  /**
   * Reseta a partida incondicionalmente, salvando o jogo anterior no histórico.
   * Não exige validações pendentes ou assinaturas obrigatórias.
   * Zera 100% o estado ativo e reseta o cronômetro para 10:00 PAUSED.
   */
  public forceNewMatchReset(nextMatchInfo?: Partial<MatchInfo>, teamA?: Team, teamB?: Team) {
    if (
      this.state.events.length > 0 ||
      this.state.scoreA > 0 ||
      this.state.scoreB > 0 ||
      this.state.isClosed
    ) {
      saveMatchToHistory(this.state);
    }

    this.state = createInitialState(nextMatchInfo as MatchInfo, teamA, teamB);
    this.cachedScoresheetModel = null;
    clearGameState();
    saveGameState(this.state);
    this.notify();
  }

  /**
   * Carrega uma partida salva do histórico na mesa ativa.
   */
  public loadSavedMatchState(savedState: GameState) {
    this.state = {
      ...savedState,
      clock: {
        ...savedState.clock,
        isRunning: false,
        lastTickTimestamp: undefined,
      },
      status: savedState.status === 'RUNNING' ? 'PAUSED' : savedState.status,
    };
    this.cachedScoresheetModel = null;
    saveGameState(this.state);
    this.notify();
  }

  public updateMatchInfo(info: Partial<MatchInfo>) {
    const updatedMatchInfo = {
      ...this.state.matchInfo,
      ...info,
    };
    this.state = {
      ...this.state,
      matchInfo: updatedMatchInfo,
      coinToss: updatedMatchInfo.coinToss ?? this.state.coinToss,
    };
    this.cachedScoresheetModel = null;
    saveGameState(this.state);
    this.notify();
  }

  public updateTeams(teamA: Partial<Team>, teamB: Partial<Team>) {
    this.state = {
      ...this.state,
      teamA: { ...this.state.teamA, ...teamA },
      teamB: { ...this.state.teamB, ...teamB },
    };
    this.cachedScoresheetModel = null;
    saveGameState(this.state);
    this.notify();
  }

  public tickClock(forcedDeltaMs?: number) {
    if (!this.state.clock.isRunning) {
      return;
    }

    const now = Date.now();
    const lastTick = this.state.clock.lastTickTimestamp || now;
    const deltaMs = forcedDeltaMs !== undefined ? forcedDeltaMs : Math.max(0, now - lastTick);
    if (deltaMs <= 0 && forcedDeltaMs === undefined) {
      return;
    }

    const currentClock = this.state.clock;
    let newGameTimeMs = Math.max(0, currentClock.gameTimeMs - deltaMs);
    let newShotClockMs = Math.max(0, currentClock.shotClockMs - deltaMs);

    let shouldStopGame = false;
    if (this.state.period === 'REGULAR' && newGameTimeMs <= 0) {
      newGameTimeMs = 0;
      shouldStopGame = true;
    }

    if (newShotClockMs <= 0) {
      newShotClockMs = 0;
    }

    const updatedClock: GameClockState = {
      ...currentClock,
      gameTimeMs: newGameTimeMs,
      shotClockMs: newShotClockMs,
      isRunning: !shouldStopGame,
      lastTickTimestamp: shouldStopGame ? undefined : now,
    };

    if (shouldStopGame) {
      // Tempo regular expirou! Verifica vencedor ou prorrogação FIBA 3x3
      if (this.state.scoreA > this.state.scoreB) {
        this.dispatchEvent({
          id: `end-${Date.now()}`,
          timestamp: Date.now(),
          type: 'GAME_ENDED',
          period: this.state.period,
          gameTimeMs: 0,
          winner: 'A',
          finalScoreA: this.state.scoreA,
          finalScoreB: this.state.scoreB,
          reason: 'TIME_EXPIRED',
        });
      } else if (this.state.scoreB > this.state.scoreA) {
        this.dispatchEvent({
          id: `end-${Date.now()}`,
          timestamp: Date.now(),
          type: 'GAME_ENDED',
          period: this.state.period,
          gameTimeMs: 0,
          winner: 'B',
          finalScoreA: this.state.scoreA,
          finalScoreB: this.state.scoreB,
          reason: 'TIME_EXPIRED',
        });
      } else {
        // Empate no 3x3: prorrogação automática com meta de +2 pontos!
        this.dispatchEvent({
          id: `ot-${Date.now()}`,
          timestamp: Date.now(),
          type: 'PERIOD_CHANGED',
          period: 'OVERTIME',
          gameTimeMs: 0,
          targetScoreOvertime: Math.max(this.state.scoreA, this.state.scoreB) + 2,
        });
      }
    } else {
      this.state = {
        ...this.state,
        status: 'RUNNING',
        clock: updatedClock,
      };

      // Salva periodicamente no storage (a cada 2 segundos) durante a contagem
      if (now - this.lastStorageSaveTimestamp > 2000) {
        this.lastStorageSaveTimestamp = now;
        saveGameState(this.state);
      }

      this.notify();
    }
  }

  public ensureClockLoop() {
    if (!this.clockInterval) {
      this.startClockLoop();
    }
  }

  public startClockLoop() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    const TICK_INTERVAL = 50; // 50ms para fluidez contínua e precisão temporal
    this.clockInterval = setInterval(() => {
      this.tickClock();
    }, TICK_INTERVAL);
  }

  public destroy() {
    if (this.clockInterval) {
      clearInterval(this.clockInterval);
      this.clockInterval = null;
    }
    this.listeners.clear();
  }
}
