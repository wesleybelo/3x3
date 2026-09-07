import { createInitialState, reduceEvents } from '../engine/EventReducer';
import { buildScoresheetModel } from '../scoresheet/ScoresheetModel';
import { GameEvent } from '../types';
import { TestResult } from './foundationTests';

export function runScoringEngineTests(): TestResult[] {
  const results: TestResult[] = [];

  const test = (name: string, fn: () => void) => {
    const start = performance.now();
    try {
      fn();
      results.push({
        suite: 'Scoring Engine Tests',
        name,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        suite: 'Scoring Engine Tests',
        name,
        passed: false,
        error: err.message || String(err),
        durationMs: performance.now() - start,
      });
    }
  };

  test('Cesta de 1 ponto: incrementa placar em 1, pontuação do jogador e marca / no running score', () => {
    const initial = createInitialState();
    const event: GameEvent = {
      id: 'sc-1',
      timestamp: 1000,
      type: 'SCORE_1PT',
      period: 'REGULAR',
      gameTimeMs: 580000,
      teamId: 'A',
      playerNumber: 4,
      newScore: 1,
    };

    const state = reduceEvents(initial, [event]);
    if (state.scoreA !== 1) throw new Error(`Placar A esperado 1, obteve ${state.scoreA}`);
    const player = state.teamA.players.find(p => p.number === 4);
    if (player?.points !== 1) throw new Error(`Pontos do jogador 4 esperado 1, obteve ${player?.points}`);
    if (!player?.played) throw new Error('Jogador deve ter played = true');

    const model = buildScoresheetModel(state);
    const row1 = model.runningScoreRows.find(r => r.pointValue === 1);
    if (row1?.teamA.mark !== '1PT') throw new Error(`Marca esperada 1PT, obteve ${row1?.teamA.mark}`);
    if (row1?.teamA.playerNumber !== 4) throw new Error(`Número do jogador na súmula esperado 4, obteve ${row1?.teamA.playerNumber}`);
  });

  test('Cesta de 2 pontos: linha intermediária deve ser SKIPPED (vazia) e novo total recebe ◯ e jogador', () => {
    const initial = createInitialState();
    // Cenário: Placar 5 -> Cesta de 2 -> 7
    const events: GameEvent[] = [
      // 5 cestas de 1 ponto para chegar a 5
      ...([1, 2, 3, 4, 5].map(score => ({
        id: `sc-1p-${score}`,
        timestamp: score * 1000,
        type: 'SCORE_1PT' as const,
        period: 'REGULAR' as const,
        gameTimeMs: 500000 - score * 1000,
        teamId: 'A' as const,
        playerNumber: 7,
        newScore: score,
      }))),
      // Cesta de 2 pontos do jogador 4 (Linha 6: VAZIA; Linha 7: ◯ 4)
      {
        id: 'sc-2p-7',
        timestamp: 6000,
        type: 'SCORE_2PT',
        period: 'REGULAR',
        gameTimeMs: 490000,
        teamId: 'A',
        playerNumber: 4,
        newScore: 7,
        skippedScore: 6,
      },
    ];

    const state = reduceEvents(initial, events);
    if (state.scoreA !== 7) throw new Error(`Placar A esperado 7, obteve ${state.scoreA}`);
    const player4 = state.teamA.players.find(p => p.number === 4);
    if (player4?.points !== 2) throw new Error(`Pontos do jogador 4 esperado 2, obteve ${player4?.points}`);

    const model = buildScoresheetModel(state);
    const row6 = model.runningScoreRows.find(r => r.pointValue === 6);
    const row7 = model.runningScoreRows.find(r => r.pointValue === 7);

    // Linha 6: VAZIA (SKIPPED)
    if (!row6?.teamA.isSkipped || row6.teamA.mark !== 'EMPTY') {
      throw new Error(`Linha 6 deve ser estritamente SKIPPED e EMPTY, obteve mark=${row6?.teamA.mark}, isSkipped=${row6?.teamA.isSkipped}`);
    }
    if (row6.teamA.playerNumber !== undefined) {
      throw new Error('Linha 6 não pode ter número de jogador associado');
    }

    // Linha 7: ◯ 4
    if (row7?.teamA.mark !== '2PT_CIRCLE') {
      throw new Error(`Linha 7 deve ter marca 2PT_CIRCLE, obteve ${row7?.teamA.mark}`);
    }
    if (row7.teamA.playerNumber !== 4) {
      throw new Error(`Linha 7 deve ter o jogador 4, obteve ${row7.teamA.playerNumber}`);
    }
  });

  test('Lance livre: convertido gera ● no running score; perdido não altera pontuação', () => {
    const initial = createInitialState();
    const ftMade: GameEvent = {
      id: 'ft-1',
      timestamp: 1000,
      type: 'FREE_THROW_MADE',
      period: 'REGULAR',
      gameTimeMs: 450000,
      teamId: 'B',
      playerNumber: 8,
      newScore: 1,
    };
    const ftMiss: GameEvent = {
      id: 'ft-2',
      timestamp: 2000,
      type: 'FREE_THROW_MISSED',
      period: 'REGULAR',
      gameTimeMs: 440000,
      teamId: 'B',
      playerNumber: 8,
    };

    const state = reduceEvents(initial, [ftMade, ftMiss]);
    if (state.scoreB !== 1) throw new Error(`Placar B esperado 1, obteve ${state.scoreB}`);
    const model = buildScoresheetModel(state);
    const row1B = model.runningScoreRows.find(r => r.pointValue === 1);
    if (row1B?.teamB.mark !== 'FREE_THROW') throw new Error(`Marca de FT esperada FREE_THROW, obteve ${row1B?.teamB.mark}`);
    if (row1B?.teamB.playerNumber !== 8) throw new Error('Jogador 8 deve constar na linha 1');

    const row2B = model.runningScoreRows.find(r => r.pointValue === 2);
    if (row2B?.teamB.mark !== 'EMPTY') throw new Error('Linha 2 de B deve estar vazia após lance livre perdido');
  });

  test('Vitória por limite de 21 pontos (Sudden Death FIBA 3x3)', () => {
    let state = createInitialState();
    const events: GameEvent[] = [];
    for (let i = 1; i <= 21; i++) {
      events.push({
        id: `pts-${i}`,
        timestamp: i * 1000,
        type: 'SCORE_1PT',
        period: 'REGULAR',
        gameTimeMs: 500000 - i * 1000,
        teamId: 'A',
        playerNumber: 10,
        newScore: i,
      });
    }

    state = reduceEvents(state, events);
    if (state.scoreA !== 21) throw new Error('Placar deve ser 21');
    if (state.winner !== 'A') throw new Error('Vencedor deve ser Equipe A ao atingir 21 pontos');
    if (state.status !== 'ENDED') throw new Error('Status do jogo deve mudar para ENDED');
  });

  test('Regra de Overtime no 3x3: primeira equipe a marcar 2 pontos vence', () => {
    let state = createInitialState();
    // Regular termina empatado 15 x 15
    const events: GameEvent[] = [];
    for (let i = 1; i <= 15; i++) {
      events.push({
        id: `ot-a-${i}`,
        timestamp: i * 1000,
        type: 'SCORE_1PT',
        period: 'REGULAR',
        gameTimeMs: 500000,
        teamId: 'A',
        playerNumber: 4,
        newScore: i,
      });
      events.push({
        id: `ot-b-${i}`,
        timestamp: i * 1000 + 500,
        type: 'SCORE_1PT',
        period: 'REGULAR',
        gameTimeMs: 500000,
        teamId: 'B',
        playerNumber: 5,
        newScore: i,
      });
    }
    // Muda para período de OVERTIME
    events.push({
      id: 'ot-start',
      timestamp: 30000,
      type: 'PERIOD_CHANGED',
      period: 'OVERTIME',
      gameTimeMs: 0,
    });

    state = reduceEvents(createInitialState(), events);
    if (state.period !== 'OVERTIME') throw new Error('Período deve ser OVERTIME');
    if (state.overtimeTargetA !== 17 || state.overtimeTargetB !== 17) {
      throw new Error(`Meta do Overtime esperada 17, obteve A=${state.overtimeTargetA} B=${state.overtimeTargetB}`);
    }

    // Equipe B marca uma cesta de 2 pontos (vai direto de 15 para 17)
    events.push({
      id: 'ot-win-shot',
      timestamp: 35000,
      type: 'SCORE_2PT',
      period: 'OVERTIME',
      gameTimeMs: 0,
      teamId: 'B',
      playerNumber: 8,
      newScore: 17,
      skippedScore: 16,
    });

    state = reduceEvents(createInitialState(), events);
    if (state.scoreB !== 17) throw new Error('Placar B deve ser 17');
    if (state.winner !== 'B') throw new Error('Vencedor no overtime deve ser Equipe B');
    if (state.status !== 'ENDED') throw new Error('Partida deve encerrar após meta de overtime');
  });

  return results;
}
