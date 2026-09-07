import { GameClockState } from '../types';

export const REGULAR_GAME_DURATION_MS = 10 * 60 * 1000; // 10 minutos = 600.000 ms
export const SHOT_CLOCK_DURATION_MS = 12 * 1000;         // 12 segundos = 12.000 ms
export const OVERTIME_GAME_DURATION_MS = 0;              // No 3x3, overtime não tem relógio fixo obrigatório ou joga-se até primeira cesta de 2 pts

export function createInitialClock(): GameClockState {
  return {
    gameTimeMs: REGULAR_GAME_DURATION_MS,
    shotClockMs: SHOT_CLOCK_DURATION_MS,
    isRunning: false,
    lastTickTimestamp: undefined,
  };
}

export function formatGameTime(ms: number): string {
  if (ms < 0) ms = 0;
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Se menos de 1 minuto, exibe com décimos para precisão FIBA
  if (minutes === 0 && ms < 60000 && ms > 0) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `00:${seconds.toString().padStart(2, '0')}.${tenths}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export function formatShotClock(ms: number): string {
  if (ms < 0) ms = 0;
  const seconds = Math.floor(ms / 1000);
  if (ms < 5000 && ms > 0) {
    const tenths = Math.floor((ms % 1000) / 100);
    return `${seconds}.${tenths}`;
  }
  return seconds.toString();
}
