import { GameState } from '../types';

const STORAGE_KEY = 'fiba3x3_official_scoresheet_state_v1';
const SAVED_MATCHES_KEY = 'fiba3x3_saved_matches_history_v1';

export interface SavedMatchRecord {
  id: string;
  savedAt: number;
  dateFormatted: string;
  timeFormatted: string;
  matchNumber: string;
  tournamentName: string;
  category: string;
  pool: string;
  court: string;
  teamAName: string;
  teamAShortName: string;
  teamBName: string;
  teamBShortName: string;
  scoreA: number;
  scoreB: number;
  winner?: 'A' | 'B';
  endReason?: string;
  isClosed: boolean;
  status: string;
  eventsCount: number;
  referee1Name?: string;
  referee2Name?: string;
  state: GameState;
}

/**
 * Salva o estado completo da partida no LocalStorage com proteção contra erros de cota e serialização.
 */
export function saveGameState(state: GameState): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const serialized = JSON.stringify(state);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    return true;
  } catch (err) {
    console.warn('Não foi possível persistir o estado no LocalStorage:', err);
    return false;
  }
}

/**
 * Carrega o estado persistido da partida do LocalStorage.
 * Caso o relógio estivesse correndo no momento do fechamento da aba,
 * o estado é restaurado de forma segura em modo PAUSADO para evitar descompasso de tempo.
 */
export function loadGameState(): GameState | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as GameState;

    // Validação mínima de integridade da estrutura do estado central
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !parsed.matchInfo ||
      !parsed.teamA ||
      !parsed.teamB ||
      !Array.isArray(parsed.events)
    ) {
      return null;
    }

    // Trava de segurança: se estava RUNNING, restaura pausado para permitir conferência do operador
    if (parsed.clock && parsed.clock.isRunning) {
      parsed.clock.isRunning = false;
      parsed.clock.lastTickTimestamp = undefined;
      if (parsed.status === 'RUNNING') {
        parsed.status = 'PAUSED';
      }
    }

    return parsed;
  } catch (err) {
    console.warn('Erro ao carregar estado do LocalStorage:', err);
    return null;
  }
}

/**
 * Limpa o estado persistido da partida ativa.
 */
export function clearGameState(): void {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('Erro ao limpar LocalStorage:', err);
  }
}

/**
 * Retorna a lista de partidas salvas do histórico.
 */
export function getSavedMatches(): SavedMatchRecord[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_MATCHES_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.warn('Erro ao carregar partidas salvas:', err);
    return [];
  }
}

/**
 * Salva uma partida no repositório de histórico "Partidas Salvas".
 */
export function saveMatchToHistory(state: GameState): SavedMatchRecord | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const matches = getSavedMatches();
    const now = new Date();
    const dateFormatted = state.matchInfo?.date || now.toLocaleDateString('pt-BR');
    const timeFormatted =
      state.matchInfo?.time ||
      now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    // ID único baseado no número do jogo e timestamps
    const matchId = `match_${state.matchInfo?.matchNumber || 'M'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    // Snapshot garantindo relógio pausado
    const stateSnapshot: GameState = {
      ...state,
      clock: {
        ...state.clock,
        isRunning: false,
        lastTickTimestamp: undefined,
      },
      status: state.status === 'RUNNING' ? 'PAUSED' : state.status,
    };

    const record: SavedMatchRecord = {
      id: matchId,
      savedAt: Date.now(),
      dateFormatted,
      timeFormatted,
      matchNumber: state.matchInfo?.matchNumber || '1',
      tournamentName: state.matchInfo?.tournamentName || 'Torneio Oficial FIBA 3x3',
      category: state.matchInfo?.category || 'Masculino Aberto',
      pool: state.matchInfo?.pool || 'A',
      court: state.matchInfo?.court || 'Principal',
      teamAName: state.teamA?.name || 'Equipe A',
      teamAShortName: state.teamA?.shortName || 'EQA',
      teamBName: state.teamB?.name || 'Equipe B',
      teamBShortName: state.teamB?.shortName || 'EQB',
      scoreA: state.scoreA || 0,
      scoreB: state.scoreB || 0,
      winner: state.winner,
      endReason: state.endReason,
      isClosed: Boolean(state.isClosed),
      status: state.status,
      eventsCount: state.events?.length || 0,
      referee1Name: state.signatures?.refereeName || state.matchInfo?.referee1Name,
      referee2Name: state.signatures?.referee2Name || state.matchInfo?.referee2Name,
      state: stateSnapshot,
    };

    // Adiciona no início da lista
    const updatedMatches = [record, ...matches.filter(m => m.id !== matchId)];
    window.localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(updatedMatches));
    return record;
  } catch (err) {
    console.warn('Erro ao salvar partida no histórico:', err);
    return null;
  }
}

/**
 * Remove uma partida específica do histórico.
 */
export function deleteSavedMatch(id: string): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    const matches = getSavedMatches();
    const filtered = matches.filter(m => m.id !== id);
    window.localStorage.setItem(SAVED_MATCHES_KEY, JSON.stringify(filtered));
    return true;
  } catch (err) {
    console.warn('Erro ao excluir partida salva:', err);
    return false;
  }
}

/**
 * Limpa todo o histórico de partidas salvas.
 */
export function clearAllSavedMatches(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) {
    return false;
  }

  try {
    window.localStorage.removeItem(SAVED_MATCHES_KEY);
    return true;
  } catch (err) {
    console.warn('Erro ao limpar todas as partidas salvas:', err);
    return false;
  }
}

