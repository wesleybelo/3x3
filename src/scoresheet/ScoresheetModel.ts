import {
  FoulType,
  GameEvent,
  GameState,
  MatchInfo,
  Player,
  RunningScoreEntry,
  TeamFoulSlot,
  TeamId,
} from '../types';
import { getEffectiveEvents } from '../engine/EventReducer';
import { buildTeamFoulSlots, OFFICIAL_TEAM_FOUL_SLOTS_COUNT } from '../domain/fouls';
import { MAX_RUNNING_SCORE_ROWS } from '../domain/scoring';

export interface ScoresheetPlayerRow {
  number: number;
  name: string;
  isStarter: boolean;
  played: boolean;
  foulSlots: (FoulType | '')[]; // 4 posições (1, 2, 3, 4)
  totalPoints: number;
  isDisqualified: boolean;
}

export interface ScoresheetTeamData {
  id: TeamId;
  name: string;
  shortName: string;
  color: string;
  players: ScoresheetPlayerRow[];
  foulSlots: TeamFoulSlot[];
  foulsCount: number;
  timeoutUsed: boolean;
  timeoutTimeDisplay: string;
  finalScore: number;
}

export interface RunningScoreRow {
  pointValue: number; // 1 a 30
  teamA: {
    playerNumber?: number;
    mark: '1PT' | '2PT_CIRCLE' | 'FREE_THROW' | 'EMPTY';
    isSkipped: boolean;
    isLastScore: boolean;
  };
  teamB: {
    playerNumber?: number;
    mark: '1PT' | '2PT_CIRCLE' | 'FREE_THROW' | 'EMPTY';
    isSkipped: boolean;
    isLastScore: boolean;
  };
}

export interface ScoresheetSealingInfo {
  isSealed: boolean;
  teamA: {
    lastPointScored: number; // 0 se nenhum ponto
    thickLineRow: number;    // Linha horizontal grossa (logo abaixo do último ponto)
    thinLineRow: number;     // Linha horizontal fina (logo abaixo da grossa)
    diagonalStartRow: number;// Início da diagonal descendente
    diagonalEndRow: number;  // Fim da diagonal (30)
  };
  teamB: {
    lastPointScored: number;
    thickLineRow: number;
    thinLineRow: number;
    diagonalStartRow: number;
    diagonalEndRow: number;
  };
}

export interface OfficialScoresheetModel {
  matchInfo: MatchInfo;
  status: GameState['status'];
  period: GameState['period'];
  isClosed: boolean;
  closedAt?: number;
  teamA: ScoresheetTeamData;
  teamB: ScoresheetTeamData;
  runningScoreRows: RunningScoreRow[];
  sealing: ScoresheetSealingInfo;
  protest: {
    hasProtest: boolean;
    drawX: boolean; // Desativado para manter bloco limpo e legível
    reason?: string;
    captainNumber?: number;
    teamName?: string;
  };
  signatures: {
    scorerName: string;
    scorerSignature: string;
    timerName: string;
    timerSignature: string;
    operator12Name?: string;
    refereeName: string;
    refereeSignature: string;
    referee2Name?: string;
    referee2Signature?: string;
    isComplete: boolean;
  };
  finalResult: {
    scoreA: number;
    scoreB: number;
    regularScoreA?: number;
    regularScoreB?: number;
    overtimeScoreA?: number;
    overtimeScoreB?: number;
    hasOvertime?: boolean;
    winnerTeamId?: TeamId;
    winnerName?: string;
    endReason?: string;
  };
}

/**
 * Constrói o modelo completo e imutável da súmula oficial a partir do estado e dos eventos efetivos.
 * A camada de UI não calcula regras, apenas renderiza essa projeção fiel.
 */
