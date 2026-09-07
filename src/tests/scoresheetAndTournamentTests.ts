import { createInitialState, reduceEvents } from '../engine/EventReducer';
import { buildScoresheetModel } from '../scoresheet/ScoresheetModel';
import { auditScoresheet } from '../scoresheet/ScoresheetAudit';
import { GameEvent } from '../types';
import { TestResult } from './foundationTests';

export function runScoresheetAndTournamentTests(): TestResult[] {
  const results: TestResult[] = [];

  const test = (name: string, fn: () => void) => {
    const start = performance.now();
    try {
      fn();
      results.push({
        suite: 'Scoresheet & Tournament Tests',
        name,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        suite: 'Scoresheet & Tournament Tests',
        name,
        passed: false,
        error: err.message || String(err),
        durationMs: performance.now() - start,
      });
    }
  };

  test('Desfazer (UNDO) por eventos: remoção de falta U e reconstrução do estado e súmula', () => {
    const initial = createInitialState();
    // Sequência: 1P -> 2P -> U -> 2P -> Desfaz U
    const ev1: GameEvent = {
      id: 'e-1p',
      timestamp: 1000,
      type: 'SCORE_1PT',
      period: 'REGULAR',
      gameTimeMs: 500000,
      teamId: 'A',
      playerNumber: 4,
      newScore: 1,
    };
    const ev2: GameEvent = {
      id: 'e-2p',
      timestamp: 2000,
      type: 'SCORE_2PT',
      period: 'REGULAR',
      gameTimeMs: 480000,
      teamId: 'A',
      playerNumber: 4,
      newScore: 3,
      skippedScore: 2,
    };
    const ev3: GameEvent = {
      id: 'e-foul-u',
      timestamp: 3000,
      type: 'FOUL_UNSPORTSMANLIKE',
      period: 'REGULAR',
      gameTimeMs: 460000,
      teamId: 'A',
      playerNumber: 7,
      skippedIndex: 1,
      foulIndex: 2,
    };
    const ev4: GameEvent = {
      id: 'e-2p-2',
      timestamp: 4000,
      type: 'SCORE_2PT',
      period: 'REGULAR',
      gameTimeMs: 440000,
      teamId: 'A',
      playerNumber: 10,
      newScore: 5,
      skippedScore: 4,
    };

    // Estado antes do undo: deve ter 2 faltas coletivas (U)
    const stateBeforeUndo = reduceEvents(initial, [ev1, ev2, ev3, ev4]);
    if (stateBeforeUndo.teamA.foulsCount !== 2) throw new Error('Deveria ter 2 faltas coletivas de U antes do undo');

    // Desfaz o evento U ('e-foul-u')
    const undoEvent: GameEvent = {
      id: 'e-undo-u',
      timestamp: 5000,
      type: 'EVENT_UNDONE',
      period: 'REGULAR',
      gameTimeMs: 440000,
      undoneEventId: 'e-foul-u',
    };

    const stateAfterUndo = reduceEvents(initial, [ev1, ev2, ev3, ev4, undoEvent]);
    // Faltas coletivas devem voltar a 0!
    if (stateAfterUndo.teamA.foulsCount !== 0) {
      throw new Error(`Faltas coletivas esperadas 0 após desfazer U, obteve ${stateAfterUndo.teamA.foulsCount}`);
    }
    const p7 = stateAfterUndo.teamA.players.find(p => p.number === 7);
    if (p7?.fouls.length !== 0) {
      throw new Error('Jogador 7 não deve possuir faltas após undo');
    }
    // Pontuação permanece 5 (1 + 2 + 2)
    if (stateAfterUndo.scoreA !== 5) {
      throw new Error(`Placar esperado 5, obteve ${stateAfterUndo.scoreA}`);
    }

    const model = buildScoresheetModel(stateAfterUndo);
    if (model.teamA.foulsCount !== 0) throw new Error('Súmula deve refletir 0 faltas');
  });

  test('Selamento do Running Score: abaixo da última pontuação cria linha grossa, linha fina e diagonal', () => {
    const initial = createInitialState();
    const events: GameEvent[] = [
      {
        id: 'p-1',
        timestamp: 1000,
        type: 'SCORE_1PT',
        period: 'REGULAR',
        gameTimeMs: 300000,
        teamId: 'A',
        playerNumber: 4,
        newScore: 1,
      },
      {
        id: 'p-2',
        timestamp: 2000,
        type: 'SCORE_2PT',
        period: 'REGULAR',
        gameTimeMs: 200000,
        teamId: 'A',
        playerNumber: 4,
        newScore: 3,
        skippedScore: 2,
      },
      {
        id: 'end',
        timestamp: 3000,
        type: 'GAME_ENDED',
        period: 'REGULAR',
        gameTimeMs: 0,
        winner: 'A',
        finalScoreA: 3,
        finalScoreB: 0,
        reason: 'TIME_EXPIRED',
      },
      {
        id: 'close',
        timestamp: 4000,
        type: 'SCORESHEET_CLOSED',
        period: 'REGULAR',
        gameTimeMs: 0,
        closedAt: 4000,
      },
    ];

    const state = reduceEvents(initial, events);
    const model = buildScoresheetModel(state);

    if (!model.sealing.isSealed) throw new Error('Súmula fechada deve ter isSealed = true');
    if (model.sealing.teamA.lastPointScored !== 3) {
      throw new Error(`Último ponto de A esperado 3, obteve ${model.sealing.teamA.lastPointScored}`);
    }
    if (model.sealing.teamA.diagonalStartRow !== 4) {
      throw new Error(`Diagonal de selamento deve iniciar na linha 4, obteve ${model.sealing.teamA.diagonalStartRow}`);
    }
  });

  test('Campo de Protesto: sem protesto recebe duas linhas cruzadas (X); com protesto preserva dados', () => {
    const initial = createInitialState();
    // Sem protesto e fechada
    const stateNoProtest = reduceEvents(initial, [
      {
        id: 'close-np',
        timestamp: 1000,
        type: 'SCORESHEET_CLOSED',
        period: 'REGULAR',
        gameTimeMs: 0,
        closedAt: 1000,
      },
    ]);
    const modelNoProtest = buildScoresheetModel(stateNoProtest);
    if (!modelNoProtest.protest.drawX) throw new Error('Sem protesto na súmula fechada deve desenhar X');

    // Com protesto
    const stateProtest = reduceEvents(initial, [
      {
        id: 'prot-ev',
        timestamp: 1000,
        type: 'PROTEST_RECORDED',
        period: 'REGULAR',
        gameTimeMs: 0,
        hasProtest: true,
        protestReason: 'Não validação de cesta no último segundo',
        protestCaptainNumber: 4,
      },
      {
        id: 'close-p',
        timestamp: 2000,
        type: 'SCORESHEET_CLOSED',
        period: 'REGULAR',
        gameTimeMs: 0,
        closedAt: 2000,
      },
    ]);
    const modelProtest = buildScoresheetModel(stateProtest);
    if (modelProtest.protest.drawX) throw new Error('Com protesto NÃO deve desenhar X de ausência');
    if (modelProtest.protest.reason !== 'Não validação de cesta no último segundo') {
      throw new Error('Motivo do protesto deve ser preservado');
    }
  });

  test('TESTE COMPLETO DE INTEGRAÇÃO (Seção 27): SETUP -> READY -> START -> 1P -> 2P -> FT -> P -> U -> D -> UNDO -> 2P -> END -> SIGN -> CLOSE -> AUDIT', () => {
    let state = createInitialState();

    const events: GameEvent[] = [
      // 1. SETUP -> READY
      {
        id: 'it-1',
        timestamp: 1000,
        type: 'STATUS_CHANGED',
        from: 'SETUP',
        to: 'READY',
        period: 'REGULAR',
        gameTimeMs: 600000,
      },
      // 2. READY -> START (RUNNING)
      {
        id: 'it-2',
        timestamp: 2000,
        type: 'CLOCK_STARTED',
        period: 'REGULAR',
        gameTimeMs: 600000,
      },
      // 3. 1P (Jogador 4 da equipe A marca 1P -> placar 1)
      {
        id: 'it-3',
        timestamp: 3000,
        type: 'SCORE_1PT',
        period: 'REGULAR',
        gameTimeMs: 580000,
        teamId: 'A',
        playerNumber: 4,
        newScore: 1,
      },
      // 4. 2P (Jogador 7 da equipe A marca 2P -> linha 2 SKIPPED, linha 3 recebe ◯ 7 -> placar 3)
      {
        id: 'it-4',
        timestamp: 4000,
        type: 'SCORE_2PT',
        period: 'REGULAR',
        gameTimeMs: 560000,
        teamId: 'A',
        playerNumber: 7,
        newScore: 3,
        skippedScore: 2,
      },
      // 5. FREE THROW (Jogador 10 da equipe A converte FT -> linha 4 ● 10 -> placar 4)
      {
        id: 'it-5',
        timestamp: 5000,
        type: 'FREE_THROW_MADE',
        period: 'REGULAR',
        gameTimeMs: 540000,
        teamId: 'A',
        playerNumber: 10,
        newScore: 4,
      },
      // 6. P (Jogador 5 da equipe B comete falta pessoal P -> pos 1 com P)
      {
        id: 'it-6',
        timestamp: 6000,
        type: 'FOUL_PERSONAL',
        period: 'REGULAR',
        gameTimeMs: 520000,
        teamId: 'B',
        playerNumber: 5,
        foulIndex: 1,
      },
      // 7. U (Jogador 8 da equipe B comete falta antidesportiva U -> pos 2 SKIPPED, pos 3 U)
      {
        id: 'it-7',
        timestamp: 7000,
        type: 'FOUL_UNSPORTSMANLIKE',
        period: 'REGULAR',
        gameTimeMs: 500000,
        teamId: 'B',
        playerNumber: 8,
        skippedIndex: 2,
        foulIndex: 3,
      },
      // 8. D (Jogador 12 da equipe B comete falta desqualificante D -> pos 4 SKIPPED, pos 5 D)
      {
        id: 'it-8',
        timestamp: 8000,
        type: 'FOUL_DISQUALIFYING',
        period: 'REGULAR',
        gameTimeMs: 480000,
        teamId: 'B',
        playerNumber: 12,
        skippedIndex: 4,
        foulIndex: 5,
      },
      // 9. UNDO (Desfaz o evento D 'it-8')
      {
        id: 'it-9',
        timestamp: 9000,
        type: 'EVENT_UNDONE',
        period: 'REGULAR',
        gameTimeMs: 480000,
        undoneEventId: 'it-8',
      },
      // 10. 2P (Jogador 4 da equipe A marca outra cesta de 2P -> linha 5 SKIPPED, linha 6 ◯ 4 -> placar 6)
      {
        id: 'it-10',
        timestamp: 10000,
        type: 'SCORE_2PT',
        period: 'REGULAR',
        gameTimeMs: 460000,
        teamId: 'A',
        playerNumber: 4,
        newScore: 6,
        skippedScore: 5,
      },
      // 11. END (Encerramento da partida)
      {
        id: 'it-11',
        timestamp: 11000,
        type: 'GAME_ENDED',
        period: 'REGULAR',
        gameTimeMs: 0,
        winner: 'A',
        finalScoreA: 6,
        finalScoreB: 0,
        reason: 'TIME_EXPIRED',
      },
      // 12. SIGN (Assinatura do Apontador e do Árbitro)
      {
        id: 'it-12',
        timestamp: 12000,
        type: 'SCORESHEET_SIGNED',
        period: 'REGULAR',
        gameTimeMs: 0,
        role: 'SCORER',
        signature: 'Carlos Scorer Oficial',
        signerName: 'Carlos Silva (Apontador Oficial)',
      },
      {
        id: 'it-13',
        timestamp: 13000,
        type: 'SCORESHEET_SIGNED',
        period: 'REGULAR',
        gameTimeMs: 0,
        role: 'REFEREE',
        signature: 'Marcos Árbitro FIBA',
        signerName: 'Marcos Rocha (Árbitro Principal)',
      },
      // 13. CLOSE (Fechamento e selamento oficial)
      {
        id: 'it-14',
        timestamp: 14000,
        type: 'SCORESHEET_CLOSED',
        period: 'REGULAR',
        gameTimeMs: 0,
        closedAt: 14000,
      },
    ];

    state = reduceEvents(state, events);

    // Validações pós-redução
    if (state.status !== 'CLOSED') throw new Error(`Status esperado CLOSED, obteve ${state.status}`);
    if (state.scoreA !== 6) throw new Error(`Placar A esperado 6, obteve ${state.scoreA}`);
    if (state.scoreB !== 0) throw new Error(`Placar B esperado 0, obteve ${state.scoreB}`);
    if (state.winner !== 'A') throw new Error(`Vencedor esperado A, obteve ${state.winner}`);

    // Faltas da Equipe B: tinha P (1) + U (2) + D (2) = 5. Como D foi desfeita, deve ter exatamente 3!
    if (state.teamB.foulsCount !== 3) {
      throw new Error(`Faltas coletivas de B esperadas 3 (P=1 + U=2), obteve ${state.teamB.foulsCount}`);
    }

    // 14. AUDIT (Executa auditoria oficial)
    const report = auditScoresheet(state);
    if (!report.valid) {
      throw new Error(`Auditoria oficial falhou com erros: ${report.errors.join('; ')}`);
    }
    if (!report.scoreValid) throw new Error('Validação de pontuação da auditoria falhou');
    if (!report.foulsValid) throw new Error('Validação de faltas da auditoria falhou');
    if (!report.closureValid) throw new Error('Validação de encerramento da auditoria falhou');
    if (!report.consistencyValid) throw new Error('Validação de consistência da auditoria falhou');
  });

  return results;
}
