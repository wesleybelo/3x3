import { GamePeriod, GameState, GameStatus, TeamId } from '../types';

const VALID_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  SETUP: ['READY'],
  READY: ['RUNNING', 'SETUP'],
  RUNNING: ['PAUSED', 'ENDED'],
  PAUSED: ['RUNNING', 'ENDED', 'READY'],
  ENDED: ['CLOSED', 'PAUSED'], // Permite reabrir para PAUSED se encerramento foi acidental antes de fechar
  CLOSED: [], // Súmula SELADA! Nenhuma transição permitida
};

export function isValidStatusTransition(from: GameStatus, to: GameStatus): boolean {
  if (from === to) return true;
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canPerformInGameAction(state: GameState): { allowed: boolean; reason?: string } {
  if (state.isClosed || state.status === 'CLOSED') {
    return { allowed: false, reason: 'A súmula está SELADA e fechada para edições.' };
  }
  if (state.status === 'ENDED') {
    return { allowed: false, reason: 'A partida já foi encerrada.' };
  }
  return { allowed: true };
}

export function canCloseScoresheet(state: GameState): { allowed: boolean; reason?: string } {
  if (state.isClosed || state.status === 'CLOSED') {
    return { allowed: false, reason: 'A súmula já se encontra fechada.' };
  }
  if (state.status !== 'ENDED') {
    return { allowed: false, reason: 'A partida precisa ser encerrada (ENDED) antes de fechar a súmula.' };
  }
  if (!state.signatures.scorerSignature) {
    return { allowed: false, reason: 'A assinatura do apontador/operador é obrigatória para fechar a súmula.' };
  }
  return { allowed: true };
}

export function canEnterOvertime(state: GameState): { allowed: boolean; reason?: string } {
  if (state.period === 'OVERTIME') {
    return { allowed: false, reason: 'O jogo já está em período de prorrogação (Overtime).' };
  }
  if (state.scoreA !== state.scoreB) {
    return { allowed: false, reason: 'A prorrogação só pode ser iniciada se a partida estiver empatada.' };
  }
  return { allowed: true };
}

export function getPlayerByNumber(state: GameState, teamId: TeamId, playerNumber: number) {
  const team = teamId === 'A' ? state.teamA : state.teamB;
  return team.players.find(p => p.number === playerNumber);
}
