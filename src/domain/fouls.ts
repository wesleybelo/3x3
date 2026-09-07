import { FoulType, TeamFoulSlot } from '../types';

export const OFFICIAL_TEAM_FOUL_SLOTS_COUNT = 10;
export const FOUL_PENALTY_THRESHOLD_1 = 7;  // 7ª, 8ª e 9ª faltas: 2 lances livres
export const FOUL_PENALTY_THRESHOLD_2 = 10; // 10ª falta em diante: 2 lances livres + posse de bola

/**
 * Constrói a lista inicial de slots de faltas coletivas vazios (1 a 10)
 */
export function initializeTeamFoulSlots(totalSlots = OFFICIAL_TEAM_FOUL_SLOTS_COUNT): TeamFoulSlot[] {
  const slots: TeamFoulSlot[] = [];
  for (let i = 1; i <= totalSlots; i++) {
    slots.push({
      position: i,
      content: 'SKIPPED', // Usamos SKIPPED para vazio inicial transitório antes de ser preenchido/fechado
      isSkipped: false,
      isClosed: false,
    });
  }
  return slots;
}

export interface ProcessedTeamFouls {
  slots: TeamFoulSlot[];
  teamFoulCount: number;
}

/**
 * Reconstrói os slots de faltas de uma equipe a partir da sequência de faltas cometidas.
 * Respeita estritamente a regra FIBA 3x3:
 * - 'P': ocupa 1 slot com 'P'
 * - 'U': ocupa 2 slots consecutivas: 1ª slot = SKIPPED (visual vazio), 2ª slot = 'U'
 * - 'D': ocupa 2 slots consecutivas: 1ª slot = SKIPPED (visual vazio), 2ª slot = 'D'
 *
 * Se a súmula estiver fechada (isClosed = true):
 * - Slots nunca utilizados recebem content: 'CLOSED' (visual ═)
 * - Slots SKIPPED NUNCA são transformados em CLOSED, permanecem vazios!
 */
export function buildTeamFoulSlots(
  foulSequence: FoulType[],
  isClosed: boolean,
  totalSlots = OFFICIAL_TEAM_FOUL_SLOTS_COUNT
): ProcessedTeamFouls {
  const slots: TeamFoulSlot[] = [];
  let currentPos = 1;

  for (const foul of foulSequence) {
    if (foul === 'P') {
      slots.push({
        position: currentPos,
        content: 'P',
        isSkipped: false,
        isClosed: false,
      });
      currentPos += 1;
    } else if (foul === 'U' || foul === 'D') {
      // Ocupa 2 espaços: 1º SKIPPED (permanece totalmente vazia), 2º U ou D
      slots.push({
        position: currentPos,
        content: 'SKIPPED',
        isSkipped: true,
        isClosed: false,
      });
      currentPos += 1;

      slots.push({
        position: currentPos,
        content: foul,
        isSkipped: false,
        isClosed: false,
      });
      currentPos += 1;
    }
  }

  const teamFoulCount = currentPos - 1;

  // Preenche os slots restantes até totalSlots
  while (currentPos <= totalSlots) {
    slots.push({
      position: currentPos,
      content: isClosed ? 'CLOSED' : 'SKIPPED',
      isSkipped: false,
      isClosed: isClosed,
    });
    currentPos += 1;
  }

  return {
    slots: slots.slice(0, Math.max(totalSlots, slots.length)),
    teamFoulCount,
  };
}

/**
 * Retorna a situação de penalidade da equipe (FIBA 3x3)
 */
export function getTeamFoulPenaltyStatus(teamFouls: number): {
  isBonus: boolean;
  description: string;
  freeThrows: number;
  hasPossession: boolean;
} {
  if (teamFouls >= FOUL_PENALTY_THRESHOLD_2) {
    return {
      isBonus: true,
      description: 'Penalidade Máxima: 2 Lances Livres + Posse de Bola',
      freeThrows: 2,
      hasPossession: true,
    };
  }
  if (teamFouls >= FOUL_PENALTY_THRESHOLD_1) {
    return {
      isBonus: true,
      description: 'Penalidade Coletiva: 2 Lances Livres',
      freeThrows: 2,
      hasPossession: false,
    };
  }
  return {
    isBonus: false,
    description: 'Sem penalidade de lances coletivos',
    freeThrows: 0,
    hasPossession: false,
  };
}
