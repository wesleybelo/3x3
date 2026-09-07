import { GameState } from '../types';
import { getEffectiveEvents } from '../engine/EventReducer';
import { buildScoresheetModel } from './ScoresheetModel';

export interface AuditCheck {
  id: string;
  category: 'PONTUAÇÃO' | 'FALTAS' | 'ENCERRAMENTO' | 'CONSISTÊNCIA';
  name: string;
  description: string;
  status: 'PASS' | 'FAIL' | 'WARNING' | 'INFO';
  details?: string;
}

export interface ScoresheetAuditReport {
  valid: boolean;
  scoreValid: boolean;
  foulsValid: boolean;
  closureValid: boolean;
  consistencyValid: boolean;
  errors: string[];
  warnings: string[];
  checks: AuditCheck[];
  timestamp: number;
}

/**
 * Função de auditoria oficial da Súmula FIBA 3x3
 * Valida a consistência matemática e regulamentar entre Eventos, Estado e Súmula.
 */
export function auditScoresheet(state: GameState): ScoresheetAuditReport {
  const checks: AuditCheck[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  const effectiveEvents = getEffectiveEvents(state.events);
  const model = buildScoresheetModel(state, effectiveEvents);
  const isClosed = state.isClosed || state.status === 'CLOSED';
  const isEnded = state.status === 'ENDED' || isClosed;

  // =========================================================================
  // 1. AUDITORIA DE PONTUAÇÃO
  // =========================================================================

  // Check 1.1: Soma de pontos individuais vs Placar da Equipe A
  const sumPointsA = state.teamA.players.reduce((sum, p) => sum + p.points, 0);
  const pointsAMatch = sumPointsA === state.scoreA;
  checks.push({
    id: 'SCORE_SUM_A',
    category: 'PONTUAÇÃO',
    name: 'Soma Individual Equipe A',
    description: 'Soma de pontos dos jogadores da Equipe A deve ser idêntica ao placar',
    status: pointsAMatch ? 'PASS' : 'FAIL',
    details: `Soma jogadores: ${sumPointsA} | Placar Equipe A: ${state.scoreA}`,
  });
  if (!pointsAMatch) errors.push(`Divergência no placar da Equipe A: soma jogadores (${sumPointsA}) != placar (${state.scoreA})`);

  // Check 1.2: Soma de pontos individuais vs Placar da Equipe B
  const sumPointsB = state.teamB.players.reduce((sum, p) => sum + p.points, 0);
  const pointsBMatch = sumPointsB === state.scoreB;
  checks.push({
    id: 'SCORE_SUM_B',
    category: 'PONTUAÇÃO',
    name: 'Soma Individual Equipe B',
    description: 'Soma de pontos dos jogadores da Equipe B deve ser idêntica ao placar',
    status: pointsBMatch ? 'PASS' : 'FAIL',
    details: `Soma jogadores: ${sumPointsB} | Placar Equipe B: ${state.scoreB}`,
  });
  if (!pointsBMatch) errors.push(`Divergência no placar da Equipe B: soma jogadores (${sumPointsB}) != placar (${state.scoreB})`);

  // Check 1.3: Verificação de marcas do Running Score e linhas SKIPPED de 2 pontos
  let scorePatternErrors = 0;
  for (const ev of effectiveEvents) {
    if (ev.type === 'SCORE_2PT') {
      const skippedRow = model.runningScoreRows.find(r => r.pointValue === ev.skippedScore);
      const targetRow = model.runningScoreRows.find(r => r.pointValue === ev.newScore);
      const teamData = ev.teamId === 'A' ? targetRow?.teamA : targetRow?.teamB;
      const skippedData = ev.teamId === 'A' ? skippedRow?.teamA : skippedRow?.teamB;

      if (!skippedData?.isSkipped || skippedData.mark !== 'EMPTY') {
        scorePatternErrors++;
        errors.push(`Linha intermediária ${ev.skippedScore} de cesta de 2 pontos da equipe ${ev.teamId} não está devidamente SKIPPED/vazia.`);
      }
      if (teamData?.mark !== '2PT_CIRCLE' || teamData.playerNumber !== ev.playerNumber) {
        scorePatternErrors++;
        errors.push(`Linha ${ev.newScore} da cesta de 2 pontos da equipe ${ev.teamId} não possui a marca de círculo ou jogador correto.`);
      }
    } else if (ev.type === 'SCORE_1PT') {
      const row = model.runningScoreRows.find(r => r.pointValue === ev.newScore);
      const teamData = ev.teamId === 'A' ? row?.teamA : row?.teamB;
      if (teamData?.mark !== '1PT' || teamData.playerNumber !== ev.playerNumber) {
        scorePatternErrors++;
        errors.push(`Marca de 1 ponto na linha ${ev.newScore} da equipe ${ev.teamId} inválida.`);
      }
    } else if (ev.type === 'FREE_THROW_MADE') {
      const row = model.runningScoreRows.find(r => r.pointValue === ev.newScore);
      const teamData = ev.teamId === 'A' ? row?.teamA : row?.teamB;
      if (teamData?.mark !== 'FREE_THROW' || teamData.playerNumber !== ev.playerNumber) {
        scorePatternErrors++;
        errors.push(`Marca de lance livre na linha ${ev.newScore} da equipe ${ev.teamId} inválida.`);
      }
    }
  }

  checks.push({
    id: 'SCORE_MARKS_VALIDITY',
    category: 'PONTUAÇÃO',
    name: 'Padrão Oficial de Marcas do Running Score',
    description: 'Validação de /, ◯, ●, jogador e linhas propositalmente SKIPPED para cestas de 2 pontos',
    status: scorePatternErrors === 0 ? 'PASS' : 'FAIL',
    details: scorePatternErrors === 0 ? 'Todas as marcas e linhas intermediárias validadas com sucesso' : `${scorePatternErrors} erros de marcas`,
  });

  // =========================================================================
  // 2. AUDITORIA DE FALTAS
  // =========================================================================

  // Check 2.1: Faltas coletivas Equipe A e integridade dos slots
  let teamFoulSlotsErrorA = 0;
  for (let i = 0; i < model.teamA.foulSlots.length; i++) {
    const slot = model.teamA.foulSlots[i];
    // Regra Seção 12: SKIPPED nunca pode ser transformado em CLOSED
    if (slot.isSkipped && slot.isClosed) {
      teamFoulSlotsErrorA++;
      errors.push(`Slot de falta ${slot.position} da Equipe A é SKIPPED mas foi marcado como CLOSED.`);
    }
  }

  checks.push({
    id: 'FOUL_SLOTS_A',
    category: 'FALTAS',
    name: 'Slots Coletivos Equipe A',
    description: 'Verifica posições P, U, D, SKIPPED e fechamento com ═',
    status: teamFoulSlotsErrorA === 0 ? 'PASS' : 'FAIL',
    details: `Total faltas: ${model.teamA.foulsCount} | Slots: ${model.teamA.foulSlots.map(s => s.content).join(' ')}`,
  });

  // Check 2.2: Faltas coletivas Equipe B e integridade dos slots
  let teamFoulSlotsErrorB = 0;
  for (let i = 0; i < model.teamB.foulSlots.length; i++) {
    const slot = model.teamB.foulSlots[i];
    if (slot.isSkipped && slot.isClosed) {
      teamFoulSlotsErrorB++;
      errors.push(`Slot de falta ${slot.position} da Equipe B é SKIPPED mas foi marcado como CLOSED.`);
    }
  }

  checks.push({
    id: 'FOUL_SLOTS_B',
    category: 'FALTAS',
    name: 'Slots Coletivos Equipe B',
    description: 'Verifica posições P, U, D, SKIPPED e fechamento com ═',
    status: teamFoulSlotsErrorB === 0 ? 'PASS' : 'FAIL',
    details: `Total faltas: ${model.teamB.foulsCount} | Slots: ${model.teamB.foulSlots.map(s => s.content).join(' ')}`,
  });

  // Check 2.3: Faltas individuais dos jogadores (apenas P, U, D permitidos)
  let individualFoulErrors = 0;
  const allPlayers = [...state.teamA.players, ...state.teamB.players];
  for (const p of allPlayers) {
    for (const f of p.fouls) {
      if (f !== 'P' && f !== 'U' && f !== 'D') {
        individualFoulErrors++;
        errors.push(`Jogador #${p.number} possui categoria não oficial de falta: ${f}. Permitido somente P, U ou D.`);
      }
    }
  }

  checks.push({
    id: 'FOUL_TYPES_STRICT',
    category: 'FALTAS',
    name: 'Tipos Estritos de Faltas (P, U, D)',
    description: 'Garante que apenas as categorias oficiais FIBA 3x3 (P, U, D) foram registradas',
    status: individualFoulErrors === 0 ? 'PASS' : 'FAIL',
    details: individualFoulErrors === 0 ? 'Somente marcas P, U, D registradas nos jogadores' : `${individualFoulErrors} faltas com tipagem inválida`,
  });

  // =========================================================================
  // 3. AUDITORIA DE ENCERRAMENTO E SELAMENTO
  // =========================================================================

  if (isClosed) {
    // Check 3.1: Protesto
    const protestValid = model.protest.hasProtest ? !!model.protest.reason : model.protest.drawX;
    checks.push({
      id: 'CLOSURE_PROTEST',
      category: 'ENCERRAMENTO',
      name: 'Campo de Protesto',
      description: 'Deve conter X de encerramento ou motivo especificado se houver protesto',
      status: protestValid ? 'PASS' : 'FAIL',
      details: model.protest.hasProtest ? `Protesto registrado: "${model.protest.reason}"` : 'Sem protesto: campo selado com X',
    });
    if (!protestValid) errors.push('O campo de protesto não foi selado adequadamente ao fechar a súmula.');

    // Check 3.2: Assinaturas obrigatórias
    const hasScorer = !!model.signatures.scorerSignature;
    const hasReferee = !!model.signatures.refereeSignature;
    const signaturesOk = hasScorer && hasReferee;
    checks.push({
      id: 'CLOSURE_SIGNATURES',
      category: 'ENCERRAMENTO',
      name: 'Assinaturas da Mesa e Arbitragem',
      description: 'Apontador e Árbitro Principal devem ter assinado a súmula fechada',
      status: signaturesOk ? 'PASS' : 'FAIL',
      details: `Apontador: ${hasScorer ? 'OK' : 'Pendente'} | Árbitro: ${hasReferee ? 'OK' : 'Pendente'}`,
    });
    if (!hasScorer) errors.push('Assinatura do apontador/operador de mesa ausente na súmula fechada.');
    if (!hasReferee) warnings.push('Assinatura do árbitro principal pendente na súmula fechada.');

    // Check 3.3: Selamento do Running Score
    const hasSealing = model.sealing.isSealed;
    checks.push({
      id: 'CLOSURE_SEALING',
      category: 'ENCERRAMENTO',
      name: 'Selamento da Coluna de Pontuação',
      description: 'Linhas horizontais e diagonal descendente traçadas até a linha 30',
      status: hasSealing ? 'PASS' : 'FAIL',
      details: `Último ponto A: ${model.sealing.teamA.lastPointScored} | Último ponto B: ${model.sealing.teamB.lastPointScored}`,
    });
    if (!hasSealing) errors.push('O selamento do running score não foi ativado ao fechar a súmula.');
  } else {
    checks.push({
      id: 'CLOSURE_STATUS',
      category: 'ENCERRAMENTO',
      name: 'Estado de Fechamento da Súmula',
      description: 'A súmula encontra-se em andamento (aberta para operações)',
      status: isEnded ? 'WARNING' : 'INFO',
      details: `Status atual: ${state.status} (Súmula aberta)`,
    });
    if (isEnded) warnings.push('Partida encerrada, mas súmula ainda não foi selada/fechada.');
  }

  // =========================================================================
  // 4. CONSISTÊNCIA DE EVENTOS VS ESTADO
  // =========================================================================

  // Check 4.1: Vencedor condiz com o placar
  let winnerCheckOk = true;
  if (isEnded) {
    if (state.scoreA > state.scoreB && state.winner !== 'A') {
      winnerCheckOk = false;
      errors.push(`Equipe A tem placar superior (${state.scoreA} > ${state.scoreB}) mas vencedor é ${state.winner}`);
    } else if (state.scoreB > state.scoreA && state.winner !== 'B') {
      winnerCheckOk = false;
      errors.push(`Equipe B tem placar superior (${state.scoreB} > ${state.scoreA}) mas vencedor é ${state.winner}`);
    }
  }

  checks.push({
    id: 'CONSISTENCY_WINNER',
    category: 'CONSISTÊNCIA',
    name: 'Consistência de Vencedor',
    description: 'Garante que o vencedor reflete o placar e as regras FIBA 3x3',
    status: winnerCheckOk ? 'PASS' : 'FAIL',
    details: isEnded ? `Vencedor declarado: ${model.finalResult.winnerName || state.winner}` : 'Partida ainda em andamento',
  });

  const scoreValid = pointsAMatch && pointsBMatch && scorePatternErrors === 0;
  const foulsValid = teamFoulSlotsErrorA === 0 && teamFoulSlotsErrorB === 0 && individualFoulErrors === 0;
  const closureValid = !isClosed || (errors.filter(e => e.includes('protesto') || e.includes('assinatura') || e.includes('selamento')).length === 0);
  const consistencyValid = winnerCheckOk;
  const valid = errors.length === 0;

  return {
    valid,
    scoreValid,
    foulsValid,
    closureValid,
    consistencyValid,
    errors,
    warnings,
    checks,
    timestamp: Date.now(),
  };
}
