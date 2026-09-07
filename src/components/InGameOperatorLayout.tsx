import React, { useState } from 'react';
import { GameState, TeamId, Player } from '../types';
import { CommandDispatcher } from '../engine/CommandDispatcher';
import { formatGameTime } from '../domain/clock';
import { playBuzzer, playWhistle, playScoreBeep } from '../utils/audio';
import { getContrastTextColor, hexToRgba } from '../utils/colors';
import {
  Undo2,
  Menu,
  Play,
  Pause,
  Wifi,
  FileSpreadsheet,
  Settings,
  Columns3,
  X,
  AlertTriangle,
  FileText,
  Ban,
  PenTool,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';

interface InGameOperatorLayoutProps {
  state: GameState;
  dispatcher: CommandDispatcher;
  onOpenMenu?: () => void;
  onSwitchLayout?: () => void;
  onSwitchView?: (mode: 'SETUP' | 'SPLIT' | 'OPERATOR' | 'SCORESHEET') => void;
}

export const InGameOperatorLayout: React.FC<InGameOperatorLayoutProps> = ({
  state,
  dispatcher,
  onOpenMenu,
  onSwitchLayout,
  onSwitchView,
}) => {
  const { teamA, teamB, clock, period, status, events } = state;

  // Jogador ou equipe selecionada atualmente para receber a ação
  const [selectedTeamId, setSelectedTeamId] = useState<TeamId>('A');
  const [selectedPlayerNumber, setSelectedPlayerNumber] = useState<number>(
    teamA.players[0]?.number ?? 4
  );

  // Modais de jogo rápidos
  const [ftModalOpen, setFtModalOpen] = useState(false);
  const [foulModalOpen, setFoulModalOpen] = useState(false);

  // Modais Administrativos solicitados no menu hambúrguer (☰)
  const [adminMenuOpen, setAdminMenuOpen] = useState(false);
  const [protestModalOpen, setProtestModalOpen] = useState(false);
  const [woModalOpen, setWoModalOpen] = useState(false);
  const [signaturesModalOpen, setSignaturesModalOpen] = useState(false);

  // Estado do formulário de protesto
  const [protestTeam, setProtestTeam] = useState<TeamId>('A');
  const [protestReason, setProtestReason] = useState<string>(
    state.protest.protestReason || ''
  );

  // Estado do formulário de W.O.
  const [woWinnerTeam, setWoWinnerTeam] = useState<TeamId>('A');
  const [woReason, setWoReason] = useState<string>(
    'Não comparecimento no horário regulamentar (Art. 10 FIBA 3x3)'
  );

  // Estado das assinaturas digitais exclusivas dos dois árbitros de quadra
  const [signerReferee1, setSignerReferee1] = useState<string>(
    state.signatures.refereeName || state.matchInfo.referee1Name || 'Roberto N. Santos'
  );
  const [signatureReferee1, setSignatureReferee1] = useState<string>(
    state.signatures.refereeSignature || 'Roberto N. Santos'
  );

  const [signerReferee2, setSignerReferee2] = useState<string>(
    state.signatures.referee2Name || state.matchInfo.referee2Name || 'Fernanda P. Lima'
  );
  const [signatureReferee2, setSignatureReferee2] = useState<string>(
    state.signatures.referee2Signature || 'Fernanda P. Lima'
  );

  const [signerSupervisor, setSignerSupervisor] = useState<string>(
    state.signatures.supervisorName || state.matchInfo.supervisorName || 'Marcos A. Faria'
  );

  const [signerCaptain, setSignerCaptain] = useState<string>(
    state.signatures.captainName || ''
  );
  const [signatureCaptain, setSignatureCaptain] = useState<string>(
    state.signatures.captainSignature || ''
  );

  // Posse de bola
  const [possession, setPossession] = useState<TeamId>(
    state.matchInfo.coinToss?.firstPossessionTeamId || 'A'
  );

  const activeTeam = selectedTeamId === 'A' ? teamA : teamB;
  const isClockRunning = clock.isRunning;

  // Regra de Exclusão de Atleta:
  // Se acumular 2 Faltas Antidesportivas ('U') OU receber 1 Falta Desqualificante ('D'):
  // Desativar imediatamente o botão do atleta com indicador 'EXCLUÍDO'
  const isPlayerExcluded = (player: Player): boolean => {
    const uCount = player.fouls.filter((f) => f === 'U').length;
    const hasD = player.fouls.includes('D');
    return player.disqualified || uCount >= 2 || hasD;
  };

  // Alterna o cronômetro
  const handleToggleClock = () => {
    if (state.isClosed) return;
    dispatcher.toggleClock();
  };

  // Alterna a posse de bola
  const handleTogglePossession = (team: TeamId) => {
    setPossession(team);
    setSelectedTeamId(team);
    const targetTeam = team === 'A' ? teamA : teamB;
    const firstAvailable = targetTeam.players.find((p) => !isPlayerExcluded(p));
    if (firstAvailable) {
      setSelectedPlayerNumber(firstAvailable.number);
    }
    playWhistle();
  };

  // Seleção de atleta ou equipe no grid esquerdo
  const handleSelectTeamOnly = (teamId: TeamId) => {
    setSelectedTeamId(teamId);
    playWhistle();
  };

  const handleSelectPlayer = (teamId: TeamId, player: Player) => {
    if (isPlayerExcluded(player)) {
      return; // Bloqueado: não clicável quando excluído
    }
    setSelectedTeamId(teamId);
    setSelectedPlayerNumber(player.number);
    playScoreBeep();
  };

  // Ações de Pontuação
  const handleScore1Pt = () => {
    if (state.isClosed) return;
    dispatcher.score1Pt(selectedTeamId, selectedPlayerNumber);
    playScoreBeep();
  };

  const handleScore2Pts = () => {
    if (state.isClosed) return;
    dispatcher.score2Pt(selectedTeamId, selectedPlayerNumber);
    playScoreBeep();
  };

  const handleFreeThrowMade = () => {
    if (state.isClosed) return;
    dispatcher.freeThrow(selectedTeamId, selectedPlayerNumber, true);
    playScoreBeep();
    setFtModalOpen(false);
  };

  const handleFreeThrowMissed = () => {
    if (state.isClosed) return;
    dispatcher.freeThrow(selectedTeamId, selectedPlayerNumber, false);
    setFtModalOpen(false);
  };

  // Ações de Faltas
  const handleFoulPersonal = () => {
    if (state.isClosed) return;
    dispatcher.foul(selectedTeamId, selectedPlayerNumber, 'P');
    playWhistle();
  };

  const handleFoulTechnical = () => {
    if (state.isClosed) return;
    dispatcher.foul(selectedTeamId, selectedPlayerNumber, 'U');
    playBuzzer();
    setFoulModalOpen(false);
  };

  const handleFoulDisqualifying = () => {
    if (state.isClosed) return;
    dispatcher.foul(selectedTeamId, selectedPlayerNumber, 'D');
    playBuzzer();
    setFoulModalOpen(false);
  };

  // Pedido de Tempo (DT)
  const handleTimeout = () => {
    if (state.isClosed) return;
    if (activeTeam.timeoutsRemaining <= 0) {
      alert(`A ${activeTeam.name} já utilizou seu único Pedido de Tempo (DT)!`);
      return;
    }
    dispatcher.timeout(selectedTeamId);
    playBuzzer();
  };

  // Botão Central de Início / Ação do Jogo
  const handleStartGameOrDemo = () => {
    if (state.isClosed) return;
    if (status === 'READY' || status === 'SETUP') {
      dispatcher.startGame();
      playWhistle();
    } else {
      handleToggleClock();
    }
  };

  // Nova Partida / Reset Completo
  const handleResetNewGame = () => {
    const confirmed = window.confirm(
      'Deseja iniciar uma Nova Partida e zerar o placar e cronômetro (10:00)?'
    );
    if (!confirmed) return;
    dispatcher.resetMatch();
    playWhistle();
  };

  // Ação 1: Gravar Protesto
  const handleSaveProtest = (e: React.FormEvent) => {
    e.preventDefault();
    const captainNum =
      protestTeam === 'A'
        ? teamA.players.find((p) => p.isCaptain)?.number || teamA.players[0]?.number
        : teamB.players.find((p) => p.isCaptain)?.number || teamB.players[0]?.number;

    dispatcher.recordProtest(true, protestReason.trim(), captainNum);
    setProtestModalOpen(false);
  };

  const handleClearProtest = () => {
    dispatcher.recordProtest(false, undefined, undefined);
    setProtestReason('');
    setProtestModalOpen(false);
  };

  // Ação 2: Declarar W.O.
  const handleConfirmWO = () => {
    // No FIBA 3x3 (Art. 10), o W.O. é declarado com placar oficial de 21 x 0
    const winner = woWinnerTeam;
    const scoreA = winner === 'A' ? 21 : 0;
    const scoreB = winner === 'B' ? 21 : 0;

    dispatcher.endGame('DEFAULT', winner, scoreA, scoreB);
    playBuzzer();
    setWoModalOpen(false);
    // Direciona imediatamente para o selamento de assinaturas
    setSignaturesModalOpen(true);
  };

  // Ação 3: Coletar Assinaturas e Selamento Final
  const handleConfirmSealing = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Garante que o jogo esteja finalizado antes de selar
    if (status !== 'ENDED') {
      dispatcher.endGame('TIME_EXPIRED');
    }

    // 2. Registra assinaturas digitais exclusivas dos dois árbitros de quadra
    if (signatureReferee1.trim()) {
      dispatcher.signScoresheet('REFEREE', signatureReferee1.trim(), signerReferee1.trim());
    }
    if (signatureReferee2.trim()) {
      dispatcher.signScoresheet('REFEREE_2', signatureReferee2.trim(), signerReferee2.trim());
    }

    if (signerSupervisor.trim()) {
      dispatcher.updateMatchInfo({ supervisorName: signerSupervisor.trim() });
    }

    // 3. Executa o selamento final da súmula
    dispatcher.closeScoresheet();
    playWhistle();
    setSignaturesModalOpen(false);
  };

  // Jogadores das equipes (garantindo 4 posições fixas)
  const playersA = teamA.players.slice(0, 4);
  const playersB = teamB.players.slice(0, 4);

  // Atleta selecionado atualmente
  const currentSelectedPlayer = activeTeam.players.find(
    (p) => p.number === selectedPlayerNumber
  );

  // Último evento para feedback na área central
  const lastEvent = events[events.length - 1];

  return (
    <div
      id="ingame-operator-screen"
      className="w-full min-h-[620px] bg-[#000000] text-white select-none flex flex-col font-sans relative overflow-hidden"
    >
      {/* =========================================================================
          1. BARRA SUPERIOR HORIZONTAL CLEAN & ALINHADA (FIBA 3x3 IN-GAME HEADER)
             [Placar Equipe A] - [Cronômetro 10:00 + Botões Play/Pause] - [Placar Equipe B]
      ========================================================================= */}
      <div className="h-20 bg-[#0A0C10] border-b border-white/15 px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-6 shrink-0 shadow-md select-none">
        {/* LADO DA EQUIPE A: Menu + Nova Partida + Posse A + Nome + Faltas + DT + [ Placar A ] */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Menu Hambúrguer (☰) para Ações Administrativas */}
          <button
            onClick={() => setAdminMenuOpen(true)}
            id="btn-ingame-menu"
            className="p-2 text-white/90 hover:text-amber-400 active:scale-95 transition-all cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 shrink-0"
            title="Menu Administrativo (☰)"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>

          {/* Botão Rápido Nova Partida / Reset */}
          <button
            onClick={handleResetNewGame}
            id="btn-ingame-quick-reset"
            className="p-2 text-neutral-400 hover:text-amber-300 active:scale-95 transition-all cursor-pointer rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 shrink-0 hidden sm:flex items-center gap-1.5"
            title="Nova Partida / Reiniciar Súmula (Reset)"
          >
            <RotateCcw className="w-4 h-4 text-amber-400" />
            <span className="text-[11px] font-bold text-neutral-300 hidden md:inline">NOVA PARTIDA</span>
          </button>

          {/* Botão de Posse Equipe A */}
          <button
            onClick={() => handleTogglePossession('A')}
            style={{
              borderColor: possession === 'A' ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              backgroundColor: possession === 'A' ? hexToRgba(teamA.color || '#DC2626', 0.5) : 'rgba(255,255,255,0.05)',
              boxShadow: possession === 'A' ? `0 0 12px ${hexToRgba(teamA.color || '#DC2626', 0.6)}` : undefined,
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center font-black text-sm sm:text-base transition-all cursor-pointer shrink-0 ${
              possession === 'A'
                ? 'text-white shadow-md ring-2 ring-white/60 font-black'
                : 'text-white/60 hover:border-white/60'
            }`}
            title={`Alternar Posse de Bola: Equipe A (${teamA.name})`}
          >
            <span>A</span>
          </button>

          {/* Nome e Indicadores da Equipe A */}
          <div className="flex flex-col min-w-0 max-w-[85px] sm:max-w-[130px] md:max-w-[170px]">
            <span className="font-sans text-xs sm:text-sm md:text-base font-black text-white truncate">
              {teamA.name}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs">
              <span className="text-neutral-400">
                F:{' '}
                <strong
                  className={
                    teamA.foulsCount >= 10
                      ? 'text-red-500 font-black'
                      : teamA.foulsCount >= 7
                      ? 'text-amber-400 font-extrabold'
                      : 'text-white font-bold'
                  }
                >
                  {teamA.foulsCount}
                </strong>
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">
                DT:{' '}
                <strong className={teamA.timeoutUsed ? 'text-neutral-500' : 'text-emerald-400 font-bold'}>
                  {teamA.timeoutUsed ? '1/1' : '0/1'}
                </strong>
              </span>
            </div>
          </div>

          {/* Caixa do Placar A: Amplo, sem cortes */}
          <div
            id="scoreboard-score-a"
            style={{
              backgroundColor: teamA.color || '#DC2626',
              color: getContrastTextColor(teamA.color || '#DC2626'),
              borderColor: hexToRgba(getContrastTextColor(teamA.color || '#DC2626'), 0.3),
              boxShadow: `0 4px 16px ${hexToRgba(teamA.color || '#DC2626', 0.45)}`,
            }}
            className="min-w-[66px] sm:min-w-[82px] md:min-w-[92px] h-12 sm:h-14 px-2.5 sm:px-3.5 rounded-xl font-mono text-3xl sm:text-4xl md:text-5xl font-black text-center flex items-center justify-center border-2 transition-all duration-200 select-none shadow-lg shrink-0"
            title={`Placar ${teamA.name}: ${state.scoreA}`}
          >
            {state.scoreA.toString().padStart(2, '0')}
          </div>
        </div>

        {/* CENTRO: CRONÔMETRO 10:00 + BOTÕES PLAY/PAUSE */}
        <div className="flex items-center gap-2 sm:gap-3 md:gap-4 shrink-0 px-1">
          {/* Badge Período */}
          <div className="flex flex-col items-center justify-center">
            <span className="text-[10px] sm:text-xs font-black text-neutral-300 font-mono px-1.5 py-0.5 rounded bg-white/10 border border-white/15">
              {period === 'OVERTIME' ? 'OT' : 'P1'}
            </span>
          </div>

          {/* Cronômetro Principal (10:00) */}
          <div
            onClick={handleToggleClock}
            id="btn-main-game-clock"
            className="text-3xl sm:text-4xl md:text-5xl font-mono font-black tracking-wider text-white cursor-pointer hover:text-amber-300 transition-colors select-none px-1"
            title="Clique para Iniciar/Pausar o Relógio"
          >
            {formatGameTime(clock.gameTimeMs)}
          </div>

          {/* Botão Play/Pause Alinhado no Centro */}
          <button
            onClick={handleToggleClock}
            disabled={state.isClosed}
            id="btn-ingame-play-pause"
            style={{
              backgroundColor: isClockRunning ? '#DC2626' : '#10B981',
            }}
            className={`h-11 sm:h-12 px-3 sm:px-4 rounded-xl text-white font-black text-xs sm:text-sm uppercase tracking-wide flex items-center justify-center gap-1.5 shadow-lg transition-all active:scale-95 cursor-pointer border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed ${
              isClockRunning ? 'hover:bg-red-700' : 'hover:bg-emerald-600'
            }`}
            title={isClockRunning ? 'Pausar Cronômetro' : 'Iniciar Cronômetro'}
          >
            {isClockRunning ? (
              <>
                <Pause className="w-5 h-5 fill-current" />
                <span className="hidden md:inline">PAUSAR</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current ml-0.5" />
                <span className="hidden md:inline">PLAY</span>
              </>
            )}
          </button>
        </div>

        {/* LADO DA EQUIPE B: [ Placar B ] + DT + Faltas + Nome + Posse B */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 justify-end">
          {/* Caixa do Placar B: Amplo, sem cortes */}
          <div
            id="scoreboard-score-b"
            style={{
              backgroundColor: teamB.color || '#2563EB',
              color: getContrastTextColor(teamB.color || '#2563EB'),
              borderColor: hexToRgba(getContrastTextColor(teamB.color || '#2563EB'), 0.3),
              boxShadow: `0 4px 16px ${hexToRgba(teamB.color || '#2563EB', 0.45)}`,
            }}
            className="min-w-[66px] sm:min-w-[82px] md:min-w-[92px] h-12 sm:h-14 px-2.5 sm:px-3.5 rounded-xl font-mono text-3xl sm:text-4xl md:text-5xl font-black text-center flex items-center justify-center border-2 transition-all duration-200 select-none shadow-lg shrink-0"
            title={`Placar ${teamB.name}: ${state.scoreB}`}
          >
            {state.scoreB.toString().padStart(2, '0')}
          </div>

          {/* Nome e Indicadores da Equipe B */}
          <div className="flex flex-col items-end min-w-0 max-w-[85px] sm:max-w-[130px] md:max-w-[170px]">
            <span className="font-sans text-xs sm:text-sm md:text-base font-black text-white truncate text-right">
              {teamB.name}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-[11px] sm:text-xs justify-end">
              <span className="text-neutral-400">
                DT:{' '}
                <strong className={teamB.timeoutUsed ? 'text-neutral-500' : 'text-emerald-400 font-bold'}>
                  {teamB.timeoutUsed ? '1/1' : '0/1'}
                </strong>
              </span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">
                F:{' '}
                <strong
                  className={
                    teamB.foulsCount >= 10
                      ? 'text-red-500 font-black'
                      : teamB.foulsCount >= 7
                      ? 'text-amber-400 font-extrabold'
                      : 'text-white font-bold'
                  }
                >
                  {teamB.foulsCount}
                </strong>
              </span>
            </div>
          </div>

          {/* Botão de Posse Equipe B */}
          <button
            onClick={() => handleTogglePossession('B')}
            style={{
              borderColor: possession === 'B' ? '#FFFFFF' : 'rgba(255,255,255,0.25)',
              backgroundColor: possession === 'B' ? hexToRgba(teamB.color || '#2563EB', 0.5) : 'rgba(255,255,255,0.05)',
              boxShadow: possession === 'B' ? `0 0 12px ${hexToRgba(teamB.color || '#2563EB', 0.6)}` : undefined,
            }}
            className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl border flex items-center justify-center font-black text-sm sm:text-base transition-all cursor-pointer shrink-0 ${
              possession === 'B'
                ? 'text-white shadow-md ring-2 ring-white/60 font-black'
                : 'text-white/60 hover:border-white/60'
            }`}
            title={`Alternar Posse de Bola: Equipe B (${teamB.name})`}
          >
            <span>B</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. CORPO PRINCIPAL (SELEÇÃO DE ATLETAS | ÁREA CENTRAL EXPANDIDA | BOTOEIRA)
      ========================================================================= */}
      <div className="flex-1 flex flex-row overflow-hidden relative">
        {/* =====================================================================
            LADO ESQUERDO: SELEÇÃO RÁPIDA DE EQUIPES E ATLETAS COM TRAVA DE EXCLUSÃO
        ===================================================================== */}
        <div className="w-44 sm:w-52 md:w-60 bg-[#08090C] border-r border-white/20 p-2 sm:p-2.5 flex gap-2 shrink-0 overflow-y-auto">
          {/* COLUNA: EQUIPE A */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Botão da Equipe A */}
            <button
              onClick={() => handleSelectTeamOnly('A')}
              style={{
                backgroundColor: selectedTeamId === 'A' ? teamA.color || '#DC2626' : hexToRgba(teamA.color || '#DC2626', 0.25),
                color: selectedTeamId === 'A' ? getContrastTextColor(teamA.color || '#DC2626') : '#FFFFFF',
                borderColor: selectedTeamId === 'A' ? '#FFFFFF' : hexToRgba(teamA.color || '#DC2626', 0.5),
                boxShadow: selectedTeamId === 'A' ? `0 0 16px ${hexToRgba(teamA.color || '#DC2626', 0.7)}` : undefined,
              }}
              className="h-12 sm:h-14 rounded-xl font-mono text-xl sm:text-2xl font-black flex items-center justify-center transition-all cursor-pointer border-2"
              title={`${teamA.name} (Ação da Equipe / Técnico)`}
            >
              A
            </button>

            {/* Atletas Equipe A */}
            {playersA.map((p, idx) => {
              const excluded = isPlayerExcluded(p);
              const isSelected = selectedTeamId === 'A' && selectedPlayerNumber === p.number && !excluded;
              const isCaptain = p.isCaptain || idx === 1;

              return (
                <button
                  key={`btn-player-a-${p.number}`}
                  disabled={excluded}
                  onClick={() => handleSelectPlayer('A', p)}
                  style={{
                    backgroundColor: excluded
                      ? undefined
                      : isSelected
                      ? teamA.color || '#DC2626'
                      : hexToRgba(teamA.color || '#DC2626', 0.18),
                    color: excluded
                      ? undefined
                      : isSelected
                      ? getContrastTextColor(teamA.color || '#DC2626')
                      : '#FFFFFF',
                    borderColor: excluded
                      ? undefined
                      : isSelected
                      ? '#FFFFFF'
                      : hexToRgba(teamA.color || '#DC2626', 0.4),
                    boxShadow: isSelected
                      ? `0 0 16px ${hexToRgba(teamA.color || '#DC2626', 0.7)}`
                      : undefined,
                  }}
                  className={`h-14 sm:h-16 rounded-xl font-mono text-2xl font-black flex flex-col items-center justify-center relative transition-all ${
                    excluded
                      ? 'bg-[#12141A] text-neutral-500 border border-neutral-800 opacity-40 cursor-not-allowed pointer-events-none'
                      : isSelected
                      ? 'border-2 scale-[1.02] cursor-pointer'
                      : 'border hover:scale-[1.01] cursor-pointer'
                  }`}
                  title={
                    excluded
                      ? `${p.name} (#${p.number}) - EXCLUÍDO / DESQUALIFICADO`
                      : `${p.name} (#${p.number})`
                  }
                >
                  <div className="flex items-center justify-center leading-none">
                    <span className={excluded ? 'line-through decoration-red-500/80 text-neutral-500' : ''}>
                      {p.number}
                    </span>
                    {isCaptain && !excluded && (
                      <span className="text-[10px] font-sans font-bold absolute top-1.5 right-2 opacity-80">
                        c
                      </span>
                    )}
                  </div>

                  {/* Indicador discreto de Excluído */}
                  {excluded ? (
                    <span className="text-[8px] font-mono font-black text-red-400 bg-red-950/90 border border-red-800/80 px-1 py-0.5 rounded uppercase tracking-tighter mt-1">
                      EXCLUÍDO
                    </span>
                  ) : (
                    <div
                      style={{
                        color: isSelected ? hexToRgba(getContrastTextColor(teamA.color || '#DC2626'), 0.8) : 'rgba(255,255,255,0.6)',
                      }}
                      className="text-[8px] font-mono font-medium leading-none mt-1"
                    >
                      {p.points}p • {p.fouls.length}F
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* COLUNA: EQUIPE B */}
          <div className="flex-1 flex flex-col gap-2">
            {/* Botão da Equipe B */}
            <button
              onClick={() => handleSelectTeamOnly('B')}
              style={{
                backgroundColor: selectedTeamId === 'B' ? teamB.color || '#2563EB' : hexToRgba(teamB.color || '#2563EB', 0.25),
                color: selectedTeamId === 'B' ? getContrastTextColor(teamB.color || '#2563EB') : '#FFFFFF',
                borderColor: selectedTeamId === 'B' ? '#FFFFFF' : hexToRgba(teamB.color || '#2563EB', 0.5),
                boxShadow: selectedTeamId === 'B' ? `0 0 16px ${hexToRgba(teamB.color || '#2563EB', 0.7)}` : undefined,
              }}
              className="h-12 sm:h-14 rounded-xl font-mono text-xl sm:text-2xl font-black flex items-center justify-center transition-all cursor-pointer border-2"
              title={`${teamB.name} (Ação da Equipe / Técnico)`}
            >
              B
            </button>

            {/* Atletas Equipe B */}
            {playersB.map((p, idx) => {
              const excluded = isPlayerExcluded(p);
              const isSelected = selectedTeamId === 'B' && selectedPlayerNumber === p.number && !excluded;
              const isCaptain = p.isCaptain || idx === 1;

              return (
                <button
                  key={`btn-player-b-${p.number}`}
                  disabled={excluded}
                  onClick={() => handleSelectPlayer('B', p)}
                  style={{
                    backgroundColor: excluded
                      ? undefined
                      : isSelected
                      ? teamB.color || '#2563EB'
                      : hexToRgba(teamB.color || '#2563EB', 0.18),
                    color: excluded
                      ? undefined
                      : isSelected
                      ? getContrastTextColor(teamB.color || '#2563EB')
                      : '#FFFFFF',
                    borderColor: excluded
                      ? undefined
                      : isSelected
                      ? '#FFFFFF'
                      : hexToRgba(teamB.color || '#2563EB', 0.4),
                    boxShadow: isSelected
                      ? `0 0 16px ${hexToRgba(teamB.color || '#2563EB', 0.7)}`
                      : undefined,
                  }}
                  className={`h-14 sm:h-16 rounded-xl font-mono text-2xl font-black flex flex-col items-center justify-center relative transition-all ${
                    excluded
                      ? 'bg-[#12141A] text-neutral-500 border border-neutral-800 opacity-40 cursor-not-allowed pointer-events-none'
                      : isSelected
                      ? 'border-2 scale-[1.02] cursor-pointer'
                      : 'border hover:scale-[1.01] cursor-pointer'
                  }`}
                  title={
                    excluded
                      ? `${p.name} (#${p.number}) - EXCLUÍDO / DESQUALIFICADO`
                      : `${p.name} (#${p.number})`
                  }
                >
                  <div className="flex items-center justify-center leading-none">
                    <span className={excluded ? 'line-through decoration-red-500/80 text-neutral-500' : ''}>
                      {p.number}
                    </span>
                    {isCaptain && !excluded && (
                      <span className="text-[10px] font-sans font-bold absolute top-1.5 right-2 opacity-80">
                        c
                      </span>
                    )}
                  </div>

                  {/* Indicador discreto de Excluído */}
                  {excluded ? (
                    <span className="text-[8px] font-mono font-black text-red-400 bg-red-950/90 border border-red-800/80 px-1 py-0.5 rounded uppercase tracking-tighter mt-1">
                      EXCLUÍDO
                    </span>
                  ) : (
                    <div
                      style={{
                        color: isSelected ? hexToRgba(getContrastTextColor(teamB.color || '#2563EB'), 0.8) : 'rgba(255,255,255,0.6)',
                      }}
                      className="text-[8px] font-mono font-medium leading-none mt-1"
                    >
                      {p.points}p • {p.fouls.length}F
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* =====================================================================
            ÁREA CENTRAL CLEAN & DESOBSTRUÍDA: STATUS, FEEDBACK E CONTROLE
        ===================================================================== */}
        <div className="flex-1 bg-[#06080C] p-4 sm:p-6 flex flex-col justify-between items-center relative overflow-y-auto">
          {/* =====================================================================
              1. BARRA SUPERIOR DE ATLETA SELECIONADO
          ===================================================================== */}
          <div className="w-full max-w-xl bg-[#0F131C] border border-white/10 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs font-mono shadow-sm">
            <div className="flex items-center gap-2 truncate">
              <span className="text-neutral-400 font-sans">Atleta Selecionado:</span>
              <span
                style={{
                  backgroundColor: activeTeam.color || '#DC2626',
                  color: getContrastTextColor(activeTeam.color || '#DC2626'),
                }}
                className="px-2 py-0.5 rounded-full font-black text-[11px]"
              >
                #{currentSelectedPlayer?.number ?? selectedPlayerNumber}
              </span>
              <span className="font-bold text-white truncate">
                {currentSelectedPlayer?.name || `Jogador #${selectedPlayerNumber}`} ({activeTeam.name})
              </span>
            </div>
            <div className="flex items-center gap-3 text-neutral-300 font-bold shrink-0">
              <span>
                Pontos: <strong className="text-amber-400">{currentSelectedPlayer?.points ?? 0}</strong>
              </span>
              <span>•</span>
              <span>
                Faltas:{' '}
                <strong
                  className={
                    (currentSelectedPlayer?.fouls.length ?? 0) >= 4 ? 'text-red-400' : 'text-white'
                  }
                >
                  {currentSelectedPlayer?.fouls.length ?? 0}
                </strong>
              </span>
            </div>
          </div>

          {/* =====================================================================
              2. STATUS DA PARTIDA OU FEEDBACK DE JOGO
          ===================================================================== */}
          <div className="flex-1 w-full flex flex-col items-center justify-center text-center p-3 sm:p-4 space-y-4">
            {state.isClosed ? (
              <div className="p-6 bg-blue-950/40 border-2 border-[#003399] rounded-2xl text-blue-300 font-bold max-w-lg w-full space-y-3 shadow-xl">
                <div className="flex items-center justify-center gap-2 text-lg text-white font-black">
                  <CheckCircle2 className="w-6 h-6 text-[#003399]" />
                  SÚMULA OFICIAL SELADA & FINALIZADA
                </div>
                <p className="text-xs text-neutral-300">
                  A partida foi chancelada e a súmula oficial foi devidamente selada em conformidade com o regulamento FIBA 3x3.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  {onSwitchView && (
                    <button
                      onClick={() => onSwitchView('SCORESHEET')}
                      className="px-4 py-2.5 bg-[#003399] hover:bg-[#002266] text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      Visualizar Súmula Digital A4
                    </button>
                  )}
                  <button
                    onClick={handleResetNewGame}
                    id="btn-closed-reset-game"
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-black uppercase rounded-xl transition-all cursor-pointer flex items-center gap-1.5 border border-white/10 shadow-md"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Iniciar Nova Partida (Reset)</span>
                  </button>
                </div>
              </div>
            ) : status === 'ENDED' ? (
              <div className="p-6 bg-amber-500/15 border-2 border-amber-400 rounded-2xl text-amber-300 font-bold max-w-lg w-full space-y-3 shadow-xl">
                <div className="text-xl font-black text-white">
                  PARTIDA ENCERRADA ({teamA.name} {state.scoreA} x {state.scoreB} {teamB.name})
                </div>
                <p className="text-xs text-neutral-200">
                  Para selar a súmula oficial e emitir as assinaturas finais, ou iniciar uma nova partida:
                </p>
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    onClick={() => setSignaturesModalOpen(true)}
                    id="btn-ended-signatures"
                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-black font-black uppercase text-xs rounded-xl shadow-lg cursor-pointer"
                  >
                    Coletar Assinaturas & Finalizar Partida
                  </button>
                  <button
                    onClick={handleResetNewGame}
                    id="btn-ended-reset-game"
                    className="px-4 py-2.5 bg-neutral-800 hover:bg-neutral-700 text-white font-black uppercase text-xs rounded-xl border border-white/15 shadow-lg cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-4 h-4 text-amber-400" />
                    <span>Iniciar Nova Partida (Reset)</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full max-w-md flex flex-col items-center space-y-4">
                {/* Indicador de Posse Ativa */}
                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs font-mono shadow-sm">
                  <span className="text-neutral-400">Posse de Bola:</span>
                  <span
                    style={{ color: activeTeam.color || '#DC2626' }}
                    className="font-black text-sm"
                  >
                    {possession === 'A' ? `${teamA.name} (A)` : `${teamB.name} (B)`}
                  </span>
                </div>

                {/* Banner de Última Ação Registrada */}
                {lastEvent ? (
                  <div className="w-full bg-[#121622] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-neutral-300 flex items-center justify-between shadow-sm">
                    <span className="text-neutral-400 font-mono">Último Registro:</span>
                    <span className="font-bold text-white font-mono truncate max-w-[280px]">
                      {lastEvent.type === 'SCORE_1PT'
                        ? `🏀 +1 Ponto (${lastEvent.teamId === 'A' ? teamA.name : teamB.name} #${lastEvent.playerNumber})`
                        : lastEvent.type === 'SCORE_2PT'
                        ? `🏀 +2 Pontos (${lastEvent.teamId === 'A' ? teamA.name : teamB.name} #${lastEvent.playerNumber})`
                        : lastEvent.type === 'FOUL_PERSONAL'
                        ? `⚠️ Falta Pessoal (${lastEvent.teamId === 'A' ? teamA.name : teamB.name} #${lastEvent.playerNumber})`
                        : lastEvent.type === 'CLOCK_STARTED'
                        ? '⏱️ Cronômetro Iniciado'
                        : lastEvent.type === 'CLOCK_PAUSED'
                        ? '⏸️ Cronômetro Pausado'
                        : lastEvent.type}
                    </span>
                  </div>
                ) : (
                  <div className="text-xs text-neutral-500 font-mono">
                    Partida pronta. Pressione Play (▶) para iniciar a contagem.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* =====================================================================
              3. BOTÕES DE CONTROLE DO CRONÔMETRO E RESET
          ===================================================================== */}
          <div className="w-full max-w-md flex items-center gap-3 pb-2">
            <button
              onClick={handleStartGameOrDemo}
              disabled={state.isClosed}
              id="btn-ingame-start-demo"
              style={{
                backgroundColor: isClockRunning ? '#DC2626' : '#10B981',
              }}
              className={`flex-1 py-3.5 sm:py-4 px-6 rounded-2xl text-white font-black text-base sm:text-lg uppercase tracking-wider shadow-2xl transition-all active:scale-95 cursor-pointer border border-white/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2.5 ${
                isClockRunning ? 'hover:bg-red-700' : 'hover:bg-emerald-600'
              }`}
            >
              {isClockRunning ? (
                <>
                  <Pause className="w-5 h-5 sm:w-6 sm:h-6 fill-current" />
                  <span>PAUSAR CRONÔMETRO</span>
                </>
              ) : status === 'SETUP' || status === 'READY' ? (
                <>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                  <span>INICIAR JOGO (10:00)</span>
                </>
              ) : (
                <>
                  <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
                  <span>CONTINUAR JOGO</span>
                </>
              )}
            </button>

            <button
              onClick={handleResetNewGame}
              id="btn-center-reset-game"
              className="py-3.5 sm:py-4 px-4 rounded-2xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-white/15 font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shrink-0"
              title="Reiniciar Partida / Nova Partida"
            >
              <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              <span>RESET</span>
            </button>
          </div>
        </div>

        {/* =====================================================================
            LADO DIREITO: BOTOEIRA DE AÇÕES OFICIAIS REORGANIZADA
            (SEM O BOTÃO DE SUBSTITUIÇÕES)
        ===================================================================== */}
        <div
          style={{
            borderLeftColor: hexToRgba(activeTeam.color || '#DC2626', 0.4),
            boxShadow: `-4px 0 20px ${hexToRgba(activeTeam.color || '#DC2626', 0.08)}`,
          }}
          className="w-48 sm:w-56 md:w-60 bg-[#08090C] border-l-2 p-2 sm:p-2.5 flex flex-col gap-2 shrink-0 overflow-y-auto transition-colors"
        >
          {/* Indicador de Equipe Selecionada para Ações */}
          <div
            style={{
              backgroundColor: hexToRgba(activeTeam.color || '#DC2626', 0.2),
              borderColor: activeTeam.color || '#DC2626',
              boxShadow: `0 0 10px ${hexToRgba(activeTeam.color || '#DC2626', 0.2)}`,
            }}
            className="p-2 rounded-xl border flex items-center justify-between text-xs font-mono font-bold transition-all"
            title={`Ações pontuam para: ${activeTeam.name}`}
          >
            <div className="flex items-center gap-1.5 truncate">
              <span
                style={{
                  backgroundColor: activeTeam.color || '#DC2626',
                  color: getContrastTextColor(activeTeam.color || '#DC2626'),
                }}
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0"
              >
                {selectedTeamId}
              </span>
              <span className="truncate text-white font-black">{activeTeam.name}</span>
            </div>
            <span className="text-[10px] text-neutral-400 shrink-0">Ativo</span>
          </div>

          {/* 1. LANCES LIVRES (Verde) */}
          <button
            onClick={() => setFtModalOpen(true)}
            disabled={state.isClosed}
            id="btn-action-free-throws"
            style={{
              borderColor: hexToRgba(activeTeam.color || '#DC2626', 0.4),
            }}
            className="w-full h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <span>LANCES LIVRES</span>
            <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[#10B981]" />
          </button>

          {/* 2. 1 PONTO (Com destaque da equipe ativa) */}
          <button
            onClick={handleScore1Pt}
            disabled={state.isClosed}
            id="btn-action-1pt"
            style={{
              borderColor: activeTeam.color || '#DC2626',
              boxShadow: `0 0 12px ${hexToRgba(activeTeam.color || '#DC2626', 0.3)}`,
            }}
            className="w-full h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 cursor-pointer border-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <span className="flex items-center gap-1.5">
              <span>+1 PONTO</span>
              <span
                style={{
                  backgroundColor: activeTeam.color || '#DC2626',
                  color: getContrastTextColor(activeTeam.color || '#DC2626'),
                }}
                className="text-[9px] px-1.5 py-0.2 rounded font-mono font-black"
              >
                {selectedTeamId}
              </span>
            </span>
            <div
              className="absolute bottom-0 inset-x-0 h-1.5 transition-colors"
              style={{ backgroundColor: activeTeam.color || '#2563EB' }}
            />
          </button>

          {/* 3. 2 PONTOS (Com destaque da equipe ativa) */}
          <button
            onClick={handleScore2Pts}
            disabled={state.isClosed}
            id="btn-action-2pts"
            style={{
              borderColor: activeTeam.color || '#DC2626',
              boxShadow: `0 0 12px ${hexToRgba(activeTeam.color || '#DC2626', 0.3)}`,
            }}
            className="w-full h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 cursor-pointer border-2 disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
          >
            <span className="flex items-center gap-1.5">
              <span>+2 PONTOS</span>
              <span
                style={{
                  backgroundColor: activeTeam.color || '#DC2626',
                  color: getContrastTextColor(activeTeam.color || '#DC2626'),
                }}
                className="text-[9px] px-1.5 py-0.2 rounded font-mono font-black"
              >
                {selectedTeamId}
              </span>
            </span>
            <div
              className="absolute bottom-0 inset-x-0 h-1.5 transition-colors"
              style={{ backgroundColor: activeTeam.color || '#F97316' }}
            />
          </button>

          {/* 4. GRID LADO A LADO: [ FALTA ] e [ F. TÉC ] (Vermelho) */}
          <div className="grid grid-cols-2 gap-2">
            {/* FALTA PESSOAL */}
            <button
              onClick={handleFoulPersonal}
              disabled={state.isClosed}
              id="btn-action-foul-personal"
              style={{
                borderColor: hexToRgba(activeTeam.color || '#DC2626', 0.4),
              }}
              className="h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              <span>FALTA</span>
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[#EF4444]" />
            </button>

            {/* FALTA TÉCNICA / ANTIDESPORTIVA */}
            <button
              onClick={() => setFoulModalOpen(true)}
              disabled={state.isClosed}
              id="btn-action-foul-tech"
              style={{
                borderColor: hexToRgba(activeTeam.color || '#DC2626', 0.4),
              }}
              className="h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center relative overflow-hidden transition-all active:scale-95 cursor-pointer border disabled:opacity-40 disabled:cursor-not-allowed shadow-md"
            >
              <span>F. TÉC</span>
              <div className="absolute bottom-0 inset-x-0 h-1.5 bg-[#EF4444]" />
            </button>
          </div>

          {/* 5. GRID LADO A LADO: [ DT ] e [ ↶ ] (Undo / Desfazer) */}
          <div className="grid grid-cols-2 gap-2">
            {/* DT (Débito de Tempo) */}
            <button
              onClick={handleTimeout}
              disabled={state.isClosed || activeTeam.timeoutsRemaining <= 0}
              id="btn-action-timeout"
              style={{
                borderColor: hexToRgba(activeTeam.color || '#DC2626', 0.4),
              }}
              className="h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm uppercase tracking-tight rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
              title={`Solicitar Pedido de Tempo (DT 30 segundos) para ${activeTeam.name}`}
            >
              DT
            </button>

            {/* UNDO (Desfazer última jogada) */}
            <button
              onClick={() => dispatcher.undo()}
              disabled={events.length === 0 || state.isClosed}
              id="btn-action-undo"
              className="h-12 sm:h-14 bg-[#141822] hover:bg-[#1A202D] text-white font-bold text-xs sm:text-sm rounded-xl flex items-center justify-center transition-all active:scale-95 cursor-pointer border border-white/10 disabled:opacity-30 disabled:cursor-not-allowed shadow-md"
              title="Desfazer última jogada (Undo)"
            >
              <Undo2 className="w-5 h-5 text-amber-400" />
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. MENU HAMBÚRGUER (☰) MODAL ADMINISTRATIVO COM AS 3 AÇÕES SOLICITADAS
      ========================================================================= */}
      {adminMenuOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#151922] border-2 border-white/20 rounded-2xl max-w-md w-full p-5 shadow-2xl text-white font-sans space-y-4">
            {/* Header do Menu */}
            <div className="flex items-center justify-between border-b border-white/15 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  <Menu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black uppercase text-white tracking-wide">
                    Menu Administrativo FIBA 3x3
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Ações de protesto, encerramento e selamento oficial
                  </p>
                </div>
              </div>
              <button
                onClick={() => setAdminMenuOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* As 3 Ações Administrativas Principais */}
            <div className="space-y-2.5">
              {/* 1. REGISTRAR PROTESTO */}
              <button
                onClick={() => {
                  setAdminMenuOpen(false);
                  setProtestModalOpen(true);
                }}
                id="btn-admin-register-protest"
                className="w-full p-3.5 rounded-xl bg-[#1D2230] hover:bg-[#262D40] border border-amber-500/30 text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                      📝 REGISTRAR PROTESTO
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Motivo do protesto do capitão (Art. 14 FIBA 3x3)
                    </div>
                  </div>
                </div>
                {state.protest.hasProtest ? (
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                    REGISTRADO
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">→</span>
                )}
              </button>

              {/* 2. DECLARAR W.O. */}
              <button
                onClick={() => {
                  setAdminMenuOpen(false);
                  setWoModalOpen(true);
                }}
                disabled={state.isClosed}
                id="btn-admin-declare-wo"
                className="w-full p-3.5 rounded-xl bg-[#1D2230] hover:bg-[#262D40] border border-red-500/30 text-left flex items-center justify-between transition-all group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-black">
                    <Ban className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white group-hover:text-red-400 transition-colors">
                      🚫 DECLARAR W.O.
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Encerra por desistência com placar oficial de 21 x 0
                    </div>
                  </div>
                </div>
                <span className="text-xs text-neutral-500">→</span>
              </button>

              {/* 3. COLETAR ASSINATURAS & FINALIZAR PARTIDA */}
              <button
                onClick={() => {
                  setAdminMenuOpen(false);
                  setSignaturesModalOpen(true);
                }}
                id="btn-admin-collect-signatures"
                className="w-full p-3.5 rounded-xl bg-[#1D2230] hover:bg-[#262D40] border border-blue-500/40 text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                    <PenTool className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white group-hover:text-blue-400 transition-colors">
                      ✍️ COLETAR ASSINATURAS & FINALIZAR
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Chancelas digitais e selamento em caneta azul (#003399)
                    </div>
                  </div>
                </div>
                {state.isClosed ? (
                  <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 text-[10px] font-black border border-blue-500/40">
                    SELADA
                  </span>
                ) : (
                  <span className="text-xs text-neutral-500">→</span>
                )}
              </button>

              {/* 4. REINICIAR PARTIDA (RESET COMPLETO) */}
              <button
                onClick={() => {
                  setAdminMenuOpen(false);
                  handleResetNewGame();
                }}
                id="btn-admin-reset-game"
                className="w-full p-3.5 rounded-xl bg-[#181C26] hover:bg-[#232A3B] border border-neutral-700/60 text-left flex items-center justify-between transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-neutral-800 text-amber-400 flex items-center justify-center font-black">
                    <RotateCcw className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black text-sm text-white group-hover:text-amber-400 transition-colors">
                      🔄 INICIAR NOVA PARTIDA (RESET)
                    </div>
                    <div className="text-[11px] text-neutral-400">
                      Zera placares e reinicia o cronômetro para 10:00
                    </div>
                  </div>
                </div>
                <span className="text-xs text-neutral-500">→</span>
              </button>
            </div>

            {/* Links Rápidos de Navegação */}
            <div className="pt-2 border-t border-white/10 space-y-1.5 text-xs font-bold uppercase">
              {onSwitchView && (
                <button
                  onClick={() => {
                    setAdminMenuOpen(false);
                    onSwitchView('SCORESHEET');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                    Ver Súmula Digital A4 (Oficial)
                  </span>
                  <span className="text-[10px] text-neutral-500">ABRIR</span>
                </button>
              )}

              {onSwitchView && (
                <button
                  onClick={() => {
                    setAdminMenuOpen(false);
                    onSwitchView('SETUP');
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-neutral-400" />
                    Setup Pré-Jogo & Entrada
                  </span>
                  <span className="text-[10px] text-neutral-500">EDITAR</span>
                </button>
              )}

              {onSwitchLayout && (
                <button
                  onClick={() => {
                    setAdminMenuOpen(false);
                    onSwitchLayout();
                  }}
                  className="w-full py-2 px-3 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-left flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Columns3 className="w-4 h-4 text-neutral-400" />
                    Alternar para Visão 3 Colunas
                  </span>
                  <span className="text-[10px] text-neutral-500">LAYOUT</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          4. MODAL DE REGISTRO DE PROTESTO (FIBA 3x3 ART. 14)
      ========================================================================= */}
      {protestModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleSaveProtest}
            className="bg-[#151922] border-2 border-amber-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl text-white font-sans space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-black">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-amber-400">
                    Registro de Protesto Oficial
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Regulamento Oficial FIBA 3x3 - Artigo 14
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProtestModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-neutral-300 font-bold uppercase mb-1.5">
                  Equipe do Capitão Reclamante:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setProtestTeam('A')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-all cursor-pointer ${
                      protestTeam === 'A'
                        ? 'bg-red-600 border-white text-white shadow-md'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    Equipe A: {teamA.name}
                  </button>
                  <button
                    type="button"
                    onClick={() => setProtestTeam('B')}
                    className={`py-2 px-3 rounded-lg font-bold border text-center transition-all cursor-pointer ${
                      protestTeam === 'B'
                        ? 'bg-blue-600 border-white text-white shadow-md'
                        : 'bg-neutral-800 border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    Equipe B: {teamB.name}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold uppercase mb-1.5">
                  Motivo e Circunstâncias do Protesto:
                </label>
                <textarea
                  rows={4}
                  required
                  value={protestReason}
                  onChange={(e) => setProtestReason(e.target.value)}
                  placeholder="Descreva detalhadamente o fato ocorrido (ex: contagem de pontuação, falta assinalada fora de tempo, erro na posse inicial, etc.)..."
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-[11px] text-amber-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>
                  O protesto será registrado formalmente no campo de notas da Súmula Oficial A4,
                  exigindo a assinatura do capitão e dos árbitros no encerramento.
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              {state.protest.hasProtest ? (
                <button
                  type="button"
                  onClick={handleClearProtest}
                  className="px-3 py-2 rounded-xl bg-red-900/60 hover:bg-red-800 text-red-300 font-bold text-xs uppercase cursor-pointer"
                >
                  Remover Protesto
                </button>
              ) : (
                <div />
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setProtestModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase shadow-lg cursor-pointer"
                >
                  Gravar Protesto na Súmula
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          5. MODAL DE DECLARAR W.O. (FORFEIT - ART. 10 FIBA 3x3)
      ========================================================================= */}
      {woModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-[#151922] border-2 border-red-500/60 rounded-2xl max-w-md w-full p-5 shadow-2xl text-white font-sans space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center font-black">
                  <Ban className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-red-400">
                    Declarar W.O. (Forfeit)
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Regulamento Oficial FIBA 3x3 - Artigo 10
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWoModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-black/50 rounded-xl border border-white/10 text-neutral-300 leading-relaxed">
                Conforme o Artigo 10 das Regras FIBA 3x3, a equipe que vencer por W.O. receberá o placar regulamentar
                de <strong className="text-white font-mono">21 x 0</strong>.
              </div>

              <div>
                <label className="block text-neutral-300 font-bold uppercase mb-1.5">
                  Qual equipe vence a partida por W.O.?
                </label>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => setWoWinnerTeam('A')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      woWinnerTeam === 'A'
                        ? 'bg-red-600/30 border-red-400 text-white ring-2 ring-red-500'
                        : 'bg-neutral-800/70 border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">
                        Equipe A ({teamA.name}) vence por W.O.
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Placar registrado: 21 x 0
                      </div>
                    </div>
                    <span className="font-mono font-black text-amber-400">21 x 0</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setWoWinnerTeam('B')}
                    className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                      woWinnerTeam === 'B'
                        ? 'bg-blue-600/30 border-blue-400 text-white ring-2 ring-blue-500'
                        : 'bg-neutral-800/70 border-neutral-700 text-neutral-300 hover:text-white'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-sm text-white">
                        Equipe B ({teamB.name}) vence por W.O.
                      </div>
                      <div className="text-[11px] text-neutral-400 font-mono">
                        Placar registrado: 0 x 21
                      </div>
                    </div>
                    <span className="font-mono font-black text-amber-400">0 x 21</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-neutral-300 font-bold uppercase mb-1.5">
                  Motivo regulamentar:
                </label>
                <input
                  type="text"
                  value={woReason}
                  onChange={(e) => setWoReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setWoModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWO}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase shadow-lg cursor-pointer"
              >
                Confirmar W.O. (21 x 0)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          6. MODAL DE COLETAR ASSINATURAS & FINALIZAR PARTIDA (SELAMENTO EM CANETA AZUL)
      ========================================================================= */}
      {signaturesModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <form
            onSubmit={handleConfirmSealing}
            className="bg-[#151922] border-2 border-blue-500/60 rounded-2xl max-w-lg w-full p-5 shadow-2xl text-white font-sans space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-black">
                  <PenTool className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base uppercase text-white">
                    Coletar Assinaturas & Finalizar Partida
                  </h3>
                  <p className="text-[11px] text-neutral-400">
                    Chancelas oficiais e selamento da súmula em caneta azul (#003399)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSignaturesModalOpen(false)}
                className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-neutral-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Resumo do Resultado da Partida */}
            <div className="p-3.5 bg-black/60 rounded-xl border border-white/10 flex items-center justify-between text-xs">
              <div>
                <span className="text-neutral-400">Placar Atual:</span>
                <div className="font-black text-sm text-white font-mono">
                  {teamA.name} {state.scoreA} x {state.scoreB} {teamB.name}
                </div>
              </div>
              <div className="text-right">
                <span className="text-neutral-400">Status:</span>
                <div className="font-black text-amber-400 uppercase">
                  {state.isClosed ? 'Súmula Selada' : status === 'ENDED' ? 'Encerrada' : 'Em Andamento'}
                </div>
              </div>
            </div>

            {/* Campos de Assinatura Exclusivos dos Árbitros de Quadra */}
            <div className="space-y-3 text-xs">
              {/* Árbitro 1 */}
              <div className="p-3 bg-neutral-900/80 rounded-xl border border-white/10 space-y-2">
                <div className="font-bold text-white uppercase flex items-center justify-between">
                  <span>[ ÁRBITRO 1 (REFEREE 1) ]</span>
                  <span className="text-[10px] text-blue-400 font-mono">Obrigatório</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do Árbitro 1"
                    value={signerReferee1}
                    onChange={(e) => setSignerReferee1(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-blue-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Rubrica / Assinatura Digital"
                    value={signatureReferee1}
                    onChange={(e) => setSignatureReferee1(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-[#60A5FA] font-mono text-xs italic focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Árbitro 2 */}
              <div className="p-3 bg-neutral-900/80 rounded-xl border border-white/10 space-y-2">
                <div className="font-bold text-white uppercase flex items-center justify-between">
                  <span>[ ÁRBITRO 2 (REFEREE 2) ]</span>
                  <span className="text-[10px] text-blue-400 font-mono">Obrigatório</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Nome do Árbitro 2"
                    value={signerReferee2}
                    onChange={(e) => setSignerReferee2(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-blue-400"
                  />
                  <input
                    type="text"
                    required
                    placeholder="Rubrica / Assinatura Digital"
                    value={signatureReferee2}
                    onChange={(e) => setSignatureReferee2(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-[#60A5FA] font-mono text-xs italic focus:outline-none focus:border-blue-400"
                  />
                </div>
              </div>

              {/* Supervisor Esportivo */}
              <div className="p-3 bg-neutral-900/80 rounded-xl border border-white/10 space-y-1.5">
                <div className="font-bold text-white uppercase flex items-center justify-between">
                  <span>[ SUPERVISOR ESPORTIVO (SPORTS SUPERVISOR) ]</span>
                  <span className="text-[10px] text-neutral-400 font-mono">Nome Oficial</span>
                </div>
                <input
                  type="text"
                  placeholder="Nome do Supervisor (ex: Marcos A. Faria)"
                  value={signerSupervisor}
                  onChange={(e) => setSignerSupervisor(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-blue-400"
                />
              </div>

              {/* Capitão da Equipe (Se houver protesto) */}
              {state.protest.hasProtest && (
                <div className="p-3 bg-amber-950/40 rounded-xl border border-amber-500/40 space-y-2">
                  <div className="font-bold text-amber-400 uppercase flex items-center justify-between">
                    <span>[ CAPITÃO DA EQUIPE (PROTESTO ATIVO) ]</span>
                    <span className="text-[10px] text-amber-300 font-mono">Requerido pelo Art. 14</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Nome do Capitão"
                      value={signerCaptain}
                      onChange={(e) => setSignerCaptain(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-white font-sans text-xs focus:outline-none focus:border-amber-400"
                    />
                    <input
                      type="text"
                      placeholder="Assinatura do Capitão"
                      value={signatureCaptain}
                      onChange={(e) => setSignatureCaptain(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/60 border border-white/20 text-amber-300 font-mono text-xs italic focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
              <button
                type="button"
                onClick={() => setSignaturesModalOpen(false)}
                className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold uppercase cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="submit"
                id="btn-confirm-signatures-seal"
                className="px-5 py-2.5 rounded-xl bg-[#003399] hover:bg-[#002266] active:scale-95 text-white font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-blue-900/40 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                Selar Súmula em Caneta Azul (#003399) & Finalizar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          7. MODAL RÁPIDO DE LANCES LIVRES
      ========================================================================= */}
      {ftModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141822] border border-white/20 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-center uppercase tracking-wider text-emerald-400">
              Lances Livres ({activeTeam.name} - #{selectedPlayerNumber})
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleFreeThrowMade}
                className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 font-bold text-white uppercase text-xs shadow-md cursor-pointer"
              >
                +1 LL Convertido
              </button>
              <button
                onClick={handleFreeThrowMissed}
                className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 font-bold text-white uppercase text-xs shadow-md cursor-pointer"
              >
                LL Errado
              </button>
            </div>
            <button
              onClick={() => setFtModalOpen(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* =========================================================================
          8. MODAL RÁPIDO DE FALTAS ESPECIAIS (F. TÉC / U / D)
      ========================================================================= */}
      {foulModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-[#141822] border border-white/20 rounded-2xl p-5 max-w-sm w-full space-y-3 shadow-2xl">
            <h3 className="text-base font-bold text-center uppercase tracking-wider text-red-400">
              Tipo de Falta Especial ({activeTeam.name} - #{selectedPlayerNumber})
            </h3>
            <button
              onClick={handleFoulTechnical}
              className="w-full py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 font-bold text-white uppercase text-xs shadow-md cursor-pointer text-left flex items-center justify-between"
            >
              <span>Falta Antidesportiva (U)</span>
              <span className="text-[10px] font-mono opacity-80">2 Faltas Coletivas</span>
            </button>
            <button
              onClick={handleFoulDisqualifying}
              className="w-full py-3 px-4 rounded-xl bg-red-700 hover:bg-red-600 font-bold text-white uppercase text-xs shadow-md cursor-pointer text-left flex items-center justify-between"
            >
              <span>Falta Desqualificante (D)</span>
              <span className="text-[10px] font-mono opacity-80">Exclusão do Atleta</span>
            </button>
            <button
              onClick={() => setFoulModalOpen(false)}
              className="w-full py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold uppercase cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
