import {
  FoulType,
  GameClockState,
  GameEvent,
  GameState,
  MatchInfo,
  Player,
  Team,
  TeamId,
} from '../types';
import { REGULAR_GAME_DURATION_MS, SHOT_CLOCK_DURATION_MS } from '../domain/clock';
import { WINNING_SCORE_REGULAR } from '../domain/scoring';

export const DEFAULT_MATCH_INFO: MatchInfo = {
  id: 'FIBA3X3-MATCH-01',
  competition: 'FIBA 3x3 World Tour / Challenger',
  court: 'Quadra Central (Court 1)',
  matchNumber: 'M-01',
  category: 'Masculino Open Elite',
  date: new Date().toISOString().split('T')[0],
  time: '18:00',
  city: 'São Paulo, BRA',
  scorerName: 'Carlos M. Silva',
  timerName: 'Mariana R. Costa',
  operator12Name: 'Lucas B. Andrade',
  referee1Name: 'Roberto N. Santos',
  referee2Name: 'Fernanda P. Lima',
  supervisorName: 'Marcos A. Faria',
  coinToss: {
    winnerTeamId: 'A',
    choice: 'START_GAME',
    firstPossessionTeamId: 'A',
    overtimePossessionTeamId: 'B',
  },
};

export function createDefaultPlayer(teamId: TeamId, number: number, name: string, isStarter: boolean): Player {
  return {
    id: `p-${teamId}-${number}`,
    number,
    name,
    isStarter,
    isSubstitute: !isStarter,
    played: isStarter,
    fouls: [],
    points: 0,
    disqualified: false,
  };
}

export function createDefaultTeam(id: TeamId, name: string, shortName: string, color: string, playerNumbers: number[]): Team {
  const players = playerNumbers.map((num, idx) => {
    return createDefaultPlayer(id, num, `Jogador ${num}`, idx < 3);
  });

  return {
    id,
    name,
    shortName,
    color,
    players,
    timeoutsRemaining: 1, // FIBA 3x3: 1 timeout por equipe
    timeoutsUsed: 0,
    foulsCount: 0,
    score: 0,
  };
}

export function createInitialState(
  matchInfo: MatchInfo = DEFAULT_MATCH_INFO,
  customTeamA?: Team,
  customTeamB?: Team
): GameState {
  const teamA = customTeamA || createDefaultTeam('A', 'Equipe Alpha', 'ALP', '#2563eb', [4, 7, 10, 23]);
  const teamB = customTeamB || createDefaultTeam('B', 'Equipe Bravo', 'BRV', '#dc2626', [5, 8, 12, 30]);

  const clock: GameClockState = {
    gameTimeMs: REGULAR_GAME_DURATION_MS,
    shotClockMs: SHOT_CLOCK_DURATION_MS,
    isRunning: false,
    lastTickTimestamp: undefined,
  };

  return {
    matchInfo,
    status: 'SETUP',
    period: 'REGULAR',
    scoreA: 0,
    scoreB: 0,
    teamA,
    teamB,
    clock,
    coinToss: matchInfo.coinToss,
    overtimeTargetA: undefined,
    overtimeTargetB: undefined,
    winner: undefined,
    endReason: undefined,
    protest: { hasProtest: false },
    signatures: {},
    isClosed: false,
    closedAt: undefined,
    events: [],
    undoneEventIds: [],
  };
}

/**
 * Filtra eventos desfeitos (UNDO) para garantir que apenas os eventos efetivos
 * sejam reduzidos. Atende estritamente à Seção 19 das especificações.
 */
export function getEffectiveEvents(events: GameEvent[]): GameEvent[] {
  const undoneIds = new Set<string>();

  // Coleta todos os IDs cancelados por eventos EVENT_UNDONE
  for (const ev of events) {
    if (ev.type === 'EVENT_UNDONE') {
      undoneIds.add(ev.undoneEventId);
    }
  }

  // Retorna somente eventos não cancelados e não eventos de UNDO em si
  return events.filter(ev => !undoneIds.has(ev.id) && ev.type !== 'EVENT_UNDONE');
}

