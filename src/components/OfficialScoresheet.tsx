import React, { useState } from 'react';
import { OfficialScoresheetModel, RunningScoreRow } from '../scoresheet/ScoresheetModel';
import { TeamFoulSlot } from '../types';
import { FpbLogo, Fiba3x3Logo, HandTwoFingersIcon, HandTwoFingersWithBallIcon } from './ScoresheetIcons';
import { ShieldCheck, CheckCircle2, AlertTriangle, Printer, Trophy } from 'lucide-react';

interface OfficialScoresheetProps {
  model: OfficialScoresheetModel;
}

const OfficialScoresheetComponent: React.FC<OfficialScoresheetProps> = ({ model }) => {
  const {
    teamA,
    teamB,
    runningScoreRows,
    sealing,
    protest,
    signatures,
    finalResult,
    matchInfo,
    isClosed,
  } = model;

  // Alternador entre Súmula Preenchida (Ao Vivo) e Súmula em Branco (Oficial para Impressão)
  const [viewMode, setViewMode] = useState<'FILLED' | 'BLANK'>('FILLED');

  const handlePrint = () => {
    window.print();
  };

  const isBlank = viewMode === 'BLANK';
  const winnerName = isBlank
    ? ''
    : finalResult.winnerName ||
      (finalResult.winnerTeamId === 'A' ? teamA.name : finalResult.winnerTeamId === 'B' ? teamB.name : undefined);

  // Determinar a equipe vencedora do sorteio da moeda / posse inicial (Check-Ball)
  // No FIBA 3x3 EX3, a marcação *CB é exclusiva da equipe que ganhou a primeira posse
  const coinTossPossession = matchInfo.coinToss?.firstPossessionTeamId || matchInfo.coinToss?.winnerTeamId;
  const isCheckBallA = coinTossPossession === 'A';
  const isCheckBallB = coinTossPossession === 'B';

  // Dividir o running score oficial FIBA 3X3 em exatamente duas colunas verticais:
  // Coluna 1: Pontos 1 a 12
  // Coluna 2: Pontos 13 a 23
  const col1Rows = runningScoreRows.slice(0, 12);
  const col2Rows = runningScoreRows.slice(12, 23);

  return (
    <div id="fiba-official-scoresheet-container" className="space-y-3 font-sans max-w-5xl mx-auto select-none">
      {/* 1. BARRA DE FERRAMENTAS / STATUS DA SÚMULA (PRINT: HIDDEN) */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-[#1F242D] text-white rounded-lg shadow-md print:hidden border border-white/10">
        <div className="flex items-center gap-2">
          {isClosed ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-emerald-500 text-black uppercase font-mono tracking-tight shadow-xs">
              <ShieldCheck className="w-4 h-4 text-black" />
              Súmula Selada & Fechada
            </span>
          ) : model.status === 'ENDED' ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-amber-400 text-black uppercase font-mono tracking-tight">
              <AlertTriangle className="w-4 h-4 text-black" />
              Jogo Encerrado
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-bold bg-blue-500 text-white uppercase font-mono tracking-tight">
              <CheckCircle2 className="w-4 h-4 text-white" />
              Súmula Ao Vivo
            </span>
          )}
          <span className="text-white/60 text-xs hidden sm:inline font-mono">
            FIBA 3x3 Official Scoresheet EX3
          </span>
        </div>

        {/* Alternador de Modo: Preenchida vs. Em Branco */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-black/40 p-1 rounded border border-white/10 text-xs">
            <button
              onClick={() => setViewMode('FILLED')}
              id="btn-scoresheet-filled"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                !isBlank ? 'bg-[#F27D26] text-black shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              Súmula Preenchida (Ao Vivo)
            </button>
            <button
              onClick={() => setViewMode('BLANK')}
              id="btn-scoresheet-blank"
              className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                isBlank ? 'bg-[#F27D26] text-black shadow-xs' : 'text-white/70 hover:text-white'
              }`}
            >
              Súmula em Branco (Oficial)
            </button>
          </div>

          <button
            onClick={handlePrint}
            id="btn-print-official-scoresheet"
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-xs font-black bg-[#F27D26] hover:bg-[#e06d19] text-black uppercase tracking-tight transition-colors shadow-sm cursor-pointer active:scale-95"
          >
            <Printer className="w-4 h-4" />
            Imprimir A4
          </button>
        </div>
      </div>

      {/* 2. PAPEL DA SÚMULA OFICIAL FIBA 3X3 (DIMENSÃO A4: 210mm x 297mm COM BORDA 1px SOLID BLACK) */}
      <div
        id="fiba-scoresheet-paper"
        className="bg-white text-black p-3.5 sm:p-5 border border-black shadow-md mx-auto text-xs"
        style={{
          width: '100%',
          maxWidth: '210mm',
          minHeight: '297mm',
          boxSizing: 'border-box',
        }}
      >
        {/* CABEÇALHO DO DOCUMENTO FIBA 3X3 (REFINAMENTO TIPOGRÁFICO, ALINHAMENTO E LOGOS DINÂMICOS) */}
        <div className="border-b border-black pb-2 mb-2">
          <div className="flex items-center justify-between gap-2 min-h-[64px]">
            {/* Canto superior esquerdo: Emblema Federação/Organização (Dinâmico / Proporcional) */}
            <div className="w-28 shrink-0 flex items-center justify-start">
              {matchInfo.logoLeft ? (
                <img
                  src={matchInfo.logoLeft}
                  alt="Emblema Federação / Organização"
                  className="max-h-14 max-w-[100px] object-contain"
                />
              ) : (
                <FpbLogo className="w-12 h-12 text-black" />
              )}
            </div>

            {/* Título Central Oficial da FIBA - Tipografia Refinada & Perfeitamente Centralizada */}
            <div className="text-center flex-1 flex flex-col items-center justify-center px-1">
              {/* Linha 1 (Texto Institucional): Caixa alta, Serif, tamanho pequeno, negrito e letter-spacing suave */}
              <div className="text-[10px] sm:text-[11.5px] font-bold tracking-[0.14em] text-neutral-900 uppercase leading-tight font-serif">
                FEDERATION INTERNATIONALE DE BASKETBALL
              </div>

              {/* Linha 2 (Subtítulo): Caixa alta, tamanho um pouco menor e estilo regular/suave */}
              <div className="text-[8.5px] sm:text-[9.5px] font-normal tracking-[0.09em] text-neutral-700 uppercase leading-tight mt-0.5 font-serif">
                INTERNATIONAL BASKETBALL FEDERATION
              </div>

              {/* Linha 3 (Título Principal): Fonte Serif em negrito, tamanho destacado, margens e proporção oficiais */}
              <h1 className="text-xl sm:text-2xl font-black uppercase tracking-[0.16em] text-black mt-1.5 leading-none font-serif">
                FIBA 3X3 SCORESHEET
              </h1>
            </div>

            {/* Canto superior direito: Logo Oficial FIBA 3X3 / Torneio (Dinâmico / Proporcional) */}
            <div className="w-28 shrink-0 flex items-center justify-end">
              {matchInfo.logoRight ? (
                <img
                  src={matchInfo.logoRight}
                  alt="Emblema Torneio / Campeonato"
                  className="max-h-14 max-w-[100px] object-contain"
                />
              ) : (
                <Fiba3x3Logo className="h-9" />
              )}
            </div>
          </div>

          {/* DADOS DE CABEÇALHO (Team A, Team B, Competition, Category, Game No., Date, Time, Court, Referees #1/#2, Supervisor) */}
          <div className="mt-2.5 pt-2 border-t border-black text-[10px] leading-tight font-sans">
            {/* Linha 1: Team A e Team B com sublinhado limpo e respiro adequado */}
            <div className="grid grid-cols-2 gap-6 pb-1 font-bold">
              <div className="flex items-baseline gap-2">
                <span className="uppercase text-[10px] font-bold text-neutral-800 shrink-0">Team A:</span>
                <span className={`flex-1 border-b border-black font-mono px-2 py-0.5 font-black truncate min-h-[20px] text-[11px] leading-tight ${!isBlank ? 'text-[#003399]' : ''}`}>
                  {!isBlank ? teamA.name.toUpperCase() : ''}
                </span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="uppercase text-[10px] font-bold text-neutral-800 shrink-0">Team B:</span>
                <span className={`flex-1 border-b border-black font-mono px-2 py-0.5 font-black truncate min-h-[20px] text-[11px] leading-tight ${!isBlank ? 'text-[#003399]' : ''}`}>
                  {!isBlank ? teamB.name.toUpperCase() : ''}
                </span>
              </div>
            </div>

            {/* Grade de Metadados Oficiais (3 Linhas limpas, espaçadas e alinhadas com sublinhado) */}
            <div className="grid grid-cols-12 gap-x-3 gap-y-1.5 pt-1.5 text-[10px]">
              {/* Linha 1 de Metadados */}
              <div className="col-span-4 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Competition:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 truncate min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? matchInfo.competition : ''}
                </span>
              </div>
              <div className="col-span-3 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Date:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 text-center min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? matchInfo.date : ''}
                </span>
              </div>
              <div className="col-span-5 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Referees #1:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 truncate min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (signatures.refereeName || matchInfo.referee1Name || 'Roberto N. Santos') : ''}
                </span>
              </div>

              {/* Linha 2 de Metadados */}
              <div className="col-span-4 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Category:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 truncate min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? matchInfo.category : ''}
                </span>
              </div>
              <div className="col-span-3 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Time:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 text-center min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? matchInfo.time : ''}
                </span>
              </div>
              <div className="col-span-5 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">#2:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 truncate min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (signatures.referee2Name || matchInfo.referee2Name || 'Fernanda P. Lima') : ''}
                </span>
              </div>

              {/* Linha 3 de Metadados */}
              <div className="col-span-4 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Game No.:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 font-bold text-center min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399]' : ''}`}>
                  {!isBlank ? (matchInfo.matchNumber || '104') : ''}
                </span>
              </div>
              <div className="col-span-3 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Court:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 text-center min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? matchInfo.court : ''}
                </span>
              </div>
              <div className="col-span-5 flex items-baseline gap-1.5">
                <span className="uppercase text-[9px] font-bold text-neutral-700 shrink-0">Supervisor:</span>
                <span className={`flex-1 border-b border-black font-mono px-1.5 py-0.5 truncate min-h-[18px] leading-tight ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (matchInfo.supervisorName || 'Marcos A. Faria') : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL: LADO ESQUERDO (EQUIPES A & B + MESA) VS LADO DIREITO (RUNNING SCORE + RESULTADO + ASSINATURAS + PROTESTO) */}
        <div className="grid grid-cols-12 gap-0 border border-black">
          {/* ================= LADO ESQUERDO (7 DE 12 COLUNAS) ================= */}
          <div className="col-span-7 border-r border-black flex flex-col justify-between divide-y divide-black">
            {/* BLOCO DA EQUIPE A */}
            <TeamScoresheetOfficialBlock
              teamLetter="A"
              teamData={teamA}
              isClosed={isClosed}
              isBlank={isBlank}
              isCoinTossWinner={isCheckBallA}
            />

            {/* BLOCO DA EQUIPE B */}
            <TeamScoresheetOfficialBlock
              teamLetter="B"
              teamData={teamB}
              isClosed={isClosed}
              isBlank={isBlank}
              isCoinTossWinner={isCheckBallB}
            />

            {/* BLOCO DE OFICIAIS DE MESA (TABLE OFFICIALS) - TEXTO SIMPLES IMPRESSO */}
            <div className="p-2.5 bg-white text-[10px] space-y-1.5 font-sans">
              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-neutral-800 w-36 shrink-0">Scorer:</span>
                <span className={`flex-1 border-b border-black font-mono px-1 truncate min-h-[17px] ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (signatures.scorerName || matchInfo.scorerName || 'Carlos M. Silva') : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-neutral-800 w-36 shrink-0">Timer:</span>
                <span className={`flex-1 border-b border-black font-mono px-1 truncate min-h-[17px] ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (signatures.timerName || matchInfo.timerName || 'Mariana R. Costa') : ''}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-bold uppercase text-neutral-800 w-36 shrink-0">Shot Clock Operator:</span>
                <span className={`flex-1 border-b border-black font-mono px-1 truncate min-h-[17px] ${!isBlank ? 'text-[#003399] font-semibold' : ''}`}>
                  {!isBlank ? (signatures.operator12Name || matchInfo.operator12Name || 'Lucas B. Andrade') : ''}
                </span>
              </div>
            </div>
          </div>

          {/* ================= LADO DIREITO (5 DE 12 COLUNAS: RUNNING SCORE, RESULTADO, ASSINATURAS, PROTESTO, VENCEDOR) ================= */}
          <div className="col-span-5 flex flex-col justify-between divide-y divide-black">
            {/* RUNNING SCORE (CONTAGEM CORRIDA OFICIAL FIBA 3X3: COLUNA 1: 1 A 12, COLUNA 2: 13 A 23) */}
            <div>
              <div className="bg-neutral-100 border-b border-black px-2 py-0.5 text-center font-black uppercase tracking-wider text-xs font-serif">
                RUNNING SCORE
              </div>

              {/* Duas colunas verticais conforme Diagrama 9 e PDF oficial FIBA EX3: 1-12 e 13-23 */}
              <div className="grid grid-cols-2 divide-x divide-black bg-white">
                {/* COLUNA 1: PONTOS 1 A 12 */}
                <RunningScoreTable
                  rows={col1Rows}
                  sealing={sealing}
                  isBlank={isBlank}
                />

                {/* COLUNA 2: PONTOS 13 A 23 */}
                <RunningScoreTable
                  rows={col2Rows}
                  sealing={sealing}
                  isBlank={isBlank}
                />
              </div>
            </div>

            {/* SEÇÃO INFERIOR: SCORE REGULAR/OT, ASSINATURAS OFICIAIS E PROTESTO */}
            <div className="p-2 bg-white text-[10px] space-y-2">
              {/* Pontuação Regular e Prorrogação */}
              <div className="space-y-1 font-sans">
                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <span className="font-bold uppercase text-[9.5px] text-neutral-800">Score (after regular time)</span>
                  <div className="flex items-center gap-2 font-mono font-bold text-xs">
                    <span>A: <strong className={`border border-black px-1.5 py-0.2 bg-white ${!isBlank ? 'text-[#003399]' : ''}`}>{!isBlank ? (finalResult.regularScoreA ?? finalResult.scoreA) : ''}</strong></span>
                    <span>B: <strong className={`border border-black px-1.5 py-0.2 bg-white ${!isBlank ? 'text-[#003399]' : ''}`}>{!isBlank ? (finalResult.regularScoreB ?? finalResult.scoreB) : ''}</strong></span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-b border-black pb-0.5">
                  <span className="font-bold uppercase text-[9.5px] text-neutral-800">Score (after overtime)</span>
                  <div className="flex items-center gap-2 font-mono font-bold text-xs">
                    <span>A: <strong className={`border border-black px-1.5 py-0.2 bg-white ${!isBlank ? 'text-[#003399]' : ''}`}>{!isBlank && finalResult.overtimeScoreA !== undefined ? finalResult.overtimeScoreA : ''}</strong></span>
                    <span>B: <strong className={`border border-black px-1.5 py-0.2 bg-white ${!isBlank ? 'text-[#003399]' : ''}`}>{!isBlank && finalResult.overtimeScoreB !== undefined ? finalResult.overtimeScoreB : ''}</strong></span>
                  </div>
                </div>
              </div>

              {/* ASSINATURAS DOS OFICIAIS (ÁRBITROS E SUPERVISOR) */}
              <div className="pt-1 space-y-1.5 border-t border-black font-sans">
                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-[9px] text-neutral-800 w-36 shrink-0">Referee's Signature:</span>
                  <div className="flex-1 border-b border-black min-h-[20px] px-1 flex items-center gap-2 overflow-hidden">
                    {!isBlank && (signatures.refereeSignature || signatures.refereeName) ? (
                      <span className="text-[#003399] font-serif italic font-bold text-xs truncate">
                        {signatures.refereeSignature || signatures.refereeName}
                      </span>
                    ) : null}
                    {!isBlank && (signatures.referee2Signature || signatures.referee2Name) ? (
                      <span className="text-[#003399] font-serif italic font-bold text-xs truncate before:content-['/'] before:mr-1 before:text-neutral-400">
                        {signatures.referee2Signature || signatures.referee2Name}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-bold uppercase text-[9px] text-neutral-800 w-36 shrink-0">Sports Supervisor's:</span>
                  <div className="flex-1 border-b border-black min-h-[20px] px-1 flex items-center overflow-hidden">
                    {!isBlank && (isClosed || sealing.isSealed) && (matchInfo.supervisorName || signatures.supervisorName) ? (
                      <span className="text-[#003399] font-serif italic font-bold text-xs truncate">
                        {matchInfo.supervisorName || signatures.supervisorName}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>

              {/* SEÇÃO DE PROTESTO DE JOGO (FIBA 3X3 ART. 14) - REGRAS OFICIAIS DE SELAMENTO */}
              <div className="pt-1.5 border-t border-black text-[9px] space-y-1 relative font-sans">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-800 uppercase tracking-tight">Game protest requested:</span>
                  <div className="flex items-center gap-1 font-mono font-bold text-[9px]">
                    <div className="w-4 h-4 border border-black bg-white flex items-center justify-center relative select-none">
                      {!isBlank && (
                        protest.hasProtest ? (
                          <span className="text-xs font-black text-[#003399]">X</span>
                        ) : isClosed || sealing.isSealed ? (
                          /* DUAS LINHAS HORIZONTAIS PARALELAS ( ═ ) no interior da caixa Yes em caneta azul (#003399) */
                          <svg className="w-full h-full p-0.5 pointer-events-none" viewBox="0 0 16 16">
                            <line x1="2" y1="5.5" x2="14" y2="5.5" stroke="#003399" strokeWidth="1.8" strokeLinecap="square" />
                            <line x1="2" y1="10.5" x2="14" y2="10.5" stroke="#003399" strokeWidth="1.8" strokeLinecap="square" />
                          </svg>
                        ) : null
                      )}
                    </div>
                    <span className="font-sans text-neutral-700 ml-1">Yes</span>
                  </div>
                </div>

                <div className="flex items-end gap-1.5">
                  <span className="text-neutral-700 font-bold uppercase text-[9px] shrink-0">Team's Name:</span>
                  <div className="flex-1 border-b border-black font-mono px-1 font-bold min-h-[16px] truncate relative flex items-center">
                    {!isBlank && protest.hasProtest ? (
                      <span className="text-[#003399]">{protest.teamName || 'Equipe Protestante'}</span>
                    ) : !isBlank && (isClosed || sealing.isSealed) ? (
                      /* UMA LINHA HORIZONTAL SIMPLES ( — ) contínua cobrindo o campo sublinhado */
                      <span className="absolute inset-x-0 bottom-[6px] border-b-[1.8px] border-[#003399]" />
                    ) : null}
                  </div>
                </div>

                <div className="flex items-end gap-1.5 pt-0.5">
                  <span className="text-neutral-700 font-bold uppercase text-[9px] shrink-0">Signature:</span>
                  <div className="flex-1 border-b border-black font-serif italic text-xs px-1 min-h-[18px] truncate relative flex items-center">
                    {!isBlank && protest.hasProtest ? (
                      <span className="text-[#003399] font-bold">
                        {signatures.captainSignature || `Capitão #${protest.captainNumber || 'C'}`}
                      </span>
                    ) : !isBlank && (isClosed || sealing.isSealed) ? (
                      /* UMA LINHA HORIZONTAL SIMPLES ( — ) contínua sobre a linha reservada para (Player's signature) */
                      <span className="absolute inset-x-0 bottom-[6px] border-b-[1.8px] border-[#003399]" />
                    ) : null}
                  </div>
                </div>

                <div className="text-[8px] text-neutral-500 italic text-right font-sans">
                  (Player's signature)
                </div>
              </div>
            </div>

            {/* FAIXA INFERIOR COM O VENCEDOR (DESTACADO E LIMPO: VENCEDOR / WINNER: [NOME]) */}
            <div className="p-2 bg-neutral-50 border-t-2 border-black text-center flex items-center justify-center gap-2">
              <Trophy className="w-4 h-4 text-black shrink-0" />
              <span className="text-xs sm:text-sm font-black uppercase text-black tracking-wide font-serif">
                VENCEDOR / WINNER:
              </span>
              <span className={`border-b-2 border-black font-mono px-3 py-0.5 min-w-[180px] text-center font-bold text-xs sm:text-sm ${!isBlank && winnerName ? 'text-[#003399] font-black' : 'text-neutral-400'}`}>
                {!isBlank && winnerName ? winnerName.toUpperCase() : '________________________'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const OfficialScoresheet = React.memo(OfficialScoresheetComponent);

/* =========================================================================================
   BLOCO DE EQUIPE DA SÚMULA OFICIAL (TEAM A / TEAM B)
   Idêntico ao layout oficial com Time out, Team fouls (1-6, 7-9 com ✌️, 10+ com ✌️🏀) e 4 Jogadores
   Marcação *CB exclusivamente ao lado da equipe vencedora do sorteio da moeda.
========================================================================================= */

interface TeamScoresheetOfficialBlockProps {
  teamLetter: 'A' | 'B';
  teamData: OfficialScoresheetModel['teamA'];
  isClosed: boolean;
  isBlank: boolean;
  isCoinTossWinner: boolean;
}

const TeamScoresheetOfficialBlock: React.FC<TeamScoresheetOfficialBlockProps> = ({
  teamLetter,
  teamData,
  isClosed,
  isBlank,
  isCoinTossWinner,
}) => {
  const isA = teamLetter === 'A';

  return (
    <div className="p-2 space-y-1.5">
      {/* Nome Oficial da Equipe e Marcação exclusiva do Check-Ball (*CB) */}
      <div className="flex items-center justify-between font-bold text-xs uppercase tracking-tight">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-neutral-900 font-black shrink-0">Team {teamLetter}:</span>
          <span className={`flex-1 border-b border-black font-mono px-1 font-black truncate text-[11px] ${!isBlank ? 'text-[#003399]' : ''}`}>
            {!isBlank ? teamData.name.toUpperCase() : ''}
          </span>
        </div>

        {/* Marcação do Check-Ball (*CB) EXCLUSIVAMENTE ao lado da equipe vencedora da moeda */}
        <div className="flex items-center gap-1 ml-3 shrink-0">
          <span className="text-[9px] font-bold text-neutral-700 font-mono">*CB:</span>
          <div className={`w-4 h-4 border border-black bg-white flex items-center justify-center font-mono font-black text-xs ${!isBlank && isCoinTossWinner ? 'text-[#003399]' : 'text-transparent'}`}>
            {!isBlank && isCoinTossWinner ? 'X' : ''}
          </div>
        </div>
      </div>

      {/* Linha de Time out e Team fouls estruturada com os ícones exatos */}
      <div className="border border-black p-1.5 bg-white space-y-1">
        <div className="flex items-center justify-between">
          {/* Time out (Caixa única) */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-bold uppercase text-neutral-800">Time out:</span>
            <div className="w-6 h-5 border border-black bg-white flex items-center justify-center relative select-none font-mono">
              {!isBlank && (
                teamData.timeoutUsed ? (
                  <span className="text-[#003399] font-black text-xs">X</span>
                ) : isClosed ? (
                  <svg className="w-full h-full p-0.5 pointer-events-none" viewBox="0 0 24 20">
                    <line x1="2" y1="7" x2="22" y2="7" stroke="#003399" strokeWidth="2.2" strokeLinecap="square" />
                    <line x1="2" y1="13" x2="22" y2="13" stroke="#003399" strokeWidth="2.2" strokeLinecap="square" />
                  </svg>
                ) : null
              )}
            </div>
          </div>

          <div className="text-[9px] font-black uppercase text-black tracking-wider font-serif">
            TEAM FOULS
          </div>
        </div>

        {/* Faltas Coletivas:
            Linha 1: 1 a 6
            Linha 2: ✌️ apontando para 7, 8, 9 (Ícone oficial preservado, sem legendas de texto)
            Linha 3: ✌️🏀 apontando para 10+ (Ícone oficial preservado, sem legendas de texto)
        */}
        <div className="space-y-1 font-mono">
          {/* Linha 1: Faltas 1 a 6 */}
          <div className="flex items-center gap-1">
            <span className="text-[9px] font-sans font-bold text-black w-8 text-right shrink-0">1-6:</span>
            <div className="flex items-center gap-0.5">
              {teamData.foulSlots.slice(0, 6).map((slot) => (
                <OfficialFoulBox
                  key={`foul-${teamLetter}-${slot.position}`}
                  slot={slot}
                  isClosed={isClosed}
                  isBlank={isBlank}
                />
              ))}
            </div>
          </div>

          {/* Linha 2: Mão 2 dedos apontando para 7, 8, 9 (Ícone oficial preservado, sem texto explicativo) */}
          <div className="flex items-center gap-1">
            <div className="w-8 flex items-center justify-end shrink-0" title="Faltas 7 a 9">
              <HandTwoFingersIcon className="w-5 h-4 text-black" />
            </div>
            <div className="flex items-center gap-0.5">
              {teamData.foulSlots.slice(6, 9).map((slot) => (
                <OfficialFoulBox
                  key={`foul-${teamLetter}-${slot.position}`}
                  slot={slot}
                  isClosed={isClosed}
                  isBlank={isBlank}
                  isBonus
                />
              ))}
            </div>
          </div>

          {/* Linha 3: Mão 2 dedos + Bola apontando para 10+ (Ícone oficial preservado, sem texto explicativo) */}
          <div className="flex items-center gap-1">
            <div className="w-8 flex items-center justify-end shrink-0" title="Faltas 10+">
              <HandTwoFingersWithBallIcon className="w-7 h-4" />
            </div>
            <div className="flex items-center gap-0.5">
              {teamData.foulSlots.slice(9, 10).map((slot) => (
                <OfficialFoulBox
                  key={`foul-${teamLetter}-${slot.position}`}
                  slot={slot}
                  isClosed={isClosed}
                  isBlank={isBlank}
                  label="10+"
                  isMaxPenalty
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* TABELA DE 4 JOGADORES (PLAYERS, NO., UNSPORTSMANLIKE 1 E 2) - EXATAMENTE 4 LINHAS */}
      <div className="border border-black overflow-hidden bg-white">
        <table className="w-full text-left border-collapse text-[10px]">
          <thead>
            <tr className="bg-neutral-100 text-black text-[9px] font-bold uppercase border-b border-black">
              <th className="py-0.5 px-2">Players</th>
              <th className="py-0.5 px-1.5 w-12 text-center border-l border-black">No.</th>
              <th className="py-0.5 px-1 text-center w-28 border-l border-black" colSpan={2}>
                Unsportsmanlike
              </th>
            </tr>
            <tr className="bg-neutral-50 text-[8px] font-bold text-center border-b border-black">
              <th className="py-0.2 px-2 text-left text-neutral-600 font-normal">Full Name</th>
              <th className="py-0.2 text-neutral-600 border-l border-black font-normal">#</th>
              <th className="py-0.2 w-14 border-l border-black text-black">1</th>
              <th className="py-0.2 w-14 border-l border-black text-black">2</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black font-mono">
            {/* Sempre renderizar exatamente 4 linhas (os 4 atletas da equipe 3x3) */}
            {[0, 1, 2, 3].map((idx) => {
              const player = teamData.players[idx];
              const unsportsmanlikeFouls = player ? player.foulSlots.filter((f) => f === 'U' || f === 'D') : [];
              const foul1 = unsportsmanlikeFouls[0];
              const foul2 = unsportsmanlikeFouls[1];

              return (
                <tr key={`p-${teamLetter}-${idx}`} className="h-5 leading-none">
                  {/* Nome do Jogador em caneta azul oficial, sem nenhum risco sobre o nome */}
                  <td className={`py-0.5 px-2 font-sans font-bold truncate ${!isBlank && player ? 'text-[#003399]' : ''}`}>
                    {!isBlank && player ? player.name.toUpperCase() : ''}
                  </td>

                  {/* Número do Jogador em caneta azul oficial, sem nenhum risco sobre o número */}
                  <td className={`py-0.5 px-1 font-bold text-center border-l border-black ${!isBlank && player ? 'text-[#003399]' : ''}`}>
                    {!isBlank && player ? player.number : ''}
                  </td>

                  {/* Falta Antidesportiva / Desqualificante 1: 'U' ou 'D' em caneta azul, ou traço horizontal oficial */}
                  <td className="py-0.5 px-1 text-center font-bold border-l border-black h-5">
                    {!isBlank && player ? (
                      foul1 ? (
                        <span className="text-[#003399] font-black text-xs font-mono">{foul1}</span>
                      ) : (
                        <div className="w-full flex items-center justify-center">
                          <div className="w-5 h-[1.5px] bg-[#003399]" />
                        </div>
                      )
                    ) : null}
                  </td>

                  {/* Falta Antidesportiva / Desqualificante 2: 'U' ou 'D' em caneta azul, ou traço horizontal oficial */}
                  <td className="py-0.5 px-1 text-center font-bold border-l border-black h-5">
                    {!isBlank && player ? (
                      foul2 ? (
                        <span className="text-[#003399] font-black text-xs font-mono">{foul2}</span>
                      ) : (
                        <div className="w-full flex items-center justify-center">
                          <div className="w-5 h-[1.5px] bg-[#003399]" />
                        </div>
                      )
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/* Caixa de Falta Coletiva com suporte aos marcadores da súmula oficial */
interface OfficialFoulBoxProps {
  slot: TeamFoulSlot;
  isClosed: boolean;
  isBlank: boolean;
  label?: string;
  isBonus?: boolean;
  isMaxPenalty?: boolean;
}

const OfficialFoulBox: React.FC<OfficialFoulBoxProps> = ({
  slot,
  isClosed,
  isBlank,
  label,
  isBonus,
  isMaxPenalty,
}) => {
  const content = slot.content;
  let mark = '';

  if (!isBlank) {
    if (content === 'X' || content === 'P') mark = 'X';
    else if (content === 'U' || content === 'D') mark = 'Ⓧ';
    // Se a caixa foi pulada (isSkipped), NÃO PODE SER RISCADA! Permanece totalmente em branco.
    else if (slot.isSkipped || content === 'SKIPPED') mark = '';
  }

  // O selamento com DUAS LINHAS HORIZONTAIS PARALELAS ( ═ ) em azul (#003399)
  // deve ser aplicado APENAS nas caixas subsequentes à última falta registrada.
  // Caixas puladas (isSkipped) NÃO são riscadas.
  const isBoxSealed = !isBlank && isClosed && slot.content === 'CLOSED' && !slot.isSkipped;
  const num = label || slot.position;

  return (
    <div
      className={`w-6 h-5 border border-black relative flex items-center justify-center font-mono select-none overflow-hidden ${
        isMaxPenalty
          ? 'bg-red-50/40'
          : isBonus
          ? 'bg-amber-50/40'
          : 'bg-white'
      }`}
    >
      {/* Número de fundo impresso na caixa (perfeitamente centralizado) */}
      <span className="absolute inset-0 flex items-center justify-center text-[8.5px] font-bold text-neutral-400 pointer-events-none">
        {num}
      </span>

      {/* Marcação oficial sobreposta em caneta azul (#003399) centralizada diretamente sobre o número */}
      {mark && (
        <span
          className={`relative z-10 flex items-center justify-center font-black text-[#003399] leading-none ${
            mark === 'Ⓧ' ? 'text-[11px]' : 'text-sm'
          }`}
        >
          {mark}
        </span>
      )}

      {/* Selamento oficial com DUAS LINHAS HORIZONTAIS PARALELAS ( ═ ) em caneta azul (#003399) */}
      {isBoxSealed && (
        <svg className="absolute inset-0 w-full h-full p-0.5 pointer-events-none z-10" viewBox="0 0 24 20">
          <line x1="2" y1="7" x2="22" y2="7" stroke="#003399" strokeWidth="2.2" strokeLinecap="square" />
          <line x1="2" y1="13" x2="22" y2="13" stroke="#003399" strokeWidth="2.2" strokeLinecap="square" />
        </svg>
      )}
    </div>
  );
};

/* =========================================================================================
   TABELA DE RUNNING SCORE OFICIAL FIBA 3X3 (ESTRUTURA A [No. | Pt] | B [Pt | No.])
   Tabela 1: Pontos 1 a 12 | Tabela 2: Pontos 13 a 23
   - Coluna A: No. do Jogador + Número do Ponto A (1-12 ou 13-23)
   - Coluna B: Número do Ponto B (1-12 ou 13-23) + No. do Jogador
   - Cesta 1pt: Barra diagonal '/' cortando o número do ponto em caneta azul oficial (#003399)
   - Cesta 2pts: Círculo '◯' envolvendo o número (casa anterior sem marca) em caneta azul oficial (#003399)
   - Lance Livre: Ponto cheio '●' no número em caneta azul oficial (#003399)
   - SELAMENTO FIBA OFICIAL:
     - Linha horizontal dupla grossa na base do último ponto de cada equipe
     - Linha diagonal única descendo do corte até o ponto 23 cobrindo todo o espaço não pontuado
========================================================================================= */

interface RunningScoreTableProps {
  rows: RunningScoreRow[];
  sealing: OfficialScoresheetModel['sealing'];
  isBlank: boolean;
}

const RunningScoreTable: React.FC<RunningScoreTableProps> = ({ rows, sealing, isBlank }) => {
  const startPt = rows[0]?.pointValue ?? 1;
  const endPt = rows[rows.length - 1]?.pointValue ?? 12;
  const totalRows = rows.length || 1;

  // Cálculos do Selamento Oficial (Foto da Súmula e PDF FIBA EX3)
  const isSealed = !isBlank && sealing.isSealed;
  const lastPointA = sealing.teamA.lastPointScored;
  const lastPointB = sealing.teamB.lastPointScored;

  // Equipe A: Linha dupla e diagonal
  const aInThisTable = lastPointA >= startPt && lastPointA <= endPt;
  const aBeforeThisTable = lastPointA < startPt;
  const aAfterThisTable = lastPointA > endPt;

  // Posição vertical da linha dupla da Equipe A
  const yLinePercentA = aInThisTable
    ? ((lastPointA - startPt + 1) / totalRows) * 100
    : startPt === 1 && lastPointA === 0
    ? 0
    : null;

  // Início e fim da diagonal da Equipe A
  const hasDiagonalA = isSealed && (aInThisTable ? lastPointA < endPt : aBeforeThisTable);
  const diagStartYPercentA = aInThisTable ? yLinePercentA! : 0;

  // Equipe B: Linha dupla e diagonal
  const bInThisTable = lastPointB >= startPt && lastPointB <= endPt;
  const bBeforeThisTable = lastPointB < startPt;
  const bAfterThisTable = lastPointB > endPt;

  const yLinePercentB = bInThisTable
    ? ((lastPointB - startPt + 1) / totalRows) * 100
    : startPt === 1 && lastPointB === 0
    ? 0
    : null;

  const hasDiagonalB = isSealed && (bInThisTable ? lastPointB < endPt : bBeforeThisTable);
  const diagStartYPercentB = bInThisTable ? yLinePercentB! : 0;

  return (
    <div className="relative">
      <table className="w-full text-center border-collapse table-fixed">
        <thead>
          <tr className="bg-neutral-100 text-[9px] font-black uppercase border-b border-black">
            <th colSpan={2} className="py-0.5 border-r border-black tracking-wider text-center">
              A
            </th>
            <th colSpan={2} className="py-0.5 tracking-wider text-center">
              B
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black font-mono text-[9px] relative">
          {rows.map((row) => (
            <RunningScoreRowComponent
              key={`rs-row-${row.pointValue}`}
              row={row}
              isBlank={isBlank}
            />
          ))}
        </tbody>
      </table>

      {/* OVERLAY SVG DE FECHAMENTO OFICIAL FIBA 3X3 (IDÊNTICO AO PDF EX3) */}
      {isSealed && (
        <svg
          className="absolute left-0 right-0 bottom-0 pointer-events-none w-full"
          style={{
            top: '20px', // altura exata do cabeçalho thead
            height: 'calc(100% - 20px)',
          }}
        >
          {/* ================= SELAMENTO DA EQUIPE A (COLUNAS 0% A 50%) ================= */}
          {/* Linha dupla de corte horizontal imediatamente abaixo do último ponto da Equipe A */}
          {yLinePercentA !== null && (
            <g>
              <line
                x1="0"
                y1={`${yLinePercentA}%`}
                x2="50%"
                y2={`${yLinePercentA}%`}
                stroke="#003399"
                strokeWidth="2"
                transform="translate(0, -1.5)"
              />
              <line
                x1="0"
                y1={`${yLinePercentA}%`}
                x2="50%"
                y2={`${yLinePercentA}%`}
                stroke="#003399"
                strokeWidth="2"
                transform="translate(0, 1.5)"
              />
            </g>
          )}

          {/* Linha diagonal descendente única cobrindo da linha de corte até a base da coluna da Equipe A */}
          {hasDiagonalA && (
            <line
              x1="0"
              y1={`${diagStartYPercentA}%`}
              x2="50%"
              y2="100%"
              stroke="#003399"
              strokeWidth="2.2"
            />
          )}

          {/* ================= SELAMENTO DA EQUIPE B (COLUNAS 50% A 100%) ================= */}
          {/* Linha dupla de corte horizontal imediatamente abaixo do último ponto da Equipe B */}
          {yLinePercentB !== null && (
            <g>
              <line
                x1="50%"
                y1={`${yLinePercentB}%`}
                x2="100%"
                y2={`${yLinePercentB}%`}
                stroke="#003399"
                strokeWidth="2"
                transform="translate(0, -1.5)"
              />
              <line
                x1="50%"
                y1={`${yLinePercentB}%`}
                x2="100%"
                y2={`${yLinePercentB}%`}
                stroke="#003399"
                strokeWidth="2"
                transform="translate(0, 1.5)"
              />
            </g>
          )}

          {/* Linha diagonal descendente única cobrindo da linha de corte até a base da coluna da Equipe B */}
          {hasDiagonalB && (
            <line
              x1="50%"
              y1={`${diagStartYPercentB}%`}
              x2="100%"
              y2="100%"
              stroke="#003399"
              strokeWidth="2.2"
            />
          )}
        </svg>
      )}
    </div>
  );
};

interface RunningScoreRowComponentProps {
  row: RunningScoreRow;
  isBlank: boolean;
}

const RunningScoreRowComponent: React.FC<RunningScoreRowComponentProps> = ({ row, isBlank }) => {
  const pt = row.pointValue;
  const a = row.teamA;
  const b = row.teamB;
  const isPt23 = pt === 23;
  const isPt12 = pt === 12;
  const isBottomRow = isPt23 || isPt12;

  const renderScoreCell = (scoreData: RunningScoreRow['teamA']) => {
    const scored = !isBlank && !scoreData.isSkipped && scoreData.mark !== 'EMPTY';

    if (!scored) {
      return (
        <div className="w-[17px] h-[17px] flex items-center justify-center mx-auto font-extrabold text-[9px] text-black leading-none">
          {pt}
        </div>
      );
    }

    if (scoreData.mark === '2PT_CIRCLE') {
      /* 2 Pontos de Quadra (Arremesso de 2P): CÍRCULO VAZADO CONTÍNUO ( ◯ ) envolvendo o número do ponto */
      return (
        <div className="w-[17px] h-[17px] rounded-full border-[1.8px] border-[#003399] bg-transparent text-black flex items-center justify-center mx-auto font-black text-[9px] leading-none">
          {pt}
        </div>
      );
    }

    if (scoreData.mark === 'FREE_THROW') {
      /* 1 Ponto de Lance Livre (FT): BOLINHA SÓLIDA / PREENCHIDA ( ● ) cobrindo/preenchendo a célula do ponto */
      return (
        <div className="w-[17px] h-[17px] rounded-full bg-[#003399] text-white flex items-center justify-center mx-auto font-black text-[9px] leading-none shadow-xs">
          {pt}
        </div>
      );
    }

    /* 1 Ponto de Quadra (Arremesso normal de 1P): RISCO/TRAÇO DIAGONAL ( / ) cortando o número do ponto */
    return (
      <div className="relative w-[17px] h-[17px] flex items-center justify-center mx-auto font-extrabold text-[9px] text-black leading-none">
        <span className="relative z-0">{pt}</span>
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10" viewBox="0 0 17 17">
          <line
            x1="2.5"
            y1="14.5"
            x2="14.5"
            y2="2.5"
            stroke="#003399"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
    );
  };

  return (
    <tr className={`h-[20px] leading-none ${isBottomRow ? 'border-b-[1.5px] border-black' : ''}`}>
      {/* ================= TIME A ================= */}
      {/* 1. Coluna Camisa Atleta Time A */}
      <td className={`w-[25%] border-r border-black font-bold text-[9px] text-center text-[#003399] ${isBottomRow ? 'border-b-[1.5px] border-black' : ''}`}>
        {!isBlank && !a.isSkipped && a.playerNumber !== undefined ? a.playerNumber : ''}
      </td>

      {/* 2. Coluna Ponto Time A - Totalmente fechada em preto */}
      <td className={`w-[25%] border-r border-black font-extrabold text-[9.5px] text-center relative select-none p-0 h-[20px] ${isBottomRow ? 'border-b-[1.5px] border-black' : ''}`}>
        {renderScoreCell(a)}
      </td>

      {/* ================= TIME B ================= */}
      {/* 3. Coluna Ponto Time B - Totalmente fechada em preto */}
      <td className={`w-[25%] border-r border-black font-extrabold text-[9.5px] text-center relative select-none p-0 h-[20px] ${isBottomRow ? 'border-b-[1.5px] border-black' : ''}`}>
        {renderScoreCell(b)}
      </td>

      {/* 4. Coluna Camisa Atleta Time B */}
      <td className={`w-[25%] font-bold text-[9px] text-center text-[#003399] ${isBottomRow ? 'border-b-[1.5px] border-black' : ''}`}>
        {!isBlank && !b.isSkipped && b.playerNumber !== undefined ? b.playerNumber : ''}
      </td>
    </tr>
  );
};