export function buildScoresheetModel(
  state: GameState,
  effectiveEvents?: GameEvent[]
): OfficialScoresheetModel {
  const events = effectiveEvents ?? getEffectiveEvents(state.events);
  const isClosed = state.isClosed || state.status === 'CLOSED' || state.status === 'ENDED';

  // 1. Extração da sequência de faltas para cada equipe
  const foulsA: FoulType[] = [];
  const foulsB: FoulType[] = [];

  for (const ev of events) {
    if (ev.teamId === 'A') {
      if (ev.type === 'FOUL_PERSONAL') foulsA.push('P');
      else if (ev.type === 'FOUL_UNSPORTSMANLIKE') foulsA.push('U');
      else if (ev.type === 'FOUL_DISQUALIFYING') foulsA.push('D');
    } else if (ev.teamId === 'B') {
      if (ev.type === 'FOUL_PERSONAL') foulsB.push('P');
      else if (ev.type === 'FOUL_UNSPORTSMANLIKE') foulsB.push('U');
      else if (ev.type === 'FOUL_DISQUALIFYING') foulsB.push('D');
    }
  }

  const teamFoulSlotsA = buildTeamFoulSlots(foulsA, isClosed, OFFICIAL_TEAM_FOUL_SLOTS_COUNT);
  const teamFoulSlotsB = buildTeamFoulSlots(foulsB, isClosed, OFFICIAL_TEAM_FOUL_SLOTS_COUNT);

  // 2. Mapeamento do elenco de jogadores com 4 posições de faltas individuais
  const mapPlayerRows = (players: Player[]): ScoresheetPlayerRow[] => {
    return players.map(p => {
      const slots: (FoulType | '')[] = ['', '', '', ''];
      for (let i = 0; i < Math.min(4, p.fouls.length); i++) {
        slots[i] = p.fouls[i];
      }
      return {
        number: p.number,
        name: p.name,
        isStarter: p.isStarter,
        played: p.played,
        foulSlots: slots,
        totalPoints: p.points,
        isDisqualified: p.disqualified,
      };
    });
  };

  const playersA = mapPlayerRows(state.teamA.players);
  const playersB = mapPlayerRows(state.teamB.players);

  // 3. Construção do Running Score (30 linhas oficiais)
  // Cada equipe possui entradas por valor de 1 a 30
  type TeamScoreEntry = {
    playerNumber?: number;
    mark: '1PT' | '2PT_CIRCLE' | 'FREE_THROW' | 'EMPTY';
    isSkipped: boolean;
  };

  const runningMapA: Record<number, TeamScoreEntry> = {};
  const runningMapB: Record<number, TeamScoreEntry> = {};

  // Inicializa mapa vazio
  for (let i = 1; i <= MAX_RUNNING_SCORE_ROWS; i++) {
    runningMapA[i] = { mark: 'EMPTY', isSkipped: false };
    runningMapB[i] = { mark: 'EMPTY', isSkipped: false };
  }

  let lastPointA = 0;
  let lastPointB = 0;

  for (const ev of events) {
    if (ev.type === 'SCORE_1PT') {
      const map = ev.teamId === 'A' ? runningMapA : runningMapB;
      map[ev.newScore] = {
        playerNumber: ev.playerNumber,
        mark: '1PT',
        isSkipped: false,
      };
      if (ev.teamId === 'A') lastPointA = Math.max(lastPointA, ev.newScore);
      else lastPointB = Math.max(lastPointB, ev.newScore);
    } else if (ev.type === 'SCORE_2PT') {
      const map = ev.teamId === 'A' ? runningMapA : runningMapB;
      // Regra Seção 5 & 6: Linha intermediária fica COMPLETAMENTE VAZIA (SKIPPED)
      map[ev.skippedScore] = {
        mark: 'EMPTY',
        isSkipped: true,
      };
      // Linha do novo total recebe ◯ e número do jogador
      map[ev.newScore] = {
        playerNumber: ev.playerNumber,
        mark: '2PT_CIRCLE',
        isSkipped: false,
      };
      if (ev.teamId === 'A') lastPointA = Math.max(lastPointA, ev.newScore);
      else lastPointB = Math.max(lastPointB, ev.newScore);
    } else if (ev.type === 'FREE_THROW_MADE') {
      const map = ev.teamId === 'A' ? runningMapA : runningMapB;
      // Regra Seção 5: Lance livre convertido utiliza ●
      map[ev.newScore] = {
        playerNumber: ev.playerNumber,
        mark: 'FREE_THROW',
        isSkipped: false,
      };
      if (ev.teamId === 'A') lastPointA = Math.max(lastPointA, ev.newScore);
      else lastPointB = Math.max(lastPointB, ev.newScore);
    }
  }

  const runningScoreRows: RunningScoreRow[] = [];
  for (let i = 1; i <= MAX_RUNNING_SCORE_ROWS; i++) {
    runningScoreRows.push({
      pointValue: i,
      teamA: {
        ...runningMapA[i],
        isLastScore: i === lastPointA && lastPointA > 0,
      },
      teamB: {
        ...runningMapB[i],
        isLastScore: i === lastPointB && lastPointB > 0,
      },
    });
  }

  // 4. Regras de Selamento do Running Score (Seção 16)
  // Quando a partida for encerrada/fechada:
  // Localizar a última pontuação convertida.
  // Logo abaixo dela:
  // 1. Linha horizontal grossa
  // 2. Linha horizontal fina
  // 3. Linha diagonal descendente através do restante da coluna.
  const sealing: ScoresheetSealingInfo = {
    isSealed: isClosed || state.status === 'ENDED',
    teamA: {
      lastPointScored: lastPointA,
      thickLineRow: lastPointA,
      thinLineRow: lastPointA,
      diagonalStartRow: lastPointA + 1,
      diagonalEndRow: MAX_RUNNING_SCORE_ROWS,
    },
    teamB: {
      lastPointScored: lastPointB,
      thickLineRow: lastPointB,
      thinLineRow: lastPointB,
      diagonalStartRow: lastPointB + 1,
      diagonalEndRow: MAX_RUNNING_SCORE_ROWS,
    },
  };

  // 5. Timeouts
  const timeoutDisplay = (team: GameState['teamA']) => {
    if (team.timeoutsUsed > 0 && team.timeoutGameTimeMs !== undefined) {
      const sec = Math.floor(team.timeoutGameTimeMs / 1000);
      const min = Math.floor(sec / 60);
      return `${min}:${(sec % 60).toString().padStart(2, '0')}`;
    }
    return isClosed ? '═' : '';
  };

  // 6. Protesto (Seção 14):
  // Bloco de protesto limpo e legível sem riscos em X sobrepostos
  const protestCaptainNumber = state.protest.protestCaptainNumber;
  const protestTeamName = state.protest.hasProtest
    ? (protestCaptainNumber
        ? (state.teamA.players.some(p => p.number === protestCaptainNumber) ? state.teamA.name : state.teamB.name)
        : undefined)
    : undefined;

  const protest = {
    hasProtest: state.protest.hasProtest,
    drawX: isClosed && !state.protest.hasProtest,
    reason: state.protest.protestReason,
    captainNumber: protestCaptainNumber,
    teamName: protestTeamName,
  };

  // 7. Assinaturas
  const signatures = {
    scorerName: state.signatures.scorerName || state.matchInfo.scorerName || '',
    scorerSignature: state.signatures.scorerSignature || '',
    timerName: state.signatures.timerName || state.matchInfo.timerName || '',
    timerSignature: state.signatures.timerSignature || '',
    operator12Name: state.signatures.operator12Name || state.matchInfo.operator12Name || '',
    refereeName: state.signatures.refereeName || state.matchInfo.referee1Name || '',
    refereeSignature: state.signatures.refereeSignature || '',
    referee2Name: state.signatures.referee2Name || state.matchInfo.referee2Name || '',
    referee2Signature: state.signatures.referee2Signature || '',
    isComplete: !!(state.signatures.scorerSignature && state.signatures.refereeSignature),
  };

  const winnerName =
    state.winner === 'A'
      ? state.teamA.name
      : state.winner === 'B'
      ? state.teamB.name
      : undefined;

  let regularScoreA = state.scoreA;
  let regularScoreB = state.scoreB;
  let hasOvertime = state.period === 'OVERTIME';

  const otEvent = events.find(e => e.type === 'PERIOD_CHANGED' && e.period === 'OVERTIME');
  if (otEvent) {
    hasOvertime = true;
    const eventsBeforeOt = events.filter(e => e.timestamp < otEvent.timestamp);
    let sA = 0;
    let sB = 0;
    for (const ev of eventsBeforeOt) {
      if (ev.type === 'SCORE_1PT' || ev.type === 'FREE_THROW_MADE') {
        if (ev.teamId === 'A') sA += 1; else sB += 1;
      } else if (ev.type === 'SCORE_2PT') {
        if (ev.teamId === 'A') sA += 2; else sB += 2;
      }
    }
    regularScoreA = sA;
    regularScoreB = sB;
  }

  return {
    matchInfo: state.matchInfo,
    status: state.status,
    period: state.period,
    isClosed,
    closedAt: state.closedAt,
    teamA: {
      id: 'A',
      name: state.teamA.name,
      shortName: state.teamA.shortName,
      color: state.teamA.color,
      players: playersA,
      foulSlots: teamFoulSlotsA.slots,
      foulsCount: teamFoulSlotsA.teamFoulCount,
      timeoutUsed: state.teamA.timeoutsUsed > 0,
      timeoutTimeDisplay: timeoutDisplay(state.teamA),
      finalScore: state.scoreA,
    },
    teamB: {
      id: 'B',
      name: state.teamB.name,
      shortName: state.teamB.shortName,
      color: state.teamB.color,
      players: playersB,
      foulSlots: teamFoulSlotsB.slots,
      foulsCount: teamFoulSlotsB.teamFoulCount,
      timeoutUsed: state.teamB.timeoutsUsed > 0,
      timeoutTimeDisplay: timeoutDisplay(state.teamB),
      finalScore: state.scoreB,
    },
    runningScoreRows,
    sealing,
    protest,
    signatures,
    finalResult: {
      scoreA: state.scoreA,
      scoreB: state.scoreB,
      regularScoreA,
      regularScoreB,
      overtimeScoreA: hasOvertime ? state.scoreA : undefined,
      overtimeScoreB: hasOvertime ? state.scoreB : undefined,
      hasOvertime,
      winnerTeamId: state.winner,
      winnerName,
      endReason: state.endReason,
    },
  };
}
