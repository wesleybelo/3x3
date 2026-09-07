import { createInitialState, reduceEvents } from '../engine/EventReducer';
import { isValidStatusTransition } from '../domain/validators';
import { GameEvent } from '../types';

export interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export function runFoundationTests(): TestResult[] {
  const results: TestResult[] = [];

  const test = (name: string, fn: () => void) => {
    const start = performance.now();
    try {
      fn();
      results.push({
        suite: 'Foundation Tests',
        name,
        passed: true,
        durationMs: performance.now() - start,
      });
    } catch (err: any) {
      results.push({
        suite: 'Foundation Tests',
        name,
        passed: false,
        error: err.message || String(err),
        durationMs: performance.now() - start,
      });
    }
  };

  test('Estado inicial deve iniciar em SETUP com placar 0-0 e 10 minutos', () => {
    const state = createInitialState();
    if (state.status !== 'SETUP') throw new Error(`Status esperado SETUP, obteve ${state.status}`);
    if (state.scoreA !== 0 || state.scoreB !== 0) throw new Error('Placar inicial deve ser 0x0');
    if (state.clock.gameTimeMs !== 600000) throw new Error('Relógio inicial deve ser 600.000 ms (10:00)');
    if (state.clock.shotClockMs !== 12000) throw new Error('Shot clock inicial deve ser 12.000 ms (12s)');
    if (state.period !== 'REGULAR') throw new Error('Período inicial deve ser REGULAR');
    if (state.isClosed !== false) throw new Error('isClosed inicial deve ser falso');
  });

  test('Transições de estado válidas devem ser autorizadas', () => {
    if (!isValidStatusTransition('SETUP', 'READY')) throw new Error('SETUP -> READY deve ser válido');
    if (!isValidStatusTransition('READY', 'RUNNING')) throw new Error('READY -> RUNNING deve ser válido');
    if (!isValidStatusTransition('RUNNING', 'PAUSED')) throw new Error('RUNNING -> PAUSED deve ser válido');
    if (!isValidStatusTransition('PAUSED', 'RUNNING')) throw new Error('PAUSED -> RUNNING deve ser válido');
    if (!isValidStatusTransition('RUNNING', 'ENDED')) throw new Error('RUNNING -> ENDED deve ser válido');
    if (!isValidStatusTransition('PAUSED', 'ENDED')) throw new Error('PAUSED -> ENDED deve ser válido');
    if (!isValidStatusTransition('ENDED', 'CLOSED')) throw new Error('ENDED -> CLOSED deve ser válido');
  });

  test('Transições de estado inválidas devem ser estritamente bloqueadas', () => {
    if (isValidStatusTransition('SETUP', 'CLOSED')) throw new Error('SETUP -> CLOSED não pode ser válido');
    if (isValidStatusTransition('CLOSED', 'RUNNING')) throw new Error('CLOSED -> RUNNING não pode ser válido (Súmula selada)');
    if (isValidStatusTransition('SETUP', 'RUNNING')) throw new Error('SETUP -> RUNNING não pode pular READY');
    if (isValidStatusTransition('CLOSED', 'ENDED')) throw new Error('CLOSED é estado terminal selado');
  });

  test('EventReducer determinístico: reprodução de eventos produz o mesmo estado', () => {
    const initialState = createInitialState();
    const events: GameEvent[] = [
      {
        id: 'ev-1',
        timestamp: 1000,
        type: 'STATUS_CHANGED',
        from: 'SETUP',
        to: 'READY',
        period: 'REGULAR',
        gameTimeMs: 600000,
      },
      {
        id: 'ev-2',
        timestamp: 2000,
        type: 'CLOCK_STARTED',
        period: 'REGULAR',
        gameTimeMs: 600000,
      },
    ];

    const state1 = reduceEvents(initialState, events);
    const state2 = reduceEvents(initialState, events);

    if (state1.status !== 'RUNNING') throw new Error('Estado após CLOCK_STARTED deve ser RUNNING');
    if (state1.status !== state2.status) throw new Error('O redutor deve ser puramente determinístico');
    if (state1.clock.isRunning !== true) throw new Error('Relógio deve estar em execução');
  });

  return results;
}
