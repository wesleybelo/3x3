import { createInitialState, reduceEvents } from '../engine/EventReducer';
import { buildTeamFoulSlots, getTeamFoulPenaltyStatus } from '../domain/fouls';
import { buildScoresheetModel } from '../scoresheet/ScoresheetModel';
import { FoulType, GameEvent } from '../types';
import { TestResult } from './foundationTests';

export function runFoulEngineTests(): TestResult[] {
  const results: TestResult[] = [];

  const test = (name: string, fn: () => void) => {
    const start = performance.now();
    try {
      fn();
      results.push({
        suite: 'Foul Engine Tests',
        name,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        suite: 'Foul Engine Tests',
        name,
        passed: false,
        error: err.message || String(err),
        durationMs: performance.now() - start,
      });
    }
  };

  test('Falta pessoal (P): ocupa 1 slot no contador coletivo com P e registra no jogador', () => {
    const fouls: FoulType[] = ['P'];
    const result = buildTeamFoulSlots(fouls, false);
    if (result.teamFoulCount !== 1) throw new Error(`Faltas coletivas esperadas 1, obteve ${result.teamFoulCount}`);
    if (result.slots[0].content !== 'P') throw new Error(`Slot 1 esperado 'P', obteve ${result.slots[0].content}`);
    if (result.slots[0].isSkipped) throw new Error('Slot 1 de falta P não pode ser isSkipped');

    const initial = createInitialState();
    const event: GameEvent = {
      id: 'f-1',
      timestamp: 1000,
      type: 'FOUL_PERSONAL',
      period: 'REGULAR',
      gameTimeMs: 500000,
      teamId: 'A',
      playerNumber: 4,
      foulIndex: 1,
    };
    const state = reduceEvents(initial, [event]);
    const player = state.teamA.players.find(p => p.number === 4);
    if (player?.fouls.length !== 1 || player.fouls[0] !== 'P') {
      throw new Error(`Jogador 4 deve ter falta 'P', obteve ${player?.fouls.join(',')}`);
    }
  });

  test('Falta antidesportiva (U): ocupa dois espaços consecutivos (1º SKIPPED vazio, 2º U)', () => {
    const fouls: FoulType[] = ['P', 'P', 'U'];
    const result = buildTeamFoulSlots(fouls, false);
    // P -> pos 1
    // P -> pos 2
    // U -> pos 3 (SKIPPED), pos 4 (U)
    if (result.teamFoulCount !== 4) throw new Error(`Faltas coletivas esperadas 4, obteve ${result.teamFoulCount}`);
    if (result.slots[0].content !== 'P') throw new Error('Slot 1 deve ser P');
    if (result.slots[1].content !== 'P') throw new Error('Slot 2 deve ser P');
    if (result.slots[2].content !== 'SKIPPED' || !result.slots[2].isSkipped) {
      throw new Error(`Slot 3 deve ser estritamente SKIPPED (vazio), obteve ${result.slots[2].content}`);
    }
    if (result.slots[3].content !== 'U') {
      throw new Error(`Slot 4 deve ser U, obteve ${result.slots[3].content}`);
    }
  });

  test('Falta desqualificante (D): ocupa dois espaços consecutivos (1º SKIPPED vazio, 2º D)', () => {
    const fouls: FoulType[] = ['D'];
    const result = buildTeamFoulSlots(fouls, false);
    // D -> pos 1 (SKIPPED), pos 2 (D)
    if (result.teamFoulCount !== 2) throw new Error(`Faltas coletivas esperadas 2, obteve ${result.teamFoulCount}`);
    if (result.slots[0].content !== 'SKIPPED' || !result.slots[0].isSkipped) {
      throw new Error(`Slot 1 para falta D deve ser SKIPPED (vazio), obteve ${result.slots[0].content}`);
    }
    if (result.slots[1].content !== 'D') {
      throw new Error(`Slot 2 para falta D deve ser D, obteve ${result.slots[1].content}`);
    }
  });

  test('Fechamento de faltas: slots não utilizados recebem ═ (CLOSED), mas slots SKIPPED NUNCA viram CLOSED', () => {
    // Sequência: P, P, U (Ocupa posições 1=P, 2=P, 3=SKIPPED, 4=U; posições 5 a 10 = CLOSED)
    const fouls: FoulType[] = ['P', 'P', 'U'];
    const result = buildTeamFoulSlots(fouls, true, 10);

    // Slot 3 (SKIPPED da falta U) deve permanecer SKIPPED e NÃO CLOSED!
    const slot3 = result.slots[2];
    if (slot3.content !== 'SKIPPED' || !slot3.isSkipped || slot3.isClosed) {
      throw new Error(`Slot 3 era SKIPPED e NUNCA pode se transformar em CLOSED! Obteve: ${JSON.stringify(slot3)}`);
    }

    // Slots 5 a 10 devem estar CLOSED
    for (let pos = 5; pos <= 10; pos++) {
      const slot = result.slots[pos - 1];
      if (slot.content !== 'CLOSED' || !slot.isClosed) {
        throw new Error(`Slot ${pos} não utilizado deve ser CLOSED (═) na súmula fechada.`);
      }
    }
  });

  test('Penalidades coletivas FIBA 3x3: 7-9 faltas = 2 lances; 10+ faltas = 2 lances + posse', () => {
    const p6 = getTeamFoulPenaltyStatus(6);
    if (p6.isBonus !== false) throw new Error('Até 6 faltas não há bônus');

    const p7 = getTeamFoulPenaltyStatus(7);
    if (!p7.isBonus || p7.freeThrows !== 2 || p7.hasPossession !== false) {
      throw new Error('7ª falta deve ser 2 lances livres sem posse');
    }

    const p10 = getTeamFoulPenaltyStatus(10);
    if (!p10.isBonus || p10.freeThrows !== 2 || p10.hasPossession !== true) {
      throw new Error('10ª falta deve ser 2 lances livres + posse de bola');
    }
  });

  test('Desqualificação individual de jogador: 2 faltas U ou 1 falta D desqualificam o jogador', () => {
    const initial = createInitialState();
    // Jogador 7 comete 2 faltas U
    const ev1: GameEvent = {
      id: 'f-u-1',
      timestamp: 1000,
      type: 'FOUL_UNSPORTSMANLIKE',
      period: 'REGULAR',
      gameTimeMs: 500000,
      teamId: 'A',
      playerNumber: 7,
      skippedIndex: 1,
      foulIndex: 2,
    };
    const ev2: GameEvent = {
      id: 'f-u-2',
      timestamp: 2000,
      type: 'FOUL_UNSPORTSMANLIKE',
      period: 'REGULAR',
      gameTimeMs: 400000,
      teamId: 'A',
      playerNumber: 7,
      skippedIndex: 3,
      foulIndex: 4,
    };

    const state = reduceEvents(initial, [ev1, ev2]);
    const p7 = state.teamA.players.find(p => p.number === 7);
    if (!p7?.disqualified) throw new Error('Jogador com 2 faltas U deve ser marcado como desqualificado');
  });

  return results;
}
