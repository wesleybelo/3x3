import { RunningScoreEntry, ScoringType, TeamId } from '../types';

export const WINNING_SCORE_REGULAR = 21;
export const MAX_RUNNING_SCORE_ROWS = 23;

/**
 * Representação explícita de cada marca no running score
 */
export function getScoreMark(type: ScoringType): '1PT' | '2PT_CIRCLE' | 'FREE_THROW' {
  switch (type) {
    case 'CAMPO_1P':
      return '1PT';
    case 'CAMPO_2P':
      return '2PT_CIRCLE';
    case 'LANCE_LIVRE':
      return 'FREE_THROW';
  }
}

/**
 * Cria a linha de running score pulada para o ponto intermediário de uma cesta de 2 pontos
 */
export function createSkippedScoreRow(value: number, team: TeamId): RunningScoreEntry {
  return {
    value,
    team,
    position: value,
    mark: 'EMPTY',
    isSkipped: true,
  };
}

/**
 * Cria a linha de running score preenchida com a pontuação e número do jogador
 */
export function createActiveScoreRow(
  value: number,
  team: TeamId,
  scoringType: ScoringType,
  playerNumber: number
): RunningScoreEntry {
  return {
    value,
    team,
    position: value,
    scoringType,
    playerNumber,
    mark: getScoreMark(scoringType),
    isSkipped: false,
  };
}

/**
 * Verifica se a equipe atingiu a condição de vitória por pontuação no tempo regulamentar (21 pontos)
 */
export function isWinningScoreReached(score: number): boolean {
  return score >= WINNING_SCORE_REGULAR;
}

/**
 * Em Overtime no FIBA 3x3: a primeira equipe a marcar 2 pontos vence a partida.
 */
export function isOvertimeWon(currentScore: number, targetScore: number): boolean {
  return currentScore >= targetScore;
}