/**
 * Aplica um evento individual em um estado imutável
 */
export function reduceSingleEvent(state: GameState, event: GameEvent): GameState {
  switch (event.type) {
    case 'GAME_CREATED': {
      const teamAPlayers: Player[] = event.teamA.players.map((p, idx) => ({
        ...p,
        fouls: [],
        points: 0,
        disqualified: false,
        played: idx < 3 || p.isStarter,
      }));
      const teamBPlayers: Player[] = event.teamB.players.map((p, idx) => ({
        ...p,
        fouls: [],
        points: 0,
        disqualified: false,
        played: idx < 3 || p.isStarter,
      }));

      return {
        ...state,
        matchInfo: event.matchInfo,
        teamA: {
          id: 'A',
          name: event.teamA.name,
          shortName: event.teamA.shortName,
          color: event.teamA.color,
          players: teamAPlayers,
          timeoutsRemaining: 1,
          timeoutsUsed: 0,
          foulsCount: 0,
          score: 0,
        },
        teamB: {
          id: 'B',
          name: event.teamB.name,
          shortName: event.teamB.shortName,
          color: event.teamB.color,
          players: teamBPlayers,
          timeoutsRemaining: 1,
          timeoutsUsed: 0,
          foulsCount: 0,
          score: 0,
        },
      };
    }

    case 'STATUS_CHANGED': {
      return {
        ...state,
        status: event.to,
        clock: {
          ...state.clock,
          isRunning: event.to === 'RUNNING',
        },
      };
    }

    case 'SCORE_1PT':
    case 'SCORE_2PT':
    case 'FREE_THROW_MADE': {
      const pointsToAdd = event.type === 'SCORE_2PT' ? 2 : 1;
      const targetTeam = event.teamId === 'A' ? 'teamA' : 'teamB';
      const otherTeam = event.teamId === 'A' ? 'teamB' : 'teamA';
      const currentScore = state[targetTeam].score;
      const newScore = currentScore + pointsToAdd;

      const updatedPlayers = state[targetTeam].players.map(p => {
        if (p.number === event.playerNumber) {
          return {
            ...p,
            points: p.points + pointsToAdd,
            played: true,
          };
        }
        return p;
      });

      const updatedTeam = {
        ...state[targetTeam],
        score: newScore,
        players: updatedPlayers,
      };

      const newScoreA = event.teamId === 'A' ? newScore : state.scoreA;
      const newScoreB = event.teamId === 'B' ? newScore : state.scoreB;

      // Verificação de vitória no 3x3:
      // 1) Tempo regulamentar: primeira equipe a atingir 21 pontos vence imediatamente!
      // 2) Overtime: primeira equipe a atingir a meta de prorrogação (+2 pontos) vence!
      let winner = state.winner;
      let endReason = state.endReason;
      let nextStatus = state.status;

      if (state.period === 'REGULAR' && newScore >= WINNING_SCORE_REGULAR) {
        winner = event.teamId;
        endReason = 'Limite de 21 Pontos Atingido (FIBA 3x3 Sudden Death)';
        nextStatus = 'ENDED';
      } else if (state.period === 'OVERTIME') {
        const target = event.teamId === 'A' ? state.overtimeTargetA : state.overtimeTargetB;
        if (target && newScore >= target) {
          winner = event.teamId;
          endReason = 'Meta de 2 Pontos na Prorrogação Atingida';
          nextStatus = 'ENDED';
        }
      }

      return {
        ...state,
        [targetTeam]: updatedTeam,
        scoreA: newScoreA,
        scoreB: newScoreB,
        winner,
        endReason,
        status: nextStatus,
        clock: {
          ...state.clock,
          isRunning: nextStatus === 'RUNNING' ? state.clock.isRunning : false,
          shotClockMs: SHOT_CLOCK_DURATION_MS, // Reset shot clock após pontuação
        },
      };
    }

    case 'FREE_THROW_MISSED': {
      const targetTeam = event.teamId === 'A' ? 'teamA' : 'teamB';
      const updatedPlayers = state[targetTeam].players.map(p => {
        if (p.number === event.playerNumber) {
          return { ...p, played: true };
        }
        return p;
      });

      return {
        ...state,
        [targetTeam]: {
          ...state[targetTeam],
          players: updatedPlayers,
        },
      };
    }

    case 'FOUL_PERSONAL':
    case 'FOUL_UNSPORTSMANLIKE':
    case 'FOUL_DISQUALIFYING': {
      const foulType: FoulType =
        event.type === 'FOUL_PERSONAL'
          ? 'P'
          : event.type === 'FOUL_UNSPORTSMANLIKE'
          ? 'U'
          : 'D';

      // U e D ocupam 2 posições coletivas
      const foulsCountIncrement = foulType === 'P' ? 1 : 2;
      const targetTeam = event.teamId === 'A' ? 'teamA' : 'teamB';

      const updatedPlayers = state[targetTeam].players.map(p => {
        if (p.number === event.playerNumber) {
          const newFouls = [...p.fouls, foulType];
          // Desqualificação no FIBA 3x3:
          // 1 falta D = desqualificado
          // 2 faltas U = desqualificado
          // Faltas pessoais NÃO excluem atleta no 3x3
          const uCount = newFouls.filter(f => f === 'U').length;
          const hasD = newFouls.includes('D');
          const isDisqualified = hasD || uCount >= 2;

          return {
            ...p,
            fouls: newFouls,
            played: true,
            disqualified: isDisqualified,
          };
        }
        return p;
      });

      return {
        ...state,
        [targetTeam]: {
          ...state[targetTeam],
          foulsCount: state[targetTeam].foulsCount + foulsCountIncrement,
          players: updatedPlayers,
        },
        clock: {
          ...state.clock,
          isRunning: false, // Relógio para automaticamente em caso de falta no basquete FIBA
        },
        status: state.status === 'RUNNING' ? 'PAUSED' : state.status,
      };
    }

    case 'TIMEOUT_REQUESTED': {
      const targetTeam = event.teamId === 'A' ? 'teamA' : 'teamB';
      return {
        ...state,
        [targetTeam]: {
          ...state[targetTeam],
          timeoutsRemaining: Math.max(0, state[targetTeam].timeoutsRemaining - 1),
          timeoutsUsed: state[targetTeam].timeoutsUsed + 1,
          timeoutGameTimeMs: state.clock.gameTimeMs,
        },
        clock: {
          ...state.clock,
          isRunning: false,
        },
        status: state.status === 'RUNNING' ? 'PAUSED' : state.status,
      };
    }

    case 'SUBSTITUTION_MADE': {
      const targetTeam = event.teamId === 'A' ? 'teamA' : 'teamB';
      const updatedPlayers = state[targetTeam].players.map(p => {
        if (p.number === event.playerOutNumber) {
          return { ...p, isStarter: false, isSubstitute: true };
        }
        if (p.number === event.playerInNumber) {
          return { ...p, isStarter: true, isSubstitute: false, played: true };
        }
        return p;
      });

      return {
        ...state,
        [targetTeam]: {
          ...state[targetTeam],
          players: updatedPlayers,
        },
      };
    }

    case 'PERIOD_CHANGED': {
      // Overtime no FIBA 3x3: primeira equipe a marcar 2 pontos vence
      const targetA = state.scoreA + 2;
      const targetB = state.scoreB + 2;

      return {
        ...state,
        period: event.period,
        overtimeTargetA: event.period === 'OVERTIME' ? targetA : undefined,
        overtimeTargetB: event.period === 'OVERTIME' ? targetB : undefined,
        status: 'PAUSED',
        clock: {
          ...state.clock,
          isRunning: false,
          gameTimeMs: 0, // Sem limite de tempo no overtime ou contagem livre
          shotClockMs: SHOT_CLOCK_DURATION_MS,
        },
      };
    }

    case 'CLOCK_STARTED': {
      return {
        ...state,
        status: 'RUNNING',
        clock: {
          ...state.clock,
          isRunning: true,
          lastTickTimestamp: event.timestamp,
        },
      };
    }

    case 'CLOCK_PAUSED': {
      return {
        ...state,
        status: state.status === 'RUNNING' ? 'PAUSED' : state.status,
        clock: {
          ...state.clock,
          isRunning: false,
          lastTickTimestamp: undefined,
        },
      };
    }

    case 'CLOCK_RESET': {
      return {
        ...state,
        clock: {
          ...state.clock,
          gameTimeMs: event.gameTimeMs,
          shotClockMs: event.shotClockMs,
          isRunning: false,
        },
      };
    }

    case 'CLOCK_SYNC': {
      return {
        ...state,
        clock: {
          ...state.clock,
          gameTimeMs: event.gameTimeMs,
          shotClockMs: event.shotClockMs,
        },
      };
    }

    case 'SHOT_CLOCK_RESET': {
      return {
        ...state,
        clock: {
          ...state.clock,
          shotClockMs: event.seconds * 1000,
        },
      };
    }

    case 'GAME_ENDED': {
      return {
        ...state,
        status: 'ENDED',
        winner: event.winner,
        scoreA: event.finalScoreA,
        scoreB: event.finalScoreB,
        endReason: event.reason,
        clock: {
          ...state.clock,
          isRunning: false,
        },
      };
    }

    case 'PROTEST_RECORDED': {
      return {
        ...state,
        protest: {
          hasProtest: event.hasProtest,
          protestReason: event.protestReason,
          protestCaptainNumber: event.protestCaptainNumber,
          timestamp: event.timestamp,
        },
      };
    }

    case 'SCORESHEET_SIGNED': {
      const signatures = { ...state.signatures };
      if (event.role === 'SCORER') {
        signatures.scorerSignature = event.signature;
        signatures.scorerName = event.signerName;
      } else if (event.role === 'TIMER') {
        signatures.timerSignature = event.signature;
        signatures.timerName = event.signerName;
      } else if (event.role === 'REFEREE' || event.role === 'REFEREE_1') {
        signatures.refereeSignature = event.signature;
        signatures.refereeName = event.signerName;
      } else if (event.role === 'REFEREE_2') {
        signatures.referee2Signature = event.signature;
        signatures.referee2Name = event.signerName;
      } else if (event.role === 'CAPTAIN') {
        signatures.captainSignature = event.signature;
        signatures.captainName = event.signerName;
      }
      signatures.signedAt = event.timestamp;

      return {
        ...state,
        signatures,
      };
    }

    case 'SCORESHEET_CLOSED': {
      return {
        ...state,
        status: 'CLOSED',
        isClosed: true,
        closedAt: event.closedAt,
        clock: {
          ...state.clock,
          isRunning: false,
        },
      };
    }

    case 'EVENT_UNDONE': {
      // EVENT_UNDONE é tratado pelo loop de replay determinístico em reduceEvents
      return state;
    }

    default:
      return state;
  }
}

/**
 * Função redutora central: reconstrói o GameState a partir do estado inicial
 * e da lista completa de eventos, considerando apenas eventos efetivos (não desfeitos).
 */
export function reduceEvents(
  initialState: GameState,
  allEvents: GameEvent[]
): GameState {
  const effectiveEvents = getEffectiveEvents(allEvents);

  let state: GameState = {
    ...initialState,
    events: allEvents,
    undoneEventIds: allEvents
      .filter(ev => ev.type === 'EVENT_UNDONE')
      .map(ev => (ev as any).undoneEventId),
  };

  for (const event of effectiveEvents) {
    state = reduceSingleEvent(state, event);
  }

  // Garante que a lista de eventos e undoneEventIds reflita o histórico completo no estado final
  state.events = allEvents;
  state.undoneEventIds = allEvents
    .filter(ev => ev.type === 'EVENT_UNDONE')
    .map(ev => (ev as any).undoneEventId);

  return state;
}
